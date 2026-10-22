const express = require('express');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { PATTERNS, sanitizeText, validator } = require('../utils/validate');
const { signToken, requireAuth } = require('../middleware/auth');
const storeEvents = require('../services/events');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const name = sanitizeText(req.body.name, 80);
  const email = sanitizeText(req.body.email, 120).toLowerCase();
  const password = String(req.body.password || '');

  const v = validator();
  v.check(PATTERNS.name.test(name), 'name', 'Enter your full name (letters only).');
  v.check(PATTERNS.email.test(email), 'email', 'Enter a valid email address.');
  v.check(PATTERNS.password.test(password), 'password', 'Password needs 10+ characters with letters and numbers.');
  v.throwIfErrors();

  if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists.');

  const user = new User({ name, email, role: 'customer' });
  await user.setPassword(password);
  await user.save();

  storeEvents.emit('user:registered', { user });
  res.status(201).json({ token: signToken(user), user });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const email = sanitizeText(req.body.email, 120).toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) throw ApiError.badRequest('Email and password are required.');

  const user = await User.findOne({ email }).select('+passwordHash');
  // Same message for unknown email and wrong password, so attackers cannot discover accounts
  if (!user || !(await user.checkPassword(password))) {
    throw ApiError.unauthorized('Email or password is incorrect.');
  }
  if (!user.isActive) throw ApiError.forbidden('This account has been disabled. Contact the store.');

  user.lastLoginAt = new Date();
  await user.save();

  storeEvents.emit('user:login', { user });
  res.json({ token: signToken(user), user });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/me - update profile and default address
router.put('/me', requireAuth, async (req, res) => {
  const name = sanitizeText(req.body.name, 80);
  const phone = sanitizeText(req.body.phone, 20);
  const address = req.body.address || {};

  const v = validator();
  v.check(PATTERNS.name.test(name), 'name', 'Enter your full name (letters only).');
  v.check(!phone || PATTERNS.phone.test(phone), 'phone', 'Enter a valid phone number.');
  v.throwIfErrors();

  req.user.name = name;
  req.user.phone = phone;
  req.user.address = {
    fullName: sanitizeText(address.fullName, 80),
    phone: sanitizeText(address.phone, 20),
    city: sanitizeText(address.city, 60),
    street: sanitizeText(address.street, 160),
  };
  await req.user.save();
  res.json({ user: req.user });
});

// PUT /api/auth/me/password
router.put('/me/password', requireAuth, async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  const { currentPassword = '', newPassword = '' } = req.body;
  if (!(await user.checkPassword(String(currentPassword)))) {
    throw ApiError.badRequest('Current password is incorrect.', { currentPassword: 'Incorrect password.' });
  }
  if (!PATTERNS.password.test(String(newPassword))) {
    throw ApiError.badRequest('Please check the highlighted fields.', {
      newPassword: 'Password needs 10+ characters with letters and numbers.',
    });
  }
  await user.setPassword(String(newPassword));
  await user.save();
  res.json({ message: 'Password updated.' });
});

module.exports = router;
