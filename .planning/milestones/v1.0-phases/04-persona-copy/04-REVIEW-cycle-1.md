# Phase 4 Code Review — Cycle 1

**Reviewed:** 2026-05-10
**Scope:** PR #688 (gsd/phase-04-persona-copy) — 15 commits, 43 files changed
**Reviewer:** gsd-code-reviewer

## Summary

| Severity | Count |
|----------|-------|
| P0 (BLOCKER) | 1 |
| P1 (HIGH) | 2 |
| P2 (MEDIUM) | 3 |
| P3 (LOW) | 0 |

**Verdict: NEEDS-FIX** (1 P0 + 2 P1 findings — cycle does NOT count toward perfect-PR gate)

The bulk of Phase 4 lands cleanly. Locked decisions for the persona word, hero subhead, tenants-never-login Badge, social-proof replacement, dashboard-mockup names, FAQ trim, bulk-zip softening, and DocuSeal de-amp are all honored. All 6 carve-outs are preserved. Phase 1 CRIT-03 invariants and Phase 2 NumberTicker invariant are intact. Design-token gate passes (zero hex / rgb / `bg-white` / inline-ms additions).

The blocker is a real correctness gap in `src/data/faqs.ts`: three "property owner(s)" body-text occurrences (lines 43, 48, 53) render verbatim onto `/faq` and will fail the new `persona-consistency.spec.ts` sitewide assertion `expect(body).not.toMatch(/property owners?\b/i)` for the path `/faq`. The research locator table did NOT enumerate these three lines, so they survived Plan 04-01 Task 1's literal find-and-replace, but the new e2e test asserts against the rendered body of every `PUBLIC_PATHS` entry — and `/faq` reads `faqs.ts` to render every question + answer. Either the test fails or the strings have to flip; the strings have to flip because the e2e is the locked contract.

