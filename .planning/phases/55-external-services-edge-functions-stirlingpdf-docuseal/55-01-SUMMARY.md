---
phase: 55-external-services-edge-functions-stirlingpdf-docuseal
plan: 01
subsystem: infra
tags: [supabase-edge-functions, stirlingpdf, pdf-generation, deno, typescript]

# Dependency graph
requires:
  - phase: 53-analytics-reports-tenant-portal
    provides: use-reports.ts with callExportEdgeFunction and export-report Edge Function (501 PDF stub)
  - phase: 54-payments-billing-postgrest-stripe-edge-functions
    provides: Supabase Edge Function patterns (stripe-webhooks, stripe-connect, stripe-checkout, stripe-billing-portal)
provides:
  - generate-pdf Supabase Edge Function — JWT-authenticated, calls StirlingPDF HTML-to-PDF with 30s timeout, streams PDF blob
  - export-report Edge Function updated — PDF format delegates to generate-pdf (no more 501 stub)
  - callGeneratePdfEdgeFunction frontend helper — fetches report data, converts to HTML, POSTs to generate-pdf
  - useDownloadYearEndPdf and useDownloadTaxDocumentPdf call generate-pdf directly
affects: [phase-56, phase-57, use-reports, export-report, generate-pdf]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Edge Function PDF generation: HTML-to-PDF via StirlingPDF multipart form POST"
    - "Edge Function delegation: export-report internally fetches generate-pdf to compose responses"
    - "Frontend PDF download: fetch generate-pdf with Bearer token, trigger download via Blob + URL.createObjectURL"
    - "30-second AbortSignal.timeout for all k3s external service calls"

key-files:
  created:
    - supabase/functions/generate-pdf/index.ts
  modified:
    - supabase/functions/export-report/index.ts
    - apps/frontend/src/hooks/api/use-reports.ts

key-decisions:
  - "StirlingPDF API endpoint: /api/v1/misc/html-to-pdf with multipart form field 'htmlContent'"
  - "Error strategy: fail-fast (no retry) matching stripe-webhooks pattern — 502 on StirlingPDF non-2xx"
  - "Timeout: AbortSignal.timeout(30_000) — 30 seconds per locked decision in CONTEXT.md"
  - "PDF delivery: stream arrayBuffer directly, no Supabase Storage intermediary"
  - "Frontend helpers: callGeneratePdfEdgeFunction builds minimal inline-styled HTML from RPC data"
  - "export-report data fetch occurs BEFORE PDF branch — same rows used for all formats"
  - "reportDataToHtml and buildReportHtml produce identical inline-styled HTML — both needed (edge fn has no access to frontend helper)"
  - "504 returned on timeout, 502 on StirlingPDF error, 500 on internal edge function error"

patterns-established:
  - "PDF Edge Function pattern: JWT auth → parse body → call external service with AbortSignal.timeout(30_000) → stream ArrayBuffer response"
  - "Frontend PDF download: getSession() for token → fetch Edge Function → blob → URL.createObjectURL → anchor click → revokeObjectURL"
  - "Edge Function delegation: internal fetch from one Edge Function to another passes authHeader as-is"

requirements-completed:
  - EXT-01

# Metrics
duration: 25min
completed: 2026-02-22
---

# Phase 55-01: generate-pdf Edge Function + Frontend PDF Download Wiring

**JWT-authenticated Supabase Edge Function calls self-hosted StirlingPDF on k3s with 30s timeout, streams PDF blob; frontend hooks call generate-pdf directly, bypassing the removed 501 stub in export-report**

## Performance

- **Duration:** 25 min
- **Started:** 2026-02-22T00:00:00Z
- **Completed:** 2026-02-22T00:25:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Created `supabase/functions/generate-pdf/index.ts`: JWT auth, multipart HTML POST to StirlingPDF `/api/v1/misc/html-to-pdf`, 30s AbortSignal timeout, PDF blob stream response
- Removed 501 stub from export-report; PDF format now delegates to generate-pdf Edge Function internally via internal fetch with forwarded auth header
- Added `callGeneratePdfEdgeFunction` and `reportDataToHtml` helpers to use-reports.ts; `useDownloadYearEndPdf` and `useDownloadTaxDocumentPdf` now call generate-pdf directly
- Frontend typecheck passes with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create generate-pdf Edge Function** - feat(55-01): create generate-pdf Supabase Edge Function
2. **Task 2: Update export-report + wire frontend PDF hooks** - feat(55-01): update export-report pdf delegation + wire frontend pdf hooks

## Files Created/Modified
- `/Users/richard/Developer/tenant-flow/supabase/functions/generate-pdf/index.ts` - New JWT-authenticated Edge Function: calls StirlingPDF, streams PDF blob with 30s timeout
- `/Users/richard/Developer/tenant-flow/supabase/functions/export-report/index.ts` - Removed 501 stub; PDF format fetches report data then delegates to generate-pdf with internal fetch
- `/Users/richard/Developer/tenant-flow/apps/frontend/src/hooks/api/use-reports.ts` - Added callGeneratePdfEdgeFunction, reportDataToHtml; wired useDownloadYearEndPdf and useDownloadTaxDocumentPdf; removed TODO(phase-05) comments

## Decisions Made
- Used `/api/v1/misc/html-to-pdf` StirlingPDF endpoint with multipart form `htmlContent` field — cleanest approach matching plan guidance
- Fail-fast strategy (no retry) matching stripe-webhooks pattern
- `export-report` fetches data first, THEN branches for PDF (data available for HTML generation without double-fetch)
- Internal Edge Function delegation passes `Authorization` header as-is — no token re-extraction needed
- `reportDataToHtml` inline helper (~25 lines) keeps HTML simple with inline styles for PDF context
- `504` for timeout, `502` for StirlingPDF errors, `500` for internal errors — clear HTTP semantics

## Deviations from Plan

### Auto-fixed Issues

**1. [TypeScript strict] Object.keys(rows[0]) — rows[0] may be undefined**
- **Found during:** Task 2 (frontend typecheck run)
- **Issue:** `Object.keys(rows[0])` fails TS strict check — `rows[0]` is `Record<string, unknown> | undefined` even after `rows.length > 0` check
- **Fix:** Extracted `const firstRow = rows[0]` and used `firstRow !== undefined ? Object.keys(firstRow) : []`
- **Files modified:** apps/frontend/src/hooks/api/use-reports.ts
- **Verification:** `pnpm --filter @repo/frontend typecheck` passes with zero errors
- **Committed in:** Task 2 commit

---

**Total deviations:** 1 auto-fixed (TypeScript strict null check)
**Impact on plan:** Minor correctness fix, no scope creep.

## Issues Encountered
None — implementation matched plan specification directly.

## User Setup Required
**External service requires configuration.** Add the following secret to Supabase Edge Functions:

```bash
# Required: base URL of self-hosted StirlingPDF on k3s
supabase secrets set STIRLING_PDF_URL=https://pdf.thehudsonfam.com
```

The generate-pdf Edge Function returns 500 with a descriptive error if `STIRLING_PDF_URL` is not set.

## Next Phase Readiness
- generate-pdf Edge Function ready for StirlingPDF k3s connectivity testing
- export-report PDF delegation works end-to-end once STIRLING_PDF_URL secret is configured
- useDownloadYearEndPdf and useDownloadTaxDocumentPdf wired and will trigger browser download
- Phase 55-02 (DocuSeal Edge Function) can proceed independently — no dependencies on this plan

---
*Phase: 55-external-services-edge-functions-stirlingpdf-docuseal*
*Completed: 2026-02-22*
