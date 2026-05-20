---
phase: 07-pricing-card-chrome
reviewed: 2026-05-20T16:10:00Z
depth: deep
files_reviewed: 4
files_reviewed_list:
  - src/components/pricing/__tests__/bento-pricing-section.test.tsx
  - src/components/pricing/__tests__/pricing-card-featured.test.tsx
  - src/components/pricing/__tests__/pricing-card-standard.test.tsx
  - src/config/__tests__/pricing.test.ts
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-05-20T16:10:00Z
**Depth:** deep
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Phase 7 added four Vitest 4 + jsdom regression-guard test files pinning the already-shipped
CONS-05/09/10 pricing-card fixes. All 15 tests pass. No production source was modified.

The tests are project-convention compliant: `@vitest-environment jsdom` on the three DOM
files and correctly omitted on the pure-function `pricing.test.ts`; no `any` types, no `as
unknown as` casts; `vi.mock()` calls reference no out-of-scope hoisted variables (factory
closures only). The per-card savings tests in `pricing-card-featured.test.tsx` and
`pricing-card-standard.test.tsx` are sound — verified against source: the text renders as
a single normalized DOM node `"Save $98/year"`, and the `\s+`-tolerant regex matches it.

Two real problems were found by cross-referencing the test assertions against the production
DOM output:

1. **WR-01 (false confidence):** the headline CONS-10 test in `bento-pricing-section.test.tsx`
   — the one named "no global 'Save $98' badge" — cannot fail under any realistic regression.
2. **WR-02 (false confidence):** `calculateAnnualSavings` is pinned in isolation but the
   production cards never call it; the math the cards actually render (`monthly * 2`) is
   untested as a unit, so the helper test does not guard the rendered numbers.

## Warnings

### WR-01: Bento "global badge removed" test is a no-op — passes even if the fix regresses

**File:** `src/components/pricing/__tests__/bento-pricing-section.test.tsx:42-53`

