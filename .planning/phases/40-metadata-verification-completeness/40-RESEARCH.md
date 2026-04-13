# Phase 40: Metadata & Verification Completeness - Research

**Researched:** 2026-04-12
**Domain:** Next.js 16 Metadata API migration + JSON-LD breadcrumb completion
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Scope Expansion (Research-Driven)**
- **D-01:** Expand target pages from 4 to 7 based on factual codebase scan. All 7 currently use raw `metadata` objects with `title + description` only - no `alternates.canonical`, no OG tags, no Twitter card. Same gap pattern, same fix.
  - Legal/support (originally scoped): `/terms`, `/privacy`, `/security-policy`, `/support`
  - Resource detail pages (newly scoped): `/resources/seasonal-maintenance-checklist`, `/resources/security-deposit-reference-card`, `/resources/landlord-tax-deduction-tracker`
- **D-02:** Update ROADMAP.md Phase 40 success criteria to reflect 7-page scope. Original scope of 4 was set by milestone auditor who missed 3 resource pages with identical gap.

**GSC Verification (Conflict Resolution)**
- **D-03:** Drop `verification.google` meta tag requirement from Phase 40. Honor Phase 38 D-01 which locked: "Google Search Console is verified via DNS (domain name provider). No `metadata.verification.google` meta tag needed in root layout." VALID-01 is already satisfied via DNS - zero code change needed for `src/app/layout.tsx`.
- **D-04:** Update ROADMAP.md Phase 40 success criterion #2 from "add verification meta tag" to "VALID-01 satisfied via DNS verification - no meta tag needed." Document in SUMMARY that VALID-01 is not re-addressed because Phase 38 already resolved it.

**Metadata Migration Approach**
- **D-05:** All 7 pages migrate to `createPageMetadata({ title, description, path })` from `#lib/seo/page-metadata`. Factory handles canonical URL, OG tags, and Twitter card from minimal config. Follows Phase 34 D-08 pattern.
- **D-06:** Page titles rewritten per Phase 34 D-04 keyword-first, brand-trailing format. Root metadata already has `template: '%s | TenantFlow'`, so per-page title value should be the keyword phrase (brand appended automatically). Resource page titles already follow this pattern - preserve their content, just migrate the factory.
  - `/terms`: "Terms of Service"
  - `/privacy`: "Privacy Policy - Data Protection & User Rights"
  - `/security-policy`: "Security Policy & Vulnerability Disclosure"
  - `/support`: "Support Center - Property Management Help"
  - Resource titles: preserve existing keyword-rich values (already optimized in prior phases)
- **D-07:** Descriptions rewritten where weak per Phase 34 D-05 (keyword-rich, 150-160 chars, CTA-aware where appropriate). Planner has discretion on specific copy. Existing resource page descriptions already follow this pattern - preserve them.

**Breadcrumb JSON-LD Gap Closure**
- **D-08:** Add `createBreadcrumbJsonLd + JsonLdScript` to `/resources/security-deposit-reference-card` and `/resources/landlord-tax-deduction-tracker`. These pages currently have NO breadcrumb JSON-LD (gap from Phase 35 - only seasonal-maintenance-checklist got the HowTo + breadcrumb treatment in Phase 39). All other 12 public pages have breadcrumb JSON-LD. Closes SCHEMA-01 across the full public surface.
- **D-09:** Use 3-level breadcrumb path for resource pages: `Home > Resources > [Page Title]` (Phase 35 D-06 pattern). `createBreadcrumbJsonLd('/resources/security-deposit-reference-card')` and `createBreadcrumbJsonLd('/resources/landlord-tax-deduction-tracker')` handle path-based generation automatically.

### Claude's Discretion

- Exact title/description wording within Phase 34 D-04/D-05 guidelines
- Plan wave structure (likely one mechanical wave - all 7 pages follow identical pattern)
- Whether to delete now-unused `Metadata` type imports after migration
- Test coverage strategy for the metadata changes (unit test presence of canonical URLs on each page, or rely on Phase 38 E2E SEO smoke tests which already assert canonical link existence)

### Deferred Ideas (OUT OF SCOPE)

