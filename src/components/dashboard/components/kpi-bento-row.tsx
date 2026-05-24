"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { BlurFade } from "#components/ui/blur-fade";
import { NumberTicker } from "#components/ui/number-ticker";
import { Skeleton } from "#components/ui/skeleton";
import {
	Stat,
	StatDescription,
	StatLabel,
	StatTrend,
	StatValue,
} from "#components/ui/stat";
import { useReducedMotion } from "#hooks/use-reduced-motion";
import { cn } from "#lib/utils";
import { formatCurrency } from "#lib/utils/currency";
import type { MetricTrend, TimeSeriesDataPoint } from "#types/analytics";
import {
	buildTileAriaLabel,
	formatTrendPercent,
	type KpiBentoRowProps,
	type KpiTileConfig,
} from "./kpi-helpers";
import { KpiSparkline } from "./kpi-sparkline";

// Grid wrapper styles for the `@container` parent. Tailwind v4 has no
// parent-side container-type utility — this `style={{}}` PROP is the SOLE
// inline-style exemption in Phase 3 (03-UI-SPEC § 3.1 + § 13). Carries
// only static container-query keys; NO color, NO duration, NO spacing.
const GRID_CONTAINER_STYLE = {
	containerType: "inline-size",
	containerName: "kpi-bento",
} as const;

const GRID_CLASSES = cn(
	"grid gap-4",
	"grid-cols-[repeat(auto-fit,minmax(180px,1fr))]",
	"@4xl/kpi-bento:gap-6",
);

function TrendArrow({ direction }: { direction: "up" | "down" | "stable" }) {
	if (direction === "up") {
		return <ArrowUp aria-hidden="true" className="inline-block size-3" />;
	}
	if (direction === "down") {
		return <ArrowDown aria-hidden="true" className="inline-block size-3" />;
	}
	return <Minus aria-hidden="true" className="inline-block size-3" />;
}

// Defense-in-depth wrapper per 03-UI-SPEC § 5.4: upstream `NumberTicker`
// lacks a reduced-motion guard, so we short-circuit to a static value when
// the user has opted out.
function KpiNumberTicker({
	value,
	decimalPlaces = 0,
	duration = 800,
}: {
	value: number;
	decimalPlaces?: number;
	duration?: number;
}) {
	const reducedMotion = useReducedMotion();
	if (reducedMotion) {
		return (
			<span className="inline-block tabular-nums tracking-wider">
				{Intl.NumberFormat("en-US", {
					minimumFractionDigits: decimalPlaces,
					maximumFractionDigits: decimalPlaces,
				}).format(value)}
			</span>
		);
	}
	return (
		<NumberTicker
			value={value}
			decimalPlaces={decimalPlaces}
			duration={duration}
		/>
	);
}

function KpiSkeletonTile({ hasSparkline }: { hasSparkline: boolean }) {
	return (
		<div
			className="rounded-lg border bg-card p-4 shadow-sm @4xl/kpi-bento:p-6"
			role="presentation"
		>
			<div className="grid gap-2">
				<Skeleton className="h-4 w-20" />
				<Skeleton className="h-9 w-32" />
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-3 w-28" />
				{hasSparkline ? <Skeleton className="mt-3 h-16 w-full" /> : null}
			</div>
		</div>
	);
}

function KpiSkeletonGrid() {
	const hasSparkline = [true, true, false, false, false, false];
	return (
		<section
			aria-labelledby="kpi-bento-heading"
			data-testid="kpi-bento-row-loading"
		>
			<h2 id="kpi-bento-heading" className="sr-only">
				Portfolio summary
			</h2>
			<div className={GRID_CLASSES} style={GRID_CONTAINER_STYLE} role="list">
				{hasSparkline.map((sparkline, idx) => (
					<KpiSkeletonTile key={`skeleton-${idx}`} hasSparkline={sparkline} />
				))}
			</div>
		</section>
	);
}

function buildSparkline(
	data: TimeSeriesDataPoint[],
	trend: MetricTrend | null,
	metricName: string,
	spokenValue: string,
): KpiTileConfig["sparkline"] {
	if (data.length < 2) return null;
	const direction = trend?.trend ?? "stable";
	const directionWord =
		direction === "up"
			? "trending up"
			: direction === "down"
				? "trending down"
				: "stable";
	return {
		data,
		trend: direction,
		ariaLabel: `${metricName} trend over the last 30 days, currently ${spokenValue}, ${directionWord}`,
	};
}

