---
phase: 53-analytics-reports-tenant-portal-rpcs-pg-graphql
plan: 01
subsystem: api
tags: [supabase, rpc, tanstack-query, analytics, dashboard]

# Dependency graph
requires:
  - phase: 52-operations-crud-migration-maintenance-vendors-inspections
    provides: PostgREST migration pattern established for all CRUD hooks

provides:
  - use-owner-dashboard.ts using supabase.rpc() for all 10+ analytics queries
  - use-analytics.ts using supabase.rpc() for all 7 analytics page queries
  - property-keys.ts analytics stubs wired to real RPCs (occupancy, financial, maintenance)
  - lease-keys.ts analytics stubs wired to real RPCs (performance, duration, turnover, revenue)

affects:
  - phase 54 (payments — same RPC pattern)
  - any component consuming use-owner-dashboard or use-analytics hooks

# Tech tracking
tech-stack:
  added: []
  patterns:
    - supabase.rpc() with userId from auth.getUser() inside queryFn
    - 2min staleTime / 10min gcTime for all analytics queries
    - handlePostgrestError on all rpc error results

key-files:
  created:
    - .planning/phases/53-analytics-reports-tenant-portal-rpcs-pg-graphql/53-01-SUMMARY.md
  modified:
    - apps/frontend/src/hooks/api/use-owner-dashboard.ts
    - apps/frontend/src/hooks/api/use-analytics.ts
    - apps/frontend/src/hooks/api/query-keys/property-keys.ts
    - apps/frontend/src/hooks/api/query-keys/lease-keys.ts

key-decisions:
  - "get_user_dashboard_activities takes p_user_id as text (not uuid) — confirmed from migration signature"
  - "fetchOwnerDashboardData calls 9 RPCs in parallel via Promise.all for unified dashboard payload"
  - "leasePageData uses get_occupancy_trends_optimized shaped into LeaseAnalyticsPageData with defaults — no dedicated lease analytics RPC exists"
  - "ownerPaymentSummary maps get_billing_insights to OwnerPaymentSummaryResponse with runtime type guards"
  - "property-keys.ts and lease-keys.ts analytics return type kept as unknown/Record<string,unknown> — callers cast as needed"
  - "SSE polling comments removed — no SSE in new architecture"
  - "QUERY_CACHE_TIMES references replaced with inline 2min/10min values per CONTEXT.md locked decision"

patterns-established:
  - "RPC pattern: const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error('Not authenticated')"
  - "All analytics queryFns: staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000"
  - "Error handling: if (error) handlePostgrestError(error, 'analytics')"

requirements-completed:
  - REPT-01

# Metrics
duration: 35min
completed: 2026-02-21
---

# Phase 53-01: Analytics & Dashboard Hooks Migration Summary

**Owner dashboard and analytics hooks migrated from NestJS apiRequest to supabase.rpc() with userId from auth.getUser(), wiring 10+ real analytics RPCs**

## Performance

- **Duration:** 35 min
- **Started:** 2026-02-21T12:00:00Z
- **Completed:** 2026-02-21T12:35:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `use-owner-dashboard.ts`: All 10+ queryFns replaced with supabase.rpc() calls — stats, activity, time-series, metric trends, property performance, billing insights, revenue trends, maintenance analytics, occupancy trends
- `use-analytics.ts`: All 7 analyticsQueries replaced with supabase.rpc() calls — financial, lease, maintenance, occupancy, overview (parallel), property performance, payment summary
- `property-keys.ts`: Three analytics stubs wired to get_occupancy_trends_optimized, get_financial_overview, get_maintenance_analytics
- `lease-keys.ts`: Four analytics stubs wired to get_property_performance_analytics and get_revenue_trends_optimized

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate use-owner-dashboard.ts to supabase.rpc()** - (feat: migrate owner dashboard hooks to supabase.rpc())
2. **Task 2: Migrate use-analytics.ts and wire analytics stubs** - (feat: migrate analytics hooks and wire property/lease analytics stubs to supabase.rpc())

## Files Created/Modified
- `apps/frontend/src/hooks/api/use-owner-dashboard.ts` - All apiRequest calls replaced with supabase.rpc(); userId from auth.getUser(); 2min/10min cache policy
- `apps/frontend/src/hooks/api/use-analytics.ts` - All apiRequest calls replaced with supabase.rpc(); userId from auth.getUser()
- `apps/frontend/src/hooks/api/query-keys/property-keys.ts` - Analytics stubs replaced with real RPC calls (occupancy, financial, maintenance)
- `apps/frontend/src/hooks/api/query-keys/lease-keys.ts` - Analytics stubs replaced with real RPC calls (performance, duration, turnover, revenue)

## Decisions Made
- `get_user_dashboard_activities` takes `p_user_id` as `text` not `uuid` — confirmed from DB migration signature, passed as-is (supabase.rpc casts automatically)
- `fetchOwnerDashboardData` launches 9 parallel RPCs via Promise.all — critical/mandatory errors (stats, activity) call handlePostgrestError; metric trend/time-series errors are silently defaulted to null/[]
- No dedicated lease analytics RPC exists — `leasePageData` uses `get_occupancy_trends_optimized` shaped into `LeaseAnalyticsPageData` with zero-value defaults
- `ownerPaymentSummary` maps `get_billing_insights` to `OwnerPaymentSummaryResponse` using runtime `typeof` guards on each field

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All analytics hooks are now on supabase.rpc() — ready for Phase 53-02 (tenant portal RPCs / pg_graphql)
- No blockers

---
*Phase: 53-analytics-reports-tenant-portal-rpcs-pg-graphql*
*Completed: 2026-02-21*
