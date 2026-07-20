---
phase: 52-notification-center-activity-feed-channel-honesty
reviewed: 2026-07-19T20:57:25Z
depth: deep
files_reviewed: 21
files_reviewed_list:
  - src/app/(owner)/dashboard/page.tsx
  - src/app/(owner)/notifications/page.tsx
  - src/app/(owner)/settings/page.tsx
  - src/components/dashboard/dashboard-activity-card.tsx
  - src/components/notifications/notification-bell.tsx
  - src/components/notifications/notification-item.tsx
  - src/components/notifications/notification-popover-list.tsx
  - src/components/notifications/notifications-inbox.client.tsx
  - src/components/settings/notification-settings.tsx
  - src/components/shell/app-shell-header.tsx
  - src/hooks/api/query-keys/notification-keys.ts
  - src/hooks/api/use-dashboard-hooks.ts
  - src/hooks/api/use-notifications.ts
  - src/hooks/api/use-owner-dashboard.ts
  - src/hooks/api/use-owner-notification-settings.ts
  - supabase/functions/_shared/lease-signing.ts
  - supabase/migrations/20260719193759_create_notification_and_reconcile_rls.sql
  - supabase/migrations/20260719200224_notification_and_activity_event_triggers.sql
  - supabase/migrations/20260719202447_notifications_retention_cron.sql
  - supabase/migrations/20260719202453_reconcile_orphan_schema.sql
  - tests/e2e/playwright.config.ts
findings:
  critical: 1
  warning: 3
  info: 4
  total: 8
status: fixed
fixed_at: 2026-07-19T00:00:00Z
---

## Fix Outcome (2026-07-19)

Applied on branch `gsd/phase-52-notification-center-activity-feed-channel-honesty`. `bun run validate:quick` green after all fixes.

| Finding | Outcome | Commit | Notes |
|---------|---------|--------|-------|
| CR-01 | fixed | `c8e56a7b4` | New migration `20260719210000_single_notification_writer_rpcs.sql` strips the direct notification inserts from `record_lease_signature` + `sign_lease_with_token`; `trg_notify_owner_lease_esign` is now the sole writer. Not applied to prod here — orchestrator applies via MCP + reconciles the filename. |
| WR-01 | fixed | `0274744f3` | Popover mark-all-read disabled state now driven by `useUnreadCount()` (bell badge source), not the visible top-10 slice. |
| WR-02 | skipped | — | By design: preference toggles gate no send path because the suppression-honoring send rail that reads `notification_settings` is Phase 53's REMIND-03 scope (accepted deferral). |
| WR-03 | fixed | `47520a049` | `resolveHref` now rejects any backslash and any control character, closing the `/\evil.com` / `/\t//evil.com` protocol-relative open-redirect bypass; `/notifications` fallback preserved. |
| IN-01 | fixed | `e32d465dc` | Enable-all copy reworded from "across all channels" to "Turn on email and all notification categories". |
| IN-02 | skipped | — | Dead `old is null` predicate lives in already-applied prod migration `20260719200224`; retro-editing applied migrations is forbidden and the branch is harmless (correctly reduces to the transition check). |
| IN-03 | fixed | `e7cff57a0` | RLS test comments corrected to reconciled prod filenames `20260719200224` (triggers) / `20260719202447` (retention). |
| IN-04 | fixed | `a52bada66` | Inbox list query uses an explicit column list instead of `select('*')`; regression test assertion updated to match. |
---

# Phase 52: Code Review Report

**Reviewed:** 2026-07-19T20:57:25Z
**Depth:** deep (cross-file: import graph, trigger/RPC call chains, writer/reader contract consistency)
**Files Reviewed:** 21
**Status:** issues_found

## Summary

Reviewed the notification-center / activity-feed / channel-honesty phase end-to-end: the `create_notification` write-path RPC, the lease/maintenance/activity event triggers, the retention cron, the orphan-schema reconcile, the edge-fn finalize-failed notify path, the query-key/hook data layer, and the bell/popover/inbox/settings UI.

