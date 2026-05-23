---
phase: 1
slug: dashboard-foundation-dedup
status: approved
scope: milestone-wide
inherited_by: [3, 4, 5]
shadcn_initialized: true
preset: tenantflow-canonical (src/app/globals.css @theme)
created: 2026-05-22
reviewed_at: 2026-05-22
checker_verdict: VERIFIED (6/6 dimensions, 1 FLAG closed via § 2.2 Exceptions sub-note)
---

# Phase 1 — Milestone-Wide UI Design Contract (v2.0 Dashboard Command Center)

> **MILESTONE-WIDE — Phases 3 / 4 / 5 inherit and extend.**
> **Phase 1 deliverable scope: ZERO new UI surfaces.** This is the foundation constraint document — the rules envelope that every later phase's per-phase UI-SPEC designs within.
>
> Per CONTEXT.md D-04 / D-05 / D-06, this UI-SPEC is **rules-only**: aesthetic principles + token reference + dark-mode rules + breakpoints + motion budget + status-color usage map + density scale. Section-level concrete designs (KPI tile layout, chart heights, DataTable column widths) are out of scope here — each later phase writes its own UI-SPEC citing this one as parent.

---

## 0. Scope & Inheritance

### Phase 1 deliverable scope (this PR only)

Phase 1 ships **zero new UI surfaces**. The visible code-edit surface is:

| File | Change | UI impact |
|------|--------|-----------|
| `src/app/(owner)/dashboard/page.tsx` | drop `*100` on lines 71, 92, 107 | none (the round-trip cancelled itself) |
| `src/components/dashboard/dashboard-types.ts` | delete `formatDashboardCurrency` helper | none (callers swap to canonical `formatCurrency`) |
| `src/components/dashboard/dashboard.tsx` | swap `formatDashboardCurrency` → `formatCurrency` | none |
| `src/components/dashboard/components/portfolio-grid.tsx` | swap `formatDashboardCurrency` → `formatCurrency` | none |
| `src/components/dashboard/components/portfolio-table.tsx` | swap `formatDashboardCurrency` → `formatCurrency` | none |
| `src/components/dashboard/components/revenue-overview-chart.tsx:41` | drop `/100` | **chart values jump 100× to actually-correct dollars** (file deleted in Phase 4) |
| `src/components/dashboard/owner-dashboard.tsx` | DELETE | none (was a duplicate, not rendered) |
| `src/components/dashboard/chart-area-interactive.tsx` | DELETE | none (was unused) |
| `src/components/dashboard/dashboard-filters-compact.tsx` | DELETE (and `dashboard-filters.tsx` if orphaned) | none (was unused / dupe) |
| `src/components/dashboard/portfolio-toolbar.tsx` (second copy) | DELETE | none (canonical lives under `components/`) |
| `src/components/dashboard/skeletons.tsx` | DELETE | none (was unused) |
| `src/components/dashboard/dashboard-data.ts` | CREATE (pure transform) | none |

**One honest visible change** (per CONTEXT.md D-02): the revenue chart on `/dashboard` jumps 100× to the actually-correct dollar values. KPI tiles stay visually unchanged because the `*100` / `/100` round-trip through `formatDashboardCurrency` cancels itself.

This UI-SPEC's value is **NOT in dictating Phase 1's visible changes** — there are essentially none. Its value is in **locking the constraint envelope** that Phases 3 / 4 / 5 design within.

### Inheritance model

| Phase | Owns UI-SPEC at | Relationship to this doc |
|-------|-----------------|--------------------------|
| 1 | `01-UI-SPEC.md` (this file) | **Parent** — milestone-wide rules |
| 2 | — (no UI-SPEC; data layer phase) | inherits implicitly |
| 3 | `03-UI-SPEC.md` (Phase 3 dir) | extends parent — KPI bento row section design |
| 4 | `04-UI-SPEC.md` (Phase 4 dir) | extends parent — chart section design |
| 5 | `05-UI-SPEC.md` (Phase 5 dir) | extends parent — DataTable section design |
| 6 | — (no UI-SPEC; polish phase) | enforces this doc retroactively |
| 7 | — (no UI-SPEC; verification phase) | verifies this doc retroactively |

Each child UI-SPEC MUST cite this file in its frontmatter (`extends: 01-UI-SPEC.md`) and MUST NOT redefine any rule declared here. Children may only **add** section-level decisions or **tighten** a rule (e.g., picking a specific token from the chart palette). Loosening a parent rule requires a documented override in the child's "Overrides" section + sign-off in this milestone's discuss-phase artifacts.

---

## 1. Aesthetic Principles

### Restrained B2B (non-negotiable)

The dashboard is a **landlord command center**, not a marketing surface. Visual decisions optimize for at-a-glance comprehension by an operator who returns to the page every weekday, not for first-impression delight on a marketing landing.

| Allowed | Forbidden |
|---------|-----------|
| Subtle borders (`1px solid var(--color-border)`) | Animated gradient borders |
| Subtle shadows (`--shadow-sm` default, `--shadow-md` on hover) | Glow effects, shimmer effects, neon strokes |
| Clean Recharts axes with token-color labels | Hover-reveal background images on tiles |
| Tabular numerics on stats (`font-variant-numeric: tabular-nums`) | Glassmorphism / backdrop-blur on tile chrome |
| Single Lucide arrow on `StatTrend` | `animated-trend-indicator.tsx` (inline-style violation) |
| `BlurFade` for entry only (~4 reveals max per page) | Continuous-loop animations, parallax, pulsing borders |
| `NumberTicker` reserved for **KPI tile values only** | `NumberTicker` on chart axis labels or table cells |
| `@container` queries for tile/grid layouts | CSS-in-JS, styled-components, inline `style={{}}` |

