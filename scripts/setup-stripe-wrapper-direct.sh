#!/bin/bash

# Setup Stripe Foreign Data Wrapper in Supabase with direct API key
# This approach bypasses the vault and uses the API key directly

set -e

# Load environment variables
source .env.local

# Extract connection details from DIRECT_URL
if [[ -z "$DIRECT_URL" ]]; then
    echo "❌ DIRECT_URL not found in environment variables"
    exit 1
fi

if [[ -z "$STRIPE_SECRET_KEY" ]]; then
    echo "❌ STRIPE_SECRET_KEY not found in environment variables"
    exit 1
fi

echo "🚀 Setting up Stripe Foreign Data Wrapper with direct API key..."
echo "📡 Using DIRECT_URL connection..."

# Step 1: Drop existing server if it exists
echo "1️⃣ Cleaning up existing Stripe setup..."
psql "$DIRECT_URL" << 'EOF'
-- Drop existing foreign tables if they exist
DROP FOREIGN TABLE IF EXISTS stripe_customers CASCADE;
DROP FOREIGN TABLE IF EXISTS stripe_subscriptions CASCADE;
DROP FOREIGN TABLE IF EXISTS stripe_products CASCADE;
DROP FOREIGN TABLE IF EXISTS stripe_prices CASCADE;
DROP FOREIGN TABLE IF EXISTS stripe_invoices CASCADE;
DROP FOREIGN TABLE IF EXISTS stripe_events CASCADE;

-- Drop existing server if it exists
DROP SERVER IF EXISTS stripe_server CASCADE;

\echo 'Cleanup completed'
EOF

# Step 2: Create foreign server with direct API key
echo "2️⃣ Creating Stripe foreign server with direct API key..."
psql "$DIRECT_URL" << EOF
-- Create foreign server for Stripe with direct API key
CREATE SERVER stripe_server
FOREIGN DATA WRAPPER stripe_wrapper
OPTIONS (
  api_key '$STRIPE_SECRET_KEY'
);

-- Grant usage to authenticated users
GRANT USAGE ON FOREIGN SERVER stripe_server TO authenticated;
GRANT USAGE ON FOREIGN SERVER stripe_server TO service_role;

\echo 'Stripe foreign server created with direct API key'
EOF

if [[ $? -ne 0 ]]; then
    echo "❌ Failed to create foreign server"
    exit 1
fi

# Step 3: Create foreign tables
echo "3️⃣ Creating Stripe foreign tables..."
psql "$DIRECT_URL" << 'EOF'
-- Stripe Customers
CREATE FOREIGN TABLE stripe_customers (
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
CREATE FOREIGN TABLE stripe_subscriptions (
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
CREATE FOREIGN TABLE stripe_products (
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
CREATE FOREIGN TABLE stripe_prices (
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

\echo 'Core foreign tables created successfully'
EOF

if [[ $? -ne 0 ]]; then
    echo "❌ Failed to create foreign tables"
    exit 1
fi

# Step 4: Set permissions
echo "4️⃣ Setting up permissions..."
psql "$DIRECT_URL" << 'EOF'
-- Grant access to authenticated users
GRANT SELECT ON stripe_customers TO authenticated, service_role;
GRANT SELECT ON stripe_subscriptions TO authenticated, service_role;
GRANT SELECT ON stripe_products TO authenticated, service_role;
GRANT SELECT ON stripe_prices TO authenticated, service_role;

\echo 'Permissions set successfully'
EOF

# Step 5: Test the connection
echo "5️⃣ Testing Stripe connection..."
psql "$DIRECT_URL" << 'EOF'
-- Test the connection by querying customers
SELECT 'Customers:' as table_name, count(*) as count FROM stripe_customers
UNION ALL
SELECT 'Products:' as table_name, count(*) as count FROM stripe_products  
UNION ALL
SELECT 'Subscriptions:' as table_name, count(*) as count FROM stripe_subscriptions
UNION ALL
SELECT 'Prices:' as table_name, count(*) as count FROM stripe_prices;

\echo 'Connection test completed successfully'
EOF

if [[ $? -eq 0 ]]; then
    echo "✅ Stripe Foreign Data Wrapper setup completed successfully!"
    echo ""
    echo "🎉 You can now query Stripe data directly from your database:"
    echo "  SELECT * FROM stripe_customers LIMIT 5;"
    echo "  SELECT * FROM stripe_subscriptions WHERE status = 'active';"
    echo "  SELECT * FROM stripe_products WHERE active = true;"
    echo ""
    echo "🔧 Next steps:"
    echo "  1. Update your backend services to use these foreign tables"
    echo "  2. Replace direct Stripe API calls with database queries"
else
    echo "❌ Connection test failed - check your Stripe API key"
    exit 1
fi