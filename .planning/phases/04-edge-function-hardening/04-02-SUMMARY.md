---
phase: 04-edge-function-hardening
plan: 02
subsystem: infra
tags: [edge-functions, rate-limiting, upstash, redis, sentry, stripe, security]

requires:
  - phase: 04-edge-function-hardening
    provides: Shared utilities (errors.ts, env.ts), Upstash deps in deno.json
provides:
  - Upstash Redis sliding window rate limiter (_shared/rate-limit.ts)
  - Rate limiting on 3 unauthenticated Edge Functions (10 req/min per IP)
  - In-memory Sentry tunnel rate limiting in proxy.ts (60 req/min per IP)
  - stripe-connect limit parameter capped at 100
  - env validation + error sanitization on 4 Edge Functions
affects: [04-03, 04-04]

tech-stack:
  added: ["@upstash/ratelimit (runtime)", "@upstash/redis (runtime)"]
  patterns: ["rateLimit(req, options) for Edge Function rate limiting", "In-memory Map rate limiting for Next.js proxy (persistent process)"]

key-files:
  created:
    - supabase/functions/_shared/rate-limit.ts
  modified:
    - supabase/functions/tenant-invitation-accept/index.ts
    - supabase/functions/tenant-invitation-validate/index.ts
    - supabase/functions/stripe-checkout-session/index.ts
    - supabase/functions/stripe-connect/index.ts
    - proxy.ts

key-decisions:
  - "Rate limiter fails open on Upstash errors for availability over strict enforcement"
  - "Sentry tunnel uses in-memory Map (Next.js proxy is persistent process, no Redis needed)"
  - "Periodic cleanup every 100 requests to prevent memory growth in proxy rate limiter"
  - "stripe-connect limit capped at 100 for both payouts and transfers actions"
  - "Unknown action error sanitized to generic message (no longer echoes user input)"

patterns-established:
  - "rateLimit(req, { maxRequests, windowMs, prefix }): shared rate limit utility returning 429 Response or null"
  - "IP extraction: x-forwarded-for first segment > cf-connecting-ip > 'unknown'"

requirements-completed: [EDGE-01, EDGE-02, EDGE-07, EDGE-08, EDGE-11]

duration: 3min
completed: 2026-03-05
---

# Phase 4 Plan 2: Rate Limiting, Limit Cap, Env Validation, Error Sanitization Summary

**Upstash Redis rate limiting on 3 Edge Functions, in-memory Sentry tunnel rate limiting, stripe-connect limit cap at 100, validateEnv + errorResponse on all 4 modified functions**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-05T07:16:16Z
- **Completed:** 2026-03-05T07:19:21Z
- **Tasks:** 2 (1 auto + 1 checkpoint auto-approved)
- **Files modified:** 6

## Accomplishments
- Created _shared/rate-limit.ts: Upstash Redis sliding window rate limiter with fail-open behavior and structured logging
- Wired rate limiting into 3 unauthenticated Edge Functions (invite-accept, invite-validate, checkout-session) at 10 req/min per IP
- Added in-memory rate limiting for Sentry tunnel /monitoring in proxy.ts at 60 req/min per IP with periodic cleanup
- Capped stripe-connect limit parameter at 100 for both payouts and transfers actions (EDGE-08)
- Added validateEnv() and errorResponse() to all 4 Edge Functions, eliminating all error message leaks

## Task Commits

Each task was committed atomically:

1. **Task 1: Create rate-limit utility, wire into Edge Functions + proxy, add env/error hardening** - `c3961a87a` (feat)
2. **Task 2: Verify Upstash setup and rate limiting implementation** - Auto-approved (checkpoint)

## Files Created/Modified
- `supabase/functions/_shared/rate-limit.ts` - Upstash Redis sliding window rate limiter with fail-open, CORS headers, structured logging
- `supabase/functions/tenant-invitation-accept/index.ts` - Rate limiting, validateEnv, errorResponse (3 error leaks fixed)
- `supabase/functions/tenant-invitation-validate/index.ts` - Rate limiting, validateEnv, errorResponse (1 error leak fixed)
- `supabase/functions/stripe-checkout-session/index.ts` - Rate limiting, validateEnv, errorResponse (1 error leak fixed)
- `supabase/functions/stripe-connect/index.ts` - validateEnv, errorResponse, limit cap at 100 (2 error leaks fixed, unknown action sanitized)
- `proxy.ts` - In-memory /monitoring rate limiting at 60 req/min with periodic cleanup

## Decisions Made
- Rate limiter fails open on Upstash errors: availability trumps strict rate enforcement for a property management app
- Sentry tunnel uses in-memory Map instead of Redis: Next.js proxy is a persistent process, so Map works and avoids external dependency
- Periodic cleanup every 100 requests in proxy rate limiter: balances memory management with performance overhead
- stripe-connect limit capped at 100 for both payouts and transfers: prevents excessive Stripe API calls from a single request
- Unknown action error in stripe-connect sanitized: no longer echoes user-provided action string back in response

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript strict null check in proxy.ts**
- **Found during:** Task 1 (typecheck verification)
- **Issue:** `xff.split(',')[0].trim()` flagged as possibly undefined by TypeScript strict mode
- **Fix:** Changed to `xff.split(',')[0]?.trim()` with optional chaining
- **Files modified:** proxy.ts
- **Verification:** `pnpm typecheck` passes clean
- **Committed in:** c3961a87a (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor TypeScript strictness fix. No scope creep.

## Issues Encountered
- None

## User Setup Required

Upstash Redis credentials must be configured before rate limiting will function in production:
1. Create free Upstash Redis database at console.upstash.com (select region closest to Supabase project)
2. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Supabase Edge Function secrets (Dashboard -> Edge Functions -> Secrets)
3. Rate limiter fails open gracefully until credentials are set (requests proceed without rate limiting)

## Next Phase Readiness
- Rate limiting infrastructure complete for all unauthenticated endpoints
- errorResponse() and validateEnv() now applied to 4 more Edge Functions (8 total with Plan 01)
- Plans 03 and 04 can continue hardening remaining Edge Functions using the same patterns

---
*Phase: 04-edge-function-hardening*
*Completed: 2026-03-05*
