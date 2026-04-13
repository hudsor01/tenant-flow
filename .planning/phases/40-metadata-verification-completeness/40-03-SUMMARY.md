---
phase: 40-metadata-verification-completeness
plan: 03
subsystem: seo/metadata
tags: [seo, metadata, migration, structured-data]
requires:
  - 40-01 (E2E smoke spec strengthening)
provides:
  - 3 resource pages using createPageMetadata factory
  - BreadcrumbList JSON-LD added to 2 resource pages (closes SCHEMA-01)
  - ROADMAP.md reflects 7-page / 3-plan scope
affects:
  - src/app/resources/seasonal-maintenance-checklist/page.tsx
  - src/app/resources/security-deposit-reference-card/page.tsx
  - src/app/resources/landlord-tax-deduction-tracker/page.tsx
  - .planning/ROADMAP.md
tech-stack:
  added: []
  patterns:
    - createPageMetadata factory (Template B/C migration)
    - createBreadcrumbJsonLd with optional override for H1 alignment
key-files:
  created:
    - .planning/phases/40-metadata-verification-completeness/40-03-SUMMARY.md
  modified:
    - src/app/resources/seasonal-maintenance-checklist/page.tsx
    - src/app/resources/security-deposit-reference-card/page.tsx
    - src/app/resources/landlord-tax-deduction-tracker/page.tsx
    - .planning/ROADMAP.md
decisions:
  - D-01, D-02 applied: ROADMAP Phase 40 section expanded to 7 pages / 3 plans
  - D-03, D-04 applied: src/app/layout.tsx NOT touched (VALID-01 via DNS per Phase 38 D-01)
  - D-05 applied: all 3 resource pages use createPageMetadata({title, description, path})
  - D-06 applied: inline `| TenantFlow` suffix stripped from all 3 resource page titles
  - D-07 applied: descriptions preserved (already optimized in prior phases)
  - D-08 applied: BreadcrumbList JSON-LD added to security-deposit-reference-card and landlord-tax-deduction-tracker
  - D-09 applied: security-deposit-reference-card uses H1-aligned override `{ 'security-deposit-reference-card': 'Security Deposit Laws by State' }`; landlord-tax-deduction-tracker uses default humanization (matches H1)
metrics:
  duration: ~10 minutes
  completed: "2026-04-12"
  tasks: 4
  files_modified: 4
---

# Phase 40 Plan 03: Resource Pages Migration + SCHEMA-01 Closure Summary

Migrated the 3 remaining resource pages (`/resources/seasonal-maintenance-checklist`, `/resources/security-deposit-reference-card`, `/resources/landlord-tax-deduction-tracker`) from raw `Metadata` object literals to the `createPageMetadata()` factory, closed the BreadcrumbList JSON-LD gap on 2 resource pages (security-deposit-reference-card, landlord-tax-deduction-tracker), and updated ROADMAP.md to reflect the expanded 7-page / 3-plan Phase 40 scope. VALID-01 remains DNS-satisfied per Phase 38 D-01 lock — `src/app/layout.tsx` was NOT touched.

## Tasks Completed

### Task 1: /resources/seasonal-maintenance-checklist (Template B)
- **File:** `src/app/resources/seasonal-maintenance-checklist/page.tsx`
- **Before:** Raw `export const metadata: Metadata = { title: 'Seasonal Maintenance Checklist for Rental Properties | TenantFlow', description: '...' }` (lines 12-16)
- **After:** `createPageMetadata({ title: 'Seasonal Maintenance Checklist for Rental Properties', description, path: '/resources/seasonal-maintenance-checklist' })`
- **Title:** stripped inline `| TenantFlow` suffix — root `title.template` auto-appends brand
- **Description:** preserved byte-for-byte (optimized in Phase 39 per D-07)
- **Import added:** `import { createPageMetadata } from '#lib/seo/page-metadata'` (line 11)
- **Preserved:** Phase 39 HowTo JSON-LD block (lines 112-120+) byte-for-byte
- **Preserved:** existing `createBreadcrumbJsonLd('/resources/seasonal-maintenance-checklist')` render
- **Body unchanged:** `seasons` array and `PageLayout` render preserved