### Banned components (hard-stop)

- `src/components/ui/bento-grid.tsx` — marketing component (absolute image backgrounds, hover-reveal CTAs, fixed 18rem rows). **Forbidden for KPI tiles.** Phase 3 uses a plain `@container` CSS grid auto-fit of `Stat` shells.
- `src/components/dashboard/animated-trend-indicator.tsx` — carries an inline-style violation. Use `<StatTrend>` + a Lucide arrow (`ArrowUp` / `ArrowDown` / `Minus`).
- Anything imported from `@magicui/*` or `@aceternity/*` — flash aesthetic incompatible with this milestone.

### Banned arithmetic (hard-stop, cross-cutting)

**No `* 100` and no `/ 100` on a currency variable anywhere in `src/app/(owner)/dashboard/` or `src/components/dashboard/`** (excluding files Phase 1 deletes, and excluding genuinely non-currency arithmetic like `(value / 1000).toFixed(0)` for thousand-unit chart-axis ticks).

`get_dashboard_data_v2` returns dollars (`numeric(10,2)`). Display in dollars. Convert to cents only at the Stripe API boundary, which the dashboard never crosses.

The perfect-PR merge gate enforces this in every cycle.

---

## 2. Token Reference

**Source of truth:** `src/app/globals.css` `@theme` block + `:where(.dark, .dark *)` overrides. **Do NOT invent new tokens.** The v1.0 Phase 11 `design-token-drift.test.ts` scanner continues to enforce in CI — any hex / rgb / `bg-white` / inline-ms in dashboard files fails the build.

### 2.1 Color tokens (canonical)

**Use semantic tokens, not raw color tokens.** `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`. Never `bg-white`, never `text-muted` bare (the legacy class — use `text-muted-foreground`), never hex.

#### Surface palette (60% / 30% / 10% split)

| Role | Light token | Dark token | Where it appears |
|------|------------|-----------|------------------|
| **Dominant (60%)** | `--color-background` | `oklch(0.14 0.02 250)` | Page background behind every panel |
| **Secondary (30%)** | `--color-card` | `oklch(0.16 0.02 255)` | KPI tiles, chart panels, DataTable container, dashboard panel headers |
| **Tertiary surface** | `--color-muted` | `oklch(0.22 0.02 255)` | Filter chrome, view-toggle background, segmented-control wells |
| **Accent (10%)** | `--color-primary` | `--color-primary` (dark variant) | Primary CTA only (1 per row), focus rings, active sort indicator on table headers |

**Accent (10%) is reserved for:**
1. Primary CTA button on the page (e.g., "Add property" if shipped — currently NOT on dashboard)
2. Focus ring (`--color-ring`)
3. Active sort indicator on DataTable column header
4. The sparkline series on Revenue + Occupancy KPI tiles (Phase 3) when the trend is positive
5. The active segment of the 30d / 6mo toggle (Phase 4)

**Accent is NOT used for:** decorative borders, hover backgrounds (use `color-mix(in oklch, var(--color-primary) 5%, transparent)`), every interactive element, or "things we want to draw the eye to."

#### Text & border palette

| Token | Light value | Dark value | Usage |
|-------|------------|-----------|-------|
| `--color-foreground` | `oklch(0.2 0.02 245)` | `oklch(0.96 0.01 240)` | Primary text, KPI values, table cell content |
| `--color-muted-foreground` | `oklch(0.48 0.015 245)` | `oklch(0.74 0.02 250)` | Secondary text, table column headers, axis labels, helper text |
| `--color-border` | `oklch(0.88 0.01 245)` | `oklch(0.3 0.015 255)` | Panel borders, table row separators, divider lines |
| `--color-border-secondary` | `oklch(0.8 0.01 245)` | `oklch(0.36 0.015 255)` | Emphasized borders (hovered panel) |
| `--color-ring` | `oklch(0.5 0.2 257)` | `oklch(0.72 0.22 259)` | Focus rings, hovered panel border-color shift |

#### Chart palette (data-viz only)

