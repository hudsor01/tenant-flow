-- Phase 52 perfect-PR streak-cycle fixes (DB): C1, C2, C3, C11.
--
-- C1: notifications_archive was created via LIKE ... INCLUDING ALL, copying the
--   old 4-value notification_type CHECK. The 20260720001542 hotfix extended the
--   live table's CHECK only, so the first new-type row to age out would violate
--   the archive's copy and abort the nightly cleanup entirely. The archive is
--   service_role-only cold storage validated at source - drop its copied CHECK.
-- C2: the GDPR cascade (anonymize_deleted_user) deletes live notifications but
--   never touched notifications_archive, leaving deleted users' notification
--   titles/messages in the archive indefinitely. Add the archive delete.
--   (Redefined from the live prod definition, single line added.)
-- C11: expire_leases() still direct-inserted into notifications, violating the
--   NOTIF-01 single-writer invariant. Route it through create_notification
--   (same type/title/message; gains an app-relative action_url).
--   (Redefined from the live prod definition.)
-- C3: the 6 new SECURITY DEFINER trigger functions kept default PUBLIC EXECUTE,
--   regressing the pass-3 revoke convention (20260602044104). Revoke.
--
-- Applied to prod via MCP 2026-07-20 and introspection-verified (archive checks 0,
-- gdpr cascade covers archive, expire_leases single-writer, trigger fn ACLs set).

alter table public.notifications_archive
  drop constraint if exists notifications_notification_type_check;

create or replace function public.anonymize_deleted_user(p_user_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
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
  delete from public.notifications_archive where user_id = p_user_id;
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

create or replace function public.expire_leases()
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_lease record;
  v_expired_count integer := 0;
begin
  for v_lease in
    select id, owner_user_id
    from public.leases
    where lease_status = 'active'
      and end_date < current_date
    for update skip locked
  loop
    -- update lease status to expired
    update public.leases
    set lease_status = 'expired', updated_at = now()
    where id = v_lease.id;

    -- single-writer invariant (NOTIF-01): notification via create_notification
    perform public.create_notification(
      v_lease.owner_user_id,
      'lease',
      'Lease Expired',
      'A lease has expired and needs attention.',
      'lease',
      v_lease.id,
      '/leases/' || v_lease.id::text
    );

    v_expired_count := v_expired_count + 1;
  end loop;

  raise notice 'expire_leases: expired % leases', v_expired_count;
end;
$function$;

revoke all on function public.notify_owner_lease_esign() from public, anon, authenticated;
revoke all on function public.notify_owner_maintenance() from public, anon, authenticated;
revoke all on function public.log_property_created_activity() from public, anon, authenticated;
revoke all on function public.log_lease_created_activity() from public, anon, authenticated;
revoke all on function public.log_document_created_activity() from public, anon, authenticated;
revoke all on function public.log_maintenance_created_activity() from public, anon, authenticated;