### Task 2: /resources/security-deposit-reference-card (Template C)
- **File:** `src/app/resources/security-deposit-reference-card/page.tsx`
- **Before:** Raw metadata with title ending in `| TenantFlow`; NO JsonLdScript, NO breadcrumb utility, NO BreadcrumbList JSON-LD
- **After:** `createPageMetadata({ title: 'Security Deposit Laws by State - Quick Reference Card', description, path: '/resources/security-deposit-reference-card' })`
- **Title:** keyword-first, no inline brand suffix
- **New:** `const breadcrumbSchema = createBreadcrumbJsonLd('/resources/security-deposit-reference-card', { 'security-deposit-reference-card': 'Security Deposit Laws by State' })` — override applied so breadcrumb label matches page H1 (default humanization would produce `Security Deposit Reference Card` which contradicts the visible heading)
- **New:** `<JsonLdScript schema={breadcrumbSchema} />` inserted as first child of `<PageLayout>` BEFORE the inline print-styles `<style>` element
- **Imports added (3):** JsonLdScript, createBreadcrumbJsonLd, createPageMetadata
- **Preserved byte-for-byte:** inline `<style>` print-CSS block (`@media print { ... }`), `stateData` const array (52 states/DC), header, table rendering, disclaimer, best practices, RelatedArticles, footer CTA
- **SCHEMA-01:** gap CLOSED — page now emits BreadcrumbList JSON-LD with H1-aligned label

### Task 3: /resources/landlord-tax-deduction-tracker (Template C, no override)
- **File:** `src/app/resources/landlord-tax-deduction-tracker/page.tsx`
- **Before:** Raw metadata with title `'Landlord Tax Deduction Tracker | TenantFlow'`; NO JsonLdScript, NO breadcrumb utility, NO BreadcrumbList JSON-LD
- **After:** `createPageMetadata({ title: 'Landlord Tax Deduction Tracker', description, path: '/resources/landlord-tax-deduction-tracker' })`
- **Title:** stripped inline `| TenantFlow` suffix
- **New:** `<JsonLdScript schema={createBreadcrumbJsonLd('/resources/landlord-tax-deduction-tracker')} />` inserted as first child of `<PageLayout>` BEFORE the inline print-styles `<style>` element
- **No override needed:** default `formatSegment()` humanization produces `Landlord Tax Deduction Tracker` which matches the page H1 (per 40-RESEARCH.md line 241)
- **Imports added (3):** JsonLdScript, createBreadcrumbJsonLd, createPageMetadata (deductionCategories import preserved)
- **Preserved byte-for-byte:** inline `<style>` print-CSS block, `deductionCategories` imported data, header, deduction table rendering, tax tips, RelatedArticles, footer CTA
- **SCHEMA-01:** gap CLOSED — page now emits BreadcrumbList JSON-LD

### Task 4: ROADMAP.md Phase 40 section (D-02)
- **File:** `.planning/ROADMAP.md`
- **Plan list updated:** was 2 plans (40-01, 40-02), now 3 plans (40-01, 40-02, 40-03)
- **Plan descriptions updated** to reflect split:
  - 40-02: "Migrate 4 legal/support pages to createPageMetadata factory (Template A, Wave 1)"
  - 40-03: "Migrate 3 resource pages + close BreadcrumbList gap + update ROADMAP (Templates B/C, Wave 1)"
- **Progress table row updated:** Phase 40 from `0/2` to `0/3`
- **Pre-existing scope language preserved:** milestone bullet (line 88) and Success Criteria #1 (line 217) already correctly referenced 7 pages. Success Criteria #2 already correctly referenced DNS verification (no edit needed).
- **D-03/D-04 compliance:** ZERO edits to `src/app/layout.tsx` (verified via grep)

## Verification

### Typecheck
```
pnpm typecheck
```
**Result:** PASS — `tsc --noEmit` exits 0 with zero errors.

### Lint
```
pnpm lint
```
**Result:** PASS — eslint exits 0 with zero errors.

### Unit tests (SEO utility regression check)
```
pnpm test:unit -- --run src/lib/seo/__tests__/
```
**Result:** PASS — 125 test files, 1610 tests passed. `createPageMetadata` and `createBreadcrumbJsonLd` contract unchanged.

### VALID-01 negative assertion — zero `verification` in layout.tsx
```
grep -n "verification" src/app/layout.tsx
```
**Result:** ZERO matches. VALID-01 remains DNS-satisfied per Phase 38 D-01 lock.

### Breadcrumb override fidelity (security-deposit-reference-card)
```
grep -n "'security-deposit-reference-card': 'Security Deposit Laws by State'" src/app/resources/security-deposit-reference-card/page.tsx
```
**Result:** `87:		{ 'security-deposit-reference-card': 'Security Deposit Laws by State' }` — exactly one match, H1-aligned label present.

### Raw metadata literal check (negative assertion)
Pattern: `export const metadata: Metadata = \{` in 3 resource pages.
**Result:** ZERO matches — all 3 files use factory form `createPageMetadata({...})`.

