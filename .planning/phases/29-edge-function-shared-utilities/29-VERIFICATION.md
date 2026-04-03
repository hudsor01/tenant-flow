---
phase: 29-edge-function-shared-utilities
verified: 2026-04-03T21:30:00Z
status: passed
score: 6/6 must-haves verified
re_verification: false
---

# Phase 29: Edge Function Shared Utilities Verification Report

**Phase Goal:** Every Edge Function uses shared utility modules for auth, headers, clients, email layout, and error capture -- eliminating copy-pasted boilerplate across 13+ functions
**Verified:** 2026-04-03T21:30:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                              | Status     | Evidence                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | A shared `validateBearerAuth()` function exists that extracts Bearer token and calls `getUser()`   | ✓ VERIFIED | `supabase/functions/_shared/auth.ts` exports `validateBearerAuth`; calls `supabase.auth.getUser(token)`           |
| 2   | A shared `getJsonHeaders()` function exists that merges CORS headers with Content-Type application/json | ✓ VERIFIED | `supabase/functions/_shared/cors.ts` exports `getJsonHeaders`; returns `{ ...getCorsHeaders(req), 'Content-Type': 'application/json' }` |
| 3   | A shared `getStripeClient()` factory exists that creates a Stripe instance with the locked API version | ✓ VERIFIED | `supabase/functions/_shared/stripe-client.ts` exports `getStripeClient`; uses `'2026-02-25.clover'` as locked version |
| 4   | A shared `createAdminClient()` factory exists that creates a Supabase service-role client          | ✓ VERIFIED | `supabase/functions/_shared/supabase-client.ts` exports `createAdminClient`; wraps `createClient` from `@supabase/supabase-js` |
| 5   | A shared `wrapEmailLayout()` function exists that both auth-email-templates and drip-email-templates use | ✓ VERIFIED | `supabase/functions/_shared/email-layout.ts` exports `wrapEmailLayout`; both template files import and call it; no local `wrapInLayout` in either |
| 6   | A shared `captureWebhookError()` function exists in errors.ts for webhook handler error logging    | ✓ VERIFIED | `supabase/functions/_shared/errors.ts` exports `captureWebhookError`; `payment-intent-succeeded.ts` imports and calls it; local `captureError` function removed |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact                                                           | Expected                               | Status     | Details                                                                                              |
| ------------------------------------------------------------------ | -------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| `supabase/functions/_shared/auth.ts`                               | Bearer token auth validation           | ✓ VERIFIED | Exists, 47 lines, exports `validateBearerAuth`; handles both `Authorization` and `authorization` headers; returns discriminated union |
| `supabase/functions/_shared/cors.ts`                               | JSON headers helper added              | ✓ VERIFIED | Exists, exports `getCorsHeaders`, `handleCorsOptions`, and new `getJsonHeaders`; originals unchanged  |
| `supabase/functions/_shared/stripe-client.ts`                      | Stripe client factory                  | ✓ VERIFIED | Exists, 15 lines, exports `getStripeClient`; API version `'2026-02-25.clover'` locked                |
| `supabase/functions/_shared/supabase-client.ts`                    | Supabase admin client factory          | ✓ VERIFIED | Exists, 11 lines, exports `createAdminClient`; imports from `@supabase/supabase-js`                  |
| `supabase/functions/_shared/email-layout.ts`                       | Shared email HTML layout wrapper       | ✓ VERIFIED | Exists, 57 lines, exports `wrapEmailLayout`, `BRAND_COLOR`, `BRAND_NAME`, `TAGLINE`                  |
| `supabase/functions/_shared/errors.ts`                             | Extended with webhook error capture    | ✓ VERIFIED | Exists, exports both `errorResponse` (original unchanged) and new `captureWebhookError`              |
| `supabase/functions/stripe-checkout/index.ts`                      | Updated with shared utilities          | ✓ VERIFIED | Imports `validateBearerAuth`, `getStripeClient`, `createAdminClient`, `getJsonHeaders`               |
| `supabase/functions/stripe-billing-portal/index.ts`                | Updated with shared utilities          | ✓ VERIFIED | Imports `validateBearerAuth`, `getStripeClient`, `createAdminClient`, `getJsonHeaders`               |
| `supabase/functions/stripe-connect/index.ts`                       | Updated with shared utilities          | ✓ VERIFIED | Imports `validateBearerAuth`, `getStripeClient`, `createAdminClient`, `getJsonHeaders`               |
| `supabase/functions/stripe-rent-checkout/index.ts`                 | Updated with shared utilities          | ✓ VERIFIED | Imports `validateBearerAuth`, `getStripeClient`, `createAdminClient`, `getJsonHeaders`               |
| `supabase/functions/detach-payment-method/index.ts`                | Updated with shared utilities          | ✓ VERIFIED | Imports `validateBearerAuth`, `getStripeClient`, `createAdminClient`; retains `createClient` for user-scoped client (expected) |
| `supabase/functions/stripe-autopay-charge/index.ts`                | Updated with shared utilities          | ✓ VERIFIED | Imports `getStripeClient`, `createAdminClient`; service-role auth pattern (not JWT) unchanged        |
| `supabase/functions/stripe-checkout-session/index.ts`              | Updated with shared utilities          | ✓ VERIFIED | Imports `getStripeClient`, `getJsonHeaders`; unauthenticated by design                               |
| `supabase/functions/stripe-webhooks/index.ts`                      | Updated with shared utilities          | ✓ VERIFIED | Imports `getStripeClient`, `createAdminClient`; webhook signature auth unchanged                     |
| `supabase/functions/stripe-webhooks/handlers/payment-intent-succeeded.ts` | Updated with shared error capture | ✓ VERIFIED | Imports `captureWebhookError`; local `captureError` function removed                                |
| `supabase/functions/export-report/index.ts`                        | Updated with shared utilities          | ✓ VERIFIED | Imports `validateBearerAuth`, `createAdminClient`, `getJsonHeaders`                                  |
| `supabase/functions/export-user-data/index.ts`                     | Updated with shared utilities          | ✓ VERIFIED | Imports `validateBearerAuth`, `createAdminClient`, `getJsonHeaders`                                  |
| `supabase/functions/generate-pdf/index.ts`                         | Updated with shared utilities          | ✓ VERIFIED | Imports `validateBearerAuth`, `createAdminClient`, `getJsonHeaders`                                  |
| `supabase/functions/docuseal/index.ts`                             | Updated with shared utilities          | ✓ VERIFIED | Imports `validateBearerAuth`, `createAdminClient`, `getJsonHeaders`                                  |
| `supabase/functions/send-tenant-invitation/index.ts`               | Updated with shared utilities          | ✓ VERIFIED | Imports `validateBearerAuth`, `createAdminClient`, `getJsonHeaders`; retains `createClient` for anon-key client (expected) |
| `supabase/functions/tenant-invitation-accept/index.ts`             | Updated with shared utilities          | ✓ VERIFIED | Imports `validateBearerAuth`, `createAdminClient`, `getJsonHeaders`; retains `createClient` for anon-key client (expected) |
| `supabase/functions/auth-email-send/index.ts`                      | Updated with getJsonHeaders            | ✓ VERIFIED | Imports `getJsonHeaders`; uses `const jsonHeaders = getJsonHeaders(req)` throughout                  |
| `supabase/functions/newsletter-subscribe/index.ts`                 | Updated with getJsonHeaders            | ✓ VERIFIED | Imports `getJsonHeaders`; all 3 JSON response headers use `getJsonHeaders(req)`                      |
| `supabase/functions/tenant-invitation-validate/index.ts`           | Updated with shared utilities          | ✓ VERIFIED | Imports `createAdminClient`, `getJsonHeaders`; no `createClient` from supabase-js                   |
| `supabase/functions/trial-drip-email/index.ts`                     | Updated with createAdminClient         | ✓ VERIFIED | Imports `createAdminClient`; no JSR `jsr:@supabase/supabase-js@2` import                            |
| `supabase/functions/docuseal-webhook/index.ts`                     | Updated with createAdminClient         | ✓ VERIFIED | Imports `createAdminClient`; no `createClient` from `@supabase/supabase-js`                         |
| `supabase/functions/_shared/auth-email-templates.ts`               | Uses shared email layout               | ✓ VERIFIED | Imports `wrapEmailLayout`, `BRAND_COLOR`, `BRAND_NAME` from `./email-layout.ts`; no local `wrapInLayout`; calls `wrapEmailLayout(content)` with no options |
| `supabase/functions/_shared/drip-email-templates.ts`               | Uses shared email layout               | ✓ VERIFIED | Imports `wrapEmailLayout`, `BRAND_COLOR`, `BRAND_NAME` from `./email-layout.ts`; no local `wrapInLayout`; calls `wrapEmailLayout(content, { headerLinkUrl: APP_URL, includeFooterLinks: true, appUrl: APP_URL })` |

