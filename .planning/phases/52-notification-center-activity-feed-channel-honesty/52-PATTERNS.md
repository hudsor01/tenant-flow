# Phase 52: Notification Center, Activity Feed & Channel Honesty - Pattern Map

**Mapped:** 2026-07-19
**Files analyzed:** 21 (new + modified across frontend, DB migrations, tests)
**Analogs found:** 20 / 21 (1 partial — retention RLS test has no direct dual-client analog)

> This phase surfaces an already-provisioned backend. Almost every new file has a strong in-repo analog. The dominant failure mode is *rebuilding* provisioned infra (RLS already exists) instead of *mirroring* the existing write-path/trigger/cron patterns. Copy the analogs verbatim; do not invent new shapes.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/hooks/api/query-keys/notification-keys.ts` (NEW) | query-key factory | CRUD / request-response (HEAD count + list) | `src/hooks/api/query-keys/property-stats-keys.ts` (HEAD count) + `document-keys.ts` (factory + mapper shape) | exact |
| `src/hooks/api/use-notifications.ts` (NEW) | hook (mutations + reads) | CRUD (mark-read / mark-all-read) | `src/hooks/api/use-tenant-mutations.ts` + `use-owner-notification-settings.ts` | exact |
| `src/components/notifications/notification-bell.tsx` (NEW) | component (client island) | request-response (60s poll) | `src/components/shell/app-shell-search.tsx` (island) + `expiring-leases-widget.tsx` (query island) | exact |
| `src/components/notifications/notification-popover-list.tsx` (NEW) | component | request-response | `expiring-leases-widget.tsx` (list branch) + `app-shell-search.tsx` (CommandDialog density) | exact |
| `src/components/notifications/notification-item.tsx` (NEW) | component | transform (row render) | `expiring-leases-widget.tsx` row (lines 78-112) | exact |
| `src/components/dashboard/dashboard-activity-card.tsx` (NEW) | component | request-response (selector) | `src/components/dashboard/expiring-leases-widget.tsx` (verbatim structure) | exact |
| `src/app/(owner)/notifications/page.tsx` (NEW) | route (owner page) | request-response | `src/app/(owner)/maintenance/page.tsx` (thin server page + client) | exact |
| `supabase/migrations/<ts>_create_notification_rpc.sql` (NEW) | migration (SECURITY DEFINER RPC) | event-driven (system write path) | `record_lease_signature` in `20260617142623_token_based_lease_esignature.sql` | exact |
| `supabase/migrations/<ts>_notification_event_triggers.sql` (NEW) | migration (triggers) | event-driven | `log_lease_signature_activity` (`20260616161248`) + `notify_n8n_maintenance` guard (`20260222130000`) | exact |
| `supabase/migrations/<ts>_notifications_retention_cron.sql` (NEW) | migration (cron + archive) | batch / retention | `cleanup_old_security_events` + archive table + `cron.schedule` (`20260306170000`) | exact |
| `supabase/migrations/<ts>_drop_notification_sms_push_columns.sql` (NEW) | migration (column drop) | schema | `alter table … drop column if exists` (`20260616161248` line 73) | exact |
| `supabase/migrations/<ts>_reconcile_orphan_schema.sql` (NEW) | migration (idempotent drop) | schema | `drop policy/function if exists` (`20260616161248` lines 40-44) | role-match |
| `src/components/shell/app-shell-header.tsx` (MOD) | component | — | self (lines 129-137, swap `<Link>` → `<NotificationBell/>`) | exact |
| `src/components/settings/notification-settings.tsx` (MOD) | component | CRUD (toggles) | self (remove SMS/push/in-app blocks) | exact |
| `src/hooks/api/use-owner-notification-settings.ts` (MOD) | hook | CRUD | self (drop sms/push from mapper, lines 45-48) | exact |
| `src/hooks/api/query-keys/owner-notification-settings-keys.ts` (MOD) | query-key factory | — | self (mapper lines 21-32, defaults 34-44) | exact |
| `src/types/notifications.ts` (MOD) | type | — | self (`NotificationChannelPreferences` lines 97-108) | exact |
| `src/hooks/api/use-dashboard-hooks.ts` (MOD) | hook | request-response (selector) | self (`selectStats`/`selectCharts`, add `selectActivity`) | exact |
| `src/app/(owner)/dashboard/page.tsx` (MOD) | route | — | self (lines 157-159, add `DashboardActivityCard` to grid) | exact |
| `tests/integration/rls/notifications.rls.test.ts` (MOD) | test | — | self + `activity.rls.test.ts` (extend with trigger/`create_notification` cases) | exact |
| `tests/integration/rls/notifications-retention.rls.test.ts` (NEW, optional) | test | — | `notifications.rls.test.ts` dual-client harness | partial |

---

## Pattern Assignments

### `src/hooks/api/query-keys/notification-keys.ts` (query-key factory, HEAD count + list)

**Analogs:** `src/hooks/api/query-keys/property-stats-keys.ts` (HEAD count) + `src/hooks/api/query-keys/document-keys.ts` (factory shape, typed mapper, bounded list)

**HEAD `count:exact` pattern for the unread badge** — copy from `property-stats-keys.ts` lines 124-142 (this is the ONLY `head:true` usage in the codebase; the unread poll must use it, never `data.length`):
```typescript
const { count, error } = await supabase
  .from("properties")
  .select("id", { count: "exact", head: true })   // HEAD — zero rows transferred
  .neq("status", "inactive");
