---
phase: 03-kpi-bento-row
reviewed: 2026-05-24T00:00:00Z
depth: deep
cycle: 2
files_reviewed: 12
files_reviewed_list:
  - src/app/(owner)/dashboard/page.tsx
  - src/components/dashboard/components/__tests__/kpi-bento-row.test.tsx
  - src/components/dashboard/components/__tests__/kpi-helpers.test.ts
  - src/components/dashboard/components/__tests__/kpi-sparkline.test.tsx
  - src/components/dashboard/components/kpi-bento-row.tsx
  - src/components/dashboard/components/kpi-helpers.ts
  - src/components/dashboard/components/kpi-sparkline.tsx
  - src/components/dashboard/dashboard.tsx
  - src/hooks/__tests__/use-reduced-motion.test.ts
  - src/hooks/use-reduced-motion.ts
  - src/test/mocks/recharts.tsx
  - src/types/sections/dashboard.ts
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
perfect_pr_gate: cycle 2 of 2 required — NOT clean; another fix + re-review cycle needed
consecutive_zero_finding_cycles: 0
---

# Phase 3: Code Review Report — Cycle 2

**Reviewed:** 2026-05-24
**Depth:** deep
**Files Reviewed:** 12
**Status:** issues_found
**Cycle:** 2 of (≥2 consecutive zero-finding required)

## Summary

Cycle-1 fix commit `f2633d8e3` closed all 9 cycle-1 findings cleanly:

- **CR-01 closed.** `grep -rn 'DashboardMetrics' src/` returns zero hits (only the unrelated `DashboardMetricsResponse` in `src/types/core.ts:365`). `grep -n 'metrics' src/components/dashboard/dashboard.tsx` returns zero. `page.tsx` IIFE deleted. `<Dashboard metrics={...} />` prop pass removed.
- **CR-02 closed.** `kpi-bento-row.tsx:223` sets `trend: null` on the Active-leases tile; the `tenantsTrend` local variable is gone. Test `kpi-bento-row.test.tsx:180` now expects `items[2]?.querySelector("[data-slot=stat-trend]")` to be null. Explanatory comments at `kpi-bento-row.tsx:156-160, 219-222` and `kpi-helpers.ts:141-146` lock the rationale.
- **WR-01 closed.** `kpi-bento-row.tsx:354` wraps both branches (BlurFade and raw KpiTile) symmetrically under `<div role="listitem" key={tile.id}>`. The listitem is now a direct child of the grid `role="list"`. BlurFade still wraps KpiTile inside the listitem on the non-reduced-motion path — no layout regression because the wrapper inherits grid-item width from `1fr` and the BlurFade div fills the wrapper.
- **WR-02 closed.** `kpi-helpers.ts:37` short-circuits `formatTrendPercent` on `!Number.isFinite(percentChange)` → `"0%"`. `kpi-helpers.ts:200-202` adds the same guard inside `buildTileAriaLabel`. New unit test at `kpi-helpers.test.ts:54-58` pins NaN / ±Infinity → `"0%"`.
- **WR-03 closed.** `kpi-bento-row.tsx:107-120` drops `role="list"` from the skeleton grid and adds `aria-busy="true"` on the section. Test at `kpi-bento-row.test.tsx:216-217` pins the new attribute.
- **WR-04 closed.** Revenue tile now has `spokenValue: revenueSpoken` (just `"$14,250"`, no period qualifier) AND `spokenDescription: "This month"` — symmetric with the other tiles. Sparkline aria-label still reads naturally because `kpi-bento-row.tsx:190` interpolates `${revenueSpoken} this month` at the sparkline boundary. Test at `kpi-bento-row.test.tsx:247-251` pins the new symmetric phrasing.
- **IN-01 closed (in dashboard.tsx).** `dashboard.tsx:76-88` LOCKED(D-10) anchor now says "DEFERRED — Phase 3 mounted <KpiBentoRow> but explicitly did NOT do the `dashboard-view.tsx` consumer migration. A future phase will replace this file..."
- **IN-02 closed.** `kpi-helpers.ts:141-146` adds an explanatory block on `activeTenants` warning future maintainers not to re-attribute it to "Active leases".
- **IN-03 closed.** `kpi-bento-row.test.tsx:16` adds the `within` import; line 221 scopes `getAllByRole("presentation")` to the loading section via `within(loadingSection)`.

