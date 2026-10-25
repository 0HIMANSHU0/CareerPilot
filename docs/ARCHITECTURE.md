# Architecture

```
Browser (Next.js UI, no secrets, no DB)
   │  same-origin /api/*  (httpOnly access_token cookie)
   ▼
API Gateway :4000 ── verifies JWT locally, CORS, rate limits, request ids
   │  HTTP + x-internal-token (60s JWT signed with INTERNAL_SECRET, carries {id, role, email, name})
   ├──────────────► auth-service :4001     ── careerpilot_auth     (users)
   ├──────────────► ai-service :4002       ── careerpilot_ai       (chat sessions/messages, resumes, usage) ──► LLM
   └──────────────► booking-service :4003  ── careerpilot_booking  (consultants, availability, bookings, payments)
                          ▲                                   ├──► Google Calendar
            Stripe webhook (direct, signature-verified)       └──► Email (Gmail SMTP)
```

## Service boundaries and why

| Service | Owns | Reasoning |
|---------|------|-----------|
| auth-service | users, credentials, roles, profile | Security-sensitive data isolated; small surface; the only place passwords are touched. |
| ai-service | chat sessions/messages, resumes, LLM usage | Chat and resume generation share the LLM client, prompts, retries, usage tracking and AI rate limits. Resumes live here because AI generation and versioning are tightly coupled; the HTML rendering is a pure package (`resume-templates`) so it can be moved to a separate resume-service later without changing data. |
| booking-service | consultants, availability, bookings, payments, calendar + email side effects | Booking, payment and post-payment fulfilment form one transactional workflow (state machine). Splitting payment/notification into further services would add distributed-transaction complexity without benefit at this scale; they are isolated as provider modules inside the service instead. |
| gateway | no data | Single entry point: authentication, CORS, rate limiting, routing, dashboard aggregation. |

## Key decisions

- **Gateway verifies JWTs itself.** It shares `JWT_ACCESS_SECRET` with auth-service and never calls it per
  request, so chat, resumes and bookings keep working if auth-service is down.
- **Services trust only the gateway.** Every service route (except `/health` and, later, the Stripe webhook)
  requires `x-internal-token`, a 60-second JWT signed with `INTERNAL_SECRET`. A request sent straight to
  a service port is rejected with `401 MISSING_INTERNAL_TOKEN`. The gateway overwrites the header, so clients cannot forge it.
- **Communication is synchronous HTTP only.** Services never import each other's models. Phase 3 side effects
  (calendar/email) run inside booking-service with persisted retry state, so no message broker is needed yet.
- **Database per service** (one MongoDB instance, separate databases). Nothing joins across databases.
  User name/email are **denormalized into bookings** so payment, calendar and email work without auth-service.
- **Failure isolation.** `GET /api/dashboard` uses `Promise.allSettled` with a 1.5s timeout per service and returns
  partial data plus per-service status. Proxy errors become `503 SERVICE_UNAVAILABLE` with the service name.
  Locally, `concurrently` runs without `--kill-others`, so one crashed service does not stop the others.
- **Mock providers.** Each provider client checks its env keys at startup and falls back to a mock implementation,
  so the whole system runs end to end with zero credentials.
- **Shared code is limited to contracts and plumbing:** `shared` (Zod schemas, constants, types) and
  `service-kit` (logging, errors, validation, auth middleware, health). No business logic or models are shared.

## Security baseline

helmet on every service, CORS allow-list on the gateway, global and auth-specific rate limits (AI-specific limits
in Phase 2), Zod validation at every boundary, bcrypt (12 rounds), httpOnly + SameSite=Lax cookies (Secure in HTTPS),
a uniform error envelope that never leaks stack traces, pino logs with cookie/token headers redacted.

## Frontend

Next.js App Router. `middleware.ts` decodes (does not verify) the access token's role for routing UX only; real
authorization is enforced in the gateway and in service `requireRole()` middleware. RTK Query is the single API
layer (`src/store/api.ts`). Forms use React Hook Form with the same Zod schemas the backend uses.

## Data model and indexes

- users: `email` unique, `role`
- chatsessions: `{ userId, updatedAt: -1 }`; chatmessages: `{ sessionId, createdAt }`
- resumes: `{ userId, updatedAt: -1 }`; resume versions embedded with a cap or a separate collection with `{ resumeId, version }` unique
- bookings: unique partial index `{ consultantId, startTime }` where status is active (prevents double booking);
  `{ userId, status, startTime }` for the dashboard and listings; text index on denormalized name/email for search
- payments: `sessionId` unique, `processedEventIds` for idempotent webhooks
- refreshtokens / usertokens: `tokenHash` unique + TTL index on `expiresAt`; resumeversions: `{ resumeId, version }` unique

## Preview-environment note

Only the gateway is publicly reachable here, so Stripe's webhook hits `/api/stripe/webhook` and the gateway forwards it raw
(no auth, no body parsing) to booking-service `/webhooks/stripe`, which verifies the signature. In Docker/production,
booking-service's port is exposed and Stripe calls it directly.