### Inline `| TenantFlow` suffix check (Pitfall 1 regression guard)
- `seasonal-maintenance-checklist/page.tsx`: grep for `'Seasonal Maintenance Checklist for Rental Properties | TenantFlow'` → zero matches
- `security-deposit-reference-card/page.tsx`: title is `'Security Deposit Laws by State - Quick Reference Card'` (no inline suffix)
- `landlord-tax-deduction-tracker/page.tsx`: title is `'Landlord Tax Deduction Tracker'` (no inline suffix)

### Phase 39 HowTo preservation (seasonal-maintenance-checklist)
```
grep -n "'HowTo'" src/app/resources/seasonal-maintenance-checklist/page.tsx
```
**Result:** `112:		'@type': 'HowTo' as const` — HowTo JSON-LD schema preserved byte-for-byte.

### Scope-bounded diff
```
git diff --stat src/app/resources .planning/ROADMAP.md
```
**Result:**
```
 .planning/ROADMAP.md                               | 25 ++++++++++++++--------
 .../landlord-tax-deduction-tracker/page.tsx        | 11 +++++++---
 .../seasonal-maintenance-checklist/page.tsx        |  8 ++++---
 .../security-deposit-reference-card/page.tsx       | 16 +++++++++++---
 4 files changed, 42 insertions(+), 18 deletions(-)
```
Exactly 4 files modified: the 3 resource pages + ROADMAP.md. Zero unintended file changes.

## Decision Coverage Matrix

| Decision | Seasonal | Security-Deposit | Landlord-Tax | ROADMAP |
|----------|----------|------------------|--------------|---------|
| D-01 (7-page scope) | ✓ | ✓ | ✓ | ✓ |
| D-02 (ROADMAP update) | — | — | — | ✓ |
| D-03 (no verification field) | — | — | — | ✓ (documented) |
| D-04 (VALID-01 DNS-satisfied) | — | — | — | ✓ (documented) |
| D-05 (createPageMetadata factory) | ✓ line 13 | ✓ line 13 | ✓ line 15 | — |
| D-06 (no inline `\| TenantFlow` suffix) | ✓ | ✓ | ✓ | — |
| D-07 (descriptions preserved/optimized) | ✓ | ✓ | ✓ | — |
| D-08 (BreadcrumbList JSON-LD added) | — (existing) | ✓ new | ✓ new | — |
| D-09 (H1-aligned override) | — | ✓ override | ✓ no-override | — |

## Deviations from Plan

**None.** All 4 tasks executed exactly as specified in 40-03-PLAN.md.

- Task 1: factory swap + suffix strip (Template B) — no deviation
- Task 2: factory swap + suffix strip + BreadcrumbList addition with H1-aligned override (Template C) — no deviation
- Task 3: factory swap + suffix strip + BreadcrumbList addition with default humanization (Template C, no override) — no deviation
- Task 4: ROADMAP plan list + progress table update (D-02) — pre-existing milestone bullet and Success Criteria already reflected the 7-page scope and DNS note, so only the plan list (2 → 3) and progress count (0/2 → 0/3) required edits. No extraneous edits made.

## Self-Check: PASSED

Verified claims:
- `src/app/resources/seasonal-maintenance-checklist/page.tsx` — createPageMetadata import at line 11; factory call at line 13; no inline brand suffix; HowTo JSON-LD at line 112 preserved
- `src/app/resources/security-deposit-reference-card/page.tsx` — 3 new imports (JsonLdScript, createBreadcrumbJsonLd, createPageMetadata); factory call at line 13; breadcrumb computed with override at line 85-88; `<JsonLdScript schema={breadcrumbSchema} />` as first child of PageLayout
- `src/app/resources/landlord-tax-deduction-tracker/page.tsx` — 3 new imports; factory call at line 15; `<JsonLdScript schema={createBreadcrumbJsonLd(...)} />` as first child of PageLayout; deductionCategories import preserved
- `src/app/layout.tsx` — ZERO matches for `verification` (unchanged — VALID-01 DNS-satisfied per Phase 38 D-01)
- `.planning/ROADMAP.md` — 3 plans listed, progress row shows `0/3`, milestone and scope descriptions already correct

## E2E Smoke (not run locally)

The E2E SEO smoke spec strengthened by Plan 40-01 (`tests/e2e/tests/public/seo-smoke.spec.ts`) will validate:
- BreadcrumbList JSON-LD present on `/resources/security-deposit-reference-card` and `/resources/landlord-tax-deduction-tracker` (Plan 40-01 `expectedTypes` includes `'BreadcrumbList'` for both)
- Double-suffix regression: `<title>` does NOT contain `| TenantFlow | TenantFlow` on all 7 Phase 40 paths
- Canonical, OG, Twitter card tags on all 7 Phase 40 paths (`assertPageSeo` covers these)

Local dev server not run in this executor context. Plan 40-01's assertions + Phase 40 verification gate will run the full smoke suite against the merged branch.
