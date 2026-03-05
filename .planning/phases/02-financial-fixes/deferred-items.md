# Phase 02: Deferred Items

## formatCents Consolidation (from 02-04, PAY-05)

**Scope:** Remove `formatCents` function from `src/lib/formatters/currency.ts` and `src/shared/lib/format.ts`, replace all 96 call sites across 27 files with `formatCurrency(cents / 100)`.

**Why deferred:** The change touches code across many unrelated domains (financials, tax documents, lease wizard, rent collection, balance sheet, cash flow, expenses, income statement). Mass-replacing risks regressions in stable code outside the plan's scope.

**Files affected:** 27 files -- see `grep -r "formatCents" src/ --include="*.ts" --include="*.tsx"` for full list.

**Priority:** Low -- formatCents is functionally correct (wraps formatCurrency), not a bug.