None. Per-content-type OG images (blog-og.jpg, compare-og.jpg) remain deferred per REQUIREMENTS.md "Future Requirements OG-01/OG-02" to v1.7+.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| META-11 | All public pages have `alternates.canonical` pointing to their canonical URL | 7 target pages currently missing canonical. Factory `createPageMetadata` sets `alternates.canonical` from `path`. Migration is 1-to-1 replacement. |
| VALID-01 | Google Search Console verification meta tag added to root layout | **No-op per D-03**: DNS verification satisfies GSC. Root `src/app/layout.tsx` requires zero changes. Phase 40 SUMMARY must document VALID-01 is marked satisfied via Phase 38 DNS path. |
| SCHEMA-01 (partial) | BreadcrumbList JSON-LD on public pages lacking it | 2 of 7 target pages (security-deposit-reference-card, landlord-tax-deduction-tracker) lack BreadcrumbList JSON-LD. D-08 closes this gap using `createBreadcrumbJsonLd`. Other 5 pages already have it. |

</phase_requirements>

## Summary

Phase 40 is a mechanical migration: all 7 target pages currently export a raw `Metadata` object with only `title` and `description`. The `createPageMetadata()` factory (shipped in Phase 33, consumed by 12 other pages) is a drop-in replacement that adds `alternates.canonical`, full `openGraph`, and `twitter` card from a minimal `{ title, description, path }` config. The factory is stable, unit-tested (9 tests), and already battle-tested across the public surface.

The only non-mechanical element is 3 resource-page title strings that currently include the literal `| TenantFlow` suffix inline. The root metadata's `title.template: '%s | TenantFlow'` auto-appends the brand to any plain-string child title, so leaving the suffix in produces a double-suffix (`Seasonal Maintenance Checklist | TenantFlow | TenantFlow`). Titles must be stripped during migration.

VALID-01 is a documented no-op. Phase 38 D-01 locked DNS-based Google Search Console verification; root `src/app/layout.tsx` was already audited and contains zero `verification` field. No code change is required there - the phase SUMMARY simply records that VALID-01 is satisfied via the Phase 38 DNS path.

**Primary recommendation:** Execute as a single-wave mechanical migration. Per-page task is identical: (1) swap raw `metadata` object for `createPageMetadata({ title, description, path })` call, (2) strip `| TenantFlow` suffix from resource titles, (3) on 2 resource pages, add `import` + `<JsonLdScript schema={createBreadcrumbJsonLd('/resources/...')}/>` inside `PageLayout`. Verification relies on the existing `tests/e2e/tests/public/seo-smoke.spec.ts` (which must be strengthened to assert `BreadcrumbList` on those 2 resource paths).

## Project Constraints (from CLAUDE.md)

These directives bind the planner and executor:

| Directive | Relevance |
|-----------|-----------|
| No `any` types - use `unknown` with type guards | Factory returns `Metadata` - typed by Next.js. No new `any` introduced. |
| No barrel files / re-exports | Imports must be direct from `#lib/seo/page-metadata` / `#lib/seo/breadcrumbs` / `#components/seo/json-ld-script`. |
| No inline styles | N/A - no style changes in this phase. |
| Path aliases `#lib/*`, `#components/*` required | All new imports use `#` aliases. |
| Server Components by default | All 7 target pages are already Server Components - no `'use client'`. |
| Max 300 lines per component | None of the migrations add lines; migration is neutral or reduces LOC. |
| Testing: Vitest unit tests (80% coverage) | Factory already covered by 9 tests in `src/lib/seo/__tests__/page-metadata.test.ts`. No new unit tests required. |
| Testing: Playwright E2E smoke tests | `tests/e2e/tests/public/seo-smoke.spec.ts` covers all 7 Phase 40 paths - must be updated per D-08 to assert `BreadcrumbList` on 2 resource pages. |
| TypeScript strict: `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` | Factory handles optional `noindex`/`ogImage` correctly via object spread. No changes needed. |
| Conventional commits via commitlint | Per-task commits: `feat(40-01): migrate {page} to createPageMetadata`. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.1.7 | Metadata API owner (title.template, alternates, openGraph, twitter, robots, verification) | Project-wide Next.js App Router; native Metadata API is the idiomatic path |
| react | 19.2.x | Component runtime | Already installed |
| typescript | 5.9.x | Type safety | CLAUDE.md strict mode enforced |

