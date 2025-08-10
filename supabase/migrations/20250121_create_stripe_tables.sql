-- Create foreign tables for Stripe data
-- These map to actual Stripe API endpoints

-- Stripe Customers
CREATE FOREIGN TABLE IF NOT EXISTS stripe_customers (
  id text,
  created bigint,
  email text,
  name text,
  description text,
  metadata jsonb,
  attrs jsonb
)
SERVER stripe_server
OPTIONS (
  object 'customers'
);

-- Stripe Subscriptions
CREATE FOREIGN TABLE IF NOT EXISTS stripe_subscriptions (
  id text,
  customer text,
  status text,
  current_period_start bigint,
  current_period_end bigint,
  trial_start bigint,
  trial_end bigint,
  cancel_at bigint,
  canceled_at bigint,
  created bigint,
  metadata jsonb,
  attrs jsonb
)
SERVER stripe_server
OPTIONS (
  object 'subscriptions'
);

-- Stripe Products
CREATE FOREIGN TABLE IF NOT EXISTS stripe_products (
  id text,
  name text,
  description text,
  active boolean,
  metadata jsonb,
  created bigint,
  updated bigint,
  attrs jsonb
)
SERVER stripe_server
OPTIONS (
  object 'products'
);

-- Stripe Prices
CREATE FOREIGN TABLE IF NOT EXISTS stripe_prices (
  id text,
  product text,
  currency text,
  unit_amount bigint,
  recurring jsonb,
  active boolean,
  metadata jsonb,
  created bigint,
  attrs jsonb
)
SERVER stripe_server
OPTIONS (
  object 'prices'
);

-- Stripe Invoices
CREATE FOREIGN TABLE IF NOT EXISTS stripe_invoices (
  id text,
  customer text,
  subscription text,
  status text,
  amount_due bigint,
  amount_paid bigint,
  currency text,
  created bigint,
  due_date bigint,
  period_start bigint,
  period_end bigint,
  metadata jsonb,
  attrs jsonb
)
SERVER stripe_server
OPTIONS (
  object 'invoices'
);

-- Stripe Checkout Sessions
CREATE FOREIGN TABLE IF NOT EXISTS stripe_checkout_sessions (
  id text,
  customer text,
  payment_status text,
  status text,
  url text,
  success_url text,
  cancel_url text,
  amount_total bigint,
  currency text,
  metadata jsonb,
  created bigint,
  expires_at bigint,
  attrs jsonb
)
SERVER stripe_server
OPTIONS (
  object 'checkout_sessions',
  api_url 'https://api.stripe.com/v1/checkout/sessions'
);

-- Stripe Events (for webhook data)
CREATE FOREIGN TABLE IF NOT EXISTS stripe_events (
  id text,
  type text,
  created bigint,
  data jsonb,
  object text,
  api_version text,
  attrs jsonb
)
SERVER stripe_server
OPTIONS (
  object 'events'
);

-- Grant access to authenticated users
GRANT SELECT ON stripe_customers TO authenticated, service_role;
GRANT SELECT ON stripe_subscriptions TO authenticated, service_role;
GRANT SELECT ON stripe_products TO authenticated, service_role;
GRANT SELECT ON stripe_prices TO authenticated, service_role;
GRANT SELECT ON stripe_invoices TO authenticated, service_role;
GRANT SELECT ON stripe_checkout_sessions TO authenticated, service_role;
GRANT SELECT ON stripe_events TO authenticated, service_role;

-- Create indexes for common queries
-- Note: Foreign tables don't support indexes directly, but you can create materialized views if needed

-- Create a view for active subscriptions with customer info
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT 
  s.id,
  s.customer,
  c.email as customer_email,
  c.name as customer_name,
  s.status,
  s.current_period_start,
  s.current_period_end,
  s.trial_end,
  s.metadata,
  s.created
FROM stripe_subscriptions s
JOIN stripe_customers c ON s.customer = c.id
WHERE s.status IN ('active', 'trialing', 'past_due');

GRANT SELECT ON active_subscriptions TO authenticated, service_role;