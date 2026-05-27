-- migration: harden rls auth.uid() wrappers
-- purpose: fix three real bare auth.uid() issues found during v8.0 post-migration audit:
--   1. get_current_owner_user_id() - plpgsql+EXECUTE pattern prevents query plan caching
--      and embeds bare auth.uid() inside a dynamic SQL string (not wrapped in SELECT).
--      fix: convert to sql language with a static, plan-cacheable query.
--   2. get_current_property_owner_id() - sql language but missing (select auth.uid()) wrapper.
--      the SELECT subquery form allows postgres to evaluate auth.uid() once per statement
--      (via initPlan) rather than once per row, which is a meaningful performance win.
--   3. three storage.objects policies for bulk-imports bucket use (auth.uid())::text
--      (a bare call with a cast) instead of ((select auth.uid()))::text.
--
-- affected tables: none (function + storage.objects policy changes only)
-- affected functions: get_current_owner_user_id, get_current_property_owner_id
-- affected policies: 3 x storage.objects (bulk-imports bucket)
-- risk: low - these are performance/correctness hardening only; no logic changes

-- ============================================================
-- 1+2. fix get_current_owner_user_id() and get_current_property_owner_id()
--      both: sql language (eager validation) referencing stripe_connected_accounts
-- ============================================================
--
-- 2026-05-27 update (Phase 4 cycle-2): wrap both CREATE FUNCTION calls
-- in a to_regclass guard. LANGUAGE SQL bodies are validated EAGERLY at
-- CREATE FUNCTION time, so a missing stripe_connected_accounts table
-- on chain replay (the `failed to send batch` SQLSTATE 42P01 surfaces
-- here) fails the CREATE. Guard makes it conditional: on prod the
-- table exists so functions are recreated as before; on replay
-- skipped, and later chain migrations drop these functions entirely.

do $$
begin
  if to_regclass('public.stripe_connected_accounts') is not null then
    -- the old function had a legacy table-name branch to handle a migration-period where
    -- the table might still be named property_owners. that table no longer exists.
    -- stripe_connected_accounts is the definitive table.
    execute $sql$
      create or replace function public.get_current_owner_user_id()
      returns uuid
      language sql
      security definer
      stable
      set search_path = public
      as $body$
        select user_id
        from public.stripe_connected_accounts
        where user_id = (select auth.uid())
      $body$
    $sql$;

    execute $sql$
      create or replace function public.get_current_property_owner_id()
      returns uuid
      language sql
      security definer
      stable
      set search_path = public
      as $body$
        select id
        from public.stripe_connected_accounts
        where user_id = (select auth.uid())
      $body$
    $sql$;
  end if;
end $$;

-- ============================================================
-- 3. fix storage.objects bulk-imports csv policies
--    before: (auth.uid())::text — bare call with cast
--    after:  ((select auth.uid()))::text — SELECT-wrapped then cast
-- ============================================================

-- drop the three existing policies (drop + create is required; ALTER POLICY cannot
-- change the qual/with_check expressions in postgres)
drop policy if exists "Allow owners to delete their own CSV files" on storage.objects;
drop policy if exists "Allow owners to read their own CSV files" on storage.objects;
drop policy if exists "Allow owners to upload CSV to their folder" on storage.objects;

-- recreate: owners can read their own csv files (select)
create policy "Allow owners to read their own CSV files"
on storage.objects
for select
to authenticated
using (
  (bucket_id = 'bulk-imports'::text)
  and ((storage.foldername(name))[1] = ((select auth.uid()))::text)
  and (get_current_user_type() = 'OWNER'::text)
);

-- recreate: owners can upload csv files to their folder (insert)
create policy "Allow owners to upload CSV to their folder"
on storage.objects
for insert
to authenticated
with check (
  (bucket_id = 'bulk-imports'::text)
  and ((storage.foldername(name))[1] = ((select auth.uid()))::text)
  and (storage.extension(name) = 'csv'::text)
  and (get_current_user_type() = 'OWNER'::text)
);

-- recreate: owners can delete their own csv files (delete)
create policy "Allow owners to delete their own CSV files"
on storage.objects
for delete
to authenticated
using (
  (bucket_id = 'bulk-imports'::text)
  and ((storage.foldername(name))[1] = ((select auth.uid()))::text)
  and (get_current_user_type() = 'OWNER'::text)
);
