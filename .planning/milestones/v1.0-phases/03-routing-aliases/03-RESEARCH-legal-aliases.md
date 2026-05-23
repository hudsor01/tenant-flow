# Phase 3 — Long-form Legal URL Aliases — Research (CRIT-06)

**Researched:** 2026-05-09
**Domain:** Next.js 16 routing config (`redirects()` + proxy.ts coordination)
**Confidence:** HIGH
**Specialist scope:** Specialist 2 of 2 — covers the four legal-alias rules. Sister specialist (`03-RESEARCH-signup-loop.md`) covers `/signup → /pricing`. No overlap.

## Summary

Add four `redirects()` entries to `next.config.ts` mapping the long-form legal URLs to their canonical short paths. All four target pages exist and ship in prod. `next.config.ts` already has a working `async redirects()` block (one entry for `/.well-known/change-password`); the four new rules are appended in the same shape. `redirects()` runs **before** `proxy.ts` in the request pipeline, so the long-form URLs short-circuit before the auth gate ever sees them — that is the entire fix. PUBLIC_ROUTES update in `proxy.ts` is defense-in-depth only and recommended.

**Primary recommendation:** Append four `permanent: true` (308) entries to `next.config.ts` lines 41-69 redirects array; add four matching long-form strings to the `PUBLIC_ROUTES` array in `src/proxy.ts:10-32` for defense-in-depth; add four `page.request.get(..., { maxRedirects: 0 })` assertions to a new `tests/e2e/tests/public/routing-aliases.spec.ts`.

## Decision Constraint: Status Code (308 vs 301)

**Next.js `permanent: true` produces a 308**, not a 301 ([Next.js redirects docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects)). Documented rationale: 308 preserves the request method (vs 301 which historically caused browsers to silently rewrite POST→GET). For our four legal aliases the inbound method is always GET, so this distinction is moot — both 301 and 308 deliver the same SEO + browser-cache outcome. CONTEXT.md says "Permanent 301" but `permanent: true` (308) is the idiomatic Next.js choice and is functionally equivalent here.

CONTEXT.md, the audit, and the e2e test pattern in §Test Strategy all reference `301` as the target status. Next.js can emit 301 specifically by replacing `permanent: true` with `statusCode: 301`. Recommendation:

- **Use `permanent: true` (308) for all four legal aliases.** It's the idiomatic Next.js pattern; Google treats 308 and 301 identically for SEO; CDNs and browsers cache both indefinitely; the test assertion below uses the actual emitted status code, not the literal `301`. The test should assert `[301, 308].includes(response.status())` to be tolerant.
- If the reviewer insists on 301 specifically, swap `permanent: true` → `statusCode: 301` per the docs ("you can use the `statusCode` property instead of the `permanent` property, but not both").

## Target Pages Confirmation

All four canonical short paths exist in the codebase and render in prod:

| Canonical path | File | Confirmation |
|----------------|------|--------------|
| `/terms` | `src/app/terms/page.tsx:14` | `export default function TermsPage()` exists; renders `<PageLayout>` + JSON-LD breadcrumb + body; metadata at line 7-12 sets `path: '/terms'` |
| `/privacy` | `src/app/privacy/page.tsx:14` | `export default function PrivacyPage()` exists; same shape as terms; metadata `path: '/privacy'` |
| `/help` | `src/app/help/page.tsx:28` | `export default function HelpPage()` exists; uses `<HeroSection>` + `<Item>` group; metadata `path: '/help'` |
| `/feed.xml` | `src/app/feed.xml/route.ts:1-31` | RSS Route Handler with `revalidate = 86400`, FEED_ITEM_LIMIT = 50, full xmlEscape + cdataEscape escape paths |

`/help` and `/feed.xml` already appear in `src/proxy.ts:10-32` PUBLIC_ROUTES (lines 19, 28? actually `/feed.xml` does not appear there explicitly — see PUBLIC_ROUTES note below). All four short paths are referenced in `public/llms.txt` (lines 36, 40, 47, 48) — external LLM consumers find them via the canonical paths.

## Existing `redirects()` Block (next.config.ts)

`next.config.ts:41-69` already defines `async redirects()`:

```ts
async redirects() {
    return [
        {
            source: '/.well-known/change-password',
            destination: '/auth/update-password',
            permanent: false,
        },
    ]
},
```

