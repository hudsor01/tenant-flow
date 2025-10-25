-- Migration: Add Optimistic Locking (Version Columns)
-- Date: 2025-10-25
-- Purpose: Prevent lost updates in concurrent modifications (BUG FIX #2)
--
-- Pattern: Add version column to all tables with UPDATE operations
-- Use: UPDATE ... WHERE id = ? AND version = ? RETURNING *
-- If 0 rows affected → 409 Conflict (data was modified by another user)

-- Core entity tables
ALTER TABLE property ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE unit ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE lease ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Payment tables
ALTER TABLE rent_payment ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE payment_schedule ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE rent_subscription ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Operational tables
ALTER TABLE maintenance_request ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- User/Profile tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Add indexes for performance (version is checked in WHERE clause)
CREATE INDEX IF NOT EXISTS idx_property_version ON property(id, version);
CREATE INDEX IF NOT EXISTS idx_unit_version ON unit(id, version);
CREATE INDEX IF NOT EXISTS idx_lease_version ON lease(id, version);
CREATE INDEX IF NOT EXISTS idx_tenant_version ON tenant(id, version);

-- Comments for documentation
COMMENT ON COLUMN property.version IS 'Optimistic locking version. Incremented on each update to detect concurrent modifications.';
COMMENT ON COLUMN unit.version IS 'Optimistic locking version. Incremented on each update to detect concurrent modifications.';
COMMENT ON COLUMN lease.version IS 'Optimistic locking version. Incremented on each update to detect concurrent modifications.';
COMMENT ON COLUMN tenant.version IS 'Optimistic locking version. Incremented on each update to detect concurrent modifications.';

-- Verification query
-- SELECT table_name, column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE column_name = 'version' AND table_schema = 'public'
-- ORDER BY table_name;
