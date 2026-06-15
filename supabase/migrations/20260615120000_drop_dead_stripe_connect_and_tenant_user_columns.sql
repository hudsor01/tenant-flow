-- v6.0 Phase 18 — drop dead Stripe-Connect DB remnants + orphan rent-webhook config.
--
-- ⚠ LOCKSTEP: apply this ONLY AFTER the code that stops selecting
-- properties.stripe_connected_account_id (PROPERTY_SELECT_COLUMNS, same PR) is
-- deployed to prod. Dropping the column while the deployed code still requests it
-- would 400 every property list/detail query. After applying, run `bun run db:types`
-- to regenerate src/types/supabase.ts and remove the now-stale column from fixtures.
--
-- Safety (verified against prod via MCP, Phase 17/18):
--   • properties.stripe_connected_account_id: uuid, 0 non-null rows, NO view/index/FK
--     dependency, no RPC reader; the 2026-04-18 demolish migration dropped the leases
--     twin but missed this one.
--   • tenants.user_id is NOT dropped here (LEGACY-TENANT-06 deferred): it has 0
--     SQL readers + 0 populated rows, BUT the frontend tenant query layer still
--     reads it live — TENANT_BASE_SELECT lists user_id, TENANT_WITH_LEASE_SELECT
--     uses the users!tenants_user_id_fkey embed, and the notification lookup
--     selects it (src/hooks/api/query-keys/tenant-keys.ts). Dropping it would 400
--     every tenant query. Deferred until that query layer is refactored off the
--     user_id FK (review #847 caught this; the Phase-17 "0 readers" check was
--     DB-side only).
--   • app_config rows: orphan webhook URLs for the already-dropped
--     notify_n8n_rent_payment() / queue_payment_reminders() jobs.
--   • get_user_profile(): hardcodes 'stripe_connected', false (no column dependency);
--     the key is dropped, properties_count/units_count are kept.

alter table public.properties drop column if exists stripe_connected_account_id;

delete from public.app_config
where key in ('n8n.webhook.rent_payment_url', 'n8n.webhook.payment_reminder_url');

-- Rebuild get_user_profile without the dead Stripe-Connect key (keep the
-- properties_count / units_count owner_profile stats).
create or replace function public.get_user_profile(p_user_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
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
