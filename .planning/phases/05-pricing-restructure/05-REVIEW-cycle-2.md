---
phase: 05-pricing-restructure
cycle: 2
reviewed: 2026-05-10T05:30:00Z
depth: deep
files_reviewed: 18
files_reviewed_list:
  - src/config/pricing.ts
  - src/app/pricing/page.tsx
  - src/app/pricing/__tests__/page.test.ts
  - src/components/pricing/pricing-card-standard.tsx
  - src/components/pricing/pricing-comparison-table.tsx
  - src/components/pricing/bento-pricing-section.tsx
  - src/components/sections/comparison-table.tsx
  - src/components/sections/home-faq.tsx
  - src/app/compare/[competitor]/compare-data.ts
  - src/app/__tests__/marketing-copy-landlord-only.test.ts
  - src/lib/generate-metadata.ts
  - src/app/resources/landlord-tax-deduction-tracker/tax-deduction-data.ts
  - src/components/settings/__tests__/billing-settings.test.tsx
  - src/app/(owner)/settings/__tests__/settings-page.test.tsx
  - supabase/functions/_shared/plan-tier.ts
  - supabase/functions/_shared/tier-gate.ts
  - supabase/migrations/20260510094421_phase_5_recognize_new_price_ids.sql
  - supabase/migrations/20260510094452_phase_5_drop_resurrected_text_overload.sql
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
status: clean
---

# Phase 5: Code Review — Cycle 2

**Reviewed:** 2026-05-10T05:30:00Z
**Depth:** deep
**Files Reviewed:** 18
**Status:** clean (zero P0 + zero P1)

## Summary

Cycle 2 re-reviewed the full `git diff main...HEAD` (18 source files + 7 planning artifacts) against every cycle-2 mandate: cycle-1 fix verification, broader-regex stale-price sweep, locked-decision compliance, Phase 4 + Phase 2 carve-outs, design-token gate, savings math, Edge Function legacy-ID purge, and DB migration alignment.

**Verdict:** Zero P0 + zero P1. The single P3 below is non-blocking and was not surfaced by cycle 1.

The cycle-1 fix (commit `b5c731246`) lands correctly: `lowPrice: '19'` and `highPrice: '149'` replace the stale `'29' / '199'`, with `offerCount: '3'` matching the 3 priced tiers (Starter, Growth, Max). No regression introduced by the cycle-1 fix.

The broader cycle-2 sweep regex (`['"\>]\s*(29|79|199)\s*['"\<]`) surfaces only one set of pre-existing test fixtures (`src/lib/seo/__tests__/{product-schema,software-application-schema}.test.ts`) — these are generic schema-generator unit tests (testing that the generator preserves whatever `price` value is passed), not TenantFlow tier hardcodes. They were not modified in this PR. Same disposition class as the existing `currency.test.ts` carve-out documented in 05-02-SUMMARY.md.

## Critical Issues

(none)

## Warnings

(none)

## Info

### IN-01: Generic SEO schema-generator tests still use `'29'/'79'/'199'` as fixture inputs

**File:** `src/lib/seo/__tests__/product-schema.test.ts:35-37,104-106` and `src/lib/seo/__tests__/software-application-schema.test.ts:39,45,47`
**Severity:** Info (P3)

**Issue:**
Two pre-existing unit-test files seed `createProductJsonLd()` and `createSoftwareApplicationJsonLd()` with `{ name: 'Starter', price: '29' }`, `{ name: 'Growth', price: '79' }`, `{ name: 'Max', price: '199' }`. These tests verify the generator preserves whatever `offers` array it receives — the numeric values are arbitrary fixtures, not pricing strategy. The actual page (`src/app/pricing/page.tsx:36-40`) calls these generators with the canonical Option A values (`'19.00' / '49.00' / '149.00'`), which is independently asserted in `src/app/pricing/__tests__/page.test.ts:101-104`.

