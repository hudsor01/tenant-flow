---
phase: 03-kpi-bento-row
reviewed: 2026-05-24T00:00:00Z
depth: deep
cycle: 3
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
  warning: 1
  info: 1
  total: 2
status: issues_found
perfect_pr_gate: cycle 3 NOT zero-finding — counter resets to 0
consecutive_zero_finding_cycles: 0
---

# Phase 3: Code Review Report — Cycle 3

**Reviewed:** 2026-05-24
**Depth:** deep
**Files Reviewed:** 14
**Status:** issues_found
**Cycle:** 3 of (≥2 consecutive zero-finding required)

## Summary

Cycle-2 fix commit `25c0f581b` closed all 4 cycle-2 findings cleanly:

- **WR-2C-01 closed.** `grep -n 'Phase 3' src/components/dashboard/dashboard-data.ts src/components/dashboard/dashboard-data.test.ts` shows the exact wording from `dashboard.tsx` propagated to both files: `"Phase 3 mounted <KpiBentoRow> but explicitly did NOT do the dashboard-view.tsx consumer migration; that work is deferred to a later phase (see ROADMAP.md)."` Both files now describe the architectural seam consistently with `dashboard.tsx`.
- **WR-2C-02 closed.** `kpi-helpers.ts:225-226` adds the ternary: `windowText ? "Unchanged vs. ${windowText}" : "Unchanged"`. New unit test at `kpi-helpers.test.ts:192-201` pins the `"Open maintenance: 8. Unchanged."` contract and asserts `not.toContain("vs. .")`. (See WR-3C-01 below for the defense-in-depth gap this fix did not also close.)
- **IN-2C-01 closed.** `kpi-helpers.ts:31-36` adds explicit JSDoc on `formatTrendPercent`: `"The Number.isFinite short-circuit is load-bearing; do NOT remove it as 'defensive overkill' — it defends a real failure mode."` Symmetric block at `kpi-helpers.ts:194-197` on `buildTileAriaLabel`: `"Load-bearing; do NOT remove."` Both load-bearing markers survive a tidy refactor.
- **IN-2C-02 closed.** `grep -n 'dashboard.tsx:\|page.tsx:[0-9]' dashboard-data.ts dashboard-data.test.ts` returns zero hits. The line-number references at `dashboard-data.ts:43-44` and `dashboard-data.test.ts:11-12` were replaced with the prose anchor: `"(search for the portfolioPerformance map in each file; line numbers omitted to avoid drift)"` — drift-immune symbol-anchored reference.

**Cycle-3 surfaces 2 new findings (0 BLOCKER, 1 WARNING, 1 INFO):**

- **WR-3C-01:** `buildTileAriaLabel` stable-branch still emits `"Unchanged vs.   vs. last week"` (double "vs.") when `trendLabel` has leading whitespace. The cycle-2 fix used `windowText` truthiness as the empty-check, but `"  vs. last week"` is truthy even though the regex `/^vs\.\s*/` doesn't strip the leading-whitespace `"vs. "` prefix (regex is anchored at position 0). Same class of defense-in-depth gap WR-2C-02 fixed for the empty-string case; the leading-whitespace case was missed.
- **IN-3C-01:** `KpiSparklineProps` is exported but has zero external consumers — `grep -rn 'KpiSparklineProps' src/` returns only the defining file. Dead export.

This is **cycle 3 of the perfect-PR gate**. Per `.planning/feedback_perfect_pr_gate.md`, two **consecutive zero-finding** cycles are required before merge. Cycle 3 is not zero-finding, so the consecutive counter remains at 0. Another fix + re-review cycle is required.

---

## Warnings

### WR-3C-01: `buildTileAriaLabel` stable-branch defense-in-depth gap — leading-whitespace `trendLabel` emits double "vs."

**File:** `src/components/dashboard/components/kpi-helpers.ts:225-226`

**Issue:**
```typescript
const windowText = (input.trendLabel ?? "").replace(/^vs\.\s*/, "")
trendSegment = windowText ? `Unchanged vs. ${windowText}` : "Unchanged"
```

The cycle-2 WR-2C-02 fix established the discipline of trimming the orphan trailer when the windowText is empty. The implementation uses `windowText` truthiness as the empty-check, but the input normalization is incomplete:

| `input.trendLabel` | After `?? ""` | After `.replace(/^vs\.\s*/, "")` | `windowText` truthy? | Emitted sentence |
|---|---|---|---|---|
| `undefined` | `""` | `""` | no | `"Unchanged"` ✓ |
| `""` | `""` | `""` | no | `"Unchanged"` ✓ |
| `"vs. last month"` | `"vs. last month"` | `"last month"` | yes | `"Unchanged vs. last month"` ✓ |
| `"vs."` | `"vs."` | `""` | no | `"Unchanged"` ✓ |
| `"  vs. last week"` (leading WS) | `"  vs. last week"` | `"  vs. last week"` | **yes (whitespace is truthy)** | `"Unchanged vs.   vs. last week"` ✗ |

The regex `/^vs\.\s*/` is anchored at position 0; leading whitespace breaks the anchor match, so the original string survives the `.replace()` intact. `windowText` is then truthy (whitespace counts), and the output becomes the doubled `"Unchanged vs.   vs. last week"` — same orphan-fragment class the cycle-2 fix was supposed to harden against.

Current production callers (`kpi-bento-row.tsx:185, 204, 242`) pass clean `"vs. last month"`, so this is not triggered today. But the cycle-1 WR-02 + cycle-2 WR-2C-02 fixes established the discipline of hardening defense-in-depth even when current callers don't trigger the gap — the cycle-2 review explicitly said: `"the cycle-1 WR-02 fix established the discipline of hardening defense-in-depth even when current callers don't trigger the gap. The stable branch is exactly the same class of defect the trimEnd guard catches on the non-stable branch."` The same logic applies to the cycle-3 cycle: cycle-2's fix closed the `undefined / "" / "vs."` edge cases but missed the leading-whitespace edge case.

**Fix:**
```diff
-const windowText = (input.trendLabel ?? "").replace(/^vs\.\s*/, "")
-trendSegment = windowText ? `Unchanged vs. ${windowText}` : "Unchanged"
+// Trim first so leading whitespace doesn't defeat the `^vs.` anchor, then
+// strip a literal `vs. ` prefix the caller may already have included.
+const windowText = (input.trendLabel ?? "").trim().replace(/^vs\.\s*/, "")
+trendSegment = windowText ? `Unchanged vs. ${windowText}` : "Unchanged"
```

Add a regression test in `kpi-helpers.test.ts` describe-block `buildTileAriaLabel`:

```typescript
it("strips leading whitespace from trendLabel before the 'vs.' anchor (no doubled 'vs.')", () => {
  const out = buildTileAriaLabel({
    label: "Active leases",
    spokenValue: "42",
    trend: stableTrend,
    trendLabel: "  vs. last week", // pathological caller input
  })
  expect(out).toBe("Active leases: 42. Unchanged vs. last week.")
  expect(out).not.toMatch(/vs\.\s+vs\./)
  expect(out).not.toMatch(/ {2}/)
})
```

