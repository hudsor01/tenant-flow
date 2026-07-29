---
phase: 52-notification-center-activity-feed-channel-honesty
verified: 2026-07-19T21:17:05Z
status: human_needed
score: 11/11 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Run tests/e2e/tests/notifications.spec.ts in CI e2e-smoke (owner-axe project): bell->popover, mark-all-read gated on unread, /notifications inbox renders, Settings shows no SMS/push"
    expected: "4/4 tests pass against the live synthetic-owner env"
    why_human: "E2E requires a running app + authenticated session; not executable from this static-review context (no .env.local / live browser)"
  - test: "Redeploy the `lease-signature` and `sign-lease-token` edge functions (bun scripts/deploy-edge-functions.ts) so the notifyFinalizeFailed() code added 2026-07-19 in _shared/lease-signing.ts is live"
    expected: "get_edge_function shows both functions' bundled source containing notifyFinalizeFailed after redeploy"
    why_human: "CLI functions-deploy 401s (known project gotcha); the prior edge deploy of these two functions (2026-07-17, v9.0 remediation) predates this phase's change, so the finalize-failed notification path is not yet live in the deployed bundle even though prod DB objects are live"
  - test: "Run supabase functions tests/lease-signing-test.ts via `deno test --allow-all --no-check --import-map=supabase/functions/deno.json` (needs `supabase functions serve` + deno)"
    expected: "The two new fake-rpc-recorder assertions (upload-error and email-failure branches record a lease_finalize_failed create_notification call) pass"
    why_human: "deno is not available in this verification environment; logic was verified by source inspection only, never executed"
  - test: "Regenerate src/types/supabase.ts via `bun run db:types` (or MCP generate_typescript_types fallback)"
    expected: "Database['public']['Functions'] gains create_notification/cleanup_old_notifications; Database['public']['Tables'] gains notifications_archive"
    why_human: "Owner PAT refresh required for the CLI path; frontend typecheck currently passes without this because create_notification is only called from Deno edge functions (untyped generic SupabaseClient), never from typed frontend code"
  - test: "Run `bun run test:integration -- notifications.rls.test.ts notifications-retention.rls.test.ts` against prod with `.env.local`"
    expected: "All dual-client RLS/privilege-boundary/trigger-insertion assertions (owner isolation, create_notification not authenticated-callable, maintenance INSERT -> notification, cleanup fn/archive not authenticated-accessible) pass live"
    why_human: ".env.local is intentionally absent in this workspace (project convention); this test hits prod and will run in CI rls-security on the PR"
---

# Phase 52: Notification Center, Activity Feed & Channel Honesty Verification Report

