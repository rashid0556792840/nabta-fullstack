const express = require('express');
const Notification = require('../models/Notification');
const { requireObjectId } = require('../utils/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/notifications - newest 30 + unread count (the bell polls this)
router.get('/', async (req, res) => {
  const [notifications, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30),
    Notification.countDocuments({ user: req.user._id, readAt: null }),
  ]);
  res.json({ notifications, unread });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  requireObjectId(req.params.id, 'notification id');
  await Notification.updateOne({ _id: req.params.id, user: req.user._id, readAt: null }, { readAt: new Date() });
  res.json({ ok: true });
});

// POST /api/notifications/read-all
router.post('/read-all', async (req, res) => {
  await Notification.updateMany({ user: req.user._id, readAt: null }, { readAt: new Date() });
  res.json({ ok: true });
});

module.exports = router;
