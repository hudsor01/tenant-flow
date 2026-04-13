---
phase: 39-structured-data-gap-closure
verified: 2026-04-12T00:00:00Z
status: passed
score: 9/9 must-haves verified
overrides_applied: 0
---

# Phase 39: Structured Data Gap Closure Verification Report

**Phase Goal:** All orphaned/missing JSON-LD schemas are wired into their target pages and stale inline blocks are removed.
**Verified:** 2026-04-12
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | seasonal-maintenance-checklist renders HowTo JSON-LD with 4 HowToSection steps | VERIFIED | `page.tsx:114-122` maps `seasons` array (4 items: Spring/Summer/Fall/Winter) into HowToSection; rendered via `<JsonLdScript schema={howToSchema} />` at line 132 |
| 2 | seasonal-maintenance-checklist renders BreadcrumbList via createBreadcrumbJsonLd | VERIFIED | `page.tsx:125-128` calls `createBreadcrumbJsonLd('/resources/seasonal-maintenance-checklist', {...})`; rendered via `<JsonLdScript schema={breadcrumbSchema} />` at line 133 |
| 3 | compare/[competitor] renders two SoftwareApplication JSON-LD via createSoftwareApplicationJsonLd | VERIFIED | `page.tsx:70-82` builds `tenantflowSchema` with 3 offer tiers ($29/$79/$199); `page.tsx:84-89` builds `competitorSchema`; both rendered via `JsonLdScript` at lines 98-99 |
| 4 | compare/[competitor] renders BreadcrumbList via createBreadcrumbJsonLd | VERIFIED | `page.tsx:91-94` calls `createBreadcrumbJsonLd('/compare/${slug}', { [slug]: 'TenantFlow vs ${data.name}' })`; rendered at line 100 |
| 5 | No inline comparisonSchema in compare page | VERIFIED | `grep "comparisonSchema" src/app/compare/[competitor]/page.tsx` returns zero matches |
| 6 | No direct process.env.NEXT_PUBLIC_APP_URL reads in compare page | VERIFIED | `grep "NEXT_PUBLIC_APP_URL" ...` returns zero matches; both `generateMetadata` (line 42) and `ComparePage` (line 68) use `getSiteUrl()` |
| 7 | blog-post-page.tsx contains zero inline JSON-LD script blocks | VERIFIED | `grep "application/ld+json|BlogPosting|JSON-LD Structured Data" src/app/blog/[slug]/blog-post-page.tsx` returns zero matches |
| 8 | Article JSON-LD in blog/[slug]/page.tsx is sole schema source | VERIFIED | `page.tsx:6` imports `createArticleJsonLd`; `page.tsx:111-124` builds schema with Person author (Richard Hudson), wordCount, keywords, timeRequired; rendered at line 129 |
| 9 | Google sees one Article schema per blog post page (no conflicting Article + BlogPosting pair) | VERIFIED | Server component (`page.tsx`) renders single Article schema; client component (`blog-post-page.tsx`) emits zero JSON-LD |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/resources/seasonal-maintenance-checklist/page.tsx` | HowTo + BreadcrumbList JSON-LD via JsonLdScript | VERIFIED | 269 lines; imports JsonLdScript (line 9) and createBreadcrumbJsonLd (line 10); builds howToSchema and breadcrumbSchema; renders both as first children inside PageLayout |
| `src/app/compare/[competitor]/page.tsx` | Dual SoftwareApplication + BreadcrumbList JSON-LD | VERIFIED | 179 lines; imports createSoftwareApplicationJsonLd (line 17), createBreadcrumbJsonLd (line 16), JsonLdScript (line 15), getSiteUrl (line 18); builds three schemas, renders all via JsonLdScript |
| `src/app/blog/[slug]/blog-post-page.tsx` | Zero inline JSON-LD | VERIFIED | 308 lines (reduced from 336 per 39-02 summary); no `application/ld+json`, `BlogPosting`, or `JSON-LD Structured Data` occurrences |
| `src/lib/seo/software-application-schema.ts` | createSoftwareApplicationJsonLd factory | VERIFIED | 51 lines; exports typed factory returning `SoftwareApplication` schema-dts type with optional url/offers |
| `src/lib/seo/breadcrumbs.ts` | createBreadcrumbJsonLd factory | VERIFIED | Exports factory returning `BreadcrumbList` with path-based item generation + overrides |
| `src/components/seo/json-ld-script.tsx` | JsonLdScript with XSS escaping | VERIFIED | Server Component; applies `.replace(/</g, '\\u003c')` for XSS safety |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `seasonal-maintenance-checklist/page.tsx` | `src/lib/seo/breadcrumbs.ts` | createBreadcrumbJsonLd import | WIRED | Line 10 import; line 125 invocation |
| `seasonal-maintenance-checklist/page.tsx` | `src/components/seo/json-ld-script.tsx` | JsonLdScript import | WIRED | Line 9 import; lines 132-133 render |
| `compare/[competitor]/page.tsx` | `src/lib/seo/software-application-schema.ts` | createSoftwareApplicationJsonLd import | WIRED | Line 17 import; lines 70, 84 invocations |
| `compare/[competitor]/page.tsx` | `src/lib/seo/breadcrumbs.ts` | createBreadcrumbJsonLd import | WIRED | Line 16 import; line 91 invocation |
| `compare/[competitor]/page.tsx` | `src/lib/generate-metadata.ts` | getSiteUrl import | WIRED | Line 18 import; lines 42, 68 invocations |
| `blog/[slug]/page.tsx` | `src/lib/seo/article-schema.ts` | createArticleJsonLd import | WIRED | Line 6 import; line 112 invocation (server-side only — sole schema source) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `seasonal-maintenance-checklist/page.tsx` | `howToSchema.step` | Static `seasons` array (4 items, lines 18-106) | Yes — 4 HowToSection with 14-16 HowToStep items each | FLOWING |
| `seasonal-maintenance-checklist/page.tsx` | `breadcrumbSchema` | `createBreadcrumbJsonLd()` from path + override | Yes — renders Home > Resources > Seasonal Maintenance Checklist | FLOWING |
| `compare/[competitor]/page.tsx` | `tenantflowSchema` | `createSoftwareApplicationJsonLd()` with hardcoded TenantFlow data | Yes — includes 3 Offer tiers ($29/$79/$199) | FLOWING |
| `compare/[competitor]/page.tsx` | `competitorSchema` | `data` from `COMPETITORS[slug]` static map | Yes — name and description pulled from compare-data.ts | FLOWING |
| `compare/[competitor]/page.tsx` | `breadcrumbSchema` | `createBreadcrumbJsonLd()` with competitor slug override | Yes — renders breadcrumb with "TenantFlow vs {name}" | FLOWING |
| `blog/[slug]/page.tsx` | `articleSchema` | `createArticleJsonLd()` from Supabase `blogs` table fetch (cached) | Yes — live DB query via `getBlogPost(slug)` with timeout + ISR 3600s | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| HowToSection steps render from seasons array | `grep "HowToSection" src/app/resources/seasonal-maintenance-checklist/page.tsx` | 1 match at line 115 (mapped over `seasons.map`) | PASS |
| HowToStep items render from tasks | `grep "HowToStep" ...` | 1 match at line 118 (mapped over `season.tasks.map`) | PASS |
| Dual SoftwareApplication factory calls on compare page | `grep "createSoftwareApplicationJsonLd" src/app/compare/[competitor]/page.tsx` | 3 lines (1 import + 2 calls at lines 70, 84) | PASS |
| getSiteUrl replaces NEXT_PUBLIC_APP_URL in compare page | `grep "getSiteUrl|NEXT_PUBLIC_APP_URL" ...` | getSiteUrl: 3 matches (import + 2 calls); NEXT_PUBLIC_APP_URL: 0 matches | PASS |
| Zero JSON-LD in blog-post-page.tsx | `grep "application/ld+json" src/app/blog/[slug]/blog-post-page.tsx` | 0 matches | PASS |
| Article schema on blog/[slug]/page.tsx server component | `grep "createArticleJsonLd" src/app/blog/[slug]/page.tsx` | 2 matches (import + usage) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SCHEMA-01 | 39-01 | BreadcrumbList JSON-LD on all public pages that lack it | SATISFIED | BreadcrumbList added to seasonal-maintenance-checklist (line 133) and compare/[competitor] (line 100) |
| SCHEMA-02 | 39-02 | Article JSON-LD on blog posts with Person author, wordCount, keywords | SATISFIED | blog/[slug]/page.tsx:112-124 builds Article schema with authorName 'Richard Hudson' (Person), wordCount computed, keywords from tags; stale BlogPosting block removed from client component |
| SCHEMA-05 | 39-02 | Existing inline JSON-LD refactored to use shared utilities | SATISFIED | Inline `<script type="application/ld+json">` removed from blog-post-page.tsx; inline comparisonSchema removed from compare page — both pages now use shared `JsonLdScript` component |
| SCHEMA-06 | 39-01 | HowTo schema on seasonal maintenance checklist resource page | SATISFIED | seasonal-maintenance-checklist/page.tsx:109-123 builds HowTo schema with 4 HowToSection steps mapped from seasons array |
| SCHEMA-07 | 39-01 | Comparison pages have paired SoftwareApplication schemas | SATISFIED | compare/[competitor]/page.tsx renders tenantflowSchema (with 3 offers) + competitorSchema via JsonLdScript |

All 5 requirement IDs declared in plan frontmatter (SCHEMA-01, SCHEMA-02, SCHEMA-05, SCHEMA-06, SCHEMA-07) are satisfied. No orphaned requirements — REQUIREMENTS.md maps exactly these 5 IDs to Phase 39.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None detected | — | No TODO/FIXME, no empty handlers, no stub returns, no hardcoded empty JSON-LD arrays in phase-modified files |

### Commit Verification

| Commit | Type | Status |
|--------|------|--------|
| `cd7121112` | feat(39-01): add HowTo and BreadcrumbList JSON-LD to seasonal-maintenance-checklist | FOUND |
| `590b7b6ef` | feat(39-01): replace inline comparisonSchema with factory calls on compare page | FOUND |
| `b5bbbb959` | fix(39-02): remove stale inline BlogPosting JSON-LD from blog-post-page | FOUND |

### Human Verification Required

None. All must-haves are programmatically verifiable — no UI visual, external service, or real-time behavior checks required. The JSON-LD output is purely compile-time static data (seasons array, COMPETITORS record, and cached DB-fetched blog post). XSS escaping is handled internally by the existing JsonLdScript component.

### Gaps Summary

No gaps found. All 9 observable truths verified, all 6 artifacts pass Levels 1-4 verification, all 6 key links are wired, all 5 requirement IDs satisfied, all 3 atomic task commits exist in git history, and zero anti-patterns detected in the modified files.

Phase 39's three deliverables are complete:
1. `createSoftwareApplicationJsonLd` factory (orphaned since Phase 33) is now wired into `compare/[competitor]/page.tsx` for both TenantFlow (with 3 offer tiers) and competitor schemas.
2. HowTo + BreadcrumbList JSON-LD added to `seasonal-maintenance-checklist/page.tsx` (4 HowToSection steps mapped from seasons array).
3. Stale inline BlogPosting block removed from `blog-post-page.tsx` client component — server component `page.tsx` is now sole Article schema source.

---

*Verified: 2026-04-12*
*Verifier: Claude (gsd-verifier)*
