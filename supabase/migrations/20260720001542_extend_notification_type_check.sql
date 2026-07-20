-- HOTFIX (Phase 52 review C6, critical): the notifications_notification_type_check
-- CHECK constraint (base schema) allowed only ('maintenance','lease','payment','system').
-- The Phase 52 event triggers (20260719200224) write the 5-type contract values,
-- which violated the constraint INSIDE the AFTER triggers and aborted the parent
-- statement - breaking maintenance creation and lease signing/activation in prod
-- until this hotfix. Extends the allowed set to the new contract values while
-- keeping legacy values for existing rows. Text + CHECK per project convention.
--
-- Applied to prod via MCP 2026-07-20 and probe-verified end-to-end (maintenance
-- INSERT fires trg_notify_owner_maintenance and commits cleanly).

alter table public.notifications
  drop constraint if exists notifications_notification_type_check;

alter table public.notifications
  add constraint notifications_notification_type_check
  check (notification_type = any (array[
    'maintenance'::text,
    'lease'::text,
    'payment'::text,
    'system'::text,
    'lease_signed'::text,
    'lease_executed'::text,
    'lease_finalize_failed'::text,
    'maintenance_created'::text,
    'maintenance_status'::text
  ]));
