---
phase: 56-scheduled-jobs-db-webhooks-pg-cron-n8n
plan: 02
subsystem: database
tags: [pg_cron, postgres, migrations, late-fees, lease-reminders, security-definer, scheduled-jobs]

# Dependency graph
requires:
  - phase: 56-01
    provides: pg_cron enabled, late_fees + lease_reminders tables with RLS, expanded CHECK constraints on leases and rent_payments
provides:
  - calculate_late_fees() SECURITY DEFINER function: assesses $50/day after 3-day grace period, FOR UPDATE SKIP LOCKED, status escalation late/severely_delinquent
  - queue_lease_reminders() SECURITY DEFINER function: inserts 30_days/7_days/1_day reminders with ON CONFLICT DO NOTHING idempotency
  - Three pg_cron schedules: calculate-late-fees (00:01 UTC), queue-lease-reminders (06:00 UTC), expire-leases (23:00 UTC)
affects:
  - 56-03 (DB Webhooks — depends on lease_reminders INSERT trigger being fired by queue_lease_reminders)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SECURITY DEFINER + set search_path = public for all pg_cron functions (RLS bypass + injection prevention)
    - FOR UPDATE SKIP LOCKED on rent_payments for row-contention-safe cron loops
    - cron.schedule() idempotency — same job name replaces existing schedule, no prior unschedule() needed
    - Direct SQL cron command for simple UPDATE jobs (expire-leases) — no function wrapper needed

key-files:
  created:
    - supabase/migrations/20260222120000_phase56_pg_cron_jobs.sql
  modified: []

key-decisions:
  - "expire-leases registered as direct SQL cron command (no function wrapper) — the UPDATE is simple enough that a SECURITY DEFINER wrapper adds complexity without value"
  - "Separate IF checks per reminder threshold (not CASE/ELSIF) — allows future runs where multiple thresholds match simultaneously without logic short-circuiting"
  - "status IN ('pending', 'late', 'severely_delinquent') in calculate_late_fees — severely_delinquent payments continue accumulating fees daily until resolved (CONTEXT.md locked decision)"
  - "v_payment.status != v_new_status guard before UPDATE — avoids unnecessary writes when status is already correct"

patterns-established:
  - "pg_cron SECURITY DEFINER pattern: all scheduled write functions use security definer + set search_path = public"
  - "Idempotency via unique index (late_fees) + ON CONFLICT DO NOTHING: cron re-runs are completely safe"
  - "Direct SQL command for simple cron jobs (expire-leases), function wrapper only when loop/conditional logic is needed"

requirements-completed:
  - SCHED-01
  - SCHED-02
  - SCHED-03

# Metrics
duration: 5min
completed: 2026-02-22
---

# Phase 56 Plan 02: pg_cron SECURITY DEFINER Functions and Job Schedules Summary

**Three pg_cron jobs scheduled — calculate_late_fees() with $50/day accumulation and status escalation, queue_lease_reminders() with ON CONFLICT DO NOTHING idempotency for 30/7/1-day thresholds, and expire-leases direct SQL UPDATE — all registered via cron.schedule()**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-22T17:37:51Z
- **Completed:** 2026-02-22T17:43:17Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `calculate_late_fees()` SECURITY DEFINER function: loops over overdue payments with `FOR UPDATE SKIP LOCKED`, inserts $50 fee record daily after 3-day grace period, escalates status to `late` (4-14 days) or `severely_delinquent` (>14 days), idempotent via unique index on `(rent_payment_id, assessed_date)`
- Created `queue_lease_reminders()` SECURITY DEFINER function: inserts `lease_reminders` rows for active leases expiring in exactly 30, 7, or 1 day using `ON CONFLICT (lease_id, reminder_type) DO NOTHING` — completely safe to re-run
- Registered all three cron schedules: `calculate-late-fees` (1 0 * * *), `queue-lease-reminders` (0 6 * * *), `expire-leases` (0 23 * * *)
- `expire-leases` uses direct SQL command (`UPDATE public.leases SET lease_status='expired'`) — no function wrapper needed for this simple job

## Task Commits

Each task was committed atomically:

1. **Task 1: Create calculate_late_fees(), queue_lease_reminders(), and register all three cron schedules** - `55586f3c6` (feat)

## Files Created/Modified

- `supabase/migrations/20260222120000_phase56_pg_cron_jobs.sql` - Three pg_cron SECURITY DEFINER functions + cron.schedule() registrations for all Phase 56 scheduled jobs

## Decisions Made

- **Direct SQL for expire-leases**: The nightly lease expiry is a simple `UPDATE ... WHERE end_date < current_date AND lease_status = 'active'`. Per CONTEXT.md, no function wrapper is needed. The `cron.schedule()` inline SQL handles this cleanly.
- **Separate IF checks in queue_lease_reminders**: Used three independent `if v_days_until_expiry = N then` blocks instead of `CASE`/`ELSIF` — in theory a lease could match multiple thresholds (e.g., if the function was missed a day), and independent checks ensure all matching thresholds get queued in one run.
- **v_payment.status != v_new_status guard**: Before updating `rent_payments.status`, we check if it actually changed. This avoids unnecessary UPDATE writes when the payment is already `late` and the threshold remains `>3 days but <=14`.
- **status IN includes severely_delinquent**: Fees continue to accumulate daily even on `severely_delinquent` payments until resolved — this is the explicit CONTEXT.md locked decision for maximum fee pressure.

## Deviations from Plan

None — plan executed exactly as written. All four code blocks from the plan spec were implemented verbatim; comments and structure match plan exactly.

## Issues Encountered

None — migration created cleanly. Pre-commit hook ran DB type regeneration, linting, typecheck, and all unit tests (13 tasks, 17.8s) — all passed.

## User Setup Required

None - no external service configuration required. The pg_cron jobs are registered via the migration and will run on the Supabase-hosted pg_cron scheduler automatically.

## Next Phase Readiness

- Plan 03 (DB Webhooks): `lease_reminders` table is in place and the `queue_lease_reminders()` function will INSERT rows when leases are 30/7/1 day from expiry. Plan 03 can configure a Supabase DB Webhook on `lease_reminders` INSERT to POST to n8n and trigger notification workflows.
- All three Phase 56 SCHED requirements (SCHED-01, SCHED-02, SCHED-03) are now complete at the database level.

---
*Phase: 56-scheduled-jobs-db-webhooks-pg-cron-n8n*
*Completed: 2026-02-22*
