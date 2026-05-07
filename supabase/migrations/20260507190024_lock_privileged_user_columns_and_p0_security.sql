-- P0 security hardening — three fixes in one atomic migration.
--
-- Background: a security audit (2026-05-07) surfaced three independent
-- privilege-escalation paths exploitable from any authenticated session.
-- All three are SQL-only and small enough to land together; bundling
-- them avoids three review cycles for what is structurally one
-- "tighten the database" change.

------------------------------------------------------------
-- P0-1: lock privileged columns on public.users
------------------------------------------------------------
-- Pre-fix state:
--   * RLS policy `users_update_own_record` allowed `auth.uid() = id`
--     UPDATEs (correct on its own).
--   * Table-level GRANT UPDATE ... TO authenticated covered EVERY column.
--   * No protective trigger on UPDATE.
-- Result: any authenticated user could `update({ is_admin: true })`,
--         `update({ subscription_status: 'active' })`, or
--         `update({ stripe_customer_id: '<victim-cus-id>' })` on their
--         own row — escalating to admin, bypassing the proxy gate, or
--         hijacking the Stripe Customer Portal target for a victim.
--
-- Fix shape:
--   1. REVOKE the broad UPDATE grant.
--   2. Re-GRANT UPDATE only on the columns the frontend actually edits
--      (verified by grepping every `from('users').update({...})` call
--      site in src/).
--   3. Belt-and-braces BEFORE-UPDATE trigger that rejects any change to
--      a privileged column when the caller is not service_role/postgres,
--      so even a future grant-drift can't reopen the hole.
revoke update on public.users from authenticated;

-- Safe-update column allowlist. Verified call sites:
--   first_name, last_name, full_name, phone   — use-profile-mutations.ts
--   phone                                      — general-settings.tsx, use-owner-emergency-contact.ts
--   avatar_url                                 — use-profile-avatar-mutations.ts
--   emergency_contact_*                        — use-owner-emergency-contact.ts
--   onboarding_status                          — use-onboarding.ts
--   updated_at                                 — set alongside profile updates
grant update (
  first_name,
  last_name,
  full_name,
  phone,
  avatar_url,
  emergency_contact_name,
  emergency_contact_phone,
  emergency_contact_relationship,
  onboarding_status,
  updated_at
) on public.users to authenticated;

create or replace function public.guard_user_self_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- service_role / superuser callers (Stripe webhook handlers, deletion
  -- cron, ops scripts) bypass the guard. These are the only legitimate
  -- writers of privileged columns.
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  if new.id                             is distinct from old.id                             or
     new.email                          is distinct from old.email                          or
     new.is_admin                       is distinct from old.is_admin                       or
     new.subscription_status            is distinct from old.subscription_status            or
     new.subscription_id                is distinct from old.subscription_id                or
     new.subscription_plan              is distinct from old.subscription_plan              or
     coalesce(new.subscription_updated_at, '-infinity'::timestamptz)
        is distinct from coalesce(old.subscription_updated_at, '-infinity'::timestamptz)    or
     new.stripe_customer_id             is distinct from old.stripe_customer_id             or
     coalesce(new.trial_ends_at, '-infinity'::timestamptz)
        is distinct from coalesce(old.trial_ends_at, '-infinity'::timestamptz)              or
     coalesce(new.onboarding_completed_at, '-infinity'::timestamptz)
        is distinct from coalesce(old.onboarding_completed_at, '-infinity'::timestamptz)    or
     coalesce(new.deletion_requested_at, '-infinity'::timestamptz)
        is distinct from coalesce(old.deletion_requested_at, '-infinity'::timestamptz)      or
     new.created_at                     is distinct from old.created_at                     then
    raise exception
      'Privileged column on public.users cannot be modified via PostgREST. Use the appropriate RPC or service-role flow.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_user_self_update() from public, authenticated, anon;

drop trigger if exists users_guard_self_update on public.users;
create trigger users_guard_self_update
  before update on public.users
  for each row
  execute function public.guard_user_self_update();

------------------------------------------------------------
-- P0-2: revoke `sign_lease_and_check_activation` from authenticated
------------------------------------------------------------
-- The function is SECURITY DEFINER and writes
-- owner_signed_at / tenant_signed_at directly without any
-- auth.uid() ownership check, so granting EXECUTE to authenticated
-- (and PUBLIC) lets any authenticated user forge a lease signature on
-- any lease they can name.
--
-- App code never calls this RPC — lease signatures flow through the
-- HMAC-protected `docuseal-webhook` Edge Function, which runs as
-- service_role. service_role retains EXECUTE.
revoke execute on function public.sign_lease_and_check_activation(uuid, text, text, timestamptz, text)
  from public, authenticated;

------------------------------------------------------------
-- P0-3: drop the path-checkless property-images INSERT policy
------------------------------------------------------------
-- Two INSERT policies existed on storage.objects for property-images:
--   * `Property owners can upload images` — folder-uuid → owner check
--     against public.properties (correct, mirrors the maintenance-photos
--     fix from migration 20260420010000).
--   * `Authenticated users can upload property images` — bucket-id only.
-- PostgREST evaluates RLS policies as OR, so any authenticated user
-- could upload to any property's folder. The `property-images` bucket is
-- public=true, so attacker-uploaded files get CDN-served as part of the
-- victim's listing. Drop the broken policy; the strict policy alone
-- preserves the intended UX for owners uploading their own images.
drop policy if exists "Authenticated users can upload property images"
  on storage.objects;
