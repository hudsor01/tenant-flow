---
phase: 37-content-seo-internal-linking
verified: 2026-04-10T13:25:00Z
status: human_needed
score: 9/9 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Visit /blog/tenantflow-vs-buildium-comparison (or any competitor comparison post) in a browser"
    expected: "Blue-accented CTA box appears between the article prose and the bottom CTA, displaying 'Compare TenantFlow vs Buildium side-by-side' with a working link to /compare/buildium"
    why_human: "blog-post-page.tsx is a 'use client' component that fetches the post from Supabase at runtime; conditional CTA rendering cannot be verified without a live post in the database with the matching slug"
  - test: "Visit /compare/buildium (or /compare/appfolio or /compare/rentredi) in a browser"
    expected: "A 'Read the Full Comparison' section appears between WhySwitchSection and BottomCta, showing a BlogCard for the corresponding comparison blog post — only if that post exists and is published in the blogs table"
    why_human: "RelatedArticles queries Supabase at request time; the blog posts must actually exist and have status='published' for cards to render"
  - test: "Visit /resources/seasonal-maintenance-checklist, /resources/landlord-tax-deduction-tracker, /resources/security-deposit-reference-card in a browser"
    expected: "A 'Related Blog Posts' section appears before the footer CTA on each page, showing a BlogCard — only if the mapped blog post exists and is published"
    why_human: "Same as above — RelatedArticles renders null when Supabase returns no published matches; requires live published blog posts to visually verify end-to-end"
---

# Phase 37: Content SEO & Internal Linking Verification Report