```
For notifications: `.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false)`. Badge display per D-11: `count > 9 ? "9+" : String(count)`.

**`refetchInterval` source** — `src/lib/constants/query-config.ts` lines 55-59 defines a `REALTIME` preset at **30s**. D/RESEARCH want **60s** for notifications, so set `refetchInterval: 60_000` explicitly on the `unreadCount` queryOptions (do NOT reuse `REALTIME` verbatim — it polls twice as often as this phase wants):
```typescript
REALTIME: {
  staleTime: 0,
  refetchInterval: 30 * 1000, // ← notification unreadCount overrides to 60_000
  gcTime: 5 * 60 * 1000,
},
```

**Factory + typed-mapper shape** — copy from `document-keys.ts` lines 178-239 (`documentQueries` object with `all()`/`lists()`/`list()` + a `mapNotificationRow(raw: Record<string, unknown>)` boundary mapper mirroring `mapDocumentRow` lines 121-151). Notification Row shape (from generated types `src/types/supabase.ts` lines 1185-1197): `action_url, created_at, entity_id, entity_type, id, is_read, message, notification_type, read_at, title, user_id`. Note `is_read`, `created_at`, `action_url`, `entity_*`, `message`, `read_at` are all `| null`; `notification_type`, `title`, `user_id`, `id` are NOT NULL.

**Bounded list pattern** — copy `document-keys.ts` lines 192-208 (`{ count: "exact" }` + `.order("created_at", { ascending: false })` + `.limit()`/`.range()`). Popover = `.limit(10)`; `/notifications` page = `.range(from, to)` + `{ count: 'exact' }`. Per CLAUDE.md every list query MUST be bounded.

**Standard imports** (mirror `document-keys.ts` lines 19-26): `queryOptions`/`mutationOptions` from `@tanstack/react-query`; `createClient` from `#lib/supabase/client`; `getCachedUser` from `#lib/supabase/get-cached-user`; `handlePostgrestError` from `#lib/postgrest-error-handler`. `createClient()` is called INSIDE each queryFn (never module-level — CLAUDE.md Hook Organization).

---

### `src/hooks/api/use-notifications.ts` (hook, mark-read / mark-all-read mutations)

**Analog:** `src/hooks/api/use-tenant-mutations.ts` (mutation + `createMutationCallbacks` + invalidation) and `use-owner-notification-settings.ts` (optimistic pattern).

