---
phase: 01-foundation-dedup
plan: 01
subsystem: ui
tags: [react-query, typescript, dashboard, currency, pure-transform]

# Dependency graph
requires:
  - phase: v1.0-15-handoff
    provides: lockfile-verify lefthook hook with sandbox-disabled commit pattern
  - phase: 01-CONTEXT
    provides: D-01..D-20 decisions including D-12a interpretation #2 wiring contract
provides:
  - "transformDashboardData(payload): DashboardViewModel — pure transform module consumed by Phases 2-5"
  - "DashboardRpcPayload + DashboardViewModel interfaces (camelCase view-side shape)"
  - "selectStats / selectCharts wired to compose transformDashboardData per D-12a interpretation #2"
  - "Zero `* 100` on currency variables in src/app/(owner)/dashboard/ + src/components/dashboard/components/revenue-overview-chart.tsx"
affects: [01-02, 01-03, 02-rpc-migration, 03-kpi-row, 04-charts, 05-data-table]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure RPC-payload → view-model transform module (no React, no hooks, Server-Component-safe)"
    - "Module-level select function composition with transformDashboardData (Pattern S-2 + D-12a #2)"

key-files:
  created:
    - src/components/dashboard/dashboard-data.ts
  modified:
    - src/app/(owner)/dashboard/page.tsx
    - src/components/dashboard/components/revenue-overview-chart.tsx
    - src/hooks/api/use-dashboard-hooks.ts

key-decisions:
  - "DashboardRpcPayload mirrors OwnerDashboardData (post-fetcher camelCase shape) rather than the raw RPC snake_case envelope cited in PATTERNS.md. The fetcher already performs row-level snake↔camel mapping at use-owner-dashboard.ts:227-244, so selectors hand the camelCase shape to transformDashboardData. This is the only physically consistent reading of D-12a interpretation #2 (selectors compose, base options stay select-less)."
  - "selectActivity + selectPropertyPerformance left untouched — view-model carries portfolioRows: PortfolioRow[] (not the raw PropertyPerformance[] shape the existing dashboard/page.tsx consumer maps over). Phase 3 migrates the consumer when dashboard-view.tsx replaces dashboard.tsx; widening the selector return shape now would force a cross-phase consumer rewrite that is explicitly out of Plan 1-01 scope."
  - "DASHBOARD_BASE_QUERY_OPTIONS does NOT grow a `select:` key — interpretation #1 stays rejected because per-call selects mask base-options selects in React Query."

patterns-established:
  - "Pure transform module: src/components/dashboard/dashboard-data.ts exports `export function transformDashboardData(payload): ViewModel` with full type annotations, no React, no hooks, no `any`, no `as unknown as`. Closest analog: src/lib/seo/article-schema.ts (config → typed-output transform)."
  - "Selector composition: module-level `const selectXxx = (data) => transformDashboardData(data).slice` for the slices that the view-model carries (stats, timeSeries); selectors whose return shape doesn't match a view-model slice stay direct-passthrough until Phase 3 migrates the consumer."

requirements-completed: [POLISH-01, POLISH-02]

# Metrics
duration: 19min
completed: 2026-05-22
---

# Phase 01 Plan 01: Foundation & Dedup — Currency-arithmetic excision + pure transform Summary

**Drops the `*100`/`/100` currency round-trip in the dashboard revenue path (lines 71/92/107 of page.tsx + line 41 of revenue-overview-chart.tsx), creates the pure `transformDashboardData(payload): DashboardViewModel` module at src/components/dashboard/dashboard-data.ts, and wires it into use-dashboard-hooks.ts selectors per D-12a interpretation #2.**

## Performance

- **Duration:** ~19 min
- **Started:** 2026-05-23T03:06:00Z (approx — first edit attempt)
- **Completed:** 2026-05-23T03:25:05Z
- **Tasks:** 3 (all atomic per Pattern S-3)
- **Files modified:** 3
- **Files created:** 1

