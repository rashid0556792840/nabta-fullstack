// Company information shown in the header, footer, contact page and emails. Admin edits it.
const express = require('express');
const CompanySettings = require('../models/CompanySettings');
const { PATTERNS, sanitizeText, validator, toNumber } = require('../utils/validate');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../services/activityLog');

const router = express.Router();

const URL_FIELDS = ['mapsUrl', 'instagramUrl', 'xUrl', 'snapchatUrl', 'tiktokUrl'];
const TEXT_FIELDS = {
  nameEn: 80, nameAr: 80, taglineEn: 160, taglineAr: 160,
  addressEn: 200, addressAr: 200, hoursEn: 120, hoursAr: 120,
};
const httpsUrl = /^https:\/\/[^\s<>"']+$/i;

// GET /api/company - public
router.get('/', async (_req, res) => {
  res.json({ company: await CompanySettings.get() });
});

// PUT /api/company - admin only
router.put('/', requireAuth, requireAdmin, async (req, res) => {
  const b = req.body || {};
  const update = {};
  for (const [field, max] of Object.entries(TEXT_FIELDS)) {
    if (b[field] !== undefined) update[field] = sanitizeText(b[field], max);
  }
  for (const field of URL_FIELDS) {
    if (b[field] !== undefined) update[field] = sanitizeText(b[field], 500);
  }
  if (b.phone !== undefined) update.phone = sanitizeText(b.phone, 20);
  if (b.whatsapp !== undefined) update.whatsapp = sanitizeText(b.whatsapp, 20).replace(/[\s+-]/g, '');
  if (b.email !== undefined) update.email = sanitizeText(b.email, 120).toLowerCase();
  if (b.logoUrl !== undefined) update.logoUrl = sanitizeText(b.logoUrl, 300);
  for (const field of ['foundedYear', 'deliveryFee', 'freeDeliveryFrom']) {
    if (b[field] !== undefined && b[field] !== '') update[field] = toNumber(b[field]);
  }

  const v = validator();
  v.check(update.nameEn === undefined || update.nameEn.length >= 2, 'nameEn', 'Enter the English name.');
  v.check(update.nameAr === undefined || update.nameAr.length >= 2, 'nameAr', 'Enter the Arabic name.');
  v.check(!update.phone || PATTERNS.phone.test(update.phone), 'phone', 'Enter a valid phone number.');
  v.check(!update.whatsapp || /^\d{8,15}$/.test(update.whatsapp), 'whatsapp', 'Use the international number, e.g. 966531130555.');
  v.check(!update.email || PATTERNS.email.test(update.email), 'email', 'Enter a valid email address.');
  for (const field of URL_FIELDS) {
    v.check(!update[field] || httpsUrl.test(update[field]), field, 'Links must start with https://');
  }
  v.check(!update.logoUrl || /^(https:\/\/|\/api\/images\/)[^\s]+$/i.test(update.logoUrl), 'logoUrl', 'Upload a logo or paste an https:// link.');
  v.check(update.foundedYear === undefined || (Number.isInteger(update.foundedYear) && update.foundedYear >= 1900 && update.foundedYear <= 2100), 'foundedYear', 'Enter a year such as 2018.');
  v.check(update.deliveryFee === undefined || (update.deliveryFee >= 0 && update.deliveryFee <= 1000), 'deliveryFee', 'Enter a fee between 0 and 1000.');
  v.check(update.freeDeliveryFrom === undefined || (update.freeDeliveryFrom >= 0 && update.freeDeliveryFrom <= 100000), 'freeDeliveryFrom', 'Enter an amount between 0 and 100,000.');
  v.throwIfErrors();

  const company = await CompanySettings.get();
  Object.assign(company, update);
  await company.save();
  await logActivity('company:updated', { by: req.user.email });
  res.json({ company });
});

module.exports = router;
