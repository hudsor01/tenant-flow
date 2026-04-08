---
phase: 33-seo-utilities-foundation
verified: 2026-04-08T19:30:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Run pnpm test:unit -- --run src/components/seo/__tests__/json-ld-script.test.tsx src/lib/seo/__tests__/breadcrumbs.test.ts src/lib/seo/__tests__/page-metadata.test.ts src/lib/seo/__tests__/article-schema.test.ts src/lib/seo/__tests__/faq-schema.test.ts src/lib/seo/__tests__/product-schema.test.ts"
    expected: "All 54 tests pass with exit code 0, no failures"
    why_human: "Cannot run the test suite in the verification sandbox — all file-level structural checks pass but runtime test execution requires the dev environment"
  - test: "Run pnpm typecheck && pnpm lint"
    expected: "Both commands exit with code 0 — no TypeScript errors, no lint violations in the new files"
    why_human: "Quality gate must be confirmed against live TypeScript compiler and ESLint in the project environment"
---

# Phase 33: SEO Utilities Foundation Verification Report

**Phase Goal:** All JSON-LD and metadata generation uses tested, type-safe shared utilities instead of per-page inline boilerplate
**Verified:** 2026-04-08T19:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | `src/components/seo/json-ld-script.tsx` renders a `<script type="application/ld+json">` tag with XSS-escaped content and accepts any `schema-dts` type | VERIFIED | File exists 30 lines. Renders `<script type="application/ld+json">` via `dangerouslySetInnerHTML`. XSS escaping via `.replace(/</g, '\\u003c')` on line 26. Accepts `Exclude<Thing, string>` generic from schema-dts. No `'use client'` directive — Server Component. |
| 2 | `src/lib/seo/` contains `breadcrumbs.ts`, `article-schema.ts`, `faq-schema.ts`, `product-schema.ts`, and `page-metadata.ts` exporting their respective factory functions | VERIFIED | All 5 files confirmed on disk. Exports verified: `createBreadcrumbJsonLd`, `createPageMetadata`, `createArticleJsonLd`, `createFaqJsonLd`, `createProductJsonLd`. Each returns a schema-dts typed object. |
| 3 | `getSiteUrl()` is exported from `generate-metadata.ts` and is the single source of truth for base URL — no other file constructs the site URL from `process.env` directly | VERIFIED | `getSiteUrl()` exported at `src/lib/generate-metadata.ts:8`. All 4 URL-constructing factories import via `import { getSiteUrl } from '#lib/generate-metadata'`. No source files in `src/lib/seo/` read `process.env` directly (only test mocks do). |
| 4 | `schema-dts` is listed in `devDependencies` in `package.json` | VERIFIED | `package.json:219` — `"schema-dts": "^2.0.0"` under `devDependencies` block (starts at line 180). |
| 5 | Unit tests exist for every utility function in `src/lib/seo/` and the `JsonLdScript` component, all passing | VERIFIED (structure) | 6 test files confirmed: `json-ld-script.test.tsx` (5 tests), `breadcrumbs.test.ts` (6 tests), `page-metadata.test.ts` (9 tests), `article-schema.test.ts` (14 tests), `faq-schema.test.ts` (5 tests), `product-schema.test.ts` (15 tests). 54 total test cases. Runtime pass/fail requires human confirmation. |

