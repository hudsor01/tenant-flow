# Phase 4 Code Review — Cycle 4

**Reviewed:** 2026-05-10
**Scope:** PR #688 (gsd/phase-04-persona-copy) — full diff vs `main` (44 files changed; cycle-3 fix at `79b89dbc0` confirmed on branch)
**Reviewer:** gsd-code-reviewer
**Cycle 1 result:** 1 P0 + 2 P1 + 3 P2; fixes landed in `e09da36f0`.
**Cycle 2 result:** 1 P0 + 1 P2; fixes landed in `d39afbf36`.
**Cycle 3 result:** 1 P1 + 1 P2; fixes landed in `79b89dbc0`.
**Perfect-PR gate state:** This was supposed to be the first chance for cycle 1 of the "2 consecutive zero-finding cycles" merge-gate. If cycle 4 PASSES, cycle 5 must also PASS. If cycle 4 finds anything, the gate restarts.

## Summary

| Severity | Count |
|----------|-------|
| P0 (BLOCKER) | 0 |
| P1 (HIGH) | 1 |
| P2 (MEDIUM) | 1 |
| P3 (LOW) | 0 |

**Verdict: NEEDS-FIX** (1 P1 — cycle does NOT count toward perfect-PR gate; after fix lands, two more zero-finding cycles are required for merge)

The cycle-3 fix on `src/app/privacy/page.tsx:472` ("property managers" → "landlords") landed cleanly. Cycle 4 re-verified the full diff:

- All 7 locked decisions (CONS-01 persona word, COPY-01 hero subhead, COPY-02 social-proof, COPY-03 tenants-never-login Badge, COPY-04 DocuSeal de-amp, COPY-05 FAQ canon, COPY-06 bulk-zip softening, COPY-07 mockup names) honored verbatim.
- All 6 carve-outs (positioning phrases, RLS technical context, locked phrase, compare-data competitor descriptors, banlist test fixtures, in-product UX) preserved.
- Phase 1 CRIT-03 regression guards intact: `>Custom<`, `{MAX_PUBLIC_PRICE_DISPLAY}`, `Custom pricing, contact sales` all present.
- Phase 2 NumberTicker invariant intact: `value: 500` on `stats-showcase.tsx:31`.
- Cross-cutting design-token diff gate: 0 hex / 0 rgb / 0 bg-white / 0 inline-ms additions.
- Cycle 1, 2, 3 fixes all preserved without regression.
- **Comprehensive sitewide grep for persona variants** (`property owners?\b`, `property managers?\b`, `real estate investors?\b`, `property management professionals?\b`, `owner-operators?\b`, `rental investors?\b`) across all of `src/app/`, `src/components/sections/`, `src/components/landing/`, `src/components/pricing/`, `src/components/layout/`, `src/components/features/`, `src/data/`, `src/config/`, `src/lib/seo/`, `src/lib/generate-metadata.ts`: **ZERO matches** outside documented carve-outs (compare-data.ts:33 Buildium descriptor, in-product UX surfaces in `src/components/leases/`, `src/components/profiles/owner/`, `src/lib/templates/lease-template.ts`, `src/lib/constants/lease-signature-errors.ts`).
- Audit-ui-2026-05-08.md items #7, #21–#27: all addressed.

The blocker for cycle 4 is the **explicit test-coverage criterion** from cycle-4's review dimensions: "Verify the persona-consistency.spec.ts e2e PUBLIC_PATHS list covers every public marketing page. If a public page exists but isn't in the test, that's a test-coverage P1." The e2e covers 11 paths but `src/proxy.ts` PUBLIC_ROUTES enumerates 17+ public marketing surfaces, leaving 5 real public marketing pages (`/blog`, `/privacy`, `/terms`, `/security-policy`, `/support`) uncovered by the persona e2e. Cycle 3 flagged this as P3-equivalent ("optional defensive hardening"), but cycle 4 escalates it to P1 per the review-dimensions instruction. This same gap is what allowed three consecutive cycles to surface persona-word leaks (cycle-1: `faqs.ts` → `/faq` was covered; cycle-2: `pricing.ts:100` → `/pricing` was covered; cycle-3: `privacy/page.tsx:472` → `/privacy` was NOT covered, requiring manual sweep). The persistent miss-pattern is exactly what test coverage exists to prevent.

