# Phase 3: Routing & Legal-URL Aliases — Canonical Research

**Researched:** 2026-05-09
**Synthesized from:** `03-RESEARCH-signup-loop.md` (Specialist 1, CRIT-05) + `03-RESEARCH-legal-aliases.md` (Specialist 2, CRIT-06 + bonus `/feed.xml` fix)
**Domain:** Next.js 16 routing config (`next.config.ts redirects()` + `src/proxy.ts` PUBLIC_ROUTES) + Playwright `public` project
**Confidence:** HIGH (every claim grounded in Next.js 16 docs, file:line evidence, or live curl probes)

## Phase 3 TL;DR

Phase 3 fixes five public-facing routing defects with **one `next.config.ts` `redirects()` block append** + **six entries added to `src/proxy.ts` PUBLIC_ROUTES** (defense-in-depth + one latent bug fix) + **one new Playwright spec at `tests/e2e/tests/public/routing-aliases.spec.ts` with six tests**. All five redirects use `permanent: true` (Next.js 16 emits 308; semantically identical to 301 for SEO + browser caching; tests assert `[301, 308]` for tolerance). No new pages, no React component changes, no DB migration. Bonus in-scope fix: `/feed.xml` is missing from PUBLIC_ROUTES today, so anonymous RSS readers currently 307 to `/login` — adding it lights up RSS for anonymous crawlers and saves the `/rss-feed → /feed.xml` redirect chain from landing in a broken state. Live curl verification post-deploy is mandated by Phase 1 lessons.

## Standard Stack

| Layer | Tool | Why |
|-------|------|-----|
| Edge redirects | `next.config.ts` `async redirects()` | Runs **before** `proxy.ts` in the Next.js 16 pipeline (step 2 vs step 3 of the [official execution order](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)). Existing `/.well-known/change-password` entry is the proof-of-pattern. |
| Auth gate | `src/proxy.ts` PUBLIC_ROUTES | Defense-in-depth so a future refactor that removes a `redirects()` entry doesn't silently re-introduce a `/login` loop. |
| Test runner | Playwright `public` project (`tests/e2e/playwright.config.ts:175-181`) | Empty `storageState`, no auth fixtures. Mirrors `seo-smoke.spec.ts` style. Use `page.request.get(url, { maxRedirects: 0 })` to inspect status + Location without auto-following. |
| Live verification | `curl -sI` against prod | Phase 1 lesson (live verification mandate). Run post-deploy on all five redirect URLs + the `/feed.xml` 200 case. |

## Architecture Patterns

### Request flow (after Phase 3 changes)

```
GET /signup or /terms-of-service or /privacy-policy or /help-center or /rss-feed
        ↓
Vercel edge receives request
        ↓
[Step 2] next.config.ts redirects() runs FIRST
        ↓
        308 → /pricing  (or /terms, /privacy, /help, /feed.xml)
        ↓
        Cache-Control: public, max-age=0, must-revalidate (Vercel default)
        ↓
[Steps 3+] proxy.ts NEVER sees these requests in normal operation
```

### `redirects()` block shape (after both CRITs)

Existing block at `next.config.ts:41-69` already has one entry (`/.well-known/change-password`, `permanent: false`, 307). Phase 3 appends five entries — all `permanent: true` (308) — bringing the total to six.

### PUBLIC_ROUTES defense-in-depth

`redirects()` short-circuits before `proxy.ts`, so PUBLIC_ROUTES is technically dead code for these paths. **But** if `redirects()` ever loses an entry (refactor mistake, future "let's actually build /signup" branch), PUBLIC_ROUTES coverage means the long-form URL falls through to a 404 / page-not-found instead of an infinite redirect-to-login loop. Cost: six strings. Benefit: zero-cost insurance against the exact regression class CRIT-05 + CRIT-06 represent.

## Don't Hand-Roll

- **DO NOT create `src/app/signup/page.tsx`.** The `redirects()` entry IS the entire CRIT-05 fix. A real signup page would re-introduce the original loop class.
- **DO NOT modify `/login` redirect logic.** It's correct for normal auth flow; only `/signup` gets the new redirect rule.
- **DO NOT edit existing legal pages** (`/terms`, `/privacy`, `/help`, `/feed.xml/route.ts`). All four targets exist and ship in prod today; this phase only adds aliases.
- **DO NOT add per-rule `Cache-Control` headers.** Next.js `redirects()` does not support a `headers` key; Vercel's default `max-age=0, must-revalidate` is correct. Locked at Decision 4.
- **DO NOT add a separate trailing-slash entry per alias.** Next.js default `trailingSlash: false` collapses `/foo/` → `/foo` BEFORE `redirects()` runs (verified live on `/signup/`). One redirect entry per canonical source covers both variants.
- **DO NOT introduce a `loading.tsx` returning null** anywhere in this phase — Phase 1 anti-pattern.
- **DO NOT touch React components.** Phase 3 is routing config + tests only.

