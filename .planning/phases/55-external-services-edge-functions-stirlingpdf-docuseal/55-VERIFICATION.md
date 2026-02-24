---
phase: 55-external-services-edge-functions-stirlingpdf-docuseal
verified: 2026-02-22T00:00:00Z
status: human_needed
score: 10/10 must-haves verified
re_verification: true
gaps: []
human_verification:
  - test: "Trigger PDF download from /financials year-end report"
    expected: "Request hits generate-pdf Edge Function (visible in Supabase logs), PDF downloads successfully"
    why_human: "Cannot verify live k3s StirlingPDF connectivity programmatically"
  - test: "Send a lease for signature via DocuSeal"
    expected: "Request hits docuseal Edge Function, DocuSeal k3s instance sends emails to owner and tenant"
    why_human: "Cannot verify live DocuSeal k3s API connectivity programmatically"
  - test: "Simulate DocuSeal form.completed webhook delivery to /functions/v1/docuseal-webhook"
    expected: "owner_signed_at or tenant_signed_at is updated on the correct lease row"
    why_human: "Requires live Supabase Edge Function deployment and test data"
  - test: "Simulate DocuSeal submission.completed webhook delivery"
    expected: "lease_status flips to 'active' and a notification row is inserted for the owner"
    why_human: "Requires live Supabase Edge Function deployment and test data"
---

# Phase 55 Verification

## Goal

Migrate all PDF generation and DocuSeal document signing from NestJS backend to Supabase Edge Functions. Create generate-pdf and docuseal Edge Functions. Remove all NestJS PDF/StirlingPDF dependencies.

## Must-Haves Check

This is a re-verification after plan 55-04 closed the gaps found in the initial verification (2026-02-22T09:06:56Z).

| # | Must-Have Truth | Status | Evidence |
|---|-----------------|--------|----------|
| 1 | `callGeneratePdfFromHtml` is exported from `use-reports.ts` | PASS | `export async function callGeneratePdfFromHtml` at line 835 of `apps/frontend/src/hooks/api/use-reports.ts` |
| 2 | `reports/page.tsx` no longer uses `apiRequestRaw` for PDF | PASS | `grep "apiRequestRaw\|api/v1/reports/export/pdf" reports/page.tsx` — zero matches; uses `callGeneratePdfFromHtml` (lines 9, 100) |
| 3 | `dashboard-filters.tsx` no longer uses `apiRequestRaw` for PDF | PASS | `grep "apiRequestRaw\|api/v1/reports/export/pdf" dashboard-filters.tsx` — zero matches; uses `callGeneratePdfFromHtml` (lines 24, 149) |
| 4 | `lease-template-builder.client.tsx` no longer uses `API_BASE_URL` or NestJS pdf calls | PASS | `grep "API_BASE_URL\|api/v1/pdf" lease-template-builder.client.tsx` — zero matches; calls `generate-pdf` EF directly (line 161) |
| 5 | `send-for-signature-button.tsx` no longer uses `apiRequestRaw` for PDF | PASS | `grep "apiRequestRaw\|api/v1/leases.*pdf" send-for-signature-button.tsx` — zero matches; calls `generate-pdf` EF with leaseId (line 128) |
| 6 | `generate-pdf` EF handles leaseId request mode | PASS | `leaseId` in `RequestBody` union (line 22); `buildLeasePreviewHtml` function (lines 74–136); leaseId dispatch branch in handler (lines 191–199) |
| 7 | Zero remaining NestJS PDF callsites in frontend | PASS | `grep -r "api/v1/pdf\|api/v1/reports/export/pdf\|api/v1/leases.*pdf" apps/frontend/src/` — zero matches |
| 8 | Frontend typechecks pass | PASS | `pnpm --filter @repo/frontend typecheck` exits 0 with zero errors |
| 9 | generate-pdf EF was already verified to call StirlingPDF (from initial verification) | PASS | `generate-pdf/index.ts` (168+ lines): JWT auth, `AbortSignal.timeout(30_000)`, multipart POST to `STIRLING_PDF_URL/api/v1/misc/html-to-pdf`, streams PDF arrayBuffer |
| 10 | All 5 signature mutations call docuseal Edge Function (from initial verification) | PASS | `grep -c "apiRequest" use-lease.ts = 0`; 7 occurrences of `callDocuSealEdgeFunction`; all 5 mutations verified |

**Score:** 10/10 must-haves pass

