# Phase 4 Code Review — Cycle 3

**Reviewed:** 2026-05-10
**Scope:** PR #688 (gsd/phase-04-persona-copy) — full diff vs `main` (44 files changed; cycle-2 fix at `d39afbf36` confirmed on branch)
**Reviewer:** gsd-code-reviewer
**Cycle 1 result:** 1 P0 + 2 P1 + 3 P2; fixes landed in `e09da36f0`.
**Cycle 2 result:** 1 P0 + 1 P2; fixes landed in `d39afbf36`.
**Perfect-PR gate state:** This is the first chance for cycle 1 of the "2 consecutive zero-finding cycles" merge-gate. If cycle 3 PASSES, cycle 4 must also PASS to satisfy the gate.

## Summary

| Severity | Count |
|----------|-------|
| P0 (BLOCKER) | 0 |
| P1 (HIGH) | 1 |
| P2 (MEDIUM) | 1 |
| P3 (LOW) | 0 |

**Verdict: NEEDS-FIX** (1 P1 — cycle does NOT count toward perfect-PR gate; after fix lands, two more zero-finding cycles are required for merge)

The two cycle-2 fixes (`pricing.ts:100` STARTER description flip + `pricing.ts:167` TENANTFLOW_MAX description flip) land cleanly. Both new descriptions use the locked persona word ("landlords"), use canonical typographic conventions (en-dash U+2013 for the "1–5 rentals" range; em-dash U+2014 for the parenthetical break in "21+ rentals — unlimited scale and API access" — consistent with site-wide em-dash usage in marketing parentheticals), and segment-anchor consistently with `home-faq.tsx:21` ("landlords with 1–5 rentals" matches the actual 5-property/25-unit Starter cap). Cycle-2's `mapDocumentRow`-equivalent boundary/regression tests pass: `pricing/__tests__/page.test.ts` has zero assertion on plan descriptions, no other test asserts plan description content, the Starter and Max descriptions render via `PricingCardStandard.tsx:162` cleanly, and the Growth description (untouched) renders via `PricingCardFeatured.tsx:154`. No collateral damage to pricing tests.

The blocker for cycle 3 is `src/app/privacy/page.tsx:472`, which contains the body text `"platform designed to help property managers efficiently manage properties, tenants, leases, and financial operations."` This is the **same class of miss** as cycle-1 CR-01 (`faqs.ts`) and cycle-2 CR-01 (`pricing.ts:100`): a research-locator gap where a public marketing surface that wasn't enumerated in 04-RESEARCH.md § "Execution Surfaces" still violates the CONS-01 contract. `/privacy` is a public route consuming `PageLayout` (verified line 16); the body text "property managers" is factually wrong (TenantFlow is landlord-only, NOT for managing-others'-property — same class of error as the about-page wrong-word fixes that Plan 04-01 Task 2 corrected).

The reason this surfaced now and not in cycles 1 or 2: `/privacy` is NOT in the persona-consistency.spec.ts `PUBLIC_PATHS` array (only 11 paths: `/`, `/about`, `/faq`, `/pricing`, `/contact`, `/compare/{buildium,appfolio,rentredi}`, `/help`, `/resources`, `/features`). Both prior reviewers' grep sweeps focused on the e2e-covered paths and the Plan 04-01 + Plan 04-02 file lists. The cycle-3 mandate to re-run the FULL sitewide grep exposed the gap.

The single P2 is the same uncalibrated DocuSeal-count threshold from cycle-1 IN-01 + cycle-2 IN-01 — non-blocking per the perfect-PR gate, but should be tightened in this same fix pass once a real measurement is captured.

## Findings

### P0 — Blockers

(none)

---

### P1 — High

#### WR-01: privacy/page.tsx:472 body text "property managers" violates CONS-01 on a public marketing surface

**File:** `src/app/privacy/page.tsx:472`
**Category:** correctness / locked-decision-violation / research-locator gap

**Issue:** The Privacy Policy page (a public marketing route consumed via `PageLayout`) renders this body text in its closing section:

```tsx
<p className="mt-4">
    <strong>TenantFlow</strong> is a property management software
    platform designed to help property managers efficiently manage
    properties, tenants, leases, and financial operations.
</p>
```