**Phase Goal:** The orphaned `notifications`/`activity` backend becomes user-facing (bell + inbox + dashboard timeline), the shared `create_notification` write-path exists for every later feature to call, dishonest notification channels are removed, and residual demolished-feature schema is cleaned.
**Verified:** 2026-07-19T21:17:05Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (by requirement)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | NOTIF-01: `create_notification` SECURITY DEFINER RPC exists, service_role-only, owner-scoped 3-policy RLS reconciled, owner isolation holds | ✓ VERIFIED | `supabase/migrations/20260719193759_create_notification_and_reconcile_rls.sql` — `revoke all ... from public` / `grant execute ... to service_role`; 3 canonical policies (`notifications_select`/`notifications_update`/`notifications_service_role`) using `(select auth.uid())`; composite index `notifications_user_unread_created_idx`. Confirmed live in prod (verified via MCP this session, per verification context). RLS test asserts `create_notification` rejects the authenticated role (`tests/integration/rls/notifications.rls.test.ts:108-119`, `REVOKED_CODES`). |
| 2 | NOTIF-02: bell with live unread badge (60s HEAD poll, capped "9+", hidden at 0) in the app-shell header | ✓ VERIFIED | `src/components/notifications/notification-bell.tsx` — `useUnreadCount()` (HEAD `count:'exact'`, `refetchInterval: 60_000` in `notification-keys.ts:120`), badge `count > 9 ? "9+" : String(count)`, `hasUnread &&` gate hides at 0. Mounted in `app-shell-header.tsx:132` (`<NotificationBell />`, old `/settings?tab=notifications` link removed). Unit tests (6/6) assert cap/hidden-at-0/aria-label; ran locally, pass. |
| 3 | NOTIF-03: popover inbox (10 recent) + mark-read/mark-all-read + full paginated `/notifications` history | ✓ VERIFIED | `notification-popover-list.tsx` (10 rows via `useNotificationList({limit:10})`, Mark-all-read, View-all link) + `notifications-inbox.client.tsx` (`.range()`+`{count:'exact'}` 20/page, never `data.length`, Mark-all-read gated on `useUnreadCount()` per WR-01 fix). `use-notifications.ts` mutations write `is_read`+`read_at`, invalidate `[notificationKeys.all, ownerDashboardKeys.all]`. 15+4 unit tests pass. |
| 4 | NOTIF-04: product events generate notifications (lease signed/executed/finalize-failed, maintenance created/status) via `create_notification`, exact UI-SPEC titles, CRUD edits excluded, single writer | ✓ VERIFIED | `20260719200224_notification_and_activity_event_triggers.sql` — 2 notification triggers with the 4 exact title strings; `notifyFinalizeFailed()` helper in `lease-signing.ts:283-310` invoked at all 5 finalize failure exits (`grep -c "notifyFinalizeFailed("` = 6). **CR-01 blocker fix applied**: `20260719211249_single_notification_writer_rpcs.sql` strips the legacy direct `insert into notifications` from `record_lease_signature` and `sign_lease_with_token`, restoring `trg_notify_owner_lease_esign` as the sole writer (verified in file — no `insert into public.notifications` remains in either RPC). Prod-applied per verification context (`pg_get_functiondef` check). **Caveat**: the edge-fn code containing `notifyFinalizeFailed` requires redeploy of `lease-signature`/`sign-lease-token` to go live (see Human Verification #2) — the DB-trigger half of NOTIF-04 is prod-live; the edge-fn half is repo-correct but not yet confirmed redeployed. |
| 5 | NOTIF-05: bounded retention via archive-then-delete cron (3 AM :45 window) | ✓ VERIFIED | `20260719202447_notifications_retention_cron.sql` — `notifications_archive` (service_role-only, 3 policies), `cleanup_old_notifications()` two-tier (read 90d / unread 180d, `for update skip locked`, archive-then-delete-only-archived), `cron.schedule('cleanup-notifications','45 3 * * *',...)`. Grant discipline (`revoke all ... grant ... service_role`) present. Confirmed live in prod per verification context. |
| 6 | ACT-01: dashboard historical activity timeline sourced from the existing activity slice, no new fetch, populated by create-event triggers | ✓ VERIFIED | `selectActivity`/`useDashboardActivity` in `use-dashboard-hooks.ts:52,85-90` select over `DASHBOARD_BASE_QUERY_OPTIONS` (zero new queryFn). `mapDashboardActivityRow` in `use-owner-dashboard.ts` maps the RPC's snake_case activity rows (fixes a latent all-`undefined` bug). 4 activity triggers (property/lease/document/maintenance create) write to `public.activity` (`20260719200224...sql` Part 3). Card placed in dashboard 2-col grid (`dashboard/page.tsx:158-160`). |
| 7 | ACT-02: visual disambiguation — activity rows carry no unread dot/badge/mark-read/chevron | ✓ VERIFIED | `dashboard-activity-card.tsx` — `<li>` rows with icon chip + text only; no `ChevronRight`, no `bg-primary` dot, no mark-read control (source scan + unit test assert absence). Contrasts with `notification-item.tsx` which has all three signals + chevron. |
| 8 | HONEST-01: SMS toggle removed from Settings | ✓ VERIFIED | `notification-settings.tsx` contains no "SMS"/"MessageSquare" text/import. Regression-pin test (`notification-settings.test.tsx:145`) asserts `queryByText(/SMS/i)` is null. E2E spec also asserts `panel.getByText(/sms/i)` has count 0. |
| 9 | HONEST-02: browser-push toggle removed (+ in-app toggle, dishonest no-op) | ✓ VERIFIED | No "Push Notifications"/"Browser push"/"In-App Notifications" text/imports in `notification-settings.tsx`; regression-pin test asserts all three absent. `handleEnableAllToggle` writes only `{email, categories}` (verified in source, lines 32-41). IN-01 fix applied: Enable-All copy reworded to "Turn on email and all notification categories" (no longer claims "all channels"). |
| 10 | CLEAN-01: `payout_events` + 2 functions dropped (verify-then-reconcile) | ✓ VERIFIED | `20260719202453_reconcile_orphan_schema.sql` — idempotent `drop table if exists public.payout_events cascade`, `drop function if exists public.get_payout_timing_stats()`, `drop function if exists public.get_autopay_health(uuid)`. Prod pre-apply introspection recorded in 52-03-SUMMARY confirms all objects already absent; verification context confirms still absent post-apply. |
| 11 | CLEAN-02: `leases.docuseal_document_url` dropped | ✓ VERIFIED | Same migration: `alter table public.leases drop column if exists docuseal_document_url`. Confirmed absent per verification context. |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260719193759_create_notification_and_reconcile_rls.sql` | create_notification RPC + index + RLS reconcile | ✓ VERIFIED | Matches spec exactly; prod-applied |
| `supabase/migrations/20260719200224_notification_and_activity_event_triggers.sql` | 6 triggers (2 notification + 4 activity) | ✓ VERIFIED | All present, exact title strings, null-owner guard on documents trigger |
| `supabase/migrations/20260719202447_notifications_retention_cron.sql` | archive table + cleanup fn + cron | ✓ VERIFIED | Two-tier D-12 policy, grant discipline added beyond plan (security hardening) |
| `supabase/migrations/20260719202453_reconcile_orphan_schema.sql` | idempotent CLEAN-01/02 drops | ✓ VERIFIED | All 4 objects, `if exists` throughout |
| `supabase/migrations/20260719211249_single_notification_writer_rpcs.sql` | CR-01 review-fix: strip legacy direct inserts | ✓ VERIFIED | Both RPCs redefined with inserts removed; committed `afd72fd46` (applied to prod, filename reconciled) |
| `src/hooks/api/query-keys/notification-keys.ts` | notificationQueries factory + mapper | ✓ VERIFIED | 163 lines; HEAD count query, bounded list (IN-04 explicit column list applied), typed mapper throws on missing NOT NULL |
| `src/hooks/api/use-notifications.ts` | mark-read/mark-all-read mutations | ✓ VERIFIED | 98 lines; `is_read`/`read_at`, full invalidation contract |
| `src/components/notifications/notification-item.tsx` | row w/ unread signals + guard | ✓ VERIFIED | 144 lines; `resolveHref` closes WR-03 backslash/control-char bypass |
| `src/components/notifications/notification-popover-list.tsx` | 10-recent popover | ✓ VERIFIED | 90 lines; WR-01 fix (`useUnreadCount` drives disabled state) |
| `src/components/notifications/notification-bell.tsx` | badge + popover trigger | ✓ VERIFIED | 52 lines; wired into header |
| `src/components/shell/app-shell-header.tsx` | bell mount | ✓ VERIFIED | `<NotificationBell />` replaces the old settings link |
| `src/app/(owner)/notifications/page.tsx` | thin server page | ✓ VERIFIED | 17 lines; no @modal/catchAll |
| `src/components/notifications/notifications-inbox.client.tsx` | paginated inbox | ✓ VERIFIED | 133 lines; `.range()`+count header, never `data.length` |
| `src/components/dashboard/dashboard-activity-card.tsx` | audit-trail card | ✓ VERIFIED | 144 lines; ACT-02 asymmetry, 4-entity icon palette incl. document->FileUp |
| `src/hooks/api/use-dashboard-hooks.ts` | selectActivity/useDashboardActivity | ✓ VERIFIED | Selector over shared cache, zero new fetch |
| `src/components/settings/notification-settings.tsx` | honest channel surface | ✓ VERIFIED | 181 lines; Email + 3 categories only; IN-01 copy fix applied |
| `tests/e2e/tests/notifications.spec.ts` | E2E smoke | ✓ VERIFIED (not executed) | Registered in `owner-axe` testMatch (playwright.config.ts:181,201); asserts bell/popover/mark-all-read/inbox/settings-honesty; not runnable from this environment (see Human Verification) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `public.create_notification` | `public.notifications` | SECURITY DEFINER insert | ✓ WIRED | Verified in migration + prod |
| `notifications` RLS | `auth.uid()` | owner-scoped USING/WITH CHECK | ✓ WIRED | `(select auth.uid())` subselect form throughout |
| `trg_notify_owner_lease_esign`/`trg_notify_owner_maintenance` | `create_notification` | `perform public.create_notification` | ✓ WIRED | Both triggers call the RPC; single-writer confirmed post-CR-01 |
| `notifyFinalizeFailed` (5 call sites) | `create_notification` | `rpc('create_notification', ...)` | ✓ WIRED (code) | Live prod-liveness pending edge-fn redeploy (Human Verification #2) |
| `cron.schedule('cleanup-notifications')` | `cleanup_old_notifications()` | named SECURITY DEFINER fn | ✓ WIRED | Confirmed via verification context; grant discipline added |
| `NotificationBell` | `notificationQueries.unreadCount` | `useUnreadCount()` 60s poll | ✓ WIRED | `notification-bell.tsx:20` |
| `NotificationItem`/mark mutations | `ownerDashboardKeys.all` | invalidate array | ✓ WIRED | `use-notifications.ts:27-30` |
| `useDashboardActivity` | `OwnerDashboardData.activity` | `select: selectActivity` over shared cache | ✓ WIRED | `use-dashboard-hooks.ts:52,85-90`; no new network call |
| dashboard page grid | `DashboardActivityCard` | 2-col grid alongside `ExpiringLeasesWidget` | ✓ WIRED | `dashboard/page.tsx:158-160` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `NotificationBell` badge | `count` from `useUnreadCount()` | HEAD `count:'exact'` query on `notifications` scoped to `user_id`+`is_read=false` | Yes — real PostgREST HEAD query, RLS-scoped | ✓ FLOWING |
| `NotificationPopoverList`/`NotificationsInboxClient` rows | `data.rows` from `useNotificationList()` | bounded `.limit()`/`.range()` query, explicit column list, `mapNotificationRow` | Yes — real rows, populated by live triggers | ✓ FLOWING |
| `DashboardActivityCard` rows | `data` from `useDashboardActivity()` | `select: selectActivity` over `get_dashboard_data_v2` RPC, mapped via `mapDashboardActivityRow` | Yes — real RPC query; the fetcher bug (all-`undefined` fields) was caught and fixed in-plan | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Notification/activity/settings unit suite | `bun run test:unit -- <5 phase-52 test files>` | 5 files / 30 tests passed | ✓ PASS |
| Type safety across the phase's changed surface | `bun run typecheck` | exit 0 | ✓ PASS |
| Lint | `bun run lint` | 1299 files checked, 0 errors (1 unrelated biome-config info) | ✓ PASS |
| Debt markers (TBD/FIXME/XXX) in phase-modified files | `grep -rn -E "TBD\|FIXME\|XXX"` across all 15 phase-touched frontend/edge files | no matches | ✓ PASS |
| CR-01 single-writer fix | direct file read of `record_lease_signature`/`sign_lease_with_token` in `20260719211249...sql` | no `insert into public.notifications` remains in either function | ✓ PASS |
| E2E notification smoke | not run (no live env in this workspace) | — | ? SKIP (Human Verification #1) |
| Deno edge-fn unit tests | not run (deno unavailable) | — | ? SKIP (Human Verification #3) |

### Probe Execution

No `scripts/*/tests/probe-*.sh` conventional probes exist for this phase (UI + migration phase, not a CLI/migration-tooling phase with probe scripts). Skipped.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|--------------|--------|----------|
| NOTIF-01 | 52-01 | create_notification write-path RPC + owner RLS | ✓ SATISFIED | Truth #1 |
| NOTIF-02 | 52-04, 52-05 | Bell w/ live unread count, 60s poll | ✓ SATISFIED | Truth #2 |
| NOTIF-03 | 52-04, 52-05, 52-06 | Mark read/unread + mark-all-read, full inbox | ✓ SATISFIED | Truth #3 |
| NOTIF-04 | 52-02 | Product events generate notifications | ✓ SATISFIED (prod-liveness of edge-fn half pending redeploy) | Truth #4 |
| NOTIF-05 | 52-03 | Bounded archive-then-delete retention | ✓ SATISFIED | Truth #5 |
| ACT-01 | 52-02, 52-07 | Dashboard historical activity timeline | ✓ SATISFIED | Truth #6 |
| ACT-02 | 52-07 | Visual disambiguation from notification center | ✓ SATISFIED | Truth #7 |
| HONEST-01 | 52-08 | SMS toggle removed | ✓ SATISFIED | Truth #8 |
| HONEST-02 | 52-08 | Browser-push toggle removed | ✓ SATISFIED | Truth #9 |
| CLEAN-01 | 52-03 | `payout_events` + functions dropped | ✓ SATISFIED | Truth #10 |
| CLEAN-02 | 52-03 | `docuseal_document_url` dropped | ✓ SATISFIED | Truth #11 |

No orphaned requirements — all 11 IDs assigned to Phase 52 in REQUIREMENTS.md appear in a plan's `requirements` frontmatter and are covered above. (Note: REQUIREMENTS.md's phase-mapping table still shows "Pending" status text for all 11 rows — this is a documentation-sync item for `/gsd-ship`/`/gsd-complete-milestone`, not a code gap.)

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.planning/phases/52-.../deferred-items.md` | 7-16 | Stale note claims `settings/page.tsx:76` still says "Email, SMS, and push settings" | ℹ️ Info | Superseded — actual text is "Email and in-app notification settings" (fixed in commit `7b6f842a6`, `fix(52-08): align settings nav description with honest channels`). Planning doc is stale, not the code. |
| N/A | — | WR-02 (preference toggles gate no send path) | ℹ️ Info (accepted deferral) | Explicitly deferred to Phase 53 (REMIND-03 suppression-honoring send rail) per 52-REVIEW.md; not a Phase 52 regression since `create_notification` intentionally ignores preferences by design (D-05) |
| `20260719200224_...sql:47` | 47 | IN-02 dead `old is null or` predicate | ℹ️ Info (accepted, in prod) | Harmless — `AFTER UPDATE` trigger means `OLD` is never null; migration already applied to prod, cannot retro-edit |

No blocker-level anti-patterns found. No unreferenced TBD/FIXME/XXX markers in any phase-touched file.

### Human Verification Required

### 1. E2E notification smoke in CI

**Test:** Run `tests/e2e/tests/notifications.spec.ts` under `--project=owner-axe` (as CI's `e2e-smoke` job does)
**Expected:** All 4 tests pass: bell opens popover, mark-all-read clears badge (gated on unread), `/notifications` renders, Settings shows no SMS/push
**Why human:** Requires a live app + authenticated browser session; not executable in this static-review workspace

### 2. Edge-function redeploy for notifyFinalizeFailed

**Test:** Redeploy `lease-signature` and `sign-lease-token` edge functions via `bun scripts/deploy-edge-functions.ts`, then confirm via `mcp__supabase__get_edge_function` that the bundled source contains `notifyFinalizeFailed`
**Expected:** Both functions' live bundles include the Phase 52 helper (added 2026-07-19); the prior deploy of these two functions was 2026-07-17 (v9.0 remediation), predating this change
**Why human:** CLI `functions deploy` 401s (documented project gotcha); requires the disk-reading deploy script + MCP verification

### 3. Deno edge-function unit tests

**Test:** `deno test --allow-all --no-check --import-map=supabase/functions/deno.json supabase/functions/tests/lease-signing-test.ts`
**Expected:** The two new fake-rpc-recorder assertions (`lease_finalize_failed` on upload-error and email-failure branches) pass
**Why human:** deno is not installed in this verification environment; the logic was checked by source inspection only

### 4. Regenerate generated Supabase types

**Test:** `bun run db:types` (or MCP `generate_typescript_types` fallback)
**Expected:** `src/types/supabase.ts` gains `create_notification`, `cleanup_old_notifications`, and `notifications_archive`
**Why human:** Owner PAT refresh required; currently a non-blocking gap because `create_notification` is only called from untyped Deno edge-function code, never from typed frontend code

### 5. Prod RLS integration tests

**Test:** `bun run test:integration -- notifications.rls.test.ts notifications-retention.rls.test.ts` (needs `.env.local`)
**Expected:** All dual-client owner-isolation, privilege-boundary, and trigger-insertion assertions pass live against prod
**Why human:** `.env.local` is intentionally absent from this workspace; this test hits prod and is designed to run in CI `rls-security` on the PR

### Gaps Summary

No code-level gaps found. All 11 requirement IDs (NOTIF-01..05, ACT-01/02, HONEST-01/02, CLEAN-01/02) and all 5 ROADMAP success criteria are satisfied in the codebase: the notification write-path RPC, 6 event triggers, retention cron, orphan-schema reconcile, data-layer hooks, bell/popover/inbox UI, dashboard activity card, and channel-honesty settings removal all exist, are substantive, and are wired correctly. The phase's own code review (52-REVIEW.md) found one BLOCKER (CR-01, duplicate lease-sign notifications from an unreconciled legacy direct-insert path) and three warnings; all were fixed on this branch and independently re-verified here by reading the fix migration/source directly (not just trusting the review's "fixed" claim) — the two legacy signing RPCs no longer contain `insert into public.notifications`.

The `human_needed` status reflects five verification steps that require a live environment, CI, or owner tooling access this review session does not have (E2E run, Deno test run, edge-fn redeploy, db:types regen, prod RLS integration run) — none of these represent missing or stub code; they are execution/deployment confirmations that could not be performed from a static code review. The most operationally significant of the five is #2 (edge-fn redeploy): the `notifyFinalizeFailed` code is correct and unit-test-covered by inspection, but its live prod behavior is unconfirmed until the two signing edge functions are redeployed with the Phase 52 `_shared/lease-signing.ts` change.

---

_Verified: 2026-07-19T21:17:05Z_
_Verifier: Claude (gsd-verifier)_
