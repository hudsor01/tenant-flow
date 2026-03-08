# Phase 13: Newsletter Backend - Research

**Researched:** 2026-03-07
**Domain:** Supabase Edge Function + Resend Contacts API
**Confidence:** HIGH

## Summary

Phase 13 is a compact, self-contained Edge Function that accepts an email address via POST and creates a contact in Resend via the Contacts API, adding it to a Segment (formerly Audience). The function is unauthenticated (public newsletter signup), rate-limited at 5 req/min per IP, and requires no database interaction.

The project already has all shared utilities needed: `rateLimit()`, `errorResponse()`, `validateEnv()`, `getCorsHeaders()`/`handleCorsOptions()`. The existing `_shared/resend.ts` handles email sending, but does NOT handle the Contacts API -- that requires direct `fetch()` calls to `https://api.resend.com/contacts` and `https://api.resend.com/segments`.

**Primary recommendation:** Build a single Edge Function (`newsletter-subscribe`) using raw `fetch()` to the Resend Contacts REST API. Create the contact with the `segments` parameter to associate it with a "Newsletter" segment. Use the module-level isolate cache pattern (already proven in `rate-limit.ts`) to cache the segment ID after first lookup/creation.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Always return success to the caller, regardless of whether the email is new or already exists. The user should never see an "already subscribed" error -- duplicates are handled silently.
- Create the Resend audience (now "segment") programmatically on first use if it doesn't exist. Cache the audience/segment ID in the Edge Function isolate after creation/lookup. No manual Resend dashboard setup required -- the function is self-bootstrapping.

### Claude's Discretion
- Email validation approach (regex depth, edge cases)
- Audience name and naming convention (now "Segment" name)
- Error response structure (follows existing `errorResponse()` pattern)
- Rate limit prefix naming
- Test structure and coverage scope

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NEWS-01 | `newsletter-subscribe` Edge Function using Resend Contacts API (not deprecated Audiences) | Resend Contacts API: `POST /contacts` with `segments` param. Audiences API deprecated -- use Segments API (`POST /segments`) for segment creation. Direct `fetch()` calls (no Resend SDK needed). |
| NEWS-02 | Rate limiting (5 req/min per IP) and email validation on Edge Function | Existing `rateLimit()` from `_shared/rate-limit.ts` with `{ maxRequests: 5, windowMs: 60_000, prefix: 'newsletter' }`. Email validation via regex in function body. |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Resend REST API | Current (2026) | Contact creation + segment management | Already used for auth emails; `RESEND_API_KEY` already deployed |
| Upstash Ratelimit | npm:@upstash/ratelimit | Rate limiting (5/min/IP) | Already in deno.json import map; `_shared/rate-limit.ts` proven |
| Sentry Deno | npm:@sentry/deno@9 | Error tracking | Already in deno.json; `_shared/errors.ts` uses it |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Deno std/assert | jsr:@std/assert@1 | Test assertions | Edge Function integration tests |
| Deno std/dotenv | jsr:@std/dotenv | Load .env in tests | Test runner environment |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw fetch to Resend | `resend` Node SDK | SDK is Node-only, not compatible with Deno runtime. Raw fetch is simpler and matches existing `_shared/resend.ts` pattern. |
| Segments API | Audiences API | Audiences API is explicitly deprecated and "will be removed in the future." Must use Segments API. |

**Installation:** No new dependencies needed. All imports already in `supabase/functions/deno.json`.

## Architecture Patterns

### Recommended Project Structure
```
supabase/functions/
  newsletter-subscribe/
    index.ts                    # Edge Function entry point (~80-100 lines)
  _shared/
    cors.ts                     # Already exists
    env.ts                      # Already exists
    errors.ts                   # Already exists
    rate-limit.ts               # Already exists
    resend.ts                   # Already exists (email sending only)
  tests/
    newsletter-subscribe-test.ts  # Deno integration test
```

