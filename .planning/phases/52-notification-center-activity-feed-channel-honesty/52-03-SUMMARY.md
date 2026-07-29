---
phase: 52-notification-center-activity-feed-channel-honesty
plan: 03
subsystem: database
tags: [postgres, pg_cron, rls, retention, supabase, schema-reconcile]

# Dependency graph
requires:
  - phase: 52-01
    provides: notifications table + composite (user_id, is_read, created_at desc) index
  - phase: 52-02
    provides: create_notification RPC + event triggers (serialized MCP apply ordering)
provides:
  - notifications_archive table (service_role-only) + tiered cleanup_old_notifications() cron at 3 AM :45
  - idempotent orphan-schema reconcile (payout_events + 2 fns + leases.docuseal_document_url dropped)
  - retention privilege-boundary integration test
affects: [notification-retention, schema-drift-audits, future cron additions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tiered archive-then-delete retention cron mirroring cleanup_old_security_events family"
    - "Verify-then-reconcile idempotent drops for demolished-feature schema objects"

key-files:
  created:
    - supabase/migrations/20260719140000_notifications_retention_cron.sql
    - supabase/migrations/20260719141000_reconcile_orphan_schema.sql
    - tests/integration/rls/notifications-retention.rls.test.ts
  modified: []

key-decisions:
  - "Added revoke-from-public/grant-to-service_role on cleanup_old_notifications (Rule 2 security; precedented by cleanup_old_email_deliverability)"
  - "Used the real get_autopay_health(uuid) signature instead of the plan's imprecise ()"
  - "No archive table for payout_events (zero rows ever) — plain idempotent drop cascade"

patterns-established:
  - "notifications retention: read >=90d / unread >=180d, 10k batches, for update skip locked, delete-only-archived"
  - "reconcile migration: every drop is `if exists` so it is a no-op whether present or absent"

requirements-completed: [NOTIF-05, CLEAN-01, CLEAN-02]

# Metrics
duration: 22min
completed: 2026-07-19
---

# Phase 52 Plan 03: Notifications Retention + Orphan-Schema Reconcile Summary

**Tiered archive-then-delete retention cron (read >=90d / unread >=180d) at the 3 AM :45 slot backed by a service_role-only notifications_archive, plus an idempotent verify-then-reconcile migration dropping the demolished payout_events feature and the DocuSeal leases.docuseal_document_url remnant.**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-07-19T15:00:00Z (approx)
- **Completed:** 2026-07-19T15:15:00Z
- **Tasks:** 3
- **Files modified:** 3 created (247 insertions)

## Accomplishments
- `notifications_archive` mirror table (`like public.notifications including all`) with RLS + 3 granular service_role-only policies (select/insert/delete).
- `cleanup_old_notifications()` — two-tier D-12 archive-then-delete: batch 1 archives read rows older than 90d, batch 2 archives unread (`is_read is not true`) older than 180d; each `limit 10000 for update skip locked`, `on conflict (id) do nothing`, deletes only already-archived rows, `raise notice`, `returns integer`, `set search_path = public`.
- `cron.schedule('cleanup-notifications', '45 3 * * *', ...)` invoking the named SECURITY DEFINER function (never inline SQL) at the free :45 slot alongside the existing :00/:15/:30 cleanup jobs.
- Idempotent orphan-schema reconcile: `drop table if exists public.payout_events cascade`, `drop function if exists public.get_payout_timing_stats()`, `drop function if exists public.get_autopay_health(uuid)`, `alter table public.leases drop column if exists docuseal_document_url`.
- Retention privilege-boundary integration test over the dual-client harness (cleanup fn not authenticated-callable; archive table not authenticated-readable).

## Task Commits

Each task was committed atomically:

1. **Task 1: Notifications retention migration** - `9eaf48bd3` (feat)
2. **Task 2: Idempotent orphan-schema reconcile migration** - `abcf345b6` (chore)
3. **Task 3: Retention privilege-boundary integration test** - `9cb1216b1` (test)

## Files Created/Modified
- `supabase/migrations/20260719140000_notifications_retention_cron.sql` - archive table + tiered cleanup fn + :45 cron.
- `supabase/migrations/20260719141000_reconcile_orphan_schema.sql` - idempotent drops for payout_events + 2 fns + docuseal column.
- `tests/integration/rls/notifications-retention.rls.test.ts` - authenticated-role privilege boundaries for the cleanup fn + archive table.

## Prod Pre-Apply Introspection (CLEAN-01/02 verify-then-reconcile)

MCP-verified by the orchestrator this session (2026-07-19), confirming the reconcile drops are harmless no-ops against prod:

| Object | Prod state | Reconcile action |
|--------|-----------|------------------|
| `public.payout_events` (table) | ABSENT (`to_regclass` NULL) | `drop table if exists ... cascade` (no-op) |
| `public.get_payout_timing_stats()` | ABSENT | `drop function if exists` (no-op) |
| `public.get_autopay_health(uuid)` | ABSENT | `drop function if exists` (no-op) |
| `public.leases.docuseal_document_url` | ABSENT | `drop column if exists` (no-op) |

The launch-readiness migration `20260413120000` (source of payout_events/autopay) was never applied to prod, and DocuSeal e-signature was migrated to the token-based flow (`20260617142623`), so all four objects were already gone. The migration exists purely to reconcile repo history with prod. `notification_settings.sms/push/in_app` columns are intentionally retained (UI-only removal shipped in 52-08) — no column-drop authored here.

## Decisions Made
- **revoke/grant on cleanup_old_notifications:** the cleanup fn is a SECURITY DEFINER cron batch job, so it is `revoke all ... from public; grant execute ... to service_role`. This prevents any authenticated user from triggering a cross-tenant archive-and-delete sweep. Precedented by `cleanup_old_email_deliverability` (`20260415193245`) and consistent with the phase's `create_notification` grant discipline; it also matches the plan author's stated assumption that the fn is not authenticated-callable.
- **get_autopay_health(uuid) signature:** dropped with the real `(uuid)` argument signature rather than the plan's imprecise `()`, so the drop targets the actual object in any environment where it still exists.
- **No archive table for payout_events:** the table never held a row, so a plain `drop ... cascade` reconcile is correct (no archive-then-delete needed).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added service_role-only grant discipline on cleanup_old_notifications**
- **Found during:** Task 1 (retention migration)
- **Issue:** The `20260306170000` retention analog does not revoke execute on its cleanup functions, leaving them PUBLIC-executable by default. A SECURITY DEFINER function that archives-and-deletes across all users' notifications is a cross-tenant DoS/privilege surface (threat T-52-09/T-52-11) if any authenticated user can invoke it. The plan's own Task 3 text assumes the fn is not authenticated-callable.
- **Fix:** Added `revoke all on function public.cleanup_old_notifications() from public; grant execute ... to service_role;` (matching `cleanup_old_email_deliverability`).
- **Files modified:** supabase/migrations/20260719140000_notifications_retention_cron.sql
- **Verification:** grep confirms revoke/grant present; retention test asserts the authenticated role gets a REVOKED_CODES error when calling the RPC.
- **Committed in:** 9eaf48bd3 (Task 1 commit)

**2. [Rule 1 - Bug] Corrected get_autopay_health drop signature**
- **Found during:** Task 2 (reconcile migration)
- **Issue:** Plan specified `drop function if exists public.get_autopay_health()` (zero-arg), but the real function is `get_autopay_health(p_owner_user_id uuid)`. A zero-arg `drop ... if exists` would silently no-op and never drop the real object where it exists.
- **Fix:** Dropped `public.get_autopay_health(uuid)` (correct signature).
- **Files modified:** supabase/migrations/20260719141000_reconcile_orphan_schema.sql
- **Verification:** grep confirms `get_autopay_health(uuid)`; verified against the object definition in `20260413120000`.
- **Committed in:** abcf345b6 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 missing-critical security, 1 correctness bug)
**Impact on plan:** Both necessary for security/correctness. No scope creep — same objects, tighter grants and accurate signatures.

