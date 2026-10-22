const crypto = require('node:crypto');
const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { PATTERNS, sanitizeText, isObjectId, requireObjectId, validator } = require('../utils/validate');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const storeEvents = require('../services/events');

const { ORDER_STATUSES, NEXT_STATUS } = Order;
const router = express.Router();

const FREE_DELIVERY_FROM = 200;
const DELIVERY_FEE = 15;
const LOW_STOCK = 5;

const round2 = (n) => Math.round(n * 100) / 100;

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

  const v = validator();
  v.check(rawItems.length > 0 && rawItems.length <= 30, 'items', 'Your cart is empty.');
  v.check(shippingAddress.fullName.length >= 2, 'fullName', 'Enter the receiver name.');
  v.check(PATTERNS.phone.test(shippingAddress.phone), 'phone', 'Enter a valid phone number.');
  v.check(shippingAddress.city.length >= 2, 'city', 'Enter the city.');
  v.check(shippingAddress.street.length >= 5, 'street', 'Enter the full street address.');
  v.throwIfErrors();

  // Merge duplicate lines and validate quantities
  const wanted = new Map();
  for (const line of rawItems) {
    const qty = Number(line.quantity);
    if (!isObjectId(line.product) || !Number.isInteger(qty) || qty < 1 || qty > 50) {
      throw ApiError.badRequest('One of the cart items is invalid. Please refresh your cart.');
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
        const name = existing ? existing.name : 'An item';
        const left = existing && existing.isActive ? existing.stock : 0;
        throw ApiError.conflict(`${name} has only ${left} left in stock. Please update your cart.`);
      }
      reserved.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity,
        lineTotal: round2(product.price * quantity),
        remaining: product.stock,
        doc: product,
      });
    }

    const subtotal = round2(reserved.reduce((s, i) => s + i.lineTotal, 0));
    const deliveryFee = subtotal >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE;

    const order = await Order.create({
      orderNumber: newOrderNumber(),
      user: req.user._id,
      items: reserved.map(({ product, name, price, quantity, lineTotal }) => ({ product, name, price, quantity, lineTotal })),
      subtotal,
      deliveryFee,
      total: round2(subtotal + deliveryFee),
      shippingAddress,
      status: 'pending',
      statusHistory: [{ status: 'pending', note: 'Order placed' }],
    });

    storeEvents.emit('order:placed', { order, user: req.user });
    reserved.filter((i) => i.remaining <= LOW_STOCK).forEach((i) => storeEvents.emit('stock:low', { product: i.doc }));

    // Remember the address for next time (one-to-one embedded address)
    if (req.body.saveAddress) {
      req.user.address = { fullName: shippingAddress.fullName, phone: shippingAddress.phone, city: shippingAddress.city, street: shippingAddress.street };
      await req.user.save();
    }

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

// GET /api/orders - all orders (admin), optional ?status=
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const filter = {};
  if (ORDER_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = 20;
  const [orders, total] = await Promise.all([
    Order.find(filter).populate('user', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);
  res.json({ orders, page, pages: Math.max(1, Math.ceil(total / limit)), total });
});

// GET /api/orders/:id - owner or admin
router.get('/:id', requireAuth, async (req, res) => {
  requireObjectId(req.params.id, 'order id');
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) throw ApiError.notFound('Order not found.');
  if (req.user.role !== 'admin' && String(order.user._id) !== String(req.user._id)) {
    throw ApiError.notFound('Order not found.');
  }
  res.json({ order, nextStatuses: NEXT_STATUS[order.status] });
});

async function changeStatus(order, status, note, actor) {
  if (!NEXT_STATUS[order.status].includes(status)) {
    throw ApiError.badRequest(`An order that is ${order.status} cannot become ${status}.`);
  }
  if (status === 'cancelled') await restock(order.items);
  order.status = status;
  order.statusHistory.push({ status, note });
  await order.save();
  const user = await User.findById(order.user);
  if (user) storeEvents.emit('order:status', { order, user, by: actor.email });
  return order;
}

// PATCH /api/orders/:id/cancel - customer cancels their own pending order
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  requireObjectId(req.params.id, 'order id');
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw ApiError.notFound('Order not found.');
  if (order.status !== 'pending') throw ApiError.badRequest('Only pending orders can be cancelled.');
  res.json({ order: await changeStatus(order, 'cancelled', 'Cancelled by customer', req.user) });
});

// PATCH /api/orders/:id/status - admin moves an order through its workflow
router.patch('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  requireObjectId(req.params.id, 'order id');
  const status = String(req.body.status || '');
  if (!ORDER_STATUSES.includes(status)) throw ApiError.badRequest('Unknown status.');
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found.');
  const note = sanitizeText(req.body.note, 200) || `Marked ${status} by admin`;
  await changeStatus(order, status, note, req.user);
  res.json({ order: await order.populate('user', 'name email') });
});

module.exports = router;
