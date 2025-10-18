-- Database optimization RPC function
-- Following CLAUDE.md principle: all database logic in RPC functions, not in application layer

-- Create indexes for better query performance
CREATE OR REPLACE FUNCTION create_performance_indexes()
RETURNS JSON AS $$
DECLARE
  result_messages TEXT[] := '{}';
  error_occurred BOOLEAN := FALSE;
  current_message TEXT;
BEGIN
  -- Index on Property.userId for faster user property lookups (RLS queries)
  BEGIN
    EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_property_user_id ON "property" ("userId")';
    result_messages := array_append(result_messages, 'SUCCESS: idx_property_user_id created');
  EXCEPTION WHEN OTHERS THEN
    result_messages := array_append(result_messages, 'ERROR: idx_property_user_id - ' || SQLERRM);
    error_occurred := TRUE;
  END;

  -- Index on Tenant.userId for faster tenant lookups
  BEGIN
    EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_user_id ON "tenant" ("userId")';
    result_messages := array_append(result_messages, 'SUCCESS: idx_tenant_user_id created');
  EXCEPTION WHEN OTHERS THEN
    result_messages := array_append(result_messages, 'ERROR: idx_tenant_user_id - ' || SQLERRM);
    error_occurred := TRUE;
  END;

  -- Index on Lease.tenantId for faster lease lookups by tenant
  BEGIN
    EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lease_tenant_id ON "lease" ("tenantId")';
    result_messages := array_append(result_messages, 'SUCCESS: idx_lease_tenant_id created');
  EXCEPTION WHEN OTHERS THEN
    result_messages := array_append(result_messages, 'ERROR: idx_lease_tenant_id - ' || SQLERRM);
    error_occurred := TRUE;
  END;

  -- Index on Unit.propertyId for faster unit lookups by property
  BEGIN
    EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unit_property_id ON "unit" ("propertyId")';
    result_messages := array_append(result_messages, 'SUCCESS: idx_unit_property_id created');
  EXCEPTION WHEN OTHERS THEN
    result_messages := array_append(result_messages, 'ERROR: idx_unit_property_id - ' || SQLERRM);
    error_occurred := TRUE;
  END;

  -- Index on Subscription.userId for subscription lookups
  BEGIN
    EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_user_id ON "subscription" ("userId")';
    result_messages := array_append(result_messages, 'SUCCESS: idx_subscription_user_id created');
  EXCEPTION WHEN OTHERS THEN
    result_messages := array_append(result_messages, 'ERROR: idx_subscription_user_id - ' || SQLERRM);
    error_occurred := TRUE;
  END;

  -- Index on MaintenanceRequest.propertyId for maintenance lookups
  BEGIN
    EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_property_id ON "maintenance_request" ("propertyId")';
    result_messages := array_append(result_messages, 'SUCCESS: idx_maintenance_property_id created');
  EXCEPTION WHEN OTHERS THEN
    result_messages := array_append(result_messages, 'ERROR: idx_maintenance_property_id - ' || SQLERRM);
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

-- Get database performance statistics
CREATE OR REPLACE FUNCTION get_database_performance_stats()
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'index_usage', (
        SELECT json_agg(
          json_build_object(
            'schemaname', schemaname,
            'tablename', tablename,
            'indexname', indexname,
            'idx_scan', idx_scan,
            'idx_tup_read', idx_tup_read,
            'idx_tup_fetch', idx_tup_fetch
          )
        )
        FROM pg_stat_user_indexes 
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC
        LIMIT 20
      ),
      'table_stats', (
        SELECT json_agg(
          json_build_object(
            'schemaname', schemaname,
            'tablename', tablename,
            'seq_scan', seq_scan,
            'seq_tup_read', seq_tup_read,
            'idx_scan', idx_scan,
            'idx_tup_fetch', idx_tup_fetch,
            'n_tup_ins', n_tup_ins,
            'n_tup_upd', n_tup_upd,
            'n_tup_del', n_tup_del
          )
        )
        FROM pg_stat_user_tables 
        WHERE schemaname = 'public'
        ORDER BY seq_scan + idx_scan DESC
        LIMIT 10
      ),
      'cache_hit_ratio', (
        SELECT CASE 
          WHEN (sum(heap_blks_hit) + sum(heap_blks_read)) = 0 THEN 0
          ELSE ROUND(
            (sum(heap_blks_hit)::float / (sum(heap_blks_hit) + sum(heap_blks_read))) * 100, 
            2
          )
        END
        FROM pg_statio_user_tables
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;