---
phase: 52-notification-center-activity-feed-channel-honesty
plan: 02
subsystem: database
tags: [postgres, triggers, supabase, edge-functions, deno, notifications, activity-feed, rls]

# Dependency graph
requires:
  - phase: 52-01
    provides: create_notification(uuid,text,text,text,text,uuid,text) service_role RPC + notifications RLS + composite inbox index
provides:
  - notify_owner_lease_esign trigger (leases) — lease_signed + lease_executed notifications with exact UI-SPEC titles
  - notify_owner_maintenance trigger (maintenance_requests) — maintenance_created + maintenance_status notifications (status-distinct guard)
  - notifyFinalizeFailed() edge-fn helper wired at all 5 finalize failure exits — lease_finalize_failed notification
  - activity audit triggers on properties/leases/documents/maintenance_requests (ACT-01 write-path, non-empty dashboard timeline)
  - dual-client RLS assertion that a maintenance INSERT fires create_notification
affects: [52-05 notification item icon mapping, notification-center UI plans, activity-feed dashboard card]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Event-driven notifications via SECURITY DEFINER triggers calling the service_role create_notification RPC (perform public.create_notification)"
    - "tg_op INSERT-vs-UPDATE + status-distinct guard mirrored from notify_n8n_maintenance, but writing in-app notifications instead of net.http_post"
    - "Single shared notifyFinalizeFailed() helper invoked at every finalize failure exit so type/title/action_url never diverge; own non-throwing try/catch"
    - "activity audit triggers mirror log_lease_signature_activity — one owner-scoped row per create event"

key-files:
  created:
    - supabase/migrations/20260719130000_notification_and_activity_event_triggers.sql
  modified:
    - supabase/functions/_shared/lease-signing.ts
    - supabase/functions/tests/lease-signing-test.ts
    - tests/integration/rls/notifications.rls.test.ts

key-decisions:
  - "Finalize-failed title 'Lease signing needs attention' lives in the edge fn (lease-signing.ts), not a DB trigger — that event originates in the best-effort finalize path, not a DB column transition"
  - "activity_type 'documents' used verbatim — no DB CHECK constraint and recent_activities applies no activity_type filter, so it renders; the frontend mapper never throws on unknown types"
  - "document activity trigger guards on non-null owner_user_id (activity.user_id is NOT NULL, documents.owner_user_id is nullable)"
  - "notify_owner_lease_esign is AFTER UPDATE only (tenant signing / activation are always UPDATEs on an existing lease)"

patterns-established:
  - "Trigger-written action_url is always app-relative (/leases/... /maintenance/...) — open-redirect guard at the write source (T-52-05)"
  - "Notification title strings are load-bearing and baked into trigger SQL / edge-fn to match 52-UI-SPEC Copywriting Contract exactly"

requirements-completed: [NOTIF-04, ACT-01]

# Metrics
duration: 15min
completed: 2026-07-19
---

# Phase 52 Plan 02: Notification & Activity Event Triggers Summary