**Issue:** This is the load-bearing CONS-10 regression pin (per the file's own header
comment, it exists to "lock the global badge's removal so it cannot be re-added by
accident"). It does not do that.

The assertion is:
```ts
const globalBadge = screen
  .queryAllByText(/Save \$98/)
  .filter((el) => !/\/year/.test(el.textContent ?? ""));
expect(globalBadge).toHaveLength(0);
```

Verified against the rendered DOM (probe run): on `defaultBillingCycle="yearly"` the only
node matching `/Save \$98/` is the per-card Growth paragraph `<p>Save $98/year</p>`. Its
`textContent` contains `/year`, so the filter discards it, leaving `[]`. The test passes.

The problem is what happens on regression. `screen.queryAllByText` matches **per text
node**. If the deleted global badge were re-added, the realistic re-add path is a `Badge`
component rendering `Save{" "}{formatCurrency(98,...)}` — which produces sibling nodes
(`"Save "` + `"$98"`) with **no single node** whose text matches `/Save \$98/`. So a
regressed global badge yields zero matches → filter yields `[]` → test still passes.

Worse: the test also passes if the per-card savings line is deleted entirely (zero
matches), and passes if `formatCurrency` output changes. The only input that makes it
fail is a single text node containing literally `Save $98` with no `/year` suffix — a
shape the codebase does not and would not produce.

**Fix:** Pin the actual deleted artifact. The global badge lived in the billing-toggle
row. Scope the negative assertion to that row and assert on a stable structural marker,
or assert on the savings node count directly:
```ts
it("renders exactly one per-card savings line on yearly, none in the toggle bar (CONS-10)", () => {
  const { container } = render(<BentoPricingSection defaultBillingCycle="yearly" />);
  // per-card savings paragraphs: exactly 3 (Starter $38, Growth $98, Max $298)
  const savingsLines = Array.from(
    container.querySelectorAll("p.text-success.font-semibold"),
  ).filter((el) => /Save\s+\$[\d,]+\/year/.test(el.textContent ?? ""));
  expect(savingsLines).toHaveLength(3);
  expect(savingsLines.map((el) => el.textContent)).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/Save\s+\$38\/year/),
      expect.stringMatching(/Save\s+\$98\/year/),
      expect.stringMatching(/Save\s+\$298\/year/),
    ]),
  );
  // the toggle-bar row must contain no savings text
  const toggleRow = container.querySelector("#billing-toggle")?.closest("div");
  expect(toggleRow?.textContent ?? "").not.toMatch(/Save\s+\$/);
});
```
This fails if a global badge is re-added to the toggle row (positive structural target),
and fails if a per-card savings line goes missing (count drops below 3).

### WR-02: `calculateAnnualSavings` pin does not guard the numbers the cards actually render

**File:** `src/config/__tests__/pricing.test.ts:12-22`

**Issue:** The test pins `calculateAnnualSavings(19|49|149)` → `38|98|298`. Verified the
helper at `src/config/pricing.ts:282` computes `monthly*12 - monthly*10`. But neither
`PricingCardFeatured` nor `PricingCardStandard` calls `calculateAnnualSavings` — both
inline `plan.price.monthly * 2` (`pricing-card-featured.tsx:194`,
`pricing-card-standard.tsx:202`). The test file's own header acknowledges this ("The
pricing cards inline `monthly * 2`").

The two formulas are math-equivalent (`12x - 10x === 2x`), so today the numbers agree.
But the regression this phase claims to pin (CONS-10 rendered savings) flows through the
`* 2` path, which has zero unit coverage. If a future edit changes the inline card
expression (e.g. to `* 1.8` for an 18%-off promo, or to call the helper), the helper
test stays green while the rendered savings drift. The pin guards a function no shipped
code path exercises.

The card-level tests (`pricing-card-featured.test.tsx:80-83`,
`pricing-card-standard.test.tsx:78-98`) do assert the rendered `$98/year` / `$38/year` /
`$298/year` text — so the rendered numbers are covered there. That makes
`pricing.test.ts` redundant rather than wrong, but it is mislabeled: its header presents
it as the "CONS-10 math pin," implying it backs the cards. It does not.

**Fix:** Either (a) make the production cards call `calculateAnnualSavings(plan.price.monthly)`
so the helper test genuinely backs the rendered value (removes the duplicated `* 2`
literal and the drift surface — preferred), or (b) reword the test file header to state
it pins the standalone helper for *future* callers only and is not coupled to the cards,
so a later reader does not over-trust it. Given CLAUDE.md's "no duplicate logic" spirit,
(a) is the better fix.

## Info

### IN-01: Test plan fixtures duplicate the production `PricingPlan` shape without sharing the type

**File:** `src/components/pricing/__tests__/pricing-card-featured.test.tsx:40-51`,
`src/components/pricing/__tests__/pricing-card-standard.test.tsx:39-62`

**Issue:** `growthPlan`, `starterPlan`, `maxPlan` are untyped object literals passed to a
component whose prop is the `PricingPlan` interface. They are structurally inferred, so
TypeScript still type-checks the call site — but if `PricingPlan` gains a required field,
these fixtures silently go stale and the test compiles only because inference is loose at
the literal. CLAUDE.md mandates "no duplicate types — search `src/types/` before
creating any type"; these are de-facto duplicate type instances.

**Fix:** Annotate the fixtures with the exported prop type so a `PricingPlan` change
breaks the test loudly:
```ts
import type { ComponentProps } from "react";
const growthPlan: ComponentProps<typeof PricingCardFeatured>["plan"] = { ... };
```
(`PricingPlan` is not exported from the component module; either export it or use
`ComponentProps` extraction as above.)

### IN-02: `.flex.items-baseline` selector is loose and order-sensitive

**File:** `src/components/pricing/__tests__/pricing-card-standard.test.tsx:73`,
`src/components/pricing/__tests__/pricing-card-featured.test.tsx:73`

**Issue:** `container.querySelector(".flex.items-baseline")` (standard) and
`.flex.items-baseline.justify-center` (featured) match the *first* element carrying those
classes. Today only the price row has them, so it works. But this couples the test to
class ordering and to there being exactly one such element — a brittle selector for a
regression guard. If a future layout adds another `flex items-baseline` wrapper above the
price row, the test silently asserts `whitespace-nowrap` on the wrong node.

**Fix:** Anchor on the price text instead of a class soup selector:
```ts
const priceRow = screen.getByText("$19").closest("div");
expect(priceRow).toHaveClass("whitespace-nowrap");
```
This targets the price row by content, which is stable across layout refactors.

### IN-03: `queryByText(/\/year/)` "hides savings on monthly" can pass for the wrong reason

**File:** `src/components/pricing/__tests__/pricing-card-featured.test.tsx:85-88`,
`src/components/pricing/__tests__/pricing-card-standard.test.tsx:100-109`

**Issue:** The "hides the savings line on monthly" tests assert `queryByText(/\/year/)` is
`null`. But `/\/year/` also matches the "Billed annually (...)/year" subtitle that renders
only on the *yearly* branch — so on monthly there is genuinely no `/year` text and the
test passes. That is correct today, but the assertion is broader than its name: it would
also catch (and fail on) a future unrelated `/year` string added to the monthly layout,
and conversely it does not specifically verify the *savings* paragraph is gone.

**Fix:** Tighten to the savings shape so the test name matches the assertion:
```ts
expect(screen.queryByText(/Save\s+\$\d/)).toBeNull();
```

### IN-04: Featured-card price-row selector will match two elements after CONS-09

**File:** `src/components/pricing/__tests__/pricing-card-featured.test.tsx:73-77`

**Issue:** Verified against `pricing-card-featured.tsx`: CONS-09 put `whitespace-nowrap`
on **both** the price-row container (`.flex.items-baseline.justify-center`, line 173) and
the inner `$XX` span (line 174). The test's selector `.flex.items-baseline.justify-center`
happens to match only the container (the span lacks `justify-center`), so the assertion is
correct — but this is incidental. The test passes by luck of which classes differ between
the two nowrap nodes, not by deliberate targeting. A future class tweak to the span could
make the selector ambiguous.

**Fix:** No behavior change needed; if hardening alongside IN-02, switch to the
content-anchored `getByText(...).closest("div")` form, which is unambiguous.

---

_Reviewed: 2026-05-20T16:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
