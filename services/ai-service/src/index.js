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

const logger = createLogger('ai-service');
const app = createServiceApp({ name: 'ai-service', logger, mongoose });

app.use(express.json({ limit: '1mb' }));
app.use(requireInternal(env.INTERNAL_SECRET));
app.use('/internal', require('./routes/internal'));
app.use('/chat', require('./routes/chat'));
app.use('/resumes', require('./routes/resumes'));

logger.info(`LLM mode: ${env.EMERGENT_LLM_KEY ? `live (${env.LLM_MODEL})` : 'MOCK (no key configured)'}`);

finalizeApp(app, logger);
startService({ app, port: env.PORT, logger, mongoose, mongoUri: env.MONGO_URI }).catch((err) => {
  logger.fatal({ err }, 'Failed to start');
  process.exit(1);
});
