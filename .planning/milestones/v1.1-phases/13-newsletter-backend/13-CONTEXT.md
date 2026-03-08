# Phase 13: Newsletter Backend - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

`newsletter-subscribe` Edge Function that adds email contacts to a Resend audience with rate limiting and email validation. No frontend changes (NewsletterSignup component built in Phase 12).

</domain>

<decisions>
## Implementation Decisions

### Duplicate email handling
- Always return success to the caller, regardless of whether the email is new or already exists
- The user should never see an "already subscribed" error — duplicates are handled silently
- Matches ROADMAP success criteria: "duplicate handled gracefully, not errored"

### Resend contact list
- Create the Resend audience programmatically on first use if it doesn't exist
- Cache the audience ID in the Edge Function isolate after creation/lookup
- No manual Resend dashboard setup required — the function is self-bootstrapping

### Claude's Discretion
- Email validation approach (regex depth, edge cases)
- Audience name and naming convention
- Error response structure (follows existing `errorResponse()` pattern)
- Rate limit prefix naming
- Test structure and coverage scope

</decisions>

<specifics>
## Specific Ideas

- The NewsletterSignup component (Phase 12) calls `supabase.functions.invoke('newsletter-subscribe', { body: { email } })` — this is the contract
- Rate limit is 5 req/min per IP (from requirements NEWS-02)
- Must use Resend Contacts API, NOT the deprecated Audiences API for adding contacts (from requirements NEWS-01)
- STATE.md noted "Resend Contacts API duplicate behavior needs empirical validation" — resolved by always returning success

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `_shared/rate-limit.ts`: Upstash Redis sliding window rate limiter — use `rateLimit(req, { maxRequests: 5, windowMs: 60_000, prefix: 'newsletter' })`
- `_shared/errors.ts`: `errorResponse()` for generic error responses with Sentry logging
- `_shared/env.ts`: `validateEnv()` for required/optional env var validation
- `_shared/cors.ts`: `getCorsHeaders()` and `handleCorsOptions()` for CORS handling
- `_shared/resend.ts`: `sendEmail()` helper (for email sending, not contacts — contacts need direct API calls)

### Established Patterns
- Edge Function entry point: `Deno.serve(async (req) => { ... })` with CORS preflight, env validation, error handling
- Auth pattern: unauthenticated endpoint (newsletter is public — no Bearer token needed)
- Error responses: never expose internal details, use `errorResponse()` from `_shared/errors.ts`
- Rate limiting: call `rateLimit()` early, return 429 Response if limited

### Integration Points
- Frontend consumer: `src/components/blog/newsletter-signup.tsx` calls `supabase.functions.invoke('newsletter-subscribe', { body: { email } })`
- Required env vars: `RESEND_API_KEY` (already exists), `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (already exist for other rate-limited functions)
- No database interaction — contacts stored in Resend, not Supabase

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-newsletter-backend*
*Context gathered: 2026-03-07*
