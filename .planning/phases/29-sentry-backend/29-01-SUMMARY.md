---
phase: 29-sentry-backend
plan: 01
type: summary
subsystem: observability
provides: [sentry-context-middleware, sentry-data-scrubbing, sentry-transaction-naming]
affects: [shared/middleware, instrument.ts, billing/webhooks, app.module.ts]
tags: [sentry, observability, monitoring, security, middleware]
key-decisions:
  - Middleware order: RequestId → SentryContext → Logger
  - Spread operator for optional email to satisfy exactOptionalPropertyTypes
  - Card number regex pattern for breadcrumb scrubbing
key-files:
  - apps/backend/src/shared/middleware/sentry-context.middleware.ts
  - apps/backend/src/instrument.ts
  - apps/backend/src/modules/billing/webhooks/webhook-queue.processor.ts
  - apps/backend/src/app.module.ts
---

# Summary: Sentry Backend Integration Enhancement

## Outcome: SUCCESS

Enhanced the existing Sentry integration with tenant context propagation, sensitive data scrubbing, and proper transaction naming for background jobs.

## Accomplishments

### Task 1: SentryContextMiddleware Created

**File:** `apps/backend/src/shared/middleware/sentry-context.middleware.ts`

- Sets `Sentry.setContext('http_request', {...})` with method, path, url, requestId, ip, userAgent
- Sets `Sentry.setUser({ id, email })` for authenticated requests
- Sets `tenant_id` and `user_role` tags for multi-tenant error filtering
- Sets `request_id` tag for correlating logs with errors

### Task 2: Data Scrubbing Enhanced

**File:** `apps/backend/src/instrument.ts`

Enhanced `beforeSend` callback to scrub:
- Headers: `authorization`, `x-stripe-signature`, `cookie`, `x-api-key`, `x-supabase-auth`
- Breadcrumb data: Card number patterns (4 groups of 4 digits), CVV values

### Task 3: Transaction Naming for Background Jobs

**File:** `apps/backend/src/modules/billing/webhooks/webhook-queue.processor.ts`

Added Sentry span for webhook processing:
- Name: `webhook.{eventType}.process`
- Operation: `queue.process`
- Attributes: `job.id`, `job.attempts`, `stripe.event_id`, `stripe.event_type`
- Properly ends span on both success and failure paths

### Task 4: Middleware Registration

**File:** `apps/backend/src/app.module.ts`

- Imported `SentryContextMiddleware`
- Added to middleware chain: `RequestTimingMiddleware → RequestIdMiddleware → SentryContextMiddleware → RequestLoggerMiddleware`

## Files Created/Modified

| File | Action |
|------|--------|
| `apps/backend/src/shared/middleware/sentry-context.middleware.ts` | Created |
| `apps/backend/src/instrument.ts` | Modified |
| `apps/backend/src/modules/billing/webhooks/webhook-queue.processor.ts` | Modified |
| `apps/backend/src/app.module.ts` | Modified |

## Commits

- `45646fe0d` feat(29-01): create SentryContextMiddleware for tenant context
- `523e971e9` feat(29-01): enhance Sentry beforeSend with data scrubbing
- `db886e336` feat(29-01): add Sentry transaction naming for webhook jobs
- `68afad9f1` feat(29-01): register SentryContextMiddleware in app module

## Key Decisions

1. **Middleware ordering**: SentryContextMiddleware must run after RequestIdMiddleware to have access to the requestId from ClsService
2. **Optional email handling**: Used spread operator `...(email && { email })` to satisfy TypeScript's `exactOptionalPropertyTypes`
3. **Breadcrumb scrubbing**: Only scrub card patterns, not arbitrary numbers; CVV scrubbing requires key name to contain 'cvv'

## Verification

- [x] `pnpm --filter @repo/backend typecheck` passes
- [x] `pnpm --filter @repo/backend test:unit` passes (1793 tests)
- [x] All 4 tasks committed individually
- [x] No new dependencies required

## What Was Already Working

The existing Sentry setup was solid:
- `instrument.ts` imported before all modules ✅
- `SentryModule.forRoot()` configured ✅
- `SentryGlobalFilter` as APP_FILTER ✅
- DLQ webhook integration with `Sentry.captureException()` ✅
- Trace propagation for Supabase/Stripe ✅

## Phase 29 Complete

Phase 29 (Sentry Backend Integration) is now complete with 1 plan executed.

## Next Steps

Continue to Phase 30 per ROADMAP.md (Sentry Frontend Integration).
