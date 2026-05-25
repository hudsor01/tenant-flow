---
phase: 03-kpi-bento-row
reviewed: 2026-05-25T00:00:00Z
depth: deep
cycle: 5
files_reviewed: 14
files_reviewed_list:
  - src/app/(owner)/dashboard/page.tsx
  - src/components/dashboard/components/__tests__/kpi-bento-row.test.tsx
  - src/components/dashboard/components/__tests__/kpi-helpers.test.ts
  - src/components/dashboard/components/__tests__/kpi-sparkline.test.tsx
  - src/components/dashboard/components/kpi-bento-row.tsx
  - src/components/dashboard/components/kpi-helpers.ts
  - src/components/dashboard/components/kpi-sparkline.tsx
  - src/components/dashboard/dashboard.tsx
  - src/components/dashboard/dashboard-data.ts
  - src/components/dashboard/dashboard-data.test.ts
  - src/hooks/__tests__/use-reduced-motion.test.ts
  - src/hooks/use-reduced-motion.ts
  - src/test/mocks/recharts.tsx
  - src/types/sections/dashboard.ts
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
status: issues_found
perfect_pr_gate: cycle 5 NOT zero-finding — counter resets to 0
consecutive_zero_finding_cycles: 0
---

# Phase 3: Code Review Report — Cycle 5

**Reviewed:** 2026-05-25
**Depth:** deep
**Files Reviewed:** 14
**Status:** issues_found
**Cycle:** 5 of (≥2 consecutive zero-finding required)

## Summary

Cycle-4 fix commit `54039b6bb` closed both cycle-4 findings cleanly:

- **WR-4C-01 closed.** `kpi-helpers.ts:234-238` now extracts `const normalizedLabel = (input.trendLabel ?? "").trim();` BEFORE interpolation. When `normalizedLabel` is empty the base collapses to `"${directionWord} ${pct} percent"` (no trailing space requiring `.trimEnd()`), otherwise it interpolates as `"${directionWord} ${pct} percent ${normalizedLabel}"`. The `trimEnd()` call was dropped — no longer needed because the conditional avoids the trailing space. New regression test `kpi-helpers.test.ts:221-230` exercises `trendLabel: "  vs. last week"` on the up branch and pins `"Revenue: $14,250. Up 12 percent vs. last week."` plus `not.toMatch(/ {2}/)`.
- **IN-4C-01 closed.** `use-reduced-motion.ts:5-8` JSDoc now reads `"search \`BlurFade\` in \`src/components/ui/blur-fade.tsx\` — line numbers omitted to avoid drift"`. Same symbol-anchored pattern that IN-2C-02 swept into `dashboard-data.ts` + `dashboard-data.test.ts`.

**Cycle-5 lockstep verification of `buildTileAriaLabel` (13 edge cases traced):**

| Input shape | Stable branch output | Up/down branch output | Symmetry |
|---|---|---|---|
| `undefined` trendLabel | `"Unchanged."` | `"Up 12 percent."` | ✓ both bare |
| `""` trendLabel | `"Unchanged."` | `"Up 12 percent."` | ✓ both bare |
| `"  "` (whitespace-only) trendLabel | `"Unchanged."` | `"Up 12 percent."` | ✓ both bare |
| `"vs. last week"` trendLabel | `"Unchanged vs. last week."` | `"Up 12 percent vs. last week."` | ✓ both with window |
| `"  vs. last week"` (leading WS) trendLabel | `"Unchanged vs. last week."` | `"Up 12 percent vs. last week."` | ✓ both trimmed |
| `"since 2020"` (no `vs.`) trendLabel | `"Unchanged vs. since 2020."` | `"Up 12 percent since 2020."` | ✓ both pass-through |
| `"vs."` (just prefix) trendLabel | `"Unchanged."` | `"Up 12 percent vs.."` * | ⚠ asymmetric — see "Items considered" below |

