---
phase: 38-validation-verification
plan: "02"
subsystem: e2e-testing
tags: [seo, e2e, playwright, validation, regression]
dependency_graph:
  requires: [38-01]
  provides: [VALID-02, VALID-03]
  affects: [tests/e2e/tests/public/seo-smoke.spec.ts, tests/e2e/playwright.config.ts]
tech_stack:
  added: []
  patterns: [playwright-page-evaluate-json-ld, assertPageSeo-helper, locator-count-check]
key_files:
  created:
    - tests/e2e/tests/public/seo-smoke.spec.ts
  modified:
    - tests/e2e/playwright.config.ts
decisions:
  - "Use locator.count() before getAttribute() for dynamic route fallback to avoid timeout errors"
  - "Add NEXT_PUBLIC_APP_URL and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to playwright webServer env to prevent client-side t3-env validation error"
  - "Dynamic blog/category routes skip gracefully when no test DB data — correct behavior"
metrics:
  duration: "~45 minutes"
  completed: "2026-04-10T19:48:31Z"
  tasks_completed: 2
  files_changed: 3
requirements:
  - VALID-02
  - VALID-03
---

# Phase 38 Plan 02: E2E SEO Smoke Tests and Regression Pass Summary

**One-liner:** Playwright SEO smoke tests covering 20 public routes with JSON-LD @type validation, plus full regression (1610 unit tests, typecheck, lint) all green.

## Objective

Create comprehensive E2E SEO smoke tests covering all public pages with deep metadata and JSON-LD validation, then run full regression to confirm all existing tests pass.

## What Was Built

### VALID-02: E2E SEO Smoke Tests

Created `tests/e2e/tests/public/seo-smoke.spec.ts` — a Playwright spec in the `public` project (no auth) covering 20 routes:

**Static routes (18 tests):**
- `/` — asserts `WebSite`, `Organization`
- `/pricing` — asserts `Product`, `FAQPage`, `BreadcrumbList`
- `/features` — asserts `BreadcrumbList`
- `/blog` — asserts `BreadcrumbList`
- `/faq` — asserts `FAQPage`, `BreadcrumbList`
- `/about` — asserts `BreadcrumbList`
- `/contact` — asserts `BreadcrumbList`
- `/help` — asserts `BreadcrumbList`
- `/support` — asserts `BreadcrumbList`
- `/resources` — asserts `BreadcrumbList`
- `/terms` — asserts `BreadcrumbList`
- `/privacy` — asserts `BreadcrumbList`
- `/security-policy` — asserts `BreadcrumbList`
- `/login` — asserts `Organization` (global layout only)
- `/compare/buildium` — asserts `Organization` (global layout only)
- `/resources/seasonal-maintenance-checklist` — asserts `Organization` (no page-specific JSON-LD)
- `/resources/landlord-tax-deduction-tracker` — asserts `Organization`
- `/resources/security-deposit-reference-card` — asserts `Organization`

**Dynamic routes (2 tests, skip-aware):**
- `/blog/[slug]` — navigates to `/blog`, finds first article link, asserts `Article`, `BreadcrumbList`; skips if no posts in DB
- `/blog/category/[category]` — navigates to `/blog`, finds first category link, asserts `BreadcrumbList`; skips if no categories in DB

**Per-page assertions:** title non-empty, meta description non-empty, canonical exists, og:title non-empty, og:description non-empty, og:url exists, at least one JSON-LD schema, expected `@type` values present.

**Test results:** 18 passed, 2 skipped (no blog data in local test Supabase instance — expected).

### VALID-03: Full Regression Pass

| Check | Result |
|-------|--------|
| `pnpm typecheck` (tsc --noEmit) | PASS — 0 errors |
| `pnpm lint` (eslint src/**) | PASS — 0 errors |
| `pnpm test:unit` (vitest) | PASS — 1610 tests, 125 files, 0 failures |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed playwright webServer missing required env vars**
- **Found during:** Task 1 first run
- **Issue:** `tests/e2e/playwright.config.ts` webServer command removes `.env.local` then starts Next.js, but `src/env.ts` validates `NEXT_PUBLIC_APP_URL` (required URL) and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (required `pk_` prefix) on the client side. `SKIP_ENV_VALIDATION` is not a `NEXT_PUBLIC_` var so client-side validation still ran, causing a runtime error overlay and empty page title.
- **Fix:** Added `NEXT_PUBLIC_APP_URL=http://localhost:3050` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder` to both the webServer bash command and the `env:` object in playwright config.
- **Files modified:** `tests/e2e/playwright.config.ts`
- **Commit:** e901ca1e6

**2. [Rule 1 - Bug] Fixed dynamic route locator timeout**
- **Found during:** Task 1 blog slug test
- **Issue:** `locator.getAttribute()` throws `TimeoutError` when element not found (10s timeout) rather than returning null. The plan's `test.skip(!href)` pattern assumed getAttribute returns null for missing elements.
- **Fix:** Added `locator.count() === 0` check before `getAttribute()` to correctly detect absent elements without timing out.
- **Files modified:** `tests/e2e/tests/public/seo-smoke.spec.ts`
- **Commit:** e901ca1e6

## Known Stubs

None — all tests assert real rendered content from the live Next.js dev server.

## Threat Flags

None — E2E spec performs read-only GET requests to public pages. No new data access patterns, auth flows, or user inputs introduced.

## v1.6 Milestone Status

Phase 38 is the final phase of v1.6 SEO & Google Indexing Optimization. All 7 phases complete:
- Phase 32: Crawlability critical fixes
- Phase 33: SEO utilities foundation
- Phase 34: Per-page metadata
- Phase 35: Structured data enrichment
- Phase 36: Pricing page polish
- Phase 37: Content SEO & internal linking
- Phase 38: Validation & verification (this phase)

v1.6 is ready for merge to main.

## Self-Check

- [x] `tests/e2e/tests/public/seo-smoke.spec.ts` exists — 181 lines, 20 test() calls
- [x] `tests/e2e/playwright.config.ts` modified with env var fix
- [x] commit e901ca1e6 exists
- [x] typecheck passes (0 errors)
- [x] lint passes (0 errors)
- [x] unit tests pass (1610/1610)
- [x] E2E public tests: 18 passed, 2 skipped (correct)

## Self-Check: PASSED
