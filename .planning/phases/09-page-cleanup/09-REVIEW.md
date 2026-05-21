---
phase: 09-page-cleanup
reviewed: 2026-05-20T21:10:00Z
depth: deep
files_reviewed: 2
files_reviewed_list:
  - src/components/sections/__tests__/logo-cloud.test.tsx
  - src/app/__tests__/marketing-home.test.tsx
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-05-20T21:10:00Z
**Depth:** deep
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed two newly created Vitest 4 regression-guard test files pinning already-shipped
CONS-13 (Trusted Integrations logo visual weight) and CONS-14 (homepage comparison-table
de-duplication) fixes. No production components were modified in this phase.

Both files are high quality. The central concern flagged for review — false-confidence
assertions — was empirically disproven for every test:

- **Regression-failure verified.** Injecting the pre-fix CONS-13 class string
  (`grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all`) into
  `logo-cloud.tsx` made both the `grayscale` and `opacity-90`-count assertions FAIL.
  Re-adding `<ComparisonTable />` to `marketing-home.tsx` made both the no-render and
  CONS-14-marker assertions FAIL. Each test genuinely catches its regression.
- **Regex word-boundary safety verified.** `\b` correctly prevents the `<ComparisonTable`
  and `import { ... ComparisonTable ... }` regexes from false-matching the unrelated
  `PricingComparisonTable` component (`src/components/pricing/`). Confirmed against the
  real `bento-pricing-section.tsx` usage and a synthetic mixed-import line.
- **Selector stability verified.** `BlurFade` emits `opacity-100` (visible state) — never
  `opacity-90` — so the `.opacity-90` selector matches exactly the 5 logo wrappers and
  nothing else. The `unit-setup.ts` setup file polyfills both `window.matchMedia` and
  `IntersectionObserver`, so `BlurFade`'s `useEffect` hooks run cleanly under jsdom.
- **CLAUDE.md compliance:** no `any`, no `as unknown as`, no commented-out code, no
  emojis, kebab-case filenames, no string-literal query keys (N/A). `@vitest-environment
  jsdom` correctly present on the DOM-render test; correctly absent from the source-scan
  test (which uses `readFileSync` and needs no DOM). No `vi.mock()` / `vi.hoisted()` usage
  — neither file mocks anything.

All 7 tests pass. The two findings below are non-blocking robustness observations.

## Info

### IN-01: De-dup regexes do not cover braceless default-import or aliased re-add of `ComparisonTable`

**File:** `src/app/__tests__/marketing-home.test.tsx:29-35`
**Issue:** The CONS-14 guard pins the *exact* current syntax. A future regression that
re-adds the comparison table via a syntactic variant slips past the guard:
- `import ComparisonTable from "#components/sections/comparison-table";` (default-import
  form, no braces) — the import regex `/import\s*\{[^}]*\bComparisonTable\b[^}]*\}/`
  requires `{ }` and would not match. (`comparison-table.tsx` currently exports a named
  symbol, so this would require also adding a `default` export — low likelihood.)
- `import { ComparisonTable as Cmp } from "..."` followed by `<Cmp />` — the import regex
  matches the aliased import, but the `<ComparisonTable\b` render regex would miss `<Cmp`.
  Both verified empirically.

This is an inherent limitation of source-text scanning rather than a defect — the test as
written correctly catches the realistic regression (a straight copy-paste of the original
`<ComparisonTable />` block, which is exactly what the cycle simulation reproduced and the
test caught). The CONS-14-marker-comment assertion (line 40) is a useful belt-and-braces
backstop. The genuine fix for full coverage is a render-based test (`render(<MarketingHomePage />)`
+ assert the "Why Landlords Choose" heading is absent), but that requires mocking the seven
lazy-loaded child sections and is disproportionate for a low-traffic regression class.

**Fix:** Optional — none required. If broader coverage is desired without a full render
test, widen the import regex to also catch the braceless form:
```typescript
expect(homeSrc).not.toMatch(/\bComparisonTable\b/);
```
This single assertion subsumes both current import/render checks (the file legitimately
contains `ComparisonTable` only inside the CONS-14 comment, which uses the bare word — so
this would need the comment reworded to e.g. "comparison table" lowercase first). Leaving
the test as-is is also acceptable given the verified regression-catch behavior.

### IN-02: `opacity-90` count assertion couples to an implementation detail of `BlurFade`

**File:** `src/components/sections/__tests__/logo-cloud.test.tsx:42`
**Issue:** `expect(container.querySelectorAll(".opacity-90")).toHaveLength(5)` relies on
`opacity-90` being unique to the logo wrappers. This holds today because `BlurFade` emits
`opacity-100` / `opacity-0` and no other element in the subtree uses `opacity-90`. If a
future `BlurFade` preset or an unrelated wrapper introduced an `opacity-90` class, the
count would silently drift to 6+ and the test would fail for a reason unrelated to a
CONS-13 regression. This is a brittleness observation, not a current bug — verified that
the count is exactly 5 today.

The companion assertions (`not.toMatch(/grayscale/)` on line 36 and
`.opacity-80` length 0 on line 44) are well-targeted symptom pins and are not affected.

**Fix:** Optional — none required. To decouple from sibling classes, scope the assertion
to the logo wrapper specifically by also asserting the co-located classes that uniquely
identify the wrapper, e.g. query for the `h-8` + `opacity-90` combination:
```typescript
expect(container.querySelectorAll(".h-8.opacity-90")).toHaveLength(5);
```
The current assertion is acceptable as-is given the verified regression-catch behavior.

---

_Reviewed: 2026-05-20T21:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
