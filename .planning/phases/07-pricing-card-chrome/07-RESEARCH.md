# Phase 7: Pricing-Card Chrome — Research

**Researched:** 2026-05-10
**Domain:** Pricing-page visual polish (CSS/Tailwind-only) — three discrete fixes on `/pricing`
**Confidence:** HIGH (all findings verified against current source; Phase 5 numbers already in `pricing.ts`)

## Summary

Three small visual fixes to `/pricing` cards now that Phase 5 has shipped final tier numbers ($19/$49/$149 monthly, $190/$490/$1490 annual). All three are CSS/className changes plus one savings-math expansion. Zero new tokens, zero copy changes beyond the Phase 4/5 locked strings, zero Stripe touches.

**Primary recommendation:** Single phase, single PR, **two plans** decomposed by surface area:
- **Plan 07-01:** CONS-05 (badge positioning, `pricing-card-featured.tsx`) + CONS-09 (price-suffix nowrap, `pricing-card-standard.tsx`) — pure JSX/Tailwind className edits, ~10 LOC total
- **Plan 07-02:** CONS-10 (per-tier annual savings via map prop + 3 badge renderers, OR a clearer single composite figure) — touches `bento-pricing-section.tsx` + both card components + tests

Splitting CONS-10 into its own plan isolates the savings-math test surface (which is the only place the phase grows beyond trivial className flips) from the visual chrome fixes.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Badge positioning math | Browser (Tailwind utility classes) | — | Pure CSS layout, no JS state |
| Price + suffix horizontal layout | Browser (Tailwind flex utilities) | — | Pure CSS layout |
| Annual savings calculation | Frontend Server / RSC ingest | Browser (display) | `bento-pricing-section.tsx` is `'use client'`, but math derives from `pricing.ts` config — single source of truth lives in config layer |
| Pricing data | Frontend (`pricing.ts` config) | — | Phase 5 locked the numbers; this phase consumes them |

<user_constraints>
## User Constraints (from upstream — REQUIREMENTS.md + ROADMAP.md)

### Locked Decisions

- **Phase 5 tier numbers are immutable here.** Starter $19/$190, Growth $49/$490, Max $149/$1,490. Phase 7 consumes `src/config/pricing.ts` — does not edit dollar values.
- **Phase 4 descriptions are immutable here.** Starter description text MUST remain `'Ideal for landlords with 1–5 rentals'` byte-for-byte. CONS-09 fixes only the spacing/wrapping around it.
- **`MAX_PUBLIC_PRICE_DISPLAY = '$149'`** — Phase 5 PRICE-06 already flipped this from `'Custom'`. Phase 7 leaves it alone.
- **Cross-cutting design-token constraint:** Every fix must use canonical tokens defined in `src/app/globals.css`. No new hex/rgb/`bg-white`/inline-ms. Color: `--color-*` only. Surfaces: `bg-card`/`bg-background`/`bg-muted` (not `bg-white`). A PR that introduces a hex/rgb/`bg-white`/inline-ms or any non-`globals.css` token value FAILS the perfect-PR review gate.
- **Icons: `lucide-react` only.** No `@radix-ui/react-icons`, no emojis.
- **No `any` types, no barrel files, no inline styles, no string-literal query keys.** (CLAUDE.md zero-tolerance.)

### Claude's Discretion (Researcher recommended; planner can override)

- **CONS-05 fix style:** Option A (lift badge fully above card: `top-0 -translate-y-1/2`), Option B (keep current `-top-4` but make it intentional with `z-20` + ring/shadow polish), or Option C (move badge inside card padding at `top-4`). Recommended: **Option A** — matches Tailwind UI 2026 pricing patterns and reads as "premium pinned tab" rather than "stuck in border."
- **CONS-10 fix style:** Option D (per-card "Save $X/year" badge below price, shown only when `billingCycle === 'yearly'`) or Option E (keep single composite figure but make it sum-of-all-three: $38 + $98 + $298 = $434, with helper subtext "across all plans"). Recommended: **Option D** — per-plan transparency, math-auditable, no aggregation magic.
- **`kibo-style-pricing.tsx`:** Zero importers (verified via grep). Researcher's recommendation: **out of scope for Phase 7** — flag for dead-code removal in a future cleanup phase. Do NOT touch in Phase 7 to keep the diff focused.

### Deferred Ideas (OUT OF SCOPE)