### Pattern 1: Unauthenticated Rate-Limited Edge Function
**What:** Public-facing Edge Function with no JWT auth, rate limited by IP.
**When to use:** Newsletter subscription, invitation validation, checkout session retrieval.
**Example (established pattern from `stripe-checkout-session/index.ts`):**
```typescript
// Source: supabase/functions/stripe-checkout-session/index.ts
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts'
import { validateEnv } from '../_shared/env.ts'
import { errorResponse } from '../_shared/errors.ts'
import { rateLimit } from '../_shared/rate-limit.ts'

Deno.serve(async (req: Request) => {
  const optionsResponse = handleCorsOptions(req)
  if (optionsResponse) return optionsResponse

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: getCorsHeaders(req) })
  }

  // Rate limit: N req/min per IP
  const rateLimited = await rateLimit(req, { maxRequests: N, windowMs: 60_000, prefix: 'prefix' })
  if (rateLimited) return rateLimited

  try {
    const env = validateEnv({ required: [...] })
    // ... business logic
  } catch (err) {
    return errorResponse(req, 500, err, { action: 'action_name' })
  }
})
```

### Pattern 2: Module-Level Isolate Cache
**What:** Cache computed values across requests in a warm Deno isolate using module-level `let` variables.
**When to use:** Segment ID lookup (avoid re-fetching on every request within the same isolate).
**Example (established pattern from `_shared/rate-limit.ts`):**
```typescript
// Source: supabase/functions/_shared/rate-limit.ts (lines 22-42)
let cachedLimiter: Ratelimit | null = null

function getLimiter(maxRequests: number, windowMs: string): Ratelimit {
  if (cachedLimiter) return cachedLimiter
  // ... create and cache
  cachedLimiter = new Ratelimit({ ... })
  return cachedLimiter
}
```

