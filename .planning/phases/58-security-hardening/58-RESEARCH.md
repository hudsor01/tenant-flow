# Phase 58: Security Hardening - Research

**Researched:** 2026-02-26
**Domain:** Edge Function auth/authz, PostgREST filter injection, DB constraint alignment, frontend mutation guards
**Confidence:** HIGH

## Summary

Phase 58 closes 8 known security vulnerabilities identified during the v7.0 post-merge review. The vulnerabilities span four categories: (1) Edge Function authentication bypass and authorization gaps (SEC-01 through SEC-03), (2) a DB CHECK constraint mismatch that causes silent notification failures and infinite Stripe retry loops (SEC-04), (3) undefined `owner_user_id` in frontend insert mutations (SEC-05), and (4) PostgREST filter injection via unsanitized search inputs (SEC-06). Two additional requirements cover CORS wildcard restriction (SEC-07) and dependency pinning (SEC-08).

All 8 issues have been fully characterized in `.full-review/02-security-performance.md` with file locations, proof-of-concept vectors, and fix patterns. The fixes are surgical -- no new libraries needed, no schema redesign, no breaking API changes. The primary risk is regression in webhook processing (SEC-04 constraint change) and accidental lockout if CORS is too restrictive (SEC-07).

**Primary recommendation:** Fix issues in dependency order -- SEC-04 (DB constraint) first so Stripe webhooks stop failing, then SEC-01/02/03 (Edge Function auth/authz), then SEC-05/06 (frontend), then SEC-07/08 (CORS/deps).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Error responses**: Minimal error responses -- generic `401 Unauthorized` or `403 Forbidden` with no details. No descriptive messages like "you do not have access to this lease." Frontend shows generic error toast: "Something went wrong. Please try again." Failed webhook auth logged to Sentry as warning.
- **Webhook verification (DocuSeal)**: HMAC signature verification via `X-DocuSeal-Signature` header (not bearer token). Fail-closed: no valid signature = 401, no processing.
- **Search sanitization**: Silent strip of PostgREST filter operators. Centralized `sanitizeSearchInput()` shared utility for all 4 search inputs. 100-character max length. Standardize debounce to 300ms across all 4 inputs.
- **Mutation guard behavior**: Block mutation + error toast "Unable to save. Please refresh and try again." when `owner_user_id` is undefined. Sentry warning logged. Submit buttons disabled until auth/owner_user_id confirmed loaded. Shimmer/pulse animation (NOT spinner) for disabled state.

