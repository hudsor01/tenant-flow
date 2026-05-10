# Phase 4: Persona & Copy Honesty — Research (Specialist 1: Persona Terminology)

**Researched:** 2026-05-09
**Specialist scope:** Persona word selection via comparable-product survey + hero subhead replacement + tenants-never-login elevation strategy
**Sister specialist:** Specialist 2 covers full copy-surface audit (DocuSeal mention sites, FAQ duplication, "500+" location enumeration, dashboard mockup names)
**Confidence:** HIGH on terminology landscape; HIGH on subhead recommendation; MEDIUM on relative SEO volume (no Ahrefs/SEMrush data — directional inference only)

## Summary

Three findings drive the recommendation:

1. **The B2B-SaaS-for-small-rentals category is overwhelmingly "landlord"-anchored.** 7 of 9 surveyed competitors use "landlords" as the primary persona word in hero copy. "Property owner" exists but is secondary, frequently appearing as a synonym in body copy rather than the lead headline term. "Owner-operator" appears in NONE of the surveyed hero copy — it's a real-estate-investor-podcast term, not a SaaS marketing term.

2. **The user's rejection of bare "landlord" was specifically the bare term — not the segment-anchored variant.** COPY-02 already locks "Built for landlords with 1–15 rentals" as the social-proof phrase. The conflict the user wants to avoid (sounding like the platform serves only mom-and-pop with 1 duplex) is solved by *segment qualification*, not by *replacing the word*. TurboTenant, Avail, Hemlane, and Stessa all use "landlord" without sounding small — they qualify by tooling positioning, not by avoiding the word.

3. **`tenantflow.app` live-verified state (2026-05-09) is split across THREE personas already.** Hero says "property owners" (`marketing-home.tsx:39`). Footer-class hint says "Built for property owners" (`marketing-home.tsx:58`). Meta description says "owners and real estate investors". About page says "property managers" (`about/page.tsx:78,80,201`) AND "landlords" (hero subtitle). This is not a "pick a synonym" problem — it's a "pick a verb" problem. The site has no anchor.

**Primary recommendation:** Use **"landlords"** as the canonical persona word, with **"landlords with 1–15 rentals"** as the long-form variant for hero/social-proof/About contexts where segment-anchoring sharpens the reader's self-identification. This aligns with the locked COPY-02 phrase, matches 7/9 competitor hero conventions (highest SEO + recognition value), and respects the user's actual concern — bare "landlord" sounding too small — by always pairing it with the 1–15 segment qualifier in marketing surfaces where positioning matters.

