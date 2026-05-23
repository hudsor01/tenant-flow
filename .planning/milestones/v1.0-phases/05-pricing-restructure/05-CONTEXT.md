# Phase 5: Pricing Restructure — Context

**Gathered:** 2026-05-10
**Status:** Ready for research synthesis → planning
**Source:** ROADMAP.md § Phase 5 + 2 specialist research artifacts + user strategic decision 2026-05-10

<domain>
## Phase Boundary

Phase 5 reprices TenantFlow's three tiers to align with the 1–15 rental segment, fixes a real math bug in Max annual pricing, replaces the Phase 1 CRIT-03 "Custom pricing, contact sales" placeholder with a real Max price, and migrates Stripe products + prices cleanly. Six requirements: PRICE-01 (revenue audit), PRICE-02 (competitor analysis), PRICE-03 (PRICING-DECISION.md artifact), PRICE-04 (Stripe migration), PRICE-05 (annual savings math accuracy), PRICE-06 (replace CRIT-03 placeholders).

**In scope:**
- Reprice all three tiers per Option A (locked)
- Fix Max annual math bug (current `$2,189` is 8.3% discount; correct `$1,490` is 16.67%)
- Create new Stripe products + prices via MCP with `lookup_key` set
- Archive 4 stale Stripe products (TenantFlow Starter, TenantFlow Growth, MAX, Trial — duplicates of the live products)
- Update `src/config/pricing.ts` with new Stripe IDs + new dollar values
- Propagate new numbers across all 4 marketing surfaces: pricing card, comparison table, homepage features grid, JSON-LD `Product`
- Replace CRIT-03 "Custom" placeholder on Max card with real `$149/mo` (PRICE-06)
- Document customer migration playbook (zero current subscribers, but playbook for future)
- Update `MAX_PUBLIC_PRICE_DISPLAY` constant from `'Custom'` → `'$149'`
- Annual savings math (used in CONS-10) calculable from new prices
- Cross-cutting design-token gate (no new hex/rgb/`bg-white`/inline-ms)

**Out of scope** (deferred to other phases):
- Tier renames (Starter / Growth / Max stay — Phase 4 descriptions reference these)
- Per-unit pricing — explicitly REJECTED (conflicts with locked portfolio bands)
- Free tier (Option C) — REJECTED in user decision (would require Phase 4 description rework)
- 30-day trial — keeping 14 days (no signal to change)
- Quarterly billing — out of scope (only monthly + annual)
- Coupon design — no active coupons; deferred until first launch promo

**Branch:** `gsd/phase-05-pricing-restructure`
**Phase requirement IDs:** PRICE-01, PRICE-02, PRICE-03, PRICE-04, PRICE-05, PRICE-06
**Cross-cutting design-token constraint:** No new hex/rgb/`bg-white`/inline-ms tokens introduced. Pure config + Stripe migration + copy/number propagation.
</domain>

<decisions>
## Implementation Decisions (LOCKED)

### Tier Shape — Option A (user-confirmed 2026-05-10)

| Tier | Monthly | Annual | Annual discount |
|------|---------|--------|------------------|
| **Starter** | **$19** | **$190** | 16.67% (2 months free) |
| **Growth** | **$49** | **$490** | 16.67% (2 months free) |
| **Max** | **$149** | **$1,490** | 16.67% (2 months free) |

- All annual = monthly × 10 (clean math, matches Stripe industry convention)
- `MAX_PUBLIC_PRICE_DISPLAY` constant flips from `'Custom'` → `'$149'` (PRICE-06 fix)
- Phase 1 CRIT-03 lock: "Max — Custom pricing, contact sales" placeholder is REPLACED with the real $149 price + a "contact sales for enterprise add-ons" CTA below the tier limits

### Tier Names — UNCHANGED

- Starter / Growth / Max kept as-is (Phase 4 locked descriptions reference these names)
- All Phase 4 description text (`'Ideal for landlords with 1–5 rentals'`, `'For growing portfolios that need advanced features'`, `'For landlords with 21+ rentals — unlimited scale and API access'`) UNCHANGED

### Feature Gating — UNCHANGED (no regression)

- Vault stays on Starter (current Starter has 10GB document storage)
- E-sign stays on Growth+ (Starter does not include lease e-sign)
- API access stays on Max only
- No feature deltas — pure repricing

### Trial — UNCHANGED

- 14-day trial, no credit card (Phase 4 locked phrase: `Built for landlords with 1–15 rentals. 14-day free trial, no credit card`)

### Annual Savings Math (PRICE-05)

- Each tier saves exactly 2 months/year (`monthly × 12 - annual × 1 = monthly × 2`)
- `calculateAnnualSavings()` helper assumes the 10× formula correctly
- After migration: $19 × 2 = $38 saved, $49 × 2 = $98 saved, $149 × 2 = $298 saved per year

### Stripe Product Hygiene

