---
phase: 33-seo-utilities-foundation
reviewed: 2026-04-08T19:15:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - src/components/seo/json-ld-script.tsx
  - src/lib/seo/breadcrumbs.ts
  - src/lib/seo/page-metadata.ts
  - src/lib/seo/article-schema.ts
  - src/lib/seo/faq-schema.ts
  - src/lib/seo/product-schema.ts
  - src/components/seo/__tests__/json-ld-script.test.tsx
  - src/lib/seo/__tests__/breadcrumbs.test.ts
  - src/lib/seo/__tests__/page-metadata.test.ts
  - src/lib/seo/__tests__/article-schema.test.ts
  - src/lib/seo/__tests__/faq-schema.test.ts
  - src/lib/seo/__tests__/product-schema.test.ts
  - package.json
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 33: Code Review Report

**Reviewed:** 2026-04-08T19:15:00Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

The SEO utilities foundation introduces six well-structured modules: a reusable `JsonLdScript` component with XSS escaping, and five schema factory functions (`breadcrumbs`, `page-metadata`, `article-schema`, `faq-schema`, `product-schema`). All use `schema-dts` types for type safety and follow project conventions (kebab-case files, `#lib/*` path aliases, no `any` types, no barrel files). Test coverage is thorough with 40+ test cases across 6 test files.

The XSS escaping approach (`<` to `\u003c`) in `JsonLdScript` is the industry-standard pattern and is correct. The `schema-dts` dependency is properly placed in `devDependencies`.

One warning found: `createPageMetadata` does not validate that `path` starts with `/`, which can produce malformed canonical URLs. Two info-level items for dead complexity and missing edge case coverage.

## Warnings

### WR-01: Missing leading slash validation in createPageMetadata produces malformed canonical URLs

**File:** `src/lib/seo/page-metadata.ts:20`
**Issue:** The `path` parameter is concatenated directly with `siteUrl` on line 20: `const canonicalUrl = \`${siteUrl}${path}\``. If a caller passes `'faq'` instead of `'/faq'`, the result is `https://tenantflow.appfaq` -- a broken canonical URL. This same pattern affects the OG `url` field on line 32. Since this is a public utility intended to be called from multiple page files, defensive validation prevents silent SEO breakage that is hard to detect (search engines will see an invalid canonical).
**Fix:**
```typescript
export function createPageMetadata(config: PageMetadataConfig): Metadata {
  const { title, description, path, noindex, ogImage } = config
  const siteUrl = getSiteUrl()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const canonicalUrl = `${siteUrl}${normalizedPath}`
  // ... rest unchanged
```

## Info

### IN-01: Unnecessary Object.entries reduce in JsonLdScript context wrapping

**File:** `src/components/seo/json-ld-script.tsx:20`
**Issue:** When adding `@context`, the code reconstructs the schema object via `Object.entries(schema).reduce<Record<string, unknown>>((acc, [k, v]) => { acc[k] = v; return acc }, {})`. This is equivalent to a simple spread `{ '@context': 'https://schema.org', ...schema }` since `schema` is always a plain object (schema-dts types are interfaces, not classes). The reduce adds complexity without benefit.
**Fix:**
```typescript
const jsonString = hasContext
  ? JSON.stringify(schema)
  : JSON.stringify({ '@context': 'https://schema.org', ...schema })
```

### IN-02: article-schema slug parameter not validated for path safety

**File:** `src/lib/seo/article-schema.ts:53`
**Issue:** The `slug` parameter is interpolated directly into the `mainEntityOfPage` URL: `\`${siteUrl}/blog/${slug}\``. If a slug contains characters like `../` or query strings, the resulting URL is malformed. Risk is low since slugs originate from the CMS/database, but as a general-purpose utility it could benefit from basic slug normalization (trim leading/trailing slashes, encode special characters).
**Fix:** Consider adding a simple guard:
```typescript
const safeSlug = encodeURIComponent(slug)
mainEntityOfPage: `${siteUrl}/blog/${safeSlug}`,
```

---

_Reviewed: 2026-04-08T19:15:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
