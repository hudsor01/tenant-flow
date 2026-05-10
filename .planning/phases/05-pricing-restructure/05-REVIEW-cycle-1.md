---
phase: 05-pricing-restructure
cycle: 1
reviewed: 2026-05-10T05:00:00Z
depth: deep
files_reviewed: 16
files_reviewed_list:
  - src/config/pricing.ts
  - src/app/pricing/page.tsx
  - src/app/pricing/__tests__/page.test.ts
  - src/components/pricing/pricing-card-standard.tsx
  - src/components/pricing/pricing-comparison-table.tsx
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
findings:
  critical: 1
  warning: 0
  info: 2
  total: 3
status: issues_found
---

# Phase 5: Code Review — Cycle 1

**Reviewed:** 2026-05-10T05:00:00Z
**Depth:** deep
**Files Reviewed:** 16
**Status:** issues_found

## Summary

Phase 5 (Option A pricing restructure: $19/$49/$149 monthly, $190/$490/$1,490 annual) is overwhelmingly correct on the public Pricing page surface, the Stripe migration, and the Edge Function/DB price-ID drift. PRICE-05 numeric guards (monthly: 19/49/149 + annual: 190/490/1490) all pass. PRICE-06 reversal of CRIT-03 is complete on `/pricing` (3 offers in `productJsonLd`, no `'>Custom<'` literal). Phase 4 description carve-outs (3 strings byte-identical) are intact. Phase 2 NumberTicker `value: 500` invariant intact. The full unit suite (98,573 tests) passes.

One blocker remains: the global `getJsonLd()` `SoftwareApplication` schema in `src/lib/generate-metadata.ts` still emits the pre-Phase-5 `lowPrice: '29' / highPrice: '199'`, and `<SeoJsonLd />` is rendered on EVERY page from `src/app/layout.tsx`. This means every page on the site advertises stale pricing in JSON-LD, contradicting the visible page content + the Product JSON-LD on `/pricing` itself (which correctly emits `19.00 / 49.00 / 149.00`). Per Google Structured Data General Guidelines, the price emitted in JSON-LD must match the page's visible price; this is a P1 (potentially Search Console warning + organic-traffic regression) and trips the locked PRICE-06 contract for "stale dollar values left in any user-facing surface".

Two informational items: an outdated JSDoc block on `MAX_PUBLIC_PRICE_DISPLAY` (Plan 05-01 deviation explicitly documented this would be left for a future cleanup) and an unused JSDoc reference to a deletion that no longer happens. Neither blocks merge.

## Critical Issues

### CR-01: SoftwareApplication AggregateOffer schema emits stale lowPrice/highPrice on every page

**File:** `src/lib/generate-metadata.ts:185-192`
**Severity:** Critical (P1 in the phase review-dimensions matrix; treated as blocker because every page on the site emits this schema)

**Issue:**
The `SoftwareApplication` JSON-LD schema in `getJsonLd()` declares:

```typescript
offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: '29',
    highPrice: '199',
    offerCount: '3',
    availability: 'https://schema.org/InStock'
},
```

`lowPrice: '29'` and `highPrice: '199'` are pre-Phase-5 values (old Starter monthly + old Max monthly). Phase 5 Option A locked `$19` low / `$149` high. This component (`SeoJsonLd`) is rendered in `src/app/layout.tsx:93`, so EVERY page on the site emits this stale schema — including `/pricing` itself, where it then contradicts the correct Product schema (`offers: [{Starter $19}, {Growth $49}, {Max $149}]`) emitted from `src/app/pricing/page.tsx`.

**Impact:**
1. Locked-decision violation: phase review dimensions classify "Stale dollar values left in any user-facing surface" as P1; this is a user-facing JSON-LD surface.
2. Google Structured Data General Guidelines require emitted prices to match the page's visible price. The home page, blog, compare pages, etc. all have `Plans from $19/mo` in OG/Twitter description AND now-conflicting `lowPrice: '29' / highPrice: '199'` in JSON-LD on the same page.
3. Conflicts with Product schema on `/pricing`: same page emits both `Product.offers = [19/49/149]` and `SoftwareApplication.AggregateOffer = [29..199]`. Search Console will flag this.
4. Phase post-deploy curl probes in Plan 05-02 Task 13 verify Product schema offers but DO NOT verify the SoftwareApplication AggregateOffer — the existing gates would not have caught this.

