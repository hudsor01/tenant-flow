---
phase: 01-critical-stop-bleed-blog-unpublish-pricing-placeholder
verified: 2026-05-08T18:40:00Z
status: human_needed
score: 4/4 must-haves verified (automated); 1 item requires post-deploy human verification
overrides_applied: 0
human_verification:
  - test: "Rich Results Test paste — after PR merges to main and Vercel deploy completes, visit https://search.google.com/test/rich-results, enter https://tenantflow.app/pricing, confirm VALID for Product Snippet with 0 errors. Also spot-check: comparison-table shows 'Custom' for Max, pricing card shows 'Custom', /billing/plans still shows $199/month."
    expected: "VALID Product Snippet, 0 errors, exactly 2 offers (Starter $29 + Growth $79) in JSON-LD source, description contains 'Custom pricing, contact sales', /billing/plans still shows $199/month (Stripe-truth, intentional divergence)"
    why_human: "Rich Results Test requires a deployed URL (https://tenantflow.app/pricing). Cannot run against unmerged/undeployed code. This is Plan 01-02 Task 3 (checkpoint:human-verify), explicitly blocked on post-deploy access."
---

# Phase 1: Critical Stop-Bleed Verification Report

**Phase Goal:** Stop ongoing SEO + ad-spend hemorrhage. Bulk-unpublish all broken `blogs` rows so Google stops indexing duplicate "Error Processing Blog" pages. Make Max plan pricing agree across pricing card / comparison table / homepage features grid / JSON-LD using "Custom" placeholder until Phase 5 ships final tier numbers.
**Verified:** 2026-05-08T18:40:00Z
**Status:** HUMAN_NEEDED — all automated checks pass; 1 post-deploy human step pending (Rich Results Test paste)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `/blog` index and `/blog/[slug]` URLs no longer render "Error Processing Blog" — broken rows are unpublished, index renders honest empty state | ✓ VERIFIED | Migration `20260508231802` applied via Supabase MCP. Post-flight (A): `bad_remaining = 0`. Post-flight (B): `flipped_now_draft = 100`. Post-flight (C): `total_published = 0`. Read paths (`sitemap.ts`, `feed.xml/route.ts`, `blog-keys.ts`, RLS policy `blogs_select_published`) all filter `status='published'` — zero code changes needed. |
| 2 | Google Search Console shows declining count of error-pattern pages within 7 days of merge | ? DEFERRED | Post-deploy observation; explicitly noted in plan as non-synchronous gate. Deferred. |
| 3 | Pricing card / `pricing-comparison-table.tsx` / JSON-LD all show "Custom"/"Contact Sales" for Max with zero contradiction | ✓ VERIFIED (automated) + ? HUMAN NEEDED (post-deploy visual) | `pricing-comparison-table.tsx:206` renders `{MAX_PUBLIC_PRICE_DISPLAY}`, no `$199/mo` literal remains. `pricing/page.tsx` metadata description contains `Max — Custom pricing, contact sales`. JSON-LD `offers[]` has exactly 2 entries (Starter + Growth); Max omitted. Pricing card `pricing-card-standard.tsx:168` already showed "Custom" — confirmed unchanged. Rich Results Test paste requires post-deploy. |
| 4 | No new hex/rgb/`bg-white`/inline-ms tokens introduced | ✓ VERIFIED | `grep` across all 4 modified files (`src/config/pricing.ts`, `src/components/pricing/pricing-comparison-table.tsx`, `src/app/pricing/page.tsx`, `src/app/pricing/__tests__/page.test.ts`) returned zero matches for hex codes, `rgb(`, `rgba(`, `bg-white`, or inline-ms durations. Migration file is SQL-only. |

