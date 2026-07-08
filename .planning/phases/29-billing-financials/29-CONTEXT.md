# Phase 29: Billing, Stripe & Financial Reports - Context

**Gathered:** 2026-07-08 (exhaustive live-DB research; every RPC signature + `expenses.amount` type verified against prod `bshjmbshupiibfiewpxb`).
**Status:** Ready for planning
**Source:** 2026-07-02 bug hunt (BILL-01..06) + the Phase-27-review-captured BILL-06.

<domain>
## Phase Boundary
Correct the billing + financial-reporting numbers: Stripe period-end read location (BILL-01), period-scoped statements (BILL-02), real invoice amounts (BILL-03), honest error surfacing (BILL-04), PDF/CSV RPC parity (BILL-05), and the systemic `expenses.amount` money-convention (BILL-06). Builds on Phases 25-28. **This phase HAS migrations + edge-function changes.** Out of scope: phases 30-35 (but see the DATA-02 coordination note below — we pull one DATA-02 fix forward to avoid a double-recreate).

**Migrations:** BILL-06 (expenses.amount type + get_property_performance_analytics) and BILL-02 (date params on financial RPCs).
**Edge redeploys (owner-run, CLI-401 pattern):** BILL-01 (`stripe-webhooks`, `stripe-cancel-subscription`), BILL-05 (`generate-pdf`).
</domain>

<decisions>
## Implementation Decisions (verified live)

### BILL-01 — subscription current-period-end read from the wrong Stripe SDK location (P1)
Edge functions pin `stripe@20` API `2026-03-25.dahlia` (basil+), where `current_period_end` moved OFF the top-level Subscription to `subscription.items.data[].current_period_end`. So every top-level read returns `undefined` → null `users.subscription_current_period_end` + a `RangeError` crash on cancel/reactivate.
**LOCKED:** change the 4 edge reads to `sub.items.data[0]?.current_period_end` (mirroring how the same handlers already read `sub.items.data[0]?.price.id`):
- `stripe-webhooks/handlers/customer-subscription-updated.ts:69-70`
- `stripe-webhooks/handlers/checkout-session-completed.ts:62-63`
- `stripe-cancel-subscription/index.ts:110` + `:125`
Plus a defensive guard at `use-billing-mutations.ts:75-77` so an absent/NaN `current_period_end` maps to `null` instead of `new Date(NaN).toISOString()` throwing. `subscription-keys.ts:115` already reads the denormalized column correctly — no change (fixing the handlers populates it). NO migration; **edge redeploy of `stripe-webhooks` + `stripe-cancel-subscription` (owner-run).**
**Verify:** a cancel/reactivate no longer crashes; the webhook writes a real timestamp to `users.subscription_current_period_end`.

### BILL-02 — income-statement / cash-flow / tax-documents ignore the selected period (P1)
`financial-keys.ts:243` (incomeStatement), `:327` (cashFlow), `expense-keys.ts:47` (taxDocuments) call `get_dashboard_stats({p_user_id})` + `get_expense_summary({p_user_id})` and use their `start_date`/`end_date`/`year` ONLY for the display label. **Live fact:** there is NO `get_income_statement`/`get_cash_flow` RPC; `get_expense_summary` + `get_financial_overview` HARDCODE `date_trunc('year', current_date)`; `get_billing_insights` declares date params but its body ignores them.
**LOCKED (migration + frontend):** add `p_start_date date` / `p_end_date date` params (DEFAULT to the current-year boundaries so existing callers are unaffected) to `get_expense_summary` and `get_financial_overview`, replacing the hardcoded `date_trunc('year', current_date)` predicate on `expenses.expense_date`; make `get_billing_insights` actually apply its already-declared date params where sensible. Then have the three queryFns PASS their selected `start_date`/`end_date` (taxDocuments passes the `year` boundaries). **KNOWN LIMITATION to document (not a bug to over-fix here):** REVENUE from `get_dashboard_stats`/`get_financial_overview` is active-lease MRR (point-in-time), NOT period-historical — the data model has no rent-roll/payment history, so the EXPENSE side becomes period-accurate while revenue stays annualized-MRR. Scope BILL-02 to making the period-scopable data (expenses) honor the selected range; note the revenue limitation in the summary. Backward-compat: defaulted params keep every other caller of these RPCs working.
**Verify:** changing the income-statement/cash-flow/tax date range changes the expense totals (no longer fixed YTD); other consumers of the RPCs unchanged.

