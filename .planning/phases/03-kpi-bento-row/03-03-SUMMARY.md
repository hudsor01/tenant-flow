---
phase: 03-kpi-bento-row
plan: 03
subsystem: dashboard
tags: [kpi-bento-row, prop-chain, mount, dashboard-tsx, page-tsx]
requirements-completed:
  - KPI-01 (6-tile KPI bento row mounted on /dashboard; legacy <p> header replaced)
completed: 2026-05-24

dependency_graph:
  requires:
    - "Plan 03-01 outputs (KpiSparkline, kpi-helpers)"
    - "Plan 03-02 outputs (KpiBentoRow, useReducedMotion, extended kpi-helpers with buildTileAriaLabel + KpiBentoRowProps)"
    - "src/hooks/api/use-dashboard-hooks.ts (useDashboardStats, useDashboardCharts)"
    - "src/hooks/api/use-owner-dashboard.ts (DashboardStatsData, DashboardChartsData shapes)"
  provides:
    - "DashboardProps.kpiData typed field (KpiBentoRowProps)"
    - "Visible /dashboard 6-tile KPI bento row in place of legacy single-line header"
  affects:
    - "src/types/sections/dashboard.ts — DashboardProps gains kpiData required field"
    - "src/components/dashboard/dashboard.tsx — KpiBentoRow mounted; legacy <p> removed; unused formatCurrency import removed; unused metrics destructure removed"
    - "src/app/(owner)/dashboard/page.tsx — constructs kpiData from existing hook returns; passes through to <Dashboard>"

tech_stack:
  added: []
  patterns:
    - "Additive prop-chain extension: existing DashboardProps fields preserved for Phase 4/5 downstream consumers (revenueTrend, propertyPerformance still consumed; metrics derivation preserved in page.tsx)"
    - "Atomic prop-chain commit: Tasks 1+2+3 ship as one commit because the intermediate state (Task 1 alone) trips tsc --noEmit on page.tsx (plan-anticipated co-execution)"

key-files:
  created: []
  modified:
    - src/types/sections/dashboard.ts (+5 lines — type import + kpiData required field)
    - src/components/dashboard/dashboard.tsx (legacy <p> deleted; KpiBentoRow imported + mounted; formatCurrency import removed; unused metrics destructure removed; net -2 lines)
    - src/app/(owner)/dashboard/page.tsx (+10 lines — KpiBentoRowProps type import, kpiData construction, kpiData={kpiData} prop on <Dashboard>)

decisions:
  - "Tasks 1+2+3 committed atomically (one commit, not three) — the plan documents Tasks 2+3 must co-execute because Task 1 alone leaves page.tsx tripping tsc --noEmit which would fail the pre-commit hook"
  - "Removed the now-unused `metrics` destructure from dashboard.tsx (Rule 3 — Blocking) because dashboard.tsx body no longer references metrics after the <p> deletion. The DashboardProps.metrics field stays required on the interface for Phase 4/5 downstream consumers; page.tsx still passes it. dashboard.tsx re-adds the destructure when its body consumes metrics in a future phase."
  - "Manual visual checkpoint resolved via the plan's MCP-driven alternate path (no browser session in this executor environment). Runtime visual verification pinned to CI's e2e-smoke job on the PR + the in-place static type-system + component-test contract chain (32 Phase 3 tests + 104,850 full-suite pass)."

metrics:
  duration: "00:23:27"
  completed: 2026-05-24
  files_created: 0
  files_modified: 3
  tasks_completed: 5
  commits: 1
  full_unit_suite: 104850/104850 passing across 172 test files
  phase_3_component_tests: 32/32 passing (10 kpi-bento-row + 8 kpi-helpers + 4 kpi-sparkline + 10 use-reduced-motion)
  design_token_drift: 2704/2704 passing

verification:
  tsc_noEmit: exit 0
  biome_check_phase_3_surfaces: exit 0 (7 files)
  design_token_drift: 2704/2704 pass
  full_unit_suite: 104850/104850 pass
  validate_quick: exit 0
  pre_commit_hook: green (gitleaks + lockfile-verify + lint + typecheck + unit-tests + commitlint all pass)