- **Pricing card visual redesign** (v2.0+; v1.0 is token alignment + bug fixes only)
- **Layout overhaul** (bento grid restructure, card depth/elevation rework)
- **Adding new design tokens** (only existing `globals.css` tokens permitted)
- **Stripe state changes** (Phase 5 owns; Phase 7 does not touch `pricing.ts` numeric values or Stripe IDs)
- **Copy beyond Phase 4 locks** (descriptions, feature lists, CTA labels frozen)
- **Removing or refactoring `kibo-style-pricing.tsx`** (dead, but out of scope here)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **CONS-05** | "Most Popular" badge on Growth pricing card no longer overlaps card border — adjust badge positioning, padding, or `--radius-*` so it sits cleanly on/above the card edge. | Root cause identified: `-top-4` (16px) lifts a ~28px-tall badge so ~12px still sits below the card's top edge, intersecting the 2px gradient ring at line 135 of `pricing-card-featured.tsx`. Fix: replace `-top-4` with `top-0 -translate-y-1/2` to put the badge's center on the card's top edge (50% overhang each side — visually clean). |
| **CONS-09** | Pricing-page Starter subhead spacing fixed — sentence reads as one line; "/mo" stays adjacent to price, not on a new line. | Root cause identified: `pricing-card-standard.tsx:167-178` uses `flex items-baseline gap-1` with NO `whitespace-nowrap` on the container. At narrow viewports, the `NumberFlow` ($19) + `/mo` span have a flex gap, and `NumberFlow` is `text-3xl` (~30px), while the suffix is `text-sm` (~14px) — at sub-280px effective widths inside the 4-col bento grid breakpoint, the span wraps below. Subhead at line 162 (`<p className="text-sm text-muted-foreground">`) has no breaking issue today — researcher confirmed Phase 4 string is one sentence and renders inline (audit-15 was authored against pre-Phase-4 copy "Ideal for property owners managing a few properties" which had different word boundaries). Fix: add `whitespace-nowrap` to the price-row container at line 167. |
| **CONS-10** | Annual toggle savings figure is correct and explainable — math matches a real per-plan calc post-pricing-restructure. Either a single composite "Save $X/year" backed by math, or per-plan savings shown on each card. | Phase 5 locked `monthly × 10 = annual`. Current code at `bento-pricing-section.tsx:46-48` computes savings ONLY for Growth: `growthPlan.price.monthly * 12 - growthPlan.annualTotal` = `49 * 12 - 490` = **$98**. Displayed at line 108 as `Save $98`. This is mathematically correct for Growth but misleading because it's labeled in the toggle bar (suggests all-plans figure) while only being Growth's number. Two valid fixes: (D) Render per-plan "Save $X/yr" inside each card when `yearly`, drop the global badge; (E) Keep global badge but relabel + sum across all 3 tiers ($38 + $98 + $298 = $434/yr across all plans). Recommended: D. |
</phase_requirements>

## Standard Stack

This phase introduces NO new libraries. All work is className edits on existing components.

### Already in use (verified)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tailwindcss` | 4.x | Utility classes for positioning, flex, whitespace | Already the styling system; CLAUDE.md mandates Tailwind-only |
| `lucide-react` | current | `Sparkles` icon in Most Popular badge | Sole icon library per CLAUDE.md zero-tolerance rule |
| `@number-flow/react` | current | Animated $19 → $190 price transitions | Already powering both card components |
| Internal `Badge` component | — | `#components/ui/badge` — used at `pricing-card-featured.tsx:142` | Shadcn badge primitive with `bg-primary text-primary-foreground` styling |

**Installation:** Nothing to install.

## Architecture Patterns

### System Architecture Diagram

```
/pricing route
        ↓
[src/app/pricing/page.tsx]
        ├── <section className="relative overflow-hidden section-spacing">
        │     ↓
        │     <PricingSection /> (RSC wrapper)
        │           ↓
        │           [src/app/pricing/_components/pricing-section.tsx]
        │                 ↓
        │                 <BentoPricingSection defaultBillingCycle="monthly" />
        │                       ↓
        │                       [src/components/pricing/bento-pricing-section.tsx]  ← 'use client'
        │                             │
        │                             ├── billingCycle state (monthly | yearly)
        │                             ├── annualSavings calc (line 46-48) ◄── CONS-10
        │                             ├── Billing toggle Switch + "Save $X" Badge ◄── CONS-10
        │                             │
        │                             └── 4-col bento grid (lg:grid-cols-4)
        │                                   ├── [col 1] Starter → <PricingCardStandard variant="starter">  ◄── CONS-09
        │                                   ├── [col 2-3] Growth → <PricingCardFeatured>  ◄── CONS-05
        │                                   │     └── absolute -top-4 badge (line 141-146)  ◄── CONS-05 fix target
        │                                   └── [col 4] Max → <PricingCardStandard variant="enterprise">
        │
        └── <PricingComparisonTable /> (existing — not in scope)
```