These files were not touched in this PR (verified via `git log --oneline main..HEAD -- src/lib/seo/__tests__/`). The cycle-1 review did not flag them; they fall in the same disposition class as `src/lib/utils/__tests__/currency.test.ts:65` (`formatPrice(29, ...).toBe('$29/mo')`) — generic-formatter test using `29` as a numeric example, documented as KEEP in 05-02-SUMMARY.md Task 11 sweep audit.

**Why P3 / non-blocking:**
- Not user-facing (test fixture only)
- Not modified in this PR
- Per-cycle review dimensions: only "stale dollar values left in any user-facing surface" is P0/P1; test fixtures with arbitrary numerics are out of scope for the locked-decision violation classification
- A future Phase 6 reprice would not require touching these tests because the values aren't asserted as TenantFlow tier prices — they're asserted as "the generator preserves what was passed"

**Suggested cleanup (optional, for future cleanliness):**

```typescript
// src/lib/seo/__tests__/product-schema.test.ts:35-37
offers: [
    { name: 'Tier A', price: '10' },
    { name: 'Tier B', price: '20' },
    { name: 'Tier C', price: '30' }
]
```

Renaming the fixture to non-tier names (`'Tier A' / 'Tier B' / 'Tier C'`) and arbitrary integers (`'10' / '20' / '30'`) would make the generic-test intent unambiguous. Defer to a future grooming pass — not blocking.

---

## Cycle-1 Fix Verification

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| `grep -F "lowPrice: '19'" src/lib/generate-metadata.ts` | 1 | 1 (line 188) | PASS |
| `grep -F "highPrice: '149'" src/lib/generate-metadata.ts` | 1 | 1 (line 189) | PASS |
| `grep -F "highPrice: '199'" src/lib/generate-metadata.ts` | 0 | 0 | PASS |
| `grep -F "offerCount: '3'" src/lib/generate-metadata.ts` | 1 | 1 (line 190) | PASS — matches 3 priced tiers (Starter, Growth, Max) |
| Cycle-1 commit (`b5c731246`) lints/typechecks/tests clean | yes | yes (98,573 / 98,573 tests pass — per 05-02-SUMMARY.md) | PASS |
| No regression introduced by cycle-1 fix | yes | yes — minimal 2-line diff scoped to AggregateOffer | PASS |

## Locked-Decision Verification

| Decision | Pattern | Expected | Actual | Status |
|----------|---------|----------|--------|--------|
| Option A pricing | `monthly: 19` in pricing.ts | 1 | 1 (line 102) | PASS |
| | `annual: 190` in pricing.ts | 1 | 1 (line 103) | PASS |
| | `monthly: 49` in pricing.ts | 1 | 1 (line 135) | PASS |
| | `annual: 490` in pricing.ts | 1 | 1 (line 136) | PASS |
| | `monthly: 149` in pricing.ts | 1 | 1 (line 169) | PASS |
| | `annual: 1490` in pricing.ts | 1 | 1 (line 170) | PASS |
| `MAX_PUBLIC_PRICE_DISPLAY` | `'$149'` literal in pricing.ts | 1 | 1 | PASS |
| | `'Custom'` literal in pricing.ts | 0 | 0 | PASS |
| `productJsonLd.offers.length === 3` | `name: 'Max', price: '149.00'` in page.tsx | 1 | 1 | PASS |
| Hardcoded `>Custom<` literal removed | `>Custom<` in pricing-card-standard.tsx | 0 | 0 | PASS |
| Banlist no longer bans `$49/mo` | `'$49/mo'` in marketing-copy banlist | 0 | 0 | PASS |
| Banlist still bans invented plan names | `'professional plan'` + `'enterprise plan'` + `'up to 50 units'` | 1 each | 1 each | PASS |
| Edge Function recognizes new IDs only | `price_1TVTa[AEIMQU]` in plan-tier.ts STARTER/GROWTH/MAX sets | 6 | 6 | PASS |
| Edge Function tier-gate Growth+Max | 4 IDs + 6 lookup_key fallbacks in tier-gate.ts | 4 + 6 | 4 + 6 | PASS |
| DB migration recognizes new IDs only | All 6 new IDs in `check_user_feature_access` CASE | 6 | 6 (lines 54-59) | PASS |

