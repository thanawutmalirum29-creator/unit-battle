// middleware/asyncHandler.js
// Express 4 doesn't catch errors thrown/rejected inside async route handlers.
// Wrapping each handler with this ensures any thrown error (DB failure, etc.)
// is forwarded to next(err) and handled by the central error handler in server.js,
// instead of the request hanging forever or crashing the process.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
