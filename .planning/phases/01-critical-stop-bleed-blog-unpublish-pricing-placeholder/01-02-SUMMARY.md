---
phase: 01-critical-stop-bleed-blog-unpublish-pricing-placeholder
plan: 02
subsystem: pricing-marketing
tags: [pricing, json-ld, seo, marketing, design-tokens, max-tier, crit-03]
requirements: [CRIT-03]
requirements_addressed: [CRIT-03]
dependency_graph:
  requires: []
  provides:
    - "MAX_PUBLIC_PRICE_DISPLAY constant (consumed by 3 marketing surfaces; Phase 5 deletes)"
    - "Aligned 2-offer Product JSON-LD output (Starter + Growth only) on /pricing"
  affects:
    - "src/config/pricing.ts (added module-scope constant)"
    - "src/components/pricing/pricing-comparison-table.tsx (sticky header Max cell)"
    - "src/app/pricing/page.tsx (metadata description + JSON-LD offers + description)"
    - "src/app/pricing/__tests__/page.test.ts (new page-level test file)"
tech_stack:
  added: []
  patterns:
    - "Module-scope constant for Stripe-vs-public pricing divergence (B-modified per D-02)"
    - "Schema.org Product JSON-LD Option C: omit non-numeric tier from offers[]; surface in description"
key_files:
  created:
    - src/app/pricing/__tests__/page.test.ts
  modified:
    - src/config/pricing.ts
    - src/components/pricing/pricing-comparison-table.tsx
    - src/app/pricing/page.tsx
decisions:
  - "Used module-scope constant `MAX_PUBLIC_PRICE_DISPLAY = 'Custom' as const` (not a `displayPrice` field on PricingConfig) — keeps the type interface clean and Phase 5 cleanup is `grep -r MAX_PUBLIC_PRICE_DISPLAY src/`"
  - "JSON-LD: Option C — drop Max from offers[] entirely; surface 'Max enterprise tier — Custom pricing, contact sales' in Product.description so structured data matches visible content"
  - "Mocked the page's heavy SEO/layout dependencies in the new test (PageLayout, JsonLdScript, sub-sections) and spied on `createProductJsonLd` to capture its config argument — avoids RSC rendering complexity and keeps the test deterministic"
metrics:
  duration: ~13min (start 22:54:30Z to commit 23:07:00Z)
  completed_date: 2026-05-08
  tasks_completed: 2 of 3 (Task 3 is checkpoint:human-verify — see CHECKPOINT REACHED)
  files_modified: 3
  files_created: 1
  commits: 2
  test_count_delta: "+3 tests, +1 test file (existing factory test product-schema.test.ts unchanged at 14 green)"
---

# Phase 1 Plan 02: Max Pricing Placeholder Summary

Replace `$199/mo` with "Custom" on the 3 stale public marketing surfaces (comparison-table sticky header, pricing-page metadata description, JSON-LD Product.offers) using a single shared constant + Schema.org Option C — eliminates the public 4-way contradiction risking a Google "structured data must match visible content" manual action without committing to a number Phase 5 will overwrite.

## Tasks Completed

| Task | Name                                                                       | Commit      | Files                                                                                       |
| ---- | -------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------- |
| 1    | Add MAX_PUBLIC_PRICE_DISPLAY constant + edit comparison table sticky header | `342a6f84a` | src/config/pricing.ts; src/components/pricing/pricing-comparison-table.tsx                  |
| 2    | Edit pricing/page.tsx metadata + JSON-LD; add page-level test              | `8b45a0ea3` | src/app/pricing/page.tsx; src/app/pricing/__tests__/page.test.ts                            |
| 3    | Manual Rich Results Test paste + visible-content regression check          | —           | (checkpoint:human-verify — pending post-deploy; see "Pending Manual Verification" section)  |

## Diffs Applied

### `src/config/pricing.ts` (Task 1)

```diff
@@ -6,6 +6,9 @@
 export type StripePriceId = `price_${string}`
 export type PlanId = 'trial' | 'starter' | 'growth' | 'max'

+/** Phase 1 (CRIT-03) placeholder. Phase 5 (PRICE-*) deletes this. Search this symbol when restructuring tiers. */
+export const MAX_PUBLIC_PRICE_DISPLAY = 'Custom' as const
+
 // Trial configuration interface
 export interface TrialConfig {
 	readonly trialPeriodDays?: number
```

