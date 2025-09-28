'use client'

import * as React from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import type { ChartConfig } from '@/components/ui/chart'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent
} from '@/components/ui/chart'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useIsMobile } from '@/hooks/use-mobile'
import { useFinancialChartData } from '@/hooks/api/use-dashboard'
import { cn } from '@/lib/utils'

export const description = 'Revenue vs Expenses Chart - Dashboard Focal Point'

const chartConfig = {
	revenue: {
		label: 'Revenue',
		color: 'hsl(var(--chart-1))'
	},
	expenses: {
		label: 'Expenses',
		color: 'hsl(var(--chart-2))'
	}
} satisfies ChartConfig

export function ChartAreaInteractive({
	className
}: {
	className?: string
} = {}) {
	const [timeRange, setTimeRange] = React.useState('6m')
	const isMobile = useIsMobile()

	// Fetch financial data with TanStack Query
	const { data: chartData, isLoading, error } = useFinancialChartData(timeRange)

	// Automatically switch to mobile-friendly time range
	React.useEffect(() => {
		if (isMobile && timeRange === '1y') {
			setTimeRange('6m')
		}
	}, [isMobile, timeRange])

	// Calculate summary metrics
	const totalRevenue = chartData?.reduce((sum, item) => sum + item.revenue, 0) || 0
	const totalExpenses = chartData?.reduce((sum, item) => sum + item.expenses, 0) || 0
	const netProfit = totalRevenue - totalExpenses
	const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

	return (
		<Card className={cn('', className)}>
			<CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
				<div className="grid flex-1 gap-1 text-center sm:text-left">
					<CardTitle className="flex items-center gap-2">
						<DollarSign className="h-5 w-5" />
						Revenue vs Expenses
					</CardTitle>
					<CardDescription>
						Financial performance over the selected period
					</CardDescription>
				</div>
				<div className="flex">
					{isMobile ? (
						<Select value={timeRange} onValueChange={setTimeRange}>
							<SelectTrigger
								className="w-[160px] rounded-lg sm:ml-auto"
								aria-label="Select time range"
							>
								<SelectValue placeholder="Last 6 months" />
							</SelectTrigger>
							<SelectContent className="rounded-xl">
								<SelectItem value="7d" className="rounded-lg">
									Last 7 days
								</SelectItem>
								<SelectItem value="30d" className="rounded-lg">
									Last 30 days
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
							onValueChange={value => value && setTimeRange(value)}
							className="ml-auto flex gap-2"
						>
							<ToggleGroupItem
								value="7d"
								className="rounded-lg px-3 text-sm data-[state=on]:bg-card-foreground data-[state=on]:text-card"
								aria-label="Last 7 days"
							>
								7D
							</ToggleGroupItem>
							<ToggleGroupItem
								value="30d"
								className="rounded-lg px-3 text-sm data-[state=on]:bg-card-foreground data-[state=on]:text-card"
								aria-label="Last 30 days"
							>
								30D
							</ToggleGroupItem>
							<ToggleGroupItem
								value="6m"
								className="rounded-lg px-3 text-sm data-[state=on]:bg-card-foreground data-[state=on]:text-card"
								aria-label="Last 6 months"
							>
								6M
							</ToggleGroupItem>
							<ToggleGroupItem
								value="1y"
								className="rounded-lg px-3 text-sm data-[state=on]:bg-card-foreground data-[state=on]:text-card"
								aria-label="Last year"
							>
								1Y
							</ToggleGroupItem>
						</ToggleGroup>
					)}
				</div>
			</CardHeader>

			{/* Summary metrics */}
			<div className="grid grid-cols-2 gap-4 p-6 pb-0 lg:grid-cols-4">
				<div className="space-y-1">
					<p className="text-sm text-muted-foreground">Total Revenue</p>
					<p className="text-lg font-semibold" style={{ color: 'var(--color-metric-success)' }}>
						${totalRevenue.toLocaleString()}
					</p>
				</div>
				<div className="space-y-1">
					<p className="text-sm text-muted-foreground">Total Expenses</p>
					<p className="text-lg font-semibold" style={{ color: 'var(--color-metric-warning)' }}>
						${totalExpenses.toLocaleString()}
					</p>
				</div>
				<div className="space-y-1">
					<p className="text-sm text-muted-foreground">Net Profit</p>
					<p className="text-lg font-semibold flex items-center gap-1" style={{ color: netProfit >= 0 ? 'var(--color-metric-success)' : 'var(--color-metric-warning)' }}>
						{netProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
						${Math.abs(netProfit).toLocaleString()}
					</p>
				</div>
				<div className="space-y-1">
					<p className="text-sm text-muted-foreground">Profit Margin</p>
					<p className="text-lg font-semibold" style={{ color: profitMargin >= 0 ? 'var(--color-metric-success)' : 'var(--color-metric-warning)' }}>
						{profitMargin.toFixed(1)}%
					</p>
				</div>
			</div>

			<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
				{isLoading ? (
					<div className="flex items-center justify-center h-[300px]">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
					</div>
				) : error ? (
					<div className="flex items-center justify-center h-[300px] text-muted-foreground">
						Failed to load chart data
					</div>
				) : (
					<ChartContainer
						config={chartConfig}
						className="aspect-auto h-[300px] w-full"
					>
						<AreaChart data={chartData}>
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
								tickFormatter={value => `$${(value / 1000).toFixed(0)}k`}
							/>
							<ChartTooltip
								cursor={false}
								content={
									<ChartTooltipContent
										labelFormatter={value => value}
										formatter={(value, name) => [
											`$${Number(value).toLocaleString()}`,
											name === 'revenue' ? 'Revenue' : 'Expenses'
										]}
										indicator="dot"
									/>
								}
							/>
							<Area
								dataKey="expenses"
								type="natural"
								fill="url(#fillExpenses)"
								stroke="var(--color-expenses)"
								strokeWidth={2}
							/>
							<Area
								dataKey="revenue"
								type="natural"
								fill="url(#fillRevenue)"
								stroke="var(--color-revenue)"
								strokeWidth={2}
							/>
						</AreaChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	)
}