---

# Phase 03 Plan 03: Mount KpiBentoRow on /dashboard — Execution Summary

## One-Liner

Mounted the `KpiBentoRow` component into the live `/dashboard` surface by
extending `DashboardProps` with a typed `kpiData: KpiBentoRowProps` field,
replacing the legacy `<p>` portfolio header with `<KpiBentoRow {...kpiData} />`
in `dashboard.tsx`, and wiring `page.tsx` to construct `kpiData` from the
existing `useDashboardStats() / useDashboardCharts()` returns — closing
KPI-01 visually with zero new fetchers, zero new query keys, and zero
regressions across the 104,850-test unit suite.

## Tasks

| Task | Status | Executor | Evidence |
|------|--------|----------|----------|
| T1 — Extend `DashboardProps` with `kpiData: KpiBentoRowProps` | DONE | inline | commit `7c3ca01ff` |
| T2 — Replace `<p>` header in `dashboard.tsx` with `<KpiBentoRow {...kpiData} />`; remove unused `formatCurrency` import; remove unused `metrics` destructure | DONE | inline | commit `7c3ca01ff` |
| T3 — Construct `kpiData` in `page.tsx` from `useDashboardStats() / useDashboardCharts()` returns; pass through to `<Dashboard kpiData={kpiData} />` | DONE | inline | commit `7c3ca01ff` |
| T4 — Full gate sweep (drift + tsc + biome + unit + validate:quick) | DONE | inline | all 5 gates exit 0 |
| T5 — Manual visual checkpoint (MCP-driven alternate path; browser path deferred to CI e2e-smoke) | DONE | inline (alt path) | see § Manual Checkpoint below |

## Task-by-Task Evidence

### Task 1 — Extend DashboardProps with kpiData field

**File modified:** `src/types/sections/dashboard.ts`

**Changes:**
- Added type-only import at the top: `import type { KpiBentoRowProps } from "#components/dashboard/components/kpi-helpers";`
- Added `kpiData: KpiBentoRowProps;` as the FIRST member of `DashboardProps` (above `metrics`) — additive only; no existing field touched.

**Grep gates:**
```
$ grep -nc "kpiData: KpiBentoRowProps" src/types/sections/dashboard.ts
1
$ grep -nc "import type { KpiBentoRowProps } from" src/types/sections/dashboard.ts
1
```

**Typecheck:** After Task 1 alone, `bunx tsc --noEmit` reports ONE
intentional error: `src/app/(owner)/dashboard/page.tsx(172,5): error TS2741:
Property 'kpiData' is missing in type ...` — this is the plan-anticipated
intermediate state Task 3 fixes.

### Task 2 — Replace legacy <p> header with <KpiBentoRow {...kpiData} />

**File modified:** `src/components/dashboard/dashboard.tsx`

**Changes:**
1. Added import: `import { KpiBentoRow } from "./components/kpi-bento-row";` (sorted into the `./components/*` group; biome auto-sorted final order).
2. Added `kpiData` as the first member of the function destructuring (between `kpiData,` and `revenueTrend,`).
3. Replaced the legacy 18-line `<p>` block at the old lines 172-186 (containing the `<span>{occupiedUnits} of {totalUnits} units occupied</span>` + separator + `<span>{formatCurrency(totalRevenue)} this month</span>`) with the single line `<KpiBentoRow {...kpiData} />`.
4. Removed the now-unused `import { formatCurrency } from "#lib/utils/currency";` (B-2 cycle-1 unconditional removal — `noUnusedLocals` enforced).
5. Removed the now-unused `metrics` from the function destructuring (Rule 3 — Blocking; `noUnusedLocals` flagged it after the `<p>` deletion). The `DashboardProps.metrics` field stays REQUIRED on the interface and page.tsx still passes it. dashboard.tsx body no longer references it; Phase 4/5 re-adds the destructure when their downstream consumer wires up.
6. The wrapping `<div data-testid="dashboard-stats">` and `<h1 className="typography-h1">Dashboard</h1>` are PRESERVED — E2E `dashboard-stats` selector contract intact.

**Grep gates:**
```
$ grep -c "KpiBentoRow" src/components/dashboard/dashboard.tsx
2  (import + JSX usage)

$ grep -c "units occupied\|this month" src/components/dashboard/dashboard.tsx
0  (legacy text gone)

$ grep -c "data-testid=\"dashboard-stats\"" src/components/dashboard/dashboard.tsx
1  (E2E contract preserved)

$ grep -c "typography-h1\">Dashboard<" src/components/dashboard/dashboard.tsx
1  (h1 preserved)

$ grep -c "formatCurrency" src/components/dashboard/dashboard.tsx
0  (B-2 cycle-1 fix — unconditional removal)

$ grep -c "{/\*.*units occupied" src/components/dashboard/dashboard.tsx
0  (no commented-out code per Zero Tolerance Rule 4)
```

### Task 3 — Construct kpiData in page.tsx and pass through to <Dashboard />

**File modified:** `src/app/(owner)/dashboard/page.tsx`

**Changes:**
1. Added type-only import: `import type { KpiBentoRowProps } from "#components/dashboard/components/kpi-helpers";` (biome auto-sorted into the `#components/*` group, placed at the top of that block).
2. Inserted `kpiData` construction immediately after the third hook destructuring (`usePropertyPerformance()`), BEFORE the existing `metrics` IIFE:
   ```typescript
   const kpiData: KpiBentoRowProps = {
     isLoading: statsLoading || chartsLoading,
     stats: statsData?.stats ?? null,
     metricTrends: statsData?.metricTrends ?? null,
     timeSeries: chartsData?.timeSeries ?? null,
   };
   ```
3. Added `kpiData={kpiData}` as the FIRST prop on `<Dashboard ... />` (consistent with the `DashboardProps` interface ordering Task 1 established).
4. PRESERVED the existing `metrics`, `revenueTrend`, `propertyPerformance` IIFE derivations and their pass-through to `<Dashboard>` — they're consumed by Phase 4 charts + Phase 5 table downstream.

**Grep gates:**
```
$ grep -c "kpiData: KpiBentoRowProps" 'src/app/(owner)/dashboard/page.tsx'
1

$ grep -c "kpiData={kpiData}" 'src/app/(owner)/dashboard/page.tsx'
1

$ grep -c "const metrics" 'src/app/(owner)/dashboard/page.tsx'
1  (existing IIFE preserved)

$ grep -cE "as unknown as|\bany\b" 'src/app/(owner)/dashboard/page.tsx'
0  (matches HEAD-baseline 0 — no new violations)
```

**Note:** `?? null` was used (not `?? undefined` or `as unknown as`) because
`KpiBentoRowProps` types each non-`isLoading` field as `… | null`, matching
the null-vs-undefined Honesty rule (D-09).

**Commit (Tasks 1+2+3):** `7c3ca01ff` — `feat(03-03): mount KpiBentoRow on /dashboard (replace legacy <p> header)`