**Version verification (2026-04-12):**
- `package.json:121` declares `"next": "16.1.7"` [VERIFIED: package.json]
- Current Next.js latest is 16.1.x series on npm [CITED: npmjs.com/package/next]
- No upgrade needed; factory already targets the installed major

### Supporting (in-repo, already shipped)
| Module | Path | Purpose | When to Use |
|--------|------|---------|-------------|
| `createPageMetadata` | `src/lib/seo/page-metadata.ts` | Build full `Metadata` from `{ title, description, path, noindex?, ogImage? }` | **Every Phase 40 target page** |
| `createBreadcrumbJsonLd` | `src/lib/seo/breadcrumbs.ts` | Build `BreadcrumbList` schema from URL path with optional label overrides | 2 resource pages (per D-08) |
| `JsonLdScript` | `src/components/seo/json-ld-script.tsx` | Server Component JSON-LD renderer with XSS escaping | 2 resource pages (wraps breadcrumb schema) |
| `getSiteUrl` | `src/lib/generate-metadata.ts` | Single source of truth for base URL | Used internally by factories; not imported directly in Phase 40 targets |

### Alternatives Considered
| Instead of | Could Use | Why Rejected |
|------------|-----------|--------------|
| `createPageMetadata` factory | Inline `Metadata` literal | Duplicates canonical/OG/Twitter logic, drifts across pages, contradicts Phase 34 D-08 and the 12 existing consumers |
| `next-seo` npm package | Native Next.js 16 Metadata API | Already scoped out in REQUIREMENTS.md "Out of Scope" - redundant with native API |
| `next-sitemap` package | Dynamic sitemap route (Phase 32) | Also scoped out; not relevant to Phase 40 anyway |
| Custom XSS-escaping for JSON-LD | `JsonLdScript` component | Already-shipped, already-tested, already XSS-safe |

**Installation:** No new packages. Phase 40 is a pure migration within existing utilities.

## Architecture Patterns

### Recommended Pattern: Reference Implementation

The canonical consumer is `src/app/pricing/page.tsx` (Phase 34 output):

```typescript
// Source: src/app/pricing/page.tsx:21-26
import type { Metadata } from 'next'
import { createPageMetadata } from '#lib/seo/page-metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'Property Management Pricing & Plans',
  description: 'Compare TenantFlow pricing plans...',
  path: '/pricing'
})
```

### Pattern: Migration Template A (legal + support pages)

Applies to: `/terms`, `/privacy`, `/security-policy`, `/support`.

**Before:**
```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of service for TenantFlow...',
}
```

**After:**
```typescript
import type { Metadata } from 'next'
import { createPageMetadata } from '#lib/seo/page-metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'Terms of Service',
  description: 'Terms of service for TenantFlow...',
  path: '/terms'
})
```

### Pattern: Migration Template B (resource pages with existing breadcrumb)

Applies to: `/resources/seasonal-maintenance-checklist` (already has HowTo + BreadcrumbList JSON-LD from Phase 39; only metadata migrates).

**Before:**
```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Seasonal Maintenance Checklist for Rental Properties | TenantFlow',
  description: 'Free printable season-by-season maintenance checklist...',
}
```

**After (note suffix stripped):**
```typescript
import type { Metadata } from 'next'
import { createPageMetadata } from '#lib/seo/page-metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'Seasonal Maintenance Checklist for Rental Properties',
  description: 'Free printable season-by-season maintenance checklist...',
  path: '/resources/seasonal-maintenance-checklist'
})
```

### Pattern: Migration Template C (resource pages needing breadcrumb gap closure)

Applies to: `/resources/security-deposit-reference-card`, `/resources/landlord-tax-deduction-tracker`.

**Before (metadata portion):**
```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Security Deposit Laws by State - Quick Reference Card | TenantFlow',
  description: 'Free printable security deposit reference card...',
}

export default function SecurityDepositReferenceCardPage() {
  return (
    <PageLayout>
      {/* existing print-styles block */}
      {/* existing content */}
    </PageLayout>
  )
}
```

