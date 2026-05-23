# Phase 1 — Pricing UI Patterns + Stripe-vs-Public Divergence (CRIT-03)

**Researched:** 2026-05-08
**Specialist:** 4 of 4 — Pricing UI patterns + Stripe-vs-public divergence
**Confidence:** HIGH (all findings VERIFIED via codebase reads)

## Summary

CRIT-03 requires Max plan public pricing to read "Custom" across 4 surfaces (pricing card, comparison table, homepage features grid, JSON-LD `Product` schema) **without disturbing the live Stripe products/prices** (`price_1Rd16pP3WCR53SdoCh3oJlDl` monthly + `price_1Rd17AP3WCR53SdoTB4FTbSq` annual at $199/mo and $2189/yr — see `src/config/pricing.ts:156-159` [VERIFIED]). The Stripe restructure happens in Phase 5 (PRICE-*); Phase 1 is a placeholder-only shim.

**Critical finding:** the pricing card ALREADY ships "Custom" today — `src/components/pricing/pricing-card-standard.tsx:167-168` renders `<div className="text-3xl font-bold text-foreground">Custom</div>` when `variant === 'enterprise'` [VERIFIED]. Phase 1's actual scope is narrower than the audit implies — three surfaces are stale: comparison-table sticky header, homepage features-section feature card description, and the pricing-page JSON-LD `offers[2].price`. The Max-card "Custom" pattern is already battle-tested and is the established codebase precedent.

**Primary recommendation:** Pattern (B-modified) — **conditional render via existing `planId === 'max'` / `variant === 'enterprise'` boundary checks**, gated centrally by a single new constant `MAX_PUBLIC_PRICE_DISPLAY = 'Custom'` exported from `src/config/pricing.ts`. Don't add a `displayPrice` field to `PricingConfig` (Pattern C) — that bloats the type for one transitional value and Phase 5 will rip it out anyway. Don't feature-flag (D) — overkill for a hardcoded placeholder. Don't add Stripe `metadata` (E) — adds an external surface that must be reconciled before Phase 5.

## Public-vs-Stripe Divergence Pattern

### Existing precedent (the deciding evidence)

The Max card on `/pricing` does not display the Stripe $199 price. It calls Stripe checkout indirectly via `MessageSquare`-iconed "Contact Sales" CTA that routes to `/contact` instead of `createCheckoutSession()`:

- `src/components/pricing/pricing-card-standard.tsx:63-66` [VERIFIED]:
  ```tsx
  if (isEnterprise) {
      window.location.href = '/contact'
      return { success: true }
  }
  ```
- `src/components/pricing/pricing-card-standard.tsx:167-168` [VERIFIED]: price renders as plain `Custom` text instead of the `<NumberFlow value={currentPrice} />` used for Starter/Growth.
- `src/components/pricing/kibo-style-pricing.tsx:143-146` [VERIFIED]: independently maps `plan.planId === 'max' ? 'Contact Sales' : ...` — same divergence pattern, second instance.

The codebase **already runs a public-vs-Stripe divergence for Max**. The Stripe price object exists, lookups still resolve, but the public face renders "Custom" + "Contact Sales". CRIT-03 is closing **gaps** in this established pattern — not introducing the pattern.

### Pattern selection

| Pattern | Verdict | Reason |
|---------|---------|--------|
| (A) Hardcode "Custom" inline at every render site | **Reject** | Spreads the magic string across 4 files; Phase 5 cleanup hunts strings. |
| (B) Conditional render via tier-name check | **Selected (modified)** | Matches existing Max-card precedent at `pricing-card-standard.tsx:167`. Reuses the `planId === 'max'` / `variant === 'enterprise'` boundary already in the codebase. |
| (C) Add `displayPrice` field to `PricingConfig` | **Reject** | Bloats `PricingConfig` interface (`src/config/pricing.ts:17-40` [VERIFIED]) for one transitional value. Phase 5 will replace this with real numbers — adding then removing the field is double-write churn. Also: only Max needs it. |
| (D) Feature flag (env var / GrowthBook) | **Reject** | Heavy for a placeholder string. No GrowthBook in the codebase (verified by absence in `src/lib/`). |
| (E) Stripe `metadata.public_price_display` | **Reject** | Introduces a Stripe-side configuration surface that Phase 5 has to reconcile. Phase 5 spec calls Stripe MCP to *replace* products — any metadata we set now is wasted work. Also: adds a network round-trip dependency for static pricing render. |