\* The stable branch strips `"vs."` via the `/^vs\.\s*/` regex and collapses to bare; the non-stable branch interpolates the trimmed literal `"vs."` and appends the sentence-terminating `.` for `"vs.."`. This is the documented one-direction-only contract: the regex strip is INTENTIONAL semantic logic for stable (avoids redundant `"Unchanged vs. vs. last month"`), NOT a whitespace discipline. The non-stable branch correctly does NOT strip because `"Up 12 percent vs. last month"` reads naturally. Filed as a non-finding in "Items considered" — both production callers (`kpi-bento-row.tsx:185, 204, 242`) pass `"vs. last month"`, never bare `"vs."`.

**Cross-cycle regression verification:**

| Prior fix | Surface | Cycle-5 verification |
|---|---|---|
| Cycle-1 WR-04 (Revenue "this month" → spokenDescription) | `kpi-bento-row.tsx:178-180` | ✓ `spokenValue: revenueSpoken` ("$14,250" no qualifier); `spokenDescription: "This month"`; test `kpi-bento-row.test.tsx:247-251` pins `"Revenue: $14,250. This month. Up 12 percent vs. last month."` |
| Cycle-1 WR-02 (NaN guard) | `kpi-helpers.ts:44, 214`; `kpi-bento-row.tsx:150-152` | ✓ all three `Number.isFinite` guards present; cycle-4 trim does not interact with NaN path (trim runs on `string`, isFinite runs on `number`); test `kpi-helpers.test.ts:54-58` + `kpi-bento-row.test.tsx:302-321` pin both paths |
| Cycle-1 WR-01 (listitem hierarchy) | `kpi-bento-row.tsx:354-362` | ✓ `<div role="listitem">` is direct child of `<div role="list">`; both BlurFade and bare `KpiTile` branches wrapped symmetrically; no layout consequences (tests assert 6 listitems + sparkline placement) |
| Cycle-2 WR-2C-02 (stable trend `"Unchanged."` when no trendLabel) | `kpi-helpers.ts:218-228` | ✓ `windowText` falsy → bare `"Unchanged"`; test `kpi-helpers.test.ts:192-201` pins after cycle-3 trim + cycle-4 normalizedLabel |
| Cycle-3 WR-3C-01 (stable branch leading WS trim) | `kpi-helpers.ts:225-227` | ✓ `.trim().replace(/^vs\.\s*/, "")` order preserved; cycle-4 did NOT regress this |
| Cycle-3 IN-3C-01 (drop `export` on `KpiSparklineProps`) | `kpi-sparkline.tsx:26` | ✓ `interface` not `export interface`; grep shows zero external consumers |
| Cycle-4 WR-4C-01 (non-stable trim) | `kpi-helpers.ts:234-238` | ✓ symmetric with stable branch; new regression test pins contract |
| Cycle-4 IN-4C-01 (symbol-anchored ref) | `use-reduced-motion.ts:5-8` | ✓ line numbers omitted in favor of "search `BlurFade` in ..." |

**Cycle-5 surfaces 1 new finding (0 BLOCKER, 0 WARNING, 1 INFO):**

- **IN-5C-01:** `kpi-sparkline.test.tsx:51` carries the drift-prone reference `src/components/ui/chart.tsx:71-92` in a JSDoc-style comment explaining why the test uses `waitFor()` to wait for the deferred `ResponsiveContainer` mount. This is the EXACT pattern that:
  - Cycle 2 IN-2C-02 swept out of `dashboard-data.ts:43-44` + `dashboard-data.test.ts:11-12` (`page.tsx:N` + `dashboard.tsx:N` refs).
  - Cycle 4 IN-4C-01 swept out of `use-reduced-motion.ts:6` (`blur-fade.tsx:22-31` ref).

