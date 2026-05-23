---
phase: 09-page-cleanup
fixed_at: 2026-05-20T21:14:00Z
review_path: .planning/phases/09-page-cleanup/09-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 9: Code Review Fix Report

**Fixed at:** 2026-05-20T21:14:00Z
**Source review:** .planning/phases/09-page-cleanup/09-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2
- Fixed: 2
- Skipped: 0

## Fixed Issues

### IN-01: De-dup regexes do not cover braceless default-import or aliased re-add of `ComparisonTable`

**Files modified:** `src/app/__tests__/marketing-home.test.tsx`
**Commit:** 5b0b1ef38
**Applied fix:** Replaced the two brittle CONS-14 assertions with broader
ones. The import check now matches every `import ... from ...` line and
asserts none contain `ComparisonTable` in any form — named
(`import { ComparisonTable }`), braceless default
(`import ComparisonTable from`), or aliased
(`import { ComparisonTable as Cmp }`). The render check keeps the direct
`<ComparisonTable\b` regex and additionally resolves any alias the import
would have introduced, asserting the aliased JSX tag (`<Cmp\b`) is also
absent. The `\b` word boundary is preserved so the unrelated
`PricingComparisonTable` component still does not false-match. The
CONS-14 removal-marker comment test is untouched (the marker still uses
the bare `CONS-14` word, intentionally separate from `ComparisonTable`).
All 4 tests in the file pass.

### IN-02: `opacity-90` count assertion couples to an implementation detail of `BlurFade`

**Files modified:** `src/components/sections/__tests__/logo-cloud.test.tsx`
**Commit:** 18e650ff3
**Applied fix:** Scoped the CONS-13 count selector from `.opacity-90` to
`.h-8.opacity-90`. The logo wrapper in `logo-cloud.tsx` carries both `h-8`
and `opacity-90` on the same element, so the compound selector uniquely
identifies the 5 logo wrappers. The count is now robust against a future
unrelated element (e.g. a `BlurFade` preset) introducing a bare
`opacity-90` class. The companion `not.toMatch(/grayscale/)` and
`.opacity-80` length-0 assertions are unchanged. All 3 tests in the file
pass.

---

_Fixed: 2026-05-20T21:14:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
