---
phase: 05-pricing-restructure
phase_number: 5
generated: 2026-05-10
synthesized_from:
  - 05-RESEARCH-revenue-baseline.md (Specialist 1 — codebase touchpoints + Stripe state via MCP)
  - 05-RESEARCH-competitor-pricing.md (Specialist 2 — 8-competitor matrix + 3 tier-shape options)
user_decision_2026-05-10: Option A LOCKED ($19/$49/$149 monthly, 16.67% annual discount, all annual = monthly × 10)
stripe_state_2026-05-10: 0 active subscriptions confirmed; 50+ canceled test/dev accounts; no coupons; 6 products (4 to keep + archive 2 stale duplicates)
---

# Phase 5: Pricing Restructure — Canonical Research

## Locked Decisions (Pre-Plan Inputs)

| ID | Decision | Source |
|----|----------|--------|
| **PRICE-01 revenue baseline** | $0 MRR. 0 active subs (all 50+ subs in Stripe are status `canceled` test accounts). No coupons. Confirmed via Stripe MCP `list_subscriptions` 2026-05-10. | Specialist 1 + orchestrator MCP calls |
| **PRICE-02 competitor analysis** | 8-competitor matrix (TurboTenant, Avail, Hemlane, RentRedi, Stessa, Innago, TenantCloud, Baselane). 6/8 offer free tiers; mid-tier cluster $9–$35; current Growth $79 is outlier. Max public price clusters $129–$169 in segment. | Specialist 2 |
| **PRICE-03 PRICING-DECISION.md** | Documented in this file + CONTEXT.md `<decisions>` block. Option A rationale captured. | This synthesis |
| **PRICE-04 Stripe migration** | Update 3 live products in place; create 6 new prices with `lookup_key`; archive 2 stale duplicate products + 6 stale prices. Customer migration playbook documented (zero current customers but playbook for future). | Specialist 1 + CONTEXT.md |
| **PRICE-05 annual savings math** | All tiers: annual = monthly × 10. Savings = monthly × 2 per year. `calculateAnnualSavings()` helper already correct for the 10× formula. | Specialist 2 |
| **PRICE-06 replace CRIT-03 placeholders** | `MAX_PUBLIC_PRICE_DISPLAY` flips from `'Custom'` → `'$149'`. `productJsonLd.offers` adds Max at $149 (currently excluded per CRIT-03). Page meta description swaps "Custom pricing, contact sales" for `$149/mo`. | User confirmation 2026-05-10 |

## Tier Shape (LOCKED — Option A)

| Tier | Monthly | Annual | Discount | Properties cap | Vault | E-sign | API |
|------|---------|--------|----------|----------------|-------|--------|-----|
| **Starter** | **$19** | **$190** | 16.67% (2 months free) | 5 properties / 25 units | 10GB | — | — |
| **Growth** | **$49** | **$490** | 16.67% | 20 properties / 100 units | 50GB | 25/mo | — |
| **Max** | **$149** | **$1,490** | 16.67% | unlimited | unlimited | unlimited | yes |

- Tier names UNCHANGED (Phase 4 locked descriptions reference these)
- Phase 4 locked descriptions UNCHANGED:
  - Starter: `'Ideal for landlords with 1–5 rentals'`
  - Growth: `'For growing portfolios that need advanced features'`
  - Max: `'For landlords with 21+ rentals — unlimited scale and API access'`
- Trial: 14 days, no credit card
- Feature gating: no regression — vault on Starter, e-sign on Growth+, API on Max only

## Stripe Migration Strategy (LOCKED)

### Existing live products to UPDATE in place

| Stripe ID | Tier | Action |
|-----------|------|--------|
| `tenantflow_starter` | Starter | Update name/description; archive existing prices; create new $19/$190 prices with `lookup_key: 'starter_monthly'` / `'starter_annual'` |
| `prod_TLy8IZ0jV68wF6` | Growth | Update name/description; archive existing prices; create new $49/$490 prices with `lookup_key: 'growth_monthly'` / `'growth_annual'` |
| `prod_SY7LmPzsPpvUaT` | MAX | Update name/description; archive existing prices ($199/$2,189); create new $149/$1,490 prices with `lookup_key: 'max_monthly'` / `'max_annual'` |
| `prod_SbujfadeHK2q0w` | Trial | KEEP as-is (no price changes) |

### Stale products to ARCHIVE

| Stripe ID | Reason |
|-----------|--------|
| `prod_SY7K5lSS4JDkqz` | Duplicate Growth product, no `pricing.ts` references |
| `prod_SY7JUwNYPb3V8j` | Duplicate Starter product, no `pricing.ts` references |

### Stale prices to ARCHIVE (after pricing.ts switches to new IDs)

