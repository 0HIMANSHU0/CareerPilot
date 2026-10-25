# Flows

Every request goes **Browser → gateway (`/api/*`) → owning service**. API reference: `/api/docs` (Swagger UI), raw spec `/api/docs.json`.

## 1. Request path (every API call)

1. The browser calls same-origin `/api/...` and sends its httpOnly cookies (`access_token` 15 min, `refresh_token` 14 days).
2. The gateway runs helmet → CORS allow-list → global rate limit (stricter on login/register) → `authenticate`, which verifies the JWT signature, issuer, audience and expiry **locally**.
3. `requireSessionUnlessPublic` returns 401 for anonymous calls to private routes.
4. The proxy rewrites `/api/<prefix>` to `/<prefix>` and adds `x-internal-token`, a 60-second JWT carrying `{id, role, email, name}`.
5. The service runs `requireInternal` → `requireAuth`/`requireRole` → Zod `validate()` → handler. Every query includes `userId` (ownership).
6. If a service is down, the gateway returns `503 SERVICE_UNAVAILABLE` with the service name.

## 2. Auth (auth-service)

- **Register:** the Zod schema accepts USER or CONSULTANT only, so ADMIN is created by `npm run seed` alone. Then: unique email (409) → bcrypt (12 rounds) → create user → issue session → email a verification link. In mock mode the link is returned as `devVerifyUrl`.
- **Login:** bcrypt compare, using a dummy hash for unknown emails so response timing stays uniform. Both failures return the same 401 message. The frontend then redirects by role (USER → /dashboard, CONSULTANT → /consultant, ADMIN → /admin) or to a `next` page that role is allowed to open.
- **Session:** the access JWT (15 min) plus an opaque refresh token. Only the token's SHA-256 is stored, with a `family` id and a TTL index.
- **Refresh (rotation):** `POST /auth/refresh` revokes the presented token and issues a new pair in the same family. Presenting an **already revoked** token is treated as theft and revokes the whole family.
  - Frontend: RTK Query's `baseQuery` retries once after a refresh on a 401.
  - `middleware.ts` sends a user with an expired access token (but a refresh cookie) to `/session/refresh?next=…`.
- **Logout:** revokes the refresh token and clears both cookies.
- **Forgot/reset:** `forgot-password` always answers 200, so it cannot reveal which emails exist. It stores a hashed one-time token that expires in 30 minutes, and in mock mode returns `devResetUrl`. `reset-password` consumes the token atomically, sets the new hash and **revokes every session**.
- **Verify email:** a one-time token, valid 24 hours, sets `emailVerified=true`.
- **Profile:** `PATCH /users/me` changes only whitelisted fields (name, phone, profile.*). Email and role cannot be changed there.

## 3. Chat (ai-service)

`POST /chat/sessions/:id/messages`:
1. Run the ownership check, then the per-user AI rate limit (`AI_RATE_LIMIT_PER_MINUTE`), then validation.
2. Save the user message.
3. Load the last `CHAT_CONTEXT_MESSAGES` complete messages as context and add the career-coach system prompt.
4. Open an SSE stream (`X-Accel-Buffering: no`) and send a `user_message` event.
5. Call the LLM (OpenAI-compatible `/chat/completions` with `stream: true`):
   - Transient errors (408/429/5xx/network) are retried with exponential backoff **before** streaming starts.
   - The whole call has a timeout (`LLM_TIMEOUT_MS`) and is aborted if the client disconnects.
   - Malformed chunks are skipped.
6. Each token is sent as a `delta` event.
7. On success: save the assistant message with token usage, add the usage to the session totals, auto-title the session, and send `done`.
8. On failure: mark the user message `status:error` (so it is left out of future context) and send `error` with a friendly message.

MOCK mode (no `EMERGENT_LLM_KEY`) streams a canned reply through the same path.

## 4. Resume (ai-service + resume-templates)

- Data is **structured** (`resumeDataSchema`). Only the summary is rich text (Tiptap HTML, sanitized on the server to p/strong/em/ul/ol/li).
- **Create** → **edit** (autosaves with `PATCH` 1.5 s after the last change) → **Save version** (an immutable snapshot, capped at 30) → **restore** any version (which creates a new version) → **duplicate**.
- **AI generation:** `POST /resumes/ai/generate {target: summary|experience|full}`.
  - The LLM returns JSON only. It is parsed, merged and validated against the same Zod schema. Malformed output returns 502 and nothing is saved.
  - The result is returned for the user to review in the editor, never stored directly.
- **Render:** `renderResume(data, templateId)` is a pure function. The same data renders as Modern Professional or ATS Classic. Preview shows the HTML in a sandboxed iframe. Export is print-to-PDF or an HTML download.

