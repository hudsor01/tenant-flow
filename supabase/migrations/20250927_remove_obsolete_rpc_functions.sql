-- Remove Obsolete RPC Functions - Repository Pattern Migration Cleanup
-- These business logic functions have been replaced with TypeScript calculations
-- in repository pattern implementations. They are no longer needed.

-- Drop the obsolete financial and analytics RPC functions
DROP FUNCTION IF EXISTS calculate_financial_metrics(TEXT, DATE, DATE);
DROP FUNCTION IF EXISTS calculate_maintenance_metrics(TEXT, TEXT, DATE, DATE);
DROP FUNCTION IF EXISTS calculate_property_performance(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_dashboard_summary(TEXT);

-- Add comment documenting the migration rationale
COMMENT ON SCHEMA public IS 'Schema migration completed - obsolete RPC functions removed. Business logic now handled in TypeScript repository pattern for better maintainability, testability, and performance. All calculations moved from database to application layer following modern architectural patterns.';