The `.trim()` also future-proofs trailing whitespace (e.g. `"vs. last week  "` → `"last week"` instead of `"last week  "` which would produce `"Unchanged vs. last week  ."` — same `/ \./` violation the non-stable branch's `trimEnd()` catches).

---

## Info

### IN-3C-01: `KpiSparklineProps` is exported but has zero external consumers — dead export

**File:** `src/components/dashboard/components/kpi-sparkline.tsx:22`

**Issue:**
```typescript
export interface KpiSparklineProps {
  data: TimeSeriesDataPoint[];
  trend: "up" | "down" | "stable";
  ariaLabel: string;
}

export function KpiSparkline({ data, trend, ariaLabel }: KpiSparklineProps) {
```

`grep -rn 'KpiSparklineProps' src/` returns only the defining file (line 22 declaration + line 28 self-reference). The interface is exported but never imported anywhere. The function `KpiSparkline` is consumed at `kpi-bento-row.tsx:317` (`<KpiSparkline data={...} trend={...} ariaLabel={...} />`) — but only the function, not the prop type.

Compare to the sibling pattern: `KpiBentoRowProps` (exported from `kpi-helpers.ts:139`) IS consumed externally — `page.tsx:6`, `sections/dashboard.ts:3`, three test files. That export is load-bearing. `KpiSparklineProps` is not — it's a typing-via-destructure convenience that didn't need to be exported.

This isn't a Zero Tolerance violation (Rule 2 — "No barrel files / re-exports" — applies to file-level barrels, not interface exports), and `noUnusedLocals` doesn't fire on exported declarations. But it's a code-quality nit consistent with the project's terse-discipline standard: ship only the surface that's actually consumed.

**Fix:**
```diff
-export interface KpiSparklineProps {
+interface KpiSparklineProps {
   data: TimeSeriesDataPoint[];
   trend: "up" | "down" | "stable";
   ariaLabel: string;
 }
```

Defer if a future phase needs to import `KpiSparklineProps` for prop-forwarding (none currently planned).

---

## Verification of cycle-2 fix claims

| Cycle-2 finding | Fix claim | Verified |
|---|---|---|
| WR-2C-01 | `dashboard-data.ts` + `dashboard-data.test.ts` JSDoc now describes seam consistently with `dashboard.tsx` ("Phase 3 mounted <KpiBentoRow> but explicitly did NOT do the dashboard-view.tsx consumer migration") | ✓ `dashboard-data.ts:14, 52` + `dashboard-data.test.ts:15-19` carry the exact mirrored wording; no stale `"Phase 3 scope"` claim remains |
| WR-2C-02 | `buildTileAriaLabel(stable, undefined)` emits `"Unchanged."` (no orphan `vs. .`); new test pins the contract | ✓ `kpi-helpers.ts:225-226` ternary in place; `kpi-helpers.test.ts:192-201` test pins `"Open maintenance: 8. Unchanged."` + asserts `not.toContain("vs. .")` (SEE WR-3C-01 for the leading-whitespace gap this fix did not also close) |
| IN-2C-01 | `formatTrendPercent` + `buildTileAriaLabel` JSDoc documents NaN/Infinity guard as load-bearing | ✓ `kpi-helpers.ts:31-36` documents the guard as `"load-bearing; do NOT remove it as 'defensive overkill'"` on `formatTrendPercent`; `kpi-helpers.ts:194-197` documents `"Load-bearing; do NOT remove."` on `buildTileAriaLabel`. Both phrasings survive a tidy refactor — a future maintainer who reads "load-bearing" will not delete the guard |
| IN-2C-02 | Stale line refs replaced with symbol-anchored references | ✓ `grep -n 'dashboard.tsx:\|page.tsx:[0-9]' dashboard-data.ts dashboard-data.test.ts` returns zero hits; both files now say `"(line numbers omitted to avoid drift; search for the portfolioPerformance map in each file)"` |

All 4 cycle-2 findings closed at their pinned files. WR-3C-01 surfaces because the cycle-2 WR-2C-02 fix used `windowText` truthiness as the empty-check, but didn't normalize leading whitespace — the same class of edge case the cycle-1 WR-02 + cycle-2 WR-2C-02 defense-in-depth chain has been hardening incrementally.

---

## Fresh adversarial pass — Zero Tolerance check

| Rule | Result |
|---|---|
| 1 — No `any` types | ✓ `grep -nE ': any\b\|as any\b\|<any>' src/components/dashboard/components/kpi-*.{ts,tsx} src/components/dashboard/dashboard*.{ts,tsx} src/hooks/use-reduced-motion.ts src/hooks/__tests__/use-reduced-motion.test.ts src/test/mocks/recharts.tsx src/types/sections/dashboard.ts src/app/\(owner\)/dashboard/page.tsx` → 0 hits across all 14 files |
| 2 — No barrel files | ✓ no `index.ts` re-exports in the changed component dir; all imports point at defining files |
| 3 — No duplicate types | ✓ `MetricTrend`, `TimeSeriesDataPoint`, `DashboardStats`, `PropertyPerformance` all sourced from canonical `src/types/`; `KpiBentoRowProps.metricTrends` shape is the canonical surface (mirrored by `DashboardStatsData.metricTrends` in `use-owner-dashboard.ts:181-186` — structural-equivalence by design, not a duplicate-type bug) |
| 4 — No commented-out code | ✓ all comments are explanatory anchors/load-bearing markers, none are commented-out code |
| 5 — No inline styles | ✓ only the documented exemption: `style={GRID_CONTAINER_STYLE}` (static `containerType` + `containerName` keys for the container-query parent) appears twice; both flagged with the SOLE-exemption rationale comment at `kpi-bento-row.tsx:26-29` |
| 6 — No PG ENUMs | n/a (no migration in this phase) |
| 7 — No emojis in code | ✓ Lucide icons (`ArrowUp`, `ArrowDown`, `Minus`) used; no Unicode emoji escape sequences |
| 8 — No `as unknown as` | ✓ `grep -rn 'as unknown as' src/components/dashboard/ src/hooks/use-reduced-motion.ts src/test/mocks/recharts.tsx src/types/sections/dashboard.ts src/app/\(owner\)/dashboard/page.tsx` → 0 hits in the 14 reviewed files (one hit in `expiring-leases-widget.tsx` is unrelated to Phase 3 and pre-existing) |
| 9 — No string-literal query keys | n/a (no new queries; reads from existing factory via `useDashboardStats`, `useDashboardCharts`, `usePropertyPerformance`) |
| 10 — No `@radix-ui/react-icons` | ✓ 0 hits in changed files |

| Check | Result |
|---|---|
| Hardcoded secrets | ✓ none |
| Dangerous functions (`eval`, `innerHTML`, raw-html-injection sinks) | ✓ none in changed files |
| Debug artifacts (`console.log`, `debugger`, `TODO`, `FIXME`, `XXX`, `HACK`) | ✓ `grep -nE 'console\.log\|debugger\|TODO\|FIXME\|XXX\|HACK' <14 files>` → 0 hits |
| Empty catch blocks | ✓ none |
| D-01 invariant (6 tiles in canonical order) | ✓ `kpi-bento-row.tsx:174-268` emits `revenue, occupancy, active-leases, open-maintenance, properties, units` in that order; test `kpi-bento-row.test.tsx:124-146` pins the labels in order |
| D-04 invariant (3 trend-bearing, 3 no-trend; Active leases is no-trend post-cycle-1) | ✓ Revenue + Occupancy + Open maintenance carry trends (`metricTrends.monthlyRevenue`, `metricTrends.occupancyRate`, `metricTrends.openMaintenance`); Active leases + Properties + Units carry `trend: null`; test `kpi-bento-row.test.tsx:178-186` pins the negative + positive assertions |
| D-05 wave coefficients `{0,1,2,4,5,6}` (coefficient 3 skipped) | ✓ `kpi-bento-row.tsx:192,211,225,244,254,266` carries `waveDelay: 0,1,2,4,5,6`; coefficient 3 is intentionally skipped between Active leases (2) and Open maintenance (4) |
| D-09 honesty (no fabricated trends) | ✓ Active-leases tile sets `trend: null` (no `active_leases` RPC signal); `metricTrends.<field> === null` propagates to `<StatTrend>` omission (`kpi-bento-row.tsx:283 const trendChip = tile.trend ? ... : null`); both behaviors pinned by tests |
| D-10 grid (auto-fit minmax(180px,1fr), gap-4 → gap-6 at @4xl) | ✓ `kpi-bento-row.tsx:35-39` exact match: `"grid gap-4", "grid-cols-[repeat(auto-fit,minmax(180px,1fr))]", "@4xl/kpi-bento:gap-6"` |
| Reduced-motion correctness end-to-end | ✓ `useReducedMotion` subscribes on mount + cleans up on unmount (`use-reduced-motion.ts:19-26`); `KpiNumberTicker` short-circuits to static `Intl.NumberFormat` (`kpi-bento-row.tsx:63-73`); `KpiBentoRow` bypasses `BlurFade` wrapping (`kpi-bento-row.tsx:355-361`); test `kpi-bento-row.test.tsx:254-268` pins via absence of `[class*=will-change-transform]`; `useReducedMotion.test.ts:109-125` pins listener cleanup |
| jsdom matchMedia stub covers both true and false paths | ✓ `kpi-bento-row.test.tsx:117-122` defaults `stubMatchMedia(false)` per-test; the reduced-motion test re-stubs to `true` inside the test body (line 255); `useReducedMotion.test.ts` exercises both initial-`false` and initial-`true` paths plus the `change`-event transition (line 81-107) |
| WAI-ARIA list semantics (post-cycle-1 WR-01 restructure) | ✓ `kpi-bento-row.tsx:347` parent grid `role="list"`; `kpi-bento-row.tsx:354` child div `role="listitem"` is direct child of the list; listitem wraps both `BlurFade` and raw `KpiTile` branches symmetrically; tested via `screen.getAllByRole("listitem")` returning 6 elements on both reduced and non-reduced paths |
| Skeleton grid drops role="list" + adds aria-busy="true" | ✓ `kpi-bento-row.tsx:107-110` section carries `aria-busy="true"` + no `role="list"` on the inner grid div (line 115); `kpi-bento-row.test.tsx:217` pins `aria-busy="true"` |
| Type safety (DashboardProps shape, no `metrics`, no `DashboardMetrics`) | ✓ `grep -n 'DashboardMetrics\b' src/` returns 0 hits (only the unrelated `DashboardMetricsResponse` in `core.ts:365`); `DashboardProps.kpiData: KpiBentoRowProps` is the sole shape consumed by `<Dashboard>` |
| exactOptionalPropertyTypes compliance | ✓ `kpi-bento-row.tsx:278-281` uses conditional-spread pattern for optional `spokenDescription` and `trendLabel`; never assigns `undefined` directly |
| Cross-module type drift | ✓ `DashboardStatsData.metricTrends` (in `use-owner-dashboard.ts:181-186`) matches `KpiBentoRowProps.metricTrends` (in `kpi-helpers.ts:146-157`) exactly |
| Sparkline gradient id collision risk | ✓ deterministic `spark-fill-${trend}` ids (`kpi-sparkline.tsx:30`); when Revenue + Occupancy share the same trend (e.g., both `up`), they share an id but both resolve `var(--color-spark)` and the chart container scopes the variable to the matching token — safe by coincidence; test at `kpi-sparkline.test.tsx:60` pins the id pattern |
| Cross-file dead `DashboardMetrics` consumers (tests, e2e, storybook) | ✓ `grep -rn 'DashboardMetrics\b' src/ tests/` returns only the unrelated `DashboardMetricsResponse` |
| Recharts mock covers all Area/AreaChart props production uses | ⚠ Mock covers `dataKey, fill, stroke, strokeWidth, isAnimationActive, dot, activeDot`. Production also passes `type="monotone"` on `<Area>` (`kpi-sparkline.tsx:57`) + `margin` on `<AreaChart>` (`kpi-sparkline.tsx:40`) — neither is mocked, neither is asserted by any test. Not a regression (no test depends on them) but a latent coverage gap if a future bug regresses `type="monotone"` to a non-monotone interpolation |

The recharts-mock coverage gap is not a finding — no test in scope depends on `type` or `margin`, and adding mock coverage for unasserted props would only increase mock surface area without adding test value. Flagged in the verification table for transparency, not as a Cycle-3 finding.

---

## Cycle Discipline

This is **cycle 3 of the perfect-PR gate**. Cycle 3 was supposed to be zero-finding to advance the consecutive-zero-finding counter to 1. It is not zero-finding (2 findings). Per the perfect-PR gate, the consecutive counter remains at 0. After this cycle's fixes land:

- Cycle 4 must close WR-3C-01 and IN-3C-01 + verify no fresh regressions.
- Cycle 4 must be zero-finding to advance the counter to 1.
- Cycle 5 must also be zero-finding to advance the counter to 2 and close the gate.

Expected cycle-3 fix blast radius:
- `src/components/dashboard/components/kpi-helpers.ts` — one-line `.trim()` insertion in the stable-branch windowText normalization (WR-3C-01)
- `src/components/dashboard/components/__tests__/kpi-helpers.test.ts` — new "strips leading whitespace from trendLabel" test (WR-3C-01 lockstep)
- `src/components/dashboard/components/kpi-sparkline.tsx` — drop `export` modifier on `KpiSparklineProps` (IN-3C-01)

None of these changes touch the runtime contract observable from outside the Phase 3 source tree. WR-3C-01 is a defense-in-depth fix that current callers never trigger; IN-3C-01 is a surface-area trim.

The recurring pattern — each cycle's fix introduces a new sibling defense-in-depth gap that the next cycle catches — is exactly what the perfect-PR gate is designed to surface. The cycle-1 WR-02 NaN guard taught the codebase its trim discipline; cycle-2 WR-2C-02 extended that discipline to the empty-trendLabel case; cycle-3 WR-3C-01 extends it to the malformed-trendLabel case. Two more zero-finding cycles required before the gate closes.

---

_Reviewed: 2026-05-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Cycle: 3 of (≥2 consecutive zero-finding required)_
_Consecutive zero-finding cycles: 0_
