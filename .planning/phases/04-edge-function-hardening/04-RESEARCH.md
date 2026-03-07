# Phase 4: Edge Function Hardening - Research

**Researched:** 2026-03-05
**Domain:** Supabase Edge Functions (Deno runtime) security hardening
**Confidence:** HIGH

## Summary

This phase hardens all 15 Supabase Edge Functions (plus the Next.js Sentry tunnel) with env validation, rate limiting, generic error responses, XSS escaping, CSP headers, and SDK version alignment. The codebase already has a well-established pattern (`Deno.serve` + CORS + JWT auth) making the hardening work systematic rather than architectural.

The primary research challenge was rate limiting mechanism selection. Supabase Edge Functions run in isolated V8 isolates where global variables do NOT persist between invocations (each request gets a fresh isolate). This eliminates in-memory `Map` as a viable option. The recommended approach is Upstash Redis (free tier: 500K commands/month, more than sufficient). A Supabase table counter is the free fallback but adds latency per request.

**Primary recommendation:** Use Upstash Redis `@upstash/ratelimit` for rate limiting (free tier sufficient), shared `_shared/` utilities for env validation and error responses, and systematic sweep of all 15 functions for error message sanitization.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Error responses: Always generic `{ error: 'An error occurred' }`, shared `_shared/errors.ts`, Sentry + console.error logging
- Rate limiting: Unauthenticated only (tenant-invitation-accept, tenant-invitation-validate, stripe-checkout-session), plus Sentry tunnel; 10 req/min (60/min Sentry tunnel); 429 + Retry-After; shared `_shared/rate-limit.ts`
- Env validation: Tiered required/optional, shared `_shared/env.ts`, validate on first request (not module level)
- CORS: Fail-closed when FRONTEND_URL unset, single origin only
- CSP: Moderate policy in vercel.json, enforced immediately (not report-only)