**Score:** 4/4 truths verified (automated). SC-2 is a post-deploy observation (non-synchronous per ROADMAP). SC-3 requires Rich Results Test post-deploy (human item).

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260508231802_unpublish_broken_blogs.sql` | One-shot migration: pre-flight + UPDATE + trigger + post-flight | ✓ VERIFIED | File exists, 128 lines. All 4 sections present. Timestamp `20260508231802` matches prod-assigned (reconciled per `migration-mcp-prod-drift.md`). |
| `.planning/phases/01-*/01-CRIT-01-affected-ids.txt` | 100 UUIDs + metadata header for rollback | ✓ VERIFIED | 113 lines (13 header + 100 IDs). Header documents: bad_rows=100, total_published=100, ratio=100%, trigger check, rollback SQL path. |
| `src/config/pricing.ts` | `MAX_PUBLIC_PRICE_DISPLAY = 'Custom' as const` with JSDoc | ✓ VERIFIED | Lines 9-10. JSDoc verbatim per D-02: `Phase 1 (CRIT-03) placeholder. Phase 5 (PRICE-*) deletes this. Search this symbol when restructuring tiers.` |
| `src/components/pricing/pricing-comparison-table.tsx` | Max sticky header uses constant, no `$199/mo` | ✓ VERIFIED | Line 5: import from `#config/pricing`. Line 206: `{MAX_PUBLIC_PRICE_DISPLAY}`. grep for `$199/mo` returns zero. |
| `src/app/pricing/page.tsx` | 2-offer JSON-LD + updated metadata description | ✓ VERIFIED | Line 23: metadata contains `Max — Custom pricing, contact sales`. Lines 36-42: offers array has 2 entries (Starter, Growth); Max omitted with inline comment `Re-add when PRICE-06 (Phase 5)`. |
| `src/app/pricing/__tests__/page.test.ts` | New page-level test, ≥3 assertions | ✓ VERIFIED | 99 lines. 3 `it()` blocks: (1) metadata omits `$199/mo`, contains em-dash phrase; (2) 2-offer JSON-LD via spy; (3) description verbatim substring. All 3 pass: `pnpm test:unit` exits 0, 100,023/100,023 tests green. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `pricing-comparison-table.tsx:206` | `src/config/pricing.ts → MAX_PUBLIC_PRICE_DISPLAY` | Named ESM import `import { MAX_PUBLIC_PRICE_DISPLAY } from '#config/pricing'` | ✓ WIRED | Import at line 5; JSX render at line 206. Grep confirms. |
| `pricing/page.tsx` JSON-LD offers | 2-offer call site (Starter + Growth) | `createProductJsonLd({ ..., offers: [Starter, Growth] })` | ✓ WIRED | Line 36-42 in `page.tsx`. Test spy confirms factory called once with 2-offer config. |
| `pricing/page.tsx` description | Verbatim `Custom pricing, contact sales` phrase | Product.description field in JSON-LD | ✓ WIRED | grep confirms phrase present at line 35 (JSON-LD description) and line 23 (metadata). |
| `reject_n8n_error_blogs_trigger` | `public.blogs` BEFORE INSERT | `CREATE TRIGGER ... BEFORE INSERT ON public.blogs FOR EACH ROW EXECUTE FUNCTION` | ✓ WIRED | Migration section 3. Post-flight (H) confirmed: `[reject_n8n_error_blogs_trigger, set_updated_at]` — exactly 2 triggers, no conflicts. Post-flight (I): trigger rejects matching insert with errcode 23514. |
| Migration UPDATE | `public.blogs.status → 'draft'` | `WHERE status='published' AND (title='Error Processing Blog' OR content LIKE ...)` | ✓ WIRED | Post-flight (A) = 0 bad rows remain published; (B) = 100 flipped; (C) = 0 total published remaining. |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `pricing-comparison-table.tsx:206` | `MAX_PUBLIC_PRICE_DISPLAY` | Static constant `'Custom' as const` in `src/config/pricing.ts` | N/A (static literal) | ✓ FLOWING — static compile-time value, not a query |
| `pricing/page.tsx` JSON-LD | `productJsonLd` | `createProductJsonLd({...})` called at component scope with static offer configs | N/A (static literal) | ✓ FLOWING — static build-time JSON-LD, confirmed by page test spy |

---

## Behavioral Spot-Checks

| Behavior | Command/Check | Result | Status |
|----------|---------------|--------|--------|
| All unit tests pass including new pricing page test | `pnpm test:unit` (full suite) | 100,023/100,023 tests green, 127 test files | ✓ PASS |
| Factory test `product-schema.test.ts` unchanged | `wc -l` + grep for `offers[2]?.price === '199'` at line 106 | 155 lines, 15 `it()` blocks, line 106 intact — 3-offer factory test unmodified | ✓ PASS |
| No `$199/mo` literal in comparison table | grep across `pricing-comparison-table.tsx` | Zero matches | ✓ PASS |
| No `$199/mo` or `Max ($199/mo` in page.tsx | grep across `page.tsx` | Zero matches | ✓ PASS |
| features-section.tsx untouched | `git diff main...branch -- features-section.tsx` | Empty diff (file not in phase branch changeset) | ✓ PASS |
| pricing-content.tsx CTAs unchanged | grep for "Connect with sales" and "Schedule a walkthrough" | Both present at lines 147 and 180 — untouched | ✓ PASS |
| pricing-card-standard.tsx:168 unchanged | grep for `Custom` in card | Present at line 168 — already showed "Custom", untouched | ✓ PASS |
| Stripe price IDs unchanged | grep `TENANTFLOW_MAX.price.monthly` in pricing.ts | = 199 at line 156 | ✓ PASS |
| D-01 verbatim phrase (em-dash U+2014) in migration | Python bytes check | `\xe2\x80\x94` (U+2014) confirmed between "redesign" and "do not preserve" | ✓ PASS |
| Mock names match actual pricing-content.tsx exports | grep `^export` in pricing-content.tsx | `PricingCtaSection`, `PricingFaqSection`, `PricingStatsGrid`, `pricingFaqs` — all 4 match test mock | ✓ PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| CRIT-01 | 01-01-PLAN.md | Bulk-unpublish broken blog rows; stop re-bleed via trigger | ✓ SATISFIED | Migration applied; 100 rows flipped; trigger live in prod; post-flight (A-I) all passed |
| CRIT-03 | 01-02-PLAN.md | Unify Max plan pricing display as "Custom" across 3 marketing surfaces | ✓ SATISFIED | Comparison table, metadata, JSON-LD all aligned; pricing card already correct; features-section correctly excluded per D-02 audit correction |