### Selected: Pattern (B-modified) — central constant, conditional renders

Add ONE export to `src/config/pricing.ts`:

```typescript
// Phase 1 (CRIT-03): public placeholder until Phase 5 (PRICE-*) ships final tier numbers.
// Stripe prices intentionally remain unchanged ($199/mo, $2189/yr).
// Search the codebase for `MAX_PUBLIC_PRICE_DISPLAY` to find every render site
// that needs to be reverted/updated when Phase 5 lands.
export const MAX_PUBLIC_PRICE_DISPLAY = 'Custom' as const
```

Then conditionally render at each of the 3 stale sites:
- `pricing-comparison-table.tsx` sticky header — replace `$199/mo` with `MAX_PUBLIC_PRICE_DISPLAY`.
- `features-section.tsx` Property Management description — drop the explicit "$199" reference (currently absent — this card just says "Max unlimited"; see Homepage Features Grid section below).
- `pricing/page.tsx` `productJsonLd.offers[2]` — replace `'199.00'` with the placeholder treatment (see JSON-LD note below).

**Why one constant, not inline:** Phase 5 cleanup is `grep -r MAX_PUBLIC_PRICE_DISPLAY src/` → delete the constant + 3 call sites. With inline magic strings the cleanup is `grep -r "Custom"` against a polluted result set.

**Why not extend `PricingConfig`:** the field would be optional/nullable for non-Max tiers (3/4 plans), forcing every consumer to handle `undefined`. The conditional `planId === 'max'` check is the existing convention — `kibo-style-pricing.tsx:144` and `pricing-card-standard.tsx:167` already use it.

**Confidence: HIGH** — this is the pattern the codebase already established for the Max card; we're just propagating it to the 3 surfaces that drifted.

### Note on JSON-LD

Schema.org `Offer.price` MUST be a numeric string per Google's structured-data validator (the `Offer` type with non-numeric `price` triggers a SERP rich-results warning). Two options for the JSON-LD surface:

1. **Drop the Max offer entirely** from the `offers` array — the `Product` schema renders fine with 2 offers (Starter + Growth). Removes the contradiction without giving Google an invalid value.
2. **Keep $199 in JSON-LD only** — Google sees the Stripe-truth price. Public visual surfaces show "Custom".

**Recommendation: Option 1 (drop Max from JSON-LD).** Reason: a "Custom" tier in `Offer` is non-standard schema. Listing $199 in JSON-LD while the page visually shows "Custom" is an SEO honesty failure (Google checks JSON-LD claims against visible content; mismatch = `priceMismatch` warning in Search Console). Until Phase 5 settles the real number, omit the Max offer. Update `src/lib/seo/__tests__/product-schema.test.ts:34-38` [VERIFIED] to assert 2 offers, not 3.

**Cite:** `src/app/pricing/page.tsx:36-41` [VERIFIED] — current 3-offer array.

## Comparison Table Treatment

### Current state — `src/components/pricing/pricing-comparison-table.tsx`

The price labels live ONLY in the sticky header row (`lines 191-207` [VERIFIED]):

```tsx
<div className="grid grid-cols-4 items-center py-4 px-6 bg-muted/50 border-b border-border/50 sticky top-0 z-10">
    <div className="text-sm font-medium text-muted-foreground">Features</div>
    <div className="text-center">
        <div className="text-sm font-semibold text-foreground">Starter</div>
        <div className="text-xs text-muted-foreground">$29/mo</div>
    </div>
    <div className="text-center bg-primary/5 -my-4 py-4 border-x border-primary/10">
        <div className="text-sm font-semibold text-primary">Growth</div>
        <div className="text-xs text-primary/70">$79/mo</div>
    </div>
    <div className="text-center">
        <div className="text-sm font-semibold text-foreground">Max</div>
        <div className="text-xs text-muted-foreground">$199/mo</div>  {/* line 205 */}
    </div>
</div>
```

