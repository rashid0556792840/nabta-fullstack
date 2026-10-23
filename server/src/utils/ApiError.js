// An error with an HTTP status. `code` lets the frontend show the message in the user's language;
// `params` fills values into that message (for example the product name and stock left).
class ApiError extends Error {
  constructor(status, message, details, code, params) {
    super(message);
    this.status = status;
    this.details = details;
    this.code = code;
    this.params = params;
  }

  static badRequest(msg, details, code = 'bad_request', params) { return new ApiError(400, msg, details, code, params); }
  static unauthorized(msg = 'Please sign in to continue.', code = 'unauthorized') { return new ApiError(401, msg, undefined, code); }
  static forbidden(msg = 'You do not have permission to do this.', code = 'forbidden') { return new ApiError(403, msg, undefined, code); }
  static notFound(msg = 'Not found.', code = 'not_found') { return new ApiError(404, msg, undefined, code); }
  static conflict(msg, code = 'conflict', params) { return new ApiError(409, msg, undefined, code, params); }
}

module.exports = ApiError;