The line numbers `71-92` in `chart.tsx` are accurate today — they bracket the `useState(false)` + `useEffect(requestAnimationFrame...)` + `mounted ?` deferred-mount block (verified against current `chart.tsx`). But if `chart.tsx` is refactored (e.g., the `requestAnimationFrame` gate is replaced with a different defer pattern, or the JSX expands), the `71-92` range silently becomes wrong. Same drift class as the two cycle predecessors. The `kpi-sparkline.test.tsx` file was added in commit `737f14eb2` (Phase 3) but was not included in either prior sweep — both prior sweeps were scoped to the SPECIFIC files in the cycle's finding target, not to the full PR diff range.

This is **cycle 5 of the perfect-PR gate**. Per `.planning/feedback_perfect_pr_gate.md`, two **consecutive zero-finding** cycles are required before merge. Cycle 5 is not zero-finding (1 finding), so the consecutive counter remains at 0. Another fix + re-review cycle is required. The recurring pattern — each cycle's fix surfaces a sibling defense-in-depth gap on a parallel code path or file — continues to validate the perfect-PR gate's value. Cycles 2 + 4 + 5 all closed instances of the SAME drift-prone-line-reference class on different Phase 3 files; the cycle-5 finding is the third file in that class.

---

## Info

### IN-5C-01: `kpi-sparkline.test.tsx:51` carries the same drift-prone `<file>:<line-range>` pattern that IN-2C-02 + IN-4C-01 already swept from sibling Phase-3 files

**File:** `src/components/dashboard/components/__tests__/kpi-sparkline.test.tsx:50-53`

**Issue:**

```typescript
// ChartContainer defers ResponsiveContainer mount until rAF fires (see
// src/components/ui/chart.tsx:71-92), so the AreaChart subtree —
// including the <defs><linearGradient/></defs> — only paints on the
// next tick. `waitFor` polls until the mount completes.
```

This is the SAME drift-prone documentation pattern that:

- **Cycle 2 IN-2C-02** swept out of `dashboard-data.ts:43-44` (`page.tsx:N` + `dashboard.tsx:N` refs) and `dashboard-data.test.ts:11-12`. Cycle-2 fix replaced line refs with `"search for the portfolioPerformance map in each file; line numbers omitted to avoid drift"`.
- **Cycle 4 IN-4C-01** swept out of `use-reduced-motion.ts:6` (`blur-fade.tsx:22-31` ref). Cycle-4 fix replaced with `"search BlurFade in src/components/ui/blur-fade.tsx — line numbers omitted to avoid drift"`.

The line numbers `71-92` in `chart.tsx` are accurate today (verified: lines 71-92 bracket the `useState(false)` + `useEffect(requestAnimationFrame...)` + `mounted ?` deferred-mount block exactly), but the comment is exactly the pattern the two prior cycles established as drift-prone. If `chart.tsx` is refactored (e.g., the `requestAnimationFrame` gate is replaced with a different defer pattern, or the JSX between the useState declaration and the conditional render expands), the `71-92` range silently becomes wrong.

**Why this cycle and not earlier:** The `kpi-sparkline.test.tsx` file was added in commit `737f14eb2` (Phase 3 — the same commit that added `kpi-sparkline.tsx`). Both prior sweeps (cycle 2 + cycle 4) were scoped to their finding's specific target files:
- Cycle 2 IN-2C-02 target: `dashboard-data.ts` + `dashboard-data.test.ts` (the cycle-1 IN-01 stale-comment fix was located there, so the sweep stayed there)
- Cycle 4 IN-4C-01 target: `use-reduced-motion.ts` (the new Phase 3 hook that was missed by the cycle-2 sweep)

Neither sweep extended to the test file added in the same commit as the sparkline. `kpi-sparkline.test.tsx:51` is the third file in the same drift class, missed by both prior sweeps.

**Fix:**

