---
phase: 12-seo-cleanup
reviewed: 2026-05-12T00:00:00Z
depth: standard
cycle: 2
files_reviewed: 7
files_reviewed_list:
  - src/app/api/og/pricing/route.tsx
  - src/app/api/og/compare/[competitor]/route.tsx
  - src/components/compare/compare-breadcrumb.tsx
  - src/app/compare/[competitor]/page.tsx
  - src/app/pricing/page.tsx
  - src/components/layout/footer.tsx
  - src/lib/seo/page-metadata.ts
findings:
  P0: 0
  P1: 0
  P2: 2
  total: 2
verdict: FAIL
---

# Phase 12 SEO Cleanup — Cycle 2 Review

**Reviewed:** 2026-05-12
**Depth:** standard
**Files reviewed:** 7
**Verdict:** FAIL (2 P2 findings — perfect-PR gate requires zero)

## Summary

Cycle-1 fixes all landed correctly. The three IN-01/02/03 items are verifiably resolved by `dd4454652` with no regressions. The fix pass did not introduce new logic; all three edits were comment/class-list/regex-only.

Two fresh findings surfaced on cycle-2's broader probe:

1. The compare OG route uses a four-level relative import (`../../../../compare/[competitor]/compare-data`) while two other importers of the same module — `src/app/blog/[slug]/blog-post-page.tsx` and `src/lib/content-links.ts` — both use the documented `#app/compare/[competitor]/compare-data` path alias. This is a consistency drift, not a bug, but the perfect-PR gate flags it.
2. The new `CompareBreadcrumb` component has no unit test, while its structural twin `BlogPostBreadcrumb` does (5 tests in `src/components/blog/__tests__/blog-post-breadcrumb.test.tsx`). That test file's own docstring frames the test as pinning the visible-vs-JSON-LD parity — the same drift risk that applies to the compare breadcrumb. Skipping the equivalent test for `CompareBreadcrumb` leaves the same drift class unpinned.

No P0/P1.

---

## Cycle-1 Finding Verification

### IN-01 — PASS

Both new OG routes now carry the verbatim 4-line inline-style exception comment from the blog reference (`src/app/api/og/blog/[slug]/route.tsx:31-34`).

- `src/app/api/og/pricing/route.tsx:11-14` — present
- `src/app/api/og/compare/[competitor]/route.tsx:23-26` — present

Both routes additionally now carry a 4-line edge-runtime/revalidate justification comment above `runtime = 'edge'`, mirroring `src/app/api/og/blog/[slug]/route.tsx:4-9`. This is a bonus polish item the cycle-1 brief did not strictly require but improves parity with the reference route.

### IN-02 — PASS

`src/components/compare/compare-breadcrumb.tsx:23` now reads:

```tsx
<div className="max-w-7xl mx-auto px-6 lg:px-8 pt-6">
```

The redundant `container` class is gone. Matches the documented site-wide container pattern in `page-layout.tsx` and other marketing surfaces.

Pre-existing note (out of scope for Phase 12, recorded for future cleanup): `src/components/blog/blog-post-breadcrumb.tsx:32` still carries the same `container mx-auto max-w-4xl` redundancy. Not introduced by this phase. Surface as a separate phase if/when blog breadcrumb is touched.

### IN-03 — PASS

`src/lib/seo/page-metadata.ts:23` now uses:

```ts
const normalizedOgImage = ogImage
    ? /^https?:\/\//.test(ogImage)
        ? ogImage
        : `${siteUrl}${ogImage.startsWith('/') ? ogImage : `/${ogImage}`}`
    : undefined
```

Pathological inputs like `httpdocs/og.png` are now correctly treated as relative paths and prefixed with `siteUrl`. The protocol-anchored regex matches only `http://` or `https://`.

---

## Fresh Findings

### IN-04 (P2): Compare OG route uses deep relative import where `#app/*` path alias is the project convention

**File:** `src/app/api/og/compare/[competitor]/route.tsx:2`

**Evidence:**

```tsx
import { COMPETITORS } from '../../../../compare/[competitor]/compare-data'
```

The same module is imported elsewhere via the documented `#app/*` path alias defined in `tsconfig.json#paths` and `package.json#imports`:

