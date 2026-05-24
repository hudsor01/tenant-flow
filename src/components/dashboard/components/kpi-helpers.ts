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
 * is typed `number`, but the RPC can ship `NaN` on a stale row and
 * `Math.round(NaN)` returns `NaN` — without the guard the chip would
 * render `"NaN%"` or `"+Infinity%"`. The `Number.isFinite` short-circuit
 * is load-bearing; do NOT remove it as "defensive overkill" — it
 * defends a real failure mode.
 */
export function formatTrendPercent(percentChange: number): string {
	// WR-02 cycle-1 fix: NaN / Infinity guard. The type says `number` but
	// `MetricTrend.percentChange` can carry NaN if the RPC ships a stale row,
	// and `Math.round(NaN)` returns NaN — without this guard the rendered
	// chip reads "NaN%" or "+Infinity%". Same hardening as the `safeOccupancy`
	// guard in kpi-bento-row.tsx.
	if (!Number.isFinite(percentChange)) return "0%";
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
	trendLabel?: string;
}

/**
 * Builds the consolidated `aria-label` sentence each `<Stat>` carries, per
 * 03-UI-SPEC § 8.2. Output examples:
 *
 * - `"Revenue: $14,250 this month. Up 12 percent vs. last month."`
 * - `"Occupancy: 87 percent. 87 of 100 units occupied. Down 3 percent vs. last month."`
 * - `"Active leases: 42. 3 expiring soon."`
 * - `"Properties: 12."`
 * - `"Open maintenance: 8. Requires attention. Unchanged vs. last month."`
 *
 * Construction rules:
 * - Starts with `${label}: ${spokenValue}.`
 * - If `spokenDescription` is set, pushes `${spokenDescription}.`
 * - If `trend` is `null`, the trend segment is omitted entirely (D-04 + D-09
 *   honesty rule — no fabricated `0%`).
 * - If `trend.trend === "stable"`, emits `"Unchanged vs. <window>."` (strips
 *   any leading `"vs. "` from the trendLabel to avoid duplication). When
 *   `trendLabel` is undefined or empty, emits `"Unchanged."` (cycle-2
 *   WR-2C-02 fix — prevents an orphan `"Unchanged vs. ."` sentence).
 * - Otherwise emits `"<Up|Down> <abs(round(pct))> percent <trendLabel>."`,
 *   trimming a trailing space when `trendLabel` is undefined.
 *
 * NaN / Infinity guard (cycle-1 WR-02 hardening): the `pct` value uses a
 * `Number.isFinite` short-circuit so `trend.percentChange === NaN` (which
 * can occur on a stale RPC row) does NOT narrate `"Up NaN percent..."`.
 * Load-bearing; do NOT remove.
 */
export function buildTileAriaLabel(input: BuildTileAriaLabelInput): string {
	const parts: string[] = [`${input.label}: ${input.spokenValue}.`];
	if (input.spokenDescription) {
		parts.push(`${input.spokenDescription}.`);
	}
	if (input.trend !== null) {
		const directionWord =
			input.trend.trend === "up"
				? "Up"
				: input.trend.trend === "down"
					? "Down"
					: "Unchanged";
		// WR-02 cycle-1 fix: NaN / Infinity guard — same hardening as
		// `formatTrendPercent`. Without this the narrated sentence becomes
		// "Up NaN percent vs. last month."
		const pct = Number.isFinite(input.trend.percentChange)
			? Math.abs(Math.round(input.trend.percentChange))
			: 0;
		let trendSegment: string;
		if (input.trend.trend === "stable") {
			// WR-2C-02 cycle-2 fix: when `trendLabel` is undefined, the prior
			// template produced "Unchanged vs. ." (orphan period from the
			// caller-appended ".") — symmetric with the WR-02 trimEnd discipline
			// the non-stable branch already applies. Drop the "vs. ..." trailer
			// entirely when the window text is empty so the narrated sentence
			// becomes "Unchanged." instead of "Unchanged vs. .".
			const windowText = (input.trendLabel ?? "").replace(/^vs\.\s*/, "");
			trendSegment = windowText ? `Unchanged vs. ${windowText}` : "Unchanged";
		} else {
			const base = `${directionWord} ${pct} percent ${input.trendLabel ?? ""}`;
			trendSegment = base.trimEnd();
		}
		parts.push(`${trendSegment}.`);
	}
	return parts.join(" ");
}