## Common Pitfalls

| Pitfall | Why it bites | Fix |
|---------|--------------|-----|
| Using `permanent: true` and asserting `status === 301` | `permanent: true` emits **308**, not 301 (per Next.js 16 docs). A literal `expect(status).toBe(301)` test fails | Test asserts `[301, 308].includes(status)` for tolerance. See Decision 1 below. |
| Forgetting `/feed.xml` is currently broken for anonymous users | `proxy.ts` matcher doesn't exclude `.xml`; PUBLIC_ROUTES doesn't include `/feed.xml`; anonymous RSS readers redirect to `/login` | Add `/feed.xml` to PUBLIC_ROUTES (Decision 2). |
| `permanent: true` + `statusCode: 301` simultaneously | Per Next.js docs: "you can use the `statusCode` property instead of the `permanent` property, but not both" | Pick one. Locked: `permanent: true`. |
| Trailing-slash variant produces 2-hop chain | `/terms-of-service/` → `/terms-of-service` → `/terms`. SEO-acceptable but doubles crawl cost if footer/sitemap accidentally start emitting trailing-slash variants | Footer + sitemap + `llms.txt` already emit canonical short paths only (verified). No mitigation needed. |
| `redirects()` execution order changes in future Next.js major | Currently runs at edge step 2, before proxy at step 3 | PUBLIC_ROUTES defense-in-depth catches this regression class. |
| Browser caches a 308 indefinitely; if rule is later removed, returning visitors stay on `/pricing` | Vercel default `Cache-Control: max-age=0, must-revalidate` already prevents aggressive caching | No action needed; default is correct. Verified live on existing `/.well-known/change-password` redirect. |
| Query string passes through to destination (`?redirect=/foo` lands on `/pricing`) | Next.js default behavior; no native strip option | Cosmetic-only — `/pricing` doesn't read the param. Accept passthrough. |
| Writing `expect(response.status()).toBe(308)` exactly | Locks the test to one specific code; later swap to `statusCode: 301` would silently fail | Use `[301, 308]` tolerance pattern. |

## Code Examples

### `next.config.ts` — append to existing `redirects()` block

The existing block at `next.config.ts:41-69` has one entry. Append five more (CRIT-05 first by audit order, then four CRIT-06 entries):

```typescript
async redirects() {
    return [
        {
            // existing /.well-known/change-password entry — UNCHANGED
            source: '/.well-known/change-password',
            destination: '/auth/update-password',
            permanent: false,
        },
        // CRIT-05: /signup redirect loop. /pricing is the canonical
        // entry point (Stripe checkout funnels through Supabase signup).
        // No /signup page exists; the redirect IS the fix.
        {
            source: '/signup',
            destination: '/pricing',
            permanent: true,
        },
        // CRIT-06: long-form legal URL aliases. External links/emails/
        // sitemaps may reference verbose forms; canonical paths use the
        // short forms throughout footer + llms.txt + sitemap.xml.
        // permanent: true emits 308 — Google + browsers treat as 301.
        {
            source: '/terms-of-service',
            destination: '/terms',
            permanent: true,
        },
        {
            source: '/privacy-policy',
            destination: '/privacy',
            permanent: true,
        },
        {
            source: '/help-center',
            destination: '/help',
            permanent: true,
        },
        {
            source: '/rss-feed',
            destination: '/feed.xml',
            permanent: true,
        },
    ]
},
```

### `src/proxy.ts` — append to PUBLIC_ROUTES

Current PUBLIC_ROUTES at `src/proxy.ts:10-32` already includes `/help`, `/privacy`, `/terms` (the short-form targets). Add the five long-form aliases plus `/feed.xml` (latent bug):