The Stripe account currently has 6 products. **Live in pricing.ts:** `prod_TLy8IZ0jV68wF6` (Growth), `tenantflow_starter` (Starter), `prod_SY7LmPzsPpvUaT` (MAX), `prod_SbujfadeHK2q0w` (Trial). **Stale duplicates to archive:** `prod_SY7K5lSS4JDkqz` (TenantFlow Growth), `prod_SY7JUwNYPb3V8j` (TenantFlow Starter).

**Strategy:**
- **Update existing products in place where possible** — keep `prod_TLy8IZ0jV68wF6` (Growth), `tenantflow_starter` (Starter), `prod_SY7LmPzsPpvUaT` (MAX); update `name` + `description` to align with Phase 4 locked descriptions
- **Create new prices** with the new monthly + annual amounts and **set `lookup_key`** in format `<tier>_<period>` (e.g., `starter_monthly`, `growth_annual`, `max_monthly`) so future restructures don't require code edits
- **Archive 2 stale duplicate products** (`prod_SY7K5lSS4JDkqz`, `prod_SY7JUwNYPb3V8j`) since they're not referenced in `src/config/pricing.ts`
- **Archive old prices** (`price_1Rd16p…`, `price_1Rd17A…`, `price_1RtFMG…`, `price_1RtFMQ…`, `price_1RtWFc…`, `price_1RtWFd…`) after pricing.ts switches to the new prices
- **Keep Trial product** (`prod_SbujfadeHK2q0w`) — used by 14-day trial flow

### Customer Migration Playbook (PRICE-04 deliverable)

Zero current active subscribers (all 50+ subscriptions in Stripe are status `canceled` test/dev accounts). Migration playbook for future restructures:
1. Tag old prices with metadata `legacy: true`; do NOT delete
2. Create new prices with `lookup_key` set
3. For active subscribers: schedule prorated upgrade via `stripe.subscriptions.update` with `proration_behavior: 'create_prorations'` at next billing cycle
4. Email notification 30 days ahead of switchover
5. Honor old price for grandfathered customers via metadata flag (do not auto-migrate)
6. Verify new prices via Stripe test mode before flipping production lookup_key references

### Phase 1 CRIT-03 + Phase 2 + Phase 4 Cross-Check (REGRESSION GUARDS)

- **Phase 1 CRIT-03 — replaced by Phase 5 PRICE-06.** The "Custom pricing, contact sales" placeholder is intentionally replaced; CRIT-03 was a placeholder that PRICE-06 was always going to flip. Tests asserting `'Custom'` text + Max-excluded-from-offers must be UPDATED, not preserved (this is the only phase where CRIT-03 invariants legitimately change).
- **Phase 2 NumberTicker — invariant preserved.** `stats-showcase.tsx` `value: 500` integer untouched (separate stat, unrelated to pricing).
- **Phase 4 persona word — invariant preserved.** All Phase 4 cleaned files stay clean. Tier descriptions stay locked.

### Cross-Cutting Design-Token Constraint (LOCKED — applies to ALL phases)

N/A for this phase visually (no new color/spacing introductions). Token grep gate runs on the diff and trivially passes.

### Claude's Discretion