### BILL-03 — unpaid/open invoices show $0.00 (P2)
`billing-keys.ts:35` `const amount = Number(row.amount_paid ?? row.amount_due ?? 0)` — for an unpaid invoice `amount_paid = 0` (not null), so `??` lets 0 win over the real `amount_due`. `get_user_invoices` returns both (live). 
**LOCKED:** use `amount_due` when the invoice is not paid — e.g. `row.status === 'paid' ? Number(row.amount_paid) : Number(row.amount_due ?? row.amount_paid ?? 0)` (or `Number(row.amount_paid) || Number(row.amount_due) || 0`). Pure frontend.
**Verify:** an open/unpaid invoice shows its real `amount_due`, not $0.00.

### BILL-04 — expense-RPC failures silently default expenses to 0, overstating net income (P1)
`financial-keys.ts` `fetchDashAndExpense` returns `{dashResult, expenseResult}`; every combined-fetch consumer checks ONLY `dashResult.error` and reads `expenseResult.data?.total_amount ?? 0` unchecked: `overview` (:110/:115), `incomeStatement` (:246/:250), `cashFlow` (:330/:334), `balanceSheet` (:429/:433 + `billingResult` :437), and `expense-keys.ts` taxDocuments (:52/:64/:96).
**LOCKED:** after `fetchDashAndExpense`, check `expenseResult.error` (and `billingResult.error` in balanceSheet) via `handlePostgrestError` — same as `dashResult` — so an RPC failure surfaces instead of silently zeroing expenses. Pure frontend.
**Verify:** simulate an expense-RPC error → the view surfaces an error (or an honest fallback), not $0 expenses + inflated net income.

### BILL-05 — year-end/tax PDF built from get_dashboard_stats, mismatching the title (P2)
`generate-pdf/index.ts:92-108` `fetchReportRows()` ALWAYS calls `get_dashboard_stats({p_user_id})` regardless of `reportType`, then titles it "YEAR-END REPORT". The CSV counterpart `export-report/index.ts` correctly branches: year-end/financial → `get_financial_overview`, 1099 → `get_billing_insights`, maintenance → `get_maintenance_analytics`, else → `get_revenue_trends_optimized`.
**LOCKED:** make generate-pdf's Mode-1 `fetchReportRows` accept `reportType` (+ year) and branch to the SAME RPCs export-report uses, passing the year boundaries to the now-date-aware RPCs (BILL-02). Edge redeploy of `generate-pdf` (owner-run). Coordinate the RPC choice with BILL-02.
**Verify:** the year-end PDF contains financial numbers (from get_financial_overview) matching its CSV counterpart + the report title.

### BILL-06 — expenses.amount money-convention (systemic, P2) — MIGRATIONS
`expenses.amount` is **`integer NOT NULL`** live (prod table empty → no data conversion). Writers send decimal dollars (`parseFloat` → rounded). Readers split: some treat it as CENTS (`formatCents(amount)` → 100× too small), some as DOLLARS. One RPC truncates via `::bigint`.
**LOCKED:**
1. **Migration:** `ALTER TABLE public.expenses ALTER COLUMN amount TYPE numeric(10,2)` (lossless; prod empty).
2. **Migration:** recreate `get_property_performance_analytics` changing the expense `COALESCE(SUM(e.amount),0)::bigint` → `::numeric` and the `RETURNS TABLE` `total_expenses`/`net_income` from `bigint` → `numeric`. **DO BOTH BILL-06 AND DATA-02 IN THIS ONE RECREATE** (see coordination note) — also restore the `p.status <> 'inactive'` predicate DATA-02 needs, so we don't recreate this function twice. (Other expense-SUM RPCs — get_expense_summary, get_financial_overview, calculate_monthly_metrics — already return `numeric`, no change beyond BILL-02's date params.)
3. **Frontend:** switch the WRONG cents-readers `formatCents(amount)` → `formatCurrency(amount)`: `financials/expenses/_components/expense-table.tsx:155`, `expense-category-breakdown.tsx:31`, `financials/tax-documents/page.tsx` (:170,186,202,242,275,280,284), `financials/financials-quick-links.tsx` (:82,90,104), `financials/financials-highlights.tsx:30` (also stop currency-formatting the occupancy-% highlight — minor secondary bug). Leave the `formatCents(x*100)` readers (income-statement/cash-flow/balance-sheet) — they are correct-as-dollars; optionally normalize to `formatCurrency(x)` for clarity (discretion).
**Verify:** a $150.50 expense stores 150.50, shows "$150.50" on BOTH /maintenance/[id] AND /financials/expenses (was "$1.50" on financials); the property-performance analytics `total_expenses`/`net_income` keep cents and exclude inactive properties.

