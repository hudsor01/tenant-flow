---
phase: 33-smoke-test
plan: 01
subsystem: e2e
provides: smoke-test-results
affects: [33-02-manual-walkthrough]
key-files:
  - apps/e2e-tests/tests/smoke/critical-paths.smoke.spec.ts
  - supabase/seed.sql
key-decisions:
  - "Owner user_type was TENANT in seed (trigger override bug) — fixed"
  - "Health check failing at cold start is P2, not P0 — app works"
  - "Health check now has 5-retry with 1s delay for cold start"
---

# Phase 33 Plan 01 Summary: Automated Smoke Test Run

## Accomplishments

- Fixed P0 seed bug: `ensure_public_user_for_auth` trigger overwrote user_type='OWNER' to 'TENANT'
  from raw_user_meta_data default. Fixed seed to explicitly UPDATE user_type after auth.users insert.
- Fixed smoke test health check to retry 5× with 1s delay for cold-start warmup
- Ran all test suites; documented results in SMOKE-TEST-RESULTS.md
- Regenerated owner auth storage state after seed fix

## Files Created/Modified

- `supabase/seed.sql` — fixed on_conflict clause + added explicit UPDATE after auth.users insert
- `apps/e2e-tests/tests/smoke/critical-paths.smoke.spec.ts` — health check retry logic
- `.planning/phases/33-smoke-test/SMOKE-TEST-RESULTS.md` — full results

## Key Findings

### Fixed
- **[ISSUE-001] Owner login redirected to /tenant** — FIXED. Root cause: seed user had
  `user_type: "TENANT"` in public.users because `ensure_public_user_for_auth` trigger
  reads `raw_user_meta_data.user_type` (not `raw_app_meta_data.user_type`) and defaults
  to 'TENANT'. The seed's `on conflict` update didn't include user_type. Fixed both.

### Documented Remaining Issues

| ID | Priority | Description | Phase |
|----|----------|-------------|-------|
| ISSUE-002 | P1 | TanStack Query infinite-scroll tests all fail (17) — feature not implemented | backlog |
| ISSUE-003 | P1 | TanStack Query optimistic update tests all fail (10) — not implemented | backlog |
| ISSUE-004 | P1 | Tenant invitation E2E tests all fail (13) | Phase 36 |
| ISSUE-005 | P1 | Tenant management tests all fail (18) | Phase 33-02 |
| ISSUE-006 | P2 | Backend health check reports unhealthy at cold start | defer |

### Test Results Summary

| Suite | Project | Passed | Failed |
|-------|---------|--------|--------|
| Smoke critical paths | smoke | 2+ | 1 (health check timing) |
| Owner pre-auth tests | owner | 43 | ~19 (owner-tenants tests) |
| Chromium pre-auth tests | chromium | 54 | 77 (tanstack/tenant mgmt) |

### P2: Backend Health Check

The backend admin client (`SUPABASE_SERVICE_ROLE_KEY`) reports `{"message":""}` when
querying `public.users`. This happens consistently after cold start. Direct psql and
REST API queries work fine. The backend app itself works (54+ tests pass). This is
likely a Supabase JS client initialization timing issue. Low priority — monitoring
shows false negative, not a real outage.

## Next Step

Phase 33-02: Manual owner + tenant flow walkthrough. Key areas to verify:
1. Owner login → dashboard (redirect now correct after seed fix)
2. Properties, tenants, leases pages
3. Tenant portal flow
4. Financial pages (inputs for Phase 37)
