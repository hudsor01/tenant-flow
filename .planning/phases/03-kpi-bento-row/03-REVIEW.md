---
phase: 03-kpi-bento-row
reviewed: 2026-05-24T00:00:00Z
depth: deep
cycle: 1
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
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
perfect_pr_gate: cycle 1 of 2 required
---

# Phase 3: Code Review Report — Cycle 1

**Reviewed:** 2026-05-24
**Depth:** deep
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Phase 3 KPI Bento Row implementation is largely sound on the new code surface — invariants D-01..D-12 are pinned by tests, the inline-style exemption is honored exactly once with the two declared static keys, no `any` / `as unknown as` / forbidden imports surfaced, and the `useReducedMotion` shared hook is wired correctly through both `<KpiBentoRow>` (wrap bypass) and `<KpiNumberTicker>` (defense-in-depth short-circuit).

Two **Critical** dead-code findings break the Zero-Tolerance discipline (CLAUDE.md rule #4) and have to be cleaned up before this cycle can be called clean: `DashboardProps.metrics` is still required while no consumer reads it, and `page.tsx` lines 61-91 still construct the 10-field `metrics` object that nothing consumes. The corresponding `DashboardMetrics` interface is now orphaned.

Four **Warnings** call out: (a) the "Active leases" tile sourcing its trend chip from `metricTrends.activeTenants` (semantic mismatch the screen-reader narrator will reproduce verbatim), (b) `formatTrendPercent(NaN)` emitting `"NaN%"` (no defense-in-depth guard), (c) `role="listitem"` not being a direct child of `role="list"` when BlurFade is wrapping (WAI-ARIA list semantics broken on the default — non-reduced-motion — render path), and (d) `role="list"` skeleton grid containing only `role="presentation"` children (no listitems, so the list role is meaningless during loading).

Three **Info** items round out a few stale-comment / type-shape niceties.

This is cycle 1 of the perfect-PR gate; two consecutive zero-finding cycles are required before merge.

---

## Critical Issues

### CR-01: Dead `metrics` prop required on `DashboardProps` but no consumer reads it (Zero-Tolerance rule #4)

**Files:**
- `src/types/sections/dashboard.ts:10`
- `src/components/dashboard/dashboard.tsx:43-58`
- `src/app/(owner)/dashboard/page.tsx:60-91, 183`

**Issue:**
The Phase 3 mount diff removed the `<p>` header that consumed `metrics.{occupiedUnits,totalUnits,totalRevenue}` and replaced it with `<KpiBentoRow {...kpiData} />`. But the cleanup was half-finished:

1. `DashboardProps` still declares `metrics: DashboardMetrics` as **required** (`src/types/sections/dashboard.ts:10`).
2. `dashboard.tsx` no longer destructures `metrics` anywhere in the function signature (`src/components/dashboard/dashboard.tsx:43-58`) or body — but TS does not error on undestructured required props, so the dead requirement compiles silently.
3. `page.tsx:60-91` still constructs a 10-field `metrics` IIFE (with two branches for the loading case) and passes it as `metrics={metrics}` on line 183 — none of that work is consumed downstream.

This is exactly the kind of dead code Zero-Tolerance rule #4 forbids. It also leaves `DashboardMetrics` orphaned (no consumer at runtime; only its own declaration references it).

**Fix:**
- Drop `metrics: DashboardMetrics;` from `DashboardProps` (`src/types/sections/dashboard.ts:10`).
- Delete the `DashboardMetrics` interface entirely (`src/types/sections/dashboard.ts:33-44`) — it has no remaining consumer (`grep -rn 'DashboardMetrics' src/` confirms zero references outside its own file once the prop is dropped). Verify before deleting in case a Phase-4 forward-reference exists; if it does, leave the interface and just drop the required prop.
- Delete the `const metrics = (() => { ... })()` IIFE at `src/app/(owner)/dashboard/page.tsx:60-91` and remove the `metrics={metrics}` line at `:183`.

```diff
 // src/types/sections/dashboard.ts
 export interface DashboardProps {
 	kpiData: KpiBentoRowProps;
-	metrics: DashboardMetrics;
 	revenueTrend: RevenueTrendPoint[];
   ...
 }
-export interface DashboardMetrics { ... }   // delete unless Phase 4 needs it
```

```diff
 // src/app/(owner)/dashboard/page.tsx
-	// Transform stats to design-os format
-	const metrics = (() => {
-		if (!statsData?.stats) {
-			return { totalRevenue: 0, ... }
-		}
-		const stats = statsData.stats
-		return { totalRevenue: stats.revenue?.monthly ?? 0, ... }
-	})()
   ...
   <Dashboard
     kpiData={kpiData}
-    metrics={metrics}
     revenueTrend={revenueTrend}
```

### CR-02: "Active leases" tile sources its trend chip from `metricTrends.activeTenants` — semantic mismatch (D-04 honesty)

**Files:**
- `src/components/dashboard/components/kpi-bento-row.tsx:151, 199-212`
- `src/components/dashboard/components/kpi-helpers.ts:130-138` (shape lock)

**Issue:**
The KPI bento row labels tile #2 `"Active leases"` (D-01 order pins this label) and renders its `<StatTrend>` from `tenantsTrend = metricTrends.activeTenants` (`kpi-bento-row.tsx:151, 204`). But active-tenants and active-leases are different metrics — a single tenant can appear on two leases (cohabitants, multi-unit holdings), and a tenant churn that doesn't change lease count would still drive the chip up/down on a tile that says "Active leases".

The aria-label inherits the same mismatch — `buildTileAriaLabel` consumes `tile.trend` (which is `activeTenants`) and narrates `"Active leases: 42. Up 6 percent vs. last month."` even though the 6% is a tenant delta, not a lease delta. Screen-reader users get a false attribution they have no way to disambiguate.

The data layer has only `activeTenants` in the trend bundle (`src/hooks/api/use-owner-dashboard.ts:156, 285`), so this isn't a wiring miss — the trend chip should be **omitted** until the RPC exposes `active_leases` (D-09 honesty rule explicitly forbids fabrication on tiles whose trend data is unavailable: "null trend → omit chip").

**Fix:**
Drop `tenantsTrend` from the "Active leases" tile and let the chip render `null`. Properties + Units already model the "no trend available" branch correctly — mirror that.

```diff
 // src/components/dashboard/components/kpi-bento-row.tsx
-	const tenantsTrend = metricTrends.activeTenants
 	const maintenanceTrend = metricTrends.openMaintenance
   ...
 	{
 		id: "active-leases",
 		label: "Active leases",
 		spokenValue: String(stats.leases.active),
 		value: stats.leases.active,
 		decimalPlaces: 0,
-		trend: tenantsTrend,
-		trendLabel: "vs. last month",
+		trend: null,
 		sparkline: null,
 		waveDelay: 2,
 		...(stats.leases.expiringSoon > 0 && {
 			description: `${stats.leases.expiringSoon} expiring soon`,
 			spokenDescription: `${stats.leases.expiringSoon} expiring soon`,
 		}),
 	},
```

Then update the test (`kpi-bento-row.test.tsx:182-183`) which currently asserts `items[2]?.querySelector("[data-slot=stat-trend]")` is NOT null — flip to `toBeNull()` to pin the honest behavior.

Alternative: if product wants a chip, plumb `active_leases` trend through the RPC (separate feature; out of Phase 3 scope). Document the deferral in CONTEXT.md.

---

## Warnings

### WR-01: `role="listitem"` is not a direct child of `role="list"` when BlurFade wraps (WAI-ARIA list semantics broken)

**File:** `src/components/dashboard/components/kpi-bento-row.tsx:331-341`

**Issue:**
On the default (non-reduced-motion) render path, the DOM tree is:

```
<div role="list">              ← grid container
  <div class="will-change-transform ...">   ← BlurFade wrapper
    <div role="listitem">                   ← KpiTile wrapper
      <div data-slot="stat" aria-label="...">...</div>
    </div>
  </div>
  ...
</div>
```

WAI-ARIA spec (and the testing-library `getAllByRole('listitem')` accessibility tree) requires `role="listitem"` to be a direct child of `role="list"` for the list to be exposed correctly. Screen readers (NVDA, VoiceOver, JAWS) will not announce "List with 6 items" when an intermediate non-list, non-listitem div is in between — they'll either announce 0 items or fall back to flat traversal.

Testing-library happens to still find the listitems via `getAllByRole('listitem')` because the role lookup is unscoped, so the existing tests pass — but the user-facing screen reader experience is broken on the default path. The reduced-motion path (which bypasses BlurFade) is correctly structured.

**Fix:**
Lift `role="listitem"` onto the BlurFade wrapper, or push `role="list"` down one level. Cleanest is to apply `role="listitem"` on whichever element is the **direct** child of the grid:

Option A — pass a `role` prop through BlurFade (current type has `Omit<ComponentPropsWithChildren, "children">` extension, so `role` already passes through via spread on its inner div):

```diff
 return reducedMotion ? (
   tileBody
 ) : (
-  <BlurFade key={tile.id} delay={tile.waveDelay} duration={500}>
+  <BlurFade key={tile.id} delay={tile.waveDelay} duration={500} role="listitem">
     {tileBody}
   </BlurFade>
 )
```

Then drop the inner `<div role="listitem">` in `KpiTile` so we don't double-stamp the role.

Option B — wrap the BlurFade in a `<div role="listitem">` (adds a node but keeps `KpiTile` standalone). Pick whichever costs fewer downstream test-selector changes.

Verify by adding a test that asserts `parentElement?.parentElement?.getAttribute('role') === 'list'` for each listitem on the non-reduced-motion path (the existing tests pass through testing-library's role tree, which is more permissive than what real screen readers expose).

### WR-02: `formatTrendPercent(NaN)` returns the literal string `"NaN%"` — no defense-in-depth guard

**File:** `src/components/dashboard/components/kpi-helpers.ts:31-39`

**Issue:**
```typescript
const rounded = Math.round(percentChange)      // NaN → NaN
const sign = rounded > 0 ? "+" : rounded < 0 ? minus : ""   // NaN comparisons false → ""
return `${sign}${Math.abs(rounded)}%`           // "" + "NaN" + "%" = "NaN%"
```

`MetricTrend.percentChange` is typed `number` so NaN can only get there if the RPC ships a stale/broken row, but the existing NaN-occupancy test (`kpi-bento-row.test.tsx:294-313`) sets the bar for "values come in malformed; component must not render garbage". The component already hardens `stats.units.occupancyRate` with `Number.isFinite(...) ? ... : 0` — `formatTrendPercent` should follow the same discipline.

Reproduces with:
```typescript
formatTrendPercent(Number.NaN)   // → "NaN%"
formatTrendPercent(Infinity)     // → "+Infinity%"  (also broken)
```

**Fix:**
```diff
 export function formatTrendPercent(percentChange: number): string {
-  const rounded = Math.round(percentChange)
+  if (!Number.isFinite(percentChange)) return "0%"
+  const rounded = Math.round(percentChange)
   const minus = String.fromCharCode(0x2212)
   const sign = rounded > 0 ? "+" : rounded < 0 ? minus : ""
   return `${sign}${Math.abs(rounded)}%`
 }
```

Add a test:
```typescript
it("emits `0%` for NaN / Infinity input", () => {
  expect(formatTrendPercent(Number.NaN)).toBe("0%")
  expect(formatTrendPercent(Number.POSITIVE_INFINITY)).toBe("0%")
  expect(formatTrendPercent(Number.NEGATIVE_INFINITY)).toBe("0%")
})
```

`buildTileAriaLabel` (`kpi-helpers.ts:185`) suffers the same — `Math.abs(Math.round(NaN))` yields `NaN`, and the narrated sentence becomes `"Up NaN percent vs. last month."`. Same one-line guard at the top of the function fixes both render paths.

### WR-03: Skeleton grid `role="list"` has no `role="listitem"` children — list role is meaningless

**File:** `src/components/dashboard/components/kpi-bento-row.tsx:100-117`

**Issue:**
The loading-state grid (`KpiSkeletonGrid`) emits:
```jsx
<div className={GRID_CLASSES} style={GRID_CONTAINER_STYLE} role="list">
  <KpiSkeletonTile />   // <div role="presentation">...</div>
  ...
</div>
```

WAI-ARIA: `role="list"` with zero `role="listitem"` descendants is not exposed as a list to assistive tech (or is exposed as an empty list). The skeleton tiles use `role="presentation"` to opt their decorative inner `<Skeleton>` blocks out of the tree — but then the outer `role="list"` is dead markup.

Either drop the `role="list"` during loading (the section is already announced via `aria-labelledby="kpi-bento-heading"` + the sr-only `<h2>`), or give each skeleton tile `role="listitem"` so the list announces "loading 6 items" or similar.

**Fix (recommended):**
```diff
 function KpiSkeletonGrid() {
   const hasSparkline = [true, true, false, false, false, false]
   return (
     <section aria-labelledby="kpi-bento-heading" data-testid="kpi-bento-row-loading" aria-busy="true">
       <h2 id="kpi-bento-heading" className="sr-only">Portfolio summary</h2>
-      <div className={GRID_CLASSES} style={GRID_CONTAINER_STYLE} role="list">
+      <div className={GRID_CLASSES} style={GRID_CONTAINER_STYLE}>
         {hasSparkline.map((sparkline, idx) => (
           <KpiSkeletonTile key={`skeleton-${idx}`} hasSparkline={sparkline} />
         ))}
       </div>
     </section>
   )
 }
```

Adding `aria-busy="true"` on the section also signals to screen readers that the region is loading; combined with the existing `<Skeleton>` `role="presentation"` children, this is the canonical loading-region pattern.

### WR-04: Revenue tile has visible `description: "This month"` that duplicates information already in the aria-label `spokenValue`

**File:** `src/components/dashboard/components/kpi-bento-row.tsx:165, 154-157`

**Issue:**
```typescript
const revenueSpoken = `${formatCurrency(...)} this month`   // "$14,250 this month"

{
  id: "revenue",
  label: "Revenue",
  spokenValue: revenueSpoken,
  description: "This month",       // ← visible, duplicates the "this month" already in spokenValue
  ...
}
```

Sighted users see two pieces of information that say the same thing:
- `<StatValue>` shows `$14,250` (only the number, no period qualifier — visible)
- `<StatDescription>` shows `This month` (period qualifier — visible)

That's actually OK for the visible UI (the description disambiguates which "$14,250" — but the aria-label narrates `"Revenue: $14,250 this month. Up 12 percent vs. last month."` — no `spokenDescription`, so the description IS suppressed in the aria-label. Net result: screen-reader narration is correct, but only because the developer happened to bake "this month" into `revenueSpoken` AND omit `spokenDescription` from the revenue tile config.

If a future maintainer adds `spokenDescription: "This month"` for symmetry with the other tiles, the aria-label would become `"Revenue: $14,250 this month. This month. Up 12 percent vs. last month."` — broken. This is fragile-by-convention.

**Fix:**
Either (a) move "this month" out of `spokenValue` and into `spokenDescription` so the two stay decoupled, or (b) add a comment + lint pin that explicitly forbids `spokenDescription` on the revenue tile because the period is already in `spokenValue`. Option (a) is cleaner:

```diff
-const revenueSpoken = `${formatCurrency(stats.revenue.monthly, { ... })} this month`
+const revenueSpoken = formatCurrency(stats.revenue.monthly, { ... })
   ...
 {
   id: "revenue",
   label: "Revenue",
   spokenValue: revenueSpoken,
   description: "This month",
+  spokenDescription: "This month",
   ...
 }
```

aria-label then becomes `"Revenue: $14,250. This month. Up 12 percent vs. last month."` — symmetric with Occupancy / Active leases / Open maintenance / Units, and the sparkline aria-label still reads naturally (`"Revenue trend over the last 30 days, currently $14,250, trending up"`).

If you make this change, update the test on `kpi-bento-row.test.tsx:241-243` to match the new sentence.

---

## Info

### IN-01: Stale Phase-1 anchor comment in `dashboard.tsx` references a "Phase 3 consumer migration" that this very phase did not perform

**File:** `src/components/dashboard/dashboard.tsx:76-86`

**Issue:**
```typescript
// LOCKED(D-10): inline portfolio-row transform survives Phase 1.
// ...
// Consumer migration is Phase 3 scope: the new
// `dashboard-view.tsx` will replace this file and consume the canonical
// `portfolioRows` slice from `transformDashboardData(payload).portfolioRows`.
```

Phase 3 explicitly carries the KPI bento row scope, NOT the `dashboard-view.tsx` migration / `transformDashboardData` consumer migration. The comment as written suggests Phase 3 should have done this work — fresh-eyes readers will flag it as incomplete scope. Update the anchor to defer to a future phase, or strike the "Phase 3" reference.

**Fix:**
```diff
- // Consumer migration is Phase 3 scope: the new
- // `dashboard-view.tsx` will replace this file and consume the canonical
- // `portfolioRows` slice from `transformDashboardData(payload).portfolioRows`.
+ // Consumer migration deferred — see ROADMAP.md for the consumer migration
+ // phase that wires `transformDashboardData(payload).portfolioRows` through
+ // a future `dashboard-view.tsx`. Phase 3 only mounts <KpiBentoRow>; the
+ // inline transform below stays the active consumer until then.
```

### IN-02: `KpiBentoRowProps.metricTrends.activeTenants` field stays in the shape even after CR-02 fix — consider renaming or aliasing for clarity

**File:** `src/components/dashboard/components/kpi-helpers.ts:130-143`

**Issue:**
Once CR-02 is fixed, `metricTrends.activeTenants` is no longer consumed by any tile in `buildKpiTileConfigs`. But the field stays on the public `KpiBentoRowProps` shape because the RPC selector (`useDashboardStats().metricTrends`) emits it. Future maintainers may wonder why the field is declared but never read.

**Fix:**
Add a clarifying comment on the field, or — since `KpiBentoRowProps` is a Phase 3 surface — drop the field from the local shape and let TS infer the wider `DashboardStatsData.metricTrends` type at the call site. Either is fine; just don't leave the dead field silent.

### IN-03: `kpi-bento-row.test.tsx:215-216` `getAllByRole('presentation')` lacks scoping — fragile if any ancestor or sibling adds a decorative element

**File:** `src/components/dashboard/components/__tests__/kpi-bento-row.test.tsx:215-216`

**Issue:**
```typescript
const skeletons = screen.getAllByRole("presentation")
expect(skeletons).toHaveLength(6)
```

`screen.getAllByRole` queries the whole document. As long as no other element in the render tree uses `role="presentation"` this passes — but if a future change adds a decorative SVG anywhere in the rendered subtree, the count breaks unrelated to the KpiBentoRow contract.

**Fix:**
```diff
-const skeletons = screen.getAllByRole("presentation")
+const grid = screen.getByTestId("kpi-bento-row-loading")
+const skeletons = within(grid).getAllByRole("presentation")
 expect(skeletons).toHaveLength(6)
```

(Don't forget to import `within` from `@testing-library/react`.)

---

## Cycle Discipline

This is **cycle 1 of the perfect-PR gate**. Two consecutive zero-finding cycles are required before merge per `.planning/feedback_perfect_pr_gate.md`. Cycle 2 must:

1. Re-review every fix landed in cycle 1 (the fix pass typically ships its own regressions).
2. Re-run the same exhaustive checklist on the updated files (CR-01 cleanup touches `dashboard.tsx` + `page.tsx` + `dashboard.ts`; CR-02 + WR-02 + WR-04 touch `kpi-bento-row.tsx` + `kpi-helpers.ts` + tests; WR-01 touches `kpi-bento-row.tsx`; WR-03 touches `kpi-bento-row.tsx`; IN-* touch comments / tests only).
3. Confirm no new findings surface.

Expected fix-pass blast radius: 6 source files + 2 test files.

---

_Reviewed: 2026-05-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Cycle: 1 of (≥2 required)_