**After:**
```typescript
import type { Metadata } from 'next'
import { createPageMetadata } from '#lib/seo/page-metadata'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import { JsonLdScript } from '#components/seo/json-ld-script'

export const metadata: Metadata = createPageMetadata({
  title: 'Security Deposit Laws by State - Quick Reference Card',
  description: 'Free printable security deposit reference card...',
  path: '/resources/security-deposit-reference-card'
})

export default function SecurityDepositReferenceCardPage() {
  const breadcrumbSchema = createBreadcrumbJsonLd(
    '/resources/security-deposit-reference-card',
    { 'security-deposit-reference-card': 'Security Deposit Laws by State' }
  )

  return (
    <PageLayout>
      <JsonLdScript schema={breadcrumbSchema} />
      {/* existing print-styles block */}
      {/* existing content */}
    </PageLayout>
  )
}
```

**Override rationale:** Default `formatSegment()` would produce `Security Deposit Reference Card`; the H1 reads `Security Deposit Laws by State`, so an override keeps the breadcrumb label aligned with the visible page heading. For `landlord-tax-deduction-tracker`, the default `Landlord Tax Deduction Tracker` already matches the H1 - no override needed.

### Anti-Patterns to Avoid
- **Keeping the `| TenantFlow` suffix in resource titles** - produces `Foo | TenantFlow | TenantFlow` via `title.template`. **Must strip.**
- **Manually specifying `openGraph` or `twitter` fields per page** - factory already produces them; duplicating creates drift.
- **Adding `verification.google` to root layout** - contradicts Phase 38 D-01 locked decision.
- **Placing `<JsonLdScript>` outside `<PageLayout>`** - script tag must render inside `<body>`, not in a fragment wrapper. Existing pages place it as the first child of `PageLayout`.
- **Using string-literal import paths like `'../../lib/seo/...'`** - `#lib/*` alias is required by CLAUDE.md.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Canonical URL assembly | Concatenating `process.env.NEXT_PUBLIC_APP_URL + path` | `createPageMetadata({ path })` | Factory uses `getSiteUrl()` - single source of truth, path normalization, 9 tests guarding contract |
| OpenGraph tags | Typing out `openGraph: { title, description, url, siteName, type, locale, images: [...] }` per page | `createPageMetadata` | Already correct and typed in factory; 12 pages already use it |
| Twitter card | `twitter: { card: 'summary_large_image', ... }` blocks | `createPageMetadata` | Ships with factory |
| BreadcrumbList JSON-LD | Writing `@type: 'BreadcrumbList'` inline with `itemListElement` arrays | `createBreadcrumbJsonLd(path, overrides?)` | Path-splitting, title-casing, last-item-URL-omission, and schema-dts typing already handled |
| JSON-LD XSS escaping | `<script dangerouslySetInnerHTML=...>` | `<JsonLdScript schema={...}/>` | `.replace(/</g, '\\u003c')` already applied inside component |
| Title + brand concatenation per page | `title: 'Foo | TenantFlow'` | Let root `title.template: '%s | TenantFlow'` handle it | Next.js merges template with child string title automatically |

**Key insight:** All 6 of the above primitives were built in Phase 33 precisely so migration phases like 40 are mechanical. Re-inventing any of them is a regression.

## Common Pitfalls

### Pitfall 1: Double brand suffix on titles
**What goes wrong:** Resource page metadata currently has `title: 'Foo | TenantFlow'`. The root layout's `generateSiteMetadata()` declares `title.template: '%s | TenantFlow'`. Next.js treats the per-page title as a `string` child of the template, producing `Foo | TenantFlow | TenantFlow` in the `<title>` tag.
**Why it happens:** The per-page file was written before the root template was set (Phase 34), so it hard-coded the brand suffix. Nobody caught it during migration because the pages retained the raw `metadata` object and never ran through the factory.
**How to avoid:** Strip `| TenantFlow` from all 3 resource-page titles during migration. Verify the final rendered `<title>` via E2E smoke test.
**Warning signs:** `grep "| TenantFlow'" src/app/resources/` returns matches; double-suffix visible in browser tab or view-source.
**Affected files:**
- `src/app/resources/seasonal-maintenance-checklist/page.tsx:13`
- `src/app/resources/security-deposit-reference-card/page.tsx:11`
- `src/app/resources/landlord-tax-deduction-tracker/page.tsx:12`

