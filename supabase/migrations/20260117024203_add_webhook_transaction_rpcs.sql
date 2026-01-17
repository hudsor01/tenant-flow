-- Migration: Add webhook transaction RPC functions
-- Purpose: Wrap webhook-related database operations in implicit transactions for atomicity
-- Affected: rent_payments, payment_transactions, leases tables
-- Phase: 12-webhook-security-reliability, Plan: 01

-- =============================================================================
-- RPC FUNCTION 1: process_payment_intent_failed
-- =============================================================================
-- Atomically updates rent_payments status and inserts payment_transaction record.
-- Both operations succeed or both fail - prevents partial state.
--
-- Called from: payment-webhook.handler.ts handlePaymentIntentFailed()
-- Replaces: Promise.all([update, upsert]) pattern that could leave inconsistent state

create or replace function public.process_payment_intent_failed(
  p_rent_payment_id uuid,
  p_payment_intent_id text,
  p_amount integer,
  p_failure_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Update rent_payments status to failed
  update rent_payments
  set
    status = 'failed',
    updated_at = now()
  where id = p_rent_payment_id;

  -- Insert payment transaction record (idempotent via ON CONFLICT)
  -- Uses existing unique constraint: payment_transactions_unique_payment_status
  insert into payment_transactions (
    rent_payment_id,
    stripe_payment_intent_id,
    status,
    amount,
    failure_reason,
    attempted_at
  ) values (
    p_rent_payment_id,
    p_payment_intent_id,
    'failed',
    p_amount,
    p_failure_reason,
    now()
  )
  on conflict (rent_payment_id, stripe_payment_intent_id, status) do nothing;

  -- If any operation fails, entire transaction rolls back automatically (implicit in plpgsql)
end;
$$;

comment on function public.process_payment_intent_failed(uuid, text, integer, text) is
  'Atomically marks rent payment as failed and records transaction. Called from payment webhook handler.';


-- =============================================================================
-- RPC FUNCTION 2: process_subscription_status_change
-- =============================================================================
-- Updates lease status based on Stripe subscription status changes.
-- Skips silently if lease not found (webhook may arrive before lease creation).
--
-- Called from: subscription-webhook.handler.ts handleSubscriptionUpdated(), handleSubscriptionDeleted()

create or replace function public.process_subscription_status_change(
  p_subscription_id text,
  p_new_status text,
  p_subscription_failure_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lease_id uuid;
begin
  -- Find lease by subscription ID
  select id into v_lease_id
  from leases
  where stripe_subscription_id = p_subscription_id;

  -- If not found, exit silently (webhook may arrive before lease exists)
  if v_lease_id is null then
    return;
  end if;

  -- Update lease status
  update leases
  set
    lease_status = p_new_status,
    subscription_failure_reason = p_subscription_failure_reason,
    updated_at = now()
  where id = v_lease_id;
end;
$$;

comment on function public.process_subscription_status_change(text, text, text) is
  'Updates lease status from Stripe subscription status. Called from subscription webhook handler.';


-- =============================================================================
-- RPC FUNCTION 3: confirm_lease_subscription
-- =============================================================================
-- Confirms a lease subscription after Stripe subscription.created webhook.
-- Only updates if lease is still in pending state (idempotent).
--
-- Called from: subscription-webhook.handler.ts handleSubscriptionCreated()

create or replace function public.confirm_lease_subscription(
  p_lease_id uuid,
  p_subscription_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only update if still pending (idempotent - safe for webhook retries)
  update leases
  set
    stripe_subscription_id = p_subscription_id,
    stripe_subscription_status = 'active',
    subscription_failure_reason = null,
    updated_at = now()
  where id = p_lease_id
    and stripe_subscription_status = 'pending';
end;
$$;

comment on function public.confirm_lease_subscription(uuid, text) is
  'Confirms lease subscription from webhook. Only updates if still pending (idempotent).';
