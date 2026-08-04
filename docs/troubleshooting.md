# Troubleshooting

### App refuses to start: "Invalid environment configuration"
A required env var is missing or malformed. The zod schema (`src/config/env.schema.ts`)
prints every failing field. `JWT_*_SECRET` must be ≥ 32 chars; `DATABASE_URL`
and `REDIS_URL` must be valid URLs. Copy `.env.example` and fill real values.

### `Class constructor HttpException cannot be invoked without 'new'`
Two known causes, both fixed — recorded in case they recur:
1. **Stale compiled `.js` inside `src/`.** If a `tsc`/`nest` run ever emits
   into `src/` (e.g. a CLI `tsc file.ts` without `--outDir`/`--noEmit`),
   ts-jest will load the stale `.js` instead of your `.ts`. Delete stray
   `*.js`/`*.js.map`/`*.d.ts` from `src/` (source is `.ts` only; `outDir` is
   `dist`). `find src -name "*.js" -delete` clears them.
2. **Domain errors must not extend `HttpException`.** They extend `Error`
   instead and carry an HTTP `status` the filter translates. Extending the
   framework's native class breaks under ts-jest's emit and also couples the
   domain to HTTP (a Clean Architecture violation).

### ts-jest picks the wrong tsconfig under npm workspaces
ts-jest does **not** expand `<rootDir>` in its `tsconfig` option, and its
cwd-based auto-detection is unreliable in a monorepo. That's why
`jest.config.js` pins `tsconfig` to an absolute path via `__dirname`.

### `host.switchToHttp is not a function`
You reversed the `ExceptionFilter.catch(exception, host)` arguments. The
filter signature is `catch(exception, host)` — host is **second**.

### Docker Desktop engine not reachable on Windows
`docker` errors with "open //./pipe/dockerDesktopLinuxEngine". Start Docker
Desktop (the GUI) and wait for the engine; the CLI can't always launch it
headlessly.

### `argon2` install fails
Install build tools, or ensure you're on a platform with prebuilt binaries
(Windows/macOS/Linux x64/arm64 are covered). `npm rebuild argon2` usually fixes
a partial install.

### Rate limiting feels wrong behind a proxy
Confirm the proxy forwards `X-Forwarded-For` and the app runs with
`trust proxy = 1` (set in `main.ts`). Without it, every request appears to
originate from the proxy IP and the limit is shared globally.

### Prisma "can't reach database server"
Check `DATABASE_URL`, that `docker compose up -d postgres` is healthy
(`docker compose ps`), and that no other process holds port 5432.
