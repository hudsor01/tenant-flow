-- METER-03: net-new storage quota + usage data layer.
--
-- Purpose: give the Settings usage widget (Plan 05), the upload-enforcement
-- trigger (Plan 04), and the grandfather snapshot (Plan 06) a single shared
-- source for "how much has this owner stored" and "what is this owner's quota".
--
-- IMPORTANT — this is ADDITIVE, not a "100 GB -> -1" edit. There is NO live
-- storage_gb in the DB: the get_user_plan_limits(text) overload that once carried
-- it was dropped in 20260505230821_drop_legacy_get_user_plan_limits_text_overload
-- and never recreated. The surviving get_user_plan_limits(uuid) returns only
-- {properties_limit, units_limit, is_admin}. So the storage quota source is
-- brand-new here.
--
-- Affected objects (all in public; none touch RLS on storage.objects):
--   (1) get_owner_storage_limit_gb(uuid)  -> per-tier GB quota, values locked to
--       src/config/pricing.ts limits.storage (Trial 1 / Starter 10 / Growth 50 /
--       Max -1 unlimited). Single uuid signature — NEVER a text overload (a
--       (text) overload would reintroduce the PGRST203 "could not choose best
--       candidate" ambiguity that 20260505230821 was written to remove).
--   (2) storage_object_owner(text, text)  -> path-based per-bucket owner resolver;
--       attributes each storage.objects row to an owner_user_id, returning null
--       for system/ephemeral buckets so they are excluded from usage for free.
--   (3) get_owner_storage_usage(uuid)     -> SUM((metadata->>'size')::bigint) over
--       the owner-attributable buckets, filtered by the resolver.
--   (4) get_storage_usage_summary()       -> param-less authenticated read RPC that
--       resolves (select auth.uid()) internally and returns {used_bytes, limit_gb}.
--
-- Grant discipline mirrors 20260505213825 (get_user_plan_limits) and
-- 20260722005310 (claim_lease_reminders): the raw usage/limit/resolver functions
-- are SECURITY DEFINER + service_role-only (an end user must not be able to probe
-- another owner's usage). Only the owner-guarded, param-less summary is
-- authenticated-callable.
--
-- Security: every function is SECURITY DEFINER with `set search_path = public`
-- and fully-qualifies `storage.foldername(...)` so the storage schema cannot be
-- hijacked via a mutable search_path (T-54-11). Path segments are cast via
-- nullif(...,'')::uuid; the storage.objects INSERT RLS already rejects
-- off-convention / non-UUID paths, so stored rows in the attributable buckets
-- always carry valid uuid segments.

-- =============================================================================
-- (1) get_owner_storage_limit_gb(uuid) — per-tier GB quota (pricing.ts locked)
-- =============================================================================
-- STABLE: for a given owner the result is fixed by the current subscription_plan.
-- Accepts both tier slugs and the raw Stripe price ids (the webhook historically
-- wrote raw price ids to subscription_plan before priceIdToTier normalization),
-- matched case-insensitively via lower(). -1 = unlimited (Max).
create or replace function public.get_owner_storage_limit_gb(p_owner uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan text;
begin
  select lower(coalesce(subscription_plan, '')) into v_plan
  from public.users
  where id = p_owner;

  return case v_plan
    -- Starter: 10 GB (slug + monthly/annual price ids)
    when 'starter'                        then 10
    when 'price_1tvtaap3wcr53sdoymuzn7vf' then 10
    when 'price_1tvtaep3wcr53sdo7pbg6bcw' then 10
    -- Growth: 50 GB (slug + monthly/annual price ids)
    when 'growth'                         then 50
    when 'price_1tvtaip3wcr53sdoqnue1inv' then 50
    when 'price_1tvtamp3wcr53sdon4kufrvn' then 50
    -- Max: unlimited (both slugs + monthly/annual price ids)
    when 'max'                            then -1
    when 'tenantflow_max'                 then -1
    when 'price_1tvtaqp3wcr53sdo22vayfhp' then -1
    when 'price_1tvtaup3wcr53sdo5mnmsamf' then -1
    -- Trial / null / unknown: most restrictive (1 GB)
    else 1
  end;
end;
$$;

comment on function public.get_owner_storage_limit_gb(uuid) is
  'METER-03 per-tier storage quota in GB, values locked to src/config/pricing.ts '
  '(Trial 1 / Starter 10 / Growth 50 / Max -1 unlimited). Net-new (no prior '
  'storage_gb existed). service_role-only; read via get_storage_usage_summary().';

revoke all on function public.get_owner_storage_limit_gb(uuid) from public, anon, authenticated;
grant execute on function public.get_owner_storage_limit_gb(uuid) to service_role;

-- =============================================================================
-- (2) storage_object_owner(text, text) — path-based owner attribution resolver
-- =============================================================================
-- Maps (bucket_id, object name) -> owner_user_id per each bucket's path
-- convention. Returns null for system/ephemeral buckets (blog-covers,
-- bulk-imports, unused lease-documents) so they never count toward any owner.
-- The five owner-attributable buckets:
--   avatars            -> path[1] IS the owner (users.id) directly
--   property-images    -> join properties.owner_user_id by path[1]
--   inspection-photos  -> join inspections.owner_user_id by path[1]
--   maintenance-photos -> join maintenance_requests.owner_user_id by path[1]
--   tenant-documents   -> branch on path[1] entity_type, resolve owner by path[2]
-- The tenant-documents branch covers ALL FIVE live first-segments (verified vs
-- 20260420030000 / 20260424140000 / 20260426040728 and
-- tests/integration/rls/documents-cross-entity.rls.test.ts:320-329). Two live
-- facts honored: (a) the string is 'maintenance_request', NOT 'maintenance';
-- (b) public.tenants HAS its own owner_user_id (used directly in the live
-- tenant-documents RLS 20260424140000), so 'tenant' resolves via
-- public.tenants.owner_user_id by path[2] — not null, not a lease join.
create or replace function public.storage_object_owner(p_bucket text, p_name text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case p_bucket
    when 'avatars' then
      nullif((storage.foldername(p_name))[1], '')::uuid
    when 'property-images' then
      (select p.owner_user_id
         from public.properties p
        where p.id = nullif((storage.foldername(p_name))[1], '')::uuid)
    when 'inspection-photos' then
      (select i.owner_user_id
         from public.inspections i
        where i.id = nullif((storage.foldername(p_name))[1], '')::uuid)
    when 'maintenance-photos' then
      (select m.owner_user_id
         from public.maintenance_requests m
        where m.id = nullif((storage.foldername(p_name))[1], '')::uuid)
    when 'tenant-documents' then
      case (storage.foldername(p_name))[1]
        when 'property' then
          (select p.owner_user_id
             from public.properties p
            where p.id = nullif((storage.foldername(p_name))[2], '')::uuid)
        when 'lease' then
          (select l.owner_user_id
             from public.leases l
            where l.id = nullif((storage.foldername(p_name))[2], '')::uuid)
        when 'tenant' then
          (select t.owner_user_id
             from public.tenants t
            where t.id = nullif((storage.foldername(p_name))[2], '')::uuid)
        when 'maintenance_request' then
          (select m.owner_user_id
             from public.maintenance_requests m
            where m.id = nullif((storage.foldername(p_name))[2], '')::uuid)
        when 'inspection' then
          (select i.owner_user_id
             from public.inspections i
            where i.id = nullif((storage.foldername(p_name))[2], '')::uuid)
        else null
      end
    -- SYSTEM / excluded: blog-covers (platform brand art), bulk-imports
    -- (ephemeral CSV scratch), lease-documents (unused/empty).
    else null
  end;
$$;

comment on function public.storage_object_owner(text, text) is
  'METER-03 path-based owner attribution for storage.objects. Resolves the five '
  'owner-attributable buckets (avatars, property-images, inspection-photos, '
  'maintenance-photos, tenant-documents) to owner_user_id; tenant-documents '
  'branches across property/lease/tenant/maintenance_request/inspection by path[2]. '
  'Returns null for blog-covers/bulk-imports/lease-documents (excluded). '
  'service_role-only.';

revoke all on function public.storage_object_owner(text, text) from public, anon, authenticated;
grant execute on function public.storage_object_owner(text, text) to service_role;

-- =============================================================================
-- (3) get_owner_storage_usage(uuid) — SUM of attributed object bytes
-- =============================================================================
-- metadata->>'size' is NULL for in-flight rows (Supabase Storage inserts the row
-- first, then populates metadata on finalize); the ::bigint SUM skips those
-- NULLs, so usage reflects only finalized bytes. The bucket IN (...) allowlist is
-- the load-bearing exclusion of system buckets — blog-covers / bulk-imports /
-- lease-documents are never summed regardless of the resolver.
--
-- Attribution = coalesce(storage.objects.owner, storage_object_owner(path)).
-- PROD-DATA CORRECTION: path-parsing alone attributed only 1/877 real
-- property-images because the live path convention is <uuid>/file.jpg, NOT
-- <property_id>/... The native storage.objects.owner column (the uploader's
-- auth.uid()) is populated on every client upload and — in this landlord-only
-- app where every uploader IS the owning landlord — equals owner_user_id
-- (verified 877/877 coverage, 0 ids outside public.users, and it agrees with the
-- path resolver wherever both exist). owner is primary; the path resolver is the
-- fallback for service-role uploads that leave owner null (e.g. signed-lease PDFs).
create or replace function public.get_owner_storage_usage(p_owner uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum((o.metadata->>'size')::bigint), 0)
  from storage.objects o
  where o.bucket_id in (
      'avatars',
      'property-images',
      'inspection-photos',
      'maintenance-photos',
      'tenant-documents'
    )
    and coalesce(o.owner, public.storage_object_owner(o.bucket_id, o.name)) = p_owner;
$$;

comment on function public.get_owner_storage_usage(uuid) is
  'METER-03 storage usage in bytes: SUM((metadata->>''size'')::bigint) over the '
  'owner-attributable buckets. Attribution = coalesce(storage.objects.owner, '
  'storage_object_owner(path)) — native uploader column primary (robust across '
  'path conventions; every uploader is the owning landlord), path resolver '
  'fallback for service-role uploads with null owner. Excludes system buckets and '
  'skips null-size in-flight rows. service_role-only; read via get_storage_usage_summary().';

revoke all on function public.get_owner_storage_usage(uuid) from public, anon, authenticated;
grant execute on function public.get_owner_storage_usage(uuid) to service_role;

-- =============================================================================
-- (4) get_storage_usage_summary() — param-less authenticated read RPC
-- =============================================================================
-- The single authenticated-callable surface for the Settings widget. Resolves
-- (select auth.uid()) internally so the caller never passes an owner id (an end
-- user cannot probe another owner). Being SECURITY DEFINER, it may call the
-- service_role-only raw functions above (the definer owns them).
create or replace function public.get_storage_usage_summary()
returns table(used_bytes bigint, limit_gb integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated'
      using errcode = '28000';
  end if;

  return query
    select public.get_owner_storage_usage(v_uid),
           public.get_owner_storage_limit_gb(v_uid);
end;
$$;

comment on function public.get_storage_usage_summary() is
  'METER-03 owner-guarded storage usage read for the Settings widget. Returns the '
  'calling owner''s {used_bytes, limit_gb} resolved from (select auth.uid()); '
  'no owner argument. authenticated-callable (the raw usage/limit functions stay '
  'service_role-only).';

revoke all on function public.get_storage_usage_summary() from public, anon;
grant execute on function public.get_storage_usage_summary() to authenticated;
