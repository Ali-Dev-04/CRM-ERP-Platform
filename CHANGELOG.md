# Changelog

All notable changes to this project. Format: [Keep a Changelog](https://keepachangelog.com/).

## [0.3.0] — 2026-08-04 — Milestone 3 (Project management)

### Added
- PM data model: `Project`, `Task`, `Meeting`, `MeetingAttendee` + enums
  (ProjectStatus, TaskStatus, TaskPriority).
- Projects module: CRUD, soft-delete, status filter, task counts.
- Tasks module: CRUD with kanban ordering; `move` endpoint reorders a column
  transactionally (integer positions, no float drift), supports status change
  + index placement with clamp.
- Meetings module: CRUD with attendees (many-to-many).
- Calendar aggregation endpoint: meetings + tasks (by due date) in a date range.
- Unit tests for kanban move/reorder logic.

## [0.2.0] — 2026-08-04 — Milestone 2 (CRM domain)

### Added
- CRM data model: `Client`, `Invoice` + `InvoiceLine`, `Quotation` +
  `QuotationLine`, `Payment`, with status enums and workspace scoping.
- Clients module: full CRUD, soft-delete, search/status filters, pagination.
- Invoices module: create with line items, auto-computed totals (integer cents),
  workspace-sequential numbering with collision retry, guarded status
  transitions (DRAFT→SENT→PARTIALLY_PAID/PAID/OVERDUE/CANCELLED).
- Quotations module: create with line items; `CONVERTED` status turns a quote
  into a draft invoice carrying its lines.
- Payments module: record payments against non-draft invoices; recomputes the
  invoice's paid status from all completed payments.
- Shared `LineItemDto` and `money` utilities (BigInt cents, no float drift).
- `OrganizationsService.assertWorkspaceInOrg` closes the cross-tenant gap for
  workspace-scoped resources.
- Unit tests for `ClientsService` and `money` utils.

### Security
- Every CRM route is org+workspace scoped and permission-gated
  (`clients:*`, `invoices:*`, `quotations:*`, `payments:*`); workspace
  membership is asserted before any read/write.

## [0.1.0] — 2026-08-04 — Milestone 1 (Foundation & Backend Core)

### Added
- npm-workspaces monorepo (`apps/*`, `packages/*`) with hoisted deps.
- NestJS backend with Clean/DDD layering (API → Application → Domain → Infrastructure).
- Validated configuration (zod) with fail-loud boot.
- Multi-tenant Prisma spine: Organizations, Workspaces, Users, Roles,
  Permissions, Memberships, AuditLog, RefreshToken (+ enums, indexes).
- Auth: register (auto-creates org + workspace + Owner membership), login,
  refresh (single-use rotation), logout, me. argon2id hashing; refresh tokens
  hashed at rest with reuse detection.
- RBAC: permission catalog, system roles (Owner/Admin/Member), Redis-cached
  permission resolution, `@RequirePermissions` + `PermissionsGuard`,
  idempotent startup bootstrap.
- Global exception filter with a consistent `{code, message, details, timestamp, path}` envelope.
- Health endpoints (`/health/live`, `/health/ready`) with DB + Redis checks.
- Docker Compose (Postgres, Redis, MinIO); multi-stage production Dockerfile.
- GitHub Actions CI (lint, typecheck, migrate deploy, test+cov, artifact upload).
- Swagger/OpenAPI at `/docs` (dev-gated).
- Tests: token rotation/reuse, RBAC caching/resolution, full-app wiring smoke test.
- Docs: architecture, ADR-0001, developer guide, deployment guide, testing,
  troubleshooting, milestones, sprint plan; PR + issue templates.

### Security
- Per-IP rate limiting (global) + stricter throttle (10/min) on login/register.
- `helmet` secure headers; `trust proxy` for correct client IP behind NGINX.
- Input validation via class-validator with `whitelist` + `forbidNonWhitelisted`.
- No user enumeration on login; tenant boundary enforced in the service layer.
- Swagger disabled in production unless explicitly enabled.

### Changed
- Domain errors extend `Error` (not the framework's `HttpException`), keeping
  the domain decoupled from HTTP.
