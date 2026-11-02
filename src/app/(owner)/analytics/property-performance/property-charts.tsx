"use client";

import { Building2 } from "lucide-react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

import { type ChartConfig, ChartContainer } from "#components/ui/chart";
import { ChartTooltipContent } from "#components/ui/chart-tooltip";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#components/ui/empty";
import type {
	PropertyPerformanceEntry,
	VisitorAnalyticsResponse,
} from "#types/analytics";

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

const visitorConfig = {
	visits: {
		label: "Visits",
		color: "var(--color-chart-1)",
	},
	inquiries: {
		label: "Inquiries",
		color: "var(--color-chart-4)",
	},
	conversions: {
		label: "Applications",
		color: "var(--color-success-text)",
	},
} satisfies ChartConfig;

type PropertyOccupancyChartProps = {
	data: PropertyPerformanceEntry[];
};

type VisitorAnalyticsChartProps = {
	data: VisitorAnalyticsResponse;
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
					/>
				)}
				<Tooltip content={<ChartTooltipContent />} />
				<Legend />
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

export function VisitorAnalyticsChart({ data }: VisitorAnalyticsChartProps) {
	if (!data.timeline.length) {
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

	const chartData = data.timeline.map((point) => ({
		period: point.period,
		visits: point.visits,
		inquiries: point.inquiries,
		conversions: point.conversions,
	}));

	return (
		<ChartContainer className="aspect-auto h-80 w-full" config={visitorConfig}>
			<LineChart data={chartData}>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis dataKey="period" tickLine={false} axisLine={false} />
				<YAxis tickLine={false} axisLine={false} />
				<Tooltip content={<ChartTooltipContent indicator="line" />} />
				<Legend />
				<Line
					type="monotone"
					dataKey="visits"
					stroke="var(--color-visits)"
					strokeWidth={2}
					dot={false}
				/>
				<Line
					type="monotone"
					dataKey="inquiries"
					stroke="var(--color-inquiries)"
					strokeWidth={2}
					dot={false}
				/>
				<Line
					type="monotone"
					dataKey="conversions"
					stroke="var(--color-conversions)"
					strokeWidth={2}
					dot={false}
				/>
			</LineChart>
		</ChartContainer>
	);
}
