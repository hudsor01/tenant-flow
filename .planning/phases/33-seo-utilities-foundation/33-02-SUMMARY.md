---
phase: 33-seo-utilities-foundation
plan: 02
subsystem: seo
tags: [schema-dts, json-ld, structured-data, article, faq, product, vitest]

requires:
  - phase: 33-seo-utilities-foundation-01
    provides: JsonLdScript component, getSiteUrl, schema-dts dependency, breadcrumb/page-metadata factories
provides:
  - createArticleJsonLd factory for blog post structured data
  - createFaqJsonLd factory for FAQ page structured data
  - createProductJsonLd factory with dynamic priceValidUntil for pricing page
affects: [35-blog-seo-migration, 36-pricing-seo-migration, seo-structured-data]

tech-stack:
  added: []
  patterns: [conditional-spread-for-schema-dts-optional-fields, fake-timers-for-date-dependent-tests]

key-files:
  created:
    - src/lib/seo/article-schema.ts
    - src/lib/seo/faq-schema.ts
    - src/lib/seo/product-schema.ts
    - src/lib/seo/__tests__/article-schema.test.ts
    - src/lib/seo/__tests__/faq-schema.test.ts
    - src/lib/seo/__tests__/product-schema.test.ts
  modified: []

key-decisions:
  - "Conditional spread for all optional schema-dts fields to satisfy exactOptionalPropertyTypes"
  - "Organization brand type (not Brand) for product schema to match existing patterns"
  - "Keywords joined as comma-separated string per schema.org Article spec"

patterns-established:
  - "Schema factory pattern: each factory returns schema-dts typed object, uses getSiteUrl() for URLs, uses conditional spread for optional fields"
  - "Date-dependent test pattern: vi.useFakeTimers + vi.setSystemTime for deterministic priceValidUntil assertions"

requirements-completed: [UTIL-03, UTIL-04, UTIL-05, UTIL-08]

duration: 6min
completed: 2026-04-08
---

# Phase 33 Plan 02: Content-Specific JSON-LD Factories Summary

**Article, FAQ, and Product schema factories with schema-dts types, dynamic priceValidUntil, and 32 unit tests**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-08T17:56:57Z
- **Completed:** 2026-04-08T18:03:13Z
- **Tasks:** 2
- **Files created:** 6

## Accomplishments
- Created createArticleJsonLd with headline, dates, Person author, Organization publisher, mainEntityOfPage, wordCount, and keywords
- Created createFaqJsonLd from question/answer pairs matching existing inline FAQPage pattern
- Created createProductJsonLd with dynamic priceValidUntil (1 year from now) replacing stale hardcoded 2025-12-31
- All factories use schema-dts types for compile-time validation
- 32 new unit tests covering all factories including edge cases (empty arrays, optional fields, date computation)
- Full quality gate passes: typecheck, lint, 1572 unit tests (121 test files)

## Task Commits

Each task was committed atomically:

1. **Task 1 (TDD RED): Failing tests for schema factories** - `6d1a86908` (test)
2. **Task 1 (TDD GREEN): Implement schema factories** - `428e244dd` (feat)
3. **Task 2: Fix exactOptionalPropertyTypes error + full quality gate** - `9c7becbce` (fix)

_TDD: RED tests committed first, then GREEN implementation, then quality gate fix._

## Files Created/Modified
- `src/lib/seo/article-schema.ts` - Article JSON-LD factory with Person author, Organization publisher, mainEntityOfPage
- `src/lib/seo/faq-schema.ts` - FAQPage JSON-LD factory from question/answer pairs
- `src/lib/seo/product-schema.ts` - Product/Offer JSON-LD factory with dynamic priceValidUntil
- `src/lib/seo/__tests__/article-schema.test.ts` - 13 tests for article factory
- `src/lib/seo/__tests__/faq-schema.test.ts` - 5 tests for FAQ factory
- `src/lib/seo/__tests__/product-schema.test.ts` - 14 tests for product factory

## Decisions Made
- Used conditional spread (`...(field ? { field } : {})`) for all optional fields in article schema to satisfy exactOptionalPropertyTypes with schema-dts types
- Used `'Organization'` (not `'Brand'`) for product brand type to match existing generate-metadata.ts patterns
- Keywords joined as comma-separated string per schema.org Article specification
- Product factory uses `as const` assertion on `'@type': 'Offer'` for schema-dts type narrowing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed exactOptionalPropertyTypes error on Article.description**
- **Found during:** Task 2 (typecheck)
- **Issue:** schema-dts Article type rejects `undefined` for `description` under `exactOptionalPropertyTypes: true`
- **Fix:** Changed `description,` to `...(description ? { description } : {})` conditional spread
- **Files modified:** src/lib/seo/article-schema.ts
- **Verification:** `pnpm typecheck` passes cleanly
- **Committed in:** 9c7becbce

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for TypeScript strict mode compliance. No scope creep.

## Issues Encountered
None -- plan executed as specified with one expected type compatibility fix.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three content-specific schema factories ready for consumption
- Phase 35 (blog SEO migration) can import createArticleJsonLd + createFaqJsonLd
- Phase 36 (pricing SEO migration) can import createProductJsonLd
- JsonLdScript component (Plan 01) + these factories = complete SEO utility library

## Self-Check: PASSED

All 6 files verified on disk. All 3 commits verified in git log. SUMMARY.md exists.

---
*Phase: 33-seo-utilities-foundation*
*Completed: 2026-04-08*