**Six DB triggers wire the D-04 event set (e-sign lifecycle + maintenance) into the create_notification write-path and populate the activity audit trail for all four create events, plus a single notifyFinalizeFailed() helper at every one of the five edge-fn finalize failure exits.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-19T19:43:00Z
- **Completed:** 2026-07-19T19:58:00Z
- **Tasks:** 3
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- `notify_owner_lease_esign` (AFTER UPDATE on leases) publishes `lease_signed` ("Tenant signed the lease") on the tenant-signature transition and `lease_executed` ("Lease fully executed") on the activation transition — both branches can fire in one UPDATE.
- `notify_owner_maintenance` (AFTER INSERT OR UPDATE on maintenance_requests) publishes `maintenance_created` ("New maintenance request") on INSERT and `maintenance_status` ("Maintenance status changed") only when `new.status is distinct from old.status`.
- One shared `notifyFinalizeFailed()` helper in `_shared/lease-signing.ts` invoked at ALL FIVE finalize failure exits (upload error, render catch, email-claim error, PDF-download error, email-send failure) — service_role `create_notification` RPC inside its own try/catch that never throws and never masks the original finalize error. `grep -c "notifyFinalizeFailed("` returns 6 (1 def + 5 calls).
- Four activity audit triggers (properties / leases / documents / maintenance_requests AFTER INSERT) write owner-scoped rows to `public.activity`, making the ACT-01 dashboard timeline non-empty (D-08 complete audit incl. the owner's own actions). No CRUD-edit triggers — create events only.
- Deno unit tests extended: a fake `rpc` recorder asserts `lease_finalize_failed` fires on both the upload-error and email-failure branches.
- RLS integration test extended: a maintenance INSERT as ownerA creates exactly one `maintenance_created` notification with the exact title + app-relative action_url, and ownerB sees none (cross-owner isolation).

## Task Commits

Each task was committed atomically:

1. **Task 1: Notification event triggers + finalize-failed edge-fn helper** - `ca237647a` (feat)
2. **Task 2: Activity event triggers (property/lease/document/maintenance create)** - `3dfb7601d` (feat)
3. **Task 3: RLS trigger-insertion assertion** - `f06e0bafe` (test)

_Migration file 20260719130000_notification_and_activity_event_triggers.sql was authored across Task 1 (notification triggers) and Task 2 (activity triggers)._

## Files Created/Modified
- `supabase/migrations/20260719130000_notification_and_activity_event_triggers.sql` (created) - 6 triggers: 2 notification (leases e-sign, maintenance) + 4 activity (property/lease/document/maintenance create). All functions SECURITY DEFINER with locked search_path; each preceded by `drop trigger if exists`.
- `supabase/functions/_shared/lease-signing.ts` (modified) - added `notifyFinalizeFailed()` helper + wired it at all 5 finalize failure exits.
- `supabase/functions/tests/lease-signing-test.ts` (modified) - fake-client `rpc` recorder + 2 new tests asserting `lease_finalize_failed` on the upload-error and email-failure branches.
- `tests/integration/rls/notifications.rls.test.ts` (modified) - dual-client trigger-insertion block (maintenance INSERT → notification + cross-owner isolation).

## Decisions Made
- **"Lease signing needs attention" lives in the edge fn, not the migration.** The plan's Task 1 acceptance criterion lists all five title strings as appearing "verbatim in the migration," but the finalize-failed event has no DB column transition to trigger on — it originates in the edge function's best-effort finalize path. Four titles are in the migration (trigger-generated); the fifth is verbatim in `lease-signing.ts:292`. All five appear verbatim in delivered code, satisfying the DB-copy/UI-copy consistency intent.
- **activity_type 'documents' used as-specified.** Verified `activity.activity_type` has no DB CHECK constraint and `get_dashboard_data_v2.recent_activities` applies no activity_type filter, so 'documents' rows render in the timeline; the frontend `mapDashboardActivityRow` never throws on an unknown activity_type. No fallback to 'general' was needed.
- **document activity trigger guards on non-null owner.** `documents.owner_user_id` is nullable but `activity.user_id` is NOT NULL, so the trigger wraps the insert in `if new.owner_user_id is not null` to never abort a document insert.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Guarded document activity trigger against NULL owner**
- **Found during:** Task 2 (activity triggers)
- **Issue:** `documents.owner_user_id` is nullable (generated types), but `activity.user_id` is NOT NULL. An unguarded `insert into activity (user_id, ...) values (new.owner_user_id, ...)` on a null-owner document would abort the document INSERT with a NOT NULL violation.
- **Fix:** Wrapped the document activity insert in `if new.owner_user_id is not null then ... end if`.
- **Files modified:** supabase/migrations/20260719130000_notification_and_activity_event_triggers.sql
- **Verification:** Migration inspection; the other three activity triggers write NOT-NULL owner columns and need no guard.
- **Committed in:** 3dfb7601d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Necessary for correctness (prevents the audit trigger from breaking document inserts). No scope creep.

## Issues Encountered
- **Deno not available in the worktree.** The Deno unit-test run (`deno test --allow-all --no-check --import-map=supabase/functions/deno.json supabase/functions/tests/lease-signing-test.ts`) could not be executed — deno is not on PATH and installing it was blocked by the sandbox external-code policy. The two new tests reuse the exact fake-client + Resend-stub patterns of existing passing tests (only adding a `calls.rpcs` recorder and assertions), so their logic is verified by inspection. **Deferred to CI / orchestrator** (both have deno).

## Orchestrator Residuals (MCP / deploy required — not doable in worktree)

1. **Prod migration apply + reconcile (DEFERRED — orchestrator has MCP).** `supabase/migrations/20260719130000_notification_and_activity_event_triggers.sql` was authored with a placeholder timestamp and verified by SQL inspection + acceptance greps, but NOT applied to prod (Supabase MCP is unavailable in worktree agents, confirmed by 52-01). The orchestrator must:
   - `mcp__supabase__apply_migration` the file, then `mcp__supabase__list_migrations` and reconcile the repo filename to the prod-assigned timestamp (migration-mcp-prod-drift).
   - Verify all six triggers via `mcp__supabase__execute_sql`: `select tgname from pg_trigger where tgrelid in ('public.leases'::regclass,'public.maintenance_requests'::regclass,'public.properties'::regclass,'public.documents'::regclass) and not tgisinternal` — expect `trg_notify_owner_lease_esign`, `trg_notify_owner_maintenance`, `trg_log_property_created_activity`, `trg_log_lease_created_activity`, `trg_log_document_created_activity`, `trg_log_maintenance_created_activity`.
   - **Ordering dependency:** `tests/integration/rls/notifications.rls.test.ts`'s new "event trigger insertion" block ASSERTS the trigger fires. It will FAIL until the migration is applied to prod. Apply the migration BEFORE the `rls-security` CI gate runs on this PR (Wave-1 precedent: 52-01's migration was applied by the orchestrator and verified live).

