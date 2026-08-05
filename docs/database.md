# Database

PostgreSQL via Prisma. Schema source: `apps/backend/prisma/schema.prisma`.
Initial migration: `apps/backend/prisma/migrations/20260804000000_init`.

## Tenancy model

- **Organization** = ownership/billing unit. **Workspace** = data partition
  inside it. A user belongs to orgs via **Memberships** carrying a **Role**.
- All CRM/PM/HR/platform data is **workspace-scoped**: `Client`, `Invoice`,
  `Quotation`, `Payment`, `Project`, `Task` (via project), `Meeting`,
  `Employee`, `Attendance`/`Leave` (via employee), `Asset`, `Document`,
  `Announcement`, `KnowledgeArticle`.
- The workspace filter is the tenant boundary. Services assert
  `assertWorkspaceInOrg` before any read/write, so a member of org A can never
  reach org B's data by manipulating URLs.

## Conventions

- **IDs:** cuid strings (`@default(cuid())`) — portable, no enumeration.
- **Money:** integer cents stored as `BigInt` (subtotal/discount/tax/total).
  Never `Float`. Quantity uses `Decimal(12,3)`. JSON responses return cents as
  **strings** (BigInt is not JSON-native).
- **Soft delete:** `deletedAt` on human/org-facing entities (User, Organization,
  Workspace, Client, Employee, Project). Queries filter `deletedAt: null`.
- **Audit:** append-only `AuditLog` (never hard-deleted) — `action` follows
  `<domain>.<verb>`.
- **Auth:** refresh tokens stored hashed (`sha256`) and single-use; revoked on
  rotation; reuse is detected and rejected.

## Indexes

Composite/indexed lookup columns are declared per model (e.g.
`@@index([workspaceId, status])`, `@@unique([workspaceId, number])` for
invoice/quotation numbering). RBAC resolution is cached in Redis
(`rbac:<orgId>:<userId>`) to avoid repeated membership joins.

## Lifecycle

- Local/iterate: `npm run db:migrate` (`prisma migrate dev`).
- CI/deploy: `npx prisma migrate deploy` (idempotent, applies pending only).
- Client generation at build: `npx prisma generate`.
- Backups: `deploy/backup.sh` (custom-format `pg_dump`, gzipped, 14-day retention).
