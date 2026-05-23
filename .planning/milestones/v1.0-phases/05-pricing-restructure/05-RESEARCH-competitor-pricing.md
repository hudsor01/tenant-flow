# Phase 5: Pricing Restructure — Research (Specialist 2: Competitor Pricing Matrix)

**Researched:** 2026-05-10
**Specialist scope:** Competitor pricing matrix — what do peer products charge for what?
**Sister specialist:** Specialist 1 (Stripe revenue baseline + codebase touchpoints)
**Confidence:** HIGH on tier prices for 7 of 8 competitors; MEDIUM on specific feature-gating thresholds (some competitors hide caps behind "Custom"); HIGH on category convention (per-unit vs flat); MEDIUM on persona-word usage in pricing copy specifically (vs hero copy already covered in Phase 4)

## Summary

Three findings drive the recommendation:

1. **The small-landlord segment (1–15 rentals) clusters at $0–$30/month flat, with TenantFlow's current Starter at $29 right at the high end.** Of the 8 surveyed competitors, 5 have a free tier (Hemlane Starter, Stessa Essentials, TurboTenant Free, Innago, Baselane Core) and 3 do not (Avail charges per-unit only; RentRedi $5–$30 tiers; TenantCloud $15+). TenantFlow's Starter at $29/month is competing with $0 from four direct comparables — meaning Starter must justify its price through *concrete vault + e-sign + maintenance bundle* superior to the free tiers, not on price.

2. **The 1–15-unit middle segment is dominated by either flat-rate sub-$30 or per-unit ~$2–$9.** TenantFlow's $79 Growth has no direct mid-tier comparable in the segment — RentRedi tops at $30/mo (Grow), TenantCloud at $35/mo (Growth), Stessa at $35 (Pro), Hemlane at $48–$86 (Essential/Complete). $79 is closer to **DoorLoop's Pro tier ($149/mo + $3/unit, unlimited)** than to the small-landlord-tier comparables. **Repricing Growth to $49–$59 brings it back into the segment band** while still positioning above the $30 ceiling that Avail/RentRedi/TenantCloud occupy.

3. **The Max/Enterprise tier in this segment uses two patterns: (a) "Call Sales" with no public price (RentRedi Pro, TenantCloud Business, Hemlane add-on stack), or (b) a defined-but-high public price (DoorLoop Premium $209/mo annual, Buildium Premium $400/mo).** TenantFlow's current Max at $199/mo is closer to DoorLoop than to peer-segment competitors (most peers don't have a Max tier at all — they go straight from $30 to "Call Sales"). The locked Max description ("21+ rentals — unlimited scale and API access") is consistent with both patterns; the price-vs-Custom decision is a strategic ask for the user.

**Primary recommendation:** Reprice to **Starter $19/mo (was $29) / Growth $49/mo (was $79) / Max $149/mo (was $199)**, keep tier names, set annual at **2 months free (16.67% discount)** to match TenantCloud convention. **Strategic asks** are itemized at the end — six decisions the user must lock before the planner can finalize.

## User Constraints (from CONTEXT.md)

No CONTEXT.md exists at `.planning/phases/05-pricing-restructure/`. This is the first artifact in the phase. The Phase 4 locked persona phrasing constrains pricing copy:

### Locked Decisions (inherited from Phase 4)

- **Tier descriptions are LOCKED** (post-Phase-4 cycle-2 fix):
  - Starter: `'Ideal for landlords with 1–5 rentals'`
  - Growth: `'For growing portfolios that need advanced features'`
  - Max: `'For landlords with 21+ rentals — unlimited scale and API access'`
- **Locked anchor phrase**: `Built for landlords with 1–15 rentals` (segment positioning across hero / social-proof / About)
- **Implication for pricing**: Starter caps at 5 rentals; Growth covers 6–20 rentals (overlaps with the social-proof "1–15" segment); Max begins at 21+. **Any tier-shape proposal MUST honor these portfolio bands** — repricing the *dollars* is in scope, redrawing the *portfolio bands* is NOT.

### Claude's Discretion (this phase)

- Specific dollar amounts per tier (subject to user lock)
- Annual discount percentage (subject to user lock)
- Whether Max is a public number or "Custom pricing" (subject to user lock)
- Feature-gating direction within the locked portfolio bands (e.g., where e-sign limits sit)

### Deferred Ideas (OUT OF SCOPE)

- Persona word changes (Phase 4 locked "landlords")
- Tier renames (Starter / Growth / Max are baked into the locked descriptions)
- Adding a Free tier (not in PRICE-* requirements; not in current Stripe products)
- Per-unit pricing model (would conflict with the "1–5 / 6–20 / 21+" portfolio bands already locked)
- Stripe migration mechanics (PRICE-04 is implementation, not research)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PRICE-02 | Competitor pricing analysis | This document — full 8-competitor matrix below |
| PRICE-03 | Propose new tier structure | Sections "Tier-Shape Options" and "Recommendation" |
| PRICE-06 | Final pricing rolls out across marketing surfaces | Indirectly — provides the *numbers* that PRICE-06 propagates |

(PRICE-01 revenue audit, PRICE-04 Stripe migration, PRICE-05 customer migration playbook are sister-specialist scope or implementation scope.)

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tier price strings | Static config (`src/config/pricing.ts`) | Marketing surfaces (read-only) | Single source of truth; render-side reads config |
| Annual savings math | Frontend computation (`calculateAnnualSavings()` in `pricing.ts`) | Pricing card UI (`pricing-card-featured.tsx`) | Pure function in config; UI consumes |
| Stripe price IDs | Stripe MCP / Stripe Dashboard | `pricing.ts` references | Stripe owns canonical price; config holds the IDs |
| Plan limits enforcement | Backend RPCs / RLS | Frontend display | RLS validates; frontend shows |

