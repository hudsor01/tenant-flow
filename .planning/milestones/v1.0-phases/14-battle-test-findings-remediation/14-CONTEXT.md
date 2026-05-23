# Phase 14: Battle Test Findings Remediation — Context

**Gathered:** 2026-05-14
**Status:** Ready for planning
**Source:** Browser-agent battle-test sessions (2026-05-13 + 2026-05-14)

## Phase Boundary

Close the four real bugs surfaced by the production browser-agent battle test that
were NOT resolved by prior milestone work. Findings #1 (aria-current) and #5
(unknown-routes 404) were fixed in earlier PRs (#700/#702/#704 and #703); they
are out of scope. Findings #4 (no blog posts) and #8 (Chrome-extension warning)
are operational / environmental, not code; they are out of scope.

The four in-scope bugs are documented as locked decisions below.

## Implementation Decisions

### D-01 — Public 404 page wraps marketing layout
**Source:** Browser-agent session 2 Phase 2, finding P2.
**Bug:** Signed-out visitors hitting a typo URL see the auth-flavored 404 page
with no navbar/footer and a "Back to Dashboard" button that bounces them to
`/login`. Hostile UX.
**Decision:**
- Root `src/app/not-found.tsx` wraps the `<NotFoundPage>` in `<PageLayout>` so
  the public marketing navbar + footer render around the 404.
- `<NotFoundPage>` infers the button label from the href: `"/"` → "Back to
  Home", `"/dashboard"` → "Back to Dashboard", anything else → "Go back".
  Caller can override via a new `dashboardLabel` prop.
- All existing callers (route-level `not-found.tsx` files under
  `src/app/(owner)/`) keep the default `dashboardHref="/dashboard"` and see the
  same "Back to Dashboard" label — zero visual regression for the dashboard
  surface.

### D-02 — Drop client-side Stripe.js load from /pricing
**Source:** Both browser-agent sessions, finding P3.
**Bug:** "Failed to load Stripe.js" console warning fires on `/pricing` under
ad-blockers / React DevTools. The page renders cards and the Subscribe button
hits a server-side checkout-session creation endpoint that redirects to
`checkout.stripe.com`. There is no path on `/pricing` that needs Stripe.js
client-side.
**Decision:**
- Audit `/pricing` page + its component tree for any `@stripe/stripe-js` or
  `loadStripe` imports.
- Either remove the unused import OR move it to the post-checkout pages where
  it's actually used (`/auth/post-checkout`).
- Verify after fix: no `https://js.stripe.com/...` request fires when
  navigating to `/pricing` in a fresh tab.

### D-03 — Blog index handles Supabase errors gracefully
**Source:** Browser-agent session 1 Phase 1, finding P2.
**Bug:** `/blog?_rsc=...` returned HTTP 503 during navigation. The page itself
rendered (empty state), suggesting the RSC fetch threw and the route returned
5xx, but the client-side render still completed from cache. A real Supabase
hiccup would 5xx the whole page.
**Decision:**
- Wrap the Supabase fetch in `src/app/blog/page.tsx` in a try/catch.
- On error: capture via `Sentry.captureException` with tags
  `{ surface: 'blog-index' }`, then render the empty-state UI as the
  graceful-degradation path.
- The page MUST NOT throw / return 5xx — a list page failing to load posts is
  a degraded experience, not a server crash.

### D-04 — Blog skeleton ↔ empty-state precedence
**Source:** Browser-agent session 1 Phase 1, finding P3.
**Bug:** `/blog` simultaneously renders the loading skeleton AND the "No
articles yet" empty-state copy. The skeleton should disappear once data
resolves; the empty-state should appear only when `data.length === 0` AND we
are NOT in a loading state.
**Decision:**
- Audit `src/app/blog/page.tsx` (and `loading.tsx` if it exists) for the
  precedence bug.
- Server component path: there is no client loading state — the page either
  renders posts or empty state. Likely the bug is a leftover skeleton component
  that always renders alongside the empty state.
- Fix: render skeleton via `loading.tsx` (Next.js streaming), and the empty
  state only inside the page when `posts.length === 0`. Mutually exclusive.

## Canonical References

**Downstream executor MUST read these before implementing.**

### Architecture
- `src/proxy.ts` — proxy gate logic (PRIVATE_ROUTE_PREFIXES allowlist; informs
  D-01 about what a "signed-out 404 visitor" looks like routing-wise)
- `src/lib/supabase/server.ts` — server-side Supabase client used by
  `src/app/blog/page.tsx` (D-03)

### Existing patterns to mirror
- `src/app/auth/error.tsx`, `src/app/blog/error.tsx`, etc. — pattern for
  `Sentry.captureException` in route-level error boundaries (D-03 follows the
  same pattern but in the success path, not an error boundary)
- `src/components/shared/error-page.tsx` — companion to `not-found-page.tsx`,
  shows the "label inferred from href" pattern we are adding (D-01)

### Tests to update
- `src/components/shared/not-found-page.test.tsx` — assertions on button label
  (D-01)

## Specific Ideas

- The 404 fix is partially started on branch `gsd/public-404-layout` (commit
  not yet on main). Pull those commits into the Phase 14 PR rather than
  re-implementing.
- For D-02, check the layout (`src/app/layout.tsx`) and any global providers
  before the `/pricing` page itself — Stripe.js is often loaded in a root
  provider for "buy anywhere" support.

## Deferred Ideas

None. The four in-scope items are atomic and the operational items (no blog
posts, Chrome-extension warnings) are out of code scope.

---

*Phase: 14-battle-test-findings-remediation*
*Context gathered: 2026-05-14*
