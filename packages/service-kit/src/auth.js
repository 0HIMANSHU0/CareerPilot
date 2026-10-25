const jwt = require('jsonwebtoken');
const { AppError, errors } = require('./errors');

const INTERNAL_HEADER = 'x-internal-token';
const OPTIONS = { issuer: 'gateway', audience: 'internal-services' };

// Gateway -> service: short-lived token signed with the shared INTERNAL_SECRET.
// It carries the already-verified user (or null for public routes).
function signInternalToken(secret, user) {
  return jwt.sign({ user: user || null }, secret, { ...OPTIONS, expiresIn: '60s' });
}

// Services reject any request that did not come through the gateway.
function requireInternal(secret) {
  return (req, res, next) => {
    const token = req.get(INTERNAL_HEADER);
    if (!token) return next(new AppError(401, 'MISSING_INTERNAL_TOKEN', 'Requests must come through the gateway'));
    try {
      req.user = jwt.verify(token, secret, OPTIONS).user;
      next();
    } catch {
      next(new AppError(401, 'INVALID_INTERNAL_TOKEN', 'Requests must come through the gateway'));
    }
  };
}

function requireAuth(req, res, next) {
  if (!req.user) return next(errors.unauthorized());
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(errors.unauthorized());
    if (!roles.includes(req.user.role)) return next(errors.forbidden());
    next();
  };
}

module.exports = { INTERNAL_HEADER, signInternalToken, requireInternal, requireAuth, requireRole };
