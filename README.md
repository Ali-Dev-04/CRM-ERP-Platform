# Startup CRM + ERP

A production-grade, multi-tenant SaaS platform combining **CRM, ERP, Project Management, HR, Knowledge Base, File Management, AI Assistant, and Analytics**.

> **Status:** Milestone 1 — Foundation & Backend Core (in progress).
> See `docs/architecture.md` and the milestone roadmap.

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

# 4. Run the API
npm run dev:backend        # http://localhost:4000
#    Swagger:              http://localhost:4000/docs
```

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