### Pitfall 2: Stripping the `Metadata` type import
**What goes wrong:** After migration, the literal `Metadata` type is only referenced in the annotation `export const metadata: Metadata = createPageMetadata(...)`. Removing the import breaks typing. Keeping the import but removing the annotation works but loses type safety at the export site.
**How to avoid:** Keep `import type { Metadata } from 'next'` and keep the `: Metadata` annotation. This matches the reference pattern in `src/app/pricing/page.tsx`.
**Warning signs:** TypeScript error `Cannot find name 'Metadata'` after migration.

### Pitfall 3: Next.js metadata field replacement vs merging
**What goes wrong:** Developers assume nested objects like `openGraph` merge across layout levels. They do not - Next.js **replaces** nested metadata fields; only top-level keys are merged.
**Why it matters for Phase 40:** The factory re-specifies every field it cares about (`title`, `description`, `alternates`, `openGraph`, `twitter`, optional `robots`). The root metadata also specifies `openGraph` and `twitter` defaults. Because the factory's output fully replaces the root's `openGraph`/`twitter` objects, the factory's re-specification of `siteName`, `type`, `locale`, and image dimensions is **load-bearing** - those fields do not fall through from the root.
**How to avoid:** Do not remove any field from the factory thinking "the root will provide it." The root fields are replaced, not merged.
**Source:** [CITED: vercel.com/templates next-sitemap discussion; Next.js 16 Metadata docs]

### Pitfall 4: `<JsonLdScript>` rendered outside `<PageLayout>`
**What goes wrong:** Putting `<JsonLdScript>` above `<PageLayout>` as a sibling fragment breaks rendering. The component is a Server Component `<script>` element; it must be inside the document body.
**How to avoid:** Place `<JsonLdScript>` as the **first child** of `<PageLayout>`. This matches `seasonal-maintenance-checklist/page.tsx:132-133` and every other consumer.

### Pitfall 5: E2E smoke test asserts only `Organization` schema on 2 resource pages
**What goes wrong:** `tests/e2e/tests/public/seo-smoke.spec.ts` currently asserts `expectedSchemas: ['Organization']` for both security-deposit-reference-card and landlord-tax-deduction-tracker. After Phase 40 adds BreadcrumbList to those pages, the test still passes (assertion is `contains`, not `exactly equal`), but it no longer verifies the new behavior.
**Why it matters:** SCHEMA-01 claims "BreadcrumbList on all public pages" - an E2E spec that does not assert BreadcrumbList on these 2 pages weakens the verification contract.
**How to avoid:** Update the spec to include `'BreadcrumbList'` in `expectedSchemas` for both resource paths. Add to Phase 40 planner tasks.
**Location:** `tests/e2e/tests/public/seo-smoke.spec.ts:124-148` (approx; verify line ranges before edit).

## Code Examples

### Example: Factory call for each target page

| Page | `createPageMetadata` call |
|------|---------------------------|
| `/terms` | `createPageMetadata({ title: 'Terms of Service', description: '...', path: '/terms' })` |
| `/privacy` | `createPageMetadata({ title: 'Privacy Policy - Data Protection & User Rights', description: '...', path: '/privacy' })` |
| `/security-policy` | `createPageMetadata({ title: 'Security Policy & Vulnerability Disclosure', description: '...', path: '/security-policy' })` |
| `/support` | `createPageMetadata({ title: 'Support Center - Property Management Help', description: '...', path: '/support' })` |
| `/resources/seasonal-maintenance-checklist` | `createPageMetadata({ title: 'Seasonal Maintenance Checklist for Rental Properties', description: '...', path: '/resources/seasonal-maintenance-checklist' })` |
| `/resources/security-deposit-reference-card` | `createPageMetadata({ title: 'Security Deposit Laws by State - Quick Reference Card', description: '...', path: '/resources/security-deposit-reference-card' })` |
| `/resources/landlord-tax-deduction-tracker` | `createPageMetadata({ title: 'Landlord Tax Deduction Tracker', description: '...', path: '/resources/landlord-tax-deduction-tracker' })` |

### Example: Breadcrumb wiring (pages needing D-08)

```typescript
// Source: mirror of src/app/resources/seasonal-maintenance-checklist/page.tsx:125-133
import { JsonLdScript } from '#components/seo/json-ld-script'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'

export default function SecurityDepositReferenceCardPage() {
  const breadcrumbSchema = createBreadcrumbJsonLd(
    '/resources/security-deposit-reference-card',
    { 'security-deposit-reference-card': 'Security Deposit Laws by State' }
  )

  return (
    <PageLayout>
      <JsonLdScript schema={breadcrumbSchema} />
      {/* rest of existing page body unchanged */}
    </PageLayout>
  )
}
```

