# ADR-0005: RPC Usage Patterns

## Status

Accepted

## Context

TenantFlow uses Supabase RPC functions for database operations that require:
- Atomicity (multiple operations in a single transaction)
- Performance optimization (aggregations, complex joins)
- Security (operations that need SECURITY DEFINER)
- Idempotency (event locking, deduplication)

Without clear guidelines, developers may:
1. **Overuse RPCs** - Simple CRUD operations don't need RPCs
2. **Underuse RPCs** - Complex operations executed as multiple queries cause N+1 problems
3. **Inconsistent patterns** - Different approaches for similar problems

## Decision

### When to Use RPCs

**DO use RPCs for:**

| Category | Examples | Rationale |
|----------|----------|-----------|
| Atomic multi-table operations | `sign_lease_and_check_activation`, `activate_lease_with_pending_subscription` | Single transaction, all-or-nothing |
| Complex aggregations | `get_dashboard_stats`, `get_billing_insights`, `get_maintenance_analytics` | Single round-trip, database computes aggregates |
| Performance-critical paths | `get_occupancy_trends_optimized`, `get_revenue_trends_optimized` | Optimized queries with proper indexing |
| Access control queries | `get_tenant_lease_ids`, `get_tenant_property_ids`, `get_user_plan_limits` | Security-critical, centralized logic |
| Idempotency/locking | `acquire_internal_event_lock`, `record_processed_stripe_event_lock` | Prevent duplicate processing |
| Batch operations | `delete_processed_events_batch`, `cleanup_orphaned_subscriptions` | Efficient bulk operations |

**DON'T use RPCs for:**

| Pattern | Use Instead | Rationale |
|---------|-------------|-----------|
| Simple CRUD | Direct queries | Adds unnecessary complexity |
| Single-table selects | Direct `.select()` | Supabase client handles this well |
| Operations needing client-side logic | Service layer | RPCs can't call external APIs |
| Highly dynamic queries | Query builder | RPCs have fixed signatures |

### RPC Inventory

**Dashboard & Analytics (7 functions):**
- `get_dashboard_stats` - Main dashboard metrics
- `get_dashboard_time_series` - Time-series data for charts
- `get_billing_insights` - Billing analytics
- `get_maintenance_analytics` - Maintenance metrics
- `get_occupancy_trends_optimized` - Occupancy over time
- `get_revenue_trends_optimized` - Revenue over time
- `get_property_performance_cached` - Property-level metrics

**Access Control (7 functions):**
- `get_tenant_lease_ids` - Leases accessible to tenant
- `get_tenant_property_ids` - Properties accessible to tenant
- `get_tenant_unit_ids` - Units accessible to tenant
- `get_tenants_by_owner` - Tenants for a property owner
- `get_tenants_with_lease_by_owner` - Tenants with lease details
- `check_user_feature_access` - Feature flag checks
- `get_user_plan_limits` - Subscription plan limits

**Atomic Business Logic (5 functions):**
- `sign_lease_and_check_activation` - Lease signing with activation check
- `activate_lease_with_pending_subscription` - Lease activation
- `acquire_internal_event_lock` - Distributed locking
- `record_processed_stripe_event_lock` - Stripe event idempotency
- `release_internal_event_lock` - Lock release

**Data Retrieval (6 functions):**
- `get_lease_with_details` - Lease with joined data
- `get_property_with_units` - Property with unit hierarchy
- `get_maintenance_request_details` - Request with history
- `get_payment_history` - Payment records with metadata
- `get_documents_by_entity` - Documents for any entity type
- `get_notifications_with_context` - Notifications with related data

**Cleanup & Maintenance (4 functions):**
- `delete_processed_events_batch` - Batch event cleanup
- `cleanup_orphaned_subscriptions` - Subscription maintenance
- `vacuum_stale_sessions` - Session cleanup
- `archive_completed_maintenance` - Maintenance archival

### RPC Service Features

```typescript
// Standard RPC call with retries
const result = await rpcService.rpc(client, 'get_dashboard_stats', {
  user_id: userId,
  date_range: '30d'
}, {
  maxAttempts: 3,           // Retry transient failures
  backoffMs: 500,           // Exponential backoff
  timeoutMs: 10_000         // 10s timeout
})

// Cached RPC call
const limits = await rpcService.rpc(client, 'get_user_plan_limits', {
  user_id: userId
}, {
  cache: {
    ttlMs: 5 * 60 * 1000    // 5 minute cache
  }
})
```

**Retry Behavior:**
- Retries on: Network errors, timeouts, 5xx errors
- No retry on: 4xx errors, validation failures, auth errors
- Exponential backoff: 500ms, 1000ms, 2000ms

**Caching:**
- In-memory cache with TTL
- Cache key: `rpc:${functionName}:${hash(args)}`
- Invalidation: Manual or TTL expiry

**Instrumentation:**
- `tenantflow_supabase_rpc_calls_total` - Call count by function/status
- `tenantflow_supabase_rpc_duration_seconds` - Latency histogram
- `tenantflow_supabase_rpc_cache_hits_total` - Cache effectiveness

### Creating New RPCs

**Checklist:**
1. [ ] Does this need atomicity? (multiple tables, all-or-nothing)
2. [ ] Is this performance-critical? (dashboard, reports)
3. [ ] Does this need SECURITY DEFINER? (bypass RLS intentionally)
4. [ ] Will this be called frequently? (caching candidate)

**Naming Convention:**
- `get_*` - Read operations returning data
- `check_*` - Boolean checks
- `create_*` / `update_*` / `delete_*` - Write operations
- `*_batch` - Bulk operations
- `*_with_*` - Operations returning joined data

**Template:**
```sql
create or replace function public.my_rpc_function(
  p_user_id uuid,
  p_other_param text
)
returns jsonb
language plpgsql
security definer  -- Only if bypassing RLS intentionally
set search_path = public
as $$
declare
  v_result jsonb;
begin
  -- Implementation
  return v_result;
end;
$$;

-- Grant to authenticated users
grant execute on function public.my_rpc_function to authenticated;

-- Add comment for documentation
comment on function public.my_rpc_function is
  'Purpose: Brief description. Called by: Service name.';
```

## Consequences

### Positive

- **Consistency:** Clear guidelines for when to use RPCs
- **Performance:** Complex operations optimized at database level
- **Reliability:** Retry logic handles transient failures
- **Observability:** Full metrics for RPC performance

### Negative

- **Learning curve:** Developers must understand RPC patterns
- **Testing complexity:** RPCs need integration tests against real database
- **Migration overhead:** Schema changes may require RPC updates

## Key Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20251101000000_base_schema.sql` | Core RPC definitions |
| `apps/backend/src/database/supabase-rpc.service.ts` | RPC client with retries/caching |
| `apps/backend/src/database/supabase-instrumentation.service.ts` | RPC metrics |

## Related Decisions

- ADR-0004: Supabase Client Patterns (defines client tiers)

## References

- [Supabase RPC Documentation](https://supabase.com/docs/guides/database/functions)
- [PostgreSQL PL/pgSQL](https://www.postgresql.org/docs/current/plpgsql.html)

---
*Date: 2026-01-18*
*Author: Claude (automated via Phase 19)*
