---
phase: 02-typed-rpc-boundaries
plan: 01
subsystem: analytics-data-layer
tags: [type-safety, zod, rpc-boundary, mapper]
requires: []
provides:
  - "mapLeaseAnalytics validated boundary mapper (Zod safeParse, safe-empty fallback)"
  - "lease analytics RPC path field-validated at the boundary"
affects:
  - src/hooks/api/use-analytics.ts
tech-stack:
  added: []
  patterns:
    - "validated-mapper-at-RPC-boundary (mirrors mapDocumentRow)"
    - "per-branch Zod .catch(undefined) so one drifted sub-shape degrades alone"
    - "exactOptionalPropertyTypes-safe optional-field normalization (omit key when undefined)"
key-files:
  created:
    - src/hooks/api/query-keys/analytics-mappers.ts
    - src/hooks/api/query-keys/analytics-mappers.test.ts
  modified:
    - src/hooks/api/use-analytics.ts
decisions:
  - "Mapper never throws (analytics 'no data yet' is a valid render state per the jsonObjectOrEmpty precedent the lease path used before) — degrades to a zeroed/empty LeaseAnalyticsPageData instead."
  - "Validation depth: top-level branches (metrics/profitability/lifecycle/statusBreakdown/vacancyTrends) each get a full field-level Zod object schema; a malformed sub-shape clears only that branch via .catch(undefined), keeping well-formed siblings."
  - "Dropped the `satisfies z.ZodType<T>` schema assertions — they conflict with exactOptionalPropertyTypes on the nullable-optional profitabilityScore. Structural assignability + the toLeaseFinancialInsight normalizer enforce the contract instead."
metrics:
  duration: "~7 min"
  completed: 2026-06-05
  tasks: 2
  files: 3
---

# Phase 2 Plan 01: Typed Lease-Analytics RPC Boundary (TYPE-01) Summary

Added `mapLeaseAnalytics` — a Zod-`safeParse`-validated mapper that replaces the raw `{} as LeaseAnalyticsPageData` / `jsonObjectOrEmpty<LeaseAnalyticsPageData>` casts on the `use-analytics.ts` lease paths, catching RPC drift at the boundary while keeping the analytics "no data yet" empty-render state valid (never throws).

## What Was Built

- **`src/hooks/api/query-keys/analytics-mappers.ts`** — `mapLeaseAnalytics(raw: unknown): LeaseAnalyticsPageData`. Five field-level Zod schemas (lease financial summary, financial insight, lifecycle point, status breakdown, vacancy trend) composed into a top-level `leaseAnalyticsRawSchema` where each branch is `.optional().catch(undefined)`. On a failed `safeParse` (null / undefined / non-object) or any drifted branch, the mapper degrades to a zeroed-metrics / empty-arrays `LeaseAnalyticsPageData`. The lifecycle array feeds both `lifecycle` and `renewalRates`; the statusBreakdown array feeds both `statusBreakdown` and `leaseDistribution` (page-compatibility aliases on the existing type). Mirrors `mapDocumentRow`'s boundary-validation discipline; reuses `LeaseAnalyticsPageData` + `LeaseFinancial*` types (no duplicates).
- **`src/hooks/api/use-analytics.ts`** — `leasePageData().queryFn` and `overviewPageData().lease` now `return mapLeaseAnalytics(...)`. Removed both `{} as LeaseAnalyticsPageData` casts and the now-unused `jsonObjectOrEmpty` import (kept `jsonObject` for the out-of-scope financial/maintenance paths).
- **`src/hooks/api/query-keys/analytics-mappers.test.ts`** — 9 unit tests: valid-maps (lifecycle↔renewalRates, statusBreakdown↔leaseDistribution sourcing), empty fallback for null/undefined/`{}`/non-object primitive, metrics-zeroed-on-string-drift, statusBreakdown-dropped-on-missing-count, lifecycle-dropped-on-missing-period, nullable/omitted profitabilityScore.

## Verification Results

- `bun run typecheck` — clean
- `bun run lint` (biome, on all 3 touched files) — clean, no fixes
- `bunx vitest --run --project unit src/hooks/api/query-keys/analytics-mappers.test.ts` — 9 passed (9)
- `grep -c "as LeaseAnalyticsPageData" src/hooks/api/use-analytics.ts` — 0
- `grep -c "as unknown as" src/hooks/api/query-keys/analytics-mappers.ts` — 1 (docstring-only, references the rule; mirrors `mapDocumentRow`'s own docstring)
- Out-of-scope paths (financial / maintenance / occupancy / propertyPerformance / ownerPaymentSummary) untouched; `jsonObject<FinancialAnalyticsPageData>` + `jsonObject<MaintenanceInsightsPageData>` still present.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `satisfies z.ZodType<T>` conflicted with `exactOptionalPropertyTypes`**
- **Found during:** Task 1 typecheck
- **Issue:** `LeaseFinancialInsight.profitabilityScore?: number | null` rejects the literal value `undefined` under `exactOptionalPropertyTypes: true`, but Zod's `.optional()` widens the parsed value to `number | null | undefined`, so the `satisfies z.ZodType<LeaseFinancialInsight>` assertion (and the downstream array assignment) failed to typecheck.
- **Fix:** Dropped the `satisfies` assertions (schemas still infer correct shapes) and added a `toLeaseFinancialInsight` normalizer that includes `profitabilityScore` only when it is not `undefined`. The mapper's typed return (`LeaseAnalyticsPageData`) remains the enforced contract.
- **Files modified:** src/hooks/api/query-keys/analytics-mappers.ts
- **Commit:** 445de2ac2

No other deviations — plan executed as written (2-task split: mapper, then wiring + tests).

## Known Stubs

None. The "safe empty" fallback is an intentional, documented render state (analytics aggregate "no data yet"), not a stub — it matches the pre-existing `jsonObjectOrEmpty` lease-path behavior, now field-validated.

## Self-Check: PASSED

- FOUND: src/hooks/api/query-keys/analytics-mappers.ts
- FOUND: src/hooks/api/query-keys/analytics-mappers.test.ts
- FOUND: src/hooks/api/use-analytics.ts (modified)
- FOUND: commit 445de2ac2 (Task 1 mapper)
- FOUND: commit 00062f29f (Task 2 wiring + tests)
