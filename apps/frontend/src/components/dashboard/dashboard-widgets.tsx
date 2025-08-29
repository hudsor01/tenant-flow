"use client"

import { Suspense } from 'react'
import { motion } from 'framer-motion'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardOverview } from '@/hooks/api/use-dashboard'
import { cn } from '@/lib/utils'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { MiniBarChart } from '@/components/charts/mini-bar-chart'
import { Sparkline } from '@/components/charts/sparkline'

// Mock data for enhanced widgets (replace with real data)
const recentActivity = [
	{
		id: 1,
		type: 'lease_signed',
		title: 'New lease signed',
		description: 'John Doe signed lease for Sunset Apartments Unit 4A',
		time: '2 hours ago',
		icon: 'i-lucide-check-circle-2',
		color: 'green'
	},
	{
		id: 2,
		type: 'maintenance_request',
		title: 'Maintenance request',
		description: 'Plumbing issue reported at Oakwood Complex',
		time: '4 hours ago',
		icon: 'i-lucide-alert-triangle',
		color: 'orange'
	},
	{
		id: 3,
		type: 'payment_received',
		title: 'Payment received',
		description: '$2,400 rent payment from Maple Heights',
		time: '6 hours ago',
		icon: 'i-lucide-dollar-sign',
		color: 'blue'
	},
	{
		id: 4,
		type: 'tenant_inquiry',
		title: 'New tenant inquiry',
		description: 'Jane Smith inquired about Garden View Unit 2B',
		time: '8 hours ago',
		icon: 'i-lucide-users',
		color: 'purple'
	}
]

const upcomingTasks = [
	{
		id: 1,
		title: 'Property_ inspection due',
		property: 'Sunset Apartments',
		dueDate: 'Tomorrow',
		priority: 'high',
		type: 'inspection'
	},
	{
		id: 2,
		title: 'Lease renewal reminder',
		property: 'Oakwood Complex',
		dueDate: 'In 3 days',
		priority: 'medium',
		type: 'lease'
	},
	{
		id: 3,
		title: 'Maintenance follow-up',
		property: 'Garden View',
		dueDate: 'Next week',
		priority: 'low',
		type: 'maintenance'
	}
]

const occupancyData = [
	{ name: 'Sunset Apartments', occupied: 28, total: 30, rate: 93 },
	{ name: 'Oakwood Complex', occupied: 22, total: 24, rate: 92 },
	{ name: 'Garden View', occupied: 14, total: 16, rate: 88 },
	{ name: 'Maple Heights', occupied: 18, total: 20, rate: 90 }
]

// Mock financial chart data (replace with real data)
const financialChartData = [
	{ month: 'Jan', revenue: 22000, expenses: 8200, netIncome: 13800 },
	{ month: 'Feb', revenue: 23400, expenses: 8600, netIncome: 14800 },
	{ month: 'Mar', revenue: 24100, expenses: 7800, netIncome: 16300 },
	{ month: 'Apr', revenue: 25200, expenses: 8400, netIncome: 16800 },
	{ month: 'May', revenue: 24800, expenses: 8100, netIncome: 16700 },
	{ month: 'Jun', revenue: 24580, expenses: 8240, netIncome: 16340 }
]

// Sparkline trend data
const revenueSparklineData = financialChartData.map((item, _index) => ({
	name: item.month,
	value: item.revenue,
	date: item.month
}))

const expensesSparklineData = financialChartData.map((item, _index) => ({
	name: item.month,
	value: item.expenses,
	date: item.month
}))

const netIncomeSparklineData = financialChartData.map((item, _index) => ({
	name: item.month,
	value: item.netIncome,
	date: item.month
}))

const collectionRateSparklineData = [
	{ name: 'Jan', value: 94.5 },
	{ name: 'Feb', value: 95.2 },
	{ name: 'Mar', value: 94.8 },
	{ name: 'Apr', value: 95.9 },
	{ name: 'May', value: 96.1 },
	{ name: 'Jun', value: 96.8 }
]

// Clean Minimal Financial Chart Component
function FinancialChart() {
	return (
		<ResponsiveContainer width="100%" height="100%">
			<AreaChart
				data={financialChartData}
				margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
			>
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
							stopColor="hsl(var(--chart-1))"
							stopOpacity={0.2}
						/>
						<stop
							offset="95%"
							stopColor="hsl(var(--chart-1))"
							stopOpacity={0.02}
						/>
					</linearGradient>
					<linearGradient
						id="colorNetIncome"
						x1="0"
						y1="0"
						x2="0"
						y2="1"
					>
						<stop
							offset="5%"
							stopColor="hsl(var(--chart-2))"
							stopOpacity={0.2}
						/>
						<stop
							offset="95%"
							stopColor="hsl(var(--chart-2))"
							stopOpacity={0.02}
						/>
					</linearGradient>
				</defs>
				<Area
					type="monotone"
					dataKey="revenue"
					stroke="hsl(var(--chart-1))"
					strokeWidth={1.5}
					fillOpacity={1}
					fill="url(#colorRevenue)"
				/>
				<Area
					type="monotone"
					dataKey="netIncome"
					stroke="hsl(var(--chart-2))"
					strokeWidth={1.5}
					fillOpacity={1}
					fill="url(#colorNetIncome)"
				/>
			</AreaChart>
		</ResponsiveContainer>
	)
}

