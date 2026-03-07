---
phase: 04-edge-function-hardening
plan: 04
subsystem: infra
tags: [edge-functions, xss, env-validation, error-sanitization, docuseal, pdf, auth-email, security]

requires:
  - phase: 04-edge-function-hardening
    provides: Shared utilities (errors.ts, env.ts, escape-html.ts) from Plan 01
provides:
  - XSS escaping on all HTML-generating Edge Functions (docuseal, generate-pdf)
  - Env validation + error sanitization on final 4 Edge Functions
  - CLAUDE.md updated with Phase 4 hardening conventions
  - All 15 Edge Functions fully hardened
affects: []

tech-stack:
  added: []
  patterns: ["escapeHtml() on all user-provided HTML template values", "validateEnv() + errorResponse() on all 15 Edge Functions"]

key-files:
  created: []
  modified:
    - supabase/functions/docuseal/index.ts
    - supabase/functions/docuseal-webhook/index.ts
    - supabase/functions/generate-pdf/index.ts
    - supabase/functions/auth-email-send/index.ts
    - CLAUDE.md

key-decisions:
  - "EDGE-06: Keep service_role for all Edge Functions per research recommendation — all functions verify auth.uid() via getUser(token)"
  - "EDGE-09: Invitation code in URL (email link) is acceptable — code is single-use, expiring, rate-limited, and accept requires JWT"
  - "generate-pdf inline styles moved to CSS classes for lease preview HTML (cleaner template, same PDF output)"
  - "auth-email-send error messages sanitized — 'Invalid payload' instead of exposing field names"
  - "docuseal unknown action error sanitized — no longer echoes user-provided action string"

patterns-established:
  - "All 15 Edge Functions follow identical hardening pattern: validateEnv + errorResponse + no error message leaks"
  - "HTML-generating functions (docuseal, generate-pdf, auth-email-templates) all use escapeHtml for user values"

requirements-completed: [EDGE-01, EDGE-03, EDGE-06, EDGE-07, EDGE-09, DOC-01]

duration: 6min
completed: 2026-03-05
---

# Phase 4 Plan 4: Final Edge Function Hardening + CLAUDE.md Update

**XSS escaping on docuseal + generate-pdf, env validation + error sanitization on final 4 Edge Functions, EDGE-06/EDGE-09 assessed, CLAUDE.md updated with Phase 4 conventions**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-05
- **Completed:** 2026-03-05
- **Tasks:** 2 (Task 1: 4 Edge Functions, Task 2: CLAUDE.md)
- **Files modified:** 5

## Accomplishments

- Added `escapeHtml()` to all user-provided HTML interpolations in docuseal/index.ts (12 escaping points: propertyAddress, unitNumber, startDate, endDate, rentAmount, ownerName x2, tenantName x2, landlord_notice_address, immediate_family_members)
- Added `escapeHtml()` to all user-provided HTML interpolations in generate-pdf/index.ts (19 escaping points: report title x2, date x2, header cells, table cells, property name, address, unit, dates, rent, deposit, status)
- Converted generate-pdf lease preview from inline styles to CSS classes (cleaner template)
- Added `validateEnv()` and `errorResponse()` to all 4 remaining Edge Functions (docuseal, docuseal-webhook, generate-pdf, auth-email-send)
- Sanitized all error message leaks: PDF generation errors, DocuSeal API errors, DB update errors, unknown action echo
- Updated CLAUDE.md Edge Functions section with 6 new hardening conventions
- Assessed EDGE-06 (JWT vs service_role) — kept service_role per research recommendation
- Verified EDGE-09 (invitation code safety) — POST-only for Edge Functions, URL code is standard email invitation pattern with single-use + expiration + rate limiting

## Task Commits

Committed atomically after all tasks completed.

## Files Modified

- `supabase/functions/docuseal/index.ts` — escapeHtml on 12 interpolation points, validateEnv, errorResponse (9 error leaks fixed), unknown action sanitized
- `supabase/functions/docuseal-webhook/index.ts` — validateEnv (replaces manual env checks), errorResponse (1 error leak fixed)
- `supabase/functions/generate-pdf/index.ts` — escapeHtml on 19 interpolation points, validateEnv, errorResponse (2 error leaks fixed), inline styles to CSS classes
- `supabase/functions/auth-email-send/index.ts` — validateEnv, errorResponse, sanitized error messages
- `CLAUDE.md` — Added error responses, env validation, rate limiting, XSS escaping, CORS fail-closed, CSP, Upstash env secrets conventions

## Decisions Made

- **EDGE-06 (JWT vs service_role):** All Edge Functions keep service_role for DB operations. The security benefit of switching reads to JWT is minimal since every function already verifies auth.uid() explicitly via getUser(token). Service_role avoids RLS double-check overhead for server-to-server operations.
- **EDGE-09 (Invitation code):** The invitation code appears in the URL as a query parameter (standard email invitation link pattern). This is acceptable because: (1) the code is single-use and marked as `accepted` after use, (2) has an expiration timestamp, (3) both Edge Function endpoints are rate-limited at 10 req/min, (4) the accept endpoint requires JWT authentication. No exchange token pattern needed.
- **generate-pdf inline styles:** Moved lease preview HTML from inline styles to CSS classes. This produces identical PDF output but is cleaner and avoids the repeated inline style strings.
- **auth-email-send error sanitization:** Changed "Invalid payload: missing user.email or email_data.email_action_type" to just "Invalid payload" and "Unsupported email action type: ${unknownType}" to "Unsupported email action type" to avoid leaking field structure.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 5 - Improvement] Inline styles in generate-pdf lease preview**
- **Found during:** Task 1 (generate-pdf hardening)
- **Issue:** buildLeasePreviewHtml used inline styles on every `<td>` element (repeated 16 times)
- **Fix:** Extracted to CSS classes (.label, .value, .note) in a `<style>` block
- **Files modified:** supabase/functions/generate-pdf/index.ts
- **Verification:** HTML output is semantically identical, PDF rendering unchanged
- **Committed in:** Same commit as hardening changes

---

**Total deviations:** 1 auto-fixed (1 improvement)
**Impact on plan:** Minor cleanup aligned with CLAUDE.md "no inline styles" rule. No scope creep.

## Issues Encountered
- None

## User Setup Required
- None — all required shared utilities and env vars were already configured by Plans 01-03

## Phase Completion

With Plan 04 complete, all 15 Edge Functions are now fully hardened:
- Plans 01-02: 8 functions (stripe-checkout-session, stripe-checkout, stripe-billing-portal, stripe-connect, tenant-invitation-accept, tenant-invitation-validate, stripe-webhooks, stripe-autopay-charge, stripe-rent-checkout, detach-payment-method)
- Plan 03: 1 function (export-report)
- Plan 04: 4 functions (docuseal, docuseal-webhook, generate-pdf, auth-email-send)

All functions have: validateEnv, errorResponse, no error message leaks, and (where applicable) escapeHtml for HTML templates.

---
*Phase: 04-edge-function-hardening*
*Completed: 2026-03-05*
