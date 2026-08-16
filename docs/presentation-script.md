# CRM + ERP Platform — Presentation Script

> A complete speaking script for presenting the platform: the pitch, full
> overview, every feature explained (what it does, how it's implemented, what
> it's built with), engineering quality, and a live demo flow.

---

# PART 1 — THE PITCH (60 seconds)

*"Every growing company runs its back office out of five different tools — one for sales, one for projects, one for billing, one for HR, and email for everything else. The data never matches, reporting is manual, and switching between tools eats hours every week.*

*We built the answer: **a single, unified platform that runs your entire back office** — CRM, project management, billing, HR, file management, knowledge base, and analytics — with an **AI assistant** built on top that drafts your emails, writes your proposals, summarizes your meetings, and answers questions about your own data.*

*It's **multi-tenant and secure by design** — every company's data is isolated, access is controlled by role, and every action is audited. Under the hood it's **production-grade engineering**: clean architecture, strict TypeScript, 47 automated tests, CI/CD, Docker, and an API documented with Swagger.*

*And it's **live right now** — I can log in as the Owner, an Admin, or a regular team member, and each one sees a completely different, purpose-built experience.*

*One workspace. Every team. Real AI. Let me show you."*

---

# PART 2 — FULL OVERVIEW

## 2.1 What the product is

**Startup CRM + ERP** is a multi-tenant SaaS platform that unifies the core
back-office into one product:

| Pillar | Modules |
|---|---|
| **Sell** | Clients, quotations, invoices, payments |
| **Plan** | Projects, tasks, kanban board, meetings, calendar |
| **Operate** | Employees, attendance, leave, assets, documents, files |
| **Share** | Knowledge base, announcements, notifications |
| **Understand** | Analytics dashboard, revenue reports, audit log |
| **Accelerate** | AI assistant (9 features) |

## 2.2 The architecture at a glance

```
Browser ──► Next.js (React UI) ──► NestJS API ──► PostgreSQL
                                     │      │
                                     │      └──► Redis (cache + job queues)
                                     └─────────► S3 / MinIO (file storage)
                                                  │
                                          OpenRouter AI (Gemini 4)
```

- **Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn-style component library. The browser talks to the API directly (CORS) in development, and through NGINX in production.
- **Backend:** NestJS with **Clean Architecture** — every module is split into API → Application → Domain → Infrastructure layers, so business rules are framework-independent and testable.
- **Data:** PostgreSQL via **Prisma ORM** (27 tables), **Redis** for permission caching and **BullMQ** background jobs.
- **Files:** S3-compatible object storage (MinIO in dev) with presigned URLs — file bytes never pass through the API.
- **AI:** An OpenAI-compatible gateway that talks to OpenRouter (Google Gemma 4), with a graceful mock fallback when no key is configured.

## 2.3 The technology stack (what we chose and why)

| Layer | Technology | Why |
|---|---|---|
| UI | Next.js 14 + TypeScript | Industry-standard React framework; SSR + client components |
| Styling | TailwindCSS + shadcn-style components | Rapid, consistent, accessible design system |
| API | NestJS + TypeScript (strict) | Opinionated structure for large backends; DI-first |
| Database | PostgreSQL + Prisma | Type-safe queries, migrations, relational integrity |
| Cache/Queue | Redis + BullMQ | Fast permission cache; background job scheduling |
| Storage | MinIO (S3-compatible) | Self-hosted in dev; swaps to AWS S3 in prod unchanged |
| Auth | JWT + passport + argon2id | Stateless tokens; industry-standard hashing |
| AI | OpenRouter (Gemma 4) | Free-tier, OpenAI-compatible; provider-swappable |
| DevOps | Docker, Compose, NGINX, GitHub Actions | Reproducible envs; automated CI on every push |
| Docs | Swagger/OpenAPI | Interactive API docs auto-generated from code |

---

# PART 3 — EVERY FEATURE, IN DETAIL

*For each feature: **What it does** (user-facing), **How it was implemented**
(backend + frontend), and **Built with** (specific technologies).*

---

## 3.1 Authentication & Session Management

**What it does.** Users register (creating their own organization), sign in,
and stay signed in securely. Sessions survive page refreshes and auto-recover
when the short-lived token expires — silently, without the user noticing.

**How it's implemented.**
- *Backend:* On **register**, a single transaction creates the user, an
  organization, a default workspace, and an Owner membership — atomic, so a
  partial failure can never leave half a tenant. On **login**, credentials are
  verified with **argon2id** (memory-hard hashing). The API issues a pair:
  a **15-minute JWT access token** and an **opaque refresh token**. Refresh
  tokens are stored **hashed at rest (SHA-256)**, are **single-use** (rotated on
  every refresh), and **reuse of an already-rotated token is detected and
  rejected** — the signature of token theft. Login errors are deliberately
  generic so attackers can't enumerate registered emails.
- *Frontend:* Tokens live in browser storage; an API client wrapper attaches
  the bearer token to every request and, on a 401, transparently refreshes and
  retries once before ever showing the user an error. Passwords must be ≥12
  characters with a letter and a number.

**Built with.** `@nestjs/jwt`, `passport-jwt` strategy, `argon2`, custom
`JwtAuthGuard` (whole API is protected by default; routes opt *out* with
`@Public()`).

---

## 3.2 Organizations, Workspaces & Multi-Tenancy

**What it does.** Every company is an **Organization** (the billing/ownership
unit) containing **Workspaces** (data partitions — e.g. "Default", "Marketing").
A user can belong to multiple organizations and switch between them from the
sidebar.

**How it's implemented.**
- Every piece of business data carries a `workspaceId`. **The workspace filter
  is enforced in the service layer on every single query** — a member of
  company A can never read company B's data even by forging request URLs
  (verified by automated cross-tenant tests).
- Organization creation, workspace listing/creation, and an org switcher in
  the UI round out the tenancy experience.

**Built with.** Prisma composite indexes (`@@index([workspaceId, ...])`), a
shared `assertWorkspaceInOrg()` guard used by every module's service layer.

---

## 3.3 Roles & Permissions (RBAC)

**What it does.** Three roles with genuinely different experiences:
- **Owner** — full control; the account holder; can never be removed if last.
- **Admin** — full operational access including member management.
- **Member** — personal workspace; no billing, HR, analytics, or org settings.

**How it's implemented.**
- *Backend:* A **catalog of 35 explicit permissions** (`clients:read`,
  `invoices:write`, `members:manage`, …). Each role maps to a set. Every route
  declares its requirements with `@RequirePermissions(...)`; a global guard
  resolves the caller's effective permission set (**cached in Redis for 60s**,
  invalidated instantly on role changes) and enforces AND-semantics.
