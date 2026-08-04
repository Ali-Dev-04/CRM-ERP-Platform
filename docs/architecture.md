# Architecture

## High level

```
                ┌──────────────────────────────────────────┐
   Clients ──►  │  NGINX (TLS, rate limit, static)         │
                └───────────────┬──────────────────────────┘
                                ▼
                ┌──────────────────────────────────────────┐
                │  Next.js Frontend (apps/frontend, M7)    │
                └───────────────┬──────────────────────────┘
                                │ REST/JSON over HTTPS + Swagger
                                ▼
                ┌──────────────────────────────────────────┐
                │  NestJS API (apps/backend)               │
                │  ├─ API layer      (controllers, DTOs)   │
                │  ├─ Application    (use-cases, services) │
                │  ├─ Domain         (entities, rules)     │
                │  └─ Infrastructure (Prisma, Redis, S3)   │
                └───┬─────────────┬─────────────┬──────────┘
                    ▼             ▼             ▼
               PostgreSQL      Redis +       S3 / MinIO
               (Prisma)        BullMQ        (files)
                                  │
                                  ▼
                          AI Gateway worker (M6)
```

## Backend layering (Clean Architecture)

Each domain module follows the same concentric layering. Dependencies point inward
(API → Application → Domain; Infrastructure implements Domain ports):

| Layer           | Responsibility                                            |
| --------------- | --------------------------------------------------------- |
| **API**         | HTTP controllers, request DTOs, OpenAPI decorators, guards |
| **Application** | Use-cases / orchestration services, transaction boundaries |
| **Domain**      | Entities, value objects, domain exceptions, pure business rules |
| **Infrastructure** | Prisma repositories, Redis cache, S3 client, external adapters |

This keeps the framework (NestJS) and persistence (Prisma) on the outside, so
business rules stay testable and portable.

## Multi-tenancy model

- Every workspace-scoped row carries `workspaceId`.
- Every workspace belongs to an **Organization** (the billing/ownership unit).
- Users belong to organizations via **Memberships**, each with a **Role**.
- Roles resolve to **Permissions** (RBAC). Guards enforce `@RequirePermissions(...)`.
- Cross-tenant access is prevented at the repository layer (queries always filter
  by the requester's workspace) and re-checked in application services.

## Cross-cutting concerns

- **Config**: single validated `Config` object (zod) injected app-wide.
- **Logging**: structured JSON via Pino; request id per request.
- **Errors**: a `DomainException` base + global exception filter → consistent
  RFC-7807-style problem JSON. Never leak stack traces in prod.
- **Validation**: every DTO validated (class-validator); bounds checked in domain.
- **Transactions**: application services own the unit-of-work boundary.
- **Audit**: mutating actions write an `AuditLog` entry (actor, action, target, diff).

## Module map (target)

| Milestone | Modules                                                              |
| --------- | ------------------------------------------------------------------- |
| M1        | auth, users, organizations, workspaces, rbac, audit, health        |
| M2        | clients, invoices, quotations, payments                             |
| M3        | projects, tasks, kanban, calendar, meetings                         |
| M4        | employees, attendance, leaves, assets, documents                    |
| M5        | notifications, announcements, reports, analytics, knowledge-base, files |
| M6        | ai (gateway + 9 AI features)                                        |
| M7        | frontend                                                            |
| M8        | hardening, observability, deploy                                     |

## Decisions log

See `docs/adr/` for architectural decision records.