**Cycle-2 surfaces 4 new findings (0 BLOCKER, 2 WARNING, 2 INFO).** All four are regressions / latent gaps the cycle-1 fix did not also catch:

- **WR-2C-01:** `dashboard-data.ts` + `dashboard-data.test.ts` carry the SAME "Phase 3 dashboard-view.tsx migration" claim that IN-01 corrected in `dashboard.tsx`. The cycle-1 fix only touched one of the three files describing the same architectural seam — they're now out of sync (dashboard.tsx says "DEFERRED", the other two still say "Phase 3 scope").
- **WR-2C-02:** `buildTileAriaLabel` stable-branch lacks defense-in-depth trim. When `trend.trend === "stable"` and `trendLabel` is `undefined`, it emits `"Unchanged vs. ."` (trailing dot after empty windowText). Non-stable branch handles this via `base.trimEnd()`; stable branch should mirror the discipline cycle-1 WR-02 established.
- **IN-2C-01:** `formatTrendPercent` + `buildTileAriaLabel` JSDoc don't document the NaN/Infinity guard added by the cycle-1 WR-02 fix — future maintainers could "tidy" the guard as redundant.
- **IN-2C-02:** `dashboard-data.ts` carries `dashboard.tsx:87-102` and `page.tsx:95-108` line references that are stale after the cycle-1 fix shifted both files.

This is **cycle 2 of the perfect-PR gate**. Per `.planning/feedback_perfect_pr_gate.md`, two **consecutive zero-finding** cycles are required before merge. Cycle 2 is not zero-finding, so the consecutive-counter resets to 0. Another fix + re-review cycle is required.

---

## Warnings

### WR-2C-01: `dashboard-data.ts` + `dashboard-data.test.ts` still claim "Phase 3 dashboard-view.tsx migration" — cycle-1 IN-01 fix applied inconsistently

**Files:**
- `src/components/dashboard/dashboard-data.ts:7-16, 26-54`
- `src/components/dashboard/dashboard-data.test.ts:5-16`

**Issue:**
Cycle-1 IN-01 correctly updated `dashboard.tsx:76-88` to say:

```
// LOCKED(D-10): inline portfolio-row transform survives Phase 1.
// ...
// Consumer migration is DEFERRED — Phase 3 mounted
// <KpiBentoRow> but explicitly did NOT do the `dashboard-view.tsx`
// consumer migration. A future phase will replace this file and consume
// the canonical `portfolioRows` slice from
// `transformDashboardData(payload).portfolioRows`.
```

But the SAME architectural seam is described in two other files, and both still carry the pre-fix "Phase 3 scope" framing:

**`dashboard-data.ts:7-16`** (DashboardViewModel JSDoc):

```
* View-model exposed to dashboard surfaces — Phases 3/4/5 read from this,
* not the raw RPC. `portfolioRows` is derived from `propertyPerformance` and
* stores rent in dollars (no `* 100`) per UI-SPEC § 8.1.
*
* Note: `activity` and `propertyPerformance` remain on the raw
* `OwnerDashboardData` shape because existing consumers depend on those
* shapes; Phase 3's `dashboard-view.tsx` migration is when those slices
* fold into the view-model.
```

**`dashboard-data.ts:26-54`** (transformDashboardData JSDoc):

```
* Per D-10 (Phase 01 CONTEXT.md) — the shared transform contract that
* Phase 3's `dashboard-view.tsx` will consume.
* ...
* The canonical transform survives as
* the locked Phase-3 seam (D-10) — only the unit test at
* `dashboard-data.test.ts` consumes it, pinning the contract so a
* Phase-3-time migration surfaces no surprises.
```

