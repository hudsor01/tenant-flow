---
phase: 06-polish-a11y
plan: 03
subsystem: dashboard-a11y
tags: [reduced-motion, accessibility, number-ticker, animation, POLISH-08, D-04]
requires:
  - "src/hooks/use-reduced-motion.ts (canonical matchMedia hook)"
provides:
  - "Internal JS reduced-motion guard on the shared NumberTicker rAF primitive (all 16 consumers)"
affects:
  - "Every NumberTicker consumer app-wide (15 importers) now snaps to final value under prefers-reduced-motion"
tech-stack:
  added: []
  patterns:
    - "useReducedMotion() short-circuit inside an rAF useEffect (snap displayValue to `to`, no rAF scheduled)"
    - "vi.stubGlobal('matchMedia', ...) reporting reduced-motion in a unit test, with vi.unstubAllGlobals() restore"
key-files:
  created: []
  modified:
    - "src/components/ui/number-ticker.tsx"
    - "src/components/ui/__tests__/number-ticker.test.tsx"
decisions:
  - "Guard applied INSIDE the rAF effect (snap displayValue to `to`), not as a component-top early-return — keeps the <span ref={ref}> mounted so the IntersectionObserver ref stays attached"
  - "Source + branch test committed atomically per task, but both must coexist in the working tree for the pre-commit coverage gate to pass (the new branch is only covered by the new test)"
  - "Task 3 was verify-only — all chart/BlurFade/CSS reduced-motion guards already present; no edits made"
metrics:
  duration: "~10m"
  completed: "2026-06-01"
  tasks: 3
  files-modified: 2
  commits: 2
---

# Phase 6 Plan 03: NumberTicker Reduced-Motion Guard Summary

Internal JS `useReducedMotion()` guard added to the shared `NumberTicker` rAF primitive so all 16 app-wide consumers snap to their final value (no `requestAnimationFrame` tween) under `prefers-reduced-motion: reduce`; charts + BlurFade + the CSS media-query guard were confirmed already in place (verify-only).

## What Was Built

**Task 1 — Internal reduced-motion guard on NumberTicker (`feat`, commit `cf8fd362e`)**
- `src/components/ui/number-ticker.tsx`:
  - Added `import { useReducedMotion } from "#hooks/use-reduced-motion";` (line 11).
  - Read `const reducedMotion = useReducedMotion();` next to the `displayValue` state (line 35).
  - Prepended a short-circuit at the top of the existing rAF `useEffect` (lines 49-52), BEFORE the `if (!hasIntersected) return;` gate: when `reducedMotion` is true, `setDisplayValue(to)` then `return;` — no `requestAnimationFrame` scheduled.
  - Added `reducedMotion` to the effect dependency array → `[reducedMotion, hasIntersected, from, to, delay, duration]` (line 93).
  - The motion-on rAF body, the `<span ref={ref}>` render, and the `Intl.NumberFormat` formatting are byte-for-byte unchanged. The component still renders its `<span ref={ref}>` in both branches so the IntersectionObserver ref stays attached (no component-top early-return).

**Task 2 — Reduced-motion branch test (`test`, commit `2fad0d90c`)**
- `src/components/ui/__tests__/number-ticker.test.tsx`:
  - Added one `it(...)` ("snaps to the final value immediately under prefers-reduced-motion (D-04)").
  - Stubs `matchMedia` via `vi.stubGlobal` to report `prefers-reduced-motion` as matching, renders `<NumberTicker value={42} duration={2000} />`, asserts `42` is in the document with NO timer advance (the snap commits when the effect runs; no rAF).
  - Calls `vi.unstubAllGlobals()` at the end so the stub does not leak into the fake-timer motion-on tests.
  - The 6 pre-existing tests are unchanged and stay green. Suite is now 7 tests, all passing.

**Task 3 — Verify chart `isAnimationActive` + BlurFade reduced-motion guards (verify-only, no commit)**
- No edits — all guards confirmed pre-existing. See the four-source coverage table below.

## Four Animation-Source Reduced-Motion Coverage (POLISH-08 success criterion #5)