```diff
- 		// ChartContainer defers ResponsiveContainer mount until rAF fires (see
- 		// src/components/ui/chart.tsx:71-92), so the AreaChart subtree —
- 		// including the <defs><linearGradient/></defs> — only paints on the
- 		// next tick. `waitFor` polls until the mount completes.
+ 		// ChartContainer defers ResponsiveContainer mount until rAF fires (see
+ 		// the `mounted` useState + `requestAnimationFrame` useEffect block
+ 		// inside the `ChartContainer` component in `src/components/ui/chart.tsx`
+ 		// — line numbers omitted to avoid drift), so the AreaChart subtree —
+ 		// including the <defs><linearGradient/></defs> — only paints on the
+ 		// next tick. `waitFor` polls until the mount completes.
```

Apply the same edit at the SECOND reference in the same file (`kpi-sparkline.test.tsx:70-71`):

```diff
- 		// Wait for the deferred ResponsiveContainer mount (see note above)
- 		// before scanning — without this the inner SVG hasn't painted yet.
+ 		// Wait for the deferred ResponsiveContainer mount (see note above)
+ 		// before scanning — without this the inner SVG hasn't painted yet.
```

The second reference at line 70-71 (`see note above`) is NOT drift-prone — it points symbolically to the first comment in the same file, which is fine. Only the first comment block needs the edit.

Apply the same edit at the THIRD reference in the same file (`kpi-sparkline.test.tsx:98`):

```diff
- 		// Same rAF gate — wait for the recharts mock subtree to mount before
- 		// reading its props off the data attributes.
+ 		// Same rAF gate — wait for the recharts mock subtree to mount before
+ 		// reading its props off the data attributes.
```

The third reference at line 98 also points symbolically — no edit needed there either.

**Net effect:** Only the first comment block (lines 50-53) carries the drift-prone line range. The fix is a 1-block edit that drops the `:71-92` suffix in favor of the symbol-anchored prose.

Once landed, all 14 Phase 3 files will be uniformly symbol-anchored. The discipline established by cycle 2 IN-2C-02 will be fully propagated, mirroring the way cycle 4 WR-4C-01 fully propagated the cycle-3 WR-3C-01 trim discipline across both `buildTileAriaLabel` branches.

---

## Verification of cycle-4 fix claims

| Cycle-4 finding | Fix claim | Verified |
|---|---|---|
| WR-4C-01 | `kpi-helpers.ts:234-238` extracts `normalizedLabel` constant, then conditional interpolation collapses to `"Up 12 percent"` (no trailing space) when label is empty/whitespace-only; new regression test pins `"Revenue: $14,250. Up 12 percent vs. last week."` for `trendLabel: "  vs. last week"` on the up branch | ✓ Code at lines 234-238 reads exactly `(input.trendLabel ?? "").trim()` then conditional `${normalizedLabel}` interpolation; the prior `.trimEnd()` call was DROPPED (no longer needed — the conditional avoids the trailing space). Test `kpi-helpers.test.ts:221-230` exercises the case + asserts `not.toMatch(/ {2}/)`. All 13 documented edge cases (7 stable + 6 non-stable) traced correctly (see Summary lockstep table) |
| IN-4C-01 | `use-reduced-motion.ts:5-8` JSDoc replaces `src/components/ui/blur-fade.tsx:22-31` with `"search BlurFade in src/components/ui/blur-fade.tsx — line numbers omitted to avoid drift"` | ✓ Comment at lines 5-8 reads exactly the documented form; no other line-range references in the file |

Both cycle-4 fixes closed at the pinned files with the documented mechanics. WR-4C-01 propagated the trim discipline across BOTH branches of `buildTileAriaLabel` — the discipline is now uniform. IN-4C-01 swept `use-reduced-motion.ts` clean — but did NOT extend to `kpi-sparkline.test.tsx`, which is IN-5C-01.

---

## Fresh adversarial pass — Zero Tolerance check (re-grepped for cycle 5)

