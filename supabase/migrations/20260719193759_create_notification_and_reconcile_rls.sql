-- create_notification write-path RPC + composite inbox index + notifications RLS reconcile.
--
-- Establishes the single, un-bypassable system insert point for the notification
-- center (NOTIF-01). Every later v10.0 phase (triggers, lease/maintenance events,
-- cron) publishes notifications through this one RPC.
--
-- This migration:
--   1. create_notification(...) - SECURITY DEFINER, service_role-only (mirrors
--      record_lease_signature). Runs from trigger/cron contexts, so it does NOT
--      gate on auth.uid(), does NOT consult notification_settings (D-05: in-app
--      notifications are always created), and is NEVER grantable to authenticated
--      (that would let any owner mint notifications for any other owner).
--   2. Composite index (user_id, is_read, created_at desc) - serves both the
--      unread HEAD count and the bounded inbox list.
--   3. Reconciles the notifications RLS to the canonical owner-scoped 3-policy
--      set. Prod currently has only notifications_select + notifications_update
--      (the richer repo policy set was never applied), so every legacy policy
--      name is dropped-if-exists and the canonical set recreated. There is no
--      authenticated INSERT/DELETE policy - writes go through create_notification
--      / triggers only.

-- ============================================================================
-- 1. create_notification - system write-path RPC (service_role / trigger only).
-- ============================================================================
create or replace function public.create_notification(
  p_user_id     uuid,
  p_type        text,
  p_title       text,
  p_message     text default null,
  p_entity_type text default null,
  p_entity_id   uuid default null,
  p_action_url  text default null
)
  returns uuid
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  v_id uuid;
begin
  insert into public.notifications (
    user_id,
    notification_type,
    title,
    message,
    entity_type,
    entity_id,
    action_url
  )
  values (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_entity_type,
    p_entity_id,
    p_action_url
  )
  returning id into v_id;

  return v_id;
end;
$function$;

revoke all on function public.create_notification(uuid, text, text, text, text, uuid, text) from public;
grant execute on function public.create_notification(uuid, text, text, text, text, uuid, text) to service_role;

-- ============================================================================
-- 2. Composite inbox index - unread HEAD count + bounded inbox list.
-- ============================================================================
create index if not exists notifications_user_unread_created_idx
  on public.notifications (user_id, is_read, created_at desc);

-- ============================================================================
-- 3. RLS reconcile - idempotent. Drop every legacy policy name, recreate the
--    canonical owner-scoped set (prod has only select + update today).
-- ============================================================================
alter table public.notifications enable row level security;

drop policy if exists notifications_select on public.notifications;
drop policy if exists notifications_select_own on public.notifications;
drop policy if exists notifications_update on public.notifications;
drop policy if exists notifications_update_own on public.notifications;
drop policy if exists notifications_insert_own on public.notifications;
drop policy if exists notifications_delete_own on public.notifications;
drop policy if exists notifications_service_role on public.notifications;

create policy notifications_select
  on public.notifications
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy notifications_update
  on public.notifications
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy notifications_service_role
  on public.notifications
  for all
  to service_role
  using (true)
  with check (true);
