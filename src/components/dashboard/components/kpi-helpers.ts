/**
 * Pure helpers + types for the Phase 3 KPI Bento Row.
 *
 * Exports:
 * - {@link formatTrendPercent} — emits `+12%` / `−3%` (U+2212 minus) / `0%`.
 *   Used by `<StatTrend>` to render the per-tile percent chip (03-UI-SPEC § 4.3).
 * - {@link sparklineConfigForTrend} — maps trend direction → ChartConfig with
 *   `spark.theme.{light,dark}` set to the correct status token. Consumed by
 *   `KpiSparkline` (03-UI-SPEC § 6.2) so the sparkline stroke + fill resolve
 *   through the shadcn ChartContainer scoped-CSS-variable machinery.
 * - {@link KpiTileConfig} — shape consumed by Plan 03-02's orchestrator
 *   (`KpiBentoRow`) per the locked interface in 03-01-PLAN.md `<interfaces>`.
 */

import type { ChartConfig } from "#components/ui/chart";
import type { MetricTrend, TimeSeriesDataPoint } from "#types/analytics";

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
 */
export function formatTrendPercent(percentChange: number): string {
	const rounded = Math.round(percentChange);
	// String.fromCharCode(0x2212) is the U+2212 typographic minus — distinct
	// from the hyphen-minus emitted by `String(-3)` (U+002D). 03-UI-SPEC § 4.3
	// pins the minus character so trend chips look like body copy, not code.
	const minus = String.fromCharCode(0x2212);
	const sign = rounded > 0 ? "+" : rounded < 0 ? minus : "";
	return `${sign}${Math.abs(rounded)}%`;
}

/**
 * Returns a shadcn {@link ChartConfig} keyed by `spark` whose theme map
 * routes the sparkline stroke + fill through a status token:
 * - `up` → `--color-success`
 * - `down` → `--color-warning`
 * - `stable` → `--color-muted-foreground`
 *
 * `ChartContainer` (src/components/ui/chart.tsx) consumes the returned config
 * and injects a scoped `--color-spark` CSS variable, so the sparkline JSX
 * references `var(--color-spark)` instead of hardcoding a status token in
 * place (03-UI-SPEC § 6.2).
 *
 * Both `theme.light` and `theme.dark` point at the same token because the
 * status tokens already resolve to dark-mode-correct `oklch()` values via
 * the `:where(.dark, .dark *)` override in `globals.css`.
 */
export function sparklineConfigForTrend(trend: TrendDirection): ChartConfig {
	const token =
		trend === "up"
			? "--color-success"
			: trend === "down"
				? "--color-warning"
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
 * - `value` / `decimalPlaces` / `prefix` / `suffix` — `<NumberTicker>` driver.
 * - `trend` — `MetricTrend | null`; render `<StatTrend>` only when non-null
 *   (CONTEXT.md D-04 honesty rule).
 * - `trendLabel` — secondary text right of the percent (e.g.
 *   `"vs. last month"`).
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
	prefix?: string;
	suffix?: string;
	trend: MetricTrend | null;
	trendLabel?: string;
	sparkline: {
		data: TimeSeriesDataPoint[];
		trend: TrendDirection;
		ariaLabel: string;
	} | null;
	waveDelay: number;
}
