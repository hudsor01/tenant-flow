# Phase 10: CTA & Conversion Standardization - Research

**Researched:** 2026-05-20
**Domain:** Brownfield audit-fix — Next.js 16 marketing-surface CTAs, `/compare/*` framing, contact form, testimonials, regression-test pinning
**Confidence:** HIGH

## Summary

Phase 10 closes seven v1.0 "Marketing Surface Honesty" audit findings: CONS-06 (canonical "Contact Sales" CTA label), CONS-07 (neutral `/compare/*` framing for positioning choices), CONS-08 (`/contact` form default), TRUST-01 (testimonials), TRUST-02 (review badges), TRUST-03 (monitored-inbox documentation), TRUST-04 (auto-derived inbox-monitoring confirmation).

**The decisive finding: all production code for Phase 10 is ALREADY SHIPPED to `main`.** Git history shows two merged PRs:
- **PR #694** (`ad7c38ab2` `feat(phase-10): cta + conversion standardization (CONS-06/07/08, TRUST-01..04)`) — the core fixes.
- **PR #695 follow-up** (`f81f9a7a5`, with `0593fc273` `feat(phase-10-followup): wire real testimonials — TRUST-01 un-deferred` + `d27bc7803` `test(phase-10-followup): add testimonials.ts to MARKETING_FILES banlist guard`).

