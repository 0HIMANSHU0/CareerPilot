const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { createServiceApp, finalizeApp, startService, createLogger } = require('@careerpilot/service-kit');
const env = require('./config');
const services = require('./services');
const { authenticate, requireSessionUnlessPublic } = require('./auth');
const { serviceProxy } = require('./proxy');
const routes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const openapi = require('./openapi');

const logger = createLogger('gateway');
const app = createServiceApp({ name: 'gateway', logger });

app.set('trust proxy', env.TRUST_PROXY);
app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
app.use(cookieParser());

const limiterResponse = (message) => ({ error: { code: 'RATE_LIMITED', message } });
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, message: limiterResponse('Too many requests, slow down.') }));
app.use(
  ['/api/auth/login', '/api/auth/register'],
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, message: limiterResponse('Too many attempts. Try again later.') }),
);

// Interactive API docs (public).
app.get('/api/docs.json', (req, res) => res.json(openapi));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'CareerPilot API' }));

// Stripe webhook: raw pass-through to booking-service, which verifies the Stripe signature itself.
app.use(createProxyMiddleware({
  target: env.BOOKING_SERVICE_URL,
  pathFilter: '/api/stripe/webhook',
  pathRewrite: { '^/api/stripe/webhook': '/webhooks/stripe' },
}));

// 1) identify the user from the JWT cookie, 2) block anonymous access to private routes.
app.use(authenticate);
app.use('/api', requireSessionUnlessPublic);

app.use('/api', routes);
services.forEach((service) => app.use(serviceProxy(service, logger)));

app.use(express.json());
finalizeApp(app, logger);

startService({ app, port: env.PORT, logger });