| Price ID | Product | Reason |
|----------|---------|--------|
| `price_1RtFMQP3WCR53Sdoe6GhGWeG` | `prod_SY7K5lSS4JDkqz` | Stale duplicate Growth annual |
| `price_1RtFMGP3WCR53SdoGcrH3JgN` | `prod_SY7K5lSS4JDkqz` | Stale duplicate Growth monthly |
| `price_1Rd16pP3WCR53SdoCh3oJlDl` | `prod_SY7LmPzsPpvUaT` | Old Max monthly $199 (replaced by new $149) |
| `price_1Rd17AP3WCR53SdoTB4FTbSq` | `prod_SY7LmPzsPpvUaT` | Old Max annual $2,189 BUG (replaced by new $1,490) |
| `price_1Rd168P3WCR53SdogESXZR8n` | `prod_SY7K5lSS4JDkqz` | Stale duplicate Growth annual |
| `price_1Rd15lP3WCR53Sdov7qpcGlD` | `prod_SY7K5lSS4JDkqz` | Stale duplicate Growth monthly |
| `price_1Rd15CP3WCR53SdoWn7kMCKU` | `prod_SY7JUwNYPb3V8j` | Stale duplicate Starter monthly |
| `price_1Rd15CP3WCR53SdoOdClUV2k` | `prod_SY7JUwNYPb3V8j` | Stale duplicate Starter annual |
| `price_1RtWFcP3WCR53SdoCxiVldhb` | `tenantflow_starter` | Old Starter monthly $29 (replaced by new $19) |
| `price_1RtWFdP3WCR53SdoArRRXYrL` | `tenantflow_starter` | Old Starter annual $290 (replaced by new $190) |
| `price_1SPGCNP3WCR53SdorjDpiSy5` | `prod_TLy8IZ0jV68wF6` | Old Growth monthly $79 (replaced by new $49) |
| `price_1SPGCRP3WCR53SdonqLUTJgK` | `prod_TLy8IZ0jV68wF6` | Old Growth annual $790 (replaced by new $490) |

(KEEP `price_1RgguDP3WCR53Sdo1lJmjlD5` — Trial $0 monthly. Trial flow unchanged.)

## Codebase Touchpoint Matrix (Plan inputs)

### Plan 05-01 — Stripe MCP + pricing.ts config (touches)

| File:Line | Current | New |
|-----------|---------|-----|
| `src/config/pricing.ts:64-95` | `TENANTFLOW_FREE_TRIAL` block — Trial product `prod_SbujfadeHK2q0w` | UNCHANGED |
| `src/config/pricing.ts:96-130` | `STARTER` — $29/$290 | $19/$190 + new price IDs |
| `src/config/pricing.ts:131-165` | `TENANTFLOW_GROWTH` — $79/$790 | $49/$490 + new price IDs |
| `src/config/pricing.ts:166-228` | `TENANTFLOW_MAX` — $199/$2,189 (BUG) | $149/$1,490 + new price IDs |
| `src/config/pricing.ts:?` | `MAX_PUBLIC_PRICE_DISPLAY = 'Custom' as const` | `MAX_PUBLIC_PRICE_DISPLAY = '$149' as const` |

### Plan 05-02 — marketing surface propagation (touches)

| File:Line | Current | New |
|-----------|---------|-----|
| `src/components/pricing/pricing-card-standard.tsx:168` | Renders `'Custom'` for Max via `MAX_PUBLIC_PRICE_DISPLAY` | Auto-flips to `'$149'` (constant change cascades) |
| `src/components/pricing/pricing-comparison-table.tsx:206` | `{MAX_PUBLIC_PRICE_DISPLAY}` | Auto-flips |
| `src/app/pricing/page.tsx:23-24` | Description: `"Property management software for landlords with 1–15 rentals. Starter ($29/mo, 5 properties), Growth ($79/mo, 20 properties), Max — Custom pricing, contact sales..."` | `"...Starter ($19/mo, 5 properties), Growth ($49/mo, 20 properties), Max ($149/mo, unlimited properties)..."` |
| `src/app/pricing/page.tsx:33-44` | `productJsonLd.offers = [{Starter, 29.00}, {Growth, 79.00}]` (Max excluded per CRIT-03) | `[{Starter, 19.00}, {Growth, 49.00}, {Max, 149.00}]` (Max included now) |
| `src/app/pricing/page.tsx:35-36` | JSON-LD description: `'Professional property management software for landlords with 1–15 rentals. Starter $29/mo (5 properties), Growth $79/mo (20 properties). Max enterprise tier — Custom pricing, contact sales.'` | `'... Starter $19/mo (5 properties), Growth $49/mo (20 properties), Max $149/mo (unlimited).'` |
| `src/app/pricing/__tests__/page.test.ts` | Asserts `offers.length === 2` + Max excluded text | Asserts `offers.length === 3` + Max at $149 |
| `src/components/pricing/pricing-comparison-table.tsx` | `PROD` lists with $29/$79/$199 references if any | Update to $19/$49/$149 |
| `src/components/sections/comparison-table.tsx` | Any pricing-related cells | Verify no hardcoded numbers; should consume from pricing.ts |
| `src/data/faqs.ts` | Any FAQ entries with $29/$79/$199 dollar values | Sweep + replace |
| `src/components/sections/home-faq.tsx:21` | `'Starter plan is built for landlords with 1–5 rentals / 25 units. You get the document vault, maintenance tracking, and 10GB of document storage at $29/month.'` | `'... at $19/month.'` |
| `src/lib/utils/calculate-annual-savings.ts` (or wherever) | Already assumes 10× formula | UNCHANGED |
| `src/components/sections/stats-showcase.tsx` | Any pricing stats | Verify; likely unchanged |
| `src/components/sections/results-proof-section.tsx` | Any pricing stats | Verify |

