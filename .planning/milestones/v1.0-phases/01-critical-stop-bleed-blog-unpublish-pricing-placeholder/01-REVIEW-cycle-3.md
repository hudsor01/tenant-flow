---
phase: 01-critical-stop-bleed-blog-unpublish-pricing-placeholder
reviewed: 2026-05-08T23:55:00Z
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
  info: 0
  total: 0
status: clean
---

# Phase 01: Code Review Report — Cycle 3

**Reviewed:** 2026-05-08T23:55:00Z
**Depth:** deep
**Files Reviewed:** 5
**Status:** clean

## Summary

Full adversarial re-review of all 5 Phase 1 files at deep depth. Cycle-3 applied a fresh-eyes posture against 12 targeted adversarial angles not fully probed in prior cycles. Zero findings at any severity level.

All reviewed files meet quality standards.

---

## Adversarial Check Results

### 1. Trigger bypass via service-role (`session_replication_role`)

**Verdict: acceptable known risk.**

Postgres triggers fire regardless of the calling role unless `DISABLE TRIGGER` or `SET session_replication_role = 'replica'` is issued in the same session. The base schema (`20251101000000_base_schema.sql:7`) sets `client_encoding = 'UTF8'`, and the only historical use of `session_replication_role = 'replica'` is in `20251231081143_migrate_enums_to_text_constraints.sql` (a one-time enum migration, lines 6 and 803). There is no evidence that n8n's normal insert flow sets this session variable. Accidental bypass requires deliberate misconfiguration — not a passive vulnerability. CONTEXT.md explicitly frames this as a temporary stop-bleed; Phase 6 (BLOG-03) is the permanent fix. Acceptable.

### 2. Trigger covers INSERT only — UPDATE re-publish not guarded

**Verdict: not a gap for this stop-bleed scope.**

The trigger is `BEFORE INSERT ON public.blogs` (migration:103). It does not fire on UPDATE. If n8n were to UPDATE an existing drafted bad-signature row back to `status='published'`, the trigger would not intercept it. However, the n8n workflow inserts new rows; it does not update or re-publish existing ones. The Section 2 mutation already flipped all pre-existing published bad-signature rows to `status='draft'`. The INSERT guard covers the active re-bleed path.

### 3. LIKE pattern false-negatives on n8n version change

**Verdict: known limitation, documented, acceptable.**

`content LIKE 'Error: Could not extract content. Response keys: %'` matches the current n8n error string verbatim. A future n8n minor release that changes the error message would silently pass bad rows through the trigger. This is a known limitation acknowledged by the COMMENT ON FUNCTION and the Phase 6 (BLOG-03) forward-carry in CONTEXT.md. The trigger is an intentional stop-bleed, not a permanent content validator. No action required.

### 4. Em-dash encoding through pg_dump/restore cycles

**Verdict: safe.**

The migration file contains 6 em-dashes (U+2014, bytes `\xe2\x80\x94`). No BOM. The base schema `20251101000000_base_schema.sql:7` sets `SET client_encoding = 'UTF8'`. Postgres stores function `COMMENT` text in the system catalog using the database server encoding (UTF-8 on Supabase). `pg_dump` preserves UTF-8 comment text faithfully. The em-dash in the `COMMENT ON FUNCTION` will survive any pg_dump → restore cycle without corruption. No issue.

### 5. JSON-LD `priceCurrency` + `availability` in 2-offer output

**Verdict: compliant.**

`createProductJsonLd` in `src/lib/seo/product-schema.ts:48-50` emits `priceCurrency: 'USD'` and `availability: 'https://schema.org/InStock'` for every offer. With Max omitted from `offers[]`, the two-offer array (Starter at `$29.00`, Growth at `$79.00`) is fully valid for Google's Product Snippet requirements. The factory also emits `priceValidUntil` (computed to one year from call time), `shippingDetails`, and `hasMerchantReturnPolicy` — all required Google structured-data fields. No regression from the 3-offer to 2-offer reduction.

### 6. `as const` type narrowing — widening risk on consumption

**Verdict: no widening.**

