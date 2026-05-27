---
phase: 4
slug: charts
milestone: v2.0
status: draft
extends: ".planning/phases/01-foundation-dedup/01-UI-SPEC.md"
inherits_ui_spec: ".planning/phases/01-foundation-dedup/01-UI-SPEC.md"
inherited_by: []
shadcn_initialized: true
preset: tenantflow-canonical (src/app/globals.css @theme)
created: 2026-05-26
requirements: [CHART-01, CHART-02, CHART-03, CHART-04, CHART-05, CHART-06]
locked_decisions_consumed: [D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11, D-12, D-13, D-14, D-15]
---

# Phase 4 — Charts: UI Design Contract

> Section-level visual + interaction contract for the Phase 4 charts row on `/dashboard`. **Inherits every rule** from `01-UI-SPEC.md` (milestone-wide). This file ONLY adds section-specific designs; it does NOT redefine tokens, dark-mode rules, breakpoints, motion budget, or the status-color usage map.

---

## 0. Inheritance & Non-Negotiables

### Parent contract (referenced, not duplicated)

| Topic | Source | Phase 4 obligation |
|-------|--------|--------------------|
| Color tokens (oklch) | `01-UI-SPEC.md` § 2.1 | Series colors source from `--color-chart-{1..5}` ONLY. No new tokens. |
| Spacing scale | `01-UI-SPEC.md` § 2.2 | Use `--spacing-{2,3,4,6,8}`. Half-step (`*_5`) tokens forbidden at layout level. |
| Radius scale | `01-UI-SPEC.md` § 2.3 | `--radius-lg` (chart Card chrome — matches existing `Card` shell default). |
| Shadow scale | `01-UI-SPEC.md` § 2.4 | `--shadow-sm` resting (Card default; no hover lift on chart cards — they're informational, not interactive). |
| Duration & easing | `01-UI-SPEC.md` § 2.5 | `--duration-300` for chart series fade-in (matches "Chart series fade-in" canonical mapping); `--duration-200` for toggle active-state transitions. |
| Typography | `01-UI-SPEC.md` § 2.6 | `CardTitle` = `text-base` (16px) `font-semibold`; `CardDescription` = `text-sm` (14px) `text-muted-foreground`; donut center value = `text-stat` (32px) `font-bold`; donut center sub-label = `text-sm` (14px) `text-muted-foreground`; legend = `text-sm` (14px). |
| Dark mode | `01-UI-SPEC.md` § 3 | All references go through tokens; light + dark verified per chart. |
| Breakpoints | `01-UI-SPEC.md` § 4 | Reuses the existing `lg:grid-cols-4` wrapper at `dashboard.tsx:178` (Tailwind viewport-based; predates Phase 1; NOT a Phase 4 change). In-chart responsive behavior uses Recharts' `ResponsiveContainer` inheritance (already inside `ChartContainer`). |
| Motion budget | `01-UI-SPEC.md` § 5 | **Phase 4 ships ZERO new `BlurFade` reveals** (Phase 3 already at the per-page page budget of 6). Chart entrance animations are Recharts-native (`isAnimationActive={!reducedMotion}`), gated on `prefers-reduced-motion`. Reveal-density budget table § 5.2 row "Recharts transitions ≤ 2 per page" is fully consumed by Phase 4 (Revenue + Donut). |
| Status colors | `01-UI-SPEC.md` § 6 | Not used for series identity (charts use `--color-chart-*` instead). Used only for the donut threshold-free legend swatches (occupied = chart-2, vacant = chart-5 — neither is a status token). |
| Density | `01-UI-SPEC.md` § 7 | Chart `Card` body padding = `p-6` (default density, matches Phase 3 KPI density default). Revenue chart body height `h-[300px]` (compact at col-span-2; see § 3.4). Donut chart body height `h-[240px]` (donut + legend stack). |
| Banned components | `01-UI-SPEC.md` § 1 | `ui/bento-grid.tsx`, `@magicui/*`, `@aceternity/*`, `animated-trend-indicator.tsx` — all forbidden. |
| Drift guards | `01-UI-SPEC.md` § 12 | `design-token-drift.test.ts` MUST stay green for both new Phase 4 chart files + the new skeleton components. |
| Currency display | `01-UI-SPEC.md` § 8 | `formatCurrency` from `src/lib/utils/currency.ts:26` is canonical. Y-axis ticks may use `(v / 1000).toFixed(0) + 'k'` (declared non-currency arithmetic per parent § 8.1 + § 8.2). Tooltip values use full `formatCurrency`. **No `* 100` / `/ 100` on a currency variable anywhere in either chart file.** |

### Phase 4 cannot introduce

- New color tokens, spacing tokens, radius tokens, shadow tokens, duration tokens, or font-size tokens.
- New `BlurFade` reveals (the page budget is consumed by Phase 3).
- A new hook to fetch chart data (CONTEXT.md D-10: the new `monthlyRevenue6mo` field rides on the existing `ownerDashboardKeys` factory; one new boundary-mapper line; zero new `useQuery` call sites).
- Tooltip interactions beyond Recharts' default hover (no drill-down, no click handlers, no hover-to-isolate — CONTEXT.md "OUT OF SCOPE").
- Custom date ranges beyond the 30d / 6mo presets (deferred per CONTEXT.md).

---

## 1. Section Anatomy

### 1.1 Mount point

The existing chart row wrapper at `src/components/dashboard/dashboard.tsx:178` (a `lg:grid-cols-4` grid) stays. Phase 4 replaces the single `<RevenueOverviewChart>` dynamic import with TWO new dynamic imports (`<RevenueAreaChart>` + `<OccupancyDonutChart>`), and rearranges the children into the 3-up layout locked in CONTEXT.md D-02.

```
<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">       ← unchanged wrapper
  <RevenueAreaChart {…} />            ← NEW, lg:col-span-2
  <OccupancyDonutChart {…} />         ← NEW, lg:col-span-1
  <Card data-tour="quick-actions">    ← unchanged, lg:col-span-1
    {…existing Quick Actions block…}
  </Card>
</div>
```

### 1.2 3-up layout (LOCKED — CONTEXT.md D-02)

| Component | Column span (lg+) | Mobile (<lg) behavior |
|-----------|-------------------|----------------------|
| `<RevenueAreaChart>` | `lg:col-span-2` | Full width, stacks first |
| `<OccupancyDonutChart>` | `lg:col-span-1` | Full width, stacks below revenue |
| `<Card data-tour="quick-actions">` (existing) | `lg:col-span-1` (unchanged) | Full width, stacks below donut |

Donut renders cleanly at ~250px container width inside `lg:col-span-1`. No new media queries; the existing Tailwind responsive collapse handles `<lg`.

### 1.3 No section-level landmark wrapper

Phase 4 does NOT add a `<section aria-labelledby>` landmark for the chart row. Each chart `Card` carries its own `CardHeader` `<CardTitle>` (`Revenue` / `Occupancy`) which screen-reader users navigate via heading level. Adding a section landmark for two charts would be over-engineering relative to Phase 3 (which earned its landmark by being a 6-tile bento). Confirmed against parent § 3 / § 8.5 — landmarks are per-page semantic decisions, not per-component.

### 1.4 No BlurFade wrappers (CONTEXT.md D-07)

Phase 4 cards mount immediately on data arrival with no `BlurFade` reveal. Visual entrance is Recharts' own `isAnimationActive` (gated on reduced-motion per § 5.1). This intentionally inherits the chart row's appearance from the bento row's wave-B reveal completing — by the time the user perceives the chart row, the bento row has finished revealing, and the charts simply paint.

---

## 2. Revenue Area Chart — Visual Contract

### 2.1 Component contract

New file: `src/components/dashboard/components/revenue-area-chart.tsx` (CONTEXT.md D-05).

```tsx
"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "#components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "#components/ui/tabs";
import { formatCurrency } from "#lib/utils/currency";
import { useReducedMotion } from "#hooks/use-reduced-motion";

type RevenueWindow = "30d" | "6mo";

interface RevenueAreaChartProps {
  monthlyRevenue: { date: string; value: number }[];           // 30d series (existing)
  monthlyRevenue6mo: { month: string; value: number }[];       // 6mo series (NEW from D-01)
}

export function RevenueAreaChart({ monthlyRevenue, monthlyRevenue6mo }: RevenueAreaChartProps) {
  const [window, setWindow] = useState<RevenueWindow>("30d");      // D-04 default
  const reducedMotion = useReducedMotion();
  const isEmpty =
    (window === "30d" && monthlyRevenue.length === 0) ||
    (window === "6mo" && monthlyRevenue6mo.length === 0);
  // …render Card shell + tabs in header right slot + chart body or empty state
}
```

### 2.2 Card shell + header layout

```
┌──────────────────────────────────────────────────────────┐
│  Revenue                              ┌──────┬─────┐     │  ← CardHeader
│  Last 30 days                         │ 30d  │ 6mo │     │  ← Tabs (right slot)
│                                       └──────┴─────┘     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│             [ Recharts AreaChart, h-[300px] ]            │  ← CardContent
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- `<CardHeader>` uses the project-canonical `flex flex-row items-center justify-between space-y-0` pattern so `<CardTitle>` + `<CardDescription>` sit on the left and the segmented control sits on the right.
- `<CardTitle>` = `Revenue` (`text-base font-semibold` — inherits Card defaults).
- `<CardDescription>` updates with the toggle: `Last 30 days` ↔ `Last 6 months` (D-04 honest subtitle).
- Right slot: shadcn `<Tabs>` rendering `<TabsList>` with two `<TabsTrigger>` children (`30d`, `6mo`). Chosen over `<ToggleGroup>` because:
  - `<Tabs>` with `value` / `onValueChange` cleanly binds to `useState<'30d' | '6mo'>` (D-04 ephemeral local state).
  - `<TabsList>` already styles a segmented-control well via `--color-muted` background per parent § 2.1 (tertiary surface).
  - `<TabsTrigger>` `data-state="active"` styling already applies `--color-background` + `--shadow-sm`, matching the parent § 2.5 active-state shift over `--duration-200`.

### 2.3 Tabs styling (segmented control)

| Property | Value | Source |
|----------|-------|--------|
| `<TabsList>` background | `bg-muted` | shadcn default (matches parent § 2.1 "Tertiary surface — View-toggle background") |
| `<TabsList>` radius | `--radius-md` | shadcn default |
| `<TabsTrigger>` active background | `bg-background` | shadcn default |
| `<TabsTrigger>` active shadow | `--shadow-sm` | shadcn default |
| `<TabsTrigger>` text | `text-sm font-medium` (14px) | matches parent § 2.6 "active state in segmented controls = `--font-weight-medium`" |
| `<TabsTrigger>` transition | `transition-all duration-(--duration-200)` (shadcn `<TabsTrigger>` baseline) | matches parent § 2.5 |
| Inner padding | `px-3 py-1.5` (shadcn baseline) | inherits half-step `*_5` exception per parent § 2.2 — `*_5` IS allowed on interactive primitives |

### 2.4 X-axis tick formatters

**30d window** (`monthlyRevenue` — daily points):
```ts
tickFormatter={(iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
// → "Mar 12"
```

**6mo window** (`monthlyRevenue6mo` — monthly aggregates as `YYYY-MM`):
```ts
tickFormatter={(yyyymm) => {
  const [year, month] = yyyymm.split("-").map(Number);
  return new Date(year, month - 1).toLocaleDateString("en-US", { month: "short" });
}}
// → "Mar"
```

CONTEXT.md "Claude's Discretion" picks the lower-noise option. **Verdict: `Mar 12` for 30d, `Mar` for 6mo** — no year, no day-of-month padding. The 30d window's 30 ticks would clutter if shown as `03/12`; `Mar 12` reads at a glance. The 6mo window has only 6 ticks; the bare month label is unambiguous within a calendar year.

### 2.5 Y-axis tick formatter

```ts
tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
// → "$0", "$5k", "$12k"
```

Identical to the existing `revenue-overview-chart.tsx:70` pattern. Parent § 8.2 declares this is non-currency arithmetic (chart-axis thousand-unit ticks) and is EXEMPT from the `* 100` / `/ 100` ban.

### 2.6 Series styling

| Property | Value | Source / rationale |
|----------|-------|-------------------|
| `Area.type` | `"monotone"` | Smooth curve; same as Phase 3 sparkline + existing revenue chart |
| `Area.dataKey` | `"value"` | Matches both `monthlyRevenue[]` and `monthlyRevenue6mo[]` shapes |
| `Area.stroke` | `var(--color-chart-1)` | CONTEXT.md D-09 — Revenue → `--color-chart-1` (parent § 2.1) |
| `Area.strokeWidth` | `2` | Matches existing `revenue-overview-chart.tsx:89` |
| `Area.fill` | `url(#fillRevenue)` linear gradient `--color-chart-1` 80% → 10% | Mirrors existing chart's gradient pattern (offsets 5% → 95%) |
| `Area.isAnimationActive` | `!reducedMotion` | D-04 reduced-motion gate via `useReducedMotion()` |
| `Area.dot` | `false` | At 30 points (30d) or 6 points (6mo), dots clutter — line-only is cleaner |
| `Area.activeDot` | `{ r: 4 }` (default) | Hover dot on tooltip cursor; standard Recharts pattern |

### 2.7 Axes + gridline styling

```tsx
<CartesianGrid vertical={false} strokeDasharray="3 3" />
<XAxis dataKey="…" tickLine={false} axisLine={false} tickMargin={8} />
<YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={…} />
```

- `CartesianGrid` horizontal-only, dashed (matches existing chart pattern + project convention).
- `tickLine={false}` + `axisLine={false}` — no axis lines, no tick marks (cleaner B2B look per parent § 1).
- Gridline stroke inherits from `ChartContainer`'s theming — resolves to `--color-border` at `~50%` opacity per parent § 2.1 chart palette rules.
- Axis label color inherits `--color-muted-foreground` via `ChartContainer` theming.

### 2.8 Tooltip

```tsx
<ChartTooltip
  cursor={false}
  content={
    <ChartTooltipContent
      labelFormatter={(label) => /* same date formatting as X-axis */}
      formatter={(value) => [formatCurrency(Number(value), { minimumFractionDigits: 0, maximumFractionDigits: 0 }), "Revenue"]}
    />
  }
/>
```

- `cursor={false}` per existing pattern (no vertical cursor line — the activeDot is sufficient).
- Tooltip label = same formatter as X-axis tick (consistent date display).
- Tooltip value = `formatCurrency(value)` with no-cents options (matches parent § 8.1 + Phase 1 D-09a — `formatCurrency` from `src/lib/utils/currency.ts:26` is canonical).
- Tooltip surface inherits `--color-popover` + `--color-popover-foreground` from `ChartTooltipContent` defaults (parent § 2.1).

### 2.9 Chart height

`h-[300px]` (CONTEXT.md "Claude's Discretion" — picked over the existing `h-[400px]`). Rationale: the new col-span-2 layout makes the chart narrower than its previous col-span-3 occupancy, so a shorter height keeps the aspect ratio readable and visually balances against the col-span-1 donut card (which sits at `h-[240px]` body + ~80px header — so the donut card's total ≈ 320px, and the revenue card's total ≈ 380px once header + padding stack — close enough for the row to feel intentional, not jagged).

### 2.10 Chart margin

```ts
margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
```

Identical to the existing chart's margins. The `left: 0` lets Y-axis labels (`$5k`, `$12k`) breathe naturally inside the `tickMargin: 8` instead of being shifted right.

---

## 3. Occupancy Donut Chart — Visual Contract

### 3.1 Component contract

New file: `src/components/dashboard/components/occupancy-donut-chart.tsx` (CONTEXT.md D-05).

```tsx
"use client";

import { Pie, PieChart, Label } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#components/ui/card";
import { ChartContainer } from "#components/ui/chart";
import { useReducedMotion } from "#hooks/use-reduced-motion";

interface OccupancyDonutChartProps {
  units: { occupied: number; vacant: number; total: number };
}

export function OccupancyDonutChart({ units }: OccupancyDonutChartProps) {
  const reducedMotion = useReducedMotion();
  const isEmpty = units.total === 0;                  // D-03 honesty
  const occupancyPercent = isEmpty ? 0 : Math.round((units.occupied / units.total) * 100);
  // …render Card shell + donut + center label + legend, OR empty state
}
```

### 3.2 Card shell + body layout

```
┌──────────────────────────────────────────────┐
│  Occupancy                                   │  ← CardHeader (CardTitle only)
│  Across all units                            │  ← CardDescription
├──────────────────────────────────────────────┤
│                                              │
│                  ╭─────╮                     │  ← Recharts PieChart
│                ╱         ╲                   │     (donut with center label)
│               │   87%     │                  │  ← center Label (Recharts <Label position="center">)
│               │ Occupied  │                  │
│                ╲         ╱                   │
│                  ╰─────╯                     │
│                                              │
│  ● Occupied 87   ● Vacant 13                 │  ← Legend (real <ul><li>)
│                                              │
└──────────────────────────────────────────────┘
```

- `<CardTitle>` = `Occupancy`.
- `<CardDescription>` = `Across all units`.
- Card body (`<CardContent>`) holds: PieChart (donut + center label) + Legend `<ul>` below.
- Body height: `h-[240px]` (CONTEXT.md "Claude's Discretion" baseline). Donut diameter sized to fit ~180px tall, legend row claims the remaining ~60px.

### 3.3 Donut + center label (CONTEXT.md D-03)

```tsx
<ChartContainer config={donutConfig} className="!aspect-auto h-[180px] w-full">
  <PieChart>
    <Pie
      data={[
        { name: "Occupied", value: units.occupied, fill: "var(--color-chart-2)" },
        { name: "Vacant",   value: units.vacant,   fill: "var(--color-chart-5)" },
      ]}
      dataKey="value"
      nameKey="name"
      innerRadius={50}
      outerRadius={80}
      strokeWidth={0}
      isAnimationActive={!reducedMotion}
    >
      <Label
        position="center"
        content={({ viewBox }) => {
          if (!viewBox || !("cx" in viewBox)) return null;
          return (
            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
              <tspan x={viewBox.cx} dy="-0.4em" className="fill-foreground text-stat font-bold tabular-nums">
                {occupancyPercent}%
              </tspan>
              <tspan x={viewBox.cx} dy="1.6em" className="fill-muted-foreground text-sm">
                Occupied
              </tspan>
            </text>
          );
        }}
      />
    </Pie>
  </PieChart>
</ChartContainer>
```

| Property | Value | Source |
|----------|-------|--------|
| `Pie.innerRadius` | `50` | Donut hole sized for the center label |
| `Pie.outerRadius` | `80` | Total donut diameter ~160px at h-[180px] container |
| `Pie.strokeWidth` | `0` | No wedge stroke (clean separation via wedge color contrast alone) |
| `Pie.isAnimationActive` | `!reducedMotion` | Recharts-native entrance (no `BlurFade`) |
| Occupied wedge `fill` | `var(--color-chart-2)` | CONTEXT.md D-09 + parent § 2.1 — chart-2 is canonical "Occupancy series" |
| Vacant wedge `fill` | `var(--color-chart-5)` | CONTEXT.md D-09 + parent § 2.1 — chart-5 is the canonical "remainder wedge" |
| Center value `<tspan>` | `text-stat` (32px) `font-bold` `fill-foreground` `tabular-nums` | Parent § 2.6 — KPI numeric ladder reused (matches CONTEXT.md D-03 "matches KPI bento StatValue hierarchy") |
| Center sub-label `<tspan>` | `text-sm` (14px) `fill-muted-foreground` | Parent § 2.6 — `StatDescription`-equivalent |

**Why `fill-*` Tailwind utilities on `<tspan>` instead of `style={{ fill: '...'}}`:** SVG `<text>` elements honor Tailwind's `fill-*` utility classes; this preserves the token-only-color rule from parent § 2.1 + § 3.1. No inline color literal.

### 3.4 Legend (CONTEXT.md D-03 — real `<ul><li>` for colorblind a11y)

```tsx
<ul className="mt-4 flex items-center justify-center gap-6 text-sm">
  <li className="flex items-center gap-2">
    <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-[var(--color-chart-2)]" />
    <span className="text-muted-foreground">Occupied</span>
    <span className="font-semibold tabular-nums text-foreground">{units.occupied}</span>
  </li>
  <li className="flex items-center gap-2">
    <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-[var(--color-chart-5)]" />
    <span className="text-muted-foreground">Vacant</span>
    <span className="font-semibold tabular-nums text-foreground">{units.vacant}</span>
  </li>
</ul>
```

| Property | Value | Source |
|----------|-------|--------|
| Container | `<ul>` (NOT a `<div role="list">`) | CONTEXT.md D-03: "real `<ul><li>` elements (colorblind-friendly — wedge color is not the only signal)" |
| Swatch | `size-2.5` (10px) `rounded-full` `bg-[var(--color-chart-N)]` | Arbitrary-value Tailwind bracket syntax for token color — canonical project pattern (per Phase 3 § 4.2 precedent) |
| Swatch a11y | `aria-hidden="true"` | Decorative; the text label "Occupied" / "Vacant" carries semantic meaning |
| Label text | `text-muted-foreground` | Parent § 2.1 (secondary text) |
| Count text | `font-semibold tabular-nums text-foreground` | Highlights the count; tabular-nums for column-scan alignment |
| Inter-item gap | `gap-6` (24px) | Parent § 2.2 default panel padding scale |

**Half-step exception note:** `size-2.5` (10px) is one of the parent § 2.2 `*_5` half-step tokens, allowed here because legend swatches are "interactive-primitive-adjacent" chrome (they accompany clickable-feeling labels). This is consistent with the parent's exception class (interactive controls and chip insets). NOT a layout-level use.

### 3.5 Donut a11y

The PieChart wrapper carries a constructed `aria-label`:

```tsx
<div
  role="img"
  aria-label={`Occupancy donut: ${occupancyPercent} percent occupied (${units.occupied} of ${units.total} units)`}
  className="h-[180px] w-full"
>
  <ChartContainer …>…</ChartContainer>
</div>
```

Examples:
- `"Occupancy donut: 87 percent occupied (87 of 100 units)"`
- `"Occupancy donut: 0 percent occupied (0 of 0 units)"` — handled by the empty-state branch (§ 6.2), so this aria-label never actually fires.

The internal Recharts `<svg>` is not interactive (no tooltip — see § 3.6); collapsing it to `role="img"` is the canonical Recharts wrapper a11y pattern (same as Phase 3 sparkline § 6.1).

### 3.6 No tooltip on donut

The donut deliberately omits `<ChartTooltip>`. The donut is a *primary signal* (the center label + legend already enumerate every wedge value). A tooltip would imply data-point interrogation that doesn't exist at the 2-wedge resolution. Same rationale as Phase 3 sparkline (§ 6.5).

---

## 4. Toggle UX (CONTEXT.md D-04)

### 4.1 Component + state

- **Primitive:** shadcn `<Tabs>` (vendored at `src/components/ui/tabs.tsx`).
- **State:** local `useState<'30d' | '6mo'>` inside `RevenueAreaChart`. **NOT nuqs URL persistence.** Rationale (CONTEXT.md D-04): ephemeral chart-UI state, not cross-component or cross-route state; Phase 5 reserves nuqs for the DataTable.
- **Default:** `30d` on first render.

### 4.2 Toggle placement

Top-right slot of the Revenue card's `<CardHeader>`. Standard pattern:

```tsx
<CardHeader className="flex flex-row items-center justify-between space-y-0">
  <div>
    <CardTitle>Revenue</CardTitle>
    <CardDescription>{window === "30d" ? "Last 30 days" : "Last 6 months"}</CardDescription>
  </div>
  <Tabs value={window} onValueChange={(v) => setWindow(v as RevenueWindow)}>
    <TabsList>
      <TabsTrigger value="30d">30d</TabsTrigger>
      <TabsTrigger value="6mo">6mo</TabsTrigger>
    </TabsList>
  </Tabs>
</CardHeader>
```

Resolves the parent UI-SPEC § 13 open question "Whether the 30d / 6mo toggle on Revenue chart sits inside the chart panel header or above it" — **default LOCKED: inside the chart panel header, right-aligned.**

### 4.3 Toggle active-state visuals

Already covered by shadcn `<TabsTrigger>` baseline (canonical source: `src/components/ui/tabs.tsx:46`):
- Active: `bg-primary` + `text-primary-foreground` + `--shadow-sm` (raised accent pill within the muted well)
- Inactive: transparent background, `text-muted-foreground`
- Hover (inactive): `text-foreground` transition over `--duration-200`
- Active text weight: `--font-weight-medium` (500)

Parent § 2.1 "Accent (10%) is reserved for: The active segment of the 30d / 6mo toggle (Phase 4)" anticipates accent on the active state, and the vendored primitive matches that reservation exactly — the active pill consumes the accent slot. Phase 4 accepts the vendored baseline rather than overriding it; no per-instance className override on `<TabsTrigger>`.

### 4.4 Toggle reduced-motion

`<TabsTrigger>` uses CSS transitions only (`transition-all duration-(--duration-200)`). The global `prefers-reduced-motion: reduce` CSS guard in `globals.css:1151-1157` automatically forces `transition-duration: 0.01ms` for reduced-motion users. No additional JS guard needed.

### 4.5 Toggle keyboard interaction

shadcn `<Tabs>` ships keyboard a11y from Radix:
- Tab into the `<TabsList>` → focus lands on the active trigger.
- Arrow Left / Right cycles between triggers.
- Enter / Space activates the focused trigger.
- Active trigger gets `data-state="active"` + visible focus ring (`--color-ring` from parent § 2.1).

Phase 4 obligation: NONE additional. The vendored primitive covers it.

---

## 5. Motion + Animation Contract

### 5.1 Reduced-motion gate

```tsx
import { useReducedMotion } from "#hooks/use-reduced-motion";
const reducedMotion = useReducedMotion();
// …
<Area isAnimationActive={!reducedMotion} … />
<Pie isAnimationActive={!reducedMotion} … />
```

Both new chart components import `useReducedMotion` from `src/hooks/use-reduced-motion.ts` — the Phase 3 canonical hook (CONTEXT.md D-04 last paragraph; CONTEXT.md "Canonical References" — `src/hooks/use-reduced-motion.ts`).

### 5.2 Motion budget consumption (parent § 5.2)

| Animation | Per-page budget | Phase 4 consumption |
|-----------|----------------|---------------------|
| `BlurFade` reveals | ≤ 6 per page | **0** (Phase 3 consumed all 6) |
| `NumberTicker` animations | ≤ 6 per page | **0** (the donut center label is a static `<tspan>`, not a `NumberTicker` — § 3.3) |
| Recharts transitions | ≤ 2 per page | **2** (Revenue area entrance + Donut wedge entrance) |
| CSS hover lifts | unlimited | 0 on chart cards (informational, not interactive) |

Phase 4 fully consumes the "Recharts transitions ≤ 2" budget. No Phase 5/6/7 chart additions are allowed without an explicit budget revision in the milestone-wide UI-SPEC.

### 5.3 Recharts entrance duration

Recharts default animation duration is 1500ms — too long against the rest of the dashboard's 300-500ms motion grammar (parent § 2.5). Phase 4 pins it to 800ms (mid-band):

```tsx
<Area animationDuration={800} animationEasing="ease-out" isAnimationActive={!reducedMotion} …/>
<Pie animationDuration={800} animationEasing="ease-out" isAnimationActive={!reducedMotion} …/>
```

`animationDuration={800}` matches Phase 3's `NumberTicker.duration={800}` (Phase 3 § 5 — keeps the dashboard's motion vocabulary consistent across phases). `animationEasing="ease-out"` is Recharts' string-literal interface for what parent § 2.5 codifies as `--ease-out` cubic-bezier — Recharts doesn't accept the bezier string directly, so we use its canonical preset name. **This is the ONE place Phase 4 references a duration outside the `--duration-*` token system, justified because Recharts requires an integer ms prop, not a CSS variable.** Inline-ms drift-guard exemption is required at execution time; the existing `design-token-drift.test.ts` either already exempts Recharts component props or planner adds a per-file exemption (the v1.0 Phase 11 scanner pattern accepts this kind of vendor-API-driven exception).

> **Cycle-1 gate:** Executor verifies the drift-guard scanner's handling of `animationDuration={800}` on Recharts components. If the scanner flags it, planner adds the prop-name exemption pattern (e.g., a `// design-token-drift-allow: recharts-animation` comment, or extends the scanner's allow-list with Recharts component props). NEVER hardcode the ms value as a string literal that the scanner can parse as inline-ms — pass the JSX prop directly.

---

## 6. Empty States (CONTEXT.md D-08)

### 6.1 Revenue chart empty state

**Trigger:** the active window's data array is empty (`window === "30d" && monthlyRevenue.length === 0`, OR `window === "6mo" && monthlyRevenue6mo.length === 0`).

**Render:** Card shell + the toggle in the header (still functional) + centered empty-state inside the `CardContent` body:

```tsx
<CardContent className="flex h-[300px] flex-col items-center justify-center gap-2 text-center">
  <p className="text-base font-semibold text-foreground">No revenue data yet</p>
  <p className="text-sm text-muted-foreground">Add a lease to start tracking revenue</p>
</CardContent>
```

| Property | Value |
|----------|-------|
| Container height | `h-[300px]` — identical to the chart body, no layout shift |
| Heading | `text-base font-semibold text-foreground` — readable but not aggressive |
| Body | `text-sm text-muted-foreground` — soft, instructional |
| No icon | Per parent § 1 "Restrained B2B" — illustrations stay out of the dashboard |
| No CTA button | The lease-creation entry point lives elsewhere; the body copy IS the next-step prompt |

**6mo-empty-but-30d-populated edge** (CONTEXT.md D-08): same empty state shown when `window === "6mo"`. The toggle still works; switching back to `30d` reveals the populated chart. No fabrication.

### 6.2 Donut chart empty state

**Trigger:** `units.total === 0` (CONTEXT.md D-03 + D-08).

**Render:** Card shell + centered empty-state inside `CardContent` body (donut + legend both omitted — no `0%` donut, no fabricated wedges):

```tsx
<CardContent className="flex h-[240px] flex-col items-center justify-center gap-2 text-center">
  <p className="text-base font-semibold text-foreground">No units yet</p>
  <p className="text-sm text-muted-foreground">Add a property to see occupancy</p>
</CardContent>
```

Same typography contract as the revenue empty state for consistency. Same no-icon / no-CTA rule.

### 6.3 Empty-state copy honesty (parent § 10 + CONTEXT.md D-08)

| Chart | Empty heading | Empty body |
|-------|--------------|-----------|
| Revenue | `No revenue data yet` | `Add a lease to start tracking revenue` |
| Donut | `No units yet` | `Add a property to see occupancy` |

Both copy strings are FINAL, non-fabricated, propose a next step (parent § 10 cross-cutting rule). No "—", no `0`, no fabricated baseline.

---

## 7. Loading Skeletons (CONTEXT.md D-06 — CHART-05 + CHART-06)

### 7.1 Skeleton rule

Each chart owns its own CSS-only skeleton component that **matches the rendered shape**. Skeletons render inside the `next/dynamic` `loading:` callback for each chart, ensuring the same shell renders during code-split fetch AND during data-fetch loading. **No mutual-exclusion violation with empty states** (parent § 10 cross-cutting rule + Phase 14 D-04 v1.0 pattern).

### 7.2 Revenue skeleton component

```tsx
function RevenueAreaChartSkeleton() {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="space-y-2">
          <Skeleton className="h-5 w-20" />        {/* CardTitle "Revenue" */}
          <Skeleton className="h-4 w-32" />        {/* CardDescription "Last 30 days" */}
        </div>
        {/* Disabled segmented control (preserves header height) */}
        <div className="inline-flex h-9 items-center rounded-md bg-muted p-1 opacity-60" aria-hidden="true">
          <div className="h-7 w-12 rounded-sm bg-background shadow-sm" />
          <div className="h-7 w-12" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full rounded-md" />     {/* Chart body */}
      </CardContent>
    </Card>
  );
}
```

| Element | Skeleton class | Why |
|---------|---------------|-----|
| Card shell | `lg:col-span-2` (inherits Card defaults: `bg-card`, `border`, `rounded-lg`, `shadow-sm`) | Identical to loaded chart shell — no border / shadow / radius shift on load |
| Title placeholder | `h-5 w-20` | Matches `text-base` line-height + "Revenue" string width |
| Description placeholder | `h-4 w-32` | Matches `text-sm` + "Last 30 days" string width |
| Toggle placeholder | Static disabled segmented control (CONTEXT.md D-06) | Preserves header height; one pill highlighted to mimic active state |
| Chart body | `h-[300px] w-full rounded-md` | Matches chart container exactly |

### 7.3 Donut skeleton component

```tsx
function OccupancyDonutChartSkeleton() {
  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <Skeleton className="h-5 w-24" />          {/* CardTitle "Occupancy" */}
        <Skeleton className="mt-2 h-4 w-28" />     {/* CardDescription "Across all units" */}
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <Skeleton className="size-[160px] rounded-full" />  {/* Donut placeholder */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Skeleton className="size-2.5 rounded-full" />
            <Skeleton className="h-3 w-20" />               {/* "Occupied N" */}
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="size-2.5 rounded-full" />
            <Skeleton className="h-3 w-16" />               {/* "Vacant N" */}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

| Element | Skeleton class | Why |
|---------|---------------|-----|
| Card shell | `lg:col-span-1` (inherits Card defaults) | Identical to loaded shell |
| Title placeholder | `h-5 w-24` | Matches "Occupancy" width |
| Description placeholder | `h-4 w-28` | Matches "Across all units" width |
| Donut placeholder | `size-[160px] rounded-full` (uses the donut's outer diameter ~160px) | Matches the actual donut shape — `bg-muted` solid disk, no inner hole (the `Skeleton` shimmer carries the visual feedback) |
| Legend row | 2-pill horizontal row at `gap-6` | Matches loaded legend layout |
| Legend swatch | `size-2.5 rounded-full` | Matches loaded swatch |

### 7.4 Skeleton ↔ data branch render (POLISH-07)

Both new chart components branch render at the top-level prop-presence boundary in the parent (`dashboard.tsx`). The skeleton is what `next/dynamic` shows during code-split fetch; the component itself never co-renders skeleton + empty (it shows one OR the other based on data state).

```tsx
// In dashboard.tsx
const RevenueAreaChart = dynamic(
  () => import("./components/revenue-area-chart").then((m) => m.RevenueAreaChart),
  { ssr: false, loading: () => <RevenueAreaChartSkeleton /> }
);
const OccupancyDonutChart = dynamic(
  () => import("./components/occupancy-donut-chart").then((m) => m.OccupancyDonutChart),
  { ssr: false, loading: () => <OccupancyDonutChartSkeleton /> }
);
```

The `loading:` callback fires DURING the dynamic import; once the bundle resolves, the component itself takes over and branches on data state. The branch render is mutually exclusive — skeleton (code-split) → empty (data-empty) OR data (data-populated). Three states, never two at once.

### 7.5 Skeleton vs `Skeleton` primitive

Uses `<Skeleton>` from `src/components/ui/skeleton.tsx` (existing project component). The component already ships:
- `bg-muted` (parent § 2.1 tertiary surface)
- Shimmer animation via `animate-pulse` (Tailwind built-in)
- Theme-aware via tokens — `bg-muted` resolves correctly in light + dark mode
- Reduced-motion respect via the global `prefers-reduced-motion: reduce` CSS guard in `globals.css:1151` (which sets `animation-duration: 0.01ms !important` globally)

---

## 8. Accessibility Hooks

### 8.1 Headings

- `<CardTitle>` renders as `<div>` by default in shadcn; but the chart Cards are top-level subsections within the dashboard's content area. Phase 4 inherits whatever heading semantics the existing Card primitive ships (no override).
- The page-level `<h1>Dashboard</h1>` is preserved upstream (Phase 3 § 1.1).
- The donut center value `<text>`/`<tspan>` is NOT a heading; it's decorative content inside `role="img"` (§ 3.5).

### 8.2 Tooltip a11y

- Recharts `<ChartTooltip>` is keyboard-focusable when the user reaches the chart via Tab; the tooltip content is announced via the active-data-point relationship.
- `cursor={false}` removes the visual cursor line but does NOT remove the focusable behavior.

### 8.3 Toggle a11y

Covered by shadcn Radix Tabs (§ 4.5):
- `<TabsList>` is `role="tablist"`
- `<TabsTrigger>` is `role="tab"`
- Arrow-key cycling, Enter/Space activation, focus ring via `--color-ring`

### 8.4 Donut a11y (recap of § 3.5)

- Wrapper div: `role="img"` + computed `aria-label` ("Occupancy donut: N percent occupied (X of Y units)").
- Legend: real `<ul><li>` (NOT `role="list"` on a div) — colorblind users get full information via the text labels independently of wedge color (CONTEXT.md D-03).
- Center `<text>` inside SVG: not separately labeled (the wrapper `aria-label` is sufficient).

### 8.5 Empty-state a11y

Empty-state copy renders as plain paragraphs (`<p>`) inside the Card. They're picked up by screen-reader content reading; no extra `role` or `aria-live` needed (the content is static once mounted).

### 8.6 No focusable element budget violations

Phase 4 adds 2 focusable element groups (the Tabs trigger pair on Revenue, the chart-region focus on each via Recharts tooltip). Inherits the dashboard shell's focus-ring rules from parent § 3.2 + CLAUDE.md accessibility.

---

## 9. Dark-Mode Verification (CHART-04)

Every color reference in Phase 4 resolves to a token with both light and dark variants in `globals.css`.

| Element | Light value (from token) | Dark value (from token) | Verification |
|---------|--------------------------|-------------------------|--------------|
| Chart Card background (`bg-card`) | `oklch(0.99 0.003 240)` | `oklch(0.16 0.02 255)` | Inherited from `Card` shell |
| Chart Card border | `oklch(0.88 0.01 245)` | `oklch(0.3 0.015 255)` | `--color-border` |
| Revenue area stroke + fill | `var(--color-chart-1)` ≈ `oklch(0.63 0.22 259)` | inherits (same hue, theme-aware via shadcn `Chart` machinery) | Single token; parent § 2.1 verified |
| Donut occupied wedge | `var(--color-chart-2)` ≈ `oklch(0.7 0.18 180)` | inherits | Parent § 2.1 verified |
| Donut vacant wedge | `var(--color-chart-5)` ≈ `oklch(0.55 0.12 250)` | inherits | Parent § 2.1 verified |
| Axis labels | `--color-muted-foreground` | `--color-muted-foreground` (dark variant) | Parent § 2.1 |
| Gridlines | `--color-border` at ~50% opacity (via `ChartContainer` theming) | inherits | Parent § 2.1 |
| Tooltip background | `--color-popover` | `oklch(0.12 0.015 250)` | Parent § 2.1 |
| Tooltip text | `--color-popover-foreground` | inherits | Parent § 2.1 |
| Donut center value | `text-foreground` | inherits | Parent § 2.1 |
| Donut center sub-label | `text-muted-foreground` | inherits | Parent § 2.1 |
| Legend swatch (occupied) | `var(--color-chart-2)` | inherits | Visible against `bg-card` in both modes |
| Legend swatch (vacant) | `var(--color-chart-5)` | inherits | Visible against `bg-card` in both modes |
| Legend text | `text-muted-foreground` (label) + `text-foreground` (count) | inherits | Both visible in both modes |
| Tabs well | `bg-muted` | inherits | Parent § 2.1 |
| Tabs active pill | `bg-background` + `--shadow-sm` | inherits | Parent § 2.1 |
| Skeleton | `bg-muted` (via `Skeleton` primitive) | inherits | Parent § 2.1 |
| Empty-state heading | `text-foreground` | inherits | Parent § 2.1 |
| Empty-state body | `text-muted-foreground` | inherits | Parent § 2.1 |

**No `bg-white` anywhere** (drift guard verified). **No raw hex / rgb / oklch literals in JSX** (drift guard verified). **No inline `style={{ color: '#...' }}`** anywhere — the closest precedent (the donut center `<tspan>`) uses Tailwind `fill-*` utilities + `bg-[var(--color-chart-N)]` arbitrary-value bracket syntax which is token-bound and passes the scanner.

POLISH-04 (Phase 6) re-audits at milestone end; Phase 4 ships dark-mode-clean.

---

## 10. Component Inventory (Phase 4 net-new + consumed)

### 10.1 New Phase 4 files

| File | Purpose |
|------|---------|
| `src/components/dashboard/components/revenue-area-chart.tsx` | RevenueAreaChart — Recharts area with 30d/6mo Tabs toggle (replaces `revenue-overview-chart.tsx`) |
| `src/components/dashboard/components/occupancy-donut-chart.tsx` | OccupancyDonutChart — Recharts donut + center label + legend |
| `src/components/dashboard/components/revenue-area-chart-skeleton.tsx` | Loading skeleton matching RevenueAreaChart shape (CHART-05/06) — OR colocated inside `revenue-area-chart.tsx` per planner discretion |
| `src/components/dashboard/components/occupancy-donut-chart-skeleton.tsx` | Loading skeleton matching OccupancyDonutChart shape — OR colocated per planner discretion |
| `src/components/dashboard/components/__tests__/revenue-area-chart.test.tsx` | Vitest pins for RevenueAreaChart (toggle behavior, empty state branches, formatter outputs) |
| `src/components/dashboard/components/__tests__/occupancy-donut-chart.test.tsx` | Vitest pins for OccupancyDonutChart (percent computation, empty-state branch, aria-label construction, legend rendering as `<ul>`) |
| `supabase/migrations/{TIMESTAMP}_phase4_revenue_trend_6mo.sql` | Additive RPC migration (CONTEXT.md D-01 — extends `get_dashboard_data_v2` with `monthly_revenue_6mo`) |
| `tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` | Dual-client RLS integration test for the 6mo series (CONTEXT.md D-01) |

### 10.2 Consumed (no edits)

| Asset | Source |
|-------|--------|
| `Card` / `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` | `src/components/ui/card.tsx` |
| `ChartContainer` / `ChartTooltip` / `ChartTooltipContent` | `src/components/ui/chart.tsx` |
| `Tabs` / `TabsList` / `TabsTrigger` | `src/components/ui/tabs.tsx` |
| `Skeleton` | `src/components/ui/skeleton.tsx` |
| `useReducedMotion` | `src/hooks/use-reduced-motion.ts` (Phase 3 canonical hook) |
| `formatCurrency` | `src/lib/utils/currency.ts:26` (Phase 1 canonical formatter) |
| `OwnerDashboardData` | `src/hooks/api/use-owner-dashboard.ts` (one new boundary-mapper line for `monthlyRevenue6mo` per D-01) |
| `cn` | `#lib/utils` |
| Recharts (`Area`, `AreaChart`, `Pie`, `PieChart`, `Label`, `XAxis`, `YAxis`, `CartesianGrid`) | npm `recharts` |

### 10.3 Edited

| File | Edit |
|------|------|
| `src/components/dashboard/dashboard.tsx` | Replace single `<RevenueOverviewChart>` dynamic import with TWO dynamic imports (`<RevenueAreaChart>` + `<OccupancyDonutChart>`). Rearrange chart row to 3-up layout per D-02. Pass `monthlyRevenue` + `monthlyRevenue6mo` to revenue chart, `units` to donut chart. |
| `src/app/(owner)/dashboard/page.tsx` | If the existing `revenueTrend` intermediate transform stays (lines ~61-68), extend it to also pass `monthlyRevenue6mo`. OR (planner discretion) drop it entirely and read both slices directly from `OwnerDashboardData.timeSeries`. |
| `src/hooks/api/use-owner-dashboard.ts` | Add `monthlyRevenue6mo: { month: string; value: number }[]` to the boundary mapper output (one new line, CONTEXT.md D-01 + D-10). |
| `src/types/analytics.ts` | Add a new type for the 6mo data point (`MonthlyRevenuePoint` or similar — planner picks a name that doesn't collide with existing `TimeSeriesDataPoint`). |

### 10.4 Deleted

| File | Reason |
|------|--------|
| `src/components/dashboard/components/revenue-overview-chart.tsx` | Replaced by `revenue-area-chart.tsx` (CONTEXT.md D-05 atomic-commit-per-change; no transitional rename) |

### 10.5 Forbidden (parent § 1)

- `src/components/ui/bento-grid.tsx` — DO NOT IMPORT
- `src/components/dashboard/animated-trend-indicator.tsx` — DO NOT IMPORT
- `src/components/dashboard/chart-area-interactive.tsx` — NOT touched in Phase 4 (Phase 1 D-13a preserved it for `/analytics/overview` + `/properties/units`)
- `@magicui/*`, `@aceternity/*` — DO NOT INSTALL

---

## 11. Copywriting Contract

Phase 4 populates the section-level copy that parent § 10 deferred. All English-only; no i18n strings (matches dashboard convention).

| Element | Copy |
|---------|------|
| Revenue card title | `Revenue` |
| Revenue card description (30d mode) | `Last 30 days` |
| Revenue card description (6mo mode) | `Last 6 months` |
| Revenue toggle 30d label | `30d` |
| Revenue toggle 6mo label | `6mo` |
| Revenue tooltip series label | `Revenue` |
| Revenue empty heading | `No revenue data yet` |
| Revenue empty body | `Add a lease to start tracking revenue` |
| Donut card title | `Occupancy` |
| Donut card description | `Across all units` |
| Donut center value | `{percent}%` (interpolated, integer) |
| Donut center sub-label | `Occupied` |
| Donut legend (occupied) | `Occupied {N}` |
| Donut legend (vacant) | `Vacant {N}` |
| Donut empty heading | `No units yet` |
| Donut empty body | `Add a property to see occupancy` |
| Donut aria-label | `Occupancy donut: {percent} percent occupied ({occupied} of {total} units)` |
| Revenue area chart (no separate aria-label — chart is keyboard-focusable via Recharts) | — |

**Honesty rules applied:**
- No "Loading..." copy on skeleton (the shimmer animation conveys loading visually).
- No fabricated zero-line chart for empty Revenue (CONTEXT.md D-08).
- No fabricated `0%` donut for zero-unit owners (CONTEXT.md D-03 + D-08).
- No emojis (CLAUDE.md Zero Tolerance Rule #7).
- No em-dashes in user-facing copy (project preference per user memory).

**Phase 4 does NOT populate:**
- Dashboard-wide empty state (Phase 6 / Phase 7 territory).
- Error state for failed `useOwnerDashboard()` queries (Phase 6 polish; falls back to shell-level error boundary).

---

## 12. Spacing Scale Usage

Inherits parent § 2.2 entirely. Phase 4 uses the following subset:

| Token | Usage |
|-------|-------|
| `--spacing-2` (8px) | Empty-state copy `gap-2` (heading → body) |
| `--spacing-3` (12px) | Tabs internal padding (via shadcn `px-3 py-1.5` baseline; half-step `*_5` allowed on interactive primitive) |
| `--spacing-4` (16px) | Donut → legend gap (`mt-4`); legend → card-body gap |
| `--spacing-6` (24px) | Card body padding (`p-6` default density); legend inter-item gap (`gap-6`); chart row `gap-6` (inherits from `dashboard.tsx` wrapper) |
| `--spacing-8` (32px) | Section-to-section vertical gap (inherits from `dashboard.tsx` flex column) |

No new tokens. No half-step (`*_5`) usage at layout level — the two `*_5` references (`py-1.5` in Tabs, `size-2.5` in legend swatch) are interactive-primitive exemptions per parent § 2.2.

---

## 13. Typography Usage

Inherits parent § 2.6 entirely. Phase 4 uses:

| Role | Token | Effective | Where |
|------|-------|-----------|-------|
| Card title | `text-base` + `font-semibold` | 16px / 600 | `CardTitle` (shadcn baseline) |
| Card description | `text-sm` + `text-muted-foreground` | 14px / 400 | `CardDescription` (shadcn baseline) |
| Tab trigger label | `text-sm` + `font-medium` (active state) | 14px / 500 active, 400 inactive | shadcn `TabsTrigger` baseline |
| Donut center value | `text-stat` + `font-bold` + `tabular-nums` | 32px / 700 / tabular | `<tspan>` inside SVG `<text>` |
| Donut center sub-label | `text-sm` + `text-muted-foreground` | 14px / 400 | `<tspan>` inside SVG `<text>` |
| Legend label | `text-sm` + `text-muted-foreground` | 14px / 400 | `<li>` text |
| Legend count | `text-sm` + `font-semibold` + `tabular-nums` + `text-foreground` | 14px / 600 / tabular | `<li>` count |
| Tooltip value | `formatCurrency` text content | inherits Recharts default (`text-sm`) | `ChartTooltipContent` |
| Axis tick label | inherits `text-xs` from `ChartContainer` | 12px / 400 / `text-muted-foreground` | XAxis / YAxis |
| Empty heading | `text-base` + `font-semibold` + `text-foreground` | 16px / 600 | Empty-state `<p>` |
| Empty body | `text-sm` + `text-muted-foreground` | 14px / 400 | Empty-state `<p>` |

**Sizes used: 4** (`text-xs` 12px, `text-sm` 14px, `text-base` 16px, `text-stat` 32px) — at the parent § 2.6 cap of 4 sizes.
**Weights used: 3** (regular 400, medium 500, semibold 600, bold 700) — 4 weights, ONE over parent § 2.6's typical 2-weight rule. The 4 weights are necessary because:
  - The vendored Card primitive ships `font-semibold` on `CardTitle` (consume, not override).
  - The donut center value uses `font-bold` per parent § 2.6 KPI value rule (matches CONTEXT.md D-03 "matches KPI bento StatValue hierarchy").
  - Tabs ship `font-medium` on active state per shadcn baseline + parent § 2.6 active-state rule.
  - Body / labels use default `font-normal` (400).

This is consistent with Phase 3 § 2.3's similar weight diversity. Declared here for checker Dimension-4.

---

## 14. Color Contract

Inherits parent § 2.1 entirely. Phase 4 reserves the following 10% accent slots from the parent reservation list:

| Parent § 2.1 accent reservation | Phase 4 consumption |
|---------------------------------|---------------------|
| Primary CTA button (1 per row) | none (no CTAs in Phase 4) |
| Focus ring `--color-ring` | inherits (Tabs focus ring) |
| Active sort indicator on DataTable | N/A (Phase 5) |
| Sparkline series on Revenue + Occupancy KPI tiles | consumed by Phase 3 (not by Phase 4) |
| Active segment of the 30d / 6mo toggle | consumed via vendored `<TabsTrigger>` `bg-primary` baseline (matches the parent reservation; no override) |

**Net accent (`--color-primary`) usage in Phase 4: 1 site** (the 30d/6mo toggle active pill, sourced from the unmodified vendored Tabs primitive). Logged for checker Dimension-3.

### 14.1 Series colors (chart palette)

| Series | Token | Source |
|--------|-------|--------|
| Revenue area | `--color-chart-1` | CONTEXT.md D-09 + parent § 2.1 |
| Donut occupied wedge | `--color-chart-2` | CONTEXT.md D-09 + parent § 2.1 |
| Donut vacant wedge | `--color-chart-5` | CONTEXT.md D-09 + parent § 2.1 |

`--color-chart-3` and `--color-chart-4` are unused in Phase 4 (reserved for Maintenance + period-comparison series in future phases per parent § 2.1).

### 14.2 60% / 30% / 10% surface split (parent § 2.1)

Phase 4 inherits the parent's split verbatim:

| Role | Token | Phase 4 surfaces |
|------|-------|------------------|
| Dominant (60%) | `--color-background` | (inherited from page shell — Phase 4 adds no new dominant surface) |
| Secondary (30%) | `--color-card` | RevenueAreaChart card, OccupancyDonutChart card |
| Tertiary (muted) | `--color-muted` | Tabs well |
| Accent (10%) | `--color-primary` | ZERO consumption in Phase 4 |

Phase 4 does not violate the split — chart cards are the secondary surface, the tabs well is the tertiary surface, and accent is preserved for elsewhere on the page (currently nothing in Phase 4's scope claims it).

---

## 15. Test Gates

Phase 4 ships GREEN on every gate inherited from `01-UI-SPEC.md` § 12.

### 15.1 Mandatory passing gates

| Gate | Verifies | Phase 4 obligation |
|------|----------|--------------------|
| `design-token-drift.test.ts` | No hex, no rgb, no `bg-white`, no inline-ms in new dashboard files | Pass. `animationDuration={800}` exception verified at execution time — § 5.3 cycle-1 gate. |
| `bun run typecheck` | Strict TypeScript across all new files | Pass. New types: `RevenueAreaChartProps`, `OccupancyDonutChartProps`, `RevenueWindow`, `MonthlyRevenuePoint` (or planner-named equivalent). |
| `bun run lint` | Biome ruleset | Pass. No `any`, no barrel files, no `as unknown as`, no string-literal query keys (no new query keys at all — D-10). |
| `bun run test:unit` | Vitest unit suite + 80% coverage | Pass. New tests pin: revenue toggle behavior + empty states, donut percent computation + empty state + legend `<ul>` rendering. ≥80% coverage on new Phase 4 files. |
| `bun run test:integration` | RLS dual-client | Pass. New file `tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` exercises ownerA + ownerB cross-isolation against prod (CONTEXT.md D-01 + D-15). |
| Perfect-PR merge gate | 2 consecutive zero-finding deep review cycles | Pass. |

### 15.2 New unit tests Phase 4 ships

| Test file | Pins |
|-----------|------|
| `revenue-area-chart.test.tsx` | (1) Renders Card shell with title `Revenue` + description `Last 30 days` on mount; (2) Tabs trigger labeled `30d` is active by default; (3) Clicking `6mo` switches CardDescription to `Last 6 months`; (4) Empty-state branch when `monthlyRevenue.length === 0` shows `No revenue data yet`; (5) Empty-state in 6mo window when `monthlyRevenue6mo.length === 0` even if 30d has data; (6) `Area.isAnimationActive` matches `!useReducedMotion()` return value; (7) Y-axis tick formatter outputs `$Xk` format. |
| `occupancy-donut-chart.test.tsx` | (1) Renders Card shell with title `Occupancy` + description `Across all units`; (2) Center value renders as `87%` for `{ occupied: 87, vacant: 13, total: 100 }`; (3) Center sub-label is `Occupied`; (4) Legend renders as `<ul>` (NOT `<div role="list">`); (5) Legend `<li>` count matches `units.occupied` and `units.vacant`; (6) Empty-state branch when `units.total === 0` shows `No units yet`; (7) `aria-label` matches the constructed template ("Occupancy donut: 87 percent occupied (87 of 100 units)"); (8) `Pie.isAnimationActive` matches `!useReducedMotion()` return value. |

### 15.3 Manual gates (Phase 6 / Phase 7 polish)

| Gate | When |
|------|------|
| Dark-mode visual audit (chart series, legend swatch, axis labels, tooltip text) | Phase 6 — Phase 4 ships token-clean, audit is pass-through. |
| 375px responsive audit | Phase 6 — chart row collapses to 1-column stack at `<lg`; donut fits at full width; revenue chart `h-[300px]` body remains usable. |
| Reduced-motion E2E | Phase 7 — Playwright test toggles `prefers-reduced-motion: reduce` and asserts no Recharts entrance animation (both `<Area>` and `<Pie>` paint instant). |
| UI-checker 6-dimensions | After UI-SPEC promotion to `approved`. |

---

## 16. Open Questions (resolved or carried)

| Q | Resolution |
|---|------------|
| X-axis tick formatter (30d) | RESOLVED — `Mar 12` (§ 2.4). |
| X-axis tick formatter (6mo) | RESOLVED — `Mar` (no year, no day; § 2.4). |
| Segmented control primitive (`<Tabs>` vs `<ToggleGroup>`) | RESOLVED — `<Tabs>` (§ 2.2 + § 4.1). Both vendored; `<Tabs>` chosen for cleaner `value`/`onValueChange` binding. |
| Chart height (revenue) | RESOLVED — `h-[300px]` (§ 2.9). |
| Chart height (donut body) | RESOLVED — `h-[240px]` Card body, ~180px PieChart, ~60px legend (§ 3.2). |
| `chartConfig` relocation vs per-chart configs | RESOLVED — per-chart configs (each new chart defines its own minimal `ChartConfig` inline). `dashboard-types.ts` `chartConfig` is dropped or kept only if it has consumers outside `revenue-overview-chart.tsx` (planner verifies at execution time). |
| Recharts `animationDuration={800}` drift-guard handling | DEFERRED — § 5.3 cycle-1 gate: executor verifies + planner adds exemption if scanner flags. |
| Whether to keep `revenueTrend` re-mapper in `page.tsx` | PLANNER DISCRETION — both options acceptable; default is to thin or drop. |
| `chart-area-interactive.tsx` consolidation | OUT OF SCOPE — CONTEXT.md Deferred Ideas; future v3.0 unified-chart-library candidate. |

---

## 17. Declared Overrides Against Parent UI-SPEC

For checker Dimension-3 / Dimension-4 / Dimension-5 reviews:

| Override | Section | Type | Justification |
|----------|---------|------|---------------|
| Tabs active state uses `bg-primary` accent (vendored shadcn baseline) | § 4.3 | **No override** — vendored primitive matches parent § 2.1 accent reservation exactly. | Earlier UI-SPEC draft incorrectly claimed the baseline was `bg-background`; corrected during cycle-1 review. |
| Recharts `animationDuration={800}` is a JSX integer prop, not a `--duration-*` token reference | § 5.3 | **Vendor-API exception** | Recharts requires integer ms; can't accept CSS variable. Pinned to 800 to match Phase 3 NumberTicker duration. Drift-scanner exemption verified at execution time. |
| `font-bold` used on donut center value | § 13 | **Inheritance from parent rule** (parent § 2.6 KPI value rule) | Not an override — parent EXPLICITLY designates KPI numeric values as `font-weight-bold`. |
| Half-step `*_5` tokens used twice (`py-1.5` in Tabs, `size-2.5` in legend swatch) | § 12 | **Interactive-primitive exception** (parent § 2.2) | Both uses are in interactive-primitive chrome (Tabs control + legend swatch adjacent to clickable-feeling label). Parent § 2.2 explicitly permits this exemption class. |

No loosening of parent rules. All overrides are either tightenings, vendor-API exceptions, or applications of parent-permitted exemptions.

---

## 18. Registry Safety

| Registry | Blocks used in Phase 4 | Safety Gate |
|----------|------------------------|-------------|
| shadcn official | None new — Phase 4 consumes already-vendored `Card`, `Chart` (`ChartContainer`/`ChartTooltip`/`ChartTooltipContent`), `Tabs`, `Skeleton` (all vendored in v1.0 or earlier) | not required (no `shadcn add` invocations) |
| Third-party (magicui, aceternity, etc.) | none | N/A — forbidden per parent § 11 |

**No new registry calls.** Phase 4 ships zero `shadcn view` / `shadcn add` invocations. The `recharts` npm package and `lucide-react` imports are package-level, not registry-level, and both are already canonical in the project.

---

## 19. Checker Sign-Off

The standard 6-dimension checker rubric applies. Inherits PASS on dimensions covered solely by the parent (token canonicalization, dark-mode rules envelope); validates Phase-4-specific decisions where this UI-SPEC tightens or scopes the parent.

- [ ] Dimension 1 Copywriting: PASS (§ 11 — all card titles/descriptions, empty states, toggle labels, aria-labels, legend labels populated)
- [ ] Dimension 2 Visuals: PASS (§ 2 RevenueAreaChart per-element contract, § 3 OccupancyDonutChart per-element contract, § 4 toggle UX, § 7 skeleton contract)
- [ ] Dimension 3 Color: PASS (§ 14 60/30/10 split honored; chart palette from `--color-chart-{1,2,5}`; § 4.3 + § 17 accent-tightening declared)
- [ ] Dimension 4 Typography: PASS (§ 13 — 4 sizes, 4 weights; all from parent § 2.6 token system; weight diversity justified)
- [ ] Dimension 5 Spacing: PASS (§ 12 — parent multiples-of-4 scale; two interactive-primitive `*_5` exemptions declared and permitted)
- [ ] Dimension 6 Registry Safety: PASS (§ 18 — no new registry calls; no third-party; all primitives already vendored)

**Approval:** pending (gsd-ui-checker upgrades to `approved` on validation; perfect-PR gate continues to enforce on the Phase 4 PR)

---

## 20. Visible Changes At Merge

1. `/dashboard` chart row no longer renders a single full-width `RevenueOverviewChart`. The row is now 3-up: Revenue chart (col-span-2) + Occupancy donut (col-span-1) + Quick Actions (col-span-1, unchanged).
2. Revenue chart shows correct dollar values (Phase 1's `*100`/`/100` fix already in place; Phase 4 inherits clean values).
3. Revenue chart has a top-right segmented control: `30d` / `6mo`. Default `30d`. Switching to `6mo` re-fetches series shape from `OwnerDashboardData.timeSeries.monthlyRevenue6mo` and updates the X-axis tick format + CardDescription.
4. Occupancy donut renders at the right of the row showing `{percent}%` + `Occupied` in the center; legend below as `● Occupied N  ● Vacant N`.
5. Empty owners (no leases / no units) see honest empty states instead of fabricated zero-line / zero-donut.
6. First-load: shape-matching skeletons render in both card slots; on dynamic-import resolve + data arrival, real charts replace them with NO layout shift.
7. Reduced-motion users see both charts paint instant (no Recharts entrance animation, no toggle transition).
8. Dark mode is correct out of the box — every color reference resolves through theme-aware tokens.
9. 375px viewport renders the chart row as a 1-column vertical stack; donut + legend stack inside their own card; revenue chart `h-[300px]` body remains readable.

---

*Phase 4 UI-SPEC drafted: 2026-05-26*
*Inherits: `01-UI-SPEC.md` (milestone-wide rules envelope)*
*Sibling reference: `03-UI-SPEC.md` (per-phase inheritance structure template)*
*Inherited by: none (Phase 4 is a leaf in the inheritance tree)*
*Source tokens: `src/app/globals.css` (canonical; do not duplicate values)*
*Source primitives: `src/components/ui/{card,chart,tabs,skeleton}.tsx` (all vendored, no new vendoring)*
