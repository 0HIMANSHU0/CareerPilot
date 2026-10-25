const mongoose = require('mongoose');
const { BOOKING_STATUS, CURRENCY } = require('@careerpilot/shared/constants');

const { ObjectId } = mongoose.Schema.Types;
const toJSON = {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.slotLocked;
    return ret;
  },
};

// Availability is embedded: small, bounded and always read with the consultant.
const consultantSchema = new mongoose.Schema(
  {
    userId: { type: ObjectId, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    headline: { type: String, required: true, maxlength: 140 },
    bio: { type: String, default: '' },
    expertise: [String],
    hourlyRate: { type: Number, required: true, min: 100 },
    currency: { type: String, default: CURRENCY },
    active: { type: Boolean, default: true },
    availability: [{ _id: false, dayOfWeek: Number, startHour: Number, endHour: Number }],
  },
  { timestamps: true, toJSON },
);
consultantSchema.index({ active: 1, hourlyRate: 1 });

const sideEffect = { status: { type: String, enum: ['PENDING', 'DONE', 'FAILED'], default: 'PENDING' }, attempts: { type: Number, default: 0 }, lastError: String };

// User/consultant name & email are denormalized so payment, calendar and email never need auth-service.
const bookingSchema = new mongoose.Schema(
  {
    userId: { type: ObjectId, required: true },
    consultantId: { type: ObjectId, required: true },
    consultantUserId: { type: ObjectId, required: true },
    consultantName: String,
    consultantEmail: String,
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    agenda: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: { type: String, enum: Object.values(BOOKING_STATUS), default: BOOKING_STATUS.PENDING_PAYMENT },
    // true while the booking occupies its slot; backs the unique double-booking index below.
    slotLocked: { type: Boolean, default: true },
    holdExpiresAt: Date,
    amount: { type: Number, required: true },
    currency: { type: String, default: CURRENCY },
    payment: { provider: String, sessionId: String, status: String, paidAt: Date },
    calendar: { ...sideEffect, eventId: String, meetingUrl: String, mock: Boolean },
    notification: { ...sideEffect, sentAt: Date, mock: Boolean },
    statusHistory: [{ _id: false, from: String, to: String, at: Date, reason: String }],
  },
  { timestamps: true, toJSON },
);
bookingSchema.index({ consultantId: 1, startTime: 1 }, { unique: true, partialFilterExpression: { slotLocked: true } });
bookingSchema.index({ userId: 1, status: 1, startTime: -1 });
bookingSchema.index({ consultantUserId: 1, status: 1, startTime: -1 });
bookingSchema.index({ status: 1, holdExpiresAt: 1 });
bookingSchema.index({ 'payment.sessionId': 1 }, { sparse: true });

// Payment records + processed webhook event ids make webhook handling idempotent.
const paymentSchema = new mongoose.Schema(
  {
    bookingId: { type: ObjectId, required: true, index: true },
    userId: { type: ObjectId, required: true },
    provider: { type: String, enum: ['stripe', 'mock'], required: true },
    sessionId: { type: String, required: true, unique: true },
    amount: Number,
    currency: String,
    status: { type: String, default: 'INITIATED' },
    processedEventIds: [String],
  },
  { timestamps: true, toJSON },
);

module.exports = {
  Consultant: mongoose.model('Consultant', consultantSchema),
  Booking: mongoose.model('Booking', bookingSchema),
  Payment: mongoose.model('Payment', paymentSchema),
};
