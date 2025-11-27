-- Migration: Grant pgTAP permissions for database testing
-- This ensures the test runner can access pgTAP functions in the extensions schema
-- Required for: supabase test db --linked

-- =============================================================================
-- ENABLE pgTAP EXTENSION (if not already enabled)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

-- =============================================================================
-- GRANT USAGE ON EXTENSIONS SCHEMA
-- =============================================================================

-- The test runner needs access to the extensions schema where pgTAP lives
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- =============================================================================
-- GRANT EXECUTE ON pgTAP FUNCTIONS
-- =============================================================================

-- Grant execute on all functions in extensions schema (includes pgTAP)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO anon, authenticated, service_role;

-- Set default privileges for future functions
ALTER DEFAULT PRIVILEGES IN SCHEMA extensions
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
