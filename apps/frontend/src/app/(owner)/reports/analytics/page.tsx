'use client'

/**
 * Reports Analytics Dashboard
 * Phase 5: Advanced Features - Custom Reports & Analytics
 */

import { Badge } from '#components/ui/badge'
import {
	Card,
	CardAction,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Skeleton } from '#components/ui/skeleton'
import {
	useMonthlyRevenue,
	useOccupancyMetrics,
	usePaymentAnalytics
} from '#hooks/api/use-reports'
import { formatCurrency } from '#lib/formatters/currency'
import { TrendingUp } from 'lucide-react'
import { useState } from 'react'
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts'

// Format currency with no decimals for whole dollar amounts
const formatWholeAmount = (value: number) =>
	formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default function AnalyticsPage() {
	const [timeRange, setTimeRange] = useState('12')

	// Fetch analytics data
	const { data: revenueData, isLoading: revenueLoading } = useMonthlyRevenue(
		parseInt(timeRange, 10)
	)
	const { data: paymentAnalytics, isLoading: paymentsLoading } =
		usePaymentAnalytics()
	const { data: occupancyMetrics, isLoading: occupancyLoading } =
		useOccupancyMetrics()

	// Format percentage
	const formatPercent = (value: number) => {
		return `${value.toFixed(1)}%`
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
				<div>
					<h1 className="text-2xl font-semibold text-foreground">
						Analytics Dashboard
					</h1>
					<p className="text-muted-foreground">
						Real-time insights into revenue, payments, and occupancy metrics.
					</p>
				</div>
				<Select value={timeRange} onValueChange={setTimeRange}>
					<SelectTrigger
						id="time-range"
						className="w-36"
						aria-label="Select time range"
					>
						<SelectValue placeholder="Time Range" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="6">Last 6 months</SelectItem>
						<SelectItem value="12">Last 12 months</SelectItem>
						<SelectItem value="24">Last 24 months</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Stats Row */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
						{paymentsLoading ? (
							<>
								<Skeleton className="h-28" />
								<Skeleton className="h-28" />
								<Skeleton className="h-28" />
								<Skeleton className="h-28" />
							</>
						) : (
							<>
								<Card className="@container/card">
									<CardHeader>
										<CardDescription>Total Revenue</CardDescription>
										<CardTitle className="typography-h3 tabular-nums @[250px]/card:text-3xl">
											{formatWholeAmount(paymentAnalytics?.totalRevenue || 0)}
										</CardTitle>
										<CardAction>
											<Badge variant="outline">
												<TrendingUp />
												All payments
											</Badge>
										</CardAction>
									</CardHeader>
									<CardFooter className="flex-col items-start gap-1.5 text-sm">
										<div className="line-clamp-1 flex gap-2 font-medium">
											Successful collections <TrendingUp className="size-4" />
										</div>
										<div className="text-muted-foreground">
											All successful payments
										</div>
									</CardFooter>
								</Card>

								<Card className="@container/card">
									<CardHeader>
										<CardDescription>Payment Success</CardDescription>
										<CardTitle className="typography-h3 tabular-nums @[250px]/card:text-3xl">
											{formatPercent(
												paymentAnalytics?.totalPayments
													? (paymentAnalytics.successfulPayments /
															paymentAnalytics.totalPayments) *
															100
													: 0
											)}
										</CardTitle>
										<CardAction>
											<Badge variant="outline">
												<TrendingUp />
												{paymentAnalytics?.totalPayments || 0} total
											</Badge>
										</CardAction>
									</CardHeader>
									<CardFooter className="flex-col items-start gap-1.5 text-sm">
										<div className="line-clamp-1 flex gap-2 font-medium">
											Strong performance <TrendingUp className="size-4" />
										</div>
										<div className="text-muted-foreground">
											{paymentAnalytics?.successfulPayments || 0} of{' '}
											{paymentAnalytics?.totalPayments || 0} payments
										</div>
									</CardFooter>
								</Card>

								<Card className="@container/card">
									<CardHeader>
										<CardDescription>Occupancy Rate</CardDescription>
										<CardTitle className="typography-h3 tabular-nums @[250px]/card:text-3xl">
											{formatPercent(occupancyMetrics?.occupancyRate || 0)}
										</CardTitle>
										<CardAction>
											<Badge variant="outline">
												<TrendingUp />
												{occupancyMetrics?.totalUnits || 0} units
											</Badge>
										</CardAction>
									</CardHeader>
									<CardFooter className="flex-col items-start gap-1.5 text-sm">
										<div className="line-clamp-1 flex gap-2 font-medium">
											Portfolio health <TrendingUp className="size-4" />
										</div>
										<div className="text-muted-foreground">
											{occupancyMetrics?.occupiedUnits || 0} of{' '}
											{occupancyMetrics?.totalUnits || 0} units occupied
										</div>
									</CardFooter>
								</Card>

								<Card className="@container/card">
									<CardHeader>
										<CardDescription>ACH Adoption</CardDescription>
										<CardTitle className="typography-h3 tabular-nums @[250px]/card:text-3xl">
											{formatPercent(
												paymentAnalytics?.totalPayments
													? (paymentAnalytics.paymentsByMethod.ach /
															paymentAnalytics.totalPayments) *
															100
													: 0
											)}
										</CardTitle>
										<CardAction>
											<Badge variant="outline">
												<TrendingUp />
												Lower fees
											</Badge>
										</CardAction>
									</CardHeader>
									<CardFooter className="flex-col items-start gap-1.5 text-sm">
										<div className="line-clamp-1 flex gap-2 font-medium">
											Cost savings <TrendingUp className="size-4" />
										</div>
										<div className="text-muted-foreground">
											Bank transfer vs card
										</div>
									</CardFooter>
								</Card>
							</>
						)}
			</div>

			{/* Charts Section */}
			<div className="flex flex-col gap-6">
					{/* Revenue Chart */}
					<Card className="@container/card">
						<div className="p-6 border-b">
							<h2 className="typography-h4">Monthly Revenue Trend</h2>
							<p className="text-muted-foreground text-sm">
								Revenue, expenses, and profit over time
							</p>
						</div>
						<div className="p-6">
							{revenueLoading ? (
								<Skeleton className="h-80 w-full" />
							) : revenueData && revenueData.length > 0 ? (
								<ResponsiveContainer width="100%" height={320}>
									<AreaChart data={revenueData}>
										<defs>
											<linearGradient
												id="colorRevenue"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
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
											<linearGradient
												id="colorProfit"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
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
										<CartesianGrid
											strokeDasharray="3 3"
											className="stroke-muted"
										/>
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

					<div className="grid lg:grid-cols-2 gap-6">
						{/* Payment Methods Breakdown */}
						<Card className="@container/card">
							<div className="p-6 border-b">
								<h2 className="typography-h4">Payment Methods</h2>
								<p className="text-muted-foreground text-sm">
									Distribution by payment type
								</p>
							</div>
							<div className="p-6">
								{paymentsLoading ? (
									<Skeleton className="h-64 w-full" />
								) : paymentAnalytics ? (
									<ResponsiveContainer width="100%" height={256}>
										<BarChart
											data={[
												{
													name: 'Card',
													count: paymentAnalytics.paymentsByMethod.card
												},
												{
													name: 'ACH',
													count: paymentAnalytics.paymentsByMethod.ach
												}
											]}
										>
											<CartesianGrid
												strokeDasharray="3 3"
												className="stroke-muted"
											/>
											<XAxis
												dataKey="name"
												className="text-xs"
												tick={{ fill: 'var(--color-muted-foreground)' }}
											/>
											<YAxis
												className="text-xs"
												tick={{ fill: 'var(--color-muted-foreground)' }}
											/>
											<Tooltip
												contentStyle={{
													backgroundColor: 'var(--color-background)',
													border: '1px solid var(--color-border)',
													borderRadius: '2px'
												}}
											/>
											<Bar dataKey="count" fill="var(--chart-2)" />
										</BarChart>
									</ResponsiveContainer>
								) : (
									<div className="h-64 flex-center text-muted-foreground">
										No payment data available
									</div>
								)}
							</div>
						</Card>

						{/* Occupancy by Property */}
						<Card className="@container/card">
							<div className="p-6 border-b">
								<h2 className="typography-h4">Occupancy by Property</h2>
								<p className="text-muted-foreground text-sm">
									Unit occupancy rates across portfolio
								</p>
							</div>
							<div className="p-6">
								{occupancyLoading ? (
									<Skeleton className="h-64 w-full" />
								) : occupancyMetrics &&
								  occupancyMetrics.byProperty.length > 0 ? (
									<ResponsiveContainer width="100%" height={256}>
										<LineChart data={occupancyMetrics.byProperty}>
											<CartesianGrid
												strokeDasharray="3 3"
												className="stroke-muted"
											/>
											<XAxis
												dataKey="propertyName"
												className="text-xs"
												tick={{ fill: 'var(--color-muted-foreground)' }}
												angle={-45}
												textAnchor="end"
												height={80}
											/>
											<YAxis
												className="text-xs"
												tick={{ fill: 'var(--color-muted-foreground)' }}
												domain={[0, 100]}
												tickFormatter={formatPercent}
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
													return formatPercent(
														Number.isFinite(numericValue) ? numericValue : 0
													)
												}}
											/>
											<Line
												type="monotone"
												dataKey="occupancyRate"
												stroke="var(--chart-4)"
												strokeWidth={2}
												name="Occupancy Rate"
											/>
										</LineChart>
									</ResponsiveContainer>
								) : (
									<div className="h-64 flex-center text-muted-foreground">
										No occupancy data available
									</div>
								)}
							</div>
						</Card>
					</div>

					{/* Property Performance Details */}
					{occupancyMetrics && occupancyMetrics.byProperty.length > 0 && (
						<Card className="@container/card">
							<div className="p-6 border-b">
								<h2 className="typography-h4">Property Details</h2>
								<p className="text-muted-foreground text-sm">
									Individual property performance metrics
								</p>
							</div>
							<div className="p-6">
								<div className="overflow-x-auto">
									<table className="w-full">
										<thead>
											<tr className="border-b">
												<th className="text-left font-semibold p-3">
													Property Name
												</th>
												<th className="text-left font-semibold p-3">
													Total Units
												</th>
												<th className="text-left font-semibold p-3">
													Occupied Units
												</th>
												<th className="text-left font-semibold p-3">
													Occupancy Rate
												</th>
											</tr>
										</thead>
										<tbody>
											{occupancyMetrics.byProperty.map(property => (
												<tr
													key={property.propertyName}
													className="border-b hover:bg-muted/30 transition-colors"
												>
													<td className="p-3 font-medium">
														{property.propertyName}
													</td>
													<td className="p-3 text-muted-foreground">
														{property.totalUnits}
													</td>
													<td className="p-3 text-muted-foreground">
														{property.occupiedUnits}
													</td>
													<td className="p-3">
														<div className="flex items-center gap-2">
															<div className="flex-1 h-2 bg-muted rounded-sm overflow-hidden">
																<div
																	className="h-full bg-chart-4 transition-all"
																	style={{
																		width: `${property.occupancyRate}%`
																	}}
																/>
															</div>
															<span className="typography-small w-12 text-right">
																{formatPercent(property.occupancyRate)}
															</span>
														</div>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						</Card>
					)}
			</div>
		</div>
	)
}
