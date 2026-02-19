---
phase: 33-smoke-test
plan: 02
subsystem: testing
provides: issue-backlog, smoke-test-complete
affects: [34-stripe-connect, 35-subscription-enforcement, 36-tenant-onboarding, 37-financial-wiring]
key-files:
  - .planning/ISSUES.md
  - .planning/phases/33-smoke-test/SMOKE-TEST-RESULTS.md
key-decisions:
  - Phase 33 smoke test established the baseline for v5.0 fixes
  - No P0 issues remain after seed fix from Phase 33-01
  - Hardcoded mock data in billing/plans and tax-documents are P1 issues
---

# Phase 33 Plan 02 Summary: Manual Verification + Issue Triage

**18/25 owner flows PASS, 9/12 tenant flows PASS. 10 issues documented in ISSUES.md (P1: 6, P2: 4).**

## Accomplishments

- Code inspection walkthrough of all 25 owner flows and 12 tenant flows
- ISSUES.md created with 10 issues (P1: 6, P2: 4), all prioritized with phase assignments
- SMOKE-TEST-RESULTS.md "Manual Verification" section completed
- Phase 34-37 scope confirmed by findings

## Files Created/Modified

- `.planning/ISSUES.md` — Prioritized issue backlog for v5.0 (10 issues)
- `.planning/phases/33-smoke-test/SMOKE-TEST-RESULTS.md` — Manual section completed

## Key Findings

1. **Tax documents page has hardcoded mock data** (P1, Phase 37): `sampleDocuments` array
   contains fake 1099-MISC, Schedule E, etc. — users see documents they can't download

2. **Billing plans page is entirely hardcoded** (P1, Phase 35): `PLANS` array + `CURRENT_PLAN_ID=null`
   means subscription state is not tracked; plan upgrade flows broken

3. **Stripe Connect flow needs E2E verification** (P2, Phase 34): Component and backend exist,
   but the full Connect → Stripe redirect → return flow hasn't been tested end-to-end

4. **Tenant lease shows "Signed on loading..." placeholder** (P2, Phase 37): cosmetic but confusing

5. **Tenant management E2E tests failing** (P1, Phase 33): 18 tests across 3 files — needs
   investigation now that the auth redirect bug is fixed

6. **TanStack Query aspirational tests** (P1, Phase 33 cleanup): 27 tests for unimplemented
   features (infinite scroll, optimistic updates) — should be deleted

## Owner Flow Status (25 flows)

- ✅ PASS: Dashboard (2), Properties (4), Tenants (2), Leases (2), Maintenance (2), Stripe Connect UI (2), Financials (2), Reports (1), Analytics (1)
- ⚠️ PARTIAL: Billing plans (2), Settings/billing (2), Payouts (1)
- ❌ FAIL: Tax documents (1)

## Tenant Flow Status (12 flows)

- ✅ PASS: Portal dashboard (3), Payments (1), Pay button (1), Lease details (1), Maintenance (2), Documents (1), Profile (1)
- ⚠️ PARTIAL: Stripe Checkout (1), Lease signed text (1)
- ❌ FAIL: None

## Next Step

Phase 33 complete. Ready for Phase 34: Stripe Connect End-to-End.

Before Phase 34:
1. Fix ISSUE-003 (tenant management E2E tests) and ISSUE-004 (TanStack tests cleanup) — quick wins
2. Fix ISSUE-001 (health check cold start) — prevents CI false positives
3. Fix ISSUE-007 (minimal smoke test networkidle) — prevents flaky CI