Stripe truth UNCHANGED:
- `TENANTFLOW_MAX.price.monthly = 199` at `src/config/pricing.ts:153` — UNTOUCHED
- `TENANTFLOW_MAX.stripePriceIds.monthly = 'price_1Rd16pP3WCR53SdoCh3oJlDl'` at `:157` — UNTOUCHED
- `TENANTFLOW_MAX.stripePriceIds.annual = 'price_1Rd17AP3WCR53SdoTB4FTbSq'` at `:158` — UNTOUCHED

Phase 5 owns the full Max-tier restructure.

### `src/components/pricing/pricing-comparison-table.tsx` (Task 1, line 205 + import)

```diff
@@ -2,6 +2,7 @@

 import { useState } from 'react'
 import { cn } from '#lib/utils'
+import { MAX_PUBLIC_PRICE_DISPLAY } from '#config/pricing'
 import { Check, Minus, ChevronDown } from 'lucide-react'
 import { Button } from '#components/ui/button'
 import {
@@ -202,7 +203,7 @@ export function PricingComparisonTable({
 						</div>
 						<div className="text-center">
 							<div className="text-sm font-semibold text-foreground">Max</div>
-							<div className="text-xs text-muted-foreground">$199/mo</div>
+							<div className="text-xs text-muted-foreground">{MAX_PUBLIC_PRICE_DISPLAY}</div>
 						</div>
 					</div>
```

Design-token symmetry preserved: `text-xs text-muted-foreground` matches Starter's `$29/mo` styling. Parent row's `bg-muted/50` inherited; no per-cell background override; no badge added; Starter and Growth lines untouched.

### `src/app/pricing/page.tsx` (Task 2, lines 22-23 metadata)

```diff
 export const metadata: Metadata = createPageMetadata({
 	title: 'Property Management Software Pricing — Plans from $29/mo',
 	description:
-		'Affordable property management software. Starter ($29/mo, 5 properties), Growth ($79/mo, 20 properties), Max ($199/mo, unlimited). 14-day free trial, no credit card required. Compare plans and features.',
+		'Affordable property management software. Starter ($29/mo, 5 properties), Growth ($79/mo, 20 properties), Max — Custom pricing, contact sales. 14-day free trial, no credit card required. Compare plans and features.',
 	path: '/pricing'
 })
```

### `src/app/pricing/page.tsx` (Task 2, lines 32-43 JSON-LD)

```diff
 	const productJsonLd = createProductJsonLd({
 		name: 'TenantFlow Property Management Software',
 		description:
-			'Professional property management software with lease tracking, maintenance management, and financial reporting. Plans starting at $29/month.',
+			'Professional property management software for landlords with 1–15 rentals. Starter $29/mo (5 properties), Growth $79/mo (20 properties). Max enterprise tier — Custom pricing, contact sales. 14-day free trial, no credit card required.',
 		offers: [
 			{ name: 'Starter', price: '29.00' },
-			{ name: 'Growth', price: '79.00' },
-			{ name: 'Max', price: '199.00' }
+			{ name: 'Growth', price: '79.00' }
+			// Max omitted from JSON-LD: visible page shows "Custom"; per Google's
+			// Structured Data General Guidelines we must not emit a price the page
+			// doesn't show. Re-add when PRICE-06 (Phase 5) ships final Max pricing.
 		]
 	})
```

### `src/app/pricing/__tests__/page.test.ts` (Task 2, NEW — 99 lines)

Three `it()` blocks:
1. `metadata.description omits "$199/mo" for Max and includes "Max — Custom pricing, contact sales"` — pure data assertion on the exported `metadata` object.
2. `productJsonLd is built with exactly 2 offers (Starter + Growth, no Max)` — awaits the async server component, captures `createProductJsonLd` config via `vi.hoisted` spy, asserts offers length + names + prices + absence of Max/199.00.
3. `productJsonLd.description contains verbatim "Custom pricing, contact sales"` — guards Google's "structured data must match visible content" alignment.

