---
phase: 35-structured-data-enrichment
plan: "02"
subsystem: seo
tags: [structured-data, json-ld, schema-org, website, software-application, howto, comparison]
dependency_graph:
  requires:
    - 35-01 (JsonLdScript component, createBreadcrumbJsonLd, getSiteUrl export)
    - 33-01 (schema-dts package, SEO utility foundation)
  provides:
    - SoftwareApplication JSON-LD factory (createSoftwareApplicationJsonLd)
    - WebSite + SearchAction JSON-LD on homepage
    - Paired SoftwareApplication schemas on all compare pages
    - HowTo + BreadcrumbList JSON-LD on seasonal maintenance checklist
  affects:
    - src/app/page.tsx
    - src/app/compare/[competitor]/page.tsx
    - src/app/resources/seasonal-maintenance-checklist/page.tsx
tech_stack:
  added: []
  patterns:
    - SoftwareApplication JSON-LD factory pattern (reusable across compare pages)
    - WebSite + SearchAction for Google sitelinks search box
    - HowTo with HowToSection + HowToStep for checklist pages
key_files:
  created:
    - src/lib/seo/software-application-schema.ts
    - src/lib/seo/__tests__/software-application-schema.test.ts
  modified:
    - src/app/page.tsx
    - src/app/compare/[competitor]/page.tsx
    - src/app/resources/seasonal-maintenance-checklist/page.tsx
decisions:
  - "WebSite schema uses inline object with 'as const' type assertions since 'query-input' is a Google extension not in schema-dts; cast to JsonLdScript schema prop type is safe"
  - "SoftwareApplication factory defaults applicationCategory to BusinessApplication and operatingSystem to Web Browser"
  - "HowTo schema built inline (not via factory) per plan guidance since it is a one-off use on the checklist page"
  - "Competitor price strings stripped with /[^0-9.]/g regex before passing to SoftwareApplication offers"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-09T01:02:40Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 5
---

# Phase 35 Plan 02: Structured Data Enrichment (WebSite, SoftwareApplication, HowTo) Summary

**One-liner:** WebSite+SearchAction on homepage, paired SoftwareApplication schemas on compare pages via reusable factory, HowTo schema with 4 seasonal sections on maintenance checklist.

## Tasks Completed

| Task | Name | Status | Key Files |
|------|------|--------|-----------|
| 1 | SoftwareApplication factory, compare page migration, homepage WebSite schema | Complete | software-application-schema.ts, compare/page.tsx, page.tsx |
| 2 | HowTo schema on maintenance checklist + SoftwareApplication unit tests | Complete | seasonal-maintenance-checklist/page.tsx, software-application-schema.test.ts |

## What Was Built

### Task 1: SoftwareApplication Factory + Compare Page Migration + Homepage WebSite Schema

**`src/lib/seo/software-application-schema.ts`** — New factory function `createSoftwareApplicationJsonLd` accepting name, description, url, applicationCategory, operatingSystem, and offers. Defaults applicationCategory to `BusinessApplication` and operatingSystem to `Web Browser`. Produces schema-dts typed `SoftwareApplication` for use with `JsonLdScript`.

**`src/app/compare/[competitor]/page.tsx`** — Replaced inline `WebPage` schema script tag with three `<JsonLdScript>` calls:
- TenantFlow `SoftwareApplication` (4 price tiers: Free/$29/$79/$199)
- Competitor `SoftwareApplication` (prices extracted from `competitorPricing` array)
- `BreadcrumbList` via `createBreadcrumbJsonLd`

Also replaced manual `baseUrl` construction with `getSiteUrl()` in both `generateMetadata()` and `ComparePage()`.

**`src/app/page.tsx`** — Added WebSite JSON-LD with `SearchAction` (potentialAction) for Google sitelinks search box. Uses inline object with `'@type': 'WebSite' as const` since `query-input` is a Google-specific extension not in schema-dts types.

### Task 2: HowTo Schema + SoftwareApplication Unit Tests

**`src/lib/seo/__tests__/software-application-schema.test.ts`** — 6 unit tests covering:
1. Default applicationCategory (BusinessApplication) and operatingSystem (Web Browser)
2. Offers with @type Offer and USD default priceCurrency
3. Omits offers when not provided
4. Custom applicationCategory and operatingSystem overrides
5. URL inclusion/omission
6. Custom priceCurrency (EUR)

**`src/app/resources/seasonal-maintenance-checklist/page.tsx`** — Added HowTo JSON-LD with 4 `HowToSection` steps (Spring/Summer/Fall/Winter), each containing `HowToStep` items from the `seasons` array. Added `BreadcrumbList` via `createBreadcrumbJsonLd`. Print CSS style block preserved untouched.

## Verification Results

| Check | Result |
|-------|--------|
| `pnpm typecheck` | Passed — zero errors |
| `pnpm lint` | Passed — zero errors |
| `pnpm test:unit` (1579 tests) | All passed |
| No inline JSON-LD script tag on compare pages | Confirmed |
| `WebSite` schema on homepage | Confirmed |
| `HowTo` schema on checklist | Confirmed |
| `createSoftwareApplicationJsonLd` exported | Confirmed |

## Deviations from Plan

None — plan executed exactly as written.

**Worktree setup note:** Working tree required restoration (`git checkout HEAD -- src/ public/ package.json pnpm-lock.yaml`) after branch base correction (`git reset --soft`), since the working tree had been populated from main (which lacked phase 33/34 SEO utilities). Not a plan deviation.

## Threat Surface Scan

No new trust boundaries introduced. All schema data is static (build-time) or from the `COMPETITORS` constant (not user input). `JsonLdScript` XSS-escapes `<` to `\u003c`. Consistent with T-35-03/T-35-04/T-35-05 dispositions in the plan threat model.

## Known Stubs

None — all schemas are fully wired to real data sources (`COMPETITORS` constant, `seasons` constant, `getSiteUrl()`).

## Self-Check: PASSED

Files created/modified:
- src/lib/seo/software-application-schema.ts — exists
- src/lib/seo/__tests__/software-application-schema.test.ts — exists
- src/app/page.tsx — modified (WebSite schema added)
- src/app/compare/[competitor]/page.tsx — modified (SoftwareApplication schemas)
- src/app/resources/seasonal-maintenance-checklist/page.tsx — modified (HowTo schema)

Note: All 5 src files are staged in git index. Commits require user approval (git commit permission was not granted during execution). The orchestrator should commit after wave completion.
