-- v6.0 LEGACY-TENANT-06 — drop the dead tenants.user_id column + all its dependents.
--
-- Landlord-managed tenants are records, never auth users (CLAUDE.md). The
-- user_id FK to public.users is a pre-pivot tenant-portal/tenant-auth remnant:
-- 0 of 3 prod rows populated, never written by the app.
--
-- ⚠ LOCKSTEP: apply this ONLY AFTER the code that stops reading tenants.user_id
-- is deployed to prod (same PR — chore/v6.0-canonical-followups). That PR
-- removes every live reader: the frontend tenant/lease query layer (tenant-keys,
-- tenant-mappers, tenant-mutation-options, lease-keys, the lease wizard) AND the
-- docuseal edge function (handler.ts send-for-signature now reads the tenant's
-- own first_name/last_name/name/email instead of the users!tenants_user_id_fkey
-- embed — that function MUST be redeployed before this migration is applied).
-- After applying, run `bun run db:types` to regenerate src/types/supabase.ts and
-- strip the now-orphaned user_id from the manual mappers/types/fixtures (the
-- generated Tenant = Tables<"tenants"> still carries user_id until that regen).
--
-- Dependents on tenants.user_id (enumerated via pg_depend + a function-body scan,
-- prod 2026-06-15) and how each is handled here:
--   • tenants_user_id_fkey (FK -> users.id) + tenants_user_id_key (UNIQUE +
--     backing index): single-column, auto-dropped by DROP COLUMN.
--   • storage.objects RLS policy "Tenants can view inspection photo objects for
--     their leases" (joins tenants ON t.user_id = auth.uid()): a HARD dependency
--     that would abort DROP COLUMN with SQLSTATE 2BP01. It is inert in
--     landlord-only mode (tenants have no auth account); owners already read
--     inspection photos via the owner_user_id-scoped "Owners can view inspection
--     photo objects" policy. Dropped below.
--   • assert_can_create_lease(uuid, uuid): orphaned tenant-portal invitation gate
--     (SELECT t.user_id ...). 0 callers (service_role-only; documented ORPHANED in
--     20260602202339). Dropped below.
--   • log_lease_signature_activity(): its tenant-signature branch logged
--     t.user_id (always NULL post-pivot). Rewritten below to log the owner's
--     activity feed (NEW.owner_user_id), removing the tenants.user_id read.
--   • No view or other policy/function depends on it (get_dashboard_data_v2 only
--     counts tenants + logs activity.user_id, not tenants.user_id).
--   • Supersedes the LEGACY-TENANT-06 deferral noted in
--     20260616040851_drop_dead_stripe_connect_and_tenant_user_columns.sql.

-- 1. Drop the inert tenant-portal storage policy (hard blocker; owner policy covers reads).
drop policy if exists "Tenants can view inspection photo objects for their leases"
  on storage.objects;

-- 2. Drop the orphaned tenant-portal lease-gate RPC (0 callers, reads tenants.user_id).
drop function if exists public.assert_can_create_lease(uuid, uuid);

-- 3. Rewrite the lease-signature activity logger off tenants.user_id: tenant
--    signatures are landlord-recorded (no tenant auth), so log to the owner's feed.
create or replace function public.log_lease_signature_activity()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  -- Log owner signature
  if new.owner_signed_at is not null and (old is null or old.owner_signed_at is null) then
    insert into activity (user_id, activity_type, entity_type, entity_id, description, created_at)
    values (new.owner_user_id, 'lease_signed', 'lease', new.id, 'Owner signed lease agreement', now());
  end if;

  -- Log tenant signature against the owner's activity feed (tenants are records,
  -- not auth users — there is no tenant user_id to attribute the event to).
  if new.tenant_signed_at is not null and (old is null or old.tenant_signed_at is null) then
    insert into activity (user_id, activity_type, entity_type, entity_id, description, created_at)
    values (new.owner_user_id, 'lease_signed', 'lease', new.id, 'Tenant signed lease agreement', now());
  end if;

  return new;
end;
$function$;

-- 4. Drop the column (FK + UNIQUE constraint + backing index auto-drop with it).
alter table public.tenants drop column if exists user_id;