**`dashboard-data.test.ts:5-16`** (test-file JSDoc):

```
* The live `/dashboard` page does NOT consume `transformDashboardData` today
* — it uses an inline transform in `dashboard.tsx:87-102` plus a re-mapper
* in `page.tsx:95-108`. The canonical transform survives as a Phase-3 seam
* (per Phase 1 CONTEXT D-10). Without this test, a regression in
* `transformDashboardData.maintenanceOpen` would not surface until Phase 3
* wires `dashboard-view.tsx`.
```

Phase 3 is now done. It did NOT wire `dashboard-view.tsx`. A reader hitting any of these three files first will conclude that Phase 3 left the migration on the cutting-room floor (it didn't — the migration was always deferred and `dashboard.tsx` now says so honestly). The two stale files should mirror the corrected anchor.

The cycle-1 fix pattern says "fix passes ship their own regressions" — this one didn't introduce a regression, it just failed to propagate. Same architectural seam described in three places; updating one but not the other two is exactly the kind of drift that perfect-PR gate is supposed to catch.

**Fix:**
Update both files to defer to the same "future phase" framing as `dashboard.tsx`. Suggested deltas:

```diff
 // src/components/dashboard/dashboard-data.ts
 /**
- * View-model exposed to dashboard surfaces — Phases 3/4/5 read from this,
- * not the raw RPC. `portfolioRows` is derived from `propertyPerformance` and
- * stores rent in dollars (no `* 100`) per UI-SPEC § 8.1.
+ * View-model exposed to dashboard surfaces — future consumer phases read from
+ * this, not the raw RPC. `portfolioRows` is derived from `propertyPerformance`
+ * and stores rent in dollars (no `* 100`) per UI-SPEC § 8.1.
  *
  * Note: `activity` and `propertyPerformance` remain on the raw
  * `OwnerDashboardData` shape because existing consumers depend on those
- * shapes; Phase 3's `dashboard-view.tsx` migration is when those slices
- * fold into the view-model.
+ * shapes; the `dashboard-view.tsx` consumer migration (deferred — see
+ * ROADMAP.md) is when those slices fold into the view-model.
  */
```

```diff
 /**
  * Pure RPC-payload → view-model transform for the owner dashboard.
  * ...
- * Per D-10 (Phase 01 CONTEXT.md) — the shared transform contract that
- * Phase 3's `dashboard-view.tsx` will consume.
+ * Per D-10 (Phase 01 CONTEXT.md) — the shared transform contract that the
+ * deferred `dashboard-view.tsx` consumer migration will eventually consume.
  * ...
- * The canonical transform survives as
- * the locked Phase-3 seam (D-10) — only the unit test at
- * `dashboard-data.test.ts` consumes it, pinning the contract so a
- * Phase-3-time migration surfaces no surprises.
+ * The canonical transform survives as the locked D-10 seam — only the unit
+ * test at `dashboard-data.test.ts` consumes it, pinning the contract so the
+ * deferred consumer-migration phase surfaces no surprises.
  */
```

```diff
 // src/components/dashboard/dashboard-data.test.ts
 /**
  * Pins the canonical `transformDashboardData` contract — specifically the
  * Phase 2 (POLISH-10) addition of `open_maintenance` flowing into
  * `portfolioRows[i].maintenanceOpen`.
  *
  * The live `/dashboard` page does NOT consume `transformDashboardData` today
- * — it uses an inline transform in `dashboard.tsx:87-102` plus a re-mapper
- * in `page.tsx:95-108`. The canonical transform survives as a Phase-3 seam
- * (per Phase 1 CONTEXT D-10). Without this test, a regression in
- * `transformDashboardData.maintenanceOpen` would not surface until Phase 3
- * wires `dashboard-view.tsx`.
+ * — it uses an inline transform in `dashboard.tsx` plus a re-mapper in
+ * `page.tsx`. The canonical transform survives as the locked D-10 seam
+ * (deferred consumer migration; see ROADMAP.md). Without this test, a
+ * regression in `transformDashboardData.maintenanceOpen` would not surface
+ * until the consumer-migration phase wires `dashboard-view.tsx`.
  */
```

Either nuke the line-number references (preferred — they drift; see IN-2C-02) or update them to the post-cycle-1 positions.

### WR-2C-02: `buildTileAriaLabel` stable-branch emits `"Unchanged vs. ."` when `trendLabel` is undefined — defense-in-depth gap mirroring cycle-1 WR-02

**File:** `src/components/dashboard/components/kpi-helpers.ts:203-211`

**Issue:**
```typescript
if (input.trend.trend === "stable") {
  const windowText = (input.trendLabel ?? "").replace(/^vs\.\s*/, "")
  trendSegment = `Unchanged vs. ${windowText}`
} else {
  const base = `${directionWord} ${pct} percent ${input.trendLabel ?? ""}`
  trendSegment = base.trimEnd()
}
parts.push(`${trendSegment}.`)
```

The non-stable branch correctly handles `trendLabel === undefined` by trimming trailing whitespace via `base.trimEnd()` — the cycle-1 test at `kpi-helpers.test.ts:177-187` (`"trims trailing space before the period when no trendLabel is provided"`) pins this discipline:

```typescript
const out = buildTileAriaLabel({
  label: "Revenue",
  spokenValue: "$14,250 this month",
  trend: upTrend,
  // no trendLabel
})
expect(out).toBe("Revenue: $14,250 this month. Up 12 percent.")
expect(out).not.toMatch(/ {2}/)
expect(out).not.toMatch(/ \./)
```

But the **stable branch** lacks the same defense:

- `input.trendLabel = undefined`
- `windowText = "".replace(/^vs\.\s*/, "") = ""`
- `trendSegment = "Unchanged vs. "` (trailing space)
- After `parts.push(\`${trendSegment}.\`)`: `"Unchanged vs. ."`

Final aria-label becomes `"<Label>: <value>. Unchanged vs. ."` — same `/ \./` violation the non-stable test pins as a contract bug.

Current production callers do not trigger this — all three stable-capable tiles (Revenue, Occupancy, Open maintenance) pass `trendLabel: "vs. last month"`. But the cycle-1 WR-02 fix established the discipline of hardening defense-in-depth even when current callers don't trigger the gap. The stable branch is exactly the same class of defect the trimEnd guard catches on the non-stable branch.

**Fix:**
```diff
 if (input.trend.trend === "stable") {
   const windowText = (input.trendLabel ?? "").replace(/^vs\.\s*/, "")
-  trendSegment = `Unchanged vs. ${windowText}`
+  trendSegment = windowText ? `Unchanged vs. ${windowText}` : "Unchanged"
 } else {
   const base = `${directionWord} ${pct} percent ${input.trendLabel ?? ""}`
   trendSegment = base.trimEnd()
 }
```

Add a test in `kpi-helpers.test.ts`:

```typescript
it("emits bare 'Unchanged' when stable trend has no trendLabel", () => {
  const out = buildTileAriaLabel({
    label: "Active leases",
    spokenValue: "42",
    trend: stableTrend,
    // no trendLabel
  })
  expect(out).toBe("Active leases: 42. Unchanged.")
  expect(out).not.toMatch(/ \./)
  expect(out).not.toMatch(/vs\.\s*\./)
})
```

---

## Info

### IN-2C-01: `formatTrendPercent` + `buildTileAriaLabel` JSDoc don't document the NaN/Infinity guard added by cycle-1 WR-02

**Files:**
- `src/components/dashboard/components/kpi-helpers.ts:22-30` (formatTrendPercent JSDoc)
- `src/components/dashboard/components/kpi-helpers.ts:165-184` (buildTileAriaLabel JSDoc)

**Issue:**
The cycle-1 WR-02 fix added defense-in-depth `Number.isFinite()` guards inside both functions. The behavior is now:

- `formatTrendPercent(NaN)` → `"0%"`
- `formatTrendPercent(Infinity)` → `"0%"`
- `buildTileAriaLabel({ ... trend.percentChange: NaN ... })` → narrates `"Up 0 percent vs. ..."` (silent fallback)

But neither function's JSDoc documents the guard. A future maintainer reading the doc-comments will see only the `+12%` / `−3%` / `0%` cases and may "simplify" the guard as redundant defensive code. The corresponding test (`kpi-helpers.test.ts:54-58`) anchors the behavior but tests are not the contract surface — the doc-comment is.

**Fix:**
```diff
 /**
  * Renders a rounded percent change with a typographic sign:
  * - `+12%` for positive trends,
  * - `−3%` for negative trends (U+2212 typographic minus, NOT hyphen-minus
  *   U+002D),
  * - `0%` for zero / rounds-to-zero.
  *
  * Rounds to the nearest integer — `0.4` and `-0.4` both round to zero and
  * render as `0%` with no sign (03-UI-SPEC § 4.3 honesty rule).
+ *
+ * Defense-in-depth: `NaN` and `±Infinity` inputs return `"0%"`. The type
+ * says `number` but `MetricTrend.percentChange` can carry NaN if the RPC
+ * ships a stale row — same hardening as the `safeOccupancy` guard in
+ * kpi-bento-row.tsx. Do not remove the `Number.isFinite` short-circuit.
  */
 export function formatTrendPercent(percentChange: number): string {
```

Similar one-line addition to the `buildTileAriaLabel` JSDoc rationale block.

### IN-2C-02: `dashboard-data.ts` references stale line numbers `dashboard.tsx:87-102` and `page.tsx:95-108` after cycle-1 fix shifted both files

**File:** `src/components/dashboard/dashboard-data.ts:43-44`

**Issue:**
```typescript
* The live `/dashboard`
* page uses an inline transform in `dashboard.tsx:87-102` plus a
* re-mapper in `page.tsx:95-108`. The canonical transform survives as
```

After the cycle-1 CR-01 fix removed the `metrics` IIFE from `page.tsx` and the cycle-1 IN-01 fix expanded the LOCKED(D-10) comment in `dashboard.tsx`, the actual line ranges are:

- `dashboard.tsx` inline transform: lines **89-104** (was 87-102)
- `page.tsx` re-mapper: lines **71-84** (was 95-108)

Same stale-reference issue appears in `dashboard-data.test.ts:11-12` (`dashboard.tsx:87-102 plus a re-mapper in page.tsx:95-108`).

Line-number references in doc-comments are a drift-prone pattern — the next fix pass touching either file will shift them again. Consider removing the line numbers entirely or replacing with symbolic anchors:

**Fix:**
```diff
- * The live `/dashboard`
- * page uses an inline transform in `dashboard.tsx:87-102` plus a
- * re-mapper in `page.tsx:95-108`.
+ * The live `/dashboard` page uses an inline transform in `dashboard.tsx`
+ * (the `portfolioData = propertyPerformance.map(...)` block after the
+ * LOCKED(D-10) anchor) plus a re-mapper in `page.tsx` (the
+ * `propertyPerformance` IIFE adjacent to the `kpiData` builder).
```

Or simpler: drop the line refs entirely — the surrounding sentence already names the symbols.

---

## Verification of cycle-1 fix claims

| Cycle-1 finding | Fix claim | Verified |
|---|---|---|
| CR-01 | DashboardProps.metrics + DashboardMetrics + page.tsx IIFE + metrics={} all deleted | ✓ `grep -rn 'DashboardMetrics' src/` returns only unrelated `DashboardMetricsResponse` in core.ts; zero `metrics` refs in dashboard.tsx; page.tsx has no IIFE for metrics |
| CR-02 | Active-leases tile sets `trend: null`; tenantsTrend removed | ✓ kpi-bento-row.tsx:223 `trend: null`; no `tenantsTrend` local var anywhere; test items[2] expects null |
| WR-01 | listitem div is direct child of grid role=list | ✓ kpi-bento-row.tsx:354 `<div role="listitem" key={tile.id}>` directly inside `<div role="list">` on line 347; wraps both BlurFade and raw-tile branches symmetrically |
| WR-02 | Number.isFinite guards in formatTrendPercent + buildTileAriaLabel | ✓ kpi-helpers.ts:37 + 200-202 both guard; new test kpi-helpers.test.ts:54-58 pins NaN / ±Infinity → `"0%"` |
| WR-03 | Skeleton grid drops role=list, adds aria-busy on section | ✓ kpi-bento-row.tsx:109 `aria-busy="true"` on the section; line 115 grid div has no `role` attribute; test asserts `loadingSection.getAttribute("aria-busy") === "true"` |
| WR-04 | Revenue spokenValue+spokenDescription symmetric with other tiles | ✓ kpi-bento-row.tsx:178-180 — spokenValue=`revenueSpoken` (just currency), spokenDescription=`"This month"`; sparkline ariaLabel keeps natural phrasing via `${revenueSpoken} this month`; test asserts symmetric sentence |
| IN-01 | dashboard.tsx LOCKED(D-10) anchor says DEFERRED / future phase | ✓ dashboard.tsx:76-88 rewritten; but see WR-2C-01 — the SAME claim in dashboard-data.ts + dashboard-data.test.ts is still pre-fix |
| IN-02 | activeTenants field has explanatory comment | ✓ kpi-helpers.ts:141-146 explains the field stays for future use and warns against re-attribution to Active leases |
| IN-03 | Skeleton test uses within(loadingSection).getAllByRole | ✓ kpi-bento-row.test.tsx:16 imports `within`; line 221 scoped query |

All 9 cycle-1 findings closed at their pinned files. WR-2C-01 surfaces because the cycle-1 IN-01 fix to dashboard.tsx did NOT propagate to the two sibling files (`dashboard-data.ts`, `dashboard-data.test.ts`) that describe the same architectural seam.

---

## Fresh adversarial pass — Zero Tolerance check

| Rule | Result |
|---|---|
| 1 — No `any` types | ✓ `grep -n ': any\|as any' src/components/dashboard/components/kpi-*.{ts,tsx} src/hooks/use-reduced-motion.ts src/types/sections/dashboard.ts src/app/(owner)/dashboard/page.tsx` → 0 hits |
| 2 — No barrel files | ✓ no `index.ts` re-exports; all imports go to the defining file |
| 3 — No duplicate types | ✓ `MetricTrend`, `TimeSeriesDataPoint`, `DashboardStats`, `PropertyPerformance` all sourced from canonical files; `KpiBentoRowProps.metricTrends` mirrors `DashboardStatsData.metricTrends` shape (both with `MetricTrend \| null` fields) |
| 4 — No commented-out code | ✓ all comments are explanatory/anchor, none are commented-out code |
| 5 — No inline styles | ✓ only the documented exemption: `style={GRID_CONTAINER_STYLE}` (static `containerType` + `containerName` keys for the container-query parent) appears twice, both flagged with the SOLE-exemption rationale comment |
| 6 — No PG ENUMs | n/a (no migration in this phase) |
| 7 — No emojis in code | ✓ Lucide icons (`ArrowUp`, `ArrowDown`, `Minus`) used |
| 8 — No `as unknown as` | ✓ 0 hits |
| 9 — No string-literal query keys | n/a (no new queries; reads from existing factory via `useDashboardStats`, `useDashboardCharts`, `usePropertyPerformance`) |
| 10 — No `@radix-ui/react-icons` | ✓ 0 hits in changed files |

| Check | Result |
|---|---|
| Hardcoded secrets | ✓ none |
| Dangerous functions (`eval`, `innerHTML`, raw-html-injection sinks) | ✓ none in changed files |
| Debug artifacts (`console.log`, `debugger`, `TODO`, `FIXME`, `XXX`, `HACK`) | ✓ none in changed files |
| Empty catch blocks | ✓ none |
| Cross-module type drift | ✓ `DashboardStatsData.metricTrends` (in `use-owner-dashboard.ts:152-160`) matches `KpiBentoRowProps.metricTrends` (in `kpi-helpers.ts:139-150`) exactly |
| Cross-file dead `DashboardMetrics` consumers (tests, e2e, storybook) | ✓ `grep -rn 'DashboardMetrics' src/ tests/` returns only the unrelated `DashboardMetricsResponse` in core.ts; archived e2e specs reference unrelated `metrics: any` (not `DashboardMetrics`) |
| listitem hierarchy regression check | ✓ new wrapper div is the grid item; BlurFade fills it on the non-reduced-motion path; reduced-motion path renders raw KpiTile directly inside the listitem — both branches structurally symmetric; no layout regression because the wrapper inherits grid-item width from `1fr` |
| A11y: section landmark + aria-labelledby + sr-only h2 | ✓ both branches (loading + loaded) carry `aria-labelledby="kpi-bento-heading"` + corresponding `<h2 id="kpi-bento-heading" className="sr-only">`; ids are mutually exclusive (only one section renders) |
| A11y: aria-busy on loading region | ✓ `aria-busy="true"` on the loading section |
| A11y: aria-hidden on decorative arrows + prefix/suffix spans | ✓ all `<ArrowUp/Down/Minus>` icons + prefix/suffix spans flagged |
| Sparkline gradient id collision risk | ✓ deterministic `spark-fill-${trend}` ids; if Revenue + Occupancy both happen to have the same trend (e.g., both `up`), they share an id but the gradient + fill both resolve through `var(--color-spark)` and the chart container scopes the variable to the matching token — safe by coincidence (and the test pins the id pattern) |
| D-04 trend mapping invariant | ✓ Revenue + Occupancy + Open maintenance carry trend chips; Active leases + Properties + Units omit them; verified by test `Properties + Units omit StatTrend` (now including items[2] = Active leases) |
| D-09 honesty invariant | ✓ Active-leases trend omitted by code + verified by test |

---

## Cycle Discipline

This is **cycle 2 of the perfect-PR gate**. Cycle 2 was supposed to be zero-finding to advance the consecutive-zero-finding counter to 1. It is not zero-finding (4 findings). Per the perfect-PR gate, the consecutive counter resets to 0. After this cycle's fixes land:

- Cycle 3 must close WR-2C-01, WR-2C-02, IN-2C-01, IN-2C-02 + verify no fresh regressions.
- Cycle 3 must be zero-finding to advance the counter to 1.
- Cycle 4 must also be zero-finding to advance the counter to 2 and close the gate.

Expected cycle-2 fix blast radius:
- `src/components/dashboard/dashboard-data.ts` — three JSDoc blocks (WR-2C-01 + IN-2C-02)
- `src/components/dashboard/dashboard-data.test.ts` — one JSDoc block (WR-2C-01)
- `src/components/dashboard/components/kpi-helpers.ts` — stable-branch trim guard (WR-2C-02) + two JSDoc updates (IN-2C-01)
- `src/components/dashboard/components/__tests__/kpi-helpers.test.ts` — new "bare 'Unchanged' when no trendLabel" test (WR-2C-02 lockstep)

Note that **none of these changes touch the runtime contract** observable from outside the phase 3 source tree. WR-2C-02 is a defense-in-depth fix that current callers never trigger; WR-2C-01 + IN-2C-01 + IN-2C-02 are documentation-only.

---

_Reviewed: 2026-05-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Cycle: 2 of (≥2 consecutive zero-finding required)_
_Consecutive zero-finding cycles: 0_
