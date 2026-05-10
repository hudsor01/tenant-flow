# Phase 3: Routing & Legal-URL Aliases — Context

**Gathered:** 2026-05-10
**Status:** Ready for research → planning
**Source:** UI audit `audit-ui-2026-05-08.md` (items #5, #6) + Phase 1+2 lessons logged

<domain>
## Phase Boundary

Phase 3 fixes two routing defects: a `/signup` redirect loop blocking new account creation through that path, and four long-form legal URLs that 404 / redirect to login instead of the canonical short paths. Both are pure routing config; no DB, no migration, no Stripe, no React component changes.

**In scope:**
- **CRIT-05 — `/signup` redirect loop.** Clicking "Get Started" / "Start Free Trial" buttons funnels users to `/pricing`, but the standalone `/signup` route currently 307s to `/login?redirect=%2Fsignup` (proxy treats it as private), and `/login` then redirects back. Net effect: any external link, ad, or email pointing at `/signup` lands users in a circular redirect, preventing new account creation.
- **CRIT-06 — Long-form legal URLs alias to short paths.** Four URLs currently 404 / login-redirect:
  - `/terms-of-service` → should 301 to `/terms`
  - `/privacy-policy` → should 301 to `/privacy`
  - `/help-center` → should 301 to `/help`
  - `/rss-feed` → should 301 to `/feed.xml`
  External links/sitemaps/emails likely reference the long-form versions. Footer luckily uses the short paths.

**Out of scope** (deferred to other phases):
- New signup UX or copy → v2.0+ (Phase 3 only fixes the loop, doesn't redesign signup)
- Authenticated billing portal redirects → already handled correctly per Phase 1 verification
- `/blog/error-*` HTTP 404 vs 200 → Phase 1 carry-forward (Phase 6 BLOG-02 owns)
- `aria-current` site-wide audit → Phase 12 (SEO-06)

**Branch:** `gsd/phase-03-routing-aliases`
**Phase requirement IDs:** CRIT-05, CRIT-06
**Cross-cutting design-token constraint:** N/A — this phase touches routing config only, zero visual changes. The token check still runs on the diff (and trivially passes).
</domain>

<decisions>
## Implementation Decisions

### CRIT-05: `/signup` Redirect Loop (LOCKED)

- **Final destination:** `/signup` 301s permanently to `/pricing`. Rationale: the user-facing "Get Started" / "Start Free Trial" buttons already funnel to `/pricing` (where users pick a plan and Stripe checkout takes them through Supabase signup). There's no separate `/signup` page to build — `/pricing` is the canonical entry point.
- **Implementation primitive:** Next.js `redirects()` config in `next.config.ts`. Permanent 301 (not temporary 302/307).
- **Proxy.ts coordination:** the redirect runs at the framework layer BEFORE `proxy.ts` sees the request. Need to verify the redirect order — if `proxy.ts` runs first, the auth check fires before the redirect, recreating the loop. Researcher must trace the request flow and confirm `redirects()` short-circuits properly.
- **Edge case:** what about `/signup?redirect=...` with query params? The redirect should preserve the query string OR drop it (latter is safer — query params on `/pricing` aren't expected). Researcher recommends; planner locks.
- **No `/signup` route file added.** Don't create `src/app/signup/page.tsx`. The next.config.ts redirect alone handles it.

### CRIT-06: Long-form Legal URL Aliases (LOCKED)

- **Implementation primitive:** Next.js `redirects()` config in `next.config.ts`. Permanent 301 for all four.
- **Mapping:**
  - `/terms-of-service` → `/terms`
  - `/privacy-policy` → `/privacy`
  - `/help-center` → `/help`
  - `/rss-feed` → `/feed.xml`
- **Trailing slash handling:** Next.js default `trailingSlash: false` is already set. Both `/terms-of-service` and `/terms-of-service/` should land at `/terms`. Verify.
- **Proxy.ts coordination:** same as CRIT-05 — `redirects()` should short-circuit before proxy auth runs.
- **PUBLIC_ROUTES update:** `proxy.ts` `PUBLIC_ROUTES` already includes `/terms`, `/privacy`, `/help`, `/feed.xml`. The long-form versions are NOT in PUBLIC_ROUTES, which is why proxy treats them as private and redirects to `/login`. Once `redirects()` short-circuits, this is moot — but defense-in-depth: add the long-form variants to PUBLIC_ROUTES so even if `redirects()` order changes in a future refactor, the long-form URLs still resolve correctly.
- **Test coverage:** an e2e test asserting `curl -sI` returns 301 + correct Location for all 5 redirect rules (`/signup` + 4 legal). Place at `tests/e2e/tests/public/routing-aliases.spec.ts`.

### Out of Scope Reminders

- DO NOT create `src/app/signup/page.tsx` (the redirect IS the entire fix; no page needed)
- DO NOT modify `/login` redirect logic (already correct for normal auth flow; only `/signup` gets the new 301 rule)
- DO NOT touch existing legal pages (`/terms`, `/privacy`, `/help`, `/feed.xml/route.ts`)
- DO NOT touch `loading.tsx` patterns (Phase 1 anti-pattern lesson)
- DO NOT touch any React components

### Cross-Cutting Design-Token Constraint (LOCKED — applies to ALL phases)

N/A for this phase (no visual changes). The token grep gate still runs on the diff and trivially passes.

### Phase 1+2 Lessons Carried Forward

- **Live verification matters.** After deploy, run `curl -sI` against all 5 redirect URLs (`/signup` + 4 legal) and confirm 301 responses with correct `Location` headers.
- **Specialist contracts can be wrong.** Don't trust framework-behavior claims; verify against the actual deploy.
- **Don't introduce `loading.tsx` returning null.** Phase 1 anti-pattern.
- **Hydration race patterns** (Phase 2 lesson): N/A here — routing happens before any client JS loads.

### Claude's Discretion

- Specific test names + structure for the new e2e spec
- Whether to add the long-form versions to `proxy.ts` `PUBLIC_ROUTES` as defense-in-depth (recommend YES per the LOCKED note above, but planner can debate)
- Plan file decomposition (planner picks; suggested 1-plan since both fixes are in the same `next.config.ts` redirects() block)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 3 research artifacts (specialists will produce)
- `.planning/phases/03-routing-aliases/03-RESEARCH.md` — canonical synthesis (read FIRST after research completes)
- `.planning/phases/03-routing-aliases/03-RESEARCH-signup-loop.md` — CRIT-05 diagnosis + fix appendix
- `.planning/phases/03-routing-aliases/03-RESEARCH-legal-aliases.md` — CRIT-06 diagnosis + fix appendix

### Project context
- `.planning/PROJECT.md § Key Decisions` — locked v1.0 decisions
- `.planning/REQUIREMENTS.md § Critical — Block Marketing Spend (CRIT)` — CRIT-05 + CRIT-06
- `.planning/ROADMAP.md § Phase 3` — phase goal + 4 success criteria
- `audit-ui-2026-05-08.md` (project root) — original audit; items #5, #6
- `.planning/phases/01-critical-stop-bleed-blog-unpublish-pricing-placeholder/01-VERIFICATION.md` — Phase 1 lessons (live-verification mandate)
- `.planning/phases/02-frontend-correctness-numberticker-mobile/02-VERIFICATION.md` — Phase 2 lessons (hydration race; not relevant here)

### Codebase conventions
- `CLAUDE.md` — zero-tolerance rules; specifically the proxy/middleware section: `proxy.ts` (Next.js 16) replaces deprecated `middleware.ts`; PUBLIC_ROUTES skip auth
- `next.config.ts` — current state; researcher reads + recommends the `redirects()` block diff
- `src/proxy.ts` — current PUBLIC_ROUTES set; researcher confirms the long-form URLs are absent
- `src/lib/supabase/middleware.ts` — `updateSession` Supabase token refresh

### Existing-pattern references (read; understand current state)
- `next.config.ts` lines 41-50ish — already has `async redirects()` defined (per earlier grep). Researcher confirms shape + recommends additions vs. new entries.
- `src/app/terms/page.tsx`, `src/app/privacy/page.tsx`, `src/app/help/page.tsx`, `src/app/feed.xml/route.ts` — confirm targets exist + don't need changes
- `src/proxy.ts:10-32` — `PUBLIC_ROUTES` array
- Any existing e2e test for redirects (researcher greps `tests/e2e/tests/public/` for redirect/302/301 patterns)

### Memory references
- `feedback_perfect_pr_gate.md` — 2 zero-finding cycles required for merge
- `branch-protection-config.md` — required CI checks: `checks`, `e2e-smoke`, `rls-security`

</canonical_refs>

<specifics>
## Specific Ideas

- **Suggested plan decomposition:** 1 plan (both fixes go in the same `next.config.ts redirects()` block + same e2e spec):
  - Task 1: edit `next.config.ts` to add 5 redirect entries (`/signup` → `/pricing`, plus 4 legal aliases)
  - Task 2: edit `src/proxy.ts` to add long-form versions to PUBLIC_ROUTES (defense-in-depth)
  - Task 3: add `tests/e2e/tests/public/routing-aliases.spec.ts` with 5 tests (one per redirect rule)
  - Task 4: post-deploy live verification — `curl -sI` against all 5 URLs, confirm 301 + correct Location
- **e2e test pattern:** `tests/e2e/tests/public/seo-smoke.spec.ts` is the canonical reference for `public` project tests. Use the same `test.describe` + `test.use({ extraHTTPHeaders: ... })` pattern if needed.
- **`curl -sI` assertion shape per test:**
  ```ts
  const response = await page.request.get('/signup', { maxRedirects: 0 })
  expect(response.status()).toBe(301)
  expect(response.headers().location).toBe('/pricing')
  ```

</specifics>

<deferred>
## Deferred Ideas

These came up during planning but explicitly belong to other phases:

- **Signup form / page redesign** — out of scope; the redirect is the entire CRIT-05 fix
- **`/login` redirect chain audit** — Phase 12 SEO-06 (sitewide a11y + nav-state audit)
- **`/blog/error-*` HTTP 404 vs 200** — Phase 1 carry-forward; Phase 6 BLOG-02 fixes via generateStaticParams
- **Other legacy URL aliases** (e.g., `/about-us` → `/about`, if any exist) — not in audit scope; can file as Phase 12 follow-up if surfaced
- **Stripe billing-portal redirect URL config** — Phase 5 PRICE-04 owns Stripe configuration; not in scope here

</deferred>

---

*Phase: 03-routing-aliases*
*Context gathered: 2026-05-10 — pre-research lock-in*