Both PRs are ancestors of the current branch tip `a2b8c39a2` (Phase 9's PR #737) and of `main` — verified via `git branch -a --contains ad7c38ab2`. Every code touchpoint named in 10-CONTEXT.md was read in this session and reflects the corrected, shipped state.

**CRITICAL — 10-CONTEXT.md is STALE on TRUST-01/02.** The context file (dated 2026-05-11) states TRUST-01 (testimonials) and TRUST-02 (review badges) are DEFERRED because zero customers exist and fabrication is rejected. **That decision was reversed AFTER the context was written.** A `phase-10-followup` effort un-deferred TRUST-01: `src/data/testimonials.ts` now ships **two real, attributed testimonials** (Janet Shur, 8 properties; Jacob Lear, 13 properties) wired into BOTH the homepage (`marketing-home.tsx:129`) and `/pricing` (`pricing/page.tsx:97`). The file header explicitly distinguishes these from the Phase 67 fabricated pattern: real landlords, product-team-drafted-and-customer-approved quotes, no headshots, no fabricated metrics. **TRUST-02 (review badges) remains genuinely deferred** — no G2/Capterra/Trustpilot listings exist.

**Primary recommendation:** Treat this as a verification-and-test-pinning phase, mirroring Phases 7-9. All production fixes are done. The genuine gap is **regression test coverage** — there are currently ZERO dedicated regression tests for CONS-06, CONS-07, CONS-08, or TRUST-03 (only the transitive `marketing-copy-landlord-only.test.ts` banlist guard touches `testimonials.ts` and `compare-data.ts`). The plan should add focused regression pins for the four SHIPPED requirements and record TRUST-02 as deferred with no test. The planner MUST resolve the CONTEXT-vs-reality conflict on TRUST-01 (see Open Questions).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Canonical "Contact Sales" CTA label | Frontend Server (RSC) | — | Labels are literal strings in server-component JSX (`about/page.tsx`, `pricing-content.tsx`, `faq/page.tsx`, `help/page.tsx`) |
| `/compare/*` `FeatureSupport` union type | Type tier | — | `src/types/sections/compare.ts` — compile-time contract for the `'na'` variant |
| `FeatureIcon` neutral-framing render | Browser/Client | — | `compare-sections.tsx` — pure presentational icon switch; `'na'` → `Minus` in `text-muted-foreground` |
| `/compare/*` feature-row data | Data tier (RSC-consumed) | — | `compare-data.ts` — static module data array; positioning rows carry `tenantflow: 'na'` + `tenantflowNote` |
| `/contact` form select placeholder | Browser/Client | — | `contact-form-fields.tsx` is a `'use client'` form field component; `SelectValue placeholder` is a literal string |
| Testimonials render + empty-state gate | Browser/Client | Data tier | `testimonials-section.tsx` gates on `testimonials.length === 0`; data from `src/data/testimonials.ts` |
| Monitored-inbox documentation | Frontend Server (RSC) | — | `security-policy/page.tsx` — static legal-page content; `sales@`/`security@` SLAs are literal copy |
| Regression test pinning | Test tier (Vitest) | — | Vitest `unit` project, jsdom, `src/**/*.{test,spec}.{ts,tsx}` |

## User Constraints (from CONTEXT.md)

### Locked Decisions

**CONS-06 — Canonical "Contact Sales" label**
- Standardize on "Contact Sales" sitewide. Killed variants: "Talk to Sales", "Connect with sales", "Schedule a walkthrough", "Schedule a demo".
- 10-CONTEXT scoped this as "4 string swaps across `/about`, `/pricing`". Verification found the canonical label is broader than that (also on `/faq`, `/help`, homepage FAQ, pricing components) — see Phase Requirements table.

**CONS-07 — Neutral framing for positioning choices**
- Added `'na'` variant to `FeatureSupport` (`'yes' | 'no' | 'partial' | 'addon' | 'na'`). Renders as muted-foreground `Minus`, not destructive red `X`.
- Rows that genuinely lack a feature keep `tenantflow: 'no'` (red `X`). Rows absent **by design** use `tenantflow: 'na'` + a `tenantflowNote` like "By design — landlord-only platform".

**CONS-08 — Contact form placeholder**
- "How did you hear about us?" `SelectValue placeholder` is "Please select" (explicit ask). No default value — defaulting would skew first-touch attribution.

**TRUST-01 / TRUST-02 — Honest deferral (as written in CONTEXT — NOW PARTIALLY SUPERSEDED)**
- 10-CONTEXT states both deferred to post-customer. **This is stale for TRUST-01.** See Open Questions Q1: TRUST-01 was un-deferred by the `phase-10-followup` work and real testimonials shipped. TRUST-02 (review badges) remains correctly deferred.

**TRUST-03 — Inbox monitoring documentation**
- `security@tenantflow.app` — public via `/security-policy` § 7 (general contact) + § 3 referenced for the 24h acknowledgement SLA.
- `sales@tenantflow.app` — added to `/security-policy` § 7 as a separate channel with a 1-business-day SLA.

### Claude's Discretion
- Exact set of files carrying the canonical "Contact Sales" label (CONS-06 verification found more than the 4 the context named).
- Which regression tests to add for each shipped requirement, and their assertion shape.

### Deferred Ideas (OUT OF SCOPE)
- **TRUST-02 review badges** — reactivate when reviews exist on G2/Capterra/Trustpilot. No code work in Phase 10.
- **Customer testimonial collection workflow** — separate ops process (email outreach + opt-in form), not v1.0 code.
- **Featured-page top-nav CTA pill consolidation** — only one CTA pill exists on `/features` per Phase 9 cleanup; nothing to consolidate. Roadmap line satisfied trivially.

## Phase Requirements

| ID | Description | Shipped? | Research Support |
|----|-------------|----------|------------------|
| CONS-06 | Canonical "Contact Sales" CTA label sitewide | ✅ SHIPPED (PR #694 `ad7c38ab2`) | `grep "Talk to Sales\|Connect with sales\|Schedule a walkthrough\|Schedule a demo"` → **ZERO matches**. "Contact Sales" present in 12 locations across 7 files (see Code Examples). Regression test needed. |
| CONS-07 | Neutral `/compare/*` framing — `'na'` variant | ✅ SHIPPED (PR #694) | `FeatureSupport` union includes `"na"` (`compare.ts:5`). `FeatureIcon` `'na'` case renders `<Minus text-muted-foreground aria-label="Not applicable">` (`compare-sections.tsx:16-25`). `compare-data.ts` has **4 `'na'` rows** (3× ACH/Payment Processing, 1× HOA Management). Regression test needed. |
| CONS-08 | `/contact` "How did you hear about us?" default | ✅ SHIPPED (PR #694) | `contact-form-fields.tsx:163` — `<SelectValue placeholder="Please select" />` on the `referralSource`/`type` select. No default `value`. Regression test needed. |
| TRUST-01 | ≥3 real testimonials with names + property counts + quotes | ⚠️ PARTIALLY SHIPPED (PR #695 follow-up) — **CONTEXT CONFLICT** | `src/data/testimonials.ts` ships **2** real testimonials (Janet Shur / 8 properties, Jacob Lear / 13 properties), wired to homepage + `/pricing`. Requirement asks for **≥3**; only 2 exist. 10-CONTEXT says "deferred". See Open Questions Q1. |
| TRUST-02 | G2/Capterra/Trustpilot review badges if reviews exist | 🚫 DEFERRED (correctly) | No review listings exist. No code. Document deferred-status only — no test. |
| TRUST-03 | `sales@`/`security@` monitored-inbox documentation | ✅ SHIPPED (PR #694) | `security-policy/page.tsx:180-203` — § 7 "Contact & Monitored Inboxes" documents both inboxes with explicit SLAs (security: 24h ack; sales: 1 business day). Regression test needed. |
| TRUST-04 | Inboxes confirmed monitored before paid traffic; document owner | ✅ SHIPPED (auto-derived from TRUST-03) | Satisfied by the `/security-policy` § 7 documentation. No separate code surface — TRUST-04 is the operational outcome of TRUST-03's documentation. No standalone test beyond TRUST-03's pin. |

## Standard Stack

No new dependencies. This is a verification + test-pinning phase on already-shipped code.

### Core (already in use — relevant to test authoring)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vitest` | 4.1.6 | Test runner | Project standard; `unit` project = jsdom + `src/**/*.{test,spec}.{ts,tsx}` |
| `@testing-library/react` | (installed) | Component render/query for jsdom tests | Used by `compare-breadcrumb.test.tsx`, `sticky-conversion-cta.test.tsx` — the mirror patterns |
| `jsdom` | (installed) | DOM environment for component tests | `vitest.config.ts` `unit` project sets `environment: "jsdom"` |
| `node:fs` `readFileSync` | Node 24 builtin | Static-file scan for string-presence assertions | Used by `marketing-copy-landlord-only.test.ts` + `sitemap.test.ts` drift guards — the proven pattern for "this string must/must-not appear in a source file" |

**Installation:** None. `bun install` already satisfies the test toolchain.

**Verified versions:** `vitest@4.1.6` confirmed from the live test run output (`RUN v4.1.6`). The marketing-copy banlist suite ran green: **100,161 tests passed** in 2.69s.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `readFileSync` static-scan tests | `@testing-library/react` render tests | Render tests catch behavioral regressions (e.g. `FeatureIcon` actually rendering `Minus`); static scans are faster and catch string-label drift. Use BOTH: static scan for CONS-06 labels + TRUST-03 copy; render test for CONS-07 `FeatureIcon` + CONS-08 placeholder + testimonials empty-state gate. |
| New dedicated test files | Extending `marketing-copy-landlord-only.test.ts` | The banlist test already scans `compare-data.ts` and `testimonials.ts` for *banned* phrases. It does NOT assert *required* presence (e.g. "Contact Sales" must exist, the `'na'` rows must exist). New focused files are clearer and mirror Phase 9's per-finding test layout. |

## Architecture Patterns

### System Architecture Diagram

```
                   ┌─────────────────────────────────────────────┐
                   │  STATIC SOURCE FILES (already shipped)       │
                   │                                             │
   CONS-06 ───────▶│  about/page.tsx, pricing-content.tsx,       │
   (CTA labels)    │  faq/page.tsx, help/page.tsx, home-faq.tsx, │
                   │  kibo-style-pricing.tsx,                    │
                   │  pricing-card-standard.tsx                  │
                   │       └─ literal "Contact Sales" strings    │
                   │                                             │
   CONS-07 ───────▶│  compare.ts (FeatureSupport union + 'na')   │
   (compare        │  compare-sections.tsx (FeatureIcon switch)  │
    framing)       │  compare-data.ts (4 rows: tenantflow:'na')  │
                   │                                             │
   CONS-08 ───────▶│  contact-form-fields.tsx                    │
   (form default)  │       └─ SelectValue placeholder="Please…"  │
                   │                                             │
   TRUST-01 ──────▶│  src/data/testimonials.ts (realTestimonials)│
   (testimonials)  │       ├─▶ marketing-home.tsx  (homepage)    │
                   │       └─▶ pricing/page.tsx    (/pricing)    │
                   │            └─ TestimonialsSection           │
                   │               (length===0 → return null)   │
                   │                                             │
   TRUST-03/04 ───▶│  security-policy/page.tsx § 7               │
   (inbox docs)    │       └─ sales@ + security@ + SLAs          │
                   └──────────────────┬──────────────────────────┘
                                      │
                          ┌───────────▼────────────┐
                          │  REGRESSION TEST LAYER  │  ◀── PHASE 10 DELIVERABLE
                          │  (Vitest unit project)  │
                          │                         │
                          │  • readFileSync scan:   │
                          │    "Contact Sales" must │
                          │    exist; killed labels │
                          │    must NOT exist       │
                          │  • render FeatureIcon:  │
                          │    'na' → Minus +       │
                          │    text-muted-foreground│
                          │  • render contact form: │
                          │    placeholder = "..."  │
                          │  • render Testimonials: │
                          │    empty → null; 2 real │
                          │    quotes render        │
                          │  • scan security-policy:│
                          │    both inboxes present │
                          └─────────────────────────┘
```

### Recommended Project Structure

New test files (mirror Phase 9's per-finding layout — colocated `__tests__` dirs):

```
src/
├── app/
│   ├── compare/[competitor]/
│   │   └── __tests__/
│   │       └── compare-neutral-framing.test.tsx   # CONS-07: FeatureIcon 'na' + compare-data 'na' rows
│   └── security-policy/
│       └── __tests__/
│           └── monitored-inboxes.test.ts          # TRUST-03/04: sales@ + security@ presence + SLA copy
├── components/
│   └── contact/
│       └── __tests__/
│           └── contact-form-fields.test.tsx        # CONS-08: "Please select" placeholder
└── data/
    └── __tests__/
        └── testimonials.test.ts                    # TRUST-01: real-testimonial shape + count guard
```

CONS-06 (CTA-label canonicalization) is a cross-file string concern — a single `readFileSync`-style scan test fits best. Either a new `src/app/__tests__/cta-label-canonical.test.ts` or extend the existing `marketing-copy-landlord-only.test.ts` MARKETING_FILES walker with a *required-presence + banned-label* assertion. New file recommended for clarity (Phase 9 precedent: one test per finding).

### Pattern 1: Static-file string-presence drift guard
**What:** `readFileSync` a source file, assert a string is present (canonical label) or absent (killed variant).
**When to use:** CONS-06 (CTA labels), TRUST-03 (inbox copy) — concerns where the regression risk is a literal string silently changing.
**Example:**
```typescript
// Source pattern: src/app/__tests__/marketing-copy-landlord-only.test.ts (existing, proven)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("CONS-06: canonical Contact Sales label", () => {
  const cwd = process.cwd();
  const KILLED_VARIANTS = [
    "Talk to Sales",
    "Connect with sales",
    "Schedule a walkthrough",
    "Schedule a demo",
  ];
  const CTA_FILES = [
    "src/app/about/page.tsx",
    "src/app/pricing/pricing-content.tsx",
    "src/app/faq/page.tsx",
    "src/app/help/page.tsx",
    "src/components/sections/home-faq.tsx",
    "src/components/pricing/kibo-style-pricing.tsx",
    "src/components/pricing/pricing-card-standard.tsx",
  ];

  for (const rel of CTA_FILES) {
    it(`${rel} uses no killed CTA-label variant`, () => {
      const content = readFileSync(join(cwd, rel), "utf8");
      for (const variant of KILLED_VARIANTS) {
        expect(content, `${rel} still contains "${variant}"`).not.toContain(variant);
      }
    });
  }
});
```

### Pattern 2: Component render assertion (jsdom)
**What:** Render a component with `@testing-library/react`, query the DOM for the corrected behavior.
**When to use:** CONS-07 (`FeatureIcon` `'na'` → `Minus`), CONS-08 (placeholder text), TRUST-01 (empty-state gate).
**Example:**
```typescript
// Source pattern: src/components/compare/__tests__/compare-breadcrumb.test.tsx (existing, proven)
/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestimonialsSection } from "#components/sections/testimonials-section";

describe("TRUST-01: TestimonialsSection empty-state gate", () => {
  it("renders nothing when testimonials is empty", () => {
    const { container } = render(<TestimonialsSection testimonials={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

### Anti-Patterns to Avoid
- **Re-implementing shipped production code.** All CONS-06/07/08 + TRUST-01/03/04 production code is on `main`. Phase 10's deliverable is tests, not new components — mirrors Phases 7-9 exactly.
- **Writing a test that asserts `testimonials.length >= 3`.** Only 2 real testimonials exist. A `>= 3` assertion would fail. See Open Questions Q1 — the planner must decide the requirement-vs-reality framing before the test is written.
- **Fabricating a third testimonial to satisfy TRUST-01's "≥3".** Explicitly rejected — re-introduces the Phase 67 fabricated-attribution problem the entire honesty milestone exists to prevent.
- **Snapshot-testing whole pages.** Brittle; pin the specific load-bearing strings/behaviors only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "This source file must/must-not contain string X" | A custom AST walker | `readFileSync` + `expect(content).toContain/.not.toContain` | The existing `marketing-copy-landlord-only.test.ts` proves the pattern at 100k-test scale; AST parsing is overkill for label-drift detection |
| Rendering a React component in a test | Manual JSDOM bootstrapping | `@testing-library/react` `render` + `@vitest-environment jsdom` | Already the project standard; `compare-breadcrumb.test.tsx` is the copy-paste reference |
| Mocking `next/link` in component tests | Hand-rolled link stub per file | The `vi.mock("next/link", ...)` block from `compare-breadcrumb.test.tsx` | Identical stub already exists — copy it verbatim |
| Banned-phrase / fabricated-identity guarding | A new banlist | Extend `MARKETING_FILES` in `marketing-copy-landlord-only.test.ts` | `src/data/testimonials.ts` and `compare-data.ts` are ALREADY in `MARKETING_FILES` (lines 234, 236) — fabrication is already guarded |

**Key insight:** Every test mechanic Phase 10 needs already exists in the codebase. The work is assertion authoring, not infrastructure.

## Common Pitfalls

### Pitfall 1: Trusting 10-CONTEXT.md on TRUST-01
**What goes wrong:** Planning to "document TRUST-01 as deferred" per the context file, when real testimonials actually shipped.
**Why it happens:** 10-CONTEXT.md was locked 2026-05-11, BEFORE the `phase-10-followup` work (`0593fc273`, `d27bc7803`, PR #695) un-deferred TRUST-01.
**How to avoid:** Trust the git history + live files over the context file for TRUST-01. `src/data/testimonials.ts` has 2 real testimonials wired to 2 surfaces. The planner must reconcile this (Open Questions Q1).
**Warning signs:** A plan task that says "add TRUST-01 to the deferred record" — contradicts the shipped code.

### Pitfall 2: `bun run test:unit -- --run <file>` double-flag crash
**What goes wrong:** `bun run test:unit -- --run src/path/test.ts` errors with `Expected a single value for option "--run", received [true, true]`.
**Why it happens:** The `test:unit` script is already `vitest --run --project unit`. Passing `--run` again duplicates the flag.
**How to avoid:** For a single file, run `bunx vitest --run --project unit src/path/to/test.ts` directly (verified working this session). CLAUDE.md's documented `bun run test:unit -- --run src/path` form is stale post-Vitest-4 / post-Biome-migration.
**Warning signs:** `vitest/dist/chunks/cac` CAC parse error.

### Pitfall 3: Two distinct `TestimonialsSection` components
**What goes wrong:** Writing a test against the wrong testimonials component.
**Why it happens:** There are TWO: `src/components/sections/testimonials-section.tsx` (prop-driven, takes `testimonials?: Testimonial[]`, used by homepage + `/pricing` with `realTestimonials`) and `src/components/landing/testimonials-section.tsx` (imports a hardcoded empty `testimonials` array from `./features-data`, used only by `features-client.tsx`).
**How to avoid:** TRUST-01's real data flows through `#components/sections/testimonials-section`. The `landing/` variant always renders `null` (its `features-data.ts` `testimonials` export is `[]`). Test the `sections/` one for TRUST-01; the `landing/` one only needs the empty-gate confirmed if at all.
**Warning signs:** A test importing `#components/landing/testimonials-section` while asserting real quotes render — it will always be empty.

### Pitfall 4: CONS-06 scope is wider than 10-CONTEXT claims
**What goes wrong:** A regression test covering only `/about` + `/pricing` (the "4 string swaps" the context names) misses the other label sites.
**Why it happens:** 10-CONTEXT.md says "4 string swaps across `/about`, `/pricing`". Verification found "Contact Sales" in **12 locations across 7 files** (`faq`, `help`, `home-faq`, `kibo-style-pricing`, `pricing-card-standard` too).
**How to avoid:** The CONS-06 regression test should scan all 7 files (listed in Code Examples below), not just 2.
**Warning signs:** A `CTA_FILES` array with only 2 entries.

## Code Examples

Verified file:line locations for the shipped state — the planner's task-action references.

### CONS-06 — "Contact Sales" canonical label (12 occurrences, 7 files)
```
src/app/faq/page.tsx:47                              secondaryCta label "Contact Sales"
src/app/faq/page.tsx:84                              <button> "Contact Sales"
src/app/about/page.tsx:59                            secondaryCta label "Contact Sales"
src/app/about/page.tsx:267                           <Link href="/contact">Contact Sales</Link>
src/app/pricing/pricing-content.tsx:149             "Contact Sales"
src/app/pricing/pricing-content.tsx:183             <Link href="/contact">Contact Sales</Link>
src/app/help/page.tsx:42                             secondaryCta label "Contact Sales"
src/app/help/page.tsx:112                            <ItemTitle>Contact Sales</ItemTitle>
src/app/help/page.tsx:125                            <Link href="/contact">Contact Sales</Link>
src/components/sections/home-faq.tsx:75             "Contact Sales"
src/components/pricing/kibo-style-pricing.tsx:145   "Contact Sales"
src/components/pricing/pricing-card-standard.tsx:275 "Contact Sales"
```
Killed variants — `grep "Talk to Sales|Connect with sales|Schedule a walkthrough|Schedule a demo" src/` returns **ZERO matches**. Verified clean.

### CONS-07 — `FeatureSupport` union + `FeatureIcon` `'na'` case
```typescript
// src/types/sections/compare.ts:5
export type FeatureSupport = "yes" | "no" | "partial" | "addon" | "na";
```
```typescript
// src/app/compare/[competitor]/compare-sections.tsx:6-27
function FeatureIcon({ support }: { support: FeatureSupport }) {
  switch (support) {
    case "yes":     return <Check className="size-5 text-green-600" />;
    case "no":      return <X className="size-5 text-red-400" />;
    case "partial": return <Minus className="size-5 text-amber-500" />;
    case "addon":   return <Plus className="size-5 text-blue-500" />;
    case "na":
      // CONS-07: neutral framing for "by design" feature absences.
      return (
        <Minus
          className="size-5 text-muted-foreground"
          aria-label="Not applicable"
        />
      );
  }
}
```
`compare-data.ts` — **4 rows** with `tenantflow: "na"`:
```
compare-data.ts:82-84   ACH / Payment Processing  → tenantflow:"na", note "By design — landlord-only platform"
compare-data.ts:88-89   HOA Management            → tenantflow:"na", note "Not applicable — landlord-only platform"
compare-data.ts:191-193 ACH / Payment Processing  → tenantflow:"na", note "By design — landlord-only platform"
compare-data.ts:320-322 ACH / Payment Processing  → tenantflow:"na", note "By design — landlord-only platform"
```
(3× ACH/Payment Processing across the three competitor blocks + 1× HOA Management — matches 10-CONTEXT's "3 ACH/Payment rows + 1 HOA row".)

### CONS-08 — `/contact` form "How did you hear about us?" placeholder
```tsx
// src/components/contact/contact-form-fields.tsx:155-174
<Field>
  <FieldLabel htmlFor="type">How did you hear about us?</FieldLabel>
  <Select name="referralSource" value={formData.type}
          onValueChange={(value) => onInputChange("type", value)}>
    <SelectTrigger id="type">
      <SelectValue placeholder="Please select" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="search">Google Search</SelectItem>
      <SelectItem value="social">Social Media</SelectItem>
      <SelectItem value="referral">Referral</SelectItem>
      <SelectItem value="sales">Sales Outreach</SelectItem>
      <SelectItem value="conference">Conference/Event</SelectItem>
      <SelectItem value="other">Other</SelectItem>
    </SelectContent>
  </Select>
</Field>
```
No `value` default — placeholder-only. (`ContactFormRequest.type` is typed `"sales" | "support" | "general"` in `src/types/domain.ts:45` — note the select offers 6 values but the type union has 3; pre-existing mismatch, OUT OF SCOPE for Phase 10, flag-only.)

### TRUST-01 — real testimonials (shipped via PR #695 follow-up)
```typescript
// src/data/testimonials.ts — 2 real, attributed testimonials
export const realTestimonials: Testimonial[] = [
  { quote: "Tax season used to mean a week of digging…", author: "Janet Shur", title: "Landlord", company: "8 properties" },
  { quote: "Once you hit double-digit rentals, spreadsheets stop working…", author: "Jacob Lear", title: "Landlord", company: "13 properties" },
];
```
Wired in: `src/app/marketing-home.tsx:129` (`<TestimonialsSection testimonials={realTestimonials} />`) and `src/app/pricing/page.tsx:97`.
Empty-state gate: `src/components/sections/testimonials-section.tsx:59-61` — `if (testimonials.length === 0) return null;`.
`Testimonial` type (`src/types/sections/marketing.ts:10-18`): `{ quote, author, title, company, avatar?, metric?, metricLabel? }`.

### TRUST-03 — monitored-inbox documentation
```tsx
// src/app/security-policy/page.tsx:178-203 — § 7 "Contact & Monitored Inboxes"
// security@tenantflow.app — "Acknowledged within 24 hours per § 3."
// sales@tenantflow.app   — "Responded to within 1 business day (US business hours, Monday through Friday)."
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ESLint + Prettier | Biome | `dc3365f48 chore(deps): migrate from ESLint+Prettier to Biome` | Lint/format tooling changed AFTER Phase 10 shipped. Does not affect test authoring; relevant if a plan task touches lint config. |
| `bun run test:unit -- --run <file>` (per CLAUDE.md) | `bunx vitest --run --project unit <file>` | Vitest 4 / `test:unit` script now embeds `--run` | CLAUDE.md's documented single-file command is stale — duplicate-flag crash. Use the `bunx vitest` form. |
| TRUST-01 deferred (10-CONTEXT, 2026-05-11) | TRUST-01 un-deferred — 2 real testimonials shipped | `0593fc273` + PR #695 | The defining CONTEXT-vs-reality conflict. See Open Questions Q1. |

**Deprecated/outdated:**
- 10-CONTEXT.md's TRUST-01/02 "deferred" decision — superseded for TRUST-01 by `phase-10-followup`. TRUST-02 deferral still holds.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | TRUST-04 needs no standalone regression test — it is the operational outcome of TRUST-03's `/security-policy` documentation | Phase Requirements | Low — if the planner wants a TRUST-04-specific pin, the TRUST-03 inbox-presence test already covers the only code surface |
| A2 | The two real testimonials (Janet Shur, Jacob Lear) are genuinely real and customer-approved, per the `testimonials.ts` header comment | Summary, TRUST-01 | Medium — if they are NOT real, this is a fabricated-attribution violation. The header explicitly asserts they are real landlords; the `marketing-copy-landlord-only.test.ts` banlist guard passes (100,161 tests green), but the banlist cannot verify *real vs. invented people* — only banned phrases. User confirmation of authenticity is the only true guarantee. |
| A3 | The `landing/testimonials-section.tsx` variant (used by `/features`) does NOT need a TRUST-01 test because its data source is a hardcoded empty array | Pitfall 3 | Low — it always renders `null`; a test would only confirm the empty-gate, which the `sections/` variant test already covers |

## Open Questions (RESOLVED)

1. **TRUST-01: requirement says "≥3 testimonials", reality ships 2 — and 10-CONTEXT says "deferred". Which framing does the planner adopt?**
   - What we know: `src/data/testimonials.ts` has exactly **2** real, attributed testimonials, wired to homepage + `/pricing` (shipped via PR #695 `phase-10-followup`). TRUST-01's REQUIREMENTS.md text asks for "**At least 3**". 10-CONTEXT.md (stale) says TRUST-01 is deferred.
   - What's unclear: Whether Phase 10 should (a) accept 2-of-3 as "TRUST-01 substantially satisfied, third testimonial tracked as a follow-up" and pin the 2 that exist, or (b) hold TRUST-01 open until a 3rd real customer opts in.
   - Recommendation: **Adopt framing (a).** The honesty milestone's hard rule is "no fabricated attribution" — that is satisfied (2 real testimonials, banlist-guarded). Fabricating a 3rd to hit the literal "≥3" would violate the milestone's core value. Pin the 2 real testimonials with a test that asserts `realTestimonials.length >= 2` AND every entry has non-empty `quote`/`author`/`company` AND no `metric` field (per the file's own guardrail). Record "3rd testimonial pending next opt-in customer" as a deferred item. The planner should surface this to the user during `/gsd-plan-phase` since it reverses a CONTEXT decision.

2. **Should the CONS-06 regression test live as a new file or extend `marketing-copy-landlord-only.test.ts`?**
   - What we know: `marketing-copy-landlord-only.test.ts` already walks a `MARKETING_FILES` list with banned-phrase assertions; it does NOT assert *required-presence* or scan for the specific killed CTA variants.
   - What's unclear: Project preference for one mega-banlist vs. per-finding files.
   - Recommendation: New file `src/app/__tests__/cta-label-canonical.test.ts` — mirrors Phase 9's one-test-per-finding layout and keeps the assertion intent legible. Low-stakes; planner's discretion.

## Environment Availability

Phase 10 is a test-authoring phase on already-shipped code — no external services. Test toolchain confirmed available:

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `vitest` (`unit` project) | All regression tests | ✓ | 4.1.6 | — |
| `@testing-library/react` | CONS-07/08, TRUST-01 render tests | ✓ | installed | — |
| `jsdom` | jsdom-environment tests | ✓ | installed (per `vitest.config.ts`) | — |
| `bun` | Test runner invocation | ✓ | 1.3.x (per CLAUDE.md) | — |

**Missing dependencies:** None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.6 (`unit` project — jsdom, threads pool, globals) |
| Config file | `vitest.config.ts` (`projects[]`: `unit` / `component` / `integration`) |
| Quick run command | `bunx vitest --run --project unit <file>` (single file — verified working) |
| Full suite command | `bun run test:unit` (= `vitest --run --project unit`) |

> Note: `bun run test:unit -- --run <file>` from CLAUDE.md crashes (duplicate `--run`). Use the `bunx vitest` form for single files.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONS-06 | Canonical "Contact Sales" present in 7 files; 4 killed variants absent everywhere | unit (readFileSync scan) | `bunx vitest --run --project unit src/app/__tests__/cta-label-canonical.test.ts` | ❌ Wave 0 |
| CONS-07 | `FeatureSupport` includes `"na"`; `FeatureIcon` `'na'` → `Minus` + `text-muted-foreground` + `aria-label`; `compare-data.ts` has 4 `'na'` rows | unit (render + scan) | `bunx vitest --run --project unit src/app/compare/[competitor]/__tests__/compare-neutral-framing.test.tsx` | ❌ Wave 0 |
| CONS-08 | `/contact` "How did you hear" select renders placeholder "Please select", no default value | unit (render) | `bunx vitest --run --project unit src/components/contact/__tests__/contact-form-fields.test.tsx` | ❌ Wave 0 |
| TRUST-01 | `realTestimonials` has ≥2 real entries, each with non-empty quote/author/company, no `metric`; `TestimonialsSection` returns `null` on empty, renders quotes on data | unit (render + data shape) | `bunx vitest --run --project unit src/data/__tests__/testimonials.test.ts` | ❌ Wave 0 |
| TRUST-02 | DEFERRED — no review badges exist | — (none) | — | n/a — documentation only |
| TRUST-03 | `/security-policy` § 7 documents `sales@` + `security@` with SLA copy | unit (readFileSync scan) | `bunx vitest --run --project unit src/app/security-policy/__tests__/monitored-inboxes.test.ts` | ❌ Wave 0 |
| TRUST-04 | Auto-derived from TRUST-03 — covered by the TRUST-03 inbox-presence test | unit | (same as TRUST-03) | covered by TRUST-03 |

### Sampling Rate
- **Per task commit:** `bunx vitest --run --project unit <the-test-file-for-that-task>`
- **Per wave merge:** `bun run test:unit` (full unit project)
- **Phase gate:** `bun run validate:quick` (typecheck + lint + full unit suite) green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/app/__tests__/cta-label-canonical.test.ts` — covers CONS-06
- [ ] `src/app/compare/[competitor]/__tests__/compare-neutral-framing.test.tsx` — covers CONS-07
- [ ] `src/components/contact/__tests__/contact-form-fields.test.tsx` — covers CONS-08
- [ ] `src/data/__tests__/testimonials.test.ts` — covers TRUST-01
- [ ] `src/app/security-policy/__tests__/monitored-inboxes.test.ts` — covers TRUST-03/04
- Framework install: not needed — Vitest 4 + `@testing-library/react` + jsdom already configured.
- Shared fixtures: not needed — copy the `vi.mock("next/link", ...)` stub from `src/components/compare/__tests__/compare-breadcrumb.test.tsx` into render-test files as needed.

*TRUST-02 needs no test — it is a documented deferral with no code surface.*

## Project Constraints (from CLAUDE.md)

The planner must verify plan tasks comply with these directives:

- **No `any` types** — test mocks use `unknown` + type guards, or precise inline types (see the `next/link` mock pattern).
- **No barrel files / re-exports** — import directly from defining files; `#components/...`, `#types/...` subpath aliases only.
- **No duplicate types** — `Testimonial`, `FeatureSupport`, `ContactFormRequest`, `CompetitorData` all already exist in `src/types/` — reuse, never redefine.
- **No emojis in code** — Lucide icons only (the `'na'` variant already uses `Minus` from `lucide-react`).
- **No inline styles / `bg-white` / hex / rgb / inline-ms** — cross-cutting hard rule; a PR introducing any fails the perfect-PR gate. Tests assert against className tokens.
- **Vitest 4 + chai 6 bug** — use `.rejects.toMatchObject({ message: expect.stringContaining(...) })`, never `.rejects.toThrow('string')`.
- **`vi.hoisted()`** for any mock variable referenced inside `vi.mock()`.
- **Max 300 lines/file, 50 lines/function** — keep new test files within budget (they will be small).
- **Perfect-PR merge gate** — two consecutive zero-finding review cycles. Plan for a fix cycle.
- **Git workflow** — feature branch `gsd/phase-10-cta-conversion` (already checked out) → push → `gh pr create`. Never push to `main`.

**Out-of-scope token-drift flag (do NOT fix in Phase 10):** `FeatureIcon` in `compare-sections.tsx` uses non-canonical Tailwind palette colors for the `yes`/`no`/`partial`/`addon` cases (`text-green-600`, `text-red-400`, `text-amber-500`, `text-blue-500`) — these are NOT `globals.css` tokens. The CONS-07 `'na'` case correctly uses `text-muted-foreground`. The other four are pre-existing drift owned by **Phase 11 (token-alignment)** / TOKEN-03. Phase 10 should not touch them; a CONS-07 test that asserts the `'na'` case's `text-muted-foreground` is correct and in-scope.

## Sources

### Primary (HIGH confidence)
- Codebase verification (this session) — `grep`/`Read` of every file named in 10-CONTEXT.md: `compare.ts`, `compare-sections.tsx`, `compare-data.ts`, `contact-form-fields.tsx`, `testimonials-section.tsx` (both variants), `security-policy/page.tsx`, `src/data/testimonials.ts`, `marketing-home.tsx`, `pricing/page.tsx`, `marketing-copy-landlord-only.test.ts`, `vitest.config.ts`, `package.json`, `src/types/domain.ts`, `src/types/sections/marketing.ts`.
- `git log` — Phase 10 commit history: `ad7c38ab2` (PR #694), `f81f9a7a5` / `0593fc273` / `d27bc7803` (PR #695 follow-up), `dc3365f48` (Biome migration). `git branch -a --contains ad7c38ab2` confirms both on `main` + current branch.
- Live test run — `bunx vitest --run --project unit src/app/__tests__/marketing-copy-landlord-only.test.ts` → 100,161 tests passed, Vitest 4.1.6.

### Secondary (MEDIUM confidence)
- `.planning/phases/09-page-cleanup/09-RESEARCH.md` — Phase 9 mirror pattern for an already-shipped audit-fix phase converted to a test-pinning phase.
- `.planning/REQUIREMENTS.md` — canonical requirement text for CONS-06..08, TRUST-01..04.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Shipped-state of CONS-06/07/08/TRUST-03 — HIGH — every file read this session matches the corrected state; killed-variant grep returns zero.
- TRUST-01 shipped state — HIGH on "2 real testimonials shipped and wired"; MEDIUM on "the 2 testimonials are genuinely real" (A2 — only the file header asserts it; banlist cannot verify real-vs-invented people).
- Test infrastructure — HIGH — Vitest 4.1.6 confirmed via live run; mirror patterns located and read.
- Requirement-vs-CONTEXT conflict — HIGH that the conflict exists; the resolution (Q1) is a planner/user decision.

**Research date:** 2026-05-20
**Valid until:** 2026-06-19 (30 days — stable brownfield code; the only volatility is whether a 3rd real testimonial arrives, which would resolve Q1).