"property managers" is one of the four rejected persona variants enumerated in 04-RESEARCH.md § "Pluralization variants summary":

> `property manager` ↔ `property managers` (only the 3 about-page + 1 testimonials-section instances flip; competitor-descriptor `compare-data.ts` rows stay)

The about-page 3× wrong-word fix and testimonials-section 1× fix both shipped in Plan 04-01 Task 1+2. The privacy-page occurrence is a fourth instance that was missed because (a) the research locator table § A enumerated 25 files and `/privacy` was not among them, (b) the persona-consistency.spec.ts `PUBLIC_PATHS` array doesn't include `/privacy`, and (c) Plan 04-01 + Plan 04-02 file lists didn't enumerate `src/app/privacy/page.tsx`.

**Why this matters beyond the e2e:** Phase 4's CONS-01 contract is "every public marketing page uses 'landlords' as the canonical persona word — no 'property managers' in TenantFlow buyer-context copy" (Plan 04-01 must_haves[0]). `/privacy` is a public marketing surface — verified at `src/app/privacy/page.tsx:16` rendering inside `<PageLayout>` (the same wrapper used for /about, /faq, /pricing, etc.). The body text is buyer-context copy describing TenantFlow's audience.

**Why this is P1 not P0:** The new `persona-consistency.spec.ts` regex `/property managers?\b/i` runs on `/about` only (line 101), not on `/privacy` — so the e2e suite passes. No locked test fails. But the SERP / social-card / on-page text for `/privacy` will still describe TenantFlow as "for property managers" while every other surface says "for landlords" — exactly the multi-persona inconsistency CONS-01 exists to fix.

**Why this is the same class of miss as cycle-1 CR-01 and cycle-2 CR-01:** All three are research-locator gaps where a copy surface outside the explicit Phase 4 task scope still violates the locked CONS-01 contract. The find-and-replace was always file-list-driven, never text-driven, and Phase 4's research locator table didn't enumerate every public marketing surface.

**Fix:**

```diff
--- a/src/app/privacy/page.tsx
+++ b/src/app/privacy/page.tsx
@@ -469,7 +469,7 @@ export default function PrivacyPage() {
                            <p className="mt-4">
                                <strong>TenantFlow</strong> is a property management software
-                               platform designed to help property managers efficiently manage
+                               platform designed to help landlords efficiently manage
                                properties, tenants, leases, and financial operations.
                            </p>
```

Recommended commit message: `fix(phase-04): cycle-3 review fix — privacy page property managers wrong-word`.

**Optional defensive hardening (NOT required for this finding to be considered fixed):** extend `persona-consistency.spec.ts` `PUBLIC_PATHS` to include `/privacy` and `/terms` so future text-rot in legal pages gets caught by the e2e. This is a P3-equivalent suggestion — flagging here so the executor can decide whether to bundle it into the same fix commit.

---

### P2 — Medium (non-blocking per perfect-PR gate)

#### IN-01: persona-consistency.spec.ts site-wide DocuSeal threshold (≤15) still uncalibrated

**File:** `tests/e2e/tests/public/persona-consistency.spec.ts:153`
**Category:** test-quality

**Issue:** Same as cycle-1 IN-01 + cycle-2 IN-01. The site-wide DocuSeal mention threshold remains at `≤15` with the comment "Calibrate down after first run if budget allows." This is the third cycle this finding has appeared. Calibration requires a runtime measurement (Vercel preview run or local `pnpm dev` + `pnpm test:e2e`) and was deferred in cycles 1 and 2 because addressing the P0 + P1 findings was the critical path.

After WR-01 lands and a Vercel preview deploys, the executor should:
1. Run the e2e against the preview
2. Capture the actual DocuSeal-count from a debug log (e.g., `console.log(totalMentions)` temporarily, or Playwright reporter output)
3. Tighten the threshold to `(actual + 2)` for noise tolerance
4. Drop the placeholder comment

**Mitigation:** non-blocking per perfect-PR gate (P2 only). The upper bound of 15 leaves headroom. Real DocuSeal mentions expected: `pricing.ts:153` (Growth) + `pricing.ts:187` (Max) + `pricing-comparison-table.tsx:58` + `faqs.ts:78` + logo-cloud rendered ~5x across PUBLIC_PATHS + `features-client.tsx:61` integrations subtitle + JSON-LD `featureList` = ~10-12 measured mentions. Threshold ≤ 15 leaves ~3 buffer; tightening to (actual + 2) ≈ 14 is the recommended end-state.

