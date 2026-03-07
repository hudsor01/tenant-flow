-- =============================================================================
-- Migration: Financial Fixes — RPCs
-- Created: 2026-03-04
-- Phase: 02-financial-fixes, Plan 01, Task 2
--
-- Purpose: Create three SECURITY DEFINER RPCs for atomic financial operations.
--   1. PAY-02 + PAY-08: record_rent_payment — atomic payment upsert + rent_due update
--   2. PAY-16: set_default_payment_method — atomic default swap
--   3. PAY-03: toggle_autopay — tenant-validated autopay toggle
--
-- All RPCs follow Phase 1 conventions:
--   - SECURITY DEFINER with SET search_path TO 'public'
--   - auth.uid() validation where applicable
--   - (select auth.uid()) for performance
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PAY-02 + PAY-08: record_rent_payment
--
-- Called by Edge Functions (stripe-webhooks) using the service_role key after
-- a successful payment_intent.succeeded event. Because the webhook handler
-- runs as service_role (not an authenticated user), this RPC does NOT validate
-- auth.uid(). The service_role key is the trust boundary.
--
-- Behavior:
--   a) Upserts into rent_payments using stripe_payment_intent_id as the
--      unique conflict key. On conflict, updates status to 'succeeded'.
--   b) Updates rent_due.status to 'paid' ONLY when the sum of all succeeded
--      rent_payments for that rent_due_id >= rent_due.amount. This handles
--      shared leases where multiple tenants pay their portions independently.
-- -----------------------------------------------------------------------------

create or replace function public.record_rent_payment(
  p_stripe_payment_intent_id text,
  p_rent_due_id uuid,
  p_tenant_id uuid,
  p_lease_id uuid,
  p_amount numeric(10,2),
  p_gross_amount numeric(10,2),
  p_platform_fee_amount numeric(10,2),
  p_stripe_fee_amount numeric(10,2),
  p_net_amount numeric(10,2),
  p_currency text,
  p_period_start text,
  p_period_end text,
  p_due_date text,
  p_checkout_session_id text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- upsert rent_payments: insert new payment or update existing on retry
  insert into rent_payments (
    stripe_payment_intent_id,
    amount,
    gross_amount,
    platform_fee_amount,
    stripe_fee_amount,
    net_amount,
    currency,
    status,
    tenant_id,
    lease_id,
    application_fee_amount,
    payment_method_type,
    period_start,
    period_end,
    due_date,
    paid_date,
    rent_due_id,
    checkout_session_id
  ) values (
    p_stripe_payment_intent_id,
    p_amount,
    p_gross_amount,
    p_platform_fee_amount,
    p_stripe_fee_amount,
    p_net_amount,
    p_currency,
    'succeeded',
    p_tenant_id,
    p_lease_id,
    p_platform_fee_amount,
    'stripe',
    p_period_start,
    p_period_end,
    p_due_date,
    current_date,
    p_rent_due_id,
    p_checkout_session_id
  )
  on conflict (stripe_payment_intent_id) do update set
    status = 'succeeded',
    paid_date = current_date,
    gross_amount = excluded.gross_amount,
    platform_fee_amount = excluded.platform_fee_amount,
    stripe_fee_amount = excluded.stripe_fee_amount,
    net_amount = excluded.net_amount;

  -- update rent_due.status to 'paid' only when all tenant portions are paid
  -- for single-tenant leases (100%): immediate after first payment
  -- for shared leases: only when sum of succeeded payments >= rent_due.amount
  if p_rent_due_id is not null then
    update rent_due
    set status = 'paid', updated_at = now()
    where id = p_rent_due_id
      and status != 'paid'
      and (
        select coalesce(sum(rp.amount), 0)
        from rent_payments rp
        where rp.rent_due_id = p_rent_due_id
          and rp.status = 'succeeded'
      ) >= amount;
  end if;
end;
$$;

comment on function public.record_rent_payment is
  'Atomic rent payment recording. Upserts rent_payments and conditionally marks rent_due as paid when all tenant portions are received. Called by stripe-webhooks Edge Function via service_role.';

-- -----------------------------------------------------------------------------
-- 2. PAY-16: set_default_payment_method
--
-- Atomically swaps the default payment method for a tenant. Validates that
-- the target payment method belongs to a tenant whose user_id matches the
-- authenticated caller. Clears is_default on all tenant methods, then sets
-- the target. All in one transaction — no race window.
-- -----------------------------------------------------------------------------

create or replace function public.set_default_payment_method(
  p_payment_method_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tenant_id uuid;
begin
  -- validate caller owns the payment method via tenant.user_id
  select pm.tenant_id into v_tenant_id
  from payment_methods pm
  join tenants t on t.id = pm.tenant_id
  where pm.id = p_payment_method_id
    and t.user_id = (select auth.uid());

  if v_tenant_id is null then
    raise exception 'Payment method not found or not owned by caller';
  end if;

  -- clear is_default on all methods for this tenant
  update payment_methods
  set is_default = false, updated_at = now()
  where tenant_id = v_tenant_id
    and is_default = true;

  -- set the target method as default
  update payment_methods
  set is_default = true, updated_at = now()
  where id = p_payment_method_id;
end;
$$;

comment on function public.set_default_payment_method is
  'Atomically swaps the default payment method for a tenant. Validates ownership via auth.uid(). Clears all is_default flags then sets the target in one transaction.';

-- -----------------------------------------------------------------------------
-- 3. PAY-03: toggle_autopay
--
-- Allows a tenant to enable or disable autopay on a lease they belong to.
-- Validates that the caller is actually a tenant on the specified lease
-- (via tenants -> lease_tenants join). Updates leases.auto_pay_enabled and
-- leases.autopay_payment_method_id. When disabling, clears payment_method_id.
-- -----------------------------------------------------------------------------

create or replace function public.toggle_autopay(
  p_lease_id uuid,
  p_enabled boolean,
  p_payment_method_id text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tenant_id uuid;
begin
  -- verify caller is a tenant on this lease
  select t.id into v_tenant_id
  from tenants t
  join lease_tenants lt on lt.tenant_id = t.id
  where t.user_id = (select auth.uid())
    and lt.lease_id = p_lease_id;

  if v_tenant_id is null then
    raise exception 'Not authorized to modify autopay for this lease';
  end if;

  -- update autopay settings on the lease
  update leases
  set auto_pay_enabled = p_enabled,
      autopay_payment_method_id = case
        when p_enabled then p_payment_method_id
        else null
      end
  where id = p_lease_id;
end;
$$;

comment on function public.toggle_autopay is
  'Tenant-validated autopay toggle. Verifies caller is on the lease via lease_tenants join. Sets auto_pay_enabled and autopay_payment_method_id. Clears method on disable.';

-- -----------------------------------------------------------------------------
-- Grant execute permissions to authenticated role
-- record_rent_payment is also callable via service_role (for webhook handler)
-- -----------------------------------------------------------------------------

grant execute on function public.record_rent_payment(text, uuid, uuid, uuid, numeric, numeric, numeric, numeric, numeric, text, text, text, text, text) to authenticated;
grant execute on function public.record_rent_payment(text, uuid, uuid, uuid, numeric, numeric, numeric, numeric, numeric, text, text, text, text, text) to service_role;
grant execute on function public.set_default_payment_method(uuid) to authenticated;
grant execute on function public.toggle_autopay(uuid, boolean, text) to authenticated;
