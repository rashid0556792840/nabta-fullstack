const express = require('express');
const ContactMessage = require('../models/ContactMessage');
const { PATTERNS, sanitizeText, validator } = require('../utils/validate');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const storeEvents = require('../services/events');

const router = express.Router();

// POST /api/contact - public contact form; emails the store automatically.
// If the sender is signed in, the message is linked to their account so they can read replies on the site.
router.post('/', optionalAuth, async (req, res) => {
  const data = {
    name: sanitizeText(req.body.name, 80),
    email: sanitizeText(req.body.email, 120).toLowerCase(),
    subject: sanitizeText(req.body.subject, 120),
    message: sanitizeText(req.body.message, 2000),
  };
  const v = validator();
  v.check(data.name.length >= 2, 'name', 'Enter your name.');
  v.check(PATTERNS.email.test(data.email), 'email', 'Enter a valid email address.');
  v.check(data.subject.length >= 3, 'subject', 'Enter a subject.');
  v.check(data.message.length >= 10, 'message', 'Message needs at least 10 characters.');
  v.throwIfErrors();

  if (req.user) data.user = req.user._id;
  const message = await ContactMessage.create(data);
  storeEvents.emit('contact:received', { message });
  res.status(201).json({
    id: message._id,
    message: req.user
      ? 'Thanks! Our reply will appear under Messages in your account.'
      : 'Thanks! We will reply to your email address.',
  });
});

// GET /api/contact/mine - the signed-in customer's messages with the store's replies
router.get('/mine', requireAuth, async (req, res) => {
  const messages = await ContactMessage.find({ $or: [{ user: req.user._id }, { email: req.user.email }] })
    .sort({ createdAt: -1 })
    .limit(50)
    .select('-isRead -__v');
  res.json({ messages });
});

module.exports = router;
