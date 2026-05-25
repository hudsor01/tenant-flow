---
phase: 03-kpi-bento-row
reviewed: 2026-05-24T00:00:00Z
depth: deep
cycle: 4
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
perfect_pr_gate: cycle 4 NOT zero-finding — counter resets to 0
consecutive_zero_finding_cycles: 0
---

# Phase 3: Code Review Report — Cycle 4

**Reviewed:** 2026-05-24
**Depth:** deep
**Files Reviewed:** 14
**Status:** issues_found
**Cycle:** 4 of (≥2 consecutive zero-finding required)

## Summary

Cycle-3 fix commit `e83bb6e7e` closed both cycle-3 findings cleanly:

- **WR-3C-01 closed.** `kpi-helpers.ts:225-227` now reads `(input.trendLabel ?? "").trim().replace(/^vs\.\s*/, "")` — the `.trim()` runs BEFORE the `^vs.` anchor strip, so leading whitespace no longer defeats the regex. New regression test at `kpi-helpers.test.ts:206-216` pins the `"Open maintenance: 8. Unchanged vs. last week."` contract for `trendLabel: "  vs. last week"` and asserts `not.toContain("vs.   vs.")` plus `not.toMatch(/ {2}/)`. All 5 documented edge cases traced through correctly:
  - `undefined` → `""` → `""` → `"Unchanged"` ✓
  - `"  vs. last week"` → `"vs. last week"` → `"last week"` → `"Unchanged vs. last week"` ✓
  - `"vs."` → `"vs."` → `""` → `"Unchanged"` ✓
  - `"  "` (WS-only) → `""` → `""` → `"Unchanged"` ✓
  - `"since 2020"` → `"since 2020"` → `"since 2020"` → `"Unchanged vs. since 2020"` (questionable phrasing, but consistent with the non-stable branch — see WR-4C-01 below for the asymmetry this exposes)
- **IN-3C-01 closed.** `kpi-sparkline.tsx:26` now declares `interface KpiSparklineProps` (no `export` modifier). `grep -rn 'KpiSparklineProps' src/` returns only 3 hits, all in the defining file (comment at line 22, declaration at line 26, destructure annotation at line 32). The interface is still useful for the destructure type annotation. Sibling `KpiBentoRowProps` correctly stays exported because `page.tsx:6`, `sections/dashboard.ts:3`, and three test files consume it externally.

**Cycle-4 surfaces 2 new findings (0 BLOCKER, 1 WARNING, 1 INFO):**

