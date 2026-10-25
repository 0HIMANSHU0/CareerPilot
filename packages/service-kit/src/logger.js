const pino = require('pino');

// Structured JSON logger; sensitive headers are redacted.
function createLogger(name) {
  return pino({
    name,
    level: process.env.LOG_LEVEL || 'info',
    redact: [
      'req.headers.cookie',
      'req.headers.authorization',
      'req.headers["x-internal-token"]',
      'res.headers["set-cookie"]',
    ],
  });
}

module.exports = { createLogger };
