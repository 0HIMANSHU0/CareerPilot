# CareerPilot – PRD

## Original problem statement
Production-style AI-powered Career & Consultation Platform as a monorepo: Next.js (App Router, TS, Tailwind, shadcn, RHF+Zod, RTK Query, Tiptap) frontend; Express services (gateway :4000, auth :4001, ai :4002, booking :4003) with Mongoose, Zod, JWT httpOnly cookies + bcrypt, helmet, rate-limit, pino; MongoDB with a database per service; optional Redis; Docker Compose + `npm run dev`. Roles USER/CONSULTANT (self-register) and ADMIN (seed only). Features: auth/profile, AI career chat (streaming), AI resume builder with 2 templates + Tiptap editing, consultation booking with Stripe webhook, Google Calendar, email, booking state machine, dashboard aggregation, paginated bookings, Swagger docs, FLOW/ARCHITECTURE docs. Work in phases. Phase 0 = scaffold.

## Decisions / assumptions
- LLM: Claude Opus 5.5 via Emergent universal key (MOCK when key missing). Stripe: Emergent claimable sandbox, INR, consultant-set hourly rate, 60 min sessions. Email: Gmail SMTP (MOCK until creds). Calendar: MOCK until Google creds.
- Preview env adapters: /app/frontend `start` → root `npm run dev` (unsets PORT/HOST); /app/backend/server.py proxies :8001 → gateway :4000.

## Implemented
### 2026-06 – Phase 0 (scaffold)
- Yarn/npm workspaces monorepo; root `npm run dev` (concurrently, no kill-others), `npm run seed`
- packages/shared (constants, Zod schemas, d.ts types), service-kit (logger, errors, validate, internal token, requireAuth/Role, health, startService, loadEnv), resume-templates (Modern Professional + ATS Classic, node tests)
- Gateway: local JWT verify, CORS, rate limits, signed internal token proxy, 503 on downstream failure, /api/health aggregation, /api/dashboard via Promise.allSettled + 1.5s timeouts
- auth-service: User model, register/login/logout/me, seed (admin + 2 consultants + 1 user)
- ai-service / booking-service: /health + /internal/stats, mock-mode detection logs
- Next.js shell: split auth pages, role-aware sidebar, mobile sheet, health pill, dashboard stat cards with partial failure, middleware.ts role protection, placeholder pages for all routes
- Dockerfiles per app/service, docker-compose.yml, .env.example everywhere, README, docs/ARCHITECTURE.md, docs/FLOW.md
- Tested: iteration_1 100% backend + frontend

### 2026-06 – Phases 2 & 3 + live preview + API docs
- Auth: rotating refresh tokens (hashed, family reuse detection), forgot/reset password, email verification, profile PATCH, admin user list, fixed seed ids
- AI: chat sessions CRUD + SSE streaming via Emergent LLM proxy (claude-opus-5-5, LIVE), retries/timeouts, usage tracking, per-user AI rate limit, MOCK mode
- Resumes: CRUD, autosave, versions/restore, duplicate, soft delete, AI generate (validated JSON), Tiptap summary editor, render both templates, preview/export, live sample template preview on /resumes
- Booking: consultant profile/rate/UTC availability, slots, rules, unique partial slot index (indexes synced on every startup), checkout (Stripe or MOCK), idempotent webhook, state machine, calendar + email with retry sweep, paginated/search/sort/filter list, consultant & admin pages
- Gateway: Swagger UI at /api/docs, /api/stripe/webhook raw pass-through
- Providers in preview: LLM LIVE; Stripe MOCK (claimable sandbox rejected: country IN); Calendar MOCK; Gmail MOCK
- Tested: iteration_2 (all pass after fixes: index sync, Tiptap toolbar, rename cache)

## Backlog
- P1: real Stripe keys (user-supplied), Gmail app password, Google service account
- P2: Redis caching (plan in docs/FLOW.md §8), AlertDialog instead of window.confirm, local-time date picker, broader automated tests