| Rule | Result |
|---|---|
| 1 — No `any` types | ✓ `grep -rnE ':\s*any\b\|as\s+any\b\|<any>' <14 files>` → 0 hits |
| 2 — No barrel files | ✓ no `index.ts` re-exports in changed component dir; all imports point at defining files |
| 3 — No duplicate types | ✓ `MetricTrend`, `TimeSeriesDataPoint`, `DashboardStats`, `PropertyPerformance` all sourced from canonical `src/types/`; `KpiBentoRowProps.metricTrends` mirrors `DashboardStatsData.metricTrends` (`use-owner-dashboard.ts` boundary mapper) by structural design — same shape, two consumers, not a duplicate type declaration |
| 4 — No commented-out code | ✓ all comments are explanatory anchors / load-bearing markers, none are commented-out code |
| 5 — No inline styles | ✓ only the documented exemption: `style={GRID_CONTAINER_STYLE}` (static `containerType` + `containerName` keys for the container-query parent) appears twice; both flagged with the SOLE-exemption rationale comment at `kpi-bento-row.tsx:26-33` |
| 6 — No PG ENUMs | n/a (no migration in this phase) |
| 7 — No emojis in code | ✓ Lucide icons (`ArrowUp`, `ArrowDown`, `Minus`) used; no Unicode emoji escape sequences |
| 8 — No `as unknown as` | ✓ `grep -rn 'as unknown as' <14 files>` → 0 hits |
| 9 — No string-literal query keys | n/a (no new queries; reads from existing factory via `useDashboardStats`, `useDashboardCharts`, `usePropertyPerformance`) |
| 10 — No `@radix-ui/react-icons` | ✓ 0 hits in changed files |

