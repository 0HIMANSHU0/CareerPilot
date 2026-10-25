// Generates the Postman collection, Postman environment and OpenAPI JSON. Run: npm run docs:postman
const fs = require('fs');
const path = require('path');
const openapi = require('../../services/gateway/src/openapi');

const OUT = __dirname;
const V = 'const v = pm.environment.name ? pm.environment : pm.collectionVariables;';
const ID = '(x) => x && (x.id || x._id)';

const script = (listen, code) => ({ listen, script: { type: 'text/javascript', exec: [V, ...code.trim().split('\n')] } });
const expect = (...codes) => `pm.test('Status is ${codes.join(' or ')}', () => pm.expect(pm.response.code).to.be.oneOf([${codes.join(', ')}]));`;
const save = (variable, expr) => `const id = ${ID}; try { const val = ${expr}; if (val) v.set('${variable}', val); } catch (e) {}`;
const bearer = (role) => ({ type: 'bearer', bearer: [{ key: 'token', value: `{{${role}_token}}`, type: 'string' }] });
const noauth = { type: 'noauth' };

function request(name, method, urlPath, { body, query = [], auth, tests = [], pre, headers = [], description } = {}) {
  const [p] = urlPath.split('?');
  const item = {
    name,
    request: {
      method,
      header: [...(body ? [{ key: 'Content-Type', value: 'application/json' }] : []), ...headers],
      url: {
        raw: `{{baseUrl}}${urlPath}${query.length ? `?${query.map(([k, val]) => `${k}=${val}`).join('&')}` : ''}`,
        host: ['{{baseUrl}}'],
        path: p.replace(/^\//, '').split('/'),
        query: query.map(([key, value, disabled]) => ({ key, value, ...(disabled ? { disabled: true } : {}) })),
      },
      description,
    },
    event: [...(pre ? [script('prerequest', pre)] : []), ...(tests.length ? [script('test', tests.join('\n'))] : [])],
  };
  if (body) item.request.body = { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } };
  if (auth) item.request.auth = auth;
  return item;
}

const folder = (name, items, extra = {}) => ({ name, item: items, ...extra });

// Reads access/refresh tokens from Set-Cookie (works even with Secure cookies over http).
const storeTokens = (role) => `
const cookie = (n) => { const h = pm.response.headers.all().filter((x) => x.key.toLowerCase() === 'set-cookie').map((x) => x.value).find((x) => x.startsWith(n + '=')); return h ? h.split(';')[0].slice(n.length + 1) : pm.cookies.get(n); };
const access = cookie('access_token'); const refresh = cookie('refresh_token');
if (access) v.set('${role}_token', access);
if (refresh) v.set('${role}_refresh_token', refresh);
pm.test('Access token saved to {{${role}_token}}', () => pm.expect(access).to.be.a('string'));`;

const login = (role, label) =>
  request(`Login as ${label}`, 'POST', '/api/auth/login', {
    auth: noauth,
    body: { email: `{{${role}_email}}`, password: `{{${role}_password}}` },
    tests: [expect(200), storeTokens(role)],
    description: 'Logs in and stores the access + refresh token in variables. Every other request in this folder sends `Authorization: Bearer {{' + role + '_token}}`.\n\nErrors: 400 VALIDATION_ERROR, 401 invalid email or password, 429 too many attempts (30 / 15 min).',
  });

const accountFolder = (role, label) =>
  folder('Auth & Profile', [
    login(role, label),
    request('Current user (auth/me)', 'GET', '/api/auth/me', { tests: [expect(200)], description: 'Errors: 401 not signed in.' }),
    request('Get my profile', 'GET', '/api/users/me', { tests: [expect(200)] }),
    request('Update my profile', 'PATCH', '/api/users/me', {
      body: { phone: '+91 98765 43210', profile: { headline: `${label} via Postman`, location: 'Bengaluru, India' } },
      tests: [expect(200)],
      description: 'Body: name?, phone?, profile { headline, bio, location, linkedinUrl }.\n\nErrors: 400 VALIDATION_ERROR, 401.',
    }),
    request('Resend verification email', 'POST', '/api/auth/resend-verification', { tests: [expect(200)], description: 'In email MOCK mode the response includes devVerifyUrl.' }),
    request('Dashboard stats', 'GET', '/api/dashboard', { tests: [expect(200)], description: 'Aggregated counts. `partial: true` if one service is down; 503 if all are down.' }),
    request('Refresh session', 'POST', '/api/auth/refresh', {
      auth: noauth,
      headers: [{ key: 'Cookie', value: `refresh_token={{${role}_refresh_token}}` }],
      tests: [expect(200), storeTokens(role)],
      description: 'Rotates the refresh token (sent as a cookie) and saves the new pair. Reusing an old refresh token revokes the whole token family.\n\nErrors: 401 missing / expired / revoked refresh token.',
    }),
  ]);