## Accomplishments

- **POLISH-01 (drop `*100`):** three currency `* 100` arithmetic sites excised from src/app/(owner)/dashboard/page.tsx (lines 71/92/107). Misleading "Convert to cents" trailing comments deleted at each site. KPI tiles unchanged visually (the `*100`/`÷100` round-trip through formatDashboardCurrency cancels itself).
- **POLISH-02 partial (drop `/100`):** one currency `/ 100` excised at src/components/dashboard/components/revenue-overview-chart.tsx:41. Revenue chart values now render 100× larger than before — the D-02 intentional visible change.
- **Pure transform module:** new src/components/dashboard/dashboard-data.ts exports `DashboardRpcPayload`, `DashboardViewModel`, and `transformDashboardData(payload)`. Server-Component-safe — no React, no hooks, no React Query coupling.
- **Selector wiring:** use-dashboard-hooks.ts imports transformDashboardData and composes it inside selectStats + selectCharts per D-12a interpretation #2. DASHBOARD_BASE_QUERY_OPTIONS stays select-less.

## Task Commits

Each task committed atomically (Pattern S-3):

1. **Task 1: Drop `*100` in page.tsx + `/100` in revenue-overview-chart.tsx** — `8f508e662` (fix)
2. **Task 2: Create pure transform module dashboard-data.ts** — `8214fb12e` (feat)
3. **Task 3: Wire transformDashboardData into use-dashboard-hooks selectors** — `edd11ac9d` (feat)

## Files Created/Modified

- **Created:** `src/components/dashboard/dashboard-data.ts` — pure RPC payload → view-model transform. Exports `DashboardRpcPayload`, `DashboardViewModel`, and `transformDashboardData()`. Consumed by selectors in use-dashboard-hooks.ts.
- **Modified:** `src/app/(owner)/dashboard/page.tsx` — dropped three `* 100` currency arithmetic sites at lines 71/92/107 + their trailing "Convert to cents" comments.
- **Modified:** `src/components/dashboard/components/revenue-overview-chart.tsx` — dropped the `/ 100` at line 41 (axis-tick `/ 1000` at line 70 is non-currency and allowed per UI-SPEC § 8.1 + D-03 allowlist).
- **Modified:** `src/hooks/api/use-dashboard-hooks.ts` — imported transformDashboardData and composed it inside selectStats + selectCharts.

## Decisions Made

- **D-01 / D-02 / D-03 of 01-CONTEXT.md** implemented as written (one PR ships the bug fix end-to-end; chart values jump 100× to correct dollars; grep gates return zero hits on currency `* 100` / `/ 100`).
- **D-10 / D-11** implemented: pure transform at src/components/dashboard/dashboard-data.ts, no React/hooks/Query coupling, exports `export function transformDashboardData` per the article-schema.ts style analog.
- **D-12a interpretation #2** implemented: selectors compose `transformDashboardData(data)` for slices that the view-model carries; DASHBOARD_BASE_QUERY_OPTIONS stays select-less.
- **DashboardRpcPayload shape:** mirrors OwnerDashboardData (post-fetcher camelCase) rather than the raw RPC snake_case envelope. The planner's PATTERNS.md cite of "use-owner-dashboard.ts:213-219" pointed at the raw RPC type, but at runtime the selectors hand the post-mapped camelCase shape to the transform. The camelCase interface is the only consistent reading. Per CONTEXT.md "Claude's Discretion" the executor may refine for runtime consistency.
- **selectActivity + selectPropertyPerformance left untouched** — the view-model carries portfolioRows (PortfolioRow[]), not the raw PropertyPerformance[] shape that the existing dashboard/page.tsx consumer maps over. Per the plan's Task 3 step 2 ("if a callsite's existing return shape can't accommodate the view-model field without a type widen, leave that selector untouched"), Phase 3 migrates the consumer when dashboard-view.tsx replaces dashboard.tsx.