- *Frontend:* The sidebar **filters navigation by role** — Members don't even
  see Invoices, Employees, Analytics, Assets, or Members in the menu. The
  dashboard and settings also branch on role. (The backend is the real guard;
  the UI filtering is UX, not security.)

**Built with.** Custom NestJS guard + decorator, Redis cache with DB fallback
(Redis is a *soft* dependency — the app keeps working if Redis is briefly down).

---

## 3.4 Member Management (Invite & Roles)

**What it does.** Owners/Admins invite people by email, assign Admin or Member
roles, change roles later, and remove access. New invitees get a one-time
temporary password displayed in-app.

**How it's implemented.** A `members` module exposes list/invite/re-role/remove
endpoints, all gated by the `members:manage` permission. Invite either links an
existing user or creates a new account (with a random generated password hashed
with argon2). **The last Owner can never be demoted or removed** — the org must
always have an owner. Every mutation invalidates that user's cached permissions
immediately.

**Built with.** `MembersService` (transactional invite), RBAC invalidation
hooks, audit-log entries for every member action.

---

## 3.5 Clients (CRM)

**What it does.** The customer database — name, company, email, phone,
address, notes, and status (Active/Inactive/Blacklisted). Searchable and
filterable.

**How it's implemented.** Full CRUD REST API with workspace scoping and soft
deletes. The UI is a table with **avatar initials**, **colored status pills**,
row hover, plus create/edit modals and a delete confirmation dialog. Lists are
paginated (`{items,total,page,size,totalPages}` envelope everywhere).