**Mutation + invalidation pattern** — copy `use-tenant-mutations.ts` lines 30-40. Every mutation invalidates its domain keys AND `ownerDashboardKeys.all` (CLAUDE.md mandate; `ownerDashboardKeys` from `./query-keys/owner-dashboard-keys`, `.all = ["owner-dashboard"]`):
```typescript
export function useCreateTenantMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    ...tenantMutations.create(),
    ...createMutationCallbacks(queryClient, {
      invalidate: [tenantQueries.lists(), ownerDashboardKeys.all],
      successMessage: "Tenant created successfully",
      errorContext: "Create tenant",
    }),
  });
}
```
For notifications, mark-read/mark-all-read invalidate: `notificationKeys.all` (list + unreadCount) + `ownerDashboardKeys.all`.

**Mark-all-read UPDATE** (RESEARCH Code Examples; `notifications_update_own` RLS already authorizes) — note the column is **`is_read`** not `read`:
```typescript
await supabase.from("notifications")
  .update({ is_read: true, read_at: new Date().toISOString() })
  .eq("user_id", user.id).eq("is_read", false);
```
⚠ **Column-name trap:** the existing `notifications.rls.test.ts` line 90 does `.update({ read: true })` — `read` is NOT a column (generated types line 1191 confirm `is_read`). That is a latent bug in the test; the new mutation code must use `is_read`, and the RLS-test update to this phase should fix the test's column too.

**Optimistic update option** (if the row-click optimistic mark is wanted) — copy the `onMutate`/`onError`/`onSettled` optimistic block from `use-owner-notification-settings.ts` lines 79-140 (cancelQueries → snapshot → setQueryData → rollback on error).

---

### `src/components/notifications/notification-bell.tsx` (client island, 60s poll + badge + popover trigger)

**Analogs:** `src/components/shell/app-shell-search.tsx` (a header client island) + `src/components/dashboard/expiring-leases-widget.tsx` (query-driven island — the `"use client"` + `useQuery` + loading/empty branch pattern).

**Island shape** — `"use client"` directive at top (mirror `expiring-leases-widget.tsx` line 1), `useQuery(notificationQueries.unreadCount())` for the badge, `Bell` from `lucide-react`. Mounts in `app-shell-header.tsx` as a sibling of `GlobalSyncIndicator` (see header MOD below). Ghost icon-button `p-2 rounded-md hover:bg-muted` matches the current bell button (`app-shell-header.tsx` lines 131-137).

**Badge** — `Badge` from `#components/ui/badge`, positioned `absolute -top-1 -right-1`, `bg-primary text-primary-foreground text-xs font-semibold`, hidden entirely at count 0. Accessible label per UI-SPEC: `aria-label` = `"Notifications"` when 0 unread, `"Notifications, {n} unread"` when >0 (CLAUDE.md icon-only-button rule).

---

### `src/components/notifications/notification-item.tsx` + `notification-popover-list.tsx` (rows + popover list)