## Current Metadata Inventory

Ground-truth snapshot from codebase (2026-04-12):

| Page | Current title | Has `| TenantFlow` suffix? | Has canonical? | Has OG? | Has Twitter? | Has BreadcrumbList JSON-LD? | Migration category |
|------|--------------|---------------------------|----------------|---------|--------------|----------------------------|--------------------|
| `src/app/terms/page.tsx` | `Terms of Service` | No | No | No | No | Yes (existing) | Template A |
| `src/app/privacy/page.tsx` | `Privacy Policy - Data Protection & User Rights` | No | No | No | No | Yes (existing) | Template A |
| `src/app/security-policy/page.tsx` | `Security Policy & Vulnerability Disclosure` | No | No | No | No | Yes (existing) | Template A |
| `src/app/support/page.tsx` | `Support Center - Property Management Help` | No | No | No | No | Yes (existing) | Template A |
| `src/app/resources/seasonal-maintenance-checklist/page.tsx` | `Seasonal Maintenance Checklist for Rental Properties \| TenantFlow` | **Yes** | No | No | No | Yes (Phase 39) | Template B - strip suffix |
| `src/app/resources/security-deposit-reference-card/page.tsx` | `Security Deposit Laws by State - Quick Reference Card \| TenantFlow` | **Yes** | No | No | No | **No** - needs D-08 | Template C - strip suffix + add breadcrumb |
| `src/app/resources/landlord-tax-deduction-tracker/page.tsx` | `Landlord Tax Deduction Tracker \| TenantFlow` | **Yes** | No | No | No | **No** - needs D-08 | Template C - strip suffix + add breadcrumb |

**Root layout:** `src/app/layout.tsx` calls `generateSiteMetadata()`. [VERIFIED: grep returns zero matches for `verification` in root layout.] **No change per D-03.**

## State of the Art

Next.js 16 `title.template` and inherited-metadata semantics are stable and well-documented. No recent API churn affects Phase 40.

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Inline `<head>` tag composition | `export const metadata: Metadata` (Next.js 13+) | In use - no change |
| Manual `<link rel="canonical">` in JSX | `alternates.canonical` in Metadata object | Factory already emits |
| Inline `<script type="application/ld+json">` with `dangerouslySetInnerHTML` | `<JsonLdScript>` Server Component | Already shipped; use for all new JSON-LD |
| `process.env.NEXT_PUBLIC_APP_URL` direct reads | `getSiteUrl()` helper | Factory uses internally |

**Deprecated/outdated in this repo:**
- Inline `<head>` tags - none exist in target pages.
- Raw `dangerouslySetInnerHTML` for JSON-LD - still present in the two resource pages for *print-style media queries* (pre-existing and unrelated to JSON-LD); Phase 40 does not touch those blocks.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Unit framework | Vitest 4.0 (jsdom) |
| E2E framework | Playwright 1.58 |
| Unit config | `vitest.config.ts` (project: `unit`) |
| E2E config | `tests/e2e/playwright.config.ts` |
| Quick unit run | `pnpm test:unit -- --run src/lib/seo/__tests__/page-metadata.test.ts` |
| Quick E2E run | `pnpm test:e2e -- --grep "SEO smoke"` |
| Full suite | `pnpm validate:quick && pnpm test:e2e` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| META-11 | Every public page emits `<link rel="canonical">` to its absolute URL | E2E (existing) | `pnpm test:e2e -- tests/e2e/tests/public/seo-smoke.spec.ts --grep "canonical"` | Yes - covers all 7 Phase 40 paths |
| META-11 | Factory produces `alternates.canonical` from `path` | Unit (existing) | `pnpm test:unit -- --run src/lib/seo/__tests__/page-metadata.test.ts` | Yes - 9 tests |
| SCHEMA-01 | BreadcrumbList JSON-LD present on 2 resource pages | E2E (needs update per Pitfall 5) | `pnpm test:e2e -- tests/e2e/tests/public/seo-smoke.spec.ts --grep "JSON-LD"` | Yes - needs assertion strengthening |
| SCHEMA-01 | `createBreadcrumbJsonLd` produces valid BreadcrumbList for 3-level resource paths | Unit (existing) | `pnpm test:unit -- --run src/lib/seo/__tests__/breadcrumbs.test.ts` | Yes |
| VALID-01 | Root layout has no `verification` field (DNS path) | Grep assertion (manual in SUMMARY) | `grep -r "verification" src/app/layout.tsx` -> zero matches | N/A (documentation only) |
| No double `| TenantFlow` suffix in `<title>` tag | E2E | `pnpm test:e2e -- --grep "title brand"` | **Needs new assertion** |