Most of the phase holds up under adversarial scrutiny. The six stated cross-file contracts verify cleanly against the actual code:

- The 5 `notification_type` strings (`lease_signed`, `lease_executed`, `lease_finalize_failed`, `maintenance_created`, `maintenance_status`) match byte-for-byte across the trigger migration, `lease-signing.ts`, and the `TYPE_VISUALS` map.
- `notifyFinalizeFailed` is invoked at all 5 finalize failure exits (grep count 6 = 1 def + 5 calls; verified against the upload/render/claim/download/send exits).
- Unread badge is a HEAD `count:exact` query with `refetchInterval: 60_000`.
- Both mutations invalidate `notificationKeys.all` + `ownerDashboardKeys.all`.
- The settings UI component carries no SMS/push/inApp references.
- `create_notification` and `cleanup_old_notifications` are `revoke all from public` + `grant execute to service_role`, RLS is owner-scoped with `(select auth.uid())`, and the archive/cleanup are service_role-only (RLS integration tests pin both privilege boundaries).
- All chip/glyph utility tokens (`icon-bg-*`, `activity-*`, `*-text`) exist in `globals.css`; deep-link routes `/leases/[id]` and `/maintenance/[id]` exist; the dropped orphan-schema objects have no lingering references.

**However, one BLOCKER exists:** the phase added the `trg_notify_owner_lease_esign` trigger without reconciling the pre-existing, still-live signing RPCs (`record_lease_signature`, `sign_lease_with_token`) that already direct-insert notifications on the exact same lease UPDATEs. The result is duplicate (2-3x) owner notifications per signing event, plus an off-contract `notification_type='lease'` row that renders with the fallback Bell icon — directly breaking the core feature the phase ships and violating the phase's own NOTIF-01 "single un-bypassable insert point" contract.

## Critical Issues

### CR-01: Duplicate owner notifications on lease sign/activation — signing RPCs still direct-insert alongside the new trigger

**File:** `supabase/migrations/20260719200224_notification_and_activity_event_triggers.sql:38-81` (new trigger) colliding with live `record_lease_signature` (`supabase/migrations/20260617165226_esign_persist_signature_consent.sql:57,148`) and live `sign_lease_with_token` (`supabase/migrations/20260717202529_esign_notify_reason_order_email_tracking.sql:122-141`)

**Issue:**
The new `trg_notify_owner_lease_esign` trigger fires `AFTER UPDATE ON leases` and creates `lease_signed` / `lease_executed` notifications on the tenant-signature and activation transitions. But the two signing RPCs that perform those exact UPDATEs were never reconciled — they still contain their own `insert into public.notifications (...)` with `notification_type = 'lease'`. Both writers now run on the same statements:

- **Owner signs (tenant already signed) — `record_lease_signature`:** the `update leases set lease_status='active'` fires the trigger -> `lease_executed` "Lease fully executed"; the RPC then direct-inserts "Lease fully signed" (`type 'lease'`). **2 notifications for one activation.**
- **Tenant signs first, completes (owner already signed) — `sign_lease_with_token`:** `update ... tenant_signed_at` fires trigger -> `lease_signed`; `update ... lease_status='active'` fires trigger -> `lease_executed`; RPC direct-inserts "Lease fully signed" (`type 'lease'`). **3 notifications for one event.**
- **Tenant signs first, not yet complete — `sign_lease_with_token` else branch:** `update ... tenant_signed_at` fires trigger -> `lease_signed` "Tenant signed the lease"; RPC direct-inserts "Tenant signed the lease" (`type 'lease'`). **2 identical-title notifications** (one `FileSignature` icon, one fallback `Bell`).

Two independent contract violations compound the impact:
1. **NOTIF-01 breach.** The phase's own `create_notification` migration header declares it "the single, un-bypassable system insert point ... Every later v10.0 phase publishes notifications through this one RPC." The signing RPCs bypass it with raw INSERTs.
2. **5-type contract breach.** The RPCs write `notification_type='lease'`, a 6th type outside the byte-identical 5-type set. `TYPE_VISUALS` has no `'lease'` key, so those rows fall to `FALLBACK_VISUAL` (Bell, muted chip) — visibly inconsistent next to the trigger's correctly-iconed rows.

