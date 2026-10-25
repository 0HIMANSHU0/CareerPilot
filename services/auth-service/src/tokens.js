const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { COOKIE_NAMES } = require('@careerpilot/shared/constants');
const { errors } = require('@careerpilot/service-kit');
const env = require('./config');
const { RefreshToken, UserToken } = require('./models/tokens');

const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('base64url');

// Access token claims are all the gateway needs to authorize requests on its own.
function signAccessToken(user) {
  return jwt.sign({ role: user.role, email: user.email, name: user.name }, env.JWT_ACCESS_SECRET, {
    subject: user._id.toString(),
    issuer: 'auth-service',
    audience: 'careerpilot',
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  });
}

const cookieOptions = () => ({ httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'lax', path: '/' });

async function issueSession(res, user, family = crypto.randomUUID()) {
  const refresh = randomToken();
  await RefreshToken.create({
    userId: user._id,
    tokenHash: hash(refresh),
    family,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_SECONDS * 1000),
  });
  res.cookie(COOKIE_NAMES.ACCESS, signAccessToken(user), { ...cookieOptions(), maxAge: env.ACCESS_TOKEN_TTL_SECONDS * 1000 });
  res.cookie(COOKIE_NAMES.REFRESH, refresh, { ...cookieOptions(), maxAge: env.REFRESH_TOKEN_TTL_SECONDS * 1000 });
}

// Rotate: revoke the presented token and issue a new one in the same family.
// Presenting an already-revoked token means it was stolen/replayed -> revoke the whole family.
async function rotateRefreshToken(rawToken) {
  if (!rawToken) throw errors.unauthorized('No refresh token');
  const doc = await RefreshToken.findOne({ tokenHash: hash(rawToken) });
  if (!doc || doc.expiresAt < new Date()) throw errors.unauthorized('Session expired. Please sign in again.');
  if (doc.revokedAt) {
    await RefreshToken.updateMany({ family: doc.family }, { revokedAt: new Date() });
    throw errors.unauthorized('Session was revoked. Please sign in again.');
  }
  const claimed = await RefreshToken.findOneAndUpdate({ _id: doc._id, revokedAt: null }, { revokedAt: new Date() });
  if (!claimed) throw errors.unauthorized('Session was revoked. Please sign in again.');
  return doc;
}

async function revokeRefreshToken(rawToken) {
  if (rawToken) await RefreshToken.updateOne({ tokenHash: hash(rawToken) }, { revokedAt: new Date() });
}

const revokeAllForUser = (userId) => RefreshToken.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });

function clearSession(res) {
  res.clearCookie(COOKIE_NAMES.ACCESS, cookieOptions());
  res.clearCookie(COOKIE_NAMES.REFRESH, cookieOptions());
}

async function createUserToken(userId, type, ttlMinutes) {
  const raw = randomToken();
  await UserToken.create({ userId, type, tokenHash: hash(raw), expiresAt: new Date(Date.now() + ttlMinutes * 60000) });
  return raw;
}

// Atomically marks the token used so it can only be consumed once.
async function consumeUserToken(raw, type) {
  const doc = await UserToken.findOneAndUpdate(
    { tokenHash: hash(raw), type, usedAt: null, expiresAt: { $gt: new Date() } },
    { usedAt: new Date() },
  );
  if (!doc) throw errors.badRequest('This link is invalid or has expired');
  return doc;
}

module.exports = {
  issueSession,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
  clearSession,
  createUserToken,
  consumeUserToken,
};
