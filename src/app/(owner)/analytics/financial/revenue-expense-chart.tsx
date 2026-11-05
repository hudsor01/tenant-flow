import { DollarSign } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
	moneyAxisTick,
	moneyTooltipFormatter,
} from "#components/shared/chart-series";
import { type ChartConfig, ChartContainer } from "#components/ui/chart";
import {
	ChartLegend,
	ChartLegendContent,
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select";
import type { MonthlyFinancialMetric } from "#types/analytics";

const revenueExpenseConfig = {
	// get_revenue_trends_optimized's revenue is the month's lease rent_amount:
	// scheduled rent, not money received, so its net is scheduled too.
	revenue: { label: "Scheduled Rent", color: "var(--color-success-text)" },
	expenses: { label: "Expenses", color: "var(--color-destructive-text)" },
	netIncome: { label: "Scheduled Net", color: "var(--color-chart-1)" },
} satisfies ChartConfig;

type RevenueExpenseChartProps = { data: MonthlyFinancialMetric[] };

export function RevenueExpenseChart({ data }: RevenueExpenseChartProps) {
	const [timeRange, setTimeRange] = useState("all");

	const chartData = (() => {
		if (!data || data.length === 0) return [];
		return data.map((item) => ({
			month: item.month,
			revenue: item.revenue,
			expenses: item.expenses,
			netIncome: item.netIncome,
		}));
	})();

	const filteredData = (() => {
		if (timeRange === "all" || chartData.length <= 3) return chartData;
		const months =
			timeRange === "3m" ? 3 : timeRange === "6m" ? 6 : chartData.length;
		return chartData.slice(-months);
	})();

	if (!data || data.length === 0) {
		return (
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<DollarSign />
					</EmptyMedia>
					<EmptyTitle>No scheduled rent or expenses</EmptyTitle>
					<EmptyDescription>
						Each month&apos;s scheduled rent and expenses will appear once
						leases and expenses are recorded
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<div className="space-y-4">
			{chartData.length > 3 && (
				<div className="flex justify-end">
					<Select value={timeRange} onValueChange={setTimeRange}>
						<SelectTrigger className="w-40" aria-label="Select time range">
							<SelectValue placeholder="All time" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All time</SelectItem>
							<SelectItem value="6m">Last 6 months</SelectItem>
							<SelectItem value="3m">Last 3 months</SelectItem>
						</SelectContent>
					</Select>
				</div>
			)}
			<ChartContainer
				className="aspect-auto h-80 w-full"
				config={revenueExpenseConfig}
			>
				<AreaChart data={filteredData}>
					<defs>
						<linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
							<stop
								offset="5%"
								stopColor="var(--color-revenue)"
								stopOpacity={0.8}
							/>
							<stop
								offset="95%"
								stopColor="var(--color-revenue)"
								stopOpacity={0.1}
							/>
						</linearGradient>
						<linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
							<stop
								offset="5%"
								stopColor="var(--color-expenses)"
								stopOpacity={0.8}
							/>
							<stop
								offset="95%"
								stopColor="var(--color-expenses)"
								stopOpacity={0.1}
							/>
						</linearGradient>
						<linearGradient id="fillNetIncome" x1="0" y1="0" x2="0" y2="1">
							<stop
								offset="5%"
								stopColor="var(--color-netIncome)"
								stopOpacity={0.8}
							/>
							<stop
								offset="95%"
								stopColor="var(--color-netIncome)"
								stopOpacity={0.1}
							/>
						</linearGradient>
					</defs>
					<CartesianGrid vertical={false} />
					<XAxis
						dataKey="month"
						tickLine={false}
						axisLine={false}
						tickMargin={8}
						minTickGap={32}
					/>
					<YAxis
						tickLine={false}
						axisLine={false}
						tickFormatter={moneyAxisTick}
					/>
					<ChartTooltip
						cursor={false}
						content={
							<ChartTooltipContent
								labelFormatter={(value) => value}
								formatter={moneyTooltipFormatter(revenueExpenseConfig)}
								indicator="dot"
							/>
						}
					/>
					<Area
						type="natural"
						dataKey="revenue"
						fill="url(#fillRevenue)"
						stroke="var(--color-revenue)"
						stackId="a"
					/>
					<Area
						type="natural"
						dataKey="expenses"
						fill="url(#fillExpenses)"
						stroke="var(--color-expenses)"
						stackId="b"
					/>
					<Area
						type="natural"
						dataKey="netIncome"
						fill="url(#fillNetIncome)"
						stroke="var(--color-netIncome)"
					/>
					<ChartLegend content={<ChartLegendContent />} />
				</AreaChart>
			</ChartContainer>
		</div>
	);
}