This is not theoretical: both RPCs are the current canonical/live definitions (no later migration removes the inserts), and the Phase 52 triggers are applied to prod per the phase context. Every real lease signing now produces duplicate owner notifications.

**Fix:**
Ship a migration that strips the direct `insert into public.notifications (...)` blocks from both signing RPCs (all branches), leaving `trg_notify_owner_lease_esign` as the sole writer. The trigger already covers every case the RPCs did (tenant-signed -> `lease_signed`; activation -> `lease_executed`), so removal is complete, not lossy — and it restores the NOTIF-01 single-writer invariant. Sketch:

```sql
-- record_lease_signature: drop the `insert into public.notifications (... 'lease', 'lease' ...)`
-- block inside the `if v_lease.tenant_signed_at is not null then` activation branch;
-- keep the `update ... lease_status='active'` (the trigger fires on it).
create or replace function public.record_lease_signature(...) ... as $function$
  ...
  if v_lease.tenant_signed_at is not null then
    update public.leases set lease_status = 'active'
    where id = p_lease_id and lease_status <> 'active';
    -- notification now emitted by trg_notify_owner_lease_esign (lease_executed)
  end if;
  ...
$function$;

-- sign_lease_with_token: delete BOTH insert-into-notifications blocks
-- (the fully-signed branch and the tenant-first `else` branch); the trigger emits
-- lease_signed on the tenant_signed_at update and lease_executed on activation.
```

After the fix, add/extend an RLS or Deno assertion that a full signing produces exactly one `lease_signed` and one `lease_executed` row and zero `notification_type='lease'` rows, to pin the single-writer contract against future regressions.

## Warnings

### WR-01: Popover "Mark all read" is disabled while unread notifications exist outside the visible top-10

**File:** `src/components/notifications/notification-popover-list.tsx:29,39`

**Issue:**
`unreadVisible = rows.filter((row) => !row.is_read).length` counts only the loaded 10 popover rows, and the button is `disabled={unreadVisible === 0 || markAll.isPending}`. Notifications are ordered `created_at desc` while `is_read` is independent of recency: an owner who has read the 10 most-recent items but still has older unread ones will see `unreadVisible === 0` -> button disabled, even though the bell badge shows a nonzero unread count and `markAllNotificationsRead` would in fact mark those older rows read. The control misrepresents an available action and diverges from the header badge. (The full inbox at `notifications-inbox.client.tsx:44,61` gets this right by reading `useUnreadCount()`.)

**Fix:**
Drive the disabled state from the same header count the badge uses instead of the visible slice:

```tsx
import { useUnreadCount, useMarkAllNotificationsRead, useNotificationList } from "#hooks/api/use-notifications";
// ...
const { data: unreadCount = 0 } = useUnreadCount();
// ...
disabled={unreadCount === 0 || markAll.isPending}
```

`useUnreadCount` is already polled for the bell, so this dedupes rather than adding a query.

### WR-02: Email + category preference toggles persist but gate no send path (channel-honesty gap)

**File:** `src/components/settings/notification-settings.tsx:16-50` (and its writer `src/hooks/api/use-owner-notification-settings.ts:57-66`)

**Issue:**
The settings UI presents an "Email Notifications" channel toggle and three category toggles as functional delivery controls. They upsert to `notification_settings`, but a codebase-wide search shows nothing reads `notification_settings` at send time — the only readers/writers are the settings query/mutation hooks themselves. The signed-lease email in `lease-signing.ts` sends unconditionally (guarded only by `EMAIL_RE`), and `create_notification` explicitly ignores preferences (D-05). So under the phase's own HONEST-01/02 mandate, these toggles are the same class of defect the phase set out to remove: controls that look functional but change nothing. (This predates Phase 52 — the table is from `20251216120000` — but `notification-settings.tsx` was rewritten in-scope, so the honesty of what it now advertises is in scope.)

