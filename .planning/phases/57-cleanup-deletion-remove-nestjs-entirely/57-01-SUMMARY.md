# Phase 57-01 Summary: CI/CD Cleanup — Remove NestJS Backend References

**Status**: COMPLETE
**Date**: 2026-02-22
**Branch**: gsd/phase-57-cleanup-deletion-remove-nestjs-entirely

## Objective

Delete the NestJS Railway deploy workflow and update CI/CD to remove all backend test references.
This step was required before any directory deletion to prevent CI failures on the deletion PR.

## Files Modified/Deleted

### Deleted
- `.github/workflows/deploy-backend.yml` — NestJS Railway deploy pipeline (129 lines removed)
  - Committed in prior session: `2e8f23e4b chore(57-01): delete deploy-backend.yml and remove backend tests from ci-cd.yml`

### Modified
- `.github/workflows/ci-cd.yml` — Updated test-script to frontend-only
  - Committed in prior session: `2e8f23e4b chore(57-01): delete deploy-backend.yml and remove backend tests from ci-cd.yml`

- `.github/workflows/rls-security-tests.yml` — Updated path trigger and test command
  - Committed: `b25549bbe chore(57-01): update rls-security-tests workflow to target integration-tests`

## Specific Changes

### .github/workflows/deploy-backend.yml (DELETED)
- Entire file deleted. This was the Railway deploy pipeline for NestJS backend.
- Contained RAILWAY_TOKEN secret usage and Railway deploy steps.
- No archive — deleted entirely per plan requirement.

### .github/workflows/ci-cd.yml
- Changed `test-script` from:
  ```yaml
  test-script: 'pnpm --filter @repo/backend test:unit && pnpm --filter @repo/frontend test:unit'
  ```
  to:
  ```yaml
  test-script: 'pnpm --filter @repo/frontend test:unit'
  ```

### .github/workflows/rls-security-tests.yml
- Changed `on.push.paths` trigger from `apps/backend/**` to `apps/integration-tests/**`
- Changed run command from `pnpm --filter @repo/backend test:security` to `pnpm --filter @repo/integration-tests test:rls`
- Retained: `supabase/migrations/**` and `packages/shared/**` path triggers (still relevant)
- Retained: All env var/secrets references (integration tests use same Supabase credentials)

## Verification Results

| Check | Result |
|-------|--------|
| `deploy-backend.yml` does not exist | PASS |
| No `RAILWAY_TOKEN` in any workflow | PASS |
| No `deploy-backend` reference in any workflow | PASS |
| No `@repo/backend` filter in any workflow | PASS |
| `ci-cd.yml` test-script = frontend-only | PASS |
| `rls-security-tests.yml` paths = `apps/integration-tests/**` | PASS |
| `rls-security-tests.yml` run = `pnpm --filter @repo/integration-tests test:rls` | PASS |
| No `test:security` reference in any workflow | PASS |

## Requirements Satisfied

- **CLEAN-03**: CI/CD pipeline runs only frontend unit tests (not backend)
- **CLEAN-04**: RLS security test workflow targets apps/integration-tests/ path and runs the correct test command

## Commits

1. `2e8f23e4b` — `chore(57-01): delete deploy-backend.yml and remove backend tests from ci-cd.yml`
2. `b25549bbe` — `chore(57-01): update rls-security-tests workflow to target integration-tests`
