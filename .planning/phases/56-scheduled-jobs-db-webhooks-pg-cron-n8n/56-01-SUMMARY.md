---
phase: 56-scheduled-jobs-db-webhooks-pg-cron-n8n
plan: 01
subsystem: database
tags: [pg_cron, postgres, migrations, rls, late-fees, lease-reminders, check-constraints]

# Dependency graph
requires:
  - phase: 51-54-various
    provides: leases and rent_payments tables with existing CHECK constraints
provides:
  - pg_cron extension enabled in Supabase extensions schema
  - leases.lease_status_check constraint expanded to include 'expired'
  - rent_payments.status_check constraint expanded to include 'late' and 'severely_delinquent'
  - late_fees table with RLS (2 SELECT policies) and unique index on (rent_payment_id, assessed_date)
  - lease_reminders table with RLS (1 SELECT policy) and UNIQUE(lease_id, reminder_type)
affects:
  - 56-02 (pg_cron functions — depends on these tables and constraints)
  - 56-03 (DB Webhooks — depends on lease_reminders table for INSERT trigger)

# Tech tracking
tech-stack:
  added: [pg_cron]
  patterns:
    - pg_cron enabled in extensions schema (Supabase requirement)
    - SECURITY DEFINER function pattern for pg_cron write access (bypasses RLS for INSERT)
    - INSERT ... ON CONFLICT DO NOTHING idempotency via UNIQUE constraint

key-files:
  created:
    - supabase/migrations/20260222110100_phase56_schema_foundations.sql
  modified: []

key-decisions:
  - "rent_payments_status_check preserves all existing values (pending, processing, succeeded, failed, cancelled, requires_action) — the plan spec said 'canceled' but actual DB uses 'cancelled' with double-l; kept consistent with existing constraint"
  - "Used gen_random_uuid() instead of extensions.uuid_generate_v4() — project-wide convention from Phase 52+ migrations"
  - "late status threshold: day 4+ (>3 days grace period); severely_delinquent: day 15+ (>14 days past due)"
  - "No INSERT/UPDATE/DELETE RLS policies for authenticated users on either new table — pg_cron SECURITY DEFINER function is the exclusive writer; plan-specified SECURITY DEFINER pattern means RLS is bypassed at write time"
  - "Added idx_late_fees_lease_id index (not in plan spec) for owner billing view queries — Rule 2 Missing Critical: would cause table scans on owner late-fee lookups"

patterns-established:
  - "pg_cron write path: SECURITY DEFINER Postgres function → bypasses RLS → inserts fee/reminder rows; authenticated users get SELECT-only RLS policies"
  - "Idempotency via UNIQUE constraint + ON CONFLICT DO NOTHING (lease_reminders) and unique index (late_fees) ensures cron re-runs are safe"

requirements-completed:
  - SCHED-01
  - SCHED-02
  - SCHED-03

# Metrics
duration: 12min
completed: 2026-02-22
---

# Phase 56 Plan 01: Schema Foundations Summary

**pg_cron enabled + late_fees and lease_reminders tables created with RLS, plus leases and rent_payments CHECK constraints expanded for scheduled-job status values**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-22T11:00:00Z
- **Completed:** 2026-02-22T11:12:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created migration `20260222110100_phase56_schema_foundations.sql` covering all Phase 56 schema prerequisites
- Enabled pg_cron extension in the Supabase `extensions` schema (required for scheduled SQL jobs)
- Expanded `leases.lease_status_check` to allow `'expired'` — enables nightly job to mark past-end-date leases
- Expanded `rent_payments.status_check` to allow `'late'` and `'severely_delinquent'` — enables daily late-fee job to escalate payment status
- Created `late_fees` table with unique index on `(rent_payment_id, assessed_date)` preventing duplicate daily fee records; RLS with 2 SELECT policies (owners + tenants)
- Created `lease_reminders` table with `UNIQUE(lease_id, reminder_type)` as idempotency guard for DB Webhook trigger; RLS with 1 SELECT policy (owners only)

