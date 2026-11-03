import {
	Area,
	AreaChart,
	CartesianGrid,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Badge } from "#components/ui/badge";
import { type ChartConfig, ChartContainer } from "#components/ui/chart";
import { ChartTooltipContent } from "#components/ui/chart-tooltip";
import { Empty, EmptyDescription, EmptyHeader } from "#components/ui/empty";
import type { OccupancyTrendPoint } from "#types/analytics";

const occupancyConfig = {
	occupancyRate: {
		label: "Occupancy Rate",
		color: "var(--color-chart-1)",
	},
} satisfies ChartConfig;

type OccupancyTrendChartProps = {
	data: OccupancyTrendPoint[];
};

export function OccupancyTrendChart({ data }: OccupancyTrendChartProps) {
	if (!data.length) {
		return (
			<Empty className="flex-none h-60 gap-3 rounded-lg border border-dashed p-6">
				<EmptyHeader>
					<Badge variant="outline" className="mb-1">
						No data
					</Badge>
					<EmptyDescription>
						Occupancy trend data is not available yet.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	const chartData = data.map((point) => ({
		period: point.period,
		occupancyRate: Number(
			point.occupancyRate.toFixed?.(2) ?? point.occupancyRate,
		),
	}));

	return (
		<ChartContainer
			className="aspect-auto h-75 w-full"
			config={occupancyConfig}
		>
			<AreaChart data={chartData}>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis dataKey="period" tickLine={false} axisLine={false} />
				<YAxis tickLine={false} axisLine={false} unit="%" />
				<Tooltip content={<ChartTooltipContent />} />
				<Area
					type="monotone"
					dataKey="occupancyRate"
					stroke="var(--color-occupancyRate)"
					fill="var(--color-occupancyRate)"
					fillOpacity={0.25}
				/>
			</AreaChart>
		</ChartContainer>
	);
}
