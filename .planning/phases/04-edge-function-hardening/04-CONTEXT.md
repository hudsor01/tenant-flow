# Phase 4: Edge Function Hardening - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

All 15 Edge Functions fail-fast on missing config, reject abuse, sanitize outputs, and never leak internal errors. CSP header added to vercel.json. Stripe SDK and Supabase SDK versions aligned.

Requirements: EDGE-01 through EDGE-14 + DOC-01

</domain>

<decisions>
## Implementation Decisions

### Error Response Policy
- All error responses are generic — no raw `dbError.message`, `err.message`, or stack traces exposed to clients
- This applies to ALL errors including known/expected ones (invalid input, expired invitation) — frontend infers from HTTP status codes only (400, 401, 404, 410, 429, 500)
- Full error details logged to Sentry + console.error server-side before returning generic response
- Shared `_shared/errors.ts` utility: `errorResponse(req, status, error, sentryContext)` — logs to Sentry + console.error, returns generic JSON `{ error: 'An error occurred' }` with CORS headers
- All 15 functions use the shared utility for consistency
- Applies to: EDGE-07

### Rate Limiting
- Rate limiting on unauthenticated Edge Functions only: `tenant-invitation-accept`, `tenant-invitation-validate`, `stripe-checkout-session`
- Also rate limit Sentry tunnel `/monitoring` endpoint (EDGE-11)
- Thresholds: 10 req/min per IP for invitation/checkout endpoints, 60 req/min per IP for Sentry tunnel
- Response: HTTP 429 Too Many Requests with `Retry-After` header
- Rate limit hits logged to Sentry as warnings (IP + endpoint) for abuse pattern detection
- Shared `_shared/rate-limit.ts` utility: `rateLimit(req, { maxRequests, windowMs })` — each function calls with its own thresholds
- Mechanism: **needs research** — investigate free options (in-memory Map, Deno KV, Supabase table) and paid options only if clearly superior
- Authenticated Edge Functions do NOT get rate limiting (JWT validation is sufficient barrier)
- Applies to: EDGE-02, EDGE-08, EDGE-11

### Env Validation
- Tiered: required vs optional env vars per function
- Core vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY) crash on missing — function returns 500 immediately
- Non-critical vars (SENTRY_DSN, FRONTEND_URL) log warning and continue
- Each function declares its own required/optional list
- Shared `_shared/env.ts` utility: `validateEnv({ required: [...], optional: [...] })` — called inside Deno.serve handler on first request
- Validation runs on first request, not at module level (Supabase doesn't surface module-level crashes clearly)
- Applies to: EDGE-01

### CORS Fail-Closed
- When FRONTEND_URL is not set, block all cross-origin requests (fail-closed) — no CORS headers returned
- Local dev must set `FRONTEND_URL=http://localhost:3050` in Edge Function env
- Single origin only — no comma-separated list. Staging gets its own Supabase project
- Applies to: EDGE-10

### Content Security Policy
- Moderate CSP header in `vercel.json`: `default-src 'self'`; `script-src 'self' 'unsafe-inline'` (Next.js needs it); `style-src 'self' 'unsafe-inline'` (Tailwind); `img-src 'self' data: blob:`; `connect-src 'self' *.supabase.co *.sentry.io *.stripe.com`
- Enforced immediately (not report-only)
- Applies to: EDGE-04

### Claude's Discretion
- Env validation: whether to return typed config object or just assert presence (tradeoff: cleaner downstream vs bigger refactor)
- Exact XSS escaping approach for DocuSeal/PDF templates (EDGE-03)
- Which Edge Functions should use user JWT vs service_role for reads (EDGE-06)
- Invitation code fragment migration details (EDGE-09, deferred from Phase 3)
- Stripe SDK version alignment strategy (EDGE-05, EDGE-13)
- Supabase SDK version alignment strategy (EDGE-12)
- Vary header review for CDN safety (EDGE-14)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User wants research on rate limiting mechanisms before committing to an implementation.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `_shared/cors.ts`: getCorsHeaders(req) + handleCorsOptions(req) — already handles CORS with FRONTEND_URL. Needs fail-closed update.
- `_shared/resend.ts`: Fire-and-forget email helper with Sentry fallback logging — pattern reusable for error reporting.
- `@sentry/deno` already in deno.json import map — available for error logging utility.

### Established Patterns
- All Edge Functions follow `Deno.serve(async (req) => { ... })` pattern
- CORS preflight handled at top of every function via `handleCorsOptions(req)`
- Auth pattern: `req.headers.get('Authorization')` → `supabase.auth.getUser(token)`
- Stripe SDK v20 with apiVersion `'2026-02-25.clover'` standardized (Phase 2)

### Integration Points
- `vercel.json` for CSP header (EDGE-04)
- `supabase/functions/_shared/` for new utilities (errors.ts, rate-limit.ts, env.ts)
- `supabase/functions/deno.json` import map for any new dependencies
- 15 Edge Functions need individual updates for env validation + error response utility adoption

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-edge-function-hardening*
*Context gathered: 2026-03-05*