### Claude's Discretion
- Most performant guard pattern: shared hook vs inline check
- Exact PostgREST operators to strip
- CORS origin matching implementation details (SEC-07)
- Deno import map structure for dependency pinning (SEC-08)
- Stripe notification_type CHECK constraint values (SEC-04)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEC-01 | DocuSeal webhook handler rejects unverified requests (fail-closed) | Current code is fail-open (lines 228-236 of `docuseal-webhook/index.ts`). Fix: invert conditional -- return 401 when secret missing or signature invalid. HMAC verification pattern documented below. |
| SEC-02 | DocuSeal Edge Function validates ownership before lease actions | Current code authenticates JWT but never checks `lease.owner_user_id === user.id` (all 5 actions). Service role key bypasses RLS. Ownership check pattern documented below. |
| SEC-03 | generate-pdf Edge Function validates ownership before PDF generation | `leaseId` mode fetches any lease with service role key, no ownership check. Fix: add `owner_user_id` check after lease fetch in `buildLeasePreviewHtml` path. |
| SEC-04 | Stripe webhook notification_type CHECK constraint matches actual values | Current constraint: `('maintenance', 'lease', 'payment', 'system')`. Webhook inserts `'stripe_connect_verified'` and `'payment_failed'` -- both violate constraint. Fix: either expand constraint or map to existing values. |
| SEC-05 | undefined owner_user_id guarded in all 6 insert mutations | 6 hooks spread `owner_user_id: userId` where `userId` is `user?.id` (string \| undefined). No null guard. Fix: shared `useOwnerUserId()` hook or guard function before insert. |
| SEC-06 | PostgREST filter injection sanitized in all 4 search inputs | 4 locations interpolate unsanitized user input into `.or()` and `.ilike()` PostgREST filters. Fix: centralized `sanitizeSearchInput()` strips dangerous characters. |
| SEC-07 | CORS wildcard restricted to FRONTEND_URL on browser-facing Edge Functions | All 11 Edge Functions use `'Access-Control-Allow-Origin': '*'`. Fix: browser-facing functions use `FRONTEND_URL` env var; webhook functions (stripe-webhooks, docuseal-webhook) omit CORS entirely. |
| SEC-08 | Edge Function dependencies pinned via deno.json import map | Currently no `deno.json` exists. Imports use bare URLs: `https://esm.sh/@supabase/supabase-js@2` (floating minor) and `npm:stripe@14` (floating minor). Fix: create `supabase/functions/deno.json` with pinned import map. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase Edge Functions | Deno runtime | Serverless functions for webhooks and API | Already deployed, all 11 functions use this |
| @supabase/supabase-js | 2.x | Supabase client in Edge Functions | Already imported in all Edge Functions |
| Stripe SDK | 14.x (Edge Functions) | Stripe webhook verification | Already used in 5 Edge Functions |
| Vitest | Current | Unit testing for sanitization utilities | Already configured in `apps/frontend/vitest.config.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Web Crypto API | Built-in (Deno) | HMAC-SHA256 for DocuSeal webhook signature verification | SEC-01: verify `X-DocuSeal-Signature` header |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Web Crypto HMAC | Third-party HMAC lib | Web Crypto is built into Deno, zero dependency; no reason for external lib |
| Per-function deno.json | Shared deno.json at `supabase/functions/` level | Supabase CLI supports shared `deno.json` at functions root -- simpler to maintain one file |

**Installation:**
No new packages needed. All fixes use existing dependencies and built-in APIs.

## Architecture Patterns

### Recommended Project Structure
```
supabase/functions/
├── deno.json                    # NEW: shared import map with pinned versions (SEC-08)
├── _shared/
│   └── cors.ts                  # NEW: shared CORS helper (SEC-07)
├── docuseal-webhook/index.ts    # SEC-01: fail-closed webhook auth
├── docuseal/index.ts            # SEC-02: ownership check before all actions
├── generate-pdf/index.ts        # SEC-03: ownership check for leaseId mode
├── stripe-webhooks/index.ts     # SEC-04: fix notification_type values
└── [other functions]            # SEC-07: CORS restriction

apps/frontend/src/
├── lib/
│   └── sanitize-search.ts       # NEW: centralized sanitizeSearchInput() (SEC-06)
├── hooks/
│   └── use-owner-user-id.ts     # NEW: shared auth guard hook (SEC-05)
└── hooks/api/
    ├── use-properties.ts        # SEC-05: guard owner_user_id
    ├── use-unit.ts              # SEC-05: guard owner_user_id
    ├── use-maintenance.ts       # SEC-05: guard owner_user_id
    ├── use-lease.ts             # SEC-05: guard owner_user_id
    ├── use-inspections.ts       # SEC-05: guard owner_user_id
    └── use-vendor.ts            # SEC-05: guard owner_user_id
