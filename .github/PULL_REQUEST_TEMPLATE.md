## Summary
<!-- What does this change do, and why? Link the issue/milestone. -->

## Change type
- [ ] Feature
- [ ] Bugfix
- [ ] Refactor
- [ ] Tests
- [ ] Docs / infra

## Checklist
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Unit tests added/updated (`npm test`)
- [ ] e2e added for new HTTP flows (if persistence-relevant)
- [ ] New permission keys added to `permissions.ts` + mapped to roles
- [ ] Tenant boundary enforced (service-layer membership check)
- [ ] Audit log written for mutating actions
- [ ] No secrets committed; env vars documented in `.env.example`
- [ ] Migration created if schema changed

## Risk & rollback
<!-- What could break, and how do we roll back? -->