**Built with.** `ClientsService` (service-layer tenancy checks), class-validator
DTOs, reusable `Modal` component, `Avatar`/`StatusPill` primitives.

---

## 3.6 Invoices (Billing)

**What it does.** Create invoices with multiple line items; the system
computes totals, assigns sequential numbers (`INV-2026-00042`), and walks a
strict status lifecycle: **Draft → Sent → Partially Paid → Paid / Overdue /
Cancelled**.

**How it's implemented.**
- Money is stored as **integer cents in BigInt columns** — no floating-point
  drift, ever. Line totals and invoice totals are computed server-side.
- Numbering is sequential per workspace with collision retry (the DB unique
  index is the backstop).
- The **status machine is guarded** — you cannot mark a Draft as Paid; only
  drafts can be deleted.
- When a payment is recorded, the invoice status is **recomputed from all
  completed payments** automatically.

**Built with.** Prisma `Decimal(12,3)` quantities + `BigInt` cents, a
`computeTotals()` money utility, per-status transition map.

---

## 3.7 Quotations & Conversion

**What it does.** Draft price quotations for clients, then **convert an
accepted quote into a draft invoice with one click** — lines and totals carry
over.

**How it's implemented.** Same line-item and numbering machinery as invoices
(`QT-` prefix). The conversion runs in the service: it creates the invoice from
the quotation's lines and marks the quote `CONVERTED` with a link to the new
invoice. Double-conversion is blocked.

**Built with.** Shared `LineItemDto` and money utilities — no duplicated logic.

---

## 3.8 Payments

**What it does.** Record payments against sent invoices (cash, card, bank
transfer, etc.). The invoice updates to Partially Paid or Paid automatically.

**How it's implemented.** Payments validate the invoice is in a payable state,
reject overpayment, and trigger the invoice status recompute. Payments feed the
revenue analytics.

**Built with.** `PaymentsService` + `InvoicesService.recalcPaidStatus()`.

---

## 3.9 Projects & Tasks

**What it does.** Organize work into projects; each project has tasks with
priority, assignee, and due date.

**How it's implemented.** Full CRUD for both, workspace-scoped through the
project. Task creation appends to the end of its column; updates patch fields.

**Built with.** `ProjectsService`/`TasksService`, audit logging on mutations.

---

## 3.10 Kanban Board

**What it does.** A five-column board — **To do, In progress, In review,
Blocked, Done** — where tasks can be moved left/right between columns.

**How it's implemented.** Each task carries an integer `position` within its
column. **Moving a task renumbers the entire destination column inside a
database transaction** — the order is always consistent, with no gaps, and no
float-drift. The UI renders per-project boards with priority pills, counts per
column, and move buttons.

**Built with.** Transactional reorder in `TasksService.move()`, unit-tested for
insertion, clamping, and ordering.

---

## 3.11 Calendar & Meetings

**What it does.** Schedule meetings (title, time, duration, attendees) and see
an agenda of upcoming meetings alongside tasks that are due.

**How it's implemented.** Meetings support multiple attendees. The **calendar
endpoint aggregates** meetings + due tasks in a date range (default next 30
days) into a single agenda view. Creating a meeting from the calendar page is a
modal form.

**Built with.** `MeetingsService`, `CalendarService` (aggregation query),
datetime-local inputs converted to ISO.

---

## 3.12 Employees (HR)

**What it does.** Staff directory with role/department, hire date, salary, and
status (Active/On leave/Terminated).

**How it's implemented.** Full CRUD with workspace scoping and soft delete
(removal marks the employee Terminated). Unique email per workspace.

**Built with.** `EmployeesService`, salary stored as BigInt cents.

---

## 3.13 Attendance

**What it does.** Clock in and clock out; the system computes hours worked.
One record per employee per day.

**How it's implemented.** A composite unique index `(employeeId, date)`
prevents double clock-ins. Clock-out computes `workMinutes` from the interval
and rejects a second clock-out. Seeded history demonstrates the flow.

**Built with.** `AttendanceService` with conflict detection (409s on repeats).

---

## 3.14 Leaves

**What it does.** Employees request time off (annual, sick, casual, etc.);
managers approve or reject pending requests.