- Plan decomposition (1 or 2 plans — likely 2: Plan 05-01 = Stripe MCP migration; Plan 05-02 = code/copy propagation)
- Specific test extensions (`pricing/__tests__/page.test.ts` needs JSON-LD `Product.offers` to ADD Max at `$149`; this is the inverse of CRIT-03 cycle 1's exclusion test)
- Comparison table layout if any visual change cascades from new prices
- Whether to add a `lookup_key` metadata field to existing prices retroactively

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 5 research artifacts
- `.planning/phases/05-pricing-restructure/05-RESEARCH.md` — canonical synthesis (read FIRST after research completes)
- `.planning/phases/05-pricing-restructure/05-RESEARCH-revenue-baseline.md` — Specialist 1 (codebase touchpoints + Stripe state)
- `.planning/phases/05-pricing-restructure/05-RESEARCH-competitor-pricing.md` — Specialist 2 (8-competitor matrix + tier-shape options A/B/C)

### Project context
- `.planning/PROJECT.md` — locked v1.0 decisions
- `.planning/REQUIREMENTS.md § PRICE-01..06` — exact requirement IDs
- `.planning/ROADMAP.md § Phase 5` — phase goal + 6 success criteria
- `.planning/phases/04-persona-copy/04-RESEARCH.md` — Phase 4 locked decisions (persona word + tier descriptions)

### Codebase conventions
- `CLAUDE.md` — zero-tolerance rules
- `src/config/pricing.ts` — current pricing config (will be rewritten)

### Existing-pattern references (read; understand current state before editing)
- `src/config/pricing.ts:64-228` — `TENANTFLOW_FREE_TRIAL` / `STARTER` / `TENANTFLOW_GROWTH` / `TENANTFLOW_MAX` shape
- `src/components/pricing/pricing-card-standard.tsx` — rendered standard card
- `src/components/pricing/pricing-card-featured.tsx` — featured Growth card
- `src/components/pricing/pricing-comparison-table.tsx` — `MAX_PUBLIC_PRICE_DISPLAY` constant + PROD lists
- `src/app/pricing/page.tsx` — page-level metadata + `productJsonLd`
- `src/app/pricing/pricing-content.tsx` — `STATS`, `FAQS`, footer CTA
- `src/lib/utils/calculate-annual-savings.ts` (or wherever the savings math lives)
- Phase 4 commits `4cd... → 901721ce2` — pricing-related touches in v2.6+

### Memory references
- `feedback_perfect_pr_gate.md` — 2 zero-finding cycles required for merge
- `branch-protection-config.md` — required CI checks: `checks`, `e2e-smoke`, `rls-security`

</canonical_refs>

<specifics>
## Specific Ideas

### Suggested plan decomposition: 2 plans (sequential)

**Plan 05-01:** Stripe MCP migration + pricing.ts config update
- Update existing 3 live Stripe products' name/description to align with Phase 4 locked descriptions
- Create 6 new prices (3 tiers × monthly+annual) with lookup_keys
- Update `src/config/pricing.ts` with new Stripe price IDs and new dollar values
- Update `MAX_PUBLIC_PRICE_DISPLAY` constant from `'Custom'` → `'$149'`
- Archive 2 stale duplicate products + 6 stale prices

**Plan 05-02:** Marketing surface propagation + tests
- Update pricing card numbers (already-rendered values reference pricing.ts but verify)
- Update comparison-table PROD list
- Update homepage features grid stats / pricing references
- Update `productJsonLd` description and `offers` to include Max at $149 (REVERSING Phase 1 CRIT-03 Max-exclusion)
- Update `pricing/__tests__/page.test.ts` — JSON-LD assertion changes Max from "excluded" to "$149"
- Update FAQS in `pricing-content.tsx` if any reference dollar values
- Document customer migration playbook in CONTEXT.md or PRICING-DECISION.md
- Update Phase 4 carve-out tests (`pricing-card-standard.test.tsx`) that asserted `'Custom'` literal

### Test additions / changes

- **REPLACE** Phase 1 CRIT-03 assertions: `pricing/__tests__/page.test.ts` currently asserts `productJsonLd.offers.length === 2` (Max excluded). After Phase 5: `length === 3` with Max at $149.
- **REPLACE** `pricing-card-standard.tsx` "Custom" text assertion with `$149` text assertion.
- **NEW**: assert `lookup_key` is set on each of the 6 new prices when fetched from Stripe (integration test, optional — could just be a Stripe-MCP smoke check at deploy).

### Live verification (post-deploy)

```bash
curl -s https://tenantflow.app/pricing | grep -oE '\$19/mo|\$49/mo|\$149/mo'
# Expect: 3 results

curl -s https://tenantflow.app/pricing | grep -oE 'Custom pricing, contact sales'
# Expect: 0 results (was the CRIT-03 placeholder)

curl -s https://tenantflow.app/pricing | grep -oE 'application/ld\+json' | wc -l
# Expect: ≥3 (FAQ + Breadcrumb + Product)

# Then inspect Product JSON-LD has 3 offers (Starter, Growth, Max all priced)
curl -s https://tenantflow.app/pricing | python3 -c "import sys, re, json; html=sys.stdin.read(); m=re.findall(r'<script type=\"application/ld\\+json\">(.*?)</script>', html, re.S); offers=[len(json.loads(s).get('offers',[])) for s in m if 'Product' in s or 'offers' in s]; print(offers)"
# Expect: [3] (was [2] under CRIT-03)
```

</specifics>

<deferred>
## Deferred Ideas

These came up during research but explicitly belong to other phases or are out of scope:

- **Tier renames** — keep Starter / Growth / Max forever (Phase 4 descriptions reference these names; renaming becomes a v2.0+ decision)
- **Per-unit pricing** — REJECTED (conflicts with portfolio-band positioning)
- **Free tier** — REJECTED (Option C; would require Phase 4 description rework)
- **30-day trial extension** — out of scope; user signaled no change
- **Quarterly billing** — out of scope
- **Coupons / launch promos** — out of scope; no active coupons in Stripe today
- **Lookup-key retrofit on legacy prices** — only set lookup_key on NEW prices; legacy prices stay as-is until archive
- **Customer email migration notice template** — out of scope (zero customers); document in playbook only
- **Comparison table redesign** — pure number swap; no layout change
- **Granular seat-based pricing for Max** — out of scope; flat $149 includes everything

</deferred>

---

*Phase: 05-pricing-restructure*
*Context gathered: 2026-05-10 — pre-research-synthesis lock-in*
