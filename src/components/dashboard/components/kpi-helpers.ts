/**
 * Pure helpers + types for the Phase 3 KPI Bento Row.
 *
 * Exports:
 * - {@link formatTrendPercent} — emits `+12%` / `−3%` (U+2212 minus) / `0%`.
 *   `describeTrend` calls it for a tile's percent chip (03-UI-SPEC § 4.3).
 * - {@link sparklineConfigForTrend} — maps trend direction → ChartConfig with
 *   `spark.theme.{light,dark}` set to the correct status token. Consumed by
 *   `KpiSparkline` (03-UI-SPEC § 6.2) so the sparkline stroke + fill resolve
 *   through the shadcn ChartContainer scoped-CSS-variable machinery.
 * - {@link KpiTileConfig} — shape consumed by Plan 03-02's orchestrator
 *   (`KpiBentoRow`) per the locked interface in 03-01-PLAN.md `<interfaces>`.
 */

import type { ChartConfig } from "#components/ui/chart";
import { formatCount } from "#lib/formatters/count";
import { formatSignedOneDecimal } from "#lib/formatters/signed";
import { windowDays } from "#lib/stated-window";
import type { MetricTrend, TimeSeriesDataPoint } from "#types/analytics";
import type { DashboardStats } from "#types/stats";

type TrendDirection = MetricTrend["trend"];

/**
 * Renders a rounded percent change with a typographic sign:
 * - `+12%` for positive trends,
 * - `−3%` for negative trends (U+2212 typographic minus, NOT hyphen-minus
 *   U+002D),
 * - `0%` for zero / rounds-to-zero.
 *
 * Rounds to the nearest integer — `0.4` and `-0.4` both round to zero and
 * render as `0%` with no sign (03-UI-SPEC § 4.3 honesty rule).
 *
 * NaN / Infinity guard (cycle-1 WR-02 hardening): `MetricTrend.percentChange`
 * is `number | null`, `mapMetricTrend` maps a non-finite value to null, and
 * `describeTrend` returns its no-prior chip for null or NaN before it calls
 * this, so the chip never shows the guard's "0%". The guard protects a direct
 * caller only: `Math.round(NaN)` is `NaN`, which would print `"NaN%"`.
 */
export function formatTrendPercent(percentChange: number): string {
	// For a direct caller: describeTrend never passes a non-finite value.
	if (!Number.isFinite(percentChange)) return "0%";
	const rounded = Math.round(percentChange);
	// String.fromCharCode(0x2212) is the U+2212 typographic minus — distinct
	// from the hyphen-minus emitted by `String(-3)` (U+002D). 03-UI-SPEC § 4.3
	// pins the minus character so trend chips look like body copy, not code.
	const minus = String.fromCharCode(0x2212);
	const sign = rounded > 0 ? "+" : rounded < 0 ? minus : "";
	return `${sign}${Math.abs(rounded)}%`;
}

/** How a tile states its change: percent, or (occupancy) percentage points. */
export type TrendUnit = "percent" | "points";

/**
 * What a tile's chip says about its trend, read once for the chip and its
 * narrated label:
 * - `unavailable`: the server states no window (a body before 20261110123118,
 *   whose figure is no change), so the chip says so and shows no figure;
 * - `no-prior`: there was no earlier figure (percentChange null), so there is
 *   no percent to show: "No rent scheduled 30 days ago";
 * - `change`: the figure ("+12%", or "−25.0 pts" in points as the analytics
 *   overview's occupancy tile prints it) and the window it computes
 *   ("vs. 30 days ago", from the trend's own window).
 */
export type TrendChip =
	| { readonly kind: "unavailable"; readonly text: string }
	| { readonly kind: "no-prior"; readonly text: string }
	| {
			readonly kind: "change";
			readonly figure: string;
			readonly spokenFigure: string;
			readonly windowLabel: string;
	  };

/** "vs. 30 days ago": the trend's earlier day, counted back from its later. */
export function trendWindowLabel(days: number): string {
	return `vs. ${formatCount(days, "day")} ago`;
}