**Fix:** include in the same commit as WR-01 fix to close cycle-3 findings cleanly.

---

## Verified Cycle-2 Fix Delta (no new regressions)

Per cycle-3 mandate, every cycle-2 post-fix file was re-read and confirmed:

### CR-01 cycle-2 fix on `src/config/pricing.ts:100` (STARTER description)

- [x] Description now reads: `description: 'Ideal for landlords with 1–5 rentals',`
- [x] Uses U+2013 en-dash (verified byte-level via Python: `Non-ASCII at pos 42: U+2013`).
- [x] Segment-anchor matches Starter plan's actual cap (5 properties × 25 units, line 110-114).
- [x] Aligns with `home-faq.tsx:21` ("landlords with 1–5 rentals") for sitewide consistency.
- [x] Does NOT introduce a fourth persona variant — uses the locked "landlords" word per CONS-01.
- [x] Renders via `PricingCardStandard.tsx:162` (`<p className="text-sm text-muted-foreground">{plan.description}</p>`) consumed by `BentoPricingSection.tsx:30` (`description: plan.description`).
- [x] No test asserts on this string — `pricing/__tests__/page.test.ts` checks productJsonLd offers + descriptions but does NOT assert on plan-card description content. Zero collateral test breakage.

### Adjacent cycle-2 fix on `src/config/pricing.ts:167` (TENANTFLOW_MAX description)

- [x] Description now reads: `description: 'For landlords with 21+ rentals — unlimited scale and API access',`
- [x] Em-dash U+2014 is correct typographic convention for parenthetical break (verified byte-level: `Non-ASCII at pos 47: U+2014`).
- [x] Em-dash usage is consistent with site-wide marketing copy (counted 14 em-dash occurrences vs 9 en-dash across 9 sampled marketing files; the convention is en-dash for ranges, em-dash for parenthetical breaks).
- [x] Segment-anchor "21+ rentals" is factually accurate — Max plan has `properties: -1` (unlimited) at line 177, so "21+ rentals" describes the entry threshold for graduating off Growth (which caps at 20 properties at `pricing.ts:143`).
- [x] Eliminates the fourth persona variant ("property management professionals") flagged in cycle-2 inline note.
- [x] Renders via the same `PricingCardStandard.tsx:162` path (Max card uses `variant="enterprise"` per `bento-pricing-section.tsx:143`).

### Persona-consistency.spec.ts post-cycle-2 regex coverage

- [x] Spec regex `/property owners?\b/i` will find ZERO matches on `/pricing` after the cycle-2 flip on `pricing.ts:100` — confirmed via direct grep: only remaining `property owner*` occurrences in `src/` are in carve-out 6 surfaces (in-product UX, statute citations, JSDoc, test fixtures) that don't render onto any path in PUBLIC_PATHS.
- [x] Spec regex `/property managers?\b/i` runs on `/about` only (line 101) — `/about` body still has zero "property managers" matches (cycle-1 verified all 3 lines 78, 95, 201 fixed). The newly-found `/privacy` violation is NOT covered by this regex because `/privacy` is not in PUBLIC_PATHS.
- [x] No fourth persona variant ("property management professionals") survives anywhere in `src/` (zero matches).
- [x] No "owner-operators" or "real estate investors" anywhere in `src/` (zero matches).

---

## Verified Locked Decisions

Per 04-RESEARCH.md `Locked Decisions` table — re-verified post-cycle-2:

- [~] **CONS-01 persona word** = "landlords" — honored across all enumerated marketing surfaces. **NEW exception logged at WR-01: `src/app/privacy/page.tsx:472` (body text, was outside research locator).** All other persona variants ("property owners", "real estate investors", "property management professionals", "owner-operators") return ZERO matches across `src/` (excluding the seven carve-out 6 surfaces enumerated in cycle-2 review).
- [x] **COPY-01 hero subhead** Candidate A wording — verbatim in `marketing-home.tsx:47-51`.
- [x] **COPY-02 social-proof** "Built for landlords with 1–15 rentals" `<Badge>` on featured pricing card — verbatim in `pricing-card-featured.tsx:192`.
- [x] **COPY-03 tenants-never-login Badge** "Landlord-only · Tenants never log in" with `<Lock>` icon — verbatim in `marketing-home.tsx:34-41`.
- [x] **COPY-04 DocuSeal de-amp** — confirmed clean. Strategic 3 (pricing.ts:153/187, pricing-comparison-table.tsx:58, faqs.ts:78) preserved. KEEP-AS-INFRASTRUCTURE 5 confirmed (logo-cloud=4, login=1, confirm-email=1, generate-metadata.ts=1, features-client.tsx=1).
- [x] **COPY-05 FAQ canon** — `homeFaqs` array contains exactly 5 entries; pricing FAQ array trimmed to 5; "View all FAQs →" link to `/faq` confirmed in pricing-FAQ footer.
- [x] **COPY-06 bulk-zip softening** — confirmed clean across all 10 surfaces. `value: 500` invariant preserved on `stats-showcase.tsx:31`.
- [x] **COPY-07 mockup names** — confirmed clean (Jamie Carter / Alex Rivera / Sam Patel with matching JC/AR/SP avatars).

## Verified Carve-outs (re-checked post-cycle-2)

Per 04-RESEARCH.md § "Carve-outs":

- [x] **(1) Positioning phrases** — `landlord-only platform`, `landlord-only`, `landlord-focused` preserved.
- [x] **(2) RLS technical context** — `row-level security per landlord`, `every landlord's data`, `Custom categories per landlord` preserved.
- [x] **(3) Locked phrase** — `Built for landlords with 1–15 rentals` preserved verbatim across all surfaces. All en-dash uses are U+2013 (verified). The new STARTER description uses "1–5 rentals" (en-dash U+2013), distinct from but consistent with the locked phrase.
- [x] **(4) Compare-data competitor descriptors** — Three `bestFor` strings preserved verbatim in `compare-data.ts`. Persona-consistency e2e at line 134-138 explicitly asserts the Buildium descriptor still renders.
- [x] **(5) Banlist test fixtures** — `marketing-copy-landlord-only.test.ts` `BANNED_*` arrays unchanged (file does not appear in the diff vs main).
- [x] **(6) In-product UX** — `relationship: 'Previous landlord'` form-field label untouched. The 9 in-product `property owner*` occurrences enumerated in cycle-2 review remain unchanged. Adding to that list per cycle-3 grep:
  - `src/components/tenants/__tests__/add-tenant-form.property.test.tsx:284` — `'Forbidden: property owner access required'` (unit test fixture, not body content)
  - `src/components/profiles/owner/profile-card.tsx:118` — in-product profile card label (carve-out 6)
  - `src/lib/templates/lease-template.ts:393` — Chicago Residential Property Owner and Tenant Ordinance (statute citation)
  - `tests/e2e/tests/owner/owner-authentication.e2e.spec.ts:13` — JSDoc comment in authenticated-route e2e (carve-out 6)
  - `tests/e2e/tests/_archived/...` — 4 archived e2e references (carve-out 6 — not currently active)
  - `tests/e2e/test-data/stripe-test-data.ts:131` — test fixture comment (carve-out 6)

  None of these render onto any path in PUBLIC_PATHS. CONS-01 explicitly scopes to "TenantFlow buyer-context copy" / "marketing pages" / "highest SEO leverage rewrite targets" — in-product UX, statute citations, archived tests, and unit-test fixtures are outside that scope.

## Verified Regression Guards (re-checked)

### Phase 1 CRIT-03 (Max placeholder pricing)

- [x] `pricing-card-standard.tsx:168` — `<div className="text-3xl font-bold text-foreground">Custom</div>` intact.
- [x] `pricing-comparison-table.tsx:206` — `{MAX_PUBLIC_PRICE_DISPLAY}` constant reference intact.
- [x] `pricing/page.tsx:24` and `:36` — `'Custom pricing, contact sales'` strings present in metadata description AND product schema description.
- [x] `pricing/__tests__/page.test.ts` UNCHANGED on this branch — Phase 1 CRIT-03 assertions (productJsonLd offers excludes Max; description contains "Custom pricing, contact sales") still pass against the post-cycle-2 `pricing.ts`. The FAQ `mainEntity.length === 5` assertion (added in Plan 04-02) passes against the trimmed `pricingFaqs`.