### Sampling Rate (Nyquist)
- **Per task commit:** `pnpm test:unit -- --run src/lib/seo/__tests__/` (factory + breadcrumb unit tests, ~1s)
- **Per wave merge:** `pnpm validate:quick && pnpm test:e2e -- tests/e2e/tests/public/seo-smoke.spec.ts` (full SEO E2E spec)
- **Phase gate:** Full suite green before `/gsd-verify-work` - `pnpm validate:quick && pnpm test:e2e`

### Wave 0 Gaps
- [ ] Update `tests/e2e/tests/public/seo-smoke.spec.ts` assertion for `/resources/security-deposit-reference-card` and `/resources/landlord-tax-deduction-tracker` to include `'BreadcrumbList'` in `expectedSchemas` (per Pitfall 5)
- [ ] Add E2E assertion that `<title>` element does not contain the literal `| TenantFlow | TenantFlow` on any of the 3 resource paths (one-shot guard against Pitfall 1 regression)

Existing coverage for all other Phase 40 requirements is sufficient; no new unit tests required.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V1 Architecture, Design, Threat Modeling | Low | N/A - no architectural change |
| V2 Authentication | No | No auth surface touched |
| V3 Session Management | No | No session code touched |
| V4 Access Control | No | All 7 pages are public (proxy.ts allowlisted) |
| V5 Validation, Sanitization, Encoding | Yes | Breadcrumb JSON-LD output must be XSS-safe - `<JsonLdScript>` handles via `.replace(/</g, '\\u003c')` |
| V6 Stored Cryptography | No | No crypto in scope |
| V7 Error Handling and Logging | No | No error paths changed |
| V14 Configuration | Yes (indirect) | `getSiteUrl()` is single source for base URL - no hard-coded prod URLs leaking |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation | Status in Phase 40 |
|---------|--------|---------------------|--------------------|
| XSS via JSON-LD injection | Tampering | `<` escaping in `<JsonLdScript>` component | Already mitigated - factory emits fixed strings, no user input |
| Metadata leak via inherited fields | Information Disclosure | Per-page explicit metadata for each public page | Phase 40 closes this on 7 pages |
| Phishing via mis-configured canonical | Spoofing | Canonical URL uses authoritative `getSiteUrl()` | Factory enforces |
| Open redirect via `path` param | Tampering | `path` is a literal string in source code, not user input | No risk - authors control strings |

**No user input enters Phase 40 code paths.** All metadata values are build-time constants. Factory already unit-tested for correct URL assembly.

## Runtime State Inventory

*Not applicable* - Phase 40 is a code-only change. No databases, external services, OS-registered state, secrets, build artifacts, or runtime caches hold references to the migrated metadata. Next.js regenerates all metadata at build time; CDNs revalidate naturally on deploy.

**Stored data:** None.
**Live service config:** None - no external service stores these titles/descriptions.
**OS-registered state:** None.
**Secrets/env vars:** None referenced by name in migrated code.
**Build artifacts:** Next.js build cache on Vercel will regenerate on deploy - no manual invalidation needed.

## Environment Availability

*Not applicable* - Phase 40 has no external dependencies. All work is source edits + existing test suites.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| *(none)* | All claims were verified against source files or cited to official docs | - | - |

All statements in this research are either (a) verified via `Read`/`Grep` of the actual files, (b) cited to Next.js documentation, or (c) direct quotes from the locked CONTEXT.md decisions. No `[ASSUMED]` claims.

## Open Questions

