---
phase: 03-kpi-bento-row
plan: 01
subsystem: dashboard
tags: [kpi, sparkline, recharts, a11y, design-tokens]
requirements: [KPI-05]
dependency_graph:
  requires:
    - "src/components/ui/chart.tsx (ChartContainer, ChartConfig)"
    - "src/types/analytics.ts (TimeSeriesDataPoint, MetricTrend)"
    - "recharts (Area, AreaChart)"
  provides:
    - "KpiSparkline component (KPI-05)"
    - "KpiSparklineProps interface"
    - "formatTrendPercent helper"
    - "sparklineConfigForTrend helper"
    - "KpiTileConfig type (for Plan 03-02 orchestrator)"
  affects: []
tech_stack:
  added: []
  patterns:
    - "ChartContainer.theme map for trend-direction → status-token resolution"
    - "Recharts mock data-attr forwarding for prop-level test assertions"
key_files:
  created:
    - src/components/dashboard/components/kpi-helpers.ts
    - src/components/dashboard/components/kpi-sparkline.tsx
    - src/components/dashboard/components/__tests__/kpi-helpers.test.ts
    - src/components/dashboard/components/__tests__/kpi-sparkline.test.tsx
  modified:
    - src/test/mocks/recharts.tsx
decisions:
  - "Use ChartConfig.theme map + scoped `--color-spark` CSS variable for sparkline color — no hex / oklch literal in JSX (03-UI-SPEC § 6.2)"
  - "U+2212 typographic minus (NOT hyphen-minus) in formatTrendPercent — 03-UI-SPEC § 4.3 honesty rule"
  - "Round-to-zero values emit `0%` with no sign (negative-near-zero and positive-near-zero treated identically)"
  - "Extend project-wide recharts mock to forward Area's strokeWidth / isAnimationActive / dot / activeDot as data attributes (backwards-compatible widening) so Plan 03-01 can pin the no-animation contract at the unit-test layer"
metrics:
  duration: "00:33:51"
  completed: 2026-05-23
---

# Phase 03 Plan 01: KpiSparkline + Pure Helpers Summary

Leaf-level Phase 3 primitives — `KpiSparkline` (KPI-05) + pure helpers
(`formatTrendPercent`, `sparklineConfigForTrend`, `KpiTileConfig`) — shipped
with full Vitest pinning, color-token discipline locked through
`ChartContainer`'s scoped CSS-variable machinery, and zero design-token drift.
Plan 03-02 can now import stable contracts instead of inventing primitives
mid-orchestration.

## Task-by-Task Evidence

### Task 1 — kpi-helpers.ts + pinning test

**Files created:**
- `src/components/dashboard/components/kpi-helpers.ts`
- `src/components/dashboard/components/__tests__/kpi-helpers.test.ts`

**Exports:**
- `formatTrendPercent(percentChange: number): string`
- `sparklineConfigForTrend(trend: "up" | "down" | "stable"): ChartConfig`
- `interface KpiTileConfig`

**Behavior pinned (8 assertions):**

| Case | Input | Expected output |
|------|-------|-----------------|
| Positive trend | `12.4` | `"+12%"` |
| Negative trend | `-3.2` | `"−3%"` (U+2212, asserted via `charCodeAt(0)`) |
| Exact zero | `0` | `"0%"` (first char is digit `0`) |
| Positive rounds to zero | `0.4` | `"0%"` (no sign) |
| Negative rounds to zero | `-0.4` | `"0%"` (no sign) |
| `sparklineConfigForTrend("up")` | — | `theme.{light,dark}` === `"var(--color-success)"` |
| `sparklineConfigForTrend("down")` | — | `theme.{light,dark}` === `"var(--color-warning)"` |
| `sparklineConfigForTrend("stable")` | — | `theme.{light,dark}` === `"var(--color-muted-foreground)"` |

**Test run:**
```
$ bunx vitest --run --project unit src/components/dashboard/components/__tests__/kpi-helpers.test.ts
 Test Files  1 passed (1)
      Tests  8 passed (8)
   Duration  293ms
```

**Typecheck:** `bunx tsc --noEmit` → exit 0 (after fixing one
`noUncheckedIndexedAccess` narrowing — three `if (!spark || …)` guards added
to the test).

**Grep gates:**
```
$ grep -nE 'as unknown as|\bany\b' src/components/dashboard/components/kpi-helpers.ts
(no matches)
```

**Commit:** `2f0e7f328` — `feat(03-01): add kpi-helpers (formatTrendPercent + sparklineConfigForTrend + KpiTileConfig)`

### Task 2 — KpiSparkline component + pinning test

**Files created:**
- `src/components/dashboard/components/kpi-sparkline.tsx`
- `src/components/dashboard/components/__tests__/kpi-sparkline.test.tsx`

