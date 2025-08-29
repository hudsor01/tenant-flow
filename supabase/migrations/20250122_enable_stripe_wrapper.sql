-- Enable required extensions for Stripe integration
-- This must be run by a superuser or database owner

-- Enable the wrappers extension
CREATE EXTENSION IF NOT EXISTS wrappers WITH SCHEMA extensions;

-- Enable the vault extension for secure API key storage
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- Store Stripe API key securely in vault
-- NOTE: The stripe_secret_key must be added manually via Supabase Dashboard
-- Go to: Project Settings > Vault > Add new secret
-- Name: stripe_secret_key
-- Value: your actual Stripe secret key

-- Create foreign server for Stripe
CREATE SERVER IF NOT EXISTS stripe_server
FOREIGN DATA WRAPPER stripe_wrapper
OPTIONS (
  api_key_id 'stripe_secret_key'  -- References the vault secret
);

-- Grant usage to authenticated users
GRANT USAGE ON FOREIGN SERVER stripe_server TO authenticated;
GRANT USAGE ON FOREIGN SERVER stripe_server TO service_role;