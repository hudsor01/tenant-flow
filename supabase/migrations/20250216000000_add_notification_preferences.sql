-- Migration: Add Notification Preferences to Tenant Table
-- Date: 2025-02-16
-- Priority: P1 - User Experience Enhancement
--
-- FEATURE: Allow tenants to manage their notification preferences
-- SCOPE: Add JSONB column to tenant table for flexible preference storage
--
-- PREFERENCES STRUCTURE:
-- {
--   "rentReminders": boolean,
--   "maintenanceUpdates": boolean,
--   "propertyNotices": boolean,
--   "emailNotifications": boolean,
--   "smsNotifications": boolean
-- }

-- ============================================================================
-- 1. Add notification_preferences column to tenant table
-- ============================================================================

ALTER TABLE tenant
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "rentReminders": true,
  "maintenanceUpdates": true,
  "propertyNotices": true,
  "emailNotifications": true,
  "smsNotifications": false
}'::jsonb;

COMMENT ON COLUMN tenant.notification_preferences IS
  'Tenant notification preferences stored as JSONB. Defaults: all email notifications enabled, SMS disabled.';

-- ============================================================================
-- 2. Create index for JSONB queries (performance optimization)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_notification_preferences
  ON tenant USING GIN (notification_preferences);

COMMENT ON INDEX idx_tenant_notification_preferences IS
  'GIN index for efficient JSONB querying of notification preferences';

-- ============================================================================
-- 3. Add validation constraint (ensure valid structure)
-- ============================================================================

ALTER TABLE tenant
ADD CONSTRAINT notification_preferences_valid_structure
  CHECK (
    notification_preferences ? 'rentReminders' AND
    notification_preferences ? 'maintenanceUpdates' AND
    notification_preferences ? 'propertyNotices' AND
    notification_preferences ? 'emailNotifications' AND
    notification_preferences ? 'smsNotifications'
  );

COMMENT ON CONSTRAINT notification_preferences_valid_structure ON tenant IS
  'Ensures notification_preferences JSONB contains all required keys';

-- ============================================================================
-- 4. Backfill existing tenants with default preferences
-- ============================================================================

UPDATE tenant
SET notification_preferences = '{
  "rentReminders": true,
  "maintenanceUpdates": true,
  "propertyNotices": true,
  "emailNotifications": true,
  "smsNotifications": false
}'::jsonb
WHERE notification_preferences IS NULL;

-- ============================================================================
-- 5. Verification
-- ============================================================================

DO $$
BEGIN
  -- Verify column exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tenant'
      AND column_name = 'notification_preferences'
  ) THEN
    RAISE EXCEPTION 'notification_preferences column not created';
  END IF;

  -- Verify index exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'tenant'
      AND indexname = 'idx_tenant_notification_preferences'
  ) THEN
    RAISE EXCEPTION 'notification_preferences index not created';
  END IF;

  -- Verify constraint exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'tenant'
      AND constraint_name = 'notification_preferences_valid_structure'
  ) THEN
    RAISE EXCEPTION 'notification_preferences constraint not created';
  END IF;

  -- Verify all tenants have preferences set
  IF EXISTS (
    SELECT 1
    FROM tenant
    WHERE notification_preferences IS NULL
  ) THEN
    RAISE EXCEPTION 'Some tenants missing notification_preferences';
  END IF;

  RAISE NOTICE 'notification_preferences column successfully added and backfilled';
END $$;
