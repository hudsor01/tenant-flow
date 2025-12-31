-- Migration: Move Extensions to Extensions Schema
-- Created: 2025-12-30 28:00:00 UTC
-- Purpose: Move extensions from public schema to extensions schema
-- Security Impact: MEDIUM - Reduces public schema exposure
--
-- Note: This follows Supabase best practices for extension organization
-- The extensions schema is a dedicated schema for Postgres extensions

-- Move pg_trgm (trigram matching for full-text search)
alter extension pg_trgm set schema extensions;

-- Move btree_gist (GiST index operator classes)
alter extension btree_gist set schema extensions;

-- Move address_standardizer (address parsing)
alter extension address_standardizer set schema extensions;

-- Note: pg_stat_monitor cannot be moved as it's a shared preload library
-- that requires specific schema placement. It's low risk as it's read-only.