### Claude's Discretion
- Env validation: whether to return typed config object or just assert presence
- Exact XSS escaping approach for DocuSeal/PDF templates (EDGE-03)
- Which Edge Functions should use user JWT vs service_role for reads (EDGE-06)
- Invitation code fragment migration details (EDGE-09)
- Stripe SDK version alignment strategy (EDGE-05, EDGE-13)
- Supabase SDK version alignment strategy (EDGE-12)
- Vary header review for CDN safety (EDGE-14)

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EDGE-01 | All 15 Edge Functions validate required env vars on startup | Shared `_shared/env.ts` utility; tiered required/optional; first-request validation pattern |
| EDGE-02 | Rate limiting on unauthenticated Edge Functions | Upstash Redis `@upstash/ratelimit` with sliding window; 3 functions + Sentry tunnel |
| EDGE-03 | HTML-escape all interpolated values in DocuSeal and generate-pdf | `escapeHtml()` from auth-email-templates.ts reusable; 2 functions have unescaped interpolation |
| EDGE-04 | Content-Security-Policy header added to vercel.json | Single header entry on `/(.*)`; moderate policy per user decision |
| EDGE-05 | Stripe SDK version aligned across Edge Functions and Next.js | 4 Edge Functions still on `apiVersion: '2024-06-20'`; update to `'2026-02-25.clover'` |
| EDGE-06 | Edge Functions use user JWT for reads where possible | Audit which functions use service_role unnecessarily for read operations |
| EDGE-07 | Error responses return generic messages | 12+ locations currently leak `dbError.message` or `err.message`; shared `_shared/errors.ts` |
| EDGE-08 | stripe-connect `limit` parameter capped | Currently uncapped `body.limit`; add `Math.min(limit, 100)` |
| EDGE-09 | Invitation code moved from URL query to fragment or exchange token | Exchange token pattern: POST code to get short-lived token, use token in URL |
| EDGE-10 | CORS fail-closed when FRONTEND_URL not set | Current cors.ts already returns empty headers; needs explicit block (no CORS = reject) |
| EDGE-11 | Sentry tunnel `/monitoring` rate-limited | Next.js API route (tunnelRoute in next.config.ts); rate limit via middleware or route handler |
| EDGE-12 | Supabase SDK version aligned (Deno 2.49.4 vs Next.js 2.97.0) | Update deno.json import map version |
| EDGE-13 | Stripe API version updated from 2024-06-20 to current | 4 functions need apiVersion update + test |
| EDGE-14 | `Vary: Authorization, Cookie` on public property pages reviewed | Currently in vercel.json for `/properties/(.*)` |
| DOC-01 | CLAUDE.md updated after phase | Recurring requirement |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@upstash/ratelimit` | latest | Rate limiting for Edge Functions | Supabase official recommendation; HTTP-based Redis; works in Deno |
| `@upstash/redis` | latest | Redis client for Upstash | Required by @upstash/ratelimit; REST-based (no TCP) |
| `@sentry/deno` | 9.x | Error monitoring in Edge Functions | Already in deno.json import map |
| `stripe` | 20 | Stripe SDK | Already in deno.json; aligning all functions to this version |
| `@supabase/supabase-js` | 2.49.4 -> 2.97.0 | Supabase client | Aligning Deno import to match Next.js version |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None new | - | All other needs covered by existing stack | - |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Upstash Redis | Supabase table counter | Free but adds ~50ms DB round-trip per request; cleanup cron needed; works but slower |
| Upstash Redis | In-memory Map | NOT viable - Edge Function isolates do NOT persist state between invocations |
| Upstash Redis | Deno KV | NOT available in Supabase Edge Functions (unstable-kv flag not supported) |

**Rate Limiting Decision: Use Upstash Redis.**
- Free tier: 500K commands/month (more than enough for rate limiting a few endpoints)
- `@upstash/ratelimit` provides sliding window algorithm out of the box
- HTTP/REST-based, works in Deno runtime without TCP sockets
- Supabase official docs recommend this exact approach

**Installation (Deno import map addition to `supabase/functions/deno.json`):**
```json
{
  "imports": {
    "@upstash/ratelimit": "npm:@upstash/ratelimit",
    "@upstash/redis": "npm:@upstash/redis"
  }
}
```

**Required env vars:**
```
UPSTASH_REDIS_REST_URL=<from Upstash dashboard>
UPSTASH_REDIS_REST_TOKEN=<from Upstash dashboard>
```

## Architecture Patterns

### New Shared Utilities Structure
```
supabase/functions/_shared/
  cors.ts           # existing — needs fail-closed update
  resend.ts         # existing — no changes
  auth-email-templates.ts  # existing — has escapeHtml() to reuse
  errors.ts         # NEW — shared error response utility
  env.ts            # NEW — env validation utility
  rate-limit.ts     # NEW — rate limiting utility
  escape-html.ts    # NEW — shared HTML escaping (extracted from auth-email-templates)
```

### Pattern 1: Shared Error Response Utility (`_shared/errors.ts`)
**What:** Centralized error response that logs to Sentry + console.error, returns generic JSON.
**When to use:** Every Edge Function catch block and error path.
**Example:**
```typescript
import * as Sentry from '@sentry/deno'

const sentryDsn = Deno.env.get('SENTRY_DSN')

