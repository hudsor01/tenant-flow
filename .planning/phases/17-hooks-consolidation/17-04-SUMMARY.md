---
phase: 17-hooks-consolidation
plan: 04
subsystem: components
tags: [useSuspenseQuery, tanstack-query, suspense, code-consolidation]
dependency_graph:
  requires: [17-01]
  provides: [suspense-query-pattern]
  affects: [inspection-detail, maintenance-details, tenant-details, tenant-edit-form, payment-methods]
tech_stack:
  added: []
  patterns: [useSuspenseQuery-in-suspense-boundaries]
key_files:
  created: []
  modified:
    - src/components/inspections/inspection-detail.client.tsx
    - src/components/maintenance/detail/maintenance-details.client.tsx
    - src/app/(tenant)/tenant/tenant-details.client.tsx
    - src/app/(tenant)/tenant/tenant-edit-form.client.tsx
    - src/app/(tenant)/tenant/payments/methods/tenant-payment-methods.client.tsx
    - src/app/(owner)/payments/methods/payment-methods-list.client.tsx
    - src/components/maintenance/__tests__/maintenance-details.test.tsx
decisions:
  - "Components with conditional queries (enabled/skipToken) kept as useQuery -- useSuspenseQuery does not support enabled"
  - "Mixed query components (maintenance-details) use both useQuery and useSuspenseQuery in same component"
  - "MaintenanceViewClient NOT converted -- parent page renders directly without Suspense boundary"
  - "AcceptInviteContent NOT converted -- conditional query based on URL searchParams, custom loading/error UI"
  - "Obsolete loading/error tests deleted from maintenance-details.test.tsx -- those states now handled by Suspense/ErrorBoundary"

requirements-completed: [MOD-02]

metrics:
  duration: 45min
  completed: "2026-03-08"
---

# Phase 17 Plan 04: useSuspenseQuery Conversion Summary

Converted 6 Suspense-wrapped data-fetching components from useQuery to useSuspenseQuery, removing loading/error boilerplate and narrowing data types to non-optional.

## One-liner

6 Suspense-wrapped components converted to useSuspenseQuery with loading/error boilerplate removed

## What Was Done

### Task 1: Owner-side Suspense children (3 components from prior session)

Three analytics components were converted in the prior session:
- **PropertyInsightsSection** -- useSuspenseQuery for property insights
- **LeaseInsightsSection** -- useSuspenseQuery for lease insights
- **MaintenanceInsightsSection** -- useSuspenseQuery for maintenance insights

### Task 2: Remaining components (6 components this session)

1. **InspectionDetailClient** (`inspection-detail.client.tsx`) -- Converted from `useInspection(id)` wrapper to direct `useSuspenseQuery(inspectionQueries.detailQuery(id))`. Removed Skeleton import, loading skeleton block, error guard block.

2. **MaintenanceDetails** (`maintenance-details.client.tsx`) -- Mixed conversion: 3 of 4 queries converted to useSuspenseQuery (`maintenanceQueries.detail(id)`, `propertyQueries.list()`, `unitQueries.list()`). Expenses query kept as useQuery (has `enabled: !!id`). Removed loading skeleton and error card blocks.

3. **TenantDetailsClient** (`tenant-details.client.tsx`) -- Converted `useQuery(tenantQueries.withLease(id))` to useSuspenseQuery. Removed isLoading/isError destructuring, TenantSkeleton import, loading/error return blocks.

4. **TenantEditFormClient** (`tenant-edit-form.client.tsx`) -- Converted `useQuery(tenantQueries.detail(id))` to useSuspenseQuery. Removed `isLoading`/`error` props from CardLayout.

5. **TenantPaymentMethods** (`tenant-payment-methods.client.tsx`) -- Converted from `usePaymentMethods()` wrapper to `useSuspenseQuery(paymentMethodsQueries.list())`. Removed loading/error blocks.

6. **PaymentMethodsList** (`payment-methods-list.client.tsx`) -- Same pattern as tenant version. Converted from `usePaymentMethods()` to `useSuspenseQuery(paymentMethodsQueries.list())`.

### Test cleanup

- **maintenance-details.test.tsx** -- Removed 3 obsolete tests ("shows loading skeleton", "displays error message", "provides go back button on error") and all unused test infrastructure (mocks, wrapper, imports). 13 pure logic tests remain.

### Components intentionally NOT converted

- **MaintenanceViewClient** -- Parent `maintenance/page.tsx` renders directly without Suspense boundary
- **AcceptInviteContent** -- Conditional query (code from URL searchParams can be null), custom loading/error UI

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed obsolete loading/error tests from maintenance-details.test.tsx**
- **Found during:** Test verification after useSuspenseQuery conversion
- **Issue:** 3 tests checked for loading skeleton and error card UI that no longer exists
- **Fix:** Deleted the obsolete describe blocks and cleaned up all unused imports/mocks
- **Files modified:** src/components/maintenance/__tests__/maintenance-details.test.tsx

## Verification Results

- `pnpm typecheck` -- passes clean (0 errors)
- `pnpm test:unit` -- 1412 tests pass (3 obsolete tests removed)
- `pnpm lint` -- no new errors
- All 6 parent pages confirmed to have `<Suspense>` boundaries wrapping converted components

## Decisions Made

1. **Mixed useQuery/useSuspenseQuery in single component:** When a component has multiple queries and some have `enabled` conditions, convert only the unconditional ones. Both hooks coexist fine.

2. **Wrapper hooks eliminated:** Components that used wrapper hooks (useInspection, usePaymentMethods) were converted to call useSuspenseQuery directly with the query factory, reducing indirection.

3. **Empty state blocks preserved:** PaymentMethodsList and TenantPaymentMethods keep their empty state UI (checking `sortedMethods.length === 0`) -- this is valid data-dependent rendering, not loading state.