Per-feature rows (`lines 36-86` [VERIFIED]) render limit values like `'Unlimited'` for Max — not prices. The `$199/mo` exists only at line 205.

### Recommended change

Replace line 205:

```tsx
// BEFORE
<div className="text-xs text-muted-foreground">$199/mo</div>

// AFTER
<div className="text-xs text-muted-foreground">{MAX_PUBLIC_PRICE_DISPLAY}</div>
```

### Visual hierarchy decision

The header cell is structurally a `text-sm font-semibold` plan name + `text-xs text-muted-foreground` price line. The per-cell architecture renders ONE label per tier (no inline CTA — see `lines 154-162` [VERIFIED] where each row has 4 grid columns × FeatureCell, no button slot).

**Recommendation: "Custom" alone, no inline CTA in the comparison-table header.**

Reasons:
1. The comparison-table component does not have a CTA-cell architecture — adding one breaks the 4-column grid (`grid-cols-4` at line 191) and forces a layout rewrite, which is out of Phase 1 scope.
2. The Max **pricing card** above the table at `pricing-card-standard.tsx:240-250` [VERIFIED] already renders the "Contact Sales" CTA — the table is a supplemental detail view, not a primary CTA surface.
3. Precedent: Starter and Growth header cells also have NO inline CTA — only the price label. Keeping Max symmetrical preserves the header's role as an at-a-glance comparison anchor.

### Optional enhancement (mark as scope-creep, defer to Phase 7 polish)

If we want a CTA in the header, the right place is BELOW the sticky header bar (a footer row inside the comparison container) — not inline per cell. Out of Phase 1 scope; flag for Phase 7 (CONS-09 / CONS-05 pricing-page polish).

**Confidence: HIGH** — single-line change to `pricing-comparison-table.tsx:205`.

## Homepage Features Grid Treatment

### Current state — `src/components/sections/features-section.tsx`

