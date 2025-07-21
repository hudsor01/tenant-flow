#!/bin/bash

# Setup Stripe Foreign Data Wrapper in Supabase
# This script connects directly to the Supabase database and sets up the Stripe wrapper

set -e

# Load environment variables
source .env.local

# Extract connection details from DIRECT_URL
if [[ -z "$DIRECT_URL" ]]; then
    echo "❌ DIRECT_URL not found in environment variables"
    exit 1
fi

echo "🚀 Setting up Stripe Foreign Data Wrapper..."
echo "📡 Using DIRECT_URL connection..."

# Step 1: Enable extensions
echo "1️⃣ Enabling wrappers and vault extensions..."
psql "$DIRECT_URL" << 'EOF'
-- Enable the wrappers extension
CREATE EXTENSION IF NOT EXISTS wrappers WITH SCHEMA extensions;

-- Enable the vault extension for secure API key storage
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

\echo 'Extensions enabled successfully'
EOF

if [[ $? -ne 0 ]]; then
    echo "❌ Failed to enable extensions"
    exit 1
fi

# Step 2: Store Stripe secret key in vault
echo "2️⃣ Storing Stripe secret key in vault..."
if [[ -z "$STRIPE_SECRET_KEY" ]]; then
    echo "❌ STRIPE_SECRET_KEY not found in environment variables"
    exit 1
fi

psql "$DIRECT_URL" << EOF
-- Store Stripe API key securely in vault
INSERT INTO vault.secrets (name, secret)
VALUES (
  'stripe_secret_key',
  '$STRIPE_SECRET_KEY'
) ON CONFLICT (name) DO UPDATE SET
  secret = EXCLUDED.secret,
  updated_at = now();

\echo 'Stripe secret key stored in vault'
EOF

if [[ $? -ne 0 ]]; then
    echo "❌ Failed to store Stripe secret key"
    exit 1
fi

# Step 3: Create foreign server
echo "3️⃣ Creating Stripe foreign server..."
psql "$DIRECT_URL" << 'EOF'
-- Create foreign server for Stripe
CREATE SERVER IF NOT EXISTS stripe_server
FOREIGN DATA WRAPPER stripe_wrapper
OPTIONS (
  api_key_id 'stripe_secret_key'
);

-- Grant usage to authenticated users
GRANT USAGE ON FOREIGN SERVER stripe_server TO authenticated;
GRANT USAGE ON FOREIGN SERVER stripe_server TO service_role;

\echo 'Stripe foreign server created'
EOF

if [[ $? -ne 0 ]]; then
    echo "❌ Failed to create foreign server"
    exit 1
fi

# Step 4: Create foreign tables
echo "4️⃣ Creating Stripe foreign tables..."
psql "$DIRECT_URL" << 'EOF'
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

\echo 'Foreign tables created successfully'
EOF

if [[ $? -ne 0 ]]; then
    echo "❌ Failed to create foreign tables"
    exit 1
fi

# Step 5: Set permissions
echo "5️⃣ Setting up permissions..."
psql "$DIRECT_URL" << 'EOF'
-- Grant access to authenticated users
GRANT SELECT ON stripe_customers TO authenticated, service_role;
GRANT SELECT ON stripe_subscriptions TO authenticated, service_role;
GRANT SELECT ON stripe_products TO authenticated, service_role;
GRANT SELECT ON stripe_prices TO authenticated, service_role;
GRANT SELECT ON stripe_invoices TO authenticated, service_role;
GRANT SELECT ON stripe_events TO authenticated, service_role;

\echo 'Permissions set successfully'
EOF

if [[ $? -ne 0 ]]; then
    echo "❌ Failed to set permissions"
    exit 1
fi

# Step 6: Create useful views
echo "6️⃣ Creating helper views..."
psql "$DIRECT_URL" << 'EOF'
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

\echo 'Helper views created successfully'
EOF

if [[ $? -ne 0 ]]; then
    echo "❌ Failed to create helper views"
    exit 1
fi

echo "✅ Stripe Foreign Data Wrapper setup completed successfully!"
echo ""
echo "You can now query Stripe data directly from your database:"
echo "  SELECT * FROM stripe_customers LIMIT 5;"
echo "  SELECT * FROM stripe_subscriptions WHERE status = 'active';"
echo "  SELECT * FROM active_subscriptions;"
echo ""
echo "🔧 Next steps:"
echo "  1. Update your backend services to use these foreign tables"
echo "  2. Test the integration with: psql \"$DIRECT_URL\" -c \"SELECT count(*) FROM stripe_customers;\""