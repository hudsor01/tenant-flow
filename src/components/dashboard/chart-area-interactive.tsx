"use client";

import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
	chartLineKey,
	moneyTooltipFormatter,
	SECOND_SERIES_DASH,
} from "#components/shared/chart-series";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#components/ui/card";
import type { ChartConfig } from "#components/ui/chart";
import { ChartContainer } from "#components/ui/chart";
import {
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "#components/ui/chart-tooltip";
import { Empty, EmptyDescription, EmptyTitle } from "#components/ui/empty";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "#components/ui/toggle-group";
import {
	type FinancialTimeRange,
	useFinancialChartData,
} from "#hooks/api/use-owner-dashboard-financial";
import { useMediaQuery } from "#hooks/use-media-query";
import { cn } from "#lib/utils";
import { formatCurrency } from "#lib/utils/currency";

/** The chart's figures are whole dollars, as its axis and tooltip read. */
const WHOLE_DOLLARS = { minimumFractionDigits: 0, maximumFractionDigits: 0 };

/**
 * get_revenue_trends_optimized's revenue is each month's lease rent: scheduled
 * rent, not money received (as the financial analytics page's month charts
 * name it), so its totals are scheduled too. The expenses area is dashed, and
 * the legend's keys draw each line, so the two differ by more than hue
 * (WCAG 1.4.1).
 */
const chartConfig = {
	revenue: {
		label: "Scheduled Rent",
		color: "var(--color-chart-1)",
		icon: chartLineKey("var(--color-chart-1)"),
	},
	expenses: {
		label: "Expenses",
		color: "var(--color-chart-4)",
		icon: chartLineKey("var(--color-chart-4)", SECOND_SERIES_DASH),
	},
} satisfies ChartConfig;

export function ChartAreaInteractive({
	className,
}: {
	className?: string;
} = {}) {
	const [timeRange, setTimeRange] = useState<FinancialTimeRange>("6m");
	const isMobile = useMediaQuery("(max-width: 767px)");

	const {
		data: chartData,
		isLoading,
		error,
	} = useFinancialChartData(timeRange);

	useEffect(() => {
		if (isMobile && timeRange === "1y") {
			setTimeRange("6m");
		}
	}, [isMobile, timeRange]);

	const totalRevenue =
		chartData?.reduce((sum, item) => sum + item.revenue, 0) || 0;
	const totalExpenses =
		chartData?.reduce((sum, item) => sum + item.expenses, 0) || 0;
	const netProfit = totalRevenue - totalExpenses;
	const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

	return (
		<Card className={cn("@container/chart-card", className)}>
			<CardHeader className="flex flex-col items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
				<div className="grid flex-1 gap-1 text-center sm:text-left">
					<CardTitle className="flex items-center gap-2">
						<DollarSign className="size-5" />
						Scheduled Rent & Expenses
					</CardTitle>
					<CardDescription>
						Each month&apos;s scheduled rent (not received) and expenses
					</CardDescription>
				</div>
				<div className="flex">
					{isMobile ? (
						<Select
							value={timeRange}
							onValueChange={(value) =>
								setTimeRange(value as FinancialTimeRange)
							}
						>
							<SelectTrigger
								className="w-40 rounded-lg sm:ml-auto"
								aria-label="Select time range"
							>
								<SelectValue placeholder="Last 6 months" />
							</SelectTrigger>
							<SelectContent className="rounded-xl">
								<SelectItem value="3m" className="rounded-lg">
									Last 3 months
								</SelectItem>
								<SelectItem value="6m" className="rounded-lg">
									Last 6 months
								</SelectItem>
								<SelectItem value="1y" className="rounded-lg">
									Last year
								</SelectItem>
							</SelectContent>
						</Select>
					) : (
						<ToggleGroup
							type="single"
							value={timeRange}
							onValueChange={(value) =>
								value && setTimeRange(value as FinancialTimeRange)
							}
							className="ml-auto flex gap-2"
						>
							<ToggleGroupItem
								value="3m"
								className="rounded-lg px-3 text-sm data-[state=on]:bg-card-foreground data-[state=on]:text-card"
								aria-label="3M, last 3 months"
							>
								3M
							</ToggleGroupItem>
							<ToggleGroupItem
								value="6m"
								className="rounded-lg px-3 text-sm data-[state=on]:bg-card-foreground data-[state=on]:text-card"
								aria-label="6M, last 6 months"
							>
								6M
							</ToggleGroupItem>
							<ToggleGroupItem
								value="1y"
								className="rounded-lg px-3 text-sm data-[state=on]:bg-card-foreground data-[state=on]:text-card"
								aria-label="1Y, last year"
							>
								1Y
							</ToggleGroupItem>
						</ToggleGroup>
					)}
				</div>
			</CardHeader>

			{/* Summary metrics: four columns only when the card itself is wide
			    enough for four amounts (the analytics overview places it in a
			    narrow column, where four overflowed). mb-0 on each figure: the
			    last child of a grid item, where the base `p` margin stays inside
			    the cell, 16px under the row. */}
			<div className="grid grid-cols-2 gap-4 p-6 pb-0 lg:@xl/chart-card:grid-cols-4">
				<div className="space-y-1">
					<p className="text-muted-foreground">Scheduled Rent</p>
					<p className="mb-0 typography-large text-success-text">
						{formatCurrency(totalRevenue, WHOLE_DOLLARS)}
					</p>
				</div>
				<div className="space-y-1">
					<p className="text-muted-foreground">Total Expenses</p>
					<p className="mb-0 typography-large text-warning-text">
						{formatCurrency(totalExpenses, WHOLE_DOLLARS)}
					</p>
				</div>
				<div className="space-y-1">
					<p className="text-muted-foreground">Scheduled Net</p>
					<p
						className={cn(
							"mb-0 flex items-center gap-1 typography-large",
							netProfit >= 0 ? "text-success-text" : "text-warning-text",
						)}
					>
						{netProfit >= 0 ? (
							<TrendingUp className="size-4" />
						) : (
							<TrendingDown className="size-4" />
						)}
						{formatCurrency(netProfit, WHOLE_DOLLARS)}
					</p>
				</div>
				<div className="space-y-1">
					<p className="text-muted-foreground">Scheduled Margin</p>
					<p
						className={cn(
							"mb-0 typography-large",
							profitMargin >= 0 ? "text-success-text" : "text-warning-text",
						)}
					>
						{profitMargin.toFixed(1)}%
					</p>
				</div>
			</div>

			{/* The Card's gap-6 spaces the chart from the totals above: a v3
			    pt-4 / sm:pt-6 here added 16 / 24px more. */}
			<CardContent className="px-2 sm:px-6">
				{isLoading ? (
					<div className="flex-center h-75">
						<div className="animate-spin rounded-full size-11 border-b-2 border-primary"></div>
					</div>
				) : error ? (
					// mb-0: flex items, so the base `p` margin would add 16px to the
					// gap and hold the message 8px above centre.
					<div className="flex flex-col items-center justify-center h-75 gap-2">
						<p className="mb-0 typography-small text-muted-foreground">
							Failed to load chart data
						</p>
						<p className="mb-0 text-caption text-muted-foreground">
							Unable to fetch financial data. Please try refreshing the page.
						</p>
					</div>
				) : !chartData ||
					!Array.isArray(chartData) ||
					chartData.length === 0 ? (
					<Empty className="h-75 flex-center">
						<EmptyTitle>No data available</EmptyTitle>
						<EmptyDescription>
							Add properties and tenants to see financial trends
						</EmptyDescription>
					</Empty>
				) : (
					<ChartContainer
						config={chartConfig}
						className="aspect-auto h-75 w-full"
					>
						<AreaChart data={chartData}>
							<defs>
								<linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
									<stop
										offset="5%"
										stopColor="var(--color-chart-1)"
										stopOpacity={0.8}
									/>
									<stop
										offset="95%"
										stopColor="var(--color-chart-1)"
										stopOpacity={0.1}
									/>
								</linearGradient>
								<linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
									<stop
										offset="5%"
										stopColor="var(--color-chart-4)"
										stopOpacity={0.8}
									/>
									<stop
										offset="95%"
										stopColor="var(--color-chart-4)"
										stopOpacity={0.1}
									/>
								</linearGradient>
							</defs>
							<CartesianGrid vertical={false} />
							<XAxis
								dataKey="date"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								minTickGap={32}
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								tickFormatter={(value) =>
									`${formatCurrency(value / 1000, WHOLE_DOLLARS)}k`
								}
							/>
							<ChartTooltip
								cursor={false}
								content={
									<ChartTooltipContent
										labelFormatter={(value) => value}
										formatter={moneyTooltipFormatter(
											chartConfig,
											WHOLE_DOLLARS,
										)}
										indicator="dot"
									/>
								}
							/>
							<Area
								dataKey="expenses"
								type="natural"
								fill="url(#fillExpenses)"
								stroke="var(--color-chart-4)"
								strokeWidth={2}
								strokeDasharray={SECOND_SERIES_DASH}
							/>
							<Area
								dataKey="revenue"
								type="natural"
								fill="url(#fillRevenue)"
								stroke="var(--color-chart-1)"
								strokeWidth={2}
							/>
							<ChartLegend content={<ChartLegendContent />} />
						</AreaChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}