**Score:** 5/5 truths verified (structural)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/seo/json-ld-script.tsx` | Type-safe JSON-LD script renderer exporting `JsonLdScript` | VERIFIED | 30 lines. Named export. Accepts `ThingObject | WithContext<ThingObject>`. Renders script tag. XSS escapes. |
| `src/lib/seo/breadcrumbs.ts` | BreadcrumbList JSON-LD factory exporting `createBreadcrumbJsonLd` | VERIFIED | 54 lines. Returns `BreadcrumbList` from schema-dts. Imports `getSiteUrl()`. Supports path splitting and label overrides. Last item omits `item` URL per Schema.org spec. |
| `src/lib/seo/page-metadata.ts` | Next.js Metadata factory exporting `createPageMetadata` | VERIFIED | 55 lines. Returns `Metadata` from next. Imports `getSiteUrl()`. Generates canonical URL, OG tags, Twitter card, noindex support. Includes path normalization fix (leading slash guard). |
| `src/lib/seo/article-schema.ts` | Article JSON-LD factory exporting `createArticleJsonLd` | VERIFIED | 60 lines. Returns `Article` from schema-dts. Imports `getSiteUrl()`. Includes Person author, Organization publisher, mainEntityOfPage, optional wordCount/keywords/image. |
| `src/lib/seo/faq-schema.ts` | FAQPage JSON-LD factory exporting `createFaqJsonLd` | VERIFIED | 24 lines. Returns `FAQPage` from schema-dts. No URL dependency (purely structural). Question/Answer typed output. |
| `src/lib/seo/product-schema.ts` | Product/Offer JSON-LD factory exporting `createProductJsonLd` | VERIFIED | 55 lines. Returns `Product` from schema-dts. Imports `getSiteUrl()`. Dynamic `priceValidUntil` via `getOneYearFromNow()`. No hardcoded `2025-12-31`. |
| `src/components/seo/__tests__/json-ld-script.test.tsx` | JsonLdScript component tests | VERIFIED | 88 lines. 5 test cases covering: script tag type, @context injection, XSS escaping, schema serialization, no double-wrapping of existing @context. |
| `src/lib/seo/__tests__/breadcrumbs.test.ts` | Breadcrumb factory tests | VERIFIED | 95 lines. 6 test cases covering: BreadcrumbList type, Home item with site URL, last item omits URL, label overrides, multi-segment paths, position numbering. |
| `src/lib/seo/__tests__/page-metadata.test.ts` | Page metadata factory tests | VERIFIED | 119 lines. 9 test cases covering: title, canonical URL, OG title/description, OG url match, Twitter card, noindex, default OG image, path normalization, custom ogImage. |
| `src/lib/seo/__tests__/article-schema.test.ts` | Article factory tests | VERIFIED | 115 lines. 14 test cases covering all fields including optional field omission. |
| `src/lib/seo/__tests__/faq-schema.test.ts` | FAQ factory tests | VERIFIED | 57 lines. 5 test cases covering type, array length, Question/Answer structure, text content, empty array. |
| `src/lib/seo/__tests__/product-schema.test.ts` | Product factory tests | VERIFIED | 156 lines. 15 test cases covering type, name, offers array, priceCurrency, InStock, dynamic priceValidUntil (not `2025-12-31`), brand Organization, custom/default offer URLs. Uses `vi.useFakeTimers()` for deterministic date assertions. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/seo/breadcrumbs.ts` | `src/lib/generate-metadata.ts` | `import { getSiteUrl }` | WIRED | Line 3: `import { getSiteUrl } from '#lib/generate-metadata'`. Called at line 14. |
| `src/lib/seo/page-metadata.ts` | `src/lib/generate-metadata.ts` | `import { getSiteUrl }` | WIRED | Line 3: `import { getSiteUrl } from '#lib/generate-metadata'`. Called at line 19. |
| `src/components/seo/json-ld-script.tsx` | `schema-dts` | `import type { Thing, WithContext }` | WIRED | Line 1: `import type { Thing, WithContext } from 'schema-dts'`. Used in `ThingObject` alias and `JsonLdScriptProps`. |
| `src/lib/seo/article-schema.ts` | `src/lib/generate-metadata.ts` | `import { getSiteUrl }` | WIRED | Line 3: `import { getSiteUrl } from '#lib/generate-metadata'`. Called at line 22. |
| `src/lib/seo/faq-schema.ts` | `schema-dts` | `import type { FAQPage }` | WIRED | Line 1: `import type { FAQPage } from 'schema-dts'`. Used as return type. |
| `src/lib/seo/product-schema.ts` | `src/lib/generate-metadata.ts` | `import { getSiteUrl }` | WIRED | Line 3: `import { getSiteUrl } from '#lib/generate-metadata'`. Called at line 30. |

### Data-Flow Trace (Level 4)

Not applicable — all artifacts are pure factory functions with no async data sources. They accept synchronous inputs and return structured objects. `JsonLdScript` is a Server Component that renders its `schema` prop directly. No DB queries, no fetch calls, no disconnected data sources.

### Behavioral Spot-Checks

