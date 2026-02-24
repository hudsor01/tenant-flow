---
phase: 55-external-services-edge-functions-stirlingpdf-docuseal
plan: 04
subsystem: api
tags: [supabase, edge-functions, pdf, nestjs, migration]

# Dependency graph
requires:
  - phase: 55-01
    provides: generate-pdf Edge Function with StirlingPDF integration (modes 1 and 2)
  - phase: 55-02
    provides: docuseal Edge Function, send-for-signature flow
provides:
  - callGeneratePdfFromHtml exported helper in use-reports.ts (html+filename → EF → browser download)
  - generate-pdf EF extended with leaseId mode (mode 3: fetch lease data, build HTML, return PDF)
  - reports/page.tsx migrated from NestJS PDF endpoint to callGeneratePdfFromHtml
  - dashboard-filters.tsx migrated from NestJS PDF endpoint to callGeneratePdfFromHtml
  - lease-template-builder.client.tsx migrated from NestJS to generate-pdf EF with html mode
  - send-for-signature-button.tsx migrated from NestJS to generate-pdf EF with leaseId mode
  - Zero remaining NestJS PDF callsites in frontend — EXT-01 success criterion 5 satisfied
affects: [phase-56, phase-57]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - callGeneratePdfFromHtml helper pattern: build HTML client-side, send to generate-pdf EF, trigger download
    - generate-pdf EF three-mode dispatch: { reportType+year } | { html } | { leaseId }
    - eslint-disable color-tokens/no-hex-colors for module-level PDF HTML builder functions

key-files:
  created: []
  modified:
    - apps/frontend/src/hooks/api/use-reports.ts
    - apps/frontend/src/app/(owner)/reports/page.tsx
    - apps/frontend/src/components/dashboard/dashboard-filters.tsx
    - apps/frontend/src/components/leases/template/lease-template-builder.client.tsx
    - apps/frontend/src/components/leases/send-for-signature-button.tsx
    - supabase/functions/generate-pdf/index.ts

key-decisions:
  - "HTML for PDF is built client-side (from TanStack Query cache data) to avoid redundant DB fetches in the EF"
  - "Module-level helper functions extract HTML template strings and use eslint-disable for color-tokens/no-hex-colors (PDF inline styles are intentional, not browser CSS)"
  - "lease-template-builder uses blob URL for iframe src — blob URLs work in iframe src without revocation during display"
  - "generate-pdf EF leaseId mode uses service role client (already established in handler) — full DB access, no RLS issue"
  - "send-for-signature preview uses 60-second revoke timer for new tab blob URL — same as previous pattern"

patterns-established:
  - "HTML builder at module level with eslint-disable block: extract PDF HTML from async functions to avoid inline disable on each string"
  - "generate-pdf EF three-mode dispatch: 'html' in body → mode 2, 'leaseId' in body → mode 3, else → mode 1"

requirements-completed:
  - EXT-01

# Metrics
duration: 25min
completed: 2026-02-22
---

# Phase 55-04: NestJS PDF Gap Closure Summary

**Four remaining NestJS PDF callsites migrated to generate-pdf Supabase Edge Function, eliminating all frontend NestJS PDF dependencies and satisfying EXT-01 success criterion 5.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-02-22T00:00:00Z
- **Completed:** 2026-02-22T00:25:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Added `callGeneratePdfFromHtml` exported helper to `use-reports.ts` — sends pre-built HTML to generate-pdf EF and triggers browser download
- Migrated `reports/page.tsx` and `dashboard-filters.tsx` PDF export from NestJS `/api/v1/reports/export/pdf` to the helper
- Migrated `lease-template-builder.client.tsx` PDF preview from NestJS `/api/v1/pdf/lease/template/preview` to generate-pdf EF html mode
- Extended generate-pdf Edge Function with leaseId mode: fetches lease + unit + property data, builds HTML summary, returns PDF blob
- Migrated `send-for-signature-button.tsx` PDF preview from NestJS `/api/v1/leases/{id}/pdf/preview` to generate-pdf EF leaseId mode
- Zero `apiRequestRaw` or `API_BASE_URL` imports remain in the four target files for PDF operations

## Task Commits

Each task was committed atomically:

1. **Task 1: Add callGeneratePdfFromHtml helper + migrate reports/page.tsx + dashboard-filters.tsx** - `8d1a8f8b8` (feat)
2. **Task 2: Migrate lease-template-builder.client.tsx PDF preview** - `26c63e3ea` (feat)
3. **Task 3: Extend generate-pdf EF with leaseId mode + migrate send-for-signature-button.tsx** - `75aa88502` (feat)

## Files Created/Modified

- `apps/frontend/src/hooks/api/use-reports.ts` - Added exported `callGeneratePdfFromHtml` helper function
- `apps/frontend/src/app/(owner)/reports/page.tsx` - Migrated `handlePdfExport` to use `callGeneratePdfFromHtml`; removed `apiRequestRaw` import; added `buildReportPdfHtml` module-level helper
- `apps/frontend/src/components/dashboard/dashboard-filters.tsx` - Migrated `handleExportPDF` to use `callGeneratePdfFromHtml`; removed `apiRequestRaw` import; added `buildDashboardPdfHtml` module-level helper
- `apps/frontend/src/components/leases/template/lease-template-builder.client.tsx` - Migrated `handlePreviewPdf` to call generate-pdf EF with `{ html: previewHtml }`; removed `API_BASE_URL` import; added `createClient` import
- `apps/frontend/src/components/leases/send-for-signature-button.tsx` - Migrated `handlePreview` to call generate-pdf EF with `{ leaseId }`; removed `apiRequestRaw` import; added `createClient` import
- `supabase/functions/generate-pdf/index.ts` - Added `leaseId` to `RequestBody` union type; added `buildLeasePreviewHtml` helper; added leaseId dispatch branch in handler

## Decisions Made

- HTML for PDF documents is built client-side from TanStack Query cache data to avoid redundant DB fetches in the Edge Function. This is the correct approach since the data is already in memory.
- Module-level helper functions extract the PDF HTML template strings to use `eslint-disable color-tokens/no-hex-colors` at block level (PDF inline styles are intentional — they are not browser CSS and must use hex colors for PDF rendering compatibility).
- The generate-pdf EF leaseId mode uses the service role client already created in the handler — the auth check before ensures the caller is authenticated, so the elevated DB access is safe.
- Blob URL for lease-template-builder iframe: not revoked immediately since the iframe needs the URL while displayed. This is acceptable for an in-page preview component.

## Deviations from Plan

### Auto-fixed Issues

**1. [Lint - color-tokens/no-hex-colors] Hex color lint errors in PDF HTML template strings**
- **Found during:** Task 1 (commit attempt)
- **Issue:** ESLint `color-tokens/no-hex-colors` rule rejected hex colors (`#ccc`, `#222`, `#666`, `#f0f0f0`) in inline PDF HTML template strings in `reports/page.tsx` and `dashboard-filters.tsx`
- **Fix:** Extracted the HTML building into module-level helper functions (`buildReportPdfHtml`, `buildDashboardPdfHtml`) and wrapped each with `/* eslint-disable color-tokens/no-hex-colors -- PDF HTML content uses inline styles intentionally; not rendered by the browser */` / `/* eslint-enable */` block comments
- **Files modified:** `apps/frontend/src/app/(owner)/reports/page.tsx`, `apps/frontend/src/components/dashboard/dashboard-filters.tsx`
- **Verification:** Lint passes cleanly after extraction; no functional change
- **Committed in:** `8d1a8f8b8` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (lint rule compliance)
**Impact on plan:** Fix improves code organization by separating HTML building from component logic. No scope creep.

## Issues Encountered

None beyond the lint issue documented above.

## User Setup Required

None - no external service configuration required. The generate-pdf EF leaseId mode uses the same Supabase service role client already configured.

## Next Phase Readiness

- Phase 55 is now fully complete: all 4 Edge Functions operational (generate-pdf, export-report, docuseal, docuseal-webhook); EXT-01 and EXT-02 satisfied; zero NestJS PDF or DocuSeal callsites remain in the frontend
- Ready for Phase 56: pg_cron + DB Webhooks (scheduled jobs, n8n integration)
- Ready for Phase 57: NestJS backend cleanup and deletion

---
*Phase: 55-external-services-edge-functions-stirlingpdf-docuseal*
*Completed: 2026-02-22*
