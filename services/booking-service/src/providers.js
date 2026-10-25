// External providers. Each one switches to MOCK mode automatically when its env keys are missing.
const crypto = require('crypto');
const Stripe = require('stripe');
const { JWT } = require('google-auth-library');
const { createMailer, createLogger } = require('@careerpilot/service-kit');
const env = require('./config');

const logger = createLogger('booking-providers');
const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;

const payments = {
  mock: !stripe,
  // Amount comes from the consultant's rate on the server; never from the client.
  async createCheckout(booking, originUrl) {
    const success = `${originUrl}/consultations/success?bookingId=${booking.id}`;
    const cancel = `${originUrl}/consultations/success?bookingId=${booking.id}&cancelled=1`;
    if (!stripe) {
      const sessionId = `mock_cs_${crypto.randomUUID()}`;
      return { provider: 'mock', sessionId, url: `${originUrl}/consultations/checkout/mock?bookingId=${booking.id}` };
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: booking.email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: booking.currency.toLowerCase(),
          unit_amount: Math.round(booking.amount * 100),
          product_data: { name: `Career consultation with ${booking.consultantName}`, description: new Date(booking.startTime).toUTCString() },
        },
      }],
      metadata: { bookingId: booking.id },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${success}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel,
    });
    return { provider: 'stripe', sessionId: session.id, url: session.url };
  },
  async retrieve(sessionId) {
    return stripe ? stripe.checkout.sessions.retrieve(sessionId) : null;
  },
  verifyWebhook(rawBody, signature) {
    return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  },
};

const calendarClient = env.GOOGLE_SERVICE_ACCOUNT_JSON
  ? (() => {
      const creds = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
      return new JWT({ email: creds.client_email, key: creds.private_key, scopes: ['https://www.googleapis.com/auth/calendar.events'] });
    })()
  : null;

const calendar = {
  mock: !calendarClient,
  async createEvent(booking) {
    if (!calendarClient) {
      logger.info({ bookingId: booking.id }, '[MOCK CALENDAR] event created');
      return { eventId: `mock_evt_${booking.id}`, meetingUrl: `https://meet.example.com/careerpilot-${booking.id}`, mock: true };
    }
    const calendarId = encodeURIComponent(env.GOOGLE_CALENDAR_ID || 'primary');
    const { data } = await calendarClient.request({
      url: `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?conferenceDataVersion=1`,
      method: 'POST',
      data: {
        summary: `CareerPilot consultation: ${booking.name} × ${booking.consultantName}`,
        description: `Booking ${booking.id}\n\nAgenda:\n${booking.agenda}`,
        start: { dateTime: new Date(booking.startTime).toISOString() },
        end: { dateTime: new Date(booking.endTime).toISOString() },
        conferenceData: { createRequest: { requestId: booking.id, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
      },
    });
    return { eventId: data.id, meetingUrl: data.hangoutLink || data.htmlLink, mock: false };
  },
};

const mailer = createMailer({ logger, user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD });

module.exports = { payments, calendar, mailer };