Mocks `#env`, `#lib/generate-metadata`, `#lib/seo/product-schema` (spy), `#lib/seo/breadcrumbs`, `#lib/seo/faq-schema`, `#lib/seo/page-metadata`, `#components/layout/page-layout`, `#components/seo/json-ld-script`, `#components/sections/testimonials-section`, `../_components/pricing-section`, and `../pricing-content` — all heavy SEO/JSX dependencies inert so the test focuses on the productJsonLd capture.

The `../pricing-content` mock uses the actually-exported names (verified per Step 0 of the plan): `PricingCtaSection`, `PricingFaqSection`, `PricingStatsGrid`, `pricingFaqs`.

## Audit-Correction Regression (SC-3)

`src/components/sections/features-section.tsx` is intentionally UNTOUCHED per D-02 audit correction (the "Max unlimited" string is a feature LIMIT, not a price).

- `grep -n '199' src/components/sections/features-section.tsx` → zero matches
- `git diff --stat src/components/sections/features-section.tsx` → empty (file untouched in this plan)

## Test Count Delta

| File                                                  | Before | After | Delta |
| ----------------------------------------------------- | ------ | ----- | ----- |
| `src/lib/seo/__tests__/product-schema.test.ts`        | 14     | 14    | 0     |
| `src/app/pricing/__tests__/page.test.ts` (NEW)        | —      | 3     | +3    |
| **Project-wide unit tests**                           | 100020 | 100023 | **+3** |
| **Project-wide unit test files**                      | 126    | 127   | +1    |

All pre-commit hooks (gitleaks, lockfile-verify, lint, typecheck, unit-tests, commitlint) green on both commits.

## CI Gate Status

- `pnpm typecheck` exits 0
- `pnpm lint` exits 0
- `pnpm test:unit` 100,023 / 100,023 green
- `next build` not run locally (CI handles); no test mock leaks into production bundle (mocks scoped to test file)

## Deviations from Plan

None — plan executed exactly as written. The Step-0 mock-name verification (per Task 2 instruction) confirmed `pricing-content.tsx` exports the names assumed by the plan's skeleton (`PricingCtaSection`, `PricingFaqSection`, `PricingStatsGrid`, `pricingFaqs`), so no mock-key changes were needed. Added two extra mocks beyond the plan's skeleton to silence the test runtime: `#lib/seo/breadcrumbs`, `#lib/seo/faq-schema`, `#lib/seo/page-metadata` — straightforward inert factories that don't affect the productJsonLd assertions.

## Pending Manual Verification (Task 3 — checkpoint:human-verify)

This is a `checkpoint:human-verify` task — must be completed by the orchestrator/user **after this PR merges and Vercel deploys**, since it depends on the deployed `/pricing` page emitting the updated JSON-LD.

### Step A — Rich Results Test paste

1. After merging Plan 01 + Plan 02 to `main` AND confirming Vercel deploy completed, visit https://search.google.com/test/rich-results
2. Enter URL: `https://tenantflow.app/pricing`
3. Click "Test URL"
4. Expected outcome (per `01-RESEARCH-pricing-schema.md § Expected validator output for Option C`):
   - Status: Valid for Product Snippet
   - Detected items: 1× Product, 1× FAQPage, 1× BreadcrumbList
   - 0 errors (red, blocking)
   - 0 or low warnings (yellow); no `priceMismatch`, no missing `price`
5. Screenshot the verdict page. Save to `.planning/phases/01-critical-stop-bleed-blog-unpublish-pricing-placeholder/01-02-rich-results-screenshot.png`. If screenshot is infeasible, capture verdict text into `01-02-rich-results-verdict.md` instead.

### Step B — Visible-content regression check

6. In the Rich Results Test "Page Source" panel, search for the JSON-LD `<script type="application/ld+json">` block containing the Product schema.
7. Confirm:
   - Exactly 2 `Offer` entries (one for Starter `"price": "29.00"`, one for Growth `"price": "79.00"`).
   - No entry contains `"price": "199.00"`.
   - Top-level `"description"` field contains the substring `Custom pricing, contact sales`.
8. Visit the live page https://tenantflow.app/pricing in a browser:
   - Pricing card section: Max card shows "Custom" + "Contact Sales" CTA (regression check — no behavior change expected).
   - Comparison-table sticky header: Max column shows "Custom" (NEW), Starter shows "$29/mo", Growth shows "$79/mo".
   - DevTools → page source: meta description tag contains `Max — Custom pricing, contact sales` and not `Max ($199/mo, unlimited)`.