### Recommended Project Structure

No structural changes. Pure className edits to existing files.

### Pattern 1: Overhang Badge via `top-0 -translate-y-1/2` (CONS-05)

**What:** Lift the badge so its vertical CENTER aligns with the card's top edge — badge sits fully above the gradient ring with only its bottom half "tucked" into the card visually (clean overhang, no border intersection).

**When to use:** Featured / "Most Popular" badges on pricing cards where you want the badge to read as an intentional decoration above the card, not stuck in the border.

**Why this beats the current `-top-4`:** With `-top-4` (1rem), a ~28px badge has its top at -16px and bottom at +12px relative to card top — so 12px of badge sits BELOW the card's top edge, intersecting the 2px gradient border. With `top-0 -translate-y-1/2`, the badge's vertical center is at exactly the card top edge — clean visual separation.

**Example:**
```tsx
// Source: Tailwind UI pricing patterns (verified shadcn block conventions 2026)
// File: src/components/pricing/pricing-card-featured.tsx:141-146
// BEFORE:
<div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
  <Badge className="bg-primary text-primary-foreground shadow-lg px-4 py-1.5 text-sm font-semibold">
    <Sparkles className="size-3.5 mr-1.5" />
    Most Popular
  </Badge>
</div>

// AFTER (Option A — recommended):
<div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
  <Badge className="bg-primary text-primary-foreground shadow-lg px-4 py-1.5 text-sm font-semibold">
    <Sparkles className="size-3.5 mr-1.5" />
    Most Popular
  </Badge>
</div>
```

Key changes:
- `-top-4` → `top-0` (badge top reference becomes card top)
- Add `-translate-y-1/2` (badge shifts up by half its own height)
- `z-10` → `z-20` (defensive — ensures the badge sits above any future card-internal elevations)

### Pattern 2: Inline-Flex Nowrap for Price + Suffix (CONS-09)

**What:** Use `whitespace-nowrap` on the flex container that holds the `NumberFlow` price and the `/mo` suffix span so they never wrap regardless of grid column width.

**When to use:** Any "$XX/mo" composition inside a fluid grid where column width can shrink below the natural content width.

**Example:**
```tsx
// Source: Tailwind utility composition for nowrap inside flex
// File: src/components/pricing/pricing-card-standard.tsx:167-178
// BEFORE:
<div className="flex items-baseline gap-1">
  <NumberFlow
    className="text-3xl font-bold text-foreground"
    format={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
    value={currentPrice}
  />
  <span className="text-sm text-muted-foreground">/mo</span>
</div>

// AFTER:
<div className="flex items-baseline gap-1 whitespace-nowrap">
  <NumberFlow
    className="text-3xl font-bold text-foreground"
    format={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
    value={currentPrice}
  />
  <span className="text-sm text-muted-foreground">/mo</span>
</div>
```

Single class addition: `whitespace-nowrap` on the flex container. NumberFlow renders inline; the span is `text-sm`. Both are inline-level — `whitespace-nowrap` prevents the wrap regardless of column width.

**Note on subhead:** Audit-15 references "Ideal for property owners managing a few properties" — that's the PRE-Phase-4 copy. Phase 4 locked the description to `'Ideal for landlords with 1–5 rentals'` which is 6 words / ~42 chars and renders inline at all breakpoints inside the Starter card. No spacing fix needed on the subhead. The only CONS-09 fix is the price-row nowrap.

### Pattern 3: Per-Card Savings Badge (CONS-10 — Recommended Option D)

**What:** Move savings display from the global toggle bar to a per-card badge that appears only when `billingCycle === 'yearly'`. Drop the global "Save $X" badge from the toggle row.

**Why this is the right call:**
- The current global "Save $98" reads as "save $98 total" but actually reflects Growth only — confusing.
- Per-plan transparency: user sees Starter saves $38, Growth saves $98, Max saves $298 — directly auditable against displayed prices.
- Removes the ambiguous aggregation from the toggle bar.

