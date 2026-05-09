---
phase: 01-critical-stop-bleed-blog-unpublish-pricing-placeholder
reviewed: 2026-05-08T19:45:00Z
depth: deep
files_reviewed: 5
files_reviewed_list:
  - supabase/migrations/20260508231802_unpublish_broken_blogs.sql
  - src/config/pricing.ts
  - src/components/pricing/pricing-comparison-table.tsx
  - src/app/pricing/page.tsx
  - src/app/pricing/__tests__/page.test.ts
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-05-08T19:45:00Z
**Depth:** deep
**Files Reviewed:** 5
**Status:** issues_found (2 Info items — no Criticals, no Warnings)

## Summary

Reviewed the 5-file Phase 1 changeset: one SQL migration (CRIT-01 blog bulk-unpublish + re-bleed guard) and four TypeScript/TSX files (CRIT-03 Max pricing placeholder). Zero critical bugs, zero security vulnerabilities, zero CLAUDE.md zero-tolerance violations. Two Info findings, both related to Phase 5 cleanup breadcrumbs.

**Migration correctness:** All four structural requirements verified. SECURITY DEFINER + `SET search_path = public` present on `reject_n8n_error_blogs()`. `errcode = '23514'` (check_violation) correct. Idempotent via `WHERE status='published'` guard. Pre-flight + post-flight `do $$` blocks both present and structurally sound. D-01 em-dash phrase (`U+2014`) confirmed in `COMMENT ON FUNCTION` via byte-level inspection. Both documented deviations (ratio guard relaxed `>0.95` → `>1.0`; trigger name corrected to `set_updated_at`) are justified and well-documented in migration headers.

**CRIT-03 implementation:** `MAX_PUBLIC_PRICE_DISPLAY = 'Custom' as const` exported correctly at module scope (not on `PricingConfig` interface). Imported via `#config/pricing` path alias (CLAUDE.md compliant). Used in `pricing-comparison-table.tsx:206` with `text-xs text-muted-foreground` classes preserved for design-token symmetry. Stripe `price.monthly = 199` and both `stripePriceIds` for Max untouched at `pricing.ts:156-161`.

**JSON-LD correctness:** `createProductJsonLd` factory called with exactly 2 offers (Starter `29.00` + Growth `79.00`). Max omitted with inline `PRICE-06 (Phase 5)` breadcrumb comment at `page.tsx:41`. `Product.description` contains verbatim "Custom pricing, contact sales" at `page.tsx:35`. Factory at `src/lib/seo/product-schema.ts` is unmodified; existing factory tests remain valid.

**Test quality:** Three new `it()` blocks use `vi.hoisted()` correctly. Mock names for `pricing-content` (`PricingCtaSection`, `PricingFaqSection`, `PricingStatsGrid`, `pricingFaqs`) verified against actual exports. No `any` types. No `.rejects.toThrow('string')` patterns. `beforeEach` clears spy before each async test invocation. `noUncheckedIndexedAccess` concern is resolved by the explicit type cast on `mock.calls[0]![0]`.

**Cross-file import graph:** `MAX_PUBLIC_PRICE_DISPLAY` is defined once (`pricing.ts:10`), imported at one call site (`pricing-comparison-table.tsx:5`), and rendered at `pricing-comparison-table.tsx:206`. The two "Custom pricing, contact sales" strings in `page.tsx` (metadata description `:23` and JSON-LD product description `:35`) are hardcoded literals, not references to the constant — this is the source of the Info findings below.

**Design token compliance:** Zero hex codes, zero `rgb()`/`rgba()`, zero `bg-white`, zero inline-ms durations across all 5 files. All Tailwind classes used in modified hunks (`text-xs`, `text-muted-foreground`, `text-foreground`, `text-primary`, `bg-muted/50`, `bg-primary/5`, `border-primary/10`, `animate-in`, `fade-in`, `duration-700`, `delay-200`, `section-spacing`, `typography-h1`) are backed by `globals.css` `@theme` custom properties or standard Tailwind utilities. `text-success` maps to `--color-success: oklch(...)` at `globals.css:153`. Icon usage is `lucide-react` only.

