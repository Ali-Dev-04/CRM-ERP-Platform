# Changelog

All notable changes to this project. Format: [Keep a Changelog](https://keepachangelog.com/).

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
