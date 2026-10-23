const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const ContactMessage = require('../models/ContactMessage');
const DeliveryAssignment = require('../models/DeliveryAssignment');
const ApiError = require('../utils/ApiError');
const { requireObjectId, sanitizeText, escapeRegex } = require('../utils/validate');
const { requireAuth, requireAdmin, requireStaff } = require('../middleware/auth');
const { readRecentActivity } = require('../services/activityLog');
const storeEvents = require('../services/events');

const router = express.Router();
// Admin and supervisor see the dashboard and messages; only the admin manages users
router.use(requireAuth, requireStaff);

// GET /api/admin/stats - dashboard numbers built with MongoDB aggregation pipelines
router.get('/stats', async (_req, res) => {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 6);

  const [byStatus, revenue, topProducts, salesByDay, salesByCategory, counts] = await Promise.all([
    // Orders per status
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),

    // Revenue from orders that were not cancelled
    Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 }, avgOrder: { $avg: '$total' } } },
    ]),

    // Best sellers: unwind order items then group by product
    Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', name: { $first: '$items.name' }, nameAr: { $first: '$items.nameAr' }, quantity: { $sum: '$items.quantity' }, revenue: { $sum: '$items.lineTotal' } } },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
    ]),

    // Sales for each of the last 7 days
    Order.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $ne: 'cancelled' } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    // Revenue per category: join order items to products and categories with $lookup
    Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $lookup: { from: 'categories', localField: 'product.category', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' },
      { $group: { _id: '$category.name', nameAr: { $first: '$category.nameAr' }, revenue: { $sum: '$items.lineTotal' } } },
      { $sort: { revenue: -1 } },
    ]),

    Promise.all([
      User.countDocuments({ role: 'customer' }),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true, stock: { $lte: 5 } }),
      ContactMessage.countDocuments({ isRead: false }),
      DeliveryAssignment.countDocuments({ status: { $in: DeliveryAssignment.ACTIVE } }),
      User.countDocuments({ role: 'delivery', isActive: true }),
    ]),
  ]);

  // Fill missing days with zero so the chart always shows 7 bars
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const found = salesByDay.find((x) => x._id === key);
    days.push({ date: key, total: found ? found.total : 0, orders: found ? found.orders : 0 });
  }

  const [customers, activeProducts, lowStock, unreadMessages, activeDeliveries, drivers] = counts;
  res.json({
    revenue: revenue[0]?.revenue || 0,
    paidOrders: revenue[0]?.orders || 0,
    averageOrder: revenue[0]?.avgOrder || 0,
    ordersByStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    topProducts,
    salesByDay: days,
    salesByCategory,
    customers,
    activeProducts,
    lowStock,
    unreadMessages,
    activeDeliveries,
    drivers,
  });
});

// GET /api/admin/low-stock
router.get('/low-stock', async (_req, res) => {
  const products = await Product.find({ isActive: true, stock: { $lte: 5 } }).populate('category', 'name nameAr').sort({ stock: 1 });
  res.json({ products });
});

// GET /api/admin/users?q=
router.get('/users', requireAdmin, async (req, res) => {
  const q = sanitizeText(req.query.q, 60);
  const filter = q ? { $or: [{ name: new RegExp(escapeRegex(q), 'i') }, { email: new RegExp(escapeRegex(q), 'i') }, { phone: new RegExp(escapeRegex(q), 'i') }] } : {};
  if (User.ROLES.includes(req.query.role)) filter.role = req.query.role;
  const users = await User.aggregate([
    { $match: filter },
    { $sort: { createdAt: -1 } },
    { $limit: 200 },
    { $lookup: { from: 'orders', localField: '_id', foreignField: 'user', as: 'orders' } },
    {
      $project: {
        name: 1, email: 1, phone: 1, role: 1, isActive: 1, createdAt: 1, lastLoginAt: 1,
        orderCount: { $size: '$orders' },
        totalSpent: {
          $sum: {
            $map: {
              input: { $filter: { input: '$orders', cond: { $ne: ['$$this.status', 'cancelled'] } } },
              in: '$$this.total',
            },
          },
        },
      },
    },
  ]);
  res.json({ users });
});

// PATCH /api/admin/users/:id - enable/disable an account or change role
router.patch('/users/:id', requireAdmin, async (req, res) => {
  requireObjectId(req.params.id, 'user id');
  if (String(req.params.id) === String(req.user._id)) throw ApiError.badRequest('You cannot change your own account here.', undefined, 'self_change');
  const update = {};
  if (typeof req.body.isActive === 'boolean') update.isActive = req.body.isActive;
  if (User.ROLES.includes(req.body.role)) update.role = req.body.role;
  if (!Object.keys(update).length) throw ApiError.badRequest('Nothing to update.');
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!user) throw ApiError.notFound('User not found.');
  res.json({ user });
});

// GET /api/admin/messages
router.get('/messages', async (_req, res) => {
  res.json({ messages: await ContactMessage.find().sort({ createdAt: -1 }).limit(100) });
});

// PATCH /api/admin/messages/:id/read
router.patch('/messages/:id/read', async (req, res) => {
  requireObjectId(req.params.id, 'message id');
  const message = await ContactMessage.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
  if (!message) throw ApiError.notFound('Message not found.');
  res.json({ message });
});

// POST /api/admin/messages/:id/reply - answer a customer from inside the app
// The reply is saved on the message (customer sees it under Messages) and emailed to them.
router.post('/messages/:id/reply', async (req, res) => {
  requireObjectId(req.params.id, 'message id');
  const body = sanitizeText(req.body.body, 2000);
  if (body.length < 2) throw ApiError.badRequest('Please check the highlighted fields.', { body: 'Write a reply first.' });

  const message = await ContactMessage.findById(req.params.id);
  if (!message) throw ApiError.notFound('Message not found.');
  message.replies.push({ body, authorName: req.user.name });
  message.isRead = true;
  await message.save();

  storeEvents.emit('contact:replied', { message, reply: message.replies.at(-1), by: req.user.email });
  res.status(201).json({ message });
});

// DELETE /api/admin/messages/:id
router.delete('/messages/:id', requireAdmin, async (req, res) => {
  requireObjectId(req.params.id, 'message id');
  const deleted = await ContactMessage.findByIdAndDelete(req.params.id);
  if (!deleted) throw ApiError.notFound('Message not found.');
  res.status(204).end();
});

// GET /api/admin/activity - newest lines from logs/activity.log (File System module)
router.get('/activity', async (_req, res) => {
  // Sign-ins are left out so the dashboard shows business events
  res.json({ activity: await readRecentActivity(12, { skip: ['user:login'] }) });
});

module.exports = router;