**Phase Goal:** Blog, comparison, and resource pages cross-link to each other, building topical authority clusters
**Verified:** 2026-04-10T13:25:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Blog posts that mention a competitor by name include a link to the corresponding `/compare/[competitor]` page | VERIFIED | `blog-post-page.tsx` line 148: `const competitorSlug = BLOG_TO_COMPETITOR[slug]`; line 277: `href={\`/compare/${competitorSlug}\`}`; conditional render at line 271 with `bg-primary/5 border border-primary/20` CTA box |
| 2 | Comparison pages include a "Related Articles" section linking to relevant blog posts | VERIFIED | `compare/[competitor]/page.tsx` line 14 imports `RelatedArticles`; line 180: `<RelatedArticles slugs={[data.blogSlug]} title="Read the Full Comparison" />` placed between `WhySwitchSection` and `BottomCta` |
| 3 | Resource pages link to related blog posts and blog posts link back to related resource pages | VERIFIED | All 3 resource pages import `RelatedArticles` + `RESOURCE_TO_BLOGS` and render section before footer CTA; `blog-post-page.tsx` line 149: `const resourceSlug = BLOG_TO_RESOURCE[slug]`; line 292: `href={\`/resources/${resourceSlug}\`}` |
| 4 | BLOG_TO_COMPETITOR maps 3 blog slugs to their competitor slugs | VERIFIED | `content-links.ts` derives map from `COMPETITORS` in `compare-data.ts`; buildium→buildium, appfolio→appfolio, rentredi→rentredi; confirmed by 3 passing tests |
| 5 | BLOG_TO_RESOURCE maps 3 blog slugs to their resource slugs | VERIFIED | `content-links.ts` derives map from `RESOURCE_TO_BLOGS` via `flatMap`; 3 entries confirmed by unit tests |
| 6 | RESOURCE_TO_BLOGS maps 3 resource slugs to arrays of blog slugs | VERIFIED | `content-links.ts` lines 23-33; 3 keys with correct values; confirmed by 7 passing tests |
| 7 | RelatedArticles renders a grid of BlogCard components for given slugs | VERIFIED | `related-articles.tsx` queries Supabase `.from('blogs').select(...).in('slug', slugs).eq('status', 'published')`; renders `md:grid-cols-3 gap-6` grid of BlogCard; 2 passing RTL tests confirm render |
| 8 | RelatedArticles returns null when no published posts match | VERIFIED | `related-articles.tsx` lines 28 and 41; tests for empty array, empty data, and null data all return null; 3 passing tests confirm |
| 9 | Blog posts with resource mappings render a resource CTA | VERIFIED | `blog-post-page.tsx` line 286-299: conditional `bg-muted border border-border` CTA with `href={\`/resources/${resourceSlug}\`}` |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/content-links.ts` | Static bidirectional mapping config | VERIFIED | Exists, substantive, exports RESOURCE_TO_BLOGS/BLOG_TO_RESOURCE/BLOG_TO_COMPETITOR; imports COMPETITORS from compare-data |
| `src/lib/content-links.test.ts` | Unit tests for all three maps | VERIFIED | 15 test assertions covering all 3 maps and all slug values; all pass |
| `src/components/blog/related-articles.tsx` | Async Server Component rendering BlogCard grid | VERIFIED | Exists, no `'use client'`, imports createClient + BlogCard + BlogListItem; real Supabase query; section-spacing print:hidden; typography-h2; md:grid-cols-3 gap-6 |
| `src/components/blog/related-articles.test.tsx` | Smoke tests for null-return behavior | VERIFIED | 6 tests; null cases (empty slugs, empty data, null data) + render cases (default title, custom title, BlogCard count); all pass |
| `src/app/blog/[slug]/blog-post-page.tsx` | Compare CTA and resource CTA conditional sections | VERIFIED | Lines 19-20 import BLOG_TO_COMPETITOR/BLOG_TO_RESOURCE/COMPETITORS; lines 148-149 lookup; lines 271-298 conditional CTAs with correct href patterns and aria-hidden on icons; RelatedArticles NOT imported (correct — client component) |
| `src/app/compare/[competitor]/page.tsx` | RelatedArticles section between WhySwitchSection and BottomCta | VERIFIED | Line 14 imports RelatedArticles; line 180 renders with `slugs={[data.blogSlug]}` and `title="Read the Full Comparison"` between WhySwitchSection and BottomCta |
| `src/app/resources/seasonal-maintenance-checklist/page.tsx` | RelatedArticles section before footer CTA | VERIFIED | Lines 7-8 import RelatedArticles + RESOURCE_TO_BLOGS; lines 227-230 render with correct key and title="Related Blog Posts" before footer CTA div |
| `src/app/resources/landlord-tax-deduction-tracker/page.tsx` | RelatedArticles section before footer CTA | VERIFIED | Lines 7-8 import RelatedArticles + RESOURCE_TO_BLOGS; line 191 uses RESOURCE_TO_BLOGS['landlord-tax-deduction-tracker']; title="Related Blog Posts" |
| `src/app/resources/security-deposit-reference-card/page.tsx` | RelatedArticles section before footer CTA | VERIFIED | Lines 7-8 import RelatedArticles + RESOURCE_TO_BLOGS; line 272 uses RESOURCE_TO_BLOGS['security-deposit-reference-card']; title="Related Blog Posts" |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/content-links.ts` | `src/app/compare/[competitor]/compare-data.ts` | imports COMPETITORS to derive BLOG_TO_COMPETITOR | WIRED | Line 13: `import { COMPETITORS } from '#app/compare/[competitor]/compare-data'` |
| `src/components/blog/related-articles.tsx` | `src/components/blog/blog-card.tsx` | renders BlogCard instances | WIRED | Line 14: `import { BlogCard } from '#components/blog/blog-card'`; line 49: `<BlogCard key={post.id} post={post} />` |
| `src/app/blog/[slug]/blog-post-page.tsx` | `src/lib/content-links.ts` | imports BLOG_TO_COMPETITOR and BLOG_TO_RESOURCE | WIRED | Lines 19-20: confirmed imports; used at lines 148-149 in component body |
| `src/app/blog/[slug]/blog-post-page.tsx` | `/compare/[competitor]` | Link href to compare page | WIRED | Line 277: `href={\`/compare/${competitorSlug}\`}` inside conditional CTA |
| `src/app/compare/[competitor]/page.tsx` | `src/components/blog/related-articles.tsx` | renders RelatedArticles with blogSlug | WIRED | Line 14 import; line 180 render with `slugs={[data.blogSlug]}` |
| `src/app/resources/*/page.tsx` | `src/lib/content-links.ts` | imports RESOURCE_TO_BLOGS for slug lookup | WIRED | All 3 resource pages import RESOURCE_TO_BLOGS and use it in RelatedArticles slugs prop |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `related-articles.tsx` | `posts` (BlogListItem[]) | `.from('blogs').select(...).in('slug', slugs).eq('status', 'published')` | Supabase PostgREST query against live blogs table | FLOWING |
| `blog-post-page.tsx` compare CTA | `competitorSlug` | `BLOG_TO_COMPETITOR[slug]` — static compile-time map derived from COMPETITORS | Static map from compare-data.ts — no query needed | FLOWING |
| `blog-post-page.tsx` resource CTA | `resourceSlug` | `BLOG_TO_RESOURCE[slug]` — static compile-time map derived from RESOURCE_TO_BLOGS | Static map from content-links.ts — no query needed | FLOWING |
| `compare/[competitor]/page.tsx` | `data.blogSlug` | `COMPETITORS[slug]` — static compile-time constant | Hardcoded in compare-data.ts (buildium/appfolio/rentredi blogSlugs) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| content-links unit tests (15 assertions) | `pnpm test:unit -- --run src/lib/content-links.test.ts` | 1602 passed | PASS |
| related-articles smoke tests (6 assertions) | `pnpm test:unit -- --run src/components/blog/related-articles.test.tsx` | 1602 passed | PASS |
| End-to-end render with live Supabase data | Requires running dev server + published blog posts | Cannot test without live server | SKIP (needs human) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CONTENT-01 | 37-01, 37-02 | Blog posts link to related comparison pages when mentioning competitors | SATISFIED | `blog-post-page.tsx` conditionally renders compare CTA from `BLOG_TO_COMPETITOR[slug]` lookup; links to `/compare/${competitorSlug}` |
| CONTENT-02 | 37-01, 37-02 | Comparison pages link to related blog posts | SATISFIED | `compare/[competitor]/page.tsx` renders `<RelatedArticles slugs={[data.blogSlug]} title="Read the Full Comparison" />` |
| CONTENT-03 | 37-01, 37-02 | Resource pages link to related blog posts and vice versa | SATISFIED | All 3 resource pages render RelatedArticles with RESOURCE_TO_BLOGS lookup; blog posts render resource CTA from BLOG_TO_RESOURCE lookup |