## Phase 4 + Phase 2 Carve-Outs (REGRESSION GUARDS)

| Guard | File | Pattern | Expected | Actual | Status |
|-------|------|---------|----------|--------|--------|
| Phase 4 — Starter description | src/config/pricing.ts | `'Ideal for landlords with 1–5 rentals'` (en-dash) | 1 | 1 | INTACT |
| Phase 4 — Growth description | src/config/pricing.ts | `'For growing portfolios that need advanced features'` | 1 | 1 | INTACT |
| Phase 4 — Max description | src/config/pricing.ts | `'For landlords with 21+ rentals — unlimited scale and API access'` (em-dash) | 1 | 1 | INTACT |
| Phase 2 — NumberTicker invariant | src/components/sections/stats-showcase.tsx | `value: 500` | 1 | 1 | INTACT |

All four byte-identical to the pre-Phase-5 invariants. No drift.

## Cross-Cutting Design-Token Diff Gate

| Check | Command | Expected | Actual | Status |
|-------|---------|----------|--------|--------|
| Hex codes added | `git diff main...HEAD -- src/ \| grep -E "^\+.*#[0-9a-fA-F]{3,8}\b" \| wc -l` | 0 | 0 | PASS |
| rgba additions | `git diff main...HEAD -- src/ \| grep -E "^\+.*rgba?\(" \| wc -l` | 0 | 0 | PASS |
| bg-white additions | `git diff main...HEAD -- src/ \| grep -E "^\+.*bg-white" \| wc -l` | 0 | 0 | PASS |
| Inline-ms additions | `git diff main...HEAD -- src/ \| grep -E "^\+.*\b[0-9]+ms\b" \| wc -l` | 0 | 0 | PASS |

## Compare-Data Savings Math

| Comparison | Math | Marketed | Status |
|------------|------|----------|--------|
| Buildium Growth annualized | ($183 − $49) × 12 = $1,608 | "$1,600/year" (rounded down) | PASS — `compare-data.ts:108` |
| AppFolio at 30 units | ($298 − $49) × 12 = $2,988 | "$3,000/year" (rounded up) | PASS — `compare-data.ts:237` |
| RentRedi delta | $19 − $9 = $10/month | "just $10 more per month" | PASS — `compare-data.ts:256` |

All competitor-side prices intact (Buildium $58/$183/$375, AppFolio $298, RentRedi $9/$15/$19.95).

## Edge Function Legacy IDs Sweep

```bash
grep -rn 'price_1Rd1\|price_1RtW\|price_1SPGC\|price_1RtFM' src/ supabase/functions/
```

| Hit | Disposition |
|-----|-------------|
| `supabase/functions/_shared/plan-tier.ts:8` — comment block referencing `price_1RtWFcP3WCR53SdoCxiVldhb` | KEEP — code comment explaining the historical webhook bug being fixed; no code reference |

Zero hits in `src/`, zero hits in `supabase/migrations/2026051*` (the new Phase-5 migrations), zero functional code references to legacy IDs. The single comment is intentional documentation of why `priceIdToTier()` exists. Per cycle-1 IN-02: no follow-up needed because webhook handlers (`customer-subscription-updated.ts:35` + `checkout-session-completed.ts`) resolve via `priceIdToTier(planLookup) ?? priceIdToTier(priceId)` which normalizes both lookup_keys (`'starter_monthly'` etc.) AND raw price IDs to canonical tier slugs (`'starter' / 'growth' / 'max'`) before write. The migration's CASE branches match the canonical slugs, so the lookup_key fallback gap raised in cycle-1 IN-02 is moot at runtime.

