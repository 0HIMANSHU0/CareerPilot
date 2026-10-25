const express = require('express');
const mongoose = require('mongoose');
const {
  createServiceApp,
  finalizeApp,
  startService,
  createLogger,
  requireInternal,
} = require('@careerpilot/service-kit');
const env = require('./config');
const { payments, calendar, mailer } = require('./providers');
const { webhookRouter, mockRouter } = require('./routes/payments');
const workflow = require('./workflow');

const logger = createLogger('booking-service');
const app = createServiceApp({ name: 'booking-service', logger, mongoose });

// Stripe calls this directly, so it is mounted BEFORE the JSON parser and internal-token check.
app.use('/webhooks', webhookRouter);

app.use(express.json({ limit: '100kb' }));
app.use(requireInternal(env.INTERNAL_SECRET));
app.use('/internal', require('./routes/internal'));
app.use('/consultants', require('./routes/consultants').router);
app.use('/bookings', require('./routes/bookings'));
app.use('/payments', mockRouter);

const mode = (mock) => (mock ? 'MOCK' : 'live');
logger.info(`Providers -> stripe: ${mode(payments.mock)}, calendar: ${mode(calendar.mock)}, email: ${mode(mailer.mock)}`);

finalizeApp(app, logger);
startService({ app, port: env.PORT, logger, mongoose, mongoUri: env.MONGO_URI })
  .then(() => workflow.startWorkers())
  .catch((err) => {
    logger.fatal({ err }, 'Failed to start');
    process.exit(1);
  });
