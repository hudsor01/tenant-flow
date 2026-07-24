-- METER-04: storage upload-enforcement guard.
--
-- Purpose: install the REAL upload quota guard — a BEFORE INSERT trigger on
-- storage.objects (enforce_storage_quota) that blocks a new upload for a
-- non-grandfathered owner who is already at/over their plan's storage quota, and
-- raises the structured plan_limit_exceeded upgrade exception the client turns
-- into an Upgrade prompt. Uploads go client-direct to Supabase Storage (there is
-- NO edge-fn chokepoint), so a DB trigger is the only universal guard.
--
-- CREATED FLAG-OFF (no-op in prod): this migration seeds the app_config kill-flag
-- storage_enforcement_enabled = 'false', so the trigger short-circuits to a no-op
-- on every insert. Plan 06 (the grandfather snapshot) flips the flag to 'true' as
-- its LAST statement, AFTER stamping every currently-over-quota owner as
-- grandfathered. Applying THIS migration therefore cannot block any real upload.
--
-- Affected objects:
--   (1) public.users.storage_grandfathered_at (new nullable timestamptz) — the
--       Plan 06 grandfather snapshot stamps it; non-null = permanently exempt from
--       upload enforcement (D-04 full grandfather).
--   (2) public.app_config seed 'storage_enforcement_enabled' = 'false' (kill-flag).
--   (3) public.enforce_storage_quota() trigger fn (SECURITY DEFINER, search_path
--       locked to public).
--   (4) trg_enforce_storage_quota BEFORE INSERT on storage.objects.
--
-- Consumes the LIVE Plan 03 functions (20260724033540_storage_quota_functions):
--   public.get_owner_storage_usage(uuid)    — the owner's PRE-EXISTING running SUM
--   public.get_owner_storage_limit_gb(uuid) — per-tier GB quota (-1 = Max/unlimited)
--
-- Reads/downloads/deletes are NEVER affected (D-03): the guard is BEFORE INSERT
-- only. It never reads NEW's metadata size (that field is NULL at BEFORE INSERT —
-- Supabase inserts the object row first, then populates metadata on finalize), so
-- enforcement is on the owner's PRE-EXISTING SUM.

-- =============================================================================
-- (1) users.storage_grandfathered_at — grandfather snapshot target (Plan 06)
-- =============================================================================
alter table public.users
  add column if not exists storage_grandfathered_at timestamptz;

comment on column public.users.storage_grandfathered_at is
  'METER-04 full grandfather (D-04): non-null = this owner was over their storage '
  'quota at enforcement launch and is permanently exempt from upload enforcement '
  '(they keep read/download/delete AND upload; enforcement applies only to owners '
  'who cross the quota after launch). Stamped ONLY by the Plan 06 service_role '
  'snapshot; a client cannot self-grandfather (see the allowlist note below).';

-- WARNING 5 / T-54-15 discharge — NON-MUTATING, no trigger change.
-- storage_grandfathered_at is intentionally OMITTED from the allowed_cols
-- allowlist in the LIVE guard_user_self_update() (20260507194555). That guard is
-- fail-closed: on a PostgREST self-update it raises 42501 whenever
-- (to_jsonb(new) - allowed_cols) is distinct from (to_jsonb(old) - allowed_cols),
-- so ANY column absent from allowed_cols is rejected by omission — including this
-- new one (the column-level GRANT UPDATE on public.users also excludes it). We
-- DELIBERATELY do NOT recreate guard_user_self_update here: recreating it from the
-- superseded 20260507190024 enumerated-blocklist idiom would overwrite the live
-- fail-closed allowlist with the older fail-open blocklist and REVERT the P0 fix.
-- Only the Plan 06 service_role snapshot may stamp storage_grandfathered_at.

-- =============================================================================
-- (2) app_config kill-flag — seeded OFF (Plan 06 flips it 'true' last)
-- =============================================================================
-- Mirrors the Phase 53 reminders_delivery_enabled pre-flip gate. ON CONFLICT DO
-- NOTHING preserves any operator-set value on re-run. app_config is
-- service_role-only (no authenticated policy), so a user cannot flip enforcement.
insert into public.app_config (key, value)
  values ('storage_enforcement_enabled','false')
on conflict (key) do nothing;

