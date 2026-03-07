---
phase: 06-database-schema-migrations
verified: 2026-03-06T04:30:00Z
status: human_needed
score: 13/13 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 11/13
  gaps_closed:
    - "RLS integration tests for activity, documents, and GDPR anonymization are implemented (not just stubs)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Verify cron jobs are active in the live database"
    expected: "SELECT jobname, schedule FROM cron.job ORDER BY jobname shows: check-cron-health (0 * * * *), cleanup-errors (15 3 * * *), cleanup-security-events (0 3 * * *), cleanup-webhook-events (30 3 * * *), expire-leases (0 23 * * *), process-account-deletions (45 3 * * *)"
    why_human: "cron.schedule() is executed at migration time against live DB -- file presence does not confirm application"
  - test: "Verify schema constraints exist in live DB"
    expected: "activity.user_id is NOT NULL, documents.owner_user_id exists, inspection_photos.updated_at exists, blogs.author_user_id exists, update_updated_at_column() function is gone"
    why_human: "Schema changes require DB query to confirm migration was applied"
  - test: "Verify expire_leases() function executes correctly"
    expected: "SELECT public.expire_leases() succeeds, updates leases with lease_status='active' and end_date < current_date to 'expired', inserts notification for owner"
    why_human: "Function behavior requires live DB execution to confirm"
  - test: "Verify anonymize_deleted_user() handles tenant deletion correctly"
    expected: "Function replaces PII with [deleted user] placeholders, nulls personal fields, preserves rent_payments"
    why_human: "GDPR function behavior requires live execution -- integration tests verify RPC accessibility and input validation but not full anonymization path on a real user"
---

# Phase 6: Database Schema & Migrations Verification Report

**Phase Goal:** All tables have correct constraints, FK relationships, and operational maintenance jobs
**Verified:** 2026-03-06T04:30:00Z
**Status:** human_needed
**Re-verification:** Yes -- after gap closure (plans 06-05 and 06-06)

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `activity.user_id` is NOT NULL with FK constraint; `documents` has `owner_user_id` with authenticated RLS policies | VERIFIED (migration + tests) | Migration 20260306130000 adds NOT NULL + FK; Migration 20260306140000 adds owner_user_id + 4 RLS policies. Tests: activity.rls.test.ts (3 assertions), documents.rls.test.ts (4 assertions + 1 skip). Commits 87863a67e, 101558a9b |
| 2 | `leases` has a single owner column (not dual `property_owner_id` + `owner_user_id`) | VERIFIED (migration) | Migration 20260306150000 rewrites 3 RPCs to use owner_user_id and verifies via DO block. 269 lines |
| 3 | `expire-leases` cron uses a named function with `FOR UPDATE SKIP LOCKED` and error handling | VERIFIED | Migration 20260306160000: `expire_leases()` with `security definer`, `set search_path = public`, `for update skip locked`, owner notification INSERT, and `cron.schedule('expire-leases', '0 23 * * *', ...)` |
| 4 | Cleanup cron jobs scheduled for `security_events`, `errors`, and `stripe_webhook_events` | VERIFIED (migration) | Migration 20260306170000: cron.schedule() calls at 3:00, 3:15, 3:30 AM UTC. Archive-then-delete pattern with LIMIT 10000 + FOR UPDATE SKIP LOCKED confirmed. 363 lines |
| 5 | All cron jobs have Sentry monitoring for failure detection | VERIFIED (migration) | `check_cron_health()` function queries `cron.job_run_details` for failures, inserts into `user_errors` (Sentry pickup), calls `pg_notify('cron_failure', ...)`. Scheduled hourly via `cron.schedule('check-cron-health', '0 * * * *', ...)` |

**Additional truths verified (from requirements not in success criteria):**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | `inspection_photos` has `updated_at` column with `set_updated_at()` trigger (DB-10) | VERIFIED (migration) | Migration 20260306130000 |
| 7 | `blogs` has `author_user_id` column with FK to auth.users (DB-11) | VERIFIED (migration) | Migration 20260306130000 |
| 8 | `update_updated_at_column()` consolidated into `set_updated_at()` (DB-12) | VERIFIED (migration) | Migration 20260306120000 with dynamic DO block + DROP FUNCTION |
| 9 | GDPR anonymization cascade implemented (DB-04) | VERIFIED (migration + tests) | Migration 20260306180000: 4 functions + deletion_requested_at column + cron schedule. Tests: gdpr-anonymize.test.ts (5 assertions). Commit c7056dcbb |
| 10 | Archive tables with service_role-only RLS (DB-06, DB-07, DB-09) | VERIFIED (migration) | Migration 20260306170000: 3 archive tables with RLS enabled and service_role-only policies |
| 11 | CLAUDE.md documents Phase 6 conventions (DOC-01) | VERIFIED | Schema Conventions (line 112), Cron Jobs table (line 122), GDPR Patterns (line 145), Data Retention (line 153) all present |
| 12 | RLS integration tests for activity table implemented | VERIFIED | activity.rls.test.ts: 85 lines, 3 real assertions, 0 it.todo() |
| 13 | RLS integration tests for documents table implemented | VERIFIED | documents.rls.test.ts: 145 lines, 4 real assertions + 1 it.skip (tenant credentials), 0 it.todo() |

