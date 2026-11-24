-- Bring public.reports in the migration chain to its production shape.
--
-- Production renamed reports.property_owner_id to owner_user_id outside the
-- migrations: the column, its index, a foreign key to public.users, and four
-- owner policies on get_current_owner_user_id(). A database built from the
-- chain still has property_owner_id (whose property_owners table is long
-- gone), so the signup trigger's guard on reports.owner_user_id
-- (20261124215838) failed at runtime there and every signup errored.
--
-- Production already has owner_user_id, so this does nothing there.

do $$
declare
  v_policy text;
begin
  if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'reports' and column_name = 'owner_user_id')
    or not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'reports' and column_name = 'property_owner_id')
  then
    return;
  end if;

  alter table public.reports drop constraint if exists reports_property_owner_id_fkey;
  alter table public.reports rename column property_owner_id to owner_user_id;
  alter index if exists public.idx_reports_property_owner_id rename to idx_reports_owner_user_id;
  alter table public.reports
    add constraint reports_owner_user_id_fkey
    foreign key (owner_user_id) references public.users (id) on delete cascade;

  for v_policy in
    select policyname from pg_policies where schemaname = 'public' and tablename = 'reports'
  loop
    execute format('drop policy %I on public.reports', v_policy);
  end loop;

  create policy reports_select_owner on public.reports
    for select to authenticated
    using (owner_user_id = public.get_current_owner_user_id());
  create policy reports_insert_owner on public.reports
    for insert to authenticated
    with check (owner_user_id = public.get_current_owner_user_id());
  create policy reports_update_owner on public.reports
    for update to authenticated
    using (owner_user_id = public.get_current_owner_user_id())
    with check (owner_user_id = public.get_current_owner_user_id());
  create policy reports_delete_owner on public.reports
    for delete to authenticated
    using (owner_user_id = public.get_current_owner_user_id());
end;
$$;
