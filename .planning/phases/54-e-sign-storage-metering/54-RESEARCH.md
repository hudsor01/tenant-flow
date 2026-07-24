# Phase 54: E-sign & Storage Metering - Research

**Researched:** 2026-07-23
**Domain:** Postgres DB-layer quota enforcement (RLS/triggers on `storage.objects`), race-safe append-only event metering, Supabase Storage attribution, claims-integrity quota reconciliation, Settings usage UI
**Confidence:** HIGH (all findings grounded in committed migrations + generated `supabase.ts` + two confirmed Supabase Storage behaviors)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-00:** Quota values are fixed by `src/config/pricing.ts` (claims-integrity). E-sign: Starter none · **Growth 25/mo** · Max unlimited. Storage: Trial 1 GB · Starter 10 GB · Growth 50 GB · **Max unlimited**. The only value change is fixing Max storage to `-1` (unlimited) to match the "Unlimited document storage" claim. **Do NOT invent quota numbers.**
- **D-01:** The 25/month e-sign cap resets on the **1st of the calendar month**. The atomic RPC counts metered `send` events where the timestamp is in the current calendar month (`created_at >= date_trunc('month', now())`).
- **D-02:** **`resend` is exempt — only the initial `send` action is metered.** The count-and-insert fires only on `action === "send"`, never on `resend`. (Per-lease dedupe within a period = discretion; the load-bearing rule is `resend` never decrements the cap.)
- **D-01a:** Enforcement is a **hard block** for Growth at 25 (the 26th `send` is refused with an upgrade prompt). Max bypasses the count entirely. Starter never reaches metering (tier-gate blocks e-sign first).
- **D-03:** For a **non-grandfathered** owner at their storage quota, a new upload is **hard-blocked with an inline upgrade prompt**. Reads/downloads/deletes are ALWAYS allowed. "Soft-enforced" = block scoped to new uploads only + surfaced as an upgrade prompt, not a raw error.
- **D-04:** **Grandfather = full exemption.** Owners already over quota at enforcement launch keep read/download/delete AND upload (they see an upgrade prompt but never an upload lockout). Enforcement (D-03) applies only to owners who cross the quota *after* launch.
- **D-05 (gate, METER-04):** A pre-launch report enumerates owners currently over their storage quota; those `owner_user_id`s are flagged grandfathered BEFORE upload enforcement flips on. Enforcement must not go live until this snapshot exists (mirrors Phase 53's backlog-clear gate).

### Claude's Discretion
- `esign_events` exact column shape (mirror `lease_reminders` append-only pattern); race-safe form of the count-and-insert (single atomic statement, `INSERT ... SELECT` guarded by count, or advisory-lock — researcher picks).
- Grandfather flag storage shape (`users` column vs dedicated table vs computed snapshot — planner decides).
- Near-cap warning threshold (default **80%** of quota / **20 of 25** e-signs unless a house standard is found).
- Which buckets are owner-attributable (system buckets like `blog-covers` excluded).
- Upload-enforcement mechanism (client-side pre-check for UX + a DB-level guard for real enforcement).

### Deferred Ideas (OUT OF SCOPE)
- Per-feature usage analytics / historical usage charts beyond current-period display.
- Metering receipt-photo uploads specifically (TAX-02) — the storage sum naturally includes them; no separate work.
- Marketing/pricing copy refresh to advertise the now-real enforcement (HONEST-04) — its own phase (64).
- Changing sold quota VALUES / pricing tiers. Metering any feature other than e-sign sends + storage bytes.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| METER-01 | Growth e-sign sends metered at 25/mo, race-safe, append-only `esign_events` + atomic count-and-insert RPC at the `lease-signature` send path after `checkTierEntitlement`; Max unlimited | Pattern 2 (advisory-lock count-and-insert RPC) + the edge-fn hook point (`index.ts:136-148`, insert immediately after the gate). `esign_events` shape mirrors `lease_reminders`. |
| METER-02 | Owner sees current-month e-sign usage + upgrade prompt at/near cap | Pattern 6 (Settings usage widget). Existing surface: `BillingSettings` (`src/components/settings/billing-settings.tsx`). `Progress` UI + `queryOptions()` factory. 402 upgrade rail already exists (`checkTierEntitlement` / `report-keys.ts` parse pattern). |
| METER-03 | Owner sees storage usage vs plan quota, RPC summing `(storage.objects.metadata->>'size')::bigint` over the owner's objects across owner-attributable buckets | Pattern 5 (path-based owner resolver + SUM RPC) + Pattern 3 (new `get_owner_storage_limit_gb`, Max = -1). Bucket attribution table below. |
| METER-04 | Uploads soft-enforced vs quota with upgrade prompt; pre-launch over-quota report gates enforcement; existing over-quota owners grandfathered (no retroactive lockout) | Pattern 4 (BEFORE INSERT trigger on `storage.objects` enforcing pre-existing running total) + grandfather snapshot (`users.storage_grandfathered_at`) + `app_config` flag gate + pre-flip snapshot migration behind a `checkpoint:human-verify`. |
</phase_requirements>

## Summary

This is a **DB-heavy, greenfield-SQL phase with a thin edge-fn hook and a Settings UI add** — zero new npm dependencies; every piece rides an existing rail. Six new/changed DB objects, one new metered-insert call in an existing edge function, and two Settings widgets.

Two findings materially reshape the phase premise and must be read before planning:

1. **There is NO live "Max = 100 GB" storage bug to reconcile.** The `get_user_plan_limits(text)` overload that returned `storage_gb` (100 for Max) was **dropped in `20260505230821_drop_legacy_get_user_plan_limits_text_overload.sql` and never recreated.** `[VERIFIED: supabase.ts generated types + migration history]` The only surviving overload is `get_user_plan_limits(uuid)` returning `{properties_limit, units_limit, is_admin}` — **no storage dimension exists in the DB at all today.** So METER-03's quota source is *net-new*: add a `get_owner_storage_limit_gb(uuid)` function whose values come from `pricing.ts` (Trial 1 / Starter 10 / Growth 50 / **Max −1 unlimited**). Frame the "claims fix" as "define the correct per-tier storage quota that never existed," not "change 100 → −1."

2. **`storage.objects.metadata->>'size'` is NULL at BEFORE INSERT.** Supabase Storage inserts the row first (for the RLS check, no metadata), uploads to S3, then populates `metadata` (incl. `size`) on a second write. `[VERIFIED: Supabase discussion #33671 + the in-repo `handle_property_image_upload` trigger which explicitly handles "UPDATE when metadata populated for the first time"]` Therefore the upload guard must **enforce on the owner's PRE-EXISTING running total** (block if already at/over quota), never on the new object's own size. This dodges the null-size problem entirely and is exactly the correct reading of "soft-enforced."

Two proven in-repo precedents de-risk the hardest parts: (a) **custom triggers on `storage.objects` already work on this hosted project** — `20251202150000_property_images_rls_and_trigger.sql` installs AFTER INSERT/UPDATE triggers that are live in prod, and Supabase's own `objects_insert_prefix_trigger` is a BEFORE INSERT trigger on the same table; (b) the **`lease_reminders` + `claim_lease_reminders` + `app_config` flag + go-flip migration** stack (Phase 53) is the exact template for append-only events, race-safe SQL, and a pre-flip enforcement gate.

**Primary recommendation:** Enforce storage via a **BEFORE INSERT trigger on `storage.objects`** (not an RLS policy) that raises the existing `plan_limit_exceeded` structured exception on the owner's pre-existing SUM; attribute objects to owners with a **path-based per-bucket SECURITY DEFINER resolver** (deterministic, RLS-aligned, naturally excludes system buckets); meter e-sign with an **advisory-lock-guarded count-and-insert RPC** (service_role-only, calendar-month window); gate go-live on a **grandfather snapshot + `app_config` flag** exactly like Phase 53.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| E-sign 25/mo count + hard block | Database (atomic RPC) | API/Edge (`lease-signature`) | Race-safety requires a single DB transaction; the edge fn is the only caller and holds the tier context (`priceIdToTier`). Frontend cannot be the gate (bypassable). |
| Storage upload enforcement | Database (BEFORE INSERT trigger on `storage.objects`) | Browser (pre-check UX) | Uploads go client-direct to Storage — there is NO edge-fn chokepoint. Only a DB guard is real. Client pre-check is UX-only and bypassable. |
| Storage usage computation | Database (SUM RPC over `storage.objects`) | — | The authoritative bytes live only in `storage.objects.metadata`; owner attribution is a per-bucket path/join concern that belongs in SQL. |
| Storage quota resolution (per-tier GB) | Database (`get_owner_storage_limit_gb`) | Config (`pricing.ts` = source of truth for values) | Claims-integrity: values are locked in `pricing.ts`; the DB function mirrors them so triggers + RPCs share one source. |
| Grandfather snapshot + go-live gate | Database (`users` column + `app_config` flag + migration) | Ops (checkpoint) | Mirrors Phase 53 pre-flip discipline; the flag + snapshot must be readable cheaply inside the trigger. |
| Current-month usage display + upgrade prompt | Frontend (Settings island) | API (usage RPCs) | Read-only surface; TanStack Query `queryOptions()` factory + `Progress` bar; reuses the 402 / plan-limit upgrade rail. |

## Standard Stack

**No new runtime dependencies.** This phase is SQL migrations + one edge-fn hook + Settings UI on existing libraries. The "stack" is the set of existing rails to reuse verbatim.

### Core (existing rails — reuse, do not replace)
| Rail | Where | Purpose | Why Standard |
|------|-------|---------|--------------|
| Append-only event table + service_role-only RPC | `supabase/migrations/20260722005310_lease_reminders_delivery_state.sql` (`claim_lease_reminders`) | Template for `esign_events` + the metering RPC (grants, `search_path=public`, service_role-only) | Locked-in this milestone; identical shape. |
| BEFORE INSERT plan-limit trigger + structured exception | `supabase/migrations/20260505213825_enforce_plan_limits.sql` (`enforce_property_plan_limit`) | Template for the storage upload guard (raise `P0001` + `HINT='plan_limit_exceeded'` + JSON `DETAIL`) | The client already parses this exact shape (`mutation-error-handler.ts:151-196`). |
| `app_config` kill-flag + pre-flip go-flip migration | Phase 53 (`reminders_delivery_enabled`) | Template for `storage_enforcement_enabled` gate (default OFF; flipped LAST after snapshot) | Same pre-flip gate discipline METER-04 requires. |
| `checkTierEntitlement` / `GROWTH_AND_MAX_PLANS` / `priceIdToTier` | `supabase/functions/_shared/tier-gate.ts`, `_shared/plan-tier.ts` | E-sign gate already at the send path; metering is a strict add-after; `priceIdToTier` branches growth vs max | Already in place; no re-plumbing. |
| `Progress` + `formatBytes` + `queryOptions()` factories | `src/components/ui/progress.tsx`, `src/lib/format-bytes.ts`, `src/hooks/api/query-keys/` | Usage bar + byte display + typed query keys for the two usage RPCs | Project conventions (CLAUDE.md rule 9). |
| 402 upgrade-body parse pattern | `src/hooks/api/query-keys/report-keys.ts:166-171` | Reference for surfacing `upgrade_url` from the over-cap send response | Already used for premium-report gating. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| BEFORE INSERT trigger on `storage.objects` | `AS RESTRICTIVE` INSERT RLS policy calling a quota function | An RLS failure surfaces as `42501` "row violates row-level security policy" which the client **genericizes** (`mutation-error-handler.ts:99` RAW_DB_INTERNALS) → NO upgrade attribution. The trigger can raise the `plan_limit_exceeded` payload the client already turns into an "Upgrade" toast. **Trigger wins.** (Also: a *permissive* INSERT policy would OR-widen access, not restrict — a common trap.) |
| Advisory-lock count-and-insert (e-sign) | `esign_usage(owner, period_month, used_count)` counter row with `UPDATE ... WHERE used_count < 25 RETURNING` | The counter row is also race-safe (row lock) and O(1), but diverges from the CONTEXT-requested append-only `esign_events` model and loses per-send audit rows. Keep append-only; advisory lock gives race-safety without a second table. |
| Path-based per-bucket owner resolver | `storage.objects.owner_id = auth.uid()` fast-path | `owner_id` is not guaranteed populated on every upload path and is NULL for service_role writes (signed leases). Undercounting is a claims problem for METER-03. Path-join is deterministic + RLS-aligned + excludes system buckets for free. Use `owner_id` only as a verified optimization, not the source of truth. |
| On-demand SUM in the trigger | Maintained running-total counter table updated by trigger | The counter avoids a per-insert SUM but must handle the null-size-at-insert timing (increment on the metadata UPDATE, not the first INSERT), DELETE decrements, and a backfill. For typical landlord portfolios (dozens–hundreds of files) the on-demand SUM (short-circuited to only run for limited-tier, non-grandfathered owners) is simpler and fast. Note the counter as a future optimization if profiling shows the SUM is hot. |

## Package Legitimacy Audit

**N/A — this phase installs zero external packages.** It is Postgres migrations, one Deno edge-function edit, and React/TanStack Settings UI on already-installed libraries. The positioning invariant "zero new npm runtime dependencies" (REQUIREMENTS.md) is respected by construction. No slopcheck/registry verification required.

## Architecture Patterns

### System Data-Flow Diagram

```
E-SIGN METERING (METER-01/02)
  Owner clicks "Send for signature"
        │  POST /functions/v1/lease-signature { action:'send', leaseId }
        ▼
  [lease-signature edge fn]
        │  1. checkTierEntitlement(esign, GROWTH_AND_MAX)  ── not entitled ──▶ 402 upgrade (Starter)
        │  2. meter_esign_send(owner, lease)  (service_role RPC)   ◀── NEW hook, right after the gate
        │        │  advisory-lock(owner) ─▶ tier?
        │        │     max     ─▶ insert event, return {allowed, unlimited}
        │        │     growth  ─▶ count month; >=25 ─▶ return {blocked}  ─▶ 402 upgrade (esign_quota)
        │        │                          <25  ─▶ insert event, return {allowed, used, 25}
        │        ▼
        │  3. (allowed) proceed: draft→pending_signature, issue token, email tenant
        ▼
  esign_events (append-only)  ◀── Settings reads current-month count for the usage widget

STORAGE METERING (METER-03/04)
  Owner uploads a file  ──supabase.storage.from(bucket).upload(path)──▶ [Supabase Storage]
        │  (client pre-check: getUsage() >= quota ? show prompt : proceed)   ← UX only, bypassable
        ▼
  INSERT INTO storage.objects (metadata=NULL at this point)
        ▼
  [BEFORE INSERT trigger: enforce_storage_quota]   ◀── NEW, the REAL guard
        │  auth.uid() null (service role/signed lease) ─▶ allow
        │  app_config storage_enforcement_enabled = false ─▶ allow (pre-flip)
        │  owner := storage_object_owner(bucket, name)  (null = system bucket) ─▶ allow
        │  Max/unlimited tier ─▶ allow
        │  users.storage_grandfathered_at not null ─▶ allow
        │  get_owner_storage_bytes(owner) >= quota_bytes ─▶ RAISE plan_limit_exceeded (upgrade toast)
        │  else ─▶ allow
        ▼
  object stored; Storage populates metadata.size on finalize
        ▼
  get_owner_storage_usage(owner) = SUM(metadata->>'size') via storage_object_owner  ◀── Settings widget
```

### Recommended Structure (new/changed artifacts)
```
supabase/migrations/
├── <ts>_esign_metering.sql            # esign_events table + RLS + meter_esign_send RPC
├── <ts>_storage_quota_functions.sql   # get_owner_storage_limit_gb + storage_object_owner + usage SUM RPC
├── <ts>_storage_enforcement_guard.sql # enforce_storage_quota trigger (created but flag-gated OFF) + app_config seed + users.storage_grandfathered_at
└── <ts>_storage_grandfather_goflip.sql# snapshot over-quota owners → set grandfathered → flip flag LAST (behind checkpoint)
supabase/functions/lease-signature/index.ts   # +meter_esign_send call after checkTierEntitlement (send only)
src/hooks/api/query-keys/usage-keys.ts         # NEW queryOptions() factory: esignUsage + storageUsage
src/components/settings/sections/usage-section.tsx  # NEW e-sign + storage usage widgets (rendered in BillingSettings)
```

### Pattern 1: Claims-integrity storage quota function (net-new; Max = −1)
**What:** A dedicated function returning per-tier storage GB, values mirrored from `pricing.ts`. There is no `storage_gb` in the DB today, so this is additive (not a 100→−1 edit).
**When:** Read by the SUM/usage RPC, the enforcement trigger, and the grandfather snapshot.
```sql
-- Source of truth for VALUES: src/config/pricing.ts limits.storage
-- (Trial 1 / Starter 10 / Growth 50 / Max -1). Mirror the tier CASE from
-- 20260510094421 get_user_plan_limits(uuid). -1 = unlimited.
create or replace function public.get_owner_storage_limit_gb(p_owner uuid)
returns integer
language plpgsql stable security definer
set search_path = public
as $$
declare v_plan text;
begin
  select lower(coalesce(subscription_plan, '')) into v_plan
  from public.users where id = p_owner;

  return case
    when v_plan in ('starter','price_1tvtaap3wcr53sdoymuzn7vf','price_1tvtaep3wcr53sdo7pbg6bcw') then 10
    when v_plan in ('growth','price_1tvtaip3wcr53sdoqnue1inv','price_1tvtamp3wcr53sdon4kufrvn')   then 50
    when v_plan in ('max','tenantflow_max','price_1tvtaqp3wcr53sdo22vayfhp','price_1tvtaup3wcr53sdo5mnmsamf') then -1  -- unlimited
    else 1  -- trial / null / unknown
  end;
end;
$$;
revoke all on function public.get_owner_storage_limit_gb(uuid) from public, anon, authenticated;
grant execute on function public.get_owner_storage_limit_gb(uuid) to service_role;
-- authenticated GRANT only if the Settings widget calls it directly for the
-- signed-in user; if so, guard `p_owner = (select auth.uid())` inside.
```

### Pattern 2: Race-safe e-sign count-and-insert (METER-01) — advisory lock
**What:** One RPC, service_role-only, that serializes concurrent sends per owner via a transaction-scoped advisory lock, counts the calendar-month `send` events, and inserts only when under cap.
**Why advisory lock beats the single `INSERT ... SELECT ... WHERE count < 25`:** under READ COMMITTED two concurrent transactions each see `count = 24` (neither sees the other's uncommitted row) and both insert → 26. The subquery count does not lock. `pg_advisory_xact_lock(owner)` serializes same-owner sends (different owners never contend); check-then-insert is then atomic. Simplest race-safe form.
```sql
create table public.esign_events (
  id             uuid primary key default gen_random_uuid(),
  owner_user_id  uuid not null references public.users(id) on delete cascade,
  lease_id       uuid not null references public.leases(id) on delete cascade,
  event_type     text not null default 'send'
                 constraint esign_events_event_type_check check (event_type in ('send')),
  created_at     timestamptz not null default now()
);
create index idx_esign_events_owner_month
  on public.esign_events (owner_user_id, created_at);
alter table public.esign_events enable row level security;
-- Owner SELECT for the Settings usage read (owner-scoped).
create policy "Owners read own esign events"
  on public.esign_events for select to authenticated
  using (owner_user_id = (select auth.uid()));
-- No INSERT/UPDATE/DELETE policy for authenticated: writes go ONLY through the
-- service_role RPC below (append-only, mirrors lease_reminders discipline).

create or replace function public.meter_esign_send(p_owner uuid, p_lease uuid)
returns table(allowed boolean, used integer, cap integer, unlimited boolean)
language plpgsql security definer
set search_path = public
as $$
declare
  v_plan  text;
  v_used  integer;
  v_cap   constant integer := 25;
begin
  -- Serialize concurrent sends for THIS owner (released at txn end).
  perform pg_advisory_xact_lock(hashtextextended('esign:'||p_owner::text, 0));

  select lower(coalesce(subscription_plan,'')) into v_plan
  from public.users where id = p_owner;

  -- Max / unlimited: record for the usage widget, never block.
  if v_plan in ('max','tenantflow_max',
                'price_1tvtaqp3wcr53sdo22vayfhp','price_1tvtaup3wcr53sdo5mnmsamf') then
    insert into public.esign_events(owner_user_id, lease_id) values (p_owner, p_lease);
    return query select true, null::integer, v_cap, true;
    return;
  end if;

  -- Growth (and any non-max that reaches here): 25/calendar-month hard cap.
  select count(*) into v_used
  from public.esign_events
  where owner_user_id = p_owner
    and event_type = 'send'
    and created_at >= date_trunc('month', now());   -- D-01 calendar-month window

  if v_used >= v_cap then
    return query select false, v_used, v_cap, false;   -- BLOCKED (26th) — no insert
    return;
  end if;

  insert into public.esign_events(owner_user_id, lease_id) values (p_owner, p_lease);
  return query select true, v_used + 1, v_cap, false;
end;
$$;
revoke all on function public.meter_esign_send(uuid, uuid) from public, anon, authenticated;
grant execute on function public.meter_esign_send(uuid, uuid) to service_role;
```
**Edge-fn hook** (`lease-signature/index.ts`, immediately after the `action === "send"` `checkTierEntitlement` block at ~line 148, and AFTER `loadOwnedLease` so `owner_user_id` is confirmed):
```ts
if (action === "send") {
  const { data: meterRows, error: meterErr } = await supabase.rpc("meter_esign_send", {
    p_owner: user.id, p_lease: leaseId,
  });
  if (meterErr) return errorResponse(req, 500, meterErr, { action: "meter_esign" });
  const meter = (meterRows as Array<{ allowed: boolean; used: number; cap: number }> | null)?.[0];
  if (!meter?.allowed) {
    return new Response(JSON.stringify({
      error: "You've used all 25 lease e-signs included this month. Upgrade to Max for unlimited e-signs.",
      upgrade_required: true,
      upgrade_url: "/billing/plans?source=esign_quota",
    }), { status: 402, headers: getJsonHeaders(req) });
  }
}
```
**Placement decision:** meter **up-front** (reserve the slot before the lease state change) so the 26th is refused before any work. Accept that a rare subsequent email failure — which reverts the lease to draft (`revertSendToDraft`) — leaves a counted event, over-counting *conservatively toward* the cap. This is honest-but-not-hostile (it never traps data; it just doesn't refund a failed reservation). Alternative placement (meter only after `emailResult.success`) is more precise but lets the 26th do all the work first; document the tradeoff, recommend up-front. `resend` MUST NOT call this RPC (D-02).

### Pattern 3: Path-based owner resolver for `storage.objects` (METER-03/04 attribution)
**What:** One SECURITY DEFINER function mapping `(bucket_id, name)` → `owner_user_id`, encoding each bucket's path convention. Shared by the SUM RPC, the enforcement trigger, and the grandfather snapshot. Returns NULL for system/unattributable buckets → they are excluded for free.
```sql
create or replace function public.storage_object_owner(p_bucket text, p_name text)
returns uuid
language sql stable security definer
set search_path = public
as $$
  select case p_bucket
    -- avatars/{user_id}/...  → path[1] IS the owner (users.id)
    when 'avatars' then
      nullif((storage.foldername(p_name))[1], '')::uuid
    -- property-images/{property_id}/...
    when 'property-images' then
      (select owner_user_id from public.properties
       where id = nullif((storage.foldername(p_name))[1],'')::uuid)
    -- inspection-photos/{inspection_id}/...
    when 'inspection-photos' then
      (select owner_user_id from public.inspections
       where id = nullif((storage.foldername(p_name))[1],'')::uuid)
    -- maintenance-photos/{maintenance_request_id}/...
    when 'maintenance-photos' then
      (select owner_user_id from public.maintenance_requests
       where id = nullif((storage.foldername(p_name))[1],'')::uuid)
    -- tenant-documents: {entity_type}/{entity_id}/...  AND  lease/{leaseId}/signed-lease.pdf
    when 'tenant-documents' then
      case (storage.foldername(p_name))[1]
        when 'property'    then (select owner_user_id from public.properties
                                 where id = nullif((storage.foldername(p_name))[2],'')::uuid)
        when 'lease'       then (select owner_user_id from public.leases
                                 where id = nullif((storage.foldername(p_name))[2],'')::uuid)
        when 'maintenance' then (select owner_user_id from public.maintenance_requests
                                 where id = nullif((storage.foldername(p_name))[2],'')::uuid)
        when 'inspection'  then (select owner_user_id from public.inspections
                                 where id = nullif((storage.foldername(p_name))[2],'')::uuid)
        when 'tenant'      then null  -- tenant-scoped docs: resolve via lease join if that branch ships; see Open Q
        else null
      end
    -- SYSTEM / excluded: blog-covers (platform brand art), bulk-imports (ephemeral CSV), lease-documents (unused)
    else null
  end;
$$;
```
**Attribution truth table (verified against the bucket migrations):**

| Bucket | Path convention | Owner attribution | Count toward usage? |
|--------|-----------------|-------------------|---------------------|
| `avatars` | `{user_id}/avatar.ext` | path[1] = `users.id` directly | ✅ |
| `property-images` | `{property_id}/{file}` | join `properties.owner_user_id` | ✅ |
| `inspection-photos` | `{inspection_id}/{room}/{ts}-{file}` | join `inspections.owner_user_id` | ✅ |
| `maintenance-photos` | `{maintenance_request_id}/{file}` | join `maintenance_requests.owner_user_id` | ✅ |
| `tenant-documents` (vault) | `{entity_type}/{entity_id}/{ts}-{file}` | branch on entity_type → owner | ✅ |
| `tenant-documents` (signed lease) | `lease/{leaseId}/signed-lease.pdf` | join `leases.owner_user_id` | ✅ (tiny; via service_role, not enforced) |
| `lease-documents` | unused (0 objects) | — | ➖ empty (harmless if included) |
| `bulk-imports` | `{auth.uid()}/{file}.csv` | path[1] = uid (ephemeral) | ❌ EXCLUDE (transient import scratch) |
| `blog-covers` | platform-generated | — | ❌ EXCLUDE (system brand art) |

### Pattern 4: Storage usage SUM RPC (METER-03) + enforcement trigger (METER-04)
```sql
-- Usage: SUM of finalized object sizes attributed to the owner. metadata->>'size'
-- is NULL for in-flight rows (see State of the Art) → excluded by ::bigint SUM.
create or replace function public.get_owner_storage_usage(p_owner uuid)
returns bigint
language sql stable security definer
set search_path = public
as $$
  select coalesce(sum((o.metadata->>'size')::bigint), 0)
  from storage.objects o
  where o.bucket_id in ('avatars','property-images','inspection-photos',
                        'maintenance-photos','tenant-documents')  -- owner-attributable set
    and public.storage_object_owner(o.bucket_id, o.name) = p_owner;
$$;

-- Enforcement: BEFORE INSERT trigger on storage.objects. Enforce on the
-- PRE-EXISTING running total (never NEW's size — it is NULL here).
create or replace function public.enforce_storage_quota()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_limit_gb integer;
  v_used bigint;
  v_limit_bytes bigint;
begin
  -- Skip service_role / backend writes (signed-lease finalize, migrations):
  -- a legal artifact must never be blocked by quota.
  if (select auth.uid()) is null then return new; end if;

  -- Pre-flip gate (METER-04): no enforcement until the grandfather snapshot ran.
  if coalesce((select value from public.app_config
               where key = 'storage_enforcement_enabled'), 'false') <> 'true' then
    return new;
  end if;

  v_owner := public.storage_object_owner(new.bucket_id, new.name);
  if v_owner is null then return new; end if;          -- system/unattributable bucket

  -- Full grandfather exemption (D-04).
  if exists (select 1 from public.users
             where id = v_owner and storage_grandfathered_at is not null) then
    return new;
  end if;

  v_limit_gb := public.get_owner_storage_limit_gb(v_owner);
  if v_limit_gb < 0 then return new; end if;           -- Max / unlimited

  v_limit_bytes := v_limit_gb::bigint * 1024 * 1024 * 1024;
  v_used := public.get_owner_storage_usage(v_owner);

  if v_used >= v_limit_bytes then
    raise exception 'plan_limit_exceeded: storage (% / % bytes used)', v_used, v_limit_bytes
      using errcode = 'P0001', hint = 'plan_limit_exceeded',
            detail = format('{"resource":"storage","used":%s,"limit":%s,"upgrade_source":"storage_quota_gate"}',
                            v_used, v_limit_bytes);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_storage_quota on storage.objects;
create trigger trg_enforce_storage_quota
  before insert on storage.objects
  for each row execute function public.enforce_storage_quota();
```
**Why a trigger, not RLS:** the trigger raises the `plan_limit_exceeded` payload the client already turns into an "Upgrade" toast (`mutation-error-handler.ts`). An RLS denial is `42501` which the client genericizes to "Something went wrong." Custom triggers on `storage.objects` are **proven live** on this project (`handle_property_image_upload`) and used by Storage itself (`objects_insert_prefix_trigger` is BEFORE INSERT).

### Pattern 5: Grandfather snapshot + go-flip (METER-04 gate, mirrors Phase 53)
```sql
-- (migration 3) additive column + flag seeded OFF + trigger created (no-op while OFF)
alter table public.users
  add column if not exists storage_grandfathered_at timestamptz;
comment on column public.users.storage_grandfathered_at is
  'Non-null = owner was over their storage quota at enforcement launch and is
   permanently exempt from upload enforcement (METER-04 full grandfather).';
insert into public.app_config (key, value)
  values ('storage_enforcement_enabled','false') on conflict (key) do nothing;

-- (migration 4, behind checkpoint:human-verify) snapshot → grandfather → flip LAST
update public.users u
set storage_grandfathered_at = now()
where storage_grandfathered_at is null
  and public.get_owner_storage_limit_gb(u.id) >= 0                 -- skip Max (unlimited)
  and public.get_owner_storage_usage(u.id)
      >= public.get_owner_storage_limit_gb(u.id)::bigint * 1024*1024*1024;
-- report the count/list for the go-live checkpoint, THEN, as the LAST statement:
update public.app_config set value = 'true' where key = 'storage_enforcement_enabled';
```
The over-quota **report** (list of `owner_user_id`, plan, used_bytes, limit_bytes) is produced and surfaced to the human checkpoint before the flag flips — this is the METER-04 gate. Enforcement physically cannot fire before the flip (the trigger short-circuits on the flag).

### Pattern 6: Settings usage widgets (METER-02/03)
- Render inside `BillingSettings` (`src/components/settings/billing-settings.tsx`) — the Billing tab of `/settings?tab=billing` is the established surface (roadmap: "shares Settings surface / upgrade-prompt pattern").
- New `src/hooks/api/query-keys/usage-keys.ts` with `queryOptions()` factories: `esignUsage()` (RPC `select count(*) from esign_events where owner=uid and created_at >= date_trunc('month',now())` via a small SECURITY DEFINER read RPC or a direct owner-RLS'd `select`) and `storageUsage()` (RPC `get_owner_storage_usage(uid)` + `get_owner_storage_limit_gb(uid)`). Typed mapper at the boundary (CLAUDE.md — no `as unknown as`).
- Render with `Progress` + `formatBytes`. **Note:** `formatBytes` tops out at MB (`src/lib/format-bytes.ts`); storage quotas are GB — add a GB branch or display `X.X GB of Y GB` directly from bytes.
- Near-cap prompt at **80%** (20/25 e-signs; 80% of storage GB) — CTA to `/billing/plans?source=esign_quota` / `?source=storage_quota_gate`. Reuse the plan-card / `upgrade-dialog.tsx` visual language.

### Anti-Patterns to Avoid
- **Enforcing on `NEW.metadata->>'size'` in BEFORE INSERT** — it is NULL there; the guard would never trip. Enforce on the pre-existing SUM.
- **Adding a *permissive* INSERT RLS policy to restrict uploads** — permissive policies OR-widen; you'd grant more access, not less. (A RESTRICTIVE policy would AND, but see Pattern 4 for why the trigger is preferred.)
- **`INSERT ... SELECT ... WHERE (count) < 25` without a lock** — TOCTOU under READ COMMITTED; two concurrent sends both pass.
- **Metering `resend`** — violates D-02.
- **Blocking service_role / signed-lease uploads** — the guard must skip `auth.uid() IS NULL`; a signed lease PDF is a legal artifact.
- **Counting `blog-covers` / `bulk-imports`** toward an owner's usage — inflates the number (claims problem) and could wrongly block.
- **Reconciling a phantom "Max 100 GB"** — that function overload no longer exists; the quota function is net-new.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-owner send serialization | Custom mutex / retry loop in the edge fn | `pg_advisory_xact_lock` in the RPC | One-line, DB-native, released on txn end, no distributed-lock infra. |
| Upload chokepoint | A new "upload proxy" edge function | BEFORE INSERT trigger on `storage.objects` | Uploads are client-direct; a proxy would require rewriting every upload call site and is still bypassable via the Storage API. The trigger is the only universal guard. |
| Upgrade-prompt plumbing | New toast/modal system | Existing `plan_limit_exceeded` exception + `handleMutationError` "Upgrade" toast, and the 402 `upgrade_url` body | The client already routes both; emit the same shapes. |
| Byte/size display | New formatter | `formatBytes` (extend for GB) | Consistency across upload cards/vault. |
| Kill-flag / go-live gate | Ad-hoc env var | `app_config` flag + go-flip migration (Phase 53) | Same audited pre-flip discipline METER-04 requires. |
| Storage size totals | Client-side `.list()` + sum in JS | `SUM((metadata->>'size')::bigint)` in an RPC | `.list()` is paginated, slow, and bypasses attribution; the SUM is one indexed query. |

**Key insight:** every hard part already has a locked-in in-repo template (Phase 53 events/flag, `enforce_plan_limits` trigger, `tier-gate` 402). The phase is assembly, not invention.

## Runtime State Inventory

This phase writes new enforcement that reads **live production state** and flips a go-live flag — treat it like Phase 53.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Live `storage.objects` in prod across `avatars`, `property-images`, `inspection-photos`, `maintenance-photos`, `tenant-documents`. The grandfather snapshot reads these to decide who is exempt. | Run `get_owner_storage_usage` per owner at go-flip time; snapshot over-quota owners → `users.storage_grandfathered_at`. **Data migration** (writes the flag), gated by the METER-04 checkpoint. |
| Live service config | `app_config` kill-flag `storage_enforcement_enabled` (new, default `false`). Same table Phase 53 used for `reminders_delivery_enabled`. | Seed OFF in the trigger migration; flip ON as the LAST statement of the go-flip migration, only after the snapshot + human checkpoint. |
| OS-registered state | None. No cron/OS registration in this phase (metering is synchronous at write time). | None — verified: no `cron.schedule` needed. |
| Secrets/env vars | None new. The edge fn already has `SUPABASE_SERVICE_ROLE_KEY`; the metering RPC runs as service_role via the existing admin client. | None. |
| Build artifacts / installed packages | `src/types/supabase.ts` is stale relative to what this phase adds (new tables/RPCs). Also currently reflects `get_user_plan_limits` with NO storage — confirming the finding. | After each MCP `apply_migration`, reconcile the filename via `list_migrations`, then `bun run db:types` (owner-run per MEMORY; PAT may need refresh). |

**The canonical question — after every file is updated, what runtime systems still hold old state?** The enforcement trigger reads live `storage.objects` + `users` at every upload; the go-live gate depends on a one-time snapshot of *current* prod usage. Nothing is cached elsewhere — but the snapshot MUST run against prod (not a stale local copy), and enforcement must stay OFF until it does.

## Common Pitfalls

### Pitfall 1: Enforcing against a NULL size at BEFORE INSERT
**What goes wrong:** `NEW.metadata->>'size'` is NULL on the first insert, so any guard reading it silently never fires (or errors on the `::bigint` cast).
**Why:** Supabase inserts the object row (RLS check, no metadata), uploads to S3, then populates metadata. `[VERIFIED]`
**How to avoid:** Enforce on the owner's PRE-EXISTING SUM (Pattern 4). The SUM naturally skips in-flight null-size rows.
**Warning sign:** A test where an over-quota owner's upload still succeeds even with the flag ON.

### Pitfall 2: The e-sign TOCTOU
**What goes wrong:** 26 events land for a 25 cap under concurrency.
**Why:** READ COMMITTED count subqueries don't see each other's uncommitted inserts.
**How to avoid:** `pg_advisory_xact_lock('esign:'||owner)` at the top of the RPC (Pattern 2). Validate with a concurrent-send test (Validation Architecture below).

### Pitfall 3: Blocking the signed-lease finalize upload
**What goes wrong:** An over-quota owner signs a lease; `finalizeSignedLease` (service_role) uploads `lease/{id}/signed-lease.pdf` → the quota trigger blocks a legal artifact.
**Why:** The trigger fires on all inserts, including service_role.
**How to avoid:** First line of the trigger: `if (select auth.uid()) is null then return new;` (service_role has no uid). Test explicitly.

### Pitfall 4: Over-cap send shows a generic error, not an upgrade CTA
**What goes wrong:** `callLeaseSignatureEdgeFunction` (`lease-mutation-options.ts:46-53`) throws `new Error(error.error)` and **discards the 402 status + `upgrade_url`**. So the over-cap message shows as a plain toast with no "Upgrade" action.
**Why:** The wrapper doesn't preserve structured 402 fields (unlike `report-keys.ts` which does).
**How to avoid:** Make the over-cap `error` string self-actionable (it will surface verbatim — it doesn't match RAW_DB_INTERNALS), AND/OR enhance the wrapper to preserve `upgrade_url` and add an "Upgrade" toast action (small, mirrors `report-keys.ts:166-171` and the `plan_limit` branch in `mutation-error-handler.ts`). Recommend the wrapper enhancement so METER-01's block is actionable. The proactive Settings widget (METER-02) is the primary upgrade surface regardless.

### Pitfall 5: `property-images` legacy owner column in old RLS
**What goes wrong:** `20251202150000` references `properties.property_owner_id` + `get_current_property_owner_id()`, but the canonical column is `owner_user_id` (CLAUDE.md; later migrations `20260218032800/035300` corrected RLS).
**How to avoid:** The resolver (Pattern 3) uses `properties.owner_user_id` (canonical). Planner should confirm the live `properties` owner column via `list_tables` before shipping the resolver; all newer buckets already use `owner_user_id`.

### Pitfall 6: PostgREST function-overload ambiguity
**What goes wrong:** Adding a `get_owner_storage_limit_gb(text)` alongside `(uuid)` (or re-adding a `get_user_plan_limits(text)`) reintroduces the `PGRST203` "could not choose best candidate" error that `20260505230821` was written to fix.
**How to avoid:** Single `uuid` signature for every new function. Never re-add a `text` overload.

## Code Examples

All primary SQL is in Patterns 1–5 above (ready to adapt into migrations). Additional client-side reference:

### Owner-scoped e-sign usage read (Settings, METER-02)
```ts
// src/hooks/api/query-keys/usage-keys.ts (new factory — CLAUDE.md rule 9)
import { queryOptions } from "@tanstack/react-query";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";

export const usageQueries = {
  esign: () => queryOptions({
    queryKey: ["usage", "esign", "current-month"],
    queryFn: async () => {
      const supabase = createClient();
      const user = await getCachedUser();
      if (!user) throw new Error("Not authenticated");
      // Owner-RLS'd count via a SECURITY DEFINER read RPC (or head:true count).
      const { data, error } = await supabase.rpc("get_esign_usage_current_month");
      if (error) throw error;
      // typed mapper at the boundary — no `as unknown as`
      const row = Array.isArray(data) ? data[0] : data;
      return { used: Number(row?.used ?? 0), cap: 25, unlimited: !!row?.unlimited };
    },
    staleTime: 60_000,
  }),
  storage: () => queryOptions({
    queryKey: ["usage", "storage"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_storage_usage_summary"); // returns { used_bytes, limit_gb }
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const limitGb = Number(row?.limit_gb ?? 0);
      return { usedBytes: Number(row?.used_bytes ?? 0), limitGb, unlimited: limitGb < 0 };
    },
    staleTime: 60_000,
  }),
};
```
(The two convenience read RPCs `get_esign_usage_current_month()` / `get_storage_usage_summary()` wrap the owner's `auth.uid()` internally and are `grant execute ... to authenticated`, so the frontend never passes an owner id — matches the RPC-auth-guard convention.)

## State of the Art

| Old Assumption (from phase inputs) | Verified Current Reality | When Changed | Impact |
|-----------------------------------|--------------------------|--------------|--------|
| `get_user_plan_limits` returns 100 GB for Max (reconcile 100 → −1 in `20260218120000`) | The `get_user_plan_limits(text)` overload with `storage_gb` was **dropped** (`20260505230821`) and never recreated; the only live overload is `(uuid)` returning `{properties_limit, units_limit, is_admin}` — **no storage dimension exists** | 2026-05-05 | METER-03 quota source is **net-new** (`get_owner_storage_limit_gb`), not an edit. No "100" to change. |
| Enforce upload by checking the object's size on insert | `metadata->>'size'` is **NULL at BEFORE INSERT** (populated on a later metadata write) | Longstanding Storage behavior | Enforce on the pre-existing SUM, not `NEW`'s size. |
| Signed leases live in `lease-documents` | Signed leases + the whole document vault live in **`tenant-documents`**; `lease-documents` bucket is **unused/empty** | 2026-06 (`token_based_lease_esignature`) | Resolver/SUM target `tenant-documents`; `lease-documents` is a harmless empty exclude. |
| `owner_id`-based attribution is reliable | `storage.objects.owner_id` is not guaranteed populated on every path and is NULL for service_role writes | — | Use path-based attribution as the source of truth. |

**Deprecated/outdated in the repo (do not trust):**
- `supabase/schemas/storage.sql` shows only `bulk-imports` + `property-images` policies — it is a **stale partial dump** (MEMORY: never trust the schema dumps; verify live). The bucket-creating migrations are authoritative.
- `20251202150000` property-images RLS uses the legacy `property_owner_id`; canonical is `owner_user_id`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `tenant-documents` uses only the entity-type path branches `property/lease/maintenance/inspection` (+ possibly `tenant`); no other first segments exist in prod | Pattern 3 resolver | An unhandled entity_type returns NULL → those objects don't count toward usage (undercount). Low risk (undercount is claims-lenient, enforcement-lenient). Verify with `select distinct (storage.foldername(name))[1] from storage.objects where bucket_id='tenant-documents'`. |
| A2 | `storage.objects.owner_id` is NOT reliably the owner across all upload paths | Alternatives / Pattern 3 | If it IS reliable, the resolver could be simplified — but path-based is safe regardless. |
| A3 | On-demand SUM per upload is fast enough for typical portfolios (dozens–hundreds of files) | Pattern 4 / Alternatives | Pathological owners (100k+ objects) could see slow uploads. Mitigated by short-circuiting (Max/grandfathered/system skip the SUM). Counter-table is the escape hatch. |
| A4 | Adding a BEFORE INSERT trigger on `storage.objects` via MCP `apply_migration` succeeds and survives on hosted Supabase | Pattern 4 | If MCP can't create it (role perms), fall back to `AS RESTRICTIVE` INSERT policy (loses the upgrade payload). **Precedent says it works** (`handle_property_image_upload` is live), so LOW risk — but verify on first apply. |
| A5 | `properties.owner_user_id` is the live canonical owner column (not `property_owner_id`) | Pattern 3 / Pitfall 5 | Resolver join fails/returns wrong owner. Verify via `list_tables` before shipping. CLAUDE.md + newer migrations strongly indicate `owner_user_id`. |
| A6 | The metering RPC placed up-front is acceptable given rare failed-send over-count | Pattern 2 | If the owner-hostility of a "wasted" reservation is unacceptable, move metering to after `emailResult.success`. Owner decision; default is up-front. |

## Open Questions

1. **`tenant-documents` `tenant`-scoped branch** — does any live object use `tenant/{tenant_id}/...`, and if so how is its owner resolved (tenants have no `owner_user_id`; must join via `lease_tenants`→`leases`)?
   - Known: `property/lease/maintenance/inspection` branches are shipped across `20260420030000` / `v24` / `v25` migrations.
   - Unclear: whether a `tenant` branch exists live.
   - Recommendation: `select distinct (storage.foldername(name))[1] from storage.objects where bucket_id='tenant-documents'` at plan time; add the branch only if present.

2. **Does the over-cap send need the client wrapper enhancement, or is a self-actionable message enough?** (Pitfall 4)
   - Recommendation: enhance `callLeaseSignatureEdgeFunction` to preserve `upgrade_url` (small); the Settings widget is the primary upgrade surface either way.

3. **`get_owner_storage_usage` GRANT surface** — is it `authenticated` (called directly for the signed-in owner with an internal `auth.uid()` guard) or wrapped in a `get_storage_usage_summary()` read RPC?
   - Recommendation: wrap in a param-less `get_storage_usage_summary()` returning `{used_bytes, limit_gb}` for the current owner; keeps the raw functions service_role-only (RPC-auth-guard convention).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase MCP `apply_migration` / `list_migrations` | All 4 migrations (prod-timestamp reconcile) | ✓ (per MEMORY: MCP works even when CLI PAT 401s) | current | Owner-run `supabase db push` NOT used (CLAUDE.md) |
| Edge fn deploy (`lease-signature`) | METER-01 hook | ✓ via `bun scripts/deploy-edge-functions.ts` | — | MCP deploy corrupts non-ASCII (edge-deploy-mcp-fidelity); the SQL/edit here is pure-ASCII, but deploy via the disk-reading script and verify via `get_edge_function` |
| `bun run db:types` | Regenerate `supabase.ts` after migrations | ⚠ owner-run (PAT may need refresh per MEMORY) | — | Types can lag; commit types once regenerated |
| Deno test harness (`functions serve` not needed for pure unit tests) | Metering edge-fn test | ✓ | — | Model on `tests/lease-signing-test.ts` (hand-rolled fake client) |
| RLS integration harness (dual-client vs prod) | METER-01/03/04 DB tests | ✓ | `tests/integration/rls/` | Sequential; synthetic owners `e2e-owner-a/b` (pinned `subscription_plan='max'` — note: they'd be *exempt* from storage enforcement, so tests must use a non-max synthetic or override plan) |

**Blocking with no fallback:** none. **Note:** the synthetic RLS owners are `max` tier → unlimited storage; enforcement tests need an owner on a *limited* plan (create/override a synthetic Growth/Starter owner, or temporarily set `subscription_plan` in the test setup).

## Validation Architecture

**nyquist_validation = true** (`.planning/config.json`). Every METER requirement maps to an automated test; the four highest-risk behaviors get dedicated adversarial tests.

### Test Framework
| Property | Value |
|----------|-------|
| Unit (RPC logic via edge harness / mappers) | Vitest 4 + jsdom (`vitest.config.ts`); Deno `jsr:@std/assert` for edge-fn tests (`supabase/functions/tests/`) |
| DB behavior (RLS, triggers, race, SUM) | RLS integration suite, dual-client vs prod (`tests/integration/rls/`, `bun run test:integration`) |
| Quick run | `bun run test:unit -- --run <file>` |
| Full suite | `bun run validate:quick` (types + lint + unit) then `bun run test:integration` |

### Phase Requirements → Test Map
| Req | Behavior to prove | Test type | Command / location | Exists? |
|-----|-------------------|-----------|--------------------|---------|
| METER-01 | 25th send allowed, 26th blocked (Growth); Max unbounded; Starter never reaches | integration | `tests/integration/rls/esign-metering.rls.test.ts` (new) | ❌ Wave 0 |
| METER-01 | **Race-safe:** N concurrent `meter_esign_send` at count=24 yield exactly 1 insert, not N | integration (concurrency) | fire `Promise.all` of the RPC; assert `esign_events` count == 25, one `allowed:false` | ❌ Wave 0 |
| METER-01 | **Calendar-month reset:** an event dated last month does not count; `date_trunc('month',now())` boundary | integration | insert a back-dated row; assert current count excludes it | ❌ Wave 0 |
| METER-01 | `resend` does NOT insert an event (D-02) | Deno edge unit | extend `tests/lease-signing-test.ts` branch matrix | ❌ Wave 0 |
| METER-02 | Usage RPC returns `{used, cap, unlimited}`; 80% threshold surfaces the prompt | unit (mapper + component) | `usage-keys.test.ts` + Settings widget test | ❌ Wave 0 |
| METER-03 | SUM correctness across buckets; **excludes `blog-covers`/`bulk-imports`**; null-size rows skipped | integration | seed objects in each bucket incl. system; assert `get_owner_storage_usage` equals only owner-attributable sum | ❌ Wave 0 |
| METER-03 | Cross-owner isolation: owner B's objects never count toward owner A | integration | dual-client seed; assert separation | ❌ Wave 0 |
| METER-04 | Over-quota **non-grandfathered** upload rejected with `plan_limit_exceeded` when flag ON | integration | set plan=starter, seed to >10 GB (or lower the limit fn in a test schema), attempt upload, assert raise | ❌ Wave 0 |
| METER-04 | **Grandfathered** owner over quota still uploads | integration | set `storage_grandfathered_at`, assert upload succeeds | ❌ Wave 0 |
| METER-04 | **Max/unlimited** owner never blocked | integration | plan=max, assert upload succeeds | ❌ Wave 0 |
| METER-04 | **Service_role / signed-lease** upload never blocked even when owner over quota | integration | admin-client upload to `lease/{id}/...`, assert success | ❌ Wave 0 |
| METER-04 | Flag OFF ⇒ no enforcement (pre-flip) | integration | flag='false', over-quota upload succeeds | ❌ Wave 0 |
| METER-04 | Reads/downloads/deletes always allowed for over-quota owner (D-03) | integration | assert SELECT/DELETE unaffected by the INSERT guard | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `bun run validate:quick` (types + lint + unit; lefthook enforces 80% coverage).
- **Per wave merge:** the new `esign-metering` + `storage-metering` RLS integration files.
- **Phase gate:** full `test:integration` green + the METER-04 go-flip behind a `checkpoint:human-verify` (snapshot report reviewed before the flag flips).

### Wave 0 Gaps
- [ ] `tests/integration/rls/esign-metering.rls.test.ts` — METER-01 cap, race, month boundary, isolation
- [ ] `tests/integration/rls/storage-metering.rls.test.ts` — METER-03 SUM/exclusions + METER-04 enforce/grandfather/max/service_role/flag matrix
- [ ] Deno branch-matrix extension in `supabase/functions/tests/lease-signing-test.ts` — `send` meters / `resend` does not
- [ ] `src/hooks/api/query-keys/usage-keys.test.ts` + Settings widget test — mapper + 80% prompt
- [ ] Test fixture: a **limited-plan** synthetic owner (the existing `e2e-owner-a/b` are `max` = exempt) or a per-test `subscription_plan` override

## Security Domain

`security_enforcement` not set to false → included.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | yes | DB-layer enforcement is the trust boundary; client pre-check is UX-only and explicitly bypassable |
| V4 Access Control | yes | `esign_events` owner-SELECT RLS; write only via service_role RPC. Storage attribution is RLS-aligned. Quota functions REVOKE from anon/authenticated, GRANT to service_role (+ param-less owner-guarded read RPCs to authenticated). |
| V5 Input Validation | yes | RPC args are `uuid`; resolver casts path segments via `nullif(...,'')::uuid` (guards malformed paths); no dynamic SQL. |
| V6 Cryptography | no | No new crypto (signing tokens unchanged). |
| V7 Error Handling | yes | Trigger raises `plan_limit_exceeded` with a JSON `DETAIL` (no schema internals leaked to the client beyond the intended upgrade payload); edge fn uses `errorResponse` (never raw `err.message`). |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client bypasses the upload pre-check by calling the Storage API directly | Tampering / Elevation | BEFORE INSERT trigger enforces regardless of client (Pattern 4) |
| Owner A uploads into owner B's folder to skew usage | Tampering | Existing per-bucket INSERT RLS already blocks cross-owner writes; resolver attributes by the parent entity's `owner_user_id` |
| Concurrent sends to exceed the paid cap | Tampering (quota evasion) | Advisory-lock count-and-insert (Pattern 2) |
| Quota functions callable by end users to probe others | Info Disclosure | REVOKE from anon/authenticated; expose only param-less owner-guarded read RPCs |
| SECURITY DEFINER search_path hijack | Elevation | Every function `set search_path = public` (+ `storage` where `storage.foldername` is used — qualify as `storage.foldername`) |

**Note:** functions using `storage.foldername(...)` must either `set search_path = public, storage` or fully-qualify `storage.foldername` — the existing `handle_property_image_upload` uses `SET search_path = public, storage`. Prefer fully-qualified `storage.foldername` with `search_path = public` to keep a single-schema search path.

## Sources

### Primary (HIGH confidence)
- Committed migrations (authoritative): `20260505213825_enforce_plan_limits.sql`, `20260510094421_phase_5_recognize_new_price_ids.sql`, `20260505230821_drop_legacy_get_user_plan_limits_text_overload.sql`, `20260722005310_lease_reminders_delivery_state.sql`, `20251202150000_property_images_rls_and_trigger.sql`, `20251226163520_create_profile_avatar_storage.sql`, `20260220110001_create_inspection_photos_bucket.sql`, `20260420010000_secure_maintenance_photos_storage.sql`, `20260420030000_document_vault_phase_57.sql`, `20260424182557_v24_phase_60_global_document_vault.sql`
- `src/types/supabase.ts:2782` (generated) — `get_user_plan_limits(uuid)` returns `{is_admin, properties_limit, units_limit}` only (no storage) → confirms the dropped-overload finding
- `src/config/pricing.ts` — locked quota values (storage GB per tier; "25 lease e-signs per month"; "Unlimited document storage")
- `supabase/functions/lease-signature/index.ts` (hook point 136-148), `_shared/tier-gate.ts`, `_shared/plan-tier.ts`, `_shared/lease-signing.ts` (`SIGNED_LEASE_BUCKET='tenant-documents'`, `signedLeasePath`)
- `src/lib/mutation-error-handler.ts` (plan_limit_exceeded client contract), `src/hooks/api/query-keys/report-keys.ts:166-171` (402 upgrade_url parse), `src/hooks/api/query-keys/document-keys.ts` (vault upload path + `documents.file_size`/`owner_user_id`)
- `supabase/schemas/storage.sql` — `storage.get_size_by_bucket()` confirms `metadata->>'size'` is the canonical byte field; `objects_insert_prefix_trigger` confirms BEFORE INSERT triggers on `storage.objects`

### Secondary (MEDIUM confidence — verified against in-repo behavior)
- Supabase discussion #33671 "What happens if INSERT into storage.objects fails during upload" — two-write pattern; metadata NULL on the first insert. Cross-verified by `handle_property_image_upload`'s explicit "UPDATE when metadata populated for the first time" handling.
- Supabase discussion #4368 (owner_id population) + Storage Access Control docs — `owner_id` not auto-populated by default; supports the path-based-attribution recommendation.

### Tertiary (LOW confidence — flag for live verification)
- Exact live INSERT RLS policy set on `storage.objects` and the live `properties` owner column — verify via MCP `list_tables` / `select ... from pg_policies` at plan time (the schema dump is stale).

## Metadata

**Confidence breakdown:**
- Quota-source finding (no live storage_gb; net-new function): HIGH — generated types + migration DROP with no recreate.
- E-sign race-safe design: HIGH — canonical advisory-lock pattern; direct analog to `claim_lease_reminders`.
- Storage enforcement mechanism (trigger, pre-existing-SUM): HIGH — two independent confirmations of null-size-at-insert; live in-repo trigger precedent.
- Bucket attribution table: HIGH for the 5 owner buckets (read from their migrations); MEDIUM for the `tenant-documents` `tenant` branch (A1/Open-Q1).
- Settings UI: HIGH — existing surface + primitives identified.

**Research date:** 2026-07-23
**Valid until:** ~2026-08-22 (30 days; stable domain). Re-verify only if Supabase Storage changes the insert/metadata lifecycle or `get_user_plan_limits` is re-shaped.

## RESEARCH COMPLETE

**Phase:** 54 - E-sign & Storage Metering
**Confidence:** HIGH

### Key findings
- **No live "Max 100 GB" bug** — the `get_user_plan_limits(text)`/`storage_gb` overload was dropped and never recreated; the DB has no storage quota today. METER-03 adds a net-new `get_owner_storage_limit_gb(uuid)` (Max = −1), values from `pricing.ts`.
- **`metadata->>'size'` is NULL at BEFORE INSERT** — enforce storage on the owner's PRE-EXISTING SUM, not the new object's size.
- **Custom triggers on `storage.objects` are proven live** on this project (`handle_property_image_upload`) → the recommended enforcement is a BEFORE INSERT trigger raising the existing `plan_limit_exceeded` upgrade payload (not RLS, which loses the upgrade CTA).
- **Attribution is per-bucket path-based** (one resolver function): avatars = path[1]=user; property/inspection/maintenance = join by path[1]; `tenant-documents` = branch on entity_type; exclude system `blog-covers`/`bulk-imports`. Signed leases + vault both live in `tenant-documents`.
- **E-sign = advisory-lock count-and-insert RPC** (service_role-only, calendar-month window, block Growth at 25, Max unbounded), hooked immediately after `checkTierEntitlement` on `send` only; `resend` never meters.
- **Go-live gate mirrors Phase 53**: `users.storage_grandfathered_at` snapshot + `app_config storage_enforcement_enabled` flag flipped LAST behind a `checkpoint:human-verify`.

### File created
`.planning/phases/54-e-sign-storage-metering/54-RESEARCH.md`

### Confidence assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard stack (existing rails) | HIGH | Every part has an in-repo template |
| Architecture (metering + enforcement) | HIGH | Two confirmed Storage behaviors + live trigger precedent |
| Pitfalls | HIGH | Grounded in code (null-size, TOCTOU, service_role, client 402 swallow) |
| Bucket attribution | HIGH / MEDIUM | 5 buckets verified; `tenant-documents` `tenant` branch to confirm live |

### Open questions (non-blocking)
- `tenant-documents` `tenant/` path branch existence (Open Q1) — one-line live query at plan time.
- Over-cap send client-wrapper enhancement vs self-actionable message (Pitfall 4).
- GRANT surface for usage functions (Open Q3).

### Ready for planning
Research complete. The planner can produce migrations + edge-fn hook + Settings UI plans directly from Patterns 1–6, the Validation Architecture map, and the Runtime State Inventory. The METER-04 go-flip is a gated final plan.
