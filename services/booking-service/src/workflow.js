// Booking state machine + post-payment fulfilment (calendar + email) with retries.
const { BOOKING_STATUS: S, canTransition } = require('@careerpilot/shared/constants');
const { AppError, createLogger } = require('@careerpilot/service-kit');
const { Booking, Payment } = require('./models');
const { calendar, mailer } = require('./providers');

const logger = createLogger('booking-workflow');
const RELEASES_SLOT = new Set([S.PAYMENT_FAILED, S.CANCELLED]);
const MAX_ATTEMPTS = 5;

// Atomic transition: only succeeds if the booking is still in `from` (prevents races & invalid jumps).
async function transition(bookingId, from, to, extra = {}, reason) {
  if (!canTransition(from, to)) throw new AppError(409, 'INVALID_TRANSITION', `Cannot change booking from ${from} to ${to}`);
  const set = { status: to, ...extra };
  if (RELEASES_SLOT.has(to)) set.slotLocked = false;
  return Booking.findOneAndUpdate(
    { _id: bookingId, status: from },
    { $set: set, $push: { statusHistory: { from, to, at: new Date(), reason } } },
    { new: true },
  );
}

async function runCalendar(booking) {
  try {
    const ev = await calendar.createEvent(booking);
    await Booking.updateOne({ _id: booking._id }, { $set: { 'calendar.status': 'DONE', 'calendar.eventId': ev.eventId, 'calendar.meetingUrl': ev.meetingUrl, 'calendar.mock': ev.mock }, $inc: { 'calendar.attempts': 1 } });
    return ev.meetingUrl;
  } catch (err) {
    logger.warn({ err: err.message, bookingId: booking.id }, 'Calendar event failed; will retry');
    await Booking.updateOne({ _id: booking._id }, { $set: { 'calendar.status': 'FAILED', 'calendar.lastError': err.message.slice(0, 300) }, $inc: { 'calendar.attempts': 1 } });
    return null;
  }
}

function confirmationEmail(b, meetingUrl) {
  const when = new Date(b.startTime);
  const date = when.toUTCString().slice(0, 16);
  const time = `${when.toISOString().slice(11, 16)} UTC`;
  const link = meetingUrl || 'Your meeting link will be emailed separately.';
  const rows = [['Name', b.name], ['Consultant', b.consultantName], ['Date', date], ['Time', time], ['Meeting link', link], ['Booking ID', b.id]];
  return {
    to: b.email,
    subject: `Consultation confirmed with ${b.consultantName} on ${date}`,
    text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
    html: `<div style="font-family:Arial,sans-serif"><h2>Your consultation is confirmed</h2><table>${rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#64748b">${k}</td><td><strong>${v}</strong></td></tr>`).join('')}</table></div>`,
  };
}

async function runEmail(booking, meetingUrl) {
  try {
    const r = await mailer.send(confirmationEmail(booking, meetingUrl));
    await Booking.updateOne({ _id: booking._id }, { $set: { 'notification.status': 'DONE', 'notification.sentAt': new Date(), 'notification.mock': r.mock }, $inc: { 'notification.attempts': 1 } });
  } catch (err) {
    logger.warn({ err: err.message, bookingId: booking.id }, 'Confirmation email failed; will retry');
    await Booking.updateOne({ _id: booking._id }, { $set: { 'notification.status': 'FAILED', 'notification.lastError': err.message.slice(0, 300) }, $inc: { 'notification.attempts': 1 } });
  }
}

// Called by the Stripe webhook, the status-poll fallback and mock checkout. Safe to call repeatedly:
// only the call that wins the PENDING_PAYMENT -> PAID transition performs fulfilment.
async function markPaid(bookingId, { provider, sessionId, eventId }) {
  if (eventId) {
    const fresh = await Payment.updateOne({ sessionId, processedEventIds: { $ne: eventId } }, { $addToSet: { processedEventIds: eventId } });
    if (!fresh.modifiedCount) return { duplicate: true };
  }
  const paid = await transition(bookingId, S.PENDING_PAYMENT, S.PAID, { 'payment.status': 'PAID', 'payment.paidAt': new Date(), 'payment.provider': provider }, 'payment confirmed');
  if (!paid) return { duplicate: true };
  await Payment.updateOne({ sessionId }, { status: 'PAID' });
  const confirmed = await transition(bookingId, S.PAID, S.CONFIRMED, {}, 'auto-confirm after payment');
  const meetingUrl = await runCalendar(confirmed);
  await runEmail(confirmed, meetingUrl);
  return { duplicate: false };
}

async function markFailed(bookingId, sessionId, reason) {
  await Payment.updateOne({ sessionId }, { status: 'FAILED' });
  return transition(bookingId, S.PENDING_PAYMENT, S.PAYMENT_FAILED, { 'payment.status': 'FAILED' }, reason);
}

// Release slots held by bookings that were never paid.
function releaseExpiredHolds() {
  return Booking.updateMany(
    { status: S.PENDING_PAYMENT, holdExpiresAt: { $lt: new Date() } },
    { $set: { status: S.PAYMENT_FAILED, slotLocked: false, 'payment.status': 'EXPIRED' }, $push: { statusHistory: { from: S.PENDING_PAYMENT, to: S.PAYMENT_FAILED, at: new Date(), reason: 'payment hold expired' } } },
  );
}

// Background sweep: retry failed calendar/email side effects for confirmed bookings.
async function retrySideEffects() {
  const failed = await Booking.find({
    status: S.CONFIRMED,
    $or: [{ 'calendar.status': 'FAILED', 'calendar.attempts': { $lt: MAX_ATTEMPTS } }, { 'notification.status': 'FAILED', 'notification.attempts': { $lt: MAX_ATTEMPTS } }],
  }).limit(20);
  for (const b of failed) {
    let meetingUrl = b.calendar.meetingUrl;
    if (b.calendar.status === 'FAILED') meetingUrl = await runCalendar(b);
    if (b.notification.status === 'FAILED' || (b.notification.status === 'PENDING' && meetingUrl)) await runEmail(b, meetingUrl);
  }
}

function startWorkers() {
  setInterval(() => releaseExpiredHolds().catch((e) => logger.error(e)), 60_000).unref();
  setInterval(() => retrySideEffects().catch((e) => logger.error(e)), 60_000).unref();
}

module.exports = { transition, markPaid, markFailed, releaseExpiredHolds, startWorkers };