The lone P2 is the same uncalibrated DocuSeal-count threshold from cycle-1 + cycle-2 + cycle-3 IN-01 — non-blocking per the perfect-PR gate, but flagging for the fourth time.

## Findings

### P0 — Blockers

(none)

---

### P1 — High

#### WR-01: persona-consistency.spec.ts PUBLIC_PATHS missing 5 public marketing pages → test-coverage gap

**File:** `tests/e2e/tests/public/persona-consistency.spec.ts:12-24`
**Category:** test-coverage gap / regression-detection weakness

**Issue:** The e2e `PUBLIC_PATHS` array enumerates 11 paths:

```typescript
const PUBLIC_PATHS = [
    '/',
    '/about',
    '/faq',
    '/pricing',
    '/contact',
    '/compare/buildium',
    '/compare/appfolio',
    '/compare/rentredi',
    '/help',
    '/resources',
    '/features',
] as const
```

`src/proxy.ts:10-38` enumerates the canonical public-route allowlist (`PUBLIC_ROUTES`). Stripping out auth routes, redirects, sitemap/feed assets, and the `/signup` redirect-loop, the **real public marketing surfaces** are:

| Path | In e2e PUBLIC_PATHS? | Public marketing surface? |
|------|---------------------|----------------------------|
| `/` | ✅ | Yes |
| `/about` | ✅ | Yes |
| `/blog` | ❌ | **Yes — public blog index** |
| `/contact` | ✅ | Yes |
| `/faq` | ✅ | Yes |
| `/features` | ✅ | Yes |
| `/help` | ✅ | Yes |
| `/pricing` | ✅ | Yes |
| `/privacy` | ❌ | **Yes — legal/marketing surface** |
| `/resources` | ✅ | Yes |
| `/security-policy` | ❌ | **Yes — legal/marketing surface** |
| `/support` | ❌ | **Yes — public support surface** |
| `/terms` | ❌ | **Yes — legal/marketing surface** |
| `/compare/{buildium,appfolio,rentredi}` | ✅ | Yes |