**Fix:**
Either wire the preferences into the relevant send/create paths (e.g. have non-transactional emails and the category filter consult `notification_settings` before dispatch), or, if these are intentionally transactional-always with the row kept as a forward-looking stored preference, add an in-UI honesty affordance and a code comment documenting that the toggles do not yet gate delivery — so the surface stops implying control it doesn't have. Confirm with the phase owner whether this was an accepted deferral before closing.

### WR-03: `resolveHref` open-redirect guard (T-52-15) misses the backslash / control-char bypass

**File:** `src/components/notifications/notification-item.tsx:49-54`

**Issue:**
The guard accepts any value where `startsWith("/") && !startsWith("//")`. Browsers normalize backslashes to forward slashes in URLs, so a value like `"/\\evil.com"` (or `"/\t//evil.com"` with a leading control char) passes the check yet resolves to a protocol-relative `//evil.com` open redirect. Practical exploitability today is essentially nil — `action_url` is only written by `create_notification` (service_role) with hardcoded app-relative literals, and there is no user-input path into it — but this is explicitly a security guard, so an incomplete one is worth closing while the fix is trivial.

**Fix:**
Reject backslashes and non-`[A-Za-z0-9/]` leading characters, and prefer parsing:

```ts
function resolveHref(actionUrl: string | null): string {
  if (
    actionUrl &&
    actionUrl.startsWith("/") &&
    !actionUrl.startsWith("//") &&
    !actionUrl.includes("\\") &&
    !actionUrl.startsWith("/\t")
  ) {
    return actionUrl;
  }
  return "/notifications";
}
```

## Info

### IN-01: "Receive notifications across all channels" copy overstates the surface

**File:** `src/components/settings/notification-settings.tsx:80`

**Issue:** The Enable-All description says "across all channels," but Email is the only channel (SMS/push were removed for honesty). The phrasing mildly re-introduces the multi-channel implication the phase set out to drop.

**Fix:** Reword to something channel-accurate, e.g. "Turn on email and all notification categories."

### IN-02: Dead `old is null` predicate in `notify_owner_lease_esign`

**File:** `supabase/migrations/20260719200224_notification_and_activity_event_triggers.sql:47`

**Issue:** `(old is null or old.tenant_signed_at is null)` — the trigger is `AFTER UPDATE` only, so `OLD` is never null and `old is null` is always false. Harmless (the condition correctly reduces to the `old.tenant_signed_at is null` transition check) but dead.

**Fix:** Drop `old is null or` for clarity, or add a comment noting the branch was copied from a combined INSERT/UPDATE pattern.

### IN-03: RLS test comments reference non-existent (pre-reconcile) migration filenames

**File:** `tests/integration/rls/notifications.rls.test.ts:132` and `tests/integration/rls/notifications-retention.rls.test.ts:27`

**Issue:** Comments cite `20260719130000_notification_and_activity_event_triggers` and `20260719140000_notifications_retention_cron`, but the reconciled prod filenames are `...200224_...` and `...202447_...`. Documentation drift only (the tests themselves are timestamp-agnostic), but it will mislead a future reader trying to correlate a failing test to its migration.

**Fix:** Update the two comments to the reconciled `20260719200224` / `20260719202447` filenames.

### IN-04: List query uses `.select("*")` where CLAUDE.md reserves `*` for detail queries

**File:** `src/hooks/api/query-keys/notification-keys.ts:139`

**Issue:** The bounded inbox list uses `.select("*", { count: "exact" })`; CLAUDE.md Data Access says to prefer explicit column lists for list queries and reserve `*` for detail reads. Harmless here — `mapNotificationRow` consumes every column, so `*` transfers nothing extra — but it deviates from the stated convention.

**Fix (optional):** Enumerate the columns the mapper reads (`id,user_id,notification_type,title,message,entity_type,entity_id,action_url,is_read,read_at,created_at`) to align with the convention.

---

_Reviewed: 2026-07-19T20:57:25Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_

---

## Perfect-PR Cycle 1

