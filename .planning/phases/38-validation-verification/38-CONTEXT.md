---
phase: 38
name: Validation & Verification
status: decided
decisions: 6
deferred: 0
---

# Phase 38: Validation & Verification — Context

## Domain Boundary

Final validation phase for v1.6 SEO milestone. Verifies all SEO work end-to-end, enhances sitemap completeness, and ensures full regression pass. No new SEO features — purely verification and gap-filling.

## Decisions

### D-01: GSC Verification — DNS already active, no meta tag needed
**Type:** Scope reduction
**Status:** Locked

Google Search Console is verified via DNS (domain name provider). No `metadata.verification.google` meta tag needed in root layout. VALID-01 requirement satisfied by existing DNS verification — implementation is a no-op with documentation.

**What this means for planner:** Skip meta tag implementation. Document in SUMMARY that VALID-01 is satisfied via DNS verification. No code changes for this requirement.

### D-02: E2E Test Scope — All public pages with deep validation
**Type:** Testing
**Status:** Locked

E2E SEO smoke tests cover ALL public pages: homepage, /pricing, /features, /blog, /blog/[slug], /compare/[competitor], /faq, /about, /contact, /help, /support, /resources, /resources/[each], /terms, /privacy, /security-policy.

Assertions per page (deep validation):
- `<title>` exists and is non-empty
- `<meta name="description">` exists and is non-empty
- `<link rel="canonical">` exists and points to correct URL
- At least one `<script type="application/ld+json">` exists
- Parse JSON-LD content and validate schema `@type` matches expected type per page
- Verify OG tags (`og:title`, `og:description`, `og:url`) exist
- Verify canonical URL matches the page URL

**What this means for planner:** Create comprehensive Playwright test spec covering all public routes. Map each route to its expected JSON-LD schema type(s). Use page.evaluate() to parse and validate JSON-LD content.

### D-03: Sitemap Full Overhaul
**Type:** Implementation
**Status:** Locked

Sitemap enhancements go beyond CRAWL-05/CRAWL-06 minimums:
1. Add missing pages: `/support`, `/security-policy`
2. Add blog category pages: `/blog/category/[category]` for each category
3. Add compare pages: `/compare/buildium`, `/compare/appfolio`, `/compare/rentredi`
4. Add resource pages: `/resources/seasonal-maintenance-checklist`, `/resources/landlord-tax-deduction-tracker`, `/resources/security-deposit-reference-card`
5. Use git-aware or static dates for non-blog pages instead of `currentDate` (static pages rarely change)
6. Blog posts already use `published_at` (line 164 of sitemap.ts) — confirmed correct

**What this means for planner:** Refactor `src/app/sitemap.ts` to add compare, resource, and missing support/legal pages. Replace `currentDate` with meaningful static dates for pages that don't change frequently. Add blog category dynamic entries.

### D-04: Blog category pages in sitemap need dynamic discovery
**Type:** Architecture
**Status:** Claude's Discretion

Blog categories should be discovered from the database (query distinct categories from published posts) rather than hardcoded. This ensures new categories automatically appear in the sitemap.

### D-05: Regression pass scope
**Type:** Testing
**Status:** Locked

VALID-03 requires full regression: `pnpm typecheck && pnpm lint && pnpm test:unit` must pass clean. This is verification of existing state, not new test creation (beyond the E2E SEO tests in D-02).

### D-06: Compare and resource pages in sitemap
**Type:** Scope expansion
**Status:** Locked

Per user's "full overhaul" choice, sitemap includes compare pages (3 competitors from COMPETITORS config) and resource pages (3 resources). These are static routes with known slugs — no DB query needed.

## Canonical Refs

- `src/app/sitemap.ts` — Current sitemap implementation (refactor target)
- `src/app/compare/[competitor]/compare-data.ts` — COMPETITORS record for compare page slugs
- `src/lib/content-links.ts` — RESOURCE_TO_BLOGS for resource page slugs
- `tests/e2e/tests/` — Existing E2E test location (health-check.spec.ts, homepage.spec.ts)
- `src/app/layout.tsx` — Root layout (no meta tag changes needed per D-01)
- `.planning/REQUIREMENTS.md` — VALID-01, VALID-02, VALID-03, CRAWL-05, CRAWL-06

## Existing Assets

- `src/app/sitemap.ts` — Working sitemap with blog post dynamic entries, needs additions
- `tests/e2e/tests/health-check.spec.ts` — Existing E2E pattern to follow
- `tests/e2e/tests/homepage.spec.ts` — Existing homepage E2E test
- `COMPETITORS` from `compare-data.ts` — 3 competitor slugs for sitemap
- `RESOURCE_TO_BLOGS` from `content-links.ts` — 3 resource slugs for sitemap
- Blog categories queryable via `supabase.from('blogs').select('category')`

## Specifics

- User wants thorough coverage — all public pages tested, not just key ones
- Deep JSON-LD validation, not just presence checks
- Sitemap should be complete enough that GSC shows no missing pages

## Deferred Ideas

None — discussion stayed within phase scope

---

*Phase: 38-validation-verification*
*Context gathered: 2026-04-10*