**Files modified:**
- `src/test/mocks/recharts.tsx` — extended the project-wide `Area` mock to
  forward `strokeWidth` / `isAnimationActive` / `dot` / `activeDot` as
  `data-*` attributes (additive only — every existing test that reads
  `data-fill` / `data-stroke` / `data-key` keeps working). This was the
  cleanest path to pin the no-animation contract without standing up a real
  SVG measurement pass under jsdom.

**Component contract pinned (4 assertions):**

| Case | Assertion |
|------|-----------|
| `role="img"` + aria-label | `screen.getByRole("img", { name: /Revenue trend over the last 30 days/ })` succeeds; outer element is a `<div>` carrying the spec's three classes (`[grid-column:1/-1]`, `h-16`, `w-full`) |
| Gradient id per trend | `container.querySelector("linearGradient")?.getAttribute("id") === "spark-fill-down"` for `trend="down"` |
| No hex / oklch / rgb literal in DOM | After stripping `spark-fill-{up,down,stable}` substrings, `container.innerHTML` matches none of `/#(?:[0-9a-fA-F]{3,4}|…)/`, `/oklch\s*\(/`, `/rgba?\s*\(/` |
| Area no-animation forwarding | `data-is-animation-active="false"`, `data-dot="false"`, `data-active-dot="false"`, `data-stroke-width="1.5"`, `data-stroke="var(--color-spark)"`, `data-key="value"`, `data-fill="url(#spark-fill-up)"` |

**Test run:**
```
$ bunx vitest --run --project unit src/components/dashboard/components/__tests__/kpi-sparkline.test.tsx
 Test Files  1 passed (1)
      Tests  4 passed (4)
   Duration  414ms
```

**rAF gate handled:** `ChartContainer` defers `<ResponsiveContainer>` mount
until `requestAnimationFrame` fires (see `chart.tsx:71-92`), so the test
uses `await waitFor(() => …)` to poll until the deferred subtree paints
before reading the DOM. This is the standard fix and matches the
chart-container's intentional one-frame delay (battle-test session 8 fix
for "width(-1)/height(-1)" SVG warnings).

**Grep gates:**
```
$ grep -nE 'isAnimationActive=\{false\}' src/components/dashboard/components/kpi-sparkline.tsx
62:                                              isAnimationActive={false}
(matches exactly once — the JSX prop; doc comment paraphrased to avoid double-match)

$ grep -nE 'style=\{\{|\bany\b|as unknown as' src/components/dashboard/components/kpi-sparkline.tsx src/components/dashboard/components/__tests__/kpi-sparkline.test.tsx
(no matches)
```

**Commit:** `737f14eb2` — `feat(03-01): add KpiSparkline axis-less Recharts area sparkline (KPI-05)`

### Task 3 — Four-gate verification sweep

| # | Gate | Command | Result |
|---|------|---------|--------|
| 1 | Design-token drift | `bunx vitest --run --project unit src/app/__tests__/design-token-drift.test.ts` | **2700 / 2700 pass** (no new violations across `src/components/**`) |
| 2 | TypeScript strict | `bunx tsc --noEmit` | **exit 0** |
| 3 | Biome lint (4 new files) | `bunx biome check src/components/dashboard/components/kpi-{sparkline,helpers}.{ts,tsx} src/components/dashboard/components/__tests__/kpi-{sparkline,helpers}.test.{ts,tsx}` | **Checked 4 files in 4ms. No fixes applied. exit=0** |
| 4 | Both new test files | `bunx vitest --run --project unit src/components/dashboard/components/__tests__/kpi-helpers.test.ts src/components/dashboard/components/__tests__/kpi-sparkline.test.tsx` | **12 / 12 pass** (8 helper + 4 sparkline) |

## key_links Verification

| Link claim (from PLAN frontmatter) | Status |
|------------------------------------|--------|
| `kpi-sparkline.tsx` imports `ChartContainer` + `ChartConfig` from `#components/ui/chart` | ✅ `import { ChartContainer } from "#components/ui/chart"` (kpi-helpers.ts imports the `ChartConfig` type) |
| `kpi-sparkline.tsx` imports `Area`, `AreaChart` from `recharts` | ✅ `import { Area, AreaChart } from "recharts"` |
| `kpi-helpers.ts` imports `MetricTrend` + `TimeSeriesDataPoint` from `#types/analytics` | ✅ `import type { MetricTrend, TimeSeriesDataPoint } from "#types/analytics"` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Drop `@vitest-environment node` directive on helpers test**
- **Found during:** Task 1 first test run
- **Issue:** Vitest tried to honor the per-file `node` environment, but the
  project-wide unit-setup file (`src/test/unit-setup.ts`) unconditionally
  touches `document.createElement` at module load time. The mismatch threw
  `ReferenceError: document is not defined` before any test ran.
- **Fix:** Removed the `@vitest-environment node` line. The default `jsdom`
  environment for the unit project is the canonical project setup — pure
  helper tests run fine inside jsdom.
