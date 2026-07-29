---
phase: 53-renewal-reminder-delivery
plan: 01
subsystem: database
tags: [postgres, migration, pg_cron, lease-reminders, delivery-state, resend, notifications, app_config, rls]

# Dependency graph
requires:
  - phase: 52-notification-system
    provides: create_notification single-writer RPC + notifications_notification_type_check (extended here)
provides:
  - lease_reminders delivery-state model (delivery_status/delivered_at/resend_message_id/attempt_count + partial pending index)
  - notifications_notification_type_check extended with 'lease_renewal_reminder' (drainer in-app write cannot raise 23514)
  - app_config default-OFF kill-flag reminders_delivery_enabled='false' + empty drain_url/drain_secret/sentry keys
  - claim_lease_reminders(int) service-role-only FOR UPDATE SKIP LOCKED exactly-once claim RPC
affects: [53-02 send-lease-reminders drainer, 53-03 drain cron, 53-04 go-flip migration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "text + CHECK delivery-state column (no ENUM, CLAUDE.md rule 6) mirroring email_deliverability"
    - "idempotent constraint drop-if-exists -> re-add for notification_type CHECK extension"
    - "app_config ON CONFLICT (key) DO NOTHING seed for a default-OFF feature flag"
    - "SECURITY DEFINER + set search_path=public FOR UPDATE SKIP LOCKED single-statement claim RPC, service_role-only"

key-files:
  created:
    - supabase/migrations/20260721120000_lease_reminders_delivery_state.sql
  modified: []

key-decisions:
  - "delivery_status CHECK includes 6 values ('pending','claimed','sent','suppressed','failed','expired') — 'claimed' is the interim state the claim RPC sets, so a crashed drain run's rows stay visible for retry"
  - "notification type literal is 'lease_renewal_reminder' (per PLAN interfaces + Plan 02 TYPE_VISUALS contract), not the RESEARCH placeholder 'lease_reminder'"
  - "Idempotent add-column-if-not-exists + drop-constraint-if-exists throughout so the migration is re-runnable"

patterns-established:
  - "Pattern: delivery-state model on a queue table with a partial index on the pending status for the drainer claim query"
  - "Pattern: default-OFF kill-flag seeded before its consumer exists so delivery physically cannot fire pre-go-flip"

requirements-completed: [REMIND-02, REMIND-04, REMIND-05]

# Metrics
duration: ~10min
completed: 2026-07-21
---

# Phase 53 Plan 01: Lease-Reminder Delivery-State Foundation (Migration A) Summary

**Migration A adds the delivery-state model to `lease_reminders` (delivery_status text-CHECK + delivered_at/resend_message_id/attempt_count + partial pending index), extends the notifications type CHECK with `lease_renewal_reminder`, seeds the default-OFF `reminders_delivery_enabled` kill-flag, and adds the service-role-only `claim_lease_reminders` FOR UPDATE SKIP LOCKED claim RPC — the load-bearing first step of the REMIND-04 go-live sequence.**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-07-22T00:49:41Z
- **Tasks:** 2 (Task 1 executed + committed; Task 2 prod-apply DEFERRED TO ORCHESTRATOR)
- **Files modified:** 1 created

## Accomplishments
- Authored the composite Migration A (138 lines, idempotent + re-runnable) implementing all four parts of the delivery-state foundation.
- Delivery-state columns on `lease_reminders` with a 6-value CHECK and a partial index `idx_lease_reminders_pending` for the drainer's claim query — `sent_at` (queued-time) is documented as NOT the delivery guard.
- Extended `notifications_notification_type_check` to include `'lease_renewal_reminder'` so `create_notification(...)` inside the Plan 02 drainer cannot raise `23514` and abort the claim (the Phase 52 review-C6 abort class, Pitfall 4).
- Seeded `app_config.reminders_delivery_enabled='false'` (default-OFF kill-flag) plus empty `reminders.drain_url` / `reminders.drain_secret` / `sentry.cron.send_lease_reminders_url` keys for the operator to fill; `ON CONFLICT (key) DO NOTHING` preserves operator-set values on re-run.
- Added `claim_lease_reminders(int)` — a `SECURITY DEFINER set search_path=public` single-statement `FOR UPDATE SKIP LOCKED` claim that flips `pending`→`claimed`, increments `attempt_count`, returns claimed rows, REVOKEd from public/anon/authenticated and GRANTed only to `service_role` (mitigates T-53-01 elevation).
- D-01 preserved: `queue_lease_reminders()`, the `reminder_type` CHECK, the queue cron, and the n8n trigger are untouched (the trigger drop is Migration C's job).

## Task Commits

Each task was committed atomically:

1. **Task 1: Write Migration A — delivery-state columns, notification_type CHECK extension, flag seed, claim RPC** - `e2dcc0cd6` (feat)
2. **Task 2: [BLOCKING] Apply Migration A to prod via MCP, reconcile filename, regenerate types** - DEFERRED TO ORCHESTRATOR (see below)

**Plan metadata:** committed with this SUMMARY (docs)

## Files Created/Modified
- `supabase/migrations/20260721120000_lease_reminders_delivery_state.sql` - Composite Migration A: delivery-state columns + partial pending index; notification_type CHECK extension; app_config flag/drain-key seed; `claim_lease_reminders` RPC. Placeholder-dated filename (`20260721120000`) — the orchestrator reconciles it to the prod-assigned timestamp after MCP apply.

## Automated Verification (Task 1)

All plan acceptance greps pass:
- `lease_reminders_delivery_status_check` present; CHECK values exactly `('pending','claimed','sent','suppressed','failed','expired')`
- partial index `idx_lease_reminders_pending ... where delivery_status = 'pending'` present
- `notifications_notification_type_check` re-added with the 9 existing values PLUS `'lease_renewal_reminder'`
- `app_config` seed uses `on conflict (key) do nothing` and seeds `reminders_delivery_enabled` = `'false'` (NOT 'true')
- `claim_lease_reminders(int)` is `security definer set search_path = public`, uses `for update skip locked`, REVOKEd from public/anon/authenticated + GRANTed only to `service_role`
- File does NOT redefine `queue_lease_reminders`, the `reminder_type` CHECK, or drop the n8n trigger (D-01 / Migration C boundary)
- Lefthook pre-commit green: gitleaks, lockfile-verify, lint, typecheck, unit-tests (288 files / 106,815 tests passed, coverage over threshold).

## Decisions Made
- **delivery_status carries a 6th interim value `'claimed'`** (vs the 5-value shape sketched in RESEARCH Pattern 1). The claim RPC sets `delivery_status='claimed'` inside the FOR UPDATE SKIP LOCKED statement, so a crashed drain run leaves rows in a visible `claimed` state rather than silently back to `pending` — matches the PLAN interfaces + acceptance criteria.
- **Notification type literal = `'lease_renewal_reminder'`** (PLAN interfaces line 68-70 + acceptance criterion), overriding the RESEARCH note's placeholder `'lease_reminder'`. This value must match the drainer's `create_notification` call and `TYPE_VISUALS` in Plan 02.
- Corrected the stale `lease_reminders` table + `sent_at` column comments that still referenced the removed n8n Database Webhook hop (documentation-only, delivery is in-house now).

## Deviations from Plan

None - plan executed exactly as written for the executor-scoped work.

The single scope adjustment is orchestrator-directed, not a deviation: Task 2's prod-apply is DEFERRED TO ORCHESTRATOR (see below), per the spawn instructions (Supabase MCP tools are unavailable to executor agents; Phase 52 precedent).

## Task 2 — DEFERRED TO ORCHESTRATOR (MCP)

The [BLOCKING] prod-apply step is deferred to the orchestrator because Supabase MCP tools (`apply_migration`, `list_migrations`, `execute_sql`, `generate_typescript_types`) are unavailable to executor agents. This is NOT a failed acceptance criterion — it is deferred (Phase 52 precedent, done 5×). The executor completed the author + inspect + grep-verify + commit portion.

**Orchestrator must, after this executor returns:**
1. Apply the Migration A SQL via MCP `apply_migration`.
2. Reconcile the repo filename to the prod-assigned timestamp via MCP `list_migrations` (migration-mcp-prod-drift — the `20260721120000` prefix is a placeholder).
3. Regenerate types: `bun run db:types`; if the PAT path 401s, fall back to MCP `generate_typescript_types` and write to `src/types/supabase.ts` (must contain `delivery_status`).
4. Post-verify via MCP `execute_sql`:
   - `lease_reminders` has `delivery_status`, `delivered_at`, `resend_message_id`, `attempt_count`
   - `pg_get_constraintdef` of `notifications_notification_type_check` includes `lease_renewal_reminder`
   - `app_config.reminders_delivery_enabled` = `'false'`
   - `claim_lease_reminders` exists; `has_function_privilege('authenticated','public.claim_lease_reminders(int)','execute')` = false
5. Record the pre-migration `lease_reminders` row count (D-06 backlog baseline) — see below.

**Backlog baseline (D-06):** the orchestrator's prod MCP check on 2026-07-21 (53-RESEARCH.md line 585) found `lease_reminders` = **0 rows**. The storm risk is LATENT (the `queue-lease-reminders` cron `0 6 * * *` will accumulate rows between deploy and go-live), not current. The executor cannot query prod; the authoritative apply-time count is the orchestrator's re-check at apply. Migration A does not itself COUNT — the backlog COUNT + expire is Migration C's (Plan 04) job.

**Note on typecheck being green without apply:** typecheck passes now because `src/types/supabase.ts` is static and does not yet reflect the new columns — this is expected and is why skipping the prod-apply as "verified" would be a false positive. Types regen is part of the deferred orchestrator step.

## Issues Encountered
- First two commit attempts were rejected by commitlint `body-max-line-length` (100 chars). Resolved by shortening the commit-body bullet lines; no `--no-verify`, hooks fully honored.

## User Setup Required
None in this plan. Operator-run residuals surface in later plans: filling `app_config.reminders.drain_url` / `reminders.drain_secret` + the Supabase `REMINDERS_INVOKE_SECRET` function secret (Plan 02/03 runbook), and the `reminders_delivery_enabled` flip (Migration C, Plan 04).

## Next Phase Readiness
- The delivery-state contract, the extended type CHECK, the default-OFF flag, and the service-role claim RPC are authored and committed — Plan 02 (the `send-lease-reminders` drainer) can build against `claim_lease_reminders` + `delivery_status` + the `lease_renewal_reminder` type + the `reminders_delivery_enabled` early-return.
- **Blocker for downstream runtime:** Migration A must be APPLIED to prod (orchestrator MCP step above) before the Plan 02 drainer can run against it — but Plan 02 authoring can proceed against the committed contract.

## Self-Check: PASSED

- FOUND: `supabase/migrations/20260721120000_lease_reminders_delivery_state.sql`
- FOUND: commit `e2dcc0cd6` (Task 1)

---
*Phase: 53-renewal-reminder-delivery*
*Completed: 2026-07-21*
