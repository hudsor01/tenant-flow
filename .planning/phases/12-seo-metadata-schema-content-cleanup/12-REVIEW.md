---
phase: 12-seo-metadata-schema-content-cleanup
reviewed: 2026-05-21T00:00:00Z
depth: deep
files_reviewed: 9
files_reviewed_list:
  - src/app/api/og/features/route.tsx
  - src/app/api/og/pricing/route.tsx
  - src/app/features/page.tsx
  - src/lib/generate-metadata.ts
  - src/app/__tests__/seo-title-separator-drift.test.ts
  - src/app/features/__tests__/page.test.ts
  - src/lib/__tests__/generate-metadata.test.ts
  - src/components/layout/__tests__/footer.test.tsx
  - src/app/__tests__/seo-aria-current-audit.test.ts
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
status: issues_found
---

# Phase 12: Code Review Report (Re-Review — Fix-Pass Cycle)

**Reviewed:** 2026-05-21T00:00:00Z
**Depth:** deep
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Independently re-reviewed all 9 files after the prior-cycle fix pass for WR-01, IN-01,
IN-02, IN-03. All four fixes are verified correct, idiomatic, and behave as advertised:

- **WR-01 (`vi.hoisted` on `createPageMetadataSpy`)** — confirmed; matches the repo's existing
  `vi.hoisted` convention (e.g. `template-definition.test.ts`, `blog/page.test.tsx`). The
  destructuring pattern correctly produces a hoisted reference Vitest can use inside the
  `vi.mock("#lib/seo/page-metadata", ...)` factory.
- **IN-01 (`NAV_HREFS` derived from `DEFAULT_NAV_ITEMS`)** — confirmed; the import resolves to
  the canonical source used by both `navbar-desktop-nav.tsx` and `navbar-mobile-menu.tsx`.
  Drift class genuinely eliminated.
- **IN-02 (backtick title extraction)** — confirmed; the new `TITLE_BACKTICK` regex with
  `(?<![\w$])` boundary correctly rejects compound keys (`metaTitle:`, `heroTitle:`),
  `stripInterpolations` strips `${...}` segments before separator detection, and the four
  meta-tests cover the regex's positive/negative cases. Simulated all four scenarios — every
  meta-assertion would genuinely fail if the regex regressed.
- **IN-03 (OG route comments)** — confirmed; both `features/route.tsx` and `pricing/route.tsx`
  comments now accurately state that `revalidate` is not honored by route handlers and that
  caching comes from `@vercel/og`'s internal `Cache-Control` headers plus Vercel's edge
  defaults. The comments are byte-identical between the two routes (lockstep maintained).
  Sibling routes `compare/[competitor]/route.tsx` and `blog/[slug]/route.tsx` carry the older
  terser comment, but updating them is out of scope for Phase 12.

No regressions introduced by the fix pass. No new violations of project conventions (no
`any`, no `as unknown as`, no inline styles outside the documented `@vercel/og` exception, no
emojis, no `@radix-ui/react-icons`).

One observation logged below at Info severity. It is NOT a regression from the fix pass — it is
a latent gap inherent in the IN-01 fix that the prior cycle proposed. Reasonable engineers may
argue it is correct-by-design, but it is worth flagging because the audit's stated invariant
("at most ONE element per surface per route carries `aria-current=page`") is currently violated
by the live DOM on one route the audit does not exercise.

## Info

### IN-01: `seo-aria-current-audit.test.ts` ROUTES sample omits `/resources`, leaving real DOM-level aria-current duplication unexercised

**File:** `src/app/__tests__/seo-aria-current-audit.test.ts:64`

**Issue:** The IN-01 fix from the prior cycle correctly replaced the hardcoded `NAV_HREFS`
list with derivation from `DEFAULT_NAV_ITEMS`. Because `DEFAULT_NAV_ITEMS` includes a
"Resources" parent (`href: '/resources'`) AND a dropdown item "Free Resources"
(`href: '/resources'`) — both pointing at the same URL — the derived `NAV_HREFS` array
contains `/resources` twice:

```
NAV_HREFS = ['/', '/features', '/pricing', '/compare', '/about',
             '/resources', '/resources', '/help', '/faq', '/contact']
```

On the `/resources` route, `navbar-desktop-nav.tsx` renders TWO separate `<Link>` elements
that both pass the `isActiveLink('/resources', '/resources') === true` predicate, so the
live DOM emits `aria-current="page"` on both — exactly the surface-multiplicity the audit's
purpose statement (`describe.../comment lines 5-9`) is designed to catch.

The audit's `ROUTES` sample is `['/', '/pricing', '/features', '/compare/buildium']`. It
omits `/resources` (and any `/resources/...` nested route), so the assertion
`expect(active.length).toBeLessThanOrEqual(1)` is never evaluated against the failing case.
Adding `'/resources'` to `ROUTES` (with the matching `EXPECTED_ACTIVE['/resources'] =
'/resources'` entry) would cause the test to FAIL with `active.length === 2`, correctly
surfacing the real DOM-level duplicate.

This is NOT a regression introduced by the IN-01 fix — the underlying navbar behavior
pre-exists. But the IN-01 derivation makes the duplication explicit in the test fixture
(it was implicit/hidden in the prior hardcoded `NAV_HREFS`), and the natural-future-expansion
hint in `EXPECTED_ACTIVE`'s comment (lines 69-70: "no current row needs that, but the type
allows future expansion") suggests `/resources` is on the audit's roadmap.

**Fix:** Either (a) add `/resources` coverage to surface the real bug for follow-up, or
(b) dedupe `NAV_HREFS` and document that the deduplication is an explicit guard against the
known duplicate parent-vs-dropdown structural artifact in `DEFAULT_NAV_ITEMS`:

```typescript
const NAV_HREFS = Array.from(
  new Set([
    "/",
    ...DEFAULT_NAV_ITEMS.flatMap((item) => [
      item.href,
      ...(item.dropdownItems?.map((d) => d.href) ?? []),
    ]),
  ]),
) as readonly string[];
```

Option (a) is the higher-value choice (it exposes a real DOM regression). Option (b) is the
quieter choice (it preserves Phase 12's narrow scope and defers the navbar fix). Either is
acceptable. Leaving as-is is also defensible — the audit currently passes, the duplicate is
out-of-scope for SEO metadata, and a future phase can pick this up.

---

_Reviewed: 2026-05-21T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