**Example:**
```tsx
// Source: Researcher-proposed pattern; verified math from pricing.ts (Phase 5)
// File: src/components/pricing/pricing-card-standard.tsx + pricing-card-featured.tsx

// Add to BOTH card components, inside the price block, after the "Billed annually" line:
{billingCycle === 'yearly' && (
  <Badge
    variant="secondary"
    className="bg-success/10 text-success hover:bg-success/20 text-xs font-semibold mt-2"
  >
    Save ${(plan.price.monthly * 12) - plan.annualTotal}/year
  </Badge>
)}

// And REMOVE from bento-pricing-section.tsx:
// - lines 46-49 (annualSavings calculation)
// - the global Badge wrapper around line 104-110 (just render "Annual" label, no badge)
```

**Math verification table:**

| Tier | Monthly | Annual | Annual / 12 (effective) | Savings/yr = monthly×12 − annual | Effective discount |
|------|---------|--------|-------------------------|-----------------------------------|---------------------|
| Starter | $19 | $190 | $15.83 | **$38** | 16.67% |
| Growth | $49 | $490 | $40.83 | **$98** | 16.67% |
| Max | $149 | $1,490 | $124.17 | **$298** | 16.67% |

All three derive cleanly from the Phase 5 `monthly × 10 = annual` rule. `calculateAnnualSavings()` already exists at `src/config/pricing.ts:274-278` and returns identical values when passed each tier's monthly price.

**Alternative: use the existing helper.** Instead of inlining the math, prefer:
```tsx
import { calculateAnnualSavings } from '#config/pricing'
// ...
Save ${calculateAnnualSavings(plan.price.monthly)}/year
```

This pins all 3 cards to the canonical helper. If a future restructure breaks the 10× rule, the helper changes once and all cards follow.

### Anti-Patterns to Avoid

- **Don't use inline `style={{ top: '-...' }}`** for the badge — violates CLAUDE.md zero-tolerance "no inline styles." Use Tailwind utilities.
- **Don't reach for `padding-top` on the bento grid** to "make room" for the overhang badge — that adds visual gap on the non-Growth columns too. Keep the badge purely absolute; lift via `-translate-y-1/2`.
- **Don't hard-code savings numbers** (`Save $38`, `Save $98`, `Save $298`) — use `calculateAnnualSavings(plan.price.monthly)` from `pricing.ts` so future restructures don't introduce drift between displayed savings and actual annual price.
- **Don't add a new `Badge` variant** for the savings chip — the existing `bg-success/10 text-success` composition is the project convention (already used at `bento-pricing-section.tsx:106`).
- **Don't widen the gradient ring** to "hide" the badge intersection — that masks the root cause without fixing it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Centered overhang badge positioning | Custom `style={{ transform: ... }}` math | Tailwind `top-0 -translate-y-1/2` | Idiomatic Tailwind; matches shadcn pricing block convention |
| Price + suffix nowrap | A new flex utility / custom CSS class | Tailwind `whitespace-nowrap` | Already in the engine; single-class fix |
| Annual savings math | Inline arithmetic in JSX | `calculateAnnualSavings()` helper at `src/config/pricing.ts:274` | Helper already exists, already covers the 10× rule — use single source of truth |
| Conditional render when yearly | `useEffect` / `useMemo` choreography | Plain JSX ternary on `billingCycle === 'yearly'` | Stateless render condition; no need for memoization |

**Key insight:** This phase is a 3-area Tailwind className polish, not an architectural change. Every fix has a 1-3 LOC implementation. Don't over-engineer.

## Common Pitfalls

### Pitfall 1: Badge clipping by section `overflow-hidden`

**What goes wrong:** The pricing page at `src/app/pricing/page.tsx:49` wraps the section in `relative overflow-hidden`. If the badge is lifted far enough above the card AND lands above the section's top padding, it gets clipped.

**Why it happens:** `overflow-hidden` on a `<section>` clips ALL descendant overflow including absolutely-positioned elements.

**How to avoid:** The fix uses `-translate-y-1/2` which lifts the badge by half its own height (~14px) — well within the section's `section-spacing` (5rem padding-block) and the bento toggle's `mb-12` (3rem margin above the grid). No clipping risk.

**Warning signs:** Test at iPhone SE 375×667 in Chrome DevTools; badge should be fully visible above Growth card with no top edge of the section cutting through it.

### Pitfall 2: `NumberFlow` width changes mid-animation breaking nowrap

**What goes wrong:** `NumberFlow` animates between `$19` and `$190` (when toggling monthly/yearly). During the transition, the element width can briefly grow, potentially forcing the `/mo` span to wrap if `whitespace-nowrap` is missing.

