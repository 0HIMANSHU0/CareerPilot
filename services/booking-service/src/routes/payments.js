const express = require('express');
const { z } = require('zod');
const { objectIdSchema } = require('@careerpilot/shared');
const { validate, requireRole, errors, createLogger } = require('@careerpilot/service-kit');
const { Booking } = require('../models');
const { payments } = require('../providers');
const workflow = require('../workflow');

const logger = createLogger('payments');

// Stripe webhook: called by Stripe directly (no gateway token); authenticated by signature on the RAW body.
const webhookRouter = express.Router();
webhookRouter.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  if (payments.mock) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Stripe is in mock mode' } });
  let event;
  try {
    event = payments.verifyWebhook(req.body, req.get('stripe-signature'));
  } catch {
    return res.status(400).json({ error: { code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature' } });
  }
  const session = event.data.object;
  const bookingId = session.metadata?.bookingId;
  if (!bookingId) return res.json({ received: true });
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    if (session.payment_status === 'paid') {
      const r = await workflow.markPaid(bookingId, { provider: 'stripe', sessionId: session.id, eventId: event.id });
      logger.info({ bookingId, eventId: event.id, duplicate: r.duplicate }, 'Stripe payment processed');
    }
  } else if (event.type === 'checkout.session.async_payment_failed' || event.type === 'checkout.session.expired') {
    await workflow.markFailed(bookingId, session.id, event.type);
  }
  res.json({ received: true }); // 2xx so Stripe stops retrying
});

// Mock checkout (only when Stripe keys are absent) – drives the SAME markPaid/markFailed path as the webhook.
const mockRouter = express.Router();
mockRouter.post(
  '/mock/:bookingId/complete',
  requireRole('USER'),
  validate({ params: z.object({ bookingId: objectIdSchema }), body: z.object({ outcome: z.enum(['success', 'failure']) }) }),
  async (req, res) => {
    if (!payments.mock) throw errors.notFound();
    const booking = await Booking.findOne({ _id: req.params.bookingId, userId: req.user.id });
    if (!booking || booking.payment?.provider !== 'mock') throw errors.notFound('Booking not found');
    const ref = { provider: 'mock', sessionId: booking.payment.sessionId, eventId: `mock_evt_${booking.payment.sessionId}_${req.body.outcome}` };
    if (req.body.outcome === 'success') await workflow.markPaid(booking._id, ref);
    else await workflow.markFailed(booking._id, ref.sessionId, 'mock payment failed');
    res.json({ booking: await Booking.findById(booking._id) });
  },
);
mockRouter.get('/config', (req, res) => res.json({ provider: payments.mock ? 'mock' : 'stripe' }));

module.exports = { webhookRouter, mockRouter };
