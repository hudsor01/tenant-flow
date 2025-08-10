-- Enable required extensions for Stripe integration
-- This must be run by a superuser or database owner

-- Enable the wrappers extension
CREATE EXTENSION IF NOT EXISTS wrappers WITH SCHEMA extensions;

-- Enable the vault extension for secure API key storage
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- Store Stripe API key securely in vault
-- Replace with your actual Stripe secret key
INSERT INTO vault.secrets (name, secret)
VALUES (
  'stripe_secret_key',
  'your-stripe-secret-key-here'
) ON CONFLICT (name) DO UPDATE SET
  secret = EXCLUDED.secret,
  updated_at = now();

-- Create foreign server for Stripe
CREATE SERVER IF NOT EXISTS stripe_server
FOREIGN DATA WRAPPER stripe_wrapper
OPTIONS (
  api_key_id 'stripe_secret_key'  -- References the vault secret
);

-- Grant usage to authenticated users
GRANT USAGE ON FOREIGN SERVER stripe_server TO authenticated;
GRANT USAGE ON FOREIGN SERVER stripe_server TO service_role;