**Why it happens:** `NumberFlow` does character-by-character mounting/transition; the rendered width is dynamic during the animation window (~300ms).

**How to avoid:** `whitespace-nowrap` on the flex parent (CONS-09 fix) covers this — it prevents wrapping regardless of inner element width.

**Warning signs:** Toggle billing cycle rapidly; the `/mo` should never visibly drop to a second line.

### Pitfall 3: Forgetting the Growth card has a different price block markup

**What goes wrong:** CONS-09's `whitespace-nowrap` fix is correct for `pricing-card-standard.tsx` (Starter + Max). But `pricing-card-featured.tsx:164` ALSO has a price-row flex container (`flex items-baseline justify-center gap-2`) — if researcher only fixes Standard, Growth at narrow widths could still wrap.

**Why it happens:** Two different card components, each with its own price-row markup. The Featured card uses `justify-center gap-2`, the Standard card uses `gap-1`.

**How to avoid:** Apply `whitespace-nowrap` to BOTH price-row flex containers. Growth's container at `pricing-card-featured.tsx:164` should also gain the class. This is cheap defense — even if Growth doesn't currently wrap (its 2-column layout gives it more horizontal space), the fix is idempotent.

**Warning signs:** Resize Chrome DevTools to ~360px width; Growth card price should never wrap.

### Pitfall 4: Removing `annualSavings` from bento without checking if the global badge is still rendered

**What goes wrong:** If Plan 07-02 removes the local `annualSavings` calc but leaves the `<Badge>...Save ${Math.round(annualSavings)}</Badge>` markup at line 108, the badge renders `Save $NaN` or `Save $0`.

**Why it happens:** Two-step refactor — calc removal + JSX removal — and missing the JSX removal half.

**How to avoid:** Single commit: remove lines 46-49 (calc) AND lines 104-110 (Badge wrapper inside the yearly Label). Replace with plain `Annual` label text.

**Warning signs:** Search for `annualSavings` after the fix — should return 0 hits in `bento-pricing-section.tsx`.

### Pitfall 5: Phase 4 description lock violation

**What goes wrong:** Researcher tempted to "fix" the Starter description text as part of CONS-09 — e.g., add a trailing period or word change.

**Why it happens:** Audit-15 references PRE-Phase-4 copy. The current text is `'Ideal for landlords with 1–5 rentals'` (no trailing period, en-dash between 1 and 5). Phase 4 explicitly locked this string and the marketing-copy banlist test would fail if changed.

**How to avoid:** CONS-09's scope is ONLY the price-row layout class. Description text is not in scope. Reference: `.planning/phases/04-persona-copy/` ships the locked descriptions; `src/app/__tests__/marketing-copy-landlord-only.test.ts` pins the banlist.

**Warning signs:** `pnpm test:unit -- --run src/app/__tests__/marketing-copy-landlord-only.test.ts` should pass unchanged after Phase 7.

## Code Examples

### CONS-05: Featured card badge — Before / After diff

```tsx
// File: src/components/pricing/pricing-card-featured.tsx
// Lines: 140-146 (current) → same lines after edit

// BEFORE (current):
{/* Most Popular Badge */}
<div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
  <Badge className="bg-primary text-primary-foreground shadow-lg px-4 py-1.5 text-sm font-semibold">
    <Sparkles className="size-3.5 mr-1.5" />
    Most Popular
  </Badge>
</div>

// AFTER:
{/* Most Popular Badge — centered on card top edge */}
<div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
  <Badge className="bg-primary text-primary-foreground shadow-lg px-4 py-1.5 text-sm font-semibold">
    <Sparkles className="size-3.5 mr-1.5" />
    Most Popular
  </Badge>
</div>
```

### CONS-09: Standard card price-row nowrap

```tsx
// File: src/components/pricing/pricing-card-standard.tsx
// Lines: 167-178

// BEFORE:
<div className="flex items-baseline gap-1">
  <NumberFlow ... value={currentPrice} />
  <span className="text-sm text-muted-foreground">/mo</span>
</div>

// AFTER:
<div className="flex items-baseline gap-1 whitespace-nowrap">
  <NumberFlow ... value={currentPrice} />
  <span className="text-sm text-muted-foreground">/mo</span>
</div>
```

### CONS-09 (defensive): Featured card price-row nowrap

