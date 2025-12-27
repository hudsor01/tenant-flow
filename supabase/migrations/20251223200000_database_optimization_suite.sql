-- Migration: Database Optimization Suite (Simplified)
-- Purpose: Pre-production optimizations for TenantFlow
--
-- What's included:
--   1. Composite indexes for common query patterns
--   2. Full-text search with GIN index for properties
--   3. Data integrity triggers (updated_at, unit status sync)
--
-- What's NOT included (by design - uses existing tech stack):
--   - NO materialized views (TanStack Query handles caching)
--   - NO cron jobs for refresh (SSE + Supabase Realtime for real-time)
--   - NO redundant helper functions (backend services aggregate data)
--
-- The existing tech stack handles caching and real-time updates:
--   - TanStack Query: 1-15 minute staleTime for data caching
--   - SSE: Real-time notifications and updates
--   - Supabase Realtime: PostgreSQL LISTEN/NOTIFY
--   - Backend services: Data aggregation and business logic

-- ============================================================================
-- SECTION 1: COMPOSITE INDEXES
-- Based on query pattern analysis - optimizes common dashboard queries
-- ============================================================================

-- Properties: Sorted owner queries (dashboard, property list)
CREATE INDEX IF NOT EXISTS idx_properties_owner_created_desc
ON properties(owner_user_id, created_at DESC);

COMMENT ON INDEX idx_properties_owner_created_desc IS 'Optimizes sorted property list for owner dashboard';

-- Tenant invitations: Property + status filter
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_property_status
ON tenant_invitations(property_id, status);

COMMENT ON INDEX idx_tenant_invitations_property_status IS 'Optimizes tenant invitation lookups by property';

-- Rent payments: Lease + created_at for payment history
CREATE INDEX IF NOT EXISTS idx_rent_payments_lease_created_desc
ON rent_payments(lease_id, created_at DESC);

COMMENT ON INDEX idx_rent_payments_lease_created_desc IS 'Optimizes payment history queries';

-- Leases: Expiring soon queries (common dashboard query)
CREATE INDEX IF NOT EXISTS idx_leases_expiring_soon
ON leases(owner_user_id, end_date)
WHERE lease_status = 'active';

COMMENT ON INDEX idx_leases_expiring_soon IS 'Optimizes expiring lease dashboard queries';

-- Activity: User activity feed with time ordering
CREATE INDEX IF NOT EXISTS idx_activity_user_created_desc
ON activity(user_id, created_at DESC);

COMMENT ON INDEX idx_activity_user_created_desc IS 'Optimizes activity feed queries';

-- Notifications: Unread notifications for user
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON notifications(user_id, created_at DESC)
WHERE is_read = false;

COMMENT ON INDEX idx_notifications_user_unread IS 'Optimizes unread notification badge queries';

-- ============================================================================
-- SECTION 2: FULL-TEXT SEARCH
-- Enables fast property search instead of ILIKE scans
-- ============================================================================

-- Add search vector column
ALTER TABLE properties ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_properties_search_gin
ON properties USING gin(search_vector);

COMMENT ON INDEX idx_properties_search_gin IS 'Full-text search index for property name/address';

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_property_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.name, '') || ' ' ||
    COALESCE(NEW.address_line1, '') || ' ' ||
    COALESCE(NEW.address_line2, '') || ' ' ||
    COALESCE(NEW.city, '') || ' ' ||
    COALESCE(NEW.state, '') || ' ' ||
    COALESCE(NEW.postal_code, '')
  );
  RETURN NEW;
END;
$$;

-- Trigger to auto-update search vector on insert/update
DROP TRIGGER IF EXISTS properties_search_vector_trigger ON properties;
CREATE TRIGGER properties_search_vector_trigger
BEFORE INSERT OR UPDATE OF name, address_line1, address_line2, city, state, postal_code ON properties
FOR EACH ROW
EXECUTE FUNCTION update_property_search_vector();

-- Backfill existing properties search vector
UPDATE properties SET search_vector = to_tsvector('english',
  COALESCE(name, '') || ' ' ||
  COALESCE(address_line1, '') || ' ' ||
  COALESCE(address_line2, '') || ' ' ||
  COALESCE(city, '') || ' ' ||
  COALESCE(state, '') || ' ' ||
  COALESCE(postal_code, '')
) WHERE search_vector IS NULL;