- **WR-4C-01:** The cycle-3 fix added `.trim()` to the STABLE branch of `buildTileAriaLabel`, but the non-stable branch (lines 230-231) still uses `trimEnd()` only. A `trendLabel` with leading whitespace (e.g. `"  vs. last week"`) routed through an up/down trend produces `"Up 12 percent   vs. last week."` — three internal spaces, violating the `/ {2}/` discipline that WR-2C-02 + WR-3C-01 established for the stable branch. Same defense-in-depth gap class, sibling code path. Each cycle's fix has closed one branch's instance of this defect; the non-stable branch has been silently carrying it since the original implementation.
- **IN-4C-01:** `use-reduced-motion.ts:6` carries the line-number reference `src/components/ui/blur-fade.tsx:22-31` in JSDoc. Same drift-prone pattern that IN-2C-02 swept out of `dashboard-data.ts` + `dashboard-data.test.ts` — the cycle-2 sweep was scoped to those two files, so the new Phase-3 hook (added in commit `9fd4121e9` within this PR's diff range) was missed. If `blur-fade.tsx` is refactored, the line range silently becomes wrong.

This is **cycle 4 of the perfect-PR gate**. Per `.planning/feedback_perfect_pr_gate.md`, two **consecutive zero-finding** cycles are required before merge. Cycle 4 is not zero-finding, so the consecutive counter remains at 0. Another fix + re-review cycle is required. The recurring pattern — each cycle's fix surfaces a sibling defense-in-depth gap on a parallel code path — continues to validate the perfect-PR gate's value.

---

## Warnings

### WR-4C-01: `buildTileAriaLabel` non-stable branch defense-in-depth gap — leading-whitespace `trendLabel` emits internal double-space

**File:** `src/components/dashboard/components/kpi-helpers.ts:229-232`

**Issue:**
```typescript
} else {
    const base = `${directionWord} ${pct} percent ${input.trendLabel ?? ""}`;
    trendSegment = base.trimEnd();
}
```

The cycle-3 WR-3C-01 fix established the discipline of `.trim()`-ing `trendLabel` BEFORE interpolating it into the trend sentence, specifically to harden against leading-whitespace inputs that defeat downstream regex anchors and produce malformed output. The fix landed on the STABLE branch (lines 225-227) but the parallel non-stable branch was left with the original `trimEnd()`-only normalization. That's a defense-in-depth gap on a sibling code path — the exact same defect class WR-3C-01 was filed against.

| `input.trendLabel` | `base` (template literal) | After `.trimEnd()` | Output sentence | Discipline violation |
|---|---|---|---|---|
| `undefined` | `"Up 12 percent "` | `"Up 12 percent"` | `"Up 12 percent."` | none ✓ |
| `"vs. last month"` | `"Up 12 percent vs. last month"` | `"Up 12 percent vs. last month"` | `"Up 12 percent vs. last month."` | none ✓ |
| `""` | `"Up 12 percent "` | `"Up 12 percent"` | `"Up 12 percent."` | none ✓ |
| `"  vs. last week"` (leading WS) | `"Up 12 percent   vs. last week"` (3 internal spaces) | `"Up 12 percent   vs. last week"` (`trimEnd()` doesn't touch internal whitespace) | `"Up 12 percent   vs. last week."` ✗ | violates `/ {2}/` (WR-2C-02) |
| `"vs. last week  "` (trailing WS) | `"Up 12 percent vs. last week  "` | `"Up 12 percent vs. last week"` | `"Up 12 percent vs. last week."` | none ✓ (trimEnd handles this) |

The 4th row is the active gap. Production callers (`kpi-bento-row.tsx:185, 204, 242`) currently pass clean `"vs. last month"` literals, so this is not triggered in practice — but the same was true of WR-2C-02 (`undefined`-trendLabel orphan period) and WR-3C-01 (stable-branch leading WS). Each cycle has filed and fixed the latent gap on the discipline that "current callers don't trigger it" does NOT justify the asymmetry. The non-stable branch is the last remaining sibling carrying the original defect.

Cross-reference: cycle-3 review at REVIEW.md (cycle-3 retained) said:

> "the cycle-1 WR-02 fix established the discipline of hardening defense-in-depth even when current callers don't trigger the gap"

The same logic applies here. WR-4C-01 is the symmetric counterpart of WR-3C-01: stable branch was patched, non-stable branch carries the same defect.

**Fix:**
```diff
 } else {
-    const base = `${directionWord} ${pct} percent ${input.trendLabel ?? ""}`;
-    trendSegment = base.trimEnd();
+    // Symmetric with the stable branch (cycle-3 WR-3C-01 fix): trim the
+    // caller-supplied trendLabel before interpolation so leading whitespace
+    // doesn't produce an internal double-space, and trailing whitespace
+    // doesn't survive past the period. `.trim()` covers both. Empty result
+    // falls through to `.trimEnd()` on the bare `"<dir> <pct> percent "`.
+    const trimmedLabel = (input.trendLabel ?? "").trim();
+    const base = `${directionWord} ${pct} percent ${trimmedLabel}`;
+    trendSegment = base.trimEnd();
 }
```

Add regression test in `kpi-helpers.test.ts` describe-block `buildTileAriaLabel`:

```typescript
// WR-4C-01 cycle-4 fix: symmetric with cycle-3 WR-3C-01 — the non-stable
// branch must also trim leading whitespace from trendLabel so it does not
// emit an internal double-space between "percent" and the trend window.
it("trims leading whitespace from trendLabel on the up/down branch (no internal double-space)", () => {
    const out = buildTileAriaLabel({
        label: "Revenue",
        spokenValue: "$14,250 this month",
        trend: upTrend,
        trendLabel: "  vs. last week", // pathological caller input
    });
    expect(out).toBe("Revenue: $14,250 this month. Up 12 percent vs. last week.");
    expect(out).not.toMatch(/ {2}/);
});
```

This closes the last sibling defense-in-depth gap in `buildTileAriaLabel` — once landed, both branches normalize `trendLabel` identically and the function's whitespace-handling contract is uniform.

---

## Info

### IN-4C-01: `use-reduced-motion.ts:6` carries a stale-line-prone reference `blur-fade.tsx:22-31` — IN-2C-02 sweep missed this Phase-3 file

**File:** `src/hooks/use-reduced-motion.ts:6`

**Issue:**
```typescript
/**
 * SSR-safe shared hook returning whether the user has
 * `prefers-reduced-motion: reduce` set. Extracts the inline pattern from
 * `BlurFade` (src/components/ui/blur-fade.tsx:22-31) so Phase 3+ surfaces
 * can gate motion through a single canonical source (03-UI-SPEC § 5.4).
```

The reference is accurate today (lines 22-31 in `blur-fade.tsx` do contain the original prefers-reduced-motion pattern this hook extracts), but it's the same drift-prone pattern that IN-2C-02 swept out of `dashboard-data.ts:43-44` and `dashboard-data.test.ts:11-12`. The cycle-2 sweep was scoped to those two files because they were the IN-2C-02 finding's specific target — `use-reduced-motion.ts` was already in the PR diff range (added in commit `9fd4121e9`) but wasn't included in the sweep.

The same drift risk applies: if `blur-fade.tsx` is refactored (e.g., `useState` initialization changes, useEffect body restructured), the `22-31` range silently becomes wrong. The comment is a documentation pointer to a stable upstream pattern — symbol-anchored is more durable than line-anchored.

**Fix:**
```diff
 /**
  * SSR-safe shared hook returning whether the user has
  * `prefers-reduced-motion: reduce` set. Extracts the inline pattern from
- * `BlurFade` (src/components/ui/blur-fade.tsx:22-31) so Phase 3+ surfaces
- * can gate motion through a single canonical source (03-UI-SPEC § 5.4).
+ * `BlurFade` (the `prefersReducedMotion` useState + useEffect block in
+ * `src/components/ui/blur-fade.tsx` — search for the
+ * `(prefers-reduced-motion: reduce)` matchMedia call) so Phase 3+ surfaces
+ * can gate motion through a single canonical source (03-UI-SPEC § 5.4).
  */
```

Drift-immune symbol-anchored reference, consistent with the IN-2C-02 discipline applied to `dashboard-data.ts` (`"search for the portfolioPerformance map in each file; line numbers omitted to avoid drift"`).

---

## Verification of cycle-3 fix claims

| Cycle-3 finding | Fix claim | Verified |
|---|---|---|
| WR-3C-01 | `kpi-helpers.ts:225-227` adds `.trim()` BEFORE `.replace(/^vs\.\s*/, "")` so leading whitespace doesn't defeat the regex anchor; new regression test pins the absence of doubled "vs." | ✓ Code is exactly `(input.trendLabel ?? "").trim().replace(/^vs\.\s*/, "")`; test `kpi-helpers.test.ts:206-216` exercises `trendLabel: "  vs. last week"` and asserts both the expected output and `not.toContain("vs.   vs.")` + `not.toMatch(/ {2}/)`. All 5 stable-branch edge cases traced through correctly (see Summary table) |
| IN-3C-01 | Drop `export` modifier on `KpiSparklineProps` since it has zero external consumers | ✓ `kpi-sparkline.tsx:26` reads `interface KpiSparklineProps {` (no `export`); `grep -rn 'KpiSparklineProps' src/` returns 3 hits, all in the defining file (comment + declaration + destructure annotation). Sibling `KpiBentoRowProps` correctly stays exported (5 external consumers: page.tsx, sections/dashboard.ts, three test files) |

Both cycle-3 fixes closed at the pinned files with the documented mechanics. WR-3C-01 closed the stable branch leading-whitespace case but did NOT extend the same fix to the non-stable branch — that's WR-4C-01.

---

## Fresh adversarial pass — Zero Tolerance check (re-grepped for cycle 4)

| Rule | Result |
|---|---|
| 1 — No `any` types | ✓ `grep -rnE ':\s*any\b\|as\s+any\b\|<any>' <14 files>` → 0 hits |
| 2 — No barrel files | ✓ no `index.ts` re-exports in changed component dir; all imports point at defining files |
| 3 — No duplicate types | ✓ `MetricTrend`, `TimeSeriesDataPoint`, `DashboardStats`, `PropertyPerformance` all sourced from canonical `src/types/`; `KpiBentoRowProps.metricTrends` mirrors `DashboardStatsData.metricTrends` (`use-owner-dashboard.ts:154-159`) by structural design — same shape, two consumers, not a duplicate type declaration |
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
| Reduced-motion correctness end-to-end | ✓ `useReducedMotion` subscribes on mount + cleans up on unmount (`use-reduced-motion.ts:19-26`); `KpiNumberTicker` short-circuits to static `Intl.NumberFormat` (`kpi-bento-row.tsx:63-73`); `KpiBentoRow` bypasses `BlurFade` wrapping (`kpi-bento-row.tsx:355-361`); test `kpi-bento-row.test.tsx:254-268` pins via absence of `[class*=will-change-transform]`; `use-reduced-motion.test.ts:109-125` pins listener cleanup |
| jsdom matchMedia stub covers both true and false paths | ✓ `kpi-bento-row.test.tsx:117-122` defaults `stubMatchMedia(false)` per-test; reduced-motion test re-stubs to `true` inside the test body (line 255); `use-reduced-motion.test.ts` exercises both initial-`false` and initial-`true` paths plus the `change`-event transition |
| WAI-ARIA list semantics (post-cycle-1 WR-01 restructure) | ✓ `kpi-bento-row.tsx:347` parent grid `role="list"`; `kpi-bento-row.tsx:354` child div `role="listitem"` is direct child of the list; listitem wraps both `BlurFade` and raw `KpiTile` branches symmetrically |
| Skeleton grid drops role="list" + adds aria-busy="true" | ✓ `kpi-bento-row.tsx:107-110` section carries `aria-busy="true"` + no `role="list"` on the inner grid div; `kpi-bento-row.test.tsx:217` pins `aria-busy="true"` |
| Type safety (DashboardProps shape, no legacy `metrics`) | ✓ `grep -n 'DashboardMetrics\b' src/` returns 0 hits (only unrelated `DashboardMetricsResponse` in `core.ts`); `DashboardProps.kpiData: KpiBentoRowProps` is the sole shape consumed |
| exactOptionalPropertyTypes compliance | ✓ `kpi-bento-row.tsx:278-281` uses conditional-spread for optional `spokenDescription` and `trendLabel`; never assigns `undefined` directly |
| Cross-module type drift | ✓ `DashboardStatsData.metricTrends` (in `use-owner-dashboard.ts:154-159`) matches `KpiBentoRowProps.metricTrends` (in `kpi-helpers.ts:146-157`) exactly |
| Sparkline gradient id collision risk | ✓ deterministic `spark-fill-${trend}` ids (`kpi-sparkline.tsx:34`); when Revenue + Occupancy share the same trend, they share an id but both resolve `var(--color-spark)` and the chart container scopes the variable to the matching token |
| Test infrastructure (chai 6 / Vitest 4 toThrow trap) | ✓ `kpi-bento-row.test.tsx:316` uses bare `not.toThrow()` (no string arg) — safe per CLAUDE.md note on the chai 6 bug |
| `typecheck` passes | ✓ `bun run typecheck` → exit 0 |
| `lint` passes | ✓ `bun run lint` → `Checked 1202 files in 228ms. No fixes applied.` |
| All 38 Phase-3 unit tests pass | ✓ `bun vitest --project unit --run <5 files>` → `Test Files 5 passed (5) / Tests 38 passed (38)` |

---

## Items considered and explicitly NOT filed

These are gaps observed during the adversarial pass that did NOT meet the bar for cycle-4 findings, documented for transparency:

1. **Asymmetric NaN/Infinity guarding across stat fields.** `safeOccupancy` (kpi-bento-row.tsx:150-152) and `formatTrendPercent` (kpi-helpers.ts:44) + `buildTileAriaLabel` (kpi-helpers.ts:214) all guard against NaN/Infinity, but raw `stats.revenue.monthly`, `stats.leases.active`, `stats.maintenance.open`, `stats.properties.total`, `stats.units.total`, `stats.units.occupied` are piped through `String(...)` and `KpiNumberTicker` without guards. RPC contract types these as `number`, so NaN would only appear on stale/corrupted rows. The cycle-1 WR-02 scope was specifically `percentChange` + `occupancyRate`; expanding to every stat field is a design judgment, not a bug. Defer to a future hardening phase if the RPC ever ships dirty data.
2. **Recharts mock omits `type` and `margin` props on Area/AreaChart.** Production passes `type="monotone"` (kpi-sparkline.tsx:61) + `margin={{...}}` (kpi-sparkline.tsx:44) but no test asserts these. Cycle-3 review acknowledged this as a non-finding ("adding mock coverage for unasserted props would only increase mock surface area without adding test value"). Reaffirmed for cycle 4.
3. **Quick Actions `recordPayment` button no-op.** `dashboard-types.ts:43-46` declares the action, `dashboard.tsx:160` switches on it, but `page.tsx` does not pass `onRecordPayment`. Pre-existing — `dashboard-types.ts` and `dashboard.tsx`'s switch logic predates Phase 3; the `onRecordPayment` prop is plumbed through Dashboard but page.tsx has never wired it. Not in Phase 3 scope (no commit in the diff range touches Quick Actions wiring). Flag for the next dashboard-feature phase.
4. **`KpiNumberTicker` reduced-motion check fires per-instance.** Six tiles → six `useReducedMotion()` calls → six matchMedia subscriptions. Each subscription is cheap (single MediaQueryList ref), but a single hook at the parent + prop-drilling would be more efficient. Not a correctness issue, and the React Compiler's auto-memoization makes the duplication essentially free. Not filing.
5. **`KpiBentoRow` skeleton-vs-loaded duplicate heading id.** Both branches use `id="kpi-bento-heading"` for the `<h2 className="sr-only">`. The render is mutually exclusive (early return at `kpi-bento-row.tsx:336`), so the id is never duplicated in the live DOM. Documented for completeness; not a finding.

---

## Cycle Discipline

This is **cycle 4 of the perfect-PR gate**. Cycle 4 was supposed to be zero-finding to advance the consecutive-zero-finding counter to 1. It is not zero-finding (2 findings). Per the perfect-PR gate, the consecutive counter remains at 0. After this cycle's fixes land:

- Cycle 5 must close WR-4C-01 and IN-4C-01 + verify no fresh regressions.
- Cycle 5 must be zero-finding to advance the counter to 1.
- Cycle 6 must also be zero-finding to advance the counter to 2 and close the gate.

Expected cycle-4 fix blast radius:
- `src/components/dashboard/components/kpi-helpers.ts` — extract `trimmedLabel` const in the non-stable branch (WR-4C-01)
- `src/components/dashboard/components/__tests__/kpi-helpers.test.ts` — new "trims leading whitespace from trendLabel on the up/down branch" regression test (WR-4C-01 lockstep)
- `src/hooks/use-reduced-motion.ts` — replace line-anchored `blur-fade.tsx:22-31` reference with symbol-anchored prose (IN-4C-01)

None of these changes touch the runtime contract observable from outside the Phase 3 source tree. WR-4C-01 is a defense-in-depth fix that current callers never trigger; IN-4C-01 is a documentation drift-guard.

The recurring pattern — each cycle's fix introduces or exposes a new sibling defense-in-depth gap that the next cycle catches — continues to validate the perfect-PR gate's value. The cycle-1 WR-02 NaN guard taught the codebase its `Number.isFinite` discipline (extended in two places); cycle-2 WR-2C-02 extended trim discipline to the empty-trendLabel case; cycle-3 WR-3C-01 extended it to the malformed-stable-branch trendLabel case; cycle-4 WR-4C-01 closes the last remaining sibling on the non-stable branch. After WR-4C-01 lands, `buildTileAriaLabel` will have uniform whitespace-handling across both trend branches and the discipline established by cycle 1 will be fully propagated.

---

_Reviewed: 2026-05-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Cycle: 4 of (≥2 consecutive zero-finding required)_
_Consecutive zero-finding cycles: 0_
