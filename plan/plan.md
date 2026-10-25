# CareerPilot — AI Career & Consultation Platform

A career platform where job seekers chat with an AI career assistant, build and edit AI-assisted resumes in two templates, and book paid consultations with career experts.
Payments, calendar meetings and confirmation emails are handled automatically once a payment is confirmed. Every outside service also has a stand-in mode, so the app works fully with no credentials.

## Who it's for
- **Job seekers (USER):** sign up on their own, chat with the AI, manage resumes, book and pay for consultations.
- **Career experts (CONSULTANT):** sign up on their own, set their availability and hourly rate (INR), see their upcoming sessions.
- **Platform admin (ADMIN):** created only by the setup script, never through public sign-up; oversees users, consultants and bookings.

## Core features and experience
- **Accounts:** register, log in, log out, stay signed in securely, edit profile (name, email, phone, headline/bio). One login page that sends each role to its own home: USER → /dashboard, CONSULTANT → /consultant, ADMIN → /admin.
- **Privacy:** people only ever see their own chats, resumes and bookings. Pages and data are both locked by role.
- **AI career assistant:** a ChatGPT-style chat powered by Claude Opus 5.5. Replies stream in as they are written. Users can start, rename, reopen, continue and delete conversations. History is saved. If the AI is slow, down or rate-limited, a friendly message appears, and AI use has its own per-user limit.
- **AI resume builder:** sections for personal info, summary, education, experience, skills, projects, certifications and achievements. The AI drafts or polishes content from what the user enters. Content is kept separate from looks, so one resume renders in either **Modern Professional** or **ATS Classic**.
- **Resume editing:** a rich-text editor with undo/redo and autosave, plus preview, template switching, version history, duplicating, and export (print to PDF / HTML). The output is built to read well in applicant tracking systems (ATS).
- **Consultation booking:** pick a consultant, date and an open time slot, then enter name, email, phone and agenda. Past times, double bookings and slots outside the consultant's availability are rejected.
- **Payment:** Stripe checkout in INR at the consultant's own rate. Only Stripe's server-side confirmation marks a booking as paid, never the browser redirect. If Stripe sends the same confirmation twice, it is handled only once.
- **After payment:** a Google Calendar event with a meeting link is created, and a confirmation email goes out through Gmail. The email includes the user's name, consultant, date, time, meeting link and booking ID. If either step fails, the booking stays confirmed and the step is retried.
- **Booking states:** Pending payment → Paid → Confirmed → Completed, with branches to Payment failed and Cancelled. Invalid jumps between states are blocked.
- **Dashboard:** counts of resumes, chats, upcoming and completed consultations. If one part of the system is down, the rest of the dashboard still loads and shows which part is unavailable.
- **Booking list:** server-side paging, search, sort and status filter.
- **Docs:** step-by-step flow guide, architecture write-up explaining why the system is split the way it is, and interactive API documentation.

## User flow
1. A visitor registers as a job seeker or consultant, or logs in, and lands on their role's home.
2. The job seeker opens **Chat**, starts a conversation, and gets streamed career advice. They can come back to it later.
3. They open **Resumes → Create**, fill in sections, let the AI draft content, edit it, switch templates, preview and export.
4. They open **Consultations → Book**, choose a consultant and slot, enter details, and pay on Stripe.
5. Stripe confirms the payment to the server. The booking becomes Confirmed, the calendar event is created and the email is sent. The user sees it under Upcoming.
6. The consultant sees the session on their page and marks it Completed afterwards.

## UI/UX feel
- A clean, professional workspace with a persistent sidebar (Dashboard, Chat, Resumes, Consultations, Profile) and a role-specific menu for consultants and admins.
- Calm, focused look with a distinctive typeface and one confident accent colour. The design specialist will refine this during the build.
- Every screen has loading, empty and error states. It works on phone, tablet and desktop.

## Implementation phases
**Phase 1 — Foundation (MVP, built now; your "Phase 0")**
- One project folder containing the website, a central gateway, and three separate back-end services: accounts, AI, and bookings. Each service has its own database and health check.
- The gateway checks sign-in itself, applies rate limits, and passes requests on to the services. It returns a clear "service unavailable" message when one is down, and includes a dashboard endpoint that tolerates partial failures.
- Shared building blocks: common data rules, role and booking-status lists, logging, error handling, and the two resume template renderers.
- The website shell: layout, sidebar, login/register page placeholders, and page protection by role.
- Setup files for each part, a container setup file, and a single `npm run dev` command that starts everything.
- Draft architecture and flow documents.

**Phase 2 — Accounts, AI chat and resumes**
- Full sign-up/login/logout/refresh, profile editing, admin created by the setup script, and role redirects.
- AI chat sessions with streaming, history, usage tracking, timeouts/retries and AI rate limits.
- Resume builder, AI generation, editor with autosave, versions, duplication, both templates, preview and export.

**Phase 3 — Consultations, payments and polish**
- Consultant profiles, availability and INR rates; booking rules; Stripe checkout and webhook; calendar event; Gmail confirmation email; state machine.
- Dashboard numbers, paginated/searchable booking list, consultant and admin pages, optional caching.
- Complete API documentation, final flow and architecture docs, tests and production hardening.

## Assumptions
- Your stated technology stack and folder layout are used exactly as written. Nothing is substituted.
- The AI model is **Claude Opus 5.5**, run on the Emergent universal key so you need no AI account. Its usage draws on your Emergent balance. If the key is missing, the app switches to stand-in AI replies.
- **Stripe** uses a ready-made test account that you can claim later to take real payments. Test card: 4242 4242 4242 4242. Prices are in **INR**, and each consultant sets their own hourly rate. Sessions last 60 minutes by default.
- **Email** goes through Gmail using your Gmail address and an app password. You enter these securely in Phase 3. Until then, emails are logged and not sent.
- **Google Calendar** runs in stand-in mode, with a placeholder meeting link, until Google credentials are provided. Real events need a Google service account or OAuth credentials from you.
- Forgot/reset password and email verification are included in Phase 2 and use the same Gmail setup. They run in stand-in mode until it is set up.
- Redis caching is optional. The app runs without it, and when it is present it is used for the consultant list and dashboard counts.
- The app is in English. Times are shown in the viewer's local time zone and stored in a standard universal time.
- The setup script creates one admin, two sample consultants with availability, and one sample job seeker. Their sign-in details are documented.
- The brand name "CareerPilot" is a placeholder and can be changed.
