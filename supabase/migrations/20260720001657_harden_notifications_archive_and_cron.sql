-- Phase 52 review fixes C1/C4, C5, C7 (perfect-PR cycle 1).
--
-- C1/C4: notifications_archive inherited SELECT/INSERT/UPDATE/DELETE grants for
--   authenticated (and anon) from the schema default privileges. Rows were always
--   RLS-protected, but the stated posture is service_role-only and the RLS test
--   asserts a hard permission error. Revoke the table grants outright.
-- C5: the notifications_service_role policy used FOR ALL on an authenticated
--   table, violating the one-policy-per-operation-per-role rule. Replace with
--   four per-operation service_role policies.
-- C7: cleanup-notifications was scheduled at 3:45, colliding with
--   process-account-deletions (same table: account deletion deletes notification
--   rows). Move to the free 3:50 slot (cron.schedule upserts by jobname).
--
-- Applied to prod via MCP 2026-07-20 and introspection-verified (grants null,
-- 6-policy set, cron @ 50 3 * * *).

revoke all on table public.notifications_archive from authenticated;
revoke all on table public.notifications_archive from anon;

drop policy if exists notifications_service_role on public.notifications;

create policy notifications_service_role_select
  on public.notifications for select to service_role using (true);

create policy notifications_service_role_insert
  on public.notifications for insert to service_role with check (true);

create policy notifications_service_role_update
  on public.notifications for update to service_role using (true) with check (true);

create policy notifications_service_role_delete
  on public.notifications for delete to service_role using (true);

select cron.schedule(
  'cleanup-notifications',
  '50 3 * * *',
  $$select public.cleanup_old_notifications()$$
);
