# Phase 29 — Perfect-PR Review Log

**Gate:** two consecutive zero-finding review cycles. Method: a Workflow fanned out 6 BILL dimensions (bill06-db, bill02, bill01, bill05, bill03-04, bill06-readers), each reviewed then adversarially verified — the two DB dimensions re-proving against live prod each cycle. Reviewed 2026-07-08.

## Findings by cycle (all fixed)
| Cycle | Findings | Fix |
|-------|----------|-----|
| 1 | 2 MEDIUM — BILL-04's error-surfacing fix missed the sibling `reportQueries.financial` + `reportQueries.yearEnd` in report-analytics-keys.ts (swallowed expenseResult/propResult.error) | added the guards; swept all get_expense_summary callers |
| 2 | 1 LOW — the /financials "Occupancy Rate" highlight read `units?.occupancy_rate` (always 0%); the RPC emits `properties.occupancyRate` | parseDashStats returns properties; read the right key |
| 3 | 1 MEDIUM — the SAME occupancy bug in report-analytics-keys.ts:181 (Financial Report + PDF); + BILL-02 period-ignoring in the financial/yearEnd report queries | fixed the occupancy + forwarded the period to get_expense_summary; proactively wired report1099's year too |
| 4 | CLEAN (all 6) | — |
| 5 | CLEAN | — |

The recurring theme: the executors fixed the primary files (financial-keys.ts, expense-keys.ts, the financials/* display) but missed the sibling report-generation file (report-analytics-keys.ts). The adversarial sweeps caught each; a proactive sweep in cycle 3 exhausted the class.

## Migrations (3, applied to prod, verified live, repo↔prod byte-parity)
- `20260708131702` — expenses.amount integer→numeric(10,2) (prod empty; 150.50 round-trips).
- `20260708131721` — DROP+CREATE get_property_performance_analytics: ::bigint→::numeric + RETURNS TABLE bigint→numeric + DATA-02's `p.status <> 'inactive'` on both CTEs (one recreate; grants re-issued).
- `20260708132045` — get_expense_summary + get_financial_overview gained `p_start_date`/`p_end_date` (DROP old (uuid); default p_end_date NULL = exact YTD backward-compat).

## Requirements delivered
- **BILL-01** — 4 edge reads → `sub.items.data[0]?.current_period_end` + `Number.isFinite` frontend guard (no more RangeError; webhook writes a real timestamp).
- **BILL-02** — the date-aware RPCs + wiring across income-statement/cash-flow/tax-documents AND the report-analytics financial/yearEnd/1099 queries. `get_billing_insights` left as-is (no date-scopable aggregate).
- **BILL-03** — unpaid invoices show `amount_due`, not $0.00.
- **BILL-04** — every combined-fetch financial consumer surfaces its expense/property/billing RPC error (across financial-keys, expense-keys, AND report-analytics).
- **BILL-05** — generate-pdf branches by reportType to the same RPCs as export-report (year-end PDF matches its CSV).
- **BILL-06** — expenses.amount numeric + the 5 wrong cents-readers → formatCurrency (a $150 expense shows $150.00, not $1.50); correct `formatCents(x*100)` readers left intact.

## Verification
- typecheck 0, lint 0, full unit suite green. Live DB proofs on all 3 migrations. Prod left clean.

## Residuals (owner-run / deferred)
- **3 owner-run edge redeploys** (CLI-401): `stripe-webhooks`, `stripe-cancel-subscription` (BILL-01), `generate-pdf` (BILL-05). Code ships; behavior takes effect on redeploy.
- **BILL-02 revenue limitation** (documented, not a bug): revenue stays annualized MRR (point-in-time) — period-historical revenue isn't in the data model (no payment ledger). Only the expense side is period-accurate.
- **DATA-02 (Phase 30)**: this phase satisfied ONLY get_property_performance_analytics's status predicate (folded into the BILL-06 recreate). Phase 30 must still add `p.status <> 'inactive'` to `get_property_performance_with_trends` (+ `_trends`) but must NOT re-recreate `_analytics` (would clobber the BILL-06 numeric cast).
- **report1099 vendor_payments** (pre-existing, out of scope): the report reads a `vendor_payments` key get_expense_summary never emits → renders empty. Not a BILL-02 defect; noted in-code.
