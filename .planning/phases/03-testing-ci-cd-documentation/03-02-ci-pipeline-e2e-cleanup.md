# Plan 63-02: CI Pipeline RLS Gate + E2E Cleanup

## Goal

1. Make RLS tests gate PR merges in CI
2. Remove stale NestJS api/v1 intercepts from E2E tests
3. E2E smoke tests already run pre-commit (verify configuration)

## Current State

- `rls-security-tests.yml` exists but only runs weekly (schedule) + manual dispatch
- `ci-cd.yml` calls lint + typecheck + tests (unit only) on PR
- Pre-commit hook already runs RLS tests (Step 5 in `.husky/pre-commit`)
- E2E mocks in `apps/e2e-tests/mocks/api-handlers.ts` use stale `/api/v1/` NestJS routes
- 11 E2E test files reference `/api/v1/` patterns

## Changes

### 1. Add RLS tests to CI pipeline (gate PRs)

Update `.github/workflows/ci-cd.yml` to include RLS security tests as a required job:
- Add `rls-security` job that runs `pnpm --filter @repo/integration-tests test:rls`
- Requires GitHub secrets for Supabase URL, publishable key, and test user credentials
- This job must pass for PR to merge

### 2. Remove stale NestJS E2E intercepts

Files with `/api/v1/` references to clean up:
- `apps/e2e-tests/mocks/api-handlers.ts` — entire file uses NestJS routes, rewrite for Supabase PostgREST
- `apps/e2e-tests/tests/production/monitoring.prod.spec.ts` — health checks reference `/api/v1/health`
- `apps/e2e-tests/tests/owner/connect-onboarding.e2e.spec.ts` — Stripe Connect routes
- `apps/e2e-tests/tests/tenant-invitation/tenant-invitation-flow.e2e.spec.ts` — email send route
- `apps/e2e-tests/tests/tenant-management/tenant-management-fixed.e2e.spec.ts` — tenant route
- `apps/e2e-tests/tests/tanstack-query/cache-behavior.spec.ts` — properties route
- `apps/e2e-tests/tests/staging/tenant-portal.staging.spec.ts` — health check
- `apps/e2e-tests/tests/auth-nextjs16-dal.spec.ts` — api reference
- `apps/e2e-tests/tests/seed.spec.ts` — tenant route
- `apps/e2e-tests/tests/auth-jwt-validation.spec.ts` — api reference

### 3. Verify E2E pre-commit

Pre-commit hook already has E2E? Check if it does or needs adding. Currently Step 5 is RLS tests. E2E smoke may need to be added as Step 6 or confirmed to be unnecessary pre-commit (user said E2E should run pre-commit).

## Files Modified

- `.github/workflows/ci-cd.yml`
- `.github/workflows/rls-security-tests.yml` (update trigger to include PRs)
- `apps/e2e-tests/mocks/api-handlers.ts`
- Multiple E2E test files (stale intercept cleanup)
- `.husky/pre-commit` (if E2E needs adding)

## Verification

- CI pipeline includes RLS tests as required job
- No `/api/v1/` references remain in E2E test files
- `pnpm typecheck` passes for e2e-tests package