### Pattern 3: Resend Contacts API via Fetch
**What:** Direct REST API calls to Resend for contact and segment management.
**When to use:** Creating contacts, creating/listing segments. NOT for sending emails (use `_shared/resend.ts` for that).
**Example (from Resend API docs):**
```typescript
// Source: https://resend.com/docs/api-reference/contacts/create-contact
const response = await fetch('https://api.resend.com/contacts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${resendApiKey}`,
  },
  body: JSON.stringify({
    email: subscriberEmail,
    segments: [segmentId],
  }),
})
```

### Anti-Patterns to Avoid
- **Using the deprecated Audiences API:** The `POST /audiences` and audience-scoped contact endpoints are deprecated. Use `POST /segments` and the global `POST /contacts` with `segments` parameter instead.
- **Installing the Resend Node SDK in Deno:** The official Resend SDK is Node-only. Use raw `fetch()` as already done in `_shared/resend.ts`.
- **Creating a Supabase client:** This function has zero database interaction. No `createClient()` call needed.
- **Requiring auth:** Newsletter signup is a public action. No JWT validation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | Custom counter logic | `rateLimit()` from `_shared/rate-limit.ts` | Upstash Redis sliding window, fail-open, battle-tested |
| CORS handling | Manual header assembly | `getCorsHeaders()`/`handleCorsOptions()` from `_shared/cors.ts` | Fail-closed, origin-matched, consistent with all Edge Functions |
| Error responses | Inline error formatting | `errorResponse()` from `_shared/errors.ts` | Sentry integration, generic messages, never exposes internals |
| Env validation | Manual `Deno.env.get` checks | `validateEnv()` from `_shared/env.ts` | Cached, throws on missing required, warns on missing optional |
| Email validation | Complex hand-rolled parser | Simple RFC 5322 regex | Full RFC compliance is impossible and unnecessary; HTML `type="email"` does client-side validation already |

**Key insight:** Every infrastructure concern (CORS, rate limiting, error handling, env validation) is already solved by `_shared/` utilities. The function's unique logic is only: validate email format, ensure segment exists, create contact.

## Common Pitfalls

### Pitfall 1: Using Deprecated Audiences API
**What goes wrong:** Audiences API endpoints (`POST /audiences`, `POST /audiences/{id}/contacts`) will be removed in a future Resend update.
**Why it happens:** Many tutorials and the Resend Node SDK DeepWiki docs still reference `audienceId`. The requirement (NEWS-01) explicitly says "not deprecated Audiences."
**How to avoid:** Use `POST /segments` for segment creation and `POST /contacts` with `segments: [segmentId]` parameter for contact creation.
**Warning signs:** Any code referencing "audience" in API URLs.

### Pitfall 2: Exposing Resend API Errors to Client
**What goes wrong:** Leaking Resend error messages (API key invalid, rate limit, etc.) to the frontend.
**Why it happens:** Passing through Resend's error response body in the 200/4xx response.
**How to avoid:** Always return generic `{ error: 'An error occurred' }` via `errorResponse()` for 5xx. For known validation errors (missing email), use specific but non-internal messages.
**Warning signs:** Any response body that includes "Resend", "API key", or Resend error codes.

### Pitfall 3: Not Handling Resend Contact Duplicate Behavior
**What goes wrong:** Uncertainty about what happens when `POST /contacts` is called for an email that already exists.
**Why it happens:** The Resend API documentation does not explicitly document duplicate behavior for the create contact endpoint.
**How to avoid:** The CONTEXT.md decision says "always return success to the caller." Implement a try-then-catch strategy: attempt to create the contact, and if Resend returns an error (likely 409 or 422 for duplicates), still return 200 success to the caller. The function should also handle the case where Resend returns 200 with a contact ID (meaning the contact was created or already existed).
**Warning signs:** Any code path that surfaces a "duplicate" or "conflict" error to the user.

### Pitfall 4: Segment Lookup Race Condition on Cold Start
**What goes wrong:** Two concurrent cold-start requests both try to create the segment simultaneously.
**Why it happens:** Module-level cache is empty on cold start; two parallel requests could both miss the cache.
**How to avoid:** Use a "create if not exists" approach: list segments to find "Newsletter" segment, if not found create it. If creation fails with a conflict (another request created it first), re-list to get the ID. This is idempotent.
**Warning signs:** 409 errors from `POST /segments` in logs.

### Pitfall 5: Rate Limit Cache Collision
**What goes wrong:** The `rateLimit()` utility caches the `Ratelimit` instance module-level, but it's created with specific `maxRequests`/`windowMs` values. If another function in the same isolate has different limits, the cached instance uses wrong values.
**Why it happens:** Supabase Edge Functions share isolates sometimes.
**How to avoid:** The `prefix` parameter on `rateLimit()` namespaces the keys in Redis. The cached `Ratelimit` instance uses the first caller's config -- but since each Edge Function is its own Deno.serve entrypoint, isolates are per-function. The prefix still provides safety: use `'newsletter'`.
**Warning signs:** Rate limits applying at wrong thresholds.

## Code Examples

Verified patterns from official sources and existing project code:

### Newsletter Subscribe Edge Function Structure
```typescript
// Derived from: supabase/functions/stripe-checkout-session/index.ts pattern
// + Resend API docs: https://resend.com/docs/api-reference/contacts/create-contact

import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts'
import { validateEnv } from '../_shared/env.ts'
import { errorResponse } from '../_shared/errors.ts'
import { rateLimit } from '../_shared/rate-limit.ts'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SEGMENT_NAME = 'Newsletter'
const RESEND_BASE = 'https://api.resend.com'

let cachedSegmentId: string | null = null

