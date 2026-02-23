'use client'

import { Card } from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'
import {
	Area,
	AreaChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts'
import type { RevenueData } from '@repo/shared/types/reports'
import { formatCurrency } from '#lib/formatters/currency'

const formatWholeAmount = (value: number) =>
	formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })

interface AnalyticsRevenueChartProps {
	revenueData: RevenueData[] | undefined
	isLoading: boolean
}

export function AnalyticsRevenueChart({
	revenueData,
	isLoading
}: AnalyticsRevenueChartProps) {
	return (
		<Card className="@container/card">
			<div className="p-6 border-b">
				<h2 className="typography-h4">Monthly Revenue Trend</h2>
				<p className="text-muted-foreground text-sm">
					Revenue, expenses, and profit over time
				</p>
			</div>
			<div className="p-6">
				{isLoading ? (
					<Skeleton className="h-80 w-full" />
				) : revenueData && revenueData.length > 0 ? (
					<ResponsiveContainer width="100%" height={320}>
						<AreaChart data={revenueData}>
							<defs>
								<linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
									<stop
										offset="5%"
										stopColor="var(--chart-1)"
										stopOpacity={0.3}
									/>
									<stop
										offset="95%"
										stopColor="var(--chart-1)"
										stopOpacity={0}
									/>
								</linearGradient>
								<linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
									<stop
										offset="5%"
										stopColor="var(--chart-3)"
										stopOpacity={0.3}
									/>
									<stop
										offset="95%"
										stopColor="var(--chart-3)"
										stopOpacity={0}
									/>
								</linearGradient>
							</defs>
							<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
							<XAxis
								dataKey="month"
								className="text-xs"
								tick={{ fill: 'var(--color-muted-foreground)' }}
							/>
							<YAxis
								className="text-xs"
								tick={{ fill: 'var(--color-muted-foreground)' }}
								tickFormatter={formatWholeAmount}
							/>
							<Tooltip
								contentStyle={{
									backgroundColor: 'var(--color-background)',
									border: '1px solid var(--color-border)',
									borderRadius: '2px'
								}}
								formatter={value => {
									const numericValue = Array.isArray(value)
										? Number(value[0])
										: Number(value)
									return formatWholeAmount(
										Number.isFinite(numericValue) ? numericValue : 0
									)
								}}
							/>
							<Legend />
							<Area
								type="monotone"
								dataKey="revenue"
								stroke="var(--chart-1)"
								fillOpacity={1}
								fill="url(#colorRevenue)"
								name="Revenue"
							/>
							<Area
								type="monotone"
								dataKey="profit"
								stroke="var(--chart-3)"
								fillOpacity={1}
								fill="url(#colorProfit)"
								name="Profit"
							/>
						</AreaChart>
					</ResponsiveContainer>
				) : (
					<div className="h-80 flex-center text-muted-foreground">
						No revenue data available
					</div>
				)}
			</div>
		</Card>
	)
}
