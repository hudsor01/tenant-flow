# Phase 52: Notification Center, Activity Feed & Channel Honesty - Research

**Researched:** 2026-07-19
**Domain:** Surfacing an already-built Supabase notifications/activity backend as user-facing UI in a mature Next.js 16 + Supabase landlord SaaS; channel-honesty settings cleanup; orphan schema reconciliation
**Confidence:** HIGH (verified against the live migrations, generated types produced from prod, edge functions, and existing UI; zero new dependencies)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
**Inbox surface**
- **D-01:** Bell popover + dedicated `/notifications` page. Popover = quick glance; "View all" routes to the full page (retention-scale history).
- **D-02:** Popover shows the 10 most recent, unread visually distinct, mark-all-read button, View-all link. Density matches the header's existing CommandDialog patterns.
- **D-03:** Clicking a notification marks it read AND navigates to its `action_url` (entity deep link — lease, maintenance request). Notifications are shortcuts to the work.

**Event catalog**
- **D-04:** Launch event set wired in THIS phase: e-sign lifecycle (tenant signed, lease fully executed, finalize failed) + maintenance (request created, status changed). CRUD events (property/unit/tenant edits) are explicitly NOT notifications — they belong to the activity feed. Later phases wire their own events through the same RPC (reminder sent → 53, application received → 57, digest sent → 62).
- **D-05:** Settings notification matrix after SMS/push removal: per-category toggles govern EMAIL only. In-app notifications are ALWAYS created (GitHub/Linear model) — the inbox is passive, the badge stays truthful, no silent-inbox foot-gun.
- **D-06:** Notification emails send instantly per event via the existing Resend rail (suppression-honoring). No hourly batching — Phase 62's digest covers summarization. *(Note: email SEND is Phase 53+; this phase only establishes the write path + always-on in-app inbox. See Open Questions.)*

**Activity feed**
- **D-07:** Activity lives as a card in the existing dashboard widget grid (alongside Quick Actions / expiring leases), not a full-width section.
- **D-08:** ACT-02 split rule locked — **attention vs audit**: notifications = things that happened TO the owner needing awareness (signatures, maintenance, reminders); activity = the complete audit trail INCLUDING the owner's own actions (created lease, edited property, uploaded document). No overlap ambiguity.
- **D-09:** Activity card shows 10 most recent; NO dedicated `/activity` route in v10. The card is the feature.

**Unread policy**
- **D-10:** Explicit mark-read only — click-through marks that item, mark-all-read clears the rest. Opening the popover never auto-clears (badge integrity, GitHub model).
- **D-11:** Unread badge is a numeric count capped at "9+".
- **D-12:** Retention: read notifications archive at 90d, unread at 180d, archive-then-delete cron in the 3 AM window — consistent with the existing retention family (`security_events`, `user_errors`).

### Claude's Discretion
- Popover component choice (Popover vs DropdownMenu), exact card placement within the dashboard grid, activity entry copy format, empty states (use the `Empty` compound component per CLAUDE.md), loading skeletons.

### Deferred Ideas (OUT OF SCOPE)
- Dedicated `/activity` history page with pagination — revisit after v10 if the dashboard card earns it.
- Hourly/daily notification email batching — Phase 62's digest is the summarization surface; only reconsider if per-event volume becomes a complaint.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NOTIF-01 | `create_notification` write-path RPC + owner-scoped RLS on `notifications` | **RLS already complete** (select/update/insert/delete_own + service_role — verified). Only new work: `create_notification` SECURITY DEFINER RPC + composite index. Mirror target `record_lease_signature` / `sign_lease_with_token`. |
| NOTIF-02 | Bell + unread count in app-shell header (client island, 60s poll, no Realtime) | Replace the `<Link>` bell in `app-shell-header.tsx` with a `NotificationBell` client island (sibling of `GlobalSyncIndicator`). Unread count = HEAD `count:exact` query, `refetchInterval: 60_000`. |
| NOTIF-03 | Inbox: mark read/unread + mark-all-read | `notifications_update_own` RLS already supports it. New `notification-keys.ts` factory + `use-notification-mutations.ts`. `/notifications` page + popover. |
| NOTIF-04 | Product events generate notifications (lease signed, reminder sent, application received, maintenance created, digest sent) | THIS phase wires e-sign + maintenance (D-04). E-sign via DB triggers on `leases` + edge-fn catch; maintenance via new DB trigger on `maintenance_requests`. Reminder/application/digest are wired by phases 53/57/62 through the same RPC. |
| NOTIF-05 | Bounded retention via archive-then-delete cron (3 AM) | Mirror `20260306170000_cleanup_cron_scheduling.sql` exactly. `notifications_archive` + `cleanup_old_notifications()` tiered (read 90d / unread 180d per D-12) + `cron.schedule('cleanup-notifications','45 3 * * *',…)`. |
| ACT-01 | Dashboard activity timeline from `activity` / `get_user_dashboard_activities` | **Data already flows** to the client via `get_dashboard_data_v2` → `OwnerDashboardData.activity`. New work: a `selectActivity` selector hook + a `DashboardActivityCard`. `get_user_dashboard_activities` exists and is auth-guarded. |
| ACT-02 | Disambiguate notification center from activity feed | Design pass per D-08 (attention vs audit). No schema. Copy/visual differentiation. |
| HONEST-01 | Remove SMS toggle from Settings | Touches `notification-settings.tsx`, `use-owner-notification-settings.ts`, `owner-notification-settings-keys.ts`, `#types/notifications`, and `notification_settings.sms` column (drop). |
| HONEST-02 | Remove browser-push toggle | Same surfaces + `notification_settings.push` column (drop). Web Push cut permanently (STACK.md). |
| CLEAN-01 | Drop orphaned `payout_events` table | **Very likely MOOT in prod** — payout_events + its two functions are absent from the prod-generated types; the launch-readiness migration appears never applied. Verify via MCP; ship a defensive idempotent drop to reconcile repo↔prod. See Runtime State Inventory. |
| CLEAN-02 | Drop dead `leases.docuseal_document_url` column | **Already dropped in prod** by `20260617142623` (absent from generated types). Verify via MCP; requirement likely already satisfied. |
</phase_requirements>

## Summary

This phase is **90% UI wiring + settings cleanup over an already-provisioned backend**, plus **schema reconciliation** — not net-new backend construction. The live-code investigation materially corrects three milestone-level assumptions:

1. **The `notifications` RLS is already complete.** ARCHITECTURE.md/CONTEXT.md state the notifications/activity tables are "queue-only today, add owner RLS." That is wrong: the base schema already ships `notifications_select_own` + `notifications_update_own` + `notifications_service_role`, and migration `20251216123000` added `notifications_insert_own` + `notifications_delete_own`. The `activity` table has `activity_select_own`. So the ONLY new DB object NOTIF-01 needs is the `create_notification` write-path RPC (plus a composite inbox index and the retention cron). Mark-read (NOTIF-03) already works under `notifications_update_own`.

2. **CLEAN-01 and CLEAN-02 are largely already-done in prod.** `docuseal_document_url` was dropped by the June-17 token-esign migration and is absent from the prod-generated types (regenerated 2026-07-08). `payout_events` and its two functions (`get_payout_timing_stats`, `get_autopay_health`) are *also* absent from the prod types, and there is **no repo migration that drops them** — the evidence points to the `20260413120000_launch_readiness_instrumentation.sql` migration having **never been applied to prod** (it instrumented the Stripe-Connect payout SLA, which was demolished 5 days later; `get_autopay_health` even references the dropped `rent_due` table). Both CLEAN items therefore become **verify-then-reconcile** tasks, not the substantive archive-then-drop the CONTEXT assumed.

3. **Activity data already flows to the browser** through `get_dashboard_data_v2` (it consolidated `get_user_dashboard_activities` and maps into `OwnerDashboardData.activity`). ACT-01 is a card + selector, needing no new RPC/table. However, **`activity` is sparsely populated** — the only writer today is the `log_lease_signature_activity` trigger (lease-signed events). A meaningful timeline needs additional activity write-paths, which is the phase's main scope decision (see Open Questions).

**Primary recommendation:** Ship the `create_notification` SECURITY DEFINER RPC as the single system write-path; wire e-sign + maintenance events via **DB triggers** (mirroring the existing `log_lease_signature_activity` trigger) plus one edge-function-side call for the finalize-failed error path; build the `NotificationBell` client island + `/notifications` page + `DashboardActivityCard` over TanStack Query with a `HEAD count:exact` unread poll at 60s; remove SMS/push everywhere including dropping the two `notification_settings` columns; and treat CLEAN-01/02 as MCP-verified reconciliation with defensive idempotent migrations. Zero new npm dependencies.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Notification write path (`create_notification`) | Database (SECURITY DEFINER RPC) | Edge Functions (finalize-failed call) | Single atomic insert point every feature calls; mirrors `sign_lease_with_token`. Callable by triggers, RPCs, and service-role edge fns. |
| E-sign event → notification | Database (trigger on `leases`) | Edge Functions (finalize-failed only) | Signature state transitions live on the `leases` row; triggers are atomic and un-bypassable (mirror `log_lease_signature_activity`). Finalize-failed is an edge-runtime error, not a DB transition. |
| Maintenance event → notification | Database (trigger on `maintenance_requests`) | — | Maintenance mutations are client-side PostgREST; a trigger keeps notification logic server-side and un-bypassable. |
| Unread count / inbox read | Client (TanStack Query island) | Database (RLS-scoped PostgREST) | Count must refresh (60s poll); belongs in the client `NotificationBell`, never server-rendered into the async layout. |
| Mark read / mark-all-read | Client (mutation) → Database (PostgREST UPDATE under RLS) | — | `notifications_update_own` already authorizes; invalidate notification keys + `ownerDashboardKeys.all`. |
| Activity timeline read | Client (dashboard query selector) | Database (`get_dashboard_data_v2`) | Data already fetched by the dashboard RPC; a selector avoids a second network call (N+1 prevention). |
| Retention / archival | Database (pg_cron + SECURITY DEFINER fn) | — | 3 AM window archive-then-delete, mirrors `cleanup_old_security_events`. |
| Channel-honesty settings | Client (Settings UI) + Database (column drop) | — | Remove SMS/push Switches + drop the `notification_settings.sms`/`push` columns. |
| Orphan schema cleanup | Database (idempotent migration) | — | Reconcile repo↔prod for `payout_events` / `docuseal_document_url`. |

## Standard Stack

**Zero new runtime dependencies.** Every capability rides an existing rail (STACK.md HIGH-confidence, positioning invariant). The "stack" here is the set of existing primitives to reuse.

### Core (existing — reuse, do not add)
| Primitive | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| `@tanstack/react-query` | ^5.100.10 [CITED: package.json] | Unread-count poll, inbox list, mark-read mutations | House data-layer; `refetchInterval` is the app's polling idiom (ARCHITECTURE.md) |
| `#components/ui/popover` or `dropdown-menu` | shadcn/radix (present) [VERIFIED: codebase grep] | Bell popover surface | Both exist in `src/components/ui/`; D-discretion which |
| `#components/ui/empty` | present [VERIFIED: codebase grep] | Inbox / activity empty states | CLAUDE.md mandates `Empty` for list empty states |
| `#components/ui/badge` | present [VERIFIED: codebase grep] | Unread count badge ("9+" cap) | Existing primitive |
| `lucide-react` `Bell` | present [VERIFIED: codebase grep] | Bell icon (already imported in header) | Sole icon library (CLAUDE.md zero-tolerance #10) |
| PostgREST + SECURITY DEFINER RPC | Supabase | `create_notification`, reads | No custom backend (CLAUDE.md) |
| pg_cron + archive-then-delete | present | NOTIF-05 retention | Mirrors `20260306170000` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 60s TanStack Query poll | Supabase Realtime channel | Realtime adds connection/RLS-on-Realtime/reconnect complexity for low-urgency events. **OUT OF SCOPE** (REQUIREMENTS.md; ARCHITECTURE.md anti-pattern #8). |
| Popover | DropdownMenu | Both present; D-discretion. Popover gives freer layout for a scrollable 10-item list + footer link; DropdownMenu gives built-in item semantics. Recommend **Popover** for the density D-02 wants. |
| New `activity-keys.ts` for ACT-01 | Reuse existing `get_dashboard_data_v2` via a `selectActivity` selector | The activity data is already in the dashboard query cache — a selector avoids a duplicate fetch. Recommend the selector. |

**Installation:** none. `bun run db:types` regenerates types after migrations (atomic).

## Package Legitimacy Audit

**No external packages are installed in this phase.** Zero new npm runtime dependencies is a positioning invariant (REQUIREMENTS.md, STACK.md HIGH-confidence). Every capability composes existing rails already present in `package.json`. The Package Legitimacy Gate is **N/A** — there is nothing to slopcheck.

## Architecture Patterns

### System Architecture Diagram

```
                    ┌───────────────────── BROWSER (client islands) ──────────────────────┐
                    │                                                                      │
 AppShellHeader ───►│  NotificationBell  ──HEAD count:exact (refetchInterval 60s)──┐       │
 (client)           │     │ badge "9+"                                             │       │
                    │     └─Popover: notificationQueries.list(10)  ──mark read────┐│       │
                    │  /notifications page: full paginated inbox  ──mark-all-read─┤│       │
 Dashboard grid ───►│  DashboardActivityCard  ◄── selectActivity(OwnerDashboardData)       │
                    └──────────┬───────────────────────────────┬───────────────────────────┘
                               │ PostgREST (RLS: user_id=auth.uid())      │ get_dashboard_data_v2
                               ▼                                          ▼
        ┌────────────────────────────── SUPABASE POSTGRES (RLS) ──────────────────────────────┐
        │  notifications (RLS: select/update/insert/delete_own ✓)   activity (select_own ✓)     │
        │        ▲  ▲  ▲                                                  ▲                      │
        │        │  │  └──────────── create_notification(...) RPC ───────┤ (SECURITY DEFINER)   │
        │        │  │                    ▲          ▲          ▲          │                      │
        │  trigger on leases      trigger on   edge-fn      pg_cron  log_lease_signature_activity│
        │  (tenant signed,        maintenance_ (finalize-   (later:  (existing writer today)     │
        │   fully executed)       requests      failed      53/57/62)                            │
        │                         (created,     catch)                                           │
        │                          status chg)                                                   │
        │  cleanup_old_notifications() ──(3AM :45)──► notifications_archive (service_role only)   │
        └────────────────────────────────────────────────────────────────────────────────────────┘
```

### Recommended file structure (new/modified)
```
src/
├── components/
│   ├── shell/app-shell-header.tsx        # MOD: swap <Link> Bell → <NotificationBell/>
│   ├── notifications/
│   │   ├── notification-bell.tsx         # NEW client island (badge + popover)
│   │   ├── notification-popover-list.tsx # NEW 10-item quick glance
│   │   └── notification-item.tsx         # NEW row: unread dot, title, relative time
│   ├── dashboard/
│   │   └── dashboard-activity-card.tsx   # NEW ACT-01 card (D-07 grid)
│   └── settings/notification-settings.tsx# MOD: remove SMS + push blocks
├── app/(owner)/notifications/page.tsx     # NEW /notifications full inbox
├── hooks/api/
│   ├── query-keys/notification-keys.ts   # NEW factory: unreadCount + list
│   ├── use-notifications.ts              # NEW read hooks + mark-read mutations
│   ├── use-dashboard-hooks.ts            # MOD: add selectActivity/useDashboardActivity
│   └── use-owner-notification-settings.ts# MOD: drop sms/push from mapper
└── types/notifications.ts                # MOD: drop sms/push from NotificationChannelPreferences

supabase/migrations/  (applied via MCP apply_migration, then reconcile + db:types)
├── <ts>_create_notification_rpc.sql            # create_notification + composite index
├── <ts>_notification_event_triggers.sql        # leases + maintenance_requests triggers
├── <ts>_notifications_retention_cron.sql        # archive table + cleanup fn + schedule
├── <ts>_drop_notification_sms_push_columns.sql  # HONEST-01/02 column drop
└── <ts>_reconcile_orphan_schema.sql            # CLEAN-01/02 idempotent drops
```

### Pattern 1: `create_notification` write-path RPC
**What:** Single SECURITY DEFINER insert point. Callable by triggers, other RPCs, and service-role edge fns. Does NOT gate on `auth.uid()` (it is a system path invoked from trigger/cron contexts where there is no auth.uid()) and does NOT consult `notification_settings` (D-05: in-app is always created).
**When to use:** every product event that should notify an owner.
**Example (shape to implement — mirrors `record_lease_signature`'s SECURITY DEFINER + `search_path` lock):**
```sql
-- Source: mirror of supabase/migrations/20260617142623 record_lease_signature
create or replace function public.create_notification(
  p_user_id       uuid,
  p_type          text,
  p_title         text,
  p_message       text default null,
  p_entity_type   text default null,
  p_entity_id     uuid default null,
  p_action_url    text default null
) returns uuid
  language plpgsql
  security definer
  set search_path to 'public'
as $$
declare v_id uuid;
begin
  insert into public.notifications
    (user_id, notification_type, title, message, entity_type, entity_id, action_url)
  values
    (p_user_id, p_type, p_title, p_message, p_entity_type, p_entity_id, p_action_url)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.create_notification(uuid,text,text,text,text,uuid,text) from public;
grant execute on function public.create_notification(uuid,text,text,text,text,uuid,text) to service_role;
-- NOTE: do NOT grant to authenticated — clients must not mint notifications directly.
-- Triggers run as the function owner and can call it regardless of grant.
```

### Pattern 2: Event → notification via DB trigger (mirror `log_lease_signature_activity`)
**What:** A trigger on the source table calls `create_notification` on the relevant transition. Keeps notification logic server-side; **client mutations need no changes**.
**Existing mirror (verified):** `log_lease_signature_activity()` on `leases` writes an `activity` row when `owner_signed_at`/`tenant_signed_at` transition null→not-null. Add a sibling for notifications; add `create_notification` on the `lease_status → 'active'` transition (mirror `log_security_event_lease_signed`). For maintenance, mirror the guard in the existing `notify_n8n_maintenance()` (INSERT → "created"; UPDATE with status change → "status changed").
```sql
-- Maintenance: new dedicated trigger fn (do NOT entangle with the dead n8n POST fn)
create or replace function public.notify_owner_maintenance() returns trigger
  language plpgsql security definer set search_path to 'public' as $$
begin
  if tg_op = 'INSERT' then
    perform public.create_notification(
      new.owner_user_id, 'maintenance', 'New maintenance request', new.title,
      'maintenance_request', new.id, '/maintenance/' || new.id::text);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform public.create_notification(
      new.owner_user_id, 'maintenance', 'Maintenance status changed',
      coalesce(new.title,'') || ' → ' || new.status,
      'maintenance_request', new.id, '/maintenance/' || new.id::text);
  end if;
  return new;
end; $$;

create trigger trg_maintenance_notify_owner
  after insert or update on public.maintenance_requests
  for each row execute function public.notify_owner_maintenance();
```
*(Confirm the maintenance owner column and status column names against `maintenance_requests` at plan time — CLAUDE.md canonical is `owner_user_id`.)*

### Pattern 3: Unread-count HEAD query (N+1 / Pitfall 17 prevention)
```typescript
// Source: CLAUDE.md "{ count: 'exact' } for pagination — never data.length"
// notification-keys.ts unreadCount queryOptions
const { count } = await supabase
  .from("notifications")
  .select("*", { count: "exact", head: true })   // HEAD — no rows transferred
  .eq("user_id", user.id)
  .eq("is_read", false);
// queryOptions: { queryKey: notificationKeys.unreadCount(), refetchInterval: 60_000 }
// badge display: count > 9 ? "9+" : String(count)   (D-11)
```

### Pattern 4: Retention cron (NOTIF-05 — mirror `20260306170000` exactly)
- `create table public.notifications_archive (like public.notifications including all);` + 3 service_role-only policies (select/insert/delete).
- `cleanup_old_notifications() returns integer` — two batches: read (`is_read = true`) older than 90d, unread older than 180d (D-12); each `limit 10000 for update skip locked`; archive-then-delete; `raise notice`.
- `select cron.schedule('cleanup-notifications', '45 3 * * *', $$select public.cleanup_old_notifications()$$);` — **`:45` is the free slot** (existing: cleanup-security-events `:00`, cleanup-errors `:15`, cleanup-webhook-events `:30`; check-cron-health hourly `:00`). [VERIFIED: codebase grep of `20260306170000`]

### Anti-Patterns to Avoid
- **Adding owner RLS to `notifications`/`activity`.** Already present — re-adding duplicate policies violates "one policy per operation per role." Verify first.
- **Server-rendering the unread count into the layout.** The count must refresh; belongs in the client `NotificationBell` (ARCHITECTURE.md anti-pattern #7).
- **Client-side create_notification calls / granting `create_notification` to `authenticated`.** Clients could mint notifications for arbitrary users. Use triggers + service_role only.
- **Consulting `notification_settings` inside `create_notification`.** D-05: in-app is always created. The settings gate applies to EMAIL only (later phases). A gated in-app write is the silent-inbox foot-gun D-05 forbids.
- **Archive-then-delete for `payout_events`.** The table holds no data (never populated) and likely doesn't exist in prod — a plain idempotent `drop table if exists … cascade` is correct; an archive table is pointless.
- **`supabase db push` / CLI migration apply.** CLI 401s (MEMORY). Use MCP `apply_migration` → reconcile filename via `list_migrations` → `bun run db:types`.
- **A `[...catchAll]` or non-null `@modal/default.tsx` for a notification detail modal.** Re-breaks 404s app-wide (MEMORY). D-01 uses a plain `/notifications` route + Popover, so no `@modal` slot is needed — keep it that way.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Owner scoping on notifications/activity | New RLS policies | Existing `*_select_own` / `*_update_own` / `*_insert_own` / `*_delete_own` | Already shipped + tested; duplicating violates one-policy-per-op |
| Retention/archival | Bespoke cleanup | Copy `cleanup_old_security_events()` pattern | Archive-then-delete + `FOR UPDATE SKIP LOCKED` + 10k batch is house-standard |
| Unread badge polling | Realtime/websocket/SW | TanStack Query `refetchInterval: 60_000` | House idiom; Realtime out of scope |
| Activity read pipeline | New RPC + keys | `get_dashboard_data_v2` → `selectActivity` selector | Data already fetched; avoids N+1 |
| Notification email send | New sender (this phase) | Deferred — Phase 53+ via `_shared/resend.ts` | This phase is in-app inbox only (see Open Questions) |
| Empty/loading states | Custom | `Empty` compound + CSS skeletons | CLAUDE.md mandate |

**Key insight:** the backend for this phase already exists and is RLS-secured. The failure mode here is *re-building* provisioned infrastructure (RLS, activity read path) instead of surfacing it — wasting effort and risking duplicate-policy violations. Verify-before-build.

## Runtime State Inventory

> This phase includes schema reconciliation (CLEAN-01/02) and column drops (HONEST-01/02). Grep finds files; it does not find prod runtime state. The generated types (`src/types/supabase.ts`, regenerated 2026-07-08 from prod) are the best available prod snapshot, but **the orchestrator MUST confirm each item live via Supabase MCP `execute_sql` at plan/execute time** (this restricted research sub-agent could not reach the MCP tools — documented upstream bug).

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | `notifications` rows (owner-scoped, retention-unbounded until NOTIF-05 ships). `activity` rows — only `lease_signed` events exist today (single writer `log_lease_signature_activity`). `payout_events` — **zero rows ever** (webhook never built; rent facilitation demolished). | NOTIF-05 bounds notifications. CLEAN-01 drop is data-loss-free (empty). No data migration needed. |
| **Live service config** | pg_cron jobs (existing cleanup jobs at `:00/:15/:30`, check-cron-health hourly). `trg_maintenance_notify_n8n` + lease-reminder n8n triggers exist but POST to a **dead** n8n workflow (like the reminder hop). | Add `cleanup-notifications` at `:45`. Do NOT touch the dead n8n triggers this phase (out of scope; channel-honesty here is SMS/push toggles only). |
| **OS-registered state** | None — no Task Scheduler / launchd / pm2 entries reference these objects. | None. |
| **Secrets/env vars** | None — no env var references `payout_events`, `docuseal_document_url`, or notification channels. | None. |
| **Build artifacts / generated types** | `src/types/supabase.ts` — after every column-drop / new-RPC migration, the generated types drift stale. | `bun run db:types` after each migration batch (atomic; owner-run if PAT stale per MEMORY). `notification_settings` Row/Insert/Update lose `sms`/`push`; `notifications` Functions gain `create_notification`. |

**MCP verification checklist (plan-time, run by orchestrator):**
```sql
-- CLEAN-01: expect 0 (table absent → requirement already satisfied; ship defensive drop)
select count(*) from information_schema.tables where table_schema='public' and table_name='payout_events';
select count(*) from information_schema.routines where routine_schema='public'
  and routine_name in ('get_payout_timing_stats','get_autopay_health');
-- CLEAN-02: expect 0 (column already dropped → requirement already satisfied)
select count(*) from information_schema.columns where table_schema='public'
  and table_name='leases' and column_name='docuseal_document_url';
-- NOTIF-01 baseline: confirm RLS already present (expect the 5 policies)
select policyname, cmd from pg_policies where schemaname='public' and tablename='notifications';
-- HONEST-01/02: confirm columns still present (to drop)
select column_name from information_schema.columns where table_schema='public'
  and table_name='notification_settings' and column_name in ('sms','push','in_app');
-- Also confirm 20260413120000 is / is NOT in the applied history:
select version from supabase_migrations.schema_migrations where version like '20260413%';
```
**Nothing found for OS-registered state and secrets/env vars** — verified by grep across `src/`, `supabase/`, and migrations.

## Common Pitfalls

### Pitfall 1: Re-adding RLS that already exists
**What goes wrong:** Planner reads CONTEXT.md ("add owner RLS, queue-only today") and writes `create policy notifications_select_own …`, colliding with the existing policy or violating one-policy-per-operation.
**Why:** milestone research predates the live-code check; RLS was actually completed in base schema + `20251216123000`.
**How to avoid:** NOTIF-01 migration adds ONLY `create_notification` + a composite index. Run the `pg_policies` check first.
**Warning signs:** `policy … already exists` errors; duplicate `_select_own` policies.

### Pitfall 2: Treating CLEAN-01/02 as substantive drops
**What goes wrong:** Planner writes an archive-then-delete for `payout_events` and a `drop column docuseal_document_url` that both no-op (or error) because the objects are already gone in prod.
**Why:** the launch-readiness migration was never applied; the docuseal column was dropped in June.
**How to avoid:** MCP-verify first; ship **idempotent** `drop table if exists … cascade` / `drop column if exists …` purely to reconcile repo↔prod (harmless whether present or absent). Mark the requirements satisfied-on-verify.
**Warning signs:** `table "payout_events" does not exist`; `column "docuseal_document_url" of relation "leases" does not exist`.

### Pitfall 3: Sparse activity feed reads as broken
**What goes wrong:** ACT-01 card renders, but a brand-new owner (or the E2E synthetic owner) has only lease-signed rows or none — the card looks empty/broken.
**Why:** the sole activity writer is `log_lease_signature_activity`.
**How to avoid:** (a) use the `Empty` compound for the zero-state (D-discretion), AND (b) decide the launch activity write-path set (see Open Questions) — at minimum property/lease/document/maintenance create events, mirroring the existing signature trigger. This is the phase's biggest scope lever.
**Warning signs:** activity card empty for active owners; E2E can't assert any activity row.

### Pitfall 4: SMS/push removal leaves dangling type/mapper references
**What goes wrong:** Dropping the `notification_settings.sms`/`push` columns without updating `mapDbRowToPreferences`, `defaultPreferences`, the update-mutation mapper, the `NotificationChannelPreferences` type, and the component → typecheck failures (`noUnusedLocals`, missing property).
**Why:** the channel toggle is referenced across 5 files (component, hook, keys/mapper, type, generated types).
**How to avoid:** change all five in one pass; drop columns via migration THEN `bun run db:types`; the "Enable All" logic (`handleEnableAllToggle`) must stop writing sms/push. Keep `in_app` column (default true) but remove its Switch — D-05 makes in-app always-on. Keep `email` + `maintenance`/`leases`/`general` (email category governance).
**Warning signs:** `Property 'sms' does not exist on type NotificationSettingsRow`; unused-import lint on `MessageSquare`/`Bell` icons in settings.

### Pitfall 5: Unbounded inbox query / N+1 unread count
**What goes wrong:** `/notifications` does `select('*')` unbounded; the bell refetches a full list on every `refetchOnWindowFocus`.
**Why:** global `refetchOnWindowFocus: true` amplifies chatty queries (Pitfall 17, PITFALLS.md).
**How to avoid:** unread = `HEAD count:exact` (no rows); list = `.range()` + `{ count: 'exact' }`; add composite index `(user_id, is_read, created_at desc)`; mark-read invalidates `notificationKeys` + `ownerDashboardKeys.all`.
**Warning signs:** repeated count queries in the network tab; badge flicker; slow inbox for long-tenured owners.

## Code Examples

### Swap the header Bell for the client island (NOTIF-02)
```tsx
// Source: existing src/components/shell/app-shell-header.tsx (the <Link> to replace)
// BEFORE: <Link href="/settings?tab=notifications" aria-label="View notifications"><Bell/></Link>
// AFTER:  <NotificationBell />          // sibling of <GlobalSyncIndicator/>, a 'use client' island
```

### Activity selector (ACT-01 — reuse the dashboard query, no new fetch)
```typescript
// Source: existing src/hooks/api/use-dashboard-hooks.ts (mirror selectStats/selectCharts)
const selectActivity = (data: OwnerDashboardData): ActivityItem[] => data.activity;
export function useDashboardActivity() {
  return useQuery({ ...DASHBOARD_BASE_QUERY_OPTIONS, select: selectActivity });
}
// DashboardActivityCard consumes ActivityItem[] (#types/activity) — data already in cache.
```

### Mark-all-read mutation (NOTIF-03 — RLS already authorizes)
```typescript
// notifications_update_own USING (user_id = auth.uid()) authorizes this
await supabase.from("notifications")
  .update({ is_read: true, read_at: new Date().toISOString() })
  .eq("user_id", user.id).eq("is_read", false);
// invalidate: notificationKeys.all + ownerDashboardKeys.all
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bell → `/settings?tab=notifications` link | Bell → client island popover + `/notifications` page | This phase | Real inbox |
| SMS + push + in-app + email channel toggles | Email + category toggles only; in-app always-on | This phase (HONEST-01/02, D-05) | Honest channels |
| `get_user_dashboard_activities` standalone RPC | Consolidated into `get_dashboard_data_v2` (`recent_activities`) | `20260301070000` | ACT-01 reads the unified data; standalone RPC still exists + auth-guarded |
| `docuseal_document_url` on leases | Token e-sign `signed_document_path`/`_hash` | `20260617142623` (already in prod) | CLEAN-02 already satisfied |
| `payout_events` launch-readiness instrumentation | Removed with rent-facilitation demolition | `20260418…` era (migration `20260413…` never applied) | CLEAN-01 likely moot |

**Deprecated/outdated:**
- CONTEXT.md/ARCHITECTURE.md claim "notifications/activity are queue-only, add owner RLS" — **outdated**; RLS is complete. Trust this phase's live-verified finding.
- `notify_n8n_maintenance()` / lease-reminder n8n triggers — dead hops (n8n disabled). Not this phase's concern; do not wire in-app notifications through them.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `payout_events` + `get_payout_timing_stats` + `get_autopay_health` do NOT exist in prod (launch-readiness migration never applied) | CLEAN-01, Runtime State | If they DO exist, CLEAN-01 needs an actual drop (still data-loss-free — table empty) + drop the 2 functions. Idempotent drop covers both cases. **MCP-verify.** |
| A2 | `leases.docuseal_document_url` already dropped in prod | CLEAN-02 | If still present, ship the `drop column if exists`. Idempotent guard covers both. **MCP-verify.** |
| A3 | Generated types (`src/types/supabase.ts`, 2026-07-08) faithfully reflect current prod schema | Whole phase | MEMORY notes db:types can lag (owner PAT). A migration may exist in repo but be unapplied, or vice-versa. **MCP `schema_migrations` + `information_schema` checks are the ground truth.** |
| A4 | The `notification_settings.in_app` column stays (default true) with its toggle removed, rather than being dropped | HONEST-02, D-05 | If the planner prefers dropping `in_app` too, update the mapper/type accordingly. Low risk — either is defensible; keeping it preserves a future re-enable. |
| A5 | Maintenance notifications are wanted even though the owner creates their own maintenance requests (self-notification) | NOTIF-04, D-04 | D-04 locks maintenance as a notification event. If self-notification feels noisy in dogfood, revisit; the trigger is trivially gated. |
| A6 | This phase ships in-app inbox only; notification EMAIL send is Phase 53+ | Scope, D-06 | If D-06 is read as "email must send this phase," scope expands to the Resend rail + suppression stack (Pitfall 4, PITFALLS.md). See Open Questions. |

## Open Questions (RESOLVED)

1. **How rich must the activity feed be at launch (ACT-01 write-paths)?**
   - What we know: `activity` is written only by `log_lease_signature_activity` (lease-signed). D-08 describes activity as "the complete audit trail INCLUDING the owner's own actions (created lease, edited property, uploaded document)."
   - What's unclear: D-04's *launch event set* enumerates NOTIFICATION events (e-sign + maintenance) but does NOT enumerate ACTIVITY write-paths. Without added writers, the card shows only lease signings.
   - Recommendation: wire a **minimal launch activity set** via triggers mirroring `log_lease_signature_activity` — property created, lease created, document uploaded, maintenance created/status-changed — so the timeline is non-empty. Confirm the exact set with the user (or planner default = those five). This is the phase's largest scope lever; call it out explicitly in the plan.
   - **RESOLVED:** activity write-path = property/lease/document/maintenance create + the existing `log_lease_signature_activity` signature writer (orchestrator scope decision #2). Wired in Plan 02 Task 2.

2. **Does D-06 require email SEND in this phase, or only the in-app write path?**
   - What we know: the phase boundary (CONTEXT domain) says "the in-app notification write path… that every later v10.0 phase publishes through"; D-06 describes instant per-event emails via Resend.
   - What's unclear: whether *any* email actually sends in Phase 52 or whether email is Phase 53's renewal-reminder work (which builds the suppression-honoring Resend drain).
   - Recommendation: **scope Phase 52 to in-app only** (create_notification + inbox + activity + settings + cleanup). Defer all email SEND to Phase 53+, where the suppression stack (`email_suppressions`, `is_notification_suppressed`, `notification_settings` gate — PITFALLS.md Pitfall 4) is built correctly. Confirm with the user.
   - **RESOLVED:** email SENDS are deferred to Phase 53 (orchestrator scope decision #1); Phase 52 writes in-app notifications only.

3. **Drop the `in_app` column, or keep it default-true with the toggle removed?** (A4) — recommend keep-column/remove-toggle for reversibility; low stakes.
   - **RESOLVED:** the `notification_settings` sms/push/in_app columns STAY (orchestrator scope decision #3) — UI-only toggle removal, no migration/type/mapper change.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase MCP (`apply_migration`, `execute_sql`, `list_migrations`) | All migrations + prod verification | ✓ (orchestrator context) | — | CLI 401s (MEMORY) — MCP is the only working path |
| pg_cron / pg_net | NOTIF-05 retention | ✓ (12+ jobs live) | — | — |
| `bun run db:types` | Type regen post-migration | ✓ (may need owner PAT refresh) | — | Owner-run if PAT stale |
| Vitest 4 + jsdom | Unit tests | ✓ | 4.x | — |
| Playwright | E2E smoke | ✓ | — | — |
| RLS integration harness | Owner-isolation tests | ✓ (`tests/integration/rls/`) | — | Hits prod; synthetic owners only |

**Missing dependencies with no fallback:** none.
**Missing with fallback:** direct DB access from *this* research sub-agent (MCP tools stripped by the `tools:` restriction bug) — the orchestrator has them; all live-verification is deferred to plan/execute time.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + jsdom (unit, 80% coverage gate via lefthook); Playwright (E2E smoke, PR-gated); dual-client RLS integration in `tests/integration/rls/` (hits prod, sequential) |
| Config file | `vitest.config.*` (present); `tests/e2e/playwright.config.ts`; RLS via `tests/integration/rls/_helpers` |
| Quick run command | `bun run test:unit -- --run src/hooks/api/query-keys/notification-keys.test.ts` |
| Full suite command | `bun run validate:quick` (types + lint + unit); `bun run test:integration` (RLS, hits prod) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NOTIF-01 | `create_notification` inserts owner-scoped row; not callable by `authenticated` | RLS integration | `bun run test:integration -- notifications.rls.test.ts` | ❌ Wave 0 (mirror `activity.rls.test.ts`) |
| NOTIF-01 | notifications owner isolation (ownerA ≠ ownerB read/update) | RLS integration | same | ❌ Wave 0 |
| NOTIF-02 | badge renders count, caps at "9+", 60s `refetchInterval` set | unit | `bun run test:unit -- --run src/components/notifications/notification-bell.test.tsx` | ❌ Wave 0 |
| NOTIF-02 | unread query uses `count:exact, head:true` | unit | `bun run test:unit -- --run src/hooks/api/query-keys/notification-keys.test.ts` | ❌ Wave 0 |
| NOTIF-03 | mark-read / mark-all-read update + invalidate keys | unit | `bun run test:unit -- --run src/hooks/api/use-notifications.test.ts` | ❌ Wave 0 |
| NOTIF-03 | bell → open inbox → mark-all-read clears badge | E2E smoke | `bun run test:e2e -- notifications.spec.ts` | ❌ Wave 0 |
| NOTIF-04 | maintenance INSERT/status-change → notification row; lease sign → notification | RLS/integration | `notifications.rls.test.ts` (trigger assertions) | ❌ Wave 0 |
| NOTIF-05 | `cleanup_old_notifications()` archives read≥90d / unread≥180d, deletes archived only | RLS/integration | `notifications-retention.rls.test.ts` (mirror any cleanup test) | ❌ Wave 0 |
| ACT-01 | activity card renders `OwnerDashboardData.activity`; Empty state on none | unit | `bun run test:unit -- --run src/components/dashboard/dashboard-activity-card.test.tsx` | ❌ Wave 0 |
| ACT-02 | (design) notification vs activity copy/visual distinct | manual / E2E visual | perfect-PR review checklist | manual |
| HONEST-01/02 | Settings renders NO SMS/push Switch; type has no sms/push | unit | `bun run test:unit -- --run src/components/settings/notification-settings.test.tsx` | ❌ Wave 0 (verify existing test updated) |
| CLEAN-01/02 | prod has no `payout_events` / `docuseal_document_url`; idempotent migration succeeds | migration verify | MCP `execute_sql` introspection (Runtime State checklist) | manual/MCP |

### Sampling Rate
- **Per task commit:** `bun run validate:quick` (types + lint + unit).
- **Per wave merge:** full unit suite + `bun run test:integration` for notifications RLS.
- **Phase gate:** full suite green + E2E smoke + MCP migration verification before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `tests/integration/rls/notifications.rls.test.ts` — NOTIF-01/04 owner-isolation + `create_notification` scoping + trigger assertions (mirror `activity.rls.test.ts`).
- [ ] `src/hooks/api/query-keys/notification-keys.test.ts` — unreadCount `head:true` + list `queryOptions` + `refetchInterval`.
- [ ] `src/hooks/api/use-notifications.test.ts` — mark-read/mark-all-read mutation + invalidation.
- [ ] `src/components/notifications/notification-bell.test.tsx` — badge cap "9+", popover render.
- [ ] `src/components/dashboard/dashboard-activity-card.test.tsx` — activity render + Empty state.
- [ ] `src/components/settings/notification-settings.test.tsx` — assert NO SMS/push Switch (update if a test already exists).
- [ ] `tests/e2e/tests/notifications.spec.ts` — bell → inbox → mark-all-read; Settings shows no SMS/push.
- [ ] Optional: `notifications-retention.rls.test.ts` for `cleanup_old_notifications()` tiered archive.

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `getUser()` server-validated; RLS `user_id = (select auth.uid())` on notifications/activity |
| V3 Session Management | no (unchanged) | Existing `@supabase/ssr` `getAll`/`setAll` |
| V4 Access Control | yes | Owner isolation via existing RLS; `create_notification` restricted to service_role/trigger (NOT authenticated); `get_user_dashboard_activities` auth-guarded (`p_user_id != auth.uid()` → raise) [VERIFIED: `20260304120000`] |
| V5 Input Validation | yes | Notification `notification_type`/`action_url` are internal-controlled (trigger/RPC), not user free-text; `action_url` is app-relative deep links only |
| V6 Cryptography | no | No new crypto |

### Known Threat Patterns for Supabase RLS + PostgREST
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-owner notification read/update (IDOR) | Information disclosure / Tampering | Existing `notifications_select_own`/`_update_own` RLS + new `notifications.rls.test.ts` dual-client cases |
| Client mints notifications for another user | Spoofing / Elevation | `create_notification` NOT granted to `authenticated`; only service_role + triggers |
| SECURITY DEFINER activity RPC leaks another owner's feed | Information disclosure | Already mitigated — `get_user_dashboard_activities` raises on `p_user_id != auth.uid()` (verified); keep the guard when touching it |
| `action_url` open-redirect / XSS | Tampering | Store app-relative paths only (`/leases/…`, `/maintenance/…`); never external URLs; render via `next/link` (no `dangerouslySetInnerHTML`) |
| Unbounded growth → DoS on inbox | Denial of Service | NOTIF-05 retention cron + bounded `.range()` queries + composite index |

## Sources

### Primary (HIGH confidence — live codebase)
- `supabase/migrations/20251101000000_base_schema.sql` — `notifications`/`notification_logs`/`activity` DDL, indexes, RLS policies, grants; `get_user_dashboard_activities` (base version).
- `supabase/migrations/20251216120000_notification_settings.sql`, `20251216123000_notifications_authenticated_policies.sql` — settings table + insert/delete_own policies.
- `supabase/migrations/20260304120000_rpc_auth_guards.sql` — `get_user_dashboard_activities` auth guard (SEC-01).
- `supabase/migrations/20260301070000_unified_dashboard_rpc.sql` — `get_dashboard_data_v2` `recent_activities`.
- `supabase/migrations/20260306170000_cleanup_cron_scheduling.sql` — archive-then-delete retention pattern + cron slots.
- `supabase/migrations/20260617142623_token_based_lease_esignature.sql` — `record_lease_signature`/`sign_lease_with_token`; `docuseal_document_url` drop; `log_security_event_lease_signed`.
- `supabase/migrations/20260616161248_drop_dead_tenants_user_id.sql` — current `log_lease_signature_activity` (activity writer).
- `supabase/migrations/20260413120000_launch_readiness_instrumentation.sql` — `payout_events` + 2 functions (evidence of never-applied).
- `supabase/migrations/20260418140000_demolish_rent_and_tenant_portal.sql` — demolition (does NOT drop payout_events).
- `supabase/migrations/20260222130000_phase56_db_webhooks.sql` — `notify_n8n_maintenance()` trigger (guard pattern mirror).
- `src/types/supabase.ts` (regenerated 2026-07-08 from prod) — confirms absence of `payout_events`/`docuseal_document_url`/payout functions; presence of `get_user_dashboard_activities` + token-esign columns.
- `src/components/shell/app-shell-header.tsx`, `app-shell.tsx`, `ui/global-sync-indicator.tsx` — bell mount point + client-island pattern.
- `src/components/settings/notification-settings.tsx`, `src/hooks/api/use-owner-notification-settings.ts`, `query-keys/owner-notification-settings-keys.ts`, `src/types/notifications.ts` — SMS/push removal surfaces.
- `src/hooks/api/use-owner-dashboard.ts`, `use-dashboard-hooks.ts`, `src/types/activity.ts` — activity data pipeline (`OwnerDashboardData.activity`).
- `supabase/functions/lease-signature/index.ts` — finalize + finalize-failed path (edge-fn notification touchpoint).
- `src/lib/constants/query-config.ts` — `QUERY_CACHE_TIMES` (REALTIME 30s; NOTIF wants 60s).
- `tests/integration/rls/activity.rls.test.ts` (exists) — mirror target for notifications RLS test.

### Secondary (MEDIUM — project research, cross-verified)
- `.planning/research/ARCHITECTURE.md`, `PITFALLS.md`, `STACK.md` — milestone integration design (corrected here re: RLS-already-exists and CLEAN-already-done).

### Tertiary (LOW / deferred to plan-time)
- Live prod schema state — **NOT directly verified by this sub-agent** (Supabase MCP tools unavailable in the restricted `tools:` context). Inferred from generated types + migrations; the orchestrator must confirm via MCP `execute_sql` (checklist provided). This is the single biggest confidence caveat.

## Metadata

**Confidence breakdown:**
- Standard stack (zero-new-deps, existing primitives): HIGH — verified against `package.json` + `src/components/ui/`.
- Architecture (RPC/trigger/island patterns): HIGH — mirror targets read and confirmed in-repo.
- RLS/schema state (notifications RLS complete; get_user_dashboard_activities guarded): HIGH — read the actual policies/functions.
- Prod reconciliation (CLEAN-01/02 already done): MEDIUM-HIGH — strong evidence from prod-generated types + migration history, but not MCP-confirmed by this agent; flagged for plan-time verification (A1–A3).
- Scope questions (activity write-paths, email-send timing): MEDIUM — locked decisions don't fully enumerate; surfaced as Open Questions for the planner/user.

**Research date:** 2026-07-19
**Valid until:** 2026-08-18 (30 days — stable brownfield surface; re-verify prod schema via MCP at plan time regardless, per A3).
