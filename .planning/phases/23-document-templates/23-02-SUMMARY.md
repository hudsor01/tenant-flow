---
phase: 23-document-templates
plan: 02
subsystem: ui
tags: [pdf, edge-function, blob-url, template, html-to-pdf, stirlingpdf]

requires:
  - phase: 23-document-templates
    provides: "TemplatePreviewOptions types, template page components, useTemplatePdf stub hook"
provides:
  - "buildTemplateHtml pure function converting TemplatePreviewOptions to styled HTML"
  - "Working useTemplatePdf hook with real Edge Function calls for preview and export"
  - "PDF preview in iframe via blob URL"
  - "PDF export via callGeneratePdfFromHtml browser download"
affects: [document-templates, reports]

tech-stack:
  added: []
  patterns:
    - "HTML-to-PDF generation via buildTemplateHtml + generate-pdf Edge Function"
    - "Blob URL for PDF iframe preview with revocation on re-generate and unmount"
    - "Debounced preview generation (500ms) to prevent rapid Edge Function calls"

key-files:
  created:
    - "src/app/(owner)/documents/templates/components/build-template-html.ts"
    - "src/app/(owner)/documents/templates/components/build-template-html.test.ts"
  modified:
    - "src/app/(owner)/documents/templates/components/use-template-pdf.ts"
    - "src/app/(owner)/documents/templates/components/use-template-pdf.test.ts"

key-decisions:
  - "Local escapeHtml helper in build-template-html.ts rather than importing from Edge Function _shared/ (different runtime)"
  - "Inline CSS in HTML document for StirlingPDF isolation (no external stylesheets)"
  - "Preview uses direct fetch + blob URL; export reuses callGeneratePdfFromHtml from report-mutations"
  - "useRef for blob URL tracking instead of state dependency in cleanup effect"

patterns-established:
  - "HTML template generation: pure function -> inline CSS -> escapeHtml for all user content"
  - "PDF preview: fetch blob -> createObjectURL -> iframe src, revoke previous URL"

requirements-completed: [DOC-01, DOC-02]

duration: 12min
completed: 2026-03-11
---

# Phase 23 Plan 02: PDF Preview/Export Summary

**Wire useTemplatePdf to generate-pdf Edge Function with buildTemplateHtml for preview (iframe blob URL) and export (browser download) across all 5 template types**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-11T22:10:17Z
- **Completed:** 2026-03-11T22:22:22Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created buildTemplateHtml pure function that converts TemplatePreviewOptions to a styled HTML document with inline CSS, XSS escaping, data sections, custom fields, clauses, and footer
- Replaced stub useTemplatePdf hook with real Edge Function integration -- preview renders PDF in iframe via blob URL, export triggers browser download
- 29 unit tests total (14 for buildTemplateHtml, 15 for useTemplatePdf) covering happy path, error handling, debounce, cleanup
- All 5 template types (maintenance-request, property-inspection, rental-application, tenant-notice, lease) get working preview/export without any code changes to their template pages

## Task Commits

Each task was committed atomically:

1. **Task 1: Create buildTemplateHtml pure function with tests** - `b1d5607` (feat)
2. **Task 2: Wire useTemplatePdf to generate-pdf Edge Function** - `e5d33ee` (feat)

_Note: TDD tasks had RED -> GREEN flow (tests written first, then implementation)_

## Files Created/Modified
- `src/app/(owner)/documents/templates/components/build-template-html.ts` - Pure function converting TemplatePreviewOptions to full HTML document string with inline CSS
- `src/app/(owner)/documents/templates/components/build-template-html.test.ts` - 14 unit tests for HTML generation, XSS escaping, data rendering
- `src/app/(owner)/documents/templates/components/use-template-pdf.ts` - Wired to generate-pdf Edge Function for both preview (fetch + blob URL) and export (callGeneratePdfFromHtml)
- `src/app/(owner)/documents/templates/components/use-template-pdf.test.ts` - 15 unit tests covering preview, export, debounce, errors, cleanup (replaced stub tests)

## Decisions Made
- Used local escapeHtml helper (5 lines) instead of importing from `supabase/functions/_shared/escape-html.ts` since that is a Deno module not available in the Next.js runtime
- Inline CSS in generated HTML because StirlingPDF renders in isolation without access to external stylesheets
- Preview path uses direct fetch to get a blob for iframe display; export path reuses the proven callGeneratePdfFromHtml helper (anchor click download pattern from Phase 22)
- Used useRef for blob URL tracking to avoid stale closure issues in cleanup effect

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing typecheck failure in template-definition.test.ts**
- **Found during:** Task 1 (commit attempt)
- **Issue:** `template-definition.test.ts` from phase 23-01 had `Object is possibly 'undefined'` errors on array indexing
- **Fix:** Added optional chaining (`fields[0]?.name` instead of `fields[0].name`)
- **Files modified:** `src/app/(owner)/documents/templates/components/template-definition.test.ts`
- **Committed in:** b1d5607 (part of Task 1 commit)

**2. [Rule 3 - Blocking] Added eslint-disable for hex color lint rule in PDF generation files**
- **Found during:** Task 1 (commit attempt)
- **Issue:** `color-tokens/no-hex-colors` eslint rule flagged hex colors in PDF inline CSS (not UI colors)
- **Fix:** File-level `/* eslint-disable color-tokens/no-hex-colors */` with explanation comment
- **Files modified:** `build-template-html.ts`, `build-template-html.test.ts`
- **Committed in:** b1d5607 (part of Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for clean commit. No scope creep.

## Issues Encountered
- Lefthook auto-backup stash caused Task 1 files to be swept into the phase 23-01 commit (b1d5607). The files are correctly committed with proper content but share a commit with 23-01 work. No functional impact.

## User Setup Required
None - no external service configuration required. The generate-pdf Edge Function is already deployed.

## Next Phase Readiness
- PDF preview/export working for all 5 document template types
- Phase 23 (Document Templates) is complete: plan 01 handled template definition persistence, plan 02 handled PDF preview/export
- Ready for Phase 24 (Bulk Property Import) or Phase 25 (Maintenance Photos/Stripe Dashboard)

---
*Phase: 23-document-templates*
*Completed: 2026-03-11*
