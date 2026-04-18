-- =============================================================================
-- migration: demolish rent facilitation + tenant portal
-- purpose: convert TenantFlow from multi-role (owner + tenant) SaaS with rent
--   payment processing to a landlord-only administration SaaS. Tenants are now
--   data records managed by landlords, not application users. Rent collection
--   is tracked manually (landlords record what they received); no money moves
--   through the platform.
--
-- scope of removal:
--   - Rent payment processing (Stripe Connect destination charges, autopay)
--   - Stripe Connect landlord onboarding
--   - Tenant user accounts + invitation flow
--   - Late fee assessment
--   - Rent due tracking + payment reminders (as automated cron)
--
-- preserved:
--   - SaaS subscription billing (stripe-checkout, billing-portal, webhooks)
--   - Properties, units, leases, tenants (as data), lease_tenants
--   - DocuSeal e-signature (landlord-initiated, email-based)
--   - Maintenance requests
--   - Documents, inspections, blogs
--
-- depends on: the landlord-only code refactor shipped alongside this migration.
--
-- WARNING: this migration is IRREVERSIBLE. Dropping tables deletes data.
--   Production blast radius is zero per earlier audit (0 rent_payments ever,
--   0 stripe_connected_accounts, 0 rent_due, 0 late_fees). Run only after
--   verifying the same.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Unschedule remaining rent-related pg_cron jobs
--    (process-autopay-charges was unscheduled earlier as part of the safety PR.)
-- -----------------------------------------------------------------------------
do $$
begin
  perform cron.unschedule('calculate-late-fees');
exception when others then
  raise notice 'calculate-late-fees job not found, skipping unschedule';
end;
$$;

do $$
begin
  perform cron.unschedule('payment-reminders');
exception when others then
  raise notice 'payment-reminders job not found, skipping unschedule';
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Drop rent / Connect / tenant-invitation tables
--    CASCADE handles foreign keys, RLS policies, and triggers attached to
--    these tables. Drop order respects dependencies (late_fees / rent_payments
--    reference rent_due, which references leases).
-- -----------------------------------------------------------------------------
drop table if exists public.late_fees cascade;
drop table if exists public.rent_payments cascade;
drop table if exists public.rent_due cascade;
drop table if exists public.payment_methods cascade;
drop table if exists public.payment_reminders cascade;
drop table if exists public.stripe_connected_accounts cascade;
drop table if exists public.tenant_invitations cascade;

-- -----------------------------------------------------------------------------
-- 3. Drop rent / Connect columns from leases
-- -----------------------------------------------------------------------------
alter table public.leases
  drop column if exists auto_pay_enabled,
  drop column if exists autopay_payment_method_id,
  drop column if exists stripe_connected_account_id;

-- -----------------------------------------------------------------------------
-- 4. Drop Stripe customer reference from tenants + relax user_id
--    (user_id) is relaxed to nullable because landlords now add tenant records
--    without creating auth users. Existing rows with a user_id stay linked.
-- -----------------------------------------------------------------------------
alter table public.tenants drop column if exists stripe_customer_id;
alter table public.tenants alter column user_id drop not null;

-- -----------------------------------------------------------------------------
-- 5. Drop rent-processing functions
-- -----------------------------------------------------------------------------
drop function if exists public.process_autopay_charges() cascade;
drop function if exists public.calculate_late_fees() cascade;
drop function if exists public.queue_payment_reminders() cascade;
drop function if exists public.record_rent_payment(
  p_stripe_payment_intent_id text, p_rent_due_id uuid, p_tenant_id uuid,
  p_lease_id uuid, p_amount numeric, p_gross_amount numeric,
  p_platform_fee_amount numeric, p_stripe_fee_amount numeric,
  p_net_amount numeric, p_currency text, p_period_start text,
  p_period_end text, p_due_date text, p_checkout_session_id text
) cascade;
drop function if exists public.set_default_payment_method(p_payment_method_id uuid) cascade;
drop function if exists public.toggle_autopay(
  p_lease_id uuid, p_enabled boolean, p_payment_method_id text
) cascade;

-- -----------------------------------------------------------------------------
-- 6. Note: tenant-role RLS policies across remaining tables are now inert
--    (no tenant user can authenticate without a tenants.user_id linkage).
--    They are left in place as dead code; a follow-up cleanup can remove them.
--    Keeping them here also preserves reversibility for the policy definitions
--    if we ever re-introduce tenant accounts.
-- -----------------------------------------------------------------------------