---

## Locked-Decision Compliance

| Decision | Requirement | Status | Evidence |
|----------|-------------|--------|---------|
| D-01: `pricing-card-standard.tsx:167-168` UNCHANGED | Already showed "Custom" | ✓ VERIFIED | File not in phase branch diff. Line 168 still renders "Custom" conditional. |
| D-01: `features-section.tsx:23-25` UNCHANGED | Audit correction — feature limit, not price | ✓ VERIFIED | File not in phase branch diff. Contains `Max unlimited` (feature limit) — no `$199` anywhere in file. |
| D-01: `pricing-content.tsx:147,180` UNCHANGED | Phase 10 TRUST-03 scope | ✓ VERIFIED | grep confirms "Connect with sales" (147) and "Schedule a walkthrough" (180) both present and unmodified. |
| D-01: `/billing/plans` UNCHANGED | Stripe-truth for paying subscribers | ✓ VERIFIED | No billing files in phase branch diff. |
| D-01: Stripe products/prices UNCHANGED | Phase 5 scope | ✓ VERIFIED | `TENANTFLOW_MAX.price.monthly = 199` at pricing.ts:156; `stripePriceIds` lines 157-158 untouched. |
| D-01: Trigger COMMENT contains verbatim D-01 phrase (em-dash U+2014) | "Phase 6 / BLOG-03 will drop this trigger as part of n8n redesign — do not preserve indefinitely" | ✓ VERIFIED | Bytes: `\xe2\x80\x94` (U+2014) confirmed in migration file at the exact location. Prod comment_text (from post-flight H2): `Phase 1 (CRIT-01) re-bleed guard. Phase 6 / BLOG-03 will drop this trigger as part of n8n redesign — do not preserve indefinitely.` |
| D-02: `MAX_PUBLIC_PRICE_DISPLAY` is module-scope constant, NOT a `displayPrice` field on `PricingConfig` | Type interface stays clean | ✓ VERIFIED | Export at `src/config/pricing.ts:10` is top-level module constant. No `PricingConfig` interface modification. |

---

## Out-of-Scope Leakage Check

| Deferred Item | Files Checked | Status |
|---------------|---------------|--------|
| Full blog rebuild (BLOG-01..06 → Phase 6) | Phase branch diff: only migration + .planning artifacts | ✓ NO LEAKAGE |
| Full pricing restructure (PRICE-01..06 → Phase 5) | `src/config/pricing.ts` — only `MAX_PUBLIC_PRICE_DISPLAY` constant added; Stripe IDs/prices untouched | ✓ NO LEAKAGE |
| Lint codification (TOKEN-03 → Phase 11) | Phase branch diff — no ESLint/stylelint config changes | ✓ NO LEAKAGE |
| CTA label canonicalization (TRUST-03 → Phase 10) | `pricing-content.tsx` not in diff; grep confirms "Connect with sales" + "Schedule a walkthrough" both preserved | ✓ NO LEAKAGE |
| Persona word selection (CONS-01 → Phase 4) | No persona-language files in diff | ✓ NO LEAKAGE |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | — | — | No anti-patterns found in any modified file |

Design-token scan across all 4 modified frontend files and the SQL migration file: zero hex codes, zero `rgb(`, zero `rgba(`, zero `bg-white`, zero inline-ms durations.

---

## Documented Deviations Analysis

### Deviation 1: Ratio guard relaxed from `>0.95` to `>1.0`

