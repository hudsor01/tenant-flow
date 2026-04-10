---
phase: 34-per-page-metadata
plan: 01
subsystem: seo
tags: [metadata, json-ld, seo, marketing-pages]
dependency_graph:
  requires: [phase-33-seo-utilities]
  provides: [per-page-metadata, json-ld-migration]
  affects: [src/app/page.tsx, src/app/pricing/page.tsx, src/app/faq/page.tsx, src/app/about/page.tsx, src/app/contact/page.tsx, src/app/resources/page.tsx, src/app/help/page.tsx]
tech_stack:
  patterns: [createPageMetadata factory, JsonLdScript component, createBreadcrumbJsonLd, createFaqJsonLd, createProductJsonLd]
key_files:
  modified:
    - src/app/page.tsx
    - src/app/pricing/page.tsx
    - src/app/faq/page.tsx
    - src/app/about/page.tsx
    - src/app/contact/page.tsx
    - src/app/resources/page.tsx
    - src/app/help/page.tsx
decisions:
  - Used named import for JsonLdScript (component uses named export, not default)
  - Removed fabricated aggregateRating from pricing page product schema (Google penalizes self-served review markup)
  - Kept pricing page async function signature unchanged
metrics:
  tasks_completed: 2
  tasks_total: 2
  files_modified: 7
  lines_added: 102
  lines_removed: 223
---

# Phase 34 Plan 01: Public Page Metadata and JSON-LD Migration Summary

Unique SEO metadata added to all 7 public marketing pages via createPageMetadata factory; 6 inline dangerouslySetInnerHTML JSON-LD scripts and 5 inline baseUrl calculations replaced with shared Phase 33 utilities.

## Changes Made

### Task 1: Homepage, Help, Contact, About (595835aba)

- **Homepage** (`src/app/page.tsx`): Added metadata export with title "Property Management Software for Modern Landlords", canonical URL "/", OG tags. Kept `force-static` export.
- **Help** (`src/app/help/page.tsx`): Added metadata export with title "Property Management Help Center & Support", canonical "/help".
- **Contact** (`src/app/contact/page.tsx`): Added metadata export. Replaced inline `baseUrl` calculation and `dangerouslySetInnerHTML` breadcrumb script with `JsonLdScript` + `createBreadcrumbJsonLd('/contact')`.
- **About** (`src/app/about/page.tsx`): Added metadata export. Replaced inline `baseUrl` calculation and `dangerouslySetInnerHTML` breadcrumb script with `JsonLdScript` + `createBreadcrumbJsonLd('/about')`.

### Task 2: Pricing, FAQ, Resources (f8f05d445)

- **Pricing** (`src/app/pricing/page.tsx`): Added metadata export. Replaced 3 inline JSON-LD scripts (FAQ, breadcrumb, product/offer) with `createFaqJsonLd`, `createBreadcrumbJsonLd('/pricing')`, and `createProductJsonLd`. Removed fabricated `aggregateRating` (T-34-03 threat mitigation). Removed inline `baseUrl`.
- **FAQ** (`src/app/faq/page.tsx`): Added metadata export. Replaced 2 inline JSON-LD scripts (FAQ, breadcrumb) with `createFaqJsonLd` and `createBreadcrumbJsonLd('/faq')`. Removed inline `baseUrl`.
- **Resources** (`src/app/resources/page.tsx`): Added metadata export. Replaced 1 inline JSON-LD script (breadcrumb) with `JsonLdScript` + `createBreadcrumbJsonLd('/resources')`. Removed inline `baseUrl`.

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-34-01 | All 6 inline `dangerouslySetInnerHTML` JSON-LD scripts replaced with `JsonLdScript` component (XSS-safe `\u003c` escaping) |
| T-34-03 | Fabricated `aggregateRating` removed from pricing page product schema |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `pnpm typecheck` passes (0 errors)
- No `dangerouslySetInnerHTML` in any of the 7 modified pages
- No `process.env.NEXT_PUBLIC_APP_URL` in any of the 5 pages that had it
- `createPageMetadata` present in all 7 pages (7 matches)
- No `aggregateRating` in pricing page
- No title string contains `| TenantFlow` (root layout template handles suffix)
