---
phase: 12-quality-brand-guardrails
plan: 03
subsystem: seo
tags: [seo, eeat, json-ld, blog, admin, e2e, playwright, vitest, regression-lock]

# Dependency graph
requires:
  - phase: 12-quality-brand-guardrails (plan 02)
    provides: /admin/blog approve/reject surface + (admin) is_admin route-group wall
  - phase: 11-blog-ingest
    provides: in-review blog drafts (status='in-review', author_user_id=null), seed slug tenant-screening-tips-for-new-landlords
provides:
  - "Regression lock pinning null-author posts to the Organization 'TenantFlow Team' Article byline (JSON-LD)"
  - "E2E coverage: non-admin redirect off /admin/blog (is_admin wall) + admin approve-surface assertion (credential-gated)"
affects: [blog publishing pipeline, E-E-A-T author attribution, admin tooling regression guards]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Author-attribution regression lock: pin createArticleJsonLd Organization vs Person branch at the JSON-LD boundary"
    - "Credential-gated E2E: env-var-presence test.skip() (mirrors admin-analytics.spec.ts) so missing CI secrets document the gap instead of inventing credentials"
    - "Robust non-admin redirect assertion: waitForURL(/dashboard|login) + URL-not-/admin/blog + review-heading absent (defense against soft-render before redirect)"

key-files:
  created:
    - src/lib/seo/article-schema.test.ts
    - tests/e2e/tests/admin-blog-review.spec.ts
  modified: []

key-decisions:
  - "No production code change: page.tsx already passes authorType:'Organization'/authorName:'TenantFlow Team' unconditionally, and blog-post-page.tsx's visible byline is the literal 'TenantFlow Team' (the prop type does not even carry author_user_id). Verification + regression lock only."
  - "Spec placed under tests/e2e/tests/ (the Playwright testDir) rather than the plan's literal tests/e2e/admin-blog-review.spec.ts, which sits outside testDir and would never be collected."
  - "Test B (admin approve) is test.skip behind E2E_ADMIN_EMAIL/PASSWORD: the only is_admin account (e2e-admin@tenantflow.app) has subscription_status='expired' and no creds in .env.local / CI secrets. No accounts, secrets, or subscription rows were modified."

patterns-established:
  - "JSON-LD author-type regression test guards E-E-A-T attribution (threat T-12-11) so no Person byline can leak onto auto-generated content"
  - "E2E is_admin wall regression guard (threat T-12-10): a non-admin authenticated owner is redirected away from /admin/blog"

requirements-completed: [BLOG-06, BLOG-07]

# Metrics
duration: ~15min
completed: 2026-06-09
tasks-completed: 2
files-changed: 2
commits: 2
---

# Phase 12 Plan 03: E-E-A-T Byline Regression-Lock + Admin E2E Summary

Locked the Organization "TenantFlow Team" Article byline for generated (null-author) blog posts with a JSON-LD regression test, and added E2E coverage proving the `(admin)` `is_admin` wall redirects non-admins off `/admin/blog` plus a credential-gated admin approve-surface assertion. The byline was already correct in production code, so this is verification + regression locking, not a fix.

## What Was Built

### Task 1 — Regression-lock the Organization byline (verification, no production change)
Read-first confirmed all three pre-resolved facts hold on this branch:

- `src/app/blog/[slug]/page.tsx` calls `createArticleJsonLd({ authorName: "TenantFlow Team", authorType: "Organization", ... })` **unconditionally** (it branches only on `published_at`, never on `author_user_id`).
- `src/app/blog/[slug]/blog-post-page.tsx` renders the literal `"TenantFlow Team"` visible byline; its `BlogPostProps` type does not even carry `author_user_id`, so a null author cannot change it.
- `src/lib/seo/article-schema.ts` defaults `authorType` to `'Person'` and passes it straight to `author["@type"]`.

So **no production code change was needed**. Created `src/lib/seo/article-schema.test.ts` pinning:
1. `authorType: 'Organization'` → `author["@type"] === 'Organization'` & `author.name === 'TenantFlow Team'` (null-author E-E-A-T branch).
2. omitted `authorType` → `author["@type"] === 'Person'` (back-compat default).
3. explicit `authorType: 'Person'` → `author["@type"] === 'Person'` (explicit human branch).

No `any`, no `as unknown as` (the schema-dts `author` union is narrowed via a typed object annotation), no `.skip`.

### Task 2 — E2E: non-admin redirect + admin approve surface
Created `tests/e2e/tests/admin-blog-review.spec.ts` (placed in the Playwright `testDir`, alongside `admin-analytics.spec.ts`, reusing its UI-login pattern):

