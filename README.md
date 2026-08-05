# Startup CRM + ERP

A production-grade, multi-tenant SaaS platform combining **CRM, ERP, Project Management, HR, Knowledge Base, File Management, AI Assistant, and Analytics**.

> **Status:** All 8 milestones implemented (M1–M8). Backend (NestJS) + Frontend
> (Next.js) both build clean; 28 backend tests passing. See `docs/milestones.md`
> and `CHANGELOG.md`.

## Tech stack

| Layer        | Technology                                                        |
| ------------ | ----------------------------------------------------------------- |
| Frontend     | Next.js (App Router), TypeScript, TailwindCSS, shadcn/ui (M7)     |
| Backend      | NestJS, TypeScript (strict), Clean Architecture / DDD             |
| Data         | PostgreSQL + Prisma, Redis (cache + BullMQ)                       |
| Storage      | S3-compatible (MinIO in dev)                                      |
| Auth         | JWT access + refresh tokens, argon2, RBAC                         |
| DevOps       | Docker, Docker Compose, NGINX, GitHub Actions CI/CD               |
| Observability| Health checks, structured logging (Pino), OpenAPI/Swagger         |

## Repository layout

```
crm-erp-platform/
├── apps/
│   └── backend/          # NestJS API (this milestone)
├── packages/             # Shared contracts, types, UI (later)
├── docs/                 # Architecture, ADRs, guides
├── docker-compose.yml    # Dev infra: Postgres, Redis, MinIO
└── .github/workflows/    # CI
```

## Quick start (local dev)

```bash
# 1. Start infra (Postgres, Redis, MinIO)
npm run infra:up

# 2. Copy env and install deps
cp .env.example .env
npm install

# 3. Create the database schema
npm run db:generate
npm run db:migrate

# 4. Run the API + frontend (in separate terminals)
npm run dev:backend        # API → http://localhost:4000 · Swagger → /docs
npm run dev:frontend       # Web → http://localhost:3000 (proxies /api → :4000)
```

## Full stack via Docker (production-like)

```bash
cp .env.example .env          # fill JWT_* (≥32 chars), CORS_ORIGINS, etc.
./deploy/deploy.sh up         # builds + starts postgres, redis, minio, backend, frontend, nginx
# → http://localhost (NGINX) routes /api/* to backend and / to frontend
./deploy/deploy.sh down
```

## What's implemented

- **Auth/RBAC:** register (creates org + workspace + Owner), login, refresh
  (rotating, reuse-detected), logout, me; permission catalog + cached RBAC.
- **CRM:** clients, invoices (line items, numbering, status workflow), quotations
  (→ invoice conversion), payments (recompute invoice status).
- **Projects:** projects, tasks with kanban reorder, meetings (attendees),
  calendar aggregation.
- **ERP/HR:** employees, attendance (clock in/out), leave approvals, assets,
  documents.
- **Platform:** S3 presigned file upload/download, knowledge base, notifications,
  announcements, analytics KPIs + revenue report.
- **AI (9 features):** project manager, task generator, meeting summary, client
  email, proposal generator, weekly report, financial summary, search, NL
  dashboard — with a mock fallback when no provider key is set.
- **Frontend:** auth flow, dashboard, clients, kanban, invoices, analytics,
  knowledge, notifications, calendar (Next.js + Tailwind + shadcn-style UI).
- **Ops:** CI (lint/typecheck/migrate/test), multi-stage Dockerfiles, NGINX,
  full-stack compose, backup + deploy scripts, k6 load test, health checks.

## Scripts

| Script            | Purpose                                  |
| ----------------- | ---------------------------------------- |
| `npm run dev:backend` | Run API in watch mode               |
| `npm run build`   | Build the backend                        |
| `npm run lint`    | ESLint across workspaces                 |
| `npm run typecheck`| TypeScript strict typecheck             |
| `npm test`        | Unit + integration tests                 |
| `npm run test:cov`| Tests with coverage report               |
| `npm run db:migrate`| Apply Prisma migrations               |

## Engineering standards

- Clean Architecture with DDD where appropriate, SOLID, Repository pattern, DI.
- Strict TypeScript, centralized error handling, structured logging.
- Feature-based module isolation; every domain module owns its schema slice.
- Tests: unit + integration + (later) E2E, perf, security, a11y.
- OWASP Top 10 protections, rate limiting, audit logs, RBAC throughout.

## License

UNLICENSED — proprietary.
