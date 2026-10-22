const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

/** Requires a valid "Authorization: Bearer <token>" header and loads req.user. */
async function requireAuth(req, _res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw ApiError.unauthorized('Your session has expired. Please sign in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('This account is not active.');
  req.user = user;
  next();
}

/** Like requireAuth, but never blocks: sets req.user when a valid token is sent, otherwise continues as a guest. */
async function optionalAuth(req, _res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme === 'Bearer' && token) {
    try {
      const payload = jwt.verify(token, env.jwtSecret);
      const user = await User.findById(payload.sub);
      if (user && user.isActive) req.user = user;
    } catch {
      /* invalid or expired token: treat as guest */
    }
  }
  next();
}

function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) throw ApiError.forbidden();
    next();
  };
}

module.exports = { signToken, requireAuth, optionalAuth, requireAdmin: requireRole('admin'), requireRole };
