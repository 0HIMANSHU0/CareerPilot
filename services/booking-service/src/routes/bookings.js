const express = require('express');
const { z } = require('zod');
const { createBookingSchema, bookingListQuerySchema, checkoutSchema, objectIdSchema } = require('@careerpilot/shared');
const { BOOKING_STATUS: S, ROLES } = require('@careerpilot/shared/constants');
const { validate, requireAuth, requireRole, errors, AppError, escapeRegex, buildSort, paginate } = require('@careerpilot/service-kit');
const { Consultant, Booking, Payment } = require('../models');
const { payments } = require('../providers');
const workflow = require('../workflow');
const env = require('../config');
const { SLOT_MS } = require('./consultants');

const router = express.Router();
router.use(requireAuth);
const idParam = validate({ params: z.object({ id: objectIdSchema }) });

// Role-scoped base filter: users see their bookings, consultants their sessions, admins everything.
function scope(user) {
  if (user.role === ROLES.ADMIN) return {};
  if (user.role === ROLES.CONSULTANT) return { consultantUserId: user.id };
  return { userId: user.id };
}

async function findScoped(req) {
  const booking = await Booking.findOne({ _id: req.params.id, ...scope(req.user) });
  if (!booking) throw errors.notFound('Booking not found');
  return booking;
}

// GET /bookings?page=1&limit=10&status=CONFIRMED&search=rahul&sort=-createdAt
router.get('/', validate({ query: bookingListQuerySchema }), async (req, res) => {
  const { page, limit, status, search, sort } = req.query;
  const filter = scope(req.user);
  if (status) filter.status = status;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { consultantName: rx }, { agenda: rx }];
  }
  res.json(await paginate(Booking, filter, { page, limit, sort: buildSort(sort, ['createdAt', 'startTime', 'amount', 'status']) }));
});

// Business rules: future slot, on the hour, inside availability, not double-booked (unique index).
router.post('/', requireRole(ROLES.USER), validate({ body: createBookingSchema }), async (req, res) => {
  const { consultantId, startTime: startIso, ...contact } = req.body;
  const start = new Date(startIso);
  if (start.getTime() <= Date.now()) throw errors.badRequest('You cannot book a time in the past');
  if (start.getUTCMinutes() || start.getUTCSeconds() || start.getUTCMilliseconds()) throw errors.badRequest('Slots start on the hour');
  const consultant = await Consultant.findOne({ _id: consultantId, active: true });
  if (!consultant) throw errors.notFound('Consultant not found');
  const hour = start.getUTCHours();
  const inWindow = consultant.availability.some((w) => w.dayOfWeek === start.getUTCDay() && hour >= w.startHour && hour < w.endHour);
  if (!inWindow) throw errors.badRequest('The consultant is not available at this time');

  await workflow.releaseExpiredHolds();
  try {
    const booking = await Booking.create({
      ...contact,
      userId: req.user.id,
      consultantId: consultant._id,
      consultantUserId: consultant.userId,
      consultantName: consultant.name,
      consultantEmail: consultant.email,
      startTime: start,
      endTime: new Date(start.getTime() + SLOT_MS),
      amount: consultant.hourlyRate,
      currency: consultant.currency,
      holdExpiresAt: new Date(Date.now() + env.PAYMENT_HOLD_MINUTES * 60000),
      statusHistory: [{ to: S.PENDING_PAYMENT, at: new Date(), reason: 'created' }],
    });
    res.status(201).json({ booking });
  } catch (err) {
    if (err.code === 11000) throw new AppError(409, 'SLOT_TAKEN', 'This slot was just booked by someone else. Please pick another.');
    throw err;
  }
});

// Starts payment. The redirect origin must be on the allow-list (no open redirects).
router.post('/:id/checkout', requireRole(ROLES.USER), idParam, validate({ body: checkoutSchema }), async (req, res) => {
  const booking = await findScoped(req);
  if (booking.status !== S.PENDING_PAYMENT) throw new AppError(409, 'NOT_PAYABLE', 'This booking is not awaiting payment');
  const origin = new URL(req.body.originUrl).origin;
  if (!env.APP_ORIGINS.includes(origin)) throw errors.badRequest('Unknown redirect origin');
  const checkout = await payments.createCheckout(booking, origin);
  await Payment.create({ bookingId: booking._id, userId: booking.userId, provider: checkout.provider, sessionId: checkout.sessionId, amount: booking.amount, currency: booking.currency });
  await Booking.updateOne({ _id: booking._id }, { $set: { payment: { provider: checkout.provider, sessionId: checkout.sessionId, status: 'INITIATED' } } });
  res.json({ url: checkout.url, provider: checkout.provider });
});

// Status for the success page. Not a source of truth by itself: it only asks Stripe and
// runs the same idempotent markPaid() as the webhook, in case the webhook is delayed.
router.get('/:id', idParam, async (req, res) => {
  let booking = await findScoped(req);
  if (booking.status === S.PENDING_PAYMENT && booking.payment?.provider === 'stripe' && booking.payment.sessionId) {
    const session = await payments.retrieve(booking.payment.sessionId).catch(() => null);
    if (session?.payment_status === 'paid') {
      await workflow.markPaid(booking._id, { provider: 'stripe', sessionId: session.id });
      booking = await Booking.findById(booking._id);
    }
  }
  res.json({ booking });
});

router.patch('/:id/cancel', idParam, async (req, res) => {
  const booking = await findScoped(req);
  if (req.user.role === ROLES.CONSULTANT) throw errors.forbidden('Consultants cannot cancel bookings');
  const updated = await workflow.transition(booking._id, booking.status, S.CANCELLED, {}, `cancelled by ${req.user.role.toLowerCase()}`);
  if (!updated) throw new AppError(409, 'STALE_STATE', 'Booking changed, please refresh');
  res.json({ booking: updated });
});

router.patch('/:id/complete', requireRole(ROLES.CONSULTANT, ROLES.ADMIN), idParam, async (req, res) => {
  const booking = await findScoped(req);
  if (booking.startTime > new Date()) throw errors.badRequest('A session can only be completed after it starts');
  const updated = await workflow.transition(booking._id, booking.status, S.COMPLETED, {}, 'marked completed');
  if (!updated) throw new AppError(409, 'STALE_STATE', 'Booking changed, please refresh');
  res.json({ booking: updated });
});

module.exports = router;