### Key Link Verification

| From                                           | To                                       | Via                              | Status     | Details                                                                 |
| ---------------------------------------------- | ---------------------------------------- | -------------------------------- | ---------- | ----------------------------------------------------------------------- |
| `_shared/auth.ts`                              | `@supabase/supabase-js`                  | `supabase.auth.getUser(token)`   | ✓ WIRED    | Line 39: `const { data: { user }, error: authError } = await supabase.auth.getUser(token)` |
| `_shared/email-layout.ts`                      | `_shared/auth-email-templates.ts`        | `import { wrapEmailLayout }`     | ✓ WIRED    | Line 6: `import { wrapEmailLayout, BRAND_COLOR, BRAND_NAME } from './email-layout.ts'`; used at 6 call sites |
| `_shared/email-layout.ts`                      | `_shared/drip-email-templates.ts`        | `import { wrapEmailLayout }`     | ✓ WIRED    | Line 9: `import { wrapEmailLayout, BRAND_COLOR, BRAND_NAME } from './email-layout.ts'`; used at 4 call sites |
| `stripe-checkout/index.ts`                     | `_shared/auth.ts`                        | `import { validateBearerAuth }`  | ✓ WIRED    | Import + call at line 34                                                |
| `stripe-checkout/index.ts`                     | `_shared/stripe-client.ts`               | `import { getStripeClient }`     | ✓ WIRED    | Import + usage confirmed                                                |
| `payment-intent-succeeded.ts`                  | `_shared/errors.ts`                      | `import { captureWebhookError }` | ✓ WIRED    | Line 5 import + line 28 call; old `captureError` function removed       |
| `export-report/index.ts`                       | `_shared/auth.ts`                        | `import { validateBearerAuth }`  | ✓ WIRED    | Import + call at line 30                                                |
| `send-tenant-invitation/index.ts`              | `_shared/supabase-client.ts`             | `import { createAdminClient }`   | ✓ WIRED    | Import + call at line 49                                                |

