"use client";

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { type ChartConfig, ChartContainer } from "#components/ui/chart";
import {
	ChartTooltip,
	ChartTooltipContent,
} from "#components/ui/chart-tooltip";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#components/ui/empty";
import type { NetOperatingIncomeByProperty } from "#types/analytics";

const noiConfig = {
	noi: { label: "NOI", color: "var(--color-chart-1)" },
} satisfies ChartConfig;

type NetOperatingIncomeChartProps = { data: NetOperatingIncomeByProperty[] };

export function NetOperatingIncomeChart({
	data,
}: NetOperatingIncomeChartProps) {
	if (!data || data.length === 0) {
		return (
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<TrendingUp />
					</EmptyMedia>
					<EmptyTitle>No financial data</EmptyTitle>
					<EmptyDescription>
						Financial trends will appear once transactions are recorded
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	const chartData = data.map((item) => ({
		property: item.propertyName,
		noi: item.noi,
	}));

	return (
		<ChartContainer className="aspect-auto h-80 w-full" config={noiConfig}>
			<BarChart data={chartData}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="property"
					tickLine={false}
					axisLine={false}
					interval={0}
					angle={-30}
					textAnchor="end"
					height={80}
					tickMargin={8}
				/>
				<YAxis tickLine={false} axisLine={false} />
				<ChartTooltip
					cursor={false}
					content={<ChartTooltipContent hideLabel />}
				/>
				<Bar dataKey="noi" fill="var(--color-noi)" radius={[6, 6, 0, 0]} />
			</BarChart>
		</ChartContainer>
	);
}