### Claude's Discretion
- BILL-02 approach details (default-param values; whether get_billing_insights's date params are wired now or noted). Keep it backward-compatible.
- BILL-06: whether to normalize the correct-but-awkward `formatCents(x*100)` readers to `formatCurrency(x)` (nice-to-have) or leave them.
- Order of the migrations (expenses type before the RPC recreate).
</decisions>

<canonical_refs>
## Canonical References + live DB facts
- BILL-01: `supabase/functions/stripe-webhooks/handlers/{customer-subscription-updated,checkout-session-completed}.ts`, `stripe-cancel-subscription/index.ts`, `src/hooks/api/use-billing-mutations.ts`. Correct pattern already in-file: `sub.items.data[0]?.price.id`.
- BILL-02/04: `src/hooks/api/query-keys/financial-keys.ts` (fetchDashAndExpense + overview/incomeStatement/cashFlow/balanceSheet), `src/hooks/api/query-keys/expense-keys.ts` (taxDocuments + `byDateRange` at :234). RPCs: `get_expense_summary`, `get_financial_overview`, `get_billing_insights`, `get_dashboard_stats`.
- BILL-03: `src/hooks/api/query-keys/billing-keys.ts:35,45`. RPC `get_user_invoices` (returns amount_due + amount_paid).
- BILL-05: `supabase/functions/generate-pdf/index.ts:51,92-108`; compare `supabase/functions/export-report/index.ts:91,97,103,109`; caller `src/hooks/api/query-keys/report-keys.ts:223`.
- BILL-06: `expenses.amount` (integer→numeric), `get_property_performance_analytics` (::bigint), readers listed above. `src/lib/utils/currency.ts` (formatCents=÷100, formatCurrency=treats-as-dollars).
- CLAUDE.md: amounts store DOLLARS as numeric(10,2); migrations via MCP + reconcile filename; `bun run db:types` regen on column/RPC-signature change (CLI-401 → MCP generate_typescript_types + surgical edit); SECURITY DEFINER RPC grants/search_path preserved on recreate.

### Live RPC signatures (verified)
- `get_expense_summary(p_user_id uuid)` — hardcodes current-year; SUM(e.amount) numeric.
- `get_financial_overview(p_user_id uuid)` — hardcodes YTD; SUM(e.amount) numeric.
- `get_billing_insights(owner_id_param uuid, start_date_param timestamp DEFAULT NULL, end_date_param timestamp DEFAULT NULL)` — body IGNORES date params.
- `get_property_performance_analytics(...)` — `RETURNS TABLE(... total_expenses bigint, net_income bigint ...)`, `SUM(e.amount)::bigint`. Touched by BILL-06 (cast) + DATA-02 (status filter).
</canonical_refs>

<specifics>
## Cross-requirement coordination
- **BILL-02 ↔ BILL-05:** both about "which RPC + period". Extend the RPCs with date params (BILL-02), then BILL-05's PDF calls the SAME extended RPCs with year boundaries. Solve consistently.
- **BILL-06 ↔ BILL-02/04:** the expense-SUM RPCs BILL-02/04 read are numeric-summing; after the column→numeric they return fractional dollars correctly; BILL-04 then surfaces real errors and BILL-06 fixes rendering.
- **BILL-06 ↔ DATA-02 (Phase 30):** `get_property_performance_analytics` is recreated ONCE here covering BOTH the numeric cast (BILL-06) AND the `p.status <> 'inactive'` predicate (DATA-02). Mark DATA-02 as satisfied-in-Phase-29 in the roadmap so Phase 30 doesn't recreate it again (which would risk clobbering the numeric cast).
- Migrations applied via Supabase MCP, then reconcile the repo filename to the prod-assigned timestamp; regen db:types after any RPC signature / column change.
</specifics>

<deferred>
## Deferred (tracked elsewhere)
- Period-historical REVENUE (rent-roll/payment history) — the data model doesn't support it; BILL-02 scopes to expense-period-accuracy + notes the revenue-MRR limitation. Not building a payment ledger here.
- Anything not in BILL-01..06 (and the one DATA-02 predicate pulled into the shared recreate).
</deferred>

---
*Phase: 29-billing-financials*