| Check | Result |
|---|---|
| Hardcoded secrets | ✓ none |
| Dangerous functions (`eval`, `innerHTML`, raw-html-injection sinks) | ✓ none in changed files |
| Debug artifacts (`console.log`, `debugger`, `TODO`, `FIXME`, `XXX`, `HACK`) | ✓ `grep -nE 'console\.log\|debugger\|TODO\|FIXME\|XXX\|HACK' <14 files>` → 0 hits |
| Empty catch blocks | ✓ none |
| D-01 invariant (6 tiles in canonical order) | ✓ `kpi-bento-row.tsx:174-268` emits `revenue, occupancy, active-leases, open-maintenance, properties, units` in that order; test `kpi-bento-row.test.tsx:124-146` pins the labels in order |
| D-04 invariant (3 trend-bearing, 3 no-trend; Active leases is no-trend post-cycle-1) | ✓ Revenue + Occupancy + Open maintenance carry trends (`metricTrends.monthlyRevenue`, `metricTrends.occupancyRate`, `metricTrends.openMaintenance`); Active leases + Properties + Units carry `trend: null`; test `kpi-bento-row.test.tsx:178-186` pins both negative + positive assertions |
| D-05 wave coefficients `{0,1,2,4,5,6}` (coefficient 3 skipped) | ✓ `kpi-bento-row.tsx:192,211,225,244,254,266` carries `waveDelay: 0,1,2,4,5,6`; coefficient 3 intentionally skipped between Active leases (2) and Open maintenance (4) |
| D-09 honesty (no fabricated trends) | ✓ Active-leases tile sets `trend: null` (no `active_leases` RPC signal); `metricTrends.<field> === null` propagates to `<StatTrend>` omission (`kpi-bento-row.tsx:283`) |
| D-10 grid (auto-fit minmax(180px,1fr), gap-4 → gap-6 at @4xl) | ✓ `kpi-bento-row.tsx:35-39` exact match |
| D-11 sparkline (axis-less Area inside ChartContainer + `role="img"` + `aria-label` + `data.length < 2` guard) | ✓ `kpi-sparkline.tsx:36-73` matches contract exactly; `buildSparkline` in `kpi-bento-row.tsx:130` enforces `data.length < 2 → null`; `KpiTile` doubles the guard at line 317 (defense-in-depth) |
| D-12 KpiBentoRow orchestrator + skeleton ↔ loaded mutual exclusion | ✓ `kpi-bento-row.tsx:336` early return for loading/null branch renders `<KpiSkeletonGrid />`; loaded branch unreachable when isLoading is true; test `kpi-bento-row.test.tsx:206-234` pins mutual exclusion |
| Reduced-motion correctness end-to-end | ✓ `useReducedMotion` subscribes on mount + cleans up on unmount (`use-reduced-motion.ts:20-27`); `KpiNumberTicker` short-circuits to static `Intl.NumberFormat` (`kpi-bento-row.tsx:63-73`); `KpiBentoRow` bypasses `BlurFade` wrapping (`kpi-bento-row.tsx:355-361`); test `kpi-bento-row.test.tsx:254-268` pins via absence of `[class*=will-change-transform]`; `use-reduced-motion.test.ts:109-125` pins listener cleanup |
| jsdom matchMedia stub covers both true and false paths | ✓ `kpi-bento-row.test.tsx:117-122` defaults `stubMatchMedia(false)` per-test; reduced-motion test re-stubs to `true` inside the test body (line 255); `use-reduced-motion.test.ts` exercises both initial-`false` and initial-`true` paths plus the `change`-event transition |
| WAI-ARIA list semantics (post-cycle-1 WR-01 restructure) | ✓ `kpi-bento-row.tsx:347` parent grid `role="list"`; `kpi-bento-row.tsx:354` child div `role="listitem"` is direct child of the list; listitem wraps both `BlurFade` and raw `KpiTile` branches symmetrically |
| Skeleton grid drops role="list" + adds aria-busy="true" | ✓ `kpi-bento-row.tsx:107-110` section carries `aria-busy="true"` + no `role="list"` on the inner grid div; `kpi-bento-row.test.tsx:217` pins `aria-busy="true"` |
| Sparkline `role="img"` + `aria-label` | ✓ `kpi-sparkline.tsx:37-39` carries `role="img"` + `aria-label={ariaLabel}`; test `kpi-sparkline.test.tsx:32-39` pins both |
| Stat aria-label (consolidated narration template) | ✓ `kpi-bento-row.tsx:274-282` builds via `buildTileAriaLabel`; conditional-spread pattern satisfies `exactOptionalPropertyTypes`; test `kpi-bento-row.test.tsx:236-252` pins Revenue template; lockstep traced for 13 edge cases (see Summary) |
| Type safety (DashboardProps shape, no legacy `metrics`) | ✓ `grep -n 'DashboardMetrics\b' src/` returns 0 hits (only unrelated `DashboardMetricsResponse` in `core.ts`); `DashboardProps.kpiData: KpiBentoRowProps` is the sole shape consumed |
| exactOptionalPropertyTypes compliance | ✓ `kpi-bento-row.tsx:278-281` uses conditional-spread for optional `spokenDescription` and `trendLabel`; never assigns `undefined` directly |
| Cross-module type drift | ✓ `DashboardStatsData.metricTrends` (in `use-owner-dashboard.ts` boundary mapper) matches `KpiBentoRowProps.metricTrends` (in `kpi-helpers.ts:146-157`) exactly |
| Unused exports (`KpiSparklineProps`-class scan) | ✓ `KpiSparklineProps` correctly stays unexported (cycle-3 fix); `KpiBentoRowProps`, `KpiTileConfig`, `formatTrendPercent`, `sparklineConfigForTrend`, `buildTileAriaLabel`, `KpiBentoRow`, `KpiSparkline`, `useReducedMotion`, `transformDashboardData`, `DashboardViewModel` — all exports confirmed as externally consumed (page.tsx, dashboard.tsx, sections/dashboard.ts, three test files, sparkline tests) |
| Sparkline gradient id collision risk | ✓ deterministic `spark-fill-${trend}` ids (`kpi-sparkline.tsx:34`); when Revenue + Occupancy share the same trend, they share an id but both resolve `var(--color-spark)` and the chart container scopes the variable to the matching token |
| Test infrastructure (chai 6 / Vitest 4 toThrow trap) | ✓ `kpi-bento-row.test.tsx:316` uses bare `not.toThrow()` (no string arg) — safe per CLAUDE.md note on the chai 6 bug |
| `typecheck` passes | ✓ `bun run typecheck` → exit 0 |
| `lint` passes | ✓ `bun run lint` → `Checked 1202 files in 221ms. No fixes applied.` |
| All 39 Phase-3 unit tests pass (cycle-4 added 1 test) | ✓ `bun vitest --project unit --run <5 files>` → `Test Files 5 passed (5) / Tests 39 passed (39)` |
| Drift-prone line-range references swept | ✗ 1 remaining in `kpi-sparkline.test.tsx:51` — see IN-5C-01 |

