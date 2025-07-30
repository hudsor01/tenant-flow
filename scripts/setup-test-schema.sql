-- Create a separate test schema in your existing Supabase database
-- This isolates test data from production data

-- Create test schema
CREATE SCHEMA IF NOT EXISTS test;

-- Set search path to use test schema first
SET search_path TO test, public;

-- Grant permissions to authenticated users on test schema
GRANT USAGE ON SCHEMA test TO authenticated;
GRANT CREATE ON SCHEMA test TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA test TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA test TO authenticated;

-- Create all your tables in test schema
-- (Your Prisma migrations will handle this when you set the schema in DATABASE_URL)

-- Example: If you want to manually create test tables
-- CREATE TABLE test.users (...);
-- CREATE TABLE test.properties (...);
-- etc.

COMMENT ON SCHEMA test IS 'Test schema for automated testing - isolated from production data';