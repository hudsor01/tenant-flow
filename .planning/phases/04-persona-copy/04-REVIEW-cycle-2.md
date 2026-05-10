# Phase 4 Code Review — Cycle 2

**Reviewed:** 2026-05-10
**Scope:** PR #688 (gsd/phase-04-persona-copy) — full diff vs `main` (43 files changed; cycle-1 fix at `e09da36f0` confirmed on branch)
**Reviewer:** gsd-code-reviewer
**Cycle 1 result:** 1 P0 + 2 P1 + 3 P2; fixes landed in `e09da36f0`. Cycle 2 re-reviews the FULL diff to catch new regressions introduced by the cycle-1 fixes themselves AND any locked-decision drift / carve-out violations / test gaps not surfaced in cycle 1.

## Summary

| Severity | Count |
|----------|-------|
| P0 (BLOCKER) | 1 |
| P1 (HIGH) | 0 |
| P2 (MEDIUM) | 1 |
| P3 (LOW) | 0 |

**Verdict: NEEDS-FIX** (1 P0 — cycle does NOT count toward perfect-PR gate; after fix lands, two more zero-finding cycles are required for merge)

Cycle 1's three fixes (CR-01 prose flips on `faqs.ts`, WR-01 metadata flip on `help/page.tsx`, WR-02 metadata flips on `blog/page.tsx` + `resources/page.tsx`, IN-02 hardening of `home-faq.test.tsx`) all land cleanly. Cycle 2 re-verified each post-fix file: the `homeFaqs` export does not break the `<HomeFaq>` consumer (it still renders `<FaqsAccordion faqs={homeFaqs} />` from the same module), the test imports `{ HomeFaq, homeFaqs } from '../home-faq'` and asserts `.toHaveLength(5)` directly, and the cross-check `screen.queryByText(/Is my data secure/i)` is preserved. The cycle-1 metadata fixes on blog/resources have not introduced any new persona-word regressions in their adjacent content.

The blocker surfaced by cycle 2 is a **research-locator gap**, not a regression of cycle-1 fixes: `src/config/pricing.ts:100` carries the Starter plan description `'Ideal for property owners managing a few properties'`. This string is consumed by `getAllPricingPlans()` → `BentoPricingSection` → `PricingCardStandard` (line 162: `<p className="text-sm text-muted-foreground">{plan.description}</p>`) and renders in the visible body of `/pricing`. The new e2e regex `/property owners?\b/i` runs the page `/pricing` is in `PUBLIC_PATHS`, so the test will fail at runtime. This is the same class of miss as cycle-1's CR-01: a copy surface outside the explicit research locator table that still violates the CONS-01 contract.

The lone P2 is the same uncalibrated DocuSeal-count threshold from cycle-1 IN-01 — non-blocking per the perfect-PR gate, but should be tightened in this same fix pass once a real measurement is captured.

## Findings

### P0 — Blockers

#### CR-01: pricing.ts Starter description renders "property owners" on /pricing → fails new e2e

**File:** `src/config/pricing.ts:100`
**Category:** correctness / regression / locked-decision-violation

**Issue:** The Starter plan description in `PRICING_PLANS`:

```ts
STARTER: {
    ...
    description: 'Ideal for property owners managing a few properties',
    ...
}
```

flows through `getAllPricingPlans()` (line 203-205) into `src/components/pricing/bento-pricing-section.tsx:30` (`description: plan.description`), which is rendered onto `/pricing` by both `PricingCardStandard` (`src/components/pricing/pricing-card-standard.tsx:162` — `<p className="text-sm text-muted-foreground">{plan.description}</p>`) and `PricingCardFeatured` (`src/components/pricing/pricing-card-featured.tsx:154` — same shape). `/pricing` -> `<PricingSection>` -> `<BentoPricingSection>` is the canonical consumer (`src/app/pricing/page.tsx:72`).

**Why this fails:** The new `persona-consistency.spec.ts:27-32` asserts at runtime against `/pricing`:

```ts
test('No "property owners" persona word on any public marketing page', async ({ page }) => {
    for (const path of PUBLIC_PATHS) {
        await page.goto(path)
        const body = (await page.textContent('body')) ?? ''
        expect(body, `path: ${path}`).not.toMatch(/property owners?\b/i)
    }
})
```

`PUBLIC_PATHS` includes `/pricing`. The Starter plan description renders into the visible body of every `/pricing` view. The regex `/property owners?\b/i` matches "property owners" (plural) and "property owner" (singular). The test will fail.

**Why this matters beyond the test:** The phase 4 contract is "every public marketing page uses 'landlords' as the canonical persona word — no 'property owners' in TenantFlow buyer-context copy" (Plan 04-01 must_haves[0]; CONS-01). The Starter plan description is buyer-context copy on the highest-conversion page. This is the same class of miss as cycle-1's CR-01: a copy surface outside the explicit research locator (table § A enumerated 25 files; `src/config/pricing.ts` was inspected for the DocuSeal KEEPs at lines 153 + 187 but the persona-word audit didn't flag line 100 because the table didn't extend to plan descriptions).

This is not a regression of cycle-1 fixes; it survived all 23 commits on the branch because the find-and-replace was always file-list-driven, never text-driven.

**Fix:**

```diff
--- a/src/config/pricing.ts
+++ b/src/config/pricing.ts
@@ -97,7 +97,7 @@ export const PRICING_PLANS: Record<string, PricingConfig> = {
 		id: 'STARTER',
 		planId: 'starter',
 		name: 'Starter',
-		description: 'Ideal for property owners managing a few properties',
+		description: 'Ideal for landlords with 1–5 rentals',
 		price: {
```

The replacement aligns to the segment-qualified variant per CONS-01 (mirrors the `home-faq.tsx:21` "landlords with 1–5 rentals" already shipped in Plan 04-01 Task 1, which matches the Starter plan's actual unit cap of 5 properties / 25 units). Use a U+2013 en-dash, not a hyphen — consistent with all other locked-phrase surfaces (`marketing-home.tsx:48, 67`, `page.tsx:16, 40`, `pricing-card-featured.tsx:192`, `generate-metadata.ts` ×3, `home-faq.tsx:21`).

**Spot-checked the other two plan descriptions:**

- `GROWTH.description = 'For growing portfolios that need advanced features'` — clean, no persona word
- `TENANTFLOW_MAX.description = 'Enterprise solution for property management professionals'` — contains "property management professionals" which does NOT match `/property owners?\b/i` and does NOT match `/property managers?\b/i` (the regex requires "manager" + optional "s" + word boundary; "professionals" sits after "management" without "manager"). This string survives the e2e but it IS technically a fourth persona variant ("property management professionals") on the highest-leverage page. NOT enumerated as a P0/P1 because (a) it doesn't fail any locked test, (b) it's defensible as describing a job role rather than a persona word, and (c) Phase 5 (PRICE-06) will rewrite the Max card anyway. Flagging it inline so the executor can decide whether to swap it to "Enterprise solution for landlords with unlimited rentals" or similar in the same commit — purely a judgment call.

The Starter `description` is the only P0.

---

### P2 — Medium (non-blocking per perfect-PR gate)

#### IN-01: persona-consistency.spec.ts site-wide DocuSeal threshold (≤15) still uncalibrated

**File:** `tests/e2e/tests/public/persona-consistency.spec.ts:153`
**Category:** test-quality

**Issue:** Same as cycle-1 IN-01. The site-wide DocuSeal mention threshold remains at `≤15` with the comment "Calibrate down after first run if budget allows." Cycle 1 explicitly noted IN-01 was NOT addressed because calibration requires a runtime measurement (Vercel preview run or local `pnpm dev` + `pnpm test:e2e`). After CR-01 lands and the test actually runs to completion, the executor should capture the real count and tighten the threshold to `(actual + 2)` for noise tolerance.

**Mitigation:** non-blocking per perfect-PR gate (P2 only). The upper bound of 15 is loose enough that real DocuSeal mentions (~5-7 expected: pricing.ts ×2 plans, pricing-comparison-table row, faqs.ts:78, logo-cloud rendered across N pages, features-client integrations subtitle, JSON-LD featureList) leave headroom — the test will still detect a major regression. But shipping a test that's uncalibrated weakens regression detection.

**Fix:** after CR-01 lands and the e2e runs once, capture the actual DocuSeal-count from the test output (Playwright reporter), tighten the threshold to `(actual + 2)`, and drop the placeholder comment. Recommended in the same fix-and-recycle pass that addresses CR-01 — single commit closes both.

---

## Verified Cycle-1 Fix Delta (no new regressions)

Per cycle-2 mandate, every cycle-1 post-fix file was re-read and confirmed:

### CR-01 cycle-1 fix on `src/data/faqs.ts`

- [x] `faqs.ts:43` — "property owner" → "landlord" (singular form). Verified verbatim: `"No. TenantFlow is built for the landlord — tenants are records you keep for your own tracking..."`.
- [x] `faqs.ts:48` — "property owner" → "landlord". Verified verbatim: `'...store every lease, receipt, and inspection report in a per-entity document vault with global search and bulk-download. Everything a landlord needs to replace the spreadsheet.'`.
- [x] `faqs.ts:53` — "Property owners" → "Landlords". Verified verbatim: `'Landlords report spending less time on admin: centralized records replace spreadsheets and email threads, maintenance requests are tracked with vendor and cost history, and lease e-signing cuts days off renewals. Results vary by portfolio.'`.
- [x] `faqs.ts:101-103` — `"What kind of results do owners report?"` and the answer `"Owners typically tell us..."` — bare `Owners` retained per cycle-1 note (research carve-out for context-sensitive bare `owner`/`owners`). The e2e regex `/property owners?\b/i` does NOT match bare `Owners` (requires preceding "property"), so this stays clean.
- [x] All three persona-word fixes preserved DocuSeal de-amp from earlier commits (no DocuSeal substring re-introduced via the prose flip).
- [x] No e2e-relevant regression: e2e regex `/property owners?\b/i` returns zero matches against the post-fix `faqs.ts` content (verified via direct grep — the only `property owner*` occurrence in `src/` outside `src/components/leases/`, `src/components/profiles/owner/`, `src/lib/templates/lease-template.ts`, and `src/lib/constants/lease-signature-errors.ts` is the unrelated `pricing.ts:100` flagged as CR-01 above, plus in-product UX surfaces that never render onto PUBLIC_PATHS).

### WR-01 cycle-1 fix on `src/app/help/page.tsx:24`

- [x] Metadata description now reads: `description: 'Get help with TenantFlow property management software. Browse setup guides, feature tutorials, and support resources for landlords.'` — "and operators" successfully dropped.
- [x] No collateral damage: rest of the file (hero subtitle line 36, alt text line 45, popular-resources cards at 144-172, CTA at 197-201) all use "landlords" / "landlord-only platform" consistently.
- [x] `<head>`-only string, so no impact on persona-consistency e2e body assertions.

### WR-02 cycle-1 fix on `src/app/blog/page.tsx:18-19` + `src/app/resources/page.tsx:24`

- [x] `blog/page.tsx:18` — `title: 'Property Management Blog — Tips for Landlords'` (was "...for Property Owners & Operators").
- [x] `blog/page.tsx:19` — `description: 'Landlord tips, rental property administration guides, ...'` (was "Property owner tips, ...").
- [x] `resources/page.tsx:24` — `title: 'Free Landlord Resources — Templates & Tools'` (was "Free Property Owner Resources...").
- [x] All three are `<head>`-rendered (createPageMetadata → Next.js `Metadata` export), so they don't affect `textContent('body')` e2e assertions, but they're now SERP-/social-card-clean for the CONS-01 SEO contract.
- [x] Spot-checked `resources/page.tsx:182` (Free Downloads subtitle) still reads "Printable tools and reference guides for landlords" (Plan 04-01 Task 1 fix preserved).
- [x] `blog/page.tsx`'s `<BlogClient>` consumer wasn't touched — no rendering regression.

### IN-02 cycle-1 hardening on `src/components/sections/__tests__/home-faq.test.tsx` + `src/components/sections/home-faq.tsx`

- [x] `home-faq.tsx:12` — `homeFaqs` is now a named export (was a local const). Verified the production component still consumes it correctly via `<FaqsAccordion faqs={homeFaqs} defaultOpenIndex={0} />` at line 56.
- [x] `home-faq.test.tsx:10` — imports `import { HomeFaq, homeFaqs } from '../home-faq'`. Path resolves cleanly (relative `../home-faq` from `__tests__/`).
- [x] `home-faq.test.tsx:13-14` — assertion `expect(homeFaqs).toHaveLength(5)` directly against the source array (replaces the brittle button-text-ends-with-`?` heuristic).
- [x] `home-faq.test.tsx:17-20` — additional cross-check `homeFaqs.map(f => f.question).not.toContain('Is my data secure?')`.
- [x] `home-faq.test.tsx:22-25` — render-and-cross-check `screen.queryByText(/Is my data secure/i)` retained as a third safety net.
- [x] No type error: `homeFaqs` is inferred as `{ question: string; answer: string }[]`, which is the same shape `<FaqsAccordion>` expects. JSX still type-checks.
- [x] No barrel violation: `home-faq.tsx` is the defining file; the test imports directly from it (not via an `index.ts`).

### Persona-consistency.spec.ts post-cycle-1 regex coverage

- [x] Spec regex `/property owners?\b/i` will find ZERO matches on `/faq`'s body after the cycle-1 prose flip on `faqs.ts:43,48,53` — confirmed via direct grep on `src/data/faqs.ts` (zero `property owner*` occurrences remain in `faqData`).
- [x] Spec regex correctly anchors with `\b` after the optional `s`, so it matches both "property owner" (singular) and "property owners" (plural). Negative test cases like "Owners typically" (faqs.ts:103, kept per carve-out) do NOT match because they lack the preceding "property".
- [x] Test assertions remain consistent with live HTML after cycle-1 metadata swaps on blog/resources: those swaps affect `<head>` only, not `<body>`. The persona-consistency spec only inspects `body` text content (lines 30, 44, 56, 67, 99, 105, 113, 129, 136, 145, 158, 164, 171, 178, 191, 199) plus a single `meta[name="description"]` attribute check on `/pricing` (line 119-121) — that one DOES flip from "owners and real estate investors" to "landlords with 1–15 rentals" via `generate-metadata.ts` and is preserved cleanly.

---

## Verified Locked Decisions

Per 04-RESEARCH.md `Locked Decisions` table — re-verified post-cycle-1:

- [x] **CONS-01 persona word** = "landlords" — honored across all enumerated marketing surfaces. **NEW exception logged at CR-01: `src/config/pricing.ts:100` (Starter description, was outside research locator).** The other deferred candidate (`TENANTFLOW_MAX.description = 'Enterprise solution for property management professionals'`) is judgment-call — does NOT violate any locked test but introduces a fourth persona variant on the same page; flagged inline in CR-01.
- [x] **COPY-01 hero subhead** Candidate A wording — verbatim in `marketing-home.tsx:47-51`. "Track properties, leases, and maintenance" (no "tenants," in the noun list); "tenants stay off the platform" closer.
- [x] **COPY-02 social-proof** "Built for landlords with 1–15 rentals" `<Badge>` on featured pricing card — verbatim in `pricing-card-featured.tsx:192`. `<BadgeCheck>` icon paired. `<Users>` import confirmed removed (no `Users` reference in the post-fix file). Wrapper uses `trustIndicator` variant.
- [x] **COPY-03 tenants-never-login Badge** "Landlord-only · Tenants never log in" with `<Lock>` icon — verbatim in `marketing-home.tsx:34-41`. `aria-hidden="true"` on the icon. `self-start mb-2` for left-alignment. Import line 3 (`import { ArrowRight, Lock } from 'lucide-react'`) destructures cleanly.
- [x] **COPY-04 DocuSeal de-amp** — confirmed clean. Strategic 3 (pricing.ts:153/187, pricing-comparison-table.tsx:58, faqs.ts:78) preserved. KEEP-AS-INFRASTRUCTURE 5 confirmed via direct count: `logo-cloud.tsx`=4, `(auth)/login/page.tsx`=1, `auth/confirm-email/confirm-email-states.tsx`=1, `generate-metadata.ts`=1, `features/features-client.tsx`=1. compare-data.ts now contains 0× DocuSeal and 5× "lease e-sign (Growth+)" (3 capitalized standalone tags + 2 lowercase mid-sentence variants).
- [x] **COPY-05 FAQ canon** — `homeFaqs` array contains exactly 5 entries (verified via Read on `home-faq.tsx:12-38`); pricing FAQ array trimmed to 5 (verified via Read on `pricing-content.tsx:33-59`); "View all FAQs →" link to `/faq` confirmed in pricing-FAQ footer; "Is my data secure?" entry absent from `homeFaqs`; "How does the 14-day free trial work?" entry absent from `pricingFaqs`.
- [x] **COPY-06 bulk-zip softening** — confirmed clean across all 10 surfaces. `value: 500` invariant preserved on `stats-showcase.tsx:31` (Phase 2 NumberTicker contract).
- [x] **COPY-07 mockup names** — confirmed clean.

## Verified Carve-outs (re-checked post-cycle-1)

Per 04-RESEARCH.md § "Carve-outs":

- [x] **(1) Positioning phrases** — `landlord-only platform`, `landlord-only`, `landlord-focused` preserved.
- [x] **(2) RLS technical context** — `row-level security per landlord`, `every landlord's data`, `Custom categories per landlord` preserved (verified via cycle-1's spot-checks; cycle-2 re-confirms `faqs.ts:88` retains `"Postgres row-level security isolates every landlord's data per request."`).
- [x] **(3) Locked phrase** — `Built for landlords with 1–15 rentals` count = 8 occurrences across `marketing-home.tsx` ×1, `page.tsx` ×0 (uses non-prefixed variant "for landlords with 1–15 rentals" ×2), `pricing-card-featured.tsx` ×1, `generate-metadata.ts` ×3 (also non-prefixed variant). All use U+2013 en-dash. The non-prefixed segment "landlords with 1–15 rentals" appears in metadata descriptions verbatim.
- [x] **(4) Compare-data competitor descriptors** — Three `bestFor` strings preserved verbatim in `compare-data.ts`. Persona-consistency e2e at line 134-138 explicitly asserts the Buildium descriptor still renders.
- [x] **(5) Banlist test fixtures** — `src/app/__tests__/marketing-copy-landlord-only.test.ts` `BANNED_*` arrays unchanged (file does not appear in the diff vs main).
- [x] **(6) In-product UX** — `relationship: 'Previous landlord'` form-field label untouched (file not in diff). The 11 in-product `property owner*` occurrences enumerated below are all in authenticated/in-product surfaces (not in PUBLIC_PATHS), so they don't affect the e2e and don't violate CONS-01's "buyer-context marketing" scope.

### In-product `property owner*` occurrences NOT subject to CONS-01

For completeness, the following `property owner*` strings exist in `src/` but are explicitly out of scope (in-product UX, JSDoc, or factual statute citations):

1. `src/app/(owner)/profile/page.tsx:4` — JSDoc comment in authenticated `(owner)` route
2. `src/components/dashboard/owner-dashboard.tsx:121` — JSDoc comment in authenticated dashboard
3. `src/components/leases/rent-increase-notice-dialog.tsx:121, 172` — In-product lease workflow
4. `src/components/leases/detail/lease-detail-utils.ts:64` — In-product lease detail utility
5. `src/components/profiles/owner/profile-card.tsx:118` — In-product profile card
6. `src/lib/constants/lease-signature-errors.ts:79, 93` — In-product error messages
7. `src/lib/templates/lease-template.ts:393, 403, 405` — Statutory text quoting Chicago + Texas property code (factual / legal carve-out — these are real statute names: "Chicago Residential Property Owner and Tenant Ordinance"; "Texas Property Code §92.109/§92.052")

None of these render onto any path in `PUBLIC_PATHS`. CONS-01 explicitly scopes to "TenantFlow buyer-context copy" / "marketing pages" / "highest SEO leverage rewrite targets" — in-product UX and statute citations are outside that scope.

## Verified Regression Guards (re-checked)

### Phase 1 CRIT-03 (Max placeholder pricing)

- [x] `pricing-card-standard.tsx:168` — `<div className="text-3xl font-bold text-foreground">Custom</div>` intact.
- [x] `pricing-comparison-table.tsx:206` — `{MAX_PUBLIC_PRICE_DISPLAY}` constant reference intact.
- [x] `pricing/page.tsx:24` and `:36` — `'Custom pricing, contact sales'` strings present in metadata description AND product schema description.

### Phase 2 NumberTicker invariant

- [x] `stats-showcase.tsx:31` — `value: 500` integer untouched.

### Banlist test (`marketing-copy-landlord-only.test.ts`)

- [x] `BANNED_PHRASES`, `BANNED_FEATURE_CLAIMS`, `BANNED_FABRICATED_IDENTITY_CLAIMS`, `BANNED_STALE_PLAN_REFS`, `BANNED_SLA_CLAIMS`, `BANNED_SUPERLATIVES`, `BANNED_NUMERIC_CLAIMS` all present (grep confirmed 7 BANNED_* arrays). File does not appear in the diff vs main.

### Cross-cutting design-token diff gate

- [x] `git diff main...HEAD -- src/ | grep -E "^\+.*#[0-9a-fA-F]{3,8}\b" | wc -l` → **0** hex additions
- [x] `git diff main...HEAD -- src/ | grep -E "^\+.*rgba?\(" | wc -l` → **0** rgb additions
- [x] `git diff main...HEAD -- src/ | grep -E "^\+.*bg-white" | wc -l` → **0** bg-white additions
- [x] `git diff main...HEAD -- src/ | grep -E "^\+.*\b[0-9]+ms\b" | wc -l` → **0** inline-ms additions

### Other invariants verified clean

- [x] `<Badge>` and `<Lock>` each imported exactly once in `marketing-home.tsx` (Badge at line 6, Lock destructured into the existing lucide-react import at line 3 alongside `ArrowRight`).
- [x] Locked badge text "Landlord-only · Tenants never log in" uses U+00B7 middle dot character consistently in `marketing-home.tsx:40` and persona-consistency.spec.ts (3 occurrences).
- [x] Hero contradiction phrase "tenants never have to log in" returns ZERO matches across `src/` and `tests/` (the elevated Badge variant uses "Tenants never log in" without "have to" — distinct).
- [x] All occurrences of "1–15 rentals" use U+2013 en-dash consistently.
- [x] About page renders zero "property managers" body text (Plan 04-01 Task 2 wrong-word fixes preserved at lines 78, 95, 201).
- [x] Hero dashboard mockup activity-row name + avatar pairs consistent: JC/Jamie Carter, AR/Alex Rivera, SP/Sam Patel.

---

## REVIEW COMPLETE — VERDICT: NEEDS-FIX

1 P0 finding. The cycle-1 fix delta is clean (no new regressions introduced by `e09da36f0`); the blocker is a research-locator gap (`pricing.ts:100`) that survived all 23 commits because the find-and-replace was always file-list-driven rather than text-driven, mirroring the same class of miss as cycle-1's CR-01.

The fix is a single one-line edit. After it lands, the perfect-PR gate clock RESETS — two more zero-finding cycles are required for merge.

The P2 (uncalibrated DocuSeal threshold) does NOT block the gate per the project's perfect-PR feedback memory but should ride into the same fix commit so the test isn't shipped with a placeholder threshold.

Recommended fix-pass commit message: `fix(phase-04): cycle-2 review fixes — pricing.ts Starter description + DocuSeal threshold calibration`.

_Reviewed: 2026-05-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Cycle: 2 of N_