function buildKpiTileConfigs(
	stats: NonNullable<KpiBentoRowProps["stats"]>,
	metricTrends: NonNullable<KpiBentoRowProps["metricTrends"]>,
	timeSeries: NonNullable<KpiBentoRowProps["timeSeries"]>,
): KpiTileConfig[] {
	const safeOccupancy = Number.isFinite(stats.units.occupancyRate)
		? stats.units.occupancyRate
		: 0;

	const revenueTrend = metricTrends.monthlyRevenue;
	const occupancyTrend = metricTrends.occupancyRate;
	const tenantsTrend = metricTrends.activeTenants;
	const maintenanceTrend = metricTrends.openMaintenance;

	const revenueSpoken = `${formatCurrency(stats.revenue.monthly, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	})} this month`;
	const occupancySpoken = `${safeOccupancy} percent`;

	const tiles: KpiTileConfig[] = [
		{
			id: "revenue",
			label: "Revenue",
			spokenValue: revenueSpoken,
			description: "This month",
			value: stats.revenue.monthly,
			decimalPlaces: 0,
			prefix: "$",
			trend: revenueTrend,
			trendLabel: "vs. last month",
			sparkline: buildSparkline(
				timeSeries.monthlyRevenue,
				revenueTrend,
				"Revenue",
				revenueSpoken,
			),
			waveDelay: 0,
		},
		{
			id: "occupancy",
			label: "Occupancy",
			spokenValue: occupancySpoken,
			description: `${stats.units.occupied} of ${stats.units.total} occupied`,
			spokenDescription: `${stats.units.occupied} of ${stats.units.total} units occupied`,
			value: safeOccupancy,
			decimalPlaces: 0,
			suffix: "%",
			trend: occupancyTrend,
			trendLabel: "vs. last month",
			sparkline: buildSparkline(
				timeSeries.occupancyRate,
				occupancyTrend,
				"Occupancy",
				occupancySpoken,
			),
			waveDelay: 1,
		},
		{
			id: "active-leases",
			label: "Active leases",
			spokenValue: String(stats.leases.active),
			value: stats.leases.active,
			decimalPlaces: 0,
			trend: tenantsTrend,
			trendLabel: "vs. last month",
			sparkline: null,
			waveDelay: 2,
			...(stats.leases.expiringSoon > 0 && {
				description: `${stats.leases.expiringSoon} expiring soon`,
				spokenDescription: `${stats.leases.expiringSoon} expiring soon`,
			}),
		},
		{
			id: "open-maintenance",
			label: "Open maintenance",
			spokenValue: String(stats.maintenance.open),
			description:
				stats.maintenance.open > 0 ? "Requires attention" : "All clear",
			spokenDescription:
				stats.maintenance.open > 0 ? "Requires attention" : "All clear",
			value: stats.maintenance.open,
			decimalPlaces: 0,
			trend: maintenanceTrend,
			trendLabel: "vs. last month",
			sparkline: null,
			waveDelay: 4,
		},
		{
			id: "properties",
			label: "Properties",
			spokenValue: String(stats.properties.total),
			value: stats.properties.total,
			decimalPlaces: 0,
			trend: null,
			sparkline: null,
			waveDelay: 5,
		},
		{
			id: "units",
			label: "Units",
			spokenValue: String(stats.units.total),
			description: `${stats.units.occupied} occupied`,
			spokenDescription: `${stats.units.occupied} occupied`,
			value: stats.units.total,
			decimalPlaces: 0,
			trend: null,
			sparkline: null,
			waveDelay: 6,
		},
	];

	return tiles;
}

function KpiTile({ tile }: { tile: KpiTileConfig }) {
	const ariaLabel = buildTileAriaLabel({
		label: tile.label,
		spokenValue: tile.spokenValue,
		trend: tile.trend,
		...(tile.spokenDescription && {
			spokenDescription: tile.spokenDescription,
		}),
		...(tile.trendLabel && { trendLabel: tile.trendLabel }),
	});
	const trendChip = tile.trend ? (
		<StatTrend
			trend={tile.trend.trend === "stable" ? "neutral" : tile.trend.trend}
			className={cn(
				tile.trend.trend === "down" &&
					"!text-[var(--color-warning)] dark:!text-[var(--color-warning)]",
			)}
		>
			<TrendArrow direction={tile.trend.trend} />
			<span>{formatTrendPercent(tile.trend.percentChange)}</span>
			{tile.trendLabel ? (
				<span className="text-muted-foreground">{tile.trendLabel}</span>
			) : null}
		</StatTrend>
	) : null;
	return (
		<div role="listitem">
			<Stat
				className="@4xl/kpi-bento:p-6 transition-colors duration-200"
				aria-label={ariaLabel}
			>
				<StatLabel>{tile.label}</StatLabel>
				<StatValue>
					{tile.prefix ? <span aria-hidden="true">{tile.prefix}</span> : null}
					<KpiNumberTicker
						value={tile.value}
						decimalPlaces={tile.decimalPlaces}
						duration={800}
					/>
					{tile.suffix ? <span aria-hidden="true">{tile.suffix}</span> : null}
				</StatValue>
				{trendChip}
				{tile.description ? (
					<StatDescription>{tile.description}</StatDescription>
				) : null}
				{tile.sparkline && tile.sparkline.data.length >= 2 ? (
					<KpiSparkline
						data={tile.sparkline.data}
						trend={tile.sparkline.trend}
						ariaLabel={tile.sparkline.ariaLabel}
					/>
				) : null}
			</Stat>
		</div>
	);
}

export function KpiBentoRow({
	isLoading,
	stats,
	metricTrends,
	timeSeries,
}: KpiBentoRowProps) {
	const reducedMotion = useReducedMotion();

	if (isLoading || !stats || !metricTrends || !timeSeries) {
		return <KpiSkeletonGrid />;
	}

	const tiles = buildKpiTileConfigs(stats, metricTrends, timeSeries);

	return (
		<section aria-labelledby="kpi-bento-heading" data-testid="kpi-bento-row">
			<h2 id="kpi-bento-heading" className="sr-only">
				Portfolio summary
			</h2>
			<div className={GRID_CLASSES} style={GRID_CONTAINER_STYLE} role="list">
				{tiles.map((tile) => {
					const tileBody = <KpiTile tile={tile} key={`body-${tile.id}`} />;
					return reducedMotion ? (
						tileBody
					) : (
						<BlurFade key={tile.id} delay={tile.waveDelay} duration={500}>
							{tileBody}
						</BlurFade>
					);
				})}
			</div>
		</section>
	);
}