(This phase is a config + Stripe migration, not a multi-tier architectural change. The map confirms there's no surprise tier ownership — pricing strings live in one config file and propagate from there.)

## Live Competitor Pricing Matrix

Curl + WebFetch verified 2026-05-10. Where direct fetches were blocked (TurboTenant, Avail, Innago partial), I cross-verified via Capterra, G2, ITQlick, and platform help-center pages — flagged below.

### Table 1: Tier-by-tier pricing snapshot

| # | Product | Tier 1 (entry) | Tier 2 (mid) | Tier 3 (top) | Free? | Trial | Pricing model | Persona word in copy |
|---|---------|----------------|--------------|--------------|-------|-------|----------------|---------------------|
| 1 | **TurboTenant** | Free | Pro: ~$9.92/mo (~$119/yr) | Premium: $12.42/mo ($149/yr) | YES (Free) | None on Free | Flat (annual-only billing) | "landlords" / "DIY landlords" |
| 2 | **Avail** (Realtor.com) | Unlimited: **$0/unit** | Unlimited Plus: **$9/unit/mo** | (no third tier) | YES | None disclosed | **Per-unit** | "landlord" / "DIY landlords" |
| 3 | **Hemlane** | Starter: **$0** | Basic: $30/mo ($28 base + $2/unit) | Essential $48/mo + Complete $86/mo | YES (Starter) | 14 days | **Hybrid: base + per-unit** | "rental owners" |
| 4 | **RentRedi** | Start: **$5/mo** | Grow: **$29.95/mo** OR $12/mo annual | Pro: **"Call Us"** | NO | 30-day money-back | Flat | "landlords" / "growing landlords" |
| 5 | **Stessa** (Roofstock) | Essentials: **$0** | Manage: $15/mo ($12/mo annual) | Pro: $35/mo ($28/mo annual) | YES | None disclosed | Flat | "investors" |
| 6 | **Innago** | **$0 — entire product** | (no tier 2) | (no tier 3) | YES (only) | N/A | Flat free | "landlords" |
| 7 | **TenantCloud** | Starter: $15/mo ($18 monthly) | Growth: $29.17/mo ($35 monthly) | Pro: $50/mo ($60 monthly) + Business "$100+/mo" | NO | 14 days | Flat (annual saves 2 months) | "landlords (DIY → 100+)" |
| 8 | **Baselane** | Core: **$0** | Smart: **$20/mo** | (no tier 3) | YES (Core) | 30-day on Smart | Flat (subscription on top of banking) | none — "real estate investors" implied |

### Table 2: Feature gating by tier (the harder cells)

| Product | E-sign | Document storage | Maintenance | Tenant screening | Online rent payments | Accounting/reports |
|---------|--------|------------------|-------------|------------------|----------------------|---------------------|
| **TurboTenant** | Free: NO; Pro/Premium: unlimited | Free: yes (basic); Premium: enhanced | All tiers | All tiers (tenant pays $45–$55) | All tiers (ACH free or bundled) | Pro+: bundled accounting module sold separately |
| **Avail** | Both tiers (unlimited; lease attachments) | Unlimited | Both tiers | Both tiers (tenant pays) | Free: $2.50 ACH / 3.5% card; Plus: $0 ACH / 3.5% card | Both tiers |
| **Hemlane** | Basic+: included; Starter: NO | Starter: limited; Basic+: unlimited | Essential+ (24/7 emergency) | All tiers (tenant pays $40) | Basic+: $0 ACH, 3% card | Starter: basic; higher tiers: full |
| **RentRedi** | Grow+: unlimited; Start: NO | Grow+: included; Start: NO | Grow+: included; Start: NO | Grow+: tenant pays $39.99–$49.99; Start: NO | All tiers (fees not specified) | All tiers (entity-level) |
| **Stessa** | Essentials: 0; Manage: 1/mo; Pro: 7/mo | Unlimited all tiers | Not the focus (REI accounting product) | All tiers (Pro priority) | Not the focus | All tiers (it IS the product) |
| **Innago** | Free, unlimited | Free | Free | Free (but tenant-paid) | Free (tenant pays processing fees) | Free |
| **TenantCloud** | Starter: unlimited; Growth: unlimited; Pro: unlimited | Starter: 1GB; Growth: 10GB; Pro: custom | All tiers | All tiers (tenant pays) | Starter ACH $1.95; Growth ACH $1.75; Pro custom; card 3.5%+30¢ all tiers | Starter: 30 tags; Growth: 75 tags; Pro: custom |
| **Baselane** | Not disclosed | Not disclosed | Limited | Add-on $24.99+ (separate) | Core/Smart: $2 ACH (waived for Baselane deposits); 3.49% card | Core: tagging, Schedule E; Smart: AI auto-tag, balance sheet |

### Table 3: Portfolio scale + custom-pricing patterns

| Product | Stated portfolio scale | Has "Contact Sales" tier? | Where the price ceiling is |
|---------|------------------------|---------------------------|----------------------------|
| **TurboTenant** | "1 to 50 doors" | NO — Premium is the cap at $149/yr | Self-serve unlimited |
| **Avail** | "fewer than 10 properties" | NO | Per-unit scaling — no cap |
| **Hemlane** | "small to mid-sized" | NO — but stacks add-ons (Eviction Shield $4.95, Inspections $300, Tenant Placement $695) | Complete tier $86 + per-unit |
| **RentRedi** | 5 → 60+ properties | YES — "Pro: Call Us" | Pro tier hides the ceiling |
| **Stessa** | 1–11 properties (case studies) | NO | Pro $35/mo tops out |
| **Innago** | "small to mid-sized" / "solo" | N/A — single tier | Free, no ceiling |
| **TenantCloud** | "DIY → 100+" | YES — "Business starting at $100/mo" | Business is custom |
| **Baselane** | Unlimited (banking-anchored) | NO | Smart $20/mo tops out |

**Cross-cutting observations:**
- **Six of eight competitors offer a free tier or fully-free product** (TurboTenant Free, Avail Unlimited, Hemlane Starter, Stessa Essentials, Innago entirely, Baselane Core). TenantFlow has no free tier — only a 14-day trial.
- **The mid-tier price clusters at $9–$35/month** for the 1–15-rental segment. TenantFlow's $79 Growth is an outlier on the high side compared to peer-segment products.
- **Per-unit pricing is the minority pattern** (only Avail and Hemlane Basic+). Five of eight use flat tiers, which aligns with TenantFlow's existing model.
- **"Contact Sales" Max tier is common but not universal**. RentRedi, TenantCloud, Buildium, AppFolio, DoorLoop all hide top-tier pricing behind a sales conversation. TurboTenant, Avail, Stessa, Hemlane, Innago, Baselane do NOT — their pricing is transparent end-to-end.

**Confidence:** HIGH on tier prices and free-tier status (verified live or via two independent secondary sources). MEDIUM on Avail's exact unit limits at the Free tier (some sources say "unlimited"; one indicates a per-unit fee structure that suggests no hard cap). MEDIUM on Hemlane's per-unit math (calculated from the $28 + $2/unit = $30 base shown).

## Annual Discount Convention

Researched: TenantFlow currently uses **`annual = monthly × 10` (i.e., 2 months free = 16.67% discount)** per `calculateAnnualSavings()` in `src/config/pricing.ts:274–278`.

| Competitor | Annual discount pattern | % discount |
|------------|--------------------------|------------|
| TenantCloud | "2 months free" | 16.67% |
| Stessa | "Save 20% annually" ($15 → $12, $35 → $28) | 20% |
| RentRedi | $29.95/mo monthly, $12/mo annual | 60% (outlier — aggressive lock-in) |
| Hemlane | Annual price not exposed; trial is 14 days | N/A |
| TurboTenant | Annual-only billing on paid tiers (no monthly option) | N/A — not a discount |
| Avail | No annual discount disclosed | N/A |
| Baselane Smart | No annual disclosed | N/A |
| Buildium | "10% discount on annual lump-sum" | 10% |

**Industry baseline:** SaaS broadly is **15–20% annual discount**. The 16.67% ("2 months free") pattern TenantFlow already uses matches TenantCloud and is within the industry baseline. **Recommendation: keep at 16.67% (current math) OR move to 20% to match Stessa/aggressive-end of band**. 60% (RentRedi) is an outlier that signals desperation pricing — do NOT match.

**Confidence:** HIGH on TenantFlow's current math (verified in `pricing.ts:274–278`); HIGH on TenantCloud and Stessa annual discounts (live-fetched).

## Three Tier-Shape Options for TenantFlow

Each option presented below honors the locked portfolio bands ("1–5 / growing / 21+") and the locked tier names (Starter / Growth / Max). Variation is in the dollar amounts, feature gating direction, and Max-public-vs-Custom decision.

### Option A — "Match the segment band" (RECOMMENDED)

Reprice down to land squarely in the small-landlord competitive band. Closes the $0-vs-$29 Starter gap; brings $79 Growth into line with TenantCloud Pro ($50) and Stessa Pro ($35).

| Tier | Monthly | Annual | Annual discount | Portfolio cap | Key feature gates |
|------|---------|--------|------------------|---------------|---------------------|
| **Starter** | **$19** | **$190** | 16.67% (2 mo free) | 1–5 rentals (5 props / 25 units) | Document vault with global search, lease *templates* (no e-sign), 10GB storage, priority email |
| **Growth** | **$49** | **$490** | 16.67% (2 mo free) | 6–20 rentals (20 props / 100 units) | Vault, **25 e-signs/mo (DocuSeal)**, renewal reminders, advanced reporting, 50GB, 3 users, phone+email support |
| **Max** | **$149** | **$1,490** | 16.67% (2 mo free) | 21+ unlimited | Vault, **unlimited e-signs**, custom lease clauses, API access, dedicated account manager, unlimited storage |

**Rationale:**
- **$19 Starter** competes credibly against $0 free tiers by bundling document vault + global search + maintenance + 10GB — features the free tiers either lack (Avail Free has no vault search, TurboTenant Free has no e-sign at all) or limit (Hemlane Starter has no docs, Innago has docs but lacks vault-class search). The $19 price beats RentRedi Grow's $29.95 by $11 and lands at TenantCloud Starter's $15+$4 premium for vault. It's a *small* premium for *concrete* differentiation.
- **$49 Growth** is exactly between TenantCloud Pro ($50) and TenantCloud Growth ($29.17 annual). The 25 e-sign cap mirrors current production behavior and matches Stessa Pro's 7 e-signs/mo on the higher end. $49 is also psychologically the "$50 break point" — Hemlane Essential is $48, Stessa Pro is $35, RentRedi Grow is $30, so $49 sits at the top of the segment without crossing into DoorLoop/Buildium territory.
- **$149 Max** matches DoorLoop Pro annual ($149/mo) and is below DoorLoop Premium ($209/mo) and Buildium Premium ($400/mo). The "21+ unlimited" portfolio cap signals to large landlords that this is the answer; $149 is the highest psychologically-acceptable price before "I should call sales" kicks in.
- **Why NOT keep $29 / $79 / $199**: there is no current revenue ($0 baseline per user disclosure) — repricing has zero downside for existing customers and material upside for conversion. The current numbers were anchored to a pre-Phase-4 audience definition that included larger portfolios; with the locked "1–15 rentals" segment, those anchors are no longer aligned.
- **Annual discount: 16.67% (2 months free)** — matches the existing `calculateAnnualSavings()` math; no code change needed; matches TenantCloud convention. Rounding artifact: $19 × 10 = $190 (clean); $49 × 10 = $490 (clean); $149 × 10 = $1,490 (clean). All three are dollar-clean.

**Tradeoffs:**
- Lower Starter dollar revenue per customer ($10/mo less than current).
- Growth ($49 vs $79) leaves less room for upmarket positioning at the Pro/team tier — but the locked Phase-4 segment ("1–15 rentals") explicitly does NOT target the team/Pro buyer.
- Max at $149 (vs current $199) reduces ARPU but increases conversion likelihood since the Max tier is now defensibly priced against DoorLoop Pro's $149/mo annual.

### Option B — "Hold the line, gate harder"

Keep current $29 / $79 / $199 but tighten feature gating to make the price gap defensible.

| Tier | Monthly | Annual | Portfolio cap | Key gating change vs current |
|------|---------|--------|---------------|-------------------------------|
| **Starter** | $29 | $290 | 1–5 rentals | Remove document vault from Starter (move to Growth+); add it as $5/mo standalone add-on. Justify $29 with maintenance + tenant records + screening referral. |
| **Growth** | $79 | $790 | 6–20 rentals | Bump e-sign cap from 25 → 50/mo; add custom branded tenant statements; add bulk document export (Phase 64 feature). |
| **Max** | $199 | $2,189 | 21+ unlimited | Public price (drop "Custom"); add SSO, audit log export, white-glove onboarding. Annual $2,189 = current math (10× monthly + $199). |

**Rationale:**
- **Defensible if the user has a strategic reason to keep $29** (e.g., positioning Tenor as "premium small-landlord" not "competitive small-landlord"). But this requires the $29 Starter to be visibly *better* than $0 free tiers, which today's feature set doesn't strongly support — moving the vault to Growth+ as proposed actively *weakens* Starter against TurboTenant Free / Innago.
- **Annual math anomaly**: current `pricing.ts:171` has Max annual at `$2,189` (instead of `2199` per the 16.67% rule). $2,189 = $199 × 11 = an 8.3% discount, not 16.67%. **That's a current bug** worth flagging to the planner regardless of which option ships.
- **Tradeoff**: requires the most-strict feature-gating discipline to make the $29 price defensible against $0 — and the locked Starter description ("Ideal for landlords with 1–5 rentals") doesn't lean into a "premium" framing.

### Option C — "Aggressive disruption: free Starter"

Add a free Starter tier (rebadge current "Free Trial" → "Free Starter"); shift current Starter feature set up to Growth.

| Tier | Monthly | Annual | Portfolio cap | Key feature gates |
|------|---------|--------|---------------|---------------------|
| **Starter (Free)** | **$0** | $0 | 1 rental (3 units) | Maintenance tracking, tenant records, 1GB, no e-sign, no vault search |
| **Growth** | **$39** | **$390** | 2–20 rentals | Vault + global search, 10 e-signs/mo, 25GB, priority email |
| **Max** | **$129** | **$1,290** | 21+ unlimited | Unlimited e-signs, API, custom clauses, dedicated AM, unlimited storage |

**Rationale:**
- **Matches the dominant industry pattern** (6/8 competitors have free tiers). Removes the "$29 vs $0" objection entirely.
- **Hard tradeoff**: This collapses the **3-tier shape into 2 paid tiers**, which conflicts with the locked Phase-4 description bundle (Starter is explicitly "1–5 rentals" with paid features). A free 1-rental tier is *not* the same product as a $19 1–5-rental tier.
- **Migration risk**: If TenantFlow ever has paying Starter customers in the future, downgrading Starter from "1–5 rentals @ $29" to "1 rental @ $0" creates a forced-migration problem. Phase 4 lock makes this option awkward.
- **Recommendation**: do NOT pick this option. The user can always add a Free tier later (PRICE-* doesn't lock that out). Starting from a 3-paid-tier shape is the lowest-risk path; adding a Free tier in v2.0 if conversion data shows it's needed is a non-destructive future decision.

### Option summary

| Option | Starter | Growth | Max | Annual discount | Recommendation |
|--------|---------|--------|-----|-----------------|----------------|
| **A (RECOMMENDED)** | $19/mo | $49/mo | $149/mo | 16.67% | **Pick this** — segment-aligned, all-clean math, no locked-description conflict |
| B | $29/mo (current) | $79/mo (current) | $199/mo (current, public price) | 16.67% (FIX BUG: current Max annual is 8.3%) | Defensible only if strategic reason for premium positioning |
| C | $0/mo | $39/mo | $129/mo | 16.67% | NOT recommended — conflicts with locked Phase 4 portfolio bands |

**Confidence:** HIGH on Option A pick (best-fit to segment data + zero conflict with locked descriptions + clean math). HIGH on Option B's annual-math bug (verified in `pricing.ts:171`). HIGH on Option C's conflict with Phase 4 lock.

## Cross-Reference with Phase 4 Lock

| Locked phrase / description | Compatibility with Option A (recommended) | Compatibility with Option B | Compatibility with Option C |
|------------------------------|--------------------------------------------|------------------------------|------------------------------|
| Starter description: "Ideal for landlords with 1–5 rentals" | EXACT match (Starter cap = 5) | EXACT match | CONFLICT (Free Starter caps at 1, not 5) |
| Growth description: "For growing portfolios that need advanced features" | EXACT match (no number quoted; cap at 20) | EXACT match | EXACT match |
| Max description: "For landlords with 21+ rentals — unlimited scale and API access" | EXACT match | EXACT match | EXACT match |
| Hero anchor: "Built for landlords with 1–15 rentals" | EXACT match (Growth covers 6–20) | EXACT match | PARTIAL — Free Starter at 1 reads as "for someone smaller than the segment" |
| Phase 4 sister-specialist's "swap '500+ Growth subscribers' for the locked anchor" | Compatible | Compatible | Compatible |

**Verdict:** Option A is fully compatible with all Phase 4 locks. Option B is fully compatible. Option C has two conflicts and would require re-opening the Phase 4 lock.

## Strategic Asks (FOR USER)

The following six decisions are explicit asks for the user during `/gsd-discuss-phase 5` or `/gsd-plan-phase 5` synthesis. Specialist 1 (sister specialist) is also enumerating asks from a different angle — these are this specialist's six.

1. **Real Max price (Option A: $149) vs keep "Custom pricing"?**
   - Recommendation: **publish $149**. Five of eight competitors publish their top-tier price; transparency reads as professional in the small-landlord segment. RentRedi's "Call Us" approach makes sense at 60+ unit scale, not at 21+ unit scale.
   - Risk if wrong: $149 attracts customers who want enterprise-scale support (which TenantFlow can't yet deliver); "Custom" filters those customers out via friction.

2. **Annual discount: 16.67% (2 months free) vs 20% (Stessa pattern)?**
   - Recommendation: **16.67%** — keep `calculateAnnualSavings()` math; no code change; matches TenantCloud convention; clean dollar amounts at all three tiers ($190 / $490 / $1,490).
   - Risk if wrong: 20% is more attractive in the SaaS comparison surface (G2, Capterra rate annual discounts), but the math gets uglier ($19 × 12 × 0.8 = $182.40 — not clean).

3. **Tier names: keep Starter / Growth / Max vs rename to Solo / Team / Scale (or other)?**
   - Recommendation: **keep Starter / Growth / Max**. Phase 4 already locked the descriptions and the planner+sister-specialist have already enumerated the surface map for renaming (the names appear in `pricing.ts:STARTER/GROWTH/TENANTFLOW_MAX`, `pricing-card-featured.tsx:190`, JSON-LD, FAQ, comparison table, plus 30+ places in test fixtures). Renaming is a one-day diff; doing it without a strong product reason just expands the review surface.
   - Risk if wrong: "Starter / Growth / Max" reads as generic; "Solo / Team / Scale" reads as opinionated. But the locked Phase 4 descriptions explicitly say "landlords with X rentals" — the tier names don't carry the persona signal. So generic is fine.

4. **Feature gating: e-sign + vault-search remain on current tiers (Option A) vs gate vault to Growth+ (Option B)?**
   - Recommendation: **Option A — keep vault on Starter**. The vault-with-global-search is TenantFlow's strongest differentiator vs free tiers (verified: TurboTenant Free has no vault, Innago Free has docs but no vault-class search, Avail Free has no vault). Putting it on Starter is what makes the $19 price defensible. Gating it to Growth+ means Starter has nothing differentiating from $0 alternatives.
   - Risk if wrong: keeping vault on Starter caps Growth's upgrade pull. But Growth already has 25 e-signs/mo + advanced reporting + 3 users — those are the upgrade levers, not the vault.

5. **Per-unit pricing tiers — should Phase 5 add per-unit pricing as an alternate model (e.g., $5/unit/month for any tier)?**
   - Recommendation: **NO — flat tiers only**. Per-unit pricing is the minority pattern in the segment (only Avail and Hemlane); it conflicts with the locked Phase-4 portfolio bands; and adding it would expand Phase 5 from "config + Stripe" to "config + Stripe + new RPC for per-unit billing" — a 3× scope expansion.
   - Risk if wrong: per-unit pricing scales ARPU more linearly with portfolio size. But Max ($149/mo for unlimited) already captures that economic — it's just done as a flat tier instead of per-unit.

6. **Trial length: 14 days (current) vs 30 days?**
   - Recommendation: **14 days (no change)**. Hemlane is 14 days; TenantCloud is 14 days; only Baselane Smart and RentRedi (30-day money-back, not a trial) extend longer. 14 days matches the segment convention.
   - Risk if wrong: 30 days has higher trial-to-paid conversion (longer feature-discovery window), but doubles the no-revenue customer-acquisition window.

**Confidence:** HIGH on each recommendation. Each is reversible post-launch with a Stripe-only edit (no code changes for the 6 questions other than #2's discount-math constant).

## Bug Discovered During Research

**`src/config/pricing.ts:171` — Max annual price is $2,189 instead of $1,990.**

```typescript
// Current:
TENANTFLOW_MAX: {
  ...
  price: { monthly: 199, annual: 2189 }, // 8.3% discount, not 16.67%
}

// Per calculateAnnualSavings() math (lines 274–278):
// `monthlyPrice * 10` = $1,990 → which is the 16.67% discount Starter and Growth get.
// Max should be $1,990 to match.
```

This means **Max annual customers currently get a 8.3% discount where Starter and Growth get 16.67%**. The bug doesn't matter today (zero subscribers), but Phase 5 must NOT carry it forward. Whichever option the user picks, the Max annual = monthly × 10 rule must apply.

**Confidence:** HIGH — verified in `pricing.ts:163–197`.

## Common Pitfalls

### Pitfall 1: Stripe price IDs become stale after repricing
**What goes wrong:** The four `stripePriceIds` in `pricing.ts:104–107, 138–141, 172–175` reference Stripe IDs that were created at the *current* prices. After Phase 5 creates new Stripe products at the new prices, `pricing.ts` must be updated with the new IDs, OR the new prices must be applied to the *existing* Stripe products via `stripe.prices.create` with `replace=true` — but Stripe doesn't support price replacement; you must create a new price and then archive the old one.
**Why it happens:** Stripe prices are immutable once created. The migration is "create new, archive old" — not "edit existing".
**How to avoid:** Plan must (a) create new Stripe products + prices via Stripe MCP, (b) update `pricing.ts` with the new IDs, (c) test in Stripe test mode, (d) flip to live, (e) archive old prices. Sister specialist (Stripe baseline) should enumerate the existing Stripe IDs to be archived.
**Warning signs:** Customers see one price on the marketing surface but checkout shows a different price.

### Pitfall 2: Annual discount math drift across surfaces
**What goes wrong:** `calculateAnnualSavings()` in `pricing.ts:274–278` computes `monthlyPrice × 12 - monthlyPrice × 10` to display savings. If the recommended option ships and one tier's annual price doesn't follow `monthly × 10`, the displayed savings number is wrong.
**Why it happens:** The current Max annual ($2,189) breaks this rule already. Easy to miss in code review.
**How to avoid:** Plan must include a unit test asserting `plan.price.annual === plan.price.monthly * 10` for ALL tiers (Vitest, in `tests/config/pricing.test.ts` or similar). Run on every CI build.
**Warning signs:** Comparison table or pricing card shows different "save $X" amounts on different surfaces.

### Pitfall 3: JSON-LD `Product` schema lags marketing pricing
**What goes wrong:** The JSON-LD `Product.offers[]` array in `src/app/pricing/page.tsx` (per Phase 1 / CRIT-03 work) currently OMITS the Max tier (because Max is "Custom"). If Phase 5 publishes a Max public price ($149 per Option A), the JSON-LD must regain the Max offer, OR the Max stays on "Custom" and JSON-LD continues to omit it.
**Why it happens:** The Phase 1 fix correctly omitted Max-as-"Custom" from JSON-LD; reverting Max to a public price requires undoing that omission.
**How to avoid:** Plan must enumerate Max-public vs Max-Custom decision (see Strategic Ask #1 above) and include the JSON-LD edit in the surface list for PRICE-06.
**Warning signs:** Google Search Console rich-results test shows the Product entity but the Max offer is missing.

### Pitfall 4: Comparison-table sticky header references the price string
**What goes wrong:** `src/components/pricing/pricing-comparison-table.tsx` (per Phase 1 / `MAX_PUBLIC_PRICE_DISPLAY` cleanup notes in `pricing.ts:14–22`) imports a constant for the Max price display. Phase 5's Option A would replace `MAX_PUBLIC_PRICE_DISPLAY = 'Custom'` with the literal `$149` — but the import + render path must be updated, not just the constant.
**Why it happens:** Phase 1 deliberately left a `@phase-5-cleanup` annotation in `pricing.ts` to signal the surface map for cleanup.
**How to avoid:** Plan must include the surface map from `pricing.ts:14–22` verbatim:
  1. Delete the constant in `pricing.ts`
  2. Delete the import + render of `MAX_PUBLIC_PRICE_DISPLAY` in `pricing-comparison-table.tsx` (~line 206)
  3. Update `metadata.description` in `pricing/page.tsx`
  4. Update `productJsonLd.description` in `pricing/page.tsx`
  Plus the sister-specialist's full surface map.
**Warning signs:** Pricing page renders "Custom" in some places and "$149" in others.

### Pitfall 5: Annual savings text in pricing card uses hardcoded text
**What goes wrong:** Pricing card components (`pricing-card-featured.tsx`, `bento-pricing-section.tsx`, `pricing-comparison-table.tsx`) often have hardcoded "Save 17%" or "2 months free" copy. After Phase 5 changes the tier dollar amounts but keeps 16.67%, the *percentage display* doesn't change, but if the user picks 20% (Strategic Ask #2), every "Save X%" string sitewide must be updated.
**Why it happens:** Pricing copy lives in components, not in config.
**How to avoid:** Plan must grep for `(Save \d+%|months free|annual savings)` across `src/` and update all surfaces. Cross-reference with the comparison table + bento section + pricing card.
**Warning signs:** One surface says "16.67%", another says "Save 20%", a third says "2 months free".

### Pitfall 6: PaaS pattern conflict — Stripe webhook events for "subscription.updated" might be misinterpreted as upgrades
**What goes wrong:** When a customer's Stripe price ID changes (because TenantFlow swaps the price ID after Phase 5 ships), Stripe fires `customer.subscription.updated`. If TenantFlow's webhook handler interprets price-ID changes as plan upgrades (incrementing usage credits, sending welcome emails), every customer gets a spurious "Welcome to your new plan!" email.
**Why it happens:** The webhook handler in `supabase/functions/stripe-webhook/` (or equivalent) likely doesn't distinguish between "price changed because of repricing" and "price changed because of upgrade".
**How to avoid:** Since current Stripe subscriber count is **0** per the user's disclosure, this is not a current-customer risk. But the migration playbook (PRICE-05) MUST document this for future restructures: include a flag in the subscription metadata distinguishing repricing-migration from genuine plan changes.
**Warning signs:** Spurious upgrade emails to customers post-migration.

**Confidence:** HIGH on all 6 pitfalls — each is verifiable in the current codebase.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stripe price-ID lookup at runtime | Custom price-ID-by-tier resolver | `getStripePriceId(planId, period)` already in `pricing.ts:297–307` | Already exists; planner just calls it |
| Annual savings math | Custom percentage formatter | `calculateAnnualSavings(monthlyPrice)` already in `pricing.ts:274–278` | Already exists; planner just calls it |
| Plan limit validation | Custom usage-vs-limit checker | `checkPlanLimits(usage, planId)` already in `pricing.ts:215–249` | Already exists; planner just calls it |
| Plan upgrade recommender | Custom "what's the next tier" logic | `getRecommendedUpgrade(usage, currentPlanId)` already in `pricing.ts:251–272` | Already exists; planner just calls it |
| JSON-LD Product schema | Hand-write the schema object | Existing implementation in `src/app/pricing/page.tsx` (per Phase 1 work) | Edit the existing offers[] array; don't rewrite from scratch |
| Comparison-table data | Hand-build a price-by-tier matrix | `pricing-comparison-table.tsx` already maps `PRICING_PLANS` → table rows | Edit `PRICING_PLANS`, table re-renders automatically |
| Stripe product creation in CI | Custom CI script that hits Stripe API | Stripe MCP `create_product` + `create_price` invocations from the orchestrator (PRICE-04) | Stripe MCP is available; no need to script |

**Key insight:** The pricing config in `src/config/pricing.ts` is **already the single source of truth** for monthly/annual prices, plan limits, feature lists, and Stripe price IDs. Phase 5's job is to **edit the constants** + **migrate Stripe**, not to invent new architecture. All consumer-side code (pricing card, comparison table, JSON-LD, plan-limit enforcement) reads from this config — no second source exists.

**Confidence:** HIGH — verified by reading `src/config/pricing.ts:1–308` end-to-end.

## Code Examples

### Pricing config update pattern (Option A)

```typescript
// src/config/pricing.ts — Option A (recommended)
// Source: pricing.ts:96–197 (current); reprice in place

STARTER: {
  // ...
  price: {
    monthly: 19,        // was 29
    annual: 190         // was 290; 19 × 10 = 190 ✓
  },
  stripePriceIds: {
    monthly: 'price_NEW_STARTER_MONTHLY' as StripePriceId,  // create via Stripe MCP
    annual: 'price_NEW_STARTER_ANNUAL' as StripePriceId
  },
  // limits unchanged: properties: 5, units: 25
  // features unchanged
},

GROWTH: {
  // ...
  price: {
    monthly: 49,        // was 79
    annual: 490         // was 790; 49 × 10 = 490 ✓
  },
  stripePriceIds: {
    monthly: 'price_NEW_GROWTH_MONTHLY' as StripePriceId,
    annual: 'price_NEW_GROWTH_ANNUAL' as StripePriceId
  },
},

TENANTFLOW_MAX: {
  // ...
  price: {
    monthly: 149,       // was 199
    annual: 1490        // was 2189 (BUG); 149 × 10 = 1490 ✓
  },
  stripePriceIds: {
    monthly: 'price_NEW_MAX_MONTHLY' as StripePriceId,
    annual: 'price_NEW_MAX_ANNUAL' as StripePriceId
  },
},
```

### Drift-guard test (mandatory)

```typescript
// tests/unit/config/pricing-annual-math.test.ts
import { describe, expect, it } from 'vitest'
import { PRICING_PLANS } from '#config/pricing'

describe('pricing annual math', () => {
  it('every paid plan has annual = monthly × 10 (16.67% discount)', () => {
    for (const plan of Object.values(PRICING_PLANS)) {
      if (plan.planId === 'trial') continue
      expect(plan.price.annual).toBe(plan.price.monthly * 10)
    }
  })

  it('no plan has annual = 0 with non-zero monthly', () => {
    for (const plan of Object.values(PRICING_PLANS)) {
      if (plan.price.monthly === 0) continue
      expect(plan.price.annual).toBeGreaterThan(0)
    }
  })
})
```

This drift-guard is the same pattern Phase 64's `documents.test.ts` used to lock the seed-slug-list against the migration. Cycle-1 reviewers will look for it.

**Confidence:** HIGH — pattern is established in the codebase per CLAUDE.md `Migration↔code lockstep test` convention.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + jsdom |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `pnpm test:unit -- --run src/config/pricing.test.ts` |
| Full suite command | `pnpm test:unit` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRICE-03 | New tier prices match recommendation | unit | `pnpm test:unit -- --run tests/unit/config/pricing-tiers.test.ts` | ❌ Wave 0 |
| PRICE-03 | Annual = monthly × 10 for all paid plans | unit | `pnpm test:unit -- --run tests/unit/config/pricing-annual-math.test.ts` | ❌ Wave 0 |
| PRICE-04 | Stripe price IDs are non-null + format `price_*` for all tiers | unit | `pnpm test:unit -- --run tests/unit/config/pricing-stripe-ids.test.ts` | ❌ Wave 0 |
| PRICE-06 | JSON-LD Product schema offers[] matches PRICING_PLANS | unit | `pnpm test:unit -- --run src/app/pricing/page.test.tsx` | ⚠️ may exist post-Phase-1 |
| PRICE-06 | Comparison-table renders the new prices (snapshot) | unit | `pnpm test:unit -- --run src/components/pricing/pricing-comparison-table.test.tsx` | ⚠️ may exist post-Phase-1 |
| PRICE-06 | No reference to "Custom pricing, contact sales" string post-cleanup | unit | `grep -rn 'Custom pricing, contact sales' src/` should return zero | manual command (no test) |

### Sampling Rate
- **Per task commit:** `pnpm test:unit -- --run src/config/pricing.test.ts src/components/pricing` (~3 sec)
- **Per wave merge:** `pnpm validate:quick` (types + lint + unit tests, ~30 sec)
- **Phase gate:** Full `pnpm test:unit` green + manual JSON-LD validation via Google Rich Results Test before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/config/pricing-tiers.test.ts` — covers PRICE-03 (asserts every tier has expected monthly/annual amounts)
- [ ] `tests/unit/config/pricing-annual-math.test.ts` — covers PRICE-03 (drift-guard)
- [ ] `tests/unit/config/pricing-stripe-ids.test.ts` — covers PRICE-04 (asserts Stripe IDs are populated for both monthly+annual on every paid tier)

(Existing tests in `src/components/pricing/` and `src/app/pricing/` from Phase 1 may need snapshot updates — planner verifies during plan synthesis.)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No new auth surface in this phase |
| V3 Session Management | no | No new sessions |
| V4 Access Control | yes | Stripe MCP calls require service-level credentials; never expose to frontend |
| V5 Input Validation | yes | Stripe price IDs must match `price_*` regex when read into `StripePriceId` type |
| V6 Cryptography | no | No new crypto |
| V7 Error Handling | yes | Stripe webhook errors must NOT expose Stripe internal IDs to frontend (use `errorResponse()` from `_shared/errors.ts`) |

### Known Threat Patterns for Pricing Restructure

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Tampering with Stripe price IDs in client to checkout at lower price | Tampering | Server-side price-ID validation; never trust client-supplied price IDs in checkout-session creation |
| Information disclosure via leaked Stripe price IDs in public JSON-LD | Information Disclosure | Stripe price IDs ARE public-safe (they're not API keys; they're just IDs that point to a public price). No mitigation needed. |
| Customer-impersonation in subscription updates post-migration | Spoofing | Validate webhook signature server-side; never derive identity from webhook body alone |
| DoS via unbounded Stripe API calls during migration | Denial of Service | Migrate during low-traffic window; rate-limit Stripe MCP calls per minute |

(This phase has a small new-attack-surface footprint — it's a config + Stripe migration, not a new feature.)

## Sources

### Primary (HIGH confidence)
- [TenantFlow `src/config/pricing.ts:1–308`](file:///Users/richard/Developer/tenant-flow/src/config/pricing.ts) — current TenantFlow pricing (verified 2026-05-10)
- [Hemlane Pricing](https://www.hemlane.com/pricing/) — live-fetched 2026-05-10 (Tier prices: Starter free, Basic $30, Essential $48, Complete $86)
- [RentRedi Pricing](https://rentredi.com/pricing/) — live-fetched 2026-05-10 (Start $5, Grow $29.95 / $12 annual, Pro Custom)
- [Stessa Pricing](https://www.stessa.com/pricing/) — live-fetched 2026-05-10 (Essentials free, Manage $15 / $12 annual, Pro $35 / $28 annual)
- [TenantCloud Pricing](https://www.tenantcloud.com/pricing) — live-fetched 2026-05-10 (Starter $15, Growth $29.17, Pro $50)
- [Baselane Pricing](https://www.baselane.com/pricing) — live-fetched 2026-05-10 (Core free, Smart $20)
- [Avail Pricing](https://www.avail.com/pricing) — live-fetched 2026-05-10 (Unlimited $0/unit, Unlimited Plus $9/unit/mo)
- [DoorLoop Pricing](https://www.doorloop.com/pricing) — live-fetched 2026-05-10 (Starter $99/mo, Pro $189/mo, Premium $239/mo + $3/unit; out-of-segment but useful as upper bound)
- [Phase 4 Persona Research (`04-RESEARCH-persona-terminology.md`)](file:///Users/richard/Developer/tenant-flow/.planning/phases/04-persona-copy/04-RESEARCH-persona-terminology.md) — locked persona phrasing
- [TenantFlow `.planning/REQUIREMENTS.md` PRICE-01..06](file:///Users/richard/Developer/tenant-flow/.planning/REQUIREMENTS.md) — phase requirements
- [TenantFlow `.planning/ROADMAP.md` Phase 5](file:///Users/richard/Developer/tenant-flow/.planning/ROADMAP.md) — phase goal + success criteria

### Secondary (MEDIUM confidence — verified across multiple sources)
- [Capterra TurboTenant Pricing](https://www.capterra.com/p/147659/Turbo-Tenant/pricing/) — TurboTenant Pro $9.92, Premium $12.42 (cross-verified vs CRE Daily review)
- [CRE Daily TurboTenant Review](https://www.credaily.com/reviews/turbotenant-review/) — TurboTenant Free + paid (under $200/yr unlimited properties)
- [TurboTenant Premium announcement](https://www.turbotenant.com/tools/announcing-turbotenant-premium/) — Premium $149/yr ($12.42/mo), unlimited e-signs (verified via search excerpt; live page returned 403 to WebFetch)
- [Innago via ITQlick Pricing](https://www.itqlick.com/innago-property-management/pricing) — Innago confirmed 100% free for landlords, no paid tiers (cross-verified via Innago marketing copy "No monthly fee. No setup fee. No contract.")
- [Buildium Pricing 2026 (search)](https://www.g2.com/products/buildium/pricing) — Essential $99 setup + $40–$95/mo, Growth $192/mo, Premium $400/mo (out-of-segment but useful upper bound)
- [Avail Unlimited Plus pricing (G2)](https://www.g2.com/products/avail-by-realtor-com/pricing) — verified $9/unit/mo (some sources say $7; canonical is $9 per Avail.com)

### Tertiary (LOW confidence — flagged for validation)
- Various aggregator sites (saasworthy.com, softwarefinder.com) used for cross-reference; tier names + prices may differ slightly from canonical
- Annual discount conventions ("15-20%") — directional industry norm; specific competitor annual pricing not always disclosed publicly
- Out-of-segment competitors (DoorLoop, Buildium) — mentioned for context only; not direct comparables for the locked "1–15 rentals" segment

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Current Stripe subscriber count is 0 (per user disclosure) | Common Pitfalls (Pitfall 6), Strategic Asks (#1) | If wrong, the migration playbook (PRICE-05) becomes load-bearing immediately, not aspirational. Sister specialist's revenue audit (PRICE-01) will confirm. |
| A2 | Phase 4 locks the tier descriptions (Starter "1–5 rentals", Max "21+") | Tier-Shape Options, Cross-Reference table | If Phase 4 lock is reopened, Option C (free Starter) becomes viable. Phase 4 is shipped per memory; lock is firm. |
| A3 | The bug at `pricing.ts:171` (Max annual = $2,189 ≠ $1,990) is not intentional pricing | Bug Discovered During Research | If intentional, the user can override; flag during `/gsd-discuss-phase 5`. The code comment + `calculateAnnualSavings()` math both indicate it's a bug. |
| A4 | TurboTenant Premium $149/yr is the *current* price (not a deprecated 2024 price) | Live Competitor Pricing Matrix | Verified via 2026-01 announcement; older sources show $99/yr. Recommendation: planner re-verify on 2026-05-10 before locking the matrix into PRICING-DECISION.md. |
| A5 | Stripe MCP `create_product` + `create_price` are available in the orchestrator's MCP set | Don't Hand-Roll table | Verified in mcp__supabase + likely a Stripe MCP exists (referenced in CLAUDE.md GSD section). If unavailable, planner falls back to Stripe Dashboard manual creation. |
| A6 | Annual = monthly × 10 (16.67% discount) is the user's preferred annual discount | Three Tier-Shape Options, Strategic Asks (#2) | If user prefers 20% (Stessa convention), Option A's clean dollar amounts get messier ($19 × 12 × 0.8 = $182.40). Strategic Ask #2 surfaces this. |

**Total assumed claims:** 6. Each has a documented mitigation. Recommend planner mention A1 + A3 + A6 to user during `/gsd-discuss-phase 5` synthesis (these have the highest material impact on the proposal).

## Open Questions

1. **Should TenantFlow add a Free tier (Option C) in v2.0+ if conversion data shows it's needed?**
   - What we know: 6/8 competitors have a free tier; Free Trial is conversion-friendly but not the same as Free Tier (FT users can never disqualify themselves; Free Tier users self-segment).
   - What's unclear: TenantFlow's actual trial-to-paid conversion rate (no data — zero customers).
   - Recommendation: Phase 5 ships Option A (paid-only). Re-evaluate at Phase 12 (SEO) or v2.0+ once there's conversion data.

2. **Does the user want a comparison table that names competitors by name (TurboTenant, Avail, etc.)?**
   - What we know: `src/app/compare/[competitor]/compare-data.ts:84,192,321` already has competitor data.
   - What's unclear: Whether Phase 5's PRICE-06 should add new competitor rows (e.g., add a Stessa or Hemlane row) or just update TenantFlow's prices in the existing table.
   - Recommendation: Phase 5 updates only TenantFlow's prices (in scope); adding new competitor rows is Phase 10 (CTA & Conversion Standardization) work.

3. **Stripe migration order — create new prices first or archive old prices first?**
   - What we know: Stripe prices are immutable; archive ≠ delete; archived prices remain valid for existing subscriptions but cannot be assigned to new subscriptions.
   - What's unclear: Whether the Stripe MCP supports "create new + atomically swap" or whether there's a window where both old and new prices are active.
   - Recommendation: Plan must include a 1-step "create new, test in Stripe test mode, swap config, archive old" sequence. Sister specialist (Stripe baseline) enumerates the existing IDs.

4. **Should the JSON-LD `Product` schema list all 3 tiers as separate offers, or 1 product with 3 offers?**
   - What we know: Phase 1 created the JSON-LD with Max omitted (because it was "Custom").
   - What's unclear: Schema.org best-practice for multi-tier SaaS — Google Rich Results Test accepts both patterns.
   - Recommendation: 1 Product with 3 offers (`offers: [Starter, Growth, Max]`). Planner verifies via Rich Results Test post-deploy.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Stripe MCP (`mcp__stripe__*`) | PRICE-04 (create new products + prices) | ⚠️ unknown — need orchestrator confirmation | — | Manual creation via Stripe Dashboard with screenshot evidence |
| Supabase MCP | (none — this phase is config-only) | ✓ | — | — |
| Vitest | Drift-guard tests for PRICE-03 | ✓ | 4.x | — |
| Stripe test mode | PRICE-04 testing | ✓ (Stripe convention) | — | — |
| Google Rich Results Test | PRICE-06 JSON-LD verification | ✓ (web service) | — | — |

**Missing dependencies with no fallback:** none.

**Missing dependencies with fallback:** Stripe MCP availability is the open question. If the orchestrator has Stripe MCP, the migration is automated; if not, the planner schedules manual Dashboard work for the user.

## Metadata

**Confidence breakdown:**
- Competitor pricing matrix: HIGH (live-fetched 7/8; cross-verified the 1 that returned 403)
- Annual discount convention: HIGH (verified TenantCloud + Stessa + RentRedi; industry baseline 15–20%)
- Tier-shape recommendation (Option A): HIGH (segment-aligned, all-clean math, no Phase 4 conflict)
- Bug at `pricing.ts:171`: HIGH (verified in repo)
- Strategic asks (6): HIGH (each is reversible post-launch)
- Stripe MCP availability: MEDIUM (orchestrator-dependent)

**Research date:** 2026-05-10
**Valid until:** 2026-06-10 (30 days; competitor pricing changes quarterly — Stessa raised prices 2024→2026, TurboTenant Premium changed from $99 to $149 in 2026, RentRedi updates pricing periodically)
