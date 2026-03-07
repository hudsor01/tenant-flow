---
phase: 02-financial-fixes
plan: 07
subsystem: payments
tags: [stripe, migrations, edge-functions, rpc, invoices]

# Dependency graph
requires:
  - phase: 02-financial-fixes
    provides: Stripe SDK upgrade, webhook fixes, payment RPCs, billing hooks
provides:
  - Deduplicated migration timestamps for clean migration ordering
  - Consistent Stripe apiVersion across all Edge Functions
  - get_user_invoices RPC for stripe.invoices PostgREST access
affects: [edge-function-hardening, testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RPC-first with PostgREST fallback for stripe schema queries"

key-files:
  created:
    - supabase/migrations/20260305120000_get_user_invoices_rpc.sql
  modified:
    - supabase/migrations/20260304161000_stripe_sync_diagnosis.sql (renamed from 20260304160000)
    - supabase/functions/detach-payment-method/index.ts
    - src/hooks/api/use-billing.ts

key-decisions:
  - "get_user_invoices uses SECURITY DEFINER to access stripe.invoices cross-schema"
  - "useInvoices tries RPC first, falls back to rent_payments if stripe schema unavailable"

patterns-established:
  - "Stripe schema RPC pattern: SECURITY DEFINER RPC wrapping stripe.* table queries with user scoping via stripe.customers"

requirements-completed: [PAY-17, PAY-20]

# Metrics
duration: 2min
completed: 2026-03-05
---

# Phase 2 Plan 7: Gap Closure Summary

**Fixed duplicate migration timestamp, aligned detach-payment-method Stripe apiVersion to clover, added get_user_invoices RPC with rent_payments fallback**

## Performance

- **Duration:** 2 min (tasks pre-completed in prior session, verified and documented here)
- **Started:** 2026-03-05T06:08:44Z
- **Completed:** 2026-03-05T06:09:21Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Resolved duplicate migration timestamp collision between autopay_cron_retry and stripe_sync_diagnosis
- Unified Stripe apiVersion to '2026-02-25.clover' across all Edge Functions (was '2025-02-24.acacia' in detach-payment-method)
- Created get_user_invoices RPC querying stripe.invoices with customer-scoped access, with graceful fallback to rent_payments

## Task Commits

All three tasks were committed atomically in a single prior-session commit:

1. **Task 1: Fix duplicate migration timestamp** - `f265e7a` (fix)
2. **Task 2: Fix detach-payment-method apiVersion** - `f265e7a` (fix)
3. **Task 3: Implement get_user_invoices RPC** - `f265e7a` (fix)

**Combined commit:** `f265e7a56` — fix(02-07): close Phase 2 verification gaps

## Files Created/Modified
- `supabase/migrations/20260304161000_stripe_sync_diagnosis.sql` - Renamed from 20260304160000 to resolve timestamp collision
- `supabase/functions/detach-payment-method/index.ts` - apiVersion updated from acacia to clover
- `supabase/migrations/20260305120000_get_user_invoices_rpc.sql` - New RPC querying stripe.invoices with customer scoping
- `src/hooks/api/use-billing.ts` - useInvoices now tries RPC first, falls back to rent_payments

## Decisions Made
- get_user_invoices uses SECURITY DEFINER to cross the schema boundary into stripe.invoices, joining with stripe.customers for user scoping
- Fallback to rent_payments ensures environments without stripe schema still function

## Deviations from Plan

None - plan executed exactly as written (all tasks completed in prior session).

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2 (Financial Fixes) is now fully complete with all 7 plans executed
- All verification gaps closed
- Ready for Phase 4 (Edge Function Hardening) which depends on Phase 2

## Self-Check: PASSED

- [x] `supabase/migrations/20260304161000_stripe_sync_diagnosis.sql` exists (renamed)
- [x] `supabase/migrations/20260305120000_get_user_invoices_rpc.sql` exists
- [x] Only 1 file with `20260304160000` timestamp (no collision)
- [x] Zero `acacia` references in Edge Functions
- [x] `get_user_invoices` referenced 3 times in `use-billing.ts`
- [x] Commit `f265e7a` exists in history

---
*Phase: 02-financial-fixes*
*Completed: 2026-03-05*