- **Test A (runs in CI e2e-smoke):** authenticate as the non-admin synthetic owner (`E2E_OWNER_EMAIL`/`PASSWORD` = `e2e-owner-a@tenantflow.app`, `is_admin=false`, `active`), navigate to `/admin/blog`, assert the `(admin)` layout redirects away (`waitForURL(/dashboard|login)`, URL not containing `/admin/blog`, and the "Blog Review" heading absent). Guards threat **T-12-10** (Elevation of Privilege).
- **Test B (documented `test.skip`):** gated behind `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`. When present it logs in as admin, asserts the "Blog Review" heading, and (branching on the "No drafts to review" empty state so it never mutates prod data) asserts the Approve/Reject controls render. The skip carries a comment explaining the missing-CI-credential reason.

## How the E2E Handles the Missing Admin Credentials
The only `is_admin=true` synthetic account, `e2e-admin@tenantflow.app`, has `subscription_status='expired'` and there is no `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` in `.env.local` or CI secrets — so an admin approve flow cannot run in CI. Per the plan's interfaces block, Test B is `test.skip(!adminEmail || !adminPassword, ...)` with a comment, and Test A still proves the gate using the non-admin owner account. No account subscription was modified, no GitHub secret was added or changed, and no credentials were written to any env file.

## Was a Production Byline Fix Needed?
No. The Article JSON-LD already emits `authorType: 'Organization'`/`name: 'TenantFlow Team'` unconditionally for every published post, and the visible byline is a hardcoded brand string. The work was verification + a regression test that locks the mapping going forward.

## Deviations from Plan

### Path reconciliation (Rule 3 — blocking issue)
**[Rule 3 - Blocking] Spec path moved into the Playwright testDir.**
- **Found during:** Task 2.
- **Issue:** The plan specified `tests/e2e/admin-blog-review.spec.ts`, but `playwright.config.ts` sets `testDir: "./tests"` (resolving to `tests/e2e/tests/`). A spec at the literal plan path sits outside `testDir` and is never collected by Playwright — so the verify step (`bunx playwright test tests/e2e/admin-blog-review.spec.ts`) would find zero tests.
- **Fix:** Placed the spec at `tests/e2e/tests/admin-blog-review.spec.ts` next to the sibling `admin-analytics.spec.ts`. Confirmed via `playwright test --list` that both tests are discovered.
- **Files:** `tests/e2e/tests/admin-blog-review.spec.ts`.
- **Commit:** `8c1b728`.

### Pre-resolved-fact correction (documented, not a fix)
The execution brief stated `src/lib/seo/article-schema.test.ts` already existed (from PR #674). On this branch it did **not** exist (only `article-schema.ts` was present), so the file was created from scratch rather than extended. The production byline facts in the brief were all confirmed accurate.

## Verification Results
- `bun run test:unit -- src/lib/seo/article-schema.test.ts` — 1 file, **3 tests passed**.
- `bun run typecheck` (`tsc --noEmit`) — clean.
- `bunx biome check src/lib/seo/article-schema.test.ts tests/e2e/tests/admin-blog-review.spec.ts` — clean, no fixes.
- E2E project typecheck (`tests/e2e/tsconfig.json`) — **zero errors reference the new spec**. (148 pre-existing `TS6133`/`TS2307` errors live in `tests/_archived/**` and `tests/owner/**` — out of scope, logged not fixed.)
- `bunx playwright test --list` — both tests discovered and parse cleanly. The Playwright run itself was not executed (needs prod + the full harness), per the execution brief.
- Pre-commit hooks (gitleaks, lockfile-verify, lint, typecheck, unit-tests + coverage) and commitlint passed on both commits.

## Out-of-Scope / Deferred Issues
Pre-existing e2e typecheck warnings in `tests/_archived/**` (148) and unused-import `TS6133` warnings in `tests/owner/**` and `tests/helpers/form-helpers.ts` (30) were observed but NOT fixed — they predate this plan and are unrelated to the byline/E2E scope. The `biome.json` `$schema` version pin (`2.4.15`) lags the installed Biome CLI (`2.4.16`), surfacing a non-blocking `info` during lint; pre-existing, not addressed here.

## Known Stubs
None. No empty-data placeholders, TODO/FIXME markers, or unwired components were introduced.

## Threat Flags
None. No new network endpoints, auth paths, file access, or schema surface introduced — only test files.

## Commits
- `92355c1` — `test(12-03): regression-lock Organization byline for null-author posts`
- `8c1b728` — `test(12-03): e2e for admin blog-review gate and approve surface`

## Self-Check: PASSED
- `src/lib/seo/article-schema.test.ts` — FOUND
- `tests/e2e/tests/admin-blog-review.spec.ts` — FOUND
- `.planning/phases/12-quality-brand-guardrails/12-03-SUMMARY.md` — FOUND
- commit `92355c1` — FOUND
- commit `8c1b728` — FOUND