**C3 (major, security) — /notifications missing from PRIVATE_ROUTE_PREFIXES:** FIXED by orchestrator — added "/notifications" to `src/lib/routes/private-routes.ts` (single source of truth for the proxy auth/subscription/MFA/CSP gate AND the robots disallow list); middleware-routing suite 33/33 green.

Applied on branch `gsd/phase-52-notification-center-activity-feed-channel-honesty`
in the main working tree. `bun run validate:quick` green after all fixes
(287 test files / 106804 tests, typecheck + lint clean).

Cycle-1 findings: 13 confirmed (`C*`) + 2 split (`S*`). The four DB findings
were fixed and already applied to prod via MCP (introspection-verified); the
two new migration files are the repo record and were committed here. `C13` is a
PR-body overclaim resolved by the orchestrator via `gh pr edit`. All remaining
findings map to atomic commits on this branch.

| Finding | Severity | Summary | Outcome | Commit |
|---------|----------|---------|---------|--------|
| C1 | critical | `notifications_archive` inherited `authenticated`/`anon` table grants (service_role-only posture) | fixed + prod-applied (migration `20260720001657`) | `a6c2786ef` |
| C4 | critical | Same grant leak on `notifications_archive` for `anon` — revoked outright | fixed + prod-applied (migration `20260720001657`) | `a6c2786ef` |
| C5 | critical | `notifications_service_role` used `FOR ALL` — split into four per-operation service_role policies | fixed + prod-applied (migration `20260720001657`) | `a6c2786ef` |
| C6 | critical | `notifications_notification_type_check` rejected the 5-type Phase 52 contract values, aborting maintenance-create + lease-sign triggers | fixed + prod-applied (migration `20260720001542`) | `a6c2786ef` |
| C7 | critical | `cleanup-notifications` cron collided with `process-account-deletions` at 3:45 — moved to the free 3:50 slot | fixed + prod-applied (migration `20260720001657`) | `a6c2786ef` |
| C2 | nit | Inbox `page` state never clamped when `totalCount` shrinks (retention/deletes) — stranded on an empty page with pagination hidden | fixed (clamp effect + unit test) | `a2436b0da` |
| C8 | minor | `resolveHref` open-redirect guard had zero tests — exported + covered (protocol-relative, backslash, control-char, `javascript:`, absolute, null/empty) | fixed (export + guard test suite) | `a2286e2b4` |
| C9 | minor | `mapDashboardActivityRow` untested and silently emitted `undefined` — hardened to throw on missing NOT NULL fields + exported + tested | fixed (mapper hardening + unit test); logic change, human-verify the throw contract | `abbe373c5` |
| C10 | minor | Mark-all-read e2e skip gate read the bell aria-label before the unread-count query resolved (race → false skip) | fixed (reload + `waitForResponse` on HEAD count + stability poll) | `f710bef6c` |
| C11 | minor | Notification popover had no error state — a failed list query fell through to the "all caught up" empty state | fixed (error branch + Retry + unit test) | `2b7882e0a` |
| C12 | minor | Cmd+K palette "Notifications" entry routed to `/settings?tab=notifications` instead of the notification center | fixed (points at `/notifications`; test updated) | `718c60cea` |
| C13 | minor | PR body overclaimed scope | fixed by orchestrator (`gh pr edit`) | — |
| S1 | split | Popover never closed on navigation (row click-through / View-all left it open) | fixed (bell owns controlled `open`; `onNavigate` close; D-10 preserved; bell test extended) | `b77b1815a` |
| S2 | split | Quick-actions dock Bell action routed to `/settings?tab=notifications` | fixed (points at `/notifications`; dock href test updated) | `718c60cea` |

Notes:
- C12/S2 are the two nav entry points (Cmd+K palette + dock) fixed together in
  one commit. The genuine notification-*settings* links (profile Quick Links,
  the Settings > Notifications tab, and the HONEST-01/02 e2e settings probe)
  were intentionally left pointing at `/settings?tab=notifications`.
- C9 changes runtime behavior (throw on missing NOT NULL fields) to match the
  `mapNotificationRow`/`mapDocumentRow` boundary-mapper convention — flagged for
  human confirmation of the contract.