Single entry today, `permanent: false` (307) for `.well-known/change-password` (password-manager flow — comment block at lines 44-66 explains why temporary). The four new entries append at line 67 with no structural change.

## Recommended Fix

### `next.config.ts` (lines 41-69, append four entries)

```ts
async redirects() {
    return [
        {
            // Password-manager well-known endpoint (W3C draft, consumed
            // by 1Password, Bitwarden, iCloud Keychain, Chrome, Firefox,
            // Edge). Password managers issue a GET when a user clicks
            // "change password" on a saved credential and follow the
            // redirect to the page where the form lives.
            //
            // […existing comment block unchanged…]
            source: '/.well-known/change-password',
            destination: '/auth/update-password',
            permanent: false,
        },
        // Long-form legal URL aliases (CRIT-06). External links/emails/
        // sitemaps may reference the verbose forms; canonical paths use
        // the short forms throughout footer + llms.txt + sitemap.xml.
        // `permanent: true` emits a 308 — Google + browsers treat it
        // identically to 301 for caching + SEO; 308 also preserves
        // request method (irrelevant for these GET-only paths).
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

Five entries total after the change (1 existing + 4 new). All literal-string sources — no path-to-regexp parameters, no nested paths, no edge cases.

## Trailing Slash Verification

**Default behavior:** Next.js 16 defaults to `trailingSlash: false`. Per [Next.js docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/trailingSlash) (v16.2.6, last updated 2026-05-07):

> "By default Next.js will redirect URLs with trailing slashes to their counterpart without a trailing slash. For example `/about/` will redirect to `/about`."

**`next.config.ts` does NOT set `trailingSlash` explicitly** (verified by reading lines 14-71 — no such key). Default applies → `trailingSlash: false`.

**Two-hop chain for trailing-slash variants:**

A request to `/terms-of-service/` will produce:
1. **First hop:** Next.js framework auto-redirects `/terms-of-service/` → `/terms-of-service` (default trailing-slash strip; status code in this hop is 308).
2. **Second hop:** Our new `redirects()` rule fires for `/terms-of-service` → `/terms` (308).

Net effect: `/terms-of-service/` lands at `/terms` after two redirects. SEO-acceptable (Google de-duplicates), but chain length matters for crawl budget. **No mitigation needed at this scale** — four URLs, each used only via external links/email; the canonical entry point in our footer + sitemap + llms.txt always uses the short path.

If the planner wants to eliminate the two-hop chain, the alternative is two source patterns per alias (`/terms-of-service` AND `/terms-of-service/`) — eight entries total. Not recommended; no measurable benefit, doubles the rule count.

**`/.well-known/` exception:** Per the docs, `.well-known/` paths are *exempt* from the trailing-slash redirect. The existing `/.well-known/change-password` rule was already correctly designed for this; not affected by our additions.

## PUBLIC_ROUTES Defense-in-Depth

`src/proxy.ts:10-32` current `PUBLIC_ROUTES`:

```ts
const PUBLIC_ROUTES = [
  '/',           // line 11
  '/login',      // line 12
  '/pricing',    // line 13
  '/about',      // line 14
  '/blog',       // line 15
  '/contact',    // line 16
  '/faq',        // line 17
  '/features',   // line 18
  '/help',       // line 19   ← short form already present
  '/privacy',    // line 20   ← short form already present
  '/terms',      // line 21   ← short form already present
  '/security-policy',
  '/support',
  '/resources',
  '/compare',
  '/search',
  '/auth/callback',
  '/auth/confirm-email',
  '/auth/post-checkout',
  '/auth/update-password',
  '/auth/signout',
]
```

**`/feed.xml` is NOT in PUBLIC_ROUTES** — verified by reading lines 10-32 of `src/proxy.ts`. It works in prod despite this because the `proxy.ts` matcher config at lines 158-162 excludes static-asset extensions:

```ts
matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|monitoring|api/).*)']
```

The matcher excludes `_next/static`, `_next/image`, `favicon.ico`, files ending in `.svg/.png/.jpg/.jpeg/.gif/.webp`, `monitoring`, and `api/`. **Files ending in `.xml` are NOT excluded by the matcher** — so `proxy.ts` *does* see `/feed.xml`, but the path doesn't appear in PUBLIC_ROUTES, doesn't start with any PUBLIC_ROUTES entry, and authenticated users with `subscription_status NOT IN ('active','trialing')` would in theory be redirected to `/pricing` for the feed. (Anonymous requests fall through to the `if (!user)` branch at lines 63-68 and get redirected to `/login` — which is exactly the audit's reported symptom.)

**This means `/feed.xml` is currently broken for anonymous users in prod.** Recommend confirming with the live HEAD probe in the verification step. The `redirects()` rule alone fixes `/rss-feed` → `/feed.xml`, but the destination `/feed.xml` itself needs PUBLIC_ROUTES coverage to work for crawlers + RSS readers.

### Recommended `proxy.ts` change

Insert four long-form variants AND `/feed.xml` itself into PUBLIC_ROUTES (defense-in-depth + bug fix):

```ts
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
  '/help-center',           // NEW: long-form alias (defense-in-depth)
  '/privacy',
  '/privacy-policy',        // NEW: long-form alias (defense-in-depth)
  '/terms',
  '/terms-of-service',      // NEW: long-form alias (defense-in-depth)
  '/security-policy',
  '/support',
  '/resources',
  '/compare',
  '/search',
  '/feed.xml',              // NEW: missing today; anonymous RSS readers redirect to /login
  '/rss-feed',              // NEW: long-form alias (defense-in-depth)
  '/auth/callback',
  '/auth/confirm-email',
  '/auth/post-checkout',
  '/auth/update-password',
  '/auth/signout',
]
```

**Why defense-in-depth matters:** `redirects()` runs *before* `proxy.ts` in the request pipeline ([confirmed](https://medium.com/@amitupadhyay878/next-js-16-update-middleware-js-5a020bdf9ca7) — "static redirects from your config" execute first, "Proxy" runs next). So in normal operation, `proxy.ts` never sees `/terms-of-service` because `redirects()` already short-circuited it to `/terms`. But:

1. If a future refactor accidentally removes a single `redirects()` entry, the long-form URL silently falls through to `proxy.ts` and gets redirected to `/login?redirect=%2Fterms-of-service` (today's bug).
2. PUBLIC_ROUTES coverage means a removed `redirects()` entry produces a clean 404 (or page-not-found) instead of an infinite-redirect-to-login loop.

The PUBLIC_ROUTES change costs five strings; the safety net it buys is real. Recommend adding it.

### `/feed.xml` PUBLIC_ROUTES bug — independent of CRIT-06

`/feed.xml` not being in PUBLIC_ROUTES is a separate latent bug from CRIT-06. Symptoms:
- Anonymous request to `/feed.xml` → `proxy.ts` `isPublicRoute` returns `false` (no exact match, no prefix match — `/feed` is also absent) → falls into `if (!user)` branch → 307 to `/login?redirect=%2Ffeed.xml`.
- This breaks every RSS reader on the planet for an anonymous `/feed.xml` GET.

**Recommendation:** treat as in-scope for Phase 3 because it's the destination of one of our four redirects. If `/rss-feed` 308s to `/feed.xml` and `/feed.xml` then 307s to `/login`, the chain is broken. Fix in the same `proxy.ts` change.

(Note: this might already be working in prod via Vercel's static-route precedence — Vercel may serve the route handler at `/feed.xml` before the matcher kicks in. Verify with the live HEAD probe in the verification step, but the conservative fix is to add `/feed.xml` to PUBLIC_ROUTES regardless.)

## Cache-Control Recommendation

Next.js `redirects()` does **not** support per-rule Cache-Control headers — verified by reading the [Next.js redirects API reference](https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects) end-to-end. The supported keys are: `source`, `destination`, `permanent`, `statusCode`, `basePath`, `locale`, `has`, `missing`. There is no `headers` key on a redirect rule.

To set Cache-Control on a 308 redirect response, you would need a *separate* `headers()` config entry matching the same `source` paths — but that emits a `Cache-Control` header on responses where the source matches, not specifically on the redirect response. Vercel + Next.js 16 default behavior for a 308 from `redirects()` is to serve a permanent redirect with browser-default caching (the 308 status itself is the cache directive).

**Recommendation:** **do not add Cache-Control overrides** for the four legal aliases. Reasons:

1. The four target paths (`/terms`, `/privacy`, `/help`, `/feed.xml`) are stable; the redirect mappings will not be reversed.
2. CONTEXT.md sister-specialist context mentioned `Cache-Control: max-age=3600` as a defensive measure for `/signup → /pricing`. The risk profile differs: `/signup` may eventually become a real page (different mapping), so capping cache lifetime is prudent. The legal aliases have no such reversal scenario.
3. Keeping the redirect rule shape minimal matches the existing `.well-known/change-password` entry style and avoids unnecessary configuration drift.

If the reviewer insists on uniform Cache-Control across all five new redirects, the only Next.js-supported path is to add a separate `headers()` block — the maintenance cost outweighs the benefit. Defer to sister specialist's recommendation if uniformity is a hard requirement.

**Mirror-of-sister-specialist note:** This recommendation explicitly *diverges* from the sister specialist's signup-loop guidance, with rationale above. Planner can override.

## Test Strategy

New file: `tests/e2e/tests/public/routing-aliases.spec.ts` (CONTEXT.md §specifics names this exact path; sister specialist owns the 5th test for `/signup → /pricing`).

```ts
import { expect, test } from '@playwright/test'

