-- Migration: Move Extensions to Extensions Schema
-- Created: 2025-12-30 28:00:00 UTC
-- Purpose: Move extensions from public schema to extensions schema
-- Security Impact: MEDIUM - Reduces public schema exposure
--
-- Note: This follows Supabase best practices for extension organization
-- The extensions schema is a dedicated schema for Postgres extensions
-- Note: Uses conditional checks since not all extensions may be installed

DO $$
BEGIN
  -- Move pg_trgm (trigram matching for full-text search)
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
    RAISE NOTICE 'Moved pg_trgm to extensions schema';
  END IF;

  -- Move btree_gist (GiST index operator classes)
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gist') THEN
    ALTER EXTENSION btree_gist SET SCHEMA extensions;
    RAISE NOTICE 'Moved btree_gist to extensions schema';
  END IF;

  -- Move address_standardizer (address parsing)
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'address_standardizer') THEN
    ALTER EXTENSION address_standardizer SET SCHEMA extensions;
    RAISE NOTICE 'Moved address_standardizer to extensions schema';
  END IF;
END $$;

-- Note: pg_stat_monitor cannot be moved as it's a shared preload library
-- that requires specific schema placement. It's low risk as it's read-only.