(Researcher's exhaustive 21+ touchpoint table is in `05-RESEARCH-revenue-baseline.md`.)

## Tests to Update

### Existing tests that change

- `src/app/pricing/__tests__/page.test.ts` — flip CRIT-03 assertion from "Max excluded from offers" to "offers contains 3 entries with Starter $19, Growth $49, Max $149"
- `src/components/pricing/__tests__/pricing-card-standard.test.tsx` (if exists) — flip from `'Custom'` → `'$149'`
- `src/components/pricing/__tests__/pricing-comparison-table.test.tsx` (if exists) — flip cells
- `src/app/__tests__/marketing-copy-landlord-only.test.ts` — verify no banlist regression (no banned phrases introduced)

### New tests

- Optional: post-migration smoke test asserting all 6 new Stripe prices have `lookup_key` set (skip if no easy way to mock Stripe in unit; verify manually post-deploy)

## Risk Matrix

| Risk | Likelihood | Severity | Mitigation |
|------|-----------|----------|------------|
| **R1**: Old price IDs referenced somewhere we missed → checkout 404 | LOW (zero customers) | MEDIUM | Plan 05-01 grep enforces zero references to old price IDs after switchover |
| **R2**: Stripe webhook handlers reference old price IDs | LOW | MEDIUM | Audit Edge Functions for hardcoded price IDs (most should consume from `lookup_key` or DB) |
| **R3**: CRIT-03 test fails after Phase 5 because we forgot to update it | MEDIUM | LOW | Plan 05-02 explicitly updates the Phase 1 CRIT-03 assertion (this is the only legitimate phase to flip it) |
| **R4**: Annual savings math regresses | LOW | MEDIUM | Unit test asserts `monthly × 10 === annual` for all 3 tiers post-migration |
| **R5**: lookup_key collision with archived prices | LOW | LOW | Stripe enforces lookup_key uniqueness on active prices; archive old prices before creating new ones with the target keys (or use new lookup_keys and migrate later) |
| **R6**: Math bug in `calculateAnnualSavings()` lurks | LOW | LOW | After migration the function returns: Starter $38, Growth $98, Max $298 — assert these specific values |
| **R7**: Phase 4 description drift | LOW | MEDIUM | Plan 05-01 explicitly preserves the 3 locked Phase 4 description strings; checker re-verifies |
| **R8**: Stale Stripe products break webhook resolution | LOW | LOW | Archive only the 2 confirmed-stale duplicates (`prod_SY7K5lSS4JDkqz`, `prod_SY7JUwNYPb3V8j`); leave the rest live |

## Confidence

| Area | Level | Reason |
|------|-------|--------|
| Tier shape Option A | HIGH | User confirmed 2026-05-10 |
| Stripe state (zero active subs, no coupons) | HIGH | Live MCP calls 2026-05-10 |
| Codebase touchpoints | HIGH | Specialist 1 enumerated end-to-end |
| Competitor pricing | HIGH | Specialist 2 live-fetched 7/8, cross-verified 8th |
| `lookup_key` strategy | HIGH | Stripe-recommended pattern; future-restructures benefit |
| CRIT-03 reversal | HIGH | PRICE-06 contract explicitly mandates this |
| Phase 4 description preservation | HIGH | Identical strings; one-line guard in Plan 05-02 verifier |
| Customer migration playbook (paper) | HIGH | No active customers; documented for future |

## Sources

- `.planning/phases/05-pricing-restructure/05-RESEARCH-revenue-baseline.md` (Specialist 1)
- `.planning/phases/05-pricing-restructure/05-RESEARCH-competitor-pricing.md` (Specialist 2)
- `.planning/phases/04-persona-copy/04-RESEARCH.md` (Phase 4 locked decisions)
- Stripe MCP `list_products` / `list_prices` / `list_subscriptions` / `list_coupons` 2026-05-10 (orchestrator-run)
- 8 competitor pricing pages (live URLs cited in Specialist 2)

---

*Phase 5 research synthesized: 2026-05-10 — ready for `/gsd-plan-phase 5 --skip-research` dispatch.*