### Step C — Authenticated billing dashboard regression check (out-of-scope confirmation)

9. Sign in as a synthetic test owner (e.g. `e2e-owner-a@tenantflow.app`).
10. Visit https://tenantflow.app/billing/plans (authenticated route).
11. Confirm Max plan still shows `$199/month` here. This is the EXPECTED Stripe-truth behavior per D-02.

### Approval criteria

Approve if:
- (A) Rich Results Test reports VALID for Product Snippet with 0 errors AND
- (B) JSON-LD has exactly 2 offers, no `199.00`, description has the verbatim phrase AND
- (C) `/pricing` shows "Custom" in card AND comparison table AND
- (D) `/billing/plans` still shows `$199/month` (Stripe-truth — out of scope for this phase).

### Post-merge curl smoke (optional, can run in CI or locally before manual paste)

```bash
curl -s https://tenantflow.app/pricing | grep -o '"price":"[0-9]*"' | sort -u
# expected: only "price":"29.00" and "price":"79.00" (no 199.00)

curl -s https://tenantflow.app/pricing | grep -c 'Custom pricing, contact sales'
# expected: at least 2 (description in metadata + description in JSON-LD)
```

## Phase 5 (PRICE-06) Forward-Carry Note

When Phase 5 ships final Max pricing:

1. Delete `MAX_PUBLIC_PRICE_DISPLAY` constant + JSDoc from `src/config/pricing.ts`
2. Replace 1 call site in `src/components/pricing/pricing-comparison-table.tsx` with the new numeric price string
3. In `src/app/pricing/page.tsx`:
   - Re-add the third Offer entry to `productJsonLd.offers` with the final price (look for the `Re-add when PRICE-06 (Phase 5)` inline comment as the breadcrumb)
   - Restore `Max ($XYZ/mo, unlimited)` in metadata description if structured pricing is restored
   - Update Product `description` to drop "Custom pricing, contact sales"
4. Delete `src/app/pricing/__tests__/page.test.ts` 2-offer assertion + adjust to N-offer assertion

`grep -r MAX_PUBLIC_PRICE_DISPLAY src/` finds all touch points.

## Self-Check: PASSED

Files exist on disk:
- `src/config/pricing.ts` ✓ FOUND (modified)
- `src/components/pricing/pricing-comparison-table.tsx` ✓ FOUND (modified)
- `src/app/pricing/page.tsx` ✓ FOUND (modified)
- `src/app/pricing/__tests__/page.test.ts` ✓ FOUND (created)

Commits exist in git history:
- `342a6f84a` ✓ FOUND — feat(01-02): add MAX_PUBLIC_PRICE_DISPLAY constant + swap comparison table
- `8b45a0ea3` ✓ FOUND — feat(01-02): drop Max from JSON-LD offers + align metadata text

Verify-block grep checks all pass:
- `MAX_PUBLIC_PRICE_DISPLAY = 'Custom' as const` present in `src/config/pricing.ts` ✓
- Verbatim JSDoc `Phase 1 (CRIT-03) placeholder. Phase 5 (PRICE-*) deletes this` present ✓
- `{MAX_PUBLIC_PRICE_DISPLAY}` rendered in comparison-table line 206 ✓
- No `$199/mo` literal anywhere in `pricing-comparison-table.tsx` ✓
- `Max — Custom pricing, contact sales` present in `pricing/page.tsx:23` ✓
- Inline `Re-add when PRICE-06 (Phase 5)` comment present in `pricing/page.tsx:41` ✓
- `Custom pricing, contact sales` substring present in `pricing/page.tsx` (both metadata desc + JSON-LD desc) ✓
- `features-section.tsx` untouched in this plan ✓
- Existing factory test `product-schema.test.ts` (14 tests) unchanged ✓
- New page test `page.test.ts` 3 passing tests ✓

## Threat Surface Scan: NONE

No new network endpoints, auth paths, file access patterns, or schema changes. The constant `MAX_PUBLIC_PRICE_DISPLAY` is a static string literal compiled into the bundle (no user input crosses the boundary). All STRIDE T-02-* register entries from the plan are addressed with the dispositions noted there.
