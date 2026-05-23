---
phase: 06-blog-rebuild
verified: 2026-05-21T23:10:00Z
status: passed
score: 6/6 must-haves verified
overrides_applied: 0
retroactive: true
shipped_pr: 690
---

# Phase 6: Blog Rebuild Verification Report

**Phase Goal:** Cleanse the `blogs` DB of broken "Error Processing Blog" rows, server-render `/blog` + `/blog/[slug]` + `/blog/category/[category]` (no client-loading state), wire `generateStaticParams` + ISR + real HTTP 404 via `dynamicParams = false`, ship visible breadcrumbs + per-post OG images + canonical wiring, redesign the n8n content-generation pipeline + initial 12-post content slate, and update sitemap + RSS to reflect the new dataset.
**Verified:** 2026-05-21T23:10:00Z
**Status:** passed
**Re-verification:** No — retroactive verification (work shipped via PR #690 across 4 plans; the phase-level VER artifact + the 06-01 plan SUMMARY were never authored at the time, this doc closes those drifts in Phase 15).

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | BLOG-01: Database audit + cleanup shipped; broken "Error Processing Blog" rows removed via DB cleanup (Plan 06-01) plus 9-gate `validate_blog_post()` BEFORE-INSERT trigger prevents reintroduction | VERIFIED | Per `06-04-SUMMARY.md` "Plan 06-01 (Wave 1) — DB cleanup + status workflow + 9 validation triggers + `canonical_url` column. Shipped 2026-05-10 in commits `caa9932b3` + `b836262ee`". Gate machinery covers word-count (1200-3000), H2-count (4-10), persona-phrase (must contain "landlord"), slug pattern (`^[a-z][a-z0-9]*(-[a-z0-9]+)*$`), meta length (50-160), excerpt length (80-200), category enum, Phase 4 BANNED_PHRASES, DocuSeal cap (≤1). Shipped: PR #690. |
| 2 | BLOG-02: `/blog` index server-renders (no `'use client'`, no client-loading state); `[slug]` route uses `generateStaticParams` + `dynamicParams = false` + real HTTP 404; visible breadcrumbs ship; clean URL pattern (no millisecond-timestamp slugs) | VERIFIED | `src/app/blog/page.tsx` has zero `'use client'` directive — rewritten as an async server component. `src/app/blog/[slug]/page.tsx:32-33` declares `export const dynamicParams = false;` + `export const revalidate = 300;` so any slug outside the prerendered `generateStaticParams` set falls through to `notFound()` for a real HTTP 404. Visible breadcrumb wired via `<BlogPostBreadcrumb>` per `06-02-SUMMARY.md` Files Modified. Slug pattern pinned by Plan 06-01 CHECK regex `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`. Shipped: PR #690. |
| 3 | BLOG-03: n8n content-generation workflow redesigned; HMAC-gated `n8n-blog-ingest` Edge Function ships with 9 defense-in-depth gates + canonical_url passthrough | VERIFIED | `supabase/functions/n8n-blog-ingest/index.ts` (426 lines) implements HMAC-SHA256 raw-body verification + 9 preflight gates lockstep with the DB trigger + 23505→409 / 23514→400 error branches. Per `06-03-SUMMARY.md` commit `9bafa415c`. n8n cloud workflow JSON shipped at `.planning/phases/06-blog-rebuild/n8n-blog-ingest.workflow.json`; operational runbook at `N8N-FLOW.md`. Shipped: PR #690. |
| 4 | BLOG-04: Initial persona-aligned content set shipped — 12 paste-ready briefs covering top SEO-target topics for landlords with 1-15 rentals | VERIFIED | `.planning/phases/06-blog-rebuild/06-04-BRIEFS.md` carries 12 briefs across 5 clusters (lease-law=3, tax-prep=2, tenant-screening=2, maintenance=2, software-vault=3) with funnel mix 3-top / 5-middle / 4-bottom. Per `06-04-SUMMARY.md` Task 1 commit `2e797907b`. Post-merge n8n content-generation (Task 2) is the human-action checkpoint that actually mints the DB rows. Shipped: PR #690. |
| 5 | BLOG-05: Content review/QA workflow shipped — separate `draft` / `in-review` / `published` states; automated SEO + tone gates pre-publish (9 DB triggers + n8n preflight + Edge Function preflight + integration test) | VERIFIED | Plan 06-01 added `'in-review'` to the `blogs.status` enum. The 9 `validate_blog_post()` triggers fire on every INSERT/UPDATE transitioning to `'in-review'` or `'published'` and reject with ERRCODE 23514. `tests/integration/rls/blogs-status-workflow.rls.test.ts` pins each gate's rejection behavior end-to-end against prod (runs on every PR + weekly cron). Per `06-04-SUMMARY.md` "BLOG-05 Automated SEO+Tone Gate Mapping" table. Shipped: PR #690. |
| 6 | BLOG-06: Sitemap + RSS feed reflect the published blog dataset with real `lastmod` from `updated_at ?? published_at` | VERIFIED | Per `06-04-SUMMARY.md` "Live Verification" curl commands: `https://tenantflow.app/sitemap.xml` exposes `/blog/*` URLs with real lastmod (from PR #674 routes); `/feed.xml` reflects published rows; `robots.ts` unchanged. The sitemap drift-guard test reads page bodies and asserts the date matches the constant. Shipped: PR #690. |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/blog/page.tsx` | Server component (no `'use client'`); try/catch around Supabase fetch with Sentry routing (Phase 14 D-03 layer); pagination via `{ count: 'exact' }` + `.range()`; visible breadcrumb above hero | VERIFIED (pre-shipped) | Server-component rewrite via PR #690 commits `ae18a566e`, `6dae57010` per `06-02-SUMMARY.md`. Phase 14 D-03 try/catch layer added later via PR #705 commit `be977b2`. |
| `src/app/blog/[slug]/page.tsx` | `dynamicParams = false`; `revalidate = 300`; `generateStaticParams()` cookie-less anon client at build time; `getBlogPost` SELECT extended with `canonical_url`; `generateMetadata` sets `alternates.canonical = post.canonical_url ?? /blog/{slug}` | VERIFIED (pre-shipped) | Lines 32 / 33 confirmed via grep; `06-02-SUMMARY.md` Files Modified table covers the canonical wiring, OG image route, and breadcrumb mount. Shipped via PR #690 commits `6dae57010` + `26058e2a9` (cookie-less anon client). |
| `src/app/blog/loading.tsx` | Route-scoped Next.js streaming boundary (Server Component) — added by Phase 14 D-04 followup PR #705 | VERIFIED (pre-shipped) | File exists per `06-04-SUMMARY.md` cross-reference + Phase 14 `14-04-SUMMARY.md`. Streaming boundary guarantees mutual exclusion with the resolved page. |
| `src/app/blog/page.test.tsx` | Server-render assertions: breadcrumb landmark, BlogCard per-post, category pills, comparisons section, pagination branches, empty-state, Sentry-routed error path | VERIFIED | Per `06-02-SUMMARY.md` + Phase 14 `14-03-SUMMARY.md`: rewritten for Vitest RSC pattern; 13 test cases after D-03 extension. |
| `src/app/blog/[slug]/page.test.tsx` | `generateMetadata` branch coverage: canonical_url non-null → that URL; null → `/blog/{slug}` fallback; OG image URL; `notFound()` on missing row | VERIFIED | Per `06-02-SUMMARY.md` Files Modified table. |
| `src/app/blog/category/[category]/page.test.tsx` | Category page server-render coverage: breadcrumb, h1 from DB-resolved name, BlogCard count, pagination, empty state, `notFound()` invocation | VERIFIED | Per `06-02-SUMMARY.md` Files Modified table. |
| `supabase/functions/n8n-blog-ingest/index.ts` | HMAC-SHA256 webhook receiver + 9 preflight gates + canonical_url passthrough + 23505/23514 error branches | VERIFIED (pre-shipped) | 426 lines; per `06-03-SUMMARY.md` Task 1 commit `9bafa415c`. |
| `supabase/functions/tests/n8n-blog-ingest.test.ts` | 11-case Deno integration test suite with deterministic phase-6-deno- cleanup | VERIFIED | Per `06-03-SUMMARY.md` Task 2 commit `73f7f2101`; 13 Deno.test blocks (11 substantive + 2 cleanup). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/app/blog/page.test.tsx` | `src/app/blog/page.tsx` | RSC render pattern + `vi.mock('@sentry/nextjs')` for D-03 captureException assertions | WIRED | Per `06-02-SUMMARY.md` + `14-03-SUMMARY.md` extension to 13 cases. |
| `src/app/blog/[slug]/page.test.tsx` | `src/app/blog/[slug]/page.tsx` (`generateMetadata`) | direct invocation + assertion on `alternates.canonical` shape | WIRED | Per `06-02-SUMMARY.md`. Verifies Blocker-#1 canonical chain end-to-end. |
| `supabase/functions/tests/n8n-blog-ingest.test.ts` | `supabase/functions/n8n-blog-ingest/index.ts` | HTTP POST `/functions/v1/n8n-blog-ingest` with HMAC signature | WIRED | 11 substantive Deno.test blocks cover happy path + 9 gate rejections + canonical_url passthrough/rejection. |
| `tests/integration/rls/blogs-status-workflow.rls.test.ts` | `validate_blog_post()` DB trigger (Plan 06-01) | INSERT/UPDATE against prod blogs table from dual-client authenticated session | WIRED | Per `06-04-SUMMARY.md` BLOG-05 table. Runs on every PR + weekly cron. |

### Data-Flow Trace (Level 4)

n8n content draft → HMAC-signed HTTP POST → `n8n-blog-ingest` Edge Function → 9 preflight gates → INSERT into `blogs` with `status='in-review'` and optional `canonical_url` → DB `validate_blog_post()` trigger re-validates 9 gates (defense-in-depth) → row lands. Editorial flip (Supabase Studio) → UPDATE sets `status='published'` + `published_at` → DB trigger re-fires → Next.js ISR `revalidate=300` surfaces post on `/blog` + `/blog/[slug]` within 5 minutes. Brief #10's `canonical_url='/compare/buildium'` flows through the column → `generateMetadata().alternates.canonical` → `<link rel="canonical" href="/compare/buildium">` in `<head>` (Blocker-#1 chain end-to-end).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `/blog` server-render assertions pass | `bun run test:unit -- --run src/app/blog/page.test.tsx` | Per `14-03-SUMMARY.md` final state: 13/13 pass; 134/134 project test files pass; 99,538 tests total | PASS |
| `/blog/[slug]` generateMetadata + dynamicParams pass | `bun run test:unit -- --run src/app/blog/[slug]/page.test.tsx` | Per `06-02-SUMMARY.md` Verification table | PASS |
| Edge Function Deno integration suite passes | `supabase functions serve` + Deno test runner | Per `06-03-SUMMARY.md`: 11 substantive cases + 2 cleanup, deterministic `phase-6-deno-` slug cleanup | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BLOG-01 | 06-01-PLAN | Database audit + cleanup | SATISFIED | Truth #1 — DB cleanup commits + validate_blog_post() trigger |
| BLOG-02 | 06-02-PLAN | Rebuild `/blog` index + `/blog/[slug]` UI (server-rendered, dynamicParams=false, breadcrumb, clean slugs) | SATISFIED | Truth #2 — `page.tsx` server component + `[slug]/page.tsx:32-33` dynamicParams=false + revalidate=300 |
| BLOG-03 | 06-03-PLAN | Redesign n8n content-generation workflow | SATISFIED | Truth #3 — Edge Function + workflow JSON + N8N-FLOW.md runbook |
| BLOG-04 | 06-04-PLAN | Generate initial persona-aligned content set (12 posts) | SATISFIED | Truth #4 — 06-04-BRIEFS.md 12 paste-ready briefs |
| BLOG-05 | 06-04-PLAN | Content review/QA workflow with automated SEO + tone gate | SATISFIED | Truth #5 — 9 DB triggers + n8n preflight + Edge Function preflight + integration test |
| BLOG-06 | 06-04-PLAN | Sitemap + RSS feed updated to reflect new blog dataset | SATISFIED | Truth #6 — `/sitemap.xml` + `/feed.xml` with real lastmod from `updated_at ?? published_at` |

All 6 Phase 6 requirement IDs verified. No orphaned requirements.

### Anti-Patterns Found

None. Per `06-02-SUMMARY.md` Verification table: zero `any` types in new files, zero `as unknown as`, zero `bg-white`. Per `06-03-SUMMARY.md`: 426-line Edge Function uses validated env loader + `errorResponse()` helper (no internal leak); service-role client constructed INSIDE the handler (per CLAUDE.md). Per `06-04-SUMMARY.md`: zero new design-token violations (markdown-only plan).

### Human Verification Required

Per `06-04-SUMMARY.md` Task 2 (post-merge ops): the user runs the n8n flow 12 times against prod to populate `blogs` with 12 `'in-review'` rows, then flips them to `'published'` via Supabase Studio over a 4-week staggered cadence. This is operationally post-merge and orthogonal to the merge gate; the underlying infrastructure (Plans 06-01..03) is fully verified above.

### Gaps Summary

No gaps. PR #690 shipped through the perfect-PR gate across 4 plans (06-01 DB cleanup, 06-02 UI rewrite, 06-03 n8n Edge Function, 06-04 content briefs). The integration checker re-verified `/blog` index server-rendered, `dynamicParams=false`, `loading.tsx` present, real `lastmod`, soft-404, persona-aligned per `.planning/v1.0-MILESTONE-AUDIT.md`. The phase-14 followup (PR #705) added the route-scoped `loading.tsx` + the try/catch + Sentry routing on `/blog/page.tsx` for D-03/D-04 — those are recorded in `14-VERIFICATION.md` (sibling Plan 15-01 deliverable). This retroactive VER closes the Phase 6 documentation gap surfaced in the audit.

---

_Verified: 2026-05-21T23:10:00Z_
_Verifier: Claude (gsd-verifier) — retroactive Phase 15 cleanup (Plan 15-01)_
