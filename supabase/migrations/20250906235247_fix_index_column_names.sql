-- Fix database optimization RPC function with correct column names
-- Following CLAUDE.md principle: Use actual schema, not assumptions

CREATE OR REPLACE FUNCTION create_performance_indexes()
RETURNS JSON AS $$
DECLARE
  result_messages TEXT[] := '{}';
  error_occurred BOOLEAN := FALSE;
  current_message TEXT;
BEGIN
  -- Index on Property.ownerId for faster user property lookups (RLS queries)
  BEGIN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_property_owner_id ON "property" ("ownerId")';
    result_messages := array_append(result_messages, 'SUCCESS: idx_property_owner_id created');
  EXCEPTION WHEN OTHERS THEN
    result_messages := array_append(result_messages, 'ERROR: idx_property_owner_id - ' || SQLERRM);
    error_occurred := TRUE;
  END;

  -- Index on Tenant.userId for faster tenant lookups
  BEGIN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tenant_user_id ON "tenant" ("userId")';
    result_messages := array_append(result_messages, 'SUCCESS: idx_tenant_user_id created');
  EXCEPTION WHEN OTHERS THEN
    result_messages := array_append(result_messages, 'ERROR: idx_tenant_user_id - ' || SQLERRM);
    error_occurred := TRUE;
  END;

  -- Index on Lease.tenantId for faster lease lookups by tenant
  BEGIN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_lease_tenant_id ON "lease" ("tenantId")';
    result_messages := array_append(result_messages, 'SUCCESS: idx_lease_tenant_id created');
  EXCEPTION WHEN OTHERS THEN
    result_messages := array_append(result_messages, 'ERROR: idx_lease_tenant_id - ' || SQLERRM);
    error_occurred := TRUE;
  END;

  -- Index on Unit.propertyId for faster unit lookups by property
  BEGIN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_unit_property_id ON "unit" ("propertyId")';
    result_messages := array_append(result_messages, 'SUCCESS: idx_unit_property_id created');
  EXCEPTION WHEN OTHERS THEN
    result_messages := array_append(result_messages, 'ERROR: idx_unit_property_id - ' || SQLERRM);
    error_occurred := TRUE;
  END;

  -- Index on Subscription.userId for subscription lookups
  BEGIN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_subscription_user_id ON "subscription" ("userId")';
    result_messages := array_append(result_messages, 'SUCCESS: idx_subscription_user_id created');
  EXCEPTION WHEN OTHERS THEN
    result_messages := array_append(result_messages, 'ERROR: idx_subscription_user_id - ' || SQLERRM);
    error_occurred := TRUE;
  END;

  -- Index on MaintenanceRequest.unitId for maintenance lookups by unit
  BEGIN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_maintenance_unit_id ON "maintenance_request" ("unitId")';
    result_messages := array_append(result_messages, 'SUCCESS: idx_maintenance_unit_id created');
  EXCEPTION WHEN OTHERS THEN
    result_messages := array_append(result_messages, 'ERROR: idx_maintenance_unit_id - ' || SQLERRM);
    error_occurred := TRUE;
  END;

  -- Return results as JSON
  RETURN json_build_object(
    'success', NOT error_occurred,
    'results', result_messages,
    'total_operations', array_length(result_messages, 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;