```typescript
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/pricing',
  '/about',
  '/blog',
  '/contact',
  '/faq',
  '/features',
  '/help',
  '/help-center',           // NEW: defense-in-depth alias
  '/privacy',
  '/privacy-policy',        // NEW: defense-in-depth alias
  '/terms',
  '/terms-of-service',      // NEW: defense-in-depth alias
  '/security-policy',
  '/support',
  '/resources',
  '/signup',                // NEW: defense-in-depth alias
  '/compare',
  '/search',
  '/feed.xml',              // NEW: latent bug fix — anon RSS readers
  '/rss-feed',              // NEW: defense-in-depth alias
  '/auth/callback',
  '/auth/confirm-email',
  '/auth/post-checkout',
  '/auth/update-password',
  '/auth/signout',
]
```

### `tests/e2e/tests/public/routing-aliases.spec.ts` — new file, 6 tests

```typescript
import { expect, test } from '@playwright/test'

test.describe('Routing aliases — Phase 3 (CRIT-05 + CRIT-06)', () => {
    // Each redirect rule is asserted with two checks:
    //  1. status code is 301 or 308 (Next.js permanent: true emits 308)
    //  2. Location header matches the canonical destination exactly
    //
    // maxRedirects: 0 stops Playwright from auto-following — we want to
    // inspect the redirect response itself, not the final destination.

    test('CRIT-05: /signup 301/308s to /pricing', async ({ page }) => {
        const response = await page.request.get('/signup', { maxRedirects: 0 })
        expect([301, 308]).toContain(response.status())
        expect(response.headers().location).toBe('/pricing')
    })

    test('CRIT-06: /terms-of-service 301/308s to /terms', async ({ page }) => {
        const response = await page.request.get('/terms-of-service', {
            maxRedirects: 0,
        })
        expect([301, 308]).toContain(response.status())
        expect(response.headers().location).toBe('/terms')
    })

    test('CRIT-06: /privacy-policy 301/308s to /privacy', async ({ page }) => {
        const response = await page.request.get('/privacy-policy', {
            maxRedirects: 0,
        })
        expect([301, 308]).toContain(response.status())
        expect(response.headers().location).toBe('/privacy')
    })

    test('CRIT-06: /help-center 301/308s to /help', async ({ page }) => {
        const response = await page.request.get('/help-center', {
            maxRedirects: 0,
        })
        expect([301, 308]).toContain(response.status())
        expect(response.headers().location).toBe('/help')
    })

    test('CRIT-06: /rss-feed 301/308s to /feed.xml', async ({ page }) => {
        const response = await page.request.get('/rss-feed', {
            maxRedirects: 0,
        })
        expect([301, 308]).toContain(response.status())
        expect(response.headers().location).toBe('/feed.xml')
    })

    test('Bonus: /feed.xml returns 200 with RSS content-type for anonymous readers', async ({ page }) => {
        // Pre-fix: anon GET /feed.xml fell through PUBLIC_ROUTES and 307'd
        // to /login. Post-fix: PUBLIC_ROUTES contains /feed.xml so the
        // route handler renders directly.
        const response = await page.request.get('/feed.xml', {
            maxRedirects: 0,
        })
        expect(response.status()).toBe(200)
        expect(response.headers()['content-type']).toMatch(/xml/i)
    })
})
```

## CRIT-05: /signup Redirect Loop (Definitive Approach)

**Diagnosis.** `GET /signup` currently returns 307 → `/login?redirect=%2Fsignup` because `/signup` is not in PUBLIC_ROUTES (`src/proxy.ts:10-32`). The login page does NOT auto-redirect unauthenticated visitors anywhere — it consumes the `redirect` query param only AFTER successful sign-in (`src/app/(auth)/login/page.tsx:89-94`). Net effect: external links/ads pointing at `/signup` land users on a login page they have no reason to use, blocking the signup funnel. If a user DID sign in, the post-login `router.push('/signup')` would 307 back to `/login` — that's the actual infinite loop, only triggered for the rare user who logs in from this entry point.

**Fix.** One `redirects()` entry maps `/signup` → `/pricing` with `permanent: true`. `/pricing` is the canonical entry point — "Get Started" / "Start Free Trial" buttons already funnel users there, where they pick a plan and Stripe checkout drives the Supabase signup. **No `src/app/signup/page.tsx` is created.**

**Defense-in-depth.** Add `/signup` to PUBLIC_ROUTES so a future refactor that drops the `redirects()` entry produces a 404 (no `/signup` page exists) instead of re-introducing the loop.

**Query-string handling.** Next.js default behavior preserves the query string on redirect. The only realistic dangling param today is `?redirect=/...` (fed by proxy). `/pricing` doesn't read this param, so it's a cosmetic no-op. Accept default passthrough — there is no native `redirects()` API to strip the query.

**Verification.**
```bash
curl -sI --max-redirs 0 https://tenantflow.app/signup | head -5
# Expect: HTTP/2 308
# Expect: location: /pricing
```

## CRIT-06: Long-form Legal URL Aliases (Definitive Approach)

**Diagnosis.** Four long-form URLs (`/terms-of-service`, `/privacy-policy`, `/help-center`, `/rss-feed`) currently 307 → `/login?redirect=%2F<path>` because they are not in PUBLIC_ROUTES. External links/sitemaps/emails referencing the verbose forms hit a login page instead of the legal content. Footer + `llms.txt` + `sitemap.xml` already emit canonical short paths (`/terms`, `/privacy`, `/help`, `/feed.xml`) — the bug is purely in handling inbound long-form references.

**Fix.** Four `redirects()` entries map long-form → short path with `permanent: true` (308). All four target pages exist and ship in prod (`src/app/terms/page.tsx`, `src/app/privacy/page.tsx`, `src/app/help/page.tsx`, `src/app/feed.xml/route.ts`). All four are simple literal-string sources — no path-to-regexp parameters, no nested paths, no edge cases.

**Defense-in-depth.** Add all four long-form variants to PUBLIC_ROUTES.

**Trailing-slash handling.** Next.js default `trailingSlash: false` collapses `/foo/` → `/foo` BEFORE `redirects()` runs. `/terms-of-service/` produces a 2-hop chain (`/terms-of-service/` → `/terms-of-service` → `/terms`). SEO-acceptable; Google de-duplicates. No second redirect entry per alias is needed.

**Internal references audit.** `grep -rn "terms-of-service\|privacy-policy\|help-center\|rss-feed" public/ src/ tests/` returned **zero hits**. Footer, `sitemap.ts:87-103`, `llms.txt`, `llms-full.txt`, `humans.txt`, `feed.xml/route.ts`, `seo-smoke.spec.ts` — all reference short paths only. Long-form references exist only in external links/archives/emails, which is exactly why this phase exists.

**Verification.**
```bash
for path in terms-of-service privacy-policy help-center rss-feed; do
    curl -sI -o /dev/null -w "%{http_code} %{redirect_url}\n" "https://tenantflow.app/${path}"
done
# Expected:
#   308 https://tenantflow.app/terms
#   308 https://tenantflow.app/privacy
#   308 https://tenantflow.app/help
#   308 https://tenantflow.app/feed.xml
```

## Bonus Fix: /feed.xml PUBLIC_ROUTES Gap

**The latent bug.** `proxy.ts` matcher (`src/proxy.ts:158-162`) excludes `_next/static`, `_next/image`, `favicon.ico`, `monitoring`, `api/`, and image extensions — but **NOT `.xml`**. PUBLIC_ROUTES does NOT contain `/feed.xml`. So:
- Anonymous `GET /feed.xml` → matcher allows the request through → `proxy.ts` `isPublicRoute('/feed.xml')` returns `false` → falls into `if (!user)` branch (`src/proxy.ts:63-68`) → 307 → `/login?redirect=%2Ffeed.xml`.

This breaks every RSS reader on the planet for an anonymous `/feed.xml` GET. Googlebot, AI crawlers, RSS aggregators all hit the login page.

**Why in scope for Phase 3.**

1. **It's a routing defect on a public marketing surface** — same defect class as CRIT-05 + CRIT-06.
2. **The fix is one line** — add `'/feed.xml'` to PUBLIC_ROUTES.
3. **It compounds CRIT-06.** `/rss-feed` 308s to `/feed.xml`; if `/feed.xml` itself 307s to `/login`, the redirect chain lands users at a broken state. Fixing `/rss-feed` without fixing `/feed.xml` is pointless.
4. **Phase 3's e2e spec already tests `/feed.xml`** as a redirect destination — adding one assertion that GET `/feed.xml` returns 200 with `content-type: xml` is trivial and catches the latent bug forever.

**Risk of not doing it.** RSS stays broken in prod. `/rss-feed` redirect lands users on a login page. Future SEO + content phases (Phase 6 Blog Rebuild, Phase 12 SEO) inherit a broken `/feed.xml`. Defer-the-fix has higher cost than ship-it-now.

**Confidence:** HIGH that this is in-scope. Specialist 2 surfaced it from reading `proxy.ts` matcher + PUBLIC_ROUTES directly; verifiable via the post-deploy curl probe in the verification step.

## 308 vs 301 Decision

**Locked: `permanent: true` (308) for all five redirects.**

### Rationale

- **Next.js idiomatic.** `permanent: true` is the standard shape; `statusCode: 301` is documented as a "rare case" override for "older HTTP Clients."
- **SEO equivalent.** Google treats 308 and 301 identically for indexing + canonicalization (publicly stated since 2014). Browsers cache both indefinitely (with same `Cache-Control` semantics).
- **Method preservation upgrade.** 308 preserves the request method (POST stays POST); 301 historically allowed silent POST→GET rewriting. Irrelevant for the GET-only paths in this phase, but cleaner for any future POST/PUT alias.
- **CONTEXT.md said "301 permanent" as shorthand.** Reading CONTEXT.md § Decisions, the phrase "Permanent 301" was shorthand for "permanent redirect" — not a deep contractual decision. The audit and CONTEXT.md author did not contemplate the Next.js framework idiom; they were calling out "make it permanent, not temporary."
- **Avoids awkward `statusCode` override.** Mixing `permanent: true` with `statusCode: 301` is forbidden by the Next.js docs ("you can use the `statusCode` property instead of the `permanent` property, but not both"). Using `statusCode: 301` would require dropping `permanent` from every entry, breaking parallelism with the existing `/.well-known/change-password` entry shape.

### Test impact

Tests assert `[301, 308].includes(response.status())` for tolerance. The actual response will be 308. If a future maintainer ever swaps to `statusCode: 301`, the test still passes — no test churn. Tighter assertion (`expect(status).toBe(308)`) is **rejected** to avoid lock-in to one specific code.

### Live verification expected output

```
308 https://tenantflow.app/pricing
308 https://tenantflow.app/terms
308 https://tenantflow.app/privacy
308 https://tenantflow.app/help
308 https://tenantflow.app/feed.xml
```

## Cross-Domain Risk Matrix

| Risk | Likelihood | Severity | Mitigation | Owner |
|------|------------|----------|------------|-------|
| 308 emitted but reviewer expected literal 301 | Resolved | — | Decision 1 locks 308; tests assert `[301, 308]` | Planner |
| `/feed.xml` 307 to login persists | Verified high (today) | Medium (RSS dead in prod for anonymous) | Add `/feed.xml` to PUBLIC_ROUTES + assert 200 in e2e | Decision 2 |
| Future refactor removes a `redirects()` entry | Low | High (CRIT regression class) | PUBLIC_ROUTES defense-in-depth catches all five aliases + `/signup` | Decision 3 |
| Trailing-slash 2-hop chain burns crawl budget | Low | Negligible | Footer/sitemap already emit short paths only; multi-hop is SEO-acceptable | None needed |
| Browser caches 308 indefinitely; later mapping reversal blocks returning visitors | Low | Medium | Vercel default `Cache-Control: max-age=0, must-revalidate` prevents aggressive caching (verified live on existing redirect) | Decision 4 |
| Query passthrough surprise (`?redirect=...` lands on `/pricing`) | Low | Low (cosmetic; `/pricing` ignores the param) | Accept default; documented | None needed |
| `next.config.ts redirects` execution order changes in future Next.js | Low | Medium | Defense-in-depth + e2e CI catches regression in <1 deploy | PUBLIC_ROUTES |
| `/signup` becomes a real page someday | Medium (long-term) | Low (clean rollback path) | Remove redirect entry; PUBLIC_ROUTES already correct for the new page; cache headers prevent stale redirects | Future-phase planner |
| Long-form URL appears as a literal-string typo in PUBLIC_ROUTES | Negligible | Low | `isPublicRoute` uses `===` AND `startsWith(route + '/')` — string match, no regex; safe by construction | None needed |
| External long-form referrers cannot be enumerated | Medium | Low (forward-correct fix regardless of volume) | Audit + CRIT-06 priority justifies the fix without volume data | None needed |

### Worst-case + recovery

