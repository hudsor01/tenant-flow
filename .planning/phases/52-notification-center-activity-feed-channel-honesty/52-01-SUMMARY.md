---
phase: 52-notification-center-activity-feed-channel-honesty
plan: 01
subsystem: database
tags: [postgres, rls, security-definer, notifications, supabase, integration-testing]

# Dependency graph
requires:
  - phase: prior v10.0 planning
    provides: notifications table (already provisioned in prod with select+update RLS)
provides:
  - create_notification SECURITY DEFINER RPC (service_role-only mint point) — authored, prod-apply pending owner
  - composite inbox index notifications_user_unread_created_idx (user_id, is_read, created_at desc)
  - idempotent notifications RLS reconcile to canonical 3-policy owner-scoped set
  - fixed read/is_read latent test bug + create_notification privilege-boundary RLS case
affects: [52-02 notification triggers, 53, 57, 62, notification-bell, dashboard-activity-card]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "System write-path RPC: SECURITY DEFINER + set search_path to 'public' + revoke all from public + grant execute to service_role only (mirrors record_lease_signature)"
    - "Idempotent RLS reconcile: drop-if-exists every legacy policy name, recreate canonical set — never re-add owner RLS as new"
    - "RPC privilege-boundary integration test via REVOKED_CODES helper (42501/42883/PGRST202)"

key-files:
  created:
    - supabase/migrations/20260719120000_create_notification_and_reconcile_rls.sql
  modified:
    - tests/integration/rls/notifications.rls.test.ts

key-decisions:
  - "create_notification does NOT gate on auth.uid() (runs from trigger/cron contexts) and does NOT consult notification_settings (D-05: in-app notifications always created)"
  - "No authenticated INSERT/DELETE policy on notifications — all writes go through create_notification / triggers"
  - "notifications_service_role uses FOR ALL (allowed: service_role, not authenticated)"

patterns-established:
  - "Pattern 1: un-bypassable system insert point via service_role-only SECURITY DEFINER RPC"
  - "Pattern 2: reconcile-not-rebuild for partially-provisioned prod RLS"

requirements-completed: []  # NOTIF-01 authored in repo but NOT yet satisfied in prod — blocked on owner MCP apply (Task 3)

# Metrics
duration: ~65min
completed: 2026-07-19
---

# Phase 52 Plan 01: Notification Write-Path Primitive Summary

**create_notification service_role-only SECURITY DEFINER RPC + composite inbox index + idempotent notifications RLS reconcile authored and committed; the read/is_read latent test bug is fixed and the RPC privilege boundary is pinned. The [BLOCKING] prod-apply (Task 3) is a pending owner-run step — the Supabase MCP tools required to write prod are not available in this worktree agent context.**

## Performance

- **Duration:** ~65 min
- **Started:** 2026-07-19T18:20:00Z
- **Completed:** 2026-07-19T19:27:00Z
- **Tasks:** 2 of 3 complete (Task 3 blocked — owner-run)
- **Files modified:** 2

## Accomplishments
- `create_notification(p_user_id, p_type, p_title, p_message, p_entity_type, p_entity_id, p_action_url) returns uuid` — SECURITY DEFINER, `set search_path to 'public'`, plain `insert ... returning id`, `revoke all from public` + `grant execute to service_role` (NEVER authenticated). Mirrors `record_lease_signature`.
- Composite index `notifications_user_unread_created_idx (user_id, is_read, created_at desc)` for the unread HEAD count + bounded inbox list.
- Idempotent RLS reconcile: drops all seven legacy policy names, recreates exactly `notifications_select` (SELECT), `notifications_update` (UPDATE), `notifications_service_role` (ALL) — all owner-scoped via `(select auth.uid())`, no authenticated INSERT/DELETE.
- Fixed the latent `.update({ read: true })` bug (column is `is_read`; `read` would 400 at PostgREST) and added the dual-client case asserting `create_notification` is NOT callable by the authenticated role (T-52-01, via `REVOKED_CODES`).

## Task Commits

Each task was committed atomically:

1. **Task 1: create_notification RPC + inbox index + RLS reconcile migration** - `355404810` (feat)
2. **Task 2: fix read/is_read column bug + pin create_notification privilege** - `730511e31` (test)
3. **Task 3: [BLOCKING] apply to prod via MCP + reconcile filename + regen types** - NOT DONE (blocked, owner-run — see below)

**Plan metadata:** committed separately with this SUMMARY.

## Files Created/Modified
- `supabase/migrations/20260719120000_create_notification_and_reconcile_rls.sql` - create_notification RPC + composite index + idempotent 3-policy RLS reconcile
- `tests/integration/rls/notifications.rls.test.ts` - read→is_read fix + create_notification privilege-boundary case (imports `REVOKED_CODES` from `./_helpers/revoked-codes`)