-- Fast property search function using full-text index
CREATE OR REPLACE FUNCTION search_properties(
  p_user_id uuid,
  p_search_term text,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  address_line1 text,
  city text,
  state text,
  rank real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.address_line1,
    p.city,
    p.state,
    ts_rank(p.search_vector, plainto_tsquery('english', p_search_term)) as rank
  FROM properties p
  WHERE p.owner_user_id = p_user_id
    AND p.search_vector @@ plainto_tsquery('english', p_search_term)
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION search_properties(uuid, text, integer) TO authenticated;
COMMENT ON FUNCTION search_properties IS 'Fast full-text property search for owner';

-- ============================================================================
-- SECTION 3: DATA INTEGRITY TRIGGERS
-- Ensure data consistency across tables
-- ============================================================================

-- Auto-update updated_at column trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger to all major tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'properties', 'units', 'leases', 'tenants',
    'maintenance_requests', 'rent_payments', 'documents',
    'tenant_invitations', 'payment_methods', 'subscriptions'
  ])
  LOOP
    IF to_regclass(format('public.%I', tbl)) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END $$;

-- Trigger: Auto-update unit status when lease changes
CREATE OR REPLACE FUNCTION sync_unit_status_from_lease()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When lease becomes active, mark unit as occupied
  IF NEW.lease_status = 'active' AND (OLD IS NULL OR OLD.lease_status != 'active') THEN
    UPDATE units SET status = 'occupied' WHERE id = NEW.unit_id;
  END IF;

  -- When lease ends or terminates, mark unit as available (if no other active lease)
  IF NEW.lease_status IN ('ended', 'terminated') AND OLD.lease_status = 'active' THEN
    -- Check if there's another active lease for this unit
    IF NOT EXISTS (
      SELECT 1 FROM leases
      WHERE unit_id = NEW.unit_id
      AND id != NEW.id
      AND lease_status = 'active'
    ) THEN
      UPDATE units SET status = 'available' WHERE id = NEW.unit_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_unit_status_on_lease_change ON leases;
CREATE TRIGGER sync_unit_status_on_lease_change
AFTER INSERT OR UPDATE OF lease_status ON leases
FOR EACH ROW
EXECUTE FUNCTION sync_unit_status_from_lease();

COMMENT ON FUNCTION sync_unit_status_from_lease IS 'Automatically updates unit status when lease status changes';

-- Trigger: Log activity when lease signed
CREATE OR REPLACE FUNCTION log_lease_signature_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log owner signature
  IF NEW.owner_signed_at IS NOT NULL AND (OLD IS NULL OR OLD.owner_signed_at IS NULL) THEN
    INSERT INTO activity (user_id, activity_type, entity_type, entity_id, description, created_at)
    VALUES (
      NEW.owner_user_id,
      'lease_signed',
      'lease',
      NEW.id,
      'Owner signed lease agreement',
      NOW()
    );
  END IF;

  -- Log tenant signature
  IF NEW.tenant_signed_at IS NOT NULL AND (OLD IS NULL OR OLD.tenant_signed_at IS NULL) THEN
    INSERT INTO activity (user_id, activity_type, entity_type, entity_id, description, created_at)
    SELECT
      t.user_id,
      'lease_signed',
      'lease',
      NEW.id,
      'Tenant signed lease agreement',
      NOW()
    FROM tenants t
    WHERE t.id = NEW.primary_tenant_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_lease_signature ON leases;
CREATE TRIGGER log_lease_signature
AFTER UPDATE OF owner_signed_at, tenant_signed_at ON leases
FOR EACH ROW
EXECUTE FUNCTION log_lease_signature_activity();

-- ============================================================================
-- SECTION 4: INDEX DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX idx_properties_owner_created_desc IS 'Composite index for sorted property list queries by owner';
COMMENT ON INDEX idx_tenant_invitations_property_status IS 'Composite index for invitation lookups';
COMMENT ON INDEX idx_rent_payments_lease_created_desc IS 'Composite index for payment history';
COMMENT ON INDEX idx_leases_expiring_soon IS 'Partial index for expiring lease dashboard queries';
COMMENT ON INDEX idx_activity_user_created_desc IS 'Composite index for user activity feed';
COMMENT ON INDEX idx_notifications_user_unread IS 'Partial index for unread notification counts';

-- Summary of optimizations
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Database Optimization Suite Applied';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Indexes Added: 7 (including 1 GIN for full-text search)';
  RAISE NOTICE 'Triggers: 3 (updated_at, unit status sync, lease signature)';
  RAISE NOTICE 'Functions: 2 (search_properties, update helpers)';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Real-time handled by existing tech stack:';
  RAISE NOTICE '  - TanStack Query: Client-side caching (1-15 min staleTime)';
  RAISE NOTICE '  - SSE: Real-time notifications';
  RAISE NOTICE '  - Supabase Realtime: PostgreSQL LISTEN/NOTIFY';
  RAISE NOTICE '  - Backend services: Data aggregation';
  RAISE NOTICE '============================================';
END $$;
