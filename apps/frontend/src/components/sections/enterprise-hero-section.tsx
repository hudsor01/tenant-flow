'use client'

import {
	useDashboardFinancialStatsFormatted,
	useFinancialOverviewFormatted
} from '@/hooks/api/financial'
import {
	useDashboardStats,
	usePropertyPerformance,
	useSystemUptime
} from '@/hooks/api/use-dashboard'
import { cn, formatCurrency } from '@/lib/utils'
import type { FinancialOverviewResponse } from '@repo/shared'
import { ArrowRight, Loader2, Shield, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import { BlurFade } from 'src/components/magicui/blur-fade'
import { Badge } from 'src/components/ui/badge'
import { Button } from 'src/components/ui/button'

interface EnterpriseHeroSectionProps {
	className?: string
}

export function EnterpriseHeroSection({
	className
}: EnterpriseHeroSectionProps) {
	const { data: dashboardStats, isPending: statsLoading } =
		useDashboardFinancialStatsFormatted()
	const { data: finOverview } = useFinancialOverviewFormatted()
	const { data: dashboardData, isPending: dashboardLoading } =
		useDashboardStats()
	const { data: propertyPerformance, isPending: propertyLoading } =
		usePropertyPerformance()
	const { data: uptimeData, isPending: uptimeLoading } = useSystemUptime()

	const isLoading =
		statsLoading || dashboardLoading || propertyLoading || uptimeLoading

	// Transform real data for dashboard display (no hard-coded fallbacks)
	const portfolioStats = {
		value: dashboardStats?.totalRevenue
			? formatCurrency(dashboardStats.totalRevenue)
			: undefined,
		growth: dashboardStats?.monthlyRevenue?.changeFormatted ?? undefined,
		occupancy:
			dashboardStats?.occupancyRate !== null &&
			dashboardStats?.occupancyRate !== undefined
				? `${dashboardStats.occupancyRate.toFixed(1)}%`
				: undefined,
		occupancyChange:
			dashboardData?.units?.occupancyChange !== null &&
			dashboardData?.units?.occupancyChange !== undefined
				? `${dashboardData.units.occupancyChange > 0 ? '+' : ''}${dashboardData.units.occupancyChange.toFixed(1)}%`
				: undefined
	}

	// Top performing properties from API (already sorted by backend)
	const topProperties = useMemo(() => {
		if (!propertyPerformance || propertyLoading) return []

		// API returns properties sorted by occupancy rate desc, then units desc
		// Take top 3 for display, format revenue properly
		return propertyPerformance.slice(0, 3).map(p => ({
			property: p.property,
			units: p.totalUnits,
			occupancy: p.occupancy,
			revenue: p.revenue ? formatCurrency(p.revenue) : undefined
		}))
	}, [propertyPerformance, propertyLoading])

	// Revenue trend data for mini chart sourced from financial overview RPC
	const revenueData: number[] = useMemo(() => {
		const chart = (finOverview as FinancialOverviewResponse | undefined)
			?.chartData
		if (Array.isArray(chart) && chart.length > 0) {
			return chart.map(d => Math.max(0, Math.floor((d.income ?? 0) / 1000)))
		}
		return []
	}, [finOverview])

	return (
		<section
			className={cn(
				'relative py-20 lg:py-28 bg-gradient-to-b from-primary/5 to-accent/5',
				className
			)}
		>
			<div className="container px-4 mx-auto">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
					{/* Left Content */}
					<div className="max-w-2xl">
						{/* Trust Badge */}
						<BlurFade delay={0.1} inView>
							<Badge
								variant="outline"
								className="mb-6 px-4 py-2 bg-background border-primary/20 text-primary"
							>
								<Shield className="w-4 h-4 mr-2" />
								SOC 2 Type II Certified
							</Badge>
						</BlurFade>

						{/* Headline */}
						<BlurFade delay={0.2} inView>
							<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-8 leading-tight">
								Enterprise Property
								<span className="text-primary block">Management Platform</span>
							</h1>
						</BlurFade>

						{/* Value Proposition */}
						<BlurFade delay={0.3} inView>
							<p className="text-xl text-muted-foreground mb-8 leading-relaxed">
								Scale your property management operations with enterprise-grade
								security, advanced analytics, and seamless integrations. Trusted
								by Fortune 500 companies and industry leaders worldwide.
							</p>
						</BlurFade>

						{/* Key Stats */}
						<BlurFade delay={0.4} inView>
							<div className="grid grid-cols-3 gap-8 mb-10">
								<div className="text-center">
									<div className="text-3xl font-bold text-primary mb-1">
										{isLoading ? (
											<Loader2 className="h-8 w-8 animate-spin mx-auto" />
										) : (
											(dashboardData?.units?.total ?? '—')
										)}
									</div>
									<div className="text-sm text-muted-foreground">
										Units Managed
									</div>
								</div>
								<div className="text-center">
									<div className="text-3xl font-bold text-primary mb-1">
										{isLoading ? (
											<Loader2 className="h-8 w-8 animate-spin mx-auto" />
										) : (
											(uptimeData?.uptime ?? '—')
										)}
									</div>
									<div className="text-sm text-muted-foreground">
										Uptime SLA
									</div>
								</div>
								<div className="text-center">
									<div className="text-3xl font-bold text-primary mb-1">
										{isLoading ? (
											<Loader2 className="h-8 w-8 animate-spin mx-auto" />
										) : (
											`${dashboardData?.properties?.total || 50}+`
										)}
									</div>
									<div className="text-sm text-muted-foreground">
										Properties
									</div>
								</div>
							</div>
						</BlurFade>

						{/* CTA Buttons */}
						<BlurFade delay={0.5} inView>
							<div className="flex flex-col sm:flex-row gap-4 mb-8">
								<Button
									size="lg"
									className="px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
								>
									Schedule Enterprise Demo
									<ArrowRight className="w-5 h-5 ml-2" />
								</Button>

								<Button
									variant="outline"
									size="lg"
									className="px-8 py-4 border-2 border-border text-foreground hover:border-primary/30 dark:hover:border-primary/50 font-semibold rounded-lg"
								>
									View Documentation
								</Button>
							</div>
						</BlurFade>

						{/* Enterprise Features */}
						<BlurFade delay={0.6} inView>
							<div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 bg-accent rounded-full"></div>
									<span>Single Sign-On (SSO)</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 bg-accent rounded-full"></div>
									<span>Advanced API Access</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 bg-accent rounded-full"></div>
									<span>Dedicated Support</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 bg-accent rounded-full"></div>
									<span>Custom Integrations</span>
								</div>
							</div>
						</BlurFade>
					</div>

					{/* Right Content - Professional Dashboard */}
					<BlurFade delay={0.7} inView>
						<div className="relative">
							<div className="bg-background rounded-2xl shadow-2xl border border-border overflow-hidden">
								{/* Header */}
								<div className="bg-muted px-6 py-4 border-b border-border">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
												<TrendingUp className="w-4 h-4 text-white" />
											</div>
											<span className="font-semibold text-foreground">
												Enterprise Dashboard
											</span>
										</div>
										<div className="flex gap-2">
											<div className="w-6 h-6 bg-muted rounded"></div>
											<div className="w-6 h-6 bg-muted rounded"></div>
										</div>
									</div>
								</div>

								{/* Content */}
								<div className="p-6 space-y-6">
									{/* KPI Cards */}
									<div className="grid grid-cols-2 gap-4">
										<div className="bg-primary/5 dark:bg-primary/20 p-4 rounded-lg border border-primary/10 dark:border-primary/30">
											<div className="text-xs text-primary uppercase tracking-wide font-medium mb-1">
												Portfolio Value
											</div>
											<div className="text-2xl font-bold text-foreground">
												{isLoading ? (
													<Loader2 className="h-6 w-6 animate-spin" />
												) : (
													(portfolioStats.value ?? '—')
												)}
											</div>
											<div className="text-xs text-accent dark:text-accent/80">
												{isLoading ? '...' : (portfolioStats.growth ?? '—')} YoY
											</div>
										</div>
										<div className="bg-accent/5 dark:bg-accent/20 p-4 rounded-lg border border-accent/10 dark:border-accent/30">
											<div className="text-xs text-accent dark:text-accent/80 uppercase tracking-wide font-medium mb-1">
												Occupancy Rate
											</div>
											<div className="text-2xl font-bold text-foreground">
												{isLoading ? (
													<Loader2 className="h-6 w-6 animate-spin" />
												) : (
													(portfolioStats.occupancy ?? '—')
												)}
											</div>
											<div className="text-xs text-accent dark:text-accent/80">
												{isLoading
													? '...'
													: (portfolioStats.occupancyChange ?? '—')}{' '}
												QoQ
											</div>
										</div>
									</div>

									{/* Table Header */}
									<div>
										<div className="flex items-center justify-between mb-3">
											<h3 className="font-semibold text-foreground">
												Property Performance
											</h3>
											<Button
												variant="ghost"
												size="sm"
												className="text-primary"
											>
												View All
											</Button>
										</div>

										{/* Real Property Performance */}
										<div className="space-y-2">
											{isLoading || topProperties.length === 0
												? Array.from({ length: 3 }, (_, i) => (
														<div
															key={i}
															className="flex items-center justify-between py-3 px-4 bg-muted rounded-lg"
														>
															<div className="space-y-2">
																<div className="h-4 bg-muted rounded w-32 animate-pulse" />
																<div className="h-3 bg-muted rounded w-16 animate-pulse" />
															</div>
															<div className="space-y-2 text-right">
																<div className="h-4 bg-muted rounded w-20 animate-pulse" />
																<div className="h-3 bg-muted rounded w-12 animate-pulse" />
															</div>
														</div>
													))
												: topProperties.map((item, i) => (
														<div
															key={i}
															className="flex items-center justify-between py-3 px-4 bg-muted rounded-lg"
														>
															<div>
																<div className="font-medium text-foreground text-sm">
																	{item.property}
																</div>
																<div className="text-xs text-muted-foreground">
																	{item.units} units
																</div>
															</div>
															<div className="text-right">
																<div className="font-medium text-foreground text-sm">
																	{item.revenue ?? '—'}
																</div>
																<div className="text-xs text-muted-foreground">
																	{item.occupancy}
																</div>
															</div>
														</div>
													))}
										</div>
									</div>

									{/* Real Revenue Chart */}
									<div className="bg-muted rounded-lg p-4">
										<div className="text-sm font-medium text-foreground mb-3">
											Revenue Trend (12M)
										</div>
										<div className="flex items-end gap-1 h-16">
											{isLoading || revenueData.length === 0
												? Array.from({ length: 12 }, (_, i) => (
														<div
															key={i}
															className="bg-muted rounded-sm flex-1 animate-pulse"
															style={{ height: `${Math.random() * 40 + 30}%` }}
														/>
													))
												: revenueData.map((height, i) => {
														const normalizedHeight = Math.min(
															Math.max(
																(height / Math.max(...revenueData)) * 100,
																20
															),
															100
														)
														return (
															<div
																key={i}
																className="bg-primary hover:bg-primary/90 rounded-sm flex-1 transition-colors cursor-pointer"
																style={{ height: `${normalizedHeight}%` }}
																title={`Month ${i + 1}: ${formatCurrency(height * 1000)}`}
															/>
														)
													})}
										</div>
									</div>
								</div>
							</div>

							{/* Floating Security Badge */}
							<div className="absolute -bottom-6 -right-6 bg-background p-4 rounded-xl shadow-lg border border-border">
								<div className="flex items-center gap-2">
									<Shield className="w-5 h-5 text-accent" />
									<span className="text-sm font-medium text-foreground">
										SOC 2 Compliant
									</span>
								</div>
							</div>
						</div>
					</BlurFade>
				</div>
			</div>
		</section>
	)
}
