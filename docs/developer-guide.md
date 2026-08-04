# Developer Guide

## Prerequisites

- Node.js ≥ 22
- Docker (for local Postgres / Redis / MinIO) — or reachable instances of each
- ~2 GB free disk (node_modules + infra volumes)

## First run

```bash
npm run infra:up            # postgres, redis, minio
cp .env.example .env        # then edit secrets (JWT_* must be ≥ 32 chars)
npm install
npm run db:generate         # generate Prisma client
npm run db:migrate          # apply migrations (creates tables)
npm run db:seed             # optional: demo tenant (demo@crm.dev / DemoPass12345)
npm run dev:backend         # http://localhost:4000  ·  Swagger: /docs
```

## Day-to-day commands (run from repo root)

| Command | What it does |
| --- | --- |
| `npm run dev:backend` | API in watch mode |
| `npm run lint` | ESLint (type-aware) across workspaces |
| `npm run typecheck` | `tsc --noEmit` strict check |
| `npm run build` | Compile backend to `apps/backend/dist` |
| `npm test` | Unit + wiring tests (DB-free) |
| `npm run test:cov` | Same, with coverage report |
| `npm run test:e2e` | HTTP e2e against a live DB (CI or local docker) |
| `npm run db:migrate` | Create/apply a Prisma migration |

## Project conventions

- **Layering.** Every domain module under `src/modules/<domain>/` keeps
  controllers (API), services (application), and domain types separate.
  Persistence lives in `src/infrastructure/`. Dependencies point inward.
- **One PrismaService.** Inject `PrismaService`; never construct a client.
- **Errors.** Throw a `DomainException` subclass with an `ErrorCodes.*` code.
  The global filter turns it into the JSON envelope. Never throw raw `Error`
  across a module boundary.
- **Auth.** Routes are protected by default via `JwtAuthGuard` (APP_GUARD).
  Mark public routes with `@Public()`. Require permissions with
  `@RequirePermissions('domain:verb')` + `@UseGuards(PermissionsGuard)`.
- **Tenant boundary.** Organization-scoped reads must call a membership check
  in the service (see `OrganizationsService.requireMembership`).
- **Validation.** Use class-validator DTOs; the global `ValidationPipe`
  strips unknown fields (`whitelist`) and rejects them (`forbidNonWhitelisted`).
- **Tests.** Co-locate `*.spec.ts` next to the unit under `src/`. DB-dependent
  HTTP tests go in `test/*.e2e-spec.ts`.

## Adding a new domain module (checklist)

1. Add models to `prisma/schema.prisma`, then `npm run db:migrate`.
2. Declare new permission keys in `src/modules/rbac/permissions.ts` and attach
   them to the relevant system roles.
3. `nest g mo <domain>` scaffold, then add controller/service/DTOs.
4. Enforce tenancy + permissions at the service and route layers.
5. Add unit tests; add an e2e test for the happy path.
6. Run `npm run lint && npm run typecheck && npm test`.
