---
phase: 06-database-schema-migrations
plan: 03
subsystem: database
tags: [postgres, pg_cron, archive, monitoring, cleanup, cron]

# Dependency graph
requires:
  - phase: 06-01
    provides: "Consolidated trigger functions and schema constraints"
  - phase: 06-02
    provides: "Documents owner_user_id and leases column cleanup"
provides:
  - "expire_leases() named SECURITY DEFINER function with FOR UPDATE SKIP LOCKED"
  - "3 archive tables (security_events_archive, user_errors_archive, stripe_webhook_events_archive)"
  - "Archive-then-delete cleanup functions for all 3 event tables"
  - "cleanup_old_webhook_events() with tiered retention (90d/180d)"
  - "check_cron_health() monitoring function for all cron jobs"
  - "4 new cron jobs scheduled (cleanup-security-events, cleanup-errors, cleanup-webhook-events, check-cron-health)"
affects: [06-04, 06-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [archive-then-delete cleanup, cron health monitoring via job_run_details, batched deletes with LIMIT + FOR UPDATE SKIP LOCKED]

key-files:
  created:
    - supabase/migrations/20260306160000_expire_leases_function.sql
    - supabase/migrations/20260306170000_cleanup_cron_scheduling.sql
  modified: []

key-decisions:
  - "notification_type 'lease' used for expire notifications (valid CHECK constraint value)"
  - "user_errors.user_id left NULL for cron monitoring inserts (system-generated, not user-triggered)"
  - "cleanup_old_errors extended to 90d retention for all errors (was 30d resolved-only)"
  - "cleanup_old_security_events return type changed from void to integer for consistency"
  - "Batch size 10000 rows per cleanup execution to limit lock duration and WAL pressure"

patterns-established:
  - "Archive-then-delete: INSERT INTO archive SELECT FROM source ON CONFLICT DO NOTHING, then DELETE WHERE id IN archive"
  - "Cron monitoring: check_cron_health() queries cron.job_run_details, logs to user_errors + pg_notify"
  - "Tiered webhook retention: 90d succeeded, 180d failed (forensic analysis needs)"

requirements-completed: [DB-05, DB-06, DB-07, DB-08, DB-09]

# Metrics
duration: 10min
completed: 2026-03-06
---

# Phase 6 Plan 03: Cron Job Hardening Summary

**Named expire-leases function with locking + owner notifications, archive-then-delete cleanup for 3 event tables, and hourly cron health monitoring**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-06T01:22:38Z
- **Completed:** 2026-03-06T01:32:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced inline SQL expire-leases cron with named `expire_leases()` SECURITY DEFINER function using FOR UPDATE SKIP LOCKED and owner notification inserts
- Created 3 archive tables (security_events_archive, user_errors_archive, stripe_webhook_events_archive) with RLS and service_role-only policies
- Rewrote `cleanup_old_security_events()` and `cleanup_old_errors()` with archive-then-delete pattern and 10k row batching
- Created new `cleanup_old_webhook_events()` with tiered retention (90d succeeded, 180d failed)
- Created `check_cron_health()` monitoring function that detects failures across all cron jobs
- Scheduled 4 new cron jobs: cleanup at 3:00/3:15/3:30 AM UTC, monitoring hourly

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite expire-leases as named function** - `pending` (feat)
2. **Task 2: Schedule cleanup crons with archive-then-delete + monitoring** - `pending` (feat)

**Plan metadata:** `pending` (docs: complete plan)

## Files Created/Modified
- `supabase/migrations/20260306160000_expire_leases_function.sql` - expire_leases() function + cron reschedule
- `supabase/migrations/20260306170000_cleanup_cron_scheduling.sql` - Archive tables, cleanup functions, cron scheduling, monitoring

## Decisions Made
- Used `notification_type = 'lease'` for expire notifications (existing CHECK constraint value, not 'lease_expired' which would need constraint update)
- Left `user_id` NULL in cron monitoring error inserts (system-generated errors, not user-triggered)
- Extended `cleanup_old_errors()` retention from 30 days (resolved only) to 90 days (all errors) for better forensic coverage
- Changed `cleanup_old_security_events()` return type from void to integer for consistency with other cleanup functions
- Used batch size of 10,000 rows per cleanup execution to limit lock duration and WAL pressure

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used 'lease' instead of 'lease_expired' for notification_type**
- **Found during:** Task 1 (expire_leases function)
- **Issue:** Plan used `notification_type = 'lease_expired'` but notifications table has CHECK constraint allowing only 'maintenance', 'lease', 'payment', 'system'
- **Fix:** Used `notification_type = 'lease'` which is a valid constraint value
- **Files modified:** supabase/migrations/20260306160000_expire_leases_function.sql
- **Verification:** Matches existing CHECK constraint values
- **Committed in:** Task 1 commit

**2. [Rule 2 - Missing Critical] Changed cleanup_old_security_events return type**
- **Found during:** Task 2 (cleanup function rewrite)
- **Issue:** Original function returned void, but archive pattern needs to report archived row count for monitoring
- **Fix:** Changed return type from void to integer, returns total archived count
- **Files modified:** supabase/migrations/20260306170000_cleanup_cron_scheduling.sql
- **Verification:** Consistent with cleanup_old_errors() and cleanup_old_webhook_events() return types

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both changes necessary for correctness. No scope creep.

## Issues Encountered
- Pre-existing test failures in `properties.rls.test.ts` (owner update test) and `for-all-audit.test.ts` -- not caused by this plan's changes

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All cron infrastructure complete, ready for GDPR cascade (Plan 04) and DOC-01 (Plan 05)
- Archive tables exist for all 3 event types
- Monitoring covers all existing and new cron jobs

---
*Phase: 06-database-schema-migrations*
*Completed: 2026-03-06*