**Five real public marketing pages are NOT in the e2e PUBLIC_PATHS:** `/blog`, `/privacy`, `/terms`, `/security-policy`, `/support`. (Skipping `/login` because it's auth-context, not marketing-context, and skipping `/signup` because it's a redirect loop per audit #5.)

**Why this is P1 in cycle 4 specifically:** The cycle-4 review dimensions instruct: "If a public page exists but isn't in the test, that's a test-coverage P1." The dimensions also note: "The cycles 1-3 each found a different file outside the research locator: faqs.ts (cycle 1 P0), pricing.ts (cycle 2 P0), privacy/page.tsx (cycle 3 P1). The shared mechanism: research enumerated some files but missed others on similar marketing surfaces." This is exactly the regression-detection weakness that the e2e exists to prevent — and it's now **demonstrably under-scoped** (cycle-3 found `/privacy` precisely because `/privacy` is outside the e2e). The same gap protects `/blog`, `/terms`, `/security-policy`, `/support` from regression detection.

**Why this is P1 not P0:** No locked test currently fails. All five missing pages are individually clean today (verified via direct `grep -nE "property owners?\b|property managers?\b|real estate investors?\b" src/app/{privacy,terms,security-policy,support,blog}/` returning zero matches at HEAD). The cycle-3 fix on `privacy/page.tsx:472` already happened. But the **next** persona-word drift on any of these five pages will go undetected by the e2e until manually grepped — which is precisely what cycle-1, cycle-2, cycle-3 were forced to do.

**Why this matters for the perfect-PR gate:** The merge gate is "two consecutive zero-finding cycles." The e2e is the durable contract that makes "zero-finding" sustainable post-merge. Shipping with a known under-scoped e2e means future drift on `/blog`, `/privacy`, `/terms`, `/security-policy`, `/support` will surface only via manual grep — and v1.x phases that touch any of those surfaces (Phase 6 Blog Rebuild, Phase 11 TOKEN-02, future legal-page edits) will repeat the cycle-1/2/3 pattern.

**Fix:**

```diff
--- a/tests/e2e/tests/public/persona-consistency.spec.ts
+++ b/tests/e2e/tests/public/persona-consistency.spec.ts
@@ -10,17 +10,22 @@ import { expect, test } from '@playwright/test'
  */

 const PUBLIC_PATHS = [
 	'/',
 	'/about',
+	'/blog',
 	'/faq',
 	'/pricing',
 	'/contact',
 	'/compare/buildium',
 	'/compare/appfolio',
 	'/compare/rentredi',
 	'/help',
 	'/resources',
 	'/features',
+	'/privacy',
+	'/terms',
+	'/security-policy',
+	'/support',
 ] as const
```

After the fix, run the e2e once to confirm all 16 paths pass the persona-word negative assertions (`/property owners?\b/i`, `/Join 500\+|500\+ (Growth|user|subscriber)/i`, `/2,500\+ user/i`). Spot-checked manually at HEAD: all five new paths return zero matches for any persona-variant regex, so the e2e should pass on first run after the path-list extension lands.

**Defensive note on `/blog`:** the blog index renders dynamically from a Supabase `blogs` table (per audit-ui findings #1 + #30). The e2e assertion will pass against whatever content is in the DB at test time. If a future blog post body contains the string "property owners" verbatim, the e2e will fail. That's the correct behavior — phase 4's CONS-01 contract scopes to "every public claim on tenantflow.app", which includes blog post bodies. The audit-ui's deferred Phase 6 (Blog Rebuild) is the right surface to handle author-side persona enforcement; until then, the e2e correctly catches drift.

**Recommended fix-pass commit message:** `fix(phase-04): cycle-4 review fix — extend persona-consistency PUBLIC_PATHS to cover all public marketing surfaces`.

---

### P2 — Medium (non-blocking per perfect-PR gate)

#### IN-01: persona-consistency.spec.ts site-wide DocuSeal threshold (≤15) still uncalibrated (4th cycle)

**File:** `tests/e2e/tests/public/persona-consistency.spec.ts:153`
**Category:** test-quality

**Issue:** Same as cycle-1 IN-01, cycle-2 IN-01, cycle-3 IN-01. The site-wide DocuSeal mention threshold remains at `≤15` with the comment "Calibrate down after first run if budget allows." This is the **fourth cycle** this finding has appeared. After WR-01 lands (extending PUBLIC_PATHS to 16 paths), the actual DocuSeal-count will likely change because `/blog`, `/privacy`, `/terms`, `/security-policy`, `/support` will newly contribute to the total — `/blog` renders a footer / nav with the logo-cloud DocuSeal logo, and the others are mostly DocuSeal-clean but render through `<PageLayout>` which includes the logo-cloud-bearing sections on some routes.

**Mitigation:** non-blocking per perfect-PR gate (P2 only). The upper bound of 15 still leaves headroom even with the expanded PUBLIC_PATHS set (real DocuSeal mentions per page are dominated by logo-cloud renders + JSON-LD featureList + pricing strategic surfaces).

**Fix:** when WR-01 fix lands and the e2e runs against the expanded 16-path PUBLIC_PATHS, capture the actual DocuSeal-count from the test output and tighten the threshold to `(actual + 2)` for noise tolerance. Drop the placeholder comment. Bundling this into the same fix commit as WR-01 is the lightweight option since the threshold WILL need to change anyway after the path-list expansion.

---

## Verified Cycle-3 Fix Delta (no new regressions)

Per cycle-4 mandate, the cycle-3 post-fix file was re-read and confirmed:

### WR-01 cycle-3 fix on `src/app/privacy/page.tsx:472`

- [x] Body text now reads: `platform designed to help landlords efficiently manage` (was "property managers"). Verified via direct grep — zero `property managers` matches in `privacy/page.tsx`.
- [x] No collateral damage to surrounding context (lines 467-474 form a coherent paragraph: "TenantFlow is a property management software platform designed to help landlords efficiently manage properties, tenants, leases, and financial operations.").
- [x] Matches the canonical CONS-01 persona word "landlords" — does NOT introduce a fourth persona variant.
- [x] No additional persona-word violations elsewhere in `privacy/page.tsx` (cycle-4 grep confirmed zero matches for all six rejected persona variants).
- [x] `/terms` and `/security-policy` similarly confirmed clean of persona variants (zero matches; cycle-3 sibling-sweep claim verified).

---

## Verified Locked Decisions (post-cycle-3)

Per 04-RESEARCH.md `Locked Decisions` table — re-verified for cycle 4:

- [x] **CONS-01 persona word** = "landlords" — honored across ALL public marketing surfaces. Cycle-4 sweep confirms zero `property owners?\b`, `property managers?\b`, `real estate investors?\b`, `property management professionals?\b`, `owner-operators?\b`, `rental investors?\b` matches in any of: `src/app/about/`, `src/app/blog/`, `src/app/compare/`, `src/app/contact/`, `src/app/faq/`, `src/app/features/`, `src/app/help/`, `src/app/pricing/`, `src/app/privacy/`, `src/app/resources/`, `src/app/security-policy/`, `src/app/support/`, `src/app/terms/`, `src/app/marketing-home.tsx`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/components/sections/`, `src/components/landing/`, `src/components/pricing/`, `src/components/layout/`, `src/components/features/`, `src/components/marketing/`, `src/data/faqs.ts`, `src/config/pricing.ts`, `src/lib/generate-metadata.ts`, `src/lib/seo/`. The only remaining matches are documented carve-outs:
  - `compare-data.ts:33` — Buildium audience descriptor (carve-out 4)
  - In-product UX in `src/components/leases/`, `src/components/profiles/owner/`, `src/components/dashboard/owner-dashboard.tsx`, `src/lib/constants/lease-signature-errors.ts` (carve-out 6)
  - Statute citations in `src/lib/templates/lease-template.ts` (carve-out 6, factual / legal context)
  - Test fixtures in `src/app/blog/page.test.tsx:190` (carve-out 5, test mock data — never renders)
- [x] **COPY-01 hero subhead** Candidate A wording — verbatim in `marketing-home.tsx:48-50`.
- [x] **COPY-02 social-proof** "Built for landlords with 1–15 rentals" `<Badge>` — verbatim in `pricing-card-featured.tsx:192`. `<BadgeCheck>` icon paired. `<Users>` import removed.
- [x] **COPY-03 tenants-never-login Badge** "Landlord-only · Tenants never log in" with `<Lock>` icon — verbatim in `marketing-home.tsx:34-41`.
- [x] **COPY-04 DocuSeal de-amp** — confirmed clean. Strategic 3 (pricing.ts:153/187, pricing-comparison-table.tsx:58, faqs.ts:78) preserved. KEEP-AS-INFRASTRUCTURE 5 confirmed (logo-cloud=4, login=1, confirm-email=1, generate-metadata.ts=1, features-client.tsx=1). Compare-data.ts contains 0× DocuSeal and 5× "Lease e-sign (Growth+)" / "lease e-sign (Growth+)" softened phrasing.
- [x] **COPY-05 FAQ canon** — `homeFaqs` array contains exactly 5 entries; pricing FAQ array contains exactly 5 entries; "View all FAQs →" link to `/faq` confirmed at `pricing-content.tsx:145`; "Is my data secure?" absent from `homeFaqs`; "How does the 14-day free trial work?" absent from `pricingFaqs`.
- [x] **COPY-06 bulk-zip softening** — confirmed clean across all 10 surfaces. `value: 500` invariant preserved on `stats-showcase.tsx:31`.
- [x] **COPY-07 mockup names** — confirmed clean (Jamie Carter / Alex Rivera / Sam Patel with matching JC/AR/SP avatars on `hero-dashboard-mockup.tsx:155-178`). `amount="E-Sign"` swap preserved on line 159.

## Verified Carve-outs (re-checked)

Per 04-RESEARCH.md § "Carve-outs":

- [x] **(1) Positioning phrases** — `landlord-only platform`, `landlord-only`, `landlord-focused` preserved.
- [x] **(2) RLS technical context** — `row-level security per landlord`, `every landlord's data`, `Custom categories per landlord` preserved.
- [x] **(3) Locked phrase** — `Built for landlords with 1–15 rentals` preserved verbatim across all surfaces. All en-dash uses are U+2013.
- [x] **(4) Compare-data competitor descriptors** — Three `bestFor` strings preserved verbatim. Persona-consistency e2e at line 134-138 explicitly asserts the Buildium descriptor still renders.
- [x] **(5) Banlist test fixtures** — `marketing-copy-landlord-only.test.ts` `BANNED_*` arrays unchanged.
- [x] **(6) In-product UX** — `relationship: 'Previous landlord'` form-field label untouched. The 7-9 in-product `property owner*` occurrences in `src/components/leases/`, `src/components/profiles/owner/`, `src/components/dashboard/owner-dashboard.tsx`, `src/lib/constants/lease-signature-errors.ts`, `src/lib/templates/lease-template.ts` (statute citations) all confirmed unchanged. None render onto any public marketing path. CONS-01 explicitly scopes to "TenantFlow buyer-context copy" / "marketing pages" — in-product UX, statute citations, and test fixtures are outside that scope.

## Verified Regression Guards (re-checked)

### Phase 1 CRIT-03 (Max placeholder pricing)

- [x] `pricing-card-standard.tsx:168` — `<div className="text-3xl font-bold text-foreground">Custom</div>` intact.
- [x] `pricing-comparison-table.tsx:206` — `{MAX_PUBLIC_PRICE_DISPLAY}` constant reference intact.
- [x] `pricing/page.tsx:24, :36` — `'Custom pricing, contact sales'` strings present in metadata description AND product schema description.

### Phase 2 NumberTicker invariant

- [x] `stats-showcase.tsx:31` — `value: 500` integer untouched.

### Banlist test (`marketing-copy-landlord-only.test.ts`)

- [x] `BANNED_PHRASES`, `BANNED_FEATURE_CLAIMS`, `BANNED_FABRICATED_IDENTITY_CLAIMS`, `BANNED_STALE_PLAN_REFS`, `BANNED_SLA_CLAIMS`, `BANNED_SUPERLATIVES`, `BANNED_NUMERIC_CLAIMS` all present. File unchanged on this branch.

### Cross-cutting design-token diff gate

- [x] `git diff main...HEAD -- src/ | grep -E "^\+.*#[0-9a-fA-F]{3,8}\b" | wc -l` → **0** hex additions
- [x] `git diff main...HEAD -- src/ | grep -E "^\+.*rgba?\(" | wc -l` → **0** rgb additions
- [x] `git diff main...HEAD -- src/ | grep -E "^\+.*bg-white" | wc -l` → **0** bg-white additions
- [x] `git diff main...HEAD -- src/ | grep -E "^\+.*\b[0-9]+ms\b" | wc -l` → **0** inline-ms additions

### Other invariants verified clean

- [x] `<Badge>` and `<Lock>` each imported exactly once in `marketing-home.tsx`.
- [x] Locked badge text "Landlord-only · Tenants never log in" uses U+00B7 middle dot character consistently across `marketing-home.tsx:40` and `persona-consistency.spec.ts` (3 occurrences).
- [x] Hero contradiction phrase "tenants never have to log in" returns ZERO matches across `src/` (only remaining occurrence is in `tests/e2e/tests/public/persona-consistency.spec.ts:57` as a negative assertion).
- [x] All occurrences of "1–15 rentals" use U+2013 en-dash. The "1–5 rentals" in `pricing.ts:100` uses U+2013. The "21+ rentals — unlimited scale and API access" in `pricing.ts:167` uses U+2014 em-dash for the parenthetical break.
- [x] About page renders zero "property managers" body text.
- [x] Hero dashboard mockup activity-row name + avatar pairs consistent: JC/Jamie Carter, AR/Alex Rivera, SP/Sam Patel.
- [x] No fabricated subscriber-count claims ("Join 500+", "500+ Growth subscribers", "2,500+ user") in any production source.

## Audit-ui-2026-05-08.md Cross-Check (items #7, #21–#27)

Per cycle-4 review dimension: "Spot-check the audit-ui-2026-05-08.md original audit findings (items #21-#27 + #7) and confirm each is addressed in the diff."

| Audit # | Finding | Cycle-4 verification |
|---------|---------|----------------------|
| #7 | Multiple personas named (owners / landlords / managers / investors). Pick ONE primary persona. | ✅ Resolved. Persona word LOCKED to "landlords" + "landlords with 1–15 rentals" segment-qualified variant. Comprehensive cycle-4 sweep confirms zero violations of any rejected persona variant outside documented carve-outs. |
| #21 | Hero subhead contradiction "track tenants … tenants never log in" | ✅ Resolved. `marketing-home.tsx:48-50` reads "The operations tool for landlords with 1–15 rentals. Track properties, leases, and maintenance in one place — tenants stay off the platform." (no "tenants" in the noun list; "tenants stay off the platform" closer). The contradiction phrase is gone. |
| #22 | "Join 500+ Growth subscribers" social proof — verify or remove | ✅ Resolved. `pricing-card-featured.tsx:192` shows "Built for landlords with 1–15 rentals" `<Badge>` with `<BadgeCheck>` icon. "Join 500+" returns zero matches across `src/`. |
| #23 | "Tenants never have to log in" buried in subhead | ✅ Resolved. `marketing-home.tsx:34-41` renders `<Badge variant="trustIndicator" size="trust">` with `<Lock>` icon and locked text "Landlord-only · Tenants never log in" above the hero h1. e2e structural assertion confirms badge appears in DOM order BEFORE the first h1. |
| #24 | DocuSeal mentioned 6× across cards / table / FAQ / footer — feels defensive | ✅ Resolved. Strategic 3 (pricing.ts feature lists, pricing-comparison-table row, faqs.ts:78 entry) preserved. 13 marketing surfaces de-amped to "Lease e-sign (Growth+)" or similar. KEEP-AS-INFRASTRUCTURE 5 (logo-cloud, login, confirm-email, JSON-LD featureList, features-client subtitle) preserved. |
| #25 | FAQ overlap across home / pricing / faq | ✅ Resolved. `homeFaqs` trimmed 6→5 (dropped "Is my data secure?"); pricing `FAQS` trimmed 6→5 (dropped "How does the 14-day free trial work?"); "View all FAQs →" link to `/faq` added at `pricing-content.tsx:145`. |
| #26 | "Bulk-zip export (500 / request)" technical jargon | ✅ Resolved. 10 surfaces softened to "Tax-season zip exports" / "Tax-Season Bulk Zip" / "tax-season zip" canonical phrasing. `value: 500` invariant preserved on `stats-showcase.tsx:31` (Phase 2 NumberTicker contract). e2e at `persona-consistency.spec.ts:197-203` asserts no "500 / request" jargon on any PUBLIC_PATHS page. |
| #27 | Hero mockup names "John Miller" / "Emma Wilson" / "David Park" | ✅ Resolved. Activity rows show Jamie Carter (JC) / Alex Rivera (AR) / Sam Patel (SP). `amount="DocuSeal"` swapped to `amount="E-Sign"` (paired with COPY-04). Mockup redesign deferred to v2.0+. Old names return zero matches anywhere in `src/`. |

All 8 audit items addressed.

---

## REVIEW COMPLETE — VERDICT: NEEDS-FIX

1 P1 finding (`tests/e2e/tests/public/persona-consistency.spec.ts:12-24` PUBLIC_PATHS missing 5 public marketing pages → test-coverage gap that allowed the cycle-1/2/3 miss-pattern). Per cycle-4 review dimensions: "If a public page exists but isn't in the test, that's a test-coverage P1." This is the explicit cycle-4 vigilance criterion materializing.

The fix is a one-block edit: add `/blog`, `/privacy`, `/terms`, `/security-policy`, `/support` to the PUBLIC_PATHS array. After it lands and the e2e runs once against the expanded list, the perfect-PR gate clock RESETS — two more zero-finding cycles are required for merge.

The P2 (uncalibrated DocuSeal threshold, surfacing for the 4th time) does NOT block the gate per the project's perfect-PR feedback memory but should ride into the same fix commit because the path-list expansion will change the actual DocuSeal-count, making the threshold "uncalibrated" in a more concrete sense than before.

**Recommended fix-pass commit message:** `fix(phase-04): cycle-4 review fix — extend persona-consistency PUBLIC_PATHS + DocuSeal threshold calibration`.

_Reviewed: 2026-05-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Cycle: 4 of N_
