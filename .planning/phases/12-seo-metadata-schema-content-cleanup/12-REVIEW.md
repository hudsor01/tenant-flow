---
phase: 12-seo-metadata-schema-content-cleanup
reviewed: 2026-05-21T16:20:00Z
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
  info: 2
  total: 2
status: issues_found
---

# Phase 12: Code Review Report (Re-Review — Cycle 2 Post-Fix)

**Reviewed:** 2026-05-21T16:20:00Z
**Depth:** deep
**Files Reviewed:** 9
**Status:** issues_found (2 Info)

## Summary

Cycle-2 re-review covering the IN-01 fix pass (PR #741, commit `b9e7a4fb6`). The prior
cycle flagged that the `NAV_HREFS` derivation from `DEFAULT_NAV_ITEMS` exposed the
Resources parent + dropdown duplicate-href issue. The fix dedupes via `Set` and adds
`/resources` to the `ROUTES` sample with `EXPECTED_ACTIVE['/resources'] = '/resources'`.

Verified end-to-end:

- `bun run typecheck` clean.
- `biome lint` clean on all 9 files.
- `seo-aria-current-audit.test.ts` — 8/8 green (was 7/7).
- 279 tests across the four other phase-12 unit test files pass.
- Dedup logic walked manually against `isActiveLink` for all 5 routes:
  - `/` → `['/']` ✓ matches `EXPECTED_ACTIVE['/']`.
  - `/pricing` → `['/pricing']` ✓.
  - `/features` → `['/features']` ✓.
  - `/compare/buildium` → `['/compare']` (prefix-match via trailing-slash anchor) ✓.
  - `/resources` → `['/resources']` (single entry after `Set` dedup) ✓.
- Predicate-level coverage (`src/lib/__tests__/is-active-link.test.ts`, 5/5) confirmed
  intact and independent — the predicate's trailing-slash and root-short-circuit
  invariants are pinned there, not by this audit.
- Navbar emission verified: parent + dropdown both compute
  `isActiveLink('/resources', '/resources') === true` and emit `aria-current="page"` when
  the Resources dropdown is open (verified against
  `navbar-desktop-nav.tsx:98,130` and `navbar-mobile-menu.tsx:56,88`). The audit correctly
  models this as a single URL the nav can mark active (UNIQUE-URL semantics), not a count
  of DOM attributes.
- E.164 phone (`+1-214-843-0779`), Organization + SoftwareApplication shape pin,
  `AggregateOffer` + `featureList`, footer `/sitemap.xml` external link, OG-route
  `revalidate = 3600` documentation, hex-free oklch literals, 1200x630 OG dimensions,
  `vi.hoisted` spy in features page test — all confirmed regression-pinned.
- Title-separator drift guard: regex still rejects compound keys (`metaTitle`,
  `heroTitle`); backtick `${...}` stripping intact; canonical-pipe positive case green;
  meta-tests cover positive + negative regex shapes.
- No `any`, no `as unknown as`, no inline styles outside the documented `@vercel/og`
  exception, no emojis, no `@radix-ui/react-icons`.

Two Info findings remain, both isolated to `seo-aria-current-audit.test.ts`. Neither is
a functional regression. Both are correctness-polish on the new dedup code itself.

## Info

### IN-01: Comment self-contradicts on rendered-DOM aria-current count

**File:** `src/app/__tests__/seo-aria-current-audit.test.ts:53-59`

**Issue:** The new dedup comment says

> "...trip the at-most-one assertion **even though the rendered DOM emits a single
> `aria-current="page"`** (one `<Link>` for the parent + one for the dropdown item, both
> pointing at the same href...)"

The lead "single" claim contradicts the parenthetical, which correctly notes TWO `<Link>`
elements with the same href both emit `aria-current="page"` when on `/resources` with the
dropdown open. Confirmed against the navbar source:

- `navbar-desktop-nav.tsx:98` (parent) + `:130` (dropdown item) — both unconditionally
  compute `aria-current` from `isActiveLink(href, pathname)`. When `pathname === '/resources'`
  and the dropdown is rendered (`openDropdown === item.name`), both DOM nodes carry
  `aria-current="page"`.
- `navbar-mobile-menu.tsx:56` + `:88` — same pattern.

The audit's *logic* is fine — it tests unique URLs the nav can mark active, not unique
DOM-attribute count — but the comment misrepresents what dedup is arguing against. A
future reader is likely to follow the misleading lead claim and conclude dedup is
addressing a single-element rendering invariant that does not exist.

**Fix:**
```typescript
// DEDUPED via `Set`: the Resources dropdown shares `href: '/resources'`
// with its parent nav item. The rendered DOM emits TWO `aria-current="page"`
// attributes on `/resources` when the dropdown is open (one for the parent
// `<Link>` and one for the dropdown-item `<Link>`, both pointing at the same
// href). That DOM-level multiplicity is a separate concern; this audit models
// the nav as the SET of unique URLs it can mark active, so we dedupe here
// and let the at-most-one assertion mean "at most one unique URL active per
// route" — which is the semantically useful invariant for an a11y audit.
```

### IN-02: `as readonly string[]` cast widens `NavHref` from a literal union to `string`, weakening `EXPECTED_ACTIVE` type-checking

**File:** `src/app/__tests__/seo-aria-current-audit.test.ts:68-69`

**Issue:** Before the dedup fix, `NAV_HREFS as const` gave `NavHref` a precise literal
union (`'/' | '/features' | '/pricing' | '/compare' | '/about' | '/resources' | '/help'
| '/faq' | '/contact'`). The new dedup pattern (`...new Set([...])`) widens the array
expression to `string[]`, forcing the cast `as readonly string[]`, which makes
`NavHref = string`.

Consequently `EXPECTED_ACTIVE: Readonly<Record<Route, NavHref | null>>` no longer enforces
that expected values are real nav hrefs — a typo like
`EXPECTED_ACTIVE['/pricing'] = '/totaly-fake'` would typecheck without error. The runtime
assertion still catches the typo (the route has no nav match → expected non-null → fail),
so this is a defense-in-depth narrowing regression only, not a functional gap.

**Fix:** Optional. Either accept runtime-only enforcement (current behavior is defensible)
or recover literal types by deduping at the value level while keeping the literal-union
type derived from the raw source:

```typescript
const RAW_HREFS = [
  "/",
  ...DEFAULT_NAV_ITEMS.flatMap((item) => [
    item.href,
    ...(item.dropdownItems?.map((d) => d.href) ?? []),
  ]),
] as const;
const NAV_HREFS: readonly (typeof RAW_HREFS)[number][] = [...new Set(RAW_HREFS)];
type NavHref = (typeof RAW_HREFS)[number];
```

This keeps `NavHref` as the literal union so a future `EXPECTED_ACTIVE` typo fails at
typecheck instead of only at runtime. Both `DEFAULT_NAV_ITEMS[i].href` and the dropdown
hrefs are string literals in `types.ts`, so the `as const` chain narrows correctly.

---

_Reviewed: 2026-05-21T16:20:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
