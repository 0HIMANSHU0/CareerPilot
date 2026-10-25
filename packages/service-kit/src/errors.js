// Consistent error shape for every service: { error: { code, message, details? } }
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const errors = {
  badRequest: (message, details) => new AppError(400, 'BAD_REQUEST', message, details),
  unauthorized: (message = 'Authentication required') => new AppError(401, 'UNAUTHORIZED', message),
  forbidden: (message = 'You do not have access to this resource') => new AppError(403, 'FORBIDDEN', message),
  notFound: (message = 'Resource not found') => new AppError(404, 'NOT_FOUND', message),
  conflict: (message) => new AppError(409, 'CONFLICT', message),
  unavailable: (message) => new AppError(503, 'SERVICE_UNAVAILABLE', message),
};

function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
}

// Never leak stack traces or internal messages for unexpected errors.
function errorHandler(logger) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: err.flatten().fieldErrors },
      });
    }
    if (err instanceof AppError) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Malformed JSON body' } });
    }
    if (err.code === 11000) {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'Duplicate value' } });
    }
    logger.error({ err, path: req.path }, 'Unhandled error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  };
}

module.exports = { AppError, errors, notFoundHandler, errorHandler };