## DB Migration Match with Prod State

Both migration files present locally:

```
supabase/migrations/20260510094421_phase_5_recognize_new_price_ids.sql       (4.0k)
supabase/migrations/20260510094452_phase_5_drop_resurrected_text_overload.sql (689 bytes)
```

The first migration `CREATE OR REPLACE`s `check_user_feature_access(text, text)` and `get_user_plan_limits(uuid)` with all 6 new Phase-5 price-ID branches and an `ELSE 'FREETRIAL'` fall-through (safer default than the legacy STARTER fall-through). The second migration is a defensive `DROP FUNCTION IF EXISTS public.get_user_plan_limits(text)` for replay-from-zero correctness (the first draft's MCP-applied version inadvertently recreated a text overload that PostgREST PGRST203 ambiguity errors hit; the committed file no longer recreates it but the drop is preserved).

deferred-items.md (commit `4c085495c`) marks the Edge Function + DB drift RESOLVED, with explicit justification: zero active subscribers + user direction "no legacy compat" = swap rather than additive update is acceptable.

## Comprehensive Sweep Results

### Broad regex 1: `['"\>]\s*(29|79|199)\s*['"\<]` in src/

| File:Line | Hit | Disposition |
|-----------|-----|-------------|
| `src/lib/seo/__tests__/product-schema.test.ts:35-37,104-106` | `'29' / '79' / '199'` as schema-generator fixture inputs | KEEP — pre-existing generic-generator test; not modified in PR; same class as currency.test.ts |
| `src/lib/seo/__tests__/software-application-schema.test.ts:39,45,47` | `'29' / '79'` as schema-generator fixture inputs | KEEP — same disposition |

See IN-01 above for optional cleanup suggestion.

### Broad regex 2: `['"\>]\s*(290|790|2189)\s*['"\<]` in src/

Zero hits.

### `$29` / `$79` / `$199` literal sweep in src/

All hits are explicitly accounted for:
- `src/app/__tests__/marketing-copy-landlord-only.test.ts:482` — Phase-5 carve-out comment documenting "stale strings NOT banned by name"
- `src/app/pricing/__tests__/page.test.ts:105` — regression-guard comment + lines 106-108 `.toBeUndefined()` regression guards
- `src/app/compare/[competitor]/compare-data.ts:127,129,131,140,237` — competitor-side AppFolio `$298`-related strings (legitimate)
- `src/lib/utils/__tests__/currency.test.ts:59-79` — generic `formatPrice()` test inputs (KEEP per 05-02-SUMMARY.md)

Zero stale TenantFlow tier hardcodes.

### Old buggy Max annual ($2,189 / $2189) sweep

Zero hits in src/.

## bento-pricing-section consumer wiring (sanity)

`src/components/pricing/bento-pricing-section.tsx:31-34` maps:

```typescript
price: {
    monthly: plan.price.monthly,                            // 19 / 49 / 149
    yearly: Math.round((plan.price.annual / 12) * 100) / 100  // 15.83 / 40.83 / 124.17
}
```

Yearly value is the per-month-when-billed-annually rate. Pricing-card-standard renders this with `maximumFractionDigits: 0` and a `/mo` suffix + `Billed annually` subtext — pre-existing UX pattern, not a Phase 5 regression.

## Test Surface

- Cycle-1 fix commit (`b5c731246`) test pass: 98,573 / 98,573 (per 05-02-SUMMARY.md). Did not re-run for this review; the fix is a 2-line literal swap in a JSON-LD config object with no test surface to break.
- Three regression-guard `.toBeUndefined()` assertions on `'29.00' / '79.00' / '199.00'` in `page.test.ts:106-108` lock the offers shape against any future drift.

---

_Reviewed: 2026-05-10T05:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_

## REVIEW COMPLETE — VERDICT: PASS
