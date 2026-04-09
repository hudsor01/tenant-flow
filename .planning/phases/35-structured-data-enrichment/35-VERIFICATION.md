---
phase: 35-structured-data-enrichment
verified: 2026-04-09T18:20:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
gaps: []
re_verified: true
re_verification_reason: "Gap closure plan 35-03 fixed blog test imports (c7f320595)"
---

# Phase 35: Structured Data Enrichment Verification Report

**Phase Goal:** Google Rich Results Test shows valid schemas for every public page type (breadcrumbs, articles, FAQ, HowTo, comparisons)
**Verified:** 2026-04-09T17:50:00Z
**Status:** PASSED
**Re-verification:** Yes -- gap closure plan 35-03 (c7f320595) fixed test imports

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every public page renders at least a BreadcrumbList JSON-LD script tag in its HTML source | VERIFIED | Blog hub, blog category, blog posts, help, support, privacy, terms, security-policy, 2 resource detail pages, seasonal maintenance checklist all contain JsonLdScript + createBreadcrumbJsonLd. Compare pages have breadcrumbSchema via createBreadcrumbJsonLd. Pages already done in Phase 34 (pricing, faq, about, contact, features, resources hub) retain their breadcrumbs. Homepage uses WebSite instead of breadcrumb (correct per D-08 -- it IS the root). |
| 2 | Blog post pages render an Article JSON-LD with mainEntityOfPage, image, wordCount, keywords, and a Person author (not just organization) | VERIFIED | src/app/blog/[slug]/page.tsx lines 99-111: createArticleJsonLd with authorName: 'Richard Hudson', wordCount, keywords from tags, image from featured_image, timeRequired from reading_time. Factory at src/lib/seo/article-schema.ts lines 37-62 produces @type Article with Person author, mainEntityOfPage, publisher.logo, conditional wordCount/keywords/image/timeRequired. |
| 3 | Homepage renders a WebSite JSON-LD with SearchAction (potentialAction with query-input) | VERIFIED | src/app/page.tsx lines 34-44: websiteSchema with '@type': 'WebSite', name: 'TenantFlow', potentialAction with '@type': 'SearchAction', target URL with {search_term_string}, 'query-input': 'required name=search_term_string'. Rendered via JsonLdScript on line 48. |
| 4 | All previously inline JSON-LD blocks on FAQ, pricing, about, contact, features, resources, and compare pages are replaced with JsonLdScript component calls using shared utility functions | VERIFIED | grep for the inline pattern returns zero matches in faq/, pricing/page.tsx, about/, contact/, features/. Compare page has zero inline JSON-LD. blog-post-page.tsx has zero inline JSON-LD. Only remaining instances of the pattern are print CSS style tags on 3 resource pages (not JSON-LD -- correct and expected). |
| 5 | Running pnpm typecheck && pnpm lint && pnpm test:unit passes with zero errors | VERIFIED | Gap closed by plan 35-03 (c7f320595). pnpm typecheck exits 0. pnpm test:unit: 1,581 tests pass across 122 files, zero failures. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/seo/article-schema.ts` | Article JSON-LD factory with timeRequired support | VERIFIED | Contains timeRequired?: string in interface (line 15), conditional spread on line 61 |
| `src/lib/seo/__tests__/article-schema.test.ts` | Unit tests covering timeRequired field | VERIFIED | 15 tests including timeRequired inclusion (line 116-119) and omission (line 121-125) |
| `src/app/blog/[slug]/page.tsx` | Article + Breadcrumb JSON-LD for blog posts via server component | VERIFIED | Async server component, imports createArticleJsonLd and createBreadcrumbJsonLd, renders both via JsonLdScript |
| `src/app/blog/[slug]/blog-post-page.tsx` | Client component with inline JSON-LD removed | VERIFIED | No inline JSON-LD pattern, no BlogPosting schema |
| `src/app/blog/page.tsx` | Breadcrumb JSON-LD for blog hub | VERIFIED | Line 26: JsonLdScript with createBreadcrumbJsonLd('/blog') |
| `src/app/blog/category/[category]/page.tsx` | Breadcrumb JSON-LD for blog categories | VERIFIED | Line 39: JsonLdScript with createBreadcrumbJsonLd with category override |
| `src/app/help/page.tsx` | Breadcrumb JSON-LD | VERIFIED | Lines 4-5: imports JsonLdScript and createBreadcrumbJsonLd |
| `src/app/support/page.tsx` | Breadcrumb JSON-LD | VERIFIED | Lines 3-4: imports JsonLdScript and createBreadcrumbJsonLd |
| `src/app/privacy/page.tsx` | Breadcrumb JSON-LD | VERIFIED | Line 14: createBreadcrumbJsonLd('/privacy') |
| `src/app/terms/page.tsx` | Breadcrumb JSON-LD | VERIFIED | Line 14: createBreadcrumbJsonLd('/terms') |
| `src/app/security-policy/page.tsx` | Breadcrumb JSON-LD | VERIFIED | Line 14: createBreadcrumbJsonLd('/security-policy') |
| `src/app/resources/landlord-tax-deduction-tracker/page.tsx` | Breadcrumb JSON-LD for tax deduction resource | VERIFIED | Line 20: createBreadcrumbJsonLd with 3-level override |
| `src/app/resources/security-deposit-reference-card/page.tsx` | Breadcrumb JSON-LD for security deposit resource | VERIFIED | Line 83: createBreadcrumbJsonLd with 3-level override |
| `src/lib/seo/software-application-schema.ts` | SoftwareApplication JSON-LD factory | VERIFIED | Exports createSoftwareApplicationJsonLd, 50 lines, defaults BusinessApplication/Web Browser |
| `src/lib/seo/__tests__/software-application-schema.test.ts` | Unit tests for SoftwareApplication factory | VERIFIED | 6 tests all passing |
| `src/app/page.tsx` | WebSite JSON-LD with SearchAction on homepage | VERIFIED | Lines 34-44: WebSite schema with SearchAction and query-input |
| `src/app/compare/[competitor]/page.tsx` | SoftwareApplication + Breadcrumb JSON-LD via shared utilities | VERIFIED | Lines 69-98: tenantflowSchema, competitorSchema, breadcrumbSchema all via factories, rendered via 3 JsonLdScript calls |
| `src/app/resources/seasonal-maintenance-checklist/page.tsx` | HowTo + Breadcrumb JSON-LD | VERIFIED | Lines 109-124: HowTo with 4 HowToSection steps from seasons array. Breadcrumb on line 128 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| src/app/blog/[slug]/page.tsx | src/lib/seo/article-schema.ts | import createArticleJsonLd | WIRED | Line 4: import, line 100: usage in articleSchema construction |
| src/app/blog/[slug]/page.tsx | src/lib/seo/breadcrumbs.ts | import createBreadcrumbJsonLd | WIRED | Line 5: import, line 90: usage in breadcrumbSchema construction |
| src/app/compare/[competitor]/page.tsx | src/lib/seo/software-application-schema.ts | import createSoftwareApplicationJsonLd | WIRED | Line 16: import, lines 69 and 84: usage for TenantFlow and competitor schemas |
| src/app/compare/[competitor]/page.tsx | src/lib/seo/breadcrumbs.ts | import createBreadcrumbJsonLd | WIRED | Line 15: import, line 90: usage |
| src/app/page.tsx | src/components/seo/json-ld-script.tsx | import JsonLdScript | WIRED | Line 4: import, line 48: usage |
| All breadcrumb pages | src/components/seo/json-ld-script.tsx | import JsonLdScript | WIRED | All 11 pages import and render JsonLdScript |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| src/app/blog/[slug]/page.tsx | post | Supabase blogs table query (lines 74-79) | Yes, real DB query with .select().eq().single() | FLOWING |
| src/app/compare/[competitor]/page.tsx | data (COMPETITORS) | Static compare-data.ts constant | Yes, static but complete competitor data | FLOWING |
| src/app/page.tsx | websiteSchema | getSiteUrl() + static config | Yes, produces real site URL | FLOWING |
| seasonal-maintenance-checklist/page.tsx | seasons | Module-level constant array | Yes, 4 seasons with complete task lists | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED (no runnable entry points -- pages require Next.js server to render)

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SCHEMA-01 | 35-01 | BreadcrumbList JSON-LD on all public pages that lack it | SATISFIED | Blog posts, blog hub, blog categories, help, support, privacy, terms, security-policy, 3 resource detail pages all have BreadcrumbList via createBreadcrumbJsonLd |
| SCHEMA-02 | 35-01 | Article JSON-LD on blog posts with mainEntityOfPage, image, wordCount, keywords, publisher.logo, Person author | SATISFIED | createArticleJsonLd factory produces all required fields; page.tsx wires to blog data |
| SCHEMA-03 | 35-02 | Homepage has WebSite schema with SearchAction for sitelinks search box | SATISFIED | src/app/page.tsx has WebSite with SearchAction and query-input |
| SCHEMA-05 | 35-01, 35-02 | Existing inline JSON-LD refactored to use shared utilities | SATISFIED | Zero inline JSON-LD blocks remain on FAQ, pricing, about, contact, features, resources, compare, or blog-post-page pages |
| SCHEMA-06 | 35-02 | HowTo schema on seasonal maintenance checklist | SATISFIED | HowTo with 4 HowToSection steps (Spring/Summer/Fall/Winter) on checklist page |
| SCHEMA-07 | 35-02 | Comparison pages have paired SoftwareApplication schemas (TenantFlow + competitor) | SATISFIED | compare/[competitor]/page.tsx renders tenantflowSchema + competitorSchema via factory |
| SCHEMA-08 | 35-01 | Blog posts include readingTime and wordCount in Article schema | SATISFIED | timeRequired (ISO 8601 duration from reading_time) and wordCount (computed from content) both wired in page.tsx |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | - | - | - | - |

### Human Verification Required

### 1. Rich Results Test Validation

**Test:** Paste rendered HTML of a blog post page into Google Rich Results Test (https://search.google.com/test/rich-results)
**Expected:** Article and BreadcrumbList schemas both validate without errors
**Why human:** Requires running the Next.js server and inspecting actual HTML output, then feeding to external Google tool

### 2. Homepage WebSite Schema Validation

**Test:** View source of homepage and paste into Google Rich Results Test
**Expected:** WebSite with SearchAction validates; sitelinks search box may appear in SERP
**Why human:** Requires running server and external validation tool

### 3. Compare Page SoftwareApplication Validation

**Test:** View source of /compare/buildium and validate in Rich Results Test
**Expected:** Two SoftwareApplication schemas (TenantFlow + Buildium) plus BreadcrumbList validate
**Why human:** Requires running server and external validation

### Gaps Summary

No gaps remain. The single gap (truth #5 — test failures from async server component conversion) was closed by plan 35-03 (commit c7f320595). All 5/5 truths verified, all 7 SCHEMA requirements satisfied, all artifacts wired and substantive.

---

_Verified: 2026-04-09T17:50:00Z_
_Verifier: Claude (gsd-verifier)_