If any redirect mapping turns out wrong (e.g., team builds a real `/signup` page):
1. Remove the `redirects()` entry — effective at next Vercel deploy (~3 min).
2. Browser cache: Vercel default `max-age=0, must-revalidate` means clients revalidate every request; new behavior picks up immediately.
3. PUBLIC_ROUTES entry stays — already correct for the new page if it ships.

**Confidence in recoverability:** HIGH. No data migration. No DB. No external dependencies. Pure routing config.

## Verification Checklist

### Pre-deploy (CI gates — must all pass before merge)

- [ ] `pnpm typecheck && pnpm lint` — green
- [ ] `pnpm test:unit` — green (no unit-test changes expected)
- [ ] `pnpm test:e2e` against the new `routing-aliases.spec.ts` — all 6 tests pass against local dev or preview deploy
- [ ] `next.config.ts redirects()` block now contains 6 entries (1 existing + 5 new); existing `/.well-known/change-password` entry untouched
- [ ] `src/proxy.ts` PUBLIC_ROUTES contains 6 new entries: `/help-center`, `/privacy-policy`, `/terms-of-service`, `/signup`, `/feed.xml`, `/rss-feed`
- [ ] No new hex / rgb / `bg-white` / inline-ms tokens (cross-cutting check; trivially passes — no visual changes)
- [ ] Two consecutive zero-finding review cycles per perfect-PR merge gate

### Post-deploy (live curl against prod, mandated by Phase 1 lessons)

```bash
# CRIT-05
curl -sI --max-redirs 0 https://tenantflow.app/signup | grep -i -E '(http|location)'
# Expect: HTTP/2 308
# Expect: location: /pricing

# CRIT-06 (all four)
for path in terms-of-service privacy-policy help-center rss-feed; do
    echo "=== /${path} ==="
    curl -sI --max-redirs 0 "https://tenantflow.app/${path}" | grep -i -E '(http|location)'
done
# Expect: HTTP/2 308 + location: /terms (or /privacy, /help, /feed.xml)

# Bonus: /feed.xml 200
curl -sI --max-redirs 0 https://tenantflow.app/feed.xml | grep -i -E '(http|content-type)'
# Expect: HTTP/2 200
# Expect: content-type: text/xml or application/xml or application/rss+xml

# End-to-end follow-the-chain
for path in signup terms-of-service privacy-policy help-center rss-feed; do
    curl -sIL "https://tenantflow.app/${path}" | grep -i -E '(http|location)' | tail -4
done
# Expect: each chain ends in 200 (or 308→200 for trailing-slash variants)
```

### Trailing-slash spot-check (optional but recommended)

```bash
curl -sIL https://tenantflow.app/terms-of-service/ | grep -i -E '(http|location)'
# Expect: 308 → /terms-of-service → 308 → /terms → 200 (3-hop is fine)
```

## Confidence Levels