---

## Items considered and explicitly NOT filed

These are gaps observed during the adversarial pass that did NOT meet the bar for cycle-5 findings, documented for transparency:

1. **Stable branch `"vs."`-prefix asymmetry with non-stable branch.** Stable: `trendLabel: "vs."` → `"Unchanged."` (regex strips `vs.`, collapses to bare). Non-stable: `trendLabel: "vs."` → `"Up 12 percent vs.."` (interpolates the literal, sentence terminator yields double period). This asymmetry is INTENTIONAL by design — the stable branch needs the strip because `"Unchanged vs. vs. last month"` reads broken, but the non-stable branch reads naturally as `"Up 12 percent vs. last month"` and stripping the prefix would yield `"Up 12 percent last month"` which is also broken. The active production callers (`kpi-bento-row.tsx:185, 204, 242`) pass `"vs. last month"` literals, never bare `"vs."`. Filing as a non-finding because (a) the asymmetry is semantically correct, not a defense-in-depth gap, and (b) no caller triggers the pathological case. Cycle-1..cycle-4 review trail explicitly acknowledged the `"since 2020"` pass-through asymmetry under the same logic.

2. **`recharts.tsx:89` `Pie` destructures `_data` not `data`.** Pre-existing defect outside Phase 3 scope. Verified via `git log` — the line was not touched in any Phase 3 commit (`737f14eb2` only modified the `Area` component). `_data` is destructured but `PieProps.data` is the type field, so `data` is silently discarded by the mock. This breaks any test that asserts pie data shape via `data-data` (none exist; the mock simply doesn't emit `data-data` for `Pie`). Not in cycle-5 scope (the file is in the review diff range, but the defect predates Phase 3 and no Phase 3 test touches `Pie`). Flag for a future repo cleanup pass.

3. **Asymmetric NaN/Infinity guarding across stat fields.** `safeOccupancy` (kpi-bento-row.tsx:150-152) and `formatTrendPercent` (kpi-helpers.ts:44) + `buildTileAriaLabel` (kpi-helpers.ts:214) all guard against NaN/Infinity, but raw `stats.revenue.monthly`, `stats.leases.active`, `stats.maintenance.open`, `stats.properties.total`, `stats.units.total`, `stats.units.occupied` are piped through `String(...)` and `KpiNumberTicker` without guards. RPC contract types these as `number`, so NaN would only appear on stale/corrupted rows. The cycle-1 WR-02 scope was specifically `percentChange` + `occupancyRate`; expanding to every stat field is a design judgment, not a bug. Defer to a future hardening phase if the RPC ever ships dirty data. Reaffirmed for cycle 5.

4. **Recharts mock omits `type` and `margin` props on Area/AreaChart.** Production passes `type="monotone"` (kpi-sparkline.tsx:61) + `margin={{...}}` (kpi-sparkline.tsx:44) but no test asserts these. Cycle-3 + cycle-4 review acknowledged this as a non-finding ("adding mock coverage for unasserted props would only increase mock surface area without adding test value"). Reaffirmed for cycle 5.

5. **Quick Actions `recordPayment` button no-op.** Pre-existing — `dashboard-types.ts` and `dashboard.tsx`'s switch logic predates Phase 3; the `onRecordPayment` prop is plumbed through Dashboard but page.tsx has never wired it. Not in Phase 3 scope (no commit in the diff range touches Quick Actions wiring). Flag for the next dashboard-feature phase.

6. **`KpiNumberTicker` reduced-motion check fires per-instance.** Six tiles → six `useReducedMotion()` calls → six matchMedia subscriptions. Each subscription is cheap (single MediaQueryList ref), but a single hook at the parent + prop-drilling would be more efficient. Not a correctness issue, and the React Compiler's auto-memoization makes the duplication essentially free. Reaffirmed for cycle 5.

7. **`KpiBentoRow` skeleton-vs-loaded duplicate heading id.** Both branches use `id="kpi-bento-heading"` for the `<h2 className="sr-only">`. The render is mutually exclusive (early return at `kpi-bento-row.tsx:336`), so the id is never duplicated in the live DOM. Documented for completeness; not a finding.

8. **`BlurFade` always emits `will-change-transform` class.** The test `kpi-bento-row.test.tsx:264-266` correctly verifies the bypass: when reduced-motion is true, `KpiBentoRow` renders `<KpiTile />` directly (no `BlurFade` wrapper), so no `[class*=will-change-transform]` element exists. The bypass — not an internal `BlurFade` reduced-motion gate — is what the assertion proves. Verified by tracing `kpi-bento-row.tsx:355-361`. Not a finding.

9. **`use-reduced-motion.ts:21` `typeof window === "undefined"` guard inside `useEffect`.** Unreachable in practice (effects only run on client), but harmless defense-in-depth. Same defensive pattern present in `BlurFade`. Reaffirmed for cycle 5.

---

## Cycle Discipline

This is **cycle 5 of the perfect-PR gate**. Cycle 5 was supposed to be zero-finding to advance the consecutive-zero-finding counter to 1. It is not zero-finding (1 finding). Per the perfect-PR gate, the consecutive counter remains at 0. After this cycle's fix lands:

- Cycle 6 must close IN-5C-01 + verify no fresh regressions.
- Cycle 6 must be zero-finding to advance the counter to 1.
- Cycle 7 must also be zero-finding to advance the counter to 2 and close the gate.

Expected cycle-5 fix blast radius:
- `src/components/dashboard/components/__tests__/kpi-sparkline.test.tsx` — replace the first comment block (lines 50-53) with the symbol-anchored prose form (IN-5C-01)

This change touches one comment block in one test file. No runtime code path is affected; the test continues to assert the same `waitFor()` semantics. The change is purely a documentation drift-guard. typecheck + lint + the 5 test files remain green.

The recurring pattern — each cycle's fix introduces or exposes a new sibling defense-in-depth gap or drift-prone reference on a parallel file that the next cycle catches — continues to validate the perfect-PR gate's value. The cycle-1 WR-02 NaN guard taught the codebase its `Number.isFinite` discipline; cycle-2 WR-2C-02 extended trim discipline to the empty-trendLabel case; cycle-3 WR-3C-01 extended trim discipline to the malformed-stable-branch trendLabel case; cycle-4 WR-4C-01 closed the last remaining sibling on the non-stable branch (the trim discipline is now uniform across both `buildTileAriaLabel` branches); cycle-5 IN-5C-01 closes the last remaining drift-prone-line-reference file. After IN-5C-01 lands, all 14 Phase 3 files will be uniformly symbol-anchored — the documentation discipline established by cycle 2 IN-2C-02 will be fully propagated.

The pattern of "each cycle sweeps a specific file group; the next cycle catches the missed sibling" has now repeated four times (cycle 2 → cycle 4 trim discipline; cycle 2 → cycle 5 line-ref discipline). The next cycle should perform a true PR-wide sweep, not a target-file sweep, to break the pattern.

---

_Reviewed: 2026-05-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Cycle: 5 of (≥2 consecutive zero-finding required)_
_Consecutive zero-finding cycles: 0_
