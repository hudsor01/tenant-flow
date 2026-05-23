# Phase 12: SEO Metadata, Schema & Content Cleanup - Research

**Researched:** 2026-05-21
**Domain:** Next.js 16 App Router SEO metadata + structured data + accessibility
**Confidence:** HIGH (all findings verified against codebase with file:line evidence)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** PR #674 shipped a broad SEO surface (sitemap with real `lastmod`, `robots.ts` per-bot allowlist, `llms.txt`/`llms-full.txt`/`humans.txt`, RSS `/feed.xml`, Article + BreadcrumbList JSON-LD, `Viewport` API, SEO meta-separator standardization). Several SEO-01..07 items are likely ALREADY DONE. Classify each requirement as shipped (→ regression-pin test) vs genuinely remaining (→ real work). Treat like Phases 7-11: verify-and-pin where shipped.
- **D-02 (SEO-01):** If a separator is already consistently in use, LOCK to whatever the codebase already uses (do not flip it) and pin it with a drift-guard-style test.
- **D-03 (SEO-03):** `Organization` JSON-LD site-wide (root layout) + `SoftwareApplication` JSON-LD on the homepage. Reuse the project's existing JSON-LD emission pattern.
- **D-04 (SEO-04/SEO-05 blog):** Blog slug cleanliness (SEO-04) and blog breadcrumbs (SEO-05 blog half) were delivered by Phase 6. This phase only VERIFIES them — no blog re-work.

### Claude's Discretion
- Exact OG-image approach for SEO-02 (static asset vs `next/og` `ImageResponse` route) — match the existing `opengraph-image.tsx` / `/api/og/*` pattern.
- Whether SEO-07's aria-current audit is satisfied by an existing test or needs a new audit test.

### Deferred Ideas (OUT OF SCOPE)
None — phase scope is SEO-01..07 only. Metadata/schema/SEO only — NOT content rewriting. No new design tokens.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Classification | Research Support |
|----|-------------|----------------|------------------|
| SEO-01 | One consistent meta-title separator; zero mixed usage | **PARTIALLY SHIPPED — real work** | Title template uses pipe `\|`, but 6 page titles use em-dash `—` or hyphen `-` internally. Mixed usage confirmed. |
| SEO-02 | Per-page OG images for `/pricing`, `/features`, `/compare/[competitor]` | **PARTIALLY SHIPPED — real work** | `/api/og/pricing` and `/api/og/compare/[competitor]` exist and are wired. `/features` has NO per-page OG image. |
| SEO-03 | `Organization` JSON-LD (root layout) + `SoftwareApplication` JSON-LD (homepage) | **SHIPPED — verify-and-pin** | Both schemas emit site-wide via `SeoJsonLd` in root layout `<head>`. Decision needed: accept site-wide `SoftwareApplication` or move homepage-only. |
| SEO-04 | Clean blog slugs (no millisecond timestamps) | **SHIPPED (Phase 6) — verify only** | Slugs sourced from DB `slug` column via `generateStaticParams`; `dynamicParams = false`. No timestamp generation in code. |
| SEO-05 | Visible breadcrumbs on `/compare/[competitor]` (blog covered by Phase 6) | **SHIPPED — verify-and-pin** | `CompareBreadcrumb` renders on every compare page; `BlogPostBreadcrumb` on blog. Both tested. |
| SEO-06 | Footer links to `/sitemap.xml`; `robots.txt` points at sitemap | **SHIPPED — verify-and-pin** | Footer Legal column has `Sitemap → /sitemap.xml`. `robots.ts` emits `sitemap: <url>/sitemap.xml`. |
| SEO-07 | Site-wide `aria-current="page"` audit, green report | **SHIPPED mechanically — needs audit test** | All 6 nav/breadcrumb surfaces emit `aria-current`. No single consolidated audit test exists. |
</phase_requirements>

## Summary

Phase 12 is, like Phases 7-11, **mostly verify-and-pin with two pockets of genuinely-remaining work**. PR #674 and Phase 6 already built the entire SEO infrastructure: structured data (`Organization` + `SoftwareApplication` + `WebSite` + `BreadcrumbList` + `Product` + `FAQ` + `Article`), per-route OG image generation via `next/og` edge routes, a per-bot `robots.ts` with sitemap declaration, a 14-link 4-column footer that already includes the sitemap link, visible breadcrumbs on both blog and compare pages, and clean DB-sourced blog slugs.