_Cycle 1 fixed: 2026-07-19_
_Fixer: Claude (gsd-code-fixer)_

---

## Perfect-PR Streak Cycle (2026-07-20)

Applied on branch `gsd/phase-52-notification-center-activity-feed-channel-honesty`
in the main working tree. `bun run validate:quick` green after all fixes
(288 unit test files / 106811 tests, typecheck + lint clean).

Streak-cycle findings: 11 confirmed (`C1`-`C11`) + 1 split (`S1`) = 12. The four
DB findings (C1/C2/C3/C11) were fixed and already applied to prod via MCP
(introspection-verified); the new migration file
`20260720015620_retention_gdpr_and_writer_hardening.sql` is the repo record and
was committed here. C5 and C10 are the same stale-schedule comment flagged by two
review dimensions, closed in one commit. All remaining findings map to atomic
commits on this branch.

| Finding | Severity | Summary | Outcome | Commit |
|---------|----------|---------|---------|--------|
| C1 | critical | `notifications_archive` inherited the old 4-value `notification_type` CHECK via `LIKE INCLUDING ALL` — first new-type row to age out would abort the nightly cleanup; drop the copied constraint | fixed + prod-applied (migration `20260720015620`) | `d2d8791d3` (orchestrator) |
| C2 | critical | GDPR cascade `anonymize_deleted_user` deleted live notifications but never `notifications_archive`, leaving deleted users' titles/messages in cold storage indefinitely; add the archive delete | fixed + prod-applied (migration `20260720015620`) | `d2d8791d3` (orchestrator) |
| C3 | critical | the 6 new SECURITY DEFINER trigger functions kept default PUBLIC EXECUTE, regressing the pass-3 revoke convention; revoke from public/anon/authenticated | fixed + prod-applied (migration `20260720015620`) | `d2d8791d3` (orchestrator) |
| C4 | minor | Email/Maintenance/Lease/General `Switch` toggles had no accessible name (only Enable-All carried an aria-label) — added an aria-label per visible label + role+name test | fixed | `8dba4a9e7` |
| C5 | nit | RLS retention test doc comment cited the pre-move `45 3 * * *` schedule | fixed (with C10) | `11e946ff3` |
| C6 | minor | `ownerAId` assigned in `beforeAll` but never read in the retention RLS test — removed the variable + dead `getUser()` lookup | fixed | `f8b445b22` |
| C7 | minor | `NotificationItem` click-through mark-read had zero tests — added coverage (unread → mark-read+navigate; read → navigate only; popover open/close → no mark-read, D-10) | fixed | `f05dfeca1` |
| C8 | nit | popover Mark-all-read disabled-state (WR-01) unpinned — added the two cases (disabled at 0 unread; enabled at >0 even when the visible 10 are all read) | fixed | `7c6dae48c` |
| C9 | nit | e2e determinism gate's stability poll seeded `previous` from an immediate read, so the first probe (t=0) could report settled from two reads milliseconds apart and still false-skip; seed `previous` null so stability needs two reads >=500ms apart | fixed | `d4ba804a5` |
| C10 | nit | same stale-schedule comment site as C5 — corrected to `50 3 * * *` (the cycle-1 free 3:50 slot) | fixed (with C5) | `11e946ff3` |
| C11 | critical | `expire_leases()` still direct-inserted into `notifications`, breaching the NOTIF-01 single-writer invariant — routed through `create_notification` (gains an app-relative action_url) | fixed + prod-applied (migration `20260720015620`) | `d2d8791d3` (orchestrator) |
| S1 | nit | list factory `totalCount: count ?? rows.length` deviated from the `count ?? 0` convention (CLAUDE.md: never `data.length`) — aligned + regression test on the null-count case | fixed | `0a85a740b` |

Notes:
- C1/C2/C3/C11 were applied to prod by the orchestrator via MCP and
  introspection-verified; `d2d8791d3` commits the migration file as the immutable
  repo record (header documents the prod-apply + verification).
- C5/C10 are one comment corrected once; both review IDs close on `11e946ff3`.

