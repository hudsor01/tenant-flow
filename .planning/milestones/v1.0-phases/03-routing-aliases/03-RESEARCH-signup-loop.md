# Phase 3 Specialist 1: `/signup` Redirect Loop — Diagnosis + Fix

**Researched:** 2026-05-09
**Domain:** Next.js 16 routing config + Vercel edge redirects
**Confidence:** HIGH (every claim verified against Next.js 16 docs + live curl + codebase file:line)

## Summary

`/signup` currently 307s to `/login?redirect=%2Fsignup` because the proxy treats it as a private route. `/login` does not auto-redirect when an unauthenticated user lands on it, so the loop is only one full hop visible — but every external link/ad/email pointing at `/signup` lands users on the login page with a meaningless `redirect=/signup` query param, blocking new account creation.

**Primary recommendation:** Add a single `redirects()` entry in `next.config.ts` that maps `/signup` → `/pricing`. Use `statusCode: 301` (not `permanent: true`) because `permanent: true` produces **308**, not 301 — and CONTEXT.md locks 301. Add `/signup` to `proxy.ts` `PUBLIC_ROUTES` as defense-in-depth. Ship a 4-assertion Playwright spec under `tests/e2e/tests/public/routing-aliases.spec.ts`.

**Critical conflict to flag to planner:** CONTEXT.md § Decisions says "301 to `/pricing`". Next.js 16 default behavior with `permanent: true` is **308, not 301** ([next.js docs `redirects` config][nextjs-redirects], 2026-05-07). To produce a true 301, must use `statusCode: 301` — and the docs say "you can use the `statusCode` property instead of the `permanent` property, but not both." Recommend `statusCode: 301`. If planner / user prefers 308 (Next.js default, semantically equivalent for SEO purposes), update CONTEXT.md before locking.

## Request Flow (current state)

### Live HTTP probes (run 2026-05-09 against tenantflow.app prod)

| URL | Response | Location header |
|-----|----------|-----------------|
| `GET /signup` | **307** | `/login?redirect=%2Fsignup` |
| `GET /signup/` | **308** (trailing-slash collapse) | `/signup` |
| `GET /signup?redirect=/dashboard` | **307** | `/login?redirect=%2Fsignup` (query stripped, `redirect` param hardcoded to original path by proxy) |
| `GET /login?redirect=%2Fsignup` | **200** (renders login page) | — |
| `GET /.well-known/change-password` (existing redirect) | **307** | `/auth/update-password` |

**Key observation:** the `/signup/` (trailing slash) variant already 308s to `/signup` via Next.js's built-in `trailingSlash: false` collapse (no config needed). After that hop, the proxy fires the 307 to `/login`. So a `/signup/` request takes **two** hops to land on `/login`, but ends in the same broken state.

The `/.well-known/change-password` probe confirms `redirects()` from `next.config.ts:41-69` ([file:line cited below][next-config-redirects]) is wired correctly and runs at the Vercel edge.

### Execution order (Next.js 16, official docs)

Per [next.js docs `proxy.js` § Execution order][nextjs-proxy-order] (2026-05-07, v16.2.6):

> The following is the execution order:
> 1. `headers` from `next.config.js`
> 2. **`redirects` from `next.config.js`**
> 3. **Proxy (`rewrites`, `redirects`, etc.)**
> 4. `beforeFiles` (`rewrites`) from `next.config.js`
> 5. Filesystem routes (`public/`, `_next/static/`, `pages/`, `app/`, etc.)
> 6. ...

**Verified:** `redirects()` runs **BEFORE** proxy. Adding `/signup` → `/pricing` to `redirects()` short-circuits the request at step 2; proxy never sees it; no loop. The existing `/.well-known/change-password` redirect is the proof-of-pattern in this exact codebase.

### Trace of current `/signup` request (file:line evidence)