No orphaned requirements — REQUIREMENTS.md maps CONTENT-01, CONTENT-02, CONTENT-03 to Phase 37 exclusively, and all three are claimed by both plans and verified in code.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No TODO/FIXME/placeholder comments. No empty implementations. No `any` types. No `'use client'` in `related-articles.tsx`. No hardcoded empty data passed to rendering paths. The grep match in `related-articles.tsx` line 5 for "any" is in a comment ("any page that needs...") — not a type usage.

### Human Verification Required

#### 1. Blog Post Compare CTA Renders Live

**Test:** Navigate to a published blog post whose slug is `tenantflow-vs-buildium-comparison` (or any of the 3 competitor comparison blog posts). Scroll past the article content.
**Expected:** A blue-accent CTA box appears with text "Compare TenantFlow vs Buildium side-by-side" and a link to `/compare/buildium` that works.
**Why human:** `blog-post-page.tsx` is a `'use client'` component; it fetches blog content from Supabase at runtime. The conditional CTA only renders if the post exists in the database and has the matching slug — cannot be verified without a live dev server and published blog posts.

#### 2. Compare Page Shows Related Articles Section

**Test:** Visit `/compare/buildium`, `/compare/appfolio`, and `/compare/rentredi` in a browser.
**Expected:** A "Read the Full Comparison" section appears between the "Why Switch" section and the bottom CTA, containing a BlogCard for the corresponding blog post.
**Why human:** `RelatedArticles` queries Supabase for published posts matching the blogSlug at request time. If the blog post does not exist or is not published, the component returns null and no section renders. Visual confirmation requires live database state.

#### 3. Resource Pages Show Related Blog Posts

**Test:** Visit `/resources/seasonal-maintenance-checklist`, `/resources/landlord-tax-deduction-tracker`, and `/resources/security-deposit-reference-card` in a browser.
**Expected:** A "Related Blog Posts" section appears before the "Track maintenance requests digitally" footer CTA on each page, with a BlogCard linking to the corresponding blog post.
**Why human:** Same as above — RelatedArticles renders null when no published posts match. Requires live published blog posts in the database to visually confirm the section renders.

### Gaps Summary

No gaps. All 9 must-haves are VERIFIED in code. Human verification is needed to confirm that the blog posts referenced in `BLOG_TO_COMPETITOR`, `BLOG_TO_RESOURCE`, and `RESOURCE_TO_BLOGS` actually exist and are published in the Supabase database — the cross-links are all wired correctly in code, but the linked content must be present for the sections to render.

---

_Verified: 2026-04-10T13:25:00Z_
_Verifier: Claude (gsd-verifier)_