## Issues Encountered
- commitlint `body-max-line-length` (100 chars) rejected the first Task 1 commit message body; shortened the bullets and re-committed. All lefthook hooks (gitleaks, lockfile-verify, lint, typecheck, unit-tests) passed on every commit.

## Deferred to Orchestrator (MCP)

MCP tools are unavailable inside worktree agents (Waves 1-2 precedent), so the prod-facing steps of Task 3 are deferred to the orchestrator:

1. **Apply both migrations via MCP `apply_migration`** — retention (`20260719140000`) first, then reconcile (`20260719141000`), serialized after 52-02's applies (no concurrent `apply_migration`).
2. **Reconcile repo filenames** to the prod-assigned timestamps via MCP `list_migrations` (migration-mcp-prod-drift rule).
3. **Regenerate types** (`bun run db:types`; MCP `generate_typescript_types` fallback if PAT 401s) — `notifications_archive` should appear in the generated types. `src/types/supabase.ts` was intentionally NOT hand-edited (generated file).
4. **MCP post-verify:** `select schedule from cron.job where jobname='cleanup-notifications'` → `45 3 * * *`; `to_regclass('public.notifications_archive')` non-null; `to_regclass('public.payout_events')` NULL; `leases` has no `docuseal_document_url`.
5. **Run the retention integration test** — `bun run test:integration -- notifications-retention.rls.test.ts` (needs `.env.local` synthetic-owner creds + prod; `.env.local` is absent in the worktree and must never be created — MEMORY).

Note: the retention test's privilege-boundary assertions hold both before and after the migration (function-not-found / not-in-schema-cache are also non-null errors), so it is CI-safe; the deep archive-then-delete behaviour + cron.job row are covered by step 4's MCP introspection.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Notifications are bounded by a tiered retention cron once the orchestrator applies `20260719140000`; the `notifications_archive` info-disclosure boundary is service_role-only.
- Repo schema history reconciles with prod for the demolished payout/autopay feature and the DocuSeal column once `20260719141000` is applied.
- Blocker: prod apply + `db:types` regen + integration-test run are orchestrator-owned (MCP + `.env.local`).

## Self-Check: PASSED

- FOUND: supabase/migrations/20260719140000_notifications_retention_cron.sql
- FOUND: supabase/migrations/20260719141000_reconcile_orphan_schema.sql
- FOUND: tests/integration/rls/notifications-retention.rls.test.ts
- FOUND commit 9eaf48bd3 (Task 1), abcf345b6 (Task 2), 9cb1216b1 (Task 3)
- STATE.md / ROADMAP.md: not modified (orchestrator-owned)

---
*Phase: 52-notification-center-activity-feed-channel-honesty*
*Completed: 2026-07-19*