1. **Vercel edge receives** `GET /signup`.
2. **`next.config.ts:41-69`** ([file:line][next-config-redirects]) `redirects()` runs first. It contains exactly one entry — `/.well-known/change-password` → `/auth/update-password`. **No match for `/signup`. Falls through.**
3. **`src/proxy.ts:52`** ([file:line][proxy-entry]) `proxy(request)` invoked because the matcher at `src/proxy.ts:158-162` matches all paths except static assets / API routes / monitoring. `/signup` is in scope.
4. **`src/proxy.ts:57`** calls `updateSession(request)` ([file:line][update-session]). For unauthenticated request, returns `{ user: null, supabaseResponse }`.
5. **`src/proxy.ts:59`** calls `isPublicRoute('/signup')`. The PUBLIC_ROUTES array at `src/proxy.ts:10-32` does NOT include `/signup`. Returns `false`.
6. **`src/proxy.ts:63-68`** runs the `if (!user)` branch. Constructs `url.pathname = '/login'`, sets `url.searchParams.set('redirect', '/signup')`, returns `redirectWithCookies(url, supabaseResponse)`.
7. **`src/proxy.ts:40-49`** `redirectWithCookies` calls `NextResponse.redirect(url)` — Next.js's `NextResponse.redirect()` defaults to **307 Temporary Redirect** (which matches the observed live behavior).
8. **Browser receives 307**, follows to `/login?redirect=%2Fsignup`.
9. **`/login`** is in PUBLIC_ROUTES (`src/proxy.ts:12`). Proxy returns the supabaseResponse without redirecting.
10. **`src/app/(auth)/login/page.tsx`** renders. The `redirect` query param is read at line 89 (`searchParams?.get('redirect')`) but ONLY consumed AFTER successful sign-in (line 92-94). For an unauthenticated user just landing on the page, the param is ignored — no further redirect happens. **The "loop" terminates at the login page.**

### Why the audit calls this a "loop"

