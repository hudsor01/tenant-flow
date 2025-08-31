/**
 * Dashboard Preview Section - Client Component
 * Showcases TenantFlow's powerful analytics with interactive charts
 * Built with Recharts and Magic UI for maximum visual impact
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
	AreaChart,
	Area,
	BarChart,
	Bar,
	PieChart,
	Pie,
	Cell,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Line
} from 'recharts'
import { DollarSign, Home, Wrench, TrendingUp, Users, Calendar } from 'lucide-react'
import { AnimatedGradientText, BlurFade, NumberTicker, BorderBeam } from '@/components/magicui'
import { ANIMATION_DELAYS } from '@/lib/animations/constants'

// Mock data for dashboard preview
const occupancyData = [
	{ month: 'Jan', occupancy: 85, revenue: 45000 },
	{ month: 'Feb', occupancy: 88, revenue: 48000 },
	{ month: 'Mar', occupancy: 92, revenue: 52000 },
	{ month: 'Apr', occupancy: 90, revenue: 50000 },
	{ month: 'May', occupancy: 95, revenue: 55000 },
	{ month: 'Jun', occupancy: 98, revenue: 58000 },
]

const revenueByProperty = [
	{ name: 'Sunset Apartments', revenue: 18500, units: 24 },
	{ name: 'Oak Street Complex', revenue: 15200, units: 18 },
	{ name: 'Downtown Lofts', revenue: 12800, units: 16 },
	{ name: 'Riverside Gardens', revenue: 11500, units: 14 },
]

const maintenanceData = [
	{ name: 'Completed', value: 68, color: '#10b981' },
	{ name: 'In Progress', value: 22, color: '#f59e0b' },
	{ name: 'Pending', value: 10, color: '#ef4444' },
]

const kpiData = [
	{
		title: 'Total Revenue',
		value: 2.4,
		suffix: 'M',
		prefix: '$',
		change: '+12%',
		icon: DollarSign,
		color: 'text-green-500'
	},
	{
		title: 'Properties',
		value: 47,
		suffix: '',
		change: '+3',
		icon: Home,
		color: 'text-blue-500'
	},
	{
		title: 'Total Units',
		value: 342,
		suffix: '',
		change: '+18',
		icon: Users,
		color: 'text-purple-500'
	},
	{
		title: 'Avg Response',
		value: 4.2,
		suffix: 'hrs',
		change: '-0.8hrs',
		icon: Wrench,
		color: 'text-orange-500'
	},
]

export function DashboardPreviewSection() {
	return (
		<section className="section-spacing relative overflow-hidden bg-gradient-to-br from-background via-base2 to-background">
			{/* Background elements */}
			<div className="absolute inset-0">
				<div className="animate-blob absolute left-20 top-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
				<div className="animate-blob animation-delay-2000 absolute bottom-20 right-20 h-72 w-72 rounded-full bg-accent/5 blur-3xl" />
			</div>

			<div className="container relative mx-auto max-w-7xl px-6 lg:px-8">
				{/* Header */}
				<div className="mb-16 text-center">
					<BlurFade delay={ANIMATION_DELAYS.FAST_STAGGER * 0}>
						<div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
							<TrendingUp className="h-4 w-4" />
							Real-time Analytics Dashboard
						</div>
					</BlurFade>
					<BlurFade delay={ANIMATION_DELAYS.FAST_STAGGER * 1}>
						<h2 className="mb-6 text-4xl font-bold md:text-5xl">
							<AnimatedGradientText className="text-4xl md:text-5xl font-bold">
								Data-Driven Property Management
							</AnimatedGradientText>
						</h2>
					</BlurFade>
					<BlurFade delay={ANIMATION_DELAYS.FAST_STAGGER * 2}>
						<p className="mx-auto max-w-3xl text-xl text-muted-foreground">
							Transform raw property data into actionable insights. Track occupancy trends, revenue performance, 
							and maintenance efficiency with our comprehensive analytics suite.
						</p>
					</BlurFade>
				</div>

				{/* KPI Cards */}
				<div className="mb-12 grid grid-cols-2 gap-6 md:grid-cols-4">
					{kpiData.map((kpi, index) => {
						const IconComponent = kpi.icon
						return (
							<BlurFade
								key={index}
								delay={ANIMATION_DELAYS.FAST_STAGGER * (3 + index)}
							>
								<Card className="relative border-2 transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
									<BorderBeam className="rounded-lg" />
									<CardContent className="p-6">
										<div className="flex items-center justify-between mb-4">
											<div className={`rounded-lg bg-gradient-to-br p-2 ${kpi.color.replace('text-', 'from-').replace('-500', '-500/20 to-')}`}>
												<IconComponent className={`h-5 w-5 ${kpi.color}`} />
											</div>
											<div className={`text-sm font-medium ${kpi.color}`}>
												{kpi.change}
											</div>
										</div>
										<div className="space-y-1">
											<p className="text-sm text-muted-foreground">
												{kpi.title}
											</p>
											<div className="flex items-baseline gap-1 text-2xl font-bold">
												{kpi.prefix && <span>{kpi.prefix}</span>}
												<NumberTicker
													value={kpi.value}
													className="inline"
												/>
												{kpi.suffix && <span>{kpi.suffix}</span>}
											</div>
										</div>
									</CardContent>
								</Card>
							</BlurFade>
						)
					})}
				</div>

				{/* Charts Grid */}
				<div className="grid gap-8 lg:grid-cols-2">
					{/* Occupancy & Revenue Trend */}
					<BlurFade delay={ANIMATION_DELAYS.FAST_STAGGER * 7}>
						<Card className="p-6">
							<CardHeader className="pb-4">
								<CardTitle className="flex items-center gap-2 text-xl">
									<TrendingUp className="h-5 w-5 text-primary" />
									Occupancy & Revenue Trends
								</CardTitle>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={300}>
									<AreaChart data={occupancyData}>
										<CartesianGrid strokeDasharray="3 3" className="opacity-30" />
										<XAxis 
											dataKey="month" 
											className="text-xs text-muted-foreground"
											axisLine={false}
											tickLine={false}
										/>
										<YAxis 
											yAxisId="left"
											className="text-xs text-muted-foreground"
											axisLine={false}
											tickLine={false}
										/>
										<YAxis 
											yAxisId="right"
											orientation="right"
											className="text-xs text-muted-foreground"
											axisLine={false}
											tickLine={false}
										/>
										<Tooltip 
											contentStyle={{ 
												backgroundColor: 'hsl(var(--background))', 
												border: '1px solid hsl(var(--border))',
												borderRadius: '8px'
											}}
										/>
										<Area
											yAxisId="right"
											type="monotone"
											dataKey="revenue"
											stroke="hsl(var(--primary))"
											fill="hsl(var(--primary) / 0.1)"
											strokeWidth={2}
										/>
										<Line
											yAxisId="left"
											type="monotone"
											dataKey="occupancy"
											stroke="hsl(var(--accent))"
											strokeWidth={3}
											dot={{ fill: 'hsl(var(--accent))' }}
										/>
									</AreaChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>
					</BlurFade>

					{/* Maintenance Status */}
					<BlurFade delay={ANIMATION_DELAYS.FAST_STAGGER * 8}>
						<Card className="p-6">
							<CardHeader className="pb-4">
								<CardTitle className="flex items-center gap-2 text-xl">
									<Wrench className="h-5 w-5 text-primary" />
									Maintenance Status Overview
								</CardTitle>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={300}>
									<PieChart>
										<Pie
											data={maintenanceData}
											cx="50%"
											cy="50%"
											outerRadius={80}
											dataKey="value"
											label={({ name, value }) => `${name}: ${value}%`}
											labelLine={false}
										>
											{maintenanceData.map((entry, index) => (
												<Cell key={`cell-${index}`} fill={entry.color} />
											))}
										</Pie>
										<Tooltip 
											contentStyle={{ 
												backgroundColor: 'hsl(var(--background))', 
												border: '1px solid hsl(var(--border))',
												borderRadius: '8px'
											}}
										/>
									</PieChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>
					</BlurFade>

					{/* Revenue by Property */}
					<BlurFade delay={ANIMATION_DELAYS.FAST_STAGGER * 9}>
						<Card className="p-6 lg:col-span-2">
							<CardHeader className="pb-4">
								<CardTitle className="flex items-center gap-2 text-xl">
									<DollarSign className="h-5 w-5 text-primary" />
									Revenue Performance by Property
								</CardTitle>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={300}>
									<BarChart data={revenueByProperty} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
										<CartesianGrid strokeDasharray="3 3" className="opacity-30" />
										<XAxis 
											dataKey="name"
											className="text-xs text-muted-foreground"
											axisLine={false}
											tickLine={false}
										/>
										<YAxis 
											className="text-xs text-muted-foreground"
											axisLine={false}
											tickLine={false}
										/>
										<Tooltip 
											contentStyle={{ 
												backgroundColor: 'hsl(var(--background))', 
												border: '1px solid hsl(var(--border))',
												borderRadius: '8px'
											}}
											formatter={(value, name) => [
												`$${value.toLocaleString()}`,
												name === 'revenue' ? 'Monthly Revenue' : name
											]}
										/>
										<Bar 
											dataKey="revenue" 
											fill="hsl(var(--primary))"
											radius={[4, 4, 0, 0]}
										/>
									</BarChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>
					</BlurFade>
				</div>

				{/* Call to Action */}
				<BlurFade delay={ANIMATION_DELAYS.FAST_STAGGER * 10}>
					<div className="mt-16 text-center">
						<p className="mb-6 text-lg text-muted-foreground">
							Ready to unlock these insights for your properties?
						</p>
						<div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
							<a
								href="/auth/signup?source=dashboard-preview"
								className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground transition-all hover:bg-primary/90"
							>
								<Calendar className="h-5 w-5" />
								Start Free Trial
							</a>
							<a
								href="/demo?source=dashboard-preview"
								className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-primary px-8 py-3 text-lg font-semibold text-primary transition-all hover:bg-primary/10"
							>
								<TrendingUp className="h-5 w-5" />
								View Live Demo
							</a>
						</div>
					</div>
				</BlurFade>
			</div>
		</section>
	)
}
