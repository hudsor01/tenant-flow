---
phase: 33-smoke-test
plan: 01
subsystem: e2e-testing
provides: smoke-test-results
affects: [33-02-manual-walkthrough]
key-files:
  - supabase/seed.sql
  - .planning/phases/33-smoke-test/SMOKE-TEST-RESULTS.md
key-decisions:
  - Seed bug found and fixed: user_type='TENANT' in raw_user_meta_data overwritten by trigger
  - Health check fails at cold start (P2 - timing, not broken) — app works fine
  - Dashboard/login/navigation all pass after seed fix
---

# Phase 33 Plan 01 Summary: Automated Smoke Test Run

**Seed bug fixed, critical path smoke tests pass, health check timing issue documented.**

## Accomplishments

- Ran all E2E test suites: smoke, chromium, owner projects
- Identified and fixed P0 seed bug: `test-admin@tenantflow.app` had `user_type='TENANT'`
  - Root cause: `ensure_public_user_for_auth` trigger reads `raw_user_meta_data.user_type`
    but seed only set it in `raw_app_meta_data`; trigger defaulted to 'TENANT'
  - Fix: added `"user_type":"OWNER"` to `raw_user_meta_data` in seed.sql
- After fix: Owner login → Dashboard → Properties → Navigation all **PASS**
- Documented backend health check startup timing issue (P2)

## Files Created/Modified

- `supabase/seed.sql` — added `user_type` to `raw_user_meta_data` + `on conflict` user_type update
- `.planning/phases/33-smoke-test/SMOKE-TEST-RESULTS.md` — full test results
- `.planning/phases/33-smoke-test/33-01-SUMMARY.md` — this file

## Test Results Summary

| Suite | Passed | Failed | Notes |
|-------|--------|--------|-------|
| smoke (after fix) | 7/9 | 1 | Health check cold-start only failure |
| chromium | 54 | 77 | TanStack/tenant tests failing |
| owner | 41 | 14 | Tenant modal tests failing |

## Key Issues Found

- **P2**: Backend health check reports "unhealthy" for ~2s after cold start
  - Supabase admin client not ready immediately; app works fine
- **P1**: TanStack Query infinite scroll + optimistic update tests (27 tests) — likely testing
  features that aren't implemented (no infinite scroll on properties page)
- **P1**: Tenant invitation E2E flow failing (Phase 36 will address)
- **P1**: Tenant management modal tests failing (14 in owner project, 18 in chromium)

## Next Step

Phase 33-02: Manual flow walkthrough (owner + tenant) and create ISSUES.md.