**How it's implemented.** Request validates the date range; review is only
possible on **Pending** requests; decisions record who approved and when. The
UI has an employee picker, request modal, and approve/reject buttons.

**Built with.** `LeavesService` state machine, role-gated review endpoint.

---

## 3.15 Assets

**What it does.** Track equipment (laptops, phones, furniture) — value,
serial, category, status — and assign assets to employees.

**How it's implemented.** CRUD + a dedicated assign/unassign action that
flips status between Assigned/Available; "retire" is a soft removal. The UI has
an inline per-row employee dropdown.

**Built with.** `AssetsService`, BigInt values in cents.

---

## 3.16 Documents & File Management (S3)

**What it does.** Upload and share files (PDFs, images, docs). Download links
are generated on demand.

**How it's implemented.** This is the production-grade pattern: the API issues
a **presigned upload URL**; the browser **uploads directly to S3/MinIO** —
file bytes never traverse the API, keeping it stateless and scalable. The
service **auto-creates the bucket and configures CORS on startup**. Downloads
use presigned GET URLs (5-minute expiry). 25 MB cap per file.

**Built with.** `@aws-sdk/client-s3` + `s3-request-presigner`, MinIO
(S3-compatible), auto-healing `S3Service.onModuleInit()`.

---

## 3.17 Knowledge Base

**What it does.** Internal docs — guides, policies, runbooks. Searchable by
title and content; published/draft states; full article reader.

**How it's implemented.** Articles with slug-per-workspace uniqueness,
case-insitive search on title+content, and a **click-to-read detail modal** in
the UI showing the complete formatted content.

**Built with.** `KnowledgeService`, `Modal` component, publish toggling.

---

## 3.18 Announcements

**What it does.** Broadcast company news; drafts can be published when ready.

**How it's implemented.** Create as draft or publish immediately; publish and
delete actions gated to managers. The feed shows published/draft badges.

**Built with.** `AnnouncementsService`, `org:manage`-gated mutations.

---

## 3.19 Notifications

**What it does.** A per-user inbox of events (payment received, task activity,
welcome messages) with unread highlighting and mark-read.

**How it's implemented.** User-scoped (not workspace-scoped) records with
`readAt` timestamps. The UI offers per-item and mark-all-read actions with
unread counts.

**Built with.** `NotificationsService`, unread styling states.

---

## 3.20 Analytics & Reports

**What it does.** A KPI dashboard (clients, active projects, employees, task
completion rate, paid/outstanding/overdue revenue) and a **revenue-by-month
chart** from real payment data.

**How it's implemented.** Aggregation queries compute counts and BigInt sums;
a **dependency-free SVG bar chart** renders the trend (no chart library —
zero extra bytes). Managers see org-wide analytics; Members get a personal
"My focus" dashboard (their tasks, notifications, meetings) via a dedicated
`/me/tasks` endpoint.

**Built with.** `AnalyticsService` (groupBy + aggregates), custom
`BarChart`/`MoneyBarChart` components, role-branching.

---

## 3.21 AI Assistant (9 features)

**What it does.** Nine AI tools grounded in the company's own data:
1. **AI Project Manager** — project health, risks, recommended actions
2. **AI Task Generator** — propose tasks from a goal
3. **AI Meeting Summary** — decisions, action items, open questions
4. **AI Client Email Writer** — ready-to-send emails (with tone)
5. **AI Proposal Generator** — objectives, deliverables, timeline, pricing
6. **AI Weekly Report** — executive weekly summary
7. **AI Financial Summary** — receivables health + recommendations
8. **AI Search Assistant** — ask questions about your workspace data
9. **Ask the Dashboard** — natural-language KPI questions