const logout = (role) =>
  request('Logout', 'POST', '/api/auth/logout', {
    auth: noauth,
    headers: [{ key: 'Cookie', value: `refresh_token={{${role}_refresh_token}}` }],
    tests: [expect(200), `v.unset('${role}_token'); v.unset('${role}_refresh_token');`],
    description: 'Revokes the refresh token and clears the saved tokens. Run "Login" again afterwards.',
  });

const resumeBody = {
  title: 'Postman Resume',
  templateId: 'modern-professional',
  data: {
    personal: { fullName: 'Rahul Sharma', title: 'Full-Stack Developer', email: 'rahul@example.com', phone: '+91 98450 12345', location: 'Pune, India', links: [{ label: 'GitHub', url: 'https://github.com/rahul' }] },
    summary: '<p>Full-stack developer with <strong>3 years</strong> of experience in React and Node.js.</p>',
    education: [{ institution: 'IIT Bombay', degree: 'B.Tech', field: 'Computer Science', startDate: '2016', endDate: '2020' }],
    experience: [{ company: 'Acme Corp', title: 'Software Engineer', location: 'Pune', startDate: 'Jul 2021', current: true, highlights: ['Built a booking platform used by 50k users', 'Cut API latency by 40%'] }],
    skills: ['React', 'Node.js', 'MongoDB', 'TypeScript'],
    projects: [{ name: 'CareerPilot', description: 'AI career platform', technologies: ['Next.js', 'Express'] }],
    certifications: [{ name: 'AWS Cloud Practitioner', issuer: 'Amazon', date: '2023' }],
    achievements: ['Hackathon winner 2022'],
  },
};

const chatFolder = folder('Chat (AI career assistant)', [
  request('List my chat sessions', 'GET', '/api/chat/sessions', { tests: [expect(200)] }),
  request('Create chat session', 'POST', '/api/chat/sessions', {
    body: { title: 'Interview prep' },
    tests: [expect(201), save('chat_session_id', 'id(pm.response.json().session)')],
    description: 'Saves {{chat_session_id}}. Chat is available to USER and ADMIN (403 for CONSULTANT).',
  }),
  request('Send message (SSE stream)', 'POST', '/api/chat/sessions/{{chat_session_id}}/messages', {
    body: { content: 'Give me 3 tips for a frontend developer interview.' },
    tests: [expect(200)],
    description: 'Response is `text/event-stream`: `user_message`, many `delta` {content}, then `done` {message, session} or `error` {code, message}.\n\nErrors: 400 empty message, 404 session not found, 429 AI rate limit.',
  }),
  request('Get session with messages', 'GET', '/api/chat/sessions/{{chat_session_id}}', { tests: [expect(200)], description: 'Errors: 404 not found / not yours.' }),
  request('Rename session', 'PATCH', '/api/chat/sessions/{{chat_session_id}}', { body: { title: 'Frontend interview prep' }, tests: [expect(200)] }),
  request('Delete session', 'DELETE', '/api/chat/sessions/{{chat_session_id}}', { tests: [expect(204)] }),
]);