```

### Pattern 1: Fail-Closed Webhook Authentication (SEC-01)
**What:** DocuSeal webhook MUST reject requests when secret is missing or signature is invalid.
**When to use:** All inbound webhook handlers from third-party services.
**Current vulnerability:**
```typescript
// CURRENT: fail-open -- processes requests when secret not configured
const webhookSecret = Deno.env.get('DOCUSEAL_WEBHOOK_SECRET')
if (webhookSecret) {
  // verify
} else {
  console.warn('endpoint is unauthenticated')  // continues!
}
```
**Fix pattern:**
```typescript
// FIXED: fail-closed
const webhookSecret = Deno.env.get('DOCUSEAL_WEBHOOK_SECRET')
if (!webhookSecret) {
  console.error('DOCUSEAL_WEBHOOK_SECRET not configured')
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  })
}
const signature = req.headers.get('x-docuseal-signature')
if (!signature) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  })
}
// Verify HMAC signature using Web Crypto API
const body = await req.text()
const encoder = new TextEncoder()
const key = await crypto.subtle.importKey(
  'raw', encoder.encode(webhookSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
)
const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
const expectedSignature = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
if (signature !== expectedSignature) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  })
}
// Parse body from already-read text
const payload = JSON.parse(body)
```
**Important note on DocuSeal HMAC:** DocuSeal's webhook signature format needs verification. The current code checks `req.headers.get('x-docuseal-signature')` against the raw secret string -- this suggests DocuSeal may use a simple shared-secret comparison rather than HMAC. The user decision says "HMAC signature verification via `X-DocuSeal-Signature` header." Research the actual DocuSeal signature mechanism (it may be hex-encoded HMAC-SHA256 of the body). If DocuSeal sends the raw secret as the header value, use constant-time comparison instead of HMAC.

### Pattern 2: Ownership Authorization Guard (SEC-02, SEC-03)
**What:** After JWT authentication, verify the authenticated user owns the target resource before performing any action.
**When to use:** All Edge Functions that accept a resource ID and use service role key.
**Current vulnerability (docuseal/index.ts):**
```typescript
// Authenticates JWT but never checks ownership
const { data: lease } = await supabase.from('leases').select('id, owner_user_id').eq('id', leaseId).single()
// Uses service role key -- RLS bypassed
// Any authenticated user can operate on any lease
```
**Fix pattern:**
```typescript
// After JWT validation and lease fetch:
const lease = /* fetch lease with owner_user_id */
// Owner actions: send-for-signature, sign-owner, cancel, resend
if (lease.owner_user_id !== user.id) {
  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
// For sign-tenant: check tenant relationship via lease_tenants or tenants table
```
**Per user decision:** Response MUST be generic `403 Forbidden` -- no details about why access was denied.

### Pattern 3: Centralized Search Sanitization (SEC-06)
**What:** Strip PostgREST filter operators from user search input before interpolation.
**When to use:** All `.or()` and `.ilike()` calls with user-controlled strings.
**Current vulnerability:**
```typescript
// property-keys.ts -- user input interpolated directly
q = q.or(`name.ilike.%${filters.search}%,city.ilike.%${filters.search}%`)
// Attacker input: "%,owner_user_id.neq.00000000" modifies query semantics
```
**Fix pattern:**
```typescript
// lib/sanitize-search.ts
const MAX_SEARCH_LENGTH = 100

const POSTGREST_OPERATOR_PATTERN = /[,.()"'\\]/g

export function sanitizeSearchInput(input: string): string {
  return input
    .replace(POSTGREST_OPERATOR_PATTERN, '')
    .trim()
    .slice(0, MAX_SEARCH_LENGTH)
}
```
**Dangerous PostgREST operators to strip:**
- `,` -- separates filter clauses in `.or()`
- `.` -- separates column name from operator (e.g., `name.eq.value`)
- `(` `)` -- groups filter logic
- `"` `'` -- string delimiters in filter values
- `\` -- escape character
- `%` should NOT be stripped (it is the wildcard character for ILIKE and is already in the template)

**All 4 locations that need sanitization:**
1. `apps/frontend/src/hooks/api/query-keys/property-keys.ts:96` -- `.or()` with `name.ilike` and `city.ilike`
2. `apps/frontend/src/hooks/api/query-keys/tenant-keys.ts:66` -- `.or()` with `users.full_name.ilike` and `users.email.ilike`
3. `apps/frontend/src/hooks/api/query-keys/unit-keys.ts:77` -- `.ilike('unit_number', ...)`
4. `apps/frontend/src/hooks/api/use-vendor.ts:104` -- `.ilike('name', ...)`

Note: Maintenance search (in `maintenance-list.tsx`) is client-side only (`.filter()` on already-fetched data) -- NOT vulnerable to PostgREST injection. However, the user decision says "Standardize debounce to 300ms across all 4 search inputs while touching them." The maintenance search component uses `useState` with no debounce at all -- it filters client-side. The 4 inputs requiring SEC-06 sanitization are: properties, tenants, units, and vendors (the 4 with server-side PostgREST queries). The debounce standardization applies to these 4.

### Pattern 4: Owner User ID Guard Hook (SEC-05)
**What:** Prevent insert mutations from executing when `owner_user_id` is undefined.
**When to use:** All 6 insert mutations that set `owner_user_id` from client-side auth.

**Current vulnerability (all 6 hooks follow this pattern):**
```typescript
const { data: { user } } = await supabase.auth.getUser()
const userId = user?.id  // string | undefined -- no guard!
const { data, error } = await supabase
  .from('properties')
  .insert({ ...data, owner_user_id: userId })  // undefined gets sent
```

**Recommended approach: shared guard function** (not a hook, since mutation functions are not React components):
```typescript
// lib/auth-guard.ts
export function requireOwnerUserId(userId: string | undefined): string {
  if (!userId) {
    // Log to Sentry
    captureMessage('owner_user_id undefined in mutation', { level: 'warning' })
    throw new Error('Unable to save. Please refresh and try again.')
  }
  return userId
}
```

**For the submit-button disabled state:** Use the existing `useCurrentUser()` hook in form components:
```typescript
const { user_id, isLoading } = useCurrentUser()
// Button disabled when isLoading or !user_id
// Shimmer/pulse animation (NOT spinner) per user decision
```

**All 6 hooks that need the guard:**
1. `apps/frontend/src/hooks/api/use-properties.ts:279-284` -- `insert({ ...data, owner_user_id: userId })`
2. `apps/frontend/src/hooks/api/use-unit.ts:158-163` -- `insert({ ...data, owner_user_id: userId })`
3. `apps/frontend/src/hooks/api/use-maintenance.ts:152-157` -- `insert({ ...data, owner_user_id: userId })`
4. `apps/frontend/src/hooks/api/use-lease.ts:227-235` -- `insert({ ...leaseData, owner_user_id: userId })`
5. `apps/frontend/src/hooks/api/use-inspections.ts:63-68` -- `insert({ ...dto, owner_user_id: userId })`
6. `apps/frontend/src/hooks/api/use-vendor.ts:164-169` -- `insert({ ...data, owner_user_id: userId })`

Additionally, `use-tenant-portal.ts:922` inserts `owner_user_id` from a lease lookup -- this is a different pattern (not from `getUser()` but from a DB query) and should also be guarded against null.

### Pattern 5: CORS Origin Restriction (SEC-07)
**What:** Replace `'*'` CORS origin with the actual frontend URL from environment.
**When to use:** Browser-facing Edge Functions. Webhook-only functions should omit CORS entirely.

**Classification of Edge Functions:**
- **Browser-facing** (need CORS with `FRONTEND_URL`): `docuseal`, `generate-pdf`, `export-report`, `stripe-connect`, `stripe-billing-portal`, `stripe-checkout`, `stripe-checkout-session`, `tenant-invitation-validate`, `tenant-invitation-accept`
- **Server-to-server webhooks** (NO CORS headers): `stripe-webhooks`, `docuseal-webhook`

**Fix pattern -- shared CORS helper:**
```typescript
// supabase/functions/_shared/cors.ts
export function getCorsHeaders(req: Request): Record<string, string> {
  const frontendUrl = Deno.env.get('FRONTEND_URL') ?? ''
  const origin = req.headers.get('origin') ?? ''

  if (origin === frontendUrl) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Vary': 'Origin',
    }
  }

  // No CORS headers for non-matching origins
  return {}
}
```

**Important:** The `Vary: Origin` header is required when CORS origin is not `*` -- it tells CDNs/proxies that the response varies by origin header. Without it, a cached response for one origin could be served for another.

### Pattern 6: Dependency Pinning via Import Map (SEC-08)
**What:** Pin all Edge Function dependencies to exact versions using a shared `deno.json`.
**Current state:** No `deno.json` exists. Imports use floating versions:
- `https://esm.sh/@supabase/supabase-js@2` -- floats within 2.x
- `npm:stripe@14` -- floats within 14.x