**How it's implemented.**
- Every feature first **loads real workspace data** (the project's tasks, the
  client's history, the actual invoice aggregates) and injects it into the
  prompt — the model can't hallucinate entities because it's answering from
  your records.
- A single **AI gateway** talks to any OpenAI-compatible provider (OpenRouter →
  Google Gemma 4 today) with a **clearly-labeled mock fallback** when no key is
  configured — the product is fully demoable offline.
- Responses carry `{content, model, mocked}` so the UI can badge mock mode.
- The frontend is an **AI console**: pick a tool, fill its inputs (project/
  client/meeting pickers or free text), Run, and read the result. The UI calls
  the API directly (CORS) so 10–20s LLM responses don't hit proxy timeouts.

**Built with.** `AiGateway` (fetch → OpenAI-compatible endpoint), `AiService`
(9 data-grounded prompt builders), permission-gated endpoints, OpenRouter.

---

## 3.22 Settings, Profile & Security

**What it does.** Edit your name/email (updates everywhere instantly), change
password (requires current), and view org/account details. Managers get a
"Manage members" shortcut.

**How it's implemented.** `PATCH /auth/me` (with email-uniqueness check) and
`PATCH /auth/me/password` (verifies current password, argon2-hashes the new
one, **revokes other sessions**). Both audited. The frontend refreshes the
auth context after profile changes so the sidebar/topbar update immediately.

**Built with.** `AuthService.updateProfile/changePassword`, audit logging,
`refreshUser()` context hook.

---

# PART 4 — ENGINEERING & QUALITY (60 seconds)

*"Under the hood, this is engineered like a product meant to serve thousands
of companies."*

- **Clean Architecture:** every module layers API → Application → Domain →
  Infrastructure; dependencies point inward.
- **Strict TypeScript everywhere**; ESLint (type-aware) clean.
- **47 automated tests** — token rotation/reuse detection, RBAC caching, money
  math, kanban reordering, invoice status machine, quotation conversion,
  leave/attendance/asset logic, AI gateway, and a full-app wiring smoke test.
- **E2E suite green** against a live database (register → login → refresh →
  logout; wrong-credential 401; cross-tenant 403).
- **Security (OWASP-aware):** argon2id, refresh-token rotation with reuse
  detection, no user enumeration, Helmet headers, rate limiting (stricter on
  login), input validation on every endpoint, centralized error envelope that
  never leaks stack traces, secrets validated at boot.
- **DevOps:** one-command `npm run dev`; multi-stage Dockerfiles (non-root,
  healthchecks); NGINX with rate limiting + security headers; GitHub Actions
  CI on every push (migrate → lint → typecheck → test + coverage); database
  backup script; k6 load-test scaffold.
- **Live verification caught and fixed 7 real bugs** that compilation alone
  couldn't — including a circular import that prevented startup, a BigInt JSON
  serialization 500, a silent no-emit build failure, and proxy timeouts on AI
  calls. *That's the difference between "it compiles" and "it runs."*

---

# PART 5 — LIVE DEMO FLOW (3 minutes)

1. **Sign in as Owner** (`demo@crm.dev`) → **Dashboard** (KPIs + revenue chart)
2. **Clients** → create a client live
3. **Projects** → open the board → move a task across columns
4. **Invoices** → create one with line items (watch the total) → mark Sent
5. **Members** → invite someone → see the temp password → change a role
6. **Sign out → sign in as Member** (`member@crm.dev`) → restricted sidebar,
   personal "My focus" dashboard
7. **AI Assistant** → Financial Summary → real analysis of the actual invoices
8. *(If time)* **Swagger** at `localhost:4000/docs` → the fully documented API

---

# PART 6 — CLOSING (20 seconds)

*"One platform, every back-office team, real AI on your own data — built on
production-grade engineering with tests, CI/CD, and security from day one.
It's running today, and the code is on GitHub. I'm happy to go deeper on any
part of it."*

---

## Appendix — Quick reference

| | |
|---|---|
| **Repo** | github.com/Ali-Dev-04/crm-erp-platform (private) |
| **Run locally** | Start Docker → `npm run dev` → `npm run db:seed` |
| **Demo logins** | Owner `demo@crm.dev / DemoPass12345` · Admin `admin@crm.dev / AdminPass12345` · Member `member@crm.dev / MemberPass12345` |
| **API docs** | `http://localhost:4000/docs` (Swagger) |
| **Health** | `http://localhost:4000/health/ready` |
| **Commits** | 30+ · all milestones and features pushed |
| **More docs** | `docs/` — architecture, security, database, API, deployment, testing, web-test-guide, presentation (slide deck) |
