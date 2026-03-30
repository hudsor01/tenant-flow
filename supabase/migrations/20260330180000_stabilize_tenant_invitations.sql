-- migration: stabilize_tenant_invitations
-- purpose: fix 4 data integrity issues on tenant_invitations table
-- affected: tenant_invitations (RLS policies, CHECK data, unique index, column default, stale index)
-- requirements: DB-01, DB-02, DB-03, DB-04
-- decisions: D-01, D-02, D-03, D-04, D-05, D-07

-- ============================================================================
-- step 1: backfill bad type values (DB-01, per D-07)
-- ============================================================================
-- the CHECK constraint tenant_invitations_type_check only allows
-- 'platform_access' and 'lease_signing'. rows inserted by
-- invite-tenant-form.tsx contained a typo ('portal_access') which
-- violates the CHECK constraint. fix these rows BEFORE any unique
-- index creation to ensure clean data.

update public.tenant_invitations
set type = 'platform_access'
where type = 'portal_access';

-- ============================================================================
-- step 2: fix RLS policies (DB-02, per D-04)
-- ============================================================================
-- all authenticated policies currently reference the stale column name
-- 'property_owner_id'. the live column is 'owner_user_id' (confirmed
-- by generated types in src/types/supabase.ts). we use (select auth.uid())
-- directly rather than get_current_owner_user_id() because owner_user_id
-- stores the user's UUID (FK to users.id) -- no lookup through
-- stripe_connected_accounts is needed.

-- drop all stale policies (some may not exist; using if exists for safety)
-- these policies reference the renamed column property_owner_id and are
-- therefore silently evaluating to FALSE for all rows, breaking all
-- authenticated PostgREST operations on this table.
drop policy if exists "tenant_invitations_select" on public.tenant_invitations;
drop policy if exists "tenant_invitations_select_owner" on public.tenant_invitations;
drop policy if exists "tenant_invitations_insert_owner" on public.tenant_invitations;
drop policy if exists "tenant_invitations_update_owner" on public.tenant_invitations;
drop policy if exists "tenant_invitations_delete_owner" on public.tenant_invitations;

-- SELECT: consolidated owner + invitee policy (per Pitfall 5 in research).
-- the owner sees their own invitations via owner_user_id match.
-- the invitee sees invitations sent to their email via auth.email() match.
-- this supports the invitation accept flow where the invitee needs to
-- view their pending invitation before accepting it.
create policy "tenant_invitations_select"
on public.tenant_invitations
for select
to authenticated
using (
  owner_user_id = (select auth.uid())
  or email = (select auth.email())
);

-- INSERT: only the owner (authenticated user) can create invitations.
-- owner_user_id must match the inserting user's auth UID.
create policy "tenant_invitations_insert"
on public.tenant_invitations
for insert
to authenticated
with check (owner_user_id = (select auth.uid()));

-- UPDATE: only the owner can update their invitations.
-- both USING and WITH CHECK required per RLS skill rules for UPDATE.
-- prevents an owner from reassigning invitations to another owner.
create policy "tenant_invitations_update"
on public.tenant_invitations
for update
to authenticated
using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

-- DELETE: only the owner can delete their invitations.
create policy "tenant_invitations_delete"
on public.tenant_invitations
for delete
to authenticated
using (owner_user_id = (select auth.uid()));

-- ============================================================================
-- step 3: cancel duplicate active invitations + add unique index (DB-03, per D-01, D-02)
-- ============================================================================
-- for each (email, owner_user_id) pair with multiple pending/sent rows,
-- keep only the newest invitation (by created_at) and cancel the rest.
-- cancelled invitation IDs are logged via RAISE NOTICE for audit trail
-- in the migration output (per D-02).

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

-- add partial unique index to prevent future duplicate active invitations.
-- only enforced for pending/sent rows -- cancelled, accepted, and expired
-- rows are excluded so the same email+owner can have historical records.
create unique index if not exists idx_tenant_invitations_active_email_owner
on public.tenant_invitations (email, owner_user_id)
where status in ('pending', 'sent');

-- ============================================================================
-- step 4: add server-side expiry default (DB-04, per D-05)
-- ============================================================================
-- server-side default eliminates client clock skew. client code should
-- omit expires_at on INSERT; the DB will set it to 7 days from now.
-- note: DEFAULT only applies to INSERT operations. UPDATE (resend)
-- still requires an explicit expires_at value since DEFAULT does not
-- apply to UPDATE statements.

alter table public.tenant_invitations
alter column expires_at set default now() + interval '7 days';

-- ============================================================================
-- step 5: fix stale index name
-- ============================================================================
-- the column was renamed from property_owner_id to owner_user_id but
-- the index name was never updated. postgresql tracks indexes by column
-- OID so the index still functions correctly, but the name is misleading
-- for maintainability. drop the stale-named index and recreate with the
-- correct name.

drop index if exists public.idx_tenant_invitations_property_owner_id;

create index if not exists idx_tenant_invitations_owner_user_id
on public.tenant_invitations (owner_user_id);
