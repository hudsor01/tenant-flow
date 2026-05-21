---
phase: 12-seo-metadata-schema-content-cleanup
reviewed: 2026-05-21T00:00:00Z
depth: deep
files_reviewed: 8
files_reviewed_list:
  - src/app/api/og/features/route.tsx
  - src/app/features/page.tsx
  - src/lib/generate-metadata.ts
  - src/app/__tests__/seo-title-separator-drift.test.ts
  - src/app/features/__tests__/page.test.ts
  - src/lib/__tests__/generate-metadata.test.ts
  - src/components/layout/__tests__/footer.test.tsx
  - src/app/__tests__/seo-aria-current-audit.test.ts
findings:
  critical: 0
  warning: 1
  info: 3
  total: 4
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-05-21T00:00:00Z
**Depth:** deep
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Phase 12 ships an Edge OG image route at `/api/og/features`, wires `ogImage`
into the `/features` page metadata, normalises 8 drifting page titles to the
canonical pipe `|` separator (alongside the three brand strings in
`generate-metadata.ts`), and adds 5 regression-pin / audit test files.

Production changes are conservative and correct:

- `route.tsx` declares the required `runtime = "edge"` and uses only `oklch()`
  colour literals (no hex — passes design-token-drift).
- `page.tsx` correctly threads `ogImage: "/api/og/features"` into
  `createPageMetadata`, which normalises the relative path to absolute and
  emits it as the canonical `openGraph.images[0].url` + Twitter `images[0]`.
- `generate-metadata.ts` brand titles now consistently use ` | TenantFlow`.

All four new tests would GENUINELY fail on a meaningful regression — none are
no-ops. The findings below are about test FIDELITY (does the test pin what its
name promises?) and conformance to documented project conventions, not bugs in
the production change set.

No `any`, no `as unknown as`, no inline-style violations beyond the documented
`@vercel/og` Satori carve-out, no `next/link` mocks mistyped, no Zero-Tolerance
rules tripped in any of the 8 files.

## Warnings

### WR-01: `vi.mock` factory references a non-hoisted variable

**File:** `src/app/features/__tests__/page.test.ts:45-60`
**Issue:** `createPageMetadataSpy` is declared with `const` at module scope
(line 45) and then referenced from inside the
`vi.mock("#lib/seo/page-metadata", ...)` factory closure (line 59).
CLAUDE.md's testing rules state explicitly:
> `vi.hoisted()` for any mock variable referenced in `vi.mock()`.

The pattern works at runtime in this specific file only because the mocked
module is loaded indirectly via `await import("../page")` inside the test
body (by which point the `const` has initialised), but every other test in
the repo that follows the same shape uses `vi.hoisted()` — e.g.
`src/app/blog/page.test.tsx:15`:
```ts
const mockCreateClient = vi.hoisted(() => vi.fn());
vi.mock("#lib/supabase/server", () => ({ createClient: mockCreateClient }));
```
Diverging from the convention here makes the file brittle to (a) a future
edit that converts the dynamic `import("../page")` to a static `import`,
which would flip this to a "Cannot access ... before initialisation" error,
and (b) a future Vitest minor that tightens the static-analysis check.
**Fix:**
```ts
const { createPageMetadataSpy } = vi.hoisted(() => ({
  createPageMetadataSpy: vi.fn(
    (cfg: { title: string; description: string; path: string; ogImage?: string }) => ({
      title: cfg.title,
      description: cfg.description,
      __captured: cfg,
    }),
  ),
}));

vi.mock("#lib/seo/page-metadata", () => ({
  createPageMetadata: createPageMetadataSpy,
}));
```

## Info

### IN-01: aria-current "audit" uses a stale, hardcoded nav snapshot

**File:** `src/app/__tests__/seo-aria-current-audit.test.ts:47-71`
**Issue:** `NAV_HREFS` is hand-rolled:
```ts
const NAV_HREFS = ["/", "/pricing", "/features", "/compare", "/about", "/blog"] as const;
```
The real source of truth is `DEFAULT_NAV_ITEMS` in
`src/components/layout/navbar/types.ts`, which the navbar components actually
render. That list is `[Features, Pricing, Compare, About, Resources]` with
the Resources entry exposing dropdown items `/resources`, `/help`, `/faq`,
`/contact`. So the audit:
- INCLUDES `/` (not a nav href — the logo is not in `DEFAULT_NAV_ITEMS`),
- INCLUDES `/blog` (intentionally removed from nav per AUDIT-2 + comment in
  `types.ts:26-31`),
