// OpenAPI 3 spec for every endpoint exposed through the gateway. Served at /api/docs.
const err = (description) => ({ description, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } });
const ok = (description, schema = { type: 'object' }) => ({ description, content: { 'application/json': { schema } } });
const body = (schema) => ({ required: true, content: { 'application/json': { schema } } });
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const idParam = (name = 'id') => ({ name, in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } });
const q = (name, schema, description) => ({ name, in: 'query', schema, description });
const common = { 401: err('Not signed in'), 403: err('Wrong role'), 503: err('Owning service unavailable') };

function op(tag, summary, { auth = true, params, requestBody, responses, description } = {}) {
  return {
    tags: [tag], summary, description, parameters: params, requestBody,
    security: auth ? [{ cookieAuth: [] }] : [],
    responses: { ...responses, ...(auth ? common : { 503: common[503] }) },
  };
}

const s = (props, required = []) => ({ type: 'object', properties: props, required });
const str = { type: 'string' };
const int = { type: 'integer' };

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'CareerPilot API',
    version: '1.0.0',
    description:
      'All endpoints are served by the API gateway under `/api`. Authentication uses httpOnly cookies (`access_token`, 15 min; `refresh_token`, rotating). ' +
      'Errors always look like `{ "error": { "code", "message", "details?" } }`. Validation errors return 400 `VALIDATION_ERROR` with per-field details.',
  },
  servers: [{ url: '/' }],
  components: {
    securitySchemes: { cookieAuth: { type: 'apiKey', in: 'cookie', name: 'access_token' } },
    schemas: {
      Error: s({ error: s({ code: str, message: str, details: { type: 'object' } }) }),
      User: s({ id: str, name: str, email: str, phone: str, role: { type: 'string', enum: ['USER', 'CONSULTANT', 'ADMIN'] }, emailVerified: { type: 'boolean' }, profile: s({ headline: str, bio: str, location: str, linkedinUrl: str }), createdAt: str, updatedAt: str }),
      Register: s({ name: str, email: str, password: { type: 'string', minLength: 8 }, phone: str, role: { type: 'string', enum: ['USER', 'CONSULTANT'] } }, ['name', 'email', 'password', 'role']),
      Login: s({ email: str, password: str }, ['email', 'password']),
      ChatSession: s({ id: str, title: str, messageCount: int, lastMessageAt: str, usage: s({ promptTokens: int, completionTokens: int }) }),
      ChatMessage: s({ id: str, sessionId: str, role: { type: 'string', enum: ['user', 'assistant'] }, content: str, status: { type: 'string', enum: ['complete', 'error'] }, createdAt: str }),
      ResumeData: s({ personal: s({ fullName: str, title: str, email: str, phone: str, location: str, links: { type: 'array', items: s({ label: str, url: str }) } }), summary: { type: 'string', description: 'Sanitized HTML (p, strong, em, ul, ol, li)' }, education: { type: 'array', items: { type: 'object' } }, experience: { type: 'array', items: { type: 'object' } }, skills: { type: 'array', items: str }, projects: { type: 'array', items: { type: 'object' } }, certifications: { type: 'array', items: { type: 'object' } }, achievements: { type: 'array', items: str } }),
      Resume: s({ id: str, title: str, templateId: { type: 'string', enum: ['modern-professional', 'ats-classic'] }, data: ref('ResumeData'), version: int }),
      Consultant: s({ id: str, userId: str, name: str, headline: str, bio: str, expertise: { type: 'array', items: str }, hourlyRate: int, currency: str, active: { type: 'boolean' }, availability: { type: 'array', items: s({ dayOfWeek: int, startHour: int, endHour: int }) } }),
      Booking: s({ id: str, consultantId: str, consultantName: str, name: str, email: str, phone: str, agenda: str, startTime: str, endTime: str, status: { type: 'string', enum: ['PENDING_PAYMENT', 'PAYMENT_FAILED', 'PAID', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] }, amount: int, currency: str, payment: { type: 'object' }, calendar: s({ status: str, eventId: str, meetingUrl: str }), notification: s({ status: str, sentAt: str }) }),
      Page: s({ items: { type: 'array', items: {} }, page: int, limit: int, total: int, totalPages: int }),
    },
  },
  paths: {
    '/api/health': { get: op('System', 'Aggregated health of gateway and services', { auth: false, responses: { 200: ok('Status per service') } }) },
    '/api/dashboard': { get: op('System', 'Dashboard counts (partial results if a service is down)', { responses: { 200: ok('Stats + per-service status'), 503: err('All sources down') } }) },

    '/api/auth/register': { post: op('Auth', 'Register as USER or CONSULTANT (ADMIN is rejected)', { auth: false, requestBody: body(ref('Register')), responses: { 201: ok('Created; sets session cookies', s({ user: ref('User') })), 400: err('Validation error'), 409: err('Email already used'), 429: err('Too many attempts') } }) },
    '/api/auth/login': { post: op('Auth', 'Log in', { auth: false, requestBody: body(ref('Login')), responses: { 200: ok('Sets session cookies', s({ user: ref('User') })), 401: err('Invalid email or password'), 429: err('Too many attempts') } }) },
    '/api/auth/refresh': { post: op('Auth', 'Rotate refresh token and issue a new access token', { auth: false, description: 'Reusing a revoked refresh token revokes the whole token family.', responses: { 200: ok('New cookies', s({ user: ref('User') })), 401: err('Missing/expired/revoked refresh token') } }) },
    '/api/auth/logout': { post: op('Auth', 'Log out (revokes refresh token, clears cookies)', { auth: false, responses: { 200: ok('Logged out') } }) },
    '/api/auth/me': { get: op('Auth', 'Current user', { responses: { 200: ok('User', s({ user: ref('User') })) } }) },
    '/api/auth/forgot-password': { post: op('Auth', 'Request a password reset email', { auth: false, description: 'Always 200 (no account enumeration). In email MOCK mode the response includes devResetUrl.', requestBody: body(s({ email: str }, ['email'])), responses: { 200: ok('Accepted') } }) },
    '/api/auth/reset-password': { post: op('Auth', 'Reset password with a one-time token', { auth: false, requestBody: body(s({ token: str, password: str }, ['token', 'password'])), responses: { 200: ok('Password changed; all sessions revoked'), 400: err('Invalid or expired link') } }) },
    '/api/auth/verify-email': { post: op('Auth', 'Verify email with a one-time token', { auth: false, requestBody: body(s({ token: str }, ['token'])), responses: { 200: ok('Verified'), 400: err('Invalid or expired link') } }) },
    '/api/auth/resend-verification': { post: op('Auth', 'Resend verification email', { responses: { 200: ok('Sent') } }) },

    '/api/users/me': {
      get: op('Users', 'Get my profile', { responses: { 200: ok('User', s({ user: ref('User') })) } }),
      patch: op('Users', 'Update my profile (name, phone, profile.*)', { requestBody: body(s({ name: str, phone: str, profile: s({ headline: str, bio: str, location: str, linkedinUrl: str }) })), responses: { 200: ok('Updated', s({ user: ref('User') })), 400: err('Validation error') } }),
    },
    '/api/users': { get: op('Users', 'List users (ADMIN)', { params: [q('page', int), q('limit', int), q('search', str), q('role', str), q('sort', str, 'createdAt | -createdAt | name | email')], responses: { 200: ok('Page of users', ref('Page')) } }) },

    '/api/chat/sessions': {
      get: op('Chat', 'List my chat sessions', { responses: { 200: ok('Sessions', s({ items: { type: 'array', items: ref('ChatSession') } })) } }),
      post: op('Chat', 'Create a chat session', { requestBody: body(s({ title: str })), responses: { 201: ok('Created', s({ session: ref('ChatSession') })) } }),
    },
    '/api/chat/sessions/{id}': {
      get: op('Chat', 'Get session with full message history', { params: [idParam()], responses: { 200: ok('Session + messages'), 404: err('Not found / not yours') } }),
      patch: op('Chat', 'Rename session', { params: [idParam()], requestBody: body(s({ title: str }, ['title'])), responses: { 200: ok('Renamed'), 404: err('Not found') } }),
      delete: op('Chat', 'Delete session and its messages', { params: [idParam()], responses: { 204: { description: 'Deleted' }, 404: err('Not found') } }),
    },
    '/api/chat/sessions/{id}/messages': {
      post: op('Chat', 'Send a message; reply streams as Server-Sent Events', {
        params: [idParam()], requestBody: body(s({ content: str }, ['content'])),
        description: 'Response `text/event-stream`. Events: `user_message`, many `delta` {content}, then `done` {message, session} or `error` {code, message}. Limited per user per minute.',
        responses: { 200: { description: 'SSE stream', content: { 'text/event-stream': { schema: str } } }, 404: err('Not found'), 429: err('AI rate limit') },
      }),
    },

    '/api/resumes': {
      get: op('Resume', 'List my resumes (without data)', { responses: { 200: ok('Resumes') } }),
      post: op('Resume', 'Create resume', { requestBody: body(s({ title: str, templateId: str, data: ref('ResumeData') }, ['title', 'templateId', 'data'])), responses: { 201: ok('Created', s({ resume: ref('Resume') })), 400: err('Validation error') } }),
    },
    '/api/resumes/templates': { get: op('Resume', 'List templates', { responses: { 200: ok('Templates') } }) },
    '/api/resumes/templates/sample': { get: op('Resume', 'Render sample resume HTML', { params: [q('template', str)], responses: { 200: { description: 'HTML', content: { 'text/html': { schema: str } } } } }) },
    '/api/resumes/ai/generate': { post: op('Resume', 'AI-generate summary / experience bullets / full polish (returns structured data, not saved)', { requestBody: body(s({ target: { type: 'string', enum: ['summary', 'experience', 'full'] }, targetRole: str, data: ref('ResumeData') }, ['target', 'data'])), responses: { 200: ok('Generated data', s({ data: ref('ResumeData'), mock: { type: 'boolean' } })), 429: err('AI rate limit'), 502: err('AI provider failed / malformed output'), 504: err('AI timeout') } }) },
    '/api/resumes/{id}': {
      get: op('Resume', 'Get resume', { params: [idParam()], responses: { 200: ok('Resume', s({ resume: ref('Resume') })), 404: err('Not found / not yours') } }),
      patch: op('Resume', 'Update resume (autosave)', { params: [idParam()], requestBody: body(s({ title: str, templateId: str, data: ref('ResumeData') })), responses: { 200: ok('Updated') } }),
      delete: op('Resume', 'Delete resume (soft delete)', { params: [idParam()], responses: { 204: { description: 'Deleted' } } }),
    },
    '/api/resumes/{id}/duplicate': { post: op('Resume', 'Duplicate resume', { params: [idParam()], responses: { 201: ok('Copy') } }) },
    '/api/resumes/{id}/render': { get: op('Resume', 'Render resume HTML', { params: [idParam(), q('template', str)], responses: { 200: { description: 'HTML', content: { 'text/html': { schema: str } } } } }) },
    '/api/resumes/{id}/versions': {
      get: op('Resume', 'Version history', { params: [idParam()], responses: { 200: ok('Versions') } }),
      post: op('Resume', 'Save a version snapshot', { params: [idParam()], requestBody: body(s({ note: str })), responses: { 201: ok('Saved') } }),
    },
    '/api/resumes/{id}/versions/{version}/restore': { post: op('Resume', 'Restore a version', { params: [idParam(), { name: 'version', in: 'path', required: true, schema: int }], responses: { 200: ok('Restored'), 404: err('Version not found') } }) },

    '/api/consultants': { get: op('Consultation', 'List active consultants', { params: [q('search', str)], responses: { 200: ok('Consultants') } }) },
    '/api/consultants/me': {
      get: op('Consultation', 'My consultant profile (CONSULTANT)', { responses: { 200: ok('Profile or null') } }),
      put: op('Consultation', 'Create/update my profile, INR hourly rate and weekly UTC availability (CONSULTANT)', { requestBody: body(ref('Consultant')), responses: { 200: ok('Saved') } }),
    },
    '/api/consultants/{id}': { get: op('Consultation', 'Consultant detail', { params: [idParam()], responses: { 200: ok('Consultant'), 404: err('Not found') } }) },
    '/api/consultants/{id}/slots': { get: op('Consultation', '60-minute slots for a UTC date', { params: [idParam(), q('date', str, 'YYYY-MM-DD')], responses: { 200: ok('Slots with availability flag') } }) },
    '/api/bookings': {
      get: op('Consultation', 'List bookings (scoped by role) with pagination, search, sort and status filter', { params: [q('page', int), q('limit', int), q('status', str), q('search', str, 'name, email, consultant, agenda'), q('sort', str, 'createdAt | startTime | amount | status, prefix - for desc')], responses: { 200: ok('Page of bookings', ref('Page')) } }),
      post: op('Consultation', 'Create a PENDING_PAYMENT booking (USER)', { requestBody: body(s({ consultantId: str, startTime: str, name: str, email: str, phone: str, agenda: str }, ['consultantId', 'startTime', 'name', 'email', 'phone', 'agenda'])), responses: { 201: ok('Booking', s({ booking: ref('Booking') })), 400: err('Past time / outside availability / invalid slot'), 409: err('SLOT_TAKEN') } }),
    },
    '/api/bookings/{id}': { get: op('Consultation', 'Booking detail (also reconciles payment status with Stripe)', { params: [idParam()], responses: { 200: ok('Booking'), 404: err('Not found') } }) },
    '/api/bookings/{id}/checkout': { post: op('Payment', 'Create Stripe Checkout session (or mock checkout)', { params: [idParam()], requestBody: body(s({ originUrl: str }, ['originUrl'])), responses: { 200: ok('Redirect URL', s({ url: str, provider: str })), 409: err('Not awaiting payment') } }) },
    '/api/bookings/{id}/cancel': { patch: op('Consultation', 'Cancel booking (owner or admin)', { params: [idParam()], responses: { 200: ok('Cancelled'), 409: err('Invalid transition') } }) },
    '/api/bookings/{id}/complete': { patch: op('Consultation', 'Mark session completed (consultant or admin)', { params: [idParam()], responses: { 200: ok('Completed'), 409: err('Invalid transition') } }) },
    '/api/payments/config': { get: op('Payment', 'Active payment provider (stripe | mock)', { responses: { 200: ok('Provider') } }) },
    '/api/payments/mock/{bookingId}/complete': { post: op('Payment', 'Complete a MOCK payment (only when Stripe keys are absent)', { params: [idParam('bookingId')], requestBody: body(s({ outcome: { type: 'string', enum: ['success', 'failure'] } })), responses: { 200: ok('Booking after fulfilment') } }) },
    '/api/stripe/webhook': { post: op('Payment', 'Stripe webhook (signature-verified, idempotent)', { auth: false, description: 'Forwarded raw to booking-service `/webhooks/stripe`. In Docker, Stripe can call booking-service directly.', responses: { 200: ok('Received'), 400: err('Invalid signature') } }) },
  },
};
