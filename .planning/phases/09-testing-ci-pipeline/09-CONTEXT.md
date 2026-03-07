# Phase 9: Testing & CI Pipeline - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

CI catches build failures, coverage regressions, and security issues before merge. Add `next build` to CI, enforce coverage thresholds, write Edge Function tests, fill RLS test gaps, add security scanning, fix stale E2E configs, enable TypeScript strictness flags, and update CLAUDE.md. No new features -- purely hardening the testing and CI infrastructure.

</domain>

<decisions>
## Implementation Decisions

### CI pipeline design
- PRs run: lint + typecheck + next build (clean build, no cache). Tests and coverage stay local.
- RLS security tests run on **every PR** to main (not just migration-touching PRs). Remove path filter from `rls-security-tests.yml`.
- Unit tests + coverage enforcement stay **local only** via lefthook pre-commit. CI trusts local hooks.
- No trivy -- rely on GitHub Dependabot for dependency vulnerability alerts.
- `next build` uses clean build every time (no `.next/cache` between runs). Simple and deterministic.

### Security scanning
- **Gitleaks in lefthook pre-commit** -- secrets caught before they ever reach the repo. Added as another parallel command in `lefthook.yml`.
- No gitleaks in CI -- pre-commit is the enforcement point.
- No trivy -- Dependabot covers dependency alerts.

### Edge Function testing
- **Follow official Supabase documentation**: use Deno's built-in test runner (`deno test --allow-all`).
- Tests live in `supabase/functions/tests/` directory per official recommended structure.
- Integration-style tests: create Supabase client, invoke functions, assert responses.
- **Comprehensive coverage** for 4 critical Edge Functions: stripe-webhooks, stripe-rent-checkout, stripe-autopay-charge, tenant-invitation-accept. All paths tested: success, auth failure, validation failure, rate limiting, idempotency, error handling (~10-15 tests per function).
- Run **locally only** (manual or pre-push). Not in CI -- keeps CI lean per user preference.

### E2E test scope
- **Pre-commit + CI on merge to main**. E2E stays in lefthook pre-commit AND smoke subset runs in CI on push to main.
- CI runs **smoke tests only** (critical-paths.smoke.spec.ts, minimal.smoke.spec.ts). Fast, no complex auth setup.
- Fix stale monorepo references: `cd apps/frontend` in playwright.config.ts webServer, `pnpm --filter @repo/e2e-tests` in playwright.config.prod.ts.
- **Trim E2E suite to 15-20 tests**: audit all 57 files, remove/archive broken, outdated, or redundant tests. Keep critical user journeys.
- Create `.env.test` template for E2E test configuration (TEST-21).

### TypeScript strictness
- Enable **all 4 flags** in a single plan with all fixes:
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`
  - `isolatedModules: true`
  - `checkJs: true`
- Fix all resulting errors in one sweep. Use underscore prefix for intentionally unused callback params.

### RLS test gaps
- Match existing pattern: dual-client (ownerA/ownerB), test SELECT/INSERT/UPDATE/DELETE isolation.
- New RLS tests for: `rent_payments`, `payment_methods`, `documents`, `notifications`, `notification_settings`, `subscriptions`, `tenant_invitations`.
- Tenant-role isolation tests (TEST-09): verify tenants cannot access other tenants' data, not just cross-owner.

### Shared validation & utility tests
- TEST-05/06: Claude assesses value of each shared validation schema and utility function. Write tests for valuable ones, remove dead code that serves no purpose.

### Skipped tests
- TEST-15: Fix skipped tests in `bulk-import-upload-step.test.tsx`. Investigate root cause and make them pass.

### Claude's Discretion
- RLS test infrastructure for tenant-role testing (test user setup, credentials)
- Coverage enforcement mechanism in lefthook (whether `--coverage` flag with thresholds or just run tests)
- `.env.test` template contents and whether committed or gitignored
- Which of the 57 E2E files to keep vs trim (based on audit of broken/redundant/critical)
- Specific test cases for each Edge Function (determined during research of function logic)
- Assessment of which shared validation schemas and utility functions deserve tests vs removal
- TEST-13 (attach-payment-method API route test) and TEST-14 (Supabase client utility tests) approach

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `vitest.config.ts`: Already has 3-project setup (unit/component/integration) with coverage thresholds at 80%
- `lefthook.yml`: Pre-commit (lint, typecheck, unit-tests, duplicate-types, lockfile) + pre-push (lockfile-sync, rls-tests)
- `.github/workflows/ci-cd.yml`: Existing CI with lint + typecheck parallel execution
- `.github/workflows/rls-security-tests.yml`: RLS test workflow with secret checking, dual-owner test setup
- `tests/integration/rls/`: 14 existing RLS test files following consistent dual-client pattern
- `tests/e2e/playwright.config.ts`: Full Playwright config with auth setup projects, owner/tenant/smoke/public projects
- `tests/e2e/playwright.config.prod.ts`: Production monitoring config (needs stale reference fixes)

### Established Patterns
- RLS tests: `describe/beforeAll/afterAll` with ownerA/ownerB Supabase clients, cross-owner isolation assertions
- Vitest projects: unit (jsdom, vmThreads), component (jsdom, vmThreads), integration (node, forks, sequential)
- Lefthook: parallel pre-commit hooks, sequential pre-push hooks
- E2E: Playwright with auth setup projects -> authenticated test projects dependency chain

### Integration Points
- `lefthook.yml`: Add gitleaks command to pre-commit block
- `.github/workflows/ci-cd.yml`: Add `next build` step, add E2E smoke on push-to-main
- `.github/workflows/rls-security-tests.yml`: Remove `paths:` filter to run on all PRs
- `tsconfig.json`: Enable 4 strictness flags (lines 30-31 + 16 + 12)
- `supabase/functions/tests/`: New directory for Deno Edge Function tests
- `tests/e2e/playwright.config.ts` line 263: Fix `cd apps/frontend` to correct path
- `tests/e2e/playwright.config.prod.ts` line 12: Fix `pnpm --filter @repo/e2e-tests`

</code_context>

<specifics>
## Specific Ideas

- "Secrets should be in pre-commit so secrets are never tracked by GitHub" -- gitleaks must catch secrets before they reach the repo, not after
- Edge Function tests should follow official Supabase documentation exactly -- Deno test runner, `supabase/functions/tests/` structure, integration-style
- Comprehensive Edge Function test coverage: all paths including success, auth failure, validation, rate limiting, idempotency, error handling
- E2E trimmed to 15-20 critical journeys -- audit and remove broken/redundant tests
- TypeScript strictness: all 4 flags in one sweep, no incremental rollout

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 09-testing-ci-pipeline*
*Context gathered: 2026-03-06*