-- =============================================================================
-- (3) enforce_storage_quota() — BEFORE INSERT trigger fn
-- =============================================================================
-- Exemption ladder (allow the insert, IN ORDER); the guard is deliberately cheap
-- when disabled — in prod (flag OFF) it returns at step 2 after two reads.
--
--   1. auth.uid() IS NULL  -> allow. Service-role / signed-lease finalize writes
--      leave the uploader null; a legal artifact must never be blocked by quota
--      (Pitfall 3 / T-54-14).
--   2. storage_enforcement_enabled <> 'true'  -> allow. Kill-switch OFF until the
--      Plan 06 grandfather snapshot runs (T-54-17: applying this migration cannot
--      block anyone).
--   3. bucket_id NOT IN the five owner-attributable buckets  -> allow. System /
--      unattributable buckets (blog-covers, bulk-imports, lease-documents, ...)
--      are never metered.
--   4. Max / unlimited tier (limit -1)  -> allow.
--   5. owner is grandfathered  -> allow (D-04 full grandfather).
--   6. else compare the owner's PRE-EXISTING SUM vs the quota; at/over -> RAISE.
--
-- Owner identification: coalesce(NEW.owner, auth.uid()). The native uploader
-- column (storage.objects.owner) is primary — the live path convention is
-- <uuid>/file, so path-parsing alone attributed only 1/877 real objects; every
-- client upload populates NEW.owner with the uploader's auth.uid(), and in this
-- landlord-only app the uploader IS the owning landlord. get_owner_storage_usage
-- sums that owner's existing objects (which carry owner = v_owner) correctly.
--
-- CLIENT CONTRACT (load-bearing for Plan 07): the RAISE message MUST begin with
-- the literal prefix 'plan_limit_exceeded:'. Storage uploads go through the
-- Storage API (@supabase/storage-js), NOT PostgREST, so a rejected upload reaches
-- the browser as a StorageApiError carrying only {name, message, status,
-- statusCode} — hint and detail are STRIPPED. The message prefix is therefore the
-- ONLY client-parseable signal for a storage-quota rejection; Plan 07 parses it.
-- hint/detail are kept anyway (harmless; used if a PostgREST path ever raises it).
create or replace function public.enforce_storage_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_limit_gb integer;
  v_used bigint;
  v_limit_bytes bigint;
begin
  -- 1. Service-role / signed-lease finalize (no auth.uid()) — never block a legal
  --    artifact or a backend/migration write.
  if (select auth.uid()) is null then
    return new;
  end if;

  -- 2. Kill-switch: no enforcement until Plan 06 flips the flag (pre-flip no-op).
  if coalesce(
       (select value from public.app_config where key = 'storage_enforcement_enabled'),
       'false'
     ) <> 'true' then
    return new;
  end if;

  -- 3. Only the five owner-attributable buckets are metered; system /
  --    unattributable buckets are never blocked.
  if new.bucket_id not in (
       'avatars',
       'property-images',
       'inspection-photos',
       'maintenance-photos',
       'tenant-documents'
     ) then
    return new;
  end if;

  -- Uploading owner: native uploader column primary, auth.uid() fallback.
  v_owner := coalesce(new.owner, (select auth.uid()));

  -- 4. Max / unlimited tier (-1) — never blocked.
  v_limit_gb := public.get_owner_storage_limit_gb(v_owner);
  if v_limit_gb < 0 then
    return new;
  end if;

  -- 5. Full grandfather exemption (D-04): over-quota-at-launch owners keep
  --    uploading (they see an upgrade prompt but never an upload lockout).
  if exists (
       select 1 from public.users
       where id = v_owner and storage_grandfathered_at is not null
     ) then
    return new;
  end if;

  -- 6. Enforce on the owner's PRE-EXISTING running SUM only (never NEW's own
  --    size — that value is NULL at BEFORE INSERT). At/over quota -> block.
  v_limit_bytes := v_limit_gb::bigint * 1024 * 1024 * 1024;
  v_used := public.get_owner_storage_usage(v_owner);

  if v_used >= v_limit_bytes then
    raise exception
      'plan_limit_exceeded: storage quota reached (% / % bytes used)', v_used, v_limit_bytes
      using
        errcode = 'P0001',
        hint = 'plan_limit_exceeded',
        detail = format(
          '{"resource":"storage","used":%s,"limit":%s,"upgrade_source":"storage_quota_gate"}',
          v_used, v_limit_bytes
        );
  end if;

  return new;
end;
$$;

comment on function public.enforce_storage_quota() is
  'METER-04 upload quota guard (BEFORE INSERT on storage.objects). Blocks a new '
  'upload for a non-grandfathered owner already at/over their plan quota, on the '
  'PRE-EXISTING SUM (never NEW''s null-at-insert size), with the plan_limit_exceeded '
  'upgrade exception. Exempts: service-role/null-uid, flag OFF, system buckets, '
  'Max tier, grandfathered owners. Reads/downloads/deletes are unaffected (INSERT '
  'only). Created flag-OFF; Plan 06 flips storage_enforcement_enabled.';

-- =============================================================================
-- (4) trg_enforce_storage_quota — BEFORE INSERT on storage.objects
-- =============================================================================
-- storage.objects is a SHARED Supabase system table. A custom trigger on it is
-- proven live on this project (handle_property_image_upload, 20251202150000) and
-- Storage itself installs BEFORE INSERT triggers (objects_insert_prefix_trigger),
-- so this is a supported operation. drop-if-exists makes the migration idempotent.
drop trigger if exists trg_enforce_storage_quota on storage.objects;
create trigger trg_enforce_storage_quota
  before insert on storage.objects
  for each row
  execute function public.enforce_storage_quota();
