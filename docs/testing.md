# Testing

## Strategy

| Layer | Tooling | Location | DB needed |
| --- | --- | --- | --- |
| Unit | Jest + ts-jest | `src/**/*.spec.ts` | No |
| Wiring | Jest + supertest | `src/app.wiring.spec.ts` | No (providers stubbed) |
| Integration / e2e | Jest + supertest | `test/*.e2e-spec.ts` | Yes |
| Coverage | Jest `--coverage` | `apps/backend/coverage/` | — |

Later milestones add: API contract tests (OpenAPI), performance (k6), security
(ZAP/Semgrep), and frontend a11y (axe) — see the milestone roadmap.

## Running

```bash
npm test                 # unit + wiring (DB-free) — fast feedback
npm run test:cov         # + lcov/json/text coverage
npm run test:e2e         # HTTP e2e (needs DATABASE_URL → a live Postgres)
```

Coverage is reported to `apps/backend/coverage/`. The CI workflow uploads it
as an artifact and gates on lint + typecheck + test.

## What the M1 tests prove

- **`token.service.spec.ts`** — access/refresh issuance, hashed-at-rest refresh
  storage, single-use rotation, **reuse detection**, expiry rejection.
- **`rbac.service.spec.ts`** — permission resolution from DB, Redis cache
  hit/miss, invalidation, `hasPermission`.
- **`app.wiring.spec.ts`** — the full DI graph boots (no circular deps, every
  provider resolves), public routes bypass auth, protected routes 401 without a
  token, the global pipe validates input, and the error envelope shape holds.

## Writing a test

- Mock Prisma with a small in-memory object keyed like the real store (see
  `token.service.spec.ts`). Keep mocks typed enough to be useful.
- For HTTP behavior without a DB, extend the wiring test pattern
  (`overrideProvider` for `PrismaService`, `REDIS_CLIENT`, `RbacBootstrapService`).
- For real persistence flows, add an e2e spec that creates + cleans up its own
  data (see `test/auth.e2e-spec.ts`).
