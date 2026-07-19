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
