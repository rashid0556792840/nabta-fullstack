const crypto = require('node:crypto');
const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const CompanySettings = require('../models/CompanySettings');
const DeliveryAssignment = require('../models/DeliveryAssignment');
const ApiError = require('../utils/ApiError');
const { PATTERNS, sanitizeText, escapeRegex, isObjectId, requireObjectId, validator } = require('../utils/validate');
const { requireAuth, requireStaff } = require('../middleware/auth');
const storeEvents = require('../services/events');
const workflow = require('../services/orderWorkflow');
const { PAYMENT_METHODS } = require('./payments');

const { ORDER_STATUSES, MANUAL_NEXT } = Order;
const router = express.Router();

const LOW_STOCK = 5;
const round2 = (n) => Math.round(n * 100) / 100;
const isStaff = (user) => ['admin', 'supervisor'].includes(user.role);

function newOrderNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear() % 100}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `NAB-${ymd}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

async function restock(items) {
  await Promise.all(items.map((i) => Product.updateOne({ _id: i.product }, { $inc: { stock: i.quantity } })));
}

// POST /api/orders - place an order (customer)
router.post('/', requireAuth, async (req, res) => {
  const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
  const addr = req.body.shippingAddress || {};
  const shippingAddress = {
    fullName: sanitizeText(addr.fullName, 80),
    phone: sanitizeText(addr.phone, 20),
    city: sanitizeText(addr.city, 60),
    street: sanitizeText(addr.street, 160),
    notes: sanitizeText(addr.notes, 300),
  };
  const paymentMethod = String(req.body.paymentMethod || 'cash_on_delivery');
  const saveAs = sanitizeText(req.body.saveAs, 40);

  const v = validator();
  v.check(rawItems.length > 0 && rawItems.length <= 30, 'items', 'Your cart is empty.');
  v.check(shippingAddress.fullName.length >= 2, 'fullName', 'Enter the receiver name.');
  v.check(PATTERNS.phone.test(shippingAddress.phone), 'phone', 'Enter a valid phone number.');
  v.check(shippingAddress.city.length >= 2, 'city', 'Enter the city.');
  v.check(shippingAddress.street.length >= 5, 'street', 'Enter the full street address.');
  v.throwIfErrors();

  const method = PAYMENT_METHODS.find((m) => m.id === paymentMethod);
  if (!method || !method.enabled) {
    throw ApiError.badRequest('This payment method is not available yet.', undefined, 'payment_unavailable');
  }

  // Merge duplicate lines and validate quantities
  const wanted = new Map();
  for (const line of rawItems) {
    const qty = Number(line.quantity);
    if (!isObjectId(line.product) || !Number.isInteger(qty) || qty < 1 || qty > 50) {
      throw ApiError.badRequest('One of the cart items is invalid. Please refresh your cart.', undefined, 'cart_invalid');
    }
    wanted.set(String(line.product), (wanted.get(String(line.product)) || 0) + qty);
  }

  // Reserve stock item by item with atomic conditional updates; undo everything on failure.
  // Prices always come from the database, never from the browser.
  const reserved = [];
  try {
    for (const [productId, quantity] of wanted) {
      const product = await Product.findOneAndUpdate(
        { _id: productId, isActive: true, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true }
      );
      if (!product) {
        const existing = await Product.findById(productId);
        const left = existing && existing.isActive ? existing.stock : 0;
        throw ApiError.conflict(`${existing?.name || 'An item'} has only ${left} left in stock. Please update your cart.`, 'out_of_stock', {
          name: existing?.name || '', nameAr: existing?.nameAr || '', left,
        });
      }
      reserved.push({
        product: product._id,
        name: product.name,
        nameAr: product.nameAr,
        price: product.price,
        quantity,
        lineTotal: round2(product.price * quantity),
        remaining: product.stock,
        doc: product,
      });
    }

    const company = await CompanySettings.get();
    const subtotal = round2(reserved.reduce((s, i) => s + i.lineTotal, 0));
    // Free delivery above the threshold set by the admin (0 means delivery is always charged)
    const deliveryFee = company.freeDeliveryFrom > 0 && subtotal >= company.freeDeliveryFrom ? 0 : company.deliveryFee;

    const order = await Order.create({
      orderNumber: newOrderNumber(),
      user: req.user._id,
      items: reserved.map(({ product, name, nameAr, price, quantity, lineTotal }) => ({ product, name, nameAr, price, quantity, lineTotal })),
      subtotal,
      deliveryFee,
      total: round2(subtotal + deliveryFee),
      paymentMethod,
      shippingAddress,
      status: 'pending',
      statusHistory: [{ status: 'pending', note: 'Order placed', by: req.user.name }],
    });

    storeEvents.emit('order:placed', { order, user: req.user });
    reserved.filter((i) => i.remaining <= LOW_STOCK).forEach((i) => storeEvents.emit('stock:low', { product: i.doc }));

    // Remember the address: becomes the default, and optionally a new saved address
    const { notes, ...addressOnly } = shippingAddress;
    req.user.address = addressOnly;
    if (saveAs && req.user.addresses.length < 10) {
      const duplicate = req.user.addresses.some((a) => a.street === addressOnly.street && a.city === addressOnly.city);
      if (!duplicate) req.user.addresses.push({ label: saveAs, ...addressOnly });
    }
    await req.user.save();

    res.status(201).json({ order });
  } catch (err) {
    await restock(reserved);
    throw err;
  }
});

// GET /api/orders/mine - current customer's orders
router.get('/mine', requireAuth, async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
  res.json({ orders });
});

// GET /api/orders - all orders (admin + supervisor), ?status= &q=order number or customer
router.get('/', requireAuth, requireStaff, async (req, res) => {
  const filter = {};
  if (ORDER_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  else if (req.query.status === 'open') filter.status = { $nin: ['completed', 'cancelled'] };
  const q = sanitizeText(req.query.q, 60);
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ orderNumber: rx }, { 'shippingAddress.fullName': rx }, { 'shippingAddress.phone': rx }];
  }
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = 20;
  const [orders, total] = await Promise.all([
    Order.find(filter).populate('user', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);
  res.json({ orders, page, pages: Math.max(1, Math.ceil(total / limit)), total });
});

// GET /api/orders/:id - owner or staff; includes delivery trips and, for staff, what is left to dispatch
router.get('/:id', requireAuth, async (req, res) => {
  requireObjectId(req.params.id, 'order id');
  const order = await Order.findById(req.params.id).populate('user', 'name email phone');
  if (!order) throw ApiError.notFound('Order not found.');
  const staff = isStaff(req.user);
  if (!staff && String(order.user._id) !== String(req.user._id)) throw ApiError.notFound('Order not found.');

  const deliveries = await DeliveryAssignment.find({ order: order._id })
    .populate('driver', 'name phone')
    .sort({ createdAt: 1 })
    .select('-destination -assignedBy');
  const body = { order, deliveries, nextStatuses: staff ? MANUAL_NEXT[order.status] : [] };
  if (staff) body.remaining = await workflow.remainingByIndex(order);
  res.json(body);
});

// PATCH /api/orders/:id/cancel - customer cancels their own pending order
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  requireObjectId(req.params.id, 'order id');
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw ApiError.notFound('Order not found.');
  res.json({ order: await workflow.cancelByCustomer(order, req.user) });
});

// PATCH /api/orders/:id/status - admin/supervisor: confirm, start processing, or cancel
router.patch('/:id/status', requireAuth, requireStaff, async (req, res) => {
  requireObjectId(req.params.id, 'order id');
  const status = String(req.body.status || '');
  if (!ORDER_STATUSES.includes(status)) throw ApiError.badRequest('Unknown status.', undefined, 'bad_status');
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found.');
  const note = sanitizeText(req.body.note, 200);
  await workflow.changeStatus(order, status, note, req.user);
  res.json({ order: await order.populate('user', 'name email') });
});

module.exports = router;
