# Web Test Guide — CRM + ERP (End-to-End)

A manual end-to-end test plan covering **every module and feature** of the
platform. Use it to verify a running deployment through the **web UI**
(http://localhost:3000) and the **API/Swagger** (http://localhost:4000/docs).

> Coverage legend: **UI** = test via the web app · **API** = test via Swagger/curl
> · **NEG** = negative/abuse test · **SEC** = security/tenancy test.

---

## 1. Prerequisites

1. Stack running: Docker Postgres+Redis up; `npm run dev:backend` (:4000) and
   `npm run dev:frontend` (:3000).
2. Migrations applied and DB seeded (`npm run db:seed`).
3. Test accounts:
   - **Owner (full permissions):** `demo@crm.dev` / `DemoPass12345`
   - **Second user (for RBAC/tenancy tests):** register a new account at
     `/register` (this creates a *separate* organization — use it to prove
     cross-tenant isolation).
4. Swagger UI: http://localhost:4000/docs — click **Authorize**, paste
   `Bearer <accessToken>` from a login to try protected endpoints.

**Pass criteria** for every case: the stated HTTP status / UI behaviour occurs,
and no 5xx error or stack trace is shown to the client.

---

## 2. Test data setup (do once)

- Log in as Owner, create: 2 clients, 1 project with 4 tasks across columns,
  1 invoice (2 line items) → mark SENT, 1 quotation → CONVERT, 1 employee.
- Keep IDs noted (from API responses or Swagger) for later steps.

---

## 3. Authentication & Session

| ID | Type | Steps | Expected |
|----|------|-------|----------|
| AUTH-01 | UI | `/register` with valid data + org name | Account created; redirected to `/dashboard`; tokens stored |
| AUTH-02 | UI | `/login` with `demo@crm.dev / DemoPass12345` | Redirected to `/dashboard`; sidebar shows org switcher |
| AUTH-03 | NEG | `/login` with wrong password | 401 `auth.invalid_credentials`; **no indication which of email/password was wrong** |
| AUTH-04 | NEG | `/login` with non-existent email | Same 401 message as AUTH-03 (no user enumeration) |
| AUTH-05 | API | `GET /auth/me` with valid bearer | 200, returns the user profile |
| AUTH-06 | API | `GET /auth/me` with **no** token | 401 `auth.token_invalid` |
| AUTH-07 | API | Tamper one character in the access token | 401 `auth.token_invalid` |
| AUTH-08 | API | `POST /auth/refresh` with a valid refresh token | 200, new access+refresh pair; old refresh now invalid |
| AUTH-09 | SEC | Reuse the **previously rotated** refresh token | 401 `auth.refresh_token_reuse` (reuse detected) |
| AUTH-10 | API | `POST /auth/logout` with the refresh token | 200 `{revoked:true}`; that refresh token no longer works |
| AUTH-11 | API | Wait >15 min (or shorten `JWT_ACCESS_TTL`); call a protected route | Auto-refresh fires once; request still succeeds |

---

## 4. Organizations, Workspaces & Tenancy

| ID | Type | Steps | Expected |
|----|------|-------|----------|
| ORG-01 | API | `GET /organizations` | 200; lists orgs the user belongs to with role |
| ORG-02 | API | `GET /organizations/{orgId}` (your org) | 200, org details |
| ORG-03 | API | `GET /organizations/{otherOrgId}` (the 2nd user's org) | 403 `organization.membership_required` |
| ORG-04 | API | `GET /organizations/{orgId}/workspaces` | 200; includes the `Default` workspace |
| ORG-05 | API | `POST /organizations/{orgId}/workspaces` (name "Marketing") as Owner | 201; new workspace appears in list |
| ORG-06 | API | Create workspace with a duplicate name | 409 `organization.slug_taken` |
| ORG-07 | SEC | Use workspaceId from org A under `/organizations/{orgB}/...` | 404 `workspace.not_found_in_this_organization` (cross-tenant blocked) |

---

## 5. RBAC & Permissions

| ID | Type | Steps | Expected |
|----|------|-------|----------|
| RBAC-01 | API | As Owner, call any module route (e.g. `POST .../clients`) | 201 (Owner has `clients:write`) |
| RBAC-02 | SEC | Hit a route with `@RequirePermissions` but **no** `x-organization-id` / org param | 403 `organization.membership_required` |
| RBAC-03 | SEC | Omit the workspace/org from a CRM route (forged URL) | 403 / 404 — never returns another tenant's data |
| RBAC-04 | API | `PATCH .../invoices/{id}/status` with an invalid transition (e.g. PAID→SENT) | 422 `common.validation` |
| RBAC-05 | NOTE | Role-tier testing (Member vs Owner) requires a second membership. Seed a Member via SQL (`Membership` row with the `Member` system role), then Member cannot `clients:delete` (403 `authz.forbidden`) while Owner can. |

---

## 6. CRM — Clients

| ID | Type | Steps | Expected |
|----|------|-------|----------|
| CLI-01 | UI | Clients page loads | Table lists clients; counts match dashboard |
| CLI-02 | API | `POST .../clients` valid body | 201; client has `workspaceId`, `status=ACTIVE` |
| CLI-03 | API | `GET .../clients?page=1&size=10` | 200 paginated envelope `{items,total,page,size,totalPages}` |
| CLI-04 | API | `GET .../clients?status=INACTIVE&search=globex` | 200; filtered results |
| CLI-05 | API | `PATCH .../clients/{id}` | 200; fields updated |
| CLI-06 | NEG | `POST .../clients` missing `name` | 400 validation error |
| CLI-07 | API | `DELETE .../clients/{id}` | 200 `{deleted:true}`; client absent from subsequent list (soft-deleted) |
| CLI-08 | SEC | `GET .../clients/{idFromOtherWorkspace}` | 404 — no cross-workspace leak |

---

## 7. CRM — Invoices

| ID | Type | Steps | Expected |
|----|------|-------|----------|
| INV-01 | API | `POST .../invoices` with 2 lines (qty/unitPrice) | 201; `number` like `INV-YYYY-00001`; totals computed correctly (subtotal − discount + tax) |
| INV-02 | API | Verify `totalCents` = sum(lines) − discount + tax | Matches (integer cents, no float drift) |
| INV-03 | NEG | `POST .../invoices` with empty `lines[]` | 422 `common.validation` ("at least one line") |
| INV-04 | API | `GET .../invoices/{id}` | 200 with `lines[]` and `payments[]` |
| INV-05 | API | `PATCH .../invoices/{id}/status` DRAFT→SENT | 200 |
| INV-06 | API | Create a 2nd invoice rapidly; check numbering | Unique sequential numbers (`...00002`); no collision error |
| INV-07 | API | `DELETE` a **DRAFT** invoice | 200 `{deleted:true}` |
| INV-08 | NEG | `DELETE` a **SENT** invoice | 409 `common.conflict` (only drafts deletable) |
| INV-09 | UI | Invoices page | Table lists invoices with status badge + formatted totals |

---

## 8. CRM — Quotations & Conversion

| ID | Type | Steps | Expected |
|----|------|-------|----------|
| QUO-01 | API | `POST .../quotations` with lines | 201; `number` like `QT-YYYY-00001` |
| QUO-02 | API | `PATCH .../quotations/{id}/status` `ACCEPTED` | 200 |
| QUO-03 | API | `PATCH .../quotations/{id}/status` `CONVERTED` | 200; a **new draft invoice** is created from the quote's lines; `convertedInvoiceId` set |
| QUO-04 | NEG | Convert an already-CONVERTED quote | 409 `common.conflict` |
| QUO-05 | API | Verify the generated invoice's totals match the quote | Totals carried over |

---

## 9. CRM — Payments & Invoice Status Recompute

| ID | Type | Steps | Expected |
|----|------|-------|----------|
| PAY-01 | API | With a SENT invoice, `POST .../payments` (amount < total) | 201; invoice becomes `PARTIALLY_PAID` |
| PAY-02 | API | Add payment covering the remainder | Invoice becomes `PAID` |
| PAY-03 | API | List payments | 200 paginated |
| PAY-04 | NEG | `POST .../payments` against a DRAFT invoice | 422 (no payments on draft) |
| PAY-05 | NEG | Payment amount > invoice total | 422 |
| PAY-06 | NEG | Payment against a CANCELLED invoice | 422 |

---

## 10. Project Management — Projects & Tasks/Kanban

| ID | Type | Steps | Expected |
|----|------|-------|----------|
| PRJ-01 | UI | Projects page | Project list; selecting one loads the kanban board |
| PRJ-02 | API | `POST .../projects` | 201 |
| PRJ-03 | API | `POST .../projects/{id}/tasks` (status TODO) | 201; `position` appended to end of column |
| PRJ-04 | API | Create 4 tasks; `GET .../tasks` | Ordered by status then position |
| PRJ-05 | API | `PATCH .../tasks/{id}/move` `{status:"IN_PROGRESS", index:1}` | Task moves column; destination column renumbered 0..n (no gaps) |
| PRJ-06 | API | Move with `index` beyond column size | Clamps to end (no error) |
| PRJ-07 | UI | Move a task card across columns in the board | Order persists on reload |
| PRJ-08 | API | `PATCH .../tasks/{id}` (assignee, priority, dueDate) | 200 |
| PRJ-09 | API | `DELETE .../tasks/{id}` | 200; gone from list |
| PRJ-10 | API | `DELETE .../projects/{id}` | 200 (soft delete) |

---

## 11. Meetings & Calendar

| ID | Type | Steps | Expected |
|----|------|-------|----------|
| MTG-01 | API | `POST .../meetings` with `attendeeIds[]` | 201; attendees linked |
| MTG-02 | API | `GET .../meetings/{id}` | 200; attendees expanded with user info |
| MTG-03 | API | `PATCH .../meetings/{id}` | 200 |
| MTG-04 | API | `GET .../calendar?from=...&to=...` | 200; returns `meetings[]` + `tasks[]` (due in range) |
| MTG-05 | UI | Calendar page | Shows upcoming meetings + tasks due |
| MTG-06 | API | `DELETE .../meetings/{id}` | 200 |

---

## 12. ERP/HR — Employees, Attendance, Leaves

| ID | Type | Steps | Expected |
|----|------|-------|----------|
| HR-01 | API | `POST .../employees` | 201 |
| HR-02 | NEG | Duplicate email in same workspace | 409 `common.conflict` |
| HR-03 | API | `POST .../employees/{id}/attendance/clock-in` | 201; record with `clockIn` set |
| HR-04 | API | `POST .../employees/{id}/attendance/clock-out` | 200; `clockOut` + `workMinutes` computed |
| HR-05 | NEG | clock-in twice same day | 409 (already clocked in) |
| HR-06 | NEG | clock-out without clock-in | 404 |
| HR-07 | API | `POST .../employees/{id}/leaves` (valid range) | 201; status PENDING |
| HR-08 | NEG | Leave `endDate` before `startDate` | 422 |
| HR-09 | API | `PATCH .../leaves/{id}/review` `{status:"APPROVED"}` | 200; `approverId`+`approvedAt` set |
| HR-10 | NEG | Review an already-decided leave | 422 |
| HR-11 | API | `DELETE .../employees/{id}` | 200; status becomes TERMINATED (soft delete) |

---

## 13. ERP — Assets & Documents

| ID | Type | Steps | Expected |
|----|------|-------|----------|
| AST-01 | API | `POST .../assets` | 201 |
| AST-02 | API | `PATCH .../assets/{id}/assign` `{employeeId}` | 200; status `ASSIGNED` |
| AST-03 | API | Assign `{employeeId: null}` | 200; status `AVAILABLE` |
| AST-04 | NEG | Assign to an employee from another workspace | 404 |
| AST-05 | API | `POST .../documents` (metadata: storageKey, mimeType, sizeBytes) | 201 |
| AST-06 | API | `GET .../documents` / `DELETE .../documents/{id}` | 200 / 200 |

---

## 14. File Management (S3 presigned)

> Requires MinIO/S3 configured (`S3_*`). If not set, the presign endpoints
> return 422 "object storage is not configured".

| ID | Type | Steps | Expected |
|----|------|-------|----------|
| FILE-01 | API | `POST .../files/presign-upload` | 200 with `uploadUrl` + `document` |
| FILE-02 | API | `PUT` a real file to `uploadUrl` | 200 from object store |
| FILE-03 | API | `GET .../files/{documentId}/download-url` | 200 with `downloadUrl`; GET it returns the file bytes |
| FILE-04 | NEG | presign-upload with `sizeBytes` > 25 MB | 422 (size cap) |
| FILE-05 | SEC | Confirm file bytes never pass through the API (only presigned URLs) | Upload goes directly to S3 |

---

## 15. Knowledge Base

| ID | Type | Steps | Expected |
|----|------|-------|----------|
| KB-01 | API | `POST .../knowledge` (publish:true) | 201; slug derived from title |
| KB-02 | API | `GET .../knowledge?search=refund` | 200; title/content search (case-insensitive) |
| KB-03 | API | `GET .../knowledge?publishedOnly=true` | Only published articles |
| KB-04 | UI | Knowledge page | Lists articles with published/draft badges |
| KB-05 | API | `PATCH` / `DELETE .../knowledge/{id}` | 200 / 200 |

---

## 16. Notifications & Announcements

| ID | Type | Steps | Expected |
|----|------|-------|----------|
| NOT-01 | API | `GET /notifications` / `GET /notifications/unread-count` | 200; user-scoped |
| NOT-02 | API | `PATCH /notifications/{id}/read` and `/read-all` | 200; `readAt` set |
| NOT-03 | UI | Notifications page | Inbox renders read/unread styling |
| ANN-01 | API | As Owner `POST .../announcements` (publish:true) | 201 |
| ANN-02 | API | `GET .../announcements?publishedOnly=true` | Published only |
| ANN-03 | API | `PATCH .../announcements/{id}/publish` / `DELETE` | 200 / 200 |
| ANN-04 | SEC | A non-`org:manage` caller POSTing an announcement | 403 (only managers) |

---

## 17. Analytics & Reports

| ID | Type | Steps | Expected |
|----|------|-------|----------|
| ANA-01 | API | `GET .../analytics/overview` | 200 with counts, tasks.byStatus, completionRate, finance totals (cents as strings) |
| ANA-02 | API | Verify revenue = sum of PAID invoice totals; outstanding = SENT+PARTIALLY_PAID | Matches seeded data |
| ANA-03 | API | `GET .../reports/revenue?months=6` | 200; array of `{month,totalCents}` |
| ANA-04 | UI | Dashboard | KPI cards + task-by-status render; Analytics page shows revenue bars |
| ANA-05 | SEC | Overview for another org's workspace | 403/404 |

---

## 18. AI Features (9)

> If `AI_API_KEY` is unset, every endpoint returns `{mocked:true}` with a labelled
> stub. Set `AI_API_KEY`/`AI_API_BASE_URL`/`AI_MODEL` to exercise a real model.
> Every endpoint is permission-gated and returns `{content, model, mocked}`.

| ID | Endpoint | Steps | Expected |
|----|----------|-------|----------|
| AI-01 | `POST .../ai/project-manager/{projectId}` | Call with an existing project | 200; references the project's real tasks |
| AI-02 | `POST .../ai/task-generator/{projectId}` `{goal}` | Provide a goal | 200; suggested tasks |
| AI-03 | `POST .../ai/meeting-summary/{meetingId}` | Existing meeting | 200; summary |
| AI-04 | `POST .../ai/client-email/{clientId}` `{intent,tone}` | Existing client | 200; email draft |
| AI-05 | `POST .../ai/proposal/{clientId}` `{scope}` | Existing client | 200; proposal |
| AI-06 | `POST .../ai/weekly-report` | — | 200; uses last 7 days of tasks/invoices/payments |
| AI-07 | `POST .../ai/financial-summary` | — | 200; uses real invoice aggregates |
| AI-08 | `POST .../ai/search` `{query}` | — | 200; grounded in clients/projects/knowledge index |
| AI-09 | `GET .../ai/ask?query=...` | — | 200; answer derived from KPIs |
| AI-10 | NEG | Any AI endpoint for a resource in another workspace | 404 |
| AI-11 | SEC | Confirm prompts include real workspace data (no hallucinated entities) | Output references actual records only |

---

## 19. Health & Operations

| ID | Type | Steps | Expected |
|----|------|-------|----------|
| OPS-01 | API | `GET /health/live` | 200 `{status:"ok"}` |
| OPS-02 | API | `GET /health/ready` | 200; `database` + `redis` checks `ok` with latency |
| OPS-03 | API | Stop Redis, hit `/health/ready` | 200, `status:"degraded"`, redis check `fail`; **app still serves** (soft dependency) |
| OPS-04 | API | With Redis down, call an RBAC-gated route | Still works (falls back to DB) |
| OPS-05 | API | Swagger at `/docs` in dev | Loads; in production (NODE_ENV=production) it's disabled unless `ENABLE_SWAGGER=true` |

---

## 20. Cross-Cutting / Non-Functional

**Validation & errors**
- NEG-1: Any endpoint with an unknown field → 400 (ValidationPipe `forbidNonWhitelisted`).
- NEG-2: Any error returns the envelope `{code,message,details,timestamp,path}` — never a stack trace.
- NEG-3: BigInt money fields are serialized as **strings** (no precision loss).

**Pagination**
- PAG-1: All list endpoints return `{items,total,page,size,totalPages}`; `size` capped at 100.

**Security**
- SEC-1: Rate limiting — exceed `RATE_LIMIT_LIMIT` requests in `RATE_LIMIT_TTL`s → 429.
- SEC-2: Auth brute-force — >10 login attempts/min from one IP → 429 (stricter throttle).
- SEC-3: Security headers present (`X-Frame-Options`, `X-Content-Type-Options`, etc. via helmet).
- SEC-4: A member of org A can **never** read/write org B's data (repeat ORG-07, CLI-08 across modules).
- SEC-5: Refresh tokens are single-use and reuse is rejected (AUTH-09).

**Accessibility (UI baseline)**
- A11y-1: Keyboard-only navigation through login → dashboard → sidebar.
- A11y-2: Form fields have associated labels; buttons have discernible text.
- A11y-3: Status badges/colours are accompanied by text (not colour-only).

**Audit**
- AUD-1: Mutating actions (client/invoice/leave create, login, etc.) create `AuditLog` rows (verify via DB or a future audit endpoint).

---

## 21. Known limitations / out of scope (current build)

- **Members/invites:** there is no "invite user to org" UI/endpoint yet; RBAC
  role-tier testing (RBAC-05) needs a manually seeded `Membership`.
- **Frontend coverage:** the web app implements dashboard, clients, projects/
  kanban, invoices, calendar, knowledge, analytics, notifications. Employees,
  attendance, leaves, assets, documents, announcements, meetings, and all AI
  features are **API-only** for now (test them via Swagger).
- **AI output:** mock unless a provider key is configured.
- **Real-time:** no websockets; notifications are pull-based.
- **Instant token revocation:** disabling a user blocks refresh but an already-
  issued access token stays valid until its short TTL (15 min) expires.

---

## 22. Sign-off checklist

- [ ] All AUTH (11), ORG (7), RBAC (5) cases pass
- [ ] CRM: Clients (8), Invoices (9), Quotations (5), Payments (6) pass
- [ ] PM: Projects/Tasks/Kanban (10), Meetings/Calendar (6) pass
- [ ] ERP/HR: Employees/Attendance/Leaves (11), Assets/Documents (6) pass
- [ ] Platform: Files (5), Knowledge (5), Notifications/Announcements (7) pass
- [ ] Analytics/Reports (5), AI (11), Health/Ops (5) pass
- [ ] Cross-cutting: validation, pagination, rate-limit, headers, tenancy, audit pass
- [ ] No 5xx errors and no stack traces exposed to clients across the whole run

*Update `CHANGELOG.md` and `docs/milestones.md` with the verified release once this checklist is green.*