```tsx
// File: src/components/pricing/pricing-card-featured.tsx
// Lines: 164-177

// BEFORE:
<div className="flex items-baseline justify-center gap-2">
  <NumberFlow ... value={currentPrice} />
  <span className="text-muted-foreground font-medium">
    /{billingCycle === 'yearly' ? 'mo' : 'month'}
  </span>
</div>

// AFTER:
<div className="flex items-baseline justify-center gap-2 whitespace-nowrap">
  <NumberFlow ... value={currentPrice} />
  <span className="text-muted-foreground font-medium">
    /{billingCycle === 'yearly' ? 'mo' : 'month'}
  </span>
</div>
```

### CONS-10: Drop global savings badge, add per-card savings badge

```tsx
// FILE 1: src/components/pricing/bento-pricing-section.tsx

// DELETE lines 46-49:
// const annualSavings = growthPlan
//   ? growthPlan.price.monthly * 12 - growthPlan.annualTotal
//   : 0

// REPLACE the yearly Label block (lines 95-110) with plain Annual text:
<Label
  htmlFor="billing-toggle"
  className={`text-sm font-medium transition-colors cursor-pointer ${
    billingCycle === 'yearly' ? 'text-foreground' : 'text-muted-foreground'
  }`}
>
  Annual
</Label>
```

```tsx
// FILE 2: src/components/pricing/pricing-card-standard.tsx
// ADD at the top of the file:
import { calculateAnnualSavings } from '#config/pricing'
import { Badge } from '#components/ui/badge'

// In the price block (after the existing "Billed annually" <p> at line 179-183):
{billingCycle === 'yearly' && (
  <Badge
    variant="secondary"
    className="bg-success/10 text-success hover:bg-success/20 text-xs font-semibold mt-2"
  >
    Save ${calculateAnnualSavings(plan.price.monthly)}/year
  </Badge>
)}
```

```tsx
// FILE 3: src/components/pricing/pricing-card-featured.tsx
// ADD at top:
import { calculateAnnualSavings } from '#config/pricing'

// In the price block (after the existing "Billed annually" <p> at line 178-182):
{billingCycle === 'yearly' && (
  <Badge
    variant="secondary"
    className="bg-success/10 text-success hover:bg-success/20 text-xs font-semibold mt-2"
  >
    Save ${calculateAnnualSavings(plan.price.monthly)}/year
  </Badge>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Floating "Save $X" pill in toggle bar (ambiguous which tier) | Per-card "Save $X/year" badge under each price | Tailwind UI / shadcn pricing blocks 2025-2026 | More transparent; auditable against displayed prices; no aggregation magic |
| `-top-4` badge offset (half-on / half-off card edge) | `top-0 -translate-y-1/2` (fully overhanging, math-correct) | Linear/Vercel/shadcn pricing patterns 2026 | Reads as intentional decoration, not stuck-in-border |
| Hard-coded savings dollar values | `calculateAnnualSavings()` helper consuming `pricing.ts` | Phase 5 (2026-05-10) | Single source of truth; future restructures don't drift |

**Deprecated/outdated:**
- The `Math.round(annualSavings)` call at `bento-pricing-section.tsx:108` is a no-op for clean integer math ($98 = $98) but stays as defensive paranoia. Recommend removing it entirely in Phase 7 since the helper returns clean integers for all 3 tiers.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `<section className="relative overflow-hidden">` at `src/app/pricing/page.tsx:49` doesn't clip the badge after `-translate-y-1/2` lift | Pitfall 1 | LOW — section has 5rem padding-block; badge lifts ~14px; well within clear space. Visually confirmable. |
| A2 | Audit-15 was written against pre-Phase-4 copy; current Phase 4 description `'Ideal for landlords with 1–5 rentals'` doesn't have the awkward break described | CONS-09 root cause analysis | LOW — verified by reading `pricing.ts:100` against audit text. Worst case: planner asks researcher to verify in Chrome DevTools at 375px. |
| A3 | `whitespace-nowrap` on the Featured card price-row (Growth) is defensive — Growth's 2-column layout has enough width that it doesn't currently wrap | CONS-09 Pitfall 3 | LOW — idempotent fix; even if Growth never wraps in practice, the class is cheap and prevents future regression if column layout changes. |
| A4 | `calculateAnnualSavings()` helper at `pricing.ts:274` returns `38`, `98`, `298` for the three tiers | CONS-10 math | NONE — verified directly: `(19*12) - (19*10) = 38`; `(49*12) - (49*10) = 98`; `(149*12) - (149*10) = 298`. |
| A5 | Removing the global savings badge from the toggle row is preferable to keeping a per-tier-aware global indicator | CONS-10 Option D recommendation | MEDIUM — design opinion. Planner can override with Option E (composite badge summing all 3 = $434/yr). Either passes the audit; Option D is cleaner. |
| A6 | `kibo-style-pricing.tsx` is dead code (zero importers) | Out of scope statement | LOW — verified via `grep -rn` 2026-05-10. Worst case: it's referenced by a code path researcher missed; flag for cleanup, don't touch in Phase 7. |

## Open Questions

1. **Should Option D (per-card savings) replace the global toggle badge or coexist with it?**
   - What we know: Audit-16 explicitly says "show the math or per-plan savings." Per-card satisfies that exactly.
   - What's unclear: Whether removing the global badge feels like a regression to users who scan the toggle bar.
   - Recommendation: Remove the global badge in Plan 07-02. Per-card is more honest. If feedback comes back negative, a follow-up plan can re-add a clearer global composite ($434 total).

2. **Should `calculateAnnualSavings()` be used inline in the JSX or memoized?**
   - What we know: The function is `O(1)` integer arithmetic. React renders during state changes (billing toggle).
   - What's unclear: Whether `useMemo` is overkill. It is.
   - Recommendation: Inline call. `useMemo` would be premature optimization.

3. **Are there any other "Save $X" surfaces (homepage features grid, FAQ, comparison table) that need to stay in sync?**
   - What we know: `grep -rn "Save \$"` returned only `bento-pricing-section.tsx:108`. No FAQ entries reference dollar savings.
   - What's unclear: Whether marketing copy elsewhere (about page, blog) mentions specific savings figures.
   - Recommendation: Add a checker step in the verification phase: `grep -rn "Save \$\|/year savings\|annual savings"` → confirm zero stale references after Phase 7 ships.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + jsdom |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test:unit -- --run src/components/pricing/__tests__/` (no tests exist yet; Wave 0 creates them) |
