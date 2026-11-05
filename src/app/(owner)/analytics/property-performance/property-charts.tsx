"use client";

import { Building2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import {
	moneyAxisTick,
	seriesTooltipFormatter,
} from "#components/shared/chart-series";
import { type ChartConfig, ChartContainer } from "#components/ui/chart";
import {
	ChartLegend,
	ChartLegendContent,
	ChartTooltipContent,
} from "#components/ui/chart-tooltip";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#components/ui/empty";
import { formatCurrency } from "#lib/utils/currency";
import type { PropertyPerformanceEntry } from "#types/analytics";

const occupancyConfig = {
	occupancy: {
		label: "Occupancy %",
		color: "var(--color-chart-1)",
	},
	rentReceived: {
		label: "Rent received",
		color: "var(--color-success-text)",
	},
} satisfies ChartConfig;

/** Rent received is dollars; occupancy keeps its figure under "Occupancy %". */
const occupancyAndRentTooltip = seriesTooltipFormatter(
	occupancyConfig,
	(value, key) =>
		key === "rentReceived" ? formatCurrency(value) : value.toLocaleString(),
);

type PropertyOccupancyChartProps = {
	data: PropertyPerformanceEntry[];
};

export function PropertyOccupancyChart({ data }: PropertyOccupancyChartProps) {
	if (!data.length) {
		return (
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Building2 />
					</EmptyMedia>
					<EmptyTitle>No property data</EmptyTitle>
					<EmptyDescription>
						Property performance data will appear once properties are added
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	// Rent received is null on every row when the server cannot report it yet:
	// the chart then draws occupancy alone rather than bars of $0.
	const rentReceivedAvailable = data.some((item) => item.rentReceived !== null);
	const chartData = data.map((item) => ({
		property: item.propertyName,
		occupancy: Number(item.occupancyRate?.toFixed?.(1) ?? item.occupancyRate),
		rentReceived: item.rentReceived,
	}));

	return (
		<ChartContainer
			className="aspect-auto h-80 w-full"
			config={occupancyConfig}
		>
			<BarChart data={chartData}>
				<CartesianGrid strokeDasharray="3 3" vertical={false} />
				<XAxis
					dataKey="property"
					tickLine={false}
					axisLine={false}
					interval={0}
					angle={-30}
					textAnchor="end"
					height={80}
				/>
				<YAxis yAxisId="occupancy" tickLine={false} axisLine={false} unit="%" />
				{rentReceivedAvailable && (
					<YAxis
						yAxisId="rentReceived"
						orientation="right"
						tickLine={false}
						axisLine={false}
						tickFormatter={moneyAxisTick}
					/>
				)}
				<Tooltip
					content={<ChartTooltipContent formatter={occupancyAndRentTooltip} />}
				/>
				<ChartLegend content={<ChartLegendContent />} />
				<Bar
					yAxisId="occupancy"
					dataKey="occupancy"
					fill="var(--color-occupancy)"
					radius={[6, 6, 0, 0]}
				/>
				{rentReceivedAvailable && (
					<Bar
						yAxisId="rentReceived"
						dataKey="rentReceived"
						fill="var(--color-rentReceived)"
						radius={[6, 6, 0, 0]}
					/>
				)}
			</BarChart>
		</ChartContainer>
	);
}
