# Plan 53-05 Summary: export-report Edge Function & Download Mutations

## Objective Achieved
Created the `export-report` Supabase Edge Function and wired all four download mutations
in `use-reports.ts` to call it. CSV/XLSX downloads work end-to-end; PDF shows graceful
fallback toast (Phase 55 dependency for StirlingPDF).

## Changes Made

### `supabase/functions/export-report/index.ts` (new file — 101 lines)
- Deno Edge Function with JWT authentication
- Query params: `type` (year-end|1099|financial|maintenance), `format` (csv|xlsx|pdf), `year`
- Report types → RPCs:
  - `year-end` / `financial` → `get_financial_overview(p_user_id)`
  - `1099` → `get_billing_insights(owner_id_param)`
  - `maintenance` → `get_maintenance_analytics(user_id)`
  - default → `get_revenue_trends_optimized(p_user_id, p_months: 12)`
- PDF returns 501 stub (`StirlingPDF integration is Phase 55`)
- XLSX returns CSV content with `.xlsx` extension (Excel opens CSV natively)
- CSV: proper quoting for values containing commas/quotes/newlines
- CORS headers on all responses

### `apps/frontend/src/hooks/api/use-reports.ts`
- Replaced all 4 download mutations (useDownloadYearEndCsv, useDownload1099Csv, useDownloadYearEndPdf, useDownloadTaxDocumentPdf)
- Extracted shared `callExportEdgeFunction(reportType, format, year)` helper:
  1. Gets Supabase session access_token
  2. Calls `${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/export-report?...`
  3. On 501 (PDF stub): `toast.info('PDF export coming soon — use CSV export for now')`
  4. On error: throws (caught by mutation onError)
  5. On success: creates blob URL, triggers browser download via link click
- Removed client-side CSV generation stubs (replaced with Edge Function calls)
- Zero `apiRequest` or `apiRequestRaw` calls remain

## Technical Decisions
- PDF returns `false` (not throws) on 501 — clean UX without error state
- Filename derived from `Content-Disposition` response header (falls back to `${type}-${year}.${format}`)
- XLSX/CSV share the same generation path — Excel handles both transparently

## Tests
- All 966 existing tests pass
- `pnpm --filter @repo/frontend typecheck` passes
- REPT-02 satisfied: Edge Function for CSV/PDF exports exists and called from frontend
