# RLS Performance Benchmarking Guide

## ⚠️ CRITICAL: Circular Dependency Issue

**Migration `20251213130000` DOES NOT properly fix the circular dependency!**

The migration creates a cycle:
1. `leases_select` → reads `lease_tenants` → triggers `lease_tenants_select`
2. `lease_tenants_select` → reads `leases` → triggers `leases_select` again
3. → **Infinite recursion!**

**Proper fix**: Migration `20251213140000_fix_rls_circular_dependency_properly.sql`
- Uses `SECURITY DEFINER` functions to bypass RLS within policy checks
- Breaks recursion cycle by preventing nested RLS evaluations

## Overview
This document provides guidance for benchmarking Row Level Security (RLS) policies after proper fix migration `20251213140000_fix_rls_circular_dependency_properly.sql`.

## Migration Context

**Previous Approach**: Function-based RLS policies
```sql
-- Old policy used helper functions
CREATE POLICY leases_select ON leases FOR SELECT TO authenticated
USING (
  id IN (SELECT get_tenant_lease_ids())
);
```

**New Approach**: Inlined subqueries
```sql
-- New policy uses inlined subqueries
CREATE POLICY leases_select ON leases FOR SELECT TO authenticated
USING (
  (property_owner_id = public.get_current_property_owner_id()) OR
  (id IN (
    SELECT lt.lease_id
    FROM public.lease_tenants lt
    WHERE lt.tenant_id = public.get_current_tenant_id()
  ))
);
```

## Performance Considerations

### Potential Benefits of Inlined Subqueries
1. **Query Plan Optimization**: PostgreSQL can inline and optimize subqueries
2. **Reduced Function Call Overhead**: No function invocation cost
3. **Better Index Utilization**: Planner sees full query structure

### Potential Drawbacks
1. **Query Plan Cache**: May reduce plan reusability
2. **Complexity**: More complex EXPLAIN output

## Benchmarking Process

### 1. Setup Test Data

```sql
-- Create representative dataset
-- Target: 1000 properties, 5000 units, 10000 leases, 15000 lease_tenants

BEGIN;

-- Insert test data (use generate_series for scale)
INSERT INTO property_owners (email, name)
SELECT
  'owner_' || i || '@test.com',
  'Test Owner ' || i
FROM generate_series(1, 100) i;

INSERT INTO properties (property_owner_id, name, address, city, state, zip)
SELECT
  (SELECT id FROM property_owners ORDER BY random() LIMIT 1),
  'Property ' || i,
  i || ' Test Street',
  'Austin',
  'TX',
  '78701'
FROM generate_series(1, 1000) i;

-- Continue with units, tenants, leases, lease_tenants...

COMMIT;
```

### 2. Run EXPLAIN ANALYZE

```sql
-- Test as property owner
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"property_owner_id": "<test-owner-id>"}';

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM leases WHERE property_owner_id = '<test-owner-id>';
```

Expected output:
```
Seq Scan on public.leases  (cost=0.00..XXX rows=YYY width=ZZZ) (actual time=0.XXX..Y.ZZZ rows=N loops=1)
  Filter: (property_owner_id = public.get_current_property_owner_id())
  Buffers: shared hit=X
Planning Time: X.XXX ms
Execution Time: Y.ZZZ ms
```

### 3. Compare Query Plans

Run both old (function-based) and new (inlined) approaches and compare:

| Metric | Old (Functions) | New (Inlined) | Delta |
|--------|----------------|---------------|-------|
| Planning Time | ? ms | ? ms | ? |
| Execution Time | ? ms | ? ms | ? |
| Rows Returned | N | N | Same |
| Buffers Hit | X | Y | ? |
| Total Cost | C1 | C2 | ? |

### 4. Load Testing

```bash
# Using pgbench or similar tool
pgbench -c 10 -j 2 -T 60 -f lease_select_benchmark.sql
```

Sample `lease_select_benchmark.sql`:
```sql
\set owner_id random(1, 100)
SELECT * FROM leases
WHERE property_owner_id IN (
  SELECT id FROM property_owners OFFSET :owner_id LIMIT 1
);
```

## Acceptable Performance Thresholds

Based on integration tests and production requirements:

| Query Type | Max Execution Time | Notes |
|------------|-------------------|-------|
| Single lease SELECT | < 50ms | Individual record lookup |
| Owner's leases SELECT | < 200ms | ~100 leases per owner avg |
| Tenant's leases SELECT | < 100ms | ~2-3 leases per tenant avg |
| Joined queries (leases + lease_tenants) | < 500ms | Complex multi-table |

## Monitoring in Production

### Key Metrics to Track

1. **Query Performance**:
   ```sql
   -- Use pg_stat_statements
   SELECT
     query,
     mean_exec_time,
     stddev_exec_time,
     calls
   FROM pg_stat_statements
   WHERE query LIKE '%leases%'
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

2. **RLS Policy Impact**:
   ```sql
   -- Check policy execution counts
   SELECT
     schemaname,
     tablename,
     policyname,
     qual
   FROM pg_policies
   WHERE tablename IN ('leases', 'lease_tenants');
   ```

### Alert Thresholds

- **Warning**: Execution time > 100ms for single record queries
- **Critical**: Execution time > 500ms or timeout errors
- **Action**: Consider adding indexes on frequently filtered columns

## Index Recommendations

Ensure these indexes exist:

```sql
-- Critical for RLS performance
CREATE INDEX IF NOT EXISTS idx_leases_property_owner_id
  ON leases(property_owner_id);

CREATE INDEX IF NOT EXISTS idx_lease_tenants_tenant_id
  ON lease_tenants(tenant_id);

CREATE INDEX IF NOT EXISTS idx_lease_tenants_lease_id
  ON lease_tenants(lease_id);

-- Composite for common queries
CREATE INDEX IF NOT EXISTS idx_leases_owner_status
  ON leases(property_owner_id, lease_status);
```

## Rollback Plan

If performance degrades:

```sql
-- Rollback to function-based approach
BEGIN;

DROP POLICY IF EXISTS leases_select ON public.leases;
DROP POLICY IF EXISTS lease_tenants_select ON public.lease_tenants;

-- Restore old function-based policies
CREATE POLICY leases_select ON leases FOR SELECT TO authenticated
USING (
  (property_owner_id = public.get_current_property_owner_id()) OR
  (id IN (SELECT get_tenant_lease_ids()))
);

CREATE POLICY lease_tenants_select ON lease_tenants FOR SELECT TO authenticated
USING (
  (tenant_id = public.get_current_tenant_id()) OR
  (id IN (SELECT get_owner_lease_tenant_ids()))
);

COMMIT;
```

## Benchmark Results (To Be Filled)

### Test Environment
- **Database**: Supabase (PostgreSQL 15.x)
- **Dataset Size**: ___ properties, ___ leases, ___ tenants
- **Test Date**: ___

### Results

| Test Case | Old Policy | New Policy | Improvement |
|-----------|-----------|-----------|-------------|
| Owner reads own leases (100 rows) | ___ ms | ___ ms | ___% |
| Tenant reads assigned leases (2 rows) | ___ ms | ___ ms | ___% |
| Complex joined query | ___ ms | ___ ms | ___% |

### Conclusion

_[To be filled after benchmarking]_

- ✅ Performance meets SLA requirements
- ✅ No circular dependency issues
- ✅ Query plans are optimized
- ⚠️ Monitor specific query pattern: ___

## References

- Migration: `20251213130000_fix_rls_circular_dependency.sql`
- Tests: `apps/backend/test/integration/rls/lease-circular-dependency.integration.spec.ts`
- PostgreSQL RLS Docs: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
