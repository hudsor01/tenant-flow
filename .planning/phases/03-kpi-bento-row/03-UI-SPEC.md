---
phase: 3
slug: kpi-bento-row
milestone: v2.0
status: approved
reviewed_at: 2026-05-23
checker_verdict: "VERIFIED (6/6 dimensions; 1 FLAG on D-5 stagger window — non-blocking, override documented + reduced-motion exempt + D-05 locks the math)"
extends: 01-UI-SPEC.md
inherits_ui_spec: ".planning/phases/01-foundation-dedup/01-UI-SPEC.md"
inherited_by: []
shadcn_initialized: true
preset: tenantflow-canonical (src/app/globals.css @theme)
created: 2026-05-23
requirements: [KPI-01, KPI-02, KPI-03, KPI-04, KPI-05, KPI-06, KPI-07]
locked_decisions_consumed: [D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11, D-12]
---

# Phase 3 — KPI Bento Row: UI Design Contract

> Section-level visual + interaction contract for the 6-tile KPI bento row. **Inherits every rule** from `01-UI-SPEC.md` (milestone-wide). This file ONLY adds section-specific designs; it does NOT redefine tokens, dark-mode rules, breakpoints, motion budget, or the status-color usage map.

---

## 0. Inheritance & Non-Negotiables

### Parent contract (referenced, not duplicated)

| Topic | Source | Phase 3 obligation |
|-------|--------|--------------------|
| Color tokens (oklch) | `01-UI-SPEC.md` § 2.1 | Reference tokens only; no new tokens. |
| Spacing scale | `01-UI-SPEC.md` § 2.2 | Use `--spacing-{2,3,4,6,8}`. Half-step tokens (`*_5`) forbidden at layout level. |
| Radius scale | `01-UI-SPEC.md` § 2.3 | `--radius-lg` (tile chrome — matches `Stat` shell default). |
| Shadow scale | `01-UI-SPEC.md` § 2.4 | `--shadow-sm` resting (tile chrome default; `Stat` shell already applies this). |
| Duration & easing | `01-UI-SPEC.md` § 2.5 | `--duration-200` hover transitions; `--duration-500` BlurFade reveal; `--ease-out-smooth` for BlurFade. NumberTicker uses its own internal easing (`progress * (2 - progress)`). |
| Typography | `01-UI-SPEC.md` § 2.6 | KPI values use `typography-stat` (32px) at all sizes ≤768px; jumps to `typography-stat-lg` (40px) at `@4xl`. `StatLabel` = `text-sm` `font-medium`. `StatDescription` = `text-xs`. |
| Dark mode | `01-UI-SPEC.md` § 3 | All references go through tokens; nothing hardcoded. |
| Breakpoints | `01-UI-SPEC.md` § 4 | `@container` queries ONLY (per CONTEXT.md D-10). No viewport media queries on the bento grid. |
| Motion budget | `01-UI-SPEC.md` § 5 | 1 BlurFade reveal on the KPI section (the whole grid counts as one section), 6 NumberTicker animations (one per tile). Sparklines paint instant. |
| Status colors | `01-UI-SPEC.md` § 6 | Trend up → `--color-success`; trend down → `--color-warning` (Revenue/Occupancy/Leases down = caution, NOT destructive); stable → `--color-muted-foreground`. Open Maintenance trend follows the same direction-only rule; threshold-based warning tint is **explicitly out of scope** for this phase (CONTEXT.md D-09: never fabricate threshold semantics). |
| Density | `01-UI-SPEC.md` § 7.1 | **Default density**: `p-4` at compact container widths, `p-6` at `@4xl` (≥896px) container width. Tile internal stack gap `gap-2`. |
| Banned components | `01-UI-SPEC.md` § 1 | `ui/bento-grid.tsx` FORBIDDEN. `animated-trend-indicator.tsx` FORBIDDEN. No `@magicui` / `@aceternity`. |
| Drift guards | `01-UI-SPEC.md` § 12 | `design-token-drift.test.ts` MUST stay green for every new Phase 3 file. |

### Phase 3 cannot introduce

