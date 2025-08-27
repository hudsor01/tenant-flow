import { Suspense } from 'react'
import { motion } from '@/lib/lazy-motion'
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
		icon: CheckCircle2,
		color: 'green'
	},
	{
		id: 2,
		type: 'maintenance_request',
		title: 'Maintenance request',
		description: 'Plumbing issue reported at Oakwood Complex',
		time: '4 hours ago',
		icon: AlertTriangle,
		color: 'orange'
	},
	{
		id: 3,
		type: 'payment_received',
		title: 'Payment received',
		description: '$2,400 rent payment from Maple Heights',
		time: '6 hours ago',
		icon: DollarSign,
		color: 'blue'
	},
	{
		id: 4,
		type: 'tenant_inquiry',
		title: 'New tenant inquiry',
		description: 'Jane Smith inquired about Garden View Unit 2B',
		time: '8 hours ago',
		icon: Users,
		color: 'purple'
	}
]

const upcomingTasks = [
	{
		id: 1,
		title: 'Property inspection due',
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
									<i className="i-lucide-activity inline-block group-hover:text-primary h-5 w-5 text-gray-400 transition-colors"  />
								</motion.div>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							{recentActivity.map((activity, index) => {
								const Icon = activity.icon
								const colorClasses = {
									green: 'text-green-600 bg-gradient-to-br from-green-50 to-green-100',
									orange: 'text-orange-600 bg-gradient-to-br from-orange-50 to-orange-100',
									blue: 'text-primary bg-gradient-to-br from-blue-50 to-blue-100',
									purple: 'text-purple-600 bg-gradient-to-br from-purple-50 to-purple-100'
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
										className="group/item flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-all duration-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100/50"
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
											<Icon className="h-4 w-4" />
										</motion.div>
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium text-gray-900 transition-colors group-hover/item:text-gray-800">
												{activity.title}
											</p>
											<p className="mt-1 text-xs text-gray-600 transition-colors group-hover/item:text-gray-700">
												{activity.description}
											</p>
											<div className="mt-2 flex items-center justify-between">
												<p className="text-xs text-gray-400 transition-colors group-hover/item:text-gray-600">
													{activity.time}
												</p>
												<motion.div
													initial={{ opacity: 0 }}
													whileHover={{ opacity: 1 }}
													className="opacity-0 transition-opacity group-hover/item:opacity-100"
												>
													<i className="i-lucide-eye inline-block h-3 w-3 text-gray-400"  />
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
									className="group w-full text-sm text-gray-600 hover:text-gray-900"
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
										<i className="i-lucide-arrowupright inline-block ml-2 h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"  />
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
						<i className="i-lucide-building-2 inline-block h-5 w-5 text-gray-400"  />
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{occupancyData.map(property => (
						<div key={property.name} className="space-y-3">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-900">
										{property.name}
									</p>
									<p className="text-xs text-gray-500">
										{property.occupied}/{property.total}{' '}
										units occupied
									</p>
								</div>
								<div className="flex items-center gap-2">
									<span
										className={cn(
											'text-sm font-semibold',
											property.rate >= 90
												? 'text-green-600'
												: property.rate >= 80
													? 'text-orange-600'
													: 'text-red-600'
										)}
									>
										{property.rate}%
									</span>
									{property.rate >= 90 ? (
										<i className="i-lucide-trending-up inline-block h-4 w-4 text-green-600"  />
									) : (
										<i className="i-lucide-trending-down inline-block h-4 w-4 text-red-600"  />
									)}
								</div>
							</div>
							<Progress
								value={property.rate}
								className={cn(
									'h-2',
									property.rate >= 90
										? 'bg-green-100'
										: property.rate >= 80
											? 'bg-orange-100'
											: 'bg-red-100'
								)}
							/>
						</div>
					))}

					<div className="space-y-3 border-t border-gray-100 pt-2">
						<div className="flex items-center justify-between text-sm">
							<span className="font-medium text-gray-700">
								Overall Average
							</span>
							<div className="flex items-center gap-2">
								<span className="font-semibold text-green-600">
									{Math.round(
										occupancyData.reduce(
											(acc, p) => acc + p.rate,
											0
										) / occupancyData.length
									)}
									%
								</span>
								<i className="i-lucide-trending-up inline-block h-4 w-4 text-green-600"  />
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
						<i className="i-lucide-clock inline-block h-5 w-5 text-gray-400"  />
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{upcomingTasks.map(task => (
						<div
							key={task.id}
							className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 transition-colors hover:border-gray-200"
						>
							<div className="flex-1">
								<div className="mb-1 flex items-center gap-2">
									<p className="text-sm font-medium text-gray-900">
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
								<p className="text-xs text-gray-600">
									{task.property}
								</p>
								<p className="mt-1 text-xs text-gray-400">
									Due {task.dueDate}
								</p>
							</div>
							<Button variant="ghost" size="sm">
								<i className="i-lucide-eye inline-block h-4 w-4"  />
							</Button>
						</div>
					))}

					<Button
						variant="ghost"
						className="w-full text-sm text-gray-600 hover:text-gray-900"
					>
						View all tasks
						<i className="i-lucide-calendar inline-block ml-2 h-4 w-4"  />
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
							<i className="i-lucide-bar-chart-3 inline-block h-5 w-5 text-gray-400"  />
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="mb-6 grid grid-cols-2 gap-6 md:grid-cols-4">
						<div className="space-y-3">
							<div className="space-y-1">
								<p className="text-sm text-gray-500">
									Total Revenue
								</p>
								<p className="text-2xl font-bold text-green-600">
									$24,580
								</p>
							</div>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1 text-xs">
									<i className="i-lucide-arrowupright inline-block h-3 w-3 text-green-600"  />
									<span className="text-green-600">
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
								<p className="text-sm text-gray-500">
									Operating Expenses
								</p>
								<p className="text-2xl font-bold text-red-600">
									$8,240
								</p>
							</div>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1 text-xs">
									<i className="i-lucide-arrowdownright inline-block h-3 w-3 text-red-600"  />
									<span className="text-red-600">+5.8%</span>
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
								<p className="text-sm text-gray-500">
									Net Income
								</p>
								<p className="text-primary text-2xl font-bold">
									$16,340
								</p>
							</div>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1 text-xs">
									<i className="i-lucide-arrowupright inline-block text-primary h-3 w-3"  />
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
								<p className="text-sm text-gray-500">
									Collection Rate
								</p>
								<p className="text-2xl font-bold text-green-600">
									96.8%
								</p>
							</div>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1 text-xs">
									<i className="i-lucide-arrowupright inline-block h-3 w-3 text-green-600"  />
									<span className="text-green-600">
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
					<div className="h-48 rounded-xl border border-gray-200 p-4">
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
						<i className="i-lucide-alert-triangle inline-block h-5 w-5 text-orange-400"  />
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-3">
						<div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
							<i className="i-lucide-xcircle inline-block mt-0.5 h-5 w-5 flex-shrink-0 text-red-600"  />
							<div>
								<p className="text-sm font-medium text-red-900">
									Overdue Rent
								</p>
								<p className="mt-1 text-xs text-red-700">
									3 tenants have overdue payments
								</p>
								<Button
									variant="ghost"
									size="sm"
									className="mt-2 h-auto p-0 text-red-700 hover:text-red-900"
								>
									View details →
								</Button>
							</div>
						</div>

						<div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
							<i className="i-lucide-alert-triangle inline-block mt-0.5 h-5 w-5 flex-shrink-0 text-orange-600"  />
							<div>
								<p className="text-sm font-medium text-orange-900">
									Maintenance Pending
								</p>
								<p className="mt-1 text-xs text-orange-700">
									5 requests awaiting assignment
								</p>
								<Button
									variant="ghost"
									size="sm"
									className="mt-2 h-auto p-0 text-orange-700 hover:text-orange-900"
								>
									Assign now →
								</Button>
							</div>
						</div>

						<div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
							<i className="i-lucide-calendar inline-block text-primary mt-0.5 h-5 w-5 flex-shrink-0"  />
							<div>
								<p className="text-sm font-medium text-blue-900">
									Lease Expiring
								</p>
								<p className="mt-1 text-xs text-blue-700">
									2 leases expire within 30 days
								</p>
								<Button
									variant="ghost"
									size="sm"
									className="mt-2 h-auto p-0 text-blue-700 hover:text-blue-900"
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
