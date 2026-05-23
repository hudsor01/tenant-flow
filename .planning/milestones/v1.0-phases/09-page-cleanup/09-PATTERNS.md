# Phase 9: Page-Level Cleanup - Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 2 new test files
**Analogs found:** 2 / 2

## Phase Nature

Per 09-RESEARCH.md, all three production fixes (CONS-04/13/14) already shipped via PR #693
(`947299f19`, 2026-05-11). This phase is **verify-and-pin only**. The single deliverable is two
NEW regression-pin test files. No production source edits. CONS-04 already has its drift guard
(`src/app/sitemap.test.ts`).

Both new test files are **unit** test files (`.test.tsx` / `.test.ts`). The `unit` Vitest project
(`vitest.config.ts` line 49-57) matches `src/**/*.{test,spec}.{ts,tsx}` under jsdom. The `component`
project (line 96-104) only matches `*.component.test.{ts,tsx}` — so both new files run via
`bun run test:unit`, NOT `test:component`. (09-RESEARCH.md's "component project" / `test:component`
note is inaccurate — disregard it; use `test:unit`.)

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/components/sections/__tests__/logo-cloud.test.tsx` | test (component-render) | transform (props -> DOM) | `src/components/sections/__tests__/features-section.test.tsx` | exact (same dir, same kind: sections-component regression pin) |
| `src/app/__tests__/marketing-home.test.tsx` | test (source-text assertion) | file-I/O (readFileSync) | `src/app/__tests__/marketing-copy-landlord-only.test.ts` | role-match (same dir, same `readFileSync` source-scan pattern) |

**Why source-text for `marketing-home.test.tsx`:** `src/app/marketing-home.tsx` is a `'use client'`
component importing 8 section components (`HeroDashboardMockup`, `HowItWorks`, `FeaturesSectionDemo`,
`StatsShowcase`, `TestimonialsSection`, `HomeFaq`, `PremiumCta`, `LogoCloud`) plus `PageLayout` and
`LazySection`. Rendering it fully would require mocking that entire tree. The CONS-14 assertion
("homepage does NOT render `ComparisonTable`") is an absence check — a `readFileSync` source-text
scan pins it without any render. This matches the `marketing-copy-landlord-only.test.ts` analog's
approach exactly. The file is named `.test.tsx` for directory consistency even though it does no
JSX rendering; `.test.ts` is equally valid (the analog uses `.ts`).

## Pattern Assignments

### `src/components/sections/__tests__/logo-cloud.test.tsx` (test, component-render)

**Analog:** `src/components/sections/__tests__/features-section.test.tsx`

**Doc-comment header pattern** (analog lines 1-9) — every Phase 7-8 regression pin opens with a
JSDoc block stating the audit ID, that the fix already shipped, and what the test locks:
```tsx
/**
 * FeaturesSectionDemo component test — Phase 8 CONS-02 regression pin.
 *
 * CONS-02's icon fix shipped in source already (commit 7540ebe48); this test
 * locks the Multi-Property Dashboard card's LayoutDashboard icon so a future
 * edit can't silently revert it to a wrong icon (the audit flagged a back-arrow).
 *
 * @vitest-environment jsdom
 */
```
For the new file: state "CONS-13 regression pin", reference PR #693 / `e86a82709`, and explain it
locks the absence of `grayscale` and the shared single opacity class across all 5 logos.

**Imports pattern** (analog lines 11-14):
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import FeaturesSectionDemo from "#components/sections/features-section";
```
`logo-cloud.tsx` exports BOTH `export function LogoCloud` (named, line 14) AND `export default
LogoCloud` (line 239). Prefer the named import — `import { LogoCloud } from "../logo-cloud"` or
`from "#components/sections/logo-cloud"`. The `home-faq.test.tsx` analog uses relative
`from "../home-faq"`; `features-section.test.tsx` uses the `#components/...` alias. Either is fine —
match `features-section.test.tsx` (the named alias) since it is the exact-kind analog.