## Deviations from Plan

### Documented interpretation refinements (not auto-fixes)

**1. [Refinement — D-12a interpretation #2 + Claude's-Discretion authority] DashboardRpcPayload typed against post-fetcher OwnerDashboardData shape**

- **Found during:** Task 2 (creating the transform module).
- **Issue:** Plan frontmatter + PATTERNS.md described `DashboardRpcPayload` as "a mirror of the type at use-owner-dashboard.ts:213-219" with snake_case keys (`property_performance`, `time_series`). At runtime, the selectors in use-dashboard-hooks.ts:26-41 receive the POST-mapped `OwnerDashboardData` (camelCase: `propertyPerformance`, `timeSeries`) because the fetcher at use-owner-dashboard.ts:227-244 already converts snake_case RPC row keys to camelCase domain keys. The plan's Task 3 step 2 specifies selectors call `transformDashboardData(data)` where `data` is what the selector receives (`OwnerDashboardData`), so the transform must accept the camelCase shape.
- **Resolution:** `DashboardRpcPayload` was defined to mirror `OwnerDashboardData` (camelCase) rather than the raw RPC type. JSDoc on the interface documents the deviation rationale + cites the fetcher boundary (use-owner-dashboard.ts:227-244) as the snake↔camel mapping site. This is the only physically consistent reading of D-12a interpretation #2; CONTEXT.md "Claude's Discretion" authorizes the executor to refine for runtime consistency.
- **Verification:** typecheck clean; selectors compose `transformDashboardData(data).stats` / `.timeSeries` cleanly.

**2. [Scope-preservation — Plan-stated escape hatch] selectActivity + selectPropertyPerformance left as direct passthrough**

- **Found during:** Task 3.
- **Issue:** The plan explicitly authorizes this carve-out: "for selectors whose output shape does NOT directly map (e.g. selectStats already returns a thin {stats, trends} shape), keep the existing shape but READ the inputs from transformDashboardData(data) where doing so introduces no observable behavior change — DO NOT widen the public selector return type in this task (consumers in Phases 3-5 depend on the current shapes)" and "if a callsite's existing return shape can't accommodate the view-model field without a type widen, leave that selector untouched and document inside the PR summary so Phase 3 picks it up cleanly".
- **Resolution:** selectActivity (returns `{ activities: ActivityItem[] }`) and selectPropertyPerformance (returns `PropertyPerformance[]`) left untouched. The view-model carries `portfolioRows: PortfolioRow[]` — a different shape that the existing dashboard/page.tsx consumer (`performanceData.map(prop => ...)`) is NOT typed for. Composing transformDashboardData here would require either widening the public return type (breaking the consumer) or layering a back-conversion (pure dead code). Inline comment in use-dashboard-hooks.ts records this for Phase 3's eventual consumer migration.
- **Verification:** 126/126 dashboard-scope tests pass (`bunx vitest --run --project unit src/hooks/api/__tests__/ src/components/dashboard/__tests__/`); all 8 existing `useQuery({...DASHBOARD_BASE_QUERY_OPTIONS, select: selectXxx})` callsites still resolve.

---

**Total deviations:** 2 documented interpretation refinements (both authorized by plan text or "Claude's Discretion" clause). Zero auto-fix rules invoked.
**Impact on plan:** Both refinements preserve the plan's intent (D-12a interpretation #2 wiring; selectors stay module-level; base query options stay select-less). No scope creep. Phase 3 inherits a clean migration path for the remaining 2 selectors when dashboard-view.tsx replaces dashboard.tsx.

## Issues Encountered

1. **Path drift between worktree and main checkout.** First Edit-tool invocations against `/Users/richard/Developer/tenant-flow/src/...` (the main-checkout absolute paths derived from the prompt's `<files_to_read>` list) landed in the MAIN repo instead of the worktree. Detected via the post-edit `git status --short` discipline (empty in worktree; modified-files in main). Recovered by `git checkout --` on the misdirected files in the main repo, then re-applying via the worktree's absolute path (`/Users/richard/Developer/tenant-flow/.claude/worktrees/agent-a2cb5ac696e28baac/src/...`). All subsequent edits used worktree-anchored absolute paths. No commit pollution — main repo was reverted before staging. Documented in the prompt's "KNOWN DEVIATION RISK" guidance; the recovery procedure worked as specified.
2. **Lefthook unit-tests hook produced one false-positive failure batch.** First Task 1 commit attempt failed with 572 jest-dom shim errors (`Invalid Chai property: toHaveValue`, etc.). Investigation showed: (a) base commit `5240471ed` is 100% green when the same `CI=true bun run test:unit -- --coverage` command runs in isolation; (b) Task 1's identical changes also produce 105,106/105,106 passing tests in isolation. The first lefthook run hit a transient parallel-execution race in Vitest 4's project-isolation setup. Retry succeeded clean. No code changes required. All three subsequent commits ran clean.
3. **Biome formatting catch on Task 2.** First write of dashboard-data.ts had `tenant:` value on a wrapped line; biome wanted it inline. Single-line edit; biome clean after.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 01 Plan 02 ready to execute: the `formatDashboardCurrency` whole-function deletion + 4 caller swaps to `formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })` per RC-7 / D-07 / D-09a. The transform module created in this plan is independent of that work.
- Phase 01 Plan 03 ready: dead-file deletions (owner-dashboard.tsx + its test, dashboard-filters-compact.tsx, dashboard-filters.tsx, dashboard-filters-utils.ts, top-level portfolio-toolbar.tsx, skeletons.tsx) per the RC-2/RC-3/RC-4/RC-5/RC-6 reality-checks.
- Phases 2-5 inherit the typed view-model contract via `import { transformDashboardData } from '#components/dashboard/dashboard-data'`. Phase 7's verification sweep should add a regression-pin unit test for `transformDashboardData` (deferred per CONTEXT.md "Claude's Discretion").
- No blockers. Build is green. Typecheck clean. 126/126 dashboard-scope tests pass; 105,106/105,106 overall tests pass.

## Self-Check

- [x] `src/components/dashboard/dashboard-data.ts` exists in worktree (`test -f` passes).
- [x] Commit `8f508e662` exists (Task 1 fix).
- [x] Commit `8214fb12e` exists (Task 2 feat).
- [x] Commit `edd11ac9d` exists (Task 3 feat).
- [x] `grep -nE '\* ?100' src/app/(owner)/dashboard/page.tsx` returns zero hits (verified post-Task-1).
- [x] `grep -n '/ 100' src/components/dashboard/components/revenue-overview-chart.tsx` returns no line-41 match (line-70 axis-tick `/ 1000` allowed).
- [x] `grep -c "export function transformDashboardData" src/components/dashboard/dashboard-data.ts` returns `1`.
- [x] `grep -c "'use client'" src/components/dashboard/dashboard-data.ts` returns `0`.
- [x] `grep -cE "\b(useState|useEffect|useMemo|useQuery)\b" src/components/dashboard/dashboard-data.ts` returns `0`.
- [x] `grep -cE "\bany\b" src/components/dashboard/dashboard-data.ts` returns `0`.
- [x] `grep -c "import { transformDashboardData }" src/hooks/api/use-dashboard-hooks.ts` returns `1`.
- [x] DASHBOARD_BASE_QUERY_OPTIONS in use-owner-dashboard.ts contains NO `select:` key.
- [x] `bunx tsc --noEmit` exits 0.
- [x] `bunx biome check src/components/dashboard/dashboard-data.ts src/hooks/api/use-dashboard-hooks.ts` exits 0.
- [x] 126/126 dashboard-scope tests pass.

**Self-Check: PASSED**

---
*Phase: 01-foundation-dedup*
*Plan: 01*
*Completed: 2026-05-22*