const resumeFolder = folder('Resume', [
  request('List templates', 'GET', '/api/resumes/templates', { tests: [expect(200)] }),
  request('Render sample template (HTML)', 'GET', '/api/resumes/templates/sample', { query: [['template', 'ats-classic']], tests: [expect(200)] }),
  request('List my resumes', 'GET', '/api/resumes', { tests: [expect(200)] }),
  request('Create resume', 'POST', '/api/resumes', {
    body: resumeBody,
    tests: [expect(201), save('resume_id', 'id(pm.response.json().resume)')],
    description: 'templateId: modern-professional | ats-classic. Saves {{resume_id}}.\n\nErrors: 400 VALIDATION_ERROR.',
  }),
  request('Get resume', 'GET', '/api/resumes/{{resume_id}}', { tests: [expect(200)], description: 'Errors: 404 not found / not yours.' }),
  request('Update resume (autosave)', 'PATCH', '/api/resumes/{{resume_id}}', { body: { title: 'Postman Resume (edited)', templateId: 'ats-classic' }, tests: [expect(200)] }),
  request('Save version snapshot', 'POST', '/api/resumes/{{resume_id}}/versions', { body: { note: 'Before AI polish' }, tests: [expect(201)] }),
  request('List versions', 'GET', '/api/resumes/{{resume_id}}/versions', { tests: [expect(200)] }),
  request('Restore version 1', 'POST', '/api/resumes/{{resume_id}}/versions/1/restore', { tests: [expect(200, 404)], description: 'Errors: 404 version not found.' }),
  request('Render resume (HTML)', 'GET', '/api/resumes/{{resume_id}}/render', { query: [['template', 'modern-professional']], tests: [expect(200)] }),
  request('Duplicate resume', 'POST', '/api/resumes/{{resume_id}}/duplicate', { tests: [expect(201), save('resume_copy_id', 'id(pm.response.json().resume)')] }),
  request('AI generate summary', 'POST', '/api/resumes/ai/generate', {
    body: { target: 'summary', targetRole: 'Senior Frontend Engineer', data: resumeBody.data },
    tests: [expect(200)],
    description: 'target: summary | experience | full. Returns generated data, nothing is saved.\n\nErrors: 429 AI rate limit, 502 AI provider failed, 504 AI timeout.',
  }),
  request('Delete duplicated resume', 'DELETE', '/api/resumes/{{resume_copy_id}}', { tests: [expect(204)] }),
]);

const userConsultation = folder('Consultation & Payment', [
  request('List consultants', 'GET', '/api/consultants', { query: [['search', '', true]], tests: [expect(200), save('consultant_id', 'id(pm.response.json().items[0])')], description: 'Saves the first consultant as {{consultant_id}}.' }),
  request('Consultant detail', 'GET', '/api/consultants/{{consultant_id}}', {
    tests: [
      expect(200),
      `const c = pm.response.json().consultant; const days = new Set(c.availability.map((a) => a.dayOfWeek));
for (let i = 1; i <= 14; i++) { const d = new Date(Date.now() + i * 864e5); if (days.has(d.getUTCDay())) { v.set('slot_date', d.toISOString().slice(0, 10)); break; } }`,
    ],
    description: 'Picks the next date the consultant works and saves it as {{slot_date}}.\n\nErrors: 404 not found.',
  }),
  request('Available slots for a date', 'GET', '/api/consultants/{{consultant_id}}/slots', {
    query: [['date', '{{slot_date}}']],
    tests: [expect(200), `const s = pm.response.json().slots.find((x) => x.available); if (s) v.set('slot_start', s.startTime);`],
    description: 'date = YYYY-MM-DD (UTC). Saves the first free 60-minute slot as {{slot_start}}.',
  }),
  request('Create booking', 'POST', '/api/bookings', {
    body: { consultantId: '{{consultant_id}}', startTime: '{{slot_start}}', name: 'Rahul Sharma', email: '{{user_email}}', phone: '+91 98765 43210', agenda: 'Review my resume and plan a switch to a senior role.' },
    tests: [expect(201), save('booking_id', 'id(pm.response.json().booking)')],
    description: 'USER only. Creates a PENDING_PAYMENT booking held for a few minutes. Saves {{booking_id}}.\n\nErrors: 400 past time / not on the hour / outside availability, 403 wrong role, 404 consultant not found, 409 SLOT_TAKEN.',
  }),
  request('Payment provider config', 'GET', '/api/payments/config', { tests: [expect(200)], description: 'Returns { provider: "stripe" | "mock" }.' }),
  request('Start checkout', 'POST', '/api/bookings/{{booking_id}}/checkout', {
    body: { originUrl: '{{appOrigin}}' },
    tests: [expect(200)],
    description: 'Returns { url, provider }. With Stripe keys the url is a Stripe Checkout page; otherwise a MOCK checkout page.\n\nErrors: 400 unknown redirect origin, 409 NOT_PAYABLE.',
  }),
  request('Complete MOCK payment', 'POST', '/api/payments/mock/{{booking_id}}/complete', {
    body: { outcome: 'success' },
    tests: [expect(200, 404)],
    description: 'Only in MOCK mode (404 when real Stripe is on). outcome: success | failure. Success moves the booking PAID → CONFIRMED and creates the calendar event + email.',
  }),
  request('Booking detail', 'GET', '/api/bookings/{{booking_id}}', { tests: [expect(200)], description: 'Also reconciles payment status with Stripe.\n\nErrors: 404 not found / not yours.' }),
  request('List my bookings', 'GET', '/api/bookings', {
    query: [['page', '1'], ['limit', '10'], ['sort', '-createdAt'], ['status', 'CONFIRMED', true], ['search', '', true]],
    tests: [expect(200)],
    description: 'status: PENDING_PAYMENT | PAYMENT_FAILED | PAID | CONFIRMED | CANCELLED | COMPLETED. sort: createdAt | startTime | amount | status (prefix - for desc).',
  }),
  request('Cancel booking', 'PATCH', '/api/bookings/{{booking_id}}/cancel', { tests: [expect(200, 409)], description: 'Owner or admin. Errors: 409 invalid transition.' }),
]);