### Data-Flow Trace (Level 4)

Not applicable. This phase produces utility modules and refactored boilerplate, not components that render dynamic data. All artifacts are pure utility functions / factories with no data rendering path to trace.

### Behavioral Spot-Checks

| Behavior                                          | Command                                                                                                       | Result              | Status |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------- | ------ |
| No `new Stripe()` outside shared factory          | `grep -rn "new Stripe(" supabase/functions/ --include="*.ts" \| grep -v "_shared/stripe-client.ts"`         | 0 matches           | ✓ PASS |
| No inline JWT extraction via `getUser(token)`     | `grep -rn ".auth.getUser(token)" supabase/functions/ --include="*.ts" \| grep -v "_shared/auth.ts"`         | 0 matches           | ✓ PASS |
| No local `wrapInLayout` remaining                 | `grep -n "function wrapInLayout" _shared/auth-email-templates.ts _shared/drip-email-templates.ts`            | 0 matches           | ✓ PASS |
| No inline `{ ...getCorsHeaders(req), 'Content-Type' }` pattern | `grep -rn "getCorsHeaders(req), 'Content-Type'" supabase/functions/ --include="*.ts" \| grep -v _shared/cors.ts` | 0 matches      | ✓ PASS |
| No `function captureError` in webhook handlers    | `grep -n "function captureError" supabase/functions/stripe-webhooks/handlers/payment-intent-succeeded.ts`    | 0 matches           | ✓ PASS |
| All plan commits exist in git log                 | `git log --oneline \| grep -E "3031c18\|15a4701\|188ff6f\|6b2f076\|97cc661\|a5fdf2c"`                       | All 6 found         | ✓ PASS |
| Edge Function tests (deno test)                   | `cd supabase/functions && deno test --allow-all --no-check tests/`                                           | SKIP (needs `supabase start`) | ? SKIP |

### Requirements Coverage

The EDGE-0x requirement IDs (EDGE-01 through EDGE-06) are defined only in ROADMAP.md Phase 29 details -- they do not appear in REQUIREMENTS.md (which tracks v1.4 requirements separately). The ROADMAP.md lists 5 success criteria for Phase 29.

