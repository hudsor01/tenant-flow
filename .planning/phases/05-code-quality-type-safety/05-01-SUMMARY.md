---
phase: 05-code-quality-type-safety
plan: 01
subsystem: hooks-api
tags: [query-keys, reports, financials, dead-code, code-quality]
dependency_graph:
  requires: []
  provides: [report-keys, financial-keys, real-report-hooks, real-financial-hooks]
  affects: [reports-pages, financials-pages, provider-tree]
tech_stack:
  added: []
  patterns: [query-options-factory, parallel-rpc, real-table-queries]
key_files:
  created:
    - src/hooks/api/query-keys/report-keys.ts
    - src/hooks/api/query-keys/financial-keys.ts
    - src/hooks/api/__tests__/use-reports.test.tsx
    - src/hooks/api/__tests__/use-financials.test.tsx
  modified:
    - src/hooks/api/use-reports.ts
    - src/hooks/api/use-financials.ts
    - src/hooks/api/use-profile.ts
    - src/hooks/api/__tests__/use-financial-overview.test.ts
    - src/hooks/api/__tests__/use-expenses.test.ts
    - src/components/providers.tsx
    - src/components/ui/bento-grid.tsx
    - src/app/(owner)/reports/generate/page.tsx
    - src/app/(owner)/documents/templates/components/template-definition.ts
    - package.json
  deleted:
    - src/providers/sse-provider.tsx
    - src/providers/sse-context.ts
    - src/providers/use-sse.ts
    - src/app/(owner)/settings/components/general-settings.tsx
decisions:
  - Used parallel Promise.all for financial RPCs (dashboard_stats + expense_summary) for faster queries
  - Re-exported reportsKeys/reportsQueries from use-reports.ts for backwards compatibility
  - Kept use-financials.ts expense hooks inline rather than extracting to financial-keys.ts (expense CRUD uses from() not rpc())
metrics:
  duration: 6m
  completed: 2026-03-05
  tasks: 3/3
  files_changed: 14
  files_created: 4
  files_deleted: 4
---

# Phase 05 Plan 01: Stub Hook Elimination & Dead Code Removal Summary

Real Supabase queries replacing all stub implementations in report and financial hooks, with parallel RPC patterns, new query key factories, unit tests, and dead code cleanup.

## Task 1: Rewrite report and financial stub hooks with real implementations

**Commit:** `8bc094852`

### Changes

- Created `report-keys.ts` (517 lines) with `reportKeys` and `reportQueries` factories:
  - `list()` queries real `from('reports')` table with `{ count: 'exact' }` pagination
  - `runs()` queries real `from('report_runs')` table
  - `monthlyRevenue()` uses `get_revenue_trends_optimized` RPC
  - `paymentAnalytics()` uses `get_billing_insights` RPC with correct `owner_id_param`
  - `occupancyMetrics()` uses `get_occupancy_trends_optimized` with `p_owner_id`
  - `financial()`, `yearEnd()`, `report1099()` use parallel Promise.all RPC calls
  - `maintenance()` uses `get_maintenance_analytics` with `user_id` param
  - `properties()` uses `get_property_performance_analytics`
  - `tenants()` uses parallel `get_dashboard_stats` + `get_occupancy_trends_optimized`

- Created `financial-keys.ts` (397 lines) with `financialKeys` and `financialQueries` factories:
  - `overview()` uses parallel `get_dashboard_stats` + `get_expense_summary`
  - `monthly()` uses `get_revenue_trends_optimized` with `p_months: 12`
  - `expenseSummary()` uses `get_expense_summary`
  - `incomeStatement()`, `cashFlow()`, `balanceSheet()` use parallel RPC calls
  - `taxDocuments()` uses parallel `get_dashboard_stats` + `get_expense_summary`

- Rewrote `use-reports.ts`: Imports from `report-keys.ts`, uses real `from('reports')` for delete mutation, zero fake table casts.

- Rewrote `use-financials.ts`: Delegates overview/monthly/expense/statement queries to `financial-keys.ts`. Expense CRUD hooks remain inline with real `from('expenses')`.

- Removed all `TODO(phase-57)` references from: use-reports.ts, use-financials.ts, use-expenses.test.ts, reports/generate/page.tsx, template-definition.ts

- Fixed pre-existing `use-profile.ts` mapper bug: null `full_name`/`status` fields and extra `stripe_customer_id` property not in UserProfile type

## Task 2: Create unit tests for report and financial hooks

**Commit:** `f8dd61d7e`

### Changes

- Created `use-reports.test.tsx` (12 tests): Tests for useMonthlyRevenue (RPC params, empty user), usePaymentAnalytics (billing insights), useOccupancyMetrics (trends RPC), useFinancialReport (parallel RPCs), useMaintenanceReport, useYearEndSummary, use1099Summary, and reportsKeys factory

- Created `use-financials.test.tsx` (9 tests): Tests for useIncomeStatement (parallel RPCs, profit margin calc), useCashFlow (operating activities), useBalanceSheet (3-way parallel RPC), useTaxDocuments (schedule E mapping, error handling), and financialKeys/expenseKeys factories

- Updated `use-financial-overview.test.ts`: Mocks `getCachedUser` instead of `auth.getUser`, provides dual RPC responses for overview's parallel calls

## Task 3: Remove dead code

**Commit:** `c1b29c3c4`

### Changes

- Removed SseProvider from providers.tsx JSX tree and deleted 3 SSE files: `sse-provider.tsx`, `sse-context.ts`, `use-sse.ts`
- Deleted duplicate GeneralSettings at `src/app/(owner)/settings/components/general-settings.tsx`
- Replaced `@radix-ui/react-icons` with `lucide-react` in `bento-grid.tsx` (ArrowRightIcon -> ArrowRight)
- Removed `@radix-ui/react-icons` package dependency

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed use-profile.ts TypeScript errors**
- **Found during:** Task 1 typecheck verification
- **Issue:** Pre-existing errors from plan 05-03 mapper: `full_name: string | null` assigned to `string`, `status: string | null` assigned to `string`, extra `stripe_customer_id` not in UserProfile type
- **Fix:** Added `?? ''` and `?? 'active'` fallbacks, removed stripe_customer_id from mapper
- **Files modified:** src/hooks/api/use-profile.ts
- **Commit:** 8bc094852

**2. [Rule 3 - Blocking] Fixed use-financials.ts unused imports**
- **Found during:** Task 1 lint verification
- **Issue:** After rewrite, IncomeStatementData, CashFlowData, BalanceSheetData, ApiResponse, ExpenseCategorySummary imports were no longer needed (delegated to financial-keys.ts)
- **Fix:** Removed unused type imports, kept only TaxDocumentsData
- **Files modified:** src/hooks/api/use-financials.ts
- **Commit:** 8bc094852

## Verification

All checks pass:
- `pnpm typecheck` -- 0 errors
- `pnpm lint` -- 0 errors
- `pnpm test:unit` -- 84 files, 974 tests pass
- Zero `from('reports' as 'properties')` fake casts
- Zero `TODO(phase-57)` references in src/
- Zero `@radix-ui/react-icons` imports
- Zero `SseProvider` references
- Duplicate GeneralSettings deleted