**Render + container-query pattern** (analog lines 17-27) — use `render()` destructuring `container`,
then query the DOM via `container.querySelector`/`querySelectorAll`:
```tsx
it("...", () => {
  const { container } = render(<FeaturesSectionDemo />);
  // assertions via container.querySelector(...)
});
```

**Positive + negative pin pair** (analog lines 17-39) — the convention is ONE positive structural
assertion and ONE negative symptom assertion targeting the exact audited regression:
```tsx
it("...renders the LayoutDashboard icon (CONS-02)", () => { /* positive */ });
it("...does NOT render an arrow-left icon (CONS-02)", () => { /* negative symptom pin */ });
```

**Coverage/headline pin** (analog lines 41-53) — a third `it()` that renders and asserts every
expected item is present via `screen.getByRole`/`getByText`:
```tsx
it("renders all six feature cards (coverage + headline pin)", () => {
  render(<FeaturesSectionDemo />);
  for (const title of ["Property Management", "Fast Setup", /* ... */]) {
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
  }
});
```

**Count-via-querySelectorAll pattern** (from `bento-pricing-section.test.tsx` lines 51-54) — when
pinning "exactly N elements share class X", `querySelectorAll` a class selector and assert length:
```tsx
const wrappers = container.querySelectorAll("p.text-success.font-semibold");
expect(wrappers).toHaveLength(3);
```

### Source-under-test facts — `src/components/sections/logo-cloud.tsx` (pin these exactly)

- 5 integrations in the `integrations` array (lines 19-50), `.map()`ed at line 64. Order and
  `description` strings: `Stripe`/"Payments", `Supabase`/"Database", `Vercel`/"Hosting",
  `DocuSeal`/"E-Signatures", `Resend`/"Email". The `description` text (NOT `name`) is what renders
  in the `<span>` at line 79-81. The component renders `integration.description`, not
  `integration.name` — assert on the description strings.
- **The CONS-13 wrapper class** — line 71-76, the per-logo wrapper `<div>`:
  ```tsx
  <div
    className={cn(
      "h-8 flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity duration-300",
      integration.width,
    )}
  >
    <integration.logo className="h-full w-full" />
  </div>
  ```
  This class is IDENTICAL for every logo (the only per-logo difference is `integration.width`,
  one of `w-20`/`w-24`/`w-28`, which is horizontal sizing, NOT an opacity differentiator).
