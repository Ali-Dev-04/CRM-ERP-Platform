# Sprint Plan

Two-week sprints. Each sprint delivers a shippable vertical slice behind the
M1 foundation.

## Sprint 1 — M1 (complete)
Foundation, auth, RBAC, tenancy, CI, Docker, docs.

## Sprint 2 — M2: CRM domain
- `Client` model + CRUD, scoped to workspace, audited.
- `Invoice`, `Quotation`, `Payment` models + services.
- Permission gates (`clients:*`, `invoices:*`, …) wired on routes.
- Numbering for invoices/quotations; payment status transitions.
- Unit + e2e tests; OpenAPI tags.

## Sprint 3 — M3: Project management
- `Project`, `Task`, `Kanban` (status/position), `Meeting`, `Calendar` views.
- Task assignment, dependencies, due dates.
- Websocket-less MVP (polling) unless M5 sockets land first.

## Sprint 4 — M4: ERP / HR
- `Employee` profile, `Attendance` (clock in/out), `Leave` requests + approvals.
- `Asset` assignment, `Document` storage metadata.

## Sprint 5 — M5: Platform
- `Notification` + `Announcement`; `Report`/`Analytics` aggregations.
- `KnowledgeBase` articles; S3 `File` upload (presigned URLs, AV scan hook).
- BullMQ workers for async/AI fan-out.

## Sprint 6 — M6: AI layer
- OpenAI-compatible gateway with streaming + token accounting.
- The 9 AI features (PM, task generator, meeting summary, email writer,
  proposal generator, weekly report, financial summary, search, NL dashboards).

## Sprint 7 — M7: Frontend
- Next.js App Router, auth flow, layout shell, shadcn/ui components per module.

## Sprint 8 — M8: Hardening & launch
- Load (k6) + security (ZAP/Semgrep) tests, observability, backups, runbooks.
