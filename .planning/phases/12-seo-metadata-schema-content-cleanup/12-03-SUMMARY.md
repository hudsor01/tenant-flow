---
phase: 12-seo-metadata-schema-content-cleanup
plan: 03
subsystem: testing
tags: [seo, jsonld, schema-dts, aria-current, breadcrumbs, footer, vitest, jsdom]

requires:
  - phase: 12-seo-metadata-schema-content-cleanup
    provides: getJsonLd Organization + SoftwareApplication site-wide emission; footer /sitemap.xml link; isActiveLink predicate
provides:
  - Regression pin for getJsonLd Organization + SoftwareApplication shape (incl. E.164 contactPoint.telephone and AggregateOffer)
  - Regression pin for footer /sitemap.xml external link (target=_blank + rel contains noopener)
  - Consolidated SEO-07 aria-current audit (the "green report") — at-most-one aria-current per nav surface per route, CONS-03 symptom pinned, breadcrumb leaf + footer no-state invariants
affects: [future SEO phases, marketing nav refactors, footer refactors, JSON-LD schema changes]

tech-stack:
  added: []
  patterns:
    - "SEO regression-pin: assert shipped JSON-LD shape via #env mock + toPlain JSON normalization"
    - "Consolidated audit-as-test: route-sample-driven assertions on aria-current surfaces, modelled on design-token-drift.test.ts"

key-files:
  created:
    - src/lib/__tests__/generate-metadata.test.ts
    - src/components/layout/__tests__/footer.test.tsx
    - src/app/__tests__/seo-aria-current-audit.test.ts
  modified: []

key-decisions:
  - "SEO-03 accepted as shipped via Option 1 (site-wide emission is a superset of homepage emission); no code change, regression pin only"
  - "SEO-04 verified by code inspection per plan; no new test (Phase 6 owns blog slug cleanliness, /blog/[slug]/page.tsx generateStaticParams reads DB slug column with dynamicParams = false)"
  - "SEO-05 verified by existing tests (compare-breadcrumb.test.tsx + blog-post-breadcrumb.test.tsx); no new test"
  - "SEO-07 audit lives as a .ts file with React.createElement instead of .tsx — keeps the bulk pure-predicate, JSX needed only for the two render() calls"

patterns-established:
  - "Site-wide regression pin for JSON-LD: mock #env, import the SUT directly, narrow contactPoint / offers via typed helpers (no `any`)"
  - "Footer external-link contract test: render with next/link stub, assert target=_blank + rel-contains noopener"
  - "aria-current audit: predicate-level coverage per route + render-level assertions for breadcrumb leaf + footer absence"

requirements-completed: [SEO-03, SEO-04, SEO-05, SEO-06, SEO-07]

duration: ~8min
completed: 2026-05-21
---

# Phase 12 Plan 03: Verify-and-Pin SEO-03/04/05/06 + SEO-07 Audit Summary

**Three new test files pinning the shipped SEO-03 JSON-LD shape, SEO-06 footer sitemap link, and the consolidated SEO-07 aria-current "green report" — plus code-inspection verifications for SEO-04 (DB-sourced blog slugs) and SEO-05 (visible breadcrumbs already pinned by existing tests).**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-21T15:30:00Z
- **Completed:** 2026-05-21T15:34:00Z
- **Tasks:** 3 new tests + 2 verify-only inspections
- **Files created:** 3

## Accomplishments

- `getJsonLd()` regression-pinned: returns exactly 2 entities (Organization + SoftwareApplication), E.164 `+1-214-843-0779` `contactPoint.telephone`, `AggregateOffer` shape, non-empty `featureList`, both with `@context: https://schema.org`.
- Footer `/sitemap.xml` external-link regression-pinned: `href` exact, `target="_blank"`, `rel` contains `noopener`.
- Consolidated SEO-07 audit shipped: 7 tests across 4 routes (`/`, `/pricing`, `/features`, `/compare/buildium`) prove at-most-one nav href is `aria-current="page"` per surface, the CONS-03 symptom (`isActiveLink('/compare', '/')`) stays `false`, `CompareBreadcrumb` emits exactly one `aria-current="page"` leaf, and the footer surface emits zero `aria-current` attributes (intentional — footer is not a nav-state surface).

## Task Commits

Each task committed atomically through the full pre-commit gate (gitleaks + lockfile-verify + biome lint + tsc typecheck + vitest unit-tests with coverage):

1. **Task 1: SEO-03 `getJsonLd()` regression pin** — `77b2bb104` (test)
2. **Task 2: SEO-06 footer sitemap-link test** — `55af7d2c0` (test)
3. **Task 3: SEO-07 consolidated aria-current audit** — `2215f2864` (test)

_All three tasks were test-only (RED for a shipped feature → GREEN immediately on a verify-and-pin)._

## Files Created/Modified

- **Created** `src/lib/__tests__/generate-metadata.test.ts` (78 lines) — pins `getJsonLd()`'s Organization + SoftwareApplication shape.
- **Created** `src/components/layout/__tests__/footer.test.tsx` (50 lines) — pins footer `/sitemap.xml` external link.
- **Created** `src/app/__tests__/seo-aria-current-audit.test.ts` (119 lines) — consolidated SEO-07 audit.

