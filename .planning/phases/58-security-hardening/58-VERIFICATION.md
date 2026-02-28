---
phase: 58-security-hardening
verified: 2026-02-26T11:20:00Z
status: passed
score: 8/8 requirements verified
re_verification: false
---

# Phase 58: Security Hardening Verification Report

**Phase Goal:** Close all known security vulnerabilities discovered during the v7.0 post-merge review — Edge Function auth bypass, IDOR, injection, constraint mismatch, and dependency pinning.
**Verified:** 2026-02-26T11:20:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | DocuSeal webhook handler returns 401 for requests without a valid signature; no unauthenticated caller can manipulate lease status | VERIFIED | `docuseal-webhook/index.ts` lines 220-276: fail-closed HMAC-SHA256 via `crypto.subtle.importKey` + `timingSafeEqual`; missing secret or header each return 401 immediately |
| 2 | DocuSeal and generate-pdf Edge Functions reject requests where authenticated user does not own target lease (403) | VERIFIED | `docuseal/index.ts`: 10 `Forbidden` responses across all 5 actions; `generate-pdf/index.ts` lines 198-205: ownership check before `buildLeasePreviewHtml` |
| 3 | Stripe webhook `notification_type` INSERT succeeds without CHECK constraint violations | VERIFIED | `stripe-webhooks/index.ts` line 162: `'system'`, line 236: `'payment'` — both within `('maintenance','lease','payment','system')` constraint |
| 4 | All 6 (plan says 6; ROADMAP says 6) frontend insert mutations guard against undefined `owner_user_id` before PostgREST | VERIFIED | `requireOwnerUserId` imported and called in `use-properties.ts`, `use-unit.ts`, `use-maintenance.ts`, `use-lease.ts`, `use-inspections.ts`, `use-vendor.ts`, `use-tenant-portal.ts` (7 total — 6 owner hooks + 1 tenant-portal hook) |
| 5 | Search inputs (properties, units, tenants, maintenance) cannot inject PostgREST filter operators; all 4 inputs sanitized | VERIFIED | `sanitizeSearchInput` called in `property-keys.ts`, `tenant-keys.ts`, `unit-keys.ts`, `use-vendor.ts`; no unsanitized `filters.search` interpolation remains |

**Score from ROADMAP Success Criteria: 5/5 truths verified**

### Extended Plan Must-Haves (from PLAN frontmatter)

All plan-level truths were also verified as documented below.

---

## Required Artifacts

### Plan 01 (SEC-04, SEC-07, SEC-08)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/functions/deno.json` | Pinned import map | VERIFIED | Contains `@supabase/supabase-js@2.49.4` and `stripe@14.25.0` — exact versions |
| `supabase/functions/_shared/cors.ts` | CORS helper with origin restriction | VERIFIED | Exports `getCorsHeaders` and `handleCorsOptions`; reads `FRONTEND_URL` env; returns empty headers for non-matching origins |
| `supabase/functions/stripe-webhooks/index.ts` | Fixed notification_type values | VERIFIED | Line 162: `notification_type: 'system'`; line 236: `notification_type: 'payment'` |

### Plan 02 (SEC-01, SEC-02, SEC-03)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/functions/docuseal-webhook/index.ts` | Fail-closed HMAC verification | VERIFIED | `crypto.subtle.importKey` + `crypto.subtle.sign` + `crypto.subtle.timingSafeEqual`; body read as text first; missing secret/header = immediate 401 |
| `supabase/functions/docuseal/index.ts` | Ownership check before all 5 lease actions | VERIFIED | `owner_user_id` in select and `!== user.id` check for send-for-signature, sign-owner, cancel, resend; dual owner/tenant check for sign-tenant |
| `supabase/functions/generate-pdf/index.ts` | Ownership check in leaseId mode | VERIFIED | Lines 198-205: queries `owner_user_id`, returns 403 if `leaseOwnership.owner_user_id !== user.id` |

### Plan 03 (SEC-05, SEC-06)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/frontend/src/lib/require-owner-user-id.ts` | Guard function with Sentry logging | VERIFIED | Exports `requireOwnerUserId`; throws `'Unable to save. Please refresh and try again.'`; calls `Sentry.captureMessage` at `warning` level |
| `apps/frontend/src/lib/sanitize-search.ts` | PostgREST search sanitizer | VERIFIED | Exports `sanitizeSearchInput`; strips `,.()"'\\`; preserves `%`; trims; 100-char max |
| `apps/frontend/src/lib/__tests__/require-owner-user-id.test.ts` | 4 unit tests | VERIFIED | All 4 cases pass (returns value, throws on undefined, Sentry logged, no Sentry on success) |
| `apps/frontend/src/lib/__tests__/sanitize-search.test.ts` | 13+ unit tests | VERIFIED | 13 test cases pass including injection payload test |

---

## Key Link Verification

