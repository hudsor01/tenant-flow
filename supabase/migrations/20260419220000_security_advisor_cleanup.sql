-- Phase 50: Supabase security advisor cleanup.
--
-- Three fixes:
--   1. Storage buckets `avatars` + `property-images` had broad `SELECT`
--      policies that allowed authenticated clients to LIST all files
--      (directory enumeration). Public buckets don't need a SELECT policy
--      for object-URL reads, so dropping the policies tightens access
--      without breaking image display.
--   2. Three `stripe.*` functions (set_updated_at, set_updated_at_metadata,
--      check_rate_limit) have mutable `search_path`. Pin to empty string so
--      any search_path manipulation by callers can't hijack resolution.
--
-- 2026-05-27 update (Phase 4 cycle-2): wrap the stripe.* function alters
-- in a schema-existence guard. The stripe schema is provided by the
-- Supabase stripe (wrappers) extension. On prod the extension is
-- installed and the schema exists. On Supabase Preview chain replay
-- the extension is NOT installed and the stripe schema is missing,
-- producing SQLSTATE 3F000 "schema stripe does not exist". The DROP
-- POLICY statements above are storage.objects and unaffected -- those
-- run regardless.

begin;

-- 1. Drop redundant SELECT policies that enabled listing
drop policy if exists "Anyone can view avatars" on storage.objects;
drop policy if exists "Anyone can view property images" on storage.objects;
drop policy if exists "Public read access for property images" on storage.objects;

-- 2. Lock search_path on stripe schema helper functions (guarded)
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'stripe') then
    if exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'stripe' and p.proname = 'set_updated_at'
    ) then
      execute 'alter function stripe.set_updated_at() set search_path = '''' ';
    end if;
    if exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'stripe' and p.proname = 'set_updated_at_metadata'
    ) then
      execute 'alter function stripe.set_updated_at_metadata() set search_path = '''' ';
    end if;
    if exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'stripe' and p.proname = 'check_rate_limit'
        and pg_get_function_identity_arguments(p.oid) = 'text, integer, integer'
    ) then
      execute 'alter function stripe.check_rate_limit(text, integer, integer) set search_path = '''' ';
    end if;
  else
    raise notice 'security_advisor_cleanup: stripe schema absent -- skipping function search_path locks (chain-replay path; stripe extension installed only on prod).';
  end if;
end $$;

commit;
