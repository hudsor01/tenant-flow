-- Migration: Add Tenant Onboarding Fields (Phase 3.1 Complete Implementation)
-- Adds fields for autopay configuration, lease signatures, and webhook logging
-- Based on industry research (Buildium, AppFolio, TurboTenant)

-- ============================================================================
-- STEP 1: Add Auto-Pay Fields to Tenant Table
-- ============================================================================
ALTER TABLE tenant
ADD COLUMN IF NOT EXISTS autopay_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS autopay_day INTEGER CHECK (autopay_day >= 1 AND autopay_day <= 28),
ADD COLUMN IF NOT EXISTS autopay_frequency TEXT DEFAULT 'monthly' CHECK (autopay_frequency IN ('monthly', 'weekly', 'biweekly', 'quarterly')),
ADD COLUMN IF NOT EXISTS autopay_configured_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_method_added_at TIMESTAMPTZ;

COMMENT ON COLUMN tenant.autopay_enabled IS 'Whether tenant has enabled automatic monthly rent payments';
COMMENT ON COLUMN tenant.autopay_day IS 'Day of month (1-28) when automatic payment should be charged';
COMMENT ON COLUMN tenant.autopay_frequency IS 'Payment frequency: monthly (default), weekly, biweekly, quarterly';
COMMENT ON COLUMN tenant.autopay_configured_at IS 'Timestamp when autopay was configured';
COMMENT ON COLUMN tenant.payment_method_added_at IS 'Timestamp when tenant first added a payment method';

-- ============================================================================
-- STEP 2: Add Lease Signature Fields to Lease Table
-- ============================================================================
ALTER TABLE lease
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signature TEXT,
ADD COLUMN IF NOT EXISTS lease_document_url TEXT;

COMMENT ON COLUMN lease.signed_at IS 'Timestamp when tenant digitally signed the lease';
COMMENT ON COLUMN lease.signature IS 'Tenant full name as digital signature';
COMMENT ON COLUMN lease.lease_document_url IS 'URL to stored lease PDF document';

-- ============================================================================
-- STEP 3: Create Auth Webhook Log Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS auth_webhook_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_webhook_log_user_id ON auth_webhook_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_webhook_log_processed ON auth_webhook_log(processed);
CREATE INDEX IF NOT EXISTS idx_auth_webhook_log_created_at ON auth_webhook_log(created_at DESC);

COMMENT ON TABLE auth_webhook_log IS 'Logs all Supabase Auth webhook events for debugging and audit trail';
COMMENT ON COLUMN auth_webhook_log.event_type IS 'Webhook event type (e.g., user.confirmed, user.created)';
COMMENT ON COLUMN auth_webhook_log.user_id IS 'Supabase Auth user ID from webhook payload';
COMMENT ON COLUMN auth_webhook_log.payload IS 'Full webhook payload (JSONB for querying)';
COMMENT ON COLUMN auth_webhook_log.processed IS 'Whether webhook event has been processed';
COMMENT ON COLUMN auth_webhook_log.processed_at IS 'Timestamp when webhook was successfully processed';
COMMENT ON COLUMN auth_webhook_log.error IS 'Error message if webhook processing failed';

-- ============================================================================
-- VERIFICATION QUERIES (commented out - for manual testing)
-- ============================================================================
-- Check tenant table columns:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'tenant'
-- AND column_name IN ('autopay_enabled', 'autopay_day', 'autopay_frequency', 'autopay_configured_at', 'payment_method_added_at');

-- Check lease table columns:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'lease'
-- AND column_name IN ('signed_at', 'signature', 'lease_document_url');

-- Check auth_webhook_log table:
-- SELECT * FROM auth_webhook_log ORDER BY created_at DESC LIMIT 10;