## Observable Truths Check

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | generate-pdf Edge Function accepts report payload, calls StirlingPDF k3s, returns PDF blob | VERIFIED | `supabase/functions/generate-pdf/index.ts`: JWT auth, 30s timeout, multipart POST to `STIRLING_PDF_URL/api/v1/misc/html-to-pdf`, PDF blob response |
| 2 | docuseal Edge Function handles signing requests and DocuSeal API calls | VERIFIED | `supabase/functions/docuseal/index.ts` (601 lines): 5 action handlers, JWT auth, `X-Auth-Token`, DOCUSEAL_URL + DOCUSEAL_API_KEY |
| 3 | Lease document sent for e-signature end-to-end | VERIFIED | `use-lease.ts` calls `/functions/v1/docuseal`; docuseal EF calls DocuSeal API; docuseal-webhook EF updates DB |
| 4 | Year-end financial PDF generated end-to-end via hooks | VERIFIED | `useDownloadYearEndPdf` and `useDownloadTaxDocumentPdf` call `callGeneratePdfEdgeFunction` → `/functions/v1/generate-pdf` |
| 5 | Both Edge Functions accessible; NestJS StirlingPDF and DocuSeal modules not reachable from frontend | VERIFIED | `grep -r "api/v1/pdf\|api/v1/reports/export/pdf\|api/v1/leases.*pdf" apps/frontend/src/` = 0 matches; all four previously-failing callsites now route through generate-pdf EF |
| 6 | export-report EF delegates format=pdf to generate-pdf | VERIFIED | `export-report/index.ts`: zero `501` occurrences; contains `generate-pdf` in 3 places |
| 7 | `useDownloadYearEndPdf`/`useDownloadTaxDocumentPdf` trigger browser download | VERIFIED | Both mutations call `callGeneratePdfEdgeFunction`; helper triggers download via Blob + URL.createObjectURL + anchor.click() |
| 8 | StirlingPDF call uses 30s AbortSignal timeout | VERIFIED | `generate-pdf/index.ts`: `signal: AbortSignal.timeout(30_000)` |
| 9 | All 5 signature mutations call docuseal EF, zero `apiRequest()` calls in `use-lease.ts` | VERIFIED | `grep -c "apiRequest" use-lease.ts = 0`; 7 occurrences of `callDocuSealEdgeFunction` |
| 10 | docuseal-webhook processes form.completed and submission.completed with idempotency | VERIFIED | `docuseal-webhook/index.ts` (274 lines): idempotency checks on `owner_signed_at`, `tenant_signed_at`, `lease_status === 'active'`; notification inserts |

**Score:** 10/10 truths verified (was 8/10 in initial verification; truths 5 and 4 partial are now fully resolved)

