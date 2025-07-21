#!/bin/bash

# Update Stripe secret key in Supabase vault
# This ensures the foreign data wrapper uses the correct API key

set -e

# Load environment variables
source .env.local

if [[ -z "$DIRECT_URL" ]]; then
    echo "❌ DIRECT_URL not found in environment variables"
    exit 1
fi

if [[ -z "$STRIPE_SECRET_KEY" ]]; then
    echo "❌ STRIPE_SECRET_KEY not found in environment variables"
    exit 1
fi

echo "🔑 Updating Stripe secret key in Supabase vault..."
echo "📡 Using DIRECT_URL connection..."
echo "🔐 Key starts with: ${STRIPE_SECRET_KEY:0:15}..."

# Check current vault contents
echo "1️⃣ Checking current vault contents..."
psql "$DIRECT_URL" << 'EOF'
SELECT name, 
       length(secret) as secret_length,
       left(secret, 15) || '...' as secret_preview,
       created_at,
       updated_at
FROM vault.secrets 
WHERE name LIKE '%stripe%';
EOF

# Update the Stripe secret key
echo "2️⃣ Updating Stripe secret key..."
psql "$DIRECT_URL" << EOF
-- Update Stripe API key in vault
INSERT INTO vault.secrets (name, secret)
VALUES (
  'STRIPE_SECRET_KEY',
  '$STRIPE_SECRET_KEY'
) ON CONFLICT (name) DO UPDATE SET
  secret = EXCLUDED.secret,
  updated_at = now();

-- Also update the lowercase version if it exists
INSERT INTO vault.secrets (name, secret)
VALUES (
  'stripe_secret_key',
  '$STRIPE_SECRET_KEY'
) ON CONFLICT (name) DO UPDATE SET
  secret = EXCLUDED.secret,
  updated_at = now();

\echo 'Stripe secret key updated in vault'
EOF

# Drop and recreate the server to pick up the new key
echo "3️⃣ Recreating Stripe server with updated key..."
psql "$DIRECT_URL" << EOF
-- Drop existing foreign tables and server
DROP FOREIGN TABLE IF EXISTS stripe_customers CASCADE;
DROP FOREIGN TABLE IF EXISTS stripe_subscriptions CASCADE;
DROP FOREIGN TABLE IF EXISTS stripe_products CASCADE;
DROP FOREIGN TABLE IF EXISTS stripe_prices CASCADE;

-- Drop and recreate server
DROP SERVER IF EXISTS stripe_server CASCADE;

-- Try using vault secret first
CREATE SERVER stripe_server
FOREIGN DATA WRAPPER stripe_wrapper
OPTIONS (
  api_key_id 'STRIPE_SECRET_KEY'
);

\echo 'Server recreated with vault secret'
EOF

if [[ $? -ne 0 ]]; then
    echo "❌ Vault approach failed, trying direct API key approach..."
    # Fallback to direct API key if vault doesn't work
    psql "$DIRECT_URL" << EOF
-- Create server with direct API key as fallback
CREATE SERVER stripe_server
FOREIGN DATA WRAPPER stripe_wrapper
OPTIONS (
  api_key '$STRIPE_SECRET_KEY'
);

\echo 'Server created with direct API key'
EOF
fi

# Recreate foreign tables
echo "4️⃣ Recreating foreign tables..."
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

-- Set permissions
GRANT SELECT ON stripe_customers TO authenticated, service_role;
GRANT SELECT ON stripe_subscriptions TO authenticated, service_role;
GRANT SELECT ON stripe_products TO authenticated, service_role;

\echo 'Foreign tables recreated with permissions'
EOF

# Test the connection
echo "5️⃣ Testing connection with updated key..."
psql "$DIRECT_URL" << 'EOF'
SELECT 
  'Customers' as table_name, 
  count(*) as count 
FROM stripe_customers
UNION ALL
SELECT 
  'Subscriptions' as table_name, 
  count(*) as count 
FROM stripe_subscriptions
UNION ALL
SELECT 
  'Products' as table_name, 
  count(*) as count 
FROM stripe_products;
EOF

if [[ $? -eq 0 ]]; then
    echo "✅ Stripe foreign data wrapper updated successfully!"
    echo ""
    echo "🎉 The connection is working with the updated API key!"
    echo "You can now use the Stripe foreign tables in your backend services."
else
    echo "❌ Connection test still failing. Check if the API key is correct."
    echo "You may need to verify the key in your Stripe dashboard."
fi