| Full suite command | `pnpm test:unit` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONS-05 | Featured card badge positioning classes are `top-0 -translate-y-1/2` (not `-top-4`) | unit (snapshot or className assertion) | `pnpm test:unit -- --run src/components/pricing/__tests__/pricing-card-featured.test.tsx` | ❌ Wave 0 |
| CONS-09 | Standard card price-row container has `whitespace-nowrap`; Featured card price-row container has `whitespace-nowrap` | unit (className assertion) | `pnpm test:unit -- --run src/components/pricing/__tests__/pricing-card-standard.test.tsx` and `...featured.test.tsx` | ❌ Wave 0 |
| CONS-10 | Per-card savings badge renders when `billingCycle === 'yearly'` with correct dollar value from `calculateAnnualSavings`; bento toggle bar no longer renders a global savings badge | unit (render + text assertion) | `pnpm test:unit -- --run src/components/pricing/__tests__/bento-pricing-section.test.tsx` (new) | ❌ Wave 0 |
| CONS-10 math | `calculateAnnualSavings(19) === 38`, `calculateAnnualSavings(49) === 98`, `calculateAnnualSavings(149) === 298` | unit (pure function) | `pnpm test:unit -- --run src/config/__tests__/pricing.test.ts` (may already exist) | ❓ Check |

### Sampling Rate

- **Per task commit:** `pnpm test:unit -- --run src/components/pricing/` (~5s)
- **Per wave merge:** `pnpm validate:quick` (types + lint + unit tests, ~30s)
- **Phase gate:** Full suite green + `pnpm test:e2e` smoke (pricing page renders without console errors at 375 / 768 / 1440 viewports)

### Wave 0 Gaps

- [ ] `src/components/pricing/__tests__/pricing-card-featured.test.tsx` — covers CONS-05 (badge position classes) + CONS-09 defensive Featured nowrap + CONS-10 per-card savings render
- [ ] `src/components/pricing/__tests__/pricing-card-standard.test.tsx` — covers CONS-09 Standard nowrap + CONS-10 per-card savings render for Starter + Max
- [ ] `src/components/pricing/__tests__/bento-pricing-section.test.tsx` — covers CONS-10 toggle-bar badge removal (assert no `Save $` text in toggle row)
- [ ] Possibly `src/config/__tests__/pricing.test.ts` — `calculateAnnualSavings()` purity (researcher: check if this exists; if not, add a 3-line test)
- [ ] Optional: Playwright visual smoke at 375 / 768 / 1440 to catch any badge-clipping regression that a className assertion misses

## Security Domain

