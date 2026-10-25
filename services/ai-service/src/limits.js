const rateLimit = require('express-rate-limit');
const env = require('./config');

// AI-specific rate limit keyed by user id (the gateway already verified identity).
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.AI_RATE_LIMIT_PER_MINUTE,
  keyGenerator: (req) => req.user.id,
  standardHeaders: true,
  legacyHeaders: false,
  // validate: { keyGeneratorIpFallback: false },
  message: { error: { code: 'AI_RATE_LIMITED', message: 'You are sending messages too fast. Please wait a minute.' } },
});

module.exports = { aiLimiter };
