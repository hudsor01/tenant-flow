-- Real-time subscription state tracking on users table.
-- Replaces the broken Stripe Sync Engine FDW approach.
-- Updated by stripe-webhooks Edge Function (handlers/customer-subscription-*.ts)
-- and read by proxy.ts to gate dashboard access.
--
-- Allowed dashboard access: subscription_status IN ('active', 'trialing').
-- All other statuses (past_due, canceled, unpaid, incomplete, paused) → /pricing redirect.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_plan text,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_updated_at timestamptz;

-- Indexes for proxy gate query (users.id PK lookup is already indexed) and
-- for webhook handler customer-by-stripe_customer_id lookups.
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id
  ON public.users (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_subscription_status
  ON public.users (subscription_status) WHERE subscription_status IS NOT NULL;

COMMENT ON COLUMN public.users.subscription_status IS
  'Stripe subscription.status. Allowed values: active, trialing, past_due, canceled, unpaid, incomplete, incomplete_expired, paused. '
  'Updated by stripe-webhooks Edge Function. Proxy.ts grants dashboard access only when status IN (active, trialing).';

COMMENT ON COLUMN public.users.subscription_id IS
  'Stripe subscription ID for the owner''s TenantFlow plan. Distinct from leases.stripe_subscription_id (tenant rent).';