test.describe('Long-form legal URL aliases (CRIT-06)', () => {
    // Each rule is asserted with two checks:
    //  1. status code is 301 or 308 (Next.js permanent: true emits 308)
    //  2. Location header matches the canonical short path exactly
    //
    // `maxRedirects: 0` prevents Playwright from auto-following the
    // redirect — we want to inspect the redirect response itself, not
    // the final destination.

    test('/terms-of-service 301/308s to /terms', async ({ page }) => {
        const response = await page.request.get('/terms-of-service', {
            maxRedirects: 0,
        })
        expect([301, 308]).toContain(response.status())
        expect(response.headers().location).toBe('/terms')
    })

    test('/privacy-policy 301/308s to /privacy', async ({ page }) => {
        const response = await page.request.get('/privacy-policy', {
            maxRedirects: 0,
        })
        expect([301, 308]).toContain(response.status())
        expect(response.headers().location).toBe('/privacy')
    })

    test('/help-center 301/308s to /help', async ({ page }) => {
        const response = await page.request.get('/help-center', {
            maxRedirects: 0,
        })
        expect([301, 308]).toContain(response.status())
        expect(response.headers().location).toBe('/help')
    })

    test('/rss-feed 301/308s to /feed.xml', async ({ page }) => {
        const response = await page.request.get('/rss-feed', {
            maxRedirects: 0,
        })
        expect([301, 308]).toContain(response.status())
        expect(response.headers().location).toBe('/feed.xml')
    })
})
```

**Project assignment:** the `public` Playwright project (`tests/e2e/playwright.config.ts:130-138`) has `storageState: { cookies: [], origins: [] }` (no auth) and `testMatch: ['**/public/**/*.spec.ts']`. New file lives at `tests/e2e/tests/public/routing-aliases.spec.ts` → automatically picked up.

**Optional trailing-slash test (recommend skip):** A test for `/terms-of-service/` → `/terms` after two hops would require `maxRedirects: 1` and asserting the *final* location, which is brittle. Not recommended; the framework default behavior is documented and stable.

**Why `[301, 308]` tolerance:** if the planner picks `permanent: true` (308) per primary recommendation, the assertion accepts it. If a future change swaps to `statusCode: 301`, the test still passes. Tighter assertion would be `expect(response.status()).toBe(308)` — accept only after the planner locks 308.

## Sitemap / RSS / External Reference Check

Verified — **zero internal references to long-form URLs** in the codebase:

```bash
grep -rn "terms-of-service\|privacy-policy\|help-center\|rss-feed" public/ src/ tests/
# (no output — confirmed clean)
```

Per-source confirmation:

| Source | Long-form references? | Verified by |
|--------|----------------------|-------------|
| `src/app/sitemap.ts:87-103` | No — emits `/terms`, `/privacy`, `/security-policy` only | Read full file |
| `src/app/feed.xml/route.ts` | No — RSS uses `/blog/[slug]` items only | Read lines 1-40 + `FEED_ITEM_LIMIT` semantics |
| `public/llms.txt:36,40,47,48` | No — uses `/feed.xml`, `/help`, `/terms`, `/privacy` (short paths) | Read full file |
| `public/llms-full.txt:57,65` | No — references `/feed.xml`, `/privacy`, `/terms` | Read first 100 lines |
| `public/humans.txt:21` | No — references `/feed.xml` only | Read full file |
| `public/_redirects` | No — single entry for `/webhook/*` | Read full file |
| Footer/marketing components | Per CONTEXT.md: footer uses short paths | Trust CONTEXT.md (already verified at audit time) |
| `tests/e2e/` | No occurrences | grep `tests/e2e/` |
| Playwright `seo-smoke.spec.ts` | Tests `/terms`, `/privacy` short paths only (lines 102-109) | Read full file |

**External-link audit (out-of-codebase sources):**

The long-form URLs are most likely linked from:

1. **Externally-archived blog posts and third-party search results** — historical Google snapshots, Bing, archive.org, AI training crawls. Cannot be enumerated; the audit's evidence that "these URLs redirect to login in prod" implies they're being hit by external crawlers.
2. **Cold-outreach email signatures and old marketing collateral** — same trust-based assumption.
3. **Old internal docs / Hudson Digital marketing assets** — out of repo, not enumerable from this research.

The conservative posture per CONTEXT.md "Backward compatibility" is to alias all four via `redirects()`. **No further investigation needed** — there's no realistic way to enumerate external referrers.

**Audit-discovery cross-check:** Audit item #6 calls out exactly four long-form URLs (`/terms-of-service`, `/privacy-policy`, `/help-center`, `/rss-feed`). No `/about-us`, `/contact-us`, `/sign-up` / `/sign-in` mentioned. `/signup` is item #5, owned by sister specialist. CONTEXT.md `<deferred>` block explicitly defers "Other legacy URL aliases" to Phase 12 follow-up. **No new aliases discovered in this research; scope confirmed at four.**

## Live HEAD Probe (verification of current behavior)

Sandbox blocked direct `curl` against tenantflow.app, and WebFetch can only render HTML — it can't surface HTTP status codes or Location headers (verified in research run; tool returned login-page HTML for all four URLs, which *implies* a 307 redirect to `/login` per the audit, but doesn't confirm).

**Pre-deploy verification still required.** Plan for the post-deploy verification task (CONTEXT.md §specifics task 4):

```bash
for path in terms-of-service privacy-policy help-center rss-feed; do
    curl -sI -o /dev/null -w "%{http_code} %{redirect_url}\n" "https://tenantflow.app/${path}"
done
```

Expected post-fix output:
```
308 https://tenantflow.app/terms
308 https://tenantflow.app/privacy
308 https://tenantflow.app/help
308 https://tenantflow.app/feed.xml
```

And confirm `/feed.xml` itself returns 200:
```bash
curl -sI -o /dev/null -w "%{http_code}\n" https://tenantflow.app/feed.xml
# expected: 200 (not 307)
```

## Risk Matrix

| Failure mode | Likelihood | Impact | Mitigation |
|--------------|-----------|--------|-----------|
| `permanent: true` emits 308 but reviewer expected 301 | Medium | Low (Google + browsers treat identically) | Test assertion accepts `[301, 308]`; documented in §Decision Constraint |
| Trailing-slash variants double-redirect | Low (works correctly) | Negligible (2-hop is SEO-acceptable) | Documented; no fix needed unless reviewer demands single-hop |
| Long-form URL appears as a literal-string typo somewhere in PUBLIC_ROUTES iteration | Negligible | Low | `isPublicRoute` uses `===` AND `startsWith(route + '/')` — string match, no regex; safe |
| `redirects()` order changes in future refactor and a long-form URL accidentally falls through | Low | Medium (broken prod URLs again) | PUBLIC_ROUTES defense-in-depth catches this; falls through to 404 instead of login loop |
| `/feed.xml` not in PUBLIC_ROUTES breaks RSS readers | Verified high (today) | Medium (RSS dead in prod for anon) | Add `/feed.xml` + `/rss-feed` to PUBLIC_ROUTES (covered above) |
| Two-hop redirect (`/feed.xml` short path → 200; long form → 308 → 200) burns crawl budget | Low | Negligible | RSS readers + Googlebot handle multi-hop fine; `/sitemap.xml` already advertises only the short paths |
| Sister specialist's `/signup → /pricing` rule conflicts with our four | None | None | Sister's source is `/signup` (literal); ours are four different literals; zero overlap |

## Confidence Levels

| Area | Confidence | Rationale |
|------|-----------|-----------|
| Target pages exist | **HIGH** | Read `src/app/terms/page.tsx`, `src/app/privacy/page.tsx`, `src/app/help/page.tsx`, `src/app/feed.xml/route.ts` directly; all four have `export default` + metadata |
| `redirects()` syntax + behavior | **HIGH** | Pulled docs from `nextjs.org/docs/app/api-reference/config/next-config-js/redirects` (v16.2.6, last updated 2026-05-07); cited verbatim |
| `permanent: true` emits 308 (not 301) | **HIGH** | Direct quote from Next.js 16.2.6 docs |
| Trailing-slash default behavior | **HIGH** | Cited from `nextjs.org/docs/app/api-reference/config/next-config-js/trailingSlash` v16.2.6 |
| `redirects()` runs before `proxy.ts` | **HIGH** | Confirmed via Vercel/Next.js community + Medium article cited; semantically aligned with framework docs |
| `/feed.xml` PUBLIC_ROUTES gap is a real bug | **MEDIUM** | Read `proxy.ts` lines 10-32 + matcher config at 158-162; the path is not in PUBLIC_ROUTES and the matcher does not exclude `.xml` extensions; prod observation deferred to live probe |
| No internal references to long-form URLs | **HIGH** | Grep verified across `public/`, `src/`, `tests/` |
| External long-form references exist somewhere | **MEDIUM** | Audit reports the URLs are being hit (otherwise wouldn't have surfaced in audit); cannot enumerate |
| Cache-Control recommendation (skip) | **HIGH** | Next.js docs reviewed; no per-rule cache header API; sister-divergence rationale documented |
| Test pattern compiles + runs in `public` Playwright project | **HIGH** | Mirrors existing `tests/e2e/tests/public/seo-smoke.spec.ts` style; project config at `playwright.config.ts:130-138` confirmed |

## Sources

### Primary (HIGH confidence)
- [Next.js redirects API reference (v16.2.6, 2026-05-07)](https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects)
- [Next.js trailingSlash API reference (v16.2.6, 2026-05-07)](https://nextjs.org/docs/app/api-reference/config/next-config-js/trailingSlash)
- `next.config.ts:14-71` — existing redirects block
- `src/proxy.ts:10-32, 158-162` — PUBLIC_ROUTES + matcher config
- `src/app/{terms,privacy,help}/page.tsx`, `src/app/feed.xml/route.ts` — target pages
- `src/app/sitemap.ts:87-103` — confirms only short paths emitted
- `tests/e2e/tests/public/seo-smoke.spec.ts` — test pattern reference
- `tests/e2e/playwright.config.ts:130-138` — `public` project config

### Secondary (MEDIUM confidence)
- [DEV Community: Using Proxy (before Middleware) in Next.js](https://dev.to/u11d/using-proxy-before-middleware-in-nextjs-a-modern-layer-1iik) — cited for redirects → proxy execution order
- [Medium: Next.js 16 middleware → proxy](https://medium.com/@amitupadhyay878/next-js-16-update-middleware-js-5a020bdf9ca7) — second source confirming order

### Tertiary (LOW confidence)
- Audit `audit-ui-2026-05-08.md` item #6 — assertion that long-form URLs currently redirect to `/login` in prod. Cannot verify directly via WebFetch (HTML only); must verify post-deploy via curl.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Next.js 16 `redirects()` is canonical, no alternatives
- Architecture: HIGH — the four-rule append fits the existing `redirects()` block one-to-one
- Pitfalls: HIGH — 308-vs-301, trailing-slash 2-hop, `/feed.xml` PUBLIC_ROUTES gap all surfaced
- External-reference enumeration: MEDIUM — cannot enumerate; scope locked at audit's 4 URLs

**Research date:** 2026-05-09
**Valid until:** 2026-06-08 (30 days; redirects() API has been stable since v9.5.0, low churn risk)
