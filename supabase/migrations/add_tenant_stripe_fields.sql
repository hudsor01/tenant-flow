-- Migration: Add Stripe integration fields for Tenant payment management
-- Purpose: Enable Tenant Stripe Customers and recurring rent subscriptions (autopay)
-- Date: 2025-10-24

-- Add stripe_customer_id to tenant table
-- Stores the Stripe Customer ID for each Tenant to manage payment methods
alter table public.tenant
add column if not exists stripe_customer_id text;

-- Add unique constraint to ensure one-to-one mapping
alter table public.tenant
add constraint tenant_stripe_customer_id_unique unique (stripe_customer_id);

-- Add comment for documentation
comment on column public.tenant.stripe_customer_id is
'Stripe Customer ID for this Tenant. Used to store payment methods and manage recurring rent payments (autopay).';

-- Add stripe_subscription_id to lease table
-- Stores the Stripe Subscription ID when Tenant enables autopay for recurring rent
alter table public.lease
add column if not exists stripe_subscription_id text;

-- Add unique constraint to ensure one subscription per lease
alter table public.lease
add constraint lease_stripe_subscription_id_unique unique (stripe_subscription_id);

-- Add comment for documentation
comment on column public.lease.stripe_subscription_id is
'Stripe Subscription ID when Tenant has autopay enabled. NULL means manual payment mode.';

-- Create index for faster lookups by stripe_customer_id
create index if not exists idx_tenant_stripe_customer_id
on public.tenant (stripe_customer_id)
where stripe_customer_id is not null;

-- Create index for faster lookups by stripe_subscription_id
create index if not exists idx_lease_stripe_subscription_id
on public.lease (stripe_subscription_id)
where stripe_subscription_id is not null;