### Phase 2 NumberTicker invariant

- [x] `stats-showcase.tsx:31` — `value: 500` integer untouched.

### Banlist test (`marketing-copy-landlord-only.test.ts`)

- [x] `BANNED_PHRASES`, `BANNED_FEATURE_CLAIMS`, `BANNED_FABRICATED_IDENTITY_CLAIMS`, `BANNED_STALE_PLAN_REFS`, `BANNED_SLA_CLAIMS`, `BANNED_SUPERLATIVES`, `BANNED_NUMERIC_CLAIMS` all present. File does not appear in the diff vs main.

### Cross-cutting design-token diff gate

- [x] `git diff main...HEAD -- src/ | grep -E "^\+.*#[0-9a-fA-F]{3,8}\b" | wc -l` → **0** hex additions
- [x] `git diff main...HEAD -- src/ | grep -E "^\+.*rgba?\(" | wc -l` → **0** rgb additions
- [x] `git diff main...HEAD -- src/ | grep -E "^\+.*bg-white" | wc -l` → **0** bg-white additions
- [x] `git diff main...HEAD -- src/ | grep -E "^\+.*\b[0-9]+ms\b" | wc -l` → **0** inline-ms additions

### Other invariants verified clean

- [x] `<Badge>` and `<Lock>` each imported exactly once in `marketing-home.tsx` (Badge at line 6, Lock destructured into the existing lucide-react import at line 3 alongside `ArrowRight`).
- [x] Locked badge text "Landlord-only · Tenants never log in" uses U+00B7 middle dot character consistently in `marketing-home.tsx:40` and persona-consistency.spec.ts (3 occurrences).
- [x] Hero contradiction phrase "tenants never have to log in" returns ZERO matches across `src/` (only remaining occurrence is in `tests/e2e/tests/public/persona-consistency.spec.ts:57` where it appears in a `expect(body).not.toContain(...)` negative-assertion — correct usage).
- [x] All occurrences of "1–15 rentals" use U+2013 en-dash consistently. The new "1–5 rentals" in `pricing.ts:100` ALSO uses U+2013 en-dash (verified byte-level).
- [x] About page renders zero "property managers" body text (verified via grep: lines 78, 95, 201 fixes preserved).
- [x] Hero dashboard mockup activity-row name + avatar pairs consistent: JC/Jamie Carter, AR/Alex Rivera, SP/Sam Patel.
- [x] No fabricated subscriber-count claims ("Join 500+", "500+ Growth subscribers", "2,500+ user") in any production source — only present in negative-assertion regexes within persona-consistency.spec.ts.

---

## REVIEW COMPLETE — VERDICT: NEEDS-FIX

1 P1 finding (`privacy/page.tsx:472` body text "property managers" → must flip to "landlords"). The cycle-2 fix delta is clean (no new regressions introduced by `d39afbf36`); the blocker is a research-locator gap (`/privacy` was not enumerated in 04-RESEARCH.md § Execution Surfaces nor in either Plan 04-01 or Plan 04-02's file lists, and is not in persona-consistency.spec.ts's PUBLIC_PATHS array).

The fix is a single one-line edit. After it lands, the perfect-PR gate clock RESETS — two more zero-finding cycles are required for merge.

The P2 (uncalibrated DocuSeal threshold) does NOT block the gate per the project's perfect-PR feedback memory but should ride into the same fix commit so the test isn't shipped with a placeholder threshold that has now lingered for three review cycles.

Recommended fix-pass commit message: `fix(phase-04): cycle-3 review fix — privacy page property managers wrong-word + DocuSeal threshold calibration`.

Optional defensive hardening (P3-equivalent, not required to clear this finding): extend `PUBLIC_PATHS` in `persona-consistency.spec.ts` to include `/privacy` and `/terms`. This would catch future legal-page text-rot in the e2e and prevent the same class of miss from surfacing in v1.x phases.

_Reviewed: 2026-05-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Cycle: 3 of N_