## Task Commits

Each task was committed atomically:

1. **Task 1: Enable pg_cron + expand status CHECK constraints + create late_fees and lease_reminders tables** - `3bd220af9` (feat)

## Files Created/Modified

- `supabase/migrations/20260222110100_phase56_schema_foundations.sql` - Full schema foundations: pg_cron, constraint expansions, two new tables with RLS

## Decisions Made

- **Preserved actual constraint values for rent_payments**: The plan spec listed `'canceled'` (single-l) but the existing DB constraint from `20251231081143_migrate_enums_to_text_constraints.sql` uses `'cancelled'` (double-l) plus `'requires_action'`. The migration preserves all existing values and adds only the two new ones.
- **Used `gen_random_uuid()` instead of `extensions.uuid_generate_v4()`**: Project convention from Phase 52+ migrations uses `gen_random_uuid()`. Plan spec said `extensions.uuid_generate_v4()` — corrected to match codebase standard.
- **Added `idx_late_fees_lease_id` index**: Plan spec only included `idx_late_fees_rent_payment_id`. The owner RLS policy joins through `lease_id` — without an index, every owner SELECT would full-scan `late_fees`. Added as Rule 2 (Missing Critical).
- **No INSERT/UPDATE/DELETE policies**: Confirmed with plan spec that pg_cron SECURITY DEFINER functions bypass RLS — no authenticated user policies needed for writes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added idx_late_fees_lease_id index**
- **Found during:** Task 1 (late_fees table creation)
- **Issue:** The `late_fees` owner RLS policy uses `lease_id in (select id from leases where property_owner_id = ...)`. Without an index on `late_fees.lease_id`, every authenticated owner SELECT would full-scan the table.
- **Fix:** Added `create index if not exists idx_late_fees_lease_id on public.late_fees using btree (lease_id)`
- **Files modified:** `supabase/migrations/20260222110100_phase56_schema_foundations.sql`
- **Verification:** Index definition present in migration; follows same pattern as `idx_late_fees_rent_payment_id`
- **Committed in:** `3bd220af9` (part of task commit)

**2. [Rule 1 - Bug] Corrected rent_payments constraint to preserve existing values**
- **Found during:** Task 1 (constraint expansion)
- **Issue:** Plan spec listed the existing values as `pending, processing, succeeded, failed, canceled` but actual constraint (from `20251231081143`) is `pending, processing, succeeded, failed, cancelled, requires_action` (double-l canceled, plus requires_action). Using the plan's values would have silently dropped `requires_action` from valid statuses.
- **Fix:** Preserved all 6 existing values and added 2 new ones (`late`, `severely_delinquent`)
- **Files modified:** `supabase/migrations/20260222110100_phase56_schema_foundations.sql`
- **Verification:** Constraint in migration contains all 8 values including pre-existing `requires_action`
- **Committed in:** `3bd220af9` (part of task commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug fix)
**Impact on plan:** Both auto-fixes necessary for correctness and performance. No scope creep — both additions serve the same schema foundation purpose.

## Issues Encountered

None — migration created cleanly. Pre-commit hook ran DB type regeneration, linting, typecheck, and all unit tests (13 tasks, 17.6s) — all passed.

## User Setup Required

None - no external service configuration required for this plan. pg_cron is enabled via migration. The actual pg_cron job schedules are added in Plan 02.

## Next Phase Readiness

- Plan 02 (pg_cron functions): Schema is ready. The `late_fees` table, `lease_reminders` table, and expanded CHECK constraints are in place. Plan 02 can create `SECURITY DEFINER` Postgres functions and register `cron.schedule()` entries.
- Plan 03 (DB Webhooks): `lease_reminders` INSERT trigger target is ready. DB Webhook can be configured to POST to n8n on `lease_reminders` INSERT.

---
*Phase: 56-scheduled-jobs-db-webhooks-pg-cron-n8n*
*Completed: 2026-02-22*
