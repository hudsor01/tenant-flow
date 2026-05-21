---
phase: 12-seo-metadata-schema-content-cleanup
fixed_at: 2026-05-21T16:09:00Z
review_path: .planning/phases/12-seo-metadata-schema-content-cleanup/12-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 12: Code Review Fix Report

**Fixed at:** 2026-05-21T16:09:00Z
**Source review:** .planning/phases/12-seo-metadata-schema-content-cleanup/12-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: `vi.mock` factory references a non-hoisted variable

**Files modified:** `src/app/features/__tests__/page.test.ts`
**Commit:** b8545e7ba
**Applied fix:** Wrapped `createPageMetadataSpy` in `vi.hoisted(() => ({ createPageMetadataSpy: vi.fn(...) }))` and destructured at module scope so the spy is initialised before the `vi.mock("#lib/seo/page-metadata", ...)` factory runs. Matches the convention used by `src/app/blog/page.test.tsx` and `src/app/pricing/__tests__/page.test.ts` and complies with CLAUDE.md's testing rule for `vi.mock`-referenced mock variables.

### IN-01: aria-current "audit" uses a stale, hardcoded nav snapshot

**Files modified:** `src/app/__tests__/seo-aria-current-audit.test.ts`
**Commit:** 7e166727d
**Applied fix:** Imported `DEFAULT_NAV_ITEMS` from `#components/layout/navbar/types` and derived `NAV_HREFS` by flattening parent + dropdown hrefs. The homepage `/` is prepended explicitly since the logo is not a `DEFAULT_NAV_ITEMS` entry but the audit's prefix-match guard still exercises it. This keeps the audit in lockstep with whatever the navbar actually renders (Features, Pricing, Compare, About, Resources + four dropdown hrefs).

### IN-02: Title drift-guard skips backtick template-literal titles

**Files modified:** `src/app/__tests__/seo-title-separator-drift.test.ts`
**Commit:** 8bc278c23
**Applied fix:** Added a companion `TITLE_BACKTICK` regex (`(?<![\w$])title:\s*\`([^\`]+)\``) and a `stripInterpolations` helper that removes `${...}` segments before testing `SPACED_SEPARATOR` on the literal remainder. `extractTitles` now runs both passes. Four new meta tests pin the new behaviour: a static backtick title with an em-dash is caught; `${...}`-only backtick titles (the real shape used by the three live source files) extract to the literal remainder and do not false-positive; a hybrid `${name} — Quick Reference` is caught; and compound keys like `metaTitle:` continue to be rejected.

### IN-03: `revalidate = 3600` on a route handler is mostly cosmetic

**Files modified:** `src/app/api/og/features/route.tsx`, `src/app/api/og/pricing/route.tsx`, `src/app/features/__tests__/page.test.ts`
**Commit:** 5d437ca01
**Applied fix:** Took option (b) from the review guidance — kept the `revalidate = 3600` export on both sibling OG routes for symmetry, and rewrote the comments on both routes to explicitly state that route handlers do NOT honour the segment-level `revalidate` option (it applies to fetch cache entries and RSC payloads, not to a `Response` / `ImageResponse`). Both comments now state that actual caching comes from `@vercel/og`'s `Cache-Control` headers + Vercel's edge defaults, and that the export is kept as documentation of the intended cache horizon. The `/features` SEO-02 page test header comment was corrected in lockstep so it no longer claims `revalidate` is "required for @vercel/og + CDN caching". The route's `runtime`/`revalidate` test assertions are unchanged — they still pin the present exports, which now have honest accompanying comments.

---

_Fixed: 2026-05-21T16:09:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