> `security_enforcement` is enabled by default. This phase is pure CSS/JSX className polish — no user input, no data flow, no new endpoints, no auth touch, no crypto. ASVS evaluation included for completeness.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A — no auth touched |
| V3 Session Management | no | N/A — no session touched |
| V4 Access Control | no | N/A — public marketing page, no protected resource |
| V5 Input Validation | no | N/A — no user input handled |
| V6 Cryptography | no | N/A — no crypto |

### Known Threat Patterns for Tailwind className edits

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via dynamic className | Tampering | No user-controlled string interpolation into className; all classes are static literals — N/A here |
| Token leak via console | Information disclosure | No tokens in scope — N/A |

## Sources

### Primary (HIGH confidence)
- `src/config/pricing.ts` — read 2026-05-10, verified Phase 5 numbers are live
- `src/components/pricing/pricing-card-featured.tsx` — read 2026-05-10
- `src/components/pricing/pricing-card-standard.tsx` — read 2026-05-10
- `src/components/pricing/bento-pricing-section.tsx` — read 2026-05-10
- `src/components/pricing/pricing-comparison-table.tsx` — read 2026-05-10
- `src/components/pricing/kibo-style-pricing.tsx` — read 2026-05-10 (dead code, zero importers verified)
- `src/app/pricing/page.tsx` — read 2026-05-10 (`overflow-hidden` parent confirmed)
- `src/app/pricing/pricing-content.tsx` — read 2026-05-10
- `src/app/pricing/__tests__/page.test.ts` — read 2026-05-10 (existing PRICE-06 tests, no CONS-* tests yet)
- `.planning/phases/05-pricing-restructure/05-RESEARCH.md` — read 2026-05-10 (Phase 5 locked tier shape)
- `.planning/phases/05-pricing-restructure/05-CONTEXT.md` — read 2026-05-10 (decisions block)
- `.planning/REQUIREMENTS.md` — read 2026-05-10 (CONS-05 / CONS-09 / CONS-10 verbatim)
- `.planning/ROADMAP.md` — read 2026-05-10 (Phase 7 success criteria)
- `audit-ui-2026-05-08.md` — read 2026-05-10 (items 11, 15, 16 — the source audit observations)

### Secondary (MEDIUM confidence)
- Tailwind UI pricing patterns (web search 2026-05-10) — confirms `top-0 -translate-y-1/2` is the idiomatic overhang pattern

### Tertiary (LOW confidence)
- None — all claims verified against the codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; verified existing imports
- Architecture: HIGH — diagram derived directly from file reads
- Pitfalls: HIGH — each pitfall is rooted in a specific file/line researcher inspected
- Code examples: HIGH — every snippet uses real file paths and real surrounding context
- Math verification: HIGH — manually verified for all 3 tiers; `calculateAnnualSavings()` confirmed
- CONS-09 root cause: MEDIUM — assumption A2 about audit-15 referencing pre-Phase-4 copy is high-confidence but should be visually confirmed at 375px in DevTools during execution

**Plan decomposition recommendation:** **2 plans** in a single phase / single PR.

- **Plan 07-01: Card chrome (CONS-05 + CONS-09)** — Pure className edits to `pricing-card-featured.tsx` (badge position + defensive nowrap) and `pricing-card-standard.tsx` (price-row nowrap). ~6 LOC. Wave 0 adds 2 test files asserting className shape.
- **Plan 07-02: Annual savings math (CONS-10)** — Drop global badge from `bento-pricing-section.tsx`, add per-card savings badge to both card components using `calculateAnnualSavings()` helper. ~15 LOC. Wave 0 adds 1 test file (`bento-pricing-section.test.tsx`); extends the test files from 07-01 to cover the per-card savings render.

Both plans share the test files written in Wave 0 — Plan 07-02 extends them rather than creating duplicates.

**Why NOT 1 plan:** CONS-10 has a meaningfully different test surface (state-conditional render, helper integration) from CONS-05/CONS-09 (static className assertions). Splitting isolates risk: if CONS-10's per-card display is the wrong call, 07-01 still ships standalone.

**Why NOT 3 plans:** CONS-05 and CONS-09 are both ~1-LOC className changes to the same two card components. Splitting them adds plan overhead without isolating risk.

**Research date:** 2026-05-10
**Valid until:** 2026-06-10 (30 days — stable Tailwind utilities, no fast-moving dependencies)

---

*Phase 7 research complete: 2026-05-10. Ready for `/gsd-plan-phase 7` (or `/gsd-discuss-phase 7` if user wants to choose between Option D and Option E for CONS-10).*
