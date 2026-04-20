-- Phase 47: Restore RLS policies dropped by the landlord-only pivot (PR #596).
-- The pivot removed helper functions (get_current_tenant_id, get_tenant_accessible_lease_ids)
-- but no replacement policies were created for the authenticated role. Result:
-- leases / maintenance_requests / notifications had RLS enabled with ZERO policies,
-- meaning authenticated landlords could not read their own data in prod.
--
-- Integration tests passed trivially because they used `data.forEach(...)` over
-- empty arrays — empty = zero iterations = zero assertion failures. Test pattern
-- is being fixed in the same milestone (REQ-47-04) to require at least one row.
--
-- Pattern mirrors `public.properties`: one policy per operation per role,
-- authenticated only, `owner_user_id = (select auth.uid())` or the
-- `get_current_owner_user_id()` SECURITY DEFINER wrapper.

begin;

-- ============================================================================
-- leases
-- ============================================================================
drop policy if exists leases_select on public.leases;
drop policy if exists leases_insert_owner on public.leases;
drop policy if exists leases_update_owner on public.leases;
drop policy if exists leases_delete_owner on public.leases;

create policy leases_select on public.leases
  for select to authenticated
  using (owner_user_id = (select auth.uid()));

create policy leases_insert_owner on public.leases
  for insert to authenticated
  with check (owner_user_id = (select public.get_current_owner_user_id()));

create policy leases_update_owner on public.leases
  for update to authenticated
  using (owner_user_id = (select public.get_current_owner_user_id()))
  with check (owner_user_id = (select public.get_current_owner_user_id()));

create policy leases_delete_owner on public.leases
  for delete to authenticated
  using (owner_user_id = (select public.get_current_owner_user_id()));

-- ============================================================================
-- maintenance_requests
-- ============================================================================
drop policy if exists maintenance_requests_select on public.maintenance_requests;
drop policy if exists maintenance_requests_insert_owner on public.maintenance_requests;
drop policy if exists maintenance_requests_update_owner on public.maintenance_requests;
drop policy if exists maintenance_requests_delete_owner on public.maintenance_requests;

create policy maintenance_requests_select on public.maintenance_requests
  for select to authenticated
  using (owner_user_id = (select auth.uid()));

create policy maintenance_requests_insert_owner on public.maintenance_requests
  for insert to authenticated
  with check (owner_user_id = (select public.get_current_owner_user_id()));

create policy maintenance_requests_update_owner on public.maintenance_requests
  for update to authenticated
  using (owner_user_id = (select public.get_current_owner_user_id()))
  with check (owner_user_id = (select public.get_current_owner_user_id()));

create policy maintenance_requests_delete_owner on public.maintenance_requests
  for delete to authenticated
  using (owner_user_id = (select public.get_current_owner_user_id()));

-- ============================================================================
-- notifications — keyed by user_id (the recipient), not owner_user_id
-- ============================================================================
drop policy if exists notifications_select on public.notifications;
drop policy if exists notifications_update on public.notifications;

create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Allow marking own notifications read. No insert/delete policy — notifications
-- are created by service-role triggers / Edge Functions only.
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

commit;
