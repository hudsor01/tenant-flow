---
phase: 39-structured-data-gap-closure
reviewed: 2026-04-12T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - src/app/blog/[slug]/blog-post-page.tsx
  - src/app/compare/[competitor]/page.tsx
  - src/app/resources/seasonal-maintenance-checklist/page.tsx
findings:
  critical: 0
  warning: 1
  info: 3
  total: 4
status: issues_found
---

# Phase 39: Code Review Report

**Reviewed:** 2026-04-12
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Phase 39 closed three orphaned JSON-LD gaps by replacing inline, duplicated, or missing structured data with typed helpers (`createArticleJsonLd`, `createSoftwareApplicationJsonLd`, `createBreadcrumbJsonLd`) routed through the shared `JsonLdScript` component. XSS escaping and `@context` wrapping are delegated to `JsonLdScript`, and `getSiteUrl()` replaces the direct `process.env.NEXT_PUBLIC_APP_URL` reads in the comparison page, which is consistent with the project convention.

All three changes accomplish the stated goals. Findings below are mostly quality-level improvements — one warning on a schema.org semantics issue in the HowTo, and three info items covering type-casting style, minor duplication with existing breadcrumbs, and an import-audit confirmation.

Verified context:
- `src/app/blog/[slug]/page.tsx` (server component) emits the Article + BreadcrumbList schemas via `createArticleJsonLd` and `createBreadcrumbJsonLd`, so removing the stale inline BlogPosting schema from the client component is correct and non-regressive.
- `JsonLdScript` handles `@context` wrapping, XSS-safe injection via `</` → `\u003c` escaping, and schema-dts typing — no manual escaping required in callers.
- `createSoftwareApplicationJsonLd` and `createBreadcrumbJsonLd` return properly typed `schema-dts` objects.

## Warnings

### WR-01: HowTo `step` uses `HowToSection` children — semantically a checklist, not sequential steps

**File:** `src/app/resources/seasonal-maintenance-checklist/page.tsx:109-123`
**Issue:** The HowTo schema assigns `HowToSection[]` directly to `step`. Per schema.org, `HowTo.step` expects `HowToStep` or `HowToSection` individual items. While `HowToSection` values are valid, the tasks placed under each season are not literally sequenced steps (you do not complete "Test smoke detectors" after "Replace A/C filters" in order) — they are inspection checklist items. Google's HowTo rich-result structured data guidance expects actionable, sequential steps, not checklists. Additionally, Google deprecated HowTo rich results in consumer Search (Sep 2023) — HowTo markup is still valid schema.org, but may not deliver the rich-result SERP benefit the phase anticipates. Consider `ItemList` with `ListItem` children instead, which more accurately models a checklist and remains eligible for general structured data consumers.

**Fix:**
```typescript
// Either (a) keep HowTo but acknowledge it is checklist-shaped, or
// (b) switch to ItemList for accurate semantics:
const checklistSchema = {
  '@type': 'ItemList' as const,
  name: 'Seasonal Maintenance Checklist for Rental Properties',
  description: '...',
  itemListElement: seasons.flatMap((season, si) =>
    season.tasks.map((task, ti) => ({
      '@type': 'ListItem' as const,
      position: si * 100 + ti + 1,
      name: `[${season.name}] [${task.area}] ${task.task}`,
    }))
  ),
}
```
If preserving HowTo, at minimum ensure the parent `HowTo` has a `name` + `step` structure Google recognizes (current shape is valid but `step: HowToSection[]` with no intermediate HowToStep at the top level is uncommon).

## Info

### IN-01: Inline HowTo object should be extracted to a typed helper matching repo convention

**File:** `src/app/resources/seasonal-maintenance-checklist/page.tsx:109-123`
**Issue:** `'HowTo' as const`, `'HowToSection' as const`, `'HowToStep' as const` are `as const` string-literal assertions. The `JsonLdScript` component accepts `ThingObject | WithContext<ThingObject>` from `schema-dts`, so the literal type is already required by structural typing — the `as const` is only needed because the inline object is not passed through a typed helper. Consider extracting a `createHowToJsonLd()` helper in `src/lib/seo/` to match the pattern used by `createArticleJsonLd`, `createSoftwareApplicationJsonLd`, and `createBreadcrumbJsonLd`. That removes the inline typing, centralizes reuse if another page needs HowTo later, and fits the existing `src/lib/seo/` convention.

**Fix:**
```typescript
// src/lib/seo/howto-schema.ts
import type { HowTo } from 'schema-dts'
export function createHowToJsonLd(config: {...}): HowTo { ... }

// page.tsx
const howToSchema = createHowToJsonLd({ name: ..., description: ..., sections: seasons })
```

### IN-02: Breadcrumb override label is redundant with default `formatSegment` output

**File:** `src/app/resources/seasonal-maintenance-checklist/page.tsx:125-128`
**Issue:** `createBreadcrumbJsonLd` calls `formatSegment('seasonal-maintenance-checklist')` by default, which produces `'Seasonal Maintenance Checklist'` — identical to the explicit override `{ 'seasonal-maintenance-checklist': 'Seasonal Maintenance Checklist' }`. The override is a no-op and can be removed for clarity.

**Fix:**
```typescript
const breadcrumbSchema = createBreadcrumbJsonLd(
  '/resources/seasonal-maintenance-checklist'
)
```

### IN-03: Verify `pnpm lint` clean on compare page after `process.env` removal

**File:** `src/app/compare/[competitor]/page.tsx:1-25`
**Issue:** All imports read as used (`Metadata`, `notFound`, `Link`, lucide icons, `PageLayout`, `Button`, `SOCIAL_PROOF`, `RelatedArticles`, `JsonLdScript`, `createBreadcrumbJsonLd`, `createSoftwareApplicationJsonLd`, `getSiteUrl`, `COMPETITORS`, `VALID_COMPETITORS`, compare-sections). This is confirmation rather than a bug — the file as reviewed is clean. Info-only: since the prior version read `process.env.NEXT_PUBLIC_APP_URL` directly, confirm no leftover import or variable references remain by running `pnpm lint` and `pnpm typecheck` after the change.

**Fix:** No code action required; verify via `pnpm validate:quick`.

---

## Cross-Cutting Observations (Non-Findings)

- **Security:** All three files correctly route structured data through the shared `JsonLdScript` component, which performs `</` → `\u003c` escaping before injecting JSON into the script tag. No raw user input reaches the JSON-LD payload in any of the three files — the blog page's `post.title`, `post.tags`, and `post.meta_description` flow through `JSON.stringify` and the escape pass, and the comparison/competitor names come from the static `COMPETITORS` dictionary.
- **Correctness:** Deleting the stale inline BlogPosting schema from `blog-post-page.tsx` is correct — the server component `page.tsx` emits both the Article and BreadcrumbList JSON-LD before the client component renders, and JSON-LD placement in the document head or body is equally valid for Google.
- **Consistency:** All three files match the established `src/lib/seo/` helper + `JsonLdScript` pattern already used by other pages in the repo. The `getSiteUrl()` replacement in the comparison page aligns with the project's env-var hygiene convention.
- **Type safety:** All three files use `schema-dts` typing via helpers; no `as any` or `as unknown as` assertions were introduced. The only `as const` usages are on HowTo nested types (see IN-01).

---

_Reviewed: 2026-04-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
