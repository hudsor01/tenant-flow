---
phase: 38-validation-verification
reviewed: 2026-04-10T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/app/sitemap.test.ts
  - src/app/sitemap.ts
  - tests/e2e/playwright.config.ts
  - tests/e2e/tests/public/seo-smoke.spec.ts
  - tsconfig.json
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 38: Code Review Report

**Reviewed:** 2026-04-10T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Five files reviewed covering the sitemap implementation, its unit tests, the Playwright E2E config, a new SEO smoke spec, and tsconfig. The sitemap implementation is solid — error handling, ISR revalidation, deduplication, and timeout logic are all correct. Three warnings stand out: a leaked JWT in the playwright config, a stack trace exposure in the sitemap error logger, and a `tsconfig.json` that excludes the test files it intends to typecheck. Four info-level items cover minor gaps.

## Warnings

### WR-01: Hardcoded JWT anon key in playwright.config.ts

**File:** `tests/e2e/playwright.config.ts:32`
**Issue:** The Supabase anon (publishable) key fallback is hardcoded as a full JWT string literal in source code. Even though this is a well-known demo key used in Supabase local dev stacks, committing JWT strings establishes a pattern that gitleaks may or may not flag (the key does not match a typical secret regex), and it leaks the expected token structure to anyone reading the repo. The `.env.test` file is the correct place for all key values — the fallback should be an empty string or a clearly labelled placeholder string.
**Fix:**
```typescript
// Replace line 32:
const LOCAL_SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''
// Keep the .env.test file as the sole source of truth for the key value.
// If the env var is missing, Playwright will fail loudly rather than silently using a stale token.
```

### WR-02: Stack trace included in error log metadata in sitemap.ts

**File:** `src/app/sitemap.ts:216`
**Issue:** The catch block passes `error.stack` directly into the logger metadata object. This runs on the server during ISR and the output goes to Vercel's log stream. Stack traces can expose internal file paths, dependency names, and module structure. CLAUDE.md explicitly forbids exposing stack traces to clients; while this log does not reach the browser, the project-wide principle is to log stack traces only to Sentry (where they are controlled), not to the structured log stream where they may be scraped or forwarded.
**Fix:**
```typescript
// sitemap.ts catch block — remove stack from metadata, let Sentry capture it separately
logger.error('Failed to generate blog sitemap entries', {
  action: 'generateBlogSitemap',
  route: '/sitemap.xml',
  timestamp: new Date().toISOString(),
  metadata: {
    error: error instanceof Error ? error.message : String(error)
    // stack omitted — captured by Sentry via automatic instrumentation
  }
})
```

### WR-03: tsconfig.json excludes test files but E2E spec uses path aliases

**File:** `tsconfig.json:122`
**Issue:** `tests/**/*` is in the `exclude` list, meaning TypeScript never checks the E2E tests at all. `seo-smoke.spec.ts` does not use `#`-prefixed aliases, so there is no import resolution failure today. However the Playwright config (`playwright.config.ts`) is also not in `include` — it lives in `tests/e2e/` and is excluded. If anyone adds a `#lib/*` import to an E2E spec (following project conventions), the typecheck step will silently pass while the runtime fails. The E2E files should either be included in a separate `tsconfig.e2e.json` that Playwright references, or the Playwright config path should be added to the root `include`.
**Fix:**
```jsonc
// Option A — add a tsconfig.e2e.json in tests/e2e/ that extends root:
// { "extends": "../../tsconfig.json", "include": ["./**/*.ts"] }
// and reference it in playwright.config.ts via the standard tsconfig option.

// Option B — add to root tsconfig.json include (simpler, but widens scope):
"include": [
  // ...existing entries...
  "tests/e2e/playwright.config.ts",
  "tests/e2e/tests/**/*.ts"
]
```

## Info

### IN-01: `currentDate` is recomputed on every ISR revalidation, not pinned

**File:** `src/app/sitemap.ts:14`
**Issue:** `const currentDate = new Date().toISOString()` is called at request time. With `revalidate = 86400` the value drifts by up to 24 hours between revalidations. For SEO crawlers, `lastModified` on a page that did not actually change triggers unnecessary re-crawl budget consumption. The marketing and content hub pages that use `currentDate` would be better served by a build-time constant or a well-known recent date string, consistent with the static-date pattern already used for compare, company, and legal pages.
**Issue is low-priority** — the current behaviour is functional and common. This is a crawl-budget hygiene observation.

### IN-02: `test.skip()` called without returning immediately in seo-smoke.spec.ts

**File:** `tests/e2e/tests/public/seo-smoke.spec.ts:155-156` and `170-171`
**Issue:** Both dynamic blog test cases call `test.skip()` and then `return` on separate lines. In Playwright, `test.skip()` throws internally so `return` is never reached — the pattern is redundant but harmless. The idiomatic form is just `test.skip()` without the guard `return`, or use `test.skip(condition, reason)` overload.
**Fix:**
```typescript
// Replace the guard pattern:
if (count === 0) {
  test.skip()
  return
}
// With the conditional overload:
test.skip(count === 0, 'No blog links found on /blog — skipping')
```

### IN-03: `makeQueryBuilder` initial call in mock uses wrong discriminator

**File:** `src/app/sitemap.test.ts:53`
**Issue:** The mock factory calls `makeQueryBuilder('slug, published_at')` as the initial `from()` result. The `isCategoryQuery` check inside compares against the exact string `'category'`. The first `.select()` call in the actual code for the category query is `.select('category')` — that triggers a new `makeQueryBuilder('category')` via the `select` mock, which correctly returns `mockCategoryRows`. This works because Playwright chains `.select()` before awaiting. However the initial discriminator string `'slug, published_at'` is not actually checked — any non-`'category'` string would produce the same result. The comment on line 29 says "resolves differently based on the `.select()` argument" which is accurate but the starting value is misleading. Not a bug, but reduces test readability.

### IN-04: `PUBLIC` project `testMatch` is overly broad

**File:** `tests/e2e/playwright.config.ts:225`
**Issue:** The `public` project matches both `**/public/**/*.spec.ts` and `**/*public*.spec.ts`. The second glob (`**/*public*.spec.ts`) would match any spec file with the word "public" anywhere in its filename — including hypothetical files like `non-public-routes.spec.ts` that belong to a different project. Narrowing to `**/public/**/*.spec.ts` alone is sufficient and matches the directory convention used by every other project.
**Fix:**
```typescript
testMatch: ['**/public/**/*.spec.ts']
// Remove: '**/*public*.spec.ts'
```

---

_Reviewed: 2026-04-10T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
