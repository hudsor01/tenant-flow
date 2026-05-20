---
phase: 07-pricing-card-chrome
fixed_at: 2026-05-20T16:16:30Z
review_path: .planning/phases/07-pricing-card-chrome/07-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 7: Code Review Fix Report

**Fixed at:** 2026-05-20T16:16:30Z
**Source review:** .planning/phases/07-pricing-card-chrome/07-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (2 warnings, 4 info — fix_scope: all)
- Fixed: 6
- Skipped: 0

## Fixed Issues

### WR-01: Bento "global badge removed" test is a no-op

**Files modified:** `src/components/pricing/__tests__/bento-pricing-section.test.tsx`
**Commit:** a1392a97f
**Applied fix:** Replaced the `queryAllByText(/Save \$98/).filter(...)` no-op
assertion with a positive structural test. The new test renders
`BentoPricingSection` on yearly, counts exactly 3 per-card savings paragraphs
(`p.text-success.font-semibold` matching `/Save\s+\$[\d,]+\/year/`), asserts they
contain `$38` / `$98` / `$298`, and asserts the billing-toggle row
(`#billing-toggle` -> `closest("div")`) contains no `Save $` text. This fails on
two real regressions: a re-added global badge in the toggle bar, and any missing
per-card savings line.

### WR-02: `calculateAnnualSavings` pin did not guard rendered card numbers

**Files modified:** `src/components/pricing/pricing-card-featured.tsx`,
`src/components/pricing/pricing-card-standard.tsx`,
`src/config/__tests__/pricing.test.ts`
**Commit:** 6cd357190
**Applied fix:** Adopted REVIEW.md's preferred option (a). Both production cards
now import `calculateAnnualSavings` from `#config/pricing` and render the per-card
"Save $X/year" line via `calculateAnnualSavings(plan.price.monthly)` instead of the
duplicated inline `plan.price.monthly * 2`. This removes the drift surface and makes
`pricing.test.ts` genuinely back the shipped render path. Updated the
`pricing.test.ts` header comment to reflect that the cards now call the helper.
Math is unchanged (`monthly*12 - monthly*10 === monthly*2`); all rendered savings
values are identical.

### IN-01: Test fixtures duplicated `PricingPlan` shape without sharing the type

**Files modified:** `src/components/pricing/__tests__/pricing-card-featured.test.tsx`,
`src/components/pricing/__tests__/pricing-card-standard.test.tsx`
**Commit:** a6639795a
**Applied fix:** Annotated `growthPlan`, `starterPlan`, and `maxPlan` fixtures with
`ComponentProps<typeof Component>["plan"]` (the `PricingPlan` interface is not
exported from the component modules, so `ComponentProps` extraction is used per
REVIEW.md guidance). A future required field on the prop type now breaks the tests
loudly instead of passing via loose literal inference.

### IN-02 / IN-04: Order-sensitive `.flex.items-baseline` price-row selectors

**Files modified:** `src/components/pricing/__tests__/pricing-card-featured.test.tsx`,
`src/components/pricing/__tests__/pricing-card-standard.test.tsx`
**Commit:** a6639795a
**Applied fix:** Replaced the class-soup `container.querySelector(".flex.items-baseline...")`
selectors with content-anchored `screen.getByText("$49"|"$19").closest("div")`. This
targets the price row by its rendered price text, which is stable across layout
refactors and unambiguous regardless of which classes the price span vs. container
carry (resolves both the order-sensitivity of IN-02 and the incidental-match
concern of IN-04 in one change).

### IN-03: `queryByText(/\/year/)` "hides savings on monthly" passed for the wrong reason

**Files modified:** `src/components/pricing/__tests__/pricing-card-featured.test.tsx`,
`src/components/pricing/__tests__/pricing-card-standard.test.tsx`
**Commit:** a6639795a
**Applied fix:** Tightened the "hides the savings line on monthly" assertions from
`screen.queryByText(/\/year/)` to `screen.queryByText(/Save\s+\$\d/)` so the test
verifies the savings paragraph specifically rather than any incidental `/year`
substring.

---

_Fixed: 2026-05-20T16:16:30Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