## Required Artifacts Check

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/functions/generate-pdf/index.ts` | StirlingPDF EF with 3 request modes | PASS | 3 modes: `{ reportType, year }`, `{ html }`, `{ leaseId }`; `buildLeasePreviewHtml` added in plan 55-04 |
| `supabase/functions/export-report/index.ts` | Updated to delegate format=pdf to generate-pdf | PASS | Contains `generate-pdf` in 3 places; zero `501` occurrences |
| `apps/frontend/src/hooks/api/use-reports.ts` | `callGeneratePdfFromHtml` exported + `callGeneratePdfEdgeFunction` | PASS | Both exported helpers confirmed present |
| `supabase/functions/docuseal/index.ts` | DocuSeal outbound EF with 5 actions | PASS | 601 lines; all 5 actions verified |
| `apps/frontend/src/hooks/api/use-lease.ts` | All 5 signature mutations use docuseal EF | PASS | Zero `apiRequest()` calls; 7 `callDocuSealEdgeFunction` occurrences |
| `supabase/functions/docuseal-webhook/index.ts` | DocuSeal inbound webhook | PASS | 274 lines; form.completed and submission.completed handlers; idempotency; notification insert |

## Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `reports/page.tsx` | `generate-pdf` EF | `callGeneratePdfFromHtml` in `use-reports.ts` | WIRED |
| `dashboard-filters.tsx` | `generate-pdf` EF | `callGeneratePdfFromHtml` in `use-reports.ts` | WIRED |
| `lease-template-builder.client.tsx` | `generate-pdf` EF | `fetch /functions/v1/generate-pdf` with `{ html: previewHtml }` | WIRED |
| `send-for-signature-button.tsx` | `generate-pdf` EF | `fetch /functions/v1/generate-pdf` with `{ leaseId }` | WIRED |
| `use-reports.ts` | `generate-pdf` EF | `fetch /functions/v1/generate-pdf` | WIRED |
| `generate-pdf/index.ts` | StirlingPDF k3s | `STIRLING_PDF_URL` env var | WIRED |
| `use-lease.ts` | `docuseal` EF | `fetch /functions/v1/docuseal` | WIRED |
| `docuseal/index.ts` | DocuSeal k3s | `DOCUSEAL_URL` + `DOCUSEAL_API_KEY` env vars | WIRED |
| `docuseal-webhook/index.ts` | `leases` table | service role client update | WIRED |
| `docuseal-webhook/index.ts` | `notifications` table | `supabase.from('notifications').insert` | WIRED |

## Requirements Traceability

| Requirement | Description | Plans | Status |
|-------------|-------------|-------|--------|
| EXT-01 | PDF generation requests from frontend routed through Supabase Edge Function calling self-hosted StirlingPDF HTTP API | 55-01-PLAN.md (generate-pdf EF), 55-04-PLAN.md (close remaining NestJS callsites) | SATISFIED — generate-pdf EF created (plan 01); all four remaining NestJS PDF callsites closed (plan 04); zero frontend NestJS PDF calls remain |
| EXT-02 | DocuSeal template creation, signing requests, and webhook completions handled by Supabase Edge Functions | 55-02-PLAN.md (docuseal EF), 55-03-PLAN.md (docuseal-webhook EF) | SATISFIED — docuseal (outbound) and docuseal-webhook (inbound) EFs fully implemented; all 5 signature mutations migrated |

Both requirements from phase 55 are now fully satisfied. No outstanding gaps remain in static code analysis.

## Human Verification Required

The following items cannot be verified programmatically and require live environment testing:

### 1. StirlingPDF PDF generation smoke test

**Test:** Navigate to `/reports` or `/financials`, trigger a year-end PDF download
**Expected:** Spinner appears while generating; PDF downloads automatically; Supabase Edge Function logs show a successful call to `generate-pdf`; StirlingPDF on k3s returns 200
**Why human:** Cannot verify live k3s StirlingPDF connectivity programmatically; requires deployed Edge Functions and accessible StirlingPDF instance

### 2. DocuSeal send-for-signature smoke test

**Test:** Navigate to a lease detail page, click "Send for Signature"
**Expected:** Request hits the docuseal Edge Function (visible in Supabase logs); DocuSeal k3s sends signing emails to owner and tenant; `docuseal_submission_id` and `sent_for_signature_at` are set on the lease record
**Why human:** Requires live DocuSeal k3s API connectivity and test lease data

### 3. DocuSeal form.completed webhook delivery

**Test:** POST a `form.completed` payload to `/functions/v1/docuseal-webhook` with a valid `submission_id` matching a lease
**Expected:** `owner_signed_at` or `tenant_signed_at` updated on the correct lease row; idempotent on re-delivery (returns 200 without double-write)
**Why human:** Requires deployed Edge Function and test lease data with `docuseal_submission_id` set

### 4. DocuSeal submission.completed webhook delivery

**Test:** POST a `submission.completed` payload to `/functions/v1/docuseal-webhook`
**Expected:** `lease_status` flips to `'active'`; a notification row is inserted with `notification_type: 'lease'`; idempotent on re-delivery
**Why human:** Requires deployed Edge Function and DB access to verify atomic writes

## Summary

Phase 55 is **fully complete** at the static code analysis level. All automated checks pass:

- `callGeneratePdfFromHtml` is exported from `use-reports.ts` and used by `reports/page.tsx` and `dashboard-filters.tsx`
- `lease-template-builder.client.tsx` calls the generate-pdf Edge Function directly with pre-built HTML (no NestJS)
- `send-for-signature-button.tsx` calls the generate-pdf Edge Function with `{ leaseId }` mode (no NestJS)
- `generate-pdf` Edge Function supports three request modes: `{ reportType, year }`, `{ html }`, `{ leaseId }` — the leaseId mode was added in plan 55-04
- `grep -r "api/v1/pdf|api/v1/reports/export/pdf|api/v1/leases.*pdf" apps/frontend/src/` returns zero matches
- `pnpm --filter @repo/frontend typecheck` exits 0 with zero errors

The four callsites identified as gaps in the initial verification (2026-02-22T09:06:56Z) have all been resolved by plan 55-04. EXT-01 and EXT-02 are both fully satisfied.

The status is `human_needed` rather than `passed` because live integration with the self-hosted k3s StirlingPDF and DocuSeal instances cannot be verified programmatically — that requires a human to trigger real workflows in a deployed environment.

---

_Initial verification: 2026-02-22T09:06:56Z (status: gaps_found, score: 8/10)_
_Re-verification: 2026-02-22 (status: human_needed, score: 10/10)_
_Verifier: Claude (gsd-verifier)_