const userFolder = folder('USER', [accountFolder('user', 'User'), chatFolder, resumeFolder, userConsultation, logout('user')], {
  auth: bearer('user'),
  description: 'Job seeker flows. Run "Login as User" first; the rest of the folder can be run top to bottom with the Collection Runner.',
});

const consultantFolder = folder('CONSULTANT', [
  accountFolder('consultant', 'Consultant'),
  folder('Consultant profile & sessions', [
    request('Get my consultant profile', 'GET', '/api/consultants/me', { tests: [expect(200)] }),
    request('Update profile, rate & availability', 'PUT', '/api/consultants/me', {
      body: {
        headline: 'Career coach for software engineers',
        bio: 'Ex-hiring manager helping engineers grow into senior roles.',
        expertise: ['Resume review', 'Mock interviews', 'Salary negotiation'],
        hourlyRate: 1500,
        active: true,
        availability: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, startHour: 4, endHour: 12 })),
      },
      tests: [expect(200)],
      description: 'hourlyRate in INR (100–100000). availability hours are UTC (dayOfWeek 0 = Sunday).\n\nErrors: 400 VALIDATION_ERROR, 403 not a consultant.',
    }),
    request('List my sessions', 'GET', '/api/bookings', {
      query: [['page', '1'], ['limit', '10'], ['sort', '-startTime'], ['status', 'CONFIRMED', true]],
      tests: [expect(200), save('consultant_booking_id', 'id(pm.response.json().items[0])')],
      description: 'Only bookings with this consultant. Saves the first as {{consultant_booking_id}}.',
    }),
    request('Session detail', 'GET', '/api/bookings/{{consultant_booking_id}}', { tests: [expect(200, 404)] }),
    request('Mark session completed', 'PATCH', '/api/bookings/{{consultant_booking_id}}/complete', {
      tests: [expect(200, 400, 404, 409)],
      description: 'Only after the session start time and from CONFIRMED.\n\nErrors: 400 session has not started, 409 invalid transition.',
    }),
  ]),
  logout('consultant'),
], { auth: bearer('consultant'), description: 'Consultant flows. Run "Login as Consultant" first.' });

const adminFolder = folder('ADMIN', [
  accountFolder('admin', 'Admin'),
  folder('Administration', [
    request('List users', 'GET', '/api/users', {
      query: [['page', '1'], ['limit', '10'], ['sort', '-createdAt'], ['role', 'USER', true], ['search', '', true]],
      tests: [expect(200)],
      description: 'ADMIN only (403 otherwise). sort: createdAt | -createdAt | name | email.',
    }),
    request('List all bookings', 'GET', '/api/bookings', {
      query: [['page', '1'], ['limit', '10'], ['sort', '-createdAt'], ['status', '', true], ['search', '', true]],
      tests: [expect(200), save('admin_booking_id', 'id(pm.response.json().items[0])')],
      description: 'Every booking on the platform. Saves the newest as {{admin_booking_id}}.',
    }),
    request('Booking detail', 'GET', '/api/bookings/{{admin_booking_id}}', { tests: [expect(200, 404)] }),
    request('Cancel booking', 'PATCH', '/api/bookings/{{admin_booking_id}}/cancel', { tests: [expect(200, 409)], description: 'Errors: 409 invalid transition (e.g. already cancelled or completed).' }),
    request('Mark booking completed', 'PATCH', '/api/bookings/{{admin_booking_id}}/complete', { tests: [expect(200, 400, 409)] }),
    request('List consultants', 'GET', '/api/consultants', { tests: [expect(200)] }),
    request('List chat sessions', 'GET', '/api/chat/sessions', { tests: [expect(200)] }),
  ]),
  logout('admin'),
], { auth: bearer('admin'), description: 'Admin flows. Run "Login as Admin" first.' });

