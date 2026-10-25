// Constants shared by the frontend and every backend service.

const ROLES = Object.freeze({ USER: 'USER', CONSULTANT: 'CONSULTANT', ADMIN: 'ADMIN' });

// ADMIN is intentionally excluded: admins are created only by the seed script.
const SELF_REGISTER_ROLES = Object.freeze([ROLES.USER, ROLES.CONSULTANT]);

const ROLE_HOME = Object.freeze({
  [ROLES.USER]: '/dashboard',
  [ROLES.CONSULTANT]: '/consultant',
  [ROLES.ADMIN]: '/admin',
});

const BOOKING_STATUS = Object.freeze({
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAID: 'PAID',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
});

// Allowed state machine transitions: from -> [to]
const BOOKING_TRANSITIONS = Object.freeze({
  PENDING_PAYMENT: ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  PAYMENT_FAILED: ['PENDING_PAYMENT', 'CANCELLED'],
  PAID: ['CONFIRMED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  CANCELLED: [],
  COMPLETED: [],
});

function canTransition(from, to) {
  return (BOOKING_TRANSITIONS[from] || []).includes(to);
}

const PAYMENT_STATUS = Object.freeze({
  INITIATED: 'INITIATED',
  PAID: 'PAID',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
  REFUNDED: 'REFUNDED',
});

const RESUME_TEMPLATES = Object.freeze({
  MODERN_PROFESSIONAL: 'modern-professional',
  ATS_CLASSIC: 'ats-classic',
});

const COOKIE_NAMES = Object.freeze({ ACCESS: 'access_token', REFRESH: 'refresh_token' });

const INTERNAL_TOKEN_HEADER = 'x-internal-token';

const CURRENCY = 'INR';

module.exports = {
  ROLES,
  SELF_REGISTER_ROLES,
  ROLE_HOME,
  BOOKING_STATUS,
  BOOKING_TRANSITIONS,
  canTransition,
  PAYMENT_STATUS,
  RESUME_TEMPLATES,
  COOKIE_NAMES,
  INTERNAL_TOKEN_HEADER,
  CURRENCY,
};
