import { ChartAreaInteractive } from '@/components/dashboard/chart-area-interactive'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardAction,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { getAnalyticsPageData } from '@/lib/api/dashboard-server'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import { Calendar, TrendingDown, TrendingUp } from 'lucide-react'

export default async function AnalyticsPage() {
	// Fetch real dashboard data from API server-side (includes NOI calculations from backend)
	const {
		dashboardStats: dashboardData,
		propertyPerformance: propertyData,
		financialStats
	} = await getAnalyticsPageData()

	const revenueGrowth = dashboardData?.revenue?.growth || 0
	const occupancyChange = dashboardData?.units?.occupancyChange || 0
	const avgRoi = financialStats?.avgRoi || 0

	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			{/* Top Metric Cards Section - Matching Dashboard */}
			<div
				className="border-b bg-background p-6 border-[var(--color-fill-tertiary)]"
			>
				<div className="mx-auto max-w-400 py-4">
					<div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
						{/* Total Revenue */}
						<Card className="@container/card">
							<CardHeader>
								<CardDescription>Total Revenue</CardDescription>
								<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
									{dashboardData?.revenue?.yearly
										? formatCurrency(dashboardData.revenue.yearly)
										: '$0'}
								</CardTitle>
								<CardAction>
									<Badge variant="outline">
										{revenueGrowth >= 0 ? <TrendingUp /> : <TrendingDown />}
										{formatPercentage(revenueGrowth)}
									</Badge>
								</CardAction>
							</CardHeader>
							<CardFooter className="flex-col items-start gap-1.5 text-sm">
								<div className="line-clamp-1 flex gap-2 font-medium">
									{revenueGrowth >= 0 ? (
										<>
											Strong growth <TrendingUp className="size-4" />
										</>
									) : (
										<>
											Declining <TrendingDown className="size-4" />
										</>
									)}
								</div>
								<div className="text-muted-foreground">
									Annual revenue across all properties
								</div>
							</CardFooter>
						</Card>

						{/* Avg Occupancy */}
						<Card className="@container/card">
							<CardHeader>
								<CardDescription>Avg Occupancy</CardDescription>
								<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
									{dashboardData?.units?.occupancyRate
										? `${dashboardData.units.occupancyRate.toFixed(1)}%`
										: '0.0%'}
								</CardTitle>
								<CardAction>
									<Badge variant="outline">
										{occupancyChange >= 0 ? <TrendingUp /> : <TrendingDown />}
										{formatPercentage(occupancyChange)}
									</Badge>
								</CardAction>
							</CardHeader>
							<CardFooter className="flex-col items-start gap-1.5 text-sm">
								<div className="line-clamp-1 flex gap-2 font-medium">
									{occupancyChange >= 0 ? (
										<>
											Improving <TrendingUp className="size-4" />
										</>
									) : (
										<>
											Declining <TrendingDown className="size-4" />
										</>
									)}
								</div>
								<div className="text-muted-foreground">
									Average occupancy rate across portfolio
								</div>
							</CardFooter>
						</Card>

						{/* Net Operating Income */}
						<Card className="@container/card">
							<CardHeader>
								<CardDescription>Net Operating Income</CardDescription>
								<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
									{formatCurrency(financialStats?.netIncome || 0)}
								</CardTitle>
								<CardAction>
									<Badge variant="outline">
										{avgRoi >= 0 ? <TrendingUp /> : <TrendingDown />}
										{formatPercentage(avgRoi)}
									</Badge>
								</CardAction>
							</CardHeader>
							<CardFooter className="flex-col items-start gap-1.5 text-sm">
								<div className="line-clamp-1 flex gap-2 font-medium">
									{avgRoi >= 0 ? (
										<>
											Positive ROI <TrendingUp className="size-4" />
										</>
									) : (
										<>
											Negative ROI <TrendingDown className="size-4" />
										</>
									)}
								</div>
								<div className="text-muted-foreground">
									{(financialStats?.avgRoi || 0).toFixed(1)}% average return
								</div>
							</CardFooter>
						</Card>

						{/* Portfolio Growth */}
						<Card className="@container/card">
							<CardHeader>
								<CardDescription>Portfolio Growth</CardDescription>
								<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
									{dashboardData?.properties?.total || 0}
								</CardTitle>
								<CardAction>
									<Badge variant="outline">
										<TrendingUp />
										Growing
									</Badge>
								</CardAction>
							</CardHeader>
							<CardFooter className="flex-col items-start gap-1.5 text-sm">
								<div className="line-clamp-1 flex gap-2 font-medium">
									Expanding portfolio <TrendingUp className="size-4" />
								</div>
								<div className="text-muted-foreground">
									Total properties managed
								</div>
							</CardFooter>
						</Card>
					</div>
				</div>
			</div>

			{/* Main Content Section - Matching Dashboard */}
			<div className="flex-1 p-6 pt-6 pb-6">
				<div className="mx-auto max-w-400 space-y-8">
					{/* Charts Section */}
					<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
						{/* Revenue Trend Chart */}
						<Card>
							<CardHeader className="pb-4">
								<div className="space-y-1">
									<CardTitle>Revenue & Expenses Trend</CardTitle>
									<CardDescription>
										6-month performance overview
									</CardDescription>
								</div>
							</CardHeader>
							<div className="px-6 pb-6">
								<div className="flex items-center gap-4 mb-4">
									<div className="flex items-center gap-2">
										<div className="size-3 rounded-full bg-chart-3"></div>
										<span className="text-sm text-muted-foreground">
											Revenue
										</span>
									</div>
									<div className="flex items-center gap-2">
										<div className="size-3 rounded-full bg-chart-5"></div>
										<span className="text-sm text-muted-foreground">
											Expenses
										</span>
									</div>
								</div>
								<ChartAreaInteractive />
							</div>
						</Card>

						{/* Top Performing Properties */}
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
								<div className="space-y-1">
									<CardTitle>Top Performing Properties</CardTitle>
									<CardDescription>Ranked by monthly revenue</CardDescription>
								</div>
								<Button variant="ghost" size="sm">
									<Calendar className="size-4 mr-2" />
									This Month
								</Button>
							</CardHeader>
							<div className="px-6 pb-6">
								<div className="space-y-4">
									{(propertyData || [])
										.slice(0, 5)
										.map((property, index: number) => (
											<div
												key={index}
												className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
											>
												<div className="flex items-center gap-3">
													<div className="size-8 rounded-full bg-background border flex items-center justify-center font-semibold text-sm">
														{index + 1}
													</div>
													<div>
														<p className="font-medium">
															{property.property || 'Unknown Property'}
														</p>
														<p className="text-sm text-muted-foreground">
															{property.occupiedUnits || 0}/
															{property.totalUnits || 0} units occupied
														</p>
													</div>
												</div>
												<Badge
													variant={
														(property.occupancyRate || 0) >= 90
															? 'default'
															: 'destructive'
													}
													className="text-xs"
												>
													{(property.occupancyRate || 0) >= 90 ? (
														<TrendingUp className="size-3 mr-1" />
													) : (
														<TrendingDown className="size-3 mr-1" />
													)}
													{property.occupancyRate
														? `${property.occupancyRate.toFixed(1)}%`
														: '0.0%'}
												</Badge>
											</div>
										))}
								</div>
							</div>
						</Card>
					</div>
				</div>
			</div>
		</div>
	)
}
