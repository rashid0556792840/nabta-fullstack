const express = require('express');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { PATTERNS, sanitizeText, requireObjectId, validator } = require('../utils/validate');
const { signToken, requireAuth } = require('../middleware/auth');
const storeEvents = require('../services/events');

const router = express.Router();
const lang = (v) => (v === 'en' ? 'en' : 'ar');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const name = sanitizeText(req.body.name, 80);
  const email = sanitizeText(req.body.email, 120).toLowerCase();
  const password = String(req.body.password || '');
  const phone = sanitizeText(req.body.phone, 20);

  const v = validator();
  v.check(PATTERNS.name.test(name), 'name', 'Enter your full name (letters only).');
  v.check(PATTERNS.email.test(email), 'email', 'Enter a valid email address.');
  v.check(!phone || PATTERNS.phone.test(phone), 'phone', 'Enter a valid phone number.');
  v.check(PATTERNS.password.test(password), 'password', 'Password needs 10+ characters with letters and numbers.');
  v.throwIfErrors();

  if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists.', 'email_taken');

  const user = new User({ name, email, phone, role: 'customer', language: lang(req.body.language) });
  await user.setPassword(password);
  await user.save();

  storeEvents.emit('user:registered', { user });
  res.status(201).json({ token: signToken(user), user });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const email = sanitizeText(req.body.email, 120).toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) throw ApiError.badRequest('Email and password are required.', undefined, 'credentials_required');

  const user = await User.findOne({ email }).select('+passwordHash');
  // Same message for unknown email and wrong password, so attackers cannot discover accounts
  if (!user || !(await user.checkPassword(password))) {
    throw ApiError.unauthorized('Email or password is incorrect.', 'invalid_credentials');
  }
  if (!user.isActive) throw ApiError.forbidden('This account has been disabled. Contact the store.', 'account_disabled');

  user.lastLoginAt = new Date();
  await user.save();

  storeEvents.emit('user:login', { user });
  res.json({ token: signToken(user), user });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/me - update name, phone and preferred language
router.put('/me', requireAuth, async (req, res) => {
  const name = sanitizeText(req.body.name, 80);
  const phone = sanitizeText(req.body.phone, 20);

  const v = validator();
  v.check(PATTERNS.name.test(name), 'name', 'Enter your full name (letters only).');
  v.check(!phone || PATTERNS.phone.test(phone), 'phone', 'Enter a valid phone number.');
  v.throwIfErrors();

  req.user.name = name;
  req.user.phone = phone;
  if (req.body.language) req.user.language = lang(req.body.language);
  await req.user.save();
  res.json({ user: req.user });
});

// PATCH /api/auth/me/language - remembered so emails arrive in the same language
router.patch('/me/language', requireAuth, async (req, res) => {
  req.user.language = lang(req.body.language);
  await req.user.save();
  res.json({ user: req.user });
});

// PUT /api/auth/me/password
router.put('/me/password', requireAuth, async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  const { currentPassword = '', newPassword = '' } = req.body;
  if (!(await user.checkPassword(String(currentPassword)))) {
    throw ApiError.badRequest('Current password is incorrect.', { currentPassword: 'Incorrect password.' }, 'wrong_password');
  }
  if (!PATTERNS.password.test(String(newPassword))) {
    throw ApiError.badRequest('Please check the highlighted fields.', {
      newPassword: 'Password needs 10+ characters with letters and numbers.',
    }, 'weak_password');
  }
  await user.setPassword(String(newPassword));
  await user.save();
  res.json({ message: 'Password updated.' });
});

// ---------- Saved addresses (one-to-many, embedded in the user) ----------

function readAddress(body) {
  const a = {
    label: sanitizeText(body.label, 40),
    fullName: sanitizeText(body.fullName, 80),
    phone: sanitizeText(body.phone, 20),
    city: sanitizeText(body.city, 60),
    street: sanitizeText(body.street, 160),
  };
  const v = validator();
  v.check(a.label.length >= 1, 'label', 'Give the address a name, e.g. Home.');
  v.check(a.fullName.length >= 2, 'fullName', 'Enter the receiver name.');
  v.check(PATTERNS.phone.test(a.phone), 'phone', 'Enter a valid phone number.');
  v.check(a.city.length >= 2, 'city', 'Enter the city.');
  v.check(a.street.length >= 5, 'street', 'Enter the full street address.');
  v.throwIfErrors();
  return a;
}

// GET /api/auth/me/addresses
router.get('/me/addresses', requireAuth, (req, res) => {
  res.json({ addresses: req.user.addresses });
});

// POST /api/auth/me/addresses
router.post('/me/addresses', requireAuth, async (req, res) => {
  if (req.user.addresses.length >= 10) throw ApiError.badRequest('You can save up to 10 addresses.', undefined, 'address_limit');
  req.user.addresses.push(readAddress(req.body));
  await req.user.save();
  res.status(201).json({ addresses: req.user.addresses });
});

// PUT /api/auth/me/addresses/:addressId
router.put('/me/addresses/:addressId', requireAuth, async (req, res) => {
  requireObjectId(req.params.addressId, 'address id');
  const address = req.user.addresses.id(req.params.addressId);
  if (!address) throw ApiError.notFound('Address not found.');
  address.set(readAddress(req.body));
  await req.user.save();
  res.json({ addresses: req.user.addresses });
});

// DELETE /api/auth/me/addresses/:addressId
router.delete('/me/addresses/:addressId', requireAuth, async (req, res) => {
  requireObjectId(req.params.addressId, 'address id');
  const address = req.user.addresses.id(req.params.addressId);
  if (!address) throw ApiError.notFound('Address not found.');
  address.deleteOne();
  await req.user.save();
  res.json({ addresses: req.user.addresses });
});

module.exports = router;
