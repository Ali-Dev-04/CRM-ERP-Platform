# Milestones

| # | Milestone | Status | Definition of done |
| --- | --- | --- | --- |
| M1 | Foundation & Backend Core | **Done** | Monorepo, NestJS clean architecture, multi-tenant Prisma spine, JWT+refresh auth, RBAC, health, CI, Docker, tests passing, lint/typecheck/build green |
| M2 | CRM domain | Planned | Clients, Invoices, Quotations, Payments — CRUD, tenancy, audit, tests |
| M3 | Project management | Planned | Projects, Tasks, Kanban, Calendar, Meetings |
| M4 | ERP / HR | Planned | Employees, Attendance, Leaves, Assets, Documents |
| M5 | Platform modules | Planned | Notifications, Announcements, Reports, Analytics, Knowledge Base, File Management (S3) |
| M6 | AI layer | Planned | Gateway + 9 AI features behind an OpenAI-compatible client |
| M7 | Frontend | Planned | Next.js App Router + Tailwind + shadcn/ui consuming the API |
| M8 | Hardening | Planned | Perf/security/load tests, observability, scheduled jobs, deploy scripts, full docs |

## M1 review gate (completed)

- **Static analysis:** `tsc --noEmit` (strict) + ESLint type-aware — clean.
- **Build:** `nest build` — clean.
- **Tests:** 15 passing (unit + wiring); 58.8% statement coverage on shipped code.
- **Security review:** argon2id hashing, hashed refresh tokens with single-use
  rotation + reuse detection, no login enumeration, RBAC AND-semantics, tenant
  boundary in service layer, global ValidationPipe (whitelist/forbid),
  per-IP rate limiting + stricter throttle on auth, helmet, trust-proxy, CORS,
  Swagger disabled in prod. Findings addressed inline.
- **Performance review:** RBAC permission set cached in Redis; no N+1 in M1
  paths; Prisma single shared client. Scheduled refresh-token pruning deferred
  to M8 (job runner) — noted.
- **Refactors applied:** decoupled domain errors from the HTTP framework;
  fixed reversed `ExceptionFilter.catch` args; removed stale source artifacts;
  pinned ts-jest tsconfig by absolute path.

## Follow-ups tracked for later milestones

- BullMQ worker + scheduled jobs (token pruning, audit export) — M5/M8.
- Instant access-token revocation via Redis blocklist (if required) — M8.
- Pino structured JSON logging upgrade — M8.
- Partial unique index for system roles at the DB level — M8.
