---
phase: 05-code-quality-type-safety
plan: 03
subsystem: query-keys
tags: [tanstack-query, query-keys, cache-invalidation, code-quality]
dependency_graph:
  requires: []
  provides: [blogKeys, settingsKeys, billingSettingsKeys, analyticsKeys]
  affects: [use-owner-dashboard, use-payments, use-lease, use-blogs, lease-form, properties-page, tenants-page]
tech_stack:
  added: []
  patterns: [queryOptions-factory, select-derived-hooks, hierarchical-query-keys]
key_files:
  created:
    - src/hooks/api/query-keys/analytics-keys.ts
  modified:
    - src/hooks/api/use-owner-dashboard.ts
    - src/hooks/api/use-payments.ts
    - src/hooks/api/use-lease.ts
    - src/hooks/api/use-blogs.ts
    - src/hooks/api/use-auth.ts
    - src/hooks/api/query-keys/lease-keys.ts
    - src/hooks/api/query-keys/maintenance-keys.ts
    - src/components/leases/lease-form.tsx
    - src/components/leases/wizard/lease-creation-wizard.tsx
    - src/components/leases/wizard/selection-step.tsx
    - src/components/maintenance/detail/maintenance-details.client.tsx
    - src/components/settings/general-settings.tsx
    - src/components/settings/billing-settings.tsx
    - src/app/(owner)/properties/page.tsx
    - src/app/(owner)/tenants/page.tsx
    - src/app/(owner)/settings/components/general-settings.tsx
    - src/app/(owner)/settings/components/billing-settings.tsx
    - src/app/auth/signout/page.tsx
    - src/providers/auth-provider.tsx
decisions:
  - Used select pattern on parent query to eliminate queryClient closure dependency in queryFn
  - Created analytics-keys.ts as shared RPC factory rather than duplicating in each hook
  - Blog query keys defined inline in use-blogs.ts (read-only hooks, no cross-component invalidation needed)
  - Settings query keys defined inline per component (isolated UI queries, no shared mutations)
  - Test file string literals left as-is (mocks with inline keys are acceptable)
  - tour.tsx eslint-disable suppressions noted as legitimate (upstream Dice UI pattern)
metrics:
  duration: ~15min
  completed: "2026-03-05"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 20
---

# Phase 5 Plan 03: Query Key Consolidation Summary

Consolidated all query key patterns to TanStack Query v5 queryOptions() factories, eliminated eslint-disable suppressions, deduplicated RPC calls, and ensured all entity mutations invalidate dashboard cache.

## Task 1: Create query key factories and fix eslint suppressions (41d82044b)

**Eliminated 8 eslint-disable @tanstack/query/exhaustive-deps suppressions** in use-owner-dashboard.ts by restructuring derived hooks. Previous pattern used `queryClient.ensureQueryData()` inside `queryFn` closures, creating a dependency the lint rule flagged. New pattern uses stable `select` functions on the shared `DASHBOARD_BASE_QUERY_OPTIONS` query -- `select` reads from cache without writing, so no `queryClient` dependency exists.

**Deduplicated get_revenue_trends_optimized RPC** (CODE-17). Created `analytics-keys.ts` with a shared `revenueTrendsQuery()` factory. Three lease analytics queries (duration, turnover, revenue) in `lease-keys.ts` and the dashboard financial revenue trends all now delegate to this single factory instead of each having inline RPC calls.

## Task 2: Replace string literal query keys and add dashboard invalidation (8791fc84d)

**Created blogKeys factory** in `use-blogs.ts` with `all`, `detail(slug)`, `category(category)`, `featured(limit)` keys. Replaced 4 string literal query keys.

**Replaced all string literal query keys in production code:**
- `lease-form.tsx`: `['leases']`, `['units']`, `['tenants']` to factory refs + added dashboard invalidation
- `properties/page.tsx`: `['properties']` to `propertyQueries.all()` + added dashboard invalidation
- `tenants/page.tsx`: `['tenants']` to `tenantQueries.all()` + added dashboard invalidation
- `use-lease.ts`: `['lease', id, 'signed-document']` to `leaseQueries.detail(id).queryKey` derived
- `use-auth.ts`: `['auth']` to `authKeys.all`
- `auth-provider.tsx`: `['auth']` to `authKeys.all`
- `signout/page.tsx`: `['auth', ...]` to `authKeys.all` derived
- `maintenance-details.client.tsx`: `['maintenance', id, 'expenses']` to `maintenanceQueries.detail(id).queryKey` derived
- `maintenance-keys.ts`: `['tenant-portal', 'maintenance']` to `maintenanceQueries.all()` derived
- `lease-creation-wizard.tsx`: `['properties', id]`, `['units', id]`, `['tenants', id]` to factory derived
- `selection-step.tsx`: `['properties', 'list']`, `['units', ...]`, `['tenants', ...]` to factory derived
- Settings components: `['user-profile']`, `['company-profile']`, `['payment-methods']` to inline key constants

**Added missing dashboard invalidation (CODE-04):**
- `use-payments.ts`: `useRecordManualPaymentMutation` now invalidates `ownerDashboardKeys.all`
- `lease-form.tsx`: Create path now invalidates `ownerDashboardKeys.all`
- `properties/page.tsx`: Delete mutation now invalidates `ownerDashboardKeys.all`
- `tenants/page.tsx`: Delete mutation now invalidates `ownerDashboardKeys.all`

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `pnpm typecheck` passes clean
- `pnpm lint` passes clean
- Zero `eslint-disable.*exhaustive-deps` in `src/hooks/api/`
- Zero `invalidateQueries({ queryKey: ['` string literals in production code
- All unit tests pass (99/99)
- All RLS integration tests pass (99/99)
