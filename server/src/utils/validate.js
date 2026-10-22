// Server-side validation and sanitization (Unit 3: RegExp, secure form handling).
// The browser validates too, but the server never trusts client input.
const mongoose = require('mongoose');
const ApiError = require('./ApiError');

const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  // 10+ characters with at least one letter and one digit
  password: /^(?=.*[A-Za-z])(?=.*\d).{10,72}$/,
  phone: /^\+?[0-9\s-]{7,20}$/,
  name: /^[\p{L}][\p{L}\s.'-]{1,79}$/u,
};

/** Removes HTML tags and control characters so stored text cannot inject scripts. */
function sanitizeText(value, maxLength = 1000) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/<[^>]*>/g, '') // strip HTML tags such as <script>
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // control chars
    .replace(/javascript:/gi, '')
    .trim()
    .slice(0, maxLength);
}

/** Escapes RegExp special characters so user search text is matched literally. */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isObjectId(value) {
  return mongoose.isValidObjectId(value) && String(new mongoose.Types.ObjectId(String(value))) === String(value);
}

function requireObjectId(value, label = 'id') {
  if (!isObjectId(value)) throw ApiError.badRequest(`Invalid ${label}.`);
  return value;
}

/**
 * Collects field errors and throws one 400 error listing all of them.
 * Usage: const v = validator(); v.check(cond, 'field', 'msg'); v.throwIfErrors();
 */
function validator() {
  const errors = {};
  return {
    check(condition, field, message) {
      if (!condition && !errors[field]) errors[field] = message;
    },
    throwIfErrors() {
      if (Object.keys(errors).length) {
        throw ApiError.badRequest('Please check the highlighted fields.', errors);
      }
    },
  };
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

module.exports = { PATTERNS, sanitizeText, escapeRegex, isObjectId, requireObjectId, validator, toNumber };