| Source | Guard | File:line | Status |
|--------|-------|-----------|--------|
| NumberTicker (rAF primitive) | `if (reducedMotion) { setDisplayValue(to); return; }` inside the rAF effect | `src/components/ui/number-ticker.tsx:49-52` (dep array line 93) | FIXED this plan (Task 1) — covers all 16 consumers |
| RevenueAreaChart (Recharts) | `isAnimationActive={!reducedMotion}` (`reducedMotion = useReducedMotion()` at line 150) | `src/components/dashboard/components/revenue-area-chart.tsx:240` | Pre-existing ✓ |
| OccupancyDonutChart (Recharts) | `isAnimationActive={!reducedMotion}` (`reducedMotion = useReducedMotion()` at line 51) | `src/components/dashboard/components/occupancy-donut-chart.tsx:108` | Pre-existing ✓ |
| BlurFade (CSS transition reveal) | `shouldReduceMotion` branch zeroes `transitionDelay` and swaps `stateClasses` | `src/components/ui/blur-fade.tsx:87,90,116` | Pre-existing ✓ |
| CSS `@media (prefers-reduced-motion)` | zeroes CSS animation/transition durations app-wide | `src/app/globals.css:1151` | Pre-existing ✓ (cannot stop a JS rAF chain — that is why the NumberTicker JS guard was mandatory) |

**KPI bento-row BlurFade bypass:** `src/components/dashboard/components/kpi-bento-row.tsx:355-361` renders a raw `<KpiTile>` (no BlurFade wrapper) when `reducedMotion` is true, only wrapping in `<BlurFade>` on the motion-on branch. The `KpiNumberTicker` defense-in-depth wrapper (lines 54-81) remains; after this plan it is redundant with the primitive guard but is left in place (CONTEXT D-04 — do not remove in a way that loses a guard).

## Pitfall-4 Note (DataTable BlurFade — for the manual reduced-motion sweep)

`src/components/dashboard/components/portfolio-data-table.tsx:103` wraps the table in `<BlurFade delay={0.4} inView>` and does NOT bypass BlurFade under reduced motion (unlike the kpi-bento-row). Under reduced motion the `BlurFade` `shouldReduceMotion` branch zeroes the transition delay and applies the visible state classes, so the table still renders (becomes `opacity-100` once `inView` flips on intersection). No code was added — per the plan this is flagged for the manual reduced-motion sweep ONLY; add code later solely if the manual sweep shows the table rendering blank under reduced motion.

## NumberTicker Blast Radius (Pitfall 2)

`grep -rln "NumberTicker" src` returns 17 matches: the primitive (`number-ticker.tsx`) + its test, plus 15 consumer files. All consumers inherit the internal reduced-motion guard for free (no per-call-site change). Consumers:
`financial-overview-stats.tsx`, `analytics-stat-cards.tsx`, `performance-stat-cards.tsx`, `financials-summary-stats.tsx`, `overview-stats-grid.tsx`, `kpi-bento-row.tsx`, `kpi-helpers.ts`, `balance-sheet.tsx`, `cash-flow.tsx`, `income-statement-summary-stats.tsx`, `maintenance-view.client.tsx`, `profile-card.tsx`, `reports-stats-row.tsx`, `stats-showcase.tsx`, `tenant-stats.tsx`.

## Verification Results

- `grep -q 'useReducedMotion'` + `grep -q 'if (reducedMotion)'` on `number-ticker.tsx` → both present.
- `bun run typecheck` → passes (TYPECHECK-OK).
- `bun run test:unit src/components/ui/__tests__/number-ticker.test.tsx` → **7 passing** (6 existing + 1 new reduced-motion branch). The pre-commit hook ran the full coverage suite for both task commits and passed.
- Task 3 grep: `isAnimationActive={!reducedMotion}` present in both charts; `shouldReduceMotion` present in `blur-fade.tsx` → `GUARDS-PRESENT`.

## Deviations from Plan

None affecting scope. Two process notes (NOT scope deviations):

1. **Commitlint body-line-length** — the first commit attempt for Task 1 was rejected by the `commit-msg` commitlint hook (`body-max-line-length` 100). Re-wrapped the body lines and re-committed; no content/scope change.
2. **Pre-commit coverage gate sequencing** — the pre-commit hook runs the full Vitest suite with `--coverage` and per-file thresholds against the WORKING TREE. The new `if (reducedMotion)` branch is only exercised by the Task-2 test, so a commit of `number-ticker.tsx` alone (before the test existed) would have failed the per-file coverage threshold. Resolved by authoring the Task-2 test in the working tree before committing Task 1, so both files coexist in the working tree for the coverage run, while still landing as two atomic commits (source = `feat`, test = `test`) per the plan's task structure. This honored the known-gotcha note (ran `bun run test:unit <path>` without the redundant `--run` flag).

## Self-Check: PASSED

- FOUND: `src/components/ui/number-ticker.tsx`
- FOUND: `src/components/ui/__tests__/number-ticker.test.tsx`
- FOUND commit: `cf8fd362e` (feat — Task 1)
- FOUND commit: `2fad0d90c` (test — Task 2)
- Source guard lines confirmed: import (11), hook read (35), short-circuit (49-52), dep array (93).
