# ADR-0002 — Tenancy isolation and money representation

- **Status:** Accepted
- **Date:** 2026-08-04

## Context

Multi-tenant SaaS where a mix-up between tenants is the highest-severity
correctness risk, and financial data (invoices, payments, salaries) where
floating-point drift is unacceptable.

## Decisions

1. **Workspace-scoped data + service-layer boundary.** Every domain row carries
   `workspaceId`. The boundary is enforced in the application service via
   `assertWorkspaceInOrg(workspaceId, organizationId)` *before* any query,
   independent of the URL. The permission guard additionally resolves the org
   from the route, so authorization and tenant isolation are two separate checks
   (defence in depth).

2. **Integer cents in `BigInt` for all money.** No `Float`/`Double` columns.
   Quantities use `Decimal(12,3)`. Line totals and document totals are computed
   server-side (`computeTotals`), rounded to whole cents. In the JSON API,
   cents are serialized as **strings** to preserve precision across BigInt→JSON
   boundaries.

## Consequences

- (+) A member of one organization cannot read or mutate another tenant's data
  even by forging a route param.
- (+) No rounding drift in billing; totals are deterministic and auditable.
- (−) Money requires explicit BigInt arithmetic and string serialization in
  APIs/clients (encapsulated in `money.ts` and `formatCurrency`).
- (−) Soft-delete + workspace filter discipline required on every new query
  (enforced by convention + review).
