# Phase 19: Query Performance & RPC Consolidation - Context

**Created:** 2026-01-18
**Purpose:** Document research findings before planning

## Phase Goal (from Roadmap)

"Indexes, N+1 prevention, move complex ops to RPCs"

## Research Findings

### Current State Analysis

**N+1 Detection (Already Implemented):**
- `SupabaseInstrumentationService` tracks queries per request via CLS context
- NPLUSONE_THRESHOLD = 8 queries of same signature before warning
- QUERY_TOTAL_WARN_THRESHOLD = 40 queries per request
- Prometheus metric: `tenantflow_supabase_nplusone_detected_total`
- Full instrumentation via Proxy pattern on Supabase client

**RPC Functions (30+ Already Defined):**
Dashboard & Analytics:
- `get_dashboard_stats`, `get_dashboard_time_series`
- `get_billing_insights`, `get_maintenance_analytics`
- `get_occupancy_trends_optimized`, `get_revenue_trends_optimized`
- `get_property_performance_cached`, `get_property_performance_trends`

Access Control:
- `get_tenant_lease_ids`, `get_tenant_property_ids`, `get_tenant_unit_ids`
- `get_tenants_by_owner`, `get_tenants_with_lease_by_owner`
- `check_user_feature_access`, `get_user_plan_limits`

Business Logic:
- `sign_lease_and_check_activation` - atomic lease signing
- `activate_lease_with_pending_subscription` - lease activation
- `acquire_internal_event_lock`, `record_processed_stripe_event_lock` - idempotency

**Existing Indexes:**
Found in base_schema.sql and various migrations:
- Primary keys (automatic btree indexes)
- Foreign keys (need to verify indexes exist)
- Need to audit: Which frequently-queried columns lack indexes?

**Query Performance Infrastructure:**
- `QueryPerformanceInterceptor` - logs slow queries (>1s by default)
- `AppLogger` with structured logging
- Prometheus metrics for request duration

**N+1 Prevention Tests:**
- `tenant-query.service.n1.spec.ts` - tests nested joins for tenant queries
- `financial.service.n1.spec.ts` - tests batch queries for financial data

### Gaps Identified

1. **No Index Audit** - Need to verify indexes exist for FK columns and common WHERE clauses
2. **No RPC Pattern Documentation** - When to use RPCs vs direct queries unclear
3. **N+1 Detection Validation** - Metric exists but need to verify it's actively catching issues
4. **Missing Index on Hot Paths** - Leases by status, maintenance by priority, etc. may need indexes

### Constraints

From ADR-0004 (Phase 18):
- Admin client for webhooks/system ops (bypasses RLS)
- User client pool for authenticated requests (enforces RLS)
- RPC service with retries and caching available

From CONCERNS.md:
- "No Specific Performance Issues Detected" - Focus on prevention, not fixing
- Backend has 31% test coverage - any changes need tests

## Approach

Given the codebase already has strong query performance infrastructure:

1. **Audit, don't rebuild** - Verify existing patterns, don't replace them
2. **Document patterns** - Create ADR for RPC usage guidelines
3. **Index audit** - Check FK columns have indexes, add missing ones
4. **Validate detection** - Confirm N+1 detection catches real issues

## Scope Estimate

Single plan (similar to Phase 18 - mostly verification/documentation):
- Task 1: Audit database indexes for common query patterns
- Task 2: Review N+1 detection effectiveness
- Task 3: Create RPC patterns ADR

## Dependencies

- Phase 18 complete (ADR-0004 provides Supabase client context)
- No code changes expected unless index gaps found

## References

Key files for this phase:
- `apps/backend/src/database/supabase-instrumentation.service.ts`
- `apps/backend/src/interceptors/query-performance.interceptor.ts`
- `supabase/migrations/20251101000000_base_schema.sql`
- `apps/backend/src/modules/*/**.n1.spec.ts`
