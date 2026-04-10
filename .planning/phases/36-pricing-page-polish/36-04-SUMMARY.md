---
phase: 36
plan: 04
subsystem: pricing
tags: [responsive, mobile-layout, tailwind-v4, comparison-table]
dependency_graph:
  requires: []
  provides: [responsive pricing comparison table with horizontal scroll and scroll-hint gradient]
  affects: [src/components/pricing/pricing-comparison-table.tsx]
tech_stack:
  added: []
  patterns: [overflow-x-auto scroll container, min-width content constraint, mobile-only gradient overlay]
key_files:
  modified:
    - src/components/pricing/pricing-comparison-table.tsx
decisions:
  - "D-12: Horizontal scroll pattern with min-w-[640px] constraint preserves all 4 columns on mobile without reflowing to a 2-col grid"
  - "D-13: Decorative scroll-hint gradient (w-8, bg-gradient-to-l from-card, md:hidden) sits as absolute overlay above sticky header z-10 at z-20"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-09"
  tasks: 2
  files_modified: 1
---

# Phase 36 Plan 04: Pricing Comparison Table Mobile Layout Summary

**One-liner:** Wrapped pricing comparison table in an `overflow-x-auto` container with a `min-w-[640px]` inner constraint and added a mobile-only scroll-hint gradient overlay so the 4-column comparison stays readable on narrow viewports.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add overflow-x-auto wrapper and min-width constraint (D-12) | (combined) | src/components/pricing/pricing-comparison-table.tsx |
| 2 | Add scroll-hint gradient fade on right edge (D-13) | (combined) | src/components/pricing/pricing-comparison-table.tsx |

## Changes Made

### Task 1 — Horizontal Scroll Wrapper (D-12)

In `src/components/pricing/pricing-comparison-table.tsx` lines ~198-232:

**Before:**
```tsx
<div className="rounded-xl border border-border/50 bg-card overflow-hidden">
  {/* sticky header */}
  {/* comparisonData.map(...) */}
</div>
```

**After:**
```tsx
<div className="relative overflow-x-auto rounded-xl border border-border/50 bg-card">
  <div className="min-w-[640px]">
    {/* sticky header */}
    {/* comparisonData.map(...) */}
  </div>
</div>
```

- Outer wrapper: `overflow-hidden` replaced with `overflow-x-auto` plus `relative` (needed for absolutely-positioned gradient in Task 2)
- Inner wrapper `min-w-[640px]` forces content to hold 4-column width on narrow viewports, triggering horizontal scroll
- `rounded-xl border border-border/50 bg-card` classes preserved on outer wrapper so border and card background remain the visible shell
- 640px chosen as minimum: with four columns each gets >=160px, enough to display "Starter $29/mo", "Growth $79/mo", "Max Custom" labels and feature text without truncation

### Task 2 — Scroll-hint Gradient (D-13)

Added a decorative gradient overlay as a sibling of the `min-w-[640px]` content inside the `relative overflow-x-auto` wrapper:

```tsx
<div
  className="pointer-events-none absolute inset-y-0 right-0 z-20 w-8 bg-gradient-to-l from-card to-transparent md:hidden"
  aria-hidden="true"
/>
```

- `pointer-events-none`: gradient never blocks scroll/touch gestures
- `absolute inset-y-0 right-0 w-8`: pinned to the right edge, full height, 2rem wide
- `z-20`: sits above the sticky header (z-10) so the fade is visible over the header row too
- `bg-gradient-to-l from-card to-transparent`: fades from card background on the left toward transparent on the right, implying content continues off-screen
- `md:hidden`: only shows on sub-768px viewports where horizontal scroll is actually needed
- `aria-hidden="true"`: purely decorative, hidden from assistive tech

## Preserved Behavior

- All 4 columns on every viewport (no drop-to-2-col reflow, no column hiding)
- Sticky header still works inside the scroller (`sticky top-0 z-10` unchanged)
- Growth column highlighting (`bg-primary/5 -my-4 py-4 border-x border-primary/10`) unchanged
- `CategorySection` collapsible behavior untouched
- `FeatureCell` boolean/string rendering unchanged
- `comparisonData` array unchanged
- Component prop surface (`PricingComparisonTableProps`) unchanged
- Single consumer (`bento-pricing-section.tsx`) does not need updates

## Verification Results

```
overflow-x-auto: 1                                        (expected 1)
min-w-[640px]: 1                                          (expected 1)
bg-gradient-to-l from-card to-transparent: 1              (expected 1)
pointer-events-none absolute inset-y-0 right-0: 1         (expected 1)
md:hidden: 1                                              (expected >= 1)
aria-hidden="true": 1                                     (expected >= 1)
sticky top-0: 1                                           (expected 1)
rounded-xl border border-border/50 bg-card: 1             (expected 1)
grid-cols-4: 2                                            (file has exactly 2 — header + CategorySection row)
FeatureCell: 4                                            (expected >= 3)
CategorySection: 2                                        (expected >= 2)
comparisonData: 2                                         (expected >= 2)
```

## Deviations from Plan

**1. [Rule 3 - Plan spec count mismatch] `grid-cols-4` acceptance criterion**
- **Found during:** Task 1 verification
- **Issue:** Plan acceptance criterion says `grid -c "grid-cols-4" ... returns at least 3`, but the pre-change file only has 2 `grid-cols-4` usages (sticky header row + CategorySection feature row). There is no third usage to preserve.
- **Fix:** No code change needed — both existing `grid-cols-4` usages are preserved. This is a plan-spec counting error, not an implementation defect.
- **Files modified:** None (plan spec discrepancy only)

## Known Stubs

None — the change is purely presentational wrapper addition with no stub patterns.

## Threat Flags

None — pure client-side CSS/JSX change. No new network endpoints, auth paths, file access, schema changes, or trust boundaries crossed. Threat register T-36-04-01 (Tampering) and T-36-04-02 (DoS via scroll performance) both correctly dispositioned `accept` — no new event handlers, no JS listeners on scroll, only native browser overflow behavior.

## Self-Check

File exists: src/components/pricing/pricing-comparison-table.tsx — FOUND
Task 1 classes present (overflow-x-auto, min-w-[640px]) — CONFIRMED
Task 2 classes present (bg-gradient-to-l from-card to-transparent, md:hidden, aria-hidden, z-20, w-8) — CONFIRMED
Pre-existing behavior preserved (comparisonData, FeatureCell, CategorySection, grid-cols-4, sticky top-0, rounded-xl border shell) — CONFIRMED

## Self-Check: PASSED
