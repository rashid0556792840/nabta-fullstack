const mongoose = require('mongoose');
const multer = require('multer');
const ApiError = require('../utils/ApiError');

function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Express 5 forwards errors thrown in async handlers here automatically.
// Every error leaves the API in one shape: { error: { status, code, message, details?, params? } }
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let status = err.status || 500;
  let message = err.message || 'Unexpected server error.';
  let details = err.details;
  let code = err instanceof ApiError ? err.code : undefined;
  const params = err instanceof ApiError ? err.params : undefined;

  if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    code = 'validation';
    message = 'Please check the highlighted fields.';
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    code = 'bad_request';
    message = `Invalid value for ${err.path}.`;
  } else if (err && err.code === 11000) {
    status = 409;
    code = 'duplicate';
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    message = `That ${field} is already in use.`;
  } else if (err instanceof multer.MulterError) {
    status = 400;
    code = err.code === 'LIMIT_FILE_SIZE' ? 'image_too_large' : 'upload_failed';
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 2 MB or smaller.' : err.message;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    code = 'bad_json';
    message = 'Request body is not valid JSON.';
  }

  if (status >= 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
    code = 'server_error';
    if (process.env.NODE_ENV === 'production') message = 'Unexpected server error.';
  }

  res.status(status).json({
    error: { status, code: code || 'error', message, ...(details ? { details } : {}), ...(params ? { params } : {}) },
  });
}

module.exports = { notFound, errorHandler };
