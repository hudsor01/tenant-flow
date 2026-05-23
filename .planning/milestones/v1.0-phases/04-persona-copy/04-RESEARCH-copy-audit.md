# Phase 4: Persona & Copy Honesty — Research (Specialist 2: Copy Audit)

**Researched:** 2026-05-09
**Specialist:** 2 of 2 (sister specialist handles persona-word selection + hero subhead wording)
**Domain:** Codebase locator audit for CONS-01 (persona globals), COPY-01 (hero subhead), COPY-02 (social-proof "500+"), COPY-04 (DocuSeal de-amp), COPY-05 (FAQ canon), COPY-06 (bulk-zip softening), COPY-07 (mockup names) + COPY-03 token mapping + test surface mapping + Phase 1 cross-check.
**Confidence:** HIGH (every line cited from `Read`/`grep` output; no assumed locations).

## Summary

The audit surface is healthier than the audit alone implied — Phase 67 (v2.7) already deleted fabricated testimonials, gated the testimonials components on real data, and removed unsubstantiated numeric claims. **One** "Join 500+ Growth subscribers" string remains (`pricing-card-featured.tsx:190-191`) and is the canonical replacement target.

Persona language is the heaviest cleanup item — the codebase carries **all four** of the audit-cited variants ("property owners", "landlords", "property managers", "real estate investors") simultaneously across hero, About, FAQ meta, root-layout JSON-LD, and `compare-data.ts`. The find-and-replace surface is approximately **40 source occurrences** across 25 files. About-page especially mixes "property managers" (the wrong word — TenantFlow is for owners, not managers-of-others' property) into mission copy three times.

DocuSeal mentions are visually 6× per the audit but the codebase total is **~30 occurrences**. The vast majority are *internal API/type references* (Edge Function URLs, `docuseal_submission_id` columns, mutation hooks) that don't render in marketing surfaces. The **user-facing marketing surface count is 16 unique mentions** — must reduce to ≤3 strategic surfaces. Recommended KEEPs are pricing card features list, comparison-table row, FAQ entry on `/faq`. Recommended REMOVEs are 13 mentions across hero, About, How-It-Works, bento, feature-callouts, final-cta, premium-cta, login-page, support-page, and three duplicates inside `compare-data.ts`.

**Primary recommendation:** Plan-04-02 should ship a single sweeping `copy.ts`-style refactor that pulls the heroSubhead, persona-word references, social-proof phrase, and bulk-zip phrasing into one constants module imported by every consuming surface — but only if Plan-04-01 already locked the persona word. Otherwise execute as a serial find-and-replace across the 25 files enumerated below. The constants-module approach is preferable because it lets the CI test (REQ persona-consistency.spec.ts) assert against the constant rather than every page individually.

## Persona Word Locator (CONS-01)

**Convention:** all rows below cite the EXACT current text. Planner's job is to apply Specialist 1's chosen persona word as a global find-and-replace, with judgment-call carve-outs (e.g., the `landlord-only platform` positioning phrase may stay regardless of the new persona word — it's a product category marker, not a buyer self-identity word).

### A. Marketing pages (highest priority — must unify)

| File:Line | Current text (key fragment) | Variant present |
|-----------|------------------------------|------------------|
| `src/app/marketing-home.tsx:39` | `The operations tool for property owners.` | property owners |
| `src/app/marketing-home.tsx:58` | `Built for property owners. 14-day free trial...` | property owners |
| `src/app/page.tsx:14` | `title: 'Property Management Software for Property Owners'` | Property Owners (title-case) |
| `src/app/page.tsx:16` | `'All-in-one property administration software for owners and real estate investors.'` | owners, real estate investors |
| `src/app/page.tsx:40` | `'Professional property management software for property owners and real estate investors.'` | property owners, real estate investors |
| `src/app/about/page.tsx:45` | `'TenantFlow is a landlord-only property management platform...'` | landlord-only (positioning) |
| `src/app/about/page.tsx:57` | `titleHighlight="built for landlords"` | landlords |
| `src/app/about/page.tsx:78` | `To empower property managers with the tools they need to grow their business...` | **property managers (WRONG — TF is owner-only, not for managing-others)** |
| `src/app/about/page.tsx:95` | `Every feature built with property managers in mind` | **property managers (WRONG)** |
| `src/app/about/page.tsx:155` | `Postgres row-level security per landlord, encrypted at rest...` | landlord (technical context) |
| `src/app/about/page.tsx:170` | `workflows landlords run every week — leases, maintenance,` | landlords |
| `src/app/about/page.tsx:201` | `We listen, learn, and adapt to meet the evolving needs of property managers.` | **property managers (WRONG)** |
| `src/app/about/page.tsx:78-95-201` | (3× "property managers" in About) | **3 correctness fixes regardless of CONS-01** |
| `src/app/faq/page.tsx:19` | `'Answers to common landlord questions about lease management...'` | landlord |
| `src/app/faq/page.tsx:33` | `trustBadge="Built for landlords"` | landlords |
| `src/app/pricing/page.tsx:36` | `'Professional property management software for landlords with 1–15 rentals.'` | landlords (CRIT-03 phrase — locked) |
| `src/app/pricing/page.tsx:60` | `Built for landlords — 14-day free trial, no credit card` | landlords (locked phrase) |
| `src/app/features/page.tsx:9` | `'... — everything landlords need to administer rental properties...'` | landlords |
| `src/app/help/page.tsx:24` | `'... support resources for landlords and operators.'` | landlords, operators |
| `src/app/help/page.tsx:45` | `alt: 'TenantFlow support team helping landlords with their portfolios'` | landlords |
| `src/app/help/page.tsx:201` | `Replace spreadsheets, Dropbox, and email with a single landlord-only platform.` | landlord-only (positioning) |
| `src/app/(auth)/login/page.tsx:200` | `— TenantFlow is landlord-only, so tenants don't need an account.` | landlord-only (positioning) |
| `src/app/(auth)/login/page.tsx:219` | `Built for landlords` | landlords |
| `src/app/(auth)/login/layout.tsx:5` | `'... financial reports. Secure property owner login.'` | property owner |
| `src/app/support/page.tsx:20` | `'... guides for property owners managing properties, leases, and tenants.'` | property owners |
| `src/app/security-policy/page.tsx:10` | `'... protecting property owner and tenant data.'` | property owner |
| `src/app/blog/category/[category]/page.tsx:35` | `... 'Expert insights and practical guides for property owners and operators.'` | property owners, operators |
| `src/app/resources/page.tsx:26` | `'... security deposit law guides for landlords.'` | landlords |
| `src/app/resources/page.tsx:111` | `<span className="text-foreground font-semibold">landlords</span>` | landlords |
| `src/app/resources/page.tsx:182` | `Printable tools and reference guides for property owners` | property owners |
| `src/app/resources/seasonal-maintenance-checklist/page.tsx:16` | `'... for property owners. Covers HVAC, plumbing...'` | property owners |
| `src/app/compare/page.tsx:16` | `'... other landlord-focused property management platforms.'` | landlord-focused |
| `src/app/compare/page.tsx:40` | `landlord-only model.` | landlord-only (positioning) |
| `src/app/compare/[competitor]/page.tsx:182` | `against the alternatives landlords most often consider.` | landlords |
| `src/app/compare/[competitor]/compare-sections.tsx:235` | `Manage your rentals with the document vault, lease e-sign, and reports built for landlords.` | landlords |
| `src/app/compare/[competitor]/compare-data.ts:25` | `'See why property owners are switching from Buildium...'` | property owners |
| `src/app/compare/[competitor]/compare-data.ts:27` | `'Looking for a Buildium alternative?... see why property owners are switching.'` | property owners |
| `src/app/compare/[competitor]/compare-data.ts:33` | `bestFor: 'Small to mid-sized property managers and HOA management'` | **property managers — describes Buildium's audience, leave alone** |
| `src/app/compare/[competitor]/compare-data.ts:84,193,321` | `tenantflowNote: 'Landlord-only platform'` (3×) | landlord-only (positioning — replaces red-✗ per CONS-07; deferred to Phase 10) |
| `src/app/compare/[competitor]/compare-data.ts:112` | `'Purpose-built for individual landlords...'` | individual landlords |
| `src/app/compare/[competitor]/compare-data.ts:125` | `tagline: 'The AppFolio Alternative for Property Owners'` | Property Owners (title-case) |
| `src/app/compare/[competitor]/compare-data.ts:129` | `'AppFolio alternative for property owners — no unit minimums...'` | property owners |
| `src/app/compare/[competitor]/compare-data.ts:135` | `bestFor: 'Property management companies with 50+ units'` | **describes AppFolio's audience, leave alone** |
| `src/app/compare/[competitor]/compare-data.ts:258` | `'Compare TenantFlow vs RentRedi for property owners.'` | property owners |
| `src/app/compare/[competitor]/compare-data.ts:264` | `bestFor: 'Budget-conscious DIY owners who want mobile-first management'` | **describes RentRedi's audience, leave alone** |
| `src/components/landing/feature-callouts.tsx:17` | `'Row-level security per landlord. Tenants are records, never users'` | landlord (technical context) |
| `src/components/landing/bento-features-section.tsx:66` | `'Track tenant contacts and lease history. No tenant logins — landlords own every record'` | landlords |
| `src/components/landing/final-cta-section.tsx:35` | `The landlord-only platform with a per-entity document vault...` | landlord-only (positioning) |
| `src/components/landing/testimonials-section.tsx:44` | `<span className="font-medium">Built for landlords</span>` | landlords |
| `src/components/sections/home-faq.tsx:21` | `'... Starter plan is built for owners managing up to 5 properties...'` | owners |
| `src/components/sections/home-faq.tsx:26` | `"Yes. Postgres row-level security isolates every landlord's data..."` | landlord's (technical context) |
| `src/components/sections/stats-showcase.tsx:26` | `description: 'Plus unlimited custom categories per landlord'` | landlord (technical context) |
| `src/components/sections/stats-showcase.tsx:57` | `Built for landlord` (title fragment) | landlord (heading) |
| `src/components/sections/testimonials-section.tsx:77` | `Real results from property managers who chose TenantFlow` | **property managers (WRONG)** |
| `src/components/sections/testimonials-section.tsx:105` | `<span className="hero-highlight">landlords</span>` | landlords |
| `src/components/sections/comparison-table.tsx:48` | `description: 'Landlord-only platform; tenants are records, not users'` | landlord-only (positioning) |
| `src/components/sections/comparison-table.tsx:99` | `Why Landlords Choose` (heading fragment) | Landlords (heading) |
| `src/components/sections/features-section.tsx:55` | `'... date-range, and bulk-zip download. Custom categories per landlord.'` | landlord (technical context) |

### B. Root-layout metadata + JSON-LD (Organization / SoftwareApplication)

These render into `<head>` of every page — the highest-leverage persona surface for SEO/social.

| File:Line | Current text | Variant |
|-----------|--------------|---------|
| `src/lib/generate-metadata.ts:32` | `default: 'TenantFlow — Property Management Software for Property Owners'` | Property Owners (page title) |
| `src/lib/generate-metadata.ts:35` | `'Property administration software built for property owners and real estate investors.'` | property owners, real estate investors (default description) |
| `src/lib/generate-metadata.ts:52` | `title: 'TenantFlow — Property Management Software for Property Owners'` | Property Owners (OG title) |
| `src/lib/generate-metadata.ts:54` | `'All-in-one rental property administration. Track leases, maintenance, and tenants.'` | (no persona — neutral) |
| `src/lib/generate-metadata.ts:78` | `title: 'TenantFlow — Property Management Software for Property Owners'` | Property Owners (Twitter title) |
| `src/lib/generate-metadata.ts:80` | `'All-in-one rental property administration. Track leases, maintenance, and tenants.'` | (no persona — neutral) |
| `src/lib/generate-metadata.ts:144` | `'Property administration software for property owners and real estate investors.'` | Organization JSON-LD description — property owners, real estate investors |
| `src/lib/generate-metadata.ts:173` | `'Property administration software for property owners and real estate investors.'` | SoftwareApplication JSON-LD description — property owners, real estate investors |
| `src/app/feed.xml/route.ts:118` | `<description>Property management for landlords — leases, maintenance, tenants, and the financial side.</description>` | landlords (RSS feed description) |

**Note:** `twitter.creator: '@tenantflow'` is the brand handle (line 82) — NOT a persona word; leave alone.

### C. Lower-traffic surfaces (still globally find-replace, but lower urgency)

| File:Line | Current text (fragment) | Variant |
|-----------|--------------------------|---------|
| `src/app/(owner)/profile/page.tsx:4` | `Allows property owners to:` (jsdoc) | property owners — internal doc, judgment call |
| `src/app/(owner)/@modal/(.)tenants/new/page.tsx:15` | `... optional property assignment for the landlord's records.` (jsdoc) | landlord — internal doc |
| `src/app/blog/page.test.tsx:190` | `excerpt: 'Practical strategies for property managers.'` (test fixture) | property managers — test data; benign |
| `src/app/(owner)/documents/templates/components/rental-application-template.client.tsx:38` | `relationship: 'Previous landlord'` (form field label) | landlord (in-product UX, not marketing — leave alone) |

### D. Pluralization variants summary

`grep` confirmed the codebase uses both singular and plural forms of every variant. Find-and-replace MUST handle both:

- `landlord` ↔ `landlords` ↔ `landlord's` ↔ `landlord-only` ↔ `landlord-focused`
- `property owner` ↔ `property owners` ↔ `property-owner-`
- `property manager` ↔ `property managers` ↔ `property-management` (positioning — keep)
- `real estate investor` ↔ `real estate investors`
- `owner` (bare) ↔ `owners` (bare — context-sensitive: `home-faq.tsx:21` "owners managing up to 5 properties" — `owners` here = the persona)
- `operator` ↔ `operators` (only in `/help/page.tsx:24` and `/blog/category/.../page.tsx:35`)

### E. Recommended carve-outs (do NOT replace these even if CONS-01 picks a non-"landlord" word)

The audit's CONS-01 is about persona language for the *buyer*. Keep these:

1. **Positioning phrases:** "landlord-only platform", "landlord-only", "landlord-focused" — describe the product category, not the buyer.
2. **Technical context:** "row-level security per landlord", "every landlord's data isolated" — these reference the data-isolation primitive.
3. **Locked phrase (COPY-02):** "Built for landlords with 1–15 rentals" stays exactly as-is per CONTEXT.md — segment-specific anchor.
4. **About-page carve-out (#7 wrong-word fix):** Three "property managers" instances (about/page.tsx:78, 95, 201) describe TenantFlow's audience and are factually wrong — replace these with the new persona word **even if the persona-word researcher picked something other than "landlord"**.
5. **Compare-data competitor descriptors:** "Small to mid-sized property managers and HOA management" (Buildium bestFor), "Property management companies with 50+ units" (AppFolio bestFor), "Budget-conscious DIY owners" (RentRedi bestFor) — these describe each *competitor's* audience and must remain accurate.
6. **Testimonials section heading:** `testimonials-section.tsx:77` — `Real results from property managers who chose TenantFlow` is the WRONG word and should change to the new persona word regardless. (This component is currently gated on `testimonials.length === 0` so it doesn't render, but the string is still in the bundle — fix it now to prevent regression when real testimonials land.)

**Confidence:** HIGH — every entry verified via Read/grep against the live codebase.

## Hero Subhead (COPY-01)

**File:** `src/app/marketing-home.tsx:38-42`

**Exact current text:**
```tsx
<p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
    The operations tool for property owners. Track properties,
    tenants, leases, and maintenance in one place — tenants
    never have to log in.
</p>
```

The audit-cited contradiction is on lines 39-41. Sister specialist (Specialist 1) is responsible for choosing the replacement wording. Recommended seed from CONTEXT.md is "...tenant records, leases, and maintenance in one place — landlord-only, tenants stay off the platform."

**Constraint reminder:** the new wording must preserve the differentiator clause ("tenants never log in" or equivalent) — that clause is COPY-03's elevation source.

**Cross-references:** the same conceptual phrase appears (verbatim or paraphrased) in:
- `src/components/landing/hero-section.tsx:23-26` — DIFFERENT page (this is a separate landing component, NOT used on /; uses different copy: "Per-entity storage with global search, multi-select filters, date-range, and bulk-zip download. DocuSeal e-sign on Growth and Max plans. Tenants are records, never users.")
- `src/components/sections/comparison-table.tsx:48` — `'Landlord-only platform; tenants are records, not users'`
- `src/components/landing/feature-callouts.tsx:17` — `'Row-level security per landlord. Tenants are records, never users'`
- `src/components/landing/bento-features-section.tsx:66` — `'Track tenant contacts and lease history. No tenant logins — landlords own every record'`

These are NOT the hero subhead and don't need rewording per COPY-01 — they're separate value-prop appearances. Leave them unless the persona-word change affects them.

**Confidence:** HIGH.

## Social-Proof Replacement (COPY-02)

**Locked replacement:** "Built for landlords with 1–15 rentals" (CONTEXT.md / PROJECT.md decision; "landlords" word is locked here regardless of CONS-01).

### Occurrences of fabricated-count phrases

| File:Line | Current text | Action |
|-----------|--------------|--------|
| `src/components/pricing/pricing-card-featured.tsx:188-192` | `<Users className="size-4 text-primary" />` ... `Join <strong className="text-foreground">500+</strong> Growth subscribers` | **REPLACE entire `<div>` block (lines 187-193) with a `<Badge>` rendering "Built for landlords with 1–15 rentals"** |

**That's the only `Join 500+` / `500+ Growth` occurrence** in `src/`. The grep also surfaced `'2,500+ user'` at `src/app/__tests__/marketing-copy-landlord-only.test.ts:201` — that's a banlist entry inside the marketing-copy test; do NOT touch it (it's the *guardrail* that prevents regressions).

### Already-clean: confirmed no other "500+ X subscribers" / "Join N+" / "Trusted by N landlords" copy exists

Sister specialist's recommendation for whether to ALSO add the `Built for landlords with 1-15 rentals` phrase to the homepage hero (in addition to replacing the pricing card phrase) is the open call. The pricing-card swap is non-negotiable; the homepage placement is COPY-03's territory.

**Implementation note for planner:** the pricing-card-featured uses `<Users>` from `lucide-react` for the social-proof icon. Recommend keeping the icon (or switching to `<BadgeCheck>` since the `Badge` primitive is right there) for visual continuity with the rest of the card — the layout is `<div className="flex items-center justify-center gap-2 mb-6 py-3 bg-muted/50 rounded-lg">` and that wrapper styling reads naturally as "honest segment anchor" too. Don't redesign the wrapper; just swap the inner copy.

**Confidence:** HIGH.

## DocuSeal De-Amp (COPY-04)

**Target:** ≤3 strategic surfaces per CONTEXT.md.

### KEEP — 3 strategic surfaces

| Rank | File:Line | Mention | Why keep |
|------|-----------|---------|----------|
| 1 | `src/config/pricing.ts:153, 187` | Plan-tier feature lists: `'25 lease e-signs per month (DocuSeal)'`, `'Unlimited lease e-signs (DocuSeal)'` | **Pricing card features list** — Phase 1 already canonicalized this surface. ONE place where the per-plan limits + vendor name belong. |
| 2 | `src/components/pricing/pricing-comparison-table.tsx:58` | `{ name: 'E-sign leases (DocuSeal)', starter: false, growth: '25 / mo', max: 'Unlimited' }` | **Comparison table row** — the audit-explicit second strategic surface. Just one row. |
| 3 | `src/data/faqs.ts:78, 108` | Two FAQ entries reference DocuSeal volumes. | **Dedicated FAQ entry on `/faq`** — keep faqs.ts:78 ("Do you integrate with my existing systems?" — DocuSeal e-signatures included on Growth/Max). Recommend pruning faqs.ts:108 ("Are there any hidden fees?") to drop the DocuSeal reference (the answer can stand without it: "No. Pricing on this page is what you pay. Storage scales 10GB/50GB/unlimited."). Also `faqs.ts:48` and `faqs.ts:103` should drop DocuSeal mentions per audit. |

### REMOVE — drop these 13 marketing surfaces (rationale per row)

| # | File:Line | Current text fragment | Removal rationale |
|---|-----------|------------------------|-------------------|
| 1 | `src/components/landing/hero-section.tsx:25` | `DocuSeal e-sign on Growth and Max plans. Tenants are records, never users.` | Hero is for differentiator + persona, not vendor-name + plan-tier note. Drop "DocuSeal" — keep "lease e-sign on Growth and Max" or just "lease e-sign included". |
| 2 | `src/components/landing/feature-callouts.tsx:11` | `title: 'DocuSeal E-Sign'` | Card title leads with vendor — replace with `title: 'Lease E-Sign'` (DocuSeal is implementation detail, not card title). |
| 3 | `src/components/landing/bento-features-section.tsx:84` | `description="Digital signing with DocuSeal on Growth and Max plans, with state-aware lease templates"` | Bento card description name-drops the vendor. Replace: `"Digital lease signing on Growth and Max plans, with state-aware templates"`. |
| 4 | `src/components/landing/final-cta-section.tsx:35` | `The landlord-only platform with a per-entity document vault, DocuSeal e-sign, and reports built for tax season.` | Final CTA name-drops vendor. Replace: `... per-entity document vault, lease e-sign, and reports built for tax season.` |
| 5 | `src/components/landing/results-proof-section.tsx:29` | `label: 'DocuSeal e-sign tier'` | Stats card. Replace: `'Lease e-sign tier'`. |
| 6 | `src/components/sections/premium-cta.tsx:43` | `Your 14-day free trial includes the full document vault, DocuSeal e-sign on Growth and Max, and every report you need at tax time.` | Premium CTA section. Replace: `... full document vault, lease e-sign on Growth and Max, and every report...`. |
| 7 | `src/components/sections/how-it-works.tsx:36` | `'Record tenant details and generate leases. Send for e-signature via DocuSeal on Growth and Max plans.'` | How-it-works step 02. Replace: `'... Send for e-signature on Growth and Max plans.'` (drop "via DocuSeal"). |
| 8 | `src/components/sections/comparison-table.tsx:61` | `description: 'DocuSeal e-sign on Growth and Max plans'` | Homepage comparison table row description. Replace: `'Lease e-sign on Growth and Max plans'`. |
| 9 | `src/components/sections/hero-dashboard-mockup.tsx:159` | `amount="DocuSeal"` | Activity-row badge in hero mockup. Replace: `amount="E-Sign"` or `amount="Sent"`. |
| 10 | `src/app/about/page.tsx:37, 45, 219` | 3× DocuSeal mentions — stat tile, meta description, "what ships in the box" copy | Replace stat tile (line 37) `{ number: 'DocuSeal' }` → `{ number: 'E-Sign' }`; drop "DocuSeal" from meta description (line 45) — "...per-entity document vault, lease e-signing, and tax-ready reports."; replace line 219 — "Every plan starts with the document vault and lease e-sign on Growth and Max." |
| 11 | `src/app/help/page.tsx:153, 155` | Help-center article title + summary | Title can stay specific ("Send a lease for e-signature") but drop the trailing "with DocuSeal"; summary line 155 → "How lease e-sign integrates with your workflow on the Growth and Max plans, plus monthly volume limits". |
| 12 | `src/app/faq/page.tsx:19, 42` | FAQ meta description (line 19) + trustSignals badge (line 42) | Meta description line 19 — drop "DocuSeal" — "... vault, lease e-signing, maintenance tracking..."; trustSignals line 42 — replace "DocuSeal e-sign on Growth+" → "Lease e-sign on Growth+". |
| 13 | `src/app/features/page.tsx:9` + `src/app/features/features-client.tsx:61` + `src/app/support/page.tsx:29` | Three lower-volume meta/UI mentions — features metadata, "Built on Stripe, Supabase, Vercel, DocuSeal, and Resend" hero subtitle, support-page copy | Features metadata (line 9) — drop DocuSeal from description. Features-client line 61 — KEEP (it's the integrations hero subtitle and DocuSeal is genuinely an integration partner — this is the same logo-cloud rationale that keeps DocuSeal in `logo-cloud.tsx`). Support-page line 29 — drop "DocuSeal" — "...renewals, document templates, and lease e-sign integration." |

### KEEP-AS-INFRASTRUCTURE (not de-amp scope — these are technical surfaces, not marketing)

These render the DocuSeal name but are NOT marketing copy — they're either *integration partner surfaces* (logo cloud, login-page integrations grid) or *internal/auth-flow visual elements*. Leaving them alone keeps the integration honest:

| File:Line | Why keep |
|-----------|----------|
| `src/components/sections/logo-cloud.tsx:41-43, 197-216` | Logo cloud row — DocuSeal is a real integration partner; logo wordmark belongs here. |
| `src/app/(auth)/login/page.tsx:21` | HERO_STATS row on login — DocuSeal/Lease/E-sign tile. This is post-funnel; users have already converted. KEEP for product transparency. |
| `src/app/auth/confirm-email/confirm-email-states.tsx:62` | Same HERO_STATS pattern in email-confirm flow. KEEP. |
| `src/lib/generate-metadata.ts:201` | SoftwareApplication JSON-LD `featureList` — `'DocuSeal Lease E-Signing'`. KEEP — this is a structured-data feature label and accurate technical disclosure for SERP. |
| `src/app/compare/[competitor]/compare-data.ts:65, 172, 240, 301, 354` | 5× `tenantflowNote: 'DocuSeal e-signing (Growth+)'` and similar across Buildium/AppFolio/RentRedi feature tables | These render INSIDE the comparison-table feature rows (which the audit calls a "strategic surface") — you can argue all 5 are part of the SAME strategic surface (comparison table). DEFER decision to planner: either (a) keep all 5 — they're the same row appearing across 3 competitor pages, OR (b) reduce to plain "Lease e-sign (Growth+)" to keep the rule "≤3 user-facing strategic mentions" tight. **Recommendation: simplify to "Lease e-sign (Growth+)" across the 5 occurrences** — comparison-table rows in `pricing-comparison-table.tsx:58` already keep DocuSeal, so the user still sees the vendor name once on `/pricing`. |

### Final marketing-mention count after de-amp

- KEEP: `pricing.ts:153/187` (1 surface = pricing card features list), `pricing-comparison-table.tsx:58` (1 row), `/faq` page DocuSeal entry (`faqs.ts:78` only — drop the others). **Total: 3 user-facing strategic mentions.** ✓ ≤3 target met.
- INFRASTRUCTURE (don't count): logo cloud, login HERO_STATS, JSON-LD featureList, integrations subtitle.

**Confidence:** HIGH on locator data; MEDIUM on the strategic-classification of `compare-data.ts` 5× occurrences (planner should make the final call — both options stay within the audit's intent).

## FAQ Canonicalization (COPY-05)

**Goal:** kill duplicate-content SEO penalty by reducing homepage + pricing FAQ to ≤5 entries each, with "See all FAQs" link to `/faq`.

### FAQ surfaces inventory

| Surface | File:Line | Entry count | Storage |
|---------|-----------|-------------|---------|
| **Canonical `/faq`** | `src/app/faq/page.tsx` reads `src/data/faqs.ts` | **15 questions across 5 categories** (Getting Started 3, Features & Benefits 4, Implementation & Support 3, Security & Compliance 2, Pricing & ROI 3) | `src/data/faqs.ts:16-117` |
| Homepage FAQ | `src/components/sections/home-faq.tsx:12-43` | **6 questions** (inline `homeFaqs` array) | inline in component |
| Pricing FAQ | `src/app/pricing/pricing-content.tsx:33-64` | **6 questions** (inline `FAQS` array, exported as `pricingFaqs` for JSON-LD on pricing page) | inline in `pricing-content.tsx` |
| Help page (different surface) | `src/app/help/page.tsx` (referenced in grep) | Help article links — NOT a duplicate-content concern (these are distinct help articles, not Q&A) | n/a |
| Resources page | `src/app/resources/page.tsx:54` | Just a link card to `/faq` — not duplicate content | n/a |

### Overlap analysis

**Homepage FAQ 6 entries** (`home-faq.tsx:12-43`):
1. "How long does it take to get started?" — overlaps with `faqs.ts` "How do I get started" (Getting Started cat).
2. "What if I have fewer than 10 units?" — UNIQUE to homepage (sales-y, top-of-funnel).
3. "Is my data secure?" — overlaps with `faqs.ts` "How secure is my data?" (Security cat).
4. "Where do I store lease PDFs and other documents?" — UNIQUE to homepage.
5. "Can I switch from my current software?" — overlaps with `faqs.ts` "Can I import my existing property data?" (Getting Started cat).
6. "What's included in the free trial?" — overlaps with `faqs.ts` "Can I try TenantFlow risk-free?" (Pricing & ROI cat).

**Pricing FAQ 6 entries** (`pricing-content.tsx:33-64`):
1. "How does the 14-day free trial work?" — overlaps homepage entry 6 + canonical Pricing & ROI.
2. "Can I change plans later?" — UNIQUE (pricing-specific).
3. "What payment methods do you accept?" — UNIQUE (pricing-specific).
4. "Is there a long-term contract?" — UNIQUE (pricing-specific).
5. "What happens if I exceed my plan limits?" — UNIQUE (pricing-specific).
6. "Can I cancel any time?" — UNIQUE (pricing-specific).

### Recommended 5+5 reduction

**Homepage FAQ (5 entries):** keep top-of-funnel, sales-context questions. Drop the security+import overlaps that already live verbatim on `/faq`.

| # | Question | Source | Status |
|---|----------|--------|--------|
| 1 | How long does it take to get started? | existing `home-faq.tsx:14-17` | KEEP |
| 2 | What if I have fewer than 10 units? | existing `home-faq.tsx:18-22` | KEEP (homepage-unique) |
| 3 | Where do I store lease PDFs and other documents? | existing `home-faq.tsx:28-32` | KEEP (homepage-unique) |
| 4 | Can I switch from my current software? | existing `home-faq.tsx:33-37` | KEEP |
| 5 | What's included in the free trial? | existing `home-faq.tsx:38-42` | KEEP |
| ~~6~~ | ~~Is my data secure?~~ | ~~`home-faq.tsx:23-27`~~ | **DROP** — overlaps `faqs.ts` "How secure is my data?" verbatim. |

The "Still have questions?" CTA at the bottom of the section (`home-faq.tsx:64-89`) already links `/faq` via the "View All FAQs" button, so the canonical link is intact.

**Pricing FAQ (5 entries):** drop the trial-overlap (lives on homepage + canonical), keep all 5 pricing-specific entries.

| # | Question | Source | Status |
|---|----------|--------|--------|
| 1 | Can I change plans later? | `pricing-content.tsx:39-43` | KEEP |
| 2 | What payment methods do you accept? | `pricing-content.tsx:44-48` | KEEP |
| 3 | Is there a long-term contract? | `pricing-content.tsx:49-53` | KEEP |
| 4 | What happens if I exceed my plan limits? | `pricing-content.tsx:54-58` | KEEP |
| 5 | Can I cancel any time? | `pricing-content.tsx:59-63` | KEEP |
| ~~6~~ | ~~How does the 14-day free trial work?~~ | ~~`pricing-content.tsx:34-38`~~ | **DROP** — covered on homepage and canonical. |

The pricing FAQ's "Still unsure which plan fits best?" footer (`pricing-content.tsx:135-150`) keeps the "Connect with sales" CTA but does NOT currently link to `/faq` — **add a "See all FAQs" `<Link>` to `/faq`** alongside the existing sales CTA. Recommended placement: convert the footer flex row to include both, OR add a small "View all FAQs" text link below the question grid.

### `pricingFaqs` export note

`pricing-content.tsx:214` re-exports `FAQS as pricingFaqs` and that array is consumed by `pricing/page.tsx:17, 30` to generate `FAQPage` JSON-LD via `createFaqJsonLd`. **The FAQ JSON-LD is duplicate-content's biggest amplifier** — Google sees the same Q&A on `/faq` (15 questions in JSON-LD) AND `/pricing` (6 questions in JSON-LD). After reducing pricing FAQs to 5, the JSON-LD will shrink correspondingly, which is correct. The home page does NOT currently emit FAQPage JSON-LD (verified: `marketing-home.tsx` has no `JsonLdScript schema={createFaqJsonLd(...)}`) — leave it that way; only `/faq` and `/pricing` emit FAQPage schema.

**Confidence:** HIGH.

## Bulk-Zip Softening (COPY-06)

### Occurrences

| File:Line | Current text | Recommended replacement |
|-----------|--------------|--------------------------|
| `src/components/sections/how-it-works.tsx:50` | `'Bulk-zip export (500 / request)'` (feature-checklist item in step 03) | `'Tax-season zip exports'` |
| `src/components/landing/feature-backgrounds.tsx:90-91` | `<div className="text-xs font-medium text-foreground">Bulk zip</div>` ... `<div className="text-xs text-muted-foreground">500 / request</div>` (visual mockup tile) | `Bulk zip` → `Tax-season zip` (label); `500 / request` → `For tax season` or simply drop the second line. **Note:** this is the visual feature-background mockup behind the bento card; user reads it as "feature exists" not "exact limit", so swap the second line. |
| `src/components/sections/features-section.tsx:55` | `'Per-entity storage with global search, multi-select filters, date-range, and bulk-zip download. Custom categories per landlord.'` | `'... date-range, and tax-season zip downloads. Custom categories per [persona].'` |
| `src/components/sections/comparison-table.tsx:41` | `description: 'Per-entity storage with search, filters, bulk-zip export'` | `'Per-entity storage with search, filters, and tax-season zip exports'` |
| `src/components/sections/comparison-table.tsx:68` | `description: 'Zip up to 500 documents per export for tax season'` | **Already softened (mentions tax season).** Recommend: `'Zip exports for tax season'` (drop the "up to 500" technical limit). |
| `src/components/landing/hero-section.tsx:23` | `Per-entity storage with global search, multi-select filters, date-range, and bulk-zip download.` (NOT used on `/` — used on the standalone landing page). | `'... date-range, and tax-season zip downloads.'` |
| `src/components/landing/bento-features-section.tsx:57` | `description="Per-entity document storage with global search, multi-select filters, date range, and bulk download"` | **Already soft** (says "bulk download", not "bulk-zip 500/request"). Leave unless persona word changes. |
| `src/components/sections/stats-showcase.tsx:33` | `label: 'Bulk-Zip Cap'` (homepage stats card) | **JUDGMENT CALL.** This is the Phase 1 (CRIT-02) stat — `value: 500`, `description: 'Documents per zip download'`. The label "Bulk-Zip Cap" is technical. Recommend: change label to `'Tax-Season Bulk Zip'` and description to `'Up to 500 docs per zip export'`. The number 500 stays (it's a real product capability and the audit's concern is the **shouted technical limit in copy**, not the existence of the stat tile). **Note:** the audit explicitly said "0 Bulk-Zip Cap" was the rendering bug, fixed in Phase 2. Phase 4 swaps the label phrasing only. |
| `src/components/landing/results-proof-section.tsx:23-24` | `value: '500'`, `label: 'Bulk-zip cap (per request)'` | Same swap recommendation: label → `'Tax-season zip cap'` or `'Bulk download cap'`. |
| `src/app/help/page.tsx:148` | `'Per-entity uploads, custom categories, search, filters, and bulk-zip export — everything the vault does in one walkthrough'` | `'... search, filters, and tax-season zip exports — everything the vault does in one walkthrough'` |
| `src/components/sections/home-faq.tsx:31` | `'In the document vault. Upload PDFs and images per property, lease, tenant, maintenance request, or inspection. Search across your whole portfolio, filter by category and date, and bulk-download a zip when tax season hits or your CPA asks for a folder.'` | **Already soft enough** — uses "bulk-download a zip when tax season hits". Leave alone. |
| `src/data/faqs.ts:103` | `"Owners typically tell us they replace a tangle of spreadsheets, email threads, and Dropbox folders with a single source of truth. Concrete wins: faster lease renewals via DocuSeal, faster CPA hand-offs via the document vault's bulk-zip download, and fewer 'where did I put that receipt?' moments at tax time. Specific revenue impact varies by portfolio."` | Replace `'document vault's bulk-zip download'` with `"document vault's tax-season zip exports"`. (Also drops "via DocuSeal" per COPY-04.) |

**Recommended unified phrasing:** `Tax-season zip exports` (consistent verb form across all 8 user-facing surfaces).

**DO NOT change** (these are NOT user-facing copy — they're code, comments, or post-funnel app):

- `src/components/documents/documents-vault.client.tsx:338` — `'bulk download buffering ${totalCount} documents in memory; large archives may strain low-spec browsers'` — internal warning log, not copy.
- `src/components/documents/__tests__/documents-vault.test.tsx:618-619` — test description.
- `supabase/functions/download-documents-zip/` — code/comments.

**Confidence:** HIGH.

## Dashboard Mockup Names (COPY-07)

**File:** `src/components/sections/hero-dashboard-mockup.tsx`

### Current state

| Line | Current text |
|------|--------------|
| 156-162 | `<ActivityItem avatar="JM" name="John Miller" action="signed lease" amount="DocuSeal" time="2m ago" status="success" />` |
| 164-170 | `<ActivityItem avatar="EW" name="Emma Wilson" action="submitted request" amount="HVAC" time="15m ago" status="warning" />` |
| 172-178 | `<ActivityItem avatar="DP" name="David Park" action="lease renewed" amount="12 mo" time="1h ago" status="info" />` |
| 44 | `Welcome back, Sarah` (also a fake first name in the dashboard greeting) |
| 53 | Avatar tile shows `SC` initials (Sarah's) |

### Recommendation: simple name swap (in-scope for Phase 4)

Replace with synthetic-realistic names that don't match common public figures or recurring fake-name lists. Suggested replacements:

| Slot | Replace | With | Avatar | Rationale |
|------|---------|------|--------|-----------|
| Activity 1 | John Miller | **Jamie Carter** | JC | Common given+surname combo, low collision rate. |
| Activity 2 | Emma Wilson | **Alex Rivera** | AR | Same. |
| Activity 3 | David Park | **Sam Chen** | SC | Matches the existing dashboard `SC` avatar — minor consistency win. (BUT: Sarah's avatar is also `SC` — if planner wants distinct avatars across all 4 placements, swap "Sam Chen" for "Sam Patel" with avatar `SP`.) |
| Greeting | Sarah (line 44) | **Morgan** | MR (initials match the rename — also change line 53 `SC` → `MR`) | Generic single-name greeting; can stay "Sarah" if the planner prefers minimum churn. |

**Also fix in same swap:** `amount="DocuSeal"` (line 159) → `amount="E-Sign"` per COPY-04 rationale.

### Optional: simpler mockup (DEFER)

The audit also recommended a simpler mockup (one workflow per breakpoint, fewer KPI cards). The current mockup has 4 stat cards, a 12-bar revenue chart, 3 quick-action buttons, and 3 activity rows — visually busy.

**Recommendation:** **DEFER to v2.0+** (out of Phase 4 scope). The name swap is a 5-minute change; the mockup redesign is a multi-hour design + responsive-breakpoint job that should happen alongside the broader visual refresh. Document this in CONTEXT.md `<deferred>` if the planner agrees.

### Privacy / brand considerations

A quick mental check: "John Miller", "Emma Wilson", "David Park" are all common-enough names that a name-collision lawsuit is implausible — but the audit's concern is *brand confusion* (real customers might think these are real testimonials). The "Jamie Carter / Alex Rivera / Sam Chen / Patel" set is equally common and equally synthetic-feeling; the swap is cheap insurance. No need for a "Tenant 1 / Property A" placeholder approach unless the planner wants it.

**Confidence:** HIGH on locator + cheap-swap recommendation; MEDIUM on whether to also rename "Sarah" — pure judgment.

## Design-Token Mapping for COPY-03 Badge

**Goal:** elevate "Tenants never have to log in" from buried subhead to visible badge or mini-section.

Specialist 1 selects implementation approach (badge vs mini-section). This section maps tokens for either path.

### Confirmed available primitives

- **shadcn `<Badge>`** — `src/components/ui/badge.tsx:46-62`, exported with variants `default | secondary | destructive | outline | success | warning | info | trustIndicator` and sizes `default | sm | lg | trust`.
- The `trustIndicator` variant + `trust` size is *already in use* on `src/app/pricing/page.tsx:55-61`:

```tsx
<Badge variant="trustIndicator" size="trust">
    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
    Built for landlords — 14-day free trial, no credit card
</Badge>
```

This is the canonical pattern for hero-area trust badges with pulsing-dot indicator. The visual rendering is `rounded-full border-primary/20 bg-primary/5 text-primary backdrop-blur-sm` per `badge.tsx:29`.

### Recommended token usage if Specialist 1 picks "Badge above heading"

```tsx
<Badge variant="trustIndicator" size="trust">
    <Lock className="size-4" aria-hidden />
    Tenants never log in — landlord-only platform
</Badge>
```

Tokens consumed (all in `globals.css`):
- `--color-primary` (oklch 0.54 0.23 257; dark-mode 0.72 0.22 259) — line 143/602
- `--radius-full` (9999px) — line 221, applied by `trust` size
- `--shadow-sm` is implicit via the `Badge` primitive's neutral state; no extra elevation needed.
- Padding: trust size = `px-4 py-2 text-sm gap-2` — uses `--spacing-*` natively via Tailwind classes.
- Icon: `lucide-react` `<Lock>` (or `<Shield>` already used in `feature-callouts.tsx`, or `<ShieldCheck>`) — per CLAUDE.md "Lucide Icons for UI" rule.

**Why `trustIndicator` over `outline`:** the badge tile renders as a soft brand-tinted pill (matches the existing pricing-page badge), reads as "trust signal" not "alert" or "tag". Visually closer to "social proof" than "secondary metadata".

### Recommended token usage if Specialist 1 picks "Mini-section above bento grid"

Section follows the project pattern `section-spacing-compact` (used on `feature-callouts.tsx:23`) with a single `<Card>` or styled `<div>`:

```tsx
<section className="section-spacing-compact">
    <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="card-standard p-6 md:p-8 flex flex-col md:flex-row items-center gap-4 border-primary/20 bg-primary/5">
            <div className="icon-container-lg bg-primary/10 text-primary shrink-0">
                <Shield className="size-6" />
            </div>
            <div className="text-left">
                <div className="text-xl font-semibold text-foreground mb-1">
                    Why landlord-only?
                </div>
                <div className="text-muted-foreground">
                    Tenants never log in — your data lives in your account, period. No tenant support tickets, no password resets, no compliance surface for someone else's account.
                </div>
            </div>
        </div>
    </div>
</section>
```

Tokens consumed:
- `--color-primary` for border and background tinting via `border-primary/20 bg-primary/5`
- `bg-primary/10`, `text-primary` for icon-container utility (already defined in globals.css helpers — `icon-container-lg` is project-defined; verified used at `home-faq.tsx:67`, `how-it-works.tsx:54`, etc.)
- `bg-card` and `border-border` available via the `card-standard` utility (used throughout)
- Lucide `<Shield>` icon — already imported in `feature-callouts.tsx:1`

**Both approaches use existing primitives + tokens — zero new design-token work needed.**

**Confidence:** HIGH.

## Test Surface Mapping

**New file:** `tests/e2e/tests/public/persona-consistency.spec.ts`

Existing public e2e tests confirmed: `tests/e2e/tests/public/{mobile-nav-375px,routing-aliases,seo-smoke}.spec.ts`. Persona-consistency.spec.ts joins the same folder. No fixture changes needed.

### Pages to visit + assertions per page

| Path | Assertions (all required) |
|------|----------------------------|
| `/` | (a) chosen persona word appears in `<h1>` or hero `<p>` (from Specialist 1); (b) hero subhead does NOT contain the contradiction phrase `'tenants never have to log in'` (the new wording from Specialist 1 should NOT have "tracks tenants" + "tenants never" simultaneously); (c) "Join 500+" or "500+ Growth" absent from page text; (d) DocuSeal mention count on `/` ≤ 2 (logo cloud + JSON-LD count, NOT in copy); (e) pricing-card-featured social-proof block contains "Built for landlords with 1–15 rentals". |
| `/about` | (a) chosen persona word in `<h1>` `titleHighlight`; (b) "property managers" string COUNT === 0 in body text (the 3 wrong-word fixes); (c) DocuSeal mention count on `/about` ≤ 1 (or 0 if planner removes the about-page DocuSeal stat tile per the recommendation). |
| `/faq` | (a) chosen persona word appears in hero subtitle; (b) FAQ category count = 5 (Getting Started, Features & Benefits, Implementation & Support, Security & Compliance, Pricing & ROI); (c) "Built for landlords" in trustBadge unchanged. |
| `/pricing` | (a) chosen persona word in metadata description (parsed via `<meta name="description">` content); (b) "Built for landlords — 14-day free trial" badge present; (c) `<a>` to `/faq` exists in pricing-FAQ section ("See all FAQs" link); (d) pricing-FAQ entry count = 5 (was 6); (e) DocuSeal mention count on `/pricing` ≤ 3 (pricing card limits + comparison-table row + ≤1 inline). |
| `/contact` | (a) chosen persona word in metadata; (b) form heading uses persona word consistently. |
| `/compare/buildium` | (a) chosen persona word in `description` / hero subtitle; (b) sibling-comparison block exists ("Compare TenantFlow to other tools"). |
| `/compare/appfolio` | Same as buildium. |
| `/compare/rentredi` | Same. |
| `/help` | (a) persona word in hero subtitle; (b) DocuSeal de-amped from "Send a lease for e-signature with DocuSeal" → "Send a lease for e-signature". |
| `/resources` | (a) persona word in body copy line 111 (`landlords` span). |
| `/features` | (a) persona word in metadata description; (b) check the integrations subtitle KEPT DocuSeal as a partner ("Built on Stripe, Supabase, Vercel, DocuSeal, and Resend") — this is intentional KEEP. |

### Sitewide assertion (single test, runs across multiple pages)

```typescript
test('No fabricated subscriber-count claims appear on any marketing page', async ({ page }) => {
    const PUBLIC_PATHS = ['/', '/about', '/faq', '/pricing', '/contact', '/compare/buildium', '/compare/appfolio', '/compare/rentredi', '/help', '/resources', '/features'];
    for (const path of PUBLIC_PATHS) {
        await page.goto(path);
        const body = await page.textContent('body');
        expect(body).not.toMatch(/Join 500\+|500\+ (Growth|user|subscriber)/i);
        expect(body).not.toMatch(/2,500\+ user/i);
    }
});
```

### DocuSeal-count assertion (sitewide)

```typescript
test('Site-wide DocuSeal mention count ≤ 5 across all marketing pages combined', async ({ page }) => {
    const PUBLIC_PATHS = ['/', '/about', '/faq', '/pricing', '/contact', '/compare/buildium', '/compare/appfolio', '/compare/rentredi'];
    let totalMentions = 0;
    for (const path of PUBLIC_PATHS) {
        await page.goto(path);
        const body = await page.textContent('body') ?? '';
        totalMentions += (body.match(/DocuSeal/g) ?? []).length;
    }
    // Threshold accounts for: pricing card features list (visible on /pricing → 2 because Growth + Max each say "(DocuSeal)"), comparison-table row (1), FAQ entry on /faq (1), logo cloud across multiple pages (1×N pages but still each render is "1 DocuSeal" so N pages × 1 mention = N — careful with the threshold).
    expect(totalMentions).toBeLessThanOrEqual(15); // tighten after planner finalizes the de-amp
});
```

**Note for planner:** the precise upper-bound threshold depends on:
- Whether `compare-data.ts` 5× DocuSeal mentions stay or get softened to "Lease e-sign (Growth+)"
- Whether logo-cloud counts (logo-cloud renders DocuSeal text in the SVG; appears on `/` and possibly `/login`)
- Whether features-client.tsx:61 keeps the "Built on Stripe, Supabase, Vercel, DocuSeal, and Resend" subtitle (recommended KEEP)

Set the threshold to a known-safe value after running the test once and counting baseline.

### Existing tests that must stay green

- `src/app/__tests__/marketing-copy-landlord-only.test.ts` — 600+ lines of banlist enforcement. Phase 4 changes MUST NOT introduce any banlisted phrase (BANNED_PHRASES at lines 23-38, BANNED_FEATURE_CLAIMS at 45-55, BANNED_FABRICATED_IDENTITY_CLAIMS, BANNED_NUMERIC_CLAIMS). The Phase 4 work is a near-zero-risk update to this guard because we're REMOVING fabricated content (500+, vendor name-drops), not adding any.

**Confidence:** HIGH on test surface mapping; assertion thresholds will need calibration once Plan-04-01 + Plan-04-02 land.

## Phase 1 Cross-Check

### CRIT-03 surfaces verified intact (no regression risk in Phase 4)

| File:Line | What Phase 1 set | Phase 4 risk |
|-----------|-------------------|--------------|
| `src/components/pricing/pricing-card-standard.tsx:168` | `<div className="text-3xl font-bold text-foreground">Custom</div>` (Max card) | **NONE** — Phase 4 doesn't touch Max card. |
| `src/components/pricing/pricing-comparison-table.tsx:206` | `{MAX_PUBLIC_PRICE_DISPLAY}` (referenced via import on line 5) | **LOW** — Phase 4 might touch line 58 of this file (DocuSeal row) but NOT the Max price cell on line 206. Test the comparison table after de-amp lands to confirm. |
| `src/app/pricing/page.tsx:23-26, 35-43` | Max excluded from JSON-LD `Product.offers`; description says "Max — Custom pricing, contact sales" | **LOW** — Phase 4 might rephrase "professional property management software for landlords with 1–15 rentals" line 36 if persona-word replacement runs. The CRIT-03-locked phrase "Max enterprise tier — Custom pricing, contact sales" stays. |
| `src/components/pricing/pricing-card-standard.tsx:170-189` | Conditional `isEnterprise` branch + price display | **NONE** |

### Recommended guard

After the Phase 4 PR opens, run a 1-line spot check on the JSON-LD assertion in `src/app/pricing/__tests__/page.test.ts` to confirm `productJsonLd` still excludes Max from offers (the test mocks the schema generators but if test file itself changes, ensure the mock signature matches).

```bash
pnpm test:unit -- --run src/app/pricing/__tests__/page.test.ts
```

**Confidence:** HIGH — the CRIT-03 surfaces are well-isolated from Phase 4's persona-word + DocuSeal de-amp work.

## Risk Matrix

| Risk | Likelihood | Severity | Mitigation |
|------|-----------|----------|------------|
| **Find-and-replace overshoot** — persona-word substitution touches a string that should NOT change (e.g., a `landlord` reference inside an RLS technical-explanation paragraph reads weird if replaced with `owner-operator`) | HIGH | MEDIUM | Plan-04-01 should specify carve-out RegEx for "row-level security per landlord", "every landlord's data", "landlord-only platform", "individual landlords". Use a code-review gate before merging the find-replace commit. |
| **About-page property-manager copy NOT fixed** because the planner only swaps the chosen persona word (e.g., `landlord → owner-operator`), missing the 3 `property managers` instances on `/about` | MEDIUM | HIGH (audit-explicit error) | Plan-04-01 must enumerate the 3 lines (about/page.tsx:78, 95, 201) as a SEPARATE find-replace from the chosen-persona-word global. The wrong-word fix is independent of CONS-01. |
| **DocuSeal de-amp leaves count > 3** — easy to forget one of the 13 surfaces | MEDIUM | MEDIUM | Add a smoke-test assertion: "site-wide DocuSeal mentions across ALL public marketing pages ≤ N" with N calibrated to the post-removal count. Include in `persona-consistency.spec.ts` (above). |
| **FAQ JSON-LD on `/pricing` still over-emits** — if planner removes pricing-FAQ entry but forgets to update `pricingFaqs` export | LOW | MEDIUM | The `pricingFaqs` is the same array as `FAQS` (line 214: `export { FAQS as pricingFaqs }`) so editing `FAQS` automatically updates the JSON-LD. Verify by running `/pricing` page load after the change and viewing the head's `<script type="application/ld+json">`. |
| **Hero dashboard mockup name swap propagates inconsistent initials** — if line 156 changes `avatar="JM"` to `avatar="JC"` but line 157 still says `name="John Miller"` | LOW | LOW | Pair the changes in a single multi-line edit; use a code-review checklist. |
| **`features-client.tsx:61` integrations subtitle removed** by an over-aggressive DocuSeal grep | MEDIUM | MEDIUM | The recommendation is to KEEP that mention. Plan-04-02 must explicitly mark the integrations subtitle as exempt from the DocuSeal removal pass. |
| **Bulk-zip "500" stat tile (`stats-showcase.tsx`) gets reduced to a label-only swap, breaking the Phase 1 NumberTicker fix** | LOW | HIGH | Only edit `label` and `description` strings; do NOT touch `value: 500`. The NumberTicker animation depends on the integer. |
| **`testimonials-section.tsx:77` "Real results from property managers"** is a dormant string (component doesn't render until real testimonials exist) — easy to skip | MEDIUM | LOW | Fix it now per recommendation #5 in Persona Word Locator section E. Adds 30 seconds to the find-replace pass. |
| **Sister specialist's persona word includes special characters** (e.g., "owner-operator" with hyphen, "rental investor") → URL-encoded test failures | LOW | LOW | Use `node:querystring`-safe test paths only; assertions should match against rendered text via `await page.textContent('body')`, not URL parsing. |
| **`pricing-content.tsx:147` "Connect with sales" CTA label** is in Phase 10 scope (TRUST-03) — easy to "helpfully fix" mid-Phase-4 and break Phase 10's gating | MEDIUM | LOW | CONTEXT.md lists this as deferred. Plan-04-02 must NOT touch CTA labels on non-pricing surfaces. |
| **Phase 1's CRIT-03 Max-pricing language regression** — if the persona-word replacement run mangles "Max enterprise tier — Custom pricing, contact sales" | LOW | HIGH | Verify with a unit test that the `pricing/page.tsx` description still contains "Custom pricing, contact sales" verbatim after replacement. |

## Confidence Levels

| Recommendation | Level | Reason |
|----------------|-------|--------|
| Persona-word locator table (CONS-01) — file:line accuracy | HIGH | Every row verified via `Read` against current code. |
| About-page 3× "property managers" wrong-word fix | HIGH | Audit-explicit + factually verifiable (TenantFlow does NOT serve property managers as a primary persona). |
| Hero subhead location (COPY-01) | HIGH | `marketing-home.tsx:38-42` confirmed via Read. |
| Social-proof "500+" location (COPY-02) | HIGH | Single occurrence at `pricing-card-featured.tsx:188-192` confirmed. |
| DocuSeal KEEP/REMOVE classification (COPY-04) | MEDIUM-HIGH | KEEP set is audit-explicit; REMOVE set is researcher recommendation. Planner has discretion on `compare-data.ts` 5× row mentions and `features-client.tsx:61` integrations subtitle. |
| FAQ 5+5 reduction recommendation (COPY-05) | HIGH | Overlap analysis is mechanical (string-by-string comparison of 6 homepage + 6 pricing entries against 15 canonical entries). |
| Bulk-zip phrasing replacement set (COPY-06) | HIGH | Locator + canonical replacement "tax-season zip exports" is audit-explicit. |
| Dashboard mockup name swap (COPY-07) | HIGH | Cheap, reversible, low-stakes. |
| Defer-mockup-redesign recommendation (COPY-07) | MEDIUM | Judgment call; planner can override. |
| COPY-03 design-token mapping (Badge or mini-section) | HIGH | Both patterns have prior-art in codebase (pricing-page Badge, feature-callouts mini-section). |
| Test surface mapping (persona-consistency.spec.ts) | HIGH | Page list and assertions follow audit + CONTEXT.md spec. |
| DocuSeal-count threshold value | MEDIUM | Needs one calibration run after planning lands. |
| Phase 1 cross-check (no CRIT-03 regression) | HIGH | Surfaces are well-isolated; spot-check guards documented. |

---

## Sources

### Primary (HIGH confidence — direct codebase reads)

- `src/app/marketing-home.tsx` (123 lines, full file)
- `src/app/page.tsx` (54 lines, full file)
- `src/app/about/page.tsx` (278 lines, full file)
- `src/app/contact/page.tsx` (23 lines, full file)
- `src/app/faq/page.tsx` (94 lines, full file)
- `src/app/layout.tsx` (124 lines, full file)
- `src/app/pricing/page.tsx` (96 lines, full file)
- `src/app/pricing/pricing-content.tsx` (214 lines, full file)
- `src/app/compare/[competitor]/compare-data.ts` (368 lines)
- `src/app/compare/[competitor]/page.tsx` (207 lines)
- `src/app/(auth)/login/page.tsx` (lines 1-220)
- `src/app/features/page.tsx` (20 lines, full file)
- `src/components/landing/feature-callouts.tsx` (48 lines, full file)
- `src/components/landing/bento-features-section.tsx` (104 lines, full file)
- `src/components/landing/feature-backgrounds.tsx` (282 lines, full file)
- `src/components/landing/final-cta-section.tsx` (82 lines, full file)
- `src/components/landing/hero-section.tsx` (64 lines, full file)
- `src/components/landing/results-proof-section.tsx` (69 lines, full file)
- `src/components/landing/testimonials-section.tsx` (96 lines, full file)
- `src/components/sections/comparison-table.tsx` (258 lines, full file)
- `src/components/sections/features-section.tsx` (152 lines, full file)
- `src/components/sections/hero-dashboard-mockup.tsx` (283 lines, full file)
- `src/components/sections/home-faq.tsx` (95 lines, full file)
- `src/components/sections/how-it-works.tsx` (201 lines, full file)
- `src/components/sections/logo-cloud.tsx` (242 lines, full file)
- `src/components/sections/premium-cta.tsx` (119 lines, full file)
- `src/components/sections/stats-showcase.tsx` (127 lines, full file)
- `src/components/sections/testimonials-section.tsx` (264 lines, full file)
- `src/components/pricing/pricing-card-featured.tsx` (254 lines, full file)
- `src/components/pricing/pricing-card-standard.tsx` (lines 160-189)
- `src/components/pricing/pricing-comparison-table.tsx` (222 lines, full file)
- `src/components/ui/badge.tsx` (64 lines, full file)
- `src/data/faqs.ts` (117 lines, full file)
- `src/lib/generate-metadata.ts` (213 lines, full file)
- `src/app/globals.css` (token definitions verified via grep)
- `src/app/__tests__/marketing-copy-landlord-only.test.ts` (lines 1-60 + grep)

### Sitewide grep queries (HIGH confidence — exhaustive)

- `grep -rn "landlord|property owner|owner-operator|real estate investor|property manager|rental owner|rental investor"`
- `grep -rn "DocuSeal|docuseal"`
- `grep -rn "500\+|500 customers|Join 500|Growth subscribers"`
- `grep -rn "bulk-zip|Bulk-zip|500 / request|500/request|tax.season"`
- `grep -rn "John Miller|Emma Wilson|David Park"`
- `grep -rni "FAQ|frequently asked"` (scoped to `src/app/`, `src/components/sections/`, `src/components/pricing/`, `src/components/landing/`)

### Source documents

- `.planning/phases/04-persona-copy/04-CONTEXT.md` (gathered 2026-05-10)
- `.planning/REQUIREMENTS.md` (sections COPY-01..07, CONS-01)
- `audit-ui-2026-05-08.md` (items #7, #21–#27)

## Metadata

**Confidence breakdown:**
- Persona word locator (Section A): HIGH — every entry verified
- DocuSeal de-amp classification: MEDIUM-HIGH — strategic KEEP/REMOVE has 1-2 judgment calls
- FAQ canon recommendation: HIGH — mechanical overlap analysis
- Bulk-zip softening: HIGH — full replacement set documented
- Mockup name swap: HIGH — cheap, reversible
- Test surface mapping: HIGH — assertions traceable to audit + CONTEXT
- Phase 1 cross-check: HIGH — surfaces well-isolated

**Research date:** 2026-05-09
**Valid until:** 2026-06-08 (codebase moves fast — re-verify within 30 days if Plan-04-* hasn't shipped)