### Plan 01

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| 9 browser-facing Edge Functions | `_shared/cors.ts` | `import { getCorsHeaders, handleCorsOptions }` | WIRED | All 9 confirmed: docuseal, export-report, generate-pdf, stripe-billing-portal, stripe-checkout-session, stripe-checkout, stripe-connect, tenant-invitation-accept, tenant-invitation-validate |
| `stripe-webhooks/index.ts` | `_shared/cors.ts` | No import (webhook) | WIRED | No CORS headers present — correctly excluded |
| `docuseal-webhook/index.ts` | `_shared/cors.ts` | No import (webhook) | WIRED | No CORS headers present — correctly excluded |
| All 11 Edge Functions | `deno.json` | Bare specifiers `@supabase/supabase-js`, `stripe` | WIRED | Zero `https://esm.sh/` or `npm:stripe` URL imports remain |

### Plan 02

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `docuseal-webhook/index.ts` | Web Crypto API | `crypto.subtle.importKey` + `sign` + `timingSafeEqual` | WIRED | Line 250-276: full HMAC-SHA256 verification with constant-time compare |
| `docuseal/index.ts` | leases table | `owner_user_id !== user.id` after fetch | WIRED | 5 actions verified; 10 Forbidden responses present |
| `generate-pdf/index.ts` | leases table | `owner_user_id !== user.id` in leaseId path | WIRED | Lines 198-205 confirmed |

### Plan 03

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `use-properties.ts` | `require-owner-user-id.ts` | `requireOwnerUserId(user.user?.id)` | WIRED | Import + call at line 281 |
| `use-unit.ts` | `require-owner-user-id.ts` | `requireOwnerUserId(authData.user?.id)` | WIRED | Import + call at line 160 |
| `use-maintenance.ts` | `require-owner-user-id.ts` | `requireOwnerUserId(user?.id)` | WIRED | Import + call at line 154 |
| `use-lease.ts` | `require-owner-user-id.ts` | `requireOwnerUserId(authData.user?.id)` | WIRED | Import + call at line 229 |
| `use-inspections.ts` | `require-owner-user-id.ts` | `requireOwnerUserId(user.user?.id)` | WIRED | Import + call at line 65 |
| `use-vendor.ts` | `require-owner-user-id.ts` | `requireOwnerUserId(user?.id)` | WIRED | Import + call at line 170 |
| `use-tenant-portal.ts` | `require-owner-user-id.ts` | `requireOwnerUserId(leaseData.owner_user_id)` | WIRED | Import + call at line 923 |
| `property-keys.ts` | `sanitize-search.ts` | `sanitizeSearchInput(filters.search)` | WIRED | Import + call at line 96 |
| `tenant-keys.ts` | `sanitize-search.ts` | `sanitizeSearchInput(filters.search)` | WIRED | Import + call at line 66 |
| `unit-keys.ts` | `sanitize-search.ts` | `sanitizeSearchInput(filters.search)` | WIRED | Import + call at line 78 |
| `use-vendor.ts` | `sanitize-search.ts` | `sanitizeSearchInput(filters.search)` | WIRED | Import + call at line 106 |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SEC-01 | 58-02 | DocuSeal webhook handler rejects unverified requests (fail-closed) | SATISFIED | `docuseal-webhook/index.ts`: missing `DOCUSEAL_WEBHOOK_SECRET` → 401; missing `x-docuseal-signature` header → 401; HMAC mismatch → 401; no `console.warn` fail-open path; no `authorization` header fallback |
| SEC-02 | 58-02 | DocuSeal Edge Function validates ownership before lease actions | SATISFIED | `docuseal/index.ts`: all 5 actions (send-for-signature, sign-owner, sign-tenant, cancel, resend) check `owner_user_id`; sign-tenant additionally checks primary tenant; no 404 responses remain |
| SEC-03 | 58-02 | generate-pdf Edge Function validates ownership before PDF generation | SATISFIED | `generate-pdf/index.ts`: leaseId mode checks `owner_user_id === user.id` before calling `buildLeasePreviewHtml`; non-owner or missing lease → 403 |
| SEC-04 | 58-01 | Stripe webhook `notification_type` CHECK constraint matches actual values | SATISFIED | `stripe-webhooks/index.ts`: `'stripe_connect_verified'` mapped to `'system'`; `'payment_failed'` mapped to `'payment'` — both within constraint `('maintenance','lease','payment','system')` |
| SEC-05 | 58-03 | undefined owner_user_id guarded in all 6 insert mutations | SATISFIED | `requireOwnerUserId` called in 7 locations (6 owner mutation hooks + 1 tenant-portal hook); no unguarded `owner_user_id: userId` pattern remains in any hook |
| SEC-06 | 58-03 | PostgREST filter injection sanitized in all 4 search inputs | SATISFIED | `sanitizeSearchInput` called in property-keys, tenant-keys, unit-keys, use-vendor; no direct `filters.search` interpolation into `.ilike()` or `.or()` remains |
| SEC-07 | 58-01 | CORS wildcard restricted to FRONTEND_URL on browser-facing Edge Functions | SATISFIED | Zero `'Access-Control-Allow-Origin': '*'` across all Edge Functions; 9 browser-facing functions use `getCorsHeaders(req)` which returns headers only when origin matches `FRONTEND_URL` |
| SEC-08 | 58-01 | Edge Function dependencies pinned via deno.json import map | SATISFIED | `supabase/functions/deno.json` pins `@supabase/supabase-js@2.49.4` and `stripe@14.25.0`; zero `https://esm.sh/` or `npm:stripe` URL imports remain across all 11 Edge Functions |