## Decisions Made
- Followed plan exactly for Tasks 1 & 2. No architectural deviations.

## Deviations from Plan

None - plan executed exactly as written for Tasks 1 and 2. Task 3 is not a deviation; it is a tooling-availability blocker (below).

## Issues Encountered

### 1. Lefthook pre-commit unit-test flake under parallel load (resolved)
- **During:** Task 1 first commit attempt.
- **Symptom:** lefthook reported `589 failed | 105318 passed`; commit blocked.
- **Root cause:** lefthook runs gitleaks + lockfile-verify + lint + typecheck + unit-tests in PARALLEL. Under CPU/memory contention the 105k-test suite flaked (timeouts). A standalone `bun run test:unit` run passed cleanly: **279 files, 105907 tests, 0 failures.** A SQL-migration file cannot affect unit tests.
- **Resolution:** Re-ran the commit; the hook passed on the second attempt. No `--no-verify` used (project hard rule).

### 2. [BLOCKING — OWNER-RUN] Task 3 prod-apply cannot be executed in this worktree agent context
- **During:** Task 3.
- **Symptom:** `mcp__supabase__execute_sql` / `apply_migration` / `list_migrations` / `generate_typescript_types` are **not available** in this agent's toolset ("No such tool available"), and `ToolSearch` is disabled here ("exists but is not enabled in this context") — so the MCP tools cannot be loaded.
- **Environment observed:** Supabase CLI v2.109.0 present but the project is **not linked** (`supabase/.temp` absent); `SUPABASE_ACCESS_TOKEN` is set but the CLI `db push` path is both forbidden by project convention AND known to 401 (see MEMORY `supabase-cli-functions-deploy-401-pattern`). `.env.local` is absent in the worktree, so `bun run test:integration` (hits prod) cannot run here either.
- **Why not auto-fixed:** the only sanctioned prod-write path is MCP `apply_migration`; it is unavailable. Applying via CLI `db push` is explicitly prohibited. This is a human/tooling gate, not a code bug.

## Owner-Run Residual — Apply Task 3 (BLOCKING)

The migration file is committed, idempotent, and re-runnable. To finish NOTIF-01, apply it to prod from an environment WITH the Supabase MCP tools (project ref `bshjmbshupiibfiewpxb`):

**1. Pre-verify baseline** (expect only `notifications_select`/SELECT + `notifications_update`/UPDATE, and 0 create_notification):
```sql
select policyname, cmd from pg_policies where schemaname='public' and tablename='notifications' order by policyname;
select count(*) from information_schema.routines where routine_schema='public' and routine_name='create_notification';
```

**2. Apply** via MCP `apply_migration` with the SQL of `supabase/migrations/20260719120000_create_notification_and_reconcile_rls.sql`.

**3. Reconcile filename** — MCP `apply_migration` assigns a prod timestamp that may differ from `20260719120000`. Run MCP `list_migrations`, then rename the repo file to the prod-assigned version (CLAUDE.md migration-mcp-prod-drift). **Record the reconciled version here.**

**4. Regenerate types** — `bun run db:types`; if the PAT path 401s, fall back to MCP `generate_typescript_types` and write the result to `src/types/supabase.ts`. Expect `Database['public']['Functions']` to gain `create_notification`.

**5. Post-verify** (expect exactly three rows: `notifications_select`/SELECT, `notifications_update`/UPDATE, `notifications_service_role`/ALL; and create_notification present):
```sql
select policyname, cmd from pg_policies where schemaname='public' and tablename='notifications' order by policyname;
select 1 from pg_proc where proname='create_notification';
```

**6. Run the RLS integration test** (needs `.env.local`): `bun run test:integration -- notifications.rls.test.ts` — the new `create_notification not callable by authenticated` case now passes against live prod.

## Next Phase Readiness
- Migration + hardened RLS test authored and committed; ready for owner MCP apply.
- **Blocker for downstream (52-02 triggers, Plans 53/57/62):** `create_notification` must be live in prod before trigger migrations that call it are applied.

## Self-Check: PASSED

- `supabase/migrations/20260719120000_create_notification_and_reconcile_rls.sql` — FOUND (committed in `355404810`)
- `tests/integration/rls/notifications.rls.test.ts` — FOUND, modified (committed in `730511e31`)
- Commit `355404810` — FOUND in git log
- Commit `730511e31` — FOUND in git log
- Task 3 prod-apply — NOT DONE (documented owner-run blocker above); NOTIF-01 not marked complete.

---
*Phase: 52-notification-center-activity-feed-channel-honesty*
*Completed (Tasks 1-2): 2026-07-19*