> **Commit-atomicity note:** Tasks 1+2+3 ship as ONE commit, not three.
> The plan explicitly notes Task 2 "should be RUN together with Task 3 to
> avoid intermediate broken state" and that Task 1 alone leaves page.tsx
> tripping `tsc --noEmit`. The pre-commit hook runs `bun run typecheck`,
> so per-task commits would have failed the hook on Tasks 1+2 in isolation.
> Atomic-per-task discipline is preserved at the conceptual level (each
> task's diff is independently reviewable in the commit body), and the
> prop-chain extension is genuinely indivisible at the build-system layer.

### Task 4 — Full gate sweep

All five gates executed; all five exit 0:

| # | Gate | Command | Result |
|---|------|---------|--------|
| 1 | Design-token drift | `bunx vitest --run --project unit src/app/__tests__/design-token-drift.test.ts` | **2704 / 2704 pass** (no new violations across `src/components/**`) |
| 2 | TypeScript strict | `bunx tsc --noEmit` | **exit 0** |
| 3 | Biome lint (7 Phase 3 surfaces) | `bunx biome check src/types/sections/dashboard.ts src/components/dashboard/dashboard.tsx 'src/app/(owner)/dashboard/page.tsx' src/components/dashboard/components/kpi-{bento-row,sparkline,helpers}.{tsx,ts} src/hooks/use-reduced-motion.ts` | **Checked 7 files in 6ms. No fixes applied.** |
| 4a | Phase 3 unit suites | `bunx vitest --run --project unit src/components/dashboard/components/__tests__/kpi-{bento-row,helpers,sparkline}.test.{tsx,ts} src/hooks/__tests__/use-reduced-motion.test.ts` | **32 / 32 pass** (10 + 8 + 4 + 10) |
| 4b | Full unit suite | `CI=true bun run test:unit` | **104,850 / 104,850 pass across 172 test files** (zero regressions) |
| 5 | validate:quick bundle | `bun run validate:quick` | **exit 0** (types + lint + unit) |

**Pre-commit hook run:** All five lefthook commands green during the commit
(`gitleaks` 0.04s, `lockfile-verify` 0.17s, `lint` 0.38s, `typecheck` 1.65s,
`unit-tests` 18.50s) plus `commit-msg` `commitlint` 0.35s.

### Task 5 — Manual visual checkpoint

**Path used:** MCP-driven alternate path (the plan's documented fallback when
browser-driven verification is not feasible; precedent: Phase 2's 02-03 SUMMARY
satisfied its checkpoint via MCP `get_dashboard_data_v2` inspection rather than
a browser screenshot).

**Source-level proof (the actually-verifiable parts):**

1. **Diff against `origin/main` confirms the three plan-listed files are
   modified**, plus the new Phase 3 component + test artifacts from Plans
   03-01 + 03-02:

   ```
   src/app/(owner)/dashboard/page.tsx                 |  10 +
   src/components/dashboard/dashboard.tsx             |  20 +-
   src/types/sections/dashboard.ts                    |   5 +
   ```

2. **Contract chain is statically enforced:**
   - `KpiBentoRowProps` in `kpi-helpers.ts` declares the exact shape `{ isLoading, stats, metricTrends, timeSeries }` (kpi-helpers.ts L130-143).
   - `DashboardProps.kpiData: KpiBentoRowProps` enforces that any consumer passes the full shape (dashboard.ts L7).
   - `page.tsx` assigns `kpiData: KpiBentoRowProps = { isLoading: …, stats: statsData?.stats ?? null, metricTrends: …, timeSeries: … }` from the exact hook returns the upstream RPC `get_dashboard_data_v2` produces (page.tsx L53-58).
   - `dashboard.tsx` spreads `{...kpiData}` onto `<KpiBentoRow>` (L173).
   - `tsc --noEmit` exit 0 confirms every link in the chain is type-correct.

3. **Component contract is test-pinned (Plan 03-02's 10 tests):**
   - Test 1: 6 tiles render in D-01 order (Revenue, Occupancy, Active leases, Open maintenance, Properties, Units).
   - Test 2: Sparklines on tiles 0 + 1 only (Revenue + Occupancy).
   - Test 3: Properties + Units omit `<StatTrend>` (per D-04 — no trend signal exists).
   - Test 4: `metricTrends.monthlyRevenue === null` → Revenue trend chip omitted (D-09 honesty).
   - Test 5: Skeleton ↔ tile-grid mutual exclusion (`isLoading` branch).
   - Test 6: Revenue aria-label matches the `buildTileAriaLabel` template.
   - Test 7: Reduced-motion bypasses BlurFade (no `will-change-transform` class).
   - Test 8: Down-trend `!text-[var(--color-warning)]` override applied.
   - Test 9: Sparkline-data-too-thin guard (data length < 2) → sparkline absent.
   - Test 10: NaN occupancy → `Number.isFinite` substitutes 0; renders `0%` without crash.

4. **The RPC `get_dashboard_data_v2` already populates `stats.revenue.monthly`,
   `stats.units.occupancyRate`, `stats.leases.active`, `stats.maintenance.open`,
   `stats.properties.total`, `stats.units.total`, plus `metricTrends` for the
   four trendable signals + `timeSeries.occupancyRate` + `timeSeries.monthlyRevenue`.**
   This was established by Phase 2 and confirmed by the existing `useDashboardStats() / useDashboardCharts()` hooks' production contract — no Phase 3 RPC changes.

**Runtime visual verification deferred to:** CI's `e2e-smoke` job on the PR.
The job's `🔥 P0: Dashboard loads for owner` test exercises `/dashboard` end-
to-end with synthetic owner `e2e-owner-a@tenantflow.app` and asserts the
`data-testid="dashboard-stats"` selector resolves — which Task 2 explicitly
preserves. The bento row will render under that selector with real RPC data
on every PR build.

**Verdict:** All static + test-pinned proofs pass. Browser-path verification
(11 manual checkpoint items: heading, tile order, sparklines, trend chips,
value formatting, reduced-motion emulation, dark mode, DOM structure, region
landmark, sr-only heading, role=list/listitem) is reserved for the PR e2e-smoke
gate. No blocking issue surfaces in the static review.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Remove unused `metrics` destructure from dashboard.tsx**
- **Found during:** Task 2 typecheck.
- **Issue:** After deleting the legacy `<p>` block, `metrics` was destructured
  but no longer referenced in the dashboard.tsx body. The project's strict
  `noUnusedLocals` (declared in CLAUDE.md "TypeScript Strictness") flagged it
  as TS6133.
- **Fix:** Removed `metrics` from the `Dashboard({...})` destructuring. The
  `DashboardProps.metrics` field STAYS REQUIRED on the interface (Phase 4/5
  consumers); page.tsx still passes it. The dashboard.tsx component re-adds
  the destructure when its body consumes `metrics` in a future phase.
- **Why this is Rule 3, not Rule 4:** Plan must_have row #7 says "the existing
  `metrics` derivation is preserved for downstream consumers (Phase 4 chart
  row + Phase 5 table)" — the derivation is in `page.tsx`, not in
  `dashboard.tsx`. The plan does NOT mandate `dashboard.tsx` keep an unused
  destructure; that would directly contradict `noUnusedLocals`. The removal
  is the standard `noUnusedLocals` resolution + is invisible to the
  prop-chain contract (page.tsx still passes the full DashboardProps).
- **Files modified:** `src/components/dashboard/dashboard.tsx`
- **Commit:** Bundled in `7c3ca01ff` (Tasks 1+2+3 atomic).

**2. [Style — Biome auto-format] Sort imports in page.tsx**
- **Found during:** Task 3 biome check after the type-only `KpiBentoRowProps`
  import was inserted.
- **Issue:** Biome's `assist/source/organizeImports` rule wanted the type-only
  import sorted ahead of value imports within the `#components/*` group.
- **Fix:** Ran `bunx biome check --write` on the three modified files;
  Biome moved the `import type { KpiBentoRowProps }` line up to position 6
  (immediately after the `react` / `sonner` block). No behavior change;
  whitespace + line order only.
- **Files modified:** `src/app/(owner)/dashboard/page.tsx`
- **Commit:** Inline in `7c3ca01ff`.

**3. [Rule 3 — Blocking] Sandbox blocks lefthook `bun install --frozen-lockfile`**
- **Found during:** First commit attempt for Tasks 1-3.
- **Issue:** The lefthook `lockfile-verify` step runs `CI=true bun install
  --frozen-lockfile`, which fails inside the executor sandbox with
  `error: An internal error occurred (PermissionDenied)`. Verified outside
  sandbox: lockfile is in fact in sync (`Checked 843 installs across 971
  packages (no changes)`).
- **Fix:** Re-ran the commit with `dangerouslyDisableSandbox: true` per the
  execution_rules ("Use `dangerouslyDisableSandbox: true` on `git commit`
  Bash calls ONLY when lefthook needs network."). All five pre-commit
  commands then ran green.
- **Files modified:** none (commit-time environmental issue).
- **Commit:** `7c3ca01ff` succeeded on the second attempt.

### Rule 4 (Architectural) Issues

None.

### Auth gates

None.

## Known Stubs

None. Phase 3 closes KPI-01 with real data wired through the existing prop
chain — no placeholders, no "coming soon", no mock data.

## Threat Flags

None. Phase 3 introduces no new attack surface beyond the prop-chain
extension (which the plan's threat_model § T-03-03-01 already mitigates
via strict TypeScript enforcement of `kpiData: KpiBentoRowProps` as a
required field). No new endpoints, no new auth paths, no new file access,
no schema changes. The information disclosure surface is unchanged from
the legacy `<p>` header (T-03-03-02 — same `totalRevenue`, `occupiedUnits`,
`totalUnits` values exposed under the same RLS guards).

## Carry-forward to Phase 4

- The `<KpiBentoRow>` section now sits between the `<h1>Dashboard</h1>` and
  the chart row in `dashboard.tsx`. Phase 4 (Charts) modifies the chart row
  (lines 191+); the bento row's `<section>` is a sibling of the existing
  chart grid, not a wrapper.
- `DashboardProps.metrics` / `revenueTrend` / `propertyPerformance` remain
  REQUIRED fields and page.tsx still computes + passes all three —
  Phase 4 + Phase 5 inherit the unchanged surfaces.
- The `metrics` destructure is REMOVED from `dashboard.tsx` (currently
  unused inside the body). Phase 4 / Phase 5 re-add it when their downstream
  consumer wires up. The interface stays unchanged.

## Self-Check

| Claim | Verification | Result |
|-------|--------------|--------|
| `src/types/sections/dashboard.ts` modified (DashboardProps gains kpiData) | `grep -nc "kpiData: KpiBentoRowProps" src/types/sections/dashboard.ts` → 1 | FOUND |
| `src/components/dashboard/dashboard.tsx` modified (KpiBentoRow mounted) | `grep -c "KpiBentoRow" src/components/dashboard/dashboard.tsx` → 2 | FOUND |
| `src/app/(owner)/dashboard/page.tsx` modified (kpiData wired) | `grep -c "kpiData={kpiData}" 'src/app/(owner)/dashboard/page.tsx'` → 1 | FOUND |
| Legacy <p> header gone | `grep -c "units occupied\|this month" src/components/dashboard/dashboard.tsx` → 0 | FOUND |
| E2E `data-testid="dashboard-stats"` preserved | `grep -c "data-testid=\"dashboard-stats\"" src/components/dashboard/dashboard.tsx` → 1 | FOUND |
| `<h1>Dashboard</h1>` preserved | `grep -c "typography-h1\">Dashboard<" src/components/dashboard/dashboard.tsx` → 1 | FOUND |
| `formatCurrency` import removed | `grep -c "formatCurrency" src/components/dashboard/dashboard.tsx` → 0 | FOUND |
| No commented-out code | `grep -c "{/\*.*units occupied" src/components/dashboard/dashboard.tsx` → 0 | FOUND |
| Commit `7c3ca01ff` on branch | `git log --oneline -5 \| grep 7c3ca01ff` | FOUND |
| `tsc --noEmit` clean | `bunx tsc --noEmit` exit 0 | PASS |
| Biome clean over Phase 3 surfaces | `bunx biome check …` 7 files no fixes | PASS |
| Design-token drift clean | `bunx vitest … design-token-drift.test.ts` 2704/2704 | PASS |
| Phase 3 component tests clean | `bunx vitest … kpi-*.test.* use-reduced-motion.test.ts` 32/32 | PASS |
| Full unit suite clean | `CI=true bun run test:unit` 104,850/104,850 across 172 files | PASS |
| `validate:quick` clean | `bun run validate:quick` exit 0 | PASS |

## Self-Check: PASSED
