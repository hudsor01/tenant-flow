import {
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Badge } from "#components/ui/badge";

import { type ChartConfig, ChartContainer } from "#components/ui/chart";
import { ChartTooltipContent } from "#components/ui/chart-tooltip";
import { Empty, EmptyDescription, EmptyHeader } from "#components/ui/empty";
import type {
	MaintenanceCostBreakdownEntry,
	MaintenanceTrendPoint,
} from "#types/analytics";

const trendConfig = {
	completed: {
		label: "Completed",
		color: "var(--color-success-text)",
	},
	pending: {
		label: "Pending",
		color: "var(--color-warning-text)",
	},
} satisfies ChartConfig;

const costConfig = {
	amount: {
		label: "Cost",
		color: "var(--color-chart-1)",
	},
} satisfies ChartConfig;

type MaintenanceTrendChartProps = {
	/** null: the server cannot report the trends yet (no series, not zeros). */
	points: MaintenanceTrendPoint[] | null;
};

type MaintenanceCostChartProps = {
	entries: MaintenanceCostBreakdownEntry[];
	/** false: the server cannot report the costs yet (no figure, not $0). */
	available: boolean;
};

/** "2026-10" as the axis prints it: "Oct". */
function monthTick(period: string): string {
	const at = Date.parse(`${period}-01T00:00:00Z`);
	return Number.isNaN(at)
		? period
		: new Intl.DateTimeFormat("en-US", {
				month: "short",
				timeZone: "UTC",
			}).format(at);
}

/** "2026-10" as the tooltip names it: "Oct 2026". */
function monthLabel(period: string): string {
	const at = Date.parse(`${period}-01T00:00:00Z`);
	return Number.isNaN(at)
		? period
		: new Intl.DateTimeFormat("en-US", {
				month: "short",
				year: "numeric",
				timeZone: "UTC",
			}).format(at);
}

function ChartEmpty({ badge, children }: { badge: string; children: string }) {
	return (
		<Empty className="flex-none h-60 gap-3 rounded-lg border border-dashed p-6">
			<EmptyHeader>
				<Badge variant="outline" className="mb-1">
					{badge}
				</Badge>
				<EmptyDescription>{children}</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}

export function MaintenanceTrendChart({ points }: MaintenanceTrendChartProps) {
	if (points === null) {
		return (
			<ChartEmpty badge="Unavailable">
				Request trends aren&apos;t available yet.
			</ChartEmpty>
		);
	}
	if (points.every((point) => point.completed === 0 && point.pending === 0)) {
		return (
			<ChartEmpty badge="No data">
				No maintenance requests in the last 12 months.
			</ChartEmpty>
		);
	}

	const chartData = points.map((point) => ({
		period: point.period,
		completed: point.completed,
		pending: point.pending,
	}));

	return (
		<ChartContainer className="aspect-auto h-75 w-full" config={trendConfig}>
			<LineChart data={chartData}>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis
					dataKey="period"
					tickLine={false}
					axisLine={false}
					tickFormatter={monthTick}
				/>
				<YAxis tickLine={false} axisLine={false} allowDecimals={false} />
				<Tooltip
					content={
						<ChartTooltipContent
							indicator="line"
							labelFormatter={(value) => monthLabel(String(value))}
						/>
					}
				/>
				<Line
					type="monotone"
					dataKey="completed"
					stroke="var(--color-completed)"
					strokeWidth={2}
					dot={false}
				/>
				<Line
					type="monotone"
					dataKey="pending"
					stroke="var(--color-pending)"
					strokeWidth={2}
					dot={false}
				/>
			</LineChart>
		</ChartContainer>
	);
}

export function MaintenanceCostChart({
	entries,
	available,
}: MaintenanceCostChartProps) {
	if (!available) {
		return (
			<ChartEmpty badge="Unavailable">
				Maintenance costs aren&apos;t available yet.
			</ChartEmpty>
		);
	}
	if (!entries.length) {
		return (
			<ChartEmpty badge="No data">
				No maintenance expenses recorded yet.
			</ChartEmpty>
		);
	}

	const chartData = entries.map((entry) => ({
		category: entry.category,
		amount: entry.amount,
	}));

	return (
		<ChartContainer className="aspect-auto h-75 w-full" config={costConfig}>
			<BarChart data={chartData}>
				<CartesianGrid strokeDasharray="3 3" vertical={false} />
				<XAxis
					dataKey="category"
					tickLine={false}
					axisLine={false}
					interval={0}
					angle={-20}
					textAnchor="end"
					height={80}
				/>
				<YAxis tickLine={false} axisLine={false} />
				<Tooltip content={<ChartTooltipContent />} />
				<Bar
					dataKey="amount"
					fill="var(--color-amount)"
					radius={[6, 6, 0, 0]}
				/>
			</BarChart>
		</ChartContainer>
	);
}
