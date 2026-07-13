# 29-04 Summary — BILL-05 (PDF/CSV RPC parity)

**Requirement:** BILL-05 — `generate-pdf`'s Mode-1 `fetchReportRows` ALWAYS called `get_dashboard_stats` regardless of `reportType`, then titled the output "YEAR-END REPORT" — so the PDF content never matched its title or its CSV counterpart (`export-report`, which branches correctly).

## What changed (commit `0cad13525`)

`supabase/functions/generate-pdf/index.ts`:
- `fetchReportRows` now accepts `(supabase, userId, reportType, year)` and branches to the SAME RPCs `export-report/index.ts` uses:
  - `year-end` | `financial` -> `get_financial_overview({ p_user_id, p_start_date: `${year}-01-01`, p_end_date: `${year}-12-31` })` — passes the requested year's boundaries to the now-date-aware RPC (param names `p_start_date`/`p_end_date` from BILL-02 / migration `20260708132045`, which are `date` typed).
  - `1099` -> `get_billing_insights({ owner_id_param: userId })` — no date params wired (BILL-02 left `get_billing_insights` untouched; its declared date params are a documented no-op, so passing them would be meaningless).
  - `maintenance` -> `get_maintenance_analytics({ user_id: userId })`.
  - else -> `get_revenue_trends_optimized({ p_user_id: userId, p_months: 12 })`.
- Added `coerceCell` + `flattenToReportRows` — a port of export-report's `flattenToRows` coerced to the local `ReportRow` (`string | number | null | undefined`) cell shape: object-shaped RPC results become `[{ metric, value }]` rows; array results (e.g. revenue trends) become coerced rows. Renders in the existing `buildReportHtml` table unchanged.
- Mode-1 call site updated to `fetchReportRows(supabase, user.id, body.reportType, body.year)` (body is narrowed to the `{ reportType, year }` variant in that branch).
- `get_dashboard_stats` fully removed from the file (no other mode used it). `buildReportHtml`, the `PREMIUM_REPORT_TYPES` gate, the auth path, and Mode-2 (raw HTML) / Mode-3 (lease preview) are untouched.

## Verification
- `grep get_dashboard_stats generate-pdf/index.ts`: **zero** (year-end branch no longer uses it).
- `fetchReportRows` references all four export-report RPCs (`get_financial_overview`, `get_billing_insights`, `get_maintenance_analytics`, `get_revenue_trends_optimized`).
- Year-end/financial branch passes `${year}-01-01` / `${year}-12-31` to `get_financial_overview` (confirmed via fixed-string grep, lines 129-130).
- Behavior parity: for `{ reportType: 'year-end', year }`, generate-pdf's row set is built from `get_financial_overview` — the same RPC as export-report's CSV for the same input.
- Full pre-commit suite (lint + typecheck + unit) green on the commit.

## Residuals (OWNER-RUN)
- **Edge redeploy required (CLI-401 pattern):** the corrected report branching only takes effect after the owner redeploys `generate-pdf`. Not attempted here.

## Note
- The edge function imports `SupabaseClient` without a `Database` generic, so `supabase.rpc(...)` args are loosely typed — the new date-param call type-checks regardless of whether the root tsconfig covers `supabase/functions/`. RPC parity + param names verified against `export-report/index.ts` and the 29-02 summary by review.
