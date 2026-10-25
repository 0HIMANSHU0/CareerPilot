const env = require('./config');

// Path prefixes owned by each downstream service.
module.exports = [
  { name: 'auth', label: 'Account', target: env.AUTH_SERVICE_URL, prefixes: ['/api/auth', '/api/users'] },
  { name: 'ai', label: 'AI', target: env.AI_SERVICE_URL, prefixes: ['/api/chat', '/api/resumes', '/api/ai'] },
  {
    name: 'booking',
    label: 'Booking',
    target: env.BOOKING_SERVICE_URL,
    prefixes: ['/api/consultants', '/api/bookings', '/api/payments', '/api/availability'],
  },
];