| Area | Confidence | Justification |
|------|------------|---------------|
| `redirects()` block append shape | **HIGH** | Existing `/.well-known/change-password` entry proves the pattern in this exact codebase; Next.js 16 docs explicit on syntax + execution order |
| 308 vs 301 decision | **HIGH** | Direct Next.js 16 doc citation; SEO + browser-cache parity verified |
| Target pages exist | **HIGH** | `src/app/terms/page.tsx`, `src/app/privacy/page.tsx`, `src/app/help/page.tsx`, `src/app/feed.xml/route.ts` all read directly; all four export defaults + metadata |
| Trailing-slash auto-collapse before `redirects()` | **HIGH** | Verified live on `/signup/` returning 308 → `/signup`; Next.js default `trailingSlash: false` |
| `redirects()` runs before `proxy.ts` | **HIGH** | Next.js 16 docs § Execution order (step 2 vs step 3); existing redirect proves it works at edge |
| `/feed.xml` PUBLIC_ROUTES gap is a real bug | **MEDIUM-HIGH** | Verified by reading `proxy.ts:10-32` (path absent) + matcher at `:158-162` (no `.xml` exclusion); requires post-deploy live probe to confirm prod symptom (sandboxed curl in research couldn't reach prod) |
| Defense-in-depth PUBLIC_ROUTES additions | **MEDIUM** | Pure insurance; technically dead code while `redirects()` works; cost is six strings; aligns with CONTEXT.md decision to recommend YES |
| Test pattern compiles in `public` Playwright project | **HIGH** | Project config at `tests/e2e/playwright.config.ts:175-181` confirmed; pattern mirrors `seo-smoke.spec.ts` |
| Cache-Control default sufficient | **HIGH** | Vercel default `max-age=0, must-revalidate` verified live on existing `/.well-known/change-password` redirect |
| External long-form referrers exist | **MEDIUM** | Audit reports they're being hit; cannot enumerate; conservative posture per CONTEXT.md backward-compat |
| Loop terminates at login (not infinite for unauth) | **HIGH** | Traced through `src/app/(auth)/login/page.tsx:89-94`; param consumed only after successful sign-in |

## Sources

### Primary (HIGH confidence)
- [Next.js 16 docs § `redirects` config](https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects) — v16.2.6, 2026-05-07; status-code semantics, query-string passthrough, trailing-slash interaction
- [Next.js 16 docs § `proxy.js` Execution order](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) — v16.2.6, 2026-05-07; redirects-vs-proxy ordering
- [Next.js 16 docs § `trailingSlash`](https://nextjs.org/docs/app/api-reference/config/next-config-js/trailingSlash) — v16.2.6, 2026-05-07; default behavior + `.well-known` exemption
- Live curl probes against `https://tenantflow.app/signup` (and variants), `/.well-known/change-password`, `/login?redirect=...` — run 2026-05-09 against prod
- `next.config.ts:14-71` — current `redirects()` config
- `src/proxy.ts:10-32, 158-162` — full PUBLIC_ROUTES + matcher
- `src/app/(auth)/login/page.tsx:89-119` — login redirect-param consumption logic
- `src/lib/supabase/middleware.ts:15-52` — `updateSession` implementation
- `src/app/terms/page.tsx`, `src/app/privacy/page.tsx`, `src/app/help/page.tsx`, `src/app/feed.xml/route.ts` — target pages confirmed
- `src/app/sitemap.ts:87-103` — emits short paths only
- `tests/e2e/playwright.config.ts:175-181` — `public` project config
- `tests/e2e/tests/public/seo-smoke.spec.ts` — test pattern reference
- Codebase grep across `public/`, `src/`, `tests/` for `terms-of-service|privacy-policy|help-center|rss-feed` — zero hits

### Secondary (MEDIUM confidence)
- [DEV Community: Using Proxy (before Middleware) in Next.js](https://dev.to/u11d/using-proxy-before-middleware-in-nextjs-a-modern-layer-1iik) — execution order corroboration
- [Medium: Next.js 16 middleware → proxy](https://medium.com/@amitupadhyay878/next-js-16-update-middleware-js-5a020bdf9ca7) — second source on order

### Tertiary (LOW confidence)
- Audit `audit-ui-2026-05-08.md` items #5, #6 — assertion that long-form URLs redirect to login in prod; verify post-deploy via curl

---

## Phase Requirements

| ID | Description | Research Coverage |
|----|-------------|-------------------|
| CRIT-05 | `/signup` either functions or 301s to `/pricing` — eliminate the loop. External links/ads reach a working page. | § CRIT-05: /signup Redirect Loop (Definitive Approach) |
| CRIT-06 | Long-form legal URLs alias to short paths — `/terms-of-service` → `/terms`, `/privacy-policy` → `/privacy`, `/help-center` → `/help`, `/rss-feed` → `/feed.xml`. | § CRIT-06: Long-form Legal URL Aliases (Definitive Approach) |

## Metadata

**Research date:** 2026-05-09
**Valid until:** 2026-06-09 (30 days; Next.js routing semantics are stable since v9.5.0)
**Synthesis date:** 2026-05-09

---

# Specialist Appendices

The two specialist research files remain authoritative for deeper detail. Reference them only if the canonical sections above leave a question open.

## Appendix A: `03-RESEARCH-signup-loop.md` (Specialist 1, CRIT-05)

Full request-flow trace (file:line evidence for every hop), 308-vs-301 docs citation, query-string handling rationale, defense-in-depth analysis, test-pattern style alignment with codebase, Vercel cache-control verification, recoverability analysis. Authoritative for any CRIT-05 detail not surfaced above.

## Appendix B: `03-RESEARCH-legal-aliases.md` (Specialist 2, CRIT-06 + bonus)

Full target-page existence verification, sitemap/RSS/llms.txt internal-reference audit (zero hits), `/feed.xml` PUBLIC_ROUTES gap diagnosis, trailing-slash 2-hop analysis, sister-divergence on Cache-Control rationale. Authoritative for any CRIT-06 detail or `/feed.xml` reasoning not surfaced above.
