-- migration: stabilize_tenant_invitations
-- purpose: fix 4 data integrity issues on tenant_invitations table
-- affected: tenant_invitations (RLS policies, CHECK data, unique index, column default, stale index)
-- requirements: DB-01, DB-02, DB-03, DB-04
-- decisions: D-01, D-02, D-03, D-04, D-05, D-07
-- note: applied directly via Supabase dashboard 2026-03-30 21:43 UTC; this file
-- captures the production state for migration-history parity. Idempotent with
-- 20260330180000_stabilize_tenant_invitations.sql (DROP IF EXISTS / CREATE IF NOT EXISTS).

-- step 1: backfill bad type values (DB-01, per D-07)
update public.tenant_invitations
set type = 'platform_access'
where type = 'portal_access';

-- step 2: fix RLS policies (DB-02, per D-04)
drop policy if exists "tenant_invitations_select" on public.tenant_invitations;
drop policy if exists "tenant_invitations_select_owner" on public.tenant_invitations;
drop policy if exists "tenant_invitations_insert_owner" on public.tenant_invitations;
drop policy if exists "tenant_invitations_update_owner" on public.tenant_invitations;
drop policy if exists "tenant_invitations_delete_owner" on public.tenant_invitations;

create policy "tenant_invitations_select"
on public.tenant_invitations
for select
to authenticated
using (
  owner_user_id = (select auth.uid())
  or email = (select auth.email())
);

create policy "tenant_invitations_insert"
on public.tenant_invitations
for insert
to authenticated
with check (owner_user_id = (select auth.uid()));

create policy "tenant_invitations_update"
on public.tenant_invitations
for update
to authenticated
using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

create policy "tenant_invitations_delete"
on public.tenant_invitations
for delete
to authenticated
using (owner_user_id = (select auth.uid()));

-- step 3: cancel duplicate active invitations + add unique index (DB-03)
do $$
declare
  cancelled_row record;
  cancelled_count integer := 0;
begin
  for cancelled_row in
    with ranked as (
      select id, email, owner_user_id,
             row_number() over (
               partition by email, owner_user_id
               order by created_at desc
             ) as rn
      from public.tenant_invitations
      where status in ('pending', 'sent')
    )
    update public.tenant_invitations ti
    set status = 'cancelled'
    from ranked r
    where ti.id = r.id
      and r.rn > 1
    returning ti.id, ti.email, ti.owner_user_id
  loop
    raise notice 'Cancelled duplicate invitation: id=%, email=%, owner=%',
      cancelled_row.id, cancelled_row.email, cancelled_row.owner_user_id;
    cancelled_count := cancelled_count + 1;
  end loop;

  raise notice 'Total duplicate invitations cancelled: %', cancelled_count;
end $$;

create unique index if not exists idx_tenant_invitations_active_email_owner
on public.tenant_invitations (email, owner_user_id)
where status in ('pending', 'sent');

-- step 4: add server-side expiry default (DB-04)
alter table public.tenant_invitations
alter column expires_at set default now() + interval '7 days';

-- step 5: fix stale index name
drop index if exists public.idx_tenant_invitations_property_owner_id;

create index if not exists idx_tenant_invitations_owner_user_id
on public.tenant_invitations (owner_user_id);
