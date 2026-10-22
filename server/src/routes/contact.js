const express = require('express');
const ContactMessage = require('../models/ContactMessage');
const { PATTERNS, sanitizeText, validator } = require('../utils/validate');
const storeEvents = require('../services/events');

const router = express.Router();

// POST /api/contact - public contact form; emails the store automatically
router.post('/', async (req, res) => {
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

  const message = await ContactMessage.create(data);
  storeEvents.emit('contact:received', { message });
  res.status(201).json({ message: 'Thanks! We will get back to you soon.' });
});

module.exports = router;