Two requirements have **real production work**: (1) **SEO-01** — title separator drift: the canonical separator is pipe `|` (the root layout `title.template` is `"%s | TenantFlow"` and `createPageMetadata`'s brand-suffix logic appends `| TenantFlow`), but six page titles use em-dash `—` (`/resources`, `/help`, `/blog`) or hyphen `-` (`/privacy`, `/support`, one resources subpage) as their *internal* separator. (2) **SEO-02** — `/features` is the one route in scope without a per-page OG image; `/pricing` and `/compare/[competitor]` already have `/api/og/*` routes wired.

SEO-03 is shipped but needs a planning decision: both `Organization` and `SoftwareApplication` are emitted **site-wide** from the root layout, not homepage-scoped for `SoftwareApplication`. The requirement says "homepage emits `SoftwareApplication`". The planner must decide: accept the site-wide emission as satisfying the requirement (it does appear on the homepage, plus everywhere else) or scope `SoftwareApplication` to the homepage only.

**Primary recommendation:** Lock the separator to **pipe `|`** (already the canonical template separator — do not flip it). Three plans: (1) SEO-01 separator normalization + drift-guard test, (2) SEO-02 `/features` OG route, (3) verify-and-pin SEO-03/04/05/06 + a new consolidated SEO-07 aria-current audit test.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Meta-title separator (SEO-01) | Frontend Server (RSC `metadata` exports) | — | Titles render at request/build time in `metadata` / `generateMetadata` exports — pure server-rendered `<head>` content |
| Per-page OG images (SEO-02) | CDN / Edge (`@vercel/og` edge routes) | Frontend Server (metadata wiring) | OG PNGs stream from `runtime = "edge"` routes, CDN-cached 1h; `metadata.openGraph.images` wires the URL |
| `Organization` / `SoftwareApplication` JSON-LD (SEO-03) | Frontend Server (RSC `<head>` injection) | — | `SeoJsonLd` is an RSC rendered into root layout `<head>`; no client involvement |
| Blog slug cleanliness (SEO-04) | Database / Storage | Frontend Server (`generateStaticParams`) | Slugs are the `blogs.slug` DB column; build-time enumeration only reads them |
| Visible breadcrumbs (SEO-05) | Frontend Server (RSC components) | — | `CompareBreadcrumb` / `BlogPostBreadcrumb` are RSC rendered into the page tree |
| Footer sitemap link (SEO-06) | Frontend Server (RSC footer) | — | `Footer` is a static RSC; `robots.ts` is a server route handler |
| `aria-current` audit (SEO-07) | Browser / Client (nav state) | Frontend Server (breadcrumb RSC) | Marketing nav components are `'use client'` (pathname-driven); breadcrumbs are RSC with hardcoded `aria-current` |

## Standard Stack

This phase touches an existing, settled stack. No new dependencies required.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.x | App Router `metadata` API, `generateMetadata`, `MetadataRoute` | [VERIFIED: codebase] Project framework |
| `@vercel/og` | installed | Edge-runtime OG image generation (`ImageResponse`) | [VERIFIED: codebase] Used by all 3 `/api/og/*` routes |
| `next/og` | bundled with Next | `ImageResponse` for file-convention `opengraph-image.tsx` | [VERIFIED: codebase] Used by root `src/app/opengraph-image.tsx` |
| `schema-dts` | installed | TypeScript types for schema.org JSON-LD | [VERIFIED: codebase] `JsonLdScript` props typed against `Thing`/`WithContext` |
| `vitest` | 4.x + jsdom | Unit + drift-guard tests | [VERIFIED: CLAUDE.md] Project test runner |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@vercel/og` edge route (`/api/og/features`) | File-convention `src/app/features/opengraph-image.tsx` | File-convention is more idiomatic Next.js, but the project has already standardized on `/api/og/*` routes (3 of them) with `runtime = "edge"`, `revalidate = 3600`, and an oklch gradient. Match the established pattern for consistency. |

**Installation:** None — all dependencies already present.

**Two `ImageResponse` import sources coexist in the repo (verified):**
- `src/app/opengraph-image.tsx` imports from `next/og`
- `src/app/api/og/*/route.tsx` imports from `@vercel/og`

For SEO-02 `/features`, follow the `/api/og/*` route pattern (`@vercel/og`) — that is the dominant pattern for the in-scope routes.

## Architecture Patterns

### System Data Flow

```
                          ┌─────────────────────────────────────┐
   Build / Request time   │  src/app/layout.tsx (RootLayout RSC) │
                          │  - generateMetadata() → site meta    │
                          │  - <head> renders <SeoJsonLd/>       │
                          └──────────────┬──────────────────────┘
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              ▼                          ▼                          ▼
   ┌────────────────────┐   ┌─────────────────────────┐  ┌──────────────────────┐
   │ generate-metadata  │   │  SeoJsonLd → getJsonLd() │  │  Per-page metadata   │
   │  .ts               │   │  emits [Organization,    │  │  exports:            │
   │  - title.template  │   │   SoftwareApplication]   │  │  createPageMetadata()│
   │    "%s | TenantFlow"│   │   site-wide              │  │  or generateMetadata │
   │  - default OG img  │   └─────────────────────────┘  │  - title (SEO-01)    │
   └────────────────────┘                                │  - openGraph.images  │
                                                          │    (SEO-02)          │
                                                          └──────────┬───────────┘
                                                                     │ ogImage URL
                                                                     ▼
                                                  ┌──────────────────────────────┐
                                                  │  Edge OG routes (CDN-cached)  │
                                                  │  /api/og/pricing      ✅      │
                                                  │  /api/og/compare/[c]  ✅      │
                                                  │  /api/og/features     ❌ MISS │
                                                  │  /api/og/blog/[slug]  ✅      │
                                                  └──────────────────────────────┘

   Page render tree (RSC):
   ┌─────────────────────────────────────────────────────────────┐
   │ /compare/[competitor] → <CompareBreadcrumb/>  (visible nav)   │
   │ /blog/[slug]          → <BlogPostBreadcrumb/> (visible nav)   │
   │ <PageLayout> → <Navbar> (client, isActiveLink → aria-current) │
   │            → <Footer> (RSC, Sitemap link → /sitemap.xml)      │
   └─────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (touched files)
```
src/
├── app/
│   ├── layout.tsx                       # title.template, <SeoJsonLd/>  (SEO-01, SEO-03)
│   ├── robots.ts                        # sitemap declaration  (SEO-06 — verify)
│   ├── api/og/
│   │   ├── pricing/route.tsx            # exists  (SEO-02)
│   │   ├── compare/[competitor]/route.tsx # exists  (SEO-02)
│   │   └── features/route.tsx           # NEW — add  (SEO-02)
│   ├── resources/page.tsx               # title em-dash → pipe  (SEO-01)
│   ├── help/page.tsx                    # title em-dash → pipe  (SEO-01)
│   ├── privacy/page.tsx                 # title hyphen → pipe   (SEO-01)
│   ├── support/page.tsx                 # title hyphen → pipe   (SEO-01)
│   ├── blog/page.tsx                    # title em-dash → pipe  (SEO-01)
│   └── features/page.tsx                # add ogImage to createPageMetadata  (SEO-02)
├── lib/
│   ├── generate-metadata.ts             # getJsonLd() — Organization + SoftwareApplication
│   └── seo/page-metadata.ts             # createPageMetadata helper
└── app/__tests__/ or src/lib/seo/__tests__/
    └── seo-title-separator-drift.test.ts  # NEW drift guard  (SEO-01)
    └── seo-aria-current-audit.test.ts     # NEW audit test   (SEO-07)
```

### Pattern 1: Title separator — canonical is pipe `|`
**What:** Next.js `title.template` in the root layout is the single source of truth for the brand-suffix separator. `createPageMetadata`'s `alreadyBranded`/`suffixed` logic also uses `| TenantFlow`.
**Current state:** [VERIFIED: codebase]
- `src/lib/generate-metadata.ts:31` — `template: "%s | TenantFlow"` (pipe)
- `src/lib/seo/page-metadata.ts:70` — `const suffixed = alreadyBranded ? title : \`${title} | TenantFlow\`` (pipe)
- `src/lib/generate-metadata.ts:33` — default title is `"TenantFlow — Property Management Software for Independent Landlords"` (em-dash, internal)

The pipe is the brand-suffix separator. The em-dash appears as an *internal phrase separator* in titles. SEO-01 says "ONE consistent separator; zero mixed usage" — so internal separators must also normalize to pipe.

### Pattern 2: Per-page OG image — `@vercel/og` edge route
**What:** A route handler at `src/app/api/og/<route>/route.tsx` returns an `ImageResponse`.
**When to use:** SEO-02 `/features` OG image.
**Example:**
```tsx
// Source: src/app/api/og/pricing/route.tsx (existing pattern)
import { ImageResponse } from "@vercel/og";

export const runtime = "edge";
export const revalidate = 3600;

export function GET() {
  const bgGradient =
    "linear-gradient(135deg, oklch(0.62 0.18 250) 0%, oklch(0.45 0.20 270) 100%)";
  return new ImageResponse(
    <div style={{ /* 1200×630 layout, inline oklch only */ }}>
      {/* "Features" headline + subhead + TenantFlow brand mark */}
    </div>,
    { width: 1200, height: 630 },
  );
}
```
Then wire it in the page metadata:
```tsx
// src/app/features/page.tsx — add ogImage
export const metadata: Metadata = createPageMetadata({
  title: "...",
  description: "...",
  path: "/features",
  ogImage: "/api/og/features",   // <-- NEW; createPageMetadata absolutizes it
});
```

### Pattern 3: JSON-LD emission — two patterns coexist
**What:** [VERIFIED: codebase] The repo has TWO JSON-LD emission patterns:
1. **Site-wide:** `src/components/seo/seo-json-ld.tsx` (`SeoJsonLd`) → calls `getJsonLd()` in `generate-metadata.ts` → emits `[Organization, SoftwareApplication]` in root layout `<head>`.
2. **Per-page:** `src/components/seo/json-ld-script.tsx` (`JsonLdScript`) → typed against `schema-dts`, used by `/pricing`, `/features`, `/compare/[competitor]`, `/`, blog pages for `BreadcrumbList`/`Product`/`FAQ`/`WebSite`/`Article`.

For SEO-03 the existing pattern (1) already satisfies `Organization` + `SoftwareApplication`. If the planner decides `SoftwareApplication` should be homepage-only, the migration is: remove `software` from `getJsonLd()`'s return, emit it via `<JsonLdScript schema={...}/>` in `src/app/page.tsx` (alongside the existing `WebSite` schema).

### Pattern 4: Drift-guard test (the project's established pattern)
**What:** A Vitest unit test that imports a source-of-truth array/file and asserts invariants — fails future PRs that introduce drift. Runs in lefthook pre-commit + CI `checks` gate.
**Existing examples:** [VERIFIED: codebase]
- `src/app/robots.test.ts` — imports `AI_USER_AGENTS` + `PRIVATE_PATHS` from `robots.ts`, bidirectional drift guard
- `src/app/sitemap.test.ts` — legal-page `Last Updated` ↔ sitemap constant drift guard
- `src/app/__tests__/design-token-drift.test.ts` (Phase 11, `11-LINT-RULE.md`) — scans `src/components` + `src/app` for hex/rgb/bg-white
- `src/components/compare/__tests__/compare-breadcrumb.test.tsx` — pins breadcrumb segment shape
**Use for:** SEO-01 separator drift guard (scan all `metadata`/`createPageMetadata`/`generateMetadata` titles for em-dash/hyphen-as-separator) and SEO-07 aria-current audit.

### Anti-Patterns to Avoid
- **Flipping the separator to em-dash.** D-02 says lock to what the codebase uses. The pipe is structurally the canonical separator (`title.template`, `createPageMetadata` suffix). Flip the 6 outliers TO pipe; do not flip the template.
- **Emitting a second `SoftwareApplication` on the homepage** while the site-wide one still emits. The compare page comment at `src/app/compare/[competitor]/page.tsx:93-95` explicitly warns: "Root layout already emits sitewide Organization + SoftwareApplication, so don't duplicate that here." Two `SoftwareApplication` entities on one URL split rich-result eligibility.
- **File-convention `opengraph-image.tsx` for `/features`** when the 3 sibling routes all use `/api/og/*` route handlers. Inconsistency only.
- **Using hex/named colors in the new OG route.** The `/api/og/*` routes use inline `oklch()` literals — the ONE documented exception to the no-hex rule (`@vercel/og` requires inline CSS). Match that, do not introduce hex.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Brand-suffix on titles | Manual `+ " | TenantFlow"` per page | `title.template` (nested routes) + `createPageMetadata` (`absoluteTitle`) | Template already handles it; manual suffixing double-brands |
| OG image rendering | Static PNG asset in `public/` | `@vercel/og` `ImageResponse` edge route | Existing 3 routes are dynamic, CDN-cached, brand-token-aligned |
| JSON-LD `<script>` injection | Raw `dangerouslySetInnerHTML` per page | `JsonLdScript` (per-page) or `SeoJsonLd` (site-wide) | Both already centralize XSS escaping (`</` → `<`) |
| Breadcrumb markup | New breadcrumb JSX | `CompareBreadcrumb` / `BlogPostBreadcrumb` + `#components/ui/breadcrumb` | Already built, tested, schema-parity-pinned |
| `aria-current` logic | Per-component pathname comparison | `isActiveLink` (`src/lib/is-active-link.ts`) | Single tested predicate; `BreadcrumbPage` hardcodes `aria-current="page"` |
| Sitemap path in robots | Manual string | `robots.ts` `sitemap:` field | Already declared, drift-guarded by `robots.test.ts` |

**Key insight:** Phase 12 has almost no greenfield surface. The SEO infrastructure is complete and tested. The work is (a) normalizing 6 title strings, (b) adding ONE OG route, (c) writing 2 new tests, (d) verifying 4 already-shipped requirements.

## Runtime State Inventory

This is not a rename/refactor/migration phase — it is metadata/markup normalization. No databases, OS-registered state, or secrets are touched.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **None.** Blog slugs live in `blogs.slug` (DB) but SEO-04 is verify-only — no slug mutation in this phase. Verified: `generateStaticParams` reads `slug` column, no timestamp generation in code. | None |
| Live service config | **None.** `robots.ts` + `sitemap.ts` are code, in git. No external dashboard config. | None |
| OS-registered state | **None.** | None |
| Secrets/env vars | **None.** OG routes use no secrets. | None |
| Build artifacts | **None.** OG images are generated at request time (edge, `revalidate = 3600`), not built artifacts. The new `/api/og/features` route will be CDN-cached after first request — no stale-artifact concern. | None |

## Detailed Per-Requirement Findings

### SEO-01 — Meta-title separator — PARTIALLY SHIPPED, real work

**Canonical separator: pipe `|`** [VERIFIED: codebase]
- `src/lib/generate-metadata.ts:31` — `title.template: "%s | TenantFlow"`
- `src/lib/seo/page-metadata.ts:70` — `createPageMetadata` appends `| TenantFlow`

**Drift confirmed — 6 titles use non-pipe separators:**

| File:line | Current title | Separator | Fix |
|-----------|---------------|-----------|-----|
| `src/lib/generate-metadata.ts:33` | `TenantFlow — Property Management Software for Independent Landlords` (default title) | em-dash | → `\|` |
| `src/lib/generate-metadata.ts:54,81` | same string in `openGraph.title` / `twitter.title` | em-dash | → `\|` |
| `src/app/resources/page.tsx:21` | `Free Landlord Resources — Templates & Tools` | em-dash | → `\|` |
| `src/app/help/page.tsx:23` | `Help Center — Property Management Support & Guides` | em-dash | → `\|` |
| `src/app/blog/page.tsx:74` | `Property Management Blog — Tips for Independent Landlords` | em-dash | → `\|` |
| `src/app/privacy/page.tsx:8` | `Privacy Policy - Data Protection & User Rights` | hyphen | → `\|` |
| `src/app/support/page.tsx:18` | `Support Center - Property Management Help` | hyphen | → `\|` |
| `src/app/resources/security-deposit-reference-card/page.tsx:14` | `Security Deposit Laws by State - Quick Reference Card` | hyphen | → `\|` |

**Already-pipe titles (no change):** `/faq`, `/pricing` titles internally use `|`; `/about` (`About | Our Mission`); `/blog/[slug]` (`{title} | TenantFlow Blog`); `/blog/category/[category]` Not-Found title; `/admin/analytics`.

**Decision for the planner:** SEO-01 says zero mixed usage of "em-dash OR pipe". Since the *brand-suffix template* is locked to pipe (D-02 — don't flip it), all 8 internal-separator occurrences above must change `—`/`-` → `|`. This is a string-edit task across ~8 files.

**Caveat — em-dash in prose is fine.** SEO-01 is about *title separators*, not punctuation. Em-dashes inside descriptions, body copy, and the `MEMORY.md` "no em-dash in marketing quotes" feedback are unrelated. Only `<title>` separator characters are in scope. Do not regex-strip em-dashes globally.

**Test:** New drift-guard `seo-title-separator-drift.test.ts` — enumerate every `metadata`/`createPageMetadata`/`generateMetadata` title and assert no ` — ` or ` - ` separator pattern (allow hyphens inside hyphenated words like "Quick-Reference"). Pattern: scan title strings, fail if `/ [—–-] /` (spaced dash) matches.

### SEO-02 — Per-page OG images — PARTIALLY SHIPPED, real work

[VERIFIED: codebase] Existing `/api/og/*` routes:
- `src/app/api/og/pricing/route.tsx` ✅ — wired via `src/app/pricing/page.tsx:31` `ogImage: "/api/og/pricing"`
- `src/app/api/og/compare/[competitor]/route.tsx` ✅ — wired via `generateMetadata` at `src/app/compare/[competitor]/page.tsx:41` (`ogImageUrl = \`${baseUrl}/api/og/compare/${slug}\``)
- `src/app/api/og/blog/[slug]/route.tsx` ✅ — blog (Phase 6, out of Phase 12 scope per CONTEXT)
- `src/app/opengraph-image.tsx` ✅ — site-wide root fallback (`next/og`)

**Missing — the only Phase-12 remaining item:** `/features` has **no per-page OG image**. `src/app/features/page.tsx:12-17` calls `createPageMetadata` WITHOUT an `ogImage` arg → falls back to `${siteUrl}/images/property-management-og.jpg` (the generic site OG). No `src/app/api/og/features/route.tsx` exists.

**Work:** (1) Create `src/app/api/og/features/route.tsx` matching the `/api/og/pricing` pattern (static `GET()`, `runtime = "edge"`, `revalidate = 3600`, oklch gradient, 1200×630, "Features" headline). (2) Add `ogImage: "/api/og/features"` to the `createPageMetadata` call in `src/app/features/page.tsx`.

**Note on `/compare/[competitor]`:** the compare page builds the OG URL inline (`${baseUrl}/api/og/compare/${slug}`) rather than via `createPageMetadata`'s `ogImage` — it uses raw `Metadata`. Already correct; verify-only.

### SEO-03 — Organization + SoftwareApplication JSON-LD — SHIPPED, verify-and-pin (+ decision)

[VERIFIED: codebase] `src/lib/generate-metadata.ts:136-208` `getJsonLd()` returns `[organization, software]`:
- `organization` — `@type: "Organization"`, name/url/logo/description/foundingDate/contactPoint (E.164 phone `+1-214-843-0779`)/sameAs ✅
- `software` — `@type: "SoftwareApplication"`, applicationCategory/operatingSystem/AggregateOffer/featureList ✅

Both emit **site-wide** via `<SeoJsonLd/>` in `src/app/layout.tsx:91` (`<head>`).

**Planning decision required.** SEO-03 wording: "Root layout emits `Organization`; **homepage** emits `SoftwareApplication`." Current reality: BOTH emit site-wide (homepage included). Two valid resolutions:
1. **Accept as-is (recommended, lowest risk):** The `SoftwareApplication` *does* appear on the homepage (it appears on every page). Site-wide emission is a superset of "homepage emits it". Mark SEO-03 shipped, pin with a test asserting `getJsonLd()` returns both `@type`s. This matches how `software-application-schema.ts` + its test already model the schema. Zero code change.
2. **Scope `SoftwareApplication` to homepage only:** Remove `software` from `getJsonLd()`, emit it via `<JsonLdScript>` in `src/app/page.tsx` next to the existing `WebSite` schema. More faithful to the literal wording but a behavior change with rich-result implications (a per-page `SoftwareApplication` is arguably *more* correct for SERP because the homepage is its canonical entity surface).

Recommendation: **Option 1.** The requirement intent is "these schemas exist and are valid"; both do. A regression-pin test on `getJsonLd()` (extend `src/lib/seo/__tests__/` coverage) satisfies it. If the planner wants literal compliance, Option 2 is a clean 2-file change reusing `JsonLdScript`.

**Existing test surface:** `src/lib/seo/__tests__/software-application-schema.test.ts` tests the `createSoftwareApplicationJsonLd` *factory* (used by compare pages historically), NOT `getJsonLd()`. The site-wide `getJsonLd()` output has no direct test — that is the regression-pin gap to close.

### SEO-04 — Clean blog slugs — SHIPPED (Phase 6), verify only

[VERIFIED: codebase] `src/app/blog/[slug]/page.tsx:54-86` — `generateStaticParams` selects `slug` from the `blogs` table; `dynamicParams = false` (any non-enumerated slug → real 404). No millisecond-timestamp slug generation anywhere in code — slugs are whatever the DB row holds. Phase 6 (BLOG-01/BLOG-02) handled the data cleanup. Per D-04 this phase does NOT touch blog data.

**Verification action:** A test or note confirming slugs are DB-sourced and the `/blog/error-1778151609106` pattern (timestamp slug) no longer renders. The cleanest pin: a unit assertion that no slug in the published set matches `/^error-\d{10,}$/` OR `/\d{13}/` — but this hits the DB. Lower-cost: document SEO-04 as Phase-6-delivered, verified by code inspection (no timestamp generator exists). Defer to planner; recommend a lightweight code-inspection note rather than a prod-hitting test.

### SEO-05 — Visible breadcrumbs — SHIPPED, verify-and-pin

[VERIFIED: codebase]
- **Compare:** `src/components/compare/compare-breadcrumb.tsx` — `CompareBreadcrumb` renders `Home > Compare > TenantFlow vs <name>`, rendered at `src/app/compare/[competitor]/page.tsx:105`. Uses `#components/ui/breadcrumb` (`<nav aria-label="breadcrumb">`, `BreadcrumbPage` hardcodes `aria-current="page"`). `BreadcrumbList` JSON-LD also emitted (`createBreadcrumbJsonLd` at line 89). Tested: `src/components/compare/__tests__/compare-breadcrumb.test.tsx` (4 tests — segment shape, `aria-current`, nav landmark, name verbatim).
- **Blog:** `src/components/blog/blog-post-breadcrumb.tsx` — `BlogPostBreadcrumb` (`Home > Blog > [Category] > <title>`). Tested: `src/components/blog/__tests__/blog-post-breadcrumb.test.tsx`.

Both already render visible breadcrumbs AND schema breadcrumbs with parity comments. SEO-05 is shipped. **No new work** — the existing tests are the regression pins. Verify the compare breadcrumb still renders (it does — `page.tsx:105`).

### SEO-06 — Footer sitemap link + robots.txt — SHIPPED, verify-and-pin

[VERIFIED: codebase]
- **Footer:** `src/components/layout/footer.tsx:48` — Legal column has `{ label: "Sitemap", href: "/sitemap.xml", external: true }`. Renders as a real `<a target="_blank">`. ✅
- **robots:** `src/app/robots.ts:102` — `sitemap: \`${getSiteUrl()}/sitemap.xml\``. Also `discoveryAllowPaths` includes `/sitemap.xml`. ✅
- `src/app/sitemap.ts` exists (the `MetadataRoute.Sitemap` generator from PR #674).

SEO-06 is fully shipped. **No new work.** Regression pins: extend `robots.test.ts` (already drift-guards `sitemap` field — verify it asserts the `sitemap` property) and add a footer test asserting the `/sitemap.xml` link renders (no footer test currently exists — `find` returned none for footer).

### SEO-07 — Site-wide aria-current audit — SHIPPED mechanically, needs audit test

[VERIFIED: codebase] `aria-current` is emitted on **6 surfaces**:
1. `src/components/layout/navbar/navbar-desktop-nav.tsx:98,130` — top-level + dropdown links, via `isActiveLink`
2. `src/components/layout/navbar/navbar-mobile-menu.tsx:56,88` — mobile sheet links, via `isActiveLink`
3. `src/components/shell/main-nav.tsx:228,254` — dashboard nav (child + parent)
4. `src/components/ui/mobile-nav.tsx:46,118` — mobile nav
5. `src/components/ui/breadcrumb.tsx:57` — `BreadcrumbPage` hardcodes `aria-current="page"`
6. `src/components/ui/stepper-trigger.tsx` — stepper (form context, `aria-current` for step)

The active-link predicate `src/lib/is-active-link.ts` is correct (root short-circuit + trailing-slash guard) and tested (`src/lib/__tests__/is-active-link.test.ts`). CONS-03 (Phase 8) already fixed the homepage "Compare always highlighted" bug — that was the audit's starting symptom.

**Gap:** there is no single *consolidated* SEO-07 audit test that asserts "every nav/breadcrumb/footer surface emits exactly-one `aria-current="page"` for a given route". Individual components are tested in isolation (`navbar-desktop-nav.test.ts`, `mobile-nav.test.ts`, `compare-breadcrumb.test.tsx`, `is-active-link.test.ts`) but SEO-07 asks for a "green report".

**Recommendation:** Write a new consolidated audit test `seo-aria-current-audit.test.ts` that, for a sample of routes (`/`, `/pricing`, `/features`, `/compare/buildium`), renders the marketing nav + breadcrumb and asserts: (a) at most one element has `aria-current="page"` per surface, (b) the active one matches the current route, (c) `isActiveLink` covers the key route patterns. This *is* the green report — it codifies the audit as a CI-enforced test (the project's preferred form of "audit", per the `design-token-drift.test.ts` precedent). The footer has NO `aria-current` (intentional — footer links are not nav-state); the audit test should NOT expect `aria-current` there, just confirm footer links resolve.

## Common Pitfalls

### Pitfall 1: Flipping the title template instead of the outliers
**What goes wrong:** Changing `title.template` to em-dash to "match" the 6 outlier pages.
**Why it happens:** Seeing more em-dashes than expected and assuming em-dash is canonical.
**How to avoid:** The template + `createPageMetadata` suffix are the structural separator and they use pipe. D-02 says don't flip them. Flip the 6 outliers TO pipe.
**Warning signs:** `git diff` touching `generate-metadata.ts:31` `template` value.

### Pitfall 2: Double-branded titles
**What goes wrong:** A nested-route page that already includes "TenantFlow" in its title gets ` | TenantFlow` appended by the template → `Foo | TenantFlow | TenantFlow`.
**Why it happens:** The `title.template` applies to plain-string titles on nested segments.
**How to avoid:** `createPageMetadata` already guards this (`alreadyBranded` regex at `page-metadata.ts:69` → uses `title.absolute`). Compare page uses `title: { absolute: ... }` for the same reason. Any new branded title must use `{ absolute: ... }`. Don't introduce a plain-string title containing "TenantFlow".

### Pitfall 3: Visible-vs-schema breadcrumb drift
**What goes wrong:** Editing `CompareBreadcrumb` segments without updating `createBreadcrumbJsonLd`, so the rendered breadcrumb and the `BreadcrumbList` JSON-LD disagree — a documented Google penalty.
**Why it happens:** The two live in different files.
**How to avoid:** SEO-05 is verify-only — don't edit breadcrumbs. If a fix is ever needed, the `compare-breadcrumb.test.tsx` pin catches segment-shape drift. Leave it.

### Pitfall 4: Hex colors in the new OG route
**What goes wrong:** The new `/api/og/features` route uses `#2563eb` or named colors → fails the TOKEN-03 `design-token-drift.test.ts` scan.
**Why it happens:** `@vercel/og` needs inline CSS; instinct is to reach for hex.
**How to avoid:** Use `oklch()` literals exactly as `/api/og/pricing/route.tsx:27-28` does. `@vercel/og` routes are the ONE documented exception, and they use oklch, not hex. Verify the `design-token-drift.test.ts` allowlist already covers `src/app/api/og/*` (it scans `src/app`) — if the new route uses oklch it passes; if it uses hex it fails. Stay on oklch.

### Pitfall 5: Two SoftwareApplication entities on the homepage
**What goes wrong:** Adding a homepage `SoftwareApplication` via `JsonLdScript` while `getJsonLd()` still emits the site-wide one → the homepage has two competing primary entities.
**Why it happens:** Misreading SEO-03 as "add a new one to the homepage".
**How to avoid:** If Option 2 (homepage-scoped) is chosen, *remove* `software` from `getJsonLd()` in the same change. Never have both. The compare page comment (`page.tsx:93-95`) documents this exact hazard.

## Code Examples

### Verified: existing OG route to copy for `/features`
```tsx
// Source: src/app/api/og/pricing/route.tsx
import { ImageResponse } from "@vercel/og";
export const runtime = "edge";
export const revalidate = 3600;
export function GET() {
  const bgGradient =
    "linear-gradient(135deg, oklch(0.62 0.18 250) 0%, oklch(0.45 0.20 270) 100%)";
  return new ImageResponse(
    <div style={{ height: "100%", width: "100%", display: "flex",
      flexDirection: "column", justifyContent: "space-between",
      padding: "60px", background: bgGradient, color: "oklch(1 0 0)",
      fontFamily: "sans-serif" }}>
      {/* headline / subhead / brand mark */}
    </div>,
    { width: 1200, height: 630 },
  );
}
```

### Verified: createPageMetadata ogImage wiring
```tsx
// Source: src/app/pricing/page.tsx:26-32 — the ogImage arg is absolutized
//         by createPageMetadata (page-metadata.ts:41-47)
export const metadata: Metadata = createPageMetadata({
  title: "Property Management Software Pricing | Plans from $19/mo",
  description: "...",
  path: "/pricing",
  ogImage: "/api/og/pricing",
});
```

### Verified: site-wide JSON-LD emission (SEO-03 — already present)
```ts
// Source: src/lib/generate-metadata.ts:136-208
export function getJsonLd() {
  const organization = { "@context": "https://schema.org",
    "@type": "Organization", name: "TenantFlow", /* ... */ };
  const software = { "@context": "https://schema.org",
    "@type": "SoftwareApplication", name: "TenantFlow", /* ... */ };
  return [organization, software];   // both emitted site-wide via <SeoJsonLd/>
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `<meta name="keywords">` | Stripped (Google ignores since 2009) | PR #674 | None — dead bytes removed; do not re-add |
| `changeFrequency` in sitemap | Removed (Google ignores since 2023) | PR #674 | Sitemap is leaner; do not re-add to any sitemap edits |
| Per-page raw `dangerouslySetInnerHTML` JSON-LD | `JsonLdScript` (typed) / `SeoJsonLd` (site-wide) | PR #674 / Phase 6 | Centralized XSS escaping — always use the components |
| `+1-888-TENANT-1` vanity phone in schema | E.164 `+1-214-843-0779` | PR #674 | Schema.org validator passes — don't revert to vanity |

**Deprecated/outdated — do not reintroduce:** `keywords` meta, `changeFrequency`, hreflang `languages` equal to canonical, vanity phone numbers in JSON-LD.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | SEO-04's blog slugs are clean in prod (no `error-<timestamp>` slugs) because Phase 6 BLOG-01 hard-deleted bad rows | SEO-04 | LOW — D-04 explicitly assigns slug cleanliness to Phase 6; code has no timestamp generator. If prod still has a bad slug it is a Phase-6 escape, not Phase-12 scope. Verify via a non-blocking prod query if the planner wants certainty. |
| A2 | The `design-token-drift.test.ts` scan covers `src/app/api/og/*` and tolerates `oklch()` (not hex) | Pitfall 4 | LOW — the existing 3 OG routes use oklch and presumably already pass that scan (they shipped). The new route copying them inherits the same pass. Confirm by running `bun run test:unit -- --run src/app/__tests__/design-token-drift.test.ts` after adding the route. |
| A3 | Site-wide `SoftwareApplication` emission satisfies SEO-03's "homepage emits SoftwareApplication" | SEO-03 | MEDIUM — this is a wording-interpretation call. The planner/discuss-phase should confirm Option 1 vs Option 2 before locking. Both are defensible; Option 1 is zero-code-change. |

## Open Questions (RESOLVED)

1. **SEO-03 scope: site-wide vs homepage-only `SoftwareApplication`?**
   - What we know: Both `Organization` and `SoftwareApplication` emit site-wide today (verified).
   - What's unclear: Whether the requirement author wants `SoftwareApplication` literally homepage-scoped.
   - Recommendation: Option 1 (accept site-wide, add a `getJsonLd()` regression-pin test). Flag to discuss-phase / planner; if literal compliance is wanted, Option 2 is a clean 2-file change.

2. **SEO-04 verification depth — code-inspection note vs prod-hitting test?**
   - What we know: Slugs are DB-sourced; no timestamp generator in code.
   - What's unclear: Whether the planner wants a test that queries prod to assert no `error-<ts>` slug exists.
   - Recommendation: Code-inspection note (Phase-6-delivered, verified). A prod-hitting test belongs in the RLS integration suite, not a unit test, and would be a Phase-6 regression test, not Phase-12 work.

## Environment Availability

This phase is code/config-only. No external tools, services, runtimes, or CLI utilities beyond the existing project toolchain (`bun`, `vitest`, `next`). All `@vercel/og` / `next/og` / `schema-dts` dependencies are already installed (verified — 3 OG routes already build and ship). **Step 2.6: no external dependencies — SKIPPED.**

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + jsdom |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `bun run test:unit -- --run <path>` |
| Full suite command | `bun run test:unit` |
| Quality gate | `bun run validate:quick` (typecheck + lint + unit) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| SEO-01 | No page title uses a spaced em-dash/hyphen separator; only ` \| ` | unit (drift guard) | `bun run test:unit -- --run src/app/__tests__/seo-title-separator-drift.test.ts` | ❌ Wave 0 |
| SEO-02 | `/api/og/features` route exists + `/features` metadata wires `ogImage` | unit | `bun run test:unit -- --run src/app/features/__tests__/page.test.ts` (extend or create) | ❌ Wave 0 (route + assertion) |
| SEO-03 | `getJsonLd()` returns `Organization` + `SoftwareApplication` with required fields | unit (regression pin) | `bun run test:unit -- --run src/lib/__tests__/generate-metadata.test.ts` | ❌ Wave 0 (no `getJsonLd()` test) |
| SEO-04 | Blog slugs DB-sourced, no timestamp slugs | code-inspection note (Phase 6) | n/a — verified by inspection; no new test recommended | ✅ Phase 6 owns |
| SEO-05 | Compare + blog breadcrumbs render visible + schema-parity | unit | `bun run test:unit -- --run src/components/compare/__tests__/compare-breadcrumb.test.tsx` | ✅ exists |
| SEO-06 | Footer renders `/sitemap.xml` link; `robots()` declares `sitemap` | unit | `bun run test:unit -- --run src/app/robots.test.ts` + new footer test | ⚠️ robots ✅ / footer ❌ Wave 0 |
| SEO-07 | Consolidated aria-current audit — at-most-one `aria-current="page"` per nav surface per route | unit (audit) | `bun run test:unit -- --run src/app/__tests__/seo-aria-current-audit.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `bun run test:unit -- --run <touched test file>` + `bun run validate:quick`
- **Per wave merge:** `bun run test:unit` (full suite green)
- **Phase gate:** Full suite green + `bun run typecheck && bun run lint` before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/app/__tests__/seo-title-separator-drift.test.ts` — covers SEO-01 (drift guard; scans all page titles)
- [ ] `src/app/api/og/features/route.tsx` — covers SEO-02 (the one missing OG route — this is production code, not a test, but it is the Wave 0 blocker)
- [ ] `src/app/features/__tests__/page.test.ts` — covers SEO-02 (assert `metadata.openGraph.images` points at `/api/og/features`); extend if it exists
- [ ] `src/lib/__tests__/generate-metadata.test.ts` — covers SEO-03 (`getJsonLd()` regression pin: asserts `Organization` + `SoftwareApplication` `@type`s and required fields); check if file exists, extend or create
- [ ] `src/components/layout/__tests__/footer.test.tsx` — covers SEO-06 (footer sitemap link renders)
- [ ] `src/app/__tests__/seo-aria-current-audit.test.ts` — covers SEO-07 (consolidated audit; the "green report")

*(SEO-05 has no gap — `compare-breadcrumb.test.tsx` + `blog-post-breadcrumb.test.tsx` already exist and pin the behavior. SEO-04 has no gap — Phase 6 owns it; verify by inspection.)*

## Security Domain

`security_enforcement` is not explicitly `false` in config (treated as enabled). This phase has a narrow security surface — it emits markup and one new route handler. No auth, no DB writes, no secrets.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase touches no auth |
| V3 Session Management | no | — |
| V4 Access Control | no | OG route is public by design (`robots.ts` allows it; OG images are meant to be fetched by crawlers/social) |
| V5 Input Validation | yes | JSON-LD strings — `JsonLdScript` + `SeoJsonLd` already escape `</` → `<` (XSS guard for `dangerouslySetInnerHTML`). New OG route `GET()` takes no user input (static `/features` content). |
| V6 Cryptography | no | — |

### Known Threat Patterns for {Next.js App Router metadata + edge OG routes}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| JSON-LD `<script>` XSS via unescaped `</script>` | Tampering / XSS | Already mitigated — `JsonLdScript`/`SeoJsonLd` replace `<` with `<`. SEO-01 string edits stay inside the escaped path; no new injection surface. |
| OG route resource exhaustion (uncached repeated renders) | Denial of Service | `runtime = "edge"` + `revalidate = 3600` — CDN-cached, no per-request Node process. `/features` route takes NO params (unlike `/api/og/compare/[competitor]`), so the cache key is singular — minimal abuse surface. |
| Reflected content in OG image via params | Tampering | N/A for `/features` — `GET()` has no params, all content static. (The `compare/[competitor]` route does take a slug but validates against `COMPETITORS[slug]` and 404s on miss — already correct.) |

No new security work required. The new `/api/og/features` route inherits the established edge-runtime + static-content + CDN-cache posture of the 3 sibling OG routes.

## Project Constraints (from CLAUDE.md)

- **No `any` types** — use `unknown` + type guards. The new OG route and tests must be fully typed.
- **No barrel files / re-exports** — import directly from defining files (`#components/seo/json-ld-script`, etc.).
- **No inline styles** — EXCEPTION: `@vercel/og` `ImageResponse` JSX requires inline `style` props; this is the documented exception (the 3 existing OG routes all use it). Outside OG routes, Tailwind/`globals.css` only.
- **No hex/rgb/named colors** — the new OG route MUST use `oklch()` literals (matching `/api/og/pricing`). The TOKEN-03 `design-token-drift.test.ts` scans `src/app` — hex in the new route would fail CI.
- **No emojis in code** — Lucide icons only (the footer `Home` icon is already correct).
- **Files: kebab-case**; **Types/Interfaces: PascalCase**; **Constants: UPPER_SNAKE_CASE**.
- **Vitest 4 + chai 6 bug:** use `.rejects.toMatchObject({ message: expect.stringContaining(...) })`, never `.rejects.toThrow('string')`.
- **80% coverage threshold** enforced via lefthook pre-commit.
- **`vi.hoisted()`** for any mock variable referenced in `vi.mock()`.
- **Path aliases** — `#app/*`, `#components/*`, `#lib/*` etc. defined in BOTH `tsconfig.json#paths` and `package.json#imports`.
- **Git workflow:** feature branch → push → `gh pr create`. Never push to `main`. Perfect-PR gate (2 zero-finding review cycles).
- **Lint is Biome**, not ESLint — the SEO-01 drift guard is a Vitest unit test (the project's established pattern: `robots.test.ts`, `sitemap.test.ts`, `design-token-drift.test.ts`), NOT a lint rule.

## Sources

### Primary (HIGH confidence)
- `src/app/layout.tsx`, `src/lib/generate-metadata.ts`, `src/lib/seo/page-metadata.ts` — title template + metadata helpers (SEO-01, SEO-03)
- `src/app/robots.ts`, `src/app/robots.test.ts`, `src/app/sitemap.ts` — sitemap declaration (SEO-06)
- `src/app/api/og/{pricing,compare/[competitor],blog/[slug]}/route.tsx`, `src/app/opengraph-image.tsx` — OG image patterns (SEO-02)
- `src/app/{pricing,features,compare/[competitor]}/page.tsx` — per-page metadata (SEO-01, SEO-02)
- `src/components/seo/{seo-json-ld.tsx,json-ld-script.tsx}` — JSON-LD emission patterns (SEO-03)
- `src/components/compare/compare-breadcrumb.tsx`, `src/components/blog/blog-post-breadcrumb.tsx`, `src/components/ui/breadcrumb.tsx` — visible breadcrumbs (SEO-05)
- `src/components/layout/footer.tsx` — footer sitemap link (SEO-06)
- `src/components/layout/navbar/{navbar-desktop-nav,navbar-mobile-menu}.tsx`, `src/components/shell/main-nav.tsx`, `src/components/ui/mobile-nav.tsx`, `src/lib/is-active-link.ts` — aria-current surfaces (SEO-07)
- `src/app/blog/[slug]/page.tsx` — `generateStaticParams` slug enumeration (SEO-04)
- `CLAUDE.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `12-CONTEXT.md` — constraints + scope

### Secondary (MEDIUM confidence)
- `MEMORY.md` — PR #674 SEO summary; TOKEN-03 drift-guard mechanism; Phase 6 blog rebuild notes

### Tertiary (LOW confidence)
- None — all findings verified directly against source files.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps; all patterns verified in shipped code
- Architecture: HIGH — every requirement traced to file:line evidence
- Pitfalls: HIGH — derived from explicit in-code comments (compare page SoftwareApplication warning, OG-route oklch exception)
- SEO-03 interpretation: MEDIUM — site-wide-vs-homepage scoping is a wording call flagged as Open Question 1

**Research date:** 2026-05-21
**Valid until:** 2026-06-20 (30 days — stable; codebase is the source of truth, not external docs)