_Streak cycle fixed: 2026-07-20_
_Fixer: Claude (gsd-code-fixer)_

## Perfect-PR Streak Cycle 2 (2026-07-20)

2 confirmed minors + 1 split (refuted), 0 killed:
- **CONFIRMED (fixed):** `RawDashboardActivityRow` duplicated the generated `activity` table Row — replaced with a `Database["public"]["Tables"]["activity"]["Row"]` alias (CLAUDE.md rule #3, NotificationRow pattern).
- **CONFIRMED (fixed):** trigger coverage — added RLS integration assertions for the `maintenance_status` UPDATE branch and the property/maintenance activity audit writes incl. cross-owner isolation on `activity`.
- **SPLIT (refuted, no change):** "DashboardActivityCard has no error state" — unreachable: the card shares the dashboard base query; on failure the page-level `statsError || chartsError` branch renders "Unable to load dashboard data" before the card mounts (dashboard/page.tsx:102-124).

## Perfect-PR Streak Cycle 3 (2026-07-20)

1 confirmed minor, 0 split, 0 killed:
- **CONFIRMED (fixed):** mark-all-read click-to-mutation wiring untested (unit mocks used throwaway spies; e2e self-skips at 0 unread) — stable `h.markAll` spy wired into both mock factories + click assertions added in the popover and inbox suites.

## Perfect-PR Streak Cycle 4 (2026-07-20)

2 confirmed minors (fixed), 0 split, 1 killed:
- **CONFIRMED (fixed + prod-applied):** `notifications_user_unread_created_idx` was fully redundant with `idx_notifications_user_unread` (partial) + `idx_notifications_user_created` — dropped via `20260720151257` (write-amplification removal, index-consolidation doctrine).
- **CONFIRMED (fixed):** inbox pagination lacked a tiebreaker while same-transaction notifications share byte-identical `created_at` — secondary `.order("id")` added to the list factory.
- **KILLED:** "C2 clamp unreachable due to PGRST103 416" — both refuters refuted.

## Perfect-PR Streak Cycles 5-6 (2026-07-20)

- **Cycle 5: ZERO findings** (streak 1/2 on 8a6a26bf2).
- **Cycle 6 (independent pass, same head): 1 confirmed minor (fixed), 1 killed** — `formatRelativeDate` off-by-one for past dates (`absDays + 1` rendered yesterday as "2 days ago"); latent pre-existing bug made user-visible by its FIRST production consumer (the activity card); the old unit test pinned the wrong output. Fixed verbatim-distance + singular unit; test re-pinned with 4 cases. Streak reset.

## Perfect-PR Streak Cycle 7 (2026-07-20)

1 confirmed minor (fixed), 1 split (PR-body staleness — adjudicated real-but-metadata; body refreshed via gh pr edit, not a code change):
- **CONFIRMED (fixed):** the `/notifications` PRIVATE_ROUTE_PREFIXES entry (the route's only auth barrier) had no regression pin — removing it passed every suite. Added the unauthenticated `/notifications` → `/login?redirect=/notifications` case to middleware-routing.test.ts (34/34).
- PR body corrected: 9 migrations (5 phase + 4 review fixes), dropped-index bullet removed, streak-cycle section added.

## Perfect-PR Streak Cycles 8-9 (2026-07-20)

- **Cycle 8: ZERO findings** (streak 1/2 on d864c77fd).
- **Cycle 9 (deciding pass): 1 confirmed minor (fixed)** — the inbox `page -> {from,to}` fetch-window glue was pinned by no layer (mock ignored hook args); added opts-capturing mock + window assertions for pages 1/2/back. Streak reset.

## Perfect-PR Streak Cycles 10-11 (2026-07-20)

- **Cycle 10: ZERO findings** (streak 1/2 on 094ff2ba0).
- **Cycle 11 (deciding pass): 1 confirmed minor (fixed + prod-applied)** — LIKE INCLUDING ALL copied 3 redundant indexes onto notifications_archive (incl. the composite the PR itself condemned); pruned via `20260720185756`, archive keeps exactly {pkey, user_id_created_at_idx1}. Streak reset.
