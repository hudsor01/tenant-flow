# 29-02 Summary — BILL-02 (period-scopable financial RPCs)

**Requirement:** BILL-02 — income-statement/cash-flow/tax-documents ignored the selected period (RPCs hardcoded YTD). Make the RPCs date-scopable (the frontend wiring to pass the range is 29-05).

**Migration `20260708132045_bill02_date_params_expense_summary_and_financial_overview` (applied + verified):**
- DROP the old `(uuid)` signatures, CREATE `get_expense_summary(uuid, date, date)` + `get_financial_overview(uuid, date, date)` with `p_start_date DEFAULT date_trunc('year', current_date)::date` and `p_end_date DEFAULT NULL`.
- Replaced the hardcoded `expense_date >= date_trunc('year', current_date)` predicates (2 in get_expense_summary's category CTE + period total; 1 in get_financial_overview) with `>= p_start_date AND (p_end_date IS NULL OR <= p_end_date)`. The NULL-default upper bound keeps an id-only call ONE-SIDED — reproducing today's YTD exactly (backward-compatible for all existing single-arg callers). Left the trailing-12-month rolling `monthly_totals` window unchanged.
- Verified live: single overload each (no ambiguity), uses the params, no leftover hardcoded year (only in the DEFAULT), grants (authenticated + service_role) preserved.
- `supabase.ts` Args updated for both RPCs (`p_start_date?`/`p_end_date?`); typecheck 0.

**get_billing_insights NOT touched** — its live body (20260528231201) has no date-scopable aggregate (unpaid/late-fee hardcoded 0 after `rent_payments` was demolished; MRR/churn/tenant-count are point-in-time). Its declared date params remain a documented no-op.

**KNOWN LIMITATION (BILL-02):** REVENUE stays active-lease MRR (point-in-time) — period-historical revenue isn't in the data model. Only the EXPENSE side becomes period-accurate.
