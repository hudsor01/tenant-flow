# Phase 9: Page-Level Cleanup - Research

**Researched:** 2026-05-20
**Domain:** Brownfield audit-fix — Next.js 16 marketing/legal pages, design-token alignment, regression-test pinning
**Confidence:** HIGH

## Summary

Phase 9 closes three v1.0 "Marketing Surface Honesty" audit findings: CONS-04 (legal-page `Last Updated` dates), CONS-13 (faded Supabase logo in the Trusted Integrations row), CONS-14 (duplicate "Why Landlords Choose TenantFlow" comparison table). All three are page-level production-code fixes, not test-only work.

**The decisive finding: all three fixes are ALREADY SHIPPED to `main`.** Git history shows `feat(phase-09): page-level cleanup (CONS-04/13/14)` was implemented on 2026-05-11 (commits `e86a82709`, `df9c12c34`) and merged via **PR #693** (`947299f19`). The current branch `gsd/phase-09-page-cleanup` sits one docs-only commit ahead of `main` (`34a81c08e docs(09): gather phase context`). Every code touchpoint named in 09-CONTEXT.md already reflects the corrected state on `main` — verified by reading each file in this session. This phase is being **re-planned/re-run on already-completed work.**

**Primary recommendation:** The planner must treat this as a verification-and-hardening phase, not an implementation phase. The three production fixes are done. The remaining genuine gap is **test coverage**: the CONS-04 sitemap drift-guard is the only regression pin that exists. CONS-13 (logo-cloud.tsx) and CONS-14 (comparison-table de-dup) have **zero regression tests**. The plan should either (a) confirm the shipped state and add the two missing regression tests, or (b) escalate to the orchestrator that Phase 9's requirements are already satisfied on `main` and only test-pinning remains.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Legal-page `Last Updated` date display | Frontend Server (RSC) | — | `terms/privacy/security-policy/page.tsx` are server components; date is a literal string in JSX |
| Sitemap `lastmod` emission | Frontend Server (RSC) | — | `sitemap.ts` is a Next.js metadata route; `lastModified` derives from module-level constants |
| Date↔sitemap drift guard | Test tier (Vitest) | — | `sitemap.test.ts` `readFileSync`s page bodies and asserts against emitted `lastModified` |
| Trusted Integrations logo render | Browser/Client | — | `logo-cloud.tsx` renders inline SVG; visual weight is pure CSS (`opacity` utility classes) |
| Comparison table render | Browser/Client | Frontend Server | `comparison-table.tsx` is rendered inside a `'use client'` page (`features-client.tsx`) wrapped in `LazySection` |

## User Constraints (from CONTEXT.md)

### Locked Decisions

