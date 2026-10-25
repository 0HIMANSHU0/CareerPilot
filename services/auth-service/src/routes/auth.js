const express = require('express');
const bcrypt = require('bcrypt');
const { COOKIE_NAMES } = require('@careerpilot/shared/constants');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} = require('@careerpilot/shared');
const { validate, requireAuth, errors } = require('@careerpilot/service-kit');
const User = require('../models/User');
const env = require('../config');
const tokens = require('../tokens');
const { sendLink } = require('../email');

const router = express.Router();
const DUMMY_HASH = bcrypt.hashSync('timing-safe-dummy', 10);

function sendVerification(user) {
  return tokens.createUserToken(user._id, 'VERIFY_EMAIL', 24 * 60).then((token) =>
    sendLink({
      to: user.email,
      subject: 'Verify your CareerPilot email',
      title: `Welcome, ${user.name}`,
      body: 'Confirm your email address to secure your account.',
      path: '/verify-email',
      token,
      cta: 'Verify email',
    }),
  );
}

// Register: schema only allows USER/CONSULTANT, so ADMIN can never self-register.
router.post('/register', validate({ body: registerSchema }), async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  if (await User.exists({ email })) throw errors.conflict('An account with this email already exists');
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const user = await User.create({ name, email, phone: phone || undefined, role, passwordHash });
  await tokens.issueSession(res, user);
  const devVerifyUrl = await sendVerification(user);
  res.status(201).json({ user, devVerifyUrl });
});

router.post('/login', validate({ body: loginSchema }), async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+passwordHash');
  // Compare against a dummy hash for unknown emails to keep response timing uniform.
  const valid = await bcrypt.compare(req.body.password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !valid) throw errors.unauthorized('Invalid email or password');
  await tokens.issueSession(res, user);
  res.json({ user });
});

router.post('/refresh', async (req, res) => {
  try {
    const old = await tokens.rotateRefreshToken(req.cookies[COOKIE_NAMES.REFRESH]);
    const user = await User.findById(old.userId);
    if (!user) throw errors.unauthorized('Account no longer exists');
    await tokens.issueSession(res, user, old.family);
    res.json({ user });
  } catch (err) {
    tokens.clearSession(res);
    throw err;
  }
});

router.post('/logout', async (req, res) => {
  await tokens.revokeRefreshToken(req.cookies[COOKIE_NAMES.REFRESH]);
  tokens.clearSession(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw errors.notFound('User not found');
  res.json({ user });
});

// Always 200 so the endpoint cannot be used to discover registered emails.
router.post('/forgot-password', validate({ body: forgotPasswordSchema }), async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  let devResetUrl;
  if (user) {
    const token = await tokens.createUserToken(user._id, 'RESET_PASSWORD', 30);
    devResetUrl = await sendLink({
      to: user.email,
      subject: 'Reset your CareerPilot password',
      title: 'Password reset',
      body: 'Use the link below within 30 minutes to choose a new password.',
      path: '/reset-password',
      token,
      cta: 'Reset password',
    });
  }
  res.json({ ok: true, message: 'If an account exists for this email, a reset link has been sent.', devResetUrl });
});

router.post('/reset-password', validate({ body: resetPasswordSchema }), async (req, res) => {
  const doc = await tokens.consumeUserToken(req.body.token, 'RESET_PASSWORD');
  const passwordHash = await bcrypt.hash(req.body.password, env.BCRYPT_ROUNDS);
  await User.updateOne({ _id: doc.userId }, { passwordHash });
  await tokens.revokeAllForUser(doc.userId); // sign out every device
  tokens.clearSession(res);
  res.json({ ok: true });
});

router.post('/verify-email', validate({ body: verifyEmailSchema }), async (req, res) => {
  const doc = await tokens.consumeUserToken(req.body.token, 'VERIFY_EMAIL');
  await User.updateOne({ _id: doc.userId }, { emailVerified: true });
  res.json({ ok: true });
});

router.post('/resend-verification', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw errors.notFound('User not found');
  if (user.emailVerified) return res.json({ ok: true, alreadyVerified: true });
  const devVerifyUrl = await sendVerification(user);
  res.json({ ok: true, devVerifyUrl });
});

module.exports = router;
