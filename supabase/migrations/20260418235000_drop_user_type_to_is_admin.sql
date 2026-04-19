-- Landlord-only pivot: drop user_type column, replace with is_admin boolean.
-- After PR #596 there is no TENANT role; every authenticated user is an owner.
-- The only remaining distinction is ADMIN (for analytics RPCs).
-- Reading admin-ness from a DB column instead of JWT claims removes:
--   * custom_access_token_hook fragility (we've already had one drift bug)
--   * user_type_sync trigger and its failure modes
--   * restrict_user_type_change trigger
--   * /auth/select-role flow (no role to select — everyone's a landlord)

begin;

-- 1. Add is_admin column + backfill
alter table public.users add column is_admin boolean not null default false;
update public.users set is_admin = true where user_type = 'ADMIN';

-- 2. Rewrite is_admin() to read from public.users (no JWT dependency)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select is_admin from public.users where id = auth.uid()),
    false
  )
$$;

comment on function public.is_admin() is
  'Returns true if the current authenticated user has is_admin=true in public.users. Replaces JWT-claim approach.';

-- 3. Replace custom_access_token_hook with a no-op
-- GoTrue calls this on every login; dropping the function would break auth until
-- the dashboard registration is removed. Leaving a no-op is safe — disable the
-- hook in Supabase Dashboard → Authentication → Hooks after this ships.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return event;
end;
$$;

comment on function public.custom_access_token_hook(event jsonb) is
  'NO-OP. user_type was removed; admin check now reads public.users.is_admin. Disable in Auth > Hooks.';

-- 4. Drop sync + restriction triggers (they exist to protect user_type)
drop trigger if exists sync_user_type_trigger on public.users;
drop trigger if exists enforce_user_type_change on public.users;
drop function if exists public.sync_user_type_to_auth();
drop function if exists public.check_user_type_change();

-- 5. Simplify ensure_public_user_for_auth: no user_type logic
create or replace function public.ensure_public_user_for_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_email text;
  resolved_full_name text;
begin
  resolved_email := coalesce(nullif(new.email, ''), new.raw_user_meta_data ->> 'email', 'unknown@example.com');
  resolved_full_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    resolved_email,
    'Unknown User'
  );

  insert into public.users as u (id, email, full_name)
  values (new.id, resolved_email, resolved_full_name)
  on conflict (id) do update
    set email = coalesce(excluded.email, u.email),
        full_name = coalesce(nullif(excluded.full_name, ''), u.full_name),
        updated_at = now();

  return new;
end;
$$;

-- 6. Rewrite storage CSV policies (no user_type gate) + drop get_current_user_type
drop policy if exists "Allow owners to read their own CSV files" on storage.objects;
drop policy if exists "Allow owners to upload CSV to their folder" on storage.objects;
drop policy if exists "Allow owners to delete their own CSV files" on storage.objects;

create policy "Allow authenticated users to read their own CSV files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'bulk-imports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Allow authenticated users to upload CSV to their folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'bulk-imports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and storage.extension(name) = 'csv'
  );

create policy "Allow authenticated users to delete their own CSV files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'bulk-imports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop function if exists public.get_current_user_type();

-- 7. Simplify anonymize_deleted_user to owner-only path
create or replace function public.anonymize_deleted_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_has_active_leases boolean;
begin
  if not exists (select 1 from public.users where id = p_user_id) then
    raise exception 'user % not found', p_user_id;
  end if;

  select exists(
    select 1 from public.leases
    where owner_user_id = p_user_id and lease_status = 'active'
  ) into v_has_active_leases;

  if v_has_active_leases then
    raise exception 'Cannot delete account with active leases. Please end all leases first.';
  end if;

  update public.properties set status = 'inactive' where owner_user_id = p_user_id;
  update public.activity set description = '[deleted user activity]' where user_id = p_user_id;
  delete from public.notifications where user_id = p_user_id;
  delete from public.user_preferences where user_id = p_user_id;
  delete from public.notification_settings where user_id = p_user_id;

  update public.users
  set full_name = '[deleted user]',
      email = '[deleted-' || p_user_id::text || ']',
      first_name = null,
      last_name = null,
      phone = null,
      avatar_url = null,
      status = 'inactive'
  where id = p_user_id;
end;
$function$;

-- 8. Drop backfill_funnel_events (references dropped tables: rent_payments, tenant_invitations)
drop function if exists public.backfill_funnel_events();

-- 9. Simplify get_user_profile to owner-only
create or replace function public.get_user_profile(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_result jsonb;
begin
  if p_user_id != (select auth.uid()) then
    raise exception 'Access denied: cannot request data for another user';
  end if;

  select jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'first_name', u.first_name,
    'last_name', u.last_name,
    'full_name', u.full_name,
    'phone', u.phone,
    'avatar_url', u.avatar_url,
    'is_admin', u.is_admin,
    'status', u.status,
    'created_at', u.created_at,
    'updated_at', u.updated_at,
    'owner_profile', jsonb_build_object(
      'stripe_connected', false,
      'properties_count', (
        select count(*) from public.properties pr
        where pr.owner_user_id = p_user_id
      ),
      'units_count', (
        select count(*) from public.units un
        join public.properties pr on pr.id = un.property_id
        where pr.owner_user_id = p_user_id
      )
    )
  ) into v_result
  from public.users u
  where u.id = p_user_id;

  return v_result;
end;
$function$;

-- 10. Drop user_type column
alter table public.users drop column user_type;

-- 11. Clean up auth.users.raw_app_meta_data: remove user_type key
update auth.users
set raw_app_meta_data = raw_app_meta_data - 'user_type'
where raw_app_meta_data ? 'user_type';

-- 12. Drop user_type from audit-log tables (auxiliary context, not read anywhere)
alter table public.security_events drop column user_type;
alter table public.security_events_archive drop column user_type;

commit;