## SEO-04 Verification Note (no new test — verify-only per plan)

**SEO-04 verified — blog slugs are DB-sourced via `generateStaticParams`; no timestamp generator in code; Phase 6 delivered the data cleanup.**

Evidence (`src/app/blog/[slug]/page.tsx`):

- `dynamicParams = false` (line 32) — router-level HTTP 404 for slugs outside the published set.
- `generateStaticParams` queries `blogs.slug` from Supabase using the anon-key cookieless client (lines 54-100); no millisecond-timestamp synthesis exists in the codebase.
- Live ISR with `revalidate = 300` (line 33); newly-published posts picked up via Vercel deploy hook from the n8n publish workflow.

No prod-hitting test was added — that test belongs in the RLS integration suite as a Phase-6 regression (per 12-RESEARCH Open Question 2), not in this Phase-12 unit suite.

## SEO-05 Verification Note (no new test — verify-only per plan)

**SEO-05 verified — `CompareBreadcrumb` renders on `/compare/[competitor]` (`src/app/compare/[competitor]/page.tsx:105`), `BlogPostBreadcrumb` on blog posts; both pinned by existing tests, both green. No new work.**

Existing test files exercise the visible-breadcrumb render and `aria-current="page"` parity with the schema BreadcrumbList:

- `src/components/compare/__tests__/compare-breadcrumb.test.tsx` — 4 tests (segments, aria-current leaf, nav landmark, verbatim competitor name)
- `src/components/blog/__tests__/blog-post-breadcrumb.test.tsx` — 5 tests (4-segment with category, 3-segment without, slug derivation, aria-current leaf, nav landmark)

Verification command output (`bunx vitest --run --project unit src/components/compare/__tests__/compare-breadcrumb.test.tsx src/components/blog/__tests__/blog-post-breadcrumb.test.tsx`):

```
Test Files  2 passed (2)
     Tests  9 passed (9)
```

No edits to the breadcrumb components were made (12-RESEARCH Pitfall 3 — visible/schema breadcrumb drift risk; SEO-05 is verify-only).

## Decisions Made

- **SEO-07 file extension stays `.ts`.** Bulk of the audit is pure-predicate via `isActiveLink`; the two `render()` calls use `React.createElement` so a `.tsx` extension would be cosmetic only. Plan explicitly permitted either; chose `.ts` for minimal-JSX discipline.
- **Footer no-aria-current is an audit assertion.** Pinning `footerEl.querySelectorAll('[aria-current]').length === 0` documents that the audit deliberately does not expect aria-current on the footer surface; a future refactor that adds it must update the test (intentional invariant, not an oversight).
- **`contactPoint` narrowed via typed helper, not `any`.** The `asRecord(value)` helper handles both the object-form and array-form schema.org `contactPoint` shape (schema.org permits either), keeping the test type-safe per CLAUDE.md Zero Tolerance Rule 1.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- **Vitest path-glob filter:** `bunx vitest --run --project unit "src/app/__tests__/seo-aria-current-audit.test.*"` returned "No test files found" because the shell didn't expand the glob and vitest's CLI filter is a substring match, not a glob. Resolved by running with the exact path (`...seo-aria-current-audit.test.ts`). No bug — vitest behavior matches docs; only the `<automated>` verify command in the plan would benefit from a literal path on re-run.

## Verification Run Log

- `bunx vitest --run --project unit src/lib/__tests__/generate-metadata.test.ts` → 3/3 passed
- `bunx vitest --run --project unit src/components/layout/__tests__/footer.test.tsx` → 2/2 passed
- `bunx vitest --run --project unit src/app/__tests__/seo-aria-current-audit.test.ts` → 7/7 passed
- `bunx vitest --run --project unit src/components/compare/__tests__/compare-breadcrumb.test.tsx src/components/blog/__tests__/blog-post-breadcrumb.test.tsx` → 9/9 passed (SEO-05 verify)
- Per-commit pre-commit gate: gitleaks + lockfile-verify + biome lint + tsc typecheck + full vitest unit suite all GREEN on every commit (`77b2bb104`, `55af7d2c0`, `2215f2864`).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 12 unit verification complete for all five SEO-related requirements (SEO-03/04/05/06/07).
- All three new test files run under lefthook pre-commit + CI `checks` gate; any future refactor that drops or regresses the pinned surface fails fast.
- No new dependencies; no schema/migration changes; no production code edits.

## Self-Check: PASSED

- `src/lib/__tests__/generate-metadata.test.ts` exists (FOUND)
- `src/components/layout/__tests__/footer.test.tsx` exists (FOUND)
- `src/app/__tests__/seo-aria-current-audit.test.ts` exists (FOUND)
- Commit `77b2bb104` exists (FOUND)
- Commit `55af7d2c0` exists (FOUND)
- Commit `2215f2864` exists (FOUND)

---
*Phase: 12-seo-metadata-schema-content-cleanup*
*Completed: 2026-05-21*
