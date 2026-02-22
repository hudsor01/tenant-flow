---
phase: 56-scheduled-jobs-db-webhooks-pg-cron-n8n
plan: 03
subsystem: database
tags: [pg_net, postgresql, triggers, n8n, webhooks, rent-payments, maintenance-requests, lease-reminders]

# Dependency graph
requires:
  - phase: 56-01
    provides: late_fees and lease_reminders tables created; pg_cron extension enabled
  - phase: 56-02
    provides: queue_lease_reminders() pg_cron job that inserts into lease_reminders table
provides:
  - PostgreSQL trigger functions using net.http_post() for n8n webhook delivery
  - notify_n8n_rent_payment() — rent_payments INSERT → n8n (owner notifications + receipt)
  - notify_n8n_maintenance() — maintenance_requests INSERT/UPDATE (status change only) → n8n
  - notify_n8n_lease_reminder() — lease_reminders INSERT → n8n (lease expiry emails)
  - Graceful failure pattern: all triggers skip silently if webhook URL not configured
affects:
  - phase-56-04 (n8n workflow JSON definitions that receive these webhook payloads)
  - phase-57 (NestJS cleanup — these triggers replace NestJS notification event handlers)

# Tech tracking
tech-stack:
  added: [pg_net (net.http_post), PostgreSQL trigger functions]
  patterns:
    - SECURITY DEFINER trigger function with current_setting() for secret reading
    - Fire-and-forget webhook delivery via pg_net async HTTP queue
    - Graceful null-check pattern — webhook optional, app runs without n8n configured
    - Status-change guard on UPDATE trigger — prevents spurious webhook calls

key-files:
  created:
    - supabase/migrations/20260222130000_phase56_db_webhooks.sql
    - .planning/phases/56-scheduled-jobs-db-webhooks-pg-cron-n8n/56-03-USER-SETUP.md

key-decisions:
  - "current_setting('app.settings.N8N_WEBHOOK_*', true) with true arg returns null if not set (vs error) — enables graceful skip pattern without crashing insert transactions"
  - "perform net.http_post(...) discards return value — fire-and-forget pattern; pg_net queues async HTTP delivery with its own retry mechanism"
  - "maintenance trigger uses TG_OP check before accessing OLD.status — OLD row is only valid on UPDATE, this guard prevents a runtime error if trigger fires on INSERT and tries to read OLD.status"
  - "set search_path = public, extensions on all SECURITY DEFINER functions — prevents search_path injection attacks; extensions schema required for net.http_post()"
  - "drop trigger if exists before create trigger — makes migration re-runnable (idempotent) without errors on repeated application"

patterns-established:
  - "DB Webhook pattern: SECURITY DEFINER trigger + current_setting() secrets + net.http_post() fire-and-forget + graceful null-check"
  - "Database-level secrets (not Edge Function secrets) via ALTER DATABASE postgres SET statements read via current_setting()"

requirements-completed:
  - SCHED-02
  - WF-01
  - WF-02

# Metrics
duration: 2min
completed: 2026-02-22
---

# Phase 56 Plan 03: DB Webhook Triggers Summary

**Three SECURITY DEFINER PostgreSQL trigger functions using net.http_post() (pg_net) to fire n8n webhooks on rent_payments INSERT, maintenance_requests INSERT/UPDATE (status-change guard), and lease_reminders INSERT — all with shared-secret Authorization header and graceful null-check for unconfigured environments.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-22T17:46:29Z
- **Completed:** 2026-02-22T17:48:23Z
- **Tasks:** 1
- **Files modified:** 1 migration file created

## Accomplishments

- `notify_n8n_rent_payment()`: trigger function fires on rent_payments INSERT, POSTs full row to n8n as `{type:'INSERT', table:'rent_payments', record:{...}}` with Authorization Bearer header
- `notify_n8n_maintenance()`: trigger function fires on maintenance_requests INSERT/UPDATE with status-change guard (`if tg_op = 'UPDATE' and old.status = new.status then return new`) — prevents spurious webhook calls on unrelated field edits
- `notify_n8n_lease_reminder()`: trigger function fires on lease_reminders INSERT (populated by pg_cron `queue_lease_reminders()` job from Plan 02), enabling lease expiry notification emails via n8n
- All three functions use `SECURITY DEFINER set search_path = public, extensions`, `current_setting('app.settings.*', true)` for secrets, and graceful null-check pattern
- `create extension if not exists pg_net with schema extensions` safety guard at top of migration

## Task Commits

Each task was committed atomically:

1. **Task 1: Create DB webhook trigger functions + triggers for all three channels** - `be6faac8e` (feat)

**Plan metadata:** (committed with docs commit below)

## Files Created/Modified

- `supabase/migrations/20260222130000_phase56_db_webhooks.sql` — Three trigger functions (notify_n8n_rent_payment, notify_n8n_maintenance, notify_n8n_lease_reminder) and three triggers on rent_payments, maintenance_requests, lease_reminders tables
- `.planning/phases/56-scheduled-jobs-db-webhooks-pg-cron-n8n/56-03-USER-SETUP.md` — n8n webhook URL + shared secret configuration guide (ALTER DATABASE postgres SET statements)

## Decisions Made

- `current_setting('app.settings.N8N_WEBHOOK_*', true)` with `true` arg returns null if not set (instead of raising an error). This is the key mechanism that enables the graceful skip pattern — if the webhook URL is not configured, the trigger simply returns `new` without blocking the INSERT transaction.
- `perform net.http_post(...)` discards the return value (pg_net returns a `bigint` request ID). Using `perform` makes this fire-and-forget — the trigger does not wait for the HTTP response. pg_net's internal async queue handles delivery and retries.
- The `TG_OP = 'UPDATE'` check before accessing `old.status` is required because `OLD` is only available in UPDATE context. Without this guard, an INSERT-triggered call would error when accessing `old.status`.
- `set search_path = public, extensions` on all SECURITY DEFINER functions: the `extensions` schema is required to access `net.http_post()` (pg_net lives in the extensions schema). This also prevents search_path injection attacks.
- `drop trigger if exists` before each `create trigger` makes the migration idempotent — it can be applied multiple times without error (useful during development and in CI reset scenarios).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. All pre-commit checks passed (DB types regeneration, lint, typecheck, unit tests).

## User Setup Required

**External services require manual configuration.** See [56-03-USER-SETUP.md](./56-03-USER-SETUP.md) for:
- Four `ALTER DATABASE postgres SET` statements to configure webhook URLs and shared secret
- n8n Webhook Trigger node configuration for each of the three workflows
- Verification SQL to confirm settings were applied

Note: The application runs normally without these configured. The trigger functions gracefully skip webhook delivery when URLs are not set.

## Next Phase Readiness

- DB Webhook trigger layer is complete — all three channels (rent_payments, maintenance_requests, lease_reminders) will fire webhook POSTs to n8n when configured
- Ready for Phase 56 Plan 04: n8n workflow JSON definitions that receive these webhook payloads and implement the notification logic
- WF-01 (rent payment notifications), WF-02 (maintenance request notifications), SCHED-02 (lease reminder delivery) requirements all completed

---
*Phase: 56-scheduled-jobs-db-webhooks-pg-cron-n8n*
*Completed: 2026-02-22*