The audit (item #3) says "the home-page features grid says 'Max unlimited' with no price". The actual current text is at `lines 23-25` [VERIFIED]:

```tsx
{
    title: 'Property Management',
    description:
        'Track leases, renewals, and maintenance in one place — Starter handles up to 5 properties, Growth up to 20, Max unlimited.',
    icon: <Terminal />
},
```

This is a *feature-card description string*, not a price. There is no price in this surface. The audit's framing is technically wrong: there is no `Max — $199` claim in `features-section.tsx` to contradict the new "Custom" label.

### Recommendation

**Leave the homepage features-section description unchanged.** "Max unlimited" describes the *property limit*, not the *price*. It's already consistent with the comparison table's `max: 'Unlimited'` for properties (`pricing-comparison-table.tsx:36` [VERIFIED]).

CRIT-03's "across 4 surfaces" framing is loose. The 4 surfaces that need to AGREE on price are:
1. Pricing card (already says "Custom" — `pricing-card-standard.tsx:167-168`)
2. Comparison-table sticky header (currently says "$199/mo" — needs change)
3. JSON-LD `Product.offers[2].price` (currently says "199.00" — needs change/removal)
4. **NOT the homepage features grid** — that surface only describes feature *limits*, not prices.

### Audit reconciliation

If the audit reviewer expects the homepage features-section to say something Max-related, the right move is to leave it alone and document this finding in the Phase 1 plan as a deliberate scope reduction. The 4-way contradiction is a 3-way contradiction once you read the source.

**Alternative (if review insists):** If reviewer challenges this and demands all 4 surfaces, the safe edit is to change `'Max unlimited'` → `'Max for unlimited portfolios'` (no price implication, no contradiction with Phase 5's eventual restructure). But this is a rewording for taste, not a price-divergence fix.

**Confidence: HIGH** — verified by reading `features-section.tsx:21-58`.

## Annual Toggle Behavior

### Current state — `src/components/pricing/bento-pricing-section.tsx`

The annual toggle lives at `lines 75-111` [VERIFIED] and the savings calculation at `lines 47-49`:

```tsx
const annualSavings = growthPlan
    ? growthPlan.price.monthly * 12 - growthPlan.annualTotal
    : 0
```

Math: Growth $79 × 12 = $948 minus annual $790 = **$158 savings**. (The audit item #16 questions this number; the code shows it's computed only from Growth, not all plans summed.) The badge at `line 108` renders `Save ${Math.round(annualSavings)}` = "Save $158".

The toggle's `billingCycle` state (`line 20` [VERIFIED]) is passed to all three pricing cards via the `billingCycle` prop. The Max card (`PricingCardStandard` with `variant='enterprise'`) receives the prop but at `pricing-card-standard.tsx:166-189` [VERIFIED] the price-rendering block ENTIRELY skips `currentPrice` and `NumberFlow` — it just renders `<div>Custom</div>`. The toggle has no visible effect on the Max card today.

### Recommended behavior

**Hide annual-savings affordances from the Max tier; do NOT disable the toggle globally; do NOT alter the savings figure.**

Specifically:
1. **Toggle stays globally enabled.** It still drives Starter + Growth price rendering. Disabling it for Max would force a single-tier UX change with no benefit.
2. **Max card already ignores the toggle** (`pricing-card-standard.tsx:167-168` short-circuits to "Custom"). No code change needed for Max card behavior.
3. **The "Save $158" badge math is Growth-only.** It's not summing Starter + Growth + Max. Math: $79 × 12 = $948 minus $790 = $158. This is honest already — the badge doesn't claim portfolio-wide savings, it claims Growth-tier savings. Audit item #16's complaint that "$158 doesn't match a single-plan calculation cleanly" is wrong; it matches Growth exactly.
4. **No "annual savings apply to Max" expectation to manage** — because the Max card never displays a price or a /yr line, there's nothing to offer-up annual savings on. The "Custom" label inherently signals "talk to us" without committing to a discount structure.

### What about the badge label honesty?

The current badge says `Save $158` with no qualification. Options:
- **Keep as-is.** The math IS Growth-only; users seeing "$158" at the Growth card position read it correctly.
- **Qualify the badge.** `Save up to $158` — softer, reads as "best case across plans".
- **Per-card savings.** Each card shows its own savings line. Already partially done — `pricing-card-featured.tsx:160-163` [VERIFIED] shows the Growth card's monthly-equivalent strikethrough on yearly (`<div className="text-muted-foreground line-through text-lg mb-1">${monthlyEquivalent}/mo</div>`).

**Recommendation: keep current behavior unchanged in Phase 1.** Audit item #16 (annual-toggle math) is in CONS-10 (Phase 7), not CRIT-03. Don't expand Phase 1 scope.

**Confidence: HIGH** — verified math against `pricing.ts:118-121` (Growth monthly $79, annual $790).

## CTA Label in Phase 1

### Existing state across the codebase

| File | Line | Label |
|------|------|-------|
| `src/components/pricing/pricing-card-standard.tsx` | 243 | `Contact Sales` (Max card) [VERIFIED] |
| `src/components/pricing/kibo-style-pricing.tsx` | 145 | `Contact Sales` (Max plan) [VERIFIED] |
| `src/app/pricing/pricing-content.tsx` | 147 | `Connect with sales` (FAQ section CTA) [VERIFIED] |
| `src/app/pricing/pricing-content.tsx` | 180 | `Schedule a walkthrough` (CtaSection secondary) [VERIFIED] |

Three different labels — exactly what TRUST-03 (Phase 10) targets to canonicalize.

### Recommendation: USE "Contact Sales" in Phase 1 — don't defer

Reasoning:

1. **Phase 1 only TOUCHES the Max card pricing block + comparison-table header + JSON-LD.** It does NOT touch the FAQ-section "Connect with sales" link (`pricing-content.tsx:147`) or the CtaSection "Schedule a walkthrough" link (`pricing-content.tsx:180`). The two non-canonical labels stay in place for Phase 10 to clean up.

2. **The Max card already ships "Contact Sales"** (`pricing-card-standard.tsx:243`) and `kibo-style-pricing.tsx:145`. These are the exact CTA buttons that pair with the "Custom" price label that's the subject of CRIT-03. Phase 1 doesn't *introduce* a new CTA — it relies on the existing one.

3. **No double-write risk.** Phase 10's TRUST-03 will hunt for `Talk to Sales` / `Schedule a walkthrough` / `Connect with sales` and normalize them to `Contact Sales`. The Max card is already at the destination — Phase 10 will skip it.

4. **PROJECT.md Key Decision lock** (`.planning/PROJECT.md` line 148 [VERIFIED]): `Sales-contact CTA canonical label: "Contact Sales"`. Already canonical per user decision. Anything in Phase 1 that needs a sales CTA uses "Contact Sales".

### What Phase 1 should NOT do

- Don't replace `Connect with sales` in `pricing-content.tsx:147`.
- Don't replace `Schedule a walkthrough` in `pricing-content.tsx:180`.
- Don't replace `Talk to Sales` anywhere it appears (audit item #43).

These all belong to Phase 10's TRUST-03/CONS-06 sweep. Touching them in Phase 1 = scope creep + merge-conflict risk with Phase 10.

**Confidence: HIGH** — locked by PROJECT.md decision + verified by codebase grep.

## Design-Token Mapping

Every visual choice for the "Custom" treatment maps to canonical `globals.css` tokens. Token line citations from `src/app/globals.css`:

### Pricing card "Custom" label (already shipped, preserve as-is)

`src/components/pricing/pricing-card-standard.tsx:168` [VERIFIED]:
```tsx
<div className="text-3xl font-bold text-foreground">Custom</div>
```

| Visual property | Class | Token | globals.css line |
|-----------------|-------|-------|------------------|
| Text size (3xl) | `text-3xl` | `--text-3xl: 1.875rem` | line 68 [VERIFIED] |
| Weight | `font-bold` | Tailwind utility | n/a |
| Color | `text-foreground` | `--color-foreground: oklch(0.2 0.02 245)` | line 132 [VERIFIED] |

**No badge** — plain text matches Starter/Growth weight/color hierarchy. Don't introduce a badge for Max alone (asymmetry signal).

### Comparison-table sticky-header "Custom" treatment

`src/components/pricing/pricing-comparison-table.tsx:204-206` [VERIFIED] currently:
```tsx
<div className="text-sm font-semibold text-foreground">Max</div>
<div className="text-xs text-muted-foreground">$199/mo</div>
```

After CRIT-03:
```tsx
<div className="text-sm font-semibold text-foreground">Max</div>
<div className="text-xs text-muted-foreground">{MAX_PUBLIC_PRICE_DISPLAY}</div>
```

| Visual property | Class | Token | globals.css line |
|-----------------|-------|-------|------------------|
| Background (surface) | `bg-muted/50` (parent grid) | `--color-muted: oklch(0.94 0.01 240)` | line 133 [VERIFIED] |
| Plan name color | `text-foreground` | `--color-foreground` | line 132 [VERIFIED] |
| Price-line color | `text-muted-foreground` | `--color-muted-foreground: oklch(0.48 0.015 245)` | line 134 [VERIFIED] |
| Text size (xs) | `text-xs` | `--text-xs: 0.75rem` | line 55 [VERIFIED] |

**Why `text-muted-foreground` for "Custom"** (vs. `text-foreground`): preserves the existing visual weight of the price line (Starter shows `$29/mo` in `text-muted-foreground` — line 197). Symmetry across all three plan headers. A bolder `text-foreground` on Max alone would signal "this is the priced answer" — exactly what we're trying to avoid until Phase 5.

**Why no badge wrapper:** the existing pattern uses inline text. Wrapping "Custom" in a `<Badge>` introduces visual asymmetry vs. Starter/Growth. The point of Phase 1 is "stop the bleed without committing visual real estate to the placeholder."

### Background of "Custom" cell

The Max column header cell at `pricing-comparison-table.tsx:203-206` has NO column-specific background. The Growth column has `bg-primary/5` highlighting (`line 199`). Starter and Max both inherit the parent `bg-muted/50` row background.

**Recommendation: keep Max column unhighlighted.** Don't add an accent treatment to "Custom" — that would visually upgrade the placeholder and signal "this is special / premium," which contradicts the user's intent (placeholder until restructure). Symmetry with the Starter column is correct.

| Decision point | Choice | Token | Reason |
|----------------|--------|-------|--------|
| Background of "Custom" cell | inherit `bg-muted/50` from row (no override) | `--color-muted` line 133 | Symmetry with Starter (other unfeatured tier) |
| Text color "Custom" | `text-muted-foreground` | line 134 | Match existing `$29/mo`, `$199/mo` price-line treatment |
| Badge for "Custom"? | **NO badge** | n/a | Inline text matches Starter/Growth pattern |
| If badge required (DEFERRED) | use `--color-muted-foreground` | line 134 | Understated. NEVER `--color-accent` (line 147 — premium signal) or `--color-primary` (line 143 — Growth-card claimed) |

### Pricing card "Custom" container

Already shipped with no changes needed:
- Card surface: `bg-card` (`--color-card: oklch(0.99 0.003 240)` — line 137 [VERIFIED])
- Card border: `border-border/50` (`--color-border: oklch(0.88 0.01 245)` — line 139 [VERIFIED])
- Card border-radius: `rounded-2xl` (`--radius-2xl: 24px` — line 220 [VERIFIED])
- CTA button: `variant='outline'` with `MessageSquare` lucide icon at `pricing-card-standard.tsx:241-244`. Hover state uses `hover:bg-primary/5 hover:border-primary/50` (`--color-primary` line 143).

**Confidence: HIGH** — every token referenced is verified at the cited globals.css line.

## Risk Matrix (UI domain only)

| # | Risk | Likelihood | Severity | Mitigation |
|---|------|-----------|----------|------------|
| R1 | Editing `pricing-card-standard.tsx` to use the new constant accidentally breaks the existing `Custom` rendering for the Max card | LOW | HIGH | The card already renders "Custom" inline. Using `MAX_PUBLIC_PRICE_DISPLAY` is a refactor, not a behavior change. Add a snapshot test or DOM assertion that `card.textContent` includes "Custom" for Max. |
| R2 | JSON-LD removes Max offer → Search Console rich-results loss for "Max" tier | LOW | MEDIUM | The Max tier listing at $199 in JSON-LD when the page shows "Custom" is *already* a Search Console violation (visible-vs-structured mismatch). Removing it FIXES this — net positive. Document in plan. |
| R3 | Comparison-table sticky-header price line falls out of vertical alignment with Starter/Growth columns when "Custom" replaces "$199/mo" | VERY LOW | LOW | "Custom" (6 chars) and "$199/mo" (7 chars) render at the same `text-xs` size in the same grid cell. CSS layout doesn't flex on character count. Visual diff via screenshot in PR. |
| R4 | A reviewer sees `Custom` in PR diff and asks "did you change Stripe?" | MEDIUM | LOW | Plan must explicitly state: "Stripe products and prices remain unchanged. Phase 5 (PRICE-*) restructures Stripe. Phase 1 is public-display-only." Cite `src/config/pricing.ts:152-159` as evidence Stripe data is untouched. |
| R5 | A future agent sees `MAX_PUBLIC_PRICE_DISPLAY` constant and assumes it's permanent → never deletes in Phase 5 | LOW | LOW | JSDoc comment on the constant: `Phase 5 (PRICE-*) deletes this. Search the codebase for this symbol.` Plan-checker can verify the constant has a deletion note. |
| R6 | The owner-billing dashboard at `src/app/(owner)/billing/plans/page.tsx` consumes `getAllPricingPlans()` directly and shows $199 to authenticated owners — does CRIT-03 cover authenticated dashboard surfaces? | MEDIUM | LOW | **NO — leave the authenticated billing UI alone.** Phase 1 scope is "public marketing surfaces" per audit framing. The authenticated `/billing/plans` page shows the *Stripe-truth* price because authenticated users need to know what they're being billed. Same divergence pattern: public = "Custom", authenticated = $199. Document this boundary in the plan. |
| R7 | `pricing-comparison-table.tsx` is `'use client'` but imports `MAX_PUBLIC_PRICE_DISPLAY` from `#config/pricing` (also client-safe) — bundle bloat? | VERY LOW | NEGLIGIBLE | Constant is a single string. No bundle impact. `pricing.ts` is already imported by `bento-pricing-section.tsx`. |
| R8 | Test at `src/lib/seo/__tests__/product-schema.test.ts` asserts 3 offers — removing Max from JSON-LD breaks the test | HIGH | LOW | The test asserts the schema function works with whatever input it receives, not that Max specifically is included. The breaking assertion is on `pricing/page.tsx`'s call site (`baseInput` passes 3 offers). Update `pricing/page.tsx:36-41` to pass 2 offers; the schema function tests remain valid. Add a new test for the "Max omitted during placeholder window" pattern. |
| R9 | Removing Max from JSON-LD reduces SEO surface area for "$199 property management" queries | LOW | LOW | These queries currently match WRONG content (we're disowning the $199 number). Reduction is intentional. |

## Confidence Levels

| Recommendation | Confidence | Source |
|---------------|------------|--------|
| Pattern (B-modified): single constant + conditional renders | HIGH | Existing `pricing-card-standard.tsx:167-168` precedent |
| Comparison-table change is single line at line 205 | HIGH | Direct read of `pricing-comparison-table.tsx` |
| Homepage features-section needs no change | HIGH | Direct read of `features-section.tsx:21-58` — no $199 string present |
| Drop Max from JSON-LD `offers` array | MEDIUM | Schema.org Offer.price requires numeric; "Custom" is invalid. SEO mismatch warning is the real risk. Could also leave $199 in JSON-LD as a "machine-readable Stripe-truth" — but that propagates the contradiction. Drop is cleaner. |
| Annual toggle: keep existing behavior unchanged | HIGH | Math verified against `pricing.ts:118-121`; Max card already ignores `billingCycle` per `pricing-card-standard.tsx:167-189` |
| Use "Contact Sales" CTA label (already shipped at Max card) | HIGH | PROJECT.md line 148 + verified `pricing-card-standard.tsx:243` |
| Don't touch `pricing-content.tsx` "Connect with sales" / "Schedule a walkthrough" | HIGH | Out of CRIT-03 scope; Phase 10 TRUST-03 owns these |
| `bg-muted/50` (inherited) + `text-muted-foreground` for "Custom" cell | HIGH | All tokens verified at cited globals.css lines |
| No badge for "Custom" | HIGH | Symmetry with Starter/Growth header cells |
| Authenticated `/billing/plans` page stays at $199 | MEDIUM | Audit framing is "public marketing surfaces"; authenticated billing UI is operationally different. Recommend confirmation in discuss-phase. |

## Sources

### Primary (HIGH confidence — VERIFIED via direct file read)

- `src/components/pricing/pricing-card-standard.tsx` — Max card "Custom" precedent at lines 167-168, 243; `isEnterprise` boundary at 56, 63-66
- `src/components/pricing/pricing-card-featured.tsx` — Growth card with `NumberFlow` price + annual treatment at 160-184
- `src/components/pricing/pricing-comparison-table.tsx` — sticky header at 191-207; `$199/mo` literal at 205
- `src/components/pricing/bento-pricing-section.tsx` — annual savings calculation at 47-49; toggle at 75-111
- `src/components/pricing/kibo-style-pricing.tsx` — second instance of `planId === 'max'` divergence at 143-146
- `src/components/sections/features-section.tsx` — "Max unlimited" feature description at 23-25 (not a price)
- `src/components/sections/comparison-table.tsx` — homepage "Why Landlords Choose" table (no Max-tier prices)
- `src/config/pricing.ts` — `PRICING_PLANS.TENANTFLOW_MAX` price + Stripe IDs at 147-180; `PricingConfig` interface at 17-40
- `src/app/pricing/page.tsx` — JSON-LD `productJsonLd.offers` at 32-41; Stripe-truth $199 in metadata.description at 23
- `src/app/pricing/pricing-content.tsx` — non-canonical CTAs "Connect with sales" (147), "Schedule a walkthrough" (180)
- `src/app/marketing-home.tsx` — homepage section composition (no Max price surface)
- `src/app/(owner)/billing/plans/page.tsx` — authenticated billing UI at 18, 43 (consumes `getAllPricingPlans()` directly = sees $199)
- `src/lib/seo/product-schema.ts` — `createProductJsonLd` at 29-88
- `src/lib/seo/__tests__/product-schema.test.ts` — current test of 3-offer input at 34-38, 91-107
- `src/app/globals.css` — token definitions: `--color-muted` (133), `--color-muted-foreground` (134), `--color-foreground` (132), `--color-card` (137), `--color-border` (139), `--color-primary` (143), `--color-accent` (147), `--text-xs` (55), `--text-3xl` (68), `--radius-2xl` (220)
- `.planning/PROJECT.md` — Key Decision line 148 (canonical "Contact Sales" label) + line 152 (Phase 1 placeholder strategy)
- `.planning/REQUIREMENTS.md` — CRIT-03 at line 31; CONS-06 at 65; TRUST-03 at 96
- `audit-ui-2026-05-08.md` — items #3 (line 17), #11 (line 36), #12 (line 38), #16 (line 46), #43 (line 104)

### Secondary (MEDIUM — design intent / SEO)

- Schema.org `Offer.price` constraint — numeric string required for valid rich-results display [CITED: schema.org/Offer]. Used to justify dropping Max from JSON-LD rather than rendering "Custom" as price.

### Tertiary

- None. All findings are codebase-verified.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Authenticated billing dashboard `/billing/plans` is OUT of CRIT-03 scope (public surfaces only) | Risk Matrix R6 | Owner sees mismatch between marketing "Custom" and dashboard "$199" — but this matches Stripe truth, so users actively considering subscription get accurate billing info. Confirm in discuss-phase if reviewer flags. |
| A2 | Removing Max from JSON-LD `offers` array doesn't break Search Console — Google accepts 1+ offers per Product schema | Public-vs-Stripe Divergence | Worst case: Search Console drops the rich-results card. Verify by inspecting current console state before merge. Recoverable in <24h by re-adding the offer. |

**Confirmation needed in Phase 1 plan/discuss:**
- A1 (authenticated billing UI scope) — recommend explicit "Phase 1 leaves authenticated UI unchanged" line in CONTEXT.md.
- A2 (JSON-LD Max removal) — recommend Search Console pre/post inspection step in plan-checker verification.

## Metadata

**Confidence breakdown:**
- Public-vs-Stripe pattern selection: HIGH — codebase precedent at `pricing-card-standard.tsx:167`
- Comparison-table edit: HIGH — single line at 205, no layout impact
- Homepage features grid: HIGH — verified no $199 string exists; audit framing is loose
- Annual toggle: HIGH — math verified, Max card already ignores toggle
- CTA label: HIGH — PROJECT.md locked + existing Max card already canonical
- Design tokens: HIGH — every token line cited from globals.css
- JSON-LD removal: MEDIUM — schema.org constraints clear; Search Console outcome assumed

**Research date:** 2026-05-08
**Valid until:** 2026-06-07 (30 days — Phase 1 ships within this window or research re-verified)