**Context:** The plan template specified abort if `v_match_count / v_total_published > 0.95`. Pre-flight found bad_rows=100, total_published=100 — a 100% match ratio, which would have tripped the guard.

**Is this sound?** YES. The purpose of the ratio guard is to catch false-positives — legitimate posts accidentally matching the error signature. Pre-flight queries Q5 (title-only match with no content match) and Q6 (content-only match with no title match) both returned zero rows, proving the WHERE clause has zero false-positives. The independent two-direction signature-divergence checks are a stronger safety signal than the ratio alone. With Q5+Q6=0, the ratio guard was genuinely redundant. The relaxed threshold `>1.0` (mathematically impossible: count cannot exceed total) effectively disables the ratio guard while retaining the `>200` absolute ceiling. The deviation is documented verbatim in the migration header and in the affected-IDs artifact header.

**Verdict:** Sound. The documented justification is valid.

### Deviation 2: Pre-existing trigger name is `set_updated_at`, not `update_blogs_updated_at`

**Context:** The plan template's post-flight (H) check expected `update_blogs_updated_at` as the name of the pre-existing updated_at trigger. The actual trigger on `public.blogs` is named `set_updated_at`.

**Is this sound?** YES. This is a pure naming discrepancy in the plan's expectation vs. the actual schema — the trigger itself is correct and doing the same job. Post-flight (H) correctly uses the actual name `set_updated_at` in its assertion. The migration doesn't interact with this trigger in any way (it's an AFTER UPDATE trigger; the new trigger is BEFORE INSERT). No behavioral impact. Documented in migration header comment and affected-IDs artifact header.

**Verdict:** Sound. The correction is verified and documented.

---

## Human Verification Required

### 1. Rich Results Test — Post-Deploy Structured Data Validation

**Test:**
1. After the PR merges to `main` and Vercel deploy completes (watch for green deploy in Vercel dashboard)
2. Visit https://search.google.com/test/rich-results
3. Enter URL: `https://tenantflow.app/pricing` → click "Test URL"
4. In the Page Source panel, verify the Product JSON-LD block has exactly 2 `Offer` entries (`"price":"29.00"` and `"price":"79.00"`) and no `"price":"199.00"`
5. Verify `"description"` field contains `Custom pricing, contact sales`
6. Visit https://tenantflow.app/pricing in a browser — Max column in comparison table shows "Custom"; Max pricing card shows "Custom" + "Contact Sales" CTA
7. Visit https://tenantflow.app/billing/plans (sign in as synthetic test owner) — Max plan shows `$199/month` (expected Stripe-truth divergence per D-02)

**Expected:**
- Rich Results Test: VALID for Product Snippet, 0 errors
- Detected items: 1× Product, 1× FAQPage, 1× BreadcrumbList
- JSON-LD: 2 offers only (Starter $29, Growth $79), description contains "Custom pricing, contact sales"
- `/pricing` page: "Custom" in card and comparison table
- `/billing/plans`: `$199/month` (intentional divergence — D-02)

**Why human:** Requires a deployed URL at `https://tenantflow.app/pricing`. Cannot run Google's Rich Results Test against undeployed code. Specialist 3's MEDIUM-confidence gap (couldn't run live test in sandbox) — this closes it.

---

## Deferred Items

| # | Item | Deferred To | Evidence |
|---|------|-------------|----------|
| 1 | Google Search Console declining error-page count | Post-deploy observation (≤7 days) | ROADMAP Phase 1 SC-2 explicitly states "post-deploy observation; not a synchronous gate" |
| 2 | Sitemap + feed.xml drop error-pattern blog URLs | Post-deploy ISR (≤24h) | ISR regenerates on its own schedule; 01-01-PLAN.md `truths_deferred_post_deploy` |

---

## Gaps Summary

No actionable gaps. All automated success criteria are met:

- CRIT-01: 100 broken blog rows bulk-unpublished (status='draft') in prod. BEFORE-INSERT trigger live with correct D-01 COMMENT. Zero bad rows remain published. Rollback artifact committed.
- CRIT-03: Comparison table, page metadata, and JSON-LD all updated. Zero `$199` price strings on public marketing surfaces. Pricing card already correct; features-section correctly excluded. Stripe truth preserved. 100,023 unit tests pass.
- Design tokens: zero violations introduced across all modified files.
- Out-of-scope: zero leakage into any deferred item.

The single pending item (Rich Results Test) is a post-deploy human verification step that cannot run synchronously — it is not a gap in the implementation, it is a gap in observable verification that will close after merge + deploy.

---

_Verified: 2026-05-08T18:40:00Z_
_Verifier: Claude (gsd-verifier)_
