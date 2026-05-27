-- migration: stabilize_tenant_invitations
-- purpose: fix 4 data integrity issues on tenant_invitations table
-- affected: tenant_invitations (RLS policies, CHECK data, unique index, column default, stale index)
-- requirements: DB-01, DB-02, DB-03, DB-04
-- decisions: D-01, D-02, D-03, D-04, D-05, D-07
--
-- 2026-05-27 update (Phase 4 cycle-2): wrap the entire migration body in
-- a guard that no-ops if `tenant_invitations.owner_user_id` is missing.
-- The column was added to prod via an out-of-band manual operation
-- between base_schema (20251101000000, which has `property_owner_id`)
-- and this migration's authoring date (2026-03-30). Supabase Preview
-- replays the chain from base_schema and finds no `owner_user_id`
-- column when this migration runs, so the policies + index it creates
-- fail with SQLSTATE 42703.
--
-- A later migration -- 20260418140000_demolish_rent_and_tenant_portal --
-- DROPS the entire tenant_invitations table. So on chain replay the
-- stabilize work is moot: skipping it cleanly leaves the table in the
-- same final state (dropped) as the un-skipped run did on prod.
--
-- Prod is unaffected (already-applied; schema_migrations tracks by
-- version not content). The guard is a single `do $$ if column_exists $$`
-- block executing the original DDL via EXECUTE so the chain replay
-- short-circuits cleanly.

do $$
declare
  v_column_exists boolean;
  cancelled_row record;
  cancelled_count integer := 0;
begin
  -- Guard: skip the entire migration body if owner_user_id doesn't exist
  -- on the live schema. On chain replay (no out-of-band rename), the
  -- column never appears between base_schema and this point, so the
  -- guard short-circuits. On prod (where the column was added out-of-
  -- band), the guard passes and the original body runs.
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tenant_invitations'
      and column_name = 'owner_user_id'
  ) into v_column_exists;

  if not v_column_exists then
    raise notice 'stabilize_tenant_invitations: skipping (owner_user_id not present -- this run is the chain-replay path; table is dropped by a later migration).';
    return;
  end if;

  -- ==========================================================================
  -- step 1: backfill bad type values (DB-01, per D-07)
  -- the CHECK constraint tenant_invitations_type_check only allows
  -- 'platform_access' and 'lease_signing'. rows inserted by
  -- invite-tenant-form.tsx contained a typo ('portal_access') which
  -- violates the CHECK constraint. fix these rows BEFORE any unique
  -- index creation to ensure clean data.
  -- ==========================================================================
  update public.tenant_invitations
  set type = 'platform_access'
  where type = 'portal_access';

  -- ==========================================================================
  -- step 2: fix RLS policies (DB-02, per D-04)
  -- all authenticated policies currently reference the stale column name
  -- 'property_owner_id'. the live column is 'owner_user_id' (confirmed
  -- by generated types in src/types/supabase.ts). we use (select auth.uid())
  -- directly rather than get_current_owner_user_id() because owner_user_id
  -- stores the user's UUID (FK to users.id) -- no lookup through
  -- stripe_connected_accounts is needed.
  -- ==========================================================================
  execute $sql$drop policy if exists "tenant_invitations_select" on public.tenant_invitations$sql$;
  execute $sql$drop policy if exists "tenant_invitations_select_owner" on public.tenant_invitations$sql$;
  execute $sql$drop policy if exists "tenant_invitations_insert_owner" on public.tenant_invitations$sql$;
  execute $sql$drop policy if exists "tenant_invitations_update_owner" on public.tenant_invitations$sql$;
  execute $sql$drop policy if exists "tenant_invitations_delete_owner" on public.tenant_invitations$sql$;

  -- SELECT: consolidated owner + invitee policy (per Pitfall 5 in research).
  -- the owner sees their own invitations via owner_user_id match.
  -- the invitee sees invitations sent to their email via auth.email() match.
  execute $sql$
    create policy "tenant_invitations_select"
    on public.tenant_invitations
    for select
    to authenticated
    using (
      owner_user_id = (select auth.uid())
      or email = (select auth.email())
    )
  $sql$;

  -- INSERT: only the owner (authenticated user) can create invitations.
  execute $sql$
    create policy "tenant_invitations_insert"
    on public.tenant_invitations
    for insert
    to authenticated
    with check (owner_user_id = (select auth.uid()))
  $sql$;

  -- UPDATE: only the owner can update their invitations.
  execute $sql$
    create policy "tenant_invitations_update"
    on public.tenant_invitations
    for update
    to authenticated
    using (owner_user_id = (select auth.uid()))
    with check (owner_user_id = (select auth.uid()))
  $sql$;

  -- DELETE: only the owner can delete their invitations.
  execute $sql$
    create policy "tenant_invitations_delete"
    on public.tenant_invitations
    for delete
    to authenticated
    using (owner_user_id = (select auth.uid()))
  $sql$;

  -- ==========================================================================
  -- step 3: cancel duplicate active invitations + add unique index
  -- ==========================================================================
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

  execute $sql$
    create unique index if not exists idx_tenant_invitations_active_email_owner
    on public.tenant_invitations (email, owner_user_id)
    where status in ('pending', 'sent')
  $sql$;

  -- ==========================================================================
  -- step 4: add server-side expiry default (DB-04, per D-05)
  -- ==========================================================================
  execute $sql$
    alter table public.tenant_invitations
    alter column expires_at set default now() + interval '7 days'
  $sql$;

  -- ==========================================================================
  -- step 5: fix stale index name
  -- ==========================================================================
  execute $sql$drop index if exists public.idx_tenant_invitations_property_owner_id$sql$;
  execute $sql$
    create index if not exists idx_tenant_invitations_owner_user_id
    on public.tenant_invitations (owner_user_id)
  $sql$;
end $$;
