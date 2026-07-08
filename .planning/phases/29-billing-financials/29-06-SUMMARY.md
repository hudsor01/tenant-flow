# 29-06 Summary — BILL-06 (financials display units fix)

**Requirement:** BILL-06 — several `/financials/*` screens read `expenses.amount` (now `numeric(10,2)` dollars) through `formatCents`, which divides by 100, so a $150.50 expense rendered "$1.50".

## What changed

**Task 1 — switch the 4 WRONG cents-readers to `formatCurrency` (dollars-in)**
- `expenses/_components/expense-table.tsx` — expense amount (1 site).
- `expenses/_components/expense-category-breakdown.tsx` — category amount (1 site).
- `tax-documents/page.tsx` — totalIncome, totalDeductions, netTaxableIncome, category amount, property basis, annual depreciation, accumulated depreciation (7 sites).
- `financials-quick-links.tsx` — income-statement net income, cash-flow (revenue − expenses), expenses total KPIs (3 sites).
- None of these files used the correct-as-dollars `formatCents(x*100)` idiom, so the `formatCents` import swapped to `formatCurrency` wholesale in each.

**Task 2 — Financial Highlights render by KIND, not magnitude**
- `financials-highlights.tsx`: replaced the `formatCents` import with `formatCurrency` + `formatPercentage`, and removed the fragile `highlight.value > 1000` magnitude heuristic. Labels matching `/rate|occupancy|%/i` now render via `formatPercentage` (e.g. `85` → "85%"); every other highlight renders via `formatCurrency` (e.g. `48000` → "$48,000.00"). This fixes both the 100x-too-small revenue display and the occupancy value falling through to a bare number.

## Left unchanged (correct-as-dollars, `formatCents(x*100)`)
The eight readers under `income-statement/`, `cash-flow/`, and `balance-sheet/` use `formatCents(x * 100)`, which equals `formatCurrency(x)` — already correct. Per plan, they were NOT touched (`git diff --name-only` does not list them).

## Deferred discretion
The optional normalization of the `formatCents(x * 100)` readers to plain `formatCurrency(x)` was left as-is — they are numerically correct and out of scope for this fix.

## Verification
- No bare `formatCents` remains in the 5 changed files; no `* 100` or `> 1000` in any of them (grep-confirmed).
- The 8 `formatCents(x*100)` files are untouched.
- `bun run typecheck` + `bun run lint` green. No component render tests reference these 5 files.

## Commits
- `476ddd539` — fix(29-06): render expense/tax/quick-link amounts as dollars (BILL-06)
- `127078f13` — fix(29-06): render highlights money as currency and occupancy as percentage (BILL-06)