// Mini Occupancy Chart Data Helper
function getOccupancyChartData() {
	return occupancyData.map(property => ({
		name: property.name.split(' ')[0] || property.name, // Shorten names for better display
		value: property.rate,
		color:
			property.rate >= 90
				? 'hsl(var(--chart-1))'
				: property.rate >= 80
					? 'hsl(var(--chart-4))'
					: 'hsl(var(--chart-5))'
	}))
}

// Skeleton Components

// Widget Loading Skeleton Component
function WidgetSkeleton() {
	return (
		<Card>
			<CardHeader className="pb-4">
				<div className="flex items-center justify-between">
					<div className="space-y-2">
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-4 w-48" />
					</div>
					<Skeleton className="h-5 w-5 rounded" />
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{Array.from({ length: 3 }).map((_, i) => (
					<div key={i} className="flex items-start gap-3">
						<Skeleton className="h-8 w-8 rounded-full" />
						<div className="flex-1 space-y-2">
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="h-3 w-1/2" />
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	)
}

export function DashboardWidgets() {
	const { data: _stats } = useDashboardOverview()

	return (
		<div className="grid gap-6 lg:grid-cols-3">
			{/* Enhanced Recent Activity Feed with Suspense */}
			<Suspense fallback={<WidgetSkeleton />}>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.1 }}
				>
					<Card className="group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg lg:col-span-1">
						<CardHeader className="pb-4">
							<div className="flex items-center justify-between">
								<div>
									<CardTitle className="group-hover:text-primary text-lg font-semibold transition-colors">
										Recent Activity
									</CardTitle>
									<CardDescription>
										Latest updates across your properties
									</CardDescription>
								</div>
								<motion.div
									animate={{
										rotate: [0, 360]
									}}
									transition={{
										duration: 8,
										repeat: Infinity,
										ease: 'linear'
									}}
								>
									<i className="i-lucide-activity group-hover:text-primary h-5 w-5 text-gray-4 transition-colors"  />
								</motion.div>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							{recentActivity.map((activity, index) => {
								const colorClasses = {
									green: 'text-green-6 bg-gradient-to-br from-green-1 to-green-2',
									orange: 'text-orange-6 bg-gradient-to-br from-orange-1 to-orange-2',
									blue: 'text-primary bg-gradient-to-br from-blue-1 to-blue-2',
									purple: 'text-purple-6 bg-gradient-to-br from-purple-1 to-purple-2'
								}

								return (
									<motion.div
										key={activity.id}
										initial={{ opacity: 0, x: -20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{
											duration: 0.3,
											delay: index * 0.1
										}}
										whileHover={{
											scale: 1.02,
											x: 5,
											transition: { duration: 0.2 }
										}}
										className="group/item flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-all duration-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-1/50"
									>
										<motion.div
											className={cn(
												'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full shadow-sm ring-1 ring-black/5',
												colorClasses[
													activity.color as keyof typeof colorClasses
												]
											)}
											whileHover={{
												scale: 1.1,
												rotate: 5,
												transition: { duration: 0.2 }
											}}
										>
											<i className={`${activity.icon} h-4 w-4`} />
										</motion.div>
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium text-gray-9 transition-colors group-hover/item:text-gray-8">
												{activity.title}
											</p>
											<p className="mt-1 text-xs text-gray-6 transition-colors group-hover/item:text-gray-7">
												{activity.description}
											</p>
											<div className="mt-2 flex items-center justify-between">
												<p className="text-xs text-gray-4 transition-colors group-hover/item:text-gray-6">
													{activity.time}
												</p>
												<motion.div
													initial={{ opacity: 0 }}
													whileHover={{ opacity: 1 }}
													className="opacity-0 transition-opacity group-hover/item:opacity-100"
												>
													<i className="i-lucide-eye h-3 w-3 text-gray-4"  />
												</motion.div>
											</div>
										</div>
									</motion.div>
								)
							})}

							<motion.div
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
							>
								<Button
									variant="ghost"
									className="group w-full text-sm text-gray-6 hover:text-gray-9"
								>
									View all activity
									<motion.div
										animate={{ x: [0, 2, 0] }}
										transition={{
											duration: 2,
											repeat: Infinity,
											ease: 'easeInOut'
										}}
									>
										<i className="i-lucide-arrowupright ml-2 h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"  />
									</motion.div>
								</Button>
							</motion.div>
						</CardContent>
					</Card>
				</motion.div>
			</Suspense>

			{/* Occupancy Overview */}
			<Card className="lg:col-span-1">
				<CardHeader className="pb-4">
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-lg font-semibold">
								Occupancy Overview
							</CardTitle>
							<CardDescription>
								Current occupancy by property
							</CardDescription>
						</div>
						<i className="i-lucide-building-2 h-5 w-5 text-gray-4"  />
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{occupancyData.map(property => (
						<div key={property.name} className="space-y-3">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-9">
										{property.name}
									</p>
									<p className="text-xs text-gray-5">
										{property.occupied}/{property.total}{' '}
										units occupied
									</p>
								</div>
								<div className="flex items-center gap-2">
									<span
										className={cn(
											'text-sm font-semibold',
											property.rate >= 90
												? 'text-green-6'
												: property.rate >= 80
													? 'text-orange-6'
													: 'text-red-6'
										)}
									>
										{property.rate}%
									</span>
									{property.rate >= 90 ? (
										<i className="i-lucide-trending-up h-4 w-4 text-green-6"  />
									) : (
										<i className="i-lucide-trending-down h-4 w-4 text-red-6"  />
									)}
								</div>
							</div>
							<Progress
								value={property.rate}
								className={cn(
									'h-2',
									property.rate >= 90
										? 'bg-green-2'
										: property.rate >= 80
											? 'bg-orange-2'
											: 'bg-red-2'
								)}
							/>
						</div>
					))}

					<div className="space-y-3 border-t border-gray-1 pt-2">
						<div className="flex items-center justify-between text-sm">
							<span className="font-medium text-gray-7">
								Overall Average
							</span>
							<div className="flex items-center gap-2">
								<span className="font-semibold text-green-6">
									{Math.round(
										occupancyData.reduce(
											(acc, p) => acc + p.rate,
											0
										) / occupancyData.length
									)}
									%
								</span>
								<i className="i-lucide-trending-up h-4 w-4 text-green-6"  />
							</div>
						</div>

						{/* Mini occupancy chart */}
						<div className="rounded-lg bg-gray-50 p-2">
							<MiniBarChart
								data={getOccupancyChartData()}
								height={50}
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Upcoming Tasks */}
			<Card className="lg:col-span-1">
				<CardHeader className="pb-4">
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-lg font-semibold">
								Upcoming Tasks
							</CardTitle>
							<CardDescription>
								Important items requiring attention
							</CardDescription>
						</div>
						<i className="i-lucide-clock h-5 w-5 text-gray-4"  />
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{upcomingTasks.map(task => (
						<div
							key={task.id}
							className="flex items-center gap-3 rounded-lg border border-gray-1 p-3 transition-colors hover:border-gray-2"
						>
							<div className="flex-1">
								<div className="mb-1 flex items-center gap-2">
									<p className="text-sm font-medium text-gray-9">
										{task.title}
									</p>
									<Badge
										variant={
											task.priority === 'high'
												? 'destructive'
												: task.priority === 'medium'
													? 'default'
													: 'secondary'
										}
										className="text-xs"
									>
										{task.priority}
									</Badge>
								</div>
								<p className="text-xs text-gray-6">
									{task.property}
								</p>
								<p className="mt-1 text-xs text-gray-4">
									Due {task.dueDate}
								</p>
							</div>
							<Button variant="ghost" size="sm">
								<i className="i-lucide-eye h-4 w-4"  />
							</Button>
						</div>
					))}

					<Button
						variant="ghost"
						className="w-full text-sm text-gray-6 hover:text-gray-9"
					>
						View all tasks
						<i className="i-lucide-calendar ml-2 h-4 w-4"  />
					</Button>
				</CardContent>
			</Card>

			{/* Financial Overview */}
			<Card className="lg:col-span-2">
				<CardHeader className="pb-4">
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-lg font-semibold">
								Financial Overview
							</CardTitle>
							<CardDescription>
								Revenue and expense tracking
							</CardDescription>
						</div>
						<div className="flex items-center gap-2">
							<Button variant="outline" size="sm">
								This Month
							</Button>
							<i className="i-lucide-bar-chart-3 h-5 w-5 text-gray-4"  />
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="mb-6 grid grid-cols-2 gap-6 md:grid-cols-4">
						<div className="space-y-3">
							<div className="space-y-1">
								<p className="text-sm text-gray-5">
									Total Revenue
								</p>
								<p className="text-2xl font-bold text-green-6">
									$24,580
								</p>
							</div>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1 text-xs">
									<i className="i-lucide-arrowupright h-3 w-3 text-green-6"  />
									<span className="text-green-6">
										+12.3%
									</span>
								</div>
								<div className="w-16">
									<Sparkline
										data={revenueSparklineData}
										height={25}
										showTooltip={false}
									/>
								</div>
							</div>
						</div>

						<div className="space-y-3">
							<div className="space-y-1">
								<p className="text-sm text-gray-5">
									Operating Expenses
								</p>
								<p className="text-2xl font-bold text-red-6">
									$8,240
								</p>
							</div>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1 text-xs">
									<i className="i-lucide-arrowdownright h-3 w-3 text-red-6"  />
									<span className="text-red-6">+5.8%</span>
								</div>
								<div className="w-16">
									<Sparkline
										data={expensesSparklineData}
										height={25}
										showTooltip={false}
										color="hsl(var(--chart-5))"
									/>
								</div>
							</div>
						</div>

						<div className="space-y-3">
							<div className="space-y-1">
								<p className="text-sm text-gray-5">
									Net Income
								</p>
								<p className="text-primary text-2xl font-bold">
									$16,340
								</p>
							</div>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1 text-xs">
									<i className="i-lucide-arrowupright text-primary h-3 w-3"  />
									<span className="text-primary">+15.2%</span>
								</div>
								<div className="w-16">
									<Sparkline
										data={netIncomeSparklineData}
										height={25}
										showTooltip={false}
										color="hsl(var(--chart-2))"
									/>
								</div>
							</div>
						</div>

						<div className="space-y-3">
							<div className="space-y-1">
								<p className="text-sm text-gray-5">
									Collection Rate
								</p>
								<p className="text-2xl font-bold text-green-6">
									96.8%
								</p>
							</div>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1 text-xs">
									<i className="i-lucide-arrowupright h-3 w-3 text-green-6"  />
									<span className="text-green-6">
										+2.1%
									</span>
								</div>
								<div className="w-16">
									<Sparkline
										data={collectionRateSparklineData}
										height={25}
										showTooltip={false}
										color="hsl(var(--chart-1))"
									/>
								</div>
							</div>
						</div>
					</div>

					{/* Interactive Revenue Chart */}
					<div className="h-48 rounded-xl border border-gray-2 p-4">
						<FinancialChart />
					</div>
				</CardContent>
			</Card>

			{/* Alerts & Notifications */}
			<Card className="lg:col-span-1">
				<CardHeader className="pb-4">
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-lg font-semibold">
								Alerts
							</CardTitle>
							<CardDescription>
								Items requiring immediate attention
							</CardDescription>
						</div>
						<i className="i-lucide-alert-triangle h-5 w-5 text-orange-4"  />
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-3">
						<div className="flex items-start gap-3 rounded-lg border border-red-2 bg-red-1 p-3">
							<i className="i-lucide-xcircle mt-0.5 h-5 w-5 flex-shrink-0 text-red-6"  />
							<div>
								<p className="text-sm font-medium text-red-9">
									Overdue Rent
								</p>
								<p className="mt-1 text-xs text-red-7">
									3 tenants have overdue payments
								</p>
								<Button
									variant="ghost"
									size="sm"
									className="mt-2 h-auto p-0 text-red-7 hover:text-red-9"
								>
									View details →
								</Button>
							</div>
						</div>

						<div className="flex items-start gap-3 rounded-lg border border-orange-2 bg-orange-1 p-3">
							<i className="i-lucide-alert-triangle mt-0.5 h-5 w-5 flex-shrink-0 text-orange-6"  />
							<div>
								<p className="text-sm font-medium text-orange-9">
									Maintenance Pending
								</p>
								<p className="mt-1 text-xs text-orange-7">
									5 requests awaiting assignment
								</p>
								<Button
									variant="ghost"
									size="sm"
									className="mt-2 h-auto p-0 text-orange-7 hover:text-orange-9"
								>
									Assign now →
								</Button>
							</div>
						</div>

						<div className="flex items-start gap-3 rounded-lg border border-blue-2 bg-blue-1 p-3">
							<i className="i-lucide-calendar text-primary mt-0.5 h-5 w-5 flex-shrink-0"  />
							<div>
								<p className="text-sm font-medium text-blue-9">
									Lease Expiring
								</p>
								<p className="mt-1 text-xs text-blue-7">
									2 leases expire within 30 days
								</p>
								<Button
									variant="ghost"
									size="sm"
									className="mt-2 h-auto p-0 text-blue-7 hover:text-blue-9"
								>
									Schedule renewal →
								</Button>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
