-- Store webhook and API credentials in Supabase Vault for secure access
-- These credentials are used by pg_net trigger functions

-- Store n8n webhook URL using vault.create_secret function
SELECT vault.create_secret(
  'https://n8n.thehudsonfam.com/webhook/tenant-flow',
  'n8n_webhook_url',
  'n8n webhook URL for TenantFlow'
);

-- Store Resend API key using vault.create_secret function
SELECT vault.create_secret(
  're_cXKhrXhF_Ms44BQwNEWRJGrviBKpxfC2o',
  'resend_api_key',
  'Resend API key for email automation'
);

-- Create helper function to retrieve n8n webhook URL
CREATE OR REPLACE FUNCTION get_n8n_webhook_url()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  webhook_url TEXT;
BEGIN
  SELECT decrypted_secret INTO webhook_url
  FROM vault.decrypted_secrets
  WHERE name = 'n8n_webhook_url';

  RETURN webhook_url;
END;
$$;

-- Create helper function to retrieve Resend API key
CREATE OR REPLACE FUNCTION get_resend_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  api_key TEXT;
BEGIN
  SELECT decrypted_secret INTO api_key
  FROM vault.decrypted_secrets
  WHERE name = 'resend_api_key';

  RETURN api_key;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_n8n_webhook_url() TO service_role;
GRANT EXECUTE ON FUNCTION get_resend_api_key() TO service_role;

COMMENT ON FUNCTION get_n8n_webhook_url() IS 'SECURITY: Fixed search_path to prevent schema injection - Retrieves n8n webhook URL from Vault';
COMMENT ON FUNCTION get_resend_api_key() IS 'SECURITY: Fixed search_path to prevent schema injection - Retrieves Resend API key from Vault';
