-- Notification + activity event triggers (NOTIF-04, ACT-01 write-path; D-04, D-08).
--
-- Wires the D-04 launch event set through the create_notification write-path
-- (20260719193759_create_notification_and_reconcile_rls.sql) and populates the
-- activity audit trail so the ACT-01 dashboard timeline is non-empty.
--
--   Notification events (attention surface — D-04):
--     • leases:              tenant signed -> lease_signed  ("Tenant signed the lease")
--                            lease activated -> lease_executed ("Lease fully executed")
--     • maintenance_requests: created -> maintenance_created ("New maintenance request")
--                            status changed -> maintenance_status ("Maintenance status changed")
--   Activity events (audit surface, incl. the owner's own actions — D-08):
--     • properties created, leases created, documents uploaded, maintenance created
--
-- CRUD edits are explicitly NOT notifications (D-04); they are activity-only,
-- and this phase only writes the four create events into activity (edits are out
-- of scope). Notification title strings are LOAD-BEARING — they are baked here and
-- must match 52-UI-SPEC.md Copywriting Contract exactly so DB copy and UI copy
-- never diverge.
--
-- Every trigger function is SECURITY DEFINER with a locked search_path. The
-- functions run as their owner (the migration role), which retains EXECUTE on the
-- service_role-only create_notification RPC, so `perform public.create_notification`
-- succeeds from the trigger context (never granted to authenticated). Every
-- action_url is app-relative (`/leases/...`, `/maintenance/...`) — never an
-- external URL (T-52-05 open-redirect guard at the write source).
--
-- Mirrors: log_lease_signature_activity (20260616161248), the lease->active
-- transition guard log_security_event_lease_signed (20260617142623), and the
-- notify_n8n_maintenance tg_op INSERT/UPDATE status-change guard (20260222130000).

-- ============================================================================
-- 1. notify_owner_lease_esign — e-sign lifecycle notifications on leases.
--    Fires on the signature (null -> not-null) and activation (-> active)
--    transitions. Both branches can fire in a single UPDATE (tenant signature
--    that also flips the lease to active), producing the two distinct events.
-- ============================================================================
create or replace function public.notify_owner_lease_esign()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  -- Tenant signed the lease (tenant_signed_at null -> not null).
  if new.tenant_signed_at is not null
     and (old is null or old.tenant_signed_at is null) then
    perform public.create_notification(
      new.owner_user_id,
      'lease_signed',
      'Tenant signed the lease',
      null,
      'lease',
      new.id,
      '/leases/' || new.id::text
    );
  end if;

  -- Lease fully executed (lease_status -> active, regardless of signing path).
  if new.lease_status = 'active'
     and old.lease_status is distinct from 'active' then
    perform public.create_notification(
      new.owner_user_id,
      'lease_executed',
      'Lease fully executed',
      null,
      'lease',
      new.id,
      '/leases/' || new.id::text
    );
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_notify_owner_lease_esign on public.leases;
create trigger trg_notify_owner_lease_esign
  after update on public.leases
  for each row
  execute function public.notify_owner_lease_esign();

-- ============================================================================
-- 2. notify_owner_maintenance — maintenance created / status-changed events.
--    INSERT -> maintenance_created; UPDATE -> maintenance_status ONLY when the
--    status column actually changed (no notification spam on unrelated edits,
--    T-52-07). tg_op gates access to old.status (old is null on INSERT).
-- ============================================================================
create or replace function public.notify_owner_maintenance()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  if tg_op = 'INSERT' then
    perform public.create_notification(
      new.owner_user_id,
      'maintenance_created',
      'New maintenance request',
      new.title,
      'maintenance_request',
      new.id,
      '/maintenance/' || new.id::text
    );
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform public.create_notification(
      new.owner_user_id,
      'maintenance_status',
      'Maintenance status changed',
      coalesce(new.title, '') || ' -> ' || new.status,
      'maintenance_request',
      new.id,
      '/maintenance/' || new.id::text
    );
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_notify_owner_maintenance on public.maintenance_requests;
create trigger trg_notify_owner_maintenance
  after insert or update on public.maintenance_requests
  for each row
  execute function public.notify_owner_maintenance();
