# CareerPilot – AI Career & Consultation Platform

Monorepo containing a Next.js frontend, an Express API gateway and three Express microservices
(auth, AI, booking), plus shared packages. **Status: Phases 0–3 implemented.** API docs: `/api/docs`.

```
apps/web                  Next.js 14 App Router + TS + Tailwind + shadcn/ui + RTK Query   :3000
services/gateway          JWT verification, CORS, rate limits, proxy, /api/dashboard     :4000
services/auth-service     users, register/login/logout, profile, roles                    :4001
services/ai-service       chat sessions/messages, LLM, AI resume generation              :4002
services/booking-service  consultants, availability, bookings, Stripe, Calendar, email   :4003
packages/shared           Zod schemas, TS types, constants (roles, booking states)
packages/service-kit      logger, errors, validate(), requireInternal/Auth/Role, /health
packages/resume-templates renderResume(resumeData, templateId) – pure functions
docs/                     ARCHITECTURE.md, FLOW.md
```

## Quick start (no Docker, zero credentials)

Requirements: Node 20+, MongoDB on `localhost:27017`, yarn (for installing).

```bash
yarn install                       # installs all workspaces
for d in services/* apps/web; do [ -f $d/.env.example ] && cp -n $d/.env.example $d/.env; done
cp -n apps/web/.env.example apps/web/.env.local
# edit the secrets in each .env (gateway & services must share INTERNAL_SECRET / JWT_ACCESS_SECRET)
npm run seed                       # creates the admin + demo accounts
npm run dev                        # starts web + gateway + 3 services with concurrently
```

Open http://localhost:3000. Next.js rewrites `/api/*` to the gateway, so the browser stays same-origin
and httpOnly cookies work without CORS gymnastics.

## Docker

```bash
cp .env.example .env               # fill secrets
docker compose up --build
docker compose exec auth-service node src/seed.js
```

## Seeded accounts

| Role | Email | Password (from seed env) |
|------|-------|--------------------------|
| ADMIN | admin@careerpilot.dev | `SEED_ADMIN_PASSWORD` |
| CONSULTANT | riya.consultant@careerpilot.dev | `SEED_DEMO_PASSWORD` |
| CONSULTANT | arjun.consultant@careerpilot.dev | `SEED_DEMO_PASSWORD` |
| USER | rahul.user@careerpilot.dev | `SEED_DEMO_PASSWORD` |

ADMIN cannot self-register: the register schema only accepts `USER` and `CONSULTANT`.

## Mock modes

Every external provider switches to MOCK automatically when its env keys are empty:
LLM (`EMERGENT_LLM_KEY`), Stripe (`STRIPE_SECRET_KEY`), Google Calendar (`GOOGLE_SERVICE_ACCOUNT_JSON`),
email (`GMAIL_USER` + `GMAIL_APP_PASSWORD`). Each service logs its mode at startup.

## Feature status

- [x] Monorepo, workspaces, `npm run dev`, Dockerfiles + docker-compose, `/health` everywhere
- [x] Gateway: local JWT verification, CORS, rate limits, signed internal tokens, 503 isolation, dashboard aggregation, Swagger at `/api/docs`
- [x] Auth: register/login/logout, rotating refresh tokens with reuse detection, forgot/reset password, email verification, profile edit, roles, admin user list
- [x] AI chat: sessions CRUD, SSE streaming, context window, retries/timeouts, token usage, per-user AI rate limit, MOCK mode
- [x] Resumes: structured data, AI generation (validated JSON), Tiptap summary editor with undo/redo, autosave, versions + restore, duplicate, 2 templates, preview, HTML/PDF export, live template preview
- [x] Consultations: consultant profile/rate/availability, slots, booking rules + unique slot index, Stripe Checkout + idempotent webhook, calendar + email with retries, state machine, paginated/searchable bookings, consultant & admin pages
- [ ] Redis caching (documented plan in docs/FLOW.md §8), automated test suite beyond the template tests

Provider status in this environment: **LLM live** (Emergent key), **Stripe MOCK** (no claimable sandbox for India; set `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`), **Calendar MOCK**, **Email MOCK** (set `GMAIL_USER` + `GMAIL_APP_PASSWORD`).

## Note on the hosted preview environment

The hosted preview's process manager expects `/app/frontend` (port 3000) and `/app/backend` (port 8001).
These two folders are **environment adapters only**: `frontend/package.json` `start` runs the root
`npm run dev`, and `backend/server.py` is a pass-through proxy from 8001 to the gateway on 4000
(because the preview ingress sends `/api` to 8001). They are not part of the architecture.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/FLOW.md](docs/FLOW.md).