- **Files modified:** `src/components/dashboard/components/__tests__/kpi-helpers.test.ts`
- **Commit:** Inline in the Task 1 commit `2f0e7f328`

**2. [Rule 3 — Blocking] `noUncheckedIndexedAccess` narrowing in helpers test**
- **Found during:** Task 1 typecheck
- **Issue:** `config.spark` access on `ChartConfig` index signature returned
  `T | undefined` under `noUncheckedIndexedAccess`. Three downstream property
  accesses (`spark.theme.light` etc.) blew up at typecheck even though the
  helper always populates the key.
- **Fix:** Added `if (!spark || …)` triple-guard at the head of each test
  case (already had the `"theme" in spark` union-narrowing guard; just added
  the `!spark` precondition). No `as` cast, no `any`.
- **Files modified:** `src/components/dashboard/components/__tests__/kpi-helpers.test.ts`
- **Commit:** Inline in the Task 1 commit `2f0e7f328`

**3. [Rule 3 — Blocking] Extend project-wide recharts mock to forward 4 Area props**
- **Found during:** Task 2 component-test design
- **Issue:** The `vitest.config.ts` resolver aliases `recharts` to
  `src/test/mocks/recharts.tsx` at the Vite-resolver layer (not via
  `vi.mock`), so a per-test `vi.mock("recharts", …)` override would not
  win — the alias already shorted out the import. The existing mock's
  `Area` component only forwarded `dataKey / fill / stroke / name` — none
  of the four props the spec required for the no-animation pin.
- **Fix:** Widened the mock's `Area` signature to additionally accept
  `strokeWidth`, `isAnimationActive`, `dot`, `activeDot`, each forwarded
  as a `data-*` attribute when the prop is present. Backwards-compatible
  (every existing reader still gets `data-fill` / `data-stroke` /
  `data-key`). Verified by running the full design-token-drift gate (2700
  tests) and full typecheck after the change — no regressions.
- **Files modified:** `src/test/mocks/recharts.tsx`
- **Commit:** Bundled with the Task 2 component commit `737f14eb2`

**4. [Style — Biome auto-format] Reformat sparkline JSX**
- **Found during:** Task 2 first biome check
- **Issue:** Biome wanted `<linearGradient …>` attributes on a single line
  (the spec's multi-line form was over the line cap on the resolved JSX
  width).
- **Fix:** Ran `bunx biome check --write` over both new component files;
  contract unchanged — only whitespace.
- **Files modified:** `src/components/dashboard/components/kpi-sparkline.tsx`,
  `src/components/dashboard/components/__tests__/kpi-sparkline.test.tsx`
- **Commit:** Inline in the Task 2 commit `737f14eb2`

**5. [Style] Paraphrase docblock to keep `isAnimationActive={false}` grep-count == 1**
- **Found during:** Task 2 acceptance-criteria grep
- **Issue:** The component-file docblock initially repeated the literal
  `isAnimationActive={false}` string, which made the acceptance grep
  match TWICE instead of once.
- **Fix:** Paraphrased the docblock to "animation disabled on the Area"
  so only the actual JSX prop matches the grep pattern.
- **Files modified:** `src/components/dashboard/components/kpi-sparkline.tsx`
- **Commit:** Inline in the Task 2 commit `737f14eb2`

### Rule 4 (Architectural) Issues
None.

### Auth gates
None.

## Known Stubs
None.

## Self-Check

| Claim | Verification | Result |
|-------|--------------|--------|
| `src/components/dashboard/components/kpi-helpers.ts` exists | `[ -f … ]` | FOUND |
| `src/components/dashboard/components/kpi-sparkline.tsx` exists | `[ -f … ]` | FOUND |
| `src/components/dashboard/components/__tests__/kpi-helpers.test.ts` exists | `[ -f … ]` | FOUND |
| `src/components/dashboard/components/__tests__/kpi-sparkline.test.tsx` exists | `[ -f … ]` | FOUND |
| Commit `2f0e7f328` (Task 1) on branch | `git log --oneline -5` | FOUND |
| Commit `737f14eb2` (Task 2) on branch | `git log --oneline -5` | FOUND |
| Both test files green | `bunx vitest --run --project unit src/components/dashboard/components/__tests__/kpi-{helpers,sparkline}.test.{ts,tsx}` | 12 / 12 pass |
| Typecheck clean | `bunx tsc --noEmit` | exit 0 |
| Biome lint clean over new files | `bunx biome check src/components/dashboard/components/kpi-{sparkline,helpers}.{ts,tsx} src/components/dashboard/components/__tests__/kpi-{sparkline,helpers}.test.{ts,tsx}` | exit 0 |
| Design-token drift gate clean | `bunx vitest --run --project unit src/app/__tests__/design-token-drift.test.ts` | 2700 / 2700 pass |

## Self-Check: PASSED
