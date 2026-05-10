---
phase: 04-persona-copy
phase_number: 4
generated: 2026-05-09
synthesized_from:
  - 04-RESEARCH-persona-terminology.md (Specialist 1 — persona word + hero subhead + tenants-never-login elevation)
  - 04-RESEARCH-copy-audit.md (Specialist 2 — codebase locator audit for all 7 phase requirements)
user_decision_2026-05-09: persona word LOCKED to "landlords" + "landlords with 1–15 rentals" segment-qualified variant (user override of earlier hedging on bare "landlord")
---

# Phase 4: Persona & Copy Honesty — Canonical Research

## Locked Decisions (Pre-Plan Inputs)

| ID | Decision | Source |
|----|----------|--------|
| **CONS-01 persona word** | **"landlords"** as canonical root; **"landlords with 1–15 rentals"** as segment-qualified variant for hero / social-proof / About / meta surfaces; bare "landlords" in body / FAQ / pricing rows / nav-class copy | User confirmation 2026-05-09 + Specialist 1 (8/9 competitor convention) + locked COPY-02 phrase |
| **COPY-01 hero subhead** | **"The operations tool for landlords with 1–15 rentals. Track properties, leases, and maintenance in one place — tenants stay off the platform."** (Candidate A — minimal-delta) | Specialist 1 |
| **COPY-02 social-proof** | Replace `pricing-card-featured.tsx:188-192` `Join 500+ Growth subscribers` block with `<Badge>` rendering `Built for landlords with 1–15 rentals` | Specialist 2 + LOCKED in CONTEXT.md |
| **COPY-03 tenants-never-login elevation** | `<Badge variant="trustIndicator" size="trust">` above h1 with text **"Landlord-only · Tenants never log in"** + lucide `<Lock>` or `<Shield>` icon | Specialist 1 (Option A) + Specialist 2 token mapping |
| **COPY-04 DocuSeal de-amp** | KEEP 3 strategic surfaces (pricing.ts feature lists, pricing-comparison-table row, faqs.ts:78 FAQ entry); REMOVE 13 marketing surfaces; KEEP-AS-INFRASTRUCTURE 5 technical surfaces | Specialist 2 |
| **COPY-05 FAQ canon** | Reduce homepage FAQ from 6→5 (drop "Is my data secure?"); reduce pricing FAQ from 6→5 (drop "How does the 14-day free trial work?"); add "See all FAQs" link in pricing-FAQ footer | Specialist 2 |
| **COPY-06 bulk-zip softening** | Canonical replacement phrase: **"Tax-season zip exports"** (consistent verb form across all 8 user-facing surfaces) | Specialist 2 |
| **COPY-07 mockup names** | Replace John Miller / Emma Wilson / David Park → **Jamie Carter / Alex Rivera / Sam Patel** (+ swap `amount="DocuSeal"`→`"E-Sign"` per COPY-04). "Sarah" greeting kept (minimum churn). Mockup redesign DEFERRED to v2.0+ | Specialist 2 |

## Phase Boundary Reminders

**In scope (Phase 4 only):**
- Sitewide find-and-replace of persona language (~40 occurrences across 25 files)
- Hero subhead rewrite + tenants-never-login `<Badge>` elevation
- "Join 500+" → "Built for landlords with 1–15 rentals" swap
- DocuSeal de-amp from 16 marketing surfaces → 3 strategic surfaces
- Homepage + pricing FAQ trimming + canonical link
- Bulk-zip phrasing softening
- Dashboard mockup name swap

**Out of scope (do NOT touch in Phase 4 — deferred to other phases):**
- Pricing tier numbers, plans → Phase 5
- Blog rebuild → Phase 6
- Real testimonials → Phase 10 (TRUST-01)
- CTA label canonicalization sitewide → Phase 10 (TRUST-03)
- Customer logos / G2 badges → Phase 10 (TRUST-02)
- Visual redesign of bento grid → v2.0+
- Dashboard mockup redesign → v2.0+
- aria-current sitewide audit → Phase 12 (SEO-06)
- Sticky CTA on long pages → Phase 13 (PERF-03)

**Carve-outs (do NOT replace even during persona-word find-and-replace):**
1. Positioning phrases: `landlord-only platform`, `landlord-only`, `landlord-focused` — describe product category, not buyer
2. Technical context: `row-level security per landlord`, `every landlord's data`, `Custom categories per landlord` — RLS-isolation references
3. Locked phrase (COPY-02): `Built for landlords with 1–15 rentals` stays exactly as-is
4. Competitor-audience descriptors in `compare-data.ts`: "Small to mid-sized property managers" (Buildium bestFor), "Property management companies with 50+ units" (AppFolio bestFor) — describe the *competitor's* audience and must remain accurate
5. About-page 3× "property managers" wrong-word fix: lines 78, 95, 201 — replace with "landlords" REGARDLESS of CONS-01 outcome (factually wrong copy; TenantFlow is owner-only)
6. Test fixture data: `src/app/__tests__/marketing-copy-landlord-only.test.ts` banlist entries are GUARDRAILS — never touch
7. In-product UX: form-field label `relationship: 'Previous landlord'` in rental-application template is application UX, not marketing — leave alone

## Execution Surfaces

### CONS-01 — Persona word find-and-replace (40 occurrences across 25 files)

**Marketing pages (Section A, highest priority):**
- `src/app/marketing-home.tsx:39, 58` — "property owners" → "landlords with 1–15 rentals" (in hero subhead + supporting line)
- `src/app/page.tsx:14, 16, 40` — meta title + description: "Property Owners" → "Landlords"; "owners and real estate investors" → "landlords with 1–15 rentals"
- `src/app/about/page.tsx:78, 95, 201` — **"property managers" → "landlords"** (3 wrong-word factual fixes)
- `src/app/(auth)/login/layout.tsx:5` — "property owner login" → "landlord login"
- `src/app/support/page.tsx:20` — "property owners managing properties" → "landlords managing properties"
- `src/app/security-policy/page.tsx:10` — "property owner and tenant data" → "landlord and tenant data"
- `src/app/blog/category/[category]/page.tsx:35` — "property owners and operators" → "landlords"
- `src/app/resources/page.tsx:182` — "property owners" → "landlords"
- `src/app/resources/seasonal-maintenance-checklist/page.tsx:16` — "property owners" → "landlords"
- `src/app/compare/[competitor]/compare-data.ts:25, 27, 125, 129, 258` — 5× "property owners" → "landlords"
- `src/components/sections/testimonials-section.tsx:77` — **"property managers" → "landlords"** (dormant string but in bundle; fix now to prevent regression when real testimonials land)

**Root-layout metadata + JSON-LD (Section B, highest SEO leverage):**
- `src/lib/generate-metadata.ts:32, 35, 52, 78, 144, 173` — six lines: titles + descriptions + Organization schema + SoftwareApplication schema. Replace "Property Owners" → "Landlords" and "property owners and real estate investors" → "landlords with 1–15 rentals"
- `src/app/feed.xml/route.ts:118` — already says "landlords" (KEEP)

**Pluralization variants — find-and-replace must handle ALL:**
- `landlord` ↔ `landlords` ↔ `landlord's` (apostrophe form for technical context — KEEP per carve-out 2)
- `property owner` ↔ `property owners` ↔ `Property Owners` (title-case)
- `property manager` ↔ `property managers` (only the 3 about-page + 1 testimonials-section instances flip; competitor-descriptor `compare-data.ts` rows stay)
- `real estate investor` ↔ `real estate investors`
- `owner` (bare) — context-sensitive: `home-faq.tsx:21` "owners managing up to 5 properties" → "landlords with 1–5 rentals" (segment matches Starter plan limit)
- `operator` ↔ `operators` — only in `/help/page.tsx:24` (drop ", and operators" — implied by "landlords") and `/blog/category/.../page.tsx:35` (same)

### COPY-01 — Hero subhead replacement

**File:** `src/app/marketing-home.tsx:38-42`

**Before:**
```tsx
<p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
    The operations tool for property owners. Track properties,
    tenants, leases, and maintenance in one place — tenants
    never have to log in.
</p>
```

**After:**
```tsx
<p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
    The operations tool for landlords with 1–15 rentals.
    Track properties, leases, and maintenance in one place —
    tenants stay off the platform.
</p>
```

**Same edit harmonizes the supporting line (line 58):**
- Before: `Built for property owners. 14-day free trial, no credit card.`
- After: `Built for landlords with 1–15 rentals. 14-day free trial, no credit card.`

### COPY-02 — Social-proof "Join 500+" replacement

**File:** `src/components/pricing/pricing-card-featured.tsx:187-193`

Replace the social-proof `<div>` block (current contains `<Users>` icon + `Join <strong>500+</strong> Growth subscribers`) with a `<Badge variant="trustIndicator" size="trust">` rendering **`Built for landlords with 1–15 rentals`**. Keep wrapper styling `flex items-center justify-center gap-2 mb-6 py-3 bg-muted/50 rounded-lg` for visual continuity. Recommend swapping `<Users>` icon for `<BadgeCheck>` (visual consistency with the trust-badge pattern).

**This is the only `Join 500+` / `500+ Growth subscribers` occurrence in `src/`.** Banlist test (`marketing-copy-landlord-only.test.ts:201` "2,500+ user") is a guardrail — leave alone.

### COPY-03 — Tenants-never-login elevation

**File:** `src/app/marketing-home.tsx:33` (immediately before the hero `<h1>`)

```tsx
<Badge
  variant="trustIndicator"
  size="trust"
  className="self-start mb-2"
>
  <Lock className="size-4" aria-hidden="true" />
  Landlord-only · Tenants never log in
</Badge>
```

**Imports needed:** `import { Badge } from '#components/ui/badge'`, `import { Lock } from 'lucide-react'`

**Token consumption:** uses existing `trustIndicator` variant (`badge.tsx:29-30`) which renders `border-primary/20 bg-primary/5 text-primary` — zero new design tokens. Pattern is already proven on `src/app/pricing/page.tsx:55-61`.

**Mobile safety:** adds ~28px above the h1 at 375px — Phase 2 (CRIT-04) hero overflow already verified safe. The `self-start` keeps left-aligned in the flex column.

### COPY-04 — DocuSeal de-amp (16 surfaces → 3 strategic + 5 infrastructure)

**KEEP (3 strategic user-facing surfaces):**
1. `src/config/pricing.ts:153, 187` — pricing card features list (Growth + Max plan tier limits)
2. `src/components/pricing/pricing-comparison-table.tsx:58` — `'E-sign leases (DocuSeal)'` row (audit-explicit)
3. `src/data/faqs.ts:78` — FAQ entry "Do you integrate with my existing systems?" (DocuSeal in answer body)

**REMOVE (13 surfaces — see Specialist 2 § COPY-04 table for exact replacement copy):**

| # | File:Line | Replacement |
|---|-----------|-------------|
| 1 | `src/components/landing/hero-section.tsx:25` | drop "DocuSeal" from "DocuSeal e-sign on Growth and Max plans" → "Lease e-sign on Growth and Max plans" |
| 2 | `src/components/landing/feature-callouts.tsx:11` | `title: 'DocuSeal E-Sign'` → `title: 'Lease E-Sign'` |
| 3 | `src/components/landing/bento-features-section.tsx:84` | "Digital signing with DocuSeal on..." → "Digital lease signing on..." |
| 4 | `src/components/landing/final-cta-section.tsx:35` | drop ", DocuSeal e-sign" → ", lease e-sign" |
| 5 | `src/components/landing/results-proof-section.tsx:29` | `'DocuSeal e-sign tier'` → `'Lease e-sign tier'` |
| 6 | `src/components/sections/premium-cta.tsx:43` | drop "DocuSeal" |
| 7 | `src/components/sections/how-it-works.tsx:36` | drop "via DocuSeal" |
| 8 | `src/components/sections/comparison-table.tsx:61` | drop "DocuSeal" |
| 9 | `src/components/sections/hero-dashboard-mockup.tsx:159` | `amount="DocuSeal"` → `amount="E-Sign"` (paired with COPY-07) |
| 10 | `src/app/about/page.tsx:37, 45, 219` | stat tile + meta + body copy — see Specialist 2 row 10 for exact replacements |
| 11 | `src/app/help/page.tsx:153, 155` | drop "with DocuSeal" from article title; rephrase summary |
| 12 | `src/app/faq/page.tsx:19, 42` | drop DocuSeal from meta description; trustSignals → "Lease e-sign on Growth+" |
| 13 | `src/app/features/page.tsx:9` + `src/app/support/page.tsx:29` | drop DocuSeal from descriptions (KEEP `features-client.tsx:61` integrations subtitle — it's an integration-partner attribution) |
| 13b | `src/app/compare/[competitor]/compare-data.ts:65, 172, 240, 301, 354` | softens 5× `'DocuSeal e-signing (Growth+)'` → `'Lease e-sign (Growth+)'` (planner discretion; Specialist 2 recommends softening) |

**KEEP-AS-INFRASTRUCTURE (5 surfaces — NOT counted toward de-amp):**
- `src/components/sections/logo-cloud.tsx:41-43, 197-216` — DocuSeal is a real integration-partner logo
- `src/app/(auth)/login/page.tsx:21` — HERO_STATS post-funnel tile
- `src/app/auth/confirm-email/confirm-email-states.tsx:62` — same HERO_STATS pattern
- `src/lib/generate-metadata.ts:201` — JSON-LD `featureList: 'DocuSeal Lease E-Signing'` (structured-data feature label, accurate technical disclosure for SERP)
- `src/components/features/features-client.tsx:61` — integrations hero subtitle "Built on Stripe, Supabase, Vercel, DocuSeal, and Resend" (logo-cloud rationale)

### COPY-05 — FAQ canonicalization (5+5 reduction + canonical link)

**Homepage FAQ (`src/components/sections/home-faq.tsx:12-43`):** drop entry #3 "Is my data secure?" (lines 23-27) — overlaps verbatim with `faqs.ts` "How secure is my data?". Resulting count: 5 entries. Existing "View All FAQs" CTA → `/faq` at lines 64-89 stays.

**Pricing FAQ (`src/app/pricing/pricing-content.tsx:33-64`):** drop entry #1 "How does the 14-day free trial work?" (lines 34-38) — overlaps homepage entry 5 + canonical `/faq` Pricing & ROI cat. Resulting count: 5 entries.

**New "See all FAQs" link in pricing-FAQ footer:** add `<Link>` to `/faq` adjacent to the existing "Connect with sales" CTA at `pricing-content.tsx:135-150`. Recommended placement: small text link "View all FAQs →" below the question grid OR convert footer flex row to include both the sales CTA and the FAQ link.

**JSON-LD auto-shrinks:** `pricing-content.tsx:214` re-exports `FAQS as pricingFaqs`; `pricing/page.tsx:17, 30` consume it via `createFaqJsonLd`. Reducing the array shrinks the FAQPage schema automatically. Verify by viewing rendered `<head>` after deploy.

### COPY-06 — Bulk-zip softening (8 surfaces → "Tax-season zip exports")

| # | File:Line | Replacement |
|---|-----------|-------------|
| 1 | `src/components/sections/how-it-works.tsx:50` | `'Bulk-zip export (500 / request)'` → `'Tax-season zip exports'` |
| 2 | `src/components/landing/feature-backgrounds.tsx:90-91` | label `'Bulk zip'` → `'Tax-season zip'`; second line drop or → `'For tax season'` |
| 3 | `src/components/sections/features-section.tsx:55` | `'... bulk-zip download. Custom...'` → `'... tax-season zip downloads. Custom...'` |
| 4 | `src/components/sections/comparison-table.tsx:41` | `'... bulk-zip export'` → `'... and tax-season zip exports'` |
| 5 | `src/components/sections/comparison-table.tsx:68` | `'Zip up to 500 documents per export for tax season'` → `'Zip exports for tax season'` |
| 6 | `src/components/landing/hero-section.tsx:23` | not on `/`; same softening if planner touches |
| 7 | `src/components/sections/stats-showcase.tsx:33` | label `'Bulk-Zip Cap'` → `'Tax-Season Bulk Zip'`; description → `'Up to 500 docs per zip export'`. **DO NOT touch `value: 500`** — Phase 2 NumberTicker depends on the integer |
| 8 | `src/components/landing/results-proof-section.tsx:23-24` | label `'Bulk-zip cap (per request)'` → `'Tax-season zip cap'` |
| 9 | `src/app/help/page.tsx:148` | drop "bulk-zip export" → "tax-season zip exports" |
| 10 | `src/data/faqs.ts:103` | "document vault's bulk-zip download" → "document vault's tax-season zip exports" (also drops "via DocuSeal" per COPY-04) |

**LEAVE alone (already soft enough):**
- `src/components/landing/bento-features-section.tsx:57` — says "bulk download", not "bulk-zip 500/request"
- `src/components/sections/home-faq.tsx:31` — already says "bulk-download a zip when tax season hits"
- Internal warnings, tests, edge function code

### COPY-07 — Dashboard mockup names

**File:** `src/components/sections/hero-dashboard-mockup.tsx`

| Line | Before | After |
|------|--------|-------|
| 156 | `avatar="JM"` | `avatar="JC"` |
| 157 | `name="John Miller"` | `name="Jamie Carter"` |
| 159 | `amount="DocuSeal"` | `amount="E-Sign"` (also satisfies COPY-04 row 9) |
| 164 | `avatar="EW"` | `avatar="AR"` |
| 165 | `name="Emma Wilson"` | `name="Alex Rivera"` |
| 172 | `avatar="DP"` | `avatar="SP"` |
| 173 | `name="David Park"` | `name="Sam Patel"` |

**Lines 44 (`Welcome back, Sarah`) and 53 (avatar `SC`) — KEEP.** Specialist 2 recommends minimum churn here; the audit's name-collision concern is satisfied by the activity-row swap.

**Mockup redesign (audit recommended simpler mockup):** DEFERRED to v2.0+. The current 4-stat-card / 12-bar-chart / 3-quick-action / 3-activity-row layout is busy but Phase 4 owns copy honesty, not visual design.

## Plan Decomposition

**Recommended split: 2 sequential plans.**

### Plan 04-01: Persona unification + hero rewrite + social-proof + tenants-never-login badge
- **Requirements:** CONS-01, COPY-01, COPY-02, COPY-03
- **Tasks (suggested):**
  1. Persona-word global find-and-replace across the 25 files (apply carve-out RegEx to skip positioning + technical context)
  2. About-page 3× "property managers" → "landlords" (independent edit; do NOT depend on CONS-01 word selection)
  3. Hero subhead rewrite (`marketing-home.tsx:38-42`) + supporting line (`marketing-home.tsx:58`)
  4. Tenants-never-login `<Badge>` insertion above h1 (`marketing-home.tsx:33`)
  5. Social-proof block swap (`pricing-card-featured.tsx:187-193`)
  6. Update root-layout metadata generator (`generate-metadata.ts:32, 35, 52, 78, 144, 173`)
  7. New e2e: `tests/e2e/tests/public/persona-consistency.spec.ts` with sitewide assertions

### Plan 04-02: De-amp + softening + canonical link + mockup names
- **Requirements:** COPY-04, COPY-05, COPY-06, COPY-07
- **Sequential after 04-01** because Plan 04-01's persona-word selection might affect some softening copy
- **Tasks (suggested):**
  1. DocuSeal de-amp: 13 marketing surface edits (per locator table)
  2. FAQ trim: drop homepage entry #3, drop pricing entry #1
  3. Add "See all FAQs" link in pricing-FAQ footer (`pricing-content.tsx:135-150`)
  4. Bulk-zip softening: 10 surface edits → "Tax-season zip exports" canonical phrase
  5. Mockup name swap: `hero-dashboard-mockup.tsx` lines 156-178 (paired with COPY-04 amount swap on line 159)
  6. Extend `persona-consistency.spec.ts` with DocuSeal mention-count assertion + FAQ entry-count assertions

## Validation Strategy

### New e2e test file: `tests/e2e/tests/public/persona-consistency.spec.ts`

**Per-page assertions (excerpts; full table in Specialist 2 § Test Surface Mapping):**

| Path | Required assertions |
|------|---------------------|
| `/` | (a) "landlords" appears in hero subhead OR `<Badge>`; (b) "property owners" absent from rendered text; (c) "tenants never have to log in" absent (the contradiction phrase); (d) "Built for landlords with 1–15 rentals" present (badge OR supporting line); (e) "Join 500+" / "500+ Growth" absent; (f) DocuSeal mention count ≤ 2 (logo cloud + JSON-LD only) |
| `/about` | (a) "landlords" in `titleHighlight`; (b) "property managers" count = 0 in body text (the 3 wrong-word fixes); (c) DocuSeal mention count ≤ 1 (or 0 after about-page de-amp) |
| `/pricing` | (a) "landlords" in metadata description; (b) "Built for landlords — 14-day free trial" badge present; (c) `<a href="/faq">` exists in pricing-FAQ section ("See all FAQs"); (d) pricing-FAQ entry count = 5; (e) DocuSeal mention count ≤ 3 |
| `/faq` | (a) "landlords" in hero subtitle; (b) FAQ category count = 5 |
| `/compare/buildium`, `/compare/appfolio`, `/compare/rentredi` | (a) "landlords" in hero subtitle; (b) sibling-comparison block exists |
| `/help`, `/resources`, `/features`, `/contact` | (a) "landlords" in metadata description |

**Sitewide assertions (single test, runs across PUBLIC_PATHS list):**

```typescript
test('No fabricated subscriber-count claims appear on any marketing page', async ({ page }) => {
  for (const path of PUBLIC_PATHS) {
    await page.goto(path)
    const body = await page.textContent('body')
    expect(body).not.toMatch(/Join 500\+|500\+ (Growth|user|subscriber)/i)
    expect(body).not.toMatch(/2,500\+ user/i)
  }
})

test('Site-wide DocuSeal mention count ≤ N across all marketing pages combined', async ({ page }) => {
  let total = 0
  for (const path of PUBLIC_PATHS) {
    await page.goto(path)
    const body = await page.textContent('body') ?? ''
    total += (body.match(/DocuSeal/g) ?? []).length
  }
  expect(total).toBeLessThanOrEqual(15) // calibrate after first run
})
```

### Existing tests that must stay green
- `src/app/__tests__/marketing-copy-landlord-only.test.ts` — 600+ lines of banlist enforcement. Phase 4 work REMOVES fabricated content; near-zero risk.
- `src/app/pricing/__tests__/page.test.ts` — Phase 1 CRIT-03 JSON-LD assertion. Verify `productJsonLd` still excludes Max from offers after persona-word replacement.

### Live verification (post-deploy curl checks)

```bash
# Persona word
curl -s https://tenantflow.app/ | grep -oE '(operations tool for property owners|tenants never have to log in|Built for property owners)'
# Expect: zero results

curl -s https://tenantflow.app/ | grep -oE '(landlords with 1.15 rentals|Tenants never log in)'
# Expect: ≥2 results (hero subhead + supporting line + badge)

# Meta description
curl -s https://tenantflow.app/ | grep -oE '<meta[^>]*description[^>]*>' | head -3
# Expect: contains "for landlords" or "for owners with 1-15 rentals", NOT "for owners and real estate investors"

# Social-proof
curl -s https://tenantflow.app/pricing | grep -oE '(500\+|Join 500|Growth subscribers)'
# Expect: zero results

# DocuSeal de-amp
curl -s https://tenantflow.app/ | grep -c 'DocuSeal'
# Expect: ≤2 (logo cloud + JSON-LD only)
```

### Cross-cutting design-token gate (applies to ALL phases per CONTEXT.md)

Phase 4 should pass trivially (no new colors / spacing / hex / inline-ms) but the standard checks apply to the diff:
- `git diff main...HEAD -- src/ | grep -E "^\+.*#[0-9a-fA-F]{3,8}\b" | wc -l` → 0
- `git diff main...HEAD -- src/ | grep -E "^\+.*rgba?\(" | wc -l` → 0
- `git diff main...HEAD -- src/ | grep -E "^\+.*bg-white" | wc -l` → 0
- `git diff main...HEAD -- src/ | grep -E "^\+.*\b[0-9]+ms\b" | wc -l` → 0

## Risk Matrix

| Risk | Likelihood | Severity | Mitigation |
|------|-----------|----------|------------|
| **R1**: Find-and-replace overshoot — persona-word substitution touches a string in carve-out (RLS technical context, positioning phrase) | HIGH | MEDIUM | Plan-04-01 specifies carve-out RegEx for "row-level security per landlord", "every landlord's data", "landlord-only platform", "individual landlords". Code-review gate before merging. |
| **R2**: About-page 3× "property managers" missed because planner only swaps the chosen word (e.g., "property owners → landlords" leaves "property managers" untouched) | MEDIUM | HIGH | Plan-04-01 enumerates lines 78, 95, 201 as a SEPARATE find-replace from the global. Independent of CONS-01. |
| **R3**: DocuSeal de-amp leaves count > 3 (easy to forget one of 13 surfaces) | MEDIUM | MEDIUM | DocuSeal-count assertion in `persona-consistency.spec.ts` (calibrate threshold after first run). |
| **R4**: FAQ JSON-LD on `/pricing` over-emits because `pricingFaqs` re-export forgotten | LOW | MEDIUM | The re-export is automatic (`pricing-content.tsx:214` `export { FAQS as pricingFaqs }`); editing FAQS auto-updates JSON-LD. Verify post-deploy via curl on rendered `<head>`. |
| **R5**: `features-client.tsx:61` integrations subtitle removed by over-aggressive DocuSeal grep | MEDIUM | MEDIUM | Plan-04-02 explicitly marks the integrations subtitle as exempt (KEEP-AS-INFRASTRUCTURE). |
| **R6**: Bulk-zip "500" stat tile reduced to label-only swap, breaking Phase 2 NumberTicker fix | LOW | HIGH | Only edit `label` and `description` strings; do NOT touch `value: 500`. NumberTicker animation depends on integer. |
| **R7**: Dormant `testimonials-section.tsx:77` "Real results from property managers" string skipped because component doesn't currently render | MEDIUM | LOW | Fix it now — adds 30 seconds, prevents regression when real testimonials land in Phase 10. |
| **R8**: Dashboard mockup name swap leaves inconsistent initials (avatar="JM" but name="Jamie Carter") | LOW | LOW | Pair changes in single multi-line edit; code-review checklist. |
| **R9**: Phase 1 CRIT-03 Max-pricing language regression if persona-word find-and-replace mangles "Max enterprise tier — Custom pricing, contact sales" | LOW | HIGH | Unit test in `pricing/__tests__/page.test.ts` asserts `productJsonLd` exact phrase still present after replacement. |
| **R10**: User overrides locked persona word during plan-checker review (HIGH RES — user just confirmed) | LOW | LOW | Already locked 2026-05-09. Skip mitigation. |

## Confidence Levels

| Area | Confidence | Reason |
|------|-----------|--------|
| Persona word recommendation | **HIGH** | User confirmed 2026-05-09; 8/9 competitor convention; locked COPY-02 phrase alignment |
| Hero subhead Candidate A | **HIGH** | Smallest-delta solution to named contradiction; preserves differentiator beat at end of subhead |
| Tenants-never-login `<Badge>` placement | **HIGH** | Existing primitive (`trustIndicator` size `trust`); proven pattern on `pricing/page.tsx:55-61`; mobile-safe |
| File:line locators (40 occurrences across 25 files) | **HIGH** | Every entry verified via Specialist 2 Read/grep |
| About-page 3× wrong-word fix | **HIGH** | Audit-explicit + factually verifiable |
| COPY-04 KEEP/REMOVE classification | **MEDIUM-HIGH** | KEEP set audit-explicit; 1-2 judgment calls on `compare-data.ts` 5× softening |
| COPY-05 FAQ overlap analysis | **HIGH** | Mechanical string-by-string comparison |
| COPY-06 unified phrase "Tax-season zip exports" | **HIGH** | Audit-explicit; consistent verb form across 10 surfaces |
| COPY-07 mockup name swap | **HIGH** | Cheap, reversible |
| Test surface mapping | **HIGH** | Page list + assertions traceable to audit + CONTEXT |
| DocuSeal mention-count threshold | **MEDIUM** | Needs one calibration run after Plan-04-02 lands |
| Phase 1 CRIT-03 cross-check | **HIGH** | Surfaces well-isolated; spot-check guards documented |
| Live verification commands | **HIGH** | Curl confirmed all three contradictions still live on 2026-05-09 |

## Sources

- `.planning/phases/04-persona-copy/04-RESEARCH-persona-terminology.md` (Specialist 1, 2026-05-09)
- `.planning/phases/04-persona-copy/04-RESEARCH-copy-audit.md` (Specialist 2, 2026-05-09)
- `.planning/phases/04-persona-copy/04-CONTEXT.md` (gathered 2026-05-10)
- `.planning/REQUIREMENTS.md` (CONS-01 + COPY-01..07)
- `audit-ui-2026-05-08.md` (items #7, #21–#27)
- TenantFlow live HTML scans via curl on 2026-05-09 — confirmed all three contradictions live
- 9-product competitor survey (TurboTenant, Avail, Hemlane, RentRedi, Stessa, Innago, TenantCloud, DoorLoop, Buildium)

---

*Phase 4 research synthesized: 2026-05-09 — ready for `/gsd-plan-phase 4` dispatch.*