- **CONS-13 regression to pin against:** the pre-fix bug was a per/global wrapper class
  `grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all`. The pins:
  - `container.innerHTML` (or each wrapper's `className`) contains NO `grayscale`.
  - Exactly 5 wrappers carry the `opacity-90` class:
    `container.querySelectorAll(".opacity-90")` has length 5.
  - No wrapper carries `opacity-80` (the old faded value).
- `BlurFade` (imported from `#components/ui/blur-fade`, line 1) wraps the section and each logo.
  It renders its children in jsdom (motion components render their children synchronously) — no
  mock needed. If a render issue appears, mock `#components/ui/blur-fade` to a passthrough
  `({ children }) => children`, but try without a mock first.
- The 5 `*Logo`/`*Wordmark` SVG components are local functions in the same file (lines 93-237) —
  no external assets, no `next/image`, nothing to mock.
- Default props supply the visible heading text: `title="Trusted integrations"`,
  `subtitle="Connect to the tools your portfolio already runs on"` (lines 16-17).

---

### `src/app/__tests__/marketing-home.test.tsx` (test, source-text assertion)

**Analog:** `src/app/__tests__/marketing-copy-landlord-only.test.ts`

**Doc-comment header pattern** (analog lines 1-13) — same JSDoc convention; state the requirement
ID (CONS-14), that the de-dup already shipped (PR #693), and what the test pins.

**`readFileSync` source-scan pattern** (analog lines 14-16) — Node FS imports, no render:
```ts
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
```
The analog uses `readdirSync` + `join` + `relative` because it walks a directory tree. The new
file targets only TWO specific files, so it needs just `readFileSync` and `resolve` (or `join`):
```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
```

**Path resolution:** the test file lives at `src/app/__tests__/marketing-home.test.tsx`. The
targets are `src/app/marketing-home.tsx` (one dir up) and `src/app/features/features-client.tsx`.
Resolve relative to `__dirname` of the test file:
```ts
const homeSrc = readFileSync(resolve(__dirname, "..", "marketing-home.tsx"), "utf8");
const featuresSrc = readFileSync(resolve(__dirname, "..", "features", "features-client.tsx"), "utf8");
```
(09-RESEARCH.md's example `resolve(__dirname, "marketing-home.tsx")` omits the `".."` — the test
sits in `__tests__/`, the source sits one level up in `src/app/`. Use `".."`.)

**Two-assertion pin** (CONS-14): one negative (homepage) + one positive (features):
```ts
it("homepage does NOT import or render ComparisonTable (CONS-14)", () => {
  expect(homeSrc).not.toMatch(/<ComparisonTable\s*\/?>/);
  expect(homeSrc).not.toMatch(/import\s*\{[^}]*\bComparisonTable\b[^}]*\}/);
});

it("/features still renders ComparisonTable (CONS-14)", () => {
  expect(featuresSrc).toMatch(/<ComparisonTable\s*\/?>/);
});
```

### Source-under-test facts — `src/app/marketing-home.tsx` + `features-client.tsx` (pin these)

- `src/app/marketing-home.tsx` — `'use client'`. Does NOT import `ComparisonTable` (verified:
  imports at lines 3-18 cover `FeaturesSectionDemo`, `HeroDashboardMockup`, `HomeFaq`, `HowItWorks`,
  `LogoCloud`, `PremiumCta`, `StatsShowcase`, `TestimonialsSection` — no `ComparisonTable`). The
  removal site carries a CONS-14 comment marker at **lines 119-121**:
  ```tsx
  {/* CONS-14: "Why Landlords Choose TenantFlow" ComparisonTable
      removed from homepage to de-duplicate with /features (which is
      its natural home). Kept on /features only. */}
  ```
  The `marketing-home.test.tsx` MAY also positively pin this comment marker's presence
  (`expect(homeSrc).toMatch(/CONS-14/)`) so a future edit that deletes the comment AND re-adds the
  table is still caught — the comment is the intentional placeholder, not dead code.
- `src/app/features/features-client.tsx` — `'use client'`. Line 14 `import { ComparisonTable }
  from "#components/sections/comparison-table";`. Line 70 renders `<ComparisonTable />` inside a
  `<LazySection fallback={<SectionSkeleton height={600} variant="grid" />} minHeight={600}>`.
  Exactly one render site. This is the canonical/kept instance.
- `grep "ComparisonTable"` across `src/app/` + `src/components/` returns only the import + render
  in `features-client.tsx`. `PricingComparisonTable` in `src/components/pricing/` is a DIFFERENT
  component (pricing-tier table) — the test regex `\bComparisonTable\b` with a word boundary, or
  `<ComparisonTable\s*\/?>`, must NOT false-match `PricingComparisonTable`. Use `\b` word
  boundaries or the explicit `<ComparisonTable` tag form.

## Shared Patterns

### Regression-pin test conventions (Phases 4/7/8)
**Source:** `src/components/sections/__tests__/features-section.test.tsx`,
`src/components/sections/__tests__/home-faq.test.tsx`,
`src/components/pricing/__tests__/bento-pricing-section.test.tsx`
**Apply to:** Both new test files
- Open with a JSDoc block: audit/requirement ID + "fix already shipped in <commit/PR>" + what the
  test locks against silent regression.
- One `describe()` per component/concern; named after the unit under test.
- Test names embed the requirement ID in parentheses, e.g. `"(CONS-13)"`, `"(CONS-14)"`.
- Pair a positive structural assertion with a negative symptom assertion that targets the EXACT
  audited regression (the `features-section.test.tsx` lines 29-39 comment articulates this:
  "Symptom pin, not a generic guard").
- `@vitest-environment jsdom` in the JSDoc is optional for `logo-cloud.test.tsx` — the `unit`
  project already defaults to jsdom (`vitest.config.ts` line 50). `features-section.test.tsx`
  includes it for explicitness; `home-faq.test.tsx` omits it. Either is acceptable; including it
  is the more recent convention. The `marketing-home` source-text test does no DOM work, so it
  does not need it.

### Component-render assertion toolkit
**Source:** `src/components/sections/__tests__/features-section.test.tsx` +
`src/components/pricing/__tests__/bento-pricing-section.test.tsx`
**Apply to:** `logo-cloud.test.tsx`
- `import { render, screen } from "@testing-library/react"` + `import { describe, expect, it }
  from "vitest"` — both already project dependencies; no install needed.
- `const { container } = render(<Component />)` then `container.querySelector(...)` /
  `querySelectorAll(...)` for class-based structural pins.
- `screen.getByRole("heading", { name })` / `screen.getByText(...)` for visible-text coverage pins.
- `expect(...).toHaveLength(N)` for "exactly N elements" counts.
- jsdom matchers (`toBeInTheDocument`) are available — `src/types/jest-dom.d.ts` shim is already
  wired (per CLAUDE.md "Vitest 4.x + chai 6.x" note).

### Source-text scan
**Source:** `src/app/__tests__/marketing-copy-landlord-only.test.ts`
**Apply to:** `marketing-home.test.tsx`
- `readFileSync(path, "utf8")` + regex `.toMatch` / `.not.toMatch`. No render, no mocks.
- Resolve target paths relative to the test's `__dirname`.

### Run command
**Source:** `vitest.config.ts` projects + CLAUDE.md Key Commands
**Apply to:** Both new files
- Both files match the `unit` project glob (`src/**/*.{test,spec}.{ts,tsx}`). Run with:
  `bun run test:unit -- --run src/components/sections/__tests__/logo-cloud.test.tsx`
  `bun run test:unit -- --run src/app/__tests__/marketing-home.test.tsx`
- Do NOT use `bun run test:component` — that project only matches `*.component.test.{ts,tsx}`.

## CLAUDE.md Constraints Relevant to These Tests

- No `any` types — these tests need none; render results and FS strings are fully typed.
- No `as unknown as` — none needed. (`features-section.test.tsx` and `bento-pricing-section.test.tsx`
  use plain `querySelector` results without casts.) 09-RESEARCH.md notes a prior PR cycle caught an
  `as unknown as` violation in a test mock — keep mocks typed.
- Coverage threshold 80% (lefthook pre-commit) — these two test files ADD coverage; no risk.
- `.rejects.toThrow('string')` is banned (chai 6 bug) — not applicable; no rejection assertions here.
- File naming kebab-case — `logo-cloud.test.tsx`, `marketing-home.test.tsx` both comply.

## No Analog Found

None. Both new files have a direct in-repo analog (rows in File Classification above).

## Metadata

**Analog search scope:** `src/components/sections/__tests__/`, `src/components/pricing/__tests__/`,
`src/app/__tests__/`, `vitest.config.ts`
**Files scanned:** `logo-cloud.tsx`, `marketing-home.tsx`, `features-client.tsx`,
`features-section.test.tsx`, `home-faq.test.tsx`, `bento-pricing-section.test.tsx`,
`marketing-copy-landlord-only.test.ts`, `vitest.config.ts`, `09-CONTEXT.md`, `09-RESEARCH.md`,
`CLAUDE.md`
**Pattern extraction date:** 2026-05-20