async function getOrCreateSegmentId(apiKey: string): Promise<string> {
  if (cachedSegmentId) return cachedSegmentId

  // List segments to find existing
  const listRes = await fetch(`${RESEND_BASE}/segments`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })

  if (listRes.ok) {
    const list = await listRes.json() as { data: Array<{ id: string; name: string }> }
    const existing = list.data.find((s) => s.name === SEGMENT_NAME)
    if (existing) {
      cachedSegmentId = existing.id
      return existing.id
    }
  }

  // Create segment
  const createRes = await fetch(`${RESEND_BASE}/segments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ name: SEGMENT_NAME }),
  })

  if (!createRes.ok) {
    // Race condition: another request may have created it. Re-list.
    const retryRes = await fetch(`${RESEND_BASE}/segments`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    if (retryRes.ok) {
      const retryList = await retryRes.json() as { data: Array<{ id: string; name: string }> }
      const found = retryList.data.find((s) => s.name === SEGMENT_NAME)
      if (found) {
        cachedSegmentId = found.id
        return found.id
      }
    }
    throw new Error('Failed to create or find Newsletter segment')
  }

  const created = await createRes.json() as { id: string }
  cachedSegmentId = created.id
  return created.id
}

Deno.serve(async (req: Request) => {
  const optionsResponse = handleCorsOptions(req)
  if (optionsResponse) return optionsResponse

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: getCorsHeaders(req) })
  }

  // NEWS-02: Rate limit 5 req/min per IP
  const rateLimited = await rateLimit(req, {
    maxRequests: 5,
    windowMs: 60_000,
    prefix: 'newsletter',
  })
  if (rateLimited) return rateLimited

  try {
    const env = validateEnv({
      required: ['RESEND_API_KEY'],
      optional: ['FRONTEND_URL', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
    })

    const body = await req.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    // NEWS-02: Email validation
    if (!email || !EMAIL_REGEX.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Valid email is required' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = env['RESEND_API_KEY']
    const segmentId = await getOrCreateSegmentId(apiKey)

    // NEWS-01: Create contact via Resend Contacts API
    const contactRes = await fetch(`${RESEND_BASE}/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        email,
        segments: [segmentId],
      }),
    })

    // Locked decision: always return success, even if duplicate
    if (!contactRes.ok) {
      const status = contactRes.status
      // Log the error but return success to caller
      const errBody = await contactRes.text().catch(() => '')
      console.error(JSON.stringify({
        level: 'warn',
        event: 'resend_contact_create_non_ok',
        status,
        body: errBody,
        email_domain: email.split('@')[1],
      }))
      // If it's a client error (likely duplicate), still return success
      // If it's a server error, still return success (fail silent to user)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    // Even on unexpected errors, consider returning success to avoid leak
    // But use errorResponse for proper Sentry logging
    return errorResponse(req, 500, err, { action: 'newsletter_subscribe' })
  }
})
```

### Email Validation Regex
```typescript
// Simple but sufficient for newsletter signup.
// Client-side HTML type="email" does primary validation.
// This is a server-side safety net, not an RFC parser.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
```

### Resend Create Segment
```typescript
// Source: https://resend.com/docs/api-reference/segments/create-segment
const response = await fetch('https://api.resend.com/segments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({ name: 'Newsletter' }),
})
// Response: { "object": "segment", "id": "uuid", "name": "Newsletter" }
```

### Resend List Segments
```typescript
// Source: https://resend.com/docs/api-reference/segments/list-segments
const response = await fetch('https://api.resend.com/segments', {
  headers: { 'Authorization': `Bearer ${apiKey}` },
})
// Response: { "object": "list", "has_more": false, "data": [{ "id": "uuid", "name": "...", "created_at": "..." }] }
```

### Resend Create Contact with Segment
```typescript
// Source: https://resend.com/docs/api-reference/contacts/create-contact
const response = await fetch('https://api.resend.com/contacts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    email: 'user@example.com',
    segments: ['segment-uuid-here'],
  }),
})
// Response: { "object": "contact", "id": "uuid" }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `POST /audiences` + `POST /audiences/{id}/contacts` | `POST /segments` + `POST /contacts` with `segments` param | Late 2025 | Audiences deprecated; contacts are now global entities identified by email |
| Resend SDK (`resend` npm package) | Raw `fetch()` in Deno | N/A (project convention) | SDK is Node-only; Edge Functions use Deno runtime |

**Deprecated/outdated:**
- **Audiences API:** All `/audiences/*` endpoints deprecated in favor of `/segments/*`. Existing data migrated. CONTEXT.md references "audience" but implementation must use Segments API per NEWS-01.

## Open Questions

1. **Resend duplicate contact creation behavior**
   - What we know: The API docs do not explicitly state what happens when creating a contact with an email that already exists. Contacts are "global entities, identified by their email address."
   - What's unclear: Whether `POST /contacts` returns 200 (idempotent success), 409 (conflict), 422 (validation error), or updates the existing contact when the email already exists.
   - Recommendation: The locked decision says "always return success." Implement: attempt create, log any non-2xx response, return `{ success: true }` regardless. This is safe because we only care that the email reaches Resend's contact list. Empirical validation during testing will resolve the exact status code.