### Why the output is ATS-friendly
- Single column with no tables, images or icons. Text stays in reading order.
- Semantic HTML: one `<h1>` (the name), `<section>` blocks with `<h2>` titles, `<h3>` per entry and real `<ul>/<li>` bullets.
- Standard section names (Professional Summary, Experience, Education, Skills…). Empty sections are left out.
- Plain machine-readable text: dates and contact details are text, links are real `<a href>`, and skills are a comma-separated list.
- System fonts and consistent formatting. ATS Classic has no colour at all.

## 5. Booking → payment → webhook → calendar → email (booking-service)

1. **Slots:** `GET /consultants/:id/slots?date=` builds 60-minute UTC slots from weekly availability and removes past and taken slots.
2. **Create:** `POST /bookings` (USER). The time must be in the future, on the hour, and inside the consultant's availability window. The booking is inserted as `PENDING_PAYMENT` with `slotLocked: true`, user/consultant name and email copied in, the amount taken from the consultant's INR rate, and a 30-minute payment hold.
   - **Double booking** is blocked by a unique partial index `{consultantId, startTime}` where `slotLocked: true`. A duplicate returns 409 `SLOT_TAKEN`, which also covers two users booking at the same moment.
3. **Checkout:** `POST /bookings/:id/checkout {originUrl}`. The origin must be on the `APP_ORIGINS` allow-list. Stripe Checkout gets `price_data` computed on the server and metadata `{bookingId}`. A payment record is saved.
4. **Stripe → booking-service webhook** (`/webhooks/stripe`, raw body, signature verified):
   - `checkout.session.completed` (paid) → `markPaid`
   - `async_payment_failed` / `expired` → `markFailed`
   - It always answers 2xx so Stripe stops retrying.
5. **Idempotent `markPaid`:**
   - The event id is `$addToSet` into the payment, and a duplicate delivery is skipped.
   - The atomic `PENDING_PAYMENT → PAID` transition (`findOneAndUpdate` filtered on status) means only one caller ever fulfils the booking.
   - Then `PAID → CONFIRMED`.
6. **Calendar:** creates a Google Calendar event with a Meet link and stores the `eventId`, `meetingUrl`, start and end. A failure is recorded as `calendar.status=FAILED`. The booking **stays confirmed**, and a background sweep retries up to 5 times.
7. **Email:** sends the confirmation (name, consultant, date, time, meeting link, booking ID) through Gmail SMTP. A failure is recorded and retried the same way.
8. **Success page:** only **polls** `GET /bookings/:id`. That endpoint can ask Stripe for the session status and run the same idempotent `markPaid` (a fallback if the webhook is delayed). The browser redirect itself never confirms a booking.
9. **Holds:** unpaid bookings past their hold become `PAYMENT_FAILED` and free the slot.

**State machine** (`packages/shared` `BOOKING_TRANSITIONS`, enforced by `transition()`):
`PENDING_PAYMENT → PAID | PAYMENT_FAILED | CANCELLED`, `PAYMENT_FAILED → PENDING_PAYMENT | CANCELLED`, `PAID → CONFIRMED`,
`CONFIRMED → COMPLETED | CANCELLED`. CANCELLED and COMPLETED are terminal. Invalid jumps return 409 `INVALID_TRANSITION`. Every change is appended to `statusHistory`.

**MOCK mode:** if Stripe keys are missing, checkout redirects to `/consultations/checkout/mock`. It calls `POST /payments/mock/:id/complete`, which runs the **same** `markPaid`/`markFailed` code. Calendar and email mocks log the event and use a placeholder meeting link.

## 6. Dashboard

`GET /api/dashboard`: the gateway calls `ai-service /internal/stats` and `booking-service /internal/stats` in parallel (`Promise.allSettled`, 1.5 s timeout each). Each count is scoped to the caller and served by an index (`{userId, deletedAt, updatedAt}` on resumes, `{userId, updatedAt}` on chat sessions, `{userId, status, startTime}` on bookings). A missing service gives `null` counts and `unavailable` plus `partial: true`. If every source is down → 503.

## 7. Listing: `GET /api/bookings?page&limit&status&search&sort`

The base filter depends on role (user = own, consultant = own sessions, admin = all). Then a status filter, a case-insensitive search on name, email, consultant or agenda (regex-escaped), sorting on a whitelist (`startTime|createdAt|amount|status`, `-` for descending, `_id` as tiebreaker), and skip/limit with a parallel `countDocuments`. The response is `{items, page, limit, total, totalPages}`.

## 8. Caching (Redis – optional, not enabled)

The app is correct without a cache, and no Redis is available in this environment.
- **Planned (Phase 4):** the consultant list (60 s TTL, cleared on `PUT /consultants/me`) and dashboard counts (30 s TTL per user, cleared on booking, chat or resume writes).
- **Never cached:** slots and booking state, because they must always be fresh to prevent double booking.