**Out-of-scope leakage:** None. `features-section.tsx`, `pricing-card-standard.tsx`, `pricing-content.tsx` CTAs, `/billing/plans`, and Stripe products/prices are all untouched.

## Info

### IN-01: JSDoc cleanup breadcrumb covers only 1 of 3 stale strings — page.tsx metadata description has no inline Phase 5 comment

**File:** `src/config/pricing.ts:9-10` and `src/app/pricing/page.tsx:23`

**Issue:** The JSDoc on `MAX_PUBLIC_PRICE_DISPLAY` says "Search this symbol when restructuring tiers." This grep will correctly find and remove the constant definition and its one call site in `pricing-comparison-table.tsx:206`. However, `page.tsx:23` contains a hardcoded string `'Affordable property management software. Starter ($29/mo, 5 properties), Growth ($79/mo, 20 properties), Max — Custom pricing, contact sales...'` that does NOT import `MAX_PUBLIC_PRICE_DISPLAY`. Similarly, `page.tsx:35` contains a hardcoded JSON-LD `description` string with "Custom pricing, contact sales." The `page.tsx:35` string has a Phase 5 breadcrumb at `page.tsx:41` (`// Re-add when PRICE-06 (Phase 5)`), but the metadata `description` at `page.tsx:23` has no such breadcrumb. A Phase 5 engineer following `grep MAX_PUBLIC_PRICE_DISPLAY` will not be prompted to update the metadata description string.

The planning docs (CONTEXT.md, RESEARCH.md, 01-02-SUMMARY.md) do record the full cleanup path, but relying on planning docs for implementation-time discoverability is weaker than inline code comments. The symbol-search instruction in the JSDoc is accurate for what it finds, but the metadata description string is an unguarded cleanup obligation.

**Fix:** Add a trailing Phase 5 breadcrumb comment to the metadata description object:

```typescript
export const metadata: Metadata = createPageMetadata({
  title: 'Property Management Software Pricing — Plans from $29/mo',
  description:
    // Phase 1 (CRIT-03): Max placeholder. Phase 5 (PRICE-06) restores "Max ($XYZ/mo, unlimited)".
    'Affordable property management software. Starter ($29/mo, 5 properties), Growth ($79/mo, 20 properties), Max — Custom pricing, contact sales. 14-day free trial, no credit card required. Compare plans and features.',
  path: '/pricing'
})
```

Note: TypeScript does not allow comments inside a string expression, but a comment on the line preceding the string literal (inside the object literal) is valid syntax and will be preserved by the formatter.

---

### IN-02: JSDoc "Search this symbol" will find only 1 call site — planning docs claim "3 call sites" creating a discoverability mismatch

**File:** `src/config/pricing.ts:9`

**Issue:** The CONTEXT.md and RESEARCH.md Phase 5 forward-carry section states: "`grep -r MAX_PUBLIC_PRICE_DISPLAY src/` → delete constant + 3 call sites." In practice, `grep MAX_PUBLIC_PRICE_DISPLAY src/` returns exactly 2 matches (definition in `pricing.ts:10` and usage in `pricing-comparison-table.tsx:5,206`). The other two "Custom pricing" strings in `page.tsx` are hardcoded literals, not references to the constant. This is not a bug in the implementation — the design is correct — but the planning document's "3 call sites" language will give a Phase 5 engineer a false sense of completeness if they rely on the grep alone.

The JSDoc itself is accurate ("Search this symbol when restructuring tiers" makes no numeric claim). The mismatch is only in the planning docs, which are outside scope for this PR. However, the JSDoc could be strengthened to head off the discoverability gap without requiring planning doc edits.

**Fix:** Extend the JSDoc to mention `page.tsx` explicitly:

```typescript
/**
 * Phase 1 (CRIT-03) placeholder. Phase 5 (PRICE-*) deletes this constant and its
 * call site in pricing-comparison-table.tsx. Also update hardcoded "Custom pricing,
 * contact sales" strings in src/app/pricing/page.tsx (metadata description + JSON-LD
 * product description) — those strings are not references to this constant.
 */
export const MAX_PUBLIC_PRICE_DISPLAY = 'Custom' as const
```

---

## Verification Checklist (Deep)

| Check | Result |
|-------|--------|
| SECURITY DEFINER + `SET search_path = public` on trigger function | PASS — `security definer` + `set search_path = public` at `migration:82-83` |
| `errcode = '23514'` (check_violation) | PASS — `migration:91` |
| Idempotent re-run safety | PASS — `WHERE status='published'` in both UPDATE and pre-flight |
| Pre-flight `do $$` block | PASS — `migration:28-60` |
| Post-flight `do $$` block | PASS — `migration:110-127` |
| D-01 em-dash (U+2014) in COMMENT ON FUNCTION | PASS — bytes `\xe2\x80\x94` confirmed in `migration:98` |
| Ratio guard `>1.0` deviation documented | PASS — migration header + inline comment at `migration:49-52` |
| Trigger name `set_updated_at` deviation documented | PASS — migration header comment line 23 |
| `MAX_PUBLIC_PRICE_DISPLAY` is module-scope const, NOT `displayPrice` on interface | PASS — `pricing.ts:10`, no interface modification |
| JSDoc references Phase 5 (PRICE-*) | PASS — `pricing.ts:9` |
| Stripe `price.monthly/annual` for Max untouched | PASS — `pricing.ts:156-161`: `monthly: 199`, both `stripePriceIds` intact |
| `#config/pricing` path alias used (not relative) | PASS — `pricing-comparison-table.tsx:5` |
| Tailwind classes `text-xs text-muted-foreground` preserved in Max header cell | PASS — `pricing-comparison-table.tsx:206` |
| No `bg-white` in any modified file | PASS — zero matches |
| `Product.offers[]` has exactly 2 entries (Starter + Growth) | PASS — `page.tsx:36-38` |
| Max omitted from offers with PRICE-06 breadcrumb | PASS — `page.tsx:39-41` |
| `Product.description` contains verbatim "Custom pricing, contact sales" | PASS — `page.tsx:35` |
| `createProductJsonLd` factory NOT modified | PASS — `src/lib/seo/product-schema.ts` untouched |
| `product-schema.test.ts` factory test NOT modified | PASS — existing 14/15 tests unchanged |
| No `any` types in any reviewed file | PASS — zero matches |
| No `as unknown as` type assertions | PASS — zero matches |
| `vi.hoisted()` used correctly for mock variable | PASS — `page.test.ts:4-9` |
| Mock names match actual `pricing-content.tsx` exports | PASS — `PricingCtaSection`, `PricingFaqSection`, `PricingStatsGrid`, `pricingFaqs` all confirmed |
| `beforeEach` clears spy before each test | PASS — `page.test.ts:67-69` |
| Both async tests call `await PricingPage()` before accessing `mock.calls` | PASS — `page.test.ts:78,94` |
| No `.rejects.toThrow('string')` pattern (chai 6 bug) | PASS — no `.rejects` pattern in test file |
| `pricing-card-standard.tsx:167-168` NOT in diff | PASS — out-of-scope confirmed |
| `features-section.tsx` NOT in diff | PASS — out-of-scope confirmed |
| `pricing-content.tsx:147,180` CTAs untouched | PASS — not in diff |
| `/billing/plans` NOT in diff | PASS — out-of-scope confirmed |
| Design tokens: no hex/rgb/bg-white/inline-ms across all 5 files | PASS — zero violations |

---

_Reviewed: 2026-05-08T19:45:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