1. **Should the migration also delete now-unused `Metadata` type imports?**
   - What we know: CLAUDE.md bans unused imports; TypeScript strict mode catches them.
   - What's unclear: Whether planner prefers keeping `import type { Metadata } from 'next'` for the `: Metadata` annotation (mirrors `pricing/page.tsx`) vs. removing both.
   - Recommendation: **Keep the annotation and import** - matches existing factory consumers, preserves explicit typing at the export site. (This is marked as Claude's Discretion in CONTEXT.md - planner can lock in either direction.)

2. **Should Phase 40 strengthen the `seo-smoke.spec.ts` assertions as part of the mechanical migration or defer to a follow-up quick task?**
   - What we know: Current spec asserts `['Organization']` for 2 of the 3 resource pages; after D-08, they also emit `BreadcrumbList`.
   - What's unclear: Whether the planner wants test-strengthening inside Phase 40 or as a subsequent quick task.
   - Recommendation: **Include test update in Phase 40** - SCHEMA-01 verification is part of phase success criteria; shipping new behavior without an updated assertion creates silent drift.

## Sources

### Primary (HIGH confidence)
- `src/lib/seo/page-metadata.ts` - read - 54 lines, factory contract verified
- `src/lib/seo/breadcrumbs.ts` - read - `createBreadcrumbJsonLd(path, overrides?)` signature and `formatSegment()` title-casing verified
- `src/components/seo/json-ld-script.tsx` - read - XSS escaping `replace(/</g, '\\u003c')` verified
- `src/lib/generate-metadata.ts` - read - root metadata, `title.template: '%s | TenantFlow'`, no `verification` field
- `src/app/layout.tsx` - read - zero `verification` field; confirms D-03
- `src/app/pricing/page.tsx` - read - reference consumer pattern
- `src/app/terms/page.tsx` - read - current raw `Metadata` pattern
- `src/app/privacy/page.tsx` - read - current raw `Metadata` pattern
- `src/app/security-policy/page.tsx` - read - current raw `Metadata` pattern
- `src/app/support/page.tsx` - read - current raw `Metadata` pattern
- `src/app/resources/seasonal-maintenance-checklist/page.tsx` - read - Phase 39 JSON-LD wiring + inline `| TenantFlow` suffix
- `src/app/resources/security-deposit-reference-card/page.tsx` - read - no JsonLdScript + inline suffix
- `src/app/resources/landlord-tax-deduction-tracker/page.tsx` - read - no JsonLdScript + inline suffix
- `src/lib/seo/__tests__/page-metadata.test.ts` - read - 9 factory contract tests
- `tests/e2e/tests/public/seo-smoke.spec.ts` - read - existing E2E coverage; weakness identified on 2 resource paths
- `.planning/phases/40-metadata-verification-completeness/40-CONTEXT.md` - read - 9 locked decisions
- `.planning/phases/38-validation-verification/38-CONTEXT.md` - referenced - D-01 locks DNS-based GSC
- `.planning/phases/39-structured-data-gap-closure/39-VERIFICATION.md` - read - confirms only seasonal-maintenance-checklist got breadcrumb in Phase 39
- `.planning/REQUIREMENTS.md` - read - META-11, VALID-01, SCHEMA-01 definitions
- `package.json` - read - `next@16.1.7` confirmed
- Next.js 16 Metadata API docs - [CITED: nextjs.org/docs/app/api-reference/file-conventions/metadata]
- Next.js `title.template` semantics - [CITED: nextjs.org/docs/app/api-reference/functions/generate-metadata#title]

### Secondary (MEDIUM confidence)
- Next.js metadata field-replacement semantics (nested `openGraph`/`twitter` replace, top-level merge) - [CITED: Next.js GitHub discussions and WebSearch cross-check with official docs]

### Tertiary (LOW confidence)
- *(none)*

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - factory and supporting utilities are in-repo, read directly, and already consumed by 12 pages
- Architecture patterns: **HIGH** - reference implementation exists at `src/app/pricing/page.tsx`; 6 additional consumers demonstrate Template A pattern
- Pitfalls: **HIGH** - all 5 pitfalls verified against source files via Grep/Read
- VALID-01 no-op: **HIGH** - root layout directly read and confirmed lacks `verification`; Phase 38 D-01 frozen

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (1 month - stable API surface, no Next.js 17 migration imminent)

## RESEARCH COMPLETE