**Fix:**

```typescript
// src/lib/generate-metadata.ts:185-192
offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: '19',
    highPrice: '149',
    offerCount: '3',
    availability: 'https://schema.org/InStock'
},
```

Also: add a regression-guard test (or extend the existing `marketing-copy-landlord-only.test.ts` MARKETING_FILES set with a numeric assertion that pins `lowPrice` / `highPrice` to the canonical Option A values). Without a dedicated assertion, a future repricing will silently re-introduce this drift.

## Warnings

(none)

## Info

### IN-01: Outdated JSDoc on `MAX_PUBLIC_PRICE_DISPLAY` constant

**File:** `src/config/pricing.ts:9-22`
**Severity:** Info (P3)

**Issue:**
The JSDoc block above `MAX_PUBLIC_PRICE_DISPLAY` still describes the constant as a Phase 1 CRIT-03 placeholder that "Phase 5 (PRICE-*) deletes" with cleanup steps to "delete this constant" and "delete import + render of MAX_PUBLIC_PRICE_DISPLAY". Phase 5 actually REVERSED the placeholder (constant value flipped from `'Custom'` to `'$149'`) rather than deleting it; the constant is still consumed at `pricing-comparison-table.tsx:206`. Plan 05-01 SUMMARY explicitly documented this as a deferred cleanup ("JSDoc replacement omitted from Task 7" deviation), so this is a known leftover, not a new finding.

**Fix:**

```typescript
/**
 * Phase 1 (CRIT-03) "Custom" placeholder was REPLACED in Phase 5 (PRICE-06)
 * with the locked Max public price `$149/mo`. The constant is consumed by
 * pricing-comparison-table.tsx:206 (Max column header) so future repricing
 * only requires changing this literal.
 *
 * Surface map (one-liner): grep -rn 'MAX_PUBLIC_PRICE_DISPLAY' src/
 */
export const MAX_PUBLIC_PRICE_DISPLAY = '$149' as const
```

### IN-02: Phase-5 migration recreates plain `'starter' / 'growth' / 'max'` lookup branches without guarding upper-case input

**File:** `supabase/migrations/20260510094421_phase_5_recognize_new_price_ids.sql:96-116`
**Severity:** Info (P3)

**Issue:**
`get_user_plan_limits(uuid)` in the new migration normalizes via `LOWER(COALESCE(v_plan, ''))` (line 94) before the CASE, but the lower-cased price-ID branches list values like `'price_1tvtaap3wcr53sdoymuzn7vf'`. Stripe price IDs are mixed-case (e.g. `price_1TVTaA...`) and the actual `subscription_plan` column may store them either as the raw `price_…` string (per the plan-tier.ts comment about webhooks writing `subscription_plan: planLookup ?? priceId`) or as the lookup_key (`'starter_monthly'`). The lower-cased branches handle the raw price-ID case correctly, but `'starter_monthly'` / `'growth_annual'` / etc. lookup_key values are NOT in any branch, so a customer subscribing via `lookup_key` resolution will fall through to the `ELSE` (trial caps).

This is not a regression introduced by Phase 5 — pre-Phase-5 code had the same gap — but Phase 5 introduced `lookup_key` as the recommended source-of-truth pattern (per CONTEXT.md "future restructures don't require code edits"), so a follow-up migration should add lookup_key branches:

```sql
WHEN v_plan = 'starter'
  OR v_plan = 'starter_monthly'
  OR v_plan = 'starter_annual'
  OR v_plan = 'price_1tvtaap3wcr53sdoymuzn7vf'
  OR v_plan = 'price_1tvtaep3wcr53sdo7pbg6bcw' THEN
  ...
```

**Fix:** Defer to a separate plan; document in `deferred-items.md` under a new "lookup_key resolution gap" entry. No customer impact today (zero active subs per the 2026-05-10 Stripe MCP confirmation), but worth landing before any production launch.

