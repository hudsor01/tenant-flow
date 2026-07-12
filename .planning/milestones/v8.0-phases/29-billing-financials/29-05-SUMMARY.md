# 29-05 Summary — BILL-02 / BILL-03 / BILL-04 (financial query-key fixes)

**Requirements:** BILL-02 (period-scope expense totals), BILL-03 (unpaid invoice amount), BILL-04 (surface expense/billing RPC errors).

## What changed

**BILL-02 — forward the selected date range to the date-aware `get_expense_summary`**
- `financial-keys.ts`: `fetchDashAndExpense(userId, range?)` gained an optional `{ start_date, end_date }` arg. When present it passes `p_start_date`/`p_end_date` to `get_expense_summary` (the `get_dashboard_stats` call is left unchanged — its revenue is MRR). `incomeStatement` and `cashFlow` now call it with `{ start_date: params.start_date, end_date: params.end_date }`. `overview()` intentionally stays year-to-date (no range).
- `expense-keys.ts` `taxDocuments(year)`: passes `p_start_date: ${year}-01-01` / `p_end_date: ${year}-12-31`.
- The migration `20260708132045` (Plan 02) made both RPCs date-scopable with backward-compatible defaults; the generated `supabase.ts` Args already include `p_start_date?`/`p_end_date?`, so this typechecks with 0 errors.

**BILL-04 — surface `expenseResult.error` (and `billingResult.error`)**
- All five combined-fetch consumers (`overview`, `incomeStatement`, `cashFlow`, `balanceSheet` in `financial-keys.ts`; `taxDocuments` in `expense-keys.ts`) now call `handlePostgrestError(expenseResult.error, "<ctx> expenses")` immediately after the existing `dashResult.error` check. `balanceSheet` also checks `billingResult.error`. A failed expense/billing RPC now throws instead of falling through to `?? 0` and silently showing $0 expenses / overstated net income.

**BILL-03 — unpaid invoices show `amount_due`, not $0.00**
- `billing-keys.ts:35`: `const amount = row.status === "paid" ? Number(row.amount_paid) : Number(row.amount_due ?? row.amount_paid ?? 0)`. An open invoice with `amount_paid = 0` now renders its real `amount_due`.

## Tests
- `use-financials.test.tsx`: `useIncomeStatement` now asserts `get_expense_summary` is called with the forwarded `p_start_date`/`p_end_date` (BILL-02 arg-forwarding proof). `useBalanceSheet` still asserts the id-only call (balance sheet stays YTD).
- `use-financial-overview.test.ts`: added a BILL-04 case — dashboard succeeds, expense RPC errors, hook rejects (`data` undefined) instead of resolving with `total_expenses: 0`.

## KNOWN LIMITATION (revenue is annualized MRR)
Revenue in these views comes from `get_dashboard_stats` (active-lease MRR, point-in-time), so **only the expense side is period-accurate**. Changing the income-statement/cash-flow/tax range re-scopes expenses; revenue stays annualized MRR because the data model has no payment history (a payment ledger is deferred per 29-CONTEXT.md). `get_billing_insights` is likewise unchanged — its date params are a documented no-op (per 29-02-SUMMARY.md). A code comment marks each ranged call site.

## Commits
- `05eedc7ef` — fix(29-05): period-scope expense totals + surface expense/billing rpc errors (BILL-02, BILL-04)
- `8a0f95dc5` — fix(29-05): show amount_due for unpaid invoices (BILL-03)
