---
phase: 07-pricing-card-chrome
cycle: 1
reviewed: 2026-05-11T02:23:48Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - src/components/pricing/bento-pricing-section.tsx
  - src/components/pricing/pricing-card-featured.tsx
  - src/components/pricing/pricing-card-standard.tsx
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
status: clean
---

# Phase 7 (Pricing-Card Chrome) — Code Review Cycle 1

**Reviewed:** 2026-05-11T02:23:48Z
**PR:** #691
**Branch:** `gsd/phase-07-pricing-card-chrome`
**Depth:** standard
**Files Reviewed:** 3 (source) + 2 (planning artifacts read-only)
**Status:** clean (no P0/P1)

## Summary

Phase 7 ships three small visual / math fixes on `/pricing`:

- **CONS-05** — `Most Popular` badge on Growth card now uses `top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10` (was `-top-4 left-1/2 -translate-x-1/2 z-10`). Badge center now sits exactly on the card's top edge — no more 12-px overhang into the gradient ring at narrow viewports. Correct.
- **CONS-09** — `whitespace-nowrap` added to the price-row flex container in BOTH `pricing-card-standard.tsx:168` and `pricing-card-featured.tsx:167`. `$XX` + `/mo` (or `/month`) stay on one line at every grid column width and during `NumberFlow` width transitions. Correct.
- **CONS-10** — Global `Save $X` badge in `bento-pricing-section.tsx` (which only ever reflected Growth's number) removed cleanly: `Badge` import dropped, `annualSavings` calc dropped, JSX dropped, replaced by an HTML comment marker. Per-card `Save ${plan.price.monthly * 2}/year` paragraph added to BOTH `PricingCardStandard` (line 187-191) and `PricingCardFeatured` (line 188-192), gated on `billingCycle === 'yearly' && plan.price.monthly > 0`. Phase 5 math: $19 × 2 = **$38** (Starter), $49 × 2 = **$98** (Growth), $149 × 2 = **$298** (Max) — all match the locked numbers. Correct.

### Regression guards — all green

| Guard | Status |
|---|---|
| Phase 4 description carve-out: `'Ideal for landlords with 1–5 rentals'` at `pricing.ts:100` byte-identical | PASS |
| Phase 4 description carve-out: `'For growing portfolios that need advanced features'` at `pricing.ts:133` byte-identical | PASS |
| Phase 4 description carve-out: `'For landlords with 21+ rentals — unlimited scale and API access'` at `pricing.ts:167` byte-identical | PASS |
| Phase 5 `MAX_PUBLIC_PRICE_DISPLAY = '$149'` at `pricing.ts:23` intact | PASS |
| Phase 5 `productJsonLd.offers.length === 3` test green (page.test.ts) | PASS |
| Phase 2 `stats-showcase.tsx value: 500` untouched | PASS |
| `calculateAnnualSavings()` helper at `pricing.ts:274` untouched | PASS |
| Zero `any`, zero `as unknown as`, zero barrel files added | PASS |
| Zero new hex / rgba / `bg-white` / inline-style tokens — only canonical `text-success` (from `globals.css:153` `--color-success`) | PASS |
| Global `Save $X` badge fully removed from `bento-pricing-section.tsx` (Badge import + calc + JSX all gone) | PASS |
| `pnpm exec tsc --noEmit` clean | PASS |
| Full unit suite (`pnpm test:unit`) — 98,578 / 98,578 tests pass | PASS |

### Math verification (inline)

Implementation uses `plan.price.monthly * 2` inline in both card components. Equivalent to `calculateAnnualSavings(monthlyPrice)` from `pricing.ts:274-278` because Phase 5 locked `annual = monthly × 10`, so `(monthly × 12) − (monthly × 10) = monthly × 2`. Verified directly against Phase 5 numbers:

| Tier | Monthly | `monthly × 2` | Expected | Match |
|---|---|---|---|---|
| Starter | $19 | $38 | $38 | ✓ |
| Growth | $49 | $98 | $98 | ✓ |
| Max | $149 | $298 | $298 | ✓ |

No bugs, no security issues, no `any` / `as unknown as` / barrel files / inline styles / new tokens. Two Info-level observations below (neither blocks PASS).

## Critical Issues

None.

## Warnings

None.

## Info

### IN-01: Inline `monthly * 2` instead of `calculateAnnualSavings()` helper

**Files:**
- `src/components/pricing/pricing-card-standard.tsx:189`
- `src/components/pricing/pricing-card-featured.tsx:190`

**Issue:** Both cards inline `plan.price.monthly * 2` to compute annual savings. `src/config/pricing.ts:274-278` already exports `calculateAnnualSavings(monthlyPrice)` which encodes the same `(monthly × 12) − (monthly × 10) = monthly × 2` formula. The phase RESEARCH (Pattern 3 alternative + Don't-Hand-Roll table) and CONTEXT (`decisions` block) both explicitly recommended wiring the helper into each card — "single source of truth, future restructures don't introduce drift between displayed savings and actual annual price."

The numbers are byte-identical for all three Phase 5 tiers ($38 / $98 / $298), so this is NOT a math bug and NOT a P0/P1 blocker. But if Phase 5's 10× rule ever shifts (e.g., to a 9× discount), the helper changes once and both cards follow; the inline form would silently drift.

The commit message for `5c557bef7` acknowledges the helper explicitly: *"Existing calculateAnnualSavings() helper in pricing.ts:274 implements the same formula; both render paths give identical values."* — implementer aware, deliberately chose inline.

**Fix (optional, low priority):**
```tsx
// In BOTH pricing-card-standard.tsx and pricing-card-featured.tsx
import { calculateAnnualSavings } from '#config/pricing'

{billingCycle === 'yearly' && plan.price.monthly > 0 && (
  <p className="text-xs font-semibold text-success mt-1">
    Save ${calculateAnnualSavings(plan.price.monthly)}/year
  </p>
)}
```

Cost: 2 import lines + 2 expression swaps. Benefit: drift-proof against future pricing restructures.

### IN-02: Wave 0 unit tests recommended by RESEARCH not added in this PR

**Files (would-be):**
- `src/components/pricing/__tests__/pricing-card-standard.test.tsx` (not present)
- `src/components/pricing/__tests__/pricing-card-featured.test.tsx` (not present)
- `src/components/pricing/__tests__/bento-pricing-section.test.tsx` (not present)

**Issue:** `07-RESEARCH.md § Validation Architecture → Wave 0 Gaps` listed three unit-test files to add covering:
1. CONS-05 badge position className assertion
2. CONS-09 `whitespace-nowrap` className assertion on both cards
3. CONS-10 per-card savings render at `billingCycle === 'yearly'` with correct dollar values + bento toggle-bar no longer renders a global savings badge

None of those files exist in this PR. The fix surface is exercised transitively by 98,578 passing tests (and the existing `src/app/pricing/__tests__/page.test.ts` still pins the Phase 5 `productJsonLd.offers.length === 3` regression), but there is NO assertion in the suite pinning:

- That the badge classes are `top-0 -translate-y-1/2` (a regression to `-top-4` would not break any test)
- That the price-row containers carry `whitespace-nowrap` (a removal would not break any test)
- That the per-card "Save $38/year" / "Save $98/year" / "Save $298/year" strings render under the annual toggle (math regression to e.g. `monthly * 1.5` would not break any test)
- That the global "Save $X" badge is absent from the bento toggle bar (a re-addition would not break any test)

This is the only meaningful gap. Since the phase's stated goal is regression-resistant visual polish, the absence of pinning tests means a future refactor could silently undo any of the three fixes.

**Fix (optional, low priority for cycle 1; consider adding in cycle 2 or a follow-up PR):**

Minimum viable: a single `bento-pricing-section.test.tsx` that renders the section with `defaultBillingCycle="yearly"` and asserts:
1. Body text contains "Save $38/year" AND "Save $98/year" AND "Save $298/year"
2. The toggle-bar `<Label htmlFor="billing-toggle">Annual</Label>` does NOT contain "Save $" text
3. Snapshot or className regex on the featured badge wrapper matches `top-0` + `-translate-y-1/2` + does NOT match `-top-4`

That covers all three requirement IDs with one file. ~40 LOC.

This is Info, not Warning, because:
- The fix is functionally correct and verified by visual inspection + math derivation
- The full suite (98,578 tests) still pass; no existing test broke
- The phase scope (per CONTEXT) listed test extensions but did not make them a hard gate

---

## REVIEW COMPLETE — VERDICT: PASS
