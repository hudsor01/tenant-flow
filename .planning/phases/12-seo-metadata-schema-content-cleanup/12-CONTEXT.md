# Phase 12: SEO Metadata, Schema & Content Cleanup - Context

**Gathered:** 2026-05-21 (via /gsd-discuss-phase 12 --auto)
**Status:** Ready for planning

<domain>
## Phase Boundary

SEO metadata + structured-data cleanup, scoped by ROADMAP Phase 12 (requirements SEO-01..07):

1. **SEO-01** — Every `<title>` uses ONE consistent separator (em-dash OR pipe); zero mixed usage.
2. **SEO-02** — `/pricing`, `/features`, `/compare/[competitor]` each have a unique 1200×630 Open Graph image.
3. **SEO-03** — Root layout emits `Organization` JSON-LD; homepage emits `SoftwareApplication` JSON-LD.
4. **SEO-04** — Clean blog slugs (no millisecond timestamps) — already covered by Phase 6 BLOG-02; verify only.
5. **SEO-05** — Visible breadcrumbs on `/compare/[competitor]` (blog breadcrumbs covered by Phase 6); verify blog, add compare if missing.
6. **SEO-06** — Footer links to `/sitemap.xml`; `robots.txt` confirmed pointing at it.
7. **SEO-07** — Site-wide `aria-current="page"` audit producing a green report (nav, breadcrumbs, footer, active-link components).

Metadata/schema/SEO only — NOT content rewriting. No new design tokens.
</domain>

<decisions>
## Implementation Decisions

### Prior SEO work — likely already shipped
- **D-01:** A large SEO PR (#674) already shipped a broad SEO surface: sitemap with real `lastmod`, `robots.ts` per-bot allowlist, `llms.txt`/`llms-full.txt`/`humans.txt`, RSS `/feed.xml`, Article + BreadcrumbList JSON-LD, the `Viewport` API export, and SEO meta-separator standardization. Several SEO-01..07 items are therefore likely ALREADY DONE. Research MUST classify each requirement as shipped (→ regression-pin test) vs genuinely remaining (→ real work). Treat this like Phases 7-11: verify-and-pin where shipped.

### SEO-01 — meta-title separator
- **D-02:** PR #674 included "SEO meta separator standardization". If a separator is already consistently in use, LOCK to whatever the codebase already uses (do not flip it) and pin it with a drift-guard-style test. Research confirms the current separator and whether any mixed usage remains.

### SEO-03 — structured data
- **D-03:** `Organization` JSON-LD site-wide (root layout) + `SoftwareApplication` JSON-LD on the homepage. Research confirms whether these already exist (PR #674 added Article/BreadcrumbList; Organization/SoftwareApplication may or may not be present). Reuse the project's existing JSON-LD emission pattern (e.g. the Article/BreadcrumbList components).

### SEO-04 / SEO-05 (blog) — Phase 6 territory
- **D-04:** Blog slug cleanliness (SEO-04) and blog breadcrumbs (SEO-05 blog half) were delivered by Phase 6. This phase only VERIFIES them — no blog re-work. SEO-05's `/compare/[competitor]` breadcrumbs: research confirms if compare pages already render a `BreadcrumbList` (memory indicates compare pages kept BreadcrumbList) and whether a VISIBLE breadcrumb nav exists.

### Claude's Discretion
- Exact OG-image approach for SEO-02 (static asset vs `next/og` `ImageResponse` route) — match the existing `opengraph-image.tsx` pattern.
- Whether SEO-07's aria-current audit is satisfied by an existing test or needs a new audit test.

</decisions>

<specifics>
## Specific Ideas

- Audit source: external UI audit 2026-05-08 — findings SEO-01..07.
- Prior art: PR #674 (the SEO + organic-traffic PR) and Phase 6 (blog rebuild) — research reads both to determine shipped-vs-remaining.
- Like Phases 7-11, expect this to be mostly verify-and-pin with a small amount of genuinely-new work (whichever SEO-* items PR #674 did not cover).

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Code touchpoints (verify during research)
- `src/app/layout.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/opengraph-image.tsx` — root SEO surface
- `src/lib/seo/**` — SEO metadata helpers (per memory, `owner-page-metadata.ts` etc.)
- `src/app/compare/[competitor]/**` — compare-page breadcrumbs (SEO-05)
- `src/components/layout/footer*` — footer sitemap link (SEO-06)
- Article/BreadcrumbList JSON-LD components — the existing structured-data pattern (SEO-03)

### Project rules
- `CLAUDE.md` — zero-tolerance rules; Vitest 4 + jsdom test conventions

</canonical_refs>

<deferred>
## Deferred Ideas

None — phase scope is SEO-01..07 only.

</deferred>

---

*Phase: 12-seo-metadata-schema-content-cleanup*
*Context gathered: 2026-05-21 via /gsd-discuss-phase 12 --auto*