The user-experience defect: someone clicking an external link to `/signup` expecting to create an account lands on the login form with no signup option visible (the page only offers "View plans" → `/pricing` at line 199). The `redirect=/signup` query param dangles and is never consumed (because there's no `/signup` page to send the user to even after login). Net effect: blocked signup funnel.

If the user DID sign in, line 92-94 would try to `router.push('/signup')` (passes the `isValidRedirect` guard at line 27-32) — and proxy would 307 it back to `/login`. **That's the actual infinite loop**, but only triggered for a user who bothers to log in from this entry point. For unauthenticated visitors, it's a dead-end, not an infinite loop. Both states block new account creation through the `/signup` URL.

## Recommended Fix

### Primary: `next.config.ts` redirects() entry

Insert into the `redirects()` array at **`next.config.ts:42-68`** ([file:line][next-config-redirects]), as the **second** entry (after `/.well-known/change-password`):

```typescript
{
  source: '/signup',
  destination: '/pricing',
  // CONTEXT.md locks "301 permanent". Next.js's `permanent: true`
  // produces 308 (per docs: "if true will use the 308 status code").
  // Use `statusCode: 301` to honor the lock. Cannot combine with
  // `permanent` (per docs: "you can use the statusCode property
  // instead of the permanent property, but not both").
  statusCode: 301,
},
```

**Final shape after both Phase 3 changes are applied** (CRIT-05 + CRIT-06; sister specialist owns CRIT-06):

```typescript
async redirects() {
  return [
    // existing /.well-known/change-password entry (lines 43-67) ...
    { source: '/signup', destination: '/pricing', statusCode: 301 },
    // sister specialist's 4 legal-alias entries go here ...
  ]
}
```

### Behavior verified against Next.js 16 docs

| Property | Docs reference | Confirmed behavior |
|----------|----------------|--------------------|
| `permanent: true` | "if `true` will use the 308 status code" | Produces 308 — **NOT 301**; conflicts with CONTEXT.md lock |
| `permanent: false` | "if `false` will use the 307 status code" | Currently used for `/.well-known/change-password` |
| `statusCode: 301` | "In some rare cases, you might need to assign a custom status code for older HTTP Clients to properly redirect. In these cases, you can use the `statusCode` property instead of the `permanent` property, but not both." | Produces 301; required to honor CONTEXT.md lock |
| Query string | "When a redirect is applied, any query values provided in the request will be passed through to the redirect destination." | `?foo=bar` is **preserved by default**. CONTEXT.md says dropping is preferred — see § Query String Handling below |
| Trailing slash | Default `trailingSlash: false` collapses `/signup/` → `/signup` BEFORE redirects() runs | Verified live: `/signup/` 308s to `/signup`, then the new redirect fires. **No second entry for `/signup/` needed.** |

### Query String Handling

Default Next.js behavior: query is preserved. CONTEXT.md § Decisions: "the redirect should preserve the query string OR drop it (latter is safer — query params on `/pricing` aren't expected). Researcher recommends; planner locks."

**Recommendation: drop the query.** Two reasons:

1. The single realistic dangling param today is `?redirect=...` (fed by proxy at `src/proxy.ts:67`). Forwarding `?redirect=/signup` to `/pricing` is meaningless — `/pricing` doesn't read that param.
2. If marketing campaigns ever start passing UTM params through `/signup`, those should be re-attached on the marketing side, not relied upon to survive a redirect.

Next.js does NOT support stripping the query in a `redirects()` entry directly — the docs explicitly state query passthrough is the default behavior, and there's no `stripQuery` flag. **Two options to actually drop the query:**

**Option A (recommended, simplest):** Accept query passthrough. The cost is cosmetic — `/pricing?redirect=%2Fsignup` renders identically to `/pricing` because the page doesn't read that param. No code change. **Confidence: HIGH that this is harmless.**

**Option B (only if user insists on a clean URL):** Use a `has` clause to never match when query is present, plus a fallback. This is over-engineering for the failure mode in question. Skip.

**Locking recommendation:** **Option A.** Don't fight the framework default. Note the cosmetic-only consequence in the plan.

### Alternative considered: `statusCode: 308` instead of `301`

If the user reads "301 vs 308" and shrugs, switch to `permanent: true` (= 308). 308 is semantically equivalent to 301 for both browsers and search engines, with one upgrade: 308 preserves the request method (GET stays GET, POST stays POST), whereas 301 historically allowed browsers to silently rewrite POST→GET. Since `/signup` is GET-only, that distinction is moot.

**Recommendation: stick with `statusCode: 301` to honor CONTEXT.md lock.** Flag the conflict to the planner; let them decide whether to amend CONTEXT.md back to 308 (which is the Next.js idiomatic choice). Confidence on this conflict: HIGH — directly cited from Next.js 16 docs.

## PUBLIC_ROUTES Defense-in-Depth

**Recommendation: ADD `/signup` to PUBLIC_ROUTES** at `src/proxy.ts:10-32`.

Insert between `'/resources'` (line 24) and `'/compare'` (line 25):

```typescript
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/pricing',
  // ... existing entries ...
  '/resources',
  '/signup',   // ← new: defense-in-depth in case redirects() entry is removed
  '/compare',
  // ... rest ...
]
```

### Why keep both layers

The redirect is the primary fix and runs BEFORE proxy (step 2 vs step 3 per Next.js execution order). With the redirect in place, proxy never sees a `/signup` request — so PUBLIC_ROUTES is technically dead code for this path.

But: a future refactor could remove the `redirects()` entry (e.g., someone deciding to actually build a `/signup` page). Without `/signup` in PUBLIC_ROUTES, that future refactor would silently re-introduce the loop — same defect class as today.

**Cost of adding it:** one line. Zero perf impact (proxy short-circuits at line 59-61 for public routes). Zero test impact. Pure insurance.

**Confidence: MEDIUM** that this is worth it (could go either way; CONTEXT.md leans yes for the legal aliases, same logic applies here). Sister specialist will likely recommend the analog for `/terms-of-service` etc. Planner decides whether the parallelism with sister specialist's recommendation matters.

## Test Strategy

### File location

`tests/e2e/tests/public/routing-aliases.spec.ts` — matches CONTEXT.md § Specifics line 125-126 and the `public` Playwright project at `tests/e2e/playwright.config.ts:175-181` (storageState: empty cookies, no auth setup).

### Spec template (CRIT-05 only — sister specialist adds CRIT-06 cases to the same file)

```typescript
import { test, expect } from '@playwright/test'

test.describe('Routing aliases — CRIT-05 /signup → /pricing', () => {
  test('GET /signup returns 301 with Location: /pricing', async ({ request }) => {
    const response = await request.get('/signup', { maxRedirects: 0 })
    expect(response.status()).toBe(301)
    expect(response.headers().location).toBe('/pricing')
  })

  test('GET /signup/ (trailing slash) ultimately resolves to /pricing', async ({ request }) => {
    // Next.js trailing-slash collapse runs first (308 to /signup), then our 301 to /pricing.
    // Following both hops should reach /pricing without entering the proxy auth path.
    const response = await request.get('/signup/', { maxRedirects: 5 })
    expect(response.status()).toBe(200)
    expect(response.url()).toMatch(/\/pricing(\?|$)/)
  })

  test('GET /signup?redirect=/dashboard does not loop back to /login', async ({ request }) => {
    // Regression guard: confirms redirects() short-circuits BEFORE proxy auth fires.
    // Pre-fix this returned 307 → /login?redirect=%2Fsignup. Post-fix it must return 301 → /pricing.
    const response = await request.get('/signup?redirect=/dashboard', { maxRedirects: 0 })
    expect(response.status()).toBe(301)
    expect(response.headers().location ?? '').toMatch(/^\/pricing/)
  })
})
```

### Assertion rationale

| Assertion | What it catches |
|-----------|-----------------|
| `status() === 301` | Catches accidental switch to `permanent: true` (would produce 308) or revert to proxy 307 |
| `headers().location === '/pricing'` | Catches typos in `destination` |
| Trailing-slash test follows redirects | Catches `trailingSlash: true` config drift that would break the collapse |
| Query-param test asserts `/pricing` not `/login` | Catches the actual reported bug (redirect-vs-proxy ordering broken) |

### Style alignment with codebase

The `public` Playwright project (`tests/e2e/playwright.config.ts:175-181`) already runs without auth fixtures. Reference test for shape: `tests/e2e/tests/public/seo-smoke.spec.ts` — uses `page.goto`, but for redirect-status assertions `request.get(..., { maxRedirects: 0 })` is the right primitive (Playwright's APIRequest supports this; `page.goto` follows redirects by default).

No need for `extraHTTPHeaders` or a custom fixture. Tests run against `process.env.PLAYWRIGHT_BASE_URL` (or whatever the public project's `baseURL` is configured to in playwright.config.ts).

### Live verification step (post-deploy)

CONTEXT.md § Phase 1+2 Lessons mandates live curl verification post-deploy. After PR merges + Vercel deploys:

```bash
curl -sI --max-redirs 0 https://tenantflow.app/signup | head -5
# Expect: HTTP/2 301
# Expect: location: /pricing
```

Document this in the plan's "Acceptance" section. Phase 1 lesson: "Live verification matters."

## Cache-Control Recommendation

301 responses are cacheable indefinitely by default per RFC 7231 § 6.4.2 unless the response includes explicit cache directives. Modern browsers (Chrome, Firefox, Safari) do honor `Cache-Control: max-age` on 301s.

**Observed current behavior** for the existing 307 redirect on `/.well-known/change-password`:

```
cache-control: public, max-age=0, must-revalidate
```

This is the **Vercel default** for redirects defined in `next.config.ts` — it tells the browser to revalidate every time, effectively treating the 301 as non-cacheable across sessions.

### Recommendation: rely on Vercel's default `max-age=0, must-revalidate`

**No custom `headers()` entry needed.** The default already prevents the 301 from being cached aggressively, which addresses the CONTEXT.md risk concern ("if we change our mind later [...] browsers may have cached the 301").

If we ever want to MORE aggressively allow caching (e.g., once `/signup` → `/pricing` is locked in stone), we can add a `headers()` entry later. For now: ship with the framework default, document the rollback path.

**Confidence: HIGH.** Verified by inspecting the live response on the existing `/.well-known/change-password` redirect — Vercel applies `max-age=0, must-revalidate` to all `next.config.ts` redirects unless overridden.

## Reference Patterns in Codebase

### Existing `redirects()` entries in `next.config.ts`

One existing entry: `/.well-known/change-password` → `/auth/update-password`, `permanent: false` (`next.config.ts:43-67`). Style notes for consistency:
- Tab indentation (matches file)
- Inline comment explaining the entry's purpose (the existing entry has a 23-line comment block; new entries don't need that level of explanation, but a 1-2 line comment is appropriate)
- Trailing comma after the closing `}` of each object (matches existing style)

### Existing e2e test patterns for redirect/auth assertions

| File | Pattern | Relevance |
|------|---------|-----------|
| `tests/e2e/tests/public/seo-smoke.spec.ts` | Uses `page.goto()` with metadata assertions; runs in `public` project unauthenticated | Confirms the unauthenticated `public` project exists and works |
| `tests/e2e/tests/admin-analytics.spec.ts:35-41` | Tests redirect-to-dashboard for non-admin users | Different layer (in-app navigation, not edge-redirect status code) — not directly applicable |
| `tests/e2e/tests/_archived/auth-nextjs16-middleware.spec.ts` | Archived; tests proxy-level redirects | Not used; reference only |

**No existing test asserts HTTP status codes on the public surface.** This phase introduces that pattern. Sister specialist's CRIT-06 cases will live in the same file and reuse the same `request.get(..., { maxRedirects: 0 })` primitive.

### Reference targets confirmed to exist

- `src/app/pricing/page.tsx` — exists (verified via `PUBLIC_ROUTES` already including `/pricing`)
- All `redirects()` entries point to extant routes; verified the existing `/auth/update-password` page exists per the comment block at `next.config.ts:50-58`

## Risk Matrix

| Risk | Likelihood | Severity | Mitigation |
|------|------------|----------|------------|
| **301 cache lock-in** — browsers cache the 301 indefinitely; if we later build `/signup`, returning visitors stay on `/pricing` | LOW | MEDIUM | Vercel default `Cache-Control: max-age=0, must-revalidate` already prevents this. Documented in § Cache-Control. |
| **Status code conflict (301 vs 308)** — CONTEXT.md says 301; Next.js `permanent: true` produces 308 | HIGH (real conflict) | LOW (semantically equivalent for SEO; only behavioral diff is method-preservation, irrelevant for GET-only `/signup`) | Use `statusCode: 301` (per Next.js docs); flag the conflict to planner; let user reaffirm or amend CONTEXT.md to 308 |
| **Query passthrough surprise** — `?redirect=...` lands on `/pricing` and is ignored | LOW | LOW (cosmetic only — `/pricing` doesn't read the param) | Documented in § Query String Handling. Locking Option A (accept passthrough). |
| **`redirects()` entry accidentally removed in a future refactor** — silently re-introduces loop | LOW | HIGH (regression of CRIT-05) | Defense-in-depth: add `/signup` to PUBLIC_ROUTES (§ PUBLIC_ROUTES Defense-in-Depth). e2e test fails fast in CI. |
| **`trailingSlash: true` config drift** — would break `/signup/` collapse | LOW | LOW (Next.js default has been `false` for years; no team intent to change) | e2e test for trailing-slash variant catches this |
| **Loop detection gap in tests** — test only checks status code, not the round-trip behavior | LOW | MEDIUM | Test 3 in spec (query-param case) follows the actual loop scenario from the audit |
| **Inbound link volume unknown** — cannot quantify how many users hit `/signup` today | MEDIUM | LOW (the fix is forward-correct regardless of volume; no data needed to justify the change) | Skip. Audit + CRIT-05 priority is sufficient justification. |

### Worst case + recovery

If `/signup` → `/pricing` 301 turns out wrong (e.g., team decides 6 months from now to build a real signup page), recovery is:
1. Remove the `redirects()` entry — takes effect at next deploy (~3 minutes on Vercel).
2. Browsers with cached 301: only affected if Vercel default cache headers were overridden. With current `max-age=0, must-revalidate`, browser revalidates on every request and picks up the new behavior immediately.
3. PUBLIC_ROUTES entry remains (still defense-in-depth for the new page or, if removed too, returns to 307 → `/login` behavior — back to current state).

**Confidence in recoverability: HIGH.** No data migration. No DB. No external dependencies. Pure routing config.

## Confidence Levels

| Recommendation | Confidence | Justification |
|----------------|------------|---------------|
| Add `redirects()` entry for `/signup` → `/pricing` | **HIGH** | Existing `/.well-known/change-password` proves the pattern works in this exact codebase. Next.js 16 docs explicit on execution order. Live curl confirms `redirects()` runs at edge. |
| Use `statusCode: 301` (not `permanent: true`) | **HIGH** | Direct Next.js 16 doc citation: `permanent: true` produces 308; `statusCode` is the explicit override. CONTEXT.md locks 301 — must use `statusCode`. |
| Drop query-string concern (Option A) | **HIGH** | Next.js doc explicit that query passthrough is default; no native strip option. Cosmetic-only consequence on `/pricing`. |
| Accept Vercel default `Cache-Control: max-age=0, must-revalidate` | **HIGH** | Verified on live `/.well-known/change-password` response. |
| Add `/signup` to PUBLIC_ROUTES as defense-in-depth | **MEDIUM** | Reasonable insurance, but technically dead code while the redirect exists. Sister specialist likely recommends the analog for legal aliases — match for consistency. |
| Trailing-slash variant works without extra config | **HIGH** | Verified live: `/signup/` 308s to `/signup`. Next.js default `trailingSlash: false`. |
| Test file location + structure | **HIGH** | Matches CONTEXT.md § Specifics + existing `public` Playwright project (`tests/e2e/playwright.config.ts:175-181`). |
| Loop terminates at login page (not infinite for unauth users) | **HIGH** | Traced through code: login page only consumes `redirect` param after sign-in (line 89-94). Unauth users see login form; loop is only "infinite" for the rare user who logs in here. |

## Sources

### Primary (HIGH confidence)
- [Next.js 16 docs § `redirects` config][nextjs-redirects] — v16.2.6, 2026-05-07; cited for status-code semantics + query-string passthrough + trailing-slash interaction
- [Next.js 16 docs § `proxy.js` Execution order][nextjs-proxy-order] — v16.2.6, 2026-05-07; cited for redirects-vs-proxy ordering (the critical claim)
- Live curl probes of `https://tenantflow.app/signup` (and three variants), `/.well-known/change-password`, `/login?redirect=...` — run 2026-05-09 against prod
- `next.config.ts:14-71` — current state of `redirects()` config (existing `/.well-known/change-password` entry as proof-of-pattern)
- `src/proxy.ts:10-162` — full PUBLIC_ROUTES + matcher + auth logic
- `src/app/(auth)/login/page.tsx:89-119` — login redirect-param consumption logic
- `src/lib/supabase/middleware.ts:15-52` — `updateSession` implementation
- `tests/e2e/playwright.config.ts:175-181` — `public` Playwright project definition

### Secondary (MEDIUM confidence)
- Vercel system-headers doc — confirmed Vercel applies the cache-control defaults at the edge layer, but the doc doesn't explicitly call out "redirects get max-age=0, must-revalidate by default"; live response is the authoritative source

### Tertiary (LOW confidence)
- _None._ All claims grounded in either docs or live response data.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CRIT-05 | `/signup` route either functions or 301s to `/pricing` — eliminate the `/signup → /login → /signup` redirect loop. External links/ads pointing at `/signup` reach a working page. | This entire document. Recommended fix is `redirects()` entry with `statusCode: 301`, defense-in-depth PUBLIC_ROUTES update, and a 3-assertion Playwright spec. |

## Metadata

**Confidence breakdown:**
- Diagnosis (request flow): **HIGH** — file:line traced + live curl matches
- Fix recommendation: **HIGH** — proven pattern in same codebase (`/.well-known/change-password`)
- Status-code conflict (301 vs 308): **HIGH** — direct doc citation
- Defense-in-depth recommendation: **MEDIUM** — judgment call
- Test strategy: **HIGH** — matches existing `public` project conventions

**Research date:** 2026-05-09
**Valid until:** 2026-06-09 (30 days; Next.js routing semantics are stable)

[nextjs-redirects]: https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects
[nextjs-proxy-order]: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
[next-config-redirects]: ../../../next.config.ts
[proxy-entry]: ../../../src/proxy.ts
[update-session]: ../../../src/lib/supabase/middleware.ts