**Fix pattern:**
```json
// supabase/functions/deno.json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.49.4",
    "stripe": "npm:stripe@14.25.0"
  }
}
```

Then Edge Functions change imports from:
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'npm:stripe@14'
```
To:
```typescript
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
```

**Note:** Supabase CLI automatically uses `supabase/functions/deno.json` when deploying Edge Functions. This is the standard approach. Verify the exact latest patch versions before pinning. The current `@supabase/supabase-js@2` and `stripe@14` versions should be looked up at implementation time.

### Anti-Patterns to Avoid
- **Information-leaking error responses:** Never return "lease not found" or "you don't own this lease" -- confirms resource existence. Always return generic `401`/`403`.
- **Trusting client-side auth state for server operations:** The `owner_user_id` should ultimately be set by `auth.uid()` in the DB (column default or RLS). Client-side guard is defense-in-depth, not the primary control.
- **Stripping `%` from search input:** The `%` wildcard is part of the ILIKE template (`%${search}%`), not the user input. Stripping it would break legitimate searches.
- **Applying CORS headers to webhook endpoints:** `stripe-webhooks` and `docuseal-webhook` are server-to-server. CORS headers on them are useless and widen the attack surface.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HMAC signature verification | Custom bit manipulation | Web Crypto API `crypto.subtle.sign('HMAC', ...)` | Built into Deno runtime, constant-time comparison available |
| Constant-time string comparison | `===` for signature verification | `crypto.timingSafeEqual()` (Node) or compare digests | Prevents timing attacks on signature verification |
| PostgREST filter parsing | Custom operator detection regex | Simple character-class strip (`/[,.()"'\\]/g`) | PostgREST operators are punctuation-based; stripping these characters is sufficient |
| CORS middleware | Custom per-function CORS logic | Shared `_shared/cors.ts` helper | Ensures consistency across all 9 browser-facing functions |

**Key insight:** These are security fixes, not features. The solutions should be as simple and auditable as possible. Complex abstractions are the enemy of security code.

## Common Pitfalls

### Pitfall 1: DocuSeal Webhook Body Consumed Twice
**What goes wrong:** `req.json()` consumes the request body stream. If you need to verify a signature against the raw body AND parse JSON, you must read the body as text first, verify, then parse.
**Why it happens:** The current code calls `req.json()` after signature check. With HMAC verification, you need the raw body bytes.
**How to avoid:** Read body as text with `req.text()`, verify HMAC against the text, then `JSON.parse()` it.
**Warning signs:** Signature always fails despite correct secret -- body stream was already consumed.

### Pitfall 2: Stripe Webhook Infinite Retry Loop (SEC-04)
**What goes wrong:** The `notification_type` CHECK constraint violation causes the insert to fail. The error propagates, the idempotency record is deleted, Stripe retries for 72 hours, each retry fails again.
**Why it happens:** `'stripe_connect_verified'` and `'payment_failed'` are not in the allowed CHECK constraint values `('maintenance', 'lease', 'payment', 'system')`.
**How to avoid:** Fix the constraint AND fix the notification_type values. Do the constraint migration BEFORE deploying Edge Function changes.
**Warning signs:** Sentry alerts for repeated `23514` (check_violation) errors from `stripe_webhook_events`.

### Pitfall 3: CORS Preflight OPTIONS Request Breaking
**What goes wrong:** After restricting CORS origin, the OPTIONS preflight handler returns no CORS headers for non-matching origins, causing the browser to block the actual request.
**Why it happens:** The `getCorsHeaders()` function returns empty headers for non-matching origins.
**How to avoid:** The OPTIONS handler MUST return CORS headers for the actual frontend origin. Test with the actual deployed frontend URL, not just localhost.
**Warning signs:** All Edge Function calls fail with CORS errors in browser console after deploying SEC-07.

### Pitfall 4: Maintenance Search Confusion
**What goes wrong:** Applying PostgREST sanitization to the maintenance search input, which is actually client-side only.
**Why it happens:** All 4 search inputs look similar in the UI but maintenance uses client-side `.filter()` not PostgREST.
**How to avoid:** Only sanitize the 4 PostgREST-interpolated searches: properties, tenants, units, vendors. Maintenance search in `maintenance-list.tsx` is safe (client-side).
**Warning signs:** Unnecessary code changes in maintenance-list.tsx.

### Pitfall 5: Breaking DocuSeal Webhook Contract with 401 Instead of 200/500
**What goes wrong:** DocuSeal may not retry on 401. Current contract: return 200 for success, 500 for retry-worthy failure.
**Why it happens:** Webhook services have different retry policies for different HTTP status codes. 401 may be treated as permanent rejection.
**How to avoid:** Verify DocuSeal's retry behavior for 401 responses. If DocuSeal treats 401 as permanent, the user decision to return 401 is correct (we WANT to reject these permanently). If DocuSeal retries 401, that is also acceptable since we want to reject until the secret is configured.
**Warning signs:** Legitimate DocuSeal webhooks being permanently dropped after a transient configuration issue.

## Code Examples

### SEC-04: Notification Type CHECK Constraint Fix
```sql
-- Migration: expand notification_type CHECK constraint to include Stripe event types
-- Run BEFORE deploying updated Edge Function code

alter table public.notifications
  drop constraint if exists notifications_notification_type_check;

alter table public.notifications
  add constraint notifications_notification_type_check
  check (notification_type in ('maintenance', 'lease', 'payment', 'system', 'stripe', 'security'));

comment on constraint notifications_notification_type_check on public.notifications is
  'Valid values: maintenance, lease, payment, system, stripe, security';
```

**Alternative approach (change webhook values instead of constraint):**
```typescript
// stripe-webhooks/index.ts -- map to existing constraint values
notification_type: 'system',  // was 'stripe_connect_verified' (line 170)
notification_type: 'payment', // was 'payment_failed' (line 244)
```

**Recommendation:** Map to existing values (`'system'` and `'payment'`) rather than expanding the constraint. This avoids a DB migration and keeps the type space small. The notification `title` and `message` fields already carry the specific context.

### SEC-05: Owner User ID Guard Function
```typescript
// apps/frontend/src/lib/require-owner-user-id.ts
import * as Sentry from '@sentry/nextjs'

export function requireOwnerUserId(userId: string | undefined): string {
  if (!userId) {
    Sentry.captureMessage('owner_user_id undefined in mutation -- user may not be authenticated', {
      level: 'warning',
    })
    throw new Error('Unable to save. Please refresh and try again.')
  }
  return userId
}
```

Usage in mutation hooks:
```typescript
// use-properties.ts
const { data: { user } } = await supabase.auth.getUser()
const ownerId = requireOwnerUserId(user?.id)
const { data: created, error } = await supabase
  .from('properties')
  .insert({ ...data, owner_user_id: ownerId })
  .select()
  .single()
```

### SEC-06: Sanitize Search with Debounce Standardization
```typescript
// apps/frontend/src/lib/sanitize-search.ts
const MAX_SEARCH_LENGTH = 100
const POSTGREST_DANGEROUS_CHARS = /[,.()"'\\]/g

export function sanitizeSearchInput(input: string): string {
  return input
    .replace(POSTGREST_DANGEROUS_CHARS, '')
    .trim()
    .slice(0, MAX_SEARCH_LENGTH)
}
```

Usage in query key files:
```typescript
// property-keys.ts
import { sanitizeSearchInput } from '#lib/sanitize-search'

if (filters?.search) {
  const safe = sanitizeSearchInput(filters.search)
  if (safe) {
    q = q.or(`name.ilike.%${safe}%,city.ilike.%${safe}%`)
  }
}
```

### SEC-07: Shared CORS Helper
```typescript
// supabase/functions/_shared/cors.ts
export function getCorsHeaders(req: Request): Record<string, string> {
  const frontendUrl = Deno.env.get('FRONTEND_URL')
  if (!frontendUrl) {
    // Fail-open to avoid breaking all Edge Functions if FRONTEND_URL not set
    // Log warning
    console.warn('FRONTEND_URL not set -- CORS headers omitted')
    return {}
  }

  const origin = req.headers.get('origin')
  if (origin === frontendUrl) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Vary': 'Origin',
    }
  }

  return {}
}

export function handleCorsOptions(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const headers = getCorsHeaders(req)
    if (Object.keys(headers).length > 0) {
      return new Response('ok', { headers })
    }
    return new Response(null, { status: 204 })
  }
  return null
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Access-Control-Allow-Origin: *` | Dynamic origin matching | Always best practice | Prevents CSRF via cross-origin requests |
| Floating dependency versions (`@2`, `@14`) | Pinned exact versions in import map | Deno 1.30+ (2023) | Prevents supply chain attacks via version drift |
| Fail-open webhook auth | Fail-closed (return 401 if unconfigured) | Always best practice | Prevents unauthenticated access during config gaps |
| Trust client `owner_user_id` | Guard + DB column default | Always best practice | Defense in depth against forged payloads |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + jsdom |
| Config file | `apps/frontend/vitest.config.ts` |
| Quick run command | `pnpm --filter @repo/frontend test:unit -- --run` |
| Full suite command | `pnpm --filter @repo/frontend test:unit` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | DocuSeal webhook rejects when secret missing/invalid | manual-only | N/A (Edge Function requires Deno runtime) | N/A |
| SEC-02 | DocuSeal IDOR blocked -- non-owner gets 403 | manual-only | N/A (Edge Function requires Deno runtime) | N/A |
| SEC-03 | generate-pdf IDOR blocked -- non-owner gets 403 | manual-only | N/A (Edge Function requires Deno runtime) | N/A |
| SEC-04 | Stripe notification_type values match CHECK constraint | unit | `pnpm --filter @repo/frontend test:unit -- --run src/lib/__tests__/sanitize-search.test.ts` | Wave 0 |
| SEC-05 | requireOwnerUserId throws on undefined | unit | `pnpm --filter @repo/frontend test:unit -- --run src/lib/__tests__/require-owner-user-id.test.ts` | Wave 0 |
| SEC-06 | sanitizeSearchInput strips operators, enforces max length | unit | `pnpm --filter @repo/frontend test:unit -- --run src/lib/__tests__/sanitize-search.test.ts` | Wave 0 |
| SEC-07 | CORS headers only set for matching FRONTEND_URL origin | manual-only | N/A (Edge Function requires Deno runtime) | N/A |
| SEC-08 | Import map exists with pinned versions | manual-only | `cat supabase/functions/deno.json` (verify file exists) | N/A |

**Manual-only justification for SEC-01/02/03/07:** Edge Functions run in Deno runtime, not jsdom. Testing requires either Supabase local dev server or deployed environment. These are best validated via curl commands against a running instance or integration tests in the `apps/integration-tests/` directory.

### Sampling Rate
- **Per task commit:** `pnpm --filter @repo/frontend test:unit -- --run`
- **Per wave merge:** `pnpm validate:quick`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/frontend/src/lib/__tests__/sanitize-search.test.ts` -- covers SEC-06
- [ ] `apps/frontend/src/lib/__tests__/require-owner-user-id.test.ts` -- covers SEC-05

*(SEC-04 constraint fix is a SQL migration -- validated by the Stripe webhook successfully inserting notifications after deployment)*

## Open Questions

1. **DocuSeal Signature Format**
   - What we know: Current code compares `x-docuseal-signature` header directly against the raw secret string (simple string match). User decision says "HMAC signature verification."
   - What's unclear: DocuSeal's actual signature format -- is it HMAC-SHA256 of the body, or a simple shared secret sent as header value?
   - Recommendation: Check DocuSeal docs/dashboard at implementation time. If it sends raw secret, use constant-time comparison. If HMAC, use Web Crypto API. The user locked "HMAC via X-DocuSeal-Signature" so implement HMAC but verify the exact format.

2. **FRONTEND_URL Environment Variable**
   - What we know: This env var needs to be set on Supabase Edge Functions for SEC-07 to work.
   - What's unclear: Whether this is already configured in Supabase Edge Function secrets.
   - Recommendation: Verify at implementation time with `supabase secrets list`. If not set, add it before deploying CORS changes.

3. **Exact Pinned Versions for SEC-08**
   - What we know: `@supabase/supabase-js@2` and `stripe@14` are the major versions in use.
   - What's unclear: The exact patch versions currently resolved by the CDN/npm.
   - Recommendation: Check `esm.sh` resolution and npm registry at implementation time to pin the latest patch version within the current major.

## Sources

### Primary (HIGH confidence)
- `supabase/functions/docuseal-webhook/index.ts` -- Direct code analysis of current auth bypass (SEC-01)
- `supabase/functions/docuseal/index.ts` -- Direct code analysis of missing ownership check (SEC-02)
- `supabase/functions/generate-pdf/index.ts` -- Direct code analysis of IDOR (SEC-03)
- `supabase/functions/stripe-webhooks/index.ts` -- Direct code analysis of notification_type values (SEC-04)
- `supabase/migrations/20251231081143_migrate_enums_to_text_constraints.sql` -- CHECK constraint definition
- `.full-review/02-security-performance.md` -- Original vulnerability assessment with CVSS scores
- 6 frontend mutation hooks -- Direct code analysis of owner_user_id pattern (SEC-05)
- 4 query key files -- Direct code analysis of PostgREST filter interpolation (SEC-06)
- All 11 Edge Function index.ts files -- Direct CORS header analysis (SEC-07)

### Secondary (MEDIUM confidence)
- Deno import map documentation -- `deno.json` shared import map support for Supabase Edge Functions (SEC-08)
- PostgREST filter syntax documentation -- operator injection vectors (SEC-06)

### Tertiary (LOW confidence)
- DocuSeal webhook signature format -- needs verification at implementation time (SEC-01)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries needed, all fixes use existing code
- Architecture: HIGH -- all vulnerability locations identified, fix patterns are straightforward
- Pitfalls: HIGH -- based on direct code analysis of current implementation
- Validation: MEDIUM -- Edge Function tests require Deno runtime, not covered by Vitest

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable domain, no version sensitivity)