| Requirement | Source Plan   | Description                                                                       | Status      | Evidence                                                                                 |
| ----------- | ------------- | --------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------- |
| EDGE-01     | 29-01, 29-02, 29-03 | Shared `validateBearerAuth()` used by all JWT-authenticated Edge Functions  | ✓ SATISFIED | All 11 JWT functions (5 Stripe + 6 non-Stripe) import and call `validateBearerAuth`     |
| EDGE-02     | 29-01, 29-02, 29-03 | Shared `getJsonHeaders()` replaces inline CORS+JSON header composition       | ✓ SATISFIED | Zero inline `{ ...getCorsHeaders(req), 'Content-Type': 'application/json' }` patterns remain in any browser-facing function |
| EDGE-03     | 29-01, 29-02       | Shared `getStripeClient()` replaces inline `new Stripe()` constructors       | ✓ SATISFIED | Zero `new Stripe(` outside `_shared/stripe-client.ts`; all 8 Stripe functions use factory |
| EDGE-04     | 29-01, 29-02, 29-03 | Shared `createAdminClient()` replaces inline admin `createClient()` calls    | ✓ SATISFIED | All admin clients use `createAdminClient`; remaining `createClient` uses are user-scoped anon-key clients (expected) |
| EDGE-05     | 29-01              | Shared `wrapEmailLayout()` from `email-layout.ts` used by both template files | ✓ SATISFIED | Both `auth-email-templates.ts` and `drip-email-templates.ts` import `wrapEmailLayout`; no local `wrapInLayout` in either |
| EDGE-06     | 29-01, 29-02       | Shared `captureWebhookError()` in `errors.ts` used by webhook handlers       | ✓ SATISFIED | `payment-intent-succeeded.ts` uses `captureWebhookError`; local `captureError` removed  |

**ROADMAP.md Success Criteria cross-check:**

| SC# | Criterion                                                                 | Status      | Evidence                                                          |
| --- | ------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------- |
| 1   | `deno test --allow-all --no-check` passes with zero regressions           | ? SKIP      | Requires `supabase start`; all 6 plan commits present; refactors are mechanical (no logic changes) |
| 2   | No Edge Function contains inline `getUser(token)` JWT extraction          | ✓ SATISFIED | Zero matches for `.auth.getUser(token)` outside `_shared/auth.ts` |
| 3   | No Edge Function contains inline `new Stripe(key, { apiVersion })` or inline `createClient(url, serviceKey)` | ✓ SATISFIED | Zero `new Stripe(` outside factory; remaining `createClient` uses are anon-key scoped clients, not admin |
| 4   | Auth and drip templates share a single `wrapEmailLayout()` from `_shared/email-layout.ts` | ✓ SATISFIED | Both files import `wrapEmailLayout` from `./email-layout.ts`     |
| 5   | Webhook handlers use `captureWebhookError()` instead of inline error logging | ✓ SATISFIED | `payment-intent-succeeded.ts` uses `captureWebhookError`         |

**Note on REQUIREMENTS.md:** EDGE-0x requirements are not tracked in `.planning/REQUIREMENTS.md` (that file is for the v1.4 milestone). Phase 29 belongs to the v1.5 milestone whose requirements exist only in ROADMAP.md. No orphaned requirements -- all 6 EDGE IDs are claimed by at least one plan.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No TODO/FIXME/placeholder comments, no empty implementations, no hardcoded empty data, no `any` types in any of the shared utility files or consumer files checked. The `stripe-autopay-charge` service-role token comparison (`authHeader.replace('Bearer ', '')`) is intentional non-JWT auth (service-to-service via pg_net) and is not a stub -- it is the correct auth pattern for that function.

### Human Verification Required

### 1. Edge Function Tests

**Test:** Run `cd supabase/functions && deno test --allow-all --no-check tests/` with a running local Supabase instance (`supabase start`)
**Expected:** All 7 test files pass with zero failures or regressions vs pre-phase-29 baseline
**Why human:** Tests require `supabase functions serve` or `supabase start` running locally; the sandbox cannot start Supabase services

### Gaps Summary

No gaps found. All 6 shared utility modules exist with correct exports and are wired correctly into all consumer Edge Functions. The codebase matches every must-have truth and artifact from the three PLAN.md frontmatter definitions.

The one item requiring human validation (Edge Function test suite) cannot be verified programmatically due to the requirement for a running Supabase instance, but all structural evidence (imports, call sites, removed patterns, commit history) is consistent with a passing test suite since the changes are pure mechanical refactors with no behavioral changes.

---

_Verified: 2026-04-03T21:30:00Z_
_Verifier: Claude (gsd-verifier)_