2. **Segment ID stability**
   - What we know: Segment IDs are UUIDs returned by `POST /segments` and `GET /segments`.
   - What's unclear: Whether Resend could theoretically reassign IDs (very unlikely for UUIDs).
   - Recommendation: Cache in isolate memory (already decided). The cache expires naturally on cold start. No concern in practice.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Deno test runner (built-in) |
| Config file | `supabase/functions/deno.json` (import map only) |
| Quick run command | `cd supabase/functions && deno test --allow-all --no-check tests/newsletter-subscribe-test.ts` |
| Full suite command | `cd supabase/functions && deno test --allow-all --no-check tests/` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NEWS-01 | Contact created in Resend via Contacts API | integration | `cd supabase/functions && deno test --allow-all --no-check tests/newsletter-subscribe-test.ts` | No -- Wave 0 |
| NEWS-02 | Rate limiting (5/min/IP) + email validation | integration | Same as above | No -- Wave 0 |

### Specific Test Cases (from existing Edge Function test patterns)
| Test | Type | Covers |
|------|------|--------|
| OPTIONS returns CORS preflight | integration | Both |
| Rejects non-POST with 405 | integration | Both |
| Rejects missing email with 400 | integration | NEWS-02 |
| Rejects invalid email format with 400 | integration | NEWS-02 |
| Valid email returns 200 with `{ success: true }` | integration | NEWS-01 |
| Documents rate limiting behavior (5/min) | documentation | NEWS-02 |
| Error responses are generic (no internals) | integration | Both |

### Sampling Rate
- **Per task commit:** `cd supabase/functions && deno test --allow-all --no-check tests/newsletter-subscribe-test.ts`
- **Per wave merge:** `pnpm validate:quick` (types + lint + unit tests)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `supabase/functions/tests/newsletter-subscribe-test.ts` -- covers NEWS-01, NEWS-02
- [ ] `supabase/functions/newsletter-subscribe/index.ts` -- the Edge Function itself

*(Framework and shared test infrastructure already exist -- only the function and its test file are needed)*

## Sources

### Primary (HIGH confidence)
- `supabase/functions/stripe-checkout-session/index.ts` -- unauthenticated, rate-limited Edge Function pattern (project source)
- `supabase/functions/tenant-invitation-validate/index.ts` -- unauthenticated Edge Function with rate limiting (project source)
- `supabase/functions/_shared/rate-limit.ts` -- rate limiting utility with isolate cache pattern (project source)
- `supabase/functions/_shared/resend.ts` -- Resend `fetch()` pattern (project source)
- `supabase/functions/tests/tenant-invitation-accept-test.ts` -- Deno test pattern (project source)
- [Resend Create Contact API](https://resend.com/docs/api-reference/contacts/create-contact) -- endpoint, params, response format
- [Resend Create Segment API](https://resend.com/docs/api-reference/segments/create-segment) -- replaces deprecated Audiences
- [Resend List Segments API](https://resend.com/docs/api-reference/segments/list-segments) -- for segment lookup

### Secondary (MEDIUM confidence)
- [Resend Errors Reference](https://resend.com/docs/api-reference/errors) -- no contact-specific errors documented, suggesting create may be idempotent
- [Resend New Contacts Experience](https://resend.com/blog/new-contacts-experience) -- contacts are global, identified by email
- [Resend Audiences Deprecation](https://resend.com/docs/api-reference/audiences/list-audiences) -- explicit deprecation notice, migration to Segments

### Tertiary (LOW confidence)
- Resend duplicate contact behavior -- not documented in API reference or error codes. Must validate empirically.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, no new dependencies
- Architecture: HIGH -- follows exact patterns from 3 existing unauthenticated Edge Functions
- Pitfalls: MEDIUM -- duplicate contact API behavior is undocumented; mitigated by "always return success" decision
- Testing: HIGH -- established Deno test pattern from 4 existing test files

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable -- Resend API changes are backward-compatible, project patterns established)
