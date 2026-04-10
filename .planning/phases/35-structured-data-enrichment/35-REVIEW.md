---
phase: 35-structured-data-enrichment
reviewed: 2026-04-09T18:42:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - src/app/blog/[slug]/blog-post-page.tsx
  - src/app/blog/[slug]/page.tsx
  - src/app/blog/category/[category]/page.tsx
  - src/app/blog/page.tsx
  - src/app/compare/[competitor]/page.tsx
  - src/app/help/page.tsx
  - src/app/page.tsx
  - src/app/privacy/page.tsx
  - src/app/resources/landlord-tax-deduction-tracker/page.tsx
  - src/app/resources/seasonal-maintenance-checklist/page.tsx
  - src/app/resources/security-deposit-reference-card/page.tsx
  - src/app/security-policy/page.tsx
  - src/app/support/page.tsx
  - src/app/terms/page.tsx
  - src/lib/seo/__tests__/article-schema.test.ts
  - src/lib/seo/__tests__/software-application-schema.test.ts
  - src/lib/seo/article-schema.ts
  - src/lib/seo/software-application-schema.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 35: Code Review Report

**Reviewed:** 2026-04-09T18:42:00Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Reviewed 18 files covering the structured data enrichment phase: BreadcrumbList JSON-LD added to 12 static/marketing pages, Article JSON-LD for blog posts, SoftwareApplication JSON-LD for comparison pages, WebSite schema on the homepage, and HowTo schema on the seasonal maintenance checklist. Two new factory modules (article-schema.ts, software-application-schema.ts) with full test suites.

Overall quality is good. The JsonLdScript component properly escapes angle bracket characters to prevent script injection in JSON-LD output. The schema-dts types enforce schema correctness at compile time. The inline style tags on resource pages for print CSS use static strings only (no user input), so no security concern there.

Three warnings identified: a breadcrumb path mismatch in the blog post page, a wordCount falsy check that would drop a zero value, and placeholder text in the Terms of Service.

## Warnings

### WR-01: Blog post breadcrumb path does not match actual route

**File:** `src/app/blog/[slug]/page.tsx:91`
**Issue:** The breadcrumb path is constructed as `/blog/category/${categorySlug}/${slug}`, but the actual route for a blog post is `/blog/${slug}` (not nested under category). This produces a BreadcrumbList with an intermediate item pointing to a URL like `/blog/category/property-management/some-post` which is not a real route. Search engines may flag this as an invalid breadcrumb trail.
**Fix:**
```typescript
// Current (wrong path):
const breadcrumbSchema = post
  ? createBreadcrumbJsonLd(
      `/blog/category/${categorySlug}/${slug}`,
      {
        [categorySlug]: post.category ?? categorySlug,
        [slug]: post.title ?? slug
      }
    )
  : null

// Fixed (match actual route, still show category as logical parent):
const breadcrumbSchema = post
  ? createBreadcrumbJsonLd(
      `/blog/${slug}`,
      {
        [slug]: post.title ?? slug
      }
    )
  : null
```
If the intent is to show the category in the breadcrumb trail, the createBreadcrumbJsonLd function would need a separate mechanism to inject a logical parent that differs from the URL path. As-is, it generates a URL segment `/blog/category/property-management/some-post` that 404s.

### WR-02: wordCount spread uses falsy check -- drops valid zero

**File:** `src/lib/seo/article-schema.ts:57`
**Issue:** The expression `...(wordCount ? { wordCount } : {})` treats `0` as falsy and would omit `wordCount: 0` from the schema. While a zero word count is unlikely for a real blog post, the pattern is a correctness issue -- if wordCount is computed from an empty content field, it silently drops the field rather than including `0`. The same falsy pattern is used for image, keywords, and timeRequired, but those are string/array types where empty string or empty array are genuinely invalid, so the pattern is correct there.
**Fix:**
```typescript
// Current:
...(wordCount ? { wordCount } : {}),

// Fixed:
...(wordCount != null ? { wordCount } : {}),
```

### WR-03: Terms of Service contains placeholder text

**File:** `src/app/terms/page.tsx:412`
**Issue:** Section 11.2 (Arbitration Agreement) contains `[Your State/Location]` -- a placeholder that was never filled in. Section 14 (Governing Law) at line 460 contains `[Your State]`. These are user-visible on the live site and make the legal page look incomplete.
**Fix:** Replace `[Your State/Location]` and `[Your State]` with the actual jurisdiction (e.g., "the State of Texas" or wherever the business is registered).

## Info

### IN-01: Unused searchParams prop in BlogCategoryPage component

**File:** `src/app/blog/category/[category]/page.tsx:30`
**Issue:** The BlogCategoryPage component declares `{ params }: CategoryPageProps` but the CategoryPageProps interface also includes searchParams. The searchParams is used in generateMetadata but not in the page component itself. This is not a bug (Next.js passes both props regardless), but the unused destructure position is noise.
**Fix:** No action needed -- the interface is shared between generateMetadata and the page component, which is standard Next.js practice.

### IN-02: Duplicated print styles across three resource pages

**File:** `src/app/resources/landlord-tax-deduction-tracker/page.tsx:22-30`
**File:** `src/app/resources/seasonal-maintenance-checklist/page.tsx:131-142`
**File:** `src/app/resources/security-deposit-reference-card/page.tsx:84-95`
**Issue:** Three resource pages each inject near-identical `@media print` styles via inline style tags. The content is static (no user input) so there is no security risk, but the pattern is duplicated across three files. These print styles could be consolidated into globals.css under a shared selector.
**Fix:** Move shared print styles to globals.css:
```css
@media print {
  nav, footer, .print\:hidden { display: none !important; }
  .page-break { page-break-before: always; }
  table { page-break-inside: avoid; }
}
```

---

_Reviewed: 2026-04-09T18:42:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
