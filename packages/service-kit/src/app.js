const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const { notFoundHandler, errorHandler } = require('./errors');

const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

// Base Express app with security headers, request logging and a public /health endpoint.
function createServiceApp({ name, logger, mongoose }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),
      autoLogging: { ignore: (req) => req.url === '/health' },
    }),
  );
  app.get('/health', (req, res) => {
    const db = mongoose ? DB_STATES[mongoose.connection.readyState] || 'unknown' : 'n/a';
    const ok = !mongoose || db === 'connected';
    res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'degraded', service: name, db, uptime: process.uptime() });
  });
  return app;
}

function finalizeApp(app, logger) {
  app.use(notFoundHandler);
  app.use(errorHandler(logger));
}

// Connect to Mongo (if used), listen, and shut down gracefully.
async function startService({ app, port, logger, mongoose, mongoUri }) {
  if (mongoose) {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    logger.info('MongoDB connected');
    // Ensure schema indexes (incl. unique constraints) exist even if a collection was dropped; fails fast on conflicts.
    await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
    logger.info('Indexes synced');
  }
  const server = app.listen(port, '0.0.0.0', () => logger.info(`Listening on port ${port}`));
  const shutdown = async () => {
    server.close();
    if (mongoose) await mongoose.disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  return server;
}

// Fail fast on missing/invalid configuration.
function loadEnv(schema) {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment configuration:', result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

module.exports = { createServiceApp, finalizeApp, startService, loadEnv };
