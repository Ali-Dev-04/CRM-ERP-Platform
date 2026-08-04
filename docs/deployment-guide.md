# Deployment Guide

## Environments

- **Local/dev:** `docker compose up -d` provides Postgres, Redis, MinIO.
- **CI:** GitHub Actions provisions Postgres + Redis as services (see
  `.github/workflows/ci.yml`).
- **Production:** containerized backend behind NGINX; Postgres/Redis/S3 managed.

## Building the image

```bash
docker build -f apps/backend/Dockerfile -t crm-erp-backend:latest .
```

The Dockerfile is multi-stage: install prod deps → build → copy into a
non-root `node:22-alpine` runtime. It ships a HEALTHCHECK hitting `/health/live`.

## Required environment (production)

All values are validated at boot (zod) — missing/invalid config prevents start.

| Variable | Notes |
| --- | --- |
| `NODE_ENV=production` | Disables Swagger unless `ENABLE_SWAGGER=true` |
| `DATABASE_URL` | Pooling-capable Postgres URL |
| `REDIS_URL` | Cache + (later) BullMQ |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | ≥ 32 chars, generate with `openssl rand -base64 64` |
| `CORS_ORIGINS` | Comma-separated allow-list |
| `RATE_LIMIT_*` | Per-IP token bucket |
| `S3_*` | Object storage for file management (M5) |

## Database lifecycle

```bash
# CI / deploy: apply migrations idempotently
npx prisma migrate deploy

# Generate the client at build time
npx prisma generate
```

Never run `migrate dev` against production — it is for local schema iteration.

## Health checks

- `GET /health/live` — process alive (load-balancer restart signal).
- `GET /health/ready` — DB + Redis reachable (traffic-gating signal).

## Reverse proxy (NGINX) essentials

- Terminate TLS; proxy to the backend container.
- Forward `X-Forwarded-For` — the app runs with `trust proxy = 1` so `req.ip`
  and the rate limiter see the real client IP.
- Use `/health/ready` for the upstream health check.

## Backups

- Postgres: schedule `pg_dump` (or managed snapshots) at least daily.
- S3: enable versioning + lifecycle rules.
- Secrets: never bake into images; inject at runtime via the orchestrator.