export function errorResponse(
  req: Request,
  status: number,
  error: unknown,
  context?: Record<string, unknown>
): Response {
  // Log full details server-side
  const message = error instanceof Error ? error.message : String(error)
  if (sentryDsn) {
    Sentry.captureException(
      error instanceof Error ? error : new Error(message),
      { extra: { ...context, url: req.url, method: req.method } }
    )
  }
  console.error(JSON.stringify({
    level: 'error',
    status,
    message,
    ...context,
  }))

  // Return generic response - NEVER leak internal details
  const corsHeaders = getCorsHeaders(req)
  return new Response(
    JSON.stringify({ error: 'An error occurred' }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}
```

### Pattern 2: Env Validation Utility (`_shared/env.ts`)
**What:** Validates required/optional env vars on first request, returns typed config.
**When to use:** Top of every `Deno.serve` handler.
**Recommendation:** Return typed config object. The refactor is small (just destructure the return) and gives type safety downstream. The alternative (assert-only) saves no effort since you still need to read `Deno.env.get()` later.
```typescript
interface EnvConfig {
  required: string[]
  optional?: string[]
}

interface ValidatedEnv {
  [key: string]: string
}

let cachedEnv: ValidatedEnv | null = null

export function validateEnv(config: EnvConfig): ValidatedEnv {
  if (cachedEnv) return cachedEnv

  const env: ValidatedEnv = {}
  const missing: string[] = []

  for (const key of config.required) {
    const value = Deno.env.get(key)
    if (!value) {
      missing.push(key)
    } else {
      env[key] = value
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`)
  }

  for (const key of config.optional ?? []) {
    const value = Deno.env.get(key)
    if (value) {
      env[key] = value
    } else {
      console.warn(`Optional env var ${key} not set`)
    }
  }

  cachedEnv = env
  return env
}
```

**Note on caching:** Even though isolates may not persist, caching with `let cachedEnv` is harmless — it helps if the isolate handles multiple requests during its warm period, and has zero cost if it does not.

### Pattern 3: Rate Limiting Utility (`_shared/rate-limit.ts`)
**What:** Upstash Redis-based sliding window rate limiter.
**When to use:** Unauthenticated endpoints only.
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let rateLimiter: Ratelimit | null = null

function getRateLimiter(maxRequests: number, windowMs: number): Ratelimit {
  if (!rateLimiter) {
    const url = Deno.env.get('UPSTASH_REDIS_REST_URL')
    const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')
    if (!url || !token) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN required for rate limiting')
    }
    rateLimiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs}ms`),
    })
  }
  return rateLimiter
}

export async function rateLimit(
  req: Request,
  options: { maxRequests: number; windowMs: number; prefix?: string }
): Promise<Response | null> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('cf-connecting-ip')
    ?? 'unknown'

  const identifier = `${options.prefix ?? 'rl'}:${ip}`

  try {
    const limiter = getRateLimiter(options.maxRequests, options.windowMs)
    const { success, limit, remaining, reset } = await limiter.limit(identifier)

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000)
      // Log rate limit hit to Sentry as warning
      console.warn(JSON.stringify({
        level: 'warn',
        event: 'rate_limit_hit',
        ip,
        endpoint: new URL(req.url).pathname,
      }))
      return new Response(
        JSON.stringify({ error: 'Too many requests' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(reset),
          },
        }
      )
    }
    return null // Not rate limited
  } catch (err) {
    // Rate limiting failure should NOT block the request (fail-open for availability)
    console.error('Rate limiting error (allowing request):', err)
    return null
  }
}
```

### Pattern 4: CORS Fail-Closed Update
**What:** Update `cors.ts` to return a blocked response (not empty headers) when FRONTEND_URL is missing.
```typescript
// Changed from: returning empty headers (fail-open)
// To: returning no CORS headers AND logging error (fail-closed)
export function getCorsHeaders(req: Request): Record<string, string> {
  const frontendUrl = Deno.env.get('FRONTEND_URL')
  if (!frontendUrl) {
    console.error('FRONTEND_URL not set - CORS blocked (fail-closed)')
    return {} // No CORS headers = browser blocks cross-origin request
  }
  // ... rest unchanged
}
```

**Note:** The current implementation already returns empty headers when FRONTEND_URL is missing, which already blocks CORS. The update is primarily to change the log level from `warn` to `error` and clarify the intent. The behavior is already fail-closed since browsers block cross-origin requests without `Access-Control-Allow-Origin`.

### Anti-Patterns to Avoid
- **Leaking error details:** Never `JSON.stringify({ error: err.message })` in catch blocks. Always use shared `errorResponse()`.
- **In-memory rate limiting:** V8 isolates are ephemeral; `Map` objects reset between invocations. Use external store.
- **Module-level env validation:** Supabase does not surface module-level crashes clearly. Validate inside `Deno.serve` handler.
- **Service role for read operations:** When the caller has a valid JWT, use a JWT-scoped client for reads. Only use service_role for writes that bypass RLS.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | Custom token bucket or sliding window | `@upstash/ratelimit` | Handles distributed state, sliding window, cleanup automatically |
| HTML escaping | Custom regex replacements | Shared `escapeHtml()` (already exists in auth-email-templates.ts) | The 5 characters (&, <, >, ", ') are the minimum; missing one = XSS |
| Error response formatting | Inline try/catch with varying formats | Shared `_shared/errors.ts` | Consistency across 15 functions; single place to update Sentry integration |

## Common Pitfalls

### Pitfall 1: Rate Limiter Fail-Open vs Fail-Closed
**What goes wrong:** Rate limiting service is down, all requests get blocked (fail-closed) or all pass through (fail-open).
**Why it happens:** External dependency (Upstash) could be unreachable.
**How to avoid:** Fail-open on rate limiter errors. A rate limiter failure should not prevent legitimate requests. Log the failure to Sentry for alerting.
**Warning signs:** Sudden spike in 429s (misconfiguration) or sudden drop to zero 429s (limiter broken).

### Pitfall 2: Stripe API Version Mismatch Breaking Changes
**What goes wrong:** Updating `apiVersion` from `2024-06-20` to `2026-02-25.clover` changes response shapes.
**Why it happens:** Stripe adds/removes/renames fields between API versions.
**How to avoid:** Update all 4 functions simultaneously. Test each function's Stripe API calls after the update. The functions affected (stripe-checkout, stripe-connect, stripe-billing-portal, stripe-checkout-session) use standard Checkout/Connect APIs which are unlikely to break, but verify.
**Warning signs:** Type errors after update, unexpected null fields.

### Pitfall 3: XSS in PDF/HTML Templates
**What goes wrong:** User-controlled values (property names, tenant names, addresses, custom text) rendered unescaped in HTML sent to PDF generation.
**Why it happens:** Data from Supabase is trusted but originates from user input.
**How to avoid:** Escape ALL interpolated values in `docuseal/index.ts` (leaseHtml template) and `generate-pdf/index.ts` (buildReportHtml, buildLeasePreviewHtml).
**Warning signs:** Property names containing `<script>`, addresses with HTML entities.

### Pitfall 4: Sentry Tunnel Rate Limiting Placement
**What goes wrong:** The `/monitoring` tunnel is a Next.js route (not an Edge Function), so rate limiting approach differs.
**Why it happens:** Sentry `tunnelRoute` in next.config.ts creates a Next.js API route automatically. You cannot add middleware inside it.
**How to avoid:** Rate limit in Next.js middleware (proxy.ts) by checking path === '/monitoring' and applying IP-based rate limit. Use in-memory Map here since Next.js middleware runs in a persistent process (unlike Edge Functions).
**Warning signs:** Monitoring data stops flowing if rate limit is too aggressive.

### Pitfall 5: Env Validation vs Module-Level Sentry Init
**What goes wrong:** `stripe-webhooks/index.ts` already does module-level Sentry.init(). Moving env validation to first-request may conflict.
**Why it happens:** Sentry needs early initialization to capture all errors.
**How to avoid:** Keep Sentry.init() at module level (it gracefully handles missing DSN). Only move other env validation to first-request pattern.

## Code Examples

### Current Error Leaking Patterns (to fix)

```typescript
// BAD - leaks internal error messages (found in 12+ locations)
return new Response(
  JSON.stringify({ error: `Failed to create tenant record: ${tenantError.message}` }),
  { status: 500, ... }
)

// BAD - leaks error in catch block
return new Response(
  JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
  { status: 500, ... }
)

// GOOD - generic error response
return errorResponse(req, 500, tenantError, { action: 'create_tenant', invitation_id: invitation.id })
```

### XSS Vulnerable Patterns (to fix in docuseal/index.ts)

```typescript
// BAD - user-controlled values interpolated without escaping
const leaseHtml = `...
  <tr><td>Property Address</td><td>${propertyAddress}</td></tr>
  <tr><td>Tenant</td><td>${tenantName}</td></tr>
  ...`

// GOOD - escape all user data
import { escapeHtml } from '../_shared/escape-html.ts'
const leaseHtml = `...
  <tr><td>Property Address</td><td>${escapeHtml(propertyAddress)}</td></tr>
  <tr><td>Tenant</td><td>${escapeHtml(tenantName)}</td></tr>
  ...`
```

### CSP Header for vercel.json

```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' *.supabase.co *.sentry.io *.stripe.com; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
}
```

### Stripe API Version Alignment

```typescript
// 4 functions need update from:
const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })

// To:
const stripe = new Stripe(stripeKey, { apiVersion: '2026-02-25.clover' as Stripe.LatestApiVersion })

// Affected functions: stripe-checkout, stripe-connect, stripe-billing-portal, stripe-checkout-session
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| In-memory rate limiting | External store (Redis/KV) | Always (for serverless) | V8 isolates are ephemeral; in-memory state lost between invocations |
| `apiVersion: '2024-06-20'` | `apiVersion: '2026-02-25.clover'` | stripe@20 | 4 Edge Functions still on old version |
| `@supabase/supabase-js@2.49.4` | `@supabase/supabase-js@2.97.0` | Ongoing | Deno import map lags behind Next.js dependency |
| Detailed error messages | Generic error + server-side logging | Security best practice | Prevents information leakage to attackers |

## Detailed Function Audit

### Functions Needing Rate Limiting (Unauthenticated)
| Function | Current Auth | Rate Limit |
|----------|-------------|------------|
| `tenant-invitation-accept` | JWT required (AUTH-04) | 10 req/min per IP |
| `tenant-invitation-validate` | Unauthenticated | 10 req/min per IP |
| `stripe-checkout-session` | Unauthenticated | 10 req/min per IP |
| `/monitoring` (Next.js tunnel) | Unauthenticated | 60 req/min per IP |

**Note:** `tenant-invitation-accept` requires JWT but is listed per user decision. The rate limit protects against brute-force token guessing.

### Functions with Webhook Auth (No Rate Limiting Needed)
| Function | Auth Mechanism |
|----------|---------------|
| `stripe-webhooks` | Stripe signature verification |
| `docuseal-webhook` | HMAC-SHA256 signature |
| `stripe-autopay-charge` | service_role key match |

### Functions with JWT Auth (No Rate Limiting Per Decision)
| Function | Auth |
|----------|------|
| `stripe-checkout` | JWT |
| `stripe-billing-portal` | JWT |
| `stripe-connect` | JWT |
| `stripe-rent-checkout` | JWT |
| `docuseal` | JWT |
| `generate-pdf` | JWT |
| `export-report` | JWT |
| `detach-payment-method` | JWT |
| `auth-email-send` | Hook secret |

### Env Var Requirements Per Function

| Function | Required | Optional |
|----------|----------|----------|
| stripe-webhooks | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET | SENTRY_DSN, FRONTEND_URL, RESEND_API_KEY |
| stripe-rent-checkout | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY | FRONTEND_URL |
| stripe-autopay-charge | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY | FRONTEND_URL, RESEND_API_KEY |
| stripe-checkout | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY | FRONTEND_URL, STRIPE_PRO_PRICE_ID |
| stripe-checkout-session | STRIPE_SECRET_KEY | FRONTEND_URL |
| stripe-billing-portal | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY | FRONTEND_URL |
| stripe-connect | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY | FRONTEND_URL |
| detach-payment-method | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY | - |
| docuseal | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DOCUSEAL_URL, DOCUSEAL_API_KEY | FRONTEND_URL |
| docuseal-webhook | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DOCUSEAL_WEBHOOK_SECRET | - |
| generate-pdf | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STIRLING_PDF_URL | - |
| export-report | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY | - |
| tenant-invitation-accept | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY | - |
| tenant-invitation-validate | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY | - |
| auth-email-send | RESEND_API_KEY | SUPABASE_AUTH_HOOK_SECRET, NEXT_PUBLIC_APP_URL |
| Rate-limited functions | UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN (additional) | - |

### Error Message Leak Inventory

| Function | Line(s) | Leaks |
|----------|---------|-------|
| tenant-invitation-accept | 100, 132, 143 | `tenantError.message`, `updateError.message`, `err.message` |
| tenant-invitation-validate | 98 | `err.message` |
| stripe-checkout-session | 56 | `err.message` |
| stripe-checkout | 82 | `err.message` |
| stripe-billing-portal | 62 | `err.message` |
| stripe-connect | 54, 274 | `dbError.message`, `err.message` |
| docuseal | 218, 280, 298, 360, 434, 514, 580, 624, 639 | Multiple `errBody`, `updateError.message`, `err.message` |
| docuseal-webhook | 312 | `err.message` |
| generate-pdf | 250 | `err.message` (timeout vs generic) |
| export-report | 119 | `err.message` |
| detach-payment-method | 184 | `err.message` |
| stripe-webhooks | 134 | `err.message` in 500 response |

### EDGE-06: JWT vs Service Role Audit

| Function | Current | Recommendation |
|----------|---------|----------------|
| tenant-invitation-accept | Uses ANON_KEY for auth check, service_role for writes | Correct - writes bypass RLS |
| tenant-invitation-validate | service_role | Correct - unauthenticated endpoint |
| stripe-connect | service_role | Could use JWT for reads (action=account, balance, payouts, transfers) but writes need service_role. Mixed. Keep service_role for simplicity since all actions are scoped by auth.uid() verification. |
| docuseal | service_role | Correct - writes need to bypass RLS |
| generate-pdf | service_role | Could use JWT for lease ownership check, but the PDF generation write needs service_role. Keep service_role. |
| export-report | service_role | Could use JWT for RPC calls (they validate auth.uid() internally). Minor win; keep service_role for consistency. |
| detach-payment-method | service_role | Correct - write operations bypass RLS |

**Recommendation:** Keep all functions on service_role. The security benefit of switching reads to JWT is minimal since all functions already verify auth.uid() explicitly. The complexity cost of maintaining two clients per function is not worth it.

### EDGE-09: Invitation Code Fragment Migration

The current flow: invitation code is passed as a query parameter `?code=xxx` in the URL. The risk is URL logging by intermediaries.

**Exchange token pattern:**
1. Frontend calls `tenant-invitation-validate` with `{ code }` (POST body, not URL)
2. Function returns `{ valid: true, exchange_token: <short-lived-uuid> }` (stored in `tenant_invitations.exchange_token`, expires in 15 minutes)
3. Accept flow uses exchange_token instead of raw code
4. URL fragment not needed since the code is never in the URL (it is already POST-only)

**Assessment:** The code is already transmitted via POST body, not URL query parameter. The requirement text says "URL query parameter" but the actual implementation uses POST. Verify with user whether this is already satisfactory or if further hardening is desired.

### EDGE-14: Vary Header Review

Current vercel.json has `Vary: Authorization, Cookie` on `/properties/(.*)`. This tells CDN caches to vary the cached response by these headers.

**Assessment:** This is correct for pages that may show different content to authenticated vs unauthenticated users. Public property pages are cached with `s-maxage=300, stale-while-revalidate=3600`. The Vary header prevents serving an authenticated user's page to an anonymous user (or vice versa). No change needed unless public property pages should be fully public (same for all users). Recommendation: keep as-is.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (unit project) |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test:unit -- --run` |
| Full suite command | `pnpm test:unit` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EDGE-01 | Env validation throws on missing required vars | unit | `pnpm test:unit -- --run src/path/to/env.test.ts` | No - Wave 0 |
| EDGE-02 | Rate limiter returns 429 after threshold | unit | `pnpm test:unit -- --run src/path/to/rate-limit.test.ts` | No - Wave 0 |
| EDGE-07 | Error response is always generic | unit | `pnpm test:unit -- --run src/path/to/errors.test.ts` | No - Wave 0 |
| EDGE-03 | HTML escaping applied to all interpolated values | manual-only | Code review of diff | N/A |
| EDGE-04 | CSP header present in vercel.json | manual-only | Verify in vercel.json diff | N/A |
| EDGE-05 | Stripe API version consistent | manual-only | grep for apiVersion | N/A |
| EDGE-08 | limit parameter capped | manual-only | Code review | N/A |
| EDGE-10 | CORS fails closed | unit | Test getCorsHeaders with missing FRONTEND_URL | No - Wave 0 |
| EDGE-11 | Sentry tunnel rate limited | manual-only | Load test verification | N/A |
| EDGE-12 | Supabase SDK version aligned | manual-only | Check deno.json | N/A |
| EDGE-13 | Stripe API version updated | manual-only | grep verification | N/A |
| EDGE-14 | Vary header reviewed | manual-only | Check vercel.json | N/A |
| EDGE-09 | Invitation code exchange token | integration | Manual test with invitation flow | N/A |

### Sampling Rate
- **Per task commit:** `pnpm test:unit -- --run`
- **Per wave merge:** `pnpm test:unit`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Shared utility tests (env.ts, errors.ts, rate-limit.ts) - these are new code; unit tests should be created alongside
- [ ] The shared utilities live in `supabase/functions/_shared/` (Deno runtime) but tests run in Vitest (Node). May need test files that mock Deno APIs, or test the logic in a Node-compatible way.

**Practical note:** Edge Function shared utilities use `Deno.env.get()` and `Deno.serve()` which are Deno-only APIs. Unit testing these in Vitest requires either mocking the Deno global or extracting pure logic into testable functions. Recommend extracting pure logic (escapeHtml, env var checking logic) into functions that can be tested without Deno mocks, and integration-test the full utilities via deployment.

## Open Questions

1. **EDGE-09: Is the invitation code already safe?**
   - What we know: The code is transmitted via POST body, never in URL query params. The `tenant-invitation-validate` and `tenant-invitation-accept` both use POST.
   - What's unclear: Whether the requirement means the code should also not appear in URL fragments or redirects elsewhere in the frontend flow.
   - Recommendation: Verify frontend code does not put invitation code in URL. If it does, implement exchange token. If not, mark as already addressed.

2. **EDGE-11: Sentry tunnel rate limiting mechanism**
   - What we know: `/monitoring` is a Next.js tunnelRoute (auto-created by `@sentry/nextjs`). It is NOT an Edge Function.
   - What's unclear: Whether Next.js middleware can intercept this route or if it bypasses middleware.
   - Recommendation: Test in middleware first. If middleware cannot intercept, create a manual `/api/monitoring` route with rate limiting and update the tunnelRoute config.

3. **Upstash Redis account setup**
   - What we know: Free tier is sufficient (500K commands/month).
   - What's unclear: Whether the user has an Upstash account or prefers a different rate limiting backend.
   - Recommendation: Set up Upstash free account, create Redis database, add env vars. If user prefers no external dependency, fall back to Supabase table counter (slower but works).

## Sources

### Primary (HIGH confidence)
- [Supabase Edge Functions Architecture](https://supabase.com/docs/guides/functions/architecture) - Confirmed V8 isolate model, no state persistence
- [Supabase Edge Functions Limits](https://supabase.com/docs/guides/functions/limits) - 256MB memory, CPU limits
- [Supabase Rate Limiting Guide](https://supabase.com/docs/guides/functions/examples/rate-limiting) - Official recommendation for Upstash Redis
- Direct codebase audit of all 15 Edge Functions + cors.ts, resend.ts, auth-email-templates.ts

### Secondary (MEDIUM confidence)
- [Upstash Redis Pricing](https://upstash.com/docs/redis/overall/pricing) - Free tier 500K commands/month confirmed
- [Deno KV Discussion #40713](https://github.com/orgs/supabase/discussions/40713) - Deno KV not available in Supabase Edge Functions

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Upstash is Supabase's official recommendation; all other changes are straightforward refactoring
- Architecture: HIGH - Patterns are well-defined by existing codebase conventions; shared utility approach matches `_shared/cors.ts` and `_shared/resend.ts`
- Pitfalls: HIGH - Based on direct codebase audit finding specific leaked error messages and unescaped HTML interpolation
- Rate limiting: MEDIUM - Upstash is well-documented but user needs to create account and set env vars; Supabase table counter is the fallback

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable domain; rate limiting libraries and Stripe SDK versions may update)