const publicFolder = folder('PUBLIC (no login)', [
  request('Health check', 'GET', '/api/health', { tests: [expect(200)] }),
  request('OpenAPI spec (JSON)', 'GET', '/api/docs.json', { tests: [expect(200)] }),
  request('Register new user', 'POST', '/api/auth/register', {
    pre: "v.set('new_email', `qa.${Date.now()}@careerpilot.dev`);",
    body: { name: 'Postman Tester', email: '{{new_email}}', password: 'Demo@12345', phone: '+91 90000 00000', role: 'USER' },
    tests: [
      expect(201),
      "try { const u = pm.response.json().devVerifyUrl; if (u) v.set('verify_token', new URL(u).searchParams.get('token')); } catch (e) {}",
    ],
    description: 'role: USER | CONSULTANT (ADMIN is rejected). Uses a unique email each run. In email MOCK mode the response includes devVerifyUrl (token saved as {{verify_token}}).\n\nErrors: 400 VALIDATION_ERROR, 409 email already used, 429 too many attempts.',
  }),
  request('Verify email', 'POST', '/api/auth/verify-email', { body: { token: '{{verify_token}}' }, tests: [expect(200, 400)], description: 'Errors: 400 invalid or expired link.' }),
  request('Forgot password', 'POST', '/api/auth/forgot-password', {
    body: { email: '{{new_email}}' },
    tests: [expect(200), "try { const u = pm.response.json().devResetUrl; if (u) v.set('reset_token', new URL(u).searchParams.get('token')); } catch (e) {}"],
    description: 'Always 200 (no account enumeration). In MOCK mode returns devResetUrl (token saved as {{reset_token}}).',
  }),
  request('Reset password', 'POST', '/api/auth/reset-password', {
    body: { token: '{{reset_token}}', password: 'Demo@12345' },
    tests: [expect(200, 400)],
    description: 'Signs out all devices for that account.\n\nErrors: 400 invalid or expired link / weak password.',
  }),
], { auth: noauth });

const accounts = [
  ['user_email', 'rahul.user@careerpilot.dev'], ['user_password', 'Demo@12345'],
  ['consultant_email', 'riya.consultant@careerpilot.dev'], ['consultant_password', 'Demo@12345'],
  ['admin_email', 'admin@careerpilot.dev'], ['admin_password', 'Admin@12345'],
];
const saved = ['user', 'consultant', 'admin'].flatMap((r) => [`${r}_token`, `${r}_refresh_token`]).concat(
  ['chat_session_id', 'resume_id', 'resume_copy_id', 'consultant_id', 'slot_date', 'slot_start', 'booking_id', 'consultant_booking_id', 'admin_booking_id', 'new_email', 'verify_token', 'reset_token'],
);

const collection = {
  info: {
    name: 'CareerPilot API',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description:
      'All CareerPilot endpoints through the API gateway, grouped by role.\n\n' +
      '1. Import this collection and `CareerPilot.local.postman_environment.json`, then select the "CareerPilot Local" environment.\n' +
      '2. Start the stack (`npm run dev`) and seed demo data (`npm run seed`).\n' +
      '3. Open a role folder and send its Login request: the token is stored automatically and every request in that folder uses it.\n' +
      '4. Or run a whole folder with the Collection Runner (order: PUBLIC, USER, CONSULTANT, ADMIN).\n\n' +
      'Errors always look like `{ "error": { "code", "message", "details?" } }`. Interactive docs: {{baseUrl}}/api/docs',
  },
  item: [publicFolder, userFolder, consultantFolder, adminFolder],
  variable: [['baseUrl', 'http://localhost:4000'], ['appOrigin', 'http://localhost:3000'], ...accounts, ...saved.map((k) => [k, ''])].map(([key, value]) => ({ key, value })),
};

const environment = {
  name: 'CareerPilot Local',
  values: [
    ['baseUrl', 'http://localhost:4000', 'default'], ['appOrigin', 'http://localhost:3000', 'default'],
    ...accounts.map(([k, val]) => [k, val, k.endsWith('password') ? 'secret' : 'default']),
    ...saved.map((k) => [k, '', k.endsWith('token') ? 'secret' : 'default']),
  ].map(([key, value, type]) => ({ key, value, type, enabled: true })),
  _postman_variable_scope: 'environment',
};

const write = (file, data) => fs.writeFileSync(path.join(OUT, file), `${JSON.stringify(data, null, 2)}\n`);
write('CareerPilot.postman_collection.json', collection);
write('CareerPilot.local.postman_environment.json', environment);
write('openapi.json', { ...openapi, servers: [{ url: 'http://localhost:4000', description: 'Local gateway' }] });
console.log('Wrote Postman collection, environment and openapi.json to', OUT);