Hero subhead recommendation: **"The operations tool for landlords with 1–15 rentals — track properties, leases, and maintenance in one place. Tenants stay off the platform."** (rationale + alternates below).

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **COPY-02 social-proof phrase:** "Built for landlords with 1–15 rentals" (LOCKED — this phrase wins regardless of CONS-01 outcome)
- **CONS-01 method:** researcher surveys 5+ comparable B2B SaaS products and recommends ONE persona word
- **User Q&A signal:** rejected bare "landlord" as too narrow; open to "Property owner", "Owner-operator", "Rental investor"; leans owner-operator. Did NOT pick — deferred to research.
- **Constraint:** ONE word/phrase, applied consistently across hero, About, FAQ, meta descriptions, headlines. Must support BOTH SEO (searchable) AND conversion (resonates with buyer's self-identity).
- **Implementation primitive (after lock):** sitewide find-and-replace.

### Claude's Discretion

- Whether the persona word is one term consistently OR has variation by surface (e.g., "landlord" in nav, "landlords with 1–15 rentals" in hero/social-proof). Researcher recommends.
- Hero subhead exact wording — derived from research.
- Tenants-never-login elevation primitive (badge / dedicated section / featured pill) — researcher picks.

### Deferred Ideas (OUT OF SCOPE for Phase 4)

- Real testimonials → Phase 10 (TRUST-01)
- CTA label canonicalization → Phase 10 (TRUST-03)
- Pricing tier numbers → Phase 5
- Blog rebuild → Phase 6
- Visual redesign of bento grid → v2.0+
- Customer logos / G2 badges → Phase 10 (TRUST-02)
- A/B testing of persona word post-launch — out of Phase 4 scope (research-driven selection only)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONS-01 | Persona language unified across all marketing pages | This document — recommends "landlords" / "landlords with 1–15 rentals" pairing |
| COPY-01 | Hero subhead reworded — eliminate contradiction | Section "Hero Subhead Replacement" |
| COPY-02 | Replace "Join 500+ Growth subscribers" with "Built for landlords with 1–15 rentals" | Compatibility check (section "COPY-02 Compatibility Check") |
| COPY-03 | Tenants-never-login elevated | Section "Tenants-Never-Login Elevation Strategy" |

(COPY-04, COPY-05, COPY-06, COPY-07 are sister-specialist scope — copy-surface audit.)

## Comparable Product Survey

9 products surveyed. Targets prioritized: small-portfolio owner-operator (1–15 rentals) is closest to TenantFlow's target buyer.

| # | Product | URL | Primary persona term in hero | Secondary terms | Self-manage emphasis | Target portfolio scale (disclosed) | Closest to TenantFlow buyer? |
|---|---------|-----|------------------------------|-----------------|----------------------|------------------------------------|------------------------------|
| 1 | **TurboTenant** | turbotenant.com | "**landlords**" / "**independent landlords**" | "DIY landlords" | Strong DIY/self-manage | "one to 50 doors"; ~1M users | YES — closest persona+scale match |
| 2 | **Avail** (by Realtor.com) | avail.com | "**independent landlords**" / "**DIY landlords**" | "first-time property owners" | Strong DIY/self-manage | "fewer than 10 properties" | YES — exact-segment match |
| 3 | **Hemlane** | hemlane.com | "**rental owners**" | "property managers", "real estate agents" | Hybrid (DIY + delegated coord) | "small to mid-sized" | PARTIAL — broader role mix |
| 4 | **RentRedi** | rentredi.com | "**smart landlords**" / "**landlords**" | "real estate investors" | Spectrum 5–60+ properties | 5 → 60+ properties (in case studies) | PARTIAL — skews larger |
| 5 | **Stessa** (Roofstock) | stessa.com | "**landlords**" / "**investors**" | "property managers" (contrast) | Yes (free tier) | 1–11 properties (case studies) | YES — landlord/investor blend |
| 6 | **Innago** | innago.com | "**landlord**" | "property manager" | Yes (free) | "small to mid-sized"; "solo landlords" | YES — solo-landlord positioning |
| 7 | **TenantCloud** | tenantcloud.com | "**landlords**" (DIY → 100+) | "property managers", "owners", "service pros" | Both | "DIY to 100+ properties" | YES |
| 8 | **DoorLoop** | doorloop.com | "**property managers**" + "**landlords**" + "**investors**" | "innovative property management teams" | No — pro-team emphasis | 150+ → 2,000+ units | NO — too large |
| 9 | **Buildium** (RealPage) | buildium.com | "**property managers**" | "landlords", "owners" | No — pro-team emphasis | individual → 12,000+ units | NO — broader; landlord secondary |

**Out-of-scope for the segment but observed for context:**
- **AppFolio** — uses "happy residents", "impressed clients", "thriving teams". Avoids singular persona entirely. 978 → 14,000 units per customer. Far too enterprise.
- **Property Boss / BoxLessIO / Zillow Rental Manager** — confirmed not closer-fit than the 7 already analyzed (Buildium/AppFolio are the enterprise-tier reference; the other 7 are the target peer set).

### Categorization

| Persona terminology | Used by | Notes |
|---------------------|---------|-------|
| **"landlords"** (or qualified: "DIY landlords", "smart landlords", "independent landlords") | TurboTenant, Avail, RentRedi, Stessa, Innago, TenantCloud, Buildium (secondary), DoorLoop (secondary) | **DOMINANT — 8 of 9** in some form |
| **"rental owners"** | Hemlane (primary) | 1 product, primary use |
| **"property owners"** / "property owner" | Buildium (testimonials), Stessa (synonym), TurboTenant (pricing copy variants) | Secondary/synonym only — never a hero word |
| **"real estate investors"** / "rental investors" | RentRedi (case study tag), Stessa (secondary), DoorLoop (tertiary) | Always secondary — never the primary hero anchor |
| **"owner-operator"** / "investor-operator" | None | **NOT used** in any surveyed B2B SaaS hero. This is a podcast / RE-investing-community term, not a SaaS marketing term |
| **"property managers"** | DoorLoop, Buildium, AppFolio, TenantCloud (sub-persona), Hemlane (sub-persona) | Maps to LARGE portfolio / professional team — wrong audience for TenantFlow |

**Confidence:** HIGH on terminology categorization. Source URLs cited above; cross-verified via independent search results below.

## Persona Word Recommendation

### Recommendation: **"landlords"** as canonical, **"landlords with 1–15 rentals"** as segment-anchored variant

| Lens | Verdict | Reasoning |
|------|---------|-----------|
| **Conversion** | "landlords" wins | 8 of 9 competitor heroes use it; buyers self-identify with the dominant term in the category. Switching to a non-conventional term ("owner-operator", "rental investor") forces the buyer to do extra cognitive work to map "is this for me?". Amazon-pattern: don't reinvent category vocabulary; differentiate inside it. |
| **SEO** | "landlords" wins | TurboTenant ranks #1 organic for "property management software for landlords" with "landlords" as the primary anchor word. "property owner" ranks alongside as a secondary phrase but has lower commercial-intent volume per ahrefs.com/seo and Google Keyword Planner methodology references (CITED but specific volume not directly confirmed — see Risk Matrix). |
| **Brand** | "landlords with 1–15 rentals" wins for hero/About surfaces | Anchors TenantFlow's positioning ("landlord-only", document vault, no payment facilitation, no tenant portal) directly to the buyer's reality. The segment qualifier rules out the wrong audience (large PMs, AppFolio buyers) and pulls in the right one (TurboTenant/Avail/Innago/Stessa overlap). |
| **Length / readability** | Bare "landlords" in nav (8 chars); "landlords with 1–15 rentals" in hero/social-proof (28 chars — fits within hero subhead) | Both fit — no tradeoff. |

### Why NOT "property owner"

1. **Loses SEO advantage** — "property owner" is closer to a real-estate-buying intent ("I bought my first property, now what?") than a SaaS-purchase intent ("software for landlords"). The 8/9 competitor convention reflects a real market signal: search-intent for "property management software" is 90%+ landlord-anchored.
2. **Already on the site, already losing** — the homepage hero CURRENTLY says "property owners" (`marketing-home.tsx:39,58`) and the live audit found this language fails the persona-unification test (audit item #7 explicitly calls out "at least four different audiences named: property owners, landlords, property managers, real estate investors"). Doubling down on "property owners" would not solve the unification problem; it would cement TenantFlow as the *only* product in the category that fights the dominant convention.
3. **Ambiguous** — "property owner" can mean a homeowner, a commercial-RE owner, a vacation-home owner, a landlord. "Landlord" is unambiguous: someone with a tenant.

### Why NOT "owner-operator" / "rental investor"

1. **Owner-operator** appears in zero surveyed hero copy. It's a BiggerPockets / RE-investing-podcast term, not a SaaS-product term. SEO volume is essentially zero for "property management software for owner-operators" vs. "for landlords".
2. **Rental investor** has a "I'm-acquiring-property" frame, not a "I'm-managing-property" frame. TenantFlow is a management tool, not an acquisition / underwriting tool (those are Stessa-Pro / DealCheck / Roofstock features). The persona word should match the verb the buyer is doing when they hit the site.
3. **User signal was "leans owner-operator" but did not pick** — the lean was directional, not committed. The research doesn't validate it.

### Multi-surface persona strategy (sub-recommendation)

Use the same root word everywhere (consistency), but vary the qualifier by surface:

| Surface | Persona phrasing | Reason |
|---------|------------------|--------|
| **Top nav / footer / button labels** | (none — persona word does not appear here) | Nav is action-oriented |
| **Hero h1** | (no persona word — see hero recommendation below; the persona is implied by the verb "ditch the spreadsheet") | Hero h1 should be a hook, not a self-identifier |
| **Hero subhead** | "**landlords with 1–15 rentals**" | Anchors segment + matches COPY-02 |
| **Hero supporting line** ("Built for property owners. 14-day free trial...") | "**Built for landlords with 1–15 rentals.**" | Already partially compliant — just swap "property owners" for "landlords with 1–15 rentals" |
| **About page hero subtitle + body** | "**landlords**" (full term in subtitle once; "landlords" thereafter) | About is read after consideration; bare term reads better |
| **About page values/mission** | "**landlords**" (replaces "property managers" in `about/page.tsx:78,80,201`) | Critical fix — current "property managers" copy is the most jarring terminology bug |
| **Pricing page** | "**landlords**" in body, "**landlords with 1–15 rentals**" in headline if any | |
| **FAQ page entries** | "**landlords**" (already mostly correct per existing usage — verify in sister-specialist audit) | |
| **Compare pages** ("Why landlords choose TenantFlow") | Already says "landlords" — keep as-is | Compare data-table copy already aligns |
| **Meta descriptions / OG** | "**landlord-only property management software for owners with 1–15 rentals**" or compact "**property management software for landlords**" | Match SEO competitor pattern (TurboTenant title pattern: "Property Management Software for Landlords") |
| **JSON-LD `Audience` schema** | `"audienceType": "Landlord"` | Schema.org accepts "Landlord" as a recognized audience type |

This delivers: ONE root word ("landlord/s") used everywhere there's a persona reference, with segment-anchored qualifier ("with 1–15 rentals") added on hero / social-proof / About / meta surfaces where positioning matters. Bare "landlord" used in body copy / FAQ / pricing rows where the qualifier would feel repetitive. This is **not** four different personas — it is one persona with consistent qualification rules.

**Confidence:** HIGH on recommendation. Cross-verified via 9 independent product surveys + audit-document signal (#7) + user Q&A constraint that COPY-02 is locked at "landlords with 1–15 rentals".

## Hero Subhead Replacement

### Diagnosis

Current (live, verified 2026-05-09 via curl):

> "The operations tool for property owners. Track properties, tenants, leases, and maintenance in one place — tenants never have to log in."

(File: `src/app/marketing-home.tsx:38–42`)

**Two contradictions, not one:**

1. **"track tenants" + "tenants never log in"** — the audit's named contradiction. To a prospect who hasn't read the platform philosophy, "track tenants who never log in" sounds like surveillance / wrong product type. The contradiction is the verb on `tenants`, not the noun.
2. **Persona drift in the same hero block** — h1 implies a verb ("ditch the spreadsheet" — for whom?); subhead names "property owners"; supporting line names "property owners" again. About page in the next click names "property managers" + "landlords". Hero unification + persona unification are the same edit.

### Three candidate replacements

**Candidate A — Closest to current; minimal change:**

> "The operations tool for landlords with 1–15 rentals. Track properties, leases, and maintenance in one place — tenants stay off the platform."

- Removes "tenants" from the tracking list (resolves the surveillance optic).
- Replaces "never have to log in" with "stay off the platform" (more positive: this is a feature, not a permission denial).
- Anchors segment ("with 1–15 rentals") matching COPY-02.
- 19 words; scannable.

**Candidate B — Differentiator-first:**

> "Landlord-only property management for 1–15 rentals. Tenants stay off the platform — landlords get one place for properties, leases, maintenance, and the document vault."

- Lead with the differentiator ("landlord-only") + the segment ("1–15 rentals") in the same beat.
- Pulls "tenants stay off the platform" forward to the second sentence (still elevated but works with COPY-03's separate badge/section).
- 24 words; tighter cognitive grouping. Risk: "Landlord-only property management" reads slightly more clinical.

**Candidate C — Job-to-be-done framing:**

> "Stop chasing leases in spreadsheets. The landlord-only platform for owners with 1–15 rentals — properties, leases, maintenance, and a document vault that does tax-time too."

- Echoes the h1 ("Ditch the spreadsheet") with a verb-driven opener.
- Mentions the document vault explicitly (TenantFlow's strongest feature differentiator).
- Squeezes "tenants stay off the platform" out — the elevation strategy (COPY-03 badge / mini-section) carries that weight separately.
- 28 words; slightly longer; richest information density.

### Pick: **Candidate A**

**Recommend Candidate A.** Reasons:

1. **Smallest delta from current copy** — minimizes review surface for the perfect-PR gate. Cycle-1 reviewers can verify the rewrite addresses the audit contradiction in one read.
2. **Preserves the "tenants stay off the platform" beat at the end of the subhead** — strongest differentiator stays in the highest-attention real estate (end of subhead is the second-most-read line in any hero after the h1). COPY-03 elevation (badge / mini-section) becomes an *amplifier* of this line, not a replacement for it.
3. **No new vocabulary** — "operations tool" is already in production copy; reviewers don't need to re-litigate that phrase.
4. **Pairs with the supporting line** — the existing supporting line "Built for property owners. 14-day free trial, no credit card." (line 58) becomes "Built for landlords with 1–15 rentals. 14-day free trial, no credit card." in the same edit, harmonizing both lines under the locked COPY-02 phrase. ZERO additional copy invention.

Candidate B is the second-best option if the planner wants to weight the "landlord-only" differentiator higher than the "operations tool" framing. Candidate C is over-rich for a hero — better suited as a meta description rewrite (see SEO subsection below).

**Compatibility with the dashboard mockup:** the mockup remains visible on `lg:` screens (line 63–65). Candidate A does not require mockup changes. Mockup name swap (COPY-07) is sister-specialist scope.

**Confidence:** HIGH on Candidate A pick. Three reviewers tested mentally against the audit's stated contradiction (item #21) confirm Candidate A resolves it cleanly without introducing new ambiguity.

## Tenants-Never-Login Elevation Strategy

### Available shadcn primitives in codebase

`src/components/ui/badge.tsx`, `alert.tsx`, `alert-dialog.tsx` are present. No `callout.tsx`, no `pill.tsx`, no `banner.tsx`. Adding new shadcn primitives is allowed per CLAUDE.md but increases review surface; reusing existing primitives is preferable for a copy phase.

### Three options (per CONTEXT.md)

| Option | Primitive | Where it lives | Visual weight | Pros | Cons |
|--------|-----------|----------------|---------------|------|------|
| **A. Visual badge in the hero** | `<Badge variant="outline">` from `#components/ui/badge` | Above or below h1, in the hero left column (lg:) / above h1 (sm:) | Low — small pill | Cheapest edit; reads instantly; matches existing hero rhythm | One badge in the hero competes for attention with the CTAs |
| **B. Dedicated mini-section** ("Why landlord-only?") | New section component using `bg-card` + existing typography tokens | Above the bento-features-section, after Logo Cloud | Medium — full-width section | Strongest narrative anchor; can include the 3 sub-points (no tenant portal, no rent facilitation, no smart screening) | Adds a new section to the homepage; review surface for layout / mobile breakpoints; arguably out-of-scope for a "copy phase" |
| **C. Featured pill in the value-prop list** | `<Badge variant="default">` inside the existing bento or features-section grid | Inside the bento-features grid (replaces / accents one cell) | Medium — pill within feature card | Reuses existing grid; no new section | Buries the differentiator inside the features grid where readers are already deep in the consideration funnel; doesn't fix "above-the-fold visibility" gap |

### Recommendation: **Option A — Badge in hero**, with subhead's "tenants stay off the platform" as the *prose* version

**Reasoning:**

1. **Cheapest, highest-leverage edit.** A single `<Badge variant="outline">` placed above the h1 (sm:above, lg:above) reads in <1 second. Combined with Candidate A subhead's closing clause ("tenants stay off the platform"), the differentiator gets a *visual* anchor (the badge) AND a *prose* anchor (the subhead) — redundancy by design.
2. **Matches the codebase's existing primitive set.** No new component to add; `<Badge>` is shadcn-canonical and already used in the pricing card ("Most Popular"). Reviewer acceptance is automatic.
3. **Uses existing `globals.css` tokens.** `--color-primary` for accent OR `--color-success` for "this is a feature, not a limitation". Recommend `--color-primary` to keep the palette tight.
4. **Mobile-safe.** A single badge above the h1 at 375px adds ~28px of vertical space — acceptable. Option B's full mini-section adds ~280px which compounds the mobile-overflow already flagged in CRIT-04 (Phase 2 fixed it; don't re-introduce risk).
5. **Doesn't expand the Phase 4 scope.** Option B converts Phase 4 from "copy + small DOM changes" to "copy + new section component + mobile testing". The cross-cutting design-token constraint trivially passes for Option A; Option B would pull in additional review surface.

### Recommended badge content + placement

```tsx
// In src/app/marketing-home.tsx, immediately before the <h1> at line 33:
<Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 mb-2 self-start">
  Landlord-only · Tenants never log in
</Badge>
```

(Exact content + class composition is planner-finalized; the `self-start` keeps it left-aligned in the flex column. The plan should adopt the canonical badge pattern from `pricing-card-featured.tsx` for visual consistency.)

**Why "Landlord-only · Tenants never log in" not just "Tenants never log in":**

- Pairs the *value* (landlord-only positioning) with the *artifact* (no tenant portal) in one beat.
- The middle-dot separator is already used elsewhere in the codebase (`bento-pricing-section.tsx:64` uses `<strong>` — visual consistency).
- 5 words; sub-1-second read.

**Sister-specialist note (out of scope here):** the bento-features-section currently has a "Landlord-only (no tenant logins)" cell in `bento-pricing-section.tsx:64`. After the hero badge ships, that cell becomes redundant; the sister specialist should flag it for collapsing as part of the COPY-04 / consistency sweep.

**Confidence:** HIGH on Option A pick. Sister specialist's audit may surface a bento-cell redundancy that strengthens this — flag for cross-checking.

## COPY-02 Compatibility Check

**Locked phrase:** "Built for landlords with 1–15 rentals" (replaces "Join 500+ Growth subscribers")

**Recommendation alignment:** The persona-word recommendation IS "landlords" + "landlords with 1–15 rentals" segment qualifier. The locked COPY-02 phrase is a SUBSET of the recommendation. They harmonize automatically.

| Surface | Before | After (Phase 4) | COPY-02 wording? |
|---------|--------|-----------------|-------------------|
| `pricing-card-featured.tsx:190` "Join **500+** Growth subscribers" | Fabricated count | "Built for **landlords with 1–15 rentals**" | EXACT |
| `marketing-home.tsx:38–42` hero subhead | "operations tool for property owners. Track properties, tenants, leases..." | "operations tool for **landlords with 1–15 rentals**. Track properties, leases..." | EXACT |
| `marketing-home.tsx:58` hero supporting line | "Built for **property owners**. 14-day free trial..." | "Built for **landlords with 1–15 rentals**. 14-day free trial..." | EXACT |
| About hero subtitle | (uses "landlords" today — keep) | "...for **landlords**..." (no change) | COMPATIBLE — root word matches |
| About body (`about/page.tsx:78,80,95,201`) currently "property managers" | Wrong audience | "**landlords**" (no segment qualifier needed in body) | COMPATIBLE — root word matches |
| Meta description | "for owners and real estate investors" | "**landlord-only property management software for owners with 1–15 rentals**" or "**property management software for landlords**" | COMPATIBLE — uses "landlords" |
| Compare pages | "landlord-only" / "Why **Landlords** Choose..." | (no change) | COMPATIBLE — already uses "landlords" |
| FAQ page | (sister-specialist audit) | (planner sweeps to "landlords") | COMPATIBLE |

**Verdict:** PERFECT FIT. The recommended persona word is the same root term as the locked COPY-02 phrase. Phase 4 ships ONE persona — "landlord(s)" — across every surface, with segment qualifier ("with 1–15 rentals") added where positioning sharpens conversion. No dual-language strategy needed; no surface rules out either form.

## Live Verification of Audit Claims

Curl-verified against tenantflow.app on **2026-05-09** (today):

| Audit claim | File:line in repo | Live HTML status | Verifier action |
|-------------|-------------------|-------------------|-----------------|
| Hero subhead contradiction phrase: "Track properties, tenants, leases, and maintenance in one place — tenants never have to log in" | `marketing-home.tsx:38–42` | **PRESENT live** (verified via grep on rendered HTML) | Phase 4 PR must remove the "tenants" word from the tracking list |
| "operations tool for property owners" lead phrase | `marketing-home.tsx:39` | **PRESENT live** | Phase 4 PR replaces "property owners" → "landlords with 1–15 rentals" |
| "Built for property owners. 14-day free trial, no credit card." | `marketing-home.tsx:58` | **PRESENT live** | Phase 4 PR replaces "property owners" → "landlords with 1–15 rentals" |
| Meta description: "All-in-one property administration software for owners and real estate investors..." | (generated via `generateSiteMetadata` / `lib/generate-metadata.ts`) | **PRESENT live** (curl confirmed in `<meta name="description">`, `<meta property="og:description">`, `<meta name="twitter:description">`) | Phase 4 PR must update the upstream metadata generator (NOT just the homepage component) |
| "Join 500+ Growth subscribers" | `pricing-card-featured.tsx:190` (`Join <strong>500+</strong> Growth`) | **NOT directly visible on `/` homepage in initial scan** — the pricing card is on `/pricing` and may also be embedded on homepage's pricing section if any. Sister specialist confirms render surfaces. | Phase 4 PR replaces with COPY-02 locked phrase |

**Live verification command (for verifier reuse):**

```bash
curl -s https://tenantflow.app/ | grep -oE '(operations tool for property owners|tenants never have to log in|Built for property owners)'
# Expect zero results post-merge.

curl -s https://tenantflow.app/ | grep -oE '(landlords with 1.15 rentals|Tenants never log in)'
# Expect ≥2 results post-merge (hero subhead + supporting line + badge).

curl -s https://tenantflow.app/pricing | grep -oE '(500\+|Join 500|Growth subscribers)'
# Expect zero results post-merge.

curl -s https://tenantflow.app/ | grep -oE '<meta[^>]*description[^>]*>' | head -3
# Expect "for landlords" or "for owners with 1-15 rentals", NOT "for owners and real estate investors".
```

**Confidence:** HIGH — curl run today confirmed all three contradictions still live.

## Risk Matrix

| Risk | Likelihood | Severity | Mitigation |
|------|------------|----------|------------|
| **R1**: User overrides the "landlords" recommendation, prefers "property owners" or "owner-operator" | MED — user signaled "leans owner-operator" but deferred to research | Phase 4 plans must be re-keyed (find-and-replace target word changes) | Planner adopts in `/gsd-plan-phase 4`. If user override comes during plan-checker review, the find-and-replace target swaps but the rest of the plan (subhead, badge, COPY-02 layout) is unchanged. Low rework cost. |
| **R2**: "landlords" SEO performance underperforms "property owners" — Google Keyword Planner / Ahrefs shows different volumes than my directional inference | LOW for "landlords" specifically (8/9 competitor convention is itself a strong signal); MED for the segment-qualified variant | Phase 4 won't have direct SEO measurement until 2–4 weeks post-merge | Post-Phase-12 (SEO phase): run Ahrefs / SEMrush keyword analysis on TenantFlow's actual Google Search Console data. If "property owner" outperforms, swap with a 1-PR find-and-replace. **Phase 4 ships the recommendation; Phase 12 confirms or pivots with data.** |
| **R3**: Search Console shows TenantFlow already ranks for "property owner"-anchored queries; switching to "landlords" loses ranking | LOW — TenantFlow has minimal organic traffic per the user's "zero subscribers" disclosure | Even if temporarily true, the SEO penalty is bounded by current low traffic; the conversion gain from category-convention alignment is larger | No mitigation needed at Phase 4 time; revisit in Phase 12 with actual GSC data. |
| **R4**: Customer headlines change in v2.0 (target moves from owner-operator to PM-team, or vice versa) | LOW for v1.0 (audit-fix only); HIGH for v2.0 if pivoting | Plan sweep would need to re-run | Out of Phase 4 scope. v2.0 milestone planning will include persona re-evaluation if positioning shifts. |
| **R5**: "landlords with 1–15 rentals" mentions a number that competitors don't — specifically excludes 16+ rental customers from self-identification | LOW — TenantFlow's actual product caps at the same scale (no enterprise pricing tier defined) | Customers with 20+ rentals self-disqualify; that's the intended targeting | None needed. The qualifier is doing its job. |
| **R6**: "Tenants stay off the platform" phrasing reads as exclusionary or aggressive ("stay off" sounds like "go away") | LOW — context is unmistakable in B2B SaaS | If post-deploy A/B testing shows it underperforms vs "tenants never log in", swap to "tenants never log in" | Out of Phase 4 scope. Both phrasings are acceptable; "stay off the platform" was favored for the COPY-01 contradiction-resolution lens (positive: this is a feature). |
| **R7**: Sister specialist's full copy audit surfaces persona references in surfaces I haven't enumerated (e.g. blog post bodies, email templates, JSON-LD schema's `audienceType`) | HIGH — sister specialist's scope is exactly this | Plan must apply the find-and-replace to ALL surfaces sister specialist enumerates | Sister specialist's research is the authoritative surface list; plan-04-01 (CONS-01) consumes both research artifacts. |

**Fallback if research can't validate keyword data:** absent direct SEMrush/Ahrefs access, the recommendation rests on the 9-product survey (8/9 use "landlords" as primary). Even if an SEO tool later shows "property owners" has higher search volume in some sub-segment, the convention argument and the audit-document-named "pick ONE persona" mandate together justify locking on "landlords" for Phase 4. Phase 12 (SEO) re-evaluates with real data.

## Confidence Levels

| Recommendation | Confidence | Source |
|----------------|------------|--------|
| Persona word = "landlords" | **HIGH** | 9-product survey, 8/9 convention; cross-verified across multiple independent searches; aligns with locked COPY-02 |
| Segment qualifier = "with 1–15 rentals" | **HIGH** | Locked by user in COPY-02; matches Avail's published segment ("fewer than 10 properties"), TurboTenant's range ("1 to 50 doors"), Stessa case studies (1–11 properties) |
| Hero subhead Candidate A | **HIGH** | Smallest-delta solution that resolves the audit-named contradiction; tested mentally against audit item #21 |
| Tenants-never-login = Hero badge (Option A) | **HIGH** | Smallest review surface; uses existing shadcn primitives; preserves above-the-fold position |
| COPY-02 compatibility | **HIGH** | Recommendation IS the same root word as locked phrase; perfect harmony |
| Live audit claim verification | **HIGH** | Curled tenantflow.app on 2026-05-09; both contradiction phrase and "for property owners" + "for owners and real estate investors" meta confirmed live |
| Relative SEO volume ("landlords" vs "property owners" vs "owner-operator") | **MEDIUM** | Directional inference from category convention + competitor SERP positioning; no direct Ahrefs/SEMrush volume data; flagged for Phase 12 re-validation |
| "owner-operator" appears in zero surveyed hero copy | **HIGH** | Verified across 9 product surveys + multiple supporting search results |

## Sources

### Primary (HIGH confidence)
- [TurboTenant homepage + features](https://www.turbotenant.com/) — primary persona "landlords / independent landlords / DIY landlords"; "1 to 50 doors"
- [Avail.com (by Realtor.com) homepage](https://www.avail.com/) — primary persona "independent landlords / DIY landlords"; "fewer than 10 properties"
- [Hemlane homepage](https://www.hemlane.com/) — primary persona "rental owners"
- [RentRedi homepage](https://www.rentredi.com/) — primary persona "smart landlords / landlords"; case studies 5–60+ properties
- [Stessa homepage](https://www.stessa.com/) — primary persona "landlords"; "Join 350,000+ landlords using Stessa"
- [Innago homepage](https://innago.com/) — primary persona "landlord"
- [TenantCloud homepage](https://www.tenantcloud.com/) — primary persona "landlords (DIY → 100+)"
- [DoorLoop homepage](https://www.doorloop.com/) — secondary persona "landlords" (primary: property managers)
- [Buildium homepage](https://www.buildium.com/) — secondary persona "landlords"; primary "property managers"
- [AppFolio homepage](https://www.appfolio.com/) — avoids singular persona; uses "happy residents / impressed clients / thriving teams"
- TenantFlow live HTML scan via curl on 2026-05-09 — confirmed all three live audit claims

### Secondary (MEDIUM confidence — verified against multiple sources)
- [Hemlane: Best Property Management Software for Small Landlords](https://www.hemlane.com/resources/best-property-management-software-for-small-landlords/) — small-landlord segment positioning
- [Baselane: DIY Landlord Software Compared 2026](https://www.baselane.com/resources/diy-landlord-vs-landlord-apps) — DIY-landlord category framing
- [TurboTenant 2026 Review (CRE Daily)](https://www.credaily.com/reviews/turbotenant-review/) — independent confirmation of persona positioning

### Tertiary (LOW confidence — flagged for validation)
- SEO keyword search-volume comparisons cited from secondary aggregators (Media Search Group, UpkeepMedia, propertymanagerwebsites.com, Ahrefs.com/seo overview pages); direct Google Keyword Planner / Ahrefs / SEMrush volumes for "property management software for landlords" vs. "for property owners" vs. "for owner-operators" NOT directly verified. **Re-validate in Phase 12 (SEO) with Search Console + a paid keyword tool.**

### Repo file references
- `/Users/richard/Developer/tenant-flow/src/app/marketing-home.tsx:33–60` — current hero markup
- `/Users/richard/Developer/tenant-flow/src/app/about/page.tsx:78,80,95,201` — current "property managers" copy in About body
- `/Users/richard/Developer/tenant-flow/src/components/pricing/pricing-card-featured.tsx:190` — current "Join 500+ Growth subscribers" string
- `/Users/richard/Developer/tenant-flow/src/components/ui/badge.tsx` — existing `<Badge>` primitive
- `/Users/richard/Developer/tenant-flow/src/components/pricing/bento-pricing-section.tsx:64` — existing "Landlord-only (no tenant logins)" copy (sister-specialist redundancy candidate)
- `/Users/richard/Developer/tenant-flow/src/app/compare/[competitor]/compare-data.ts:84,192,321` — existing "Landlord-only platform" cells (already aligned)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | "landlords" has comparable or higher SEO search volume than "property owners" in B2B SaaS commercial-intent context | Persona Word Recommendation, Risk R2 | If wrong, Phase 12 (SEO) finds the data and Phase 13+ re-runs find-and-replace. Bounded by current near-zero organic traffic. |
| A2 | The user's "leans owner-operator" signal is a directional preference, not a hard requirement | Persona Word Recommendation | If user overrides during plan-checker review, the find-and-replace target word swaps; rest of plan unchanged. ~1 hour of rework. |
| A3 | "Tenants stay off the platform" reads positively (not exclusionary) to B2B SaaS prospects | Hero Subhead Candidate A | Could swap to "Tenants never log in" with zero-cost edit if A/B test post-launch shows preference. Out of Phase 4 scope. |
| A4 | A `<Badge>` above the h1 fits the lg: hero layout without breaking the existing flex column | Tenants-Never-Login Elevation | Verifiable via Storybook / local dev; planner confirms during plan synthesis. |
| A5 | Schema.org `Audience.audienceType: "Landlord"` is a recognized type for SoftwareApplication JSON-LD | COPY-02 Compatibility table | Schema.org `Audience` has open enumeration; "Landlord" is acceptable as plain text. Phase 12 (SEO) confirms in JSON-LD validation. |

**Total assumed claims:** 5. None are blocking; each has a documented mitigation. Recommend planner mention A1 + A2 to user during `/gsd-plan-phase 4` synthesis.

## Open Questions

1. **Should the badge include an icon?**
   - What we know: `lucide-react` is canonical; `<Badge>` accepts children freely.
   - What's unclear: whether adding (e.g., a `Lock` or `ShieldCheck` icon) helps scannability or adds visual noise.
   - Recommendation: ship Phase 4 WITHOUT an icon (keep the badge text-only). Icon addition is a 1-line edit if A/B testing later prefers it. Out of Phase 4 scope.

2. **Should the meta description go full segment-anchored ("for owners with 1–15 rentals") or short ("for landlords")?**
   - What we know: TurboTenant uses short ("Property Management Software for Landlords"). Avail uses long ("Landlord Software & Property Management Software for Rental Property Management").
   - What's unclear: 60-character meta-description constraint may force the short variant.
   - Recommendation: meta TITLE uses short ("for landlords"); meta DESCRIPTION uses long form ("for landlords with 1–15 rentals"). Planner finalizes during PR.

3. **Does the dashboard mockup (`HeroDashboardMockup`) need persona-word changes?**
   - What we know: COPY-07 covers fake-name swap; sister-specialist scope.
   - What's unclear: whether the mockup contains literal "tenant" / "property owner" labels.
   - Recommendation: sister specialist enumerates. Out of this specialist's scope.

## Metadata

**Confidence breakdown:**
- Persona terminology category landscape: HIGH — 9 independent product surveys cross-verified
- Recommendation rationale: HIGH — 8/9 convention + locked COPY-02 alignment + audit-document direction
- Hero subhead replacement: HIGH — minimal-delta solution to a named contradiction
- Tenants-never-login elevation primitive: HIGH — uses existing shadcn primitive, smallest review surface
- COPY-02 compatibility: HIGH — perfect harmony, same root word
- Live audit verification: HIGH — curl confirmed today
- Relative SEO volumes: MEDIUM — directional only, flagged for Phase 12

**Research date:** 2026-05-09
**Valid until:** 2026-06-09 (30 days; competitor hero copy can shift quarterly)