**Analog:** `src/components/dashboard/expiring-leases-widget.tsx` — the row + list structure is the named UI-SPEC mirror. Copy the row markup (lines 78-112) verbatim in structure:
```tsx
<li key={lease.id} className="py-3">
  <Link href={`/leases/${lease.id}`}
    className="flex items-center justify-between gap-3 rounded-md -mx-2 px-2 py-1.5 transition-colors hover:bg-accent">
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium text-foreground">{lease.tenant_name ?? "Tenant"}…</p>
      <p className="truncate text-xs text-muted-foreground">{lease.property_name} · ends …</p>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-xs font-semibold …">{days} days</span>
      <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
    </div>
  </Link>
</li>
```
Notification row deltas (per UI-SPEC surface layout #3): `Link href={action_url}` (app-relative deep link only — open-redirect guard, never external), leading `icon-bg-*` chip or `size-2 bg-primary rounded-full` unread dot, title weight **600 if unread / 400 if read**, `divide-y divide-border` between rows, trailing `ChevronRight`. Click marks that item read then navigates (D-03/D-10).

**"View all" footer link** — copy `expiring-leases-widget.tsx` lines 116-123 (`text-sm font-medium text-primary-text hover:underline`). Routes to `/notifications` (D-01).

**Popover density** — `app-shell-search.tsx` `CommandDialog` (lines 57-133) is the D-02 density reference. Use `Popover`/`PopoverContent` (`#components/ui/popover`) `align="end" sideOffset={8} w-80 p-0`; body `max-h-96 overflow-y-auto`; sticky header/footer with `Separator`.

**Loading / empty** — copy `expiring-leases-widget.tsx` loading branch (lines 31-48: `Array.from({ length: 3 }).map` → `<Skeleton className="h-12 w-full" />`). Empty state uses the `Empty` compound (`#components/ui/empty`) per CLAUDE.md — compact inline variant in the popover, full `Empty` on the `/notifications` page.

---

### `src/components/dashboard/dashboard-activity-card.tsx` (activity card, ACT-01)

**Analog:** `src/components/dashboard/expiring-leases-widget.tsx` — the UI-SPEC says mirror it "verbatim in structure." Copy the whole `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent` scaffold (lines 28-128) including the `"use client"` + `useQuery` + isLoading skeleton branch.

**Data source (no new fetch)** — mirror the `select`-based dashboard hooks in `src/hooks/api/use-dashboard-hooks.ts` (lines 35-53). Add `selectActivity` + `useDashboardActivity` there:
```typescript
const selectActivity = (data: OwnerDashboardData): ActivityItem[] => data.activity;
export function useDashboardActivity() {
  return useQuery({ ...DASHBOARD_BASE_QUERY_OPTIONS, select: selectActivity });
}
```
Consumes `ActivityItem[]` from `#types/activity` (lines 38-52). Data is already in the dashboard query cache (`OwnerDashboardData.activity`) — the selector avoids an N+1 fetch.

**ACT-02 disambiguation (D-08 attention-vs-audit):** activity rows carry NO unread dot, NO badge, NO chevron, NO read state (that visual asymmetry vs. notification rows IS the design pass). Empty → `Empty` compact ("No activity yet").

**Grid placement (MOD `src/app/(owner)/dashboard/page.tsx`)** — currently `ExpiringLeasesWidget` sits alone full-width at lines 157-159:
```tsx
<div className="px-6 lg:px-8 pb-6 lg:pb-8">
  <ExpiringLeasesWidget />
</div>
```
UI-SPEC discretion: pair them in a 2-col grid — `<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 lg:px-8 pb-6 lg:pb-8"><ExpiringLeasesWidget /><DashboardActivityCard /></div>`.

---

### `src/app/(owner)/notifications/page.tsx` (owner route, full inbox)

**Analog:** `src/app/(owner)/maintenance/page.tsx` (12 lines) — thin server component that exports `metadata` and renders a client component:
```tsx
import type { Metadata } from "next";
import { MaintenanceViewClient } from "#components/maintenance/maintenance-view.client";

export const metadata: Metadata = {
  title: "Maintenance Requests",
  description: "…",
};

export default function MaintenancePage() {
  return <MaintenanceViewClient />;
}
```
Copy this exactly: `page.tsx` exports `metadata` (`title: "Notifications"`) + renders a `NotificationsInboxClient` (`"use client"`) that owns the paginated `.range()` list + mark-all-read. The page lives inside the `(owner)` app shell (auth handled by proxy middleware; no per-page guard needed). Do NOT add a `@modal` slot or `[...catchAll]` — plain route + Popover only (RESEARCH anti-pattern; re-breaks 404s app-wide).

---

### `supabase/migrations/<ts>_create_notification_rpc.sql` (SECURITY DEFINER write-path RPC)

**Analog:** `record_lease_signature` in `supabase/migrations/20260617142623_token_based_lease_esignature.sql` (lines 121-131 header, 351-356 grants). The exact scaffold to mirror:

**Header** (`record_lease_signature` lines 121-132):
```sql
create function public.record_lease_signature(
  p_lease_id uuid, p_signature_ip text, p_signature_user_agent text,
  p_signed_at timestamptz, p_method text default 'in_app'
)
  returns table (success boolean, both_signed boolean, error_message text)
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
```

**Grant discipline** (same migration lines 351-356) — REVOKE from public, GRANT to service_role only:
```sql
revoke all on function public.record_lease_signature(uuid, text, text, timestamptz, text) from public;
grant execute on function public.record_lease_signature(uuid, text, text, timestamptz, text) to service_role;
```
For `create_notification`: same `security definer` + `set search_path to 'public'`, plain `insert … returning id`, `revoke all … from public`, `grant execute … to service_role`. **Do NOT grant to `authenticated`** (clients could mint notifications for arbitrary users) and **do NOT gate on `auth.uid()`** (it runs from trigger/cron contexts) and **do NOT consult `notification_settings`** (D-05: in-app always created). Add composite index `(user_id, is_read, created_at desc)` for the inbox/unread queries. RESEARCH Pattern 1 has the full column list.

---

### `supabase/migrations/<ts>_notification_event_triggers.sql` (event → notification triggers)

**Analogs:** `log_lease_signature_activity` in `20260616161248_drop_dead_tenants_user_id.sql` (lines 48-70) for the leases trigger; `notify_n8n_maintenance` in `20260222130000_phase56_db_webhooks.sql` (lines 128-188) for the maintenance INSERT/UPDATE guard.

**Trigger-fn scaffold** (`log_lease_signature_activity` lines 48-70) — the null→not-null transition guard on lease signature columns:
```sql
create or replace function public.log_lease_signature_activity()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  if new.owner_signed_at is not null and (old is null or old.owner_signed_at is null) then
    insert into activity (user_id, activity_type, entity_type, entity_id, title, description, created_at)
    values (new.owner_user_id, 'lease_signed', 'lease', new.id, 'Lease signed', 'Owner signed lease agreement', now());
  end if;
  …
  return new;
end;
$function$;
```
The lease→active notification transition mirror is `log_security_event_lease_signed` (same esign migration, lines 75-105): `if NEW.lease_status = 'active' and OLD.lease_status is distinct from 'active' then …`.

**Maintenance INSERT/UPDATE status-change guard** (`notify_n8n_maintenance` lines 128-172) — the `tg_op` + status-change pattern to replicate (but call `create_notification`, NOT the dead n8n `net.http_post`):
```sql
if tg_op = 'UPDATE' and old.status = new.status then
  return new;   -- only fire when status actually changed
end if;
v_event_type := tg_op;  -- 'INSERT' vs 'UPDATE'
```
Confirmed column names (`src/types/supabase.ts`): `maintenance_requests` has `owner_user_id`, `status`, `title`, `id`, `priority` — matches CLAUDE.md canonical `owner_user_id`. Trigger registration mirror = lines 185-188 (`after insert or update … for each row execute function …`), with a `drop trigger if exists` first for idempotency (line 181). RESEARCH Pattern 2 has the ready `notify_owner_maintenance()` shape.

---

### `supabase/migrations/<ts>_notifications_retention_cron.sql` (archive table + cleanup fn + cron)

**Analog:** `20260306170000_cleanup_cron_scheduling.sql` — mirror exactly (RESEARCH: "mirror `20260306170000` exactly").

**Archive table + 3 service_role-only policies** (lines 16-34):
```sql
create table if not exists public.security_events_archive (
  like public.security_events including all
);
alter table public.security_events_archive enable row level security;
create policy "security_events_archive_select_service_role"
  on public.security_events_archive for select to service_role using (true);
create policy "security_events_archive_insert_service_role"
  on public.security_events_archive for insert to service_role with check (true);
create policy "security_events_archive_delete_service_role"
  on public.security_events_archive for delete to service_role using (true);
```
→ `create table public.notifications_archive (like public.notifications including all);` + the 3 policies.

**Cleanup fn — batched archive-then-delete** (lines 87-119) — copy the `security definer`/`set search_path = public`/`returns integer` header and the CTE batch shape:
```sql
create or replace function public.cleanup_old_security_events()
returns integer language plpgsql security definer set search_path = public
as $$ declare v_archived integer := 0; v_batch integer; begin
  with to_archive as (
    select id from public.security_events
    where created_at < now() - interval '30 days' and severity in ('debug','info')
    limit 10000 for update skip locked
  ),
  archived as (
    insert into public.security_events_archive
    select se.* from public.security_events se join to_archive ta on ta.id = se.id
    on conflict (id) do nothing returning 1
  )
  select count(*) into v_batch from archived;
  v_archived := v_archived + v_batch;
  delete from public.security_events
  where created_at < now() - interval '30 days' and severity in ('debug','info')
    and id in (select id from public.security_events_archive);
  …
  raise notice 'cleanup_old_security_events: archived % rows', v_archived;
  return v_archived;
end; $$;
```
→ `cleanup_old_notifications()` with TWO tiers per D-12: batch 1 = `is_read = true` older than 90d; batch 2 = unread older than 180d. Each `limit 10000 for update skip locked`, archive-then-delete only-archived, `raise notice`, `return v_archived`.

**Cron schedule** (lines 291-307) — existing slots are `:00`/`:15`/`:30`; **`:45` is the free slot**:
```sql
select cron.schedule('cleanup-security-events', '0 3 * * *', $$select public.cleanup_old_security_events()$$);
```
→ `select cron.schedule('cleanup-notifications', '45 3 * * *', $$select public.cleanup_old_notifications()$$);` (named SECURITY DEFINER fn, never inline SQL — CLAUDE.md cron rule).

---

### `supabase/migrations/<ts>_reconcile_orphan_schema.sql` (CLEAN-01/02)

**Analog:** `20260616161248_drop_dead_tenants_user_id.sql` — idempotent `drop … if exists`:
- ⚠ **HONEST-01/02 are UI-ONLY removals** — `notification_settings.sms`/`push`/`in_app` columns ALL STAY in the DB (locked orchestrator scope decision #3, RESEARCH Open Question 3 RESOLVED). No `drop_notification_sms_push_columns` migration exists in this phase; do NOT author one.
- Idempotent policy/function drops (lines 40-44): `drop policy if exists "…" on …;` / `drop function if exists public.assert_can_create_lease(uuid, uuid);` → `drop table if exists public.payout_events cascade;` + `drop function if exists public.get_payout_timing_stats() …` + `drop function if exists public.get_autopay_health() …` and `alter table public.leases drop column if exists docuseal_document_url;`.
- ⚠ CLEAN-01/02 are **verify-then-reconcile**, not substantive drops (both objects verified ABSENT in prod 2026-07-19). MCP `execute_sql` verify FIRST (RESEARCH Runtime State checklist), ship the idempotent drop regardless to reconcile repo↔prod. Do NOT build an archive table for `payout_events` (zero rows ever — plain `drop … cascade`).
- **After every migration:** `bun run db:types` (owner-run if PAT stale — MEMORY). `notification_settings` Row shape is UNCHANGED; `notifications` Functions gains `create_notification`.

---

### `tests/integration/rls/notifications.rls.test.ts` (MOD) + `notifications-retention.rls.test.ts` (NEW, optional)

**Analog:** existing `tests/integration/rls/notifications.rls.test.ts` (98 lines) + `activity.rls.test.ts` (76 lines) — dual-client (ownerA/ownerB) harness.

**Dual-client scaffold** (`activity.rls.test.ts` lines 1-23) — `createTestClient`/`getTestCredentials` from `../setup/supabase-client`, `beforeAll` signs in both owners, captures `ownerAId`/`ownerBId`:
```typescript
import { createTestClient, getTestCredentials } from "../setup/supabase-client";
beforeAll(async () => {
  const { ownerA, ownerB } = getTestCredentials();
  clientA = await createTestClient(ownerA.email, ownerA.password);
  clientB = await createTestClient(ownerB.email, ownerB.password);
  …
});
```
**Cross-owner isolation cases** already exist (`notifications.rls.test.ts` lines 29-97). This phase ADDS: (a) `create_notification` NOT callable by `authenticated` (expect RLS/permission error via `clientA.rpc('create_notification', …)`), (b) maintenance INSERT/status-change → notification row assertion, (c) lease-sign → notification row assertion. ⚠ **Fix the existing bug** at line 90: `.update({ read: true })` must become `.update({ is_read: true })` (the column is `is_read`, generated types line 1191). Synthetic owners only, sequential, hits prod (CLAUDE.md).

---

## Shared Patterns

### Client-island mount (NOTIF-02)
**Source:** `src/components/shell/app-shell-header.tsx` lines 128-137
**Apply to:** `NotificationBell` mount
```tsx
<div className="flex items-center gap-2">
  <GlobalSyncIndicator />
  <Link href="/settings?tab=notifications" className="p-2 rounded-md hover:bg-muted transition-colors" aria-label="View notifications">
    <Bell className="w-5 h-5 text-muted-foreground" />
  </Link>
  {user && <UserProfileMenu … />}
</div>
```
Swap the `<Link>…<Bell/></Link>` block for `<NotificationBell />` (a `'use client'` island, sibling of `GlobalSyncIndicator`). Header itself stays a server component — the island is self-contained.

### Mutation invalidation contract
**Source:** `src/hooks/api/use-tenant-mutations.ts` lines 34-38 + `src/hooks/api/query-keys/owner-dashboard-keys.ts` (`ownerDashboardKeys.all = ["owner-dashboard"]`)
**Apply to:** every notification mutation (mark-read, mark-all-read)
```typescript
invalidate: [notificationKeys.all, ownerDashboardKeys.all],
```
Every mutation invalidates its domain keys AND `ownerDashboardKeys.all` (CLAUDE.md). Use `createMutationCallbacks(queryClient, { invalidate, successMessage, errorContext })` from `#hooks/create-mutation-callbacks`.

### Client + cached-user boundary
**Source:** `src/hooks/api/query-keys/owner-notification-settings-keys.ts` lines 54-64
**Apply to:** every notification query/mutation fn
```typescript
const supabase = createClient();          // #lib/supabase/client — INSIDE the fn, never module-level
const user = await getCachedUser();       // #lib/supabase/get-cached-user
if (!user) throw new Error("Not authenticated");
```

### Typed PostgREST boundary mapper
**Source:** `src/hooks/api/query-keys/document-keys.ts` lines 121-151 (`mapDocumentRow`)
**Apply to:** `mapNotificationRow` in `notification-keys.ts` — throw on missing NOT NULL fields (`id`, `title`, `notification_type`, `user_id`), `?? null` for nullable (`is_read`, `created_at`, `action_url`, `entity_type`, `entity_id`, `message`, `read_at`). Never `as unknown as` (CLAUDE.md rule #8).

### Card / list / loading scaffold
**Source:** `src/components/dashboard/expiring-leases-widget.tsx` (whole file, 129 lines)
**Apply to:** `DashboardActivityCard`, `notification-popover-list`, `notification-item`
- Loading: `Array.from({ length: 3 }).map(…) → <Skeleton className="h-12 w-full" />` (lines 41-46)
- Rows: `<ul className="divide-y divide-border">` + `<li className="py-3">` + `<Link>` (lines 73-113)
- Footer link: `text-sm font-medium text-primary-text hover:underline` (lines 116-123)

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `tests/integration/rls/notifications-retention.rls.test.ts` (optional) | test | batch | No existing dual-client test asserts a `cleanup_old_*()` cron's tiered archive-then-delete. The dual-client *harness* (`notifications.rls.test.ts`) is reusable, but the retention assertion (insert dated rows → run `cleanup_old_notifications()` → assert archived/deleted) has no in-repo precedent to copy. Author fresh over the harness; a single-tier version can crib the archive-then-delete SQL semantics from `20260306170000`. |

Everything else has a strong in-repo analog — this phase is pattern-mirroring, not invention.

## Metadata

**Analog search scope:** `src/hooks/api/query-keys/`, `src/hooks/api/`, `src/components/{shell,dashboard,settings,notifications}/`, `src/app/(owner)/`, `src/types/`, `supabase/migrations/`, `tests/integration/rls/`
**Files scanned:** ~28 (16 fully read, 12 targeted grep/section reads)
**Project skills consulted:** `.claude/skills/rls-policies`, `.claude/skills/sql-migration-rules`, `.agents/skills/shadcn` (present; SKILL indexes noted — RLS one-policy-per-op + `(select auth.uid())` and MCP-apply-then-reconcile conventions already reflected in migration analogs above)
**Pattern extraction date:** 2026-07-19
