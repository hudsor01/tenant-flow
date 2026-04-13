---
phase: 40
name: Metadata & Verification Completeness
status: decided
decisions: 9
deferred: 0
---

# Phase 40: Metadata & Verification Completeness — Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate all remaining public pages using raw `metadata` objects to `createPageMetadata()` factory (canonical URL + OG tags + Twitter card). Scope expanded from original 4 pages to 7 after factual codebase scan revealed same gap on 3 resource detail pages. Also closes 2 SCHEMA-01 gaps on resource pages missing breadcrumb JsonLdScript. Root layout GSC verification is a no-op (satisfied via DNS verification, locked in Phase 38 D-01).

</domain>

<decisions>
## Implementation Decisions

### Scope Expansion (Research-Driven)

- **D-01:** Expand target pages from 4 to 7 based on factual codebase scan. All 7 currently use raw `metadata` objects with `title + description` only — no `alternates.canonical`, no OG tags, no Twitter card. Same gap pattern, same fix.
  - Legal/support (originally scoped): `/terms`, `/privacy`, `/security-policy`, `/support`
  - Resource detail pages (newly scoped): `/resources/seasonal-maintenance-checklist`, `/resources/security-deposit-reference-card`, `/resources/landlord-tax-deduction-tracker`
- **D-02:** Update ROADMAP.md Phase 40 success criteria to reflect 7-page scope. Original scope of 4 was set by milestone auditor who missed 3 resource pages with identical gap.

### GSC Verification (Conflict Resolution)

- **D-03:** Drop `verification.google` meta tag requirement from Phase 40. Honor Phase 38 D-01 which locked: "Google Search Console is verified via DNS (domain name provider). No `metadata.verification.google` meta tag needed in root layout." VALID-01 is already satisfied via DNS — zero code change needed for `src/app/layout.tsx`.
- **D-04:** Update ROADMAP.md Phase 40 success criterion #2 from "add verification meta tag" to "VALID-01 satisfied via DNS verification — no meta tag needed." Document in SUMMARY that VALID-01 is not re-addressed because Phase 38 already resolved it.

### Metadata Migration Approach

- **D-05:** All 7 pages migrate to `createPageMetadata({ title, description, path })` from `#lib/seo/page-metadata`. Factory handles canonical URL, OG tags (title/description/url/siteName/type/locale/images), and Twitter card (summary_large_image) from minimal config. Follows Phase 34 D-08 pattern.
- **D-06:** Page titles rewritten per Phase 34 D-04 keyword-first, brand-trailing format. Root metadata already has `template: '%s | TenantFlow'`, so per-page title value should be the keyword phrase (brand appended automatically). Resource page titles already follow this pattern — preserve their content, just migrate the factory.
  - `/terms`: "Terms of Service"
  - `/privacy`: "Privacy Policy - Data Protection & User Rights"
  - `/security-policy`: "Security Policy & Vulnerability Disclosure"
  - `/support`: "Support Center - Property Management Help"
  - Resource titles: preserve existing keyword-rich values (already optimized in prior phases)
- **D-07:** Descriptions rewritten where weak per Phase 34 D-05 (keyword-rich, 150-160 chars, CTA-aware where appropriate). Planner has discretion on specific copy. Existing resource page descriptions already follow this pattern — preserve them.

### Breadcrumb JSON-LD Gap Closure

- **D-08:** Add `createBreadcrumbJsonLd + JsonLdScript` to `/resources/security-deposit-reference-card` and `/resources/landlord-tax-deduction-tracker`. These pages currently have NO breadcrumb JSON-LD (gap from Phase 35 — only seasonal-maintenance-checklist got the HowTo + breadcrumb treatment in Phase 39). All other 12 public pages have breadcrumb JSON-LD. Closes SCHEMA-01 across the full public surface.
- **D-09:** Use 3-level breadcrumb path for resource pages: `Home > Resources > [Page Title]` (Phase 35 D-06 pattern). `createBreadcrumbJsonLd('/resources/security-deposit-reference-card')` and `createBreadcrumbJsonLd('/resources/landlord-tax-deduction-tracker')` handle path-based generation automatically.

### Claude's Discretion

- Exact title/description wording within Phase 34 D-04/D-05 guidelines
- Plan wave structure (likely one mechanical wave — all 7 pages follow identical pattern)
- Whether to delete now-unused `Metadata` type imports after migration
- Test coverage strategy for the metadata changes (unit test presence of canonical URLs on each page, or rely on Phase 38 E2E SEO smoke tests which already assert canonical link existence)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 40 Target Pages (Migration Targets)
- `src/app/terms/page.tsx` — Raw metadata, has breadcrumb JsonLdScript (no migration needed for breadcrumb, only metadata)
- `src/app/privacy/page.tsx` — Raw metadata, has breadcrumb JsonLdScript
- `src/app/security-policy/page.tsx` — Raw metadata, has breadcrumb JsonLdScript
- `src/app/support/page.tsx` — Raw metadata, has breadcrumb JsonLdScript
- `src/app/resources/seasonal-maintenance-checklist/page.tsx` — Raw metadata, has HowTo + breadcrumb JsonLdScript (Phase 39)
- `src/app/resources/security-deposit-reference-card/page.tsx` — Raw metadata, NO breadcrumb JsonLdScript (needs D-08)
- `src/app/resources/landlord-tax-deduction-tracker/page.tsx` — Raw metadata, NO breadcrumb JsonLdScript (needs D-08)