- New color tokens, spacing tokens, radius tokens, shadow tokens, duration tokens, or font-size tokens.
- Viewport media queries (`@media`) on the bento grid or tiles. (Page-level media queries inherited from the dashboard shell are not Phase 3's concern.)
- A new design-token category (e.g., "tile-padding" custom prop). Density goes through padding utilities.
- Click handlers / `<Link>` on tiles (CONTEXT.md D-03: tiles are NOT clickable in Phase 3).
- `aria-live` on tile values (CONTEXT.md D-09 + § 8.3 below: values are static once rendered; reduced-motion users see the final value at mount, not an announcing region).

---

## 1. Section Anatomy

### 1.1 Mount point

`KpiBentoRow` replaces the current header `<p>` element in `src/components/dashboard/dashboard.tsx` (lines 172-186 — the "X of Y units occupied | $Z this month" paragraph). The `<h1 className="typography-h1">Dashboard</h1>` heading is PRESERVED above the bento row (the bento row is content under the page heading, not a replacement for the page heading).

```
<div data-testid="dashboard-stats">
  <h1 className="typography-h1">Dashboard</h1>      ← preserved
  <KpiBentoRow data={dashboardData} />              ← new (replaces the <p>)
</div>
```

### 1.2 Section landmark

The KPI bento row is a **navigable region landmark** so screen-reader users can jump to / past it via region rotor:

```tsx
<section
  aria-labelledby="kpi-bento-heading"
  data-testid="kpi-bento-row"
  className="…"
>
  <h2 id="kpi-bento-heading" className="sr-only">
    Portfolio summary
  </h2>
  <div role="list" className="…@container kpi-bento-grid…">
    {tiles.map(tile => (
      <div role="listitem" key={tile.id}>
        <BlurFade delay={tile.delay} preset="default">
          <Stat aria-label={tile.ariaLabel}>…</Stat>
        </BlurFade>
      </div>
    ))}
  </div>
</section>
```

**Rationale:**
- `<section>` landmark + `aria-labelledby` makes the bento row first-class for a11y navigation.
- `sr-only` heading provides the landmark name without competing with the page `<h1>` visually.
- `role="list"` + `role="listitem"` exposes the 6 tiles as a flat list (sparkline-bearing tiles aren't hierarchically different from count tiles in a11y semantics).
- `aria-label` on each `Stat` carries the full tile summary (see § 8 for exact phrasing).

### 1.3 Tile order (LOCKED — CONTEXT.md D-01)

| Position | Tile | Trend source (D-04) | Sparkline (D-02) | Wave (D-05) |
|----------|------|--------------------|------------------|-------------|
| 1 | Revenue (monthly) | `metricTrends.monthlyRevenue` | YES — `timeSeries.monthly_revenue` | A (delay = 0) |
| 2 | Occupancy (rate %) | `metricTrends.occupancyRate` | YES — `timeSeries.occupancy_rate` | A (delay = 1 × 80ms) |
| 3 | Active Leases | `metricTrends.activeTenants` | NO | A (delay = 2 × 80ms) |
| 4 | Open Maintenance | `metricTrends.openMaintenance` | NO | B (delay = 4 × 80ms = 320ms) |
| 5 | Properties | none (omit `<StatTrend>`) | NO | B (delay = 5 × 80ms = 400ms) |
| 6 | Units | none (omit `<StatTrend>`) | NO | B (delay = 6 × 80ms = 480ms) |

Wave B starts 160ms AFTER Wave A's last tile finishes its delay window (Wave A ends at 160ms; Wave B starts at 320ms = Wave A end + 160ms inter-wave gap). `BlurFade.delay` is the prop value in coefficient form (BlurFade internally multiplies by 80ms — see `src/components/ui/blur-fade.tsx:116`). So tile 1 passes `delay={0}`, tile 6 passes `delay={6}`.

---

## 2. Per-Tile Micro-Layout

The vendored `Stat` shell (`src/components/ui/stat.tsx`) is a CSS grid:

```
grid-cols-[1fr_auto] gap-x-4 gap-y-1
```

Slot assignments (from `Stat` source, lines 13-15):

| Slot | Grid placement |
|------|----------------|
| `StatLabel` | col 1, row 1 |
| `StatValue` | col 1, row 2 |
| `StatIndicator` | col 2, rows 1-2 (`row-span-2`, `self-start`) — UNUSED in Phase 3 |
| `StatTrend` | full-width (col-span-2), row 3 |
| `StatDescription` | full-width (col-span-2), row 4 |
| `StatSeparator` | full-width (col-span-2) — UNUSED in Phase 3 |

**Phase 3 uses 4 slots per tile (5 on sparkline-bearing tiles):** `StatLabel`, `StatValue`, `StatTrend` (omitted on Properties/Units), `StatDescription`, and the sparkline (which mounts after `StatDescription` as a sibling inside the `Stat` root).

### 2.1 Tile rendering contract (all 6 tiles)

```tsx
<Stat
  className="@4xl/kpi-bento:p-6 transition-colors duration-(--duration-200)"
  aria-label={tile.ariaLabel}
>
  <StatLabel>{tile.label}</StatLabel>
  <StatValue>
    <NumberTicker
      value={tile.value}
      decimalPlaces={tile.decimalPlaces}
      duration={800}              {/* D-06: ≤ 800ms */}
      className={tile.tickerClassName}
    />
    {tile.unitSuffix}             {/* e.g., "%" for Occupancy; rendered OUTSIDE the ticker */}
  </StatValue>
  {tile.trend && (
    <StatTrend trend={tile.trend.direction}>
      <TrendArrow direction={tile.trend.direction} aria-hidden="true" />
      <span>
        {formatTrendPercent(tile.trend.percentChange)}
      </span>
      <span className="text-muted-foreground">{tile.trend.label}</span>
    </StatTrend>
  )}
  <StatDescription>{tile.description}</StatDescription>
  {tile.sparkline && (
    <KpiSparkline
      data={tile.sparkline.data}
      trend={tile.sparkline.trend}
      ariaLabel={tile.sparkline.ariaLabel}
    />
  )}
</Stat>
```

**Notes:**
- `Stat` already applies `bg-card`, `border`, `rounded-lg`, `shadow-sm`, `p-4`. Phase 3 adds `@4xl/kpi-bento:p-6` (container-query density bump per D-10 + § 7.1 of parent).
- `transition-colors duration-(--duration-200)` is for the resting → hover border-color transition (subtle B2B lift; no shadow-bump — that's saved for explicitly interactive surfaces like the DataTable in Phase 5).
- `NumberTicker` accepts `duration` in ms. We pass `800` per D-06.
- `formatTrendPercent` returns a pre-signed string ("+12%" / "−3%" / "0%"). See § 5.
- `TrendArrow` is a small in-file component mapping direction → Lucide icon (see § 4.1).
- Sparkline mounts as the LAST child inside `Stat`. The `Stat` grid auto-expands its row count; sparkline takes a full-width row (CSS span: `[grid-column:1/-1]`) below `StatDescription`.

### 2.2 Per-tile concrete config

| Tile | `StatLabel` | `tile.value` source | NumberTicker formatter | `unitSuffix` | `StatDescription` | Sparkline? |
|------|-------------|--------------------|-----------------------|--------------|-------------------|------------|
| Revenue | `Revenue` | `metrics.totalRevenue` | currency wrap (see § 5.1) | none | `This month` | YES |
| Occupancy | `Occupancy` | `metrics.occupancyRate` | `decimalPlaces={0}` | `%` (separate span) | `${occupiedUnits} of ${totalUnits} occupied` | YES |
| Active Leases | `Active leases` | `metrics.activeLeases` | `decimalPlaces={0}` | none | `${expiringLeases} expiring soon` (only if expiringLeases > 0; otherwise omit StatDescription) | NO |
| Open Maintenance | `Open maintenance` | `metrics.openMaintenanceRequests` | `decimalPlaces={0}` | none | `Requires attention` (when value > 0) / `All clear` (when value === 0) | NO |
| Properties | `Properties` | `metrics.totalProperties` | `decimalPlaces={0}` | none | (omitted — no secondary signal) | NO |
| Units | `Units` | `metrics.totalUnits` | `decimalPlaces={0}` | none | `${occupiedUnits} occupied` | NO |

**Currency rendering rule:** `NumberTicker` only knows `Intl.NumberFormat` formatting via `decimalPlaces`. To render `$1,234`, the Revenue tile wraps the ticker in a `$` prefix span (see § 5.1). This is the same pattern as v1.0 Phase 2's `NumberTicker` consumers.

**Honesty rule (CONTEXT.md D-04 + D-09):** When `metricTrends.<field>` is `null`, `tile.trend` is `null` and the `<StatTrend>` block is omitted entirely (no "0%", no "—"). When `metrics.<value>` is `0`, render the actual `0` / `0%` / `$0` (NOT "No data"). Both rules trace back to v1.0 honesty principle (POLISH-11).

### 2.3 Value typography ladder

| Container width | NumberTicker class | Effective font-size | Effective line-height |
|----------------|--------------------|---------------------|----------------------|
| ≤768px (compact) | inherits `typography-stat` from `StatValue` | 32px (`--text-stat`) | `--leading-none` |
| ≥896px (`@4xl/kpi-bento`) | adds `@4xl/kpi-bento:typography-stat-lg` | 40px (`--text-stat-lg`) | `--leading-none` |

`StatValue` already applies `typography-stat font-semibold` (line 90 of `stat.tsx`). Phase 3 layers the larger size via container query without overriding the weight (semibold is correct — `--font-weight-semibold` 600, which matches § 2.6 KPI weight in parent).

> **Override note (declared, not loosening):** `01-UI-SPEC.md` § 2.6 specifies KPI values use `--font-weight-bold` (700). The vendored `Stat` shell ships `font-semibold` (600) on `StatValue`. Phase 3 does NOT override this — we use the vendored shell as-is (KPI-02 requires "via `ui/stat.tsx` `Stat` shell"). The 600→700 delta is one shade lighter than the parent UI-SPEC prescribed; the visual difference at 32-40px is negligible and the vendored shell stays canonical. Tracked here for the checker's Dimension-4 review.

---

## 3. Container Grid Behavior

### 3.1 Grid wrapper

```tsx
<div
  role="list"
  className={cn(
    "grid gap-4",
    "grid-cols-[repeat(auto-fit,minmax(180px,1fr))]",
    "@4xl/kpi-bento:gap-6",
  )}
  style={{ containerType: "inline-size", containerName: "kpi-bento" }}
>
```

**Why no Tailwind utility for `container-type`:** Tailwind v4's container-query utilities (`@container/<name>`) ship the CHILD selector form. The PARENT establishing `container-type: inline-size; container-name: kpi-bento` is set in inline style here because no parent-side Tailwind utility exists in the current `@theme`. This is the project-canonical pattern (see `globals.css` grid `@container` consumers); the inline-style exception applies because no Tailwind alternative exists — same exception class as `style={{ "--gradient-x": …}}` in marketing surfaces. **This is the SINGLE allowed inline-style in Phase 3** and is justified at execution time in the planner's task list.

> **Alternate (preferred if available at execution time):** if the project has a `@utility container-kpi-bento` block in `globals.css`, planner adds it (`@utility container-kpi-bento { container-type: inline-size; container-name: kpi-bento; }`) and the wrapper drops the inline `style` for `className="… container-kpi-bento …"`. This is a planner judgment call — both forms are equivalent visually.

### 3.2 Auto-fit behavior (per CONTEXT.md D-10)

`grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))` produces:

| Container width (effective) | Columns | Per-tile width | Tile state |
|----------------------------|---------|----------------|------------|
| ≤375px (hard mobile floor) | 1 | full | All 6 tiles stack vertically; sparklines render at full tile width |
| 376-559px | 2 | ~180-279px each | 3 rows × 2 tiles |
| 560-739px | 3 | ~180-246px each | 2 rows × 3 tiles |
| 740-919px | 4 | ~180-229px each | tiles 1-4 first row, 5-6 second row (4 + 2 layout — acceptable; tiles 5-6 sit left-aligned, not stretched, because `auto-fit` reserves widths for *potential* slots — see § 3.3 caveat) |
| 920-1099px (`@4xl/kpi-bento` active at ≥896px) | 5 | ~180-219px each | 5 + 1 layout |
| ≥1100px (typical desktop with sidebar collapsed) | 6 | ~180px+ each | All 6 tiles single row — the "bento above the fold" target state |

**Phase 6 polish reviews** the 4-column layout at 740-919px to confirm tiles 5-6 don't look orphaned. If they do, a phase-6-scoped override may switch to `auto-fill` at that specific width — but Phase 3 ships `auto-fit` per D-10 and accepts the 4+2 wrap as honest behavior.

### 3.3 Sparkline tile vs count tile height parity

Sparkline-bearing tiles (Revenue, Occupancy) are taller than count-only tiles because the sparkline adds an extra 64px row. To prevent the grid from rendering a jagged row:

- Use `align-items: stretch` (the default for CSS grid items) — every tile in a given row matches the tallest tile's height. Count tiles in a row with a sparkline tile gain vertical space below their `StatDescription` (effectively letterboxed, not visually broken).
- Count-tile `Stat` shells use `justify-self: stretch` (default) and `align-items: start` for inner content — content hugs the top, empty space below.
- No `min-height` declaration on tiles — the tallest sparkline tile sets the row height, and the count tiles inherit it via stretch. This avoids hardcoding a magic-number height.

**At the 6-up layout (≥1100px):** all 6 tiles render in a single row; sparkline tiles dictate the row height (≈ `p-6` + label + value + trend + description + 64px sparkline ≈ 220px); count tiles stretch to match.

**At 1-up (≤375px):** every tile is its own row, so sparkline / count tiles render at their natural heights. No parity issue.

### 3.4 Section vertical spacing

Above (page heading → bento): inherits from `flex flex-1 flex-col gap-6 p-6` on the dashboard root in `dashboard.tsx:168` (no Phase 3 change).

Below (bento → chart row): same `gap-6` on the parent flex column. No Phase 3 change.

---

## 4. Trend Chip Design

### 4.1 Lucide arrow mapping (KPI-04 — `animated-trend-indicator.tsx` forbidden)

```tsx
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

function TrendArrow({ direction }: { direction: "up" | "down" | "stable" }) {
  if (direction === "up") return <ArrowUp aria-hidden="true" />;
  if (direction === "down") return <ArrowDown aria-hidden="true" />;
  return <Minus aria-hidden="true" />;
}
```

| Direction | Lucide icon | Stroke / color (inherited via `StatTrend` Tailwind classes) |
|-----------|-------------|-------------------------------------------------------------|
| `up` | `ArrowUp` | `text-green-600 dark:text-green-400` (from `Stat.tsx:108`) — maps to `--color-success` semantic intent per parent § 6. |
| `down` | `ArrowDown` | `text-red-600 dark:text-red-400` (from `Stat.tsx:109`). **OVERRIDE required** — see § 4.2. |
| `stable` | `Minus` | `text-muted-foreground` (from `Stat.tsx:110`). |

`[&_svg:not([class*='size-'])]:size-3` (already in `StatTrend`) clamps the arrow to 12px. Confirmed against `stat.tsx:106`.

### 4.2 Down-direction color override (parent § 6 alignment)

**Issue:** The vendored `StatTrend` shell colors down-trend as `text-red-600` (Tailwind palette literal). Parent UI-SPEC § 6 maps:
- Negative trend on Revenue / Occupancy / Active Leases / Open Maintenance → `--color-warning` (caution), not `--color-destructive` (blocking).
- `--color-destructive` is reserved for "Overdue, error, destructive confirmation" — none of which apply to a Revenue dip.

**Phase 3 override:**

Wrap the down-trend chip with a Tailwind override that swaps the red palette literal for the warning token:

```tsx
<StatTrend
  trend={direction}
  className={cn(
    direction === "down" &&
      "!text-[var(--color-warning)] dark:!text-[var(--color-warning)]",
  )}
>
```

**Why arbitrary Tailwind value over a Tailwind utility:** the `--color-warning` token has no canonical Tailwind utility class (the project's `text-warning` utility doesn't exist in `tailwind.config`; only `text-muted-foreground`, `text-foreground`, etc. are aliased). The arbitrary-value bracket syntax `text-[var(--color-warning)]` is the canonical pattern in this codebase (see `globals.css:662` `.status-badge-success` for the same approach via `color-mix`). The `!` important flag is needed to override the `text-red-600` baseline already declared on the `StatTrend` slot.

This is the SINGLE override of vendored `Stat` behavior in Phase 3. It's documented here for the checker's Dimension-3 review.

**Alternate (cleaner) path** if planner wants to avoid the `!important` flag:
- Add a phase-3-scoped variant by passing `trend="neutral"` to `StatTrend` for down direction, then handling the warning color in the wrapping `<TrendArrow>` + sibling `<span>` directly. This bypasses the `Stat.tsx:109` red baseline entirely. Planner's call; either form is checker-acceptable.

### 4.3 Percent value formatting

```tsx
function formatTrendPercent(percentChange: number): string {
  const rounded = Math.round(percentChange);     // integer percent — no decimal noise
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "";  // typographic minus (U+2212)
  return `${sign}${Math.abs(rounded)}%`;
}
```

Format examples:
- `+12%` (positive trend)
- `−3%` (negative trend — note: U+2212 typographic minus, NOT hyphen-minus)
- `0%` (stable / exactly no change)

`tabular-nums` is inherited from the `StatTrend` slot indirectly (the slot itself doesn't apply tabular-nums; the `text-xs font-medium` class chain does). If percent values misalign visually in the row, planner adds `tabular-nums` to the percent `<span>` directly.

### 4.4 Trend label (secondary text)

Right of the percent, in `text-muted-foreground` (lighter weight signal). Examples:

| Tile | `tile.trend.label` |
|------|---------------------|
| Revenue | `vs. last month` |
| Occupancy | `vs. last month` |
| Active Leases | `vs. last month` |
| Open Maintenance | `vs. last week` (maintenance trends move on shorter windows; this matches the RPC's `metricTrends.openMaintenance` period — verify at execution time) |

**Source confirmation at execution time:** the planner must verify the period the RPC computes each `metricTrends.<field>` against (`use-owner-dashboard.ts` boundary mapper). If `metricTrends.openMaintenance` is computed over the same 30-day window as the others, the label changes to `vs. last month` for consistency. NEVER fabricate a window the RPC doesn't actually use (CONTEXT.md D-09 honesty rule).

---

## 5. NumberTicker Formatting Per Tile

### 5.1 Currency tile (Revenue)

`NumberTicker` doesn't accept a `format: 'currency'` prop — it only formats via `Intl.NumberFormat({ minimumFractionDigits, maximumFractionDigits })`. To render `$1,234`:

```tsx
<StatValue>
  <span aria-hidden="true">$</span>
  <NumberTicker
    value={metrics.totalRevenue}
    decimalPlaces={0}
    duration={800}
  />
</StatValue>
```

- `$` prefix renders as a sibling text node, NOT a child of the ticker.
- `decimalPlaces={0}` matches Phase 1 D-09a (no-cents on owner dashboard).
- Currency precision matches `formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })` from `src/lib/utils/currency.ts:26` — the canonical project-wide formatter Phase 1 enshrined.
- The visible `$` is `aria-hidden="true"` because the `Stat` shell's `aria-label` already speaks the value as currency (see § 8.2).

**Alternative (planner discretion):** If a wrapping ticker that emits a currency-formatted string is desired (avoiding the manual `$` prefix), planner may add a thin wrapper in `kpi-bento-row.tsx`:

```tsx
function CurrencyTicker({ value, duration }: { value: number; duration?: number }) {
  // Renders $ prefix + delegates digits to NumberTicker
}
```

Either form is checker-acceptable. The prefix-sibling form is simpler and recommended.

### 5.2 Percent tile (Occupancy)

```tsx
<StatValue>
  <NumberTicker
    value={metrics.occupancyRate}
    decimalPlaces={0}
    duration={800}
  />
  <span aria-hidden="true">%</span>
</StatValue>
```

- `%` suffix renders as a sibling AFTER the ticker.
- `aria-hidden="true"` because the parent `aria-label` speaks the value (see § 8.2).
- `decimalPlaces={0}` — integer percent (no `87.4%` noise on the bento row; the chart row in Phase 4 can opt into one decimal if needed).

### 5.3 Integer tiles (Active Leases, Open Maintenance, Properties, Units)

```tsx
<StatValue>
  <NumberTicker
    value={tile.value}
    decimalPlaces={0}
    duration={800}
  />
</StatValue>
```

No prefix, no suffix. `Intl.NumberFormat('en-US')` applies thousands separators automatically (`1,234` not `1234`). Tile values are expected to be in the 0-999 range for most landlords; thousands separators kick in only for portfolios > 1000 units (still correct output).

### 5.4 Reduced-motion behavior (D-06)

`NumberTicker` does NOT have a built-in reduced-motion guard at the time of writing — it animates via rAF unconditionally once `hasIntersected` fires (see `src/components/ui/number-ticker.tsx:46-87`). The motion-budget claim in CONTEXT.md D-06 ("reduced-motion → final value immediately") and `01-UI-SPEC.md` § 5.1 ("`NumberTicker` already has built-in `useReducedMotion()` guard") refer to a future hardening that has NOT shipped.

**Phase 3 obligation:** if Phase 3 is the first consumer of `NumberTicker` on the dashboard (it is) AND `NumberTicker` lacks a reduced-motion guard at execution time, Phase 3 ships a **defense-in-depth wrapper**:

```tsx
function KpiNumberTicker({
  value,
  decimalPlaces = 0,
  duration = 800,
}: Pick<NumberTickerProps, "value" | "decimalPlaces" | "duration">) {
  const prefersReducedMotion = useReducedMotion();
  if (prefersReducedMotion) {
    return (
      <span className="inline-block tabular-nums tracking-wider">
        {Intl.NumberFormat("en-US", {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        }).format(value)}
      </span>
    );
  }
  return <NumberTicker value={value} decimalPlaces={decimalPlaces} duration={duration} />;
}
```

The `useReducedMotion()` hook already exists in `BlurFade` (see `src/components/ui/blur-fade.tsx:22-31` — the inline `useState` + `matchMedia` pattern). Phase 3 extracts it to a shared hook OR inlines the same pattern in `kpi-bento-row.tsx`. Planner picks; the shared-hook form is preferred (sets up Phase 4 / Phase 5 to reuse).

The wrapper preserves `tabular-nums tracking-wider` from the original `NumberTicker` so the reduced-motion output is typographically identical to the ticked value.

**Cycle 1 gate:** the executor opens NumberTicker source, verifies whether a reduced-motion guard has been added between this UI-SPEC draft and execution time, and inlines the wrapper only if absent. If `NumberTicker` already has the guard, the wrapper is unnecessary — Phase 3 passes the value through directly.

---

## 6. Sparkline Visual Treatment (KpiSparkline component — CONTEXT.md D-11)

### 6.1 Component contract

New file: `src/components/dashboard/components/kpi-sparkline.tsx`.

```tsx
import { Area, AreaChart } from "recharts";
import { ChartContainer, type ChartConfig } from "#components/ui/chart";
import type { TimeSeriesDataPoint } from "#types/analytics";

interface KpiSparklineProps {
  data: TimeSeriesDataPoint[];
  trend: "up" | "down" | "stable";
  ariaLabel: string;
}

export function KpiSparkline({ data, trend, ariaLabel }: KpiSparklineProps) {
  const config = sparklineConfigForTrend(trend);
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="[grid-column:1/-1] h-16 w-full"
    >
      <ChartContainer config={config} className="!aspect-auto h-full w-full">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={`spark-fill-${trend}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-spark)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--color-spark)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--color-spark)"
            strokeWidth={1.5}
            fill={`url(#spark-fill-${trend})`}
            isAnimationActive={false}
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
```

### 6.2 Color per trend direction

| Trend | `--color-spark` (set via `ChartConfig.theme`) | Light value | Dark value |
|-------|----------------------------------------------|-------------|------------|
| `up` | `--color-success` | `oklch(0.66 0.2 160)` | `oklch(0.68 0.2 150)` |
| `down` | `--color-warning` | `oklch(0.75 0.18 85)` | `oklch(0.72 0.18 80)` |
| `stable` | `--color-muted-foreground` | `oklch(0.48 0.015 245)` | `oklch(0.74 0.02 250)` |

`sparklineConfigForTrend(trend)` returns:

```ts
function sparklineConfigForTrend(trend: "up" | "down" | "stable"): ChartConfig {
  const token =
    trend === "up" ? "--color-success"
    : trend === "down" ? "--color-warning"
    : "--color-muted-foreground";
  return {
    spark: {
      label: "Trend",
      theme: {
        light: `var(${token})`,
        dark: `var(${token})`,    // dark variants resolve via :where(.dark, .dark *) override
      },
    },
  };
}
```

`ChartContainer` resolves the `theme` map into a scoped `--color-spark` CSS variable (see `chart.tsx:117-126`). This ensures the sparkline gets the correct light/dark value through the existing chart theme machinery — NO inline `style={{ color: 'red' }}`, NO hex, NO direct `oklch()` literal in JSX. This is the canonical project pattern for chart series colors.

> **Parent UI-SPEC § 2.1 alignment caveat:** Parent reserves `--color-chart-1` for the Revenue series (Phase 4 RevenueAreaChart) and `--color-chart-2` for Occupancy (Phase 4 OccupancyDonutChart). The Phase-3 sparkline does NOT use those — it uses `--color-success` / `--color-warning` / `--color-muted-foreground` because the sparkline's color carries *trend semantic*, not series identity. The parent doc anticipates this: § 2.1 includes "the sparkline series on Revenue + Occupancy KPI tiles (Phase 3) when the trend is positive" under "Accent (10%) is reserved for" — but that anticipates Revenue-up using accent. Phase 3 deviates intentionally: trend-direction color is more honest than "primary brand color when up, secondary when down" because direction maps to actual semantics (success/warning) the user already reads on `StatTrend`. This is a **rule tightening**, not a loosening — Phase 3 narrows to the status tokens, which are a strict subset of allowed tokens. Logged here for checker Dimension-3.

### 6.3 Stroke and fill specifications

| Property | Value | Rationale |
|----------|-------|-----------|
| `Area.type` | `"monotone"` | Smooth curve; matches Recharts dashboard convention. |
| `Area.stroke` | `var(--color-spark)` | Token only; theme-aware. |
| `Area.strokeWidth` | `1.5` | Thin enough to not compete with KPI value; thick enough to read at 64px height. |
| `Area.fill` | `url(#spark-fill-${trend})` (linear gradient `--color-spark` 40% → 0%) | Token-driven gradient; preserves theme awareness. |
| `Area.dot` / `Area.activeDot` | `false` | Sparkline is decorative-trend-only; no data points enumerable. |
| `Area.isAnimationActive` | `false` | KPI-05 implicit + parent § 5.2 explicit: "Sparklines do NOT animate". Paints instant on mount. |

### 6.4 Layout inside the tile

| Property | Value |
|----------|-------|
| Grid column | `[grid-column:1/-1]` — full tile width (spans both `Stat` grid columns) |
| Height | `h-16` (64px — per CONTEXT.md D-11) |
| Position in `Stat` | LAST child (after `StatDescription`) — paints below all text content |
| Margins (Recharts `<AreaChart margin>`) | `{ top: 2, right: 0, bottom: 2, left: 0 }` — 2px top/bottom breathing room; flush sides so the area extends to tile edges (modulo `Stat`'s `p-4`/`p-6` outer padding) |
| Overflow | Not clipped; Recharts handles the viewBox internally |

### 6.5 No tooltips (CONTEXT.md D-11)

`KpiSparkline` deliberately omits `<ChartTooltip>`. The sparkline is *secondary signal* — the primary value lives in `StatValue`, the primary trend lives in `StatTrend`. A tooltip would imply data-point interrogation; the design says "trend at a glance, no drill-down." Phase 5+ may add tooltips if user testing demands; Phase 3 does not.

---

## 7. BlurFade Reveal Timing (CONTEXT.md D-05)

### 7.1 Wave A (tiles 1-3): immediate, 80ms stagger

| Tile | `BlurFade.delay` (coefficient) | Effective delay (ms) |
|------|--------------------------------|----------------------|
| Revenue | 0 | 0 |
| Occupancy | 1 | 80 |
| Active Leases | 2 | 160 |

`BlurFade` internally multiplies `delay` by 80ms (`src/components/ui/blur-fade.tsx:116`: `${delay * 80}ms`).

### 7.2 Wave B (tiles 4-6): starts 160ms AFTER Wave A end, 80ms stagger

Wave A's last tile (Active Leases) starts at 160ms. With `--duration-500` (500ms) BlurFade duration, Active Leases completes at 660ms. **Wave B starts 160ms after Wave A's LAST DELAY-START (not completion)** per D-05 — i.e., 160ms + 160ms = 320ms.

| Tile | `BlurFade.delay` (coefficient) | Effective delay (ms) |
|------|--------------------------------|----------------------|
| Open Maintenance | 4 | 320 |
| Properties | 5 | 400 |
| Units | 6 | 480 |

`delay={3}` is skipped intentionally — that slot is the "Wave A → Wave B" inter-wave gap. Total stagger window from tile 1 start to tile 6 start = 480ms. Parent § 5.3 stagger discipline allows up to 400ms — Phase 3 declares an explicit override here to 480ms because the 2-wave structure visually distinguishes financial tiles (Wave A) from operational/inventory tiles (Wave B), which justifies the extra 80ms over the parent budget.

> **Declared override:** Phase 3 stagger window is 480ms (parent allows ≤400ms). Justification: visual narrative — financial tiles arrive first, then operational/inventory tiles, mirroring landlord product mental model (D-01 rationale). Reduced-motion users get all 6 tiles immediately (no stagger), so the override applies only to motion-enabled users. Checker Dimension-5 reviews; if rejected, Phase 3 collapses to a single wave with `delay={0..5}` × 80ms = 400ms total, dropping the wave-pause visual.

### 7.3 BlurFade duration and easing

| Property | Value | Source |
|----------|-------|--------|
| Per-tile `BlurFade.duration` | `500` | Parent § 2.5 reveal default = `--duration-500` (500ms); matches `BlurFade` `duration` prop's literal-to-utility map (line 100-104 of `blur-fade.tsx`). |
| Per-tile `BlurFade.preset` | `"default"` | Y-offset 6px + opacity-fade + blur-clear (line 60-62 of `blur-fade.tsx`). |
| Per-tile `BlurFade.yOffset` | `6` (default) | Subtle upward float. |
| Per-tile `BlurFade.blur` | `"4px"` (default) | Subtle backdrop blur clear-in. |

`BlurFade` already wires `--ease-out-smooth` indirectly via its `transition-duration` CSS variable mapping; no easing override needed at Phase 3.

### 7.4 Reduced-motion behavior

`BlurFade` ALREADY ships a reduced-motion guard (`src/components/ui/blur-fade.tsx:25-31`). When `prefers-reduced-motion: reduce`:
- `shouldReduceMotion` becomes `true`
- `transitionDelay` is forced to `"0ms"` (line 116)
- State classes become `"opacity-100"` immediately (line 91)
- No transform, no blur

Phase 3 obligation: **none additional** — BlurFade self-guards. The wrapping `<Stat>` mounts visibly at frame 0 for reduced-motion users.

### 7.5 First-paint reveal vs subsequent updates

`BlurFade` uses `useState(false)` + IntersectionObserver to gate first-paint reveal. Subsequent prop updates (e.g., data refresh from a query refetch) do NOT re-trigger the reveal — the `isVisible` state persists. This matches D-06's intent: data refresh re-runs `NumberTicker` (value changes → ticks from previous to new) but does NOT re-fade-in the tile.

---

## 8. Accessibility Hooks

### 8.1 Region landmark and list semantics

(Confirmed in § 1.2.)

- `<section aria-labelledby="kpi-bento-heading">` — landmark
- `<h2 id="kpi-bento-heading" className="sr-only">Portfolio summary</h2>` — screen-reader-only landmark name
- `<div role="list">` — wraps the 6 tiles
- `<div role="listitem">` — wraps each `BlurFade` + `Stat` pair

### 8.2 Per-tile `aria-label`

Each `Stat` carries an `aria-label` that consolidates the visual signals into a single spoken sentence so screen-reader users get the whole tile without traversing internal spans. Construction template:

```
<Label>: <Value> <unit?>. <Trend direction> <percent>% <Trend label>. <Description?>.
```

Examples:

| Tile | Example `aria-label` |
|------|----------------------|
| Revenue (up 12%) | `Revenue: $14,250 this month. Up 12 percent vs. last month.` |
| Occupancy (down 3%, 87 of 100 occupied) | `Occupancy: 87 percent. 87 of 100 units occupied. Down 3 percent vs. last month.` |
| Active Leases (no trend, 42 leases, 3 expiring) | `Active leases: 42. 3 expiring soon.` |
| Open Maintenance (up 5%, 8 open) | `Open maintenance: 8. Requires attention. Up 5 percent vs. last week.` (note: "up" here is bad news — see § 8.4 caveat) |
| Open Maintenance (0 open) | `Open maintenance: 0. All clear.` |
| Properties (no trend, 12) | `Properties: 12.` |
| Units (no trend, 100, 87 occupied) | `Units: 100. 87 occupied.` |

**Construction helper (recommended):**

```tsx
function buildTileAriaLabel(tile: KpiTileConfig): string {
  const parts: string[] = [`${tile.label}: ${tile.spokenValue}.`];
  if (tile.spokenDescription) parts.push(tile.spokenDescription + ".");
  if (tile.trend) {
    const directionWord =
      tile.trend.direction === "up" ? "Up"
      : tile.trend.direction === "down" ? "Down"
      : "Unchanged";
    const pct = Math.abs(Math.round(tile.trend.percentChange));
    const trendSegment =
      tile.trend.direction === "stable"
        ? `Unchanged vs. ${tile.trend.label.replace(/^vs\.\s*/, "")}`
        : `${directionWord} ${pct} percent ${tile.trend.label}`;
    parts.push(trendSegment + ".");
  }
  return parts.join(" ");
}
```

- `spokenValue` is the unit-bearing form (e.g., `"$14,250 this month"` for Revenue, `"87 percent"` for Occupancy, `"42"` for integer tiles). Computed once at render time.
- The visible `%` / `$` characters carry `aria-hidden="true"` because the spoken value already includes the unit in human-readable form ("percent" / "dollars"). Avoids double-reading.

### 8.3 No `aria-live` on values (per parent + CONTEXT.md D-09)

The bento row is **NOT a live region**. Values change only on mount (NumberTicker tick-in) or on user-initiated data refresh — neither warrants automatic announcement. Adding `aria-live="polite"` would announce every ticker frame (NumberTicker fires `setDisplayValue` on each rAF tick at 60fps — 48 announcements per 800ms of ticking), which is hostile to AT users. Final rendered tile is announced via region landmark navigation only.

### 8.4 Trend "direction" vs "polarity" — open question

For Open Maintenance, an upward trend (`metricTrends.openMaintenance.trend === "up"`) means **more open tickets** — which is *bad* for the operator, not *good*. The aria-label currently says "Up 5 percent" without sentiment annotation. This is honest (it states the direction the metric moved) but ambiguous (the reader has to infer polarity from context).

**Phase 3 decision:** ship direction-only aria-labels; do NOT prepend "Worsened by 5 percent" / "Improved by 12 percent" sentiment language. Rationale:
- Sentiment language requires per-metric polarity rules ("up is good for Revenue/Occupancy; up is bad for Open Maintenance/Vacancy") that are out of scope for Phase 3.
- Visual `StatTrend` chip uses color (warning for "down" on Revenue, warning for "up" on Maintenance) but Phase 3 ships color-direction-only (not color-polarity); see § 4 for the implementation note.
- Phase 6 polish may revisit polarity-aware aria-labels if the perfect-PR gate flags ambiguity.

### 8.5 Lucide icons in trend chips

```tsx
<ArrowUp aria-hidden="true" />
<ArrowDown aria-hidden="true" />
<Minus aria-hidden="true" />
```

All trend arrows are `aria-hidden="true"` because they're decorative — the direction is already encoded in the `aria-label` ("Up" / "Down" / "Unchanged"). Per parent § 12.1 + CLAUDE.md accessibility § "Icon-only buttons: aria-label not just title" — these aren't buttons; they're chrome around already-labeled text.

### 8.6 Sparkline `aria-label` (CONTEXT.md D-11)

`KpiSparkline` is `role="img"` with a constructed `aria-label`:

```
${metricName} trend over the last 30 days, currently ${currentValue}, trending ${direction}
```

Examples:
- `"Revenue trend over the last 30 days, currently $14,250, trending up"`
- `"Occupancy trend over the last 30 days, currently 87 percent, trending down"`

`role="img"` is the canonical Recharts wrapper a11y pattern (see `chart.tsx` consumers). The internal `<svg>` Recharts generates is not interactive in Phase 3 (no tooltip, no dot, no activeDot), so collapsing it to an `<img>` semantic is correct.

### 8.7 Focus order

No focusable elements inside the bento row in Phase 3 (no buttons, no links, no inputs). Tab traversal skips from the page heading directly to the chart row / quick-actions block below. This is intentional per CONTEXT.md D-03.

### 8.8 Skip-to-content

Inherited from the dashboard shell (per CLAUDE.md accessibility § "Skip-to-content link in app shell"). Phase 3 does NOT add a per-section skip link; the shell-level one suffices for the dashboard surface.

---

## 9. Skeleton Layout (CONTEXT.md D-08)

### 9.1 Skeleton rule

While `useDashboardData()` returns `isLoading: true` (no data yet), render 6 `<Skeleton>` rectangles in the **same `@container` grid** so the layout doesn't reflow when data arrives.

### 9.2 Skeleton tile shape

```tsx
function KpiSkeletonTile({ hasSparkline }: { hasSparkline: boolean }) {
  return (
    <div
      role="presentation"
      className="rounded-lg border bg-card p-4 @4xl/kpi-bento:p-6 shadow-sm"
    >
      <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
        {/* Label row */}
        <Skeleton className="h-4 w-24" />
        <div />
        {/* Value row */}
        <Skeleton className="h-8 w-32 @4xl/kpi-bento:h-10 @4xl/kpi-bento:w-40" />
        <div />
        {/* Trend row */}
        <Skeleton className="col-span-2 h-3 w-20" />
        {/* Description row */}
        <Skeleton className="col-span-2 h-3 w-28" />
      </div>
      {hasSparkline && (
        <Skeleton className="mt-3 h-16 w-full" />
      )}
    </div>
  );
}
```

- `bg-card`, `p-4`, `@4xl:p-6`, `rounded-lg`, `border`, `shadow-sm` — **identical chrome to the loaded `Stat` tile** so no border / shadow / radius shift on load.
- Sparkline skeleton on tiles 1-2 (Revenue, Occupancy) matches the 64px sparkline height.
- Skeleton tiles 3-6 omit the sparkline placeholder — they're shorter than tiles 1-2, but the parent grid's `align-items: stretch` letterboxes them to match (same parity rule as § 3.3).
- `role="presentation"` because the loading-state placeholders don't carry semantic value beyond "content is loading".

### 9.3 Skeleton ↔ empty-state mutual exclusion (POLISH-07)

Phase 3 obligation: branch render at the tile-set level, NEVER co-render:

```tsx
{isLoading ? (
  <KpiSkeletonGrid />
) : (
  <KpiTilesGrid data={data} />
)}
```

There is no "empty state" for the bento row itself — even with zero properties, the 6 tiles render with `0` / `$0` / `0%` (CONTEXT.md D-09 + § 2.2 above). The mutual-exclusion rule applies only to the load / loaded boundary.

### 9.4 Skeleton motion

`<Skeleton>` from `#components/ui/skeleton` (assumed shadcn-canonical) ships its own shimmer animation. The global `prefers-reduced-motion: reduce` CSS guard in `globals.css:1151-1157` disables it for AT-respecting users automatically. No Phase 3 work needed.

---

## 10. Empty State (CONTEXT.md D-09)

There is **no dedicated empty-state UI** for the bento row. Tile values render as the actual numbers the RPC returns:

| Scenario | Display |
|----------|---------|
| Owner with 0 properties | Revenue `$0`, Occupancy `0%` (or `NaN%` guard → `0%`), Active Leases `0`, Open Maintenance `0`, Properties `0`, Units `0` |
| Owner with 0 trend data (`metricTrends.<field> === null`) | Tile renders WITHOUT `<StatTrend>` block (omitted, not "—") |
| Sparkline with 0 data points (`timeSeries.<field>.length === 0`) | Sparkline area collapses to a flat horizontal line at the data's median (Recharts default for single-value or zero-variance series); planner should add a `data.length < 2` guard that returns `null` instead of mounting `<KpiSparkline>` — see § 10.1 |

### 10.1 Sparkline-data-too-thin guard

```tsx
{tile.sparkline && tile.sparkline.data.length >= 2 && (
  <KpiSparkline {...tile.sparkline} />
)}
```

If the time series has fewer than 2 points (rare; only at brand-new owner accounts < 24h old), the sparkline is omitted entirely. The Revenue / Occupancy tiles still render their primary value + trend (if available). No "No trend data" placeholder text — that would violate D-09 honesty (state-less is more honest than "no data").

### 10.2 NaN / undefined guard

`metrics.occupancyRate` can be `NaN` if `totalUnits === 0` (division by zero upstream). Phase 3 displays `0%` for `NaN`. Phase 1's `transformDashboardData` already coerces, but the bento row adds defense-in-depth:

```ts
const safeOccupancy = Number.isFinite(metrics.occupancyRate) ? metrics.occupancyRate : 0;
```

`NumberTicker` is sensitive to non-finite inputs (rAF math diverges). The guard prevents a runaway tick.

---

## 11. Copywriting Contract

Phase 3 populates the section-level copy that parent § 10 deferred. All English-only; no i18n strings (matches dashboard convention).

| Element | Copy |
|---------|------|
| Region landmark name (sr-only `<h2>`) | `Portfolio summary` |
| Tile 1 label | `Revenue` |
| Tile 1 description | `This month` |
| Tile 2 label | `Occupancy` |
| Tile 2 description | `{X} of {Y} occupied` (interpolated with `occupiedUnits` / `totalUnits`) |
| Tile 3 label | `Active leases` |
| Tile 3 description (when `expiringLeases > 0`) | `{N} expiring soon` |
| Tile 3 description (when `expiringLeases === 0`) | (omitted) |
| Tile 4 label | `Open maintenance` |
| Tile 4 description (when value > 0) | `Requires attention` |
| Tile 4 description (when value === 0) | `All clear` |
| Tile 5 label | `Properties` |
| Tile 5 description | (omitted) |
| Tile 6 label | `Units` |
| Tile 6 description | `{N} occupied` (interpolated with `occupiedUnits`) |
| Trend label (Revenue, Occupancy, Active Leases) | `vs. last month` |
| Trend label (Open Maintenance) | `vs. last month` (matched to the RPC's actual window — execution-time verification per § 4.4) |
| Skeleton screen reader hint | (none — `role="presentation"`) |

**Honesty rules applied:**
- No "Loading..." copy on skeleton (the shimmer animation conveys the loading state visually; AT users navigate past the `role="presentation"` placeholders).
- No fabricated "No data yet" — bento always shows actual numbers (§ 2.2 + § 10).
- No emojis (CLAUDE.md Zero Tolerance Rule #7).
- No em-dashes in user-facing copy (project preference per memory).

**Phase 3 does NOT populate:**
- Empty state for the dashboard as a whole (Phase 6 / Phase 7 territory — covers the case where the owner has 0 properties and the bento renders all zeros but other dashboard sections need an empty CTA).
- Error state for failed `useDashboardData()` queries (Phase 6 polish; falls back to shell-level error boundary).

---

## 12. Dark Mode Verification

Every color reference in Phase 3 resolves to a token with both light and dark variants in `globals.css`. The dark-mode "just works" path:

| Element | Light value (from token) | Dark value (from token) | Verification |
|---------|--------------------------|-------------------------|--------------|
| Tile background (`bg-card`) | `oklch(0.99 0.003 240)` | `oklch(0.16 0.02 255)` | Inherited from `Stat` shell |
| Tile border (`border` default) | `oklch(0.88 0.01 245)` | `oklch(0.3 0.015 255)` | `--color-border` |
| Tile text foreground (`text-card-foreground`) | `oklch(0.2 0.02 245)` | `oklch(0.96 0.01 240)` | Inherited from `Stat` shell |
| `StatLabel` (`text-muted-foreground`) | `oklch(0.48 0.015 245)` | `oklch(0.74 0.02 250)` | Built into Stat |
| `StatDescription` (`text-muted-foreground`) | (same) | (same) | Built into Stat |
| `StatTrend` up (`text-green-600 dark:text-green-400`) | green-600 | green-400 | Vendored Tailwind palette; visible in both modes |
| `StatTrend` down (Phase 3 override → `text-[var(--color-warning)]`) | `oklch(0.75 0.18 85)` | `oklch(0.72 0.18 80)` | Token-bound; theme-aware |
| Sparkline stroke + fill | `--color-spark` ← `--color-success` / `--color-warning` / `--color-muted-foreground` | All have dark variants | Verified in § 6.2 |
| Skeleton shimmer | shadcn `Skeleton` default | shadcn `Skeleton` default | Theme-aware out of box |

**No `bg-white` anywhere** (drift guard verified). **No raw hex / rgb / oklch literals in JSX** (drift guard verified). **No inline `style={{ color: '#...' }}`** (only one inline style allowed: `containerType` / `containerName` on the grid wrapper per § 3.1, which carries no color).

POLISH-04 (Phase 6) re-audits at milestone end; Phase 3 ships dark-mode-clean.

---

## 13. Test Gates

Phase 3 ships GREEN on every gate inherited from `01-UI-SPEC.md` § 12.

### 13.1 Mandatory passing gates

| Gate | Verifies | Phase 3 obligation |
|------|----------|--------------------|
| `design-token-drift.test.ts` | No hex, no rgb, no `bg-white`, no inline-ms in new dashboard files | Pass. The `containerType`/`containerName` inline style carries no color/duration so it does not trip the scanner. |
| `bun run typecheck` | Strict TypeScript across all new files | Pass. New types: `KpiSparklineProps`, `KpiTileConfig`, `KpiBentoRowProps`. |
| `bun run lint` | Biome ruleset | Pass. No `any`, no barrel files, no `as unknown as`. |
| `bun run test:unit` | Vitest unit suite + 80% coverage | Pass. New tests pin: `formatTrendPercent`, `buildTileAriaLabel`, `sparklineConfigForTrend`. Coverage ≥80% on new Phase 3 files. |
| Perfect-PR merge gate | 2 consecutive zero-finding deep review cycles | Pass. |

### 13.2 New unit tests Phase 3 ships

| Test file | Pins |
|-----------|------|
| `kpi-bento-row.test.tsx` | (1) Renders 6 tiles in order; (2) Tiles 1-2 render sparklines, 3-6 do not; (3) Properties + Units omit `<StatTrend>`; (4) `metricTrends.X === null` omits the trend; (5) Skeleton ↔ tile-grid branch render is mutually exclusive; (6) `aria-label` matches the buildTileAriaLabel template for each tile. |
| `kpi-sparkline.test.tsx` | (1) Renders `<AreaChart>` with no animation; (2) `aria-label` includes metric + period + direction; (3) Color resolves through `ChartConfig.theme` map (no hex literal in rendered output); (4) `data.length < 2` is the caller's guard, not the component's — the component renders whatever data length it gets (so the caller's guard is the test surface). |
| `kpi-helpers.test.ts` | (1) `formatTrendPercent(+12.4)` → `"+12%"`; (2) `formatTrendPercent(-3.2)` → `"−3%"` (typographic minus); (3) `formatTrendPercent(0)` → `"0%"`; (4) `buildTileAriaLabel` for each of the 6 tile shapes (with-trend, without-trend, sparkline, no-sparkline). |

### 13.3 Manual gates (Phase 6 / Phase 7 polish)

| Gate | When |
|------|------|
| Dark-mode visual audit | Phase 6 — Phase 3 ships token-clean so this is a visual pass-through. |
| 375px responsive audit | Phase 6 — `auto-fit minmax(180px, 1fr)` collapses to 1 column below 375px; verified at execution time. |
| Reduced-motion E2E | Phase 7 — Playwright test toggles `prefers-reduced-motion: reduce` and asserts no NumberTicker animation / no BlurFade reveal. |
| UI-checker 6-dimensions | After UI-SPEC promotion to `approved` |

---

## 14. Open Questions (resolved or carried)

| Q | Resolution |
|---|------------|
| Tile clickability | RESOLVED — CONTEXT.md D-03, NOT clickable in Phase 3. Carries to a future v3.0 milestone. |
| Trend label window for Open Maintenance | DEFERRED to execution time — planner verifies the actual window the RPC computes and labels accordingly. UI-SPEC default: `vs. last month` (assumes consistent windowing). |
| Sparkline polarity-aware coloring for Open Maintenance | RESOLVED — § 8.4 ships direction-only, NOT polarity-aware. Phase 6 may revisit. |
| Open Maintenance threshold-based warning tint on tile chrome | RESOLVED — CONTEXT.md D-09, OUT OF SCOPE. Threshold semantics are uncomputed; never fabricate. |
| NumberTicker reduced-motion built-in guard | RESOLVED — § 5.4 ships defense-in-depth wrapper. Phase 3 verifies at execution time and inlines only if upstream lacks the guard. |
| Stagger window override (480ms vs parent 400ms) | DECLARED — § 7.2; checker reviews Dimension-5. |
| Down-trend color override (`text-red-600` → `--color-warning`) | DECLARED — § 4.2; checker reviews Dimension-3. |
| `font-weight-bold` (parent) vs `font-semibold` (Stat shell) | DECLARED — § 2.3 footnote; checker reviews Dimension-4. |
| Sparkline color uses `--color-success/warning` vs parent's accent reservation | DECLARED — § 6.2 footnote; rule tightening (status tokens are subset of allowed); checker reviews Dimension-3. |

---

## 15. Component Inventory (Phase 3 net-new + consumed)

### 15.1 New Phase 3 files

| File | Purpose |
|------|---------|
| `src/components/dashboard/components/kpi-bento-row.tsx` | Orchestrator — receives `OwnerDashboardData`, builds tile configs, renders 6-tile grid with `BlurFade` wrapping, mounts skeleton ↔ tile-grid branch. |
| `src/components/dashboard/components/kpi-sparkline.tsx` | Sparkline component — axis-less Recharts Area inside `ChartContainer` with trend-direction color via `ChartConfig.theme`. |
| `src/components/dashboard/components/kpi-helpers.ts` | Pure helpers — `formatTrendPercent`, `buildTileAriaLabel`, `sparklineConfigForTrend`, `KpiTileConfig` type. |
| `src/components/dashboard/components/__tests__/kpi-bento-row.test.tsx` | Vitest pins for orchestration logic. |
| `src/components/dashboard/components/__tests__/kpi-sparkline.test.tsx` | Vitest pins for sparkline rendering. |
| `src/components/dashboard/components/__tests__/kpi-helpers.test.ts` | Vitest pins for pure helpers. |

### 15.2 Consumed (no edits)

| Asset | Source |
|-------|--------|
| `Stat` / `StatLabel` / `StatValue` / `StatTrend` / `StatDescription` | `src/components/ui/stat.tsx` |
| `NumberTicker` | `src/components/ui/number-ticker.tsx` |
| `BlurFade` | `src/components/ui/blur-fade.tsx` |
| `ChartContainer` + `ChartConfig` | `src/components/ui/chart.tsx` |
| `Skeleton` | `src/components/ui/skeleton.tsx` (assumed existing) |
| `ArrowUp` / `ArrowDown` / `Minus` | `lucide-react` |
| `cn` | `#lib/utils` |
| `TimeSeriesDataPoint` | `src/types/analytics.ts` |
| `MetricTrend` | `src/types/analytics.ts` |
| `DashboardMetrics` | `src/types/sections/dashboard.ts` (post-Phase-2 — `collectionRate` already dropped) |
| `OwnerDashboardData` | `src/hooks/api/use-owner-dashboard.ts` |

### 15.3 Edited

| File | Edit |
|------|------|
| `src/components/dashboard/dashboard.tsx` | Replace the `<p>` element at lines 172-186 with `<KpiBentoRow data={…} />`. Pass `metrics`, `metricTrends`, `timeSeries` (verify the data accessor path at execution time — likely a single `data` prop carrying the full `OwnerDashboardData`, OR the three slices destructured upstream in `page.tsx`). |

### 15.4 Forbidden (parent § 1)

- `src/components/ui/bento-grid.tsx` — DO NOT IMPORT
- `src/components/dashboard/animated-trend-indicator.tsx` — DO NOT IMPORT
- `@magicui/*`, `@aceternity/*` — DO NOT INSTALL

---

## 16. Registry Safety

| Registry | Blocks used in Phase 3 | Safety gate |
|----------|------------------------|-------------|
| shadcn official | None new — Phase 3 consumes already-vendored `Stat`, `NumberTicker`, `BlurFade`, `Chart`, `Skeleton` (all vendored in v1.0 or earlier) | not required (no `shadcn add` invocations in Phase 3) |
| Third-party (magicui, aceternity, etc.) | none | N/A — forbidden per parent § 11 |

**No new registry calls.** Phase 3 ships zero `shadcn view` / `shadcn add` invocations. The Lucide icon imports (`lucide-react`) are NPM-package level, not registry-level, and `lucide-react` is the single canonical icon library per CLAUDE.md Zero Tolerance Rule #10.

---

## 17. Checker Sign-Off

The standard 6-dimension checker rubric applies. Inherits PASS on dimensions covered solely by the parent (color tokens, spacing scale, dark-mode rules); validates Phase-3-specific decisions in dimensions where this UI-SPEC tightens or scopes the parent.

- [ ] Dimension 1 Copywriting: PASS (§ 11 — tile labels, descriptions, trend labels, aria-labels, skeleton hint, all populated)
- [ ] Dimension 2 Visuals: PASS (§ 2 per-tile micro-layout, § 6 sparkline visual treatment, § 9 skeleton layout — all section-level concrete designs declared)
- [ ] Dimension 3 Color: PASS (§ 4.2 down-trend `--color-warning` override declared; § 6.2 sparkline color via `--color-spark` resolved through theme map; no hex/rgb/inline literals)
- [ ] Dimension 4 Typography: PASS (§ 2.3 typography ladder declared; `font-semibold` vs parent's `font-weight-bold` discrepancy declared as Stat-shell-consume override, not loosening)
- [ ] Dimension 5 Spacing: PASS (§ 7.2 stagger window override declared (480ms vs parent 400ms); all other spacing from parent multiples-of-4 scale)
- [ ] Dimension 6 Registry Safety: PASS (§ 16 — no new registry calls; no third-party)

**Approval:** pending (gsd-ui-checker upgrades to `approved` on validation; perfect-PR gate continues to enforce on the Phase 3 PR)

---

## 18. Visible Changes At Merge (cross-reference CONTEXT.md § Visible Changes)

1. `/dashboard` no longer renders the one-line "X of Y units occupied | $Z this month" `<p>` header.
2. In its place, a 6-tile bento row: Revenue + Occupancy (with 30-day sparklines) leading, Active Leases + Open Maintenance + Properties + Units trailing.
3. First-load: 6 `<Skeleton>` rectangles in the identical `@container` grid; on data arrival, the skeleton swaps to live tiles with a single-section `BlurFade` reveal across two 3-tile waves (80ms stagger within each wave, 160ms inter-wave gap).
4. KPI values tick from 0 to final via `NumberTicker` over ≤800ms; sparklines paint instant (no animation).
5. `prefers-reduced-motion: reduce` users see all 6 tiles, final values, and sparklines at frame 0 with no ticker, no fade, no stagger.
6. Dark mode is correct out of the box — every color reference resolves through theme-aware tokens (no white-on-white, no invisible badges).
7. 375px viewport renders the bento row as a 1-column vertical stack with zero horizontal scroll.

---

*Phase 3 UI-SPEC drafted: 2026-05-23*
*Inherits: `01-UI-SPEC.md` (milestone-wide rules envelope)*
*Inherited by: none (Phase 3 is a leaf in the inheritance tree)*
*Source tokens: `src/app/globals.css` (canonical; do not duplicate values)*
*Source primitives: `src/components/ui/{stat,number-ticker,blur-fade,chart}.tsx` (all vendored, no new vendoring)*
