# Security

The platform implements defences against the OWASP Top 10 and related risks.
This is a summary; see code for specifics.

## Identity & access
- **Passwords:** argon2id hashing (tuned memory/time cost). Passwords require
  ≥12 chars with a letter and a number.
- **Tokens:** short-lived JWT access tokens (default 15 min); **opaque refresh
  tokens hashed at rest, single-use with rotation, and reuse detection** (a
  replayed, already-rotated token is rejected as a reuse signal).
- **No enumeration:** login returns a generic `auth.invalid_credentials` for
  both unknown-user and wrong-password.
- **RBAC:** explicit permission catalog; `@RequirePermissions(...)` with
  AND-semantics, enforced by `PermissionsGuard`. Permission sets are cached in
  Redis and invalidated on role/membership change.

## Input & output
- **Validation:** global `ValidationPipe` with `whitelist` + `forbidNonWhitelisted`;
  every DTO uses class-validator decorators.
- **Error leakage:** a single normalized error envelope; stack traces are logged
  but never returned in production. Swagger is disabled in production unless
  `ENABLE_SWAGGER=true`.
- **CORS:** explicit allow-list via `CORS_ORIGINS`.

## Transport & infra
- **helmet** secure headers; **trust proxy = 1** so rate limiting sees real IPs
  behind NGINX; NGINX terminates TLS and adds security headers.
- **Rate limiting:** global per-IP token bucket; **stricter 10/min on login +
  register** to blunt brute-force/signup abuse.
- **File uploads:** presigned S3 URLs — bytes never traverse the API; 25 MB cap.

## Tenancy & data
- **Tenant isolation:** workspace filter enforced in the service layer on every
  query (`assertWorkspaceInOrg`) — independent of the authorization check.
- **Money integrity:** integer cents (`BigInt`) computed server-side; no float
  drift in billing.
- **Audit trail:** append-only `AuditLog` of mutating actions for accountability
  and incident review.

## Secrets
- All configuration is validated at boot (zod) and fails loud if misconfigured.
- Secrets are injected via environment at runtime — never baked into images or
  committed (`.env` is gitignored).

## Known follow-ups (tracked for hardening)
- Instant access-token revocation via a Redis blocklist (if required by policy).
- Automated security scanning (Semgrep for code, ZAP for the running app) wired
  into CI.
- Partial unique index for system roles at the DB level (currently enforced in
  application bootstrap).