2. **Edge-function redeploy (DEFERRED — CLI 401 owner/orchestrator residual).** The `_shared/lease-signing.ts` change (notifyFinalizeFailed) requires redeploying the two functions that import it: **`lease-signature`** and **`sign-lease-token`**. Use the disk-reading `bun scripts/deploy-edge-functions.ts` (NOT MCP `deploy_edge_function` — those functions contain non-ASCII source and MCP model-emission corrupts it; edge-deploy-mcp-fidelity). Verify post-deploy via MCP `get_edge_function`.

3. **Type regeneration NOT required.** The migration adds only trigger functions (all `returns trigger`) — zero new PostgREST-callable RPCs and zero new columns — so `src/types/supabase.ts` is unchanged (`create_notification` was already added in 52-01). `bun run typecheck` exits 0 with no regen. No `bun run db:types` run is needed for this plan.

## Verification Status
- Task 1 automated verify (grep): **PASS** — `notify_owner_maintenance` + 3 title strings in migration, `create_notification` + notifyFinalizeFailed count == 6 in lease-signing.ts.
- Task 2 automated verify (grep): **PASS** — properties/documents triggers present, `insert into activity` count == 4.
- Task 3 automated verify (`bun run typecheck`): **PASS** — exits 0.
- Deno unit tests: **DEFERRED** to CI/orchestrator (deno unavailable in worktree; logic verified by inspection).
- `bun run test:integration -- notifications.rls.test.ts`: **DEFERRED** to orchestrator — requires the migration applied to prod first (and `.env.local`, absent in worktree).
- Edge-fn redeploy: **DEFERRED** to orchestrator/owner (`lease-signature`, `sign-lease-token`).

## Next Phase Readiness
- The full D-04 notification event set is wired through Plan 01's create_notification write-path; the notification-center UI plans can consume `lease_signed` / `lease_executed` / `lease_finalize_failed` / `maintenance_created` / `maintenance_status` types with the guaranteed title/action_url contract.
- The ACT-01 activity timeline is fed by four create-event triggers (property/lease/document/maintenance) once the migration is live.
- **Blocker for downstream verification:** the migration must be applied to prod (orchestrator MCP) and the two edge functions redeployed before end-to-end notification behavior is observable.

## Self-Check: PASSED

- All 5 created/modified files exist on disk (migration, lease-signing.ts, lease-signing-test.ts, notifications.rls.test.ts, 52-02-SUMMARY.md).
- All 3 task commits exist (ca237647a, 3dfb7601d, f06e0bafe).
- `src/types/supabase.ts` unchanged from base (no regen needed — trigger-only migration).

---
*Phase: 52-notification-center-activity-feed-channel-honesty*
*Completed: 2026-07-19*
