const express = require('express');
const mongoose = require('mongoose');
const {
  createServiceApp,
  finalizeApp,
  startService,
  createLogger,
  requireInternal,
} = require('@careerpilot/service-kit');
const cookieParser = require('cookie-parser');
const env = require('./config');

const logger = createLogger('auth-service');
const app = createServiceApp({ name: 'auth-service', logger, mongoose });

app.use(express.json({ limit: '100kb' }));
app.use(requireInternal(env.INTERNAL_SECRET));
app.use(cookieParser());
app.use('/auth', require('./routes/auth'));
app.use('/users', require('./routes/users'));

finalizeApp(app, logger);
startService({ app, port: env.PORT, logger, mongoose, mongoUri: env.MONGO_URI }).catch((err) => {
  logger.fatal({ err }, 'Failed to start');
  process.exit(1);
});