### SEO Utilities (Phase 33 Output)
- `src/lib/seo/page-metadata.ts` — `createPageMetadata({ title, description, path, noindex?, ogImage? })` factory
- `src/lib/seo/breadcrumbs.ts` — `createBreadcrumbJsonLd(path, overrides?)` for BreadcrumbList schema
- `src/components/seo/json-ld-script.tsx` — `JsonLdScript` component
- `src/lib/generate-metadata.ts` — `getSiteUrl()` and root `generateSiteMetadata()` with `title.template: '%s | TenantFlow'`

### Root Layout (No Changes Needed)
- `src/app/layout.tsx` — `generateMetadata()` calls `generateSiteMetadata()`. Phase 38 D-01 locked: no `verification.google` field needed (DNS-verified). Phase 40 makes no changes here.

### Prior Phase Decisions (Binding)
- `.planning/phases/34-per-page-metadata/34-CONTEXT.md` — D-04 (keyword-first titles), D-05 (150-160 char descriptions with CTAs), D-08 (migrate inline metadata to factory)
- `.planning/phases/35-structured-data-enrichment/35-CONTEXT.md` — D-06 (3-level breadcrumb for resources), D-07 (2-level for legal)
- `.planning/phases/38-validation-verification/38-CONTEXT.md` — D-01 (GSC via DNS, no meta tag), D-02 (E2E SEO smoke tests assert canonical)
- `.planning/phases/39-structured-data-gap-closure/39-VERIFICATION.md` — Phase 39 only added JSON-LD to seasonal-maintenance-checklist among resource pages

### Roadmap & Requirements
- `.planning/ROADMAP.md` — Phase 40 section (success criteria needs update per D-02 and D-04)
- `.planning/REQUIREMENTS.md` — META-11 (canonical URLs), VALID-01 (GSC verification — already satisfied via DNS)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createPageMetadata({ title, description, path })` — produces full `Metadata` with `alternates.canonical`, OG tags, Twitter card. Already used by 12 other public pages.
- `createBreadcrumbJsonLd(path)` — auto-generates BreadcrumbList from URL path segments using `getSiteUrl()` base.
- `JsonLdScript` — XSS-escaped JSON-LD renderer. Used across 14+ pages already.
- `getSiteUrl()` — single source of truth for base URL (Phase 33).

### Established Patterns
- **Server components by default** — all 7 target pages are already server components (no `'use client'`). No server/client split needed.
- **Import pattern** (from 12 existing consumers): `import { createPageMetadata } from '#lib/seo/page-metadata'; export const metadata = createPageMetadata({...})`
- **Breadcrumb pattern** (from Phase 35): `<JsonLdScript schema={createBreadcrumbJsonLd('/path')} />` rendered as first child of `PageLayout`
- **Root metadata template** — `title.template: '%s | TenantFlow'` appends brand automatically, so per-page title is just the keyword phrase

### Integration Points
- No new dependencies
- No new utilities needed — all tooling exists from Phase 33
- All 7 pages already use `PageLayout` — zero layout changes
- `createPageMetadata` generic `ogImage` parameter is optional — defaults to `/images/property-management-og.jpg` which is acceptable for all 7 pages (no per-page OG image for legal/support in this phase)

### Type-Safety Check
- `createPageMetadata` returns `Metadata` type (Next.js) — type-compatible with current `export const metadata: Metadata` pattern. No type errors expected.

</code_context>

<specifics>
## Specific Ideas

- **Scope expansion is evidence-driven** — grep confirmed exactly 7 pages use raw `metadata` without canonical. Auditor listed only 4 in the original Phase 40 success criteria; the other 3 are the same gap and should be closed in this phase.
- **VALID-01 conflict resolution is non-negotiable** — Phase 38 D-01 already locked DNS-based GSC verification. Adding a meta tag now would contradict a prior locked decision and create an inconsistent milestone record. Keep the layout.tsx change to zero.
- **Breadcrumb gap on 2 resource pages** is a leftover from Phase 35 (which only fully migrated seasonal-maintenance-checklist). Closing it here is logical since we're already editing those files for metadata.
- **Title rewrites per Phase 34 D-04** — brand is appended automatically via root `title.template: '%s | TenantFlow'`. Per-page title should be the keyword phrase only, not include `| TenantFlow` suffix (Next.js adds it).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. Per-content-type OG images (blog-og.jpg, compare-og.jpg) remain deferred per REQUIREMENTS.md "Future Requirements OG-01/OG-02" to v1.7+.

</deferred>

---

*Phase: 40-metadata-verification-completeness*
*Context gathered: 2026-04-12*