- OMITS `/resources` and the four dropdown hrefs that ARE in the real nav.

`EXPECTED_ACTIVE` only enumerates 4 routes (`/`, `/pricing`, `/features`,
`/compare/buildium`) — `/about` and `/resources` are not exercised. The test
name promises "marketing nav" coverage but does not render `NavbarDesktopNav`
or `NavbarMobileMenu`; it pins `isActiveLink` behaviour against a
hand-maintained list. A regression that adds `/resources/<slug>` and breaks
the prefix match for the Resources nav entry would not be caught here.

The CONS-03 regression that this file is meant to pin (`/compare`
false-highlighting on `/`) IS independently locked by
`src/components/layout/navbar/__tests__/navbar-desktop-nav.test.tsx`, which
DOES render the actual nav with `DEFAULT_NAV_ITEMS`. So the audit's narrow
guard is duplicative rather than complementary.

**Fix:** Either import `DEFAULT_NAV_ITEMS` from
`#components/layout/navbar/types` and derive `NAV_HREFS` (including dropdown
hrefs) so the audit stays in lockstep with the real nav, or remove the
`describe("...marketing nav")` block in favour of the existing
`navbar-desktop-nav.test.tsx` coverage. Example for the first option:
```ts
import { DEFAULT_NAV_ITEMS } from "#components/layout/navbar/types";
const NAV_HREFS = DEFAULT_NAV_ITEMS.flatMap((item) => [
  item.href,
  ...(item.dropdownItems?.map((d) => d.href) ?? []),
]);
```

### IN-02: Title drift-guard skips backtick template-literal titles

**File:** `src/app/__tests__/seo-title-separator-drift.test.ts:28-37`
**Issue:** The `TITLE_LITERAL` regex matches only `["']`-quoted titles. Three
existing source files use backtick template-literal titles:
- `src/app/blog/category/[category]/page.tsx:65` — `` title: `${validCategory.name} Articles & Guides` ``
- `src/app/compare/[competitor]/page.tsx:53` — `` title: `TenantFlow vs ${data.name}` ``
- `src/app/compare/[competitor]/page.tsx:69` — `` title: `TenantFlow vs ${data.name}` ``

None of these currently embed a spaced ` — ` / ` – ` / ` - ` separator, so
the guard is correct for today's source. The file comment acknowledges this
("Backtick titles ... are dynamic and contain no spaced dash separator, so
they are intentionally not extracted"), but a future contributor adding
e.g. `` title: `${name} — Quick Reference` `` would silently bypass SEO-01.
**Fix:** Extend the scan with a second pass that also matches backtick
titles, stripping `${...}` segments before running `SPACED_SEPARATOR`:
```ts
const TITLE_BACKTICK = /(?<![\w$])title:\s*`([^`]+)`/g;
// for each match: strip ${...} segments and test SPACED_SEPARATOR on the remainder
```
Optional — the cost/benefit is small today; an upgrade if/when a fourth
dynamic title lands.

### IN-03: `revalidate = 3600` on a route handler is mostly cosmetic

**File:** `src/app/api/og/features/route.tsx:5-8`
**Issue:** The header comment claims "The CDN caches the PNG for one hour"
attributed to `export const revalidate = 3600`. Next.js route handlers
(`/app/api/.../route.tsx`) do not honour `revalidate` the way page segments
do — the `revalidate` segment option applies to `fetch()` cache entries and
RSC payloads, not to a `Response` / `ImageResponse` returned from a `GET`
route handler. The actual caching for the rendered PNG comes from the
`Cache-Control: public, immutable, no-transform, max-age=31536000` header
that `@vercel/og` sets internally on `ImageResponse` (and from Vercel's edge
network defaults). The export is harmless but the explanatory comment is
misleading.

The companion test pin
(`src/app/features/__tests__/page.test.ts:76-79`) asserts both
`runtime === "edge"` and `revalidate === 3600`. The `runtime` assertion is
load-bearing (drops `@vercel/og` if removed); the `revalidate` assertion
only pins a present-but-unused export.
**Fix:** Either drop the `revalidate` export and remove the corresponding
test assertion + comment, OR keep the export and reword the comment to
clarify that caching is driven by `@vercel/og`'s `Cache-Control` headers,
not by the segment-level `revalidate`. Example:
```ts
// `@vercel/og` sets long-lived `Cache-Control` on the response itself.
// The `revalidate` segment option is not honoured by route handlers;
// it is kept here as documentation of the intended cache horizon only.
export const runtime = "edge";
```

---

_Reviewed: 2026-05-21T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
