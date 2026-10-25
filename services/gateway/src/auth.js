const jwt = require('jsonwebtoken');
const { COOKIE_NAMES } = require('@careerpilot/shared/constants');
const { errors } = require('@careerpilot/service-kit');
const env = require('./config');

// Routes reachable without a session.
const PUBLIC_PATHS = new Set([
  '/api/health',
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/stripe/webhook',
]);

// The gateway verifies the access JWT locally (no call to auth-service),
// so other features keep working when auth-service is down.
function authenticate(req, res, next) {
  const token = req.cookies?.[COOKIE_NAMES.ACCESS];
  req.user = null;
  if (token) {
    try {
      const p = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'auth-service', audience: 'careerpilot' });
      req.user = { id: p.sub, role: p.role, email: p.email, name: p.name };
    } catch {
      req.user = null;
    }
  }
  next();
}

function requireSessionUnlessPublic(req, res, next) {
  // Mounted under /api, so rebuild the full path; normalize case and trailing slash like Express routing does.
  const fullPath = (req.baseUrl + req.path).toLowerCase().replace(/\/+$/, '');
  if (PUBLIC_PATHS.has(fullPath) || req.user) return next();
  next(errors.unauthorized());
}

module.exports = { authenticate, requireSessionUnlessPublic };
