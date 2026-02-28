---
phase: 58-security-hardening
plan: 02
subsystem: security
tags: [hmac, webhook, authorization, idor, edge-functions, docuseal, crypto]

# Dependency graph
requires:
  - phase: 58-01
    provides: "Shared CORS helper (_shared/cors.ts) and deno.json import map"
provides:
  - "Fail-closed HMAC-SHA256 webhook verification for docuseal-webhook"
  - "Ownership authorization checks on all 5 docuseal lease actions"
  - "Ownership authorization check on generate-pdf leaseId mode"
affects: [59-payment-checkout, 61-tenant-onboarding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "HMAC-SHA256 webhook verification via Web Crypto API (crypto.subtle.importKey + sign + timingSafeEqual)"
    - "Ownership check pattern: fetch lease owner_user_id, compare to authenticated user.id, return generic 403"
    - "Dual authorization for tenant actions: allow owner OR primary_tenant_id match"

key-files:
  created: []
  modified:
    - "supabase/functions/docuseal-webhook/index.ts"
    - "supabase/functions/docuseal/index.ts"
    - "supabase/functions/generate-pdf/index.ts"

key-decisions:
  - "Use crypto.subtle.timingSafeEqual for constant-time HMAC comparison to prevent timing attacks"
  - "Return generic 403 Forbidden instead of 404 Not Found for lease lookups to prevent resource enumeration"
  - "sign-tenant action allows both owner and primary tenant via tenants table lookup"

patterns-established:
  - "Webhook HMAC: read body as text, compute HMAC-SHA256, constant-time compare, then JSON.parse"
  - "Ownership guard: all Edge Function actions that operate on leases verify owner_user_id === user.id before proceeding"
  - "Generic error responses: 401 for auth failures, 403 for authorization failures, never 404 for access-controlled resources"

requirements-completed: [SEC-01, SEC-02, SEC-03]

# Metrics
duration: 22min
completed: 2026-02-26
---

# Phase 58 Plan 02: Edge Function Auth Hardening Summary

**Fail-closed HMAC-SHA256 webhook verification and ownership authorization checks closing auth bypass and IDOR vulnerabilities in DocuSeal and generate-pdf Edge Functions**

## Performance

- **Duration:** 22 min
- **Started:** 2026-02-26T16:44:51Z
- **Completed:** 2026-02-26T17:07:43Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Replaced fail-open webhook secret check with fail-closed HMAC-SHA256 verification using Web Crypto API (SEC-01)
- Added ownership authorization to all 5 docuseal lease actions with generic 403 responses (SEC-02)
- Added ownership check to generate-pdf leaseId mode preventing cross-tenant PDF generation (SEC-03)
- sign-tenant action correctly allows both lease owner and primary tenant to sign

## Task Commits

Each task was committed atomically:

1. **Task 1: Fail-closed HMAC verification for DocuSeal webhook (SEC-01)** - `c89fa0e24` (fix)
2. **Task 2: Ownership authorization for DocuSeal and generate-pdf Edge Functions (SEC-02, SEC-03)** - `bd4c410d5` (fix)

## Files Created/Modified
- `supabase/functions/docuseal-webhook/index.ts` - Fail-closed HMAC-SHA256 signature verification via Web Crypto API
- `supabase/functions/docuseal/index.ts` - Ownership checks on all 5 actions, dual owner/tenant auth for sign-tenant, 404->403 conversion
- `supabase/functions/generate-pdf/index.ts` - Ownership check before buildLeasePreviewHtml in leaseId mode

## Decisions Made
- Used `crypto.subtle.timingSafeEqual` for constant-time HMAC comparison -- prevents timing side-channel attacks on signature verification
- Converted all "Lease not found" 404 responses to generic 403 Forbidden -- prevents attackers from enumerating valid lease IDs
- sign-tenant performs a separate tenants table lookup to resolve user_id to tenant_id for primary_tenant_id comparison

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. DOCUSEAL_WEBHOOK_SECRET must already be set in Supabase Edge Function secrets for webhook verification to work.

## Next Phase Readiness
- All Edge Functions now have proper authentication and authorization
- DocuSeal webhook is protected against forged payloads via HMAC-SHA256
- No IDOR vulnerabilities remain in docuseal or generate-pdf Edge Functions
- Ready for Phase 59 (payment checkout) which will follow the same ownership check patterns

## Self-Check: PASSED

- FOUND: supabase/functions/docuseal-webhook/index.ts
- FOUND: supabase/functions/docuseal/index.ts
- FOUND: supabase/functions/generate-pdf/index.ts
- FOUND: .planning/phases/58-security-hardening/58-02-SUMMARY.md
- FOUND: commit c89fa0e24
- FOUND: commit bd4c410d5

---
*Phase: 58-security-hardening*
*Completed: 2026-02-26*
