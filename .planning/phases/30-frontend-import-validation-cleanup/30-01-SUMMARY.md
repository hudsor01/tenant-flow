---
phase: 30-frontend-import-validation-cleanup
plan: 01
status: complete
started: 2026-04-03T17:00:00Z
completed: 2026-04-03T17:05:00Z
---

## Summary

Eliminated the `src/lib/formatters/currency.ts` re-export wrapper by consolidating all currency formatting into the canonical `src/lib/utils/currency.ts`. Changed `minimumFractionDigits` default from `0` to `2` (matching financial-app behavior), added `formatCents` function, and rewrote all 58 consumer imports to point directly at the canonical module.

## Key Changes

- Changed `formatCurrency` default `minimumFractionDigits` from `0` to `2`
- Added `formatCents` function to canonical currency module
- Added `minimumFractionDigits: 0` to `formatCompactCurrency` to prevent RangeError
- Rewrote 58 consumer file imports from `#lib/formatters/currency` to `#lib/utils/currency`
- Updated `vi.mock` target in settings-page.test.tsx
- Deleted `src/lib/formatters/currency.ts` wrapper file
- Updated all test expectations for new 2-decimal default

## Key Files

### Created
- (none)

### Modified
- `src/lib/utils/currency.ts` — added formatCents, changed minimumFractionDigits default
- `src/lib/utils/__tests__/currency.test.ts` — updated expectations, added formatCents tests
- `src/lib/formatters/__tests__/formatters.test.ts` — updated import to canonical
- 58 consumer files — import path rewrite

### Deleted
- `src/lib/formatters/currency.ts` — re-export wrapper eliminated

## Verification

- TypeScript compilation: PASS
- Unit tests: 1,499/1,499 PASS
- Zero imports reference `#lib/formatters/currency`
- `formatCents` exported from canonical
- All pre-commit hooks pass (gitleaks, lint, typecheck, unit tests, duplicate-types)

## Self-Check: PASSED