**Score:** 13/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260306120000_consolidate_trigger_functions.sql` | Trigger dedup | VERIFIED | 94 lines, dynamic DO block + DROP FUNCTION |
| `supabase/migrations/20260306130000_schema_constraints.sql` | activity NOT NULL, inspection_photos updated_at, blogs author | VERIFIED | 105 lines, all 3 schema changes |
| `supabase/migrations/20260306140000_documents_owner_column.sql` | documents.owner_user_id + backfill + RLS | VERIFIED | 118 lines, column + 4 UPDATE backfills + index + 4 RLS policies |
| `supabase/migrations/20260306150000_leases_drop_property_owner_id.sql` | Rewrite RPCs to use owner_user_id | VERIFIED | 269 lines, 3 CREATE OR REPLACE + DO block safety check |
| `supabase/migrations/20260306160000_expire_leases_function.sql` | expire_leases() + cron schedule | VERIFIED | 82 lines, SECURITY DEFINER + FOR UPDATE SKIP LOCKED + notifications |
| `supabase/migrations/20260306170000_cleanup_cron_scheduling.sql` | Archive tables, cleanup functions, cron scheduling | VERIFIED | 363 lines, 3 archive tables, 3 cleanup functions, check_cron_health, 4 cron schedules. DROP FUNCTION fix applied (commit c7056dcbb) |
| `supabase/migrations/20260306180000_gdpr_anonymize_cascade.sql` | GDPR anonymization functions + cron | VERIFIED | 264 lines, deletion_requested_at column, 4 functions, cron schedule |
| `tests/integration/rls/activity.rls.test.ts` | 3 real RLS assertions | VERIFIED | 85 lines, 0 it.todo(), queries activity table with authenticated clients |
| `tests/integration/rls/documents.rls.test.ts` | 5 real RLS assertions | VERIFIED | 145 lines, 0 it.todo(), 1 it.skip (tenant creds), queries documents table with authenticated clients |
| `tests/integration/rls/gdpr-anonymize.test.ts` | 5 real GDPR assertions | VERIFIED | 153 lines, 0 it.todo(), calls request/cancel/anonymize RPCs with authenticated client |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `expire_leases()` | `notifications` table | INSERT on lease expiry | WIRED | `insert into public.notifications (user_id, notification_type, ...)` confirmed |
| `check_cron_health()` | `cron.job_run_details` | Query for failed jobs | WIRED | `from cron.job_run_details d` + `d.status = 'failed'` + insert into user_errors confirmed |
| Documents RLS policies | `documents.owner_user_id` | Direct `auth.uid() = owner_user_id` | WIRED | All 4 policies use direct column check |
| Leases RPCs | `leases.owner_user_id` | CREATE OR REPLACE FUNCTION | WIRED | All 3 rewritten functions use `l.owner_user_id = p_user_id` |
| `anonymize_deleted_user()` | tenants/activity/users | UPDATE with PII placeholders | WIRED | `[deleted user activity]`, `[deleted user]`, null for PII fields |
| `process_account_deletions()` | `anonymize_deleted_user()` | PERFORM call in FOR loop | WIRED | `perform public.anonymize_deleted_user(v_user.id)` |
| `activity.rls.test.ts` | activity table | PostgREST queries | WIRED | 4 `.from('activity')` calls confirmed |
| `documents.rls.test.ts` | documents table | PostgREST queries | WIRED | `.from('documents')` calls confirmed |
| `gdpr-anonymize.test.ts` | GDPR RPCs | supabase.rpc() calls | WIRED | 3x `rpc('request_account_deletion')`, 4x `rpc('cancel_account_deletion')`, 2x `rpc('anonymize_deleted_user', ...)` |
| `gdpr-anonymize.test.ts` | users.deletion_requested_at | PostgREST SELECT | WIRED | `.select('deletion_requested_at')` on users table (lines 35, 55, 67, 88) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DB-01 | 06-00, 06-01, 06-05 | activity.user_id NOT NULL + FK constraint | SATISFIED | Migration 20260306130000 + activity.rls.test.ts (3 assertions) |
| DB-02 | 06-00, 06-02, 06-05 | documents.owner_user_id + authenticated RLS | SATISFIED | Migration 20260306140000 + documents.rls.test.ts (4 assertions + 1 skip) |
| DB-03 | 06-02 | leases single owner column (property_owner_id dropped) | SATISFIED | Migration 20260306150000 |
| DB-04 | 06-00, 06-04, 06-06 | GDPR soft-delete cascade on users | SATISFIED | Migration 20260306180000 + gdpr-anonymize.test.ts (5 assertions) |
| DB-05 | 06-03 | expire-leases as named function with FOR UPDATE SKIP LOCKED | SATISFIED | Migration 20260306160000 |
| DB-06 | 06-03 | cleanup_old_security_events cron job | SATISFIED | Migration 20260306170000: cron.schedule at 0 3 * * * |
| DB-07 | 06-03 | cleanup_old_errors cron job | SATISFIED | Migration 20260306170000: cron.schedule at 15 3 * * * |
| DB-08 | 06-03 | Cron job Sentry monitoring | SATISFIED | check_cron_health() covers all cron jobs via cron.job_run_details |
| DB-09 | 06-03 | stripe_webhook_events retention policy | SATISFIED | cleanup_old_webhook_events() with tiered retention (90d/180d) |
| DB-10 | 06-01 | inspection_photos gets updated_at + trigger | SATISFIED | Migration 20260306130000 |
| DB-11 | 06-01 | blogs gets author_user_id column | SATISFIED | Migration 20260306130000 |
| DB-12 | 06-01 | update_updated_at_column consolidated with set_updated_at | SATISFIED | Migration 20260306120000 |
| DOC-01 | 06-04 | CLAUDE.md updated to reflect current codebase state | SATISFIED | Schema Conventions, Cron Jobs, GDPR Patterns, Data Retention all verified |

No orphaned requirements found. All 13 IDs from REQUIREMENTS.md are claimed by at least one plan and all are SATISFIED.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `tests/integration/rls/activity.rls.test.ts` | 73 | `null as unknown as string` | Info | Intentional -- deliberately tests NOT NULL constraint. Documented in plan 06-05 |
| `tests/integration/rls/documents.rls.test.ts` | 133 | `it.skip` (1 test) | Info | Expected -- tenant document access test requires E2E_TENANT env vars not in test environment |

No blockers. No warnings. Both items are documented and intentional.

### Human Verification Required

#### 1. Confirm Migrations Applied to Live Database

**Test:** Run `SELECT jobname, schedule FROM cron.job ORDER BY jobname` against the live Supabase DB
**Expected:** Results include: `check-cron-health` (0 * * * *), `cleanup-errors` (15 3 * * *), `cleanup-security-events` (0 3 * * *), `cleanup-webhook-events` (30 3 * * *), `expire-leases` (0 23 * * *), `process-account-deletions` (45 3 * * *)
**Why human:** `cron.schedule()` is executed at migration time against the live DB. File presence does not confirm application.

#### 2. Verify Schema Constraints Active

**Test:** Run these queries against live DB:
- `SELECT proname FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronamespace = 'public'::regnamespace` -- expected: 0 rows (DB-12)
- `SELECT is_nullable FROM information_schema.columns WHERE table_name = 'activity' AND column_name = 'user_id'` -- expected: NO (DB-01)
- `SELECT column_name FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'owner_user_id'` -- expected: 1 row (DB-02)
- `SELECT column_name FROM information_schema.columns WHERE table_name = 'inspection_photos' AND column_name = 'updated_at'` -- expected: 1 row (DB-10)
- `SELECT column_name FROM information_schema.columns WHERE table_name = 'blogs' AND column_name = 'author_user_id'` -- expected: 1 row (DB-11)
**Why human:** Schema changes require live DB query to confirm they were applied.

#### 3. Test expire_leases() Function Execution

**Test:** Run `SELECT public.expire_leases()` against a test environment with a lease where `lease_status='active'` and `end_date < current_date`
**Expected:** Lease status changes to 'expired'; notification inserted for owner with `notification_type='lease'`
**Why human:** Function behavior (notifications INSERT, CHECK constraint compliance) requires live DB execution.

#### 4. Test GDPR anonymize_deleted_user() Function

**Test:** Create a disposable test tenant user, call `SELECT public.anonymize_deleted_user('<user_id>')`, verify PII replaced
**Expected:** `users.full_name = '[deleted user]'`, PII fields nulled, rent_payments untouched
**Why human:** GDPR function correctness requires live execution. Integration tests verify RPC accessibility and input validation but cannot safely anonymize a real test account.

### Re-verification: Gap Closure Status

**Previous verification:** gaps_found (11/13)
**Current verification:** human_needed (13/13)

**Gap 1: RLS integration tests for activity, documents, GDPR -- CLOSED**

Plan 06-05 replaced all 8 `it.todo()` stubs in activity.rls.test.ts (3 tests) and documents.rls.test.ts (5 tests, 1 skipped for tenant creds) with real PostgREST assertions. Commits: 87863a67e, 101558a9b.

Plan 06-06 replaced all 5 `it.todo()` stubs in gdpr-anonymize.test.ts with real RPC assertions testing request/cancel lifecycle, input validation, financial record preservation, and active-lease blocking. Commit: c7056dcbb.

Total: 0 `it.todo()` remaining across all 3 files. 12 real assertions + 1 `it.skip` (documented).

**Gap 2: Cron jobs live in database -- RECLASSIFIED as human_needed (not gap)**

This was always a human verification item, not a code gap. Migration files are correct and complete (6 cron.schedule() calls confirmed in Phase 6 migrations). The 06-06 SUMMARY confirms `supabase db push` was executed to apply migrations. Human verification of live DB state is still recommended but no code changes are needed.

**Regressions:** None detected. All previously-passing items still pass quick regression checks.

---

_Verified: 2026-03-06T04:30:00Z_
_Verifier: Claude (gsd-verifier)_