```bash
$ grep -rn "compare-data" src/ | grep import
src/app/blog/[slug]/blog-post-page.tsx:17:import { COMPETITORS } from '#app/compare/[competitor]/compare-data'
src/lib/content-links.ts:13:import { COMPETITORS } from '#app/compare/[competitor]/compare-data'
src/app/compare/page.tsx:11:import { COMPETITORS, VALID_COMPETITORS } from './[competitor]/compare-data'
src/app/compare/[competitor]/page.tsx:18:import { COMPETITORS, VALID_COMPETITORS } from './compare-data'
src/app/api/og/compare/[competitor]/route.tsx:2:import { COMPETITORS } from '../../../../compare/[competitor]/compare-data'
```

Sibling-file `./compare-data` is fine when the importer lives in the same directory. The OG route is four levels removed — using `#app/compare/[competitor]/compare-data` matches every other cross-directory consumer and is robust against future file moves (e.g., if the OG route is relocated, the relative path silently breaks; the alias does not).

CLAUDE.md explicitly documents `#app/*` as the canonical alias and lists it among the standard path aliases. The cycle-1 review verified the relative path resolves correctly but did not check against the project convention.

**Suggested fix:**

```tsx
import { COMPETITORS } from '#app/compare/[competitor]/compare-data'
```

---

### IN-05 (P2): `CompareBreadcrumb` has no unit test; structural twin `BlogPostBreadcrumb` is fully covered

**File:** `src/components/compare/compare-breadcrumb.tsx` (test missing)

**Evidence:**

```bash
$ find src/components -name "*breadcrumb*" -type f
src/components/ui/breadcrumb.tsx
src/components/blog/blog-post-breadcrumb.tsx
src/components/compare/compare-breadcrumb.tsx
src/components/blog/__tests__/blog-post-breadcrumb.test.tsx
```

`src/components/blog/__tests__/blog-post-breadcrumb.test.tsx` pins five invariants:

1. Renders the expected segments and links.
2. Path-derivation matches `createBreadcrumbJsonLd`'s slug rule.
3. Title segment uses `aria-current="page"`.
4. Renders inside a `nav[aria-label="breadcrumb"]` landmark.
5. Drift between visible breadcrumb and JSON-LD is a documented search-penalty risk (the file's own docstring, paraphrasing Phase 6 RESEARCH § Pitfall 2).

The compare breadcrumb has the same drift class: `createBreadcrumbJsonLd('/compare/<slug>', { [slug]: 'TenantFlow vs <name>' })` and `<CompareBreadcrumb competitorName={data.name} />` must emit identical Home → Compare → "TenantFlow vs X" segments. Today they do; nothing pins them against future drift.

Cycle-1 confirmed parity by inspection but did not require the test. The brief explicitly asks cycle-2 to check this: "are unit tests required for the new components per project pattern? Check if blog-post-breadcrumb has tests; if it does, the compare-breadcrumb should too." Answer: yes; the test is missing.

**Suggested fix:** Add `src/components/compare/__tests__/compare-breadcrumb.test.tsx` mirroring the blog test:

```tsx
/**
 * Tests for CompareBreadcrumb.
 *
 * Pins the path-derivation rule so visible breadcrumb segments match the
 * JSON-LD BreadcrumbList emitted by `createBreadcrumbJsonLd`. Drift between
 * the two is a documented search-penalty risk (Pitfall 2).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/link', () => ({
    default: ({
        children,
        href,
        ...props
    }: {
        children: React.ReactNode
        href: string
        className?: string
    }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}))

import { CompareBreadcrumb } from '#components/compare/compare-breadcrumb'

describe('CompareBreadcrumb', () => {
    it('renders 3 segments (Home > Compare > TenantFlow vs X)', () => {
        render(<CompareBreadcrumb competitorName="Avail" />)

        expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
        expect(screen.getByRole('link', { name: 'Compare' })).toHaveAttribute('href', '/compare')
        expect(screen.getByText('TenantFlow vs Avail')).toBeInTheDocument()
    })

    it('uses aria-current="page" on the final segment', () => {
        render(<CompareBreadcrumb competitorName="Buildium" />)
        expect(screen.getByText('TenantFlow vs Buildium')).toHaveAttribute('aria-current', 'page')
    })

    it('renders inside a nav landmark with aria-label="breadcrumb"', () => {
        render(<CompareBreadcrumb competitorName="DoorLoop" />)
        expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument()
    })
})
```

---

## Items Verified (no finding)

- **Cycle-1 fixes** — all three landed verbatim or semantically equivalent. No regressions.
- **OG `revalidate = 3600`** — matches blog reference. Now documented in both new routes via the edge-runtime comment block.
- **OG image dimensions** (1200 × 630) — match blog reference and OGP `summary_large_image` convention.
- **No external font loading** in new OG routes — both use `fontFamily: 'sans-serif'` (system default). Avoids the per-render font-fetch latency `@vercel/og` would otherwise incur.
- **No non-existent asset refs** — neither OG route references images, fonts, or files; both render pure gradient + text.
- **JSX ordering** on compare page (`JsonLdScript → CompareBreadcrumb → Hero`) is ergonomic. `JsonLdScript` is a non-rendering `<script>` so visual flow is `CompareBreadcrumb` (breadcrumb at top, `pt-6` provides vertical breathing room below the navbar via the page-layout's `page-offset-navbar`) → Hero (`section-spacing` = 5rem block). No visual overlap with navbar.
- **Pricing title** — `Property Management Software Pricing | Plans from $19/mo` + parent template `%s | TenantFlow` renders `... | $19/mo | TenantFlow`. Three segments is verbose but contains no duplicated brand and reads naturally. Acceptable. Not promoting to `title.absolute` because the parent-template suffix is the desired single-brand-segment behavior on every page that isn't a comparison.
- **Footer Sitemap `external: true`** — matches the `/feed.xml` sibling in the same array. Both same-origin XML resources. Consistent.
- **No `bg-white`** in scoped files.
- **No bare `text-muted`** (all `text-muted-foreground`) in scoped files.
- **No `any`** in scoped files.
- **No `as unknown as`** in scoped files.
- **No commented-out code** in scoped files.
- **No emojis** in scoped files.
- **Color literals** in inline OG styles are `oklch(...)` only, no hex. Compliant with the documented carve-out (now properly documented per IN-01 fix).
- **File names** kebab-case throughout.
- **Line counts:** all files ≤ 213 lines (max is `compare/[competitor]/page.tsx` at 213). Under the 300-line cap.
- **No barrel files** introduced.
- **Icon-only buttons** — none introduced; existing `ArrowRight` / `CheckCircle2` icons sit alongside text labels or carry `aria-hidden="true"`.
- **Footer `Home` icon** has `aria-hidden="true"` (verified at `src/components/layout/footer.tsx:87`).
- **`external: true` link semantics** — both `/feed.xml` and `/sitemap.xml` get `target="_blank"` + `rel="noopener noreferrer"`. Correct security pattern.
- **Compare page diff** — JsonLdScript stays before the visible breadcrumb so the JSON-LD lands earlier in the response stream for crawlers. Hero section retains its `section-spacing` so there's no visual collapse against the breadcrumb above it.
- **`getSiteUrl()` and `createBreadcrumbJsonLd`** unchanged — boundary mappers/factory helpers not modified.

## Items Noted but Out of Scope

- `src/hooks/api/query-keys/property-keys.ts:172` uses `image.image_url.startsWith('http')` — same anti-pattern IN-03 fixed in `page-metadata.ts`. Stored values are storage paths or full URLs; a path starting with the four characters `http` (e.g., `httpdocs/`) would be false-matched. Not a P0 because today's storage paths are nested under `properties/<id>/...`, but it's the same drift risk class. Not in Phase 12 scope; recommend opening a follow-up phase.
- `src/components/blog/blog-post-breadcrumb.tsx:32` carries `container mx-auto max-w-4xl` — same redundancy IN-02 removed from compare. Pre-existing. Surface in a future blog cleanup phase.
- `src/app/pricing/page.tsx:65,73` and several lines in `pricing-content.tsx` carry `text-sm-foreground` — looks like an undefined Tailwind utility (no matching `@utility text-sm-foreground` in `globals.css`). Pre-existing on `main`, not introduced by Phase 12. Worth a Phase 11 follow-up since the token-drift ESLint plugin landed in commit `51b007724` and would catch this.

---

## Verdict

**FAIL** — 2 P2 findings. Cycle-1 fixes confirmed clean; cycle-2's wider probe surfaced (a) a path-alias consistency drift in the compare OG route import and (b) a missing unit test for `CompareBreadcrumb` (its structural twin `BlogPostBreadcrumb` is fully covered). Apply the two fixes above and re-run cycle 3.

Both fixes are mechanical: one import line, one new test file. No logic changes, no migrations.

---

_Reviewed: 2026-05-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Cycle: 2_
