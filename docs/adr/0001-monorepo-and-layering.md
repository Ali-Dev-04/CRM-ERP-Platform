# ADR-0001 — Monorepo and backend layering

- **Status:** Accepted
- **Date:** 2026-08-03

## Context

The platform spans API, workers, a frontend, and shared contracts. We need a
structure that keeps shared types in sync, enforces architectural consistency,
and stays tractable on a single development machine (disk is constrained:
~8 GB free, so a single hoisted `node_modules` is mandatory).

## Decision

1. **npm workspaces monorepo** (`apps/*`, `packages/*`). Hoisted root
   `node_modules` to minimize disk usage. We avoid a separate build orchestrator
   (Turborepo/Nx) for now to keep the dependency surface small; revisit if build
   caching becomes a bottleneck.
2. **Clean Architecture layering** inside each backend module
   (API → Application → Domain → Infrastructure), with dependencies pointing inward.
3. **Feature-based module isolation**: each domain owns its controllers, services,
   domain types, and repository; cross-module access happens through explicitly
   exported application services only.

## Consequences

- (+) One install, shared node_modules, low disk overhead.
- (+) Business logic is framework-agnostic and unit-testable without HTTP.
- (+) Clear ownership boundaries for parallel module development.
- (−) More files per module than a flat structure (acceptable for maintainability).
- (−) Cross-module refactor discipline required to avoid leaking Prisma types
  across module boundaries (enforced by lint + review).
