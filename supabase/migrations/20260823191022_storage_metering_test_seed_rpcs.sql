-- =============================================================================
-- Storage-metering acceptance seeding, without exposing the storage schema.
--
-- WHY THIS EXISTS. tests/integration/rls/storage-metering.rls.test.ts must put an
-- owner over quota to exercise the METER-04 upload guard, and uploading real
-- gigabytes is infeasible -- so it fabricates one storage.objects row carrying a
-- large metadata.size. It did that with a direct PostgREST insert against the
-- storage schema, which this project does not expose, so all seven of its tests
-- failed at the seed step. They had never run: the RLS suite was silently
-- skipping for want of a service-role key, so the "fail loudly" signal the test
-- author wrote for exactly this case went to nobody for months.
--
-- WHY NOT JUST EXPOSE `storage` TO POSTGREST. That is the other option the test's
-- own header offers, and it is the wrong trade: it widens the PostgREST surface
-- for every caller, permanently, to solve a test-seeding problem. `stripe` is
-- already exposed and is cited as precedent, but stripe.* is a read-only FDW
-- while storage.objects is live user data.
--
-- These two functions are the same shape the metering code already uses:
-- SECURITY DEFINER in `public`, reaching into storage.*, service_role-only.
-- get_owner_storage_usage (20260724033540) does precisely this.
-- =============================================================================

create or replace function public.seed_storage_object_for_test(
  p_owner  uuid,
  p_bucket text,
  p_name   text,
  p_bytes  bigint
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_bytes is null or p_bytes < 0 then
    raise exception 'seed_storage_object_for_test: p_bytes must be >= 0';
  end if;

  -- The metering trigger fires on this insert too, and short-circuits at its
  -- first step because auth.uid() is null under service_role. That is the same
  -- bypass a signed-URL upload takes, so seeding cannot deadlock against the
  -- guard it exists to test.
  insert into storage.objects (bucket_id, name, owner, metadata)
  values (
    p_bucket,
    p_name,
    p_owner,
    jsonb_build_object('size', p_bytes, 'mimetype', 'application/octet-stream')
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.seed_storage_object_for_test(uuid, text, text, bigint) is
  'TEST SEEDING ONLY. Fabricates a storage.objects row with a chosen metadata.size so the METER-04 upload guard can be driven over quota without uploading real bytes. service_role-only; never called by application code. Exists so the storage schema does not have to be exposed to PostgREST.';

revoke all on function public.seed_storage_object_for_test(uuid, text, text, bigint) from public, anon, authenticated;
grant execute on function public.seed_storage_object_for_test(uuid, text, text, bigint) to service_role;

create or replace function public.delete_storage_objects_for_test(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from storage.objects where id = any(p_ids);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

comment on function public.delete_storage_objects_for_test(uuid[]) is
  'TEST CLEANUP ONLY. Removes rows seeded by seed_storage_object_for_test so an acceptance run leaves no residue in storage.objects. service_role-only.';

revoke all on function public.delete_storage_objects_for_test(uuid[]) from public, anon, authenticated;
grant execute on function public.delete_storage_objects_for_test(uuid[]) to service_role;
