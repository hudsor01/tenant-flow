---
phase: 10-cta-conversion
reviewed: 2026-05-21T12:58:01Z
depth: deep
files_reviewed: 5
files_reviewed_list:
  - src/app/__tests__/cta-label-canonical.test.ts
  - src/app/compare/[competitor]/__tests__/compare-neutral-framing.test.tsx
  - src/components/contact/__tests__/contact-form-fields.test.tsx
  - src/data/__tests__/testimonials.test.ts
  - src/app/security-policy/__tests__/monitored-inboxes.test.ts
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-05-21T12:58:01Z
**Depth:** deep
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Reviewed the 5 newly created Vitest 4 + jsdom regression-guard tests pinning the
already-shipped CONS-06/07/08 and TRUST-01/03/04 audit fixes. Each assertion was
cross-checked against the actual production source it claims to guard, with
particular focus on false-confidence assertions (tests that pass whether or not
the regression occurs).

**Verdict: all 5 tests are sound.** Every test would genuinely FAIL if its
corresponding fix regressed — verified below. No `any` or `as unknown as`. No
`vi.hoisted()` requirement (the single `vi.mock` factory closes over zero
external variables). Relative imports are correct — the `#data` alias genuinely
does not exist in `tsconfig.json#paths` / `package.json#imports`, and production
code (`marketing-home.tsx`, `pricing/page.tsx`) imports `testimonials.ts` via the
same relative path the test uses. TRUST-01 correctly pins `length >= 2` (not
`>= 3`) — the deferred 3rd testimonial is a documented honesty deferral.

Per-file regression verification:

- **cta-label-canonical.test.ts** — confirmed all 4 killed variants ("Talk to
  Sales", "Connect with sales", "Schedule a walkthrough", "Schedule a demo")
  have zero matches across `src/`, and "Contact Sales" appears in all 7 CTA
  files. The per-file `.not.toContain` loop fails on any reappearance; the
  `.some()` canonical-presence test fails if the label vanishes everywhere.
- **compare-neutral-framing.test.tsx** — `FeatureIcon` renders the `'na'` case
  as `<Minus className="text-muted-foreground" aria-label="Not applicable">`.
  Both render tests query `[aria-label="Not applicable"]` and assert
  `text-muted-foreground` present / `text-red`+`destructive` absent — fails if
  the icon reverts to a red `X`. `compare-data.ts` confirmed to carry exactly 4
  `tenantflow: "na"` rows (buildium 2, appfolio 1, rentredi 1).
- **contact-form-fields.test.tsx** — source confirms
  `placeholder="Please select"` on the `referralSource` Select. The source-scan
  test pins the literal; the render test correctly pins observable placeholder
  STATE (no `SelectItem` label leaks into the `#type` trigger) given Radix
  `SelectValue` does not render its placeholder string into jsdom. Sound.
- **testimonials.test.ts** — `realTestimonials` ships exactly 2 entries, no
  `metric` / `avatar` fields, all with non-empty quote/author/company.
  `TestimonialsSection` gates on `testimonials.length === 0` returning `null`.
  Empty-gate and real-quote render assertions both genuinely fail on regression.
- **monitored-inboxes.test.ts** — `/security-policy` § 7 confirmed to contain
  `security@tenantflow.app`, `sales@tenantflow.app`, the `Contact &amp;
  Monitored Inboxes` heading, `Acknowledged within 24 hours`, and `within 1
  business day`. Each `.toContain`/`.toMatch` fails if its text is dropped.

The two findings below are Info-level observations, not defects.

## Info

### IN-01: `@vitest-environment jsdom` docblock pragma is redundant

**File:** `src/app/compare/[competitor]/__tests__/compare-neutral-framing.test.tsx:1`, `src/components/contact/__tests__/contact-form-fields.test.tsx:1`, `src/data/__tests__/testimonials.test.ts:1`
**Issue:** The `unit` Vitest project (`vitest.config.ts:50`) already sets
`environment: "jsdom"` globally for every `src/**/*.{test,spec}.{ts,tsx}` file.
The `/** @vitest-environment jsdom */` pragma at the top of the three DOM-render
tests is therefore a no-op — the jsdom environment is already in effect without
it. The context brief flagged a concern that the pragma could be spuriously
written as a docblock STRING inside a pure scan test; that defect is NOT present
(the two pure `.ts` scan tests — `cta-label-canonical.test.ts`,
`monitored-inboxes.test.ts` — correctly omit it). The pragma is harmless and
arguably documents intent, so this is informational only.
**Fix:** Optional. Either drop the redundant pragma from the three render tests,
or keep it as explicit intent documentation. No action required.

### IN-02: `vi.mock("next/link")` in compare test is defensive, not load-bearing

**File:** `src/app/compare/[competitor]/__tests__/compare-neutral-framing.test.tsx:9-23`
**Issue:** `FeatureTable` (the only component under test) renders no `<Link>` in
its subtree — the `next/link` import in `compare-sections.tsx:2` is consumed only
by `BottomCta`. The mock is still defensible because `compare-sections.tsx`
evaluates the module-scope `import Link from "next/link"` when `FeatureTable` is
imported, and the mock pre-empts any Next router-context requirement. It is
correct and harmless, just not strictly required for the rendered tree. The mock
factory closes over zero outer variables, so `vi.hoisted()` is correctly not
used.
**Fix:** None required. Keep the mock as defensive isolation against future
`compare-sections.tsx` changes.

---

_Reviewed: 2026-05-21T12:58:01Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