Two P1 inconsistencies surface alongside: `/help/page.tsx:24` metadata description still emits "landlords and operators" (the research pluralization-variants section called for "operators" to be dropped, but the locator table didn't enumerate the line, so Task 1 skipped it), and the deferred metadata strings on `src/app/blog/page.tsx:18-19` + `src/app/resources/page.tsx:24` still carry "Property Owners" / "property owner" in `<title>` / `<meta description>`. The blog/resources strings won't fail the e2e (textContent('body') doesn't pick up `<head>` tags) but they ARE persona-word violations on the rendered SERP — the same surface CONS-01 exists to clean. Documenting them as P1 so they don't slip into v1.0.

## Findings

### P0 — Blockers

#### CR-01: faqs.ts renders three "property owner(s)" strings on /faq → fails new e2e

**File:** `src/data/faqs.ts:43, 48, 53`
**Category:** correctness / regression / locked-decision-violation

**Issue:** The `/faq` page (`src/app/faq/page.tsx:23-65`) iterates `faqData` from `src/data/faqs.ts` and renders every question + answer into the visible DOM. Three FAQ answers contain "property owner" or "Property owners" body text:

- `faqs.ts:43` — `"No. TenantFlow is built for the property owner — tenants are records you keep for your own tracking, not platform users."`
- `faqs.ts:48` — `"...store every lease, receipt, and inspection report in a per-entity document vault with global search and bulk-download. Everything a property owner needs to replace the spreadsheet."`
- `faqs.ts:53` — `"Property owners report spending less time on admin: centralized records replace spreadsheets and email threads, maintenance requests are tracked with vendor and cost history, and lease e-signing cuts days off renewals."`

**Why this fails:** The new `persona-consistency.spec.ts` asserts at line 27-32:

```ts
test('No "property owners" persona word on any public marketing page', async ({ page }) => {
    for (const path of PUBLIC_PATHS) {
        await page.goto(path)
        const body = (await page.textContent('body')) ?? ''
        expect(body, `path: ${path}`).not.toMatch(/property owners?\b/i)
    }
})
```

The regex `/property owners?\b/i` matches both "property owner" (singular) and "property owners" (plural). `/faq` is in `PUBLIC_PATHS`. All three strings will be in the rendered `<body>` (FAQ answers are static JSX, not collapsed-by-default — and even if collapsed in the accordion, `textContent` includes hidden text). e2e fails.

**Why this matters beyond the test:** The phase 4 contract is "every public marketing page uses 'landlords' as the canonical persona word — no 'property owners' in TenantFlow buyer-context copy" (Plan 04-01 must_haves[0]). These three strings are buyer-context copy on `/faq`. Fixing them is the right answer regardless of the e2e.

**Fix:**

```diff
--- a/src/data/faqs.ts
+++ b/src/data/faqs.ts
@@ -41,8 +41,8 @@ export const faqData: FAQCategory[] = [
 			{
 				question: 'Do my tenants create accounts or log in?',
 				answer:
-					"No. TenantFlow is built for the property owner — tenants are records you keep for your own tracking, not platform users. You never have to manage tenant logins, password resets, or account support."
+					"No. TenantFlow is built for the landlord — tenants are records you keep for your own tracking, not platform users. You never have to manage tenant logins, password resets, or account support."
 			},
 			{
 				question: 'What does TenantFlow actually help me do?',
 				answer:
-					'Track properties and units, keep tenant and lease records, log maintenance requests and vendor costs, e-sign leases (Growth and Max plans), and store every lease, receipt, and inspection report in a per-entity document vault with global search and bulk-download. Everything a property owner needs to replace the spreadsheet.'
+					'Track properties and units, keep tenant and lease records, log maintenance requests and vendor costs, e-sign leases (Growth and Max plans), and store every lease, receipt, and inspection report in a per-entity document vault with global search and bulk-download. Everything a landlord needs to replace the spreadsheet.'
 			},
 			{
 				question: 'What specific results can I expect?',
 				answer:
-					'Property owners report spending less time on admin: centralized records replace spreadsheets and email threads, maintenance requests are tracked with vendor and cost history, and lease e-signing cuts days off renewals. Results vary by portfolio.'
+					'Landlords report spending less time on admin: centralized records replace spreadsheets and email threads, maintenance requests are tracked with vendor and cost history, and lease e-signing cuts days off renewals. Results vary by portfolio.'
 			},
```

Note `faqs.ts:103` uses "Owners typically" — that one is bare "Owners" not "property owner(s)" and does NOT match the e2e regex. Leave it (it's already used as soft persona reference; per research carve-out / pluralization variants section 04-RESEARCH.md line 84, bare `owner`/`owners` is context-sensitive).

---

### P1 — High

#### WR-01: /help/page.tsx:24 metadata still emits "landlords and operators"

**File:** `src/app/help/page.tsx:24`
**Category:** correctness / locked-decision-violation

**Issue:** The metadata `description` still reads `"...support resources for landlords and operators."`. Per 04-RESEARCH.md § "Pluralization variants summary" (line 84):

> `operator` ↔ `operators` — only in `/help/page.tsx:24` (drop ", and operators" — implied by "landlords") and `/blog/category/.../page.tsx:35` (same)

The blog category page WAS updated correctly (operators dropped from line 35); `/help/page.tsx:24` was missed. Plan 04-01 Task 1 didn't include `/help/page.tsx` in its file list (the locator table § A skipped this line, listing it only in the variants summary § D). The phase research explicitly required dropping it, so this is a P1 miss.

**Mitigation:** the e2e doesn't check for "operators", and the string is in `<meta description>` (not body text), so it doesn't fail any automated gate. But it directly contradicts the locked CONS-01 unification — the SERP / social-card description for `/help` will still show "landlords and operators" while every other surface says "landlords".

**Fix:**

```diff
--- a/src/app/help/page.tsx
+++ b/src/app/help/page.tsx
@@ -21,7 +21,7 @@ import { ArrowRight, Mail, MessageCircle, Phone } from 'lucide-react'
 export const metadata = createPageMetadata({
 	title: 'Help Center — Property Management Support & Guides',
-	description: 'Get help with TenantFlow property management software. Browse setup guides, feature tutorials, and support resources for landlords and operators.',
+	description: 'Get help with TenantFlow property management software. Browse setup guides, feature tutorials, and support resources for landlords.',
 	path: '/help',
 })
```

---

#### WR-02: blog/page.tsx + resources/page.tsx metadata still carry "Property Owners" / "property owner"

**Files:**
- `src/app/blog/page.tsx:18` — `title: 'Property Management Blog — Tips for Property Owners & Operators'`
- `src/app/blog/page.tsx:19` — `description: 'Property owner tips, rental property administration guides, ...'`
- `src/app/resources/page.tsx:24` — `title: 'Free Property Owner Resources — Templates & Tools'`

**Category:** locked-decision-violation / SEO regression

**Issue:** Three persona violations in metadata strings rendered into `<head>` (so body-text e2e doesn't catch them). The research locator table § A enumerated `resources/page.tsx:182` (body) but skipped the line-24 metadata title and the blog/page.tsx metadata title+description. These remain at the original "Property Owners" wording.

**Why this matters:** Phase 4's CONS-01 contract says "Every public marketing page uses 'landlords' as the canonical persona word" (Plan 04-01 must_haves[0]) and explicitly notes the metadata + JSON-LD surfaces are the "highest SEO leverage" rewrite targets (04-RESEARCH.md § Execution Surfaces B). Leaving "Property Owners" in two `<title>` + one `<meta description>` means Google search results, Twitter cards, and OG embeds for `/blog` + `/resources` pages will still show the rejected persona word — exactly the SEO inconsistency the phase exists to fix.

**Mitigation note:** the strings are NOT enumerated in the research locator table § A or § B, so technically out of literal task scope. But CONS-01's stated goal ("ONE word/phrase, applied consistently across hero, About, FAQ, meta descriptions, headlines") explicitly includes meta descriptions. This is a research-locator gap that Phase 4 ought to close before merging.

**Fix:**

```diff
--- a/src/app/blog/page.tsx
+++ b/src/app/blog/page.tsx
@@ -15,8 +15,8 @@ export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
 	const page = Number(params.page) || 1

 	return createPageMetadata({
-		title: 'Property Management Blog — Tips for Property Owners & Operators',
-		description: 'Property owner tips, rental property administration guides, and software comparisons. Learn how to manage leases, handle maintenance, screen tenants, and grow your rental portfolio.',
+		title: 'Property Management Blog — Tips for Landlords',
+		description: 'Landlord tips, rental property administration guides, and software comparisons. Learn how to manage leases, handle maintenance, screen tenants, and grow your rental portfolio.',
 		path: '/blog',
 		noindex: page > 1
 	})
```

```diff
--- a/src/app/resources/page.tsx
+++ b/src/app/resources/page.tsx
@@ -22,7 +22,7 @@ import { createPageMetadata } from '#lib/seo/page-metadata'

 export const metadata: Metadata = createPageMetadata({
-	title: 'Free Property Owner Resources — Templates & Tools',
+	title: 'Free Landlord Resources — Templates & Tools',
 	description:
 		'Free downloadable property management templates: seasonal maintenance checklists, tax deduction trackers, security deposit law guides for landlords.',
 	path: '/resources'
```

---

### P2 — Medium

#### IN-01: persona-consistency.spec.ts threshold (≤15 site-wide DocuSeal) is uncalibrated

**File:** `tests/e2e/tests/public/persona-consistency.spec.ts:153`
**Category:** test-quality

**Issue:** The site-wide DocuSeal mention threshold is set to `≤15` with a comment ("Calibrate down after first run if budget allows."). Plan 04-02 Task 7 explicitly flagged this needs calibration after first run. The plan's Wave 2 close (Task 8) didn't pin a measured baseline. After fixing CR-01 + WR-01 + WR-02, the plan recommends running the test and tightening the threshold to (actual + small buffer).

**Mitigation:** non-blocking; the upper bound of 15 is loose enough that real DocuSeal mentions (~6-8 expected: pricing.ts ×2 plans, pricing-comparison-table row, faqs.ts:78, logo-cloud rendered across N pages, features-client integrations subtitle, JSON-LD featureList) leave headroom. But shipping a test that's uncalibrated is a known weakness in regression detection.

**Fix:** after the P0+P1 fixes land, run the e2e once, capture the actual count from a short debug log, and tighten the threshold to `(actual + 2)` for noise tolerance. Drop the comment placeholder once calibrated.

---

#### IN-02: home-faq.test.tsx button-counting heuristic is fragile

**File:** `src/components/sections/__tests__/home-faq.test.tsx:18-22`
**Category:** test-quality

**Issue:** The test counts "FAQ entries" by filtering `screen.getAllByRole('button')` for buttons whose text ends with `?`. Because `<Button asChild>` (Contact Sales / View All FAQs) renders as `<a role="link">` not `role="button"`, the filter currently returns the 5 FAQ accordion triggers correctly. But this is coupled to:

1. shadcn `<Button asChild>` continuing to render as Slot/`<a>` rather than `<button>`
2. None of the future FAQ entries omitting a trailing `?` (e.g., a question like "Try TenantFlow.")
3. No accordion variant ever ending the button text with anything other than `?`

The test would silently pass with wrong values if any of those held. A stronger contract would assert against the `homeFaqs` array length directly:

```ts
import { homeFaqs } from '../home-faq' // requires export
expect(homeFaqs).toHaveLength(5)
```

Or render-and-count by data-testid on each accordion trigger. The current heuristic works today but doesn't pin the contract robustly.

**Mitigation:** non-blocking; the test does fail if you accidentally remove or add an entry today. But it would also pass if you add an entry whose question doesn't end with `?`, which is plausible on the marketing surface.

**Fix:** export `homeFaqs` from `home-faq.tsx` and assert directly on its length, OR add `data-testid="home-faq-question"` to each accordion trigger and count those. Keep the existing "Is my data secure?" negative assertion — that one is structurally sound.

---

#### IN-03: pricing-content.tsx "Lease e-sign on Growth+" label not in trustSignals (consistency)

**File:** `src/app/pricing/pricing-content.tsx`
**Category:** prose

**Issue:** `pricing-content.tsx` got the new "View all FAQs →" link added to the FAQ footer (per Task 4 of Plan 04-02), but no other persona-word touch — `pricingFaqs` (now 5 entries) still uses the older non-DocuSeal-mentioning copy. Cross-checked OK. The DocuSeal de-amp didn't need to touch this file because the strategic surfaces (pricing card features list, pricing-comparison-table row) are the explicit KEEPs and `pricing-content.tsx` doesn't mention DocuSeal in its `STATS`/`FAQS`/`PricingCtaSection`. So this is fine — flagging just to record the cross-check verified clean.

This is a P2 note, not a finding requiring action.

---

## Verified Locked Decisions

Per 04-RESEARCH.md `Locked Decisions` table:

- [x] **CONS-01 persona word** = "landlords" — ✅ honored across hero, supporting line, About, login layout, support, security-policy, blog/category, resources/page, resources/seasonal-maintenance-checklist, compare-data, generate-metadata, testimonials-section, home-faq. Three additional misses logged above (CR-01 + WR-01 + WR-02) — strings exist outside the explicit research locator but inside the spirit of CONS-01.
- [x] **COPY-01 hero subhead** Candidate A wording — ✅ verbatim in `marketing-home.tsx:47-51`. "Track properties, leases, and maintenance" (no "tenants," in the noun list); "tenants stay off the platform" closer.
- [x] **COPY-02 social-proof** "Built for landlords with 1–15 rentals" `<Badge>` on featured pricing card — ✅ verbatim in `pricing-card-featured.tsx:186-193`. `<BadgeCheck>` icon paired. `<Users>` import removed. Wrapper uses `trustIndicator` variant.
- [x] **COPY-03 tenants-never-login Badge** "Landlord-only · Tenants never log in" with `<Lock>` icon — ✅ verbatim in `marketing-home.tsx:34-41`. `aria-hidden="true"` on the icon. `self-start mb-2` for left-alignment. Imports added cleanly (Badge from `#components/ui/badge`, Lock destructured into existing lucide-react import alongside `ArrowRight`).
- [x] **COPY-04 DocuSeal de-amp** — ✅ all 13 marketing surfaces cleaned. Strategic 3 (pricing.ts:153/187, pricing-comparison-table.tsx:58, faqs.ts:78) preserved verbatim. KEEP-AS-INFRASTRUCTURE 5 (logo-cloud, login HERO_STATS, confirm-email HERO_STATS, JSON-LD featureList, features-client integrations subtitle) preserved. compare-data.ts 5× softened to "Lease e-sign (Growth+)" (3 capitalized as standalone tags, 2 lowercased mid-sentence — see commit `01dbf338d` rationale).
- [x] **COPY-05 FAQ canon** — ✅ home-faq trimmed 6→5 ("Is my data secure?" dropped); pricing FAQS trimmed 6→5 ("How does the 14-day free trial work?" dropped); "View all FAQs →" link to `/faq` added to pricing-FAQ footer; "Connect with sales" CTA intact (Phase 10 deferral preserved); FAQ JSON-LD assertion `mainEntity.length === 5` added to existing `pricing/__tests__/page.test.ts`.
- [x] **COPY-06 bulk-zip softening** — ✅ "Tax-season zip exports" / "Tax-Season Bulk Zip" / "Tax-season zip" / "tax-season zip" canonical phrasing across stats-showcase, results-proof, hero-section, comparison-table, features-section, how-it-works, feature-backgrounds, help/page, faqs.ts. `value: 500` invariant preserved on stats-showcase.tsx:31 (Phase 2 NumberTicker contract).
- [x] **COPY-07 mockup names** — ✅ activity rows show Jamie Carter (JC) / Alex Rivera (AR) / Sam Patel (SP). Sarah greeting + SC avatar kept (minimum churn). `amount="DocuSeal"` swapped to `amount="E-Sign"` on line 159.

## Verified Carve-outs

Per 04-RESEARCH.md § "Carve-outs":

- [x] **(1) Positioning phrases** — `landlord-only platform`, `landlord-only`, `landlord-focused` preserved. Verified at `about/page.tsx:45` ("TenantFlow is a landlord-only..."), `final-cta-section.tsx:35` ("The landlord-only platform with..."), `compare-data.ts:84/193/321` (`tenantflowNote: 'Landlord-only platform'`), `help/page.tsx:201` ("...single landlord-only platform.").
- [x] **(2) RLS technical context** — `row-level security per landlord`, `every landlord's data`, `Custom categories per landlord` preserved. Verified at `about/page.tsx:155` ("Postgres row-level security per landlord, encrypted at rest..."), `feature-callouts.tsx:17` ("Row-level security per landlord. Tenants are records, never users"), `features-section.tsx:55` ("...tax-season zip downloads. Custom categories per landlord."), `stats-showcase.tsx:26` ("Plus unlimited custom categories per landlord").
- [x] **(3) Locked phrase** — `Built for landlords with 1–15 rentals` stays exactly as-is. Verified verbatim (en-dash) in `marketing-home.tsx:48, 67`, `page.tsx:16, 40`, `pricing-card-featured.tsx:192`, `generate-metadata.ts:35, 145, 174`.
- [x] **(4) Compare-data competitor descriptors** — Three `bestFor` strings preserved verbatim:
   - `compare-data.ts:33` `'Small to mid-sized property managers and HOA management'` (Buildium)
   - `compare-data.ts:135` `'Property management companies with 50+ units'` (AppFolio)
   - `compare-data.ts:264` `'Budget-conscious DIY owners who want mobile-first management'` (RentRedi)
   Plus the persona-consistency e2e at line 134-138 explicitly asserts the Buildium descriptor still renders on `/compare/buildium`.
- [x] **(5) Banlist test fixtures** — `src/app/__tests__/marketing-copy-landlord-only.test.ts` BANNED_PHRASES / BANNED_FEATURE_CLAIMS arrays unchanged (verified — file does not appear in the diff).
- [x] **(6) In-product UX** — `relationship: 'Previous landlord'` form-field label in rental-application-template.client.tsx untouched (verified — file not in diff).

## Verified Regression Guards

### Phase 1 CRIT-03 (Max placeholder pricing)

- [x] `pricing-card-standard.tsx:168` — `<div className="text-3xl font-bold text-foreground">Custom</div>` intact.
- [x] `pricing-comparison-table.tsx:206` — `{MAX_PUBLIC_PRICE_DISPLAY}` constant reference intact.
- [x] `pricing/page.tsx:24, 36` — `'Custom pricing, contact sales'` string present in metadata description AND in product schema description.
- [x] `pricing/__tests__/page.test.ts` extended cleanly:
  - Existing CRIT-03 assertions (offers excludes Max, productJsonLd description contains "Custom pricing, contact sales") UNCHANGED.
  - New COPY-05 assertion (`mainEntity.length === 5`, `/How does the 14-day free trial work\?/i` absent) ADDED at lines 115-129 — uses `mocks.createFaqJsonLdSpy.mock.calls[0]![0]` pattern; consistent with existing `createProductJsonLdSpy` pattern.

### Phase 2 NumberTicker invariant

- [x] `stats-showcase.tsx:31` — `value: 500` integer untouched. Only `label` (line 32, was `'Bulk-Zip Cap'`, now `'Tax-Season Bulk Zip'`) and `description` (line 33, was `'Documents per zip download'`, now `'Up to 500 docs per zip export'`) changed. NumberTicker animation contract preserved.

### Banlist test (`marketing-copy-landlord-only.test.ts`)

- [x] No banned phrases introduced. Banlist arrays cover rent-collection / fabricated-team / SLA / superlative claims — none of the Phase 4 edits add any of those. Plan 04-01 + 04-02 explicitly REMOVE fabricated content ("500+ Growth subscribers" → segment framing); near-zero risk.

### Cross-cutting design-token diff gate

- [x] `git diff main...HEAD -- src/ | grep -E "^\+.*#[0-9a-fA-F]{3,8}\b"` → 0 hex additions
- [x] `git diff main...HEAD -- src/ | grep -E "^\+.*rgba?\("` → 0 rgb additions
- [x] `git diff main...HEAD -- src/ | grep -E "^\+.*bg-white"` → 0 bg-white additions
- [x] `git diff main...HEAD -- src/ | grep -E "^\+.*\b[0-9]+ms\b"` → 0 inline-ms additions

### Other invariants verified clean

- [x] `<Badge>` and `<Lock>` each imported exactly once in `marketing-home.tsx` (Badge from `#components/ui/badge`, Lock destructured into existing lucide-react import).
- [x] `<Users>` icon removed from `pricing-card-featured.tsx` lucide-react destructure (no unused-import lint failure).
- [x] `<BadgeCheck>` icon imported once in `pricing-card-featured.tsx`, used twice (social-proof badge + features list checkmarks).
- [x] Locked badge text "Landlord-only · Tenants never log in" uses U+00B7 middle dot character consistently in `marketing-home.tsx:40` and `persona-consistency.spec.ts:75, 80, 90`.
- [x] All occurrences of "1–15 rentals" use U+2013 en-dash (not hyphen, not em-dash) — verified across 8 surfaces (marketing-home.tsx ×2, page.tsx ×2, generate-metadata.ts ×3, pricing-card-featured.tsx ×1).
- [x] `home-faq.tsx:21` "1–5 rentals" also uses en-dash consistently.
- [x] About page renders zero "property managers" body text (Plan 04-01 Task 2 wrong-word fixes verified at lines 78, 95, 201).
- [x] Hero dashboard mockup activity-row name + avatar pairs consistent: JC/Jamie Carter, AR/Alex Rivera, SP/Sam Patel.

---

## REVIEW COMPLETE — VERDICT: NEEDS-FIX

1 P0 + 2 P1 findings. Fix and re-cycle. The P0 fix is the critical path because the e2e test will fail on `/faq`. The two P1 fixes (help metadata "operators", blog/resources metadata "Property Owner(s)") close the SEO leak from the same CONS-01 contract and are cheap. The P2 items (uncalibrated DocuSeal threshold, brittle button-counting heuristic in home-faq.test.tsx) can ride into cycle 2 but should be addressed before the merge gate's second consecutive zero-finding cycle.

_Reviewed: 2026-05-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