export function describeTrend(
	trend: MetricTrend,
	unit: TrendUnit,
	noPriorText: string,
): TrendChip {
	if (trend.window === null) {
		return { kind: "unavailable", text: "Change unavailable" };
	}
	const days = windowDays(trend.window);
	if (unit === "points") {
		const points = Math.abs(Math.round(trend.change * 10) / 10);
		return {
			kind: "change",
			figure: `${formatSignedOneDecimal(trend.change)} pts`,
			spokenFigure: formatCount(points, "point"),
			windowLabel: trendWindowLabel(days),
		};
	}
	// A non-finite percent (NaN from a stale row) is no figure either, never
	// a fabricated 0% (WR-02).
	if (trend.percentChange === null || !Number.isFinite(trend.percentChange)) {
		return {
			kind: "no-prior",
			text: `${noPriorText} ${formatCount(days, "day")} ago`,
		};
	}
	const pct = Math.abs(Math.round(trend.percentChange));
	return {
		kind: "change",
		figure: formatTrendPercent(trend.percentChange),
		spokenFigure: `${pct} percent`,
		windowLabel: trendWindowLabel(days),
	};
}

/**
 * Returns a shadcn {@link ChartConfig} keyed by `spark` whose theme map
 * routes the sparkline stroke + fill through a status token:
 * - `up` → `--color-success-text`
 * - `down` → `--color-warning-text`
 * - `stable` → `--color-muted-foreground`
 *
 * The stroke is a graphical object (WCAG 1.4.11, 3:1 on the card): the AA
 * companions read 5.89:1 / 5.48:1 light and 11.07:1 / 11.74:1 dark (token
 * math; success-text read 5.23:1 light in Chrome before fix round 4 darkened
 * it), where the vivid `--color-success` / `--color-warning` fills read
 * 2.62:1 / 2.18:1 on the light card (66.2-39 VD-53).
 *
 * `ChartContainer` (src/components/ui/chart.tsx) consumes the returned config
 * and injects a scoped `--color-spark` CSS variable, so the sparkline JSX
 * references `var(--color-spark)` instead of hardcoding a status token in
 * place (03-UI-SPEC § 6.2).
 *
 * Both `theme.light` and `theme.dark` point at the same token because the
 * status tokens already resolve to dark-mode-correct `oklch()` values:
 * `--color-success-text`, `--color-warning-text` and `--color-muted-foreground`
 * alias `--success-text`, `--warning-text` and `--muted-foreground`, which
 * `.dark` redefines in `globals.css`.
 */
export function sparklineConfigForTrend(trend: TrendDirection): ChartConfig {
	const token =
		trend === "up"
			? "--color-success-text"
			: trend === "down"
				? "--color-warning-text"
				: "--color-muted-foreground";
	return {
		spark: {
			label: "Trend",
			theme: {
				light: `var(${token})`,
				dark: `var(${token})`,
			},
		},
	};
}

/**
 * Shape of a single KPI tile config, consumed by Plan 03-02's
 * `KpiBentoRow` orchestrator. Locked here so the orchestrator imports a
 * stable interface instead of inventing one mid-wave.
 *
 * Fields:
 * - `id` — stable React key (e.g. `"revenue"`, `"occupancy"`).
 * - `label` — visible `<StatLabel>` text.
 * - `spokenValue` — unit-bearing aria-label fragment (e.g. `"$14,250 this
 *   month"`, `"87 percent"`). Built once at render time per 03-UI-SPEC § 8.2.
 * - `description` — visible `<StatDescription>` text; omitted via `undefined`
 *   when no secondary signal applies.
 * - `spokenDescription` — aria-label fragment for the description (e.g.
 *   `"87 of 100 units occupied"`); falls back to `description` when undefined.
 * - `value` / `decimalPlaces` / `currency` / `suffix` — `<NumberTicker>` driver;
 *   `currency` formats the value as dollars (sign before the symbol).
 * - `trend` — `MetricTrend | null`; render `<StatTrend>` only when non-null
 *   (CONTEXT.md D-04 honesty rule). What it says is `describeTrend`'s.
 * - `trendUnit` — `"points"` for occupancy (a change in percentage points,
 *   as the analytics overview's tile states it), else `"percent"`.
 * - `noPriorText` — what the chip says with no earlier figure, before the
 *   window ("No rent scheduled" + " 30 days ago").
 * - `sparkline` — when non-null, mount `<KpiSparkline>` with these props
 *   (03-UI-SPEC § 6.1 contract).
 * - `waveDelay` — `BlurFade` `delay` coefficient (0..6) per 03-UI-SPEC § 7.
 */
