# API Reference (M1)

Live, interactive docs are at **`/docs`** (Swagger UI, dev-gated). This is a
quick summary. All responses use JSON. Errors follow the envelope:

```json
{ "code": "auth.invalid_credentials", "message": "Invalid email or password",
  "details": null, "timestamp": "…", "path": "/auth/login" }
```

## Auth — `/auth`

| Method | Path | Auth | Throttle | Notes |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | public | 10/min | Creates user + org + workspace + Owner membership |
| POST | `/auth/login` | public | 10/min | Returns access + refresh tokens |
| POST | `/auth/refresh` | public | default | Rotates refresh token (single-use) |
| POST | `/auth/logout` | public | default | Revokes the refresh token |
| GET  | `/auth/me` | bearer | default | Current user |

**Register body:** `{ email, password (≥12, letter+number), firstName, lastName, organizationName }`
**Response:** `{ accessToken, refreshToken, expiresIn, user }`

## Organizations — `/organizations`

| Method | Path | Auth | Permission | Notes |
| --- | --- | --- | --- | --- |
| GET | `/organizations` | bearer | — | Orgs the user belongs to (+ role) |
| GET | `/organizations/:organizationId` | bearer | membership | Single org |
| GET | `/organizations/:organizationId/workspaces` | bearer | membership | Workspaces in org |
| POST | `/organizations/:organizationId/workspaces` | bearer | `org:manage` | Create workspace |

> The active organization for permission checks is resolved from
> `:organizationId`/`:orgId` route param or the `x-organization-id` header.

## Health — `/health`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/health/live` | public | Liveness |
| GET | `/health/ready` | public | DB + Redis readiness with latency |

## Auth header

`Authorization: Bearer <accessToken>` — access tokens are short-lived
(`JWT_ACCESS_TTL`, default 15 min). Refresh before expiry using the refresh token.
