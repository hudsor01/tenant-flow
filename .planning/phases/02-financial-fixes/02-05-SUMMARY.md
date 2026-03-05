---
phase: 02-financial-fixes
plan: 05
subsystem: database
tags: [stripe, onboarding, backfill, documentation, conventions]

# Dependency graph
requires:
  - phase: 02-financial-fixes/02-02
    provides: "account.updated webhook fix that prevents future onboarding_completed_at overwrites"
provides:
  - "Backfill migration for onboarding_completed_at on existing owners"
  - "CLAUDE.md updated with all Phase 2 financial conventions"
affects: [all-phases, financial-code, edge-functions, stripe-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dollars as numeric(10,2) — cents conversion only at Stripe API boundary"
    - "Atomic multi-table writes via SECURITY DEFINER RPCs"
    - "Webhook idempotency via stripe_webhook_events.status tracking"

key-files:
  created:
    - supabase/migrations/20260304170000_onboarding_backfill.sql
  modified:
    - CLAUDE.md

key-decisions:
  - "Used property_owners.charges_enabled directly instead of stripe.accounts lookup (column already exists on table)"
  - "Backfilled both property_owners and users tables for consistency"

patterns-established:
  - "Amount convention: dollars as numeric(10,2), cents only at Stripe boundary"
  - "Stripe schema queryable via PostgREST for read operations"
  - "Subscription status from stripe.subscriptions, not users.stripe_customer_id"

requirements-completed: [DOC-01]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Phase 2 Plan 5: Onboarding Backfill and CLAUDE.md Conventions Summary

**Onboarding backfill migration for existing Stripe-enabled owners plus CLAUDE.md updated with all Phase 2 financial patterns (dollars convention, RPCs, webhook idempotency, autopay retry, Stripe SDK rules)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-05T01:06:31Z
- **Completed:** 2026-03-05T01:09:05Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Backfill migration sets onboarding_completed_at for owners with charges_enabled=true but null timestamp
- Syncs users.onboarding_completed_at from property_owners for cross-table consistency
- CLAUDE.md documents all Phase 2 conventions: dollars storage, atomic RPCs, webhook idempotency, autopay retry, Stripe SDK version, payment metadata validation, detach-payment-method requirement, stripe schema access, subscription status

## Task Commits

Each task was committed atomically:

1. **Task 1: Onboarding backfill migration** - `265673cac` (feat)
2. **Task 2: Update CLAUDE.md with Phase 2 conventions** - `fe142ea44` (docs)

## Files Created/Modified
- `supabase/migrations/20260304170000_onboarding_backfill.sql` - Backfills onboarding_completed_at on property_owners and users
- `CLAUDE.md` - Added Database, Data Access, Edge Functions, and Common Gotchas entries for Phase 2 patterns

## Decisions Made
- Used `property_owners.charges_enabled` directly instead of joining `stripe.accounts` — the column already exists on the table, making the query simpler and avoiding cross-schema dependencies
- Backfilled both `property_owners` and `users` tables to keep onboarding state consistent across both

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected target table from users to property_owners**
- **Found during:** Task 1
- **Issue:** Plan SQL referenced `public.users` with `stripe_account_id`, but that column is on `property_owners`. The `property_owners` table also has `charges_enabled` directly, no need for `stripe.accounts` join.
- **Fix:** Wrote migration targeting `property_owners` first, then syncing to `users` via join
- **Files modified:** supabase/migrations/20260304170000_onboarding_backfill.sql
- **Verification:** `supabase db push --dry-run` succeeded
- **Committed in:** 265673cac

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Corrected table reference for schema accuracy. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2 (Financial Fixes) is now complete — all 5 execution plans plus 1 diagnostic plan done
- CLAUDE.md fully documents Phase 2 conventions for all future phases
- Ready to proceed to Phase 3

---
*Phase: 02-financial-fixes*
*Completed: 2026-03-04*