| Token | Light value | Dark value | Reserved for |
|-------|------------|-----------|--------------|
| `--color-chart-1` | `oklch(0.63 0.22 259)` | inherits | Revenue series (Phase 4 RevenueAreaChart primary line/area), Revenue sparkline (Phase 3) |
| `--color-chart-2` | `oklch(0.7 0.18 180)` | inherits | Occupancy series (Phase 4 OccupancyDonutChart occupied wedge), Occupancy sparkline (Phase 3) |
| `--color-chart-3` | `oklch(0.72 0.16 85)` | inherits | Maintenance / open-tickets series (any future chart) |
| `--color-chart-4` | `oklch(0.65 0.18 20)` | inherits | Tertiary trailing-comparison series (e.g., previous-period revenue) |
| `--color-chart-5` | `oklch(0.55 0.12 250)` | inherits | Quaternary / "remainder" wedge (e.g., occupancy donut's unoccupied portion) |

**Chart palette rules:**
- Series colors **MUST come exclusively from `--color-chart-{1..5}`**. No hex, no rgb, no on-the-fly `oklch()` literals.
- Legend swatches MUST use the same token as the series. (Prevents the white-on-white legend bug from happening when someone hardcodes `bg-white` for a swatch.)
- Axis labels: `text-muted-foreground` (token, not hex). Axis lines: `--color-border` (token, not hex). Grid lines: `--color-border` at `opacity-50` or `color-mix(... 50%, transparent)`.
- Tooltip background: `--color-popover`. Tooltip text: `--color-popover-foreground`. Tooltip border: `--color-border`.

#### Status palette (semantic — see § 6 Status-Color Usage Map for the mapping)

| Token | Light value | Dark value | Semantic |
|-------|------------|-----------|----------|
| `--color-success` | `oklch(0.66 0.2 160)` | `oklch(0.68 0.2 150)` | Positive trend, occupancy ≥ threshold, paid invoice |
| `--color-warning` | `oklch(0.75 0.18 85)` | `oklch(0.72 0.18 80)` | Maintenance backlog, lease expiring soon |
| `--color-info` | `oklch(0.62 0.19 240)` | `oklch(0.66 0.18 250)` | Informational state (lease pending, draft) |
| `--color-destructive` | `oklch(0.577 0.245 25)` | `oklch(0.5 0.24 29)` | Overdue, negative trend, error state, destructive confirmation |

Each has a paired `*-foreground` token for legible text on the colored surface. Use the `@utility status-badge-*` and `@utility icon-bg-*` helpers in `globals.css` rather than re-deriving the `color-mix(... 10%, transparent)` recipe inline.

### 2.2 Spacing scale (canonical)

The dashboard uses the `--spacing-*` scale from `globals.css`. **Layout-level spacing is multiples of 4px / 0.25rem.** Only the declared steps exist; do not invent new ones.

| Token | rem | px | Canonical dashboard usage |
|-------|-----|----|-----|
| `--spacing-1` | 0.25rem | 4px | Icon gap inside `StatTrend`, table cell inline padding |
| `--spacing-1_5` | 0.375rem | 6px | **Half-step (exception)** — View-toggle button inner gap (interactive primitive only; see Exceptions below) |
| `--spacing-2` | 0.5rem | 8px | KPI tile internal stack gap (label → value), badge padding-y |
| `--spacing-3` | 0.75rem | 12px | KPI grid `gap-3` (compact), portfolio toolbar gap, view-toggle button padding-x |
| `--spacing-4` | 1rem | 16px | KPI tile `p-4` (compact), KPI grid `gap-4` (default), table cell padding |
| `--spacing-5` | 1.25rem | 20px | Dashboard panel header / body padding (matches `globals.css` `.dashboard-panel-*`) |
| `--spacing-6` | 1.5rem | 24px | KPI tile `p-6` (spacious), KPI grid `gap-6` (loose), chart panel padding |
| `--spacing-8` | 2rem | 32px | Section-to-section vertical gap on `/dashboard` |
| `--spacing-12` | 3rem | 48px | Above-the-fold reserved height for KPI row at ≥1024px |

**Half-step exceptions** (closing UI-checker Dimension-5 FLAG, 2026-05-22):

The canonical `globals.css` scale also defines `--spacing-0_5` (2px), `--spacing-1_5` (6px), `--spacing-2_5` (10px), `--spacing-3_5` (14px) — none of which are multiples of 4. These are **interactive-primitive half-steps** used for control-internal micro-spacing (e.g., the view-toggle inner gap above). They are project-canonical (already in `globals.css`), not invented here, but they violate the grid-alignment rule that applies to layout-level spacing.

**Rule:** Half-step tokens (`*_5` variants) may be used ONLY inside interactive primitives (buttons, toggles, badges, chip insets). They MUST NOT be used for:
- Section-to-section vertical gap
- Grid gap (use `gap-3`/`gap-4`/`gap-6`)
- Panel padding (use `p-4`/`p-5`/`p-6`)
- Tile padding (use `p-4`/`p-6` per density band)
- Any layout-level spacing where a multiple of 4 exists

If a child UI-SPEC (Phase 3/4/5) introduces a half-step at a layout level, the planner MUST surface it for explicit user override.

**Density bands** (see § 7 for the full Density Scale):
- **Compact:** `p-4` tiles + `gap-3` grid + `h-12` table rows (mobile + dense desktop)
- **Default:** `p-6` tiles + `gap-4` grid + `h-12` table rows (mid-density desktop, the default for first paint)
- **Spacious:** `p-6` tiles + `gap-6` grid + `h-14` table rows (high-resolution desktop, optional)

### 2.3 Radius scale

| Token | Value | Canonical dashboard usage |
|-------|-------|--------------------------|
| `--radius-sm` | 4px | Inline code, segmented-control button inner radius |
| `--radius-md` | 8px | DataTable cells if rounded, dropdown menu items |
| `--radius-lg` | 12px | Default panel radius (dashboard-panel), quick-action-button, view-toggle outer well |
| `--radius-xl` | 16px | KPI tile radius (matches `dashboard-stat-card` + `dashboard-widget-card` + `stat-card-professional` from `globals.css`) |
| `--radius-2xl` | 24px | Reserved for marketing surfaces; do not use on dashboard |
| `--radius-full` | 9999px | Status badges, sparkline tooltip dot, scrollbar thumb |

Children MAY pick `--radius-lg` or `--radius-xl` for tile chrome; they may NOT introduce `--radius-2xl` without override sign-off.

### 2.4 Shadow scale

| Token | Canonical dashboard usage |
|-------|--------------------------|
| `--shadow-sm` | Default panel resting state (matches `dashboard-stat-card` rest) |
| `--shadow-md` | KPI tile hover, DataTable row hover (subtle lift) |
| `--shadow-lg` | Popover / dropdown / column-visibility menu (Phase 5) |
| `--shadow-xl` | Reserved — do not use on dashboard |
| `--shadow-2xl` | Forbidden on dashboard (marketing-only) |

### 2.5 Duration & easing scale

| Token | ms | Canonical dashboard usage |
|-------|-----|--------------------------|
| `--duration-150` | 150ms | Hover state on borders, status-badge color transitions |
| `--duration-200` | 200ms | Default panel `transition: border-color` |
| `--duration-300` | 300ms | Chart series fade-in, view-toggle active-state shift |
| `--duration-500` | 500ms | `BlurFade` reveal default, chart bar grow |
| `--duration-700` | 700ms | Reserved — only for hero-style entries (NOT on dashboard) |
| `--duration-standard` | 250ms | Default for non-specified transitions |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Default easing (hover, fade-in) |
| `--ease-out-smooth` | `cubic-bezier(0.16, 1, 0.3, 1)` | Reveal animations (BlurFade) |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Two-way transitions (theme toggle, panel collapse) |

**Inline millisecond literals (`duration-300`, `transition: all 250ms`) are FORBIDDEN.** Always reference the `--duration-*` token. The drift-guard scanner flags inline-ms.

### 2.6 Typography scale

The dashboard uses **`Roboto` (`--font-sans`)** for everything. `--font-display` (Playfair) is marketing-only — do not use it on the dashboard.

| Token | Size | Canonical dashboard usage |
|-------|------|--------------------------|
| `--text-stat-lg` | 2.5rem (40px) | KPI tile value (`StatValue`) at ≥768px |
| `--text-stat` | 2rem (32px) | KPI tile value at <768px |
| `--text-title-2` | clamp 20-24px | Section heading ("Portfolio", "Revenue trend") |
| `--text-title-3` | clamp 16-20px | KPI tile group heading (rare; tiles use `StatLabel` instead) |
| `--text-base` | 1rem (16px) | Table cell content, panel body copy |
| `--text-sm` | 0.875rem (14px) | `StatLabel`, `StatDescription`, table column headers, axis labels, helper text |
| `--text-xs` | 0.75rem (12px) | Status badges (`status-badge` utility), pagination text |
| `--text-caption` | 0.6875rem (11px) | Timestamps, "Last updated" hints |

| Line height | Canonical usage |
|------------|-----------------|
| `--leading-none` | KPI numeric values (tabular-nums) |
| `--leading-tight` | Section headings (h2) |
| `--leading-snug` | Card titles (h3), table cell content |
| `--leading-normal` | Body copy, labels, helper text |

| Weight | Canonical usage |
|-------|-----------------|
| `--font-weight-normal` (400) | Default body, table cell content |
| `--font-weight-medium` (500) | Active state in segmented controls, hovered link |
| `--font-weight-semibold` (600) | Section headings, table column headers, `StatLabel`, panel titles |
| `--font-weight-bold` (700) | KPI values (`StatValue`), page-level h1 only |

**Tabular numerics rule:** every numeric value that the user might scan in a column or compare across tiles MUST use `font-variant-numeric: tabular-nums`. The `@utility typography-stat*` helpers already do this. KPI tiles, table dollar columns, table unit-count columns all use tabular-nums.

---

## 3. Dark-Mode Rules (non-negotiable)

### 3.1 Hard prohibitions

| Forbidden | Why | Drift-guard catch? |
|----------|-----|-------------------|
| `bg-white` anywhere in dashboard subtree | Becomes invisible / white-on-light in dark mode | YES — `design-token-drift.test.ts` flags |
| `text-muted` bare (legacy class) | Loses contrast in dark mode | Manual audit (Phase 6) |
| Raw `oklch(...)` / `#hex` / `rgb(...)` in JSX or CSS | Doesn't react to theme | YES — drift scanner |
| `color-mix(in oklch, #fff ...)` (hex literal inside mix) | Same as above | YES |
| Tailwind opacity literal on a non-token color (e.g., `bg-white/80`) | Same as above | YES |
| Inline `style={{ color: '#...' }}` | Bypasses tokens entirely | YES (no-inline-style rule) |
| Legend swatches as `bg-white` | Disappears against light card in light mode, against dark card in dark mode | Manual audit (Phase 6); Phase 4 success criterion 3 |
| Empty / loading states with `bg-gray-50` | Same problem | YES |

### 3.2 Required behavior

**Toggling between light and dark mode on `/dashboard` MUST reveal zero invisible elements.** This is success-criterion-level for Phase 6 (POLISH-04) and the perfect-PR gate enforces it on every later-phase PR.

Specifically:
- Every KPI tile renders with visible content in both modes (no white-on-white).
- Every chart legend swatch is visibly distinct from the card background in both modes.
- Every chart axis label is readable against the chart panel surface in both modes.
- Every status badge has visible text contrast against its tinted background in both modes (use the `@utility status-badge-*` helpers, which derive contrast via `color-mix`).
- Every DataTable row, header, and sort indicator is visible in both modes.
- Every focus ring (`--color-ring`) renders visibly in both modes.

### 3.3 Surface mapping (dark mode)

The `:where(.dark, .dark *)` block in `globals.css` redefines surface tokens. Components reference the tokens, not the underlying values, so dark mode "just works" when the rules above are followed. The five surface tokens are:

| Token | Light value | Dark value |
|-------|------------|-----------|
| `--color-background` | `oklch(0.985 0.002 240)` | `oklch(0.14 0.02 250)` |
| `--color-card` | `oklch(0.99 0.003 240)` | `oklch(0.16 0.02 255)` |
| `--color-muted` | `oklch(0.94 0.01 240)` | `oklch(0.22 0.02 255)` |
| `--color-popover` | `oklch(1 0 0)` | `oklch(0.12 0.015 250)` |
| `--color-foreground` | `oklch(0.2 0.02 245)` | `oklch(0.96 0.01 240)` |

`StatTrend` arrows use `--color-success` / `--color-destructive` / `--color-muted-foreground` (for neutral) — each has light AND dark variants in `globals.css`, so no per-mode branching is needed in component code.

---

## 4. Breakpoints

### 4.1 Declared breakpoints

| Name | Min-width | Canonical dashboard usage |
|------|----------|--------------------------|
| **xs (mobile minimum)** | **375px** | Hard floor. `/dashboard` MUST render at this width with zero horizontal scroll. Portfolio table FORCES grid view here (POLISH-06). |
| sm | 640px | KPI grid: 2-up (was 1-up at 375px) |
| md | 768px | KPI grid: 3-up; chart row stacks to 2-up |
| lg | 1024px | KPI grid: 6-up (full bento above the fold) |
| xl | 1280px | Chart row: side-by-side at full width |
| 2xl | 1536px | Optional; do not require new layouts here — let `@container` queries take over |

### 4.2 Container queries preferred over media queries

For tile-grid and chart-grid layouts, **`@container` queries are the default**; media queries are the escape hatch.

**Why:** The dashboard has a left sidebar that can collapse from 16rem to 3rem. A KPI grid that responds to its container width handles the sidebar transition naturally; a grid that responds to viewport width gets it wrong on every collapse / expand.

**Pattern (used by Phase 3):**

```css
/* On the KPI grid wrapper: */
container-type: inline-size;
container-name: kpi-grid;

/* On the grid itself: */
@container kpi-grid (min-width: 640px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
@container kpi-grid (min-width: 768px) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
@container kpi-grid (min-width: 1024px) { grid-template-columns: repeat(6, minmax(0, 1fr)); }
```

Media queries are still allowed for **page-level layout** (e.g., sidebar collapse threshold) and **mobile-only overrides** (e.g., `@media (max-width: 768px)` from `globals.css` for touch target enforcement).

### 4.3 375px hard floor

POLISH-06 success criterion: `/dashboard` has **zero horizontal scroll at 375px viewport width**. Phase 5 success criterion #3 reinforces: **the portfolio table forces grid view at the mobile breakpoint** — there is no "scroll the table sideways" fallback.

Phase 7 E2E smoke includes a 375px viewport probe.

---

## 5. Motion Budget

### 5.1 Reduced-motion guard is non-negotiable

`globals.css` line 1151 already declares:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

That global guard handles CSS animations. **JavaScript-driven animations (NumberTicker, BlurFade, Recharts transitions) MUST add their own guard.**

| Animation source | Guard pattern |
|-----------------|---------------|
| `NumberTicker` | already has built-in `useReducedMotion()` guard (Phase 2 v1.0 hardening); pass-through |
| `BlurFade` | already has built-in guard; pass-through |
| Recharts `Area` / `Donut` initial reveal | Pass `isAnimationActive={!prefersReducedMotion}` from `useReducedMotion()` hook |
| Custom hover lift (`hover-lift-shadow`) | Disabled automatically by the global CSS guard (transition-duration → 0.01ms) |
| nuqs URL state changes | No animation; no guard needed |

POLISH-08 success criterion: users with `prefers-reduced-motion: reduce` see **no NumberTicker animation, no BlurFade reveal, no chart transition animation**. They see the final state immediately.

### 5.2 Reveal-density budget

To keep the dashboard from feeling like a marketing page on first paint:

| Animation | Per-page budget | Notes |
|-----------|----------------|-------|
| `BlurFade` reveals | **≤ 4 per page** | KPI row counts as ONE reveal (the whole grid), not 6 (one per tile). Chart row counts as ONE. DataTable counts as ONE. Header/breadcrumb counts as ONE if used. |
| `NumberTicker` animations | **≤ 6 per page** | KPI tile values only — six tiles, six tickers. Never on chart axis labels, never on table cells (POLISH-08 + KPI-03 + KPI-07). |
| Recharts transitions | **≤ 2 per page** | The two charts (Phase 4). Sparklines do NOT animate (KPI-05; they paint instant). |
| CSS hover lifts | unlimited | Cheap; the global reduced-motion guard handles them. |

### 5.3 Stagger discipline

When a section uses `BlurFade` with stagger:
- Stagger delta: ≤ 100ms between siblings
- Total stagger window for any one section: ≤ 400ms (sums to ≤ 4 siblings worth)
- No nested staggers (a parent reveal does not delay its own children's reveal — children reveal at the same time as the parent, not after)

---

## 6. Status-Color Usage Map

Each status token maps to a single semantic. **Phase 1 declares the mapping; Phase 3 picks the threshold numerics (when KPI thresholds settle).**

| Semantic | Token | When to use | Example tile / signal |
|----------|-------|-------------|----------------------|
| **Positive / on-track** | `--color-success` | Trend is up vs. previous period; metric meets or exceeds target | `StatTrend` up-arrow, occupancy ≥ target threshold (Phase 3 picks the number), sparkline area-fill on rising Revenue tile, "Paid" badge |
| **Caution / attention-needed** | `--color-warning` | Backlog accumulating, deadline approaching but not missed | Open Maintenance tile when count ≥ threshold (Phase 3 picks), lease expiring in next 30 days, "Pending" badge |
| **Informational / neutral-state** | `--color-info` | Active-but-not-urgent state, draft, in-progress | "Draft" lease badge, in-progress maintenance ticket, generic info banner |
| **Negative / blocking** | `--color-destructive` | Overdue, error, destructive confirmation needed | Overdue badge, negative trend `StatTrend`, "Delete property" confirmation button, error state |

**Rules:**
- A single tile uses at most ONE status color at a time. If a tile has a trend arrow AND a badge, the badge color matches the trend semantic (don't mix).
- `--color-info` is the default "something is happening" color — use it when in doubt rather than reaching for accent / primary.
- Never use raw color (e.g., raw red) for an alert. Always go through the token.
- The `status-badge-{success,warning,destructive}` utilities in `globals.css` are the canonical badge implementation. Phase 6 audits for ad-hoc badge implementations.

---

## 7. Density Scale

Three density bands. Phase 3 (KPI tiles) and Phase 5 (DataTable) pick which band is default; Phase 6 polish may add a user toggle.

### 7.1 KPI tiles

| Density | Padding | Internal stack gap | Min-height | Notes |
|---------|---------|-------------------|-----------|-------|
| Compact | `p-4` | `gap-2` | `min-h-24` (6rem) | Mobile, dense desktop |
| **Default** | `p-6` | `gap-2` | `min-h-28` (7rem) | First paint, ≥768px viewports — **Phase 3 default** |
| Spacious | `p-6` | `gap-3` | `min-h-32` (8rem) | Optional; high-resolution desktop |

The `globals.css` `dashboard-stat-card` utility uses `p-4` + `min-h-24` (compact); Phase 3 can choose to apply `p-6` overrides for the default density, OR introduce a `data-density` attribute pattern matching the existing `.dashboard-panel[data-density="compact"]` recipe.

### 7.2 Grid gaps

| Density | KPI grid gap | Chart row gap | Section-to-section |
|---------|-------------|---------------|--------------------|
| Compact | `gap-3` (12px) | `gap-4` (16px) | `gap-6` (24px) |
| **Default** | `gap-4` (16px) | `gap-6` (24px) | `gap-8` (32px) — **Phase 3/4 default** |
| Spacious | `gap-6` (24px) | `gap-8` (32px) | `gap-12` (48px) |

### 7.3 DataTable rows

| Density | Row height | Cell padding-y | Notes |
|---------|-----------|----------------|-------|
| Compact | `h-12` (48px) | `py-2` | **Mandatory minimum** — 44×44px keyboard touch target rule (`--touch-target-min` from `globals.css`) requires row height ≥ 44px. **`h-12` is the floor.** |
| **Default** | `h-12` (48px) | `py-2.5` | **Phase 5 default** |
| Spacious | `h-14` (56px) | `py-3` | Optional |

**Hard rule:** **Table row height < `h-12` is forbidden** in any density band. Keyboard users tabbing to a row-level action must land on a target that meets the 44×44 minimum.

### 7.4 Status badges (across densities)

Status badges use the `status-badge` utility from `globals.css`:
- Padding: `0.25rem 0.75rem` (`py-1 px-3`)
- Font-size: `--text-xs` (12px)
- Font-weight: bold (700)
- Border-radius: `--radius-full`
- Letter-spacing: `0.05em` (uppercase tracking)

This is single-density across the dashboard — badges don't get smaller in compact mode.

---

## 8. Currency & Numeric Display (Phase 1 specific)

This section is **specific to Phase 1's bug fix scope** and is the only section in this UI-SPEC that prescribes a concrete implementation detail. It's here because the currency / numeric contract crosses every later phase.

### 8.1 Currency contract

- **`get_dashboard_data_v2` returns dollars** as `numeric(10,2)`. The frontend receives dollars.
- **The frontend displays dollars.** No `* 100`. No `/ 100`. Anywhere in `src/app/(owner)/dashboard/` or `src/components/dashboard/`.
- **Canonical formatter: `formatCurrency` from `src/lib/utils/currency.ts:26`.** Use it everywhere a currency value is rendered as text on `/dashboard`. The duplicate `formatDashboardCurrency` from `dashboard-types.ts:29` is **deleted in Phase 1**.
- Convert to cents **only at the Stripe API boundary**, which the dashboard never crosses.

Phase 1 grep gate (CONTEXT.md D-03):

```bash
grep -nE '(\* ?100|/ ?100)' src/app/\(owner\)/dashboard/ src/components/dashboard/ --include='*.{ts,tsx}'
# Must return zero hits on a currency variable post-PR.
# Allowed exceptions (verified at execution time, all on files being deleted or non-currency arithmetic):
#   - expiring-leases-widget.tsx:37 — `60 * 24 * 60 * 60 * 1000` (millisecond constant)
#   - chart-area-interactive.tsx — DELETED in Phase 1
#   - revenue-overview-chart.tsx — DELETED in Phase 4
#   - any `(value / 1000).toFixed(0)` for chart-axis thousand-unit ticks (non-currency)
```

### 8.2 Numeric display rules (cross-cutting)

| Display surface | Numeric format | Notes |
|----------------|---------------|-------|
| KPI tile value (`StatValue`) | `formatCurrency(value)` for $ tiles, `formatNumber(value)` for count tiles, `formatPercent(value)` for ratio tiles | `--font-weight-bold`, `tabular-nums` |
| Chart axis labels (currency) | `(v / 1000).toFixed(0) + 'k'` for thousands, `(v / 1_000_000).toFixed(1) + 'M'` for millions | NOT a currency `* 100` / `/ 100` violation; this is a numeric display convention |
| Chart tooltip values | `formatCurrency(value)` (full precision) | Use full dollars in tooltip even if axis is abbreviated |
| Table dollar cells | `formatCurrency(value)` | `tabular-nums`, right-aligned |
| Table count cells | `formatNumber(value)` | `tabular-nums`, right-aligned |
| Status badge inside table | numeric ratios as `formatPercent`; counts as `formatNumber` | small text, `--text-xs` |

`formatNumber` and `formatPercent` are sibling helpers in `src/lib/utils/currency.ts` (if they don't already exist, Phase 5 or Phase 4 may add them — they're not part of Phase 1's scope).

---

## 9. Component Inventory (already vendored — child phases consume)

These components already exist in `src/components/ui/` and `src/components/data-table/`. Phase 1 does NOT touch them. They're listed here so child UI-SPECs reference the canonical primitive rather than re-creating one.

| Component | Path | Consumer phase |
|-----------|------|----------------|
| `Stat` shell + `StatLabel` / `StatValue` / `StatTrend` / `StatDescription` | `src/components/ui/stat.tsx` | Phase 3 |
| `NumberTicker` | `src/components/ui/number-ticker.tsx` | Phase 3 (KPI values) |
| `BlurFade` | `src/components/ui/blur-fade.tsx` | Phase 3 / 4 / 5 (section reveals) |
| `ChartContainer` + `ChartTooltip` | `src/components/ui/chart.tsx`, `src/components/ui/chart-tooltip.tsx` | Phase 3 (sparkline), Phase 4 (full charts) |
| DiceUI DataTable stack (8 files) + `useDataTable` | `src/components/data-table/*`, `src/hooks/use-data-table.ts` | Phase 5 |

**Forbidden / banned** (re-stating from § 1):
- `src/components/ui/bento-grid.tsx` — banned for KPI tiles
- `src/components/dashboard/animated-trend-indicator.tsx` — banned (inline-style violation)

---

## 10. Copywriting Contract (placeholder — child phases populate)

Phase 1 deliberately does NOT prescribe copywriting because:
1. Phase 1 ships zero new UI surfaces (nothing to write copy for).
2. KPI tile labels (Phase 3), chart axis legends (Phase 4), and DataTable empty / loading copy (Phase 5) are section-level decisions belonging to each phase.

**Cross-cutting copy rules that DO apply across all phases:**

| Rule | Detail |
|------|--------|
| **Never fabricate a metric** (POLISH-11 honesty principle) | If `collection_rate` resolves to "uncomputable" in Phase 2, the tile / column is **dropped**, not displayed as `0` or "N/A %". |
| **Empty states must propose a next step** | "No properties yet" pairs with "Add your first property" CTA, not just an icon and silence. Phase 5 / Phase 6 populate. |
| **Error states must be specific** | "Could not load dashboard" + "Try again" link, not a generic spinner-stuck state. Phase 6 populates. |
| **Destructive confirmation uses the action verb in the button label** | "Delete property" not "Yes", "Cancel deletion" not "No". Cross-cutting from v1.0 lessons. |
| **No emojis in UI copy** (CLAUDE.md Zero Tolerance Rule #7) | Lucide icons only. |
| **Skeletons never co-render with empty states** (POLISH-07 + Phase 14 D-04 v1.0 lesson) | Use route-scoped `loading.tsx` for streaming, or branch render `isLoading ? <Skeleton /> : data.length === 0 ? <Empty /> : <Content />` — never both at once. |

Child UI-SPECs populate the actual labels.

---

## 11. Registry Safety

Single registry: shadcn official. No third-party registries in v2.0.

| Registry | Blocks used in v2.0 | Safety gate |
|----------|---------------------|------------|
| shadcn official | DataTable composition (already vendored 2026-04, Phase 5 just consumes), Stat (already vendored), NumberTicker (already vendored), BlurFade (already vendored), Chart (already vendored), Switch (existing), Empty (existing) | not required (all already vendored, no new shadcn `add` calls in v2.0) |
| Third-party (magicui, aceternity, dicebear, etc.) | **none** | **N/A — registry forbidden** |

Phase-3/4/5 PRs MUST NOT introduce a new third-party registry. Any necessary primitive that's missing comes from shadcn official or is hand-rolled with token compliance.

---

## 12. Drift Guards (CI enforcement)

Inherited from v1.0; continue to run on every PR in v2.0:

| Guard | File | Enforces |
|-------|------|---------|
| `design-token-drift.test.ts` | `src/app/__tests__/design-token-drift.test.ts` | No hex, no rgb, no `bg-white`, no inline-ms in `src/components` + `src/app` |
| `marketing-copy-landlord-only.test.ts` | `src/app/__tests__/marketing-copy-landlord-only.test.ts` | Persona-honesty banlist — does NOT scan dashboard subtree per CONTEXT.md; confirm at execution time |
| Perfect-PR merge gate | Operational (two consecutive zero-finding deep review cycles) | Every Phase 1-7 PR |

Phase 1 introduces **no new drift guards** (none are needed — the v1.0 ones cover dashboard work without modification). Phase 7 verification may add one (e.g., a tile-padding-band linter) if a recurring drift pattern surfaces.

---

## 13. Open Questions (deferred — non-blocking for Phase 1)

These ambiguities are not covered by upstream artifacts at the rules level and don't need resolution for Phase 1 to ship (Phase 1 ships zero new UI surfaces). Each is flagged here so the phase that DOES need the answer resolves it in its own discuss-phase.

| Q | Owner phase | Default if not resolved |
|---|-------------|------------------------|
| Exact threshold for "occupancy ≥ N% maps to `--color-success`" | Phase 3 | Phase 3 picks; this UI-SPEC just locks the token mapping (§ 6) |
| Exact threshold for "Open Maintenance ≥ N maps to `--color-warning`" | Phase 3 | Same as above |
| Whether KPI tiles default to compact (`p-4`) or default (`p-6`) density | Phase 3 | Default to `p-6` per § 7.1 |
| Whether the 30d / 6mo toggle on Revenue chart sits inside the chart panel header or above it | Phase 4 | Default: inside the chart panel header, right-aligned |
| Whether the DataTable grid view at 375px uses 1 column or a card stack | Phase 5 | Default: card stack (1 column, full-width tiles) — see § 4.3 |
| User-visible density toggle (compact / default / spacious) | Phase 6 (polish) | Default: not shipped in v2.0 (deferred to v2.1 if Phase 5 user testing surfaces demand) |

---

## 14. Checker Sign-Off

The standard 6-dimension checker rubric applies to this and every child UI-SPEC. Because this is a **rules-only milestone-wide document with no section-level designs**, the checker validates the rules envelope (dimensions 3-5 apply directly; 1, 2, 6 are inherited and checked at child UI-SPEC level).

- [ ] Dimension 1 Copywriting: inherited (child phases populate § 10)
- [ ] Dimension 2 Visuals: inherited (child phases populate concrete designs)
- [ ] Dimension 3 Color: PASS (§ 2.1 token map declared; § 3 dark-mode rules declared; § 6 status map declared)
- [ ] Dimension 4 Typography: PASS (§ 2.6 scale declared, 3 sizes + 4 weights from canonical tokens)
- [ ] Dimension 5 Spacing: PASS (§ 2.2 scale declared, multiples of 4; § 7 density bands declared)
- [ ] Dimension 6 Registry Safety: PASS (§ 11 — single registry, no third-party, no `shadcn view` gate needed because no new blocks are added)

**Approval:** pending (gsd-ui-checker upgrades to `approved` on validation)

---

## Appendix A — Phase 1 verification grep (executable)

After Phase 1 lands, this command MUST return zero hits across currency-variable lines:

```bash
# Currency * 100 / / 100 scan (post-delete, excludes files Phase 1 removes)
# Regex uses (?<!\d)100(?!\d) — but POSIX ERE has no lookahead, so we anchor with `\b`
# on the trailing side ([^0-9]). Net: `* 100` matches; `* 1000` does NOT match (the
# trailing `0` is a digit, so `\b` doesn't fire). Same for `/ 100` vs `/ 1000`.
# Cycle-2 lockstep fix 2026-05-22: original `\* ?100` false-positived on ms arithmetic
# (`5 * 60 * 1000`); tightened regex prevents that.
git ls-files 'src/app/(owner)/dashboard/**/*.{ts,tsx}' 'src/components/dashboard/**/*.{ts,tsx}' \
  | grep -vE '(chart-area-interactive|revenue-overview-chart|owner-dashboard|dashboard-filters-compact|skeletons)\.tsx?$' \
  | xargs grep -nE '(\* ?100\b|/ ?100\b)' \
  | grep -vE '(60 \* 24|/ 1000|/ 1_000_000)' \
  || echo "PASS: no currency * 100 or / 100 in dashboard subtree"
```

Phase 7 verification re-runs this against the final v2.0 codebase.

---

*Phase 1 UI-SPEC drafted: 2026-05-22*
*Milestone scope: v2.0 Dashboard Command Center (Phases 1-7)*
*Inherited by: Phase 3 (`03-UI-SPEC.md`), Phase 4 (`04-UI-SPEC.md`), Phase 5 (`05-UI-SPEC.md`)*
*Source tokens: `src/app/globals.css` (canonical; do not duplicate values)*