**CONS-04 — legal-page Last Updated dates**
- **D-01:** Each of the three legal pages' `Last Updated:` value must reflect the actual most-recent revision date of that page's content. No future dates; no stale Oct-2025 placeholder.
- **D-02:** A sitemap drift-guard test already couples legal-page dates to `src/app/sitemap.ts` constants (it `readFileSync`s the page bodies and asserts the date matches the sitemap constant). Any date change MUST update both the page body AND the corresponding `sitemap.ts` constant in lockstep so the drift-guard test stays green. Researcher must locate the exact constants and current values.
- **D-03 (Claude's discretion):** If a page's content has not genuinely changed, the honest date is its last real content revision (from `git log` on that file) — not "today." Prefer the true git-history revision date over a fresh stamp.

**CONS-13 — Trusted Integrations logo weight**
- **D-04:** In `logo-cloud.tsx`, the Supabase logo renders faded relative to the other 4. Bring all 5 to consistent visual weight. Root-cause the fade (likely a per-logo opacity/grayscale class, a missing dark-mode variant, or an asset issue) and fix so all 5 match.

**CONS-14 — duplicate "Why Landlords Choose" table**
- **D-05:** Keep the comparison table on **`/features`** only; remove it from the homepage (`marketing-home.tsx`). Rationale: deep feature/competitor comparison belongs on the features page; the homepage stays lean and scannable.
- **D-06 (Claude's discretion):** If research finds the two instances are already meaningfully differentiated, flag it — keeping both differentiated instances is the ROADMAP's allowed alternative. Default is remove-from-homepage.

### Claude's Discretion
- Exact honest dates per legal page (from git history).
- The precise CSS/asset fix for the faded Supabase logo.
- Whether to remove vs differentiate the duplicate table (default: remove from homepage).

### Deferred Ideas (OUT OF SCOPE)
None — phase scope is the 3 audit findings only.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONS-04 | Legal-page "Last Updated" dates standardized — Security Policy, Terms, Privacy must agree on most-recent revision date OR each reflects its actual last revision (no future dates, no Oct-2025 stale entries) | **Already shipped.** All three pages show `Last Updated: May 11, 2026`; all three sitemap constants are `"2026-05-11"`; drift-guard test passes (see CONS-04 Findings) |
| CONS-13 | Trusted Integrations row renders all 5 logos at consistent visual weight — fix faded Supabase logo | **Already shipped.** The per-logo `grayscale opacity-80` class was replaced with `opacity-90` for all 5 logos (see CONS-13 Findings). No regression test exists |
| CONS-14 | Duplicate "Why Landlords Choose TenantFlow" comparison table de-duplicated | **Already shipped.** `ComparisonTable` removed from `marketing-home.tsx` (replaced with a CONS-14 comment block); retained on `/features` via `features-client.tsx`. No regression test exists |

## Standard Stack

No new libraries. This phase touches existing surfaces only.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16 | RSC pages + `sitemap.ts` metadata route | Project framework |
| React | 19 | Component rendering | Project framework |
| TailwindCSS | 4 | All visual styling (opacity utilities, tokens) | Project framework; CLAUDE.md mandates token-only styling |
| Vitest | 4 + jsdom | Unit + component tests | Project test runner |

**Installation:** None — no new dependencies.

## Architecture Patterns

### System Architecture Diagram

```
                    CONS-04 data flow (legal-page dates)
  ┌─────────────────────────┐         ┌──────────────────────────┐
  │  Legal page .tsx body   │         │   sitemap.ts module      │
  │  "Last Updated: May 11, │◄───────►│   TERMS_LAST_UPDATED     │
  │   2026" (literal JSX)   │ lockstep│   PRIVACY_LAST_UPDATED   │
  │  terms / privacy /      │  must   │   SECURITY_POLICY_..._    │
  │  security-policy        │  match  │   = "2026-05-11"         │
  └────────────┬────────────┘         └─────────────┬────────────┘
               │                                    │
               │            ┌───────────────────────┘
               ▼            ▼
     ┌──────────────────────────────────────┐
     │  sitemap.test.ts drift-guard describe │
     │  readFileSync(page.tsx) → regex date  │
     │  → assert === emitted lastModified    │  ← FAILS if either side drifts
     └──────────────────────────────────────┘

           CONS-13                          CONS-14
  ┌────────────────────────┐    ┌───────────────────────────────┐
  │  logo-cloud.tsx        │    │  ComparisonTable component     │
  │  integrations[].map →  │    │                                │
  │  <div className=       │    │  marketing-home.tsx ──X removed │
  │   "opacity-90          │    │  (CONS-14 comment in its place) │
  │    hover:opacity-100"> │    │                                │
  │  ALL 5 logos identical │    │  features-client.tsx ──✓ kept   │
  │  styling — no per-logo │    │  (inside <LazySection>)         │
  │  override              │    │                                │
  └────────────────────────┘    └───────────────────────────────┘
```

### Component Responsibilities

| File | Responsibility | Current State on `main` |
|------|----------------|-------------------------|
| `src/app/terms/page.tsx` | Terms of Service RSC page | `Last Updated: May 11, 2026` at line 20 and line 524; `Effective Date: October 5, 2025` at line 527 |
| `src/app/privacy/page.tsx` | Privacy Policy RSC page | `Last Updated: May 11, 2026` at line 20; `effective as of October 5, 2025` at line 467 |
| `src/app/security-policy/page.tsx` | Security Policy RSC page | `Last Updated: May 11, 2026` at line 20 |
| `src/app/sitemap.ts` | Sitemap metadata route | 3 legal constants all `"2026-05-11"` (lines 19-21) |
| `src/app/sitemap.test.ts` | Sitemap tests + drift guard | Test 4b + 3-test drift-guard describe (lines 189-205, 297-352) |
| `src/components/sections/logo-cloud.tsx` | Trusted Integrations row | Single shared `opacity-90 hover:opacity-100` class for all 5 (line 73) |
| `src/app/marketing-home.tsx` | Homepage composition | `ComparisonTable` removed; CONS-14 comment at lines 119-121 |
| `src/app/features/features-client.tsx` | `/features` page body | `ComparisonTable` rendered at line 70 inside `<LazySection>` |

### Pattern 1: Legal-date lockstep (CONS-04)
**What:** The visible `Last Updated` string in a legal page body and the matching `sitemap.ts` constant are two copies of the same fact. Google degrades sitemap trust when `lastmod` disagrees with the rendered page.
**When to use:** Any time a legal page's content is revised.
**Example:**
```typescript
// src/app/sitemap.ts lines 19-21 — current shipped state
const TERMS_LAST_UPDATED = "2026-05-11";
const PRIVACY_LAST_UPDATED = "2026-05-11";
const SECURITY_POLICY_LAST_UPDATED = "2026-05-11";
```
```tsx
// src/app/terms/page.tsx line 20 — visible body string
<p className="mb-6 text-muted-foreground">Last Updated: May 11, 2026</p>
```
The drift guard (`sitemap.test.ts` lines 297-352) `readFileSync`s the page, regex-extracts `Last Updated: <Month D, YYYY>`, converts to ISO via `new Date(...).toISOString().slice(0,10)`, and asserts equality with the emitted `lastModified`.

### Pattern 2: Shared-class logo styling (CONS-13)
**What:** All logos in `logo-cloud.tsx` get one identical wrapper className; no per-logo opacity/grayscale override. Visual weight is governed solely by the inline-SVG `fill` value.
**Example:**
```tsx
// src/components/sections/logo-cloud.tsx lines 71-78 — current shipped state
<div
  className={cn(
    "h-8 flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity duration-300",
    integration.width,
  )}
>
  <integration.logo className="h-full w-full" />
</div>
```

### Anti-Patterns to Avoid
- **Re-introducing `grayscale`/`opacity-80` per-logo classes** — the original CONS-13 bug was a global `grayscale opacity-80 hover:grayscale-0 hover:opacity-100` class. Do not regress it.
- **`new Date("May 11, 2026")` timezone trap** — the drift-guard `readVisibleDate` helper uses `toISOString().slice(0,10)` (UTC). A longform date string like `"May 11, 2026"` parses to UTC midnight, so the slice is stable. Do NOT switch the page body to an ISO-with-time string or a numeric-only format — the regex `/Last Updated:?\s*(?<date>[A-Z][a-z]+ \d{1,2}, \d{4})/` requires the `Month D, YYYY` longform.
- **Stamping "today" on unchanged content (D-03 violation)** — if a legal page's content has not changed, do not bump its date to a fresh stamp.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keeping page date ↔ sitemap constant in sync | A manual checklist | The existing `sitemap.test.ts` drift-guard describe | Already built; `readFileSync` + regex guarantees the two never silently diverge |
| Logo opacity consistency | Per-logo conditional class logic | One shared className on the `.map()` wrapper | All logos identical = impossible to have one faded |

**Key insight:** Every mechanism this phase needs already exists. The drift guard is the canonical safety net for CONS-04. No custom tooling required.

## Runtime State Inventory

Phase 9 is a pure code/content edit phase. No databases, services, OS state, secrets, or build artifacts embed any string this phase touches.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — verified by inspecting all 5 named files. Legal dates are literal JSX strings; logo styling is CSS classes; comparison table is a component import. No DB rows involved. | None |
| Live service config | None — `sitemap.ts` is statically generated (ISR `revalidate = 86400`); no external service stores the legal dates | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | None — Next.js rebuilds `sitemap.xml` and all pages on deploy from source; no stale artifact carries the old dates | None |

## CONS-04 Findings — Legal-page Last Updated dates

### Current state (all three pages, on `main`)

| Page | Visible `Last Updated` value | Rendered as | Line(s) | Effective Date (separate field) |
|------|------------------------------|-------------|---------|----------------------------------|
| `src/app/terms/page.tsx` | `May 11, 2026` | Literal string in JSX `<p>` | line 20 (`Last Updated: May 11, 2026`) AND line 524 (`<strong>Last Updated:</strong> May 11, 2026`) | `October 5, 2025` (line 527) |
| `src/app/privacy/page.tsx` | `May 11, 2026` | Literal string in JSX `<p>` | line 20 | `effective as of October 5, 2025` (line 467) |
| `src/app/security-policy/page.tsx` | `May 11, 2026` | Literal string in JSX `<p>` | line 20 | None — no effective-date line |

**Note:** `terms/page.tsx` has the `Last Updated` string in TWO places (header line 20 and footer line 524). Both currently read `May 11, 2026`. A future date change must update both, or the drift-guard regex (which matches the first occurrence) and the visible footer will disagree.

### True content-revision dates (from `git log --follow`)

| Page | Most-recent genuine *content* revision | Notes |
|------|----------------------------------------|-------|
| `terms/page.tsx` | `2026-05-11` (`feat(phase-09): page-level cleanup`) | Commits after that (`2026-05-15` Biome migration, `2026-05-16` p3 polish) are tooling/lint-only, not content. `2026-05-11` is the honest content date |
| `privacy/page.tsx` | `2026-05-11` (phase-09) — though `2026-05-10` had a real content edit (`fix(phase-04): cycle-3 — privacy page persona drift`) | The phase-09 commit re-stamped it; `2026-05-15` is Biome-only |
| `security-policy/page.tsx` | `2026-05-11` (phase-09 + phase-10 `feat(phase-10): cta + conversion`) | `2026-05-11` is honest — the content was touched that day. `2026-05-15` Biome-only |

**Conclusion:** `May 11, 2026` is the honest, defensible date for all three. It is not a future date (today is 2026-05-20), not a stale Oct-2025 placeholder, and corresponds to a real content-touching commit on each file. **CONS-04 is satisfied as shipped.** No date change is needed; therefore no sitemap-constant change is needed.

### The drift-guard mechanism (D-02)

**Sitemap constants** — `src/app/sitemap.ts` lines 19-21:
```typescript
const TERMS_LAST_UPDATED = "2026-05-11";
const PRIVACY_LAST_UPDATED = "2026-05-11";
const SECURITY_POLICY_LAST_UPDATED = "2026-05-11";
```
These feed the `legalPages` array (lines 129-145) as each entry's `lastModified`.

**Drift-guard test** — `src/app/sitemap.test.ts`:
- **`describe("sitemap legal-page lastmod drift guard")`** (lines 297-352): three `it()` tests. Each `readFileSync`s the page `.tsx` via a `readVisibleDate(relPath)` helper, regex-extracts the date with `/Last Updated:?\s*(?<date>[A-Z][a-z]+ \d{1,2}, \d{4})/`, converts `"May 11, 2026"` → `"2026-05-11"` via `new Date(...).toISOString().slice(0,10)`, then asserts the emitted sitemap `lastModified` equals it.
- **`Test 4b`** (lines 189-205): hardcodes `expect(terms?.lastModified).toBe("2026-05-11")` for all three. This is a SECOND coupling — a literal `"2026-05-11"` assertion. **If a future date change happens, BOTH Test 4b's literals AND the page bodies AND the sitemap constants must change together** (three places, not two).

**Lockstep rule for the planner:** any legal-date change touches **four** locations: (1) page body visible string — TWO occurrences for `terms`; (2) `sitemap.ts` constant; (3) `sitemap.test.ts` Test 4b literal; (4) nothing else — the drift-guard describe auto-derives from the page body so it needs no edit. Since CONS-04 is already correct on `main`, no change is required and all of the above are already consistent.

### Production change vs. already-shipped

**ALREADY SHIPPED.** Verified: all three page bodies, all three sitemap constants, and both test couplings read `2026-05-11` / `"2026-05-11"` / `May 11, 2026`. The drift guard passes. No production edit needed for CONS-04.

## CONS-13 Findings — Faded Supabase logo

### Root cause (historical) and current state

The original bug (pre-phase-09): `logo-cloud.tsx` applied a global wrapper class `grayscale opacity-80 hover:grayscale-0 hover:opacity-100` to every logo. Combined with the Supabase SVG's brand-green `fill` values (`#3ECF8E`, gradient stops `#249361`), `grayscale` desaturated the green to a muted grey while the wordmark-only logos (Vercel/Resend use `fill="currentColor"`, Stripe uses `#635BFF`, DocuSeal uses `#4F46E5`) read differently under the same filter — the Supabase mark appeared washed-out relative to the others.

**Fix shipped in PR #693** (`e86a82709`): the `grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all` class was replaced with `opacity-90 hover:opacity-100 transition-opacity`. The `grayscale` filter is gone entirely; all logos now render at native color, `opacity-90`, identical across all 5.

### Current code (on `main`) — `src/components/sections/logo-cloud.tsx` lines 71-78
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

Key facts confirming consistency:
- **No per-logo class.** The `integrations` array (lines 19-50) carries only `name`, `description`, `logo`, `width` — `width` is `w-20`/`w-24`/`w-28` (horizontal sizing for differently-proportioned wordmarks, NOT an opacity differentiator). Every logo gets the exact same `opacity-90` wrapper.
- **Supabase SVG is self-contained** (lines 111-168): inline `<path>` + `<text>` with `fill="#3ECF8E"` and gradient defs. No external asset, no dark-mode variant needed — the green renders on both light and dark surfaces.
- **`fill` strategy is mixed but intentional:** Stripe `#635BFF`, Supabase `#3ECF8E`, DocuSeal `#4F46E5` are hardcoded brand colors; Vercel + Resend use `fill="currentColor"` (inherits `text-*`). This is acceptable — the SVG `fill` attributes are not CSS and do not violate the "no hex" rule (that rule targets Tailwind classes / `globals.css`, not brand-logo SVG paths). The planner should NOT "fix" these hex values; they are required for brand-accurate logos.

### Production change vs. already-shipped

**ALREADY SHIPPED.** The `grayscale` fade was removed in PR #693. All 5 logos render at consistent `opacity-90`. No production edit needed for CONS-13.

**Gap:** There is **no test file** for `logo-cloud.tsx` (`src/components/sections/` has `features-section.test.tsx` and `home-faq.test.tsx` only). A regression test would assert the wrapper className contains no `grayscale` and applies identical opacity to all 5 logos.

## CONS-14 Findings — Duplicate comparison table

### Render-site audit (verified via grep + file reads)

| Surface | File | Render site | State |
|---------|------|-------------|-------|
| Homepage | `src/app/marketing-home.tsx` | Lines 119-121 — `ComparisonTable` is **NOT rendered**; a comment block sits where it used to be: `{/* CONS-14: "Why Landlords Choose TenantFlow" ComparisonTable removed from homepage to de-duplicate with /features ... */}` | **Removed** ✓ |
| `/features` | `src/app/features/features-client.tsx` | Line 14 imports `ComparisonTable`; line 70 renders `<ComparisonTable />` inside `<LazySection fallback={<SectionSkeleton height={600} variant="grid" />} minHeight={600}>` | **Kept** ✓ |

`grep -rn "ComparisonTable"` across `src/app/` and `src/components/` confirms exactly two references to the `comparison-table.tsx` component: the import + render in `features-client.tsx`. (`PricingComparisonTable` in `src/components/pricing/` is a *different* component — the pricing-tier table — and is not in scope.) `marketing-home.tsx` has only the comment, no live render.

### D-05 / D-06 resolution

- **D-05 (default: remove from homepage) — DONE.** The table is on `/features` only. The homepage shows the CONS-14 comment in its place. This exactly matches the locked decision.
- **D-06 (differentiate-instead alternative):** Moot. There are no longer two instances, so there is nothing to differentiate. The single remaining instance on `/features` is the canonical one.

### The `comparison-table.tsx` component

`src/components/sections/comparison-table.tsx` (260 lines) renders the "Why Landlords Choose **TenantFlow**" `<h2>` (line 100-102), a 10-row `comparisonData` table, and a "See Pricing Details" CTA. It uses tokens correctly: `bg-muted/30`, `text-foreground`, `text-muted-foreground`, `bg-primary/10`, `bg-success/10`, `bg-warning/10`, `text-success`, `text-warning`, `lucide-react` icons (`Check`, `X`, `Minus`, `Crown`, `ArrowRight`). No `bg-white`, no hex, no inline styles. No token violations — no edits needed.

### Production change vs. already-shipped

**ALREADY SHIPPED.** `ComparisonTable` was removed from the homepage in PR #693 and retained on `/features`. No production edit needed for CONS-14.

**Gap:** There is **no test** asserting (a) the homepage does NOT render `ComparisonTable`, or (b) `/features` DOES. A future refactor could silently re-add it to the homepage. A regression test on `marketing-home.tsx` and/or `features-client.tsx` would pin this.

## Common Pitfalls

### Pitfall 1: Re-implementing already-shipped work
**What goes wrong:** The phase is treated as greenfield; the planner writes tasks to "add `Last Updated`", "fix the logo", "remove the table" — producing no-op diffs or, worse, regressions (e.g. re-stamping dates to a fresh "today" in violation of D-03).
**Why it happens:** 09-CONTEXT.md was gathered 2026-05-20 and frames the work as pending; it does not mention that PR #693 already shipped on 2026-05-11.
**How to avoid:** Treat this as a verify-and-pin phase. The plan's first task should be a state-verification checkpoint confirming `main`'s current state matches this research, then proceed only to the genuine gap (regression tests for CONS-13/14).
**Warning signs:** A task that says "change the legal date" — there is no honest reason to change it; `2026-05-11` is correct.

### Pitfall 2: Breaking the drift-guard regex format
**What goes wrong:** Someone "improves" the legal-page date to ISO format (`2026-05-11`) or adds a time component. The drift-guard regex `/Last Updated:?\s*(?<date>[A-Z][a-z]+ \d{1,2}, \d{4})/` no longer matches → `readVisibleDate` throws "Couldn't find Last Updated line" → all three drift-guard tests fail.
**Why it happens:** The longform `Month D, YYYY` format is an implicit contract between the page body and the test regex.
**How to avoid:** Keep the visible string in `Month D, YYYY` longform. If the format must change, update the regex in `sitemap.test.ts` line 305-307 in the same change.
**Warning signs:** Drift-guard test error message mentioning "page format changed".

### Pitfall 3: Updating only one half of a CONS-04 coupling
**What goes wrong:** If the legal date ever IS changed, updating the page body but not the `sitemap.ts` constant (or vice versa, or forgetting Test 4b's hardcoded literal) breaks the test suite.
**Why it happens:** The fact lives in 3-4 places (page body ×1 or ×2 for terms, sitemap constant, Test 4b literal).
**How to avoid:** Not applicable this phase — no date change is needed. But the planner should document the four-location lockstep in case a future task touches it.

### Pitfall 4: "Fixing" intentional brand-color hex in SVGs
**What goes wrong:** A token-alignment-zealous task replaces `fill="#3ECF8E"` / `fill="#635BFF"` in the logo SVGs with token references, producing off-brand logos.
**Why it happens:** CLAUDE.md's "no hex" rule is real, but it targets Tailwind classes and `globals.css` — not SVG `fill` path attributes of third-party brand logos.
**How to avoid:** Leave logo-SVG `fill` values alone. They are brand assets, not design tokens.

## Code Examples

### Verified current state — CONS-04 sitemap constants (no change needed)
```typescript
// Source: src/app/sitemap.ts lines 19-21 (read 2026-05-20)
const TERMS_LAST_UPDATED = "2026-05-11";
const PRIVACY_LAST_UPDATED = "2026-05-11";
const SECURITY_POLICY_LAST_UPDATED = "2026-05-11";
```

### Verified current state — CONS-13 logo wrapper (no change needed)
```tsx
// Source: src/components/sections/logo-cloud.tsx lines 71-78 (read 2026-05-20)
<div
  className={cn(
    "h-8 flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity duration-300",
    integration.width,
  )}
>
  <integration.logo className="h-full w-full" />
</div>
```

### Verified current state — CONS-14 homepage (table removed)
```tsx
// Source: src/app/marketing-home.tsx lines 119-121 (read 2026-05-20)
{/* CONS-14: "Why Landlords Choose TenantFlow" ComparisonTable
    removed from homepage to de-duplicate with /features (which is
    its natural home). Kept on /features only. */}
```

### Suggested NEW regression test — CONS-13 logo consistency
```tsx
// Source: project test conventions (Vitest 4 + jsdom, component project)
// Suggested file: src/components/sections/logo-cloud.test.tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LogoCloud } from "./logo-cloud";

describe("LogoCloud — CONS-13 consistent logo weight", () => {
  it("renders all 5 integration logos", () => {
    const { getAllByText } = render(<LogoCloud />);
    for (const name of ["Payments", "Database", "Hosting", "E-Signatures", "Email"]) {
      expect(getAllByText(name).length).toBeGreaterThan(0);
    }
  });

  it("applies no grayscale filter to any logo wrapper", () => {
    const { container } = render(<LogoCloud />);
    // The CONS-13 bug was a `grayscale` class. Pin its absence.
    expect(container.innerHTML).not.toMatch(/grayscale/);
  });

  it("applies identical opacity class to every logo wrapper", () => {
    const { container } = render(<LogoCloud />);
    const wrappers = container.querySelectorAll(".opacity-90");
    expect(wrappers.length).toBe(5);
  });
});
```

### Suggested NEW regression test — CONS-14 homepage de-dup
```typescript
// Source: project test conventions — source-text assertion (no render needed,
// avoids 'use client' / LazySection complexity)
// Suggested file: src/app/marketing-home.test.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("CONS-14 — comparison table de-duplication", () => {
  it("homepage does not render ComparisonTable", () => {
    const src = readFileSync(
      resolve(__dirname, "marketing-home.tsx"), "utf8");
    expect(src).not.toMatch(/<ComparisonTable\s*\/?>/);
    expect(src).not.toMatch(/import\s*\{[^}]*ComparisonTable[^}]*\}/);
  });

  it("/features still renders ComparisonTable", () => {
    const src = readFileSync(
      resolve(__dirname, "features", "features-client.tsx"), "utf8");
    expect(src).toMatch(/<ComparisonTable\s*\/?>/);
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Logo cloud: global `grayscale opacity-80 hover:grayscale-0` filter | Native-color logos at shared `opacity-90 hover:opacity-100` | PR #693, 2026-05-11 | Supabase green no longer desaturated; all 5 consistent |
| Comparison table on both `/` and `/features` | `/features` only | PR #693, 2026-05-11 | Homepage leaner; no accidental-copy-paste read |
| Legal dates: stale / inconsistent | Honest `May 11, 2026` + sitemap constants + drift-guard test | PR #693, 2026-05-11 | Sitemap `lastmod` verifiably matches rendered page |

**Deprecated/outdated:**
- The 09-CONTEXT.md framing of these as "pending" work — superseded by the fact that PR #693 already shipped the fixes. The CONTEXT file's `git log` discretion note (D-03) is still valid guidance but no date change is actually needed.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | PR #693 (`947299f19`) is the merge that landed all three CONS-04/13/14 fixes onto `main`, and `main` currently reflects that state | Summary, all Findings | LOW — verified by reading all 5 named files in this session AND by `git log` showing the phase-09 commits + PR-merge commit. The file contents match the "shipped" description exactly |
| A2 | `2026-05-11` is the honest content-revision date for all three legal pages (commits after it are Biome/lint tooling, not content) | CONS-04 Findings | LOW — git log subjects clearly distinguish `feat(phase-09)` from `chore(deps): migrate ... to Biome`. If a reviewer disagrees on what counts as a "content" change, the date is still defensible (not future, not stale) |
| A3 | The external audit source `audit-ui-2026-05-08.md` no longer exists at project root (the `AUDIT-*.txt` files present are a different, later browser-agent audit set) | Sources | LOW — `find` confirmed no `audit-ui-2026-05-08*` file anywhere in the tree. The requirement text in `.planning/REQUIREMENTS.md` is the authoritative substitute and was used instead |

## Open Questions (RESOLVED)

1. **Is Phase 9 meant to re-run already-completed work, or did the GSD state get reset?**
   - What we know: PR #693 merged all three fixes on 2026-05-11. STATE.md says Phase 9 is "Ready to plan / Not started". The branch `gsd/phase-09-page-cleanup` exists with one docs commit (`34a81c08e`) ahead of `main`.
   - What's unclear: Whether the orchestrator intends a fresh implementation (which would be no-op) or a verification pass.
   - Recommendation: The planner should open with a verification checkpoint task. If `main` matches this research (it does), the only remaining genuine work is adding the two missing regression tests (CONS-13 logo-cloud, CONS-14 de-dup). The CONS-04 drift guard already exists. The planner may also legitimately escalate to the orchestrator that Phase 9's production requirements are satisfied and recommend closing the phase after test-pinning.

2. **Should the two missing regression tests be added at all, or is the phase purely a verification?**
   - What we know: CONS-04 has a drift guard; CONS-13 and CONS-14 have none.
   - What's unclear: Whether the perfect-PR gate expects new tests when no production code changes.
   - Recommendation: Add the two tests. They are cheap, pin real audit fixes against silent regression, and give the phase a non-empty, reviewable diff. Without them, the phase produces zero code change and the PR would be docs-only.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + jsdom |
| Config file | `vitest.config.ts` (multi-project: `unit`, `component`, `integration`) |
| Quick run command | `bun run test:unit -- --run src/app/sitemap.test.ts` |
| Full suite command | `bun run validate:quick` (typecheck + lint + unit) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONS-04 | Legal-page `Last Updated` strings match `sitemap.ts` constants and emitted `lastModified` | unit | `bun run test:unit -- --run src/app/sitemap.test.ts` | ✅ — `sitemap.test.ts` Test 4b (lines 189-205) + drift-guard describe (lines 297-352) |
| CONS-04 | `terms/privacy/security-policy` each render a non-future, non-stale `Last Updated` | unit | (covered by drift guard above) | ✅ |
| CONS-13 | All 5 integration logos render at consistent visual weight; no `grayscale` filter | component | `bun run test:component -- --run src/components/sections/logo-cloud.test.tsx` | ❌ Wave 0 — no test file for `logo-cloud.tsx` |
| CONS-14 | Homepage does NOT render `ComparisonTable`; `/features` DOES | unit | `bun run test:unit -- --run src/app/marketing-home.test.ts` | ❌ Wave 0 — no test for `marketing-home.tsx` or `features-client.tsx` de-dup |

### Sampling Rate
- **Per task commit:** `bun run test:unit -- --run src/app/sitemap.test.ts` (and the new test files as they land)
- **Per wave merge:** `bun run validate:quick`
- **Phase gate:** Full unit suite green before `/gsd-verify-work`; perfect-PR gate (2 zero-finding cycles) per project discipline

### Wave 0 Gaps
- [ ] `src/components/sections/logo-cloud.test.tsx` — covers CONS-13 (no `grayscale`, all 5 logos render, identical opacity class). Component project. ~3 tests.
- [ ] `src/app/marketing-home.test.ts` — covers CONS-14 (homepage source has no `<ComparisonTable>` import/render; `features-client.tsx` does). Source-text assertion via `readFileSync` — avoids `'use client'` + `LazySection` render complexity. ~2 tests.
- CONS-04: no gap — `sitemap.test.ts` drift guard already covers it.
- Framework install: none needed — Vitest 4 + `@testing-library/react` already in the project.

## Sources

### Primary (HIGH confidence)
- `src/app/terms/page.tsx`, `src/app/privacy/page.tsx`, `src/app/security-policy/page.tsx` — read in full, 2026-05-20
- `src/app/sitemap.ts` + `src/app/sitemap.test.ts` — read in full, 2026-05-20
- `src/components/sections/logo-cloud.tsx` — read in full, 2026-05-20
- `src/app/marketing-home.tsx` + `src/app/features/features-client.tsx` + `src/app/features/page.tsx` — read in full, 2026-05-20
- `git log --follow` on all three legal pages; `git show --stat 947299f19` (PR #693); `git log -p` on `logo-cloud.tsx` across phase-09 commits — VERIFIED
- `.planning/phases/09-page-cleanup/09-CONTEXT.md` + `.planning/REQUIREMENTS.md` + `.planning/STATE.md` — read in full

### Secondary (MEDIUM confidence)
- `.planning/CLAUDE.md` (project) — design-token rules, Vitest conventions, no-hex/no-`bg-white` rules
- Existing test conventions inferred from `features-section.test.tsx` / `home-faq.test.tsx` presence in `src/components/sections/`

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- CONS-04 (legal dates): HIGH — all four coupled locations read directly; drift-guard mechanism traced line-by-line
- CONS-13 (logo fade): HIGH — historical bug + fix diff inspected via `git log -p`; current shipped class confirmed
- CONS-14 (table de-dup): HIGH — grep + file reads confirm exactly one render site on `/features`, zero on homepage
- "Already shipped" claim: HIGH — git history (`947299f19` = PR #693) + direct file contents corroborate

**Research date:** 2026-05-20
**Valid until:** 2026-06-19 (30 days — stable; only invalidated if someone edits the 5 named files before the phase plans)
