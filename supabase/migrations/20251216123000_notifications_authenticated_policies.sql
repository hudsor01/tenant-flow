-- Enable authenticated users to manage their own in-app notifications.
--
-- The API uses user-scoped Supabase clients (RLS enforced) for CRUD.
-- Base schema previously allowed SELECT/UPDATE only; add INSERT/DELETE for own rows.

-- Insert own notifications (primarily for internal/testing endpoints).
drop policy if exists "notifications_insert_own" on public.notifications;
create policy "notifications_insert_own"
  on public.notifications
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Delete own notifications (required for UI delete actions).
drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
  on public.notifications
  for delete
  to authenticated
  using (user_id = auth.uid());