---

## Regression Guards Verified

| Guard | Status | Evidence |
|-------|--------|----------|
| Phase 4 Starter description (`'Ideal for landlords with 1–5 rentals'`) | INTACT | `src/config/pricing.ts:100` byte-identical |
| Phase 4 Growth description (`'For growing portfolios that need advanced features'`) | INTACT | `src/config/pricing.ts:133` byte-identical |
| Phase 4 Max description (`'For landlords with 21+ rentals — unlimited scale and API access'`) | INTACT | `src/config/pricing.ts:167` byte-identical (em-dash preserved) |
| Phase 2 NumberTicker `value: 500` invariant | INTACT | `src/components/sections/stats-showcase.tsx:31` |
| `MAX_PUBLIC_PRICE_DISPLAY === '$149'` | PASS | `src/config/pricing.ts:23` |
| `productJsonLd.offers.length === 3` | PASS | `src/app/pricing/page.tsx:36-40` (3 entries: Starter $19, Growth $49, Max $149) |
| `pricing-card-standard.tsx >Custom<` literal removed | PASS | grep returns 0 |
| Phase 4 banlist (`marketing-copy-landlord-only.test.ts`) recalibrated | PASS | `BANNED_STALE_PLAN_REFS` no longer includes `$49/mo`/`$49/month`; `up to 50 units` + invented plan names retained |
| Compare-data savings math | PASS | Buildium `$1,600/year` (`($183-$49)*12=$1,608`); AppFolio `$3,000/year` (`($298-$49)*12=$2,988`); RentRedi `$10` delta (`$19-$9`) |
| Stale TenantFlow tier dollar values in src/ | PASS (1 KEEP) | Only hit: `src/lib/utils/__tests__/currency.test.ts:65` — generic formatter test using `29` as numeric input (legitimate; not pricing strategy) |
| Legacy Stripe IDs in src/ | PASS | grep returns 0 in src/; `plan-tier.ts:8` mentions one in a comment explaining the fix |
| Edge Function `priceIdToTier()` recognizes new IDs | PASS | All 6 new IDs in `STARTER_PRICE_IDS` / `GROWTH_PRICE_IDS` / `MAX_PRICE_IDS` |
| `tier-gate.ts GROWTH_AND_MAX_PLANS` recognizes new IDs | PASS | All 4 Growth+Max IDs + `growth*` / `max*` lookup_key fallbacks |
| New SQL migration recognizes 6 new IDs | PASS | `check_user_feature_access` + `get_user_plan_limits(uuid)` CASE branches |
| Settings tests (`billing-settings.test.tsx`, `settings-page.test.tsx`) | PASS | Both reference `price_1TVTaIP3WCR53SdoqnUe1Inv` + assert `'$49'` |
| Cross-cutting design-token diff gate | PASS (assumed by Plan 05-02 SUMMARY; not re-run here) | 0 hex/0 rgba/0 bg-white/0 inline-ms |
| `pnpm test:unit` | PASS | 98,573 / 98,573 tests pass |

## Notes (legacy SQL migration files NOT in this PR's diff)

`grep -rn 'price_1Rd16p\|...' supabase/migrations/` surfaces the pre-Phase-5 price IDs in:
- `20260218120000_fix_plan_limits_real_tiers.sql`
- `20260219100000_implement_check_user_feature_access.sql`
- `20260304120000_rpc_auth_guards.sql`
- `20260505221558_enforce_plan_limits_recognize_price_ids.sql`
- `supabase/schemas/public.sql`

These migrations are NOT part of Phase 5's diff. They are historical migrations — the new `20260510094421_phase_5_recognize_new_price_ids.sql` runs `CREATE OR REPLACE` on the same functions and supersedes the pre-Phase-5 definitions in prod. No action required for this PR.

The `supabase/schemas/public.sql` file is documented as a stale dump in the project's MEMORY.md ("Old `supabase/schemas/public.sql` dump has stale column names — NEVER trust it for column references") so its stale price-ID references are acceptable per project convention.

---

_Reviewed: 2026-05-10T05:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_

## REVIEW COMPLETE — VERDICT: NEEDS-FIX