export interface KpiTileConfig {
	id: string;
	label: string;
	spokenValue: string;
	description?: string;
	spokenDescription?: string;
	value: number;
	decimalPlaces: number;
	currency?: boolean;
	suffix?: string;
	trend: MetricTrend | null;
	trendUnit: TrendUnit;
	noPriorText: string;
	sparkline: {
		data: TimeSeriesDataPoint[];
		trend: TrendDirection;
		ariaLabel: string;
	} | null;
	waveDelay: number;
}

/**
 * Props consumed by Plan 03-02's `KpiBentoRow` orchestrator. The four fields
 * are nullable except `isLoading` — when the data hook is mid-flight or fails,
 * the row renders the skeleton branch (UI-SPEC § 9.3 — mutually exclusive
 * with the loaded-tiles branch).
 *
 * B-1 cycle-1 fix: `stats: DashboardStats | null` is the authoritative shape
 * — KpiBentoRow does NOT receive the legacy `DashboardProps.metrics` object.
 * Tile values are read off `stats.revenue.monthly`, `stats.units.occupancyRate`,
 * `stats.leases.active`, `stats.maintenance.open`, `stats.properties.total`,
 * and `stats.units.total`.
 */
export interface KpiBentoRowProps {
	isLoading: boolean;
	stats: DashboardStats | null;
	metricTrends: {
		occupancyRate: MetricTrend | null;
		// `activeTenants` is currently UNUSED in Phase 3 — the "Active leases"
		// tile intentionally omits its trend chip because tenants ≠ leases
		// (CR-02 cycle-1 fix; D-09 honesty). Field stays in the shape because
		// the RPC selector emits it and a future feature may map it to a
		// distinct "Active tenants" tile. Do NOT attribute this trend to
		// "Active leases" again.
		activeTenants: MetricTrend | null;
		monthlyRevenue: MetricTrend | null;
		openMaintenance: MetricTrend | null;
	} | null;
	timeSeries: {
		occupancyRate: TimeSeriesDataPoint[];
		monthlyRevenue: TimeSeriesDataPoint[];
	} | null;
}

interface BuildTileAriaLabelInput {
	label: string;
	spokenValue: string;
	spokenDescription?: string;
	trend: MetricTrend | null;
	trendUnit?: TrendUnit;
	noPriorText?: string;
}

/**
 * Builds the consolidated `aria-label` sentence each `<Stat>` carries, per
 * 03-UI-SPEC § 8.2, from the same `describeTrend` the visible chip reads.
 * Output examples:
 *
 * - `"Revenue: $14,250. This month. Up 12 percent vs. 30 days ago."`
 * - `"Occupancy: 87 percent. 87 of 100 units occupied. Down 3 points vs. 30 days ago."`
 * - `"Revenue: $700. This month. No rent scheduled 30 days ago."`
 * - `"Open maintenance: 8. Requires attention. Change unavailable."`
 * - `"Properties: 12."`
 *
 * Construction rules:
 * - Starts with `${label}: ${spokenValue}.`
 * - If `spokenDescription` is set, pushes `${spokenDescription}.`
 * - If `trend` is `null`, the trend segment is omitted entirely (D-04 + D-09
 *   honesty rule — no fabricated `0%`).
 * - With no window (unavailable) or no earlier figure (no-prior), the chip's
 *   own text, so the narration never invents a figure.
 * - A `stable` change reads `"Unchanged vs. 30 days ago."`.
 * - Otherwise `"<Up|Down> <figure> vs. <n> days ago."`, the figure in
 *   percent or points as the chip shows it (a NaN percent is no figure).
 */
export function buildTileAriaLabel(input: BuildTileAriaLabelInput): string {
	const parts: string[] = [`${input.label}: ${input.spokenValue}.`];
	if (input.spokenDescription) {
		parts.push(`${input.spokenDescription}.`);
	}
	if (input.trend !== null) {
		const chip = describeTrend(
			input.trend,
			input.trendUnit ?? "percent",
			input.noPriorText ?? "No prior figure",
		);
		if (chip.kind !== "change") {
			parts.push(`${chip.text}.`);
		} else if (input.trend.trend === "stable") {
			parts.push(`Unchanged ${chip.windowLabel}.`);
		} else {
			const directionWord = input.trend.trend === "up" ? "Up" : "Down";
			parts.push(`${directionWord} ${chip.spokenFigure} ${chip.windowLabel}.`);
		}
	}
	return parts.join(" ");
}