**All 8 requirements (SEC-01 through SEC-08) are SATISFIED.**

No orphaned requirements — all 8 SEC requirements assigned to Phase 58 in REQUIREMENTS.md are accounted for in the three plans.

---

## Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| None | — | — | No TODO/FIXME/placeholder comments, no stub return patterns, no empty implementations found in any modified file |

---

## Human Verification Required

### 1. CORS Origin Matching at Runtime

**Test:** Deploy docuseal Edge Function; send a request with `Origin: https://attacker.com`
**Expected:** Response contains no `Access-Control-Allow-Origin` header
**Why human:** CORS enforcement is ultimately a browser contract — automated grep confirms the logic exists, but runtime behavior with mismatched origins requires a live environment

### 2. FRONTEND_URL Fail-Open Behavior

**Test:** Remove `FRONTEND_URL` env secret from Supabase Edge Function configuration; trigger any browser-facing Edge Function
**Expected:** Function continues to respond (doesn't crash), but CORS headers are absent (warning logged)
**Why human:** Requires live Supabase environment to test env var absence behavior

### 3. DocuSeal Webhook HMAC Against Real DocuSeal Payload

**Test:** Configure DocuSeal webhook with a known secret; send a real `form.completed` event
**Expected:** Request accepted and lease updated; forged request with different secret returns 401
**Why human:** Requires a live DocuSeal account and real webhook signature format to confirm `X-DocuSeal-Signature` header format matches what DocuSeal actually sends

### 4. Vendor Search Debounce UX

**Test:** Navigate to Vendors page; type rapidly in the search box
**Expected:** Queries fire at most once per 300ms after typing stops, not on every keystroke
**Why human:** Debounce timing behavior requires live browser interaction to observe

---

## Commit Verification

All 7 task commits from summaries confirmed in git history:

| Commit | Description |
|--------|-------------|
| `6330df578` | feat(58-01): fix notification_type CHECK violation, create CORS helper and deno.json import map |
| `8d7d5d9c2` | feat(58-01): update all 11 Edge Functions to use shared CORS helper and bare import specifiers |
| `c89fa0e24` | fix(58-02): fail-closed HMAC-SHA256 verification for DocuSeal webhook (SEC-01) |
| `bd4c410d5` | fix(58-02): ownership authorization for DocuSeal and generate-pdf Edge Functions (SEC-02, SEC-03) |
| `7e64676a0` | feat(58-03): add requireOwnerUserId and sanitizeSearchInput utilities with tests |
| `c48b62e01` | feat(58-03): wire requireOwnerUserId into 7 mutations and sanitizeSearchInput into 4 search queries |
| `c9acbc977` | feat(58-03): disable form submit buttons while auth is loading |

---

## Test Results

Frontend unit tests: **985 passed, 2 skipped, 0 failed** (run confirmed at verification time)

---

## Summary

Phase 58 goal is **fully achieved**. All 8 security requirements (SEC-01 through SEC-08) are satisfied with substantive implementations verified at all three levels (exists, substantive, wired):

- **SEC-01/SEC-02/SEC-03 (Edge Function auth/IDOR):** DocuSeal webhook now fail-closed with HMAC-SHA256 using Web Crypto API and `timingSafeEqual`; all 5 DocuSeal lease actions check `owner_user_id`; generate-pdf leaseId mode checks ownership. No 404 resource-enumeration leakage.
- **SEC-04 (Constraint mismatch):** Stripe webhook uses `'system'` and `'payment'` — valid constraint values, no more CHECK violation retry loops.
- **SEC-05 (Null injection guard):** `requireOwnerUserId` guards 7 mutation locations with Sentry warning; all unit tests pass.
- **SEC-06 (PostgREST injection):** `sanitizeSearchInput` strips PostgREST-dangerous characters at all 4 search interpolation points; injection payload test confirmed.
- **SEC-07 (CORS wildcard):** Zero wildcard CORS headers; 9 browser-facing functions use dynamic origin matching; 2 webhook functions have zero CORS.
- **SEC-08 (Dependency pinning):** `deno.json` pins exact versions; zero floating URL imports remain.

Four items are flagged for human verification — all involve runtime/environment-specific behavior that cannot be verified programmatically.

---

_Verified: 2026-02-26T11:20:00Z_
_Verifier: Claude (gsd-verifier)_