Step 7b: SKIPPED for test execution (cannot run test runner in verification sandbox). File-level structural checks substitute:

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| JsonLdScript exports named function | `grep 'export function JsonLdScript'` | Found at line 16 | PASS |
| XSS escaping present | `grep '\\u003c'` | Found at line 26 | PASS |
| No stale hardcoded date | `grep '2025-12-31' product-schema.ts` | No match | PASS |
| All 6 commits exist in git | `git log --oneline` with hashes from SUMMARYs | All 6 confirmed: `448260456`, `0c8242bbb`, `484f44f6c`, `6d1a86908`, `428e244dd`, `9c7becbce` | PASS |
| schema-dts in devDependencies | `grep "schema-dts" package.json` | `"schema-dts": "^2.0.0"` at line 219 in devDependencies | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| UTIL-01 | Plan 01 | Shared `JsonLdScript` component with type-safe JSON-LD and XSS escaping | SATISFIED | `src/components/seo/json-ld-script.tsx` exports `JsonLdScript`. Renders `<script type="application/ld+json">`. XSS escaping via `.replace(/</g, '\\u003c')`. Accepts any `schema-dts` type via `Exclude<Thing, string>`. |
| UTIL-02 | Plan 01 | `createBreadcrumbJsonLd()` with route path and override support | SATISFIED | `src/lib/seo/breadcrumbs.ts`. Splits path into segments, generates `BreadcrumbList`, supports `overrides` map for dynamic segment labels. Last item omits URL. |
| UTIL-03 | Plan 02 | `createArticleJsonLd()` with headline, datePublished, author, image, wordCount | SATISFIED | `src/lib/seo/article-schema.ts`. Returns `Article` with headline, datePublished, Person author, Organization publisher, mainEntityOfPage, optional image/wordCount/keywords. |
| UTIL-04 | Plan 02 | `createFaqJsonLd()` from question/answer arrays | SATISFIED | `src/lib/seo/faq-schema.ts`. Returns `FAQPage` with `mainEntity` array of `Question`/`Answer` objects. |
| UTIL-05 | Plan 02 | `createProductJsonLd()` with dynamic `priceValidUntil` | SATISFIED | `src/lib/seo/product-schema.ts`. `getOneYearFromNow()` computes date dynamically. No hardcoded `2025-12-31`. Verified by test with `vi.useFakeTimers()`. |
| UTIL-06 | Plan 01 | `createPageMetadata()` with canonical URL, OG, Twitter card | SATISFIED | `src/lib/seo/page-metadata.ts`. Returns Next.js `Metadata` with `alternates.canonical`, `openGraph`, `twitter.card: 'summary_large_image'`, noindex support. |
| UTIL-07 | Plan 01 | `getSiteUrl()` exported from `generate-metadata.ts` as single source of truth | SATISFIED | `getSiteUrl()` exported at `src/lib/generate-metadata.ts:8`. All factories import from there. No direct `process.env` reads in source files. |
| UTIL-08 | Plan 01 + Plan 02 | Unit tests for all SEO utility functions | SATISFIED (structure) | 6 test files, 54 test cases. All factory functions and edge cases covered. Runtime confirmation is human verification item. |

### Anti-Patterns Found

No blockers or warnings found:

- No `TODO/FIXME/PLACEHOLDER` comments in source files
- No `return null` / empty stub implementations
- No hardcoded `2025-12-31` in product-schema.ts
- No `'use client'` directive in `json-ld-script.tsx`
- No direct `process.env` reads in source files
- Code review (33-REVIEW.md) noted WR-01 (missing path normalization) — already fixed in `page-metadata.ts:20-21` with `path.startsWith('/') ? path : `/${path}`` guard and covered by test "normalizes path missing leading slash"
- IN-01 (unnecessary `Object.entries reduce`) and IN-02 (slug path safety) are info-level, non-blocking

### Human Verification Required

**1. Unit Test Suite Execution**

**Test:** `cd /path/to/tenant-flow && pnpm test:unit -- --run src/components/seo/__tests__/json-ld-script.test.tsx src/lib/seo/__tests__/breadcrumbs.test.ts src/lib/seo/__tests__/page-metadata.test.ts src/lib/seo/__tests__/article-schema.test.ts src/lib/seo/__tests__/faq-schema.test.ts src/lib/seo/__tests__/product-schema.test.ts`
**Expected:** 54 tests pass, 0 failures, exit code 0
**Why human:** Test runner requires the full project environment (Vitest, jsdom, mocks) that cannot be exercised in the verification sandbox.

**2. Quality Gate**

**Test:** `pnpm typecheck && pnpm lint`
**Expected:** Both commands exit with code 0. No TypeScript errors from schema-dts type usage (`Exclude<Thing, string>`, `BreadcrumbList`, `Article`, `FAQPage`, `Product`). No ESLint violations.
**Why human:** TypeScript compiler and ESLint must run against the live project to verify the schema-dts strict mode compatibility fixes hold.

### Gaps Summary

No gaps found. All 5 ROADMAP success criteria are structurally satisfied. All 8 requirements (UTIL-01 through UTIL-08) are satisfied. The two human verification items are confirmatory — structural evidence strongly indicates tests pass (54 substantive tests, all following correct patterns; commits documented passing quality gate in SUMMARY). Status is `human_needed` because test execution cannot be confirmed without running the project.

---

_Verified: 2026-04-08T19:30:00Z_
_Verifier: Claude (gsd-verifier)_