`MAX_PUBLIC_PRICE_DISPLAY` is imported at `pricing-comparison-table.tsx:5` and rendered directly as JSX text at line 206: `{MAX_PUBLIC_PRICE_DISPLAY}`. It is NOT passed as `FeatureValue` (type `boolean | string | number`) — that type applies only to the `comparisonData` array entries. The `'Custom'` literal is embedded inline as JSX children, where TypeScript accepts `string | undefined | null | ReactNode`. No widening of the `'Custom'` literal type occurs at the call site. No future refactor risk from the current code shape.

### 7. Test assertion depth — count-only or substantive?

**Verdict: thorough.**

The second `it()` (lines 77-91) asserts four independent properties of the offers array:
- `.toHaveLength(2)` — count
- `expect(config.offers[0]).toMatchObject({ name: 'Starter', price: '29.00' })` — first offer identity + price
- `expect(config.offers[1]).toMatchObject({ name: 'Growth', price: '79.00' })` — second offer identity + price
- `expect(config.offers.find(o => o.name === 'Max')).toBeUndefined()` — Max absent by name
- `expect(config.offers.find(o => o.price === '199.00')).toBeUndefined()` — Max absent by price value

This is a meaningful multi-dimensional assertion, not a count-only check. Any regression that re-introduces Max or changes offer prices will be caught.

### 8. `vi.mock('../pricing-content')` side-effect risk

**Verdict: safe.**

`src/app/pricing/pricing-content.tsx` imports only React components, Lucide icons, and `next/link`. Its module body defines static `const` arrays (`STATS`, `FAQS`) and exports four functions. No `addEventListener`, no `window.*` access, no `global.*` mutations, no `useEffect` at module level. The mock replaces four named exports with React-null-returning functions and one empty array. No side-effect is lost by the mock.

### 9. `createProductJsonLd` throw path / error boundary

**Verdict: no throw risk.**

`page.tsx` passes a static literal `offers` array (never null/undefined). `getOneYearFromNow()` constructs `new Date()` which is infallible in this context. `getSiteUrl()` derives from `#env` (mocked in tests). The factory has no conditional throw paths. No error boundary is needed beyond Next.js's default RSC error boundary.

### 10. `beforeEach` + `mock.calls[0]!` — correctness

**Verdict: correct.**

`mockClear()` resets `mock.calls` to `[]` before each test. Both the second and third `it()` blocks call `await PricingPage()` before accessing `mock.calls[0]![0]`. Because `PricingPage` is an `async function` and the test `await`s its resolution, the spy is guaranteed to have been called exactly once before `mock.calls[0]!` is accessed. The non-null assertion `!` is safe and `noUncheckedIndexedAccess`-compliant.

### 11. Phase 5 "keep Custom label" scenario — JSDoc accuracy

**Verdict: JSDoc is appropriately flexible.**

The JSDoc says "Phase 5 (PRICE-*) deletes this constant and its call site." It does not say Phase 5 MUST show a numeric price — only that Phase 5 owns the decision. If Phase 5 keeps "Custom" as the permanent enterprise label, the Phase 5 engineer reads the JSDoc, evaluates whether to delete the constant (replace with an inline string) or retain it with an updated comment, and acts accordingly. The JSDoc is a deletion reminder, not an instruction that forces a wrong outcome.

### 12. Console.log, `any` types, `as unknown as`

**Verdict: zero violations.**

Grep over all 5 files confirms zero matches for `console.`, `: any`, `as any`, `<any>`, `as unknown as`. CLAUDE.md zero-tolerance rules satisfied.

---

## Perfect-PR Gate Confirmation

- **Cycle 1:** 2 Info findings (IN-01 + IN-02)
- **Cycle 2:** 0 findings — FIRST zero-finding cycle
- **Cycle 3 (this):** 0 findings — SECOND consecutive zero-finding cycle

**The perfect-PR two-consecutive-zero-finding gate is satisfied. PR #682 is merge-ready.**

---

_Reviewed: 2026-05-08T23:55:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Cycle: 3 of perfect-PR gate_
