# CRM + ERP Platform — Project Presentation (Customer Relationship Management + Enterprise Resource Planning)

> A walkthrough for leadership: what we built, how it's engineered, how we
> verified it, and what comes next. Pair this with a live demo
> (http://localhost:3000, login `demo@crm.dev / DemoPass12345`).

---

## Slide 1 — Executive summary

We built **Startup CRM + ERP**: a multi-tenant SaaS platform that unifies the
core back-office into one product — **CRM, Project Management, Billing, HR,
Knowledge Base, File Management, Analytics, and an AI Assistant**.

- **Status:** feature-complete across 8 milestones, running end-to-end, verified
  against a live database, and on GitHub.
- **Engineering:** production-grade architecture (Clean/DDD, strict TypeScript),
  47 automated tests, CI/CD, Docker, secure by design (OWASP-aware).
- **Business value:** one workspace replaces 4–6 disconnected tools; AI
  accelerates routine work (emails, proposals, reports, search).

---

## Slide 2 — The problem we solve

Growing companies juggle **separate tools** for sales, projects, billing, and HR
— data is siloed, switching costs are high, and reporting is manual.

**Our answer:** a single multi-tenant platform where:
- Every team works from one source of truth.
- Data is isolated per tenant and secured by role.
- Money, projects, and people are connected end-to-end.
- AI assists with the busywork on top of **real** workspace data.

---

## Slide 3 — Product overview (modules)

| Area | What's included |
|------|-----------------|
| **Identity & access** | Register/login, JWT + refresh-token rotation, RBAC roles & permissions, organizations, workspaces, audit log |
| **CRM** | Clients, invoices (line items, numbering, status workflow), quotations (→ invoice conversion), payments |
| **Project management** | Projects, tasks, kanban board (reorderable), meetings (attendees), calendar |
| **ERP / HR** | Employees, attendance (clock in/out), leave requests + approvals, assets, documents |
| **Platform** | S3 file management (presigned uploads), knowledge base, notifications, announcements |
| **Insight** | Analytics dashboard (KPIs), revenue reports |
| **AI assistant** | 9 AI features (see next slide) |

---

## Slide 4 — AI features (9)

Every feature is **grounded in real workspace data** (no hallucinated entities)
and permission-gated, with a safe mock fallback when no AI key is configured.

1. AI Project Manager — project health, risks, next actions
2. AI Task Generator — tasks from a goal
3. AI Meeting Summary — decisions, action items, open questions
4. AI Client Email Writer — ready-to-send emails
5. AI Proposal Generator — objectives, deliverables, timeline, pricing
6. AI Weekly Report — executive weekly summary
7. AI Financial Summary — receivables health + recommendations
8. AI Search Assistant — natural-language workspace search
9. Natural-language dashboard queries

---

## Slide 5 — Technology stack

| Layer | Choice |
|-------|--------|
| **Frontend** | Next.js (App Router), TypeScript, TailwindCSS, shadcn-style UI |
| **Backend** | NestJS, TypeScript (strict), Clean Architecture / DDD |
| **Data** | PostgreSQL + Prisma ORM, Redis (cache + queues) |
| **Storage** | S3-compatible object storage (MinIO in dev) |
| **Async** | BullMQ (scheduled jobs, e.g. token pruning) |
| **Auth** | JWT access + rotating refresh tokens, argon2id, RBAC |
| **DevOps** | Docker, Docker Compose, NGINX, GitHub Actions CI/CD |
| **Docs/API** | OpenAPI/Swagger, architecture & ADRs |

---

## Slide 6 — Architecture (how it fits together)

```
Browser ──► Next.js (UI) ──► /api proxy ──► NGINX ──► NestJS API
                                                       │
                              ┌────────────────────────┼────────────────┐
                              ▼                        ▼                ▼
                          PostgreSQL               Redis +           S3 / MinIO
                          (Prisma)                 BullMQ            (files)
```

- **Clean Architecture per module:** API → Application → Domain → Infrastructure; dependencies point inward, so business rules stay framework-agnostic and testable.
- **Multi-tenant by design:** Organization → Workspace; every query is workspace-scoped and membership-checked.

---

## Slide 7 — Multi-tenancy & data integrity

- **Tenant isolation:** the workspace filter is enforced in the service layer on every read/write — a user in org A can never reach org B's data, even by forging URLs (verified by tests).
- **Money handled correctly:** all amounts stored as integer cents (`BigInt`) — no floating-point drift; serialized as strings to the client.
- **Audit trail:** append-only log of every mutating action (who, what, when).
- **Soft deletes** on human/org-facing records; financials are append-only.

---

## Slide 8 — Security (OWASP-aware)

- **Passwords:** argon2id hashing; strong policy (≥12 chars, letter + number).
- **Sessions:** short-lived access tokens + **opaque refresh tokens, hashed at rest, single-use with rotation, and reuse detection**.
- **No user enumeration:** login returns a generic error for unknown-user and wrong-password.
- **Authorization:** explicit permission catalog, AND-semantics guards, Redis-cached.
- **Input:** global validation pipe (strips/rejects unknown fields); centralized error envelope (no stack traces to clients).
- **Hardening:** Helmet security headers, `trust proxy`, per-IP rate limiting + stricter throttle on login/register, CORS allow-list, file uploads via presigned URLs only, Swagger disabled in production.
- **Secrets:** validated at boot (fail-loud); never committed (`.env` gitignored).

---

## Slide 9 — Quality & testing

- **Static:** strict TypeScript (typecheck) + ESLint (type-aware) — clean.
- **Automated tests (47):** auth token rotation/reuse, RBAC caching, money math, kanban reordering, invoice status machine + paid recompute, quotation conversion, leave/attendance/asset logic, AI gateway, and a full-app **wiring smoke test**.
- **E2E (live DB):** register → login → /me → refresh → logout, wrong-credential 401, cross-tenant 403 — **green** against real Postgres + Redis.
- **Coverage:** ~62% statements on the shipped backend (concentrated on the highest-risk logic + wiring).
- **CI:** GitHub Actions runs migrate → lint → typecheck → test + coverage on every push.

> The live run caught **5 real bugs** that typecheck/build couldn't — and they were all fixed (next slide).

---

## Slide 10 — Engineering rigor (bugs the live run caught & fixed)

Running the app against a real database surfaced issues invisible to the compiler:

1. **App wouldn't start** — a circular import made the job-queue token resolve to `default`. → Moved the shared constant to its own file.
2. **`npm run dev` failed in a fresh shell** — the app never loaded `.env`. → Added dotenv with monorepo-aware path resolution.
3. **Blank optional env values crashed config validation.** → Schema treats empty as unset.
4. **`nest build` silently emitted nothing** — stale incremental cache + clean-output interaction. → Disabled incremental for the backend.
5. **Invoice/payment endpoints returned HTTP 500** — JSON can't serialize `BigInt`. → Global BigInt→string serializer.

**Lesson:** "it compiles" ≠ "it runs." Each fix is covered and the suite stays green.

---

## Slide 11 — DevOps & operations

- **One-command local run:** `npm run dev` starts the database + backend + frontend together.
- **Production packaging:** multi-stage Dockerfiles (backend + frontend, non-root, healthchecks), NGINX reverse proxy (TLS-ready, rate limiting, security headers).
- **Full-stack compose:** Postgres, Redis, MinIO, backend, frontend, NGINX.
- **Operability:** `/health/live` + `/health/ready` (DB + Redis checks), structured logging, graceful shutdown.
- **Resilience:** Redis is a **soft dependency** — the app keeps serving (RBAC falls back to the DB) if Redis is briefly unavailable.
- **Backups:** `pg_dump` script with retention; deploy helper scripts; load-test scaffold (k6).

---

## Slide 12 — User experience (the UI)

A modern, production-grade interface:

- **Branded split-panel login** and a polished **sidebar app shell** (logo, organization switcher, avatars).
- **Dashboard** with icon KPI cards + a revenue bar chart + finance cards.
- **Tables** with avatars, colored status pills, hover states, and money formatting.
- **Projects** → selectable cards + a clean **kanban board** with priority pills.
- **Analytics** chart, **calendar**, **knowledge**, **notifications** — all with skeleton loaders and friendly empty states.
- Light/dark token system, dependency-free SVG charts, responsive layout.

---

## Slide 13 — Key metrics

| Metric | Value |
|--------|-------|
| Milestones delivered | 8 / 8 |
| Commits | 18 |
| Tracked files | ~215 |
| Database tables | 27 |
| Backend automated tests | 47 (e2e suite green) |
| Frontend routes | 12 |
| AI features | 9 |
| API modules | ~20 |
| GitHub | `Ali-Dev-04/crm-erp-platform` (private) |

---

## Slide 14 — What's verified vs. what's next

**Verified**
- Builds, typechecks, lints clean; 47 unit tests + e2e suite pass against a live DB.
- Full auth + RBAC + tenancy exercised over HTTP; health/ready green.
- Seeded demo data across every module; UI redesigned and running.
- Pushed to GitHub.

**Planned next (not blocking a demo)**
- Member-invite flow + a Settings page in the UI.
- Drag-and-drop kanban; global search bar; dark-mode toggle.
- Websockets for live notifications; instant access-token revocation.
- Cloud deployment (the Docker/NGINX config is ready), observability, and load/security scanning in CI.

---

## Slide 15 — Live demo script (≈3 minutes)

1. **Sign in** → **Dashboard** (KPIs + revenue chart).
2. **Clients** → table with avatars + status pills.
3. **Projects** → pick a project → **kanban board** across columns.
4. **Invoices** → statuses (Paid/Sent/Overdue/Draft) with totals.
5. **Analytics** → revenue chart; **Calendar** → meetings + tasks due.
6. **API/Swagger** at `/docs` → run `GET /health/ready` live.

---

## Slide 16 — How to run it

```bash
# 1. Start Docker Desktop (Engine running)
# 2. In the project folder:
npm run dev          # starts database + backend + frontend
# 3. Open http://localhost:3000 → demo@crm.dev / DemoPass12345
```

One-time on a fresh machine: `npm install && npm run db:migrate && npm run db:seed`.

---

### Appendix — where to look
- Architecture & decisions: `docs/architecture.md`, `docs/adr/`
- API reference: `docs/api.md` + interactive `/docs`
- Security: `docs/security.md` · Database: `docs/database.md`
- Testing: `docs/testing.md` + `docs/web-test-guide.md`
- Deployment: `docs/deployment-guide.md` · Troubleshooting: `docs/troubleshooting.md`
- Change history: `CHANGELOG.md`
