---
phase: 29-edge-function-shared-utilities
plan: 01
subsystem: edge-functions
tags: [shared-utilities, deduplication, email-templates, auth, stripe, cors]
dependency_graph:
  requires: []
  provides: [shared-auth, shared-cors-json-headers, shared-stripe-client, shared-supabase-client, shared-email-layout, shared-webhook-errors]
  affects: [all-edge-functions]
tech_stack:
  added: []
  patterns: [shared-utility-module, discriminated-union-auth-result, email-layout-options-pattern]
key_files:
  created:
    - supabase/functions/_shared/auth.ts
    - supabase/functions/_shared/stripe-client.ts
    - supabase/functions/_shared/supabase-client.ts
    - supabase/functions/_shared/email-layout.ts
  modified:
    - supabase/functions/_shared/cors.ts
    - supabase/functions/_shared/errors.ts
    - supabase/functions/_shared/auth-email-templates.ts
    - supabase/functions/_shared/drip-email-templates.ts
decisions:
  - "Stripe API version '2026-02-25.clover' locked in shared factory (matched existing codebase)"
  - "ctaBlock kept local to each template file (auth version includes fallback URL text, drip does not)"
  - "wrapEmailLayout uses options parameter to support both auth (plain header) and drip (linked header + footer links) variants"
metrics:
  duration: 7m
  completed: "2026-04-03"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 4
---

# Phase 29 Plan 01: Shared Edge Function Utility Modules Summary

Created 6 shared utility modules for Edge Function deduplication -- auth validation, JSON headers, Stripe/Supabase client factories, email layout extraction, and webhook error capture.

## What Was Done

### Task 1: Create shared utility modules
Created 4 new files and modified 2 existing files in `supabase/functions/_shared/`:

- **auth.ts**: `validateBearerAuth()` -- extracts Bearer token from Authorization header, validates via `getUser()`, returns discriminated union (AuthResult | AuthError)
- **cors.ts**: Added `getJsonHeaders()` -- merges CORS headers with Content-Type: application/json
- **stripe-client.ts**: `getStripeClient()` -- Stripe client factory with locked API version `2026-02-25.clover`
- **supabase-client.ts**: `createAdminClient()` -- Supabase service-role client factory
- **errors.ts**: Added `captureWebhookError()` -- structured error logging + Sentry capture for webhook handlers

**Commit:** 3031c1868

### Task 2: Extract shared email layout
Extracted duplicated `wrapInLayout` from both email template files into `email-layout.ts`:

- **email-layout.ts**: `wrapEmailLayout()` with `EmailLayoutOptions` supporting both auth (plain header, no footer links) and drip (linked header, Privacy/Terms footer links) variants
- **auth-email-templates.ts**: Removed local `BRAND_COLOR`, `BRAND_NAME`, `TAGLINE`, `wrapInLayout`; imports from `email-layout.ts`; calls `wrapEmailLayout()` with no options
- **drip-email-templates.ts**: Removed local `BRAND_COLOR`, `BRAND_NAME`, `TAGLINE`, `wrapInLayout`; imports from `email-layout.ts`; calls `wrapEmailLayout()` with `{ headerLinkUrl: APP_URL, includeFooterLinks: true, appUrl: APP_URL }`

HTML output is identical to before for both template types.

**Commit:** 15a470117

## Decisions Made

1. **Stripe API version**: Used `'2026-02-25.clover'` matching existing codebase (plan suggested an older version)
2. **ctaBlock not shared**: Auth version includes fallback URL text paragraph, drip version does not -- kept local to avoid over-parameterization
3. **Options pattern for layout**: `EmailLayoutOptions` with optional `headerLinkUrl`, `includeFooterLinks`, `appUrl` cleanly supports both email variants without breaking existing HTML structure

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Stripe API version mismatch**
- **Found during:** Task 1
- **Issue:** Plan specified `'2026-02-25.clover'` but the template code block showed an older version format
- **Fix:** Verified actual codebase uses `'2026-02-25.clover'` across all 8 Stripe Edge Functions, used that
- **Files modified:** supabase/functions/_shared/stripe-client.ts
- **Commit:** 3031c1868

## Known Stubs

None -- all modules are fully implemented with real exports.

## Self-Check: PASSED
