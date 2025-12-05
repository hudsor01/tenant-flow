'use client'

import { Stat, StatLabel, StatValue, StatDescription, StatTrend, StatSeparator } from '#components/ui/stat'
import { Skeleton } from '#components/ui/skeleton'
import { MiniTrendChart } from '#components/charts/mini-trend-chart'
import { ErrorBoundary } from '#components/error-boundary/error-boundary'
import { useOwnerDashboardData } from '#hooks/api/use-owner-dashboard'
import type { MetricTrend } from '@repo/shared/types/dashboard-repository'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'

export function TrendsSection() {
	return (
		<ErrorBoundary
			fallback={
				<section className="dashboard-section">
					<div className="dashboard-section-header">
						<h2 className="dashboard-section-title">Trends & Performance</h2>
						<p className="dashboard-section-description">
							Unable to load trend data
						</p>
					</div>
				</section>
			}
		>
			<TrendsSectionContent />
		</ErrorBoundary>
	)
}

function TrendsSectionContent() {
	// Use unified dashboard data hook
	const { data, isLoading } = useOwnerDashboardData()

	const {
		metricTrends,
		timeSeries
	} = data ?? {}

	const {
		occupancyRate,
		activeTenants,
		monthlyRevenue,
		openMaintenance
	} = metricTrends ?? {}

	return (
		<section className="dashboard-section" data-tour="trends-section">
			<div className="dashboard-section-header">
				<h2 className="dashboard-section-title">Trends & Performance</h2>
				<p className="dashboard-section-description">
					30-day comparison with previous period
				</p>
			</div>

			<div className="dashboard-trend-grid">
				<TrendStat
					title="Occupancy Rate"
					metric={occupancyRate}
					isLoading={isLoading}
					valueFormatter={(v) => v !== null ? `${v.toFixed(1)}%` : '0%'}
				/>
				<TrendStat
					title="Active Tenants"
					metric={activeTenants}
					isLoading={isLoading}
					valueFormatter={(v) => v !== null ? v.toString() : '0'}
				/>
				<TrendStat
					title="Monthly Revenue"
					metric={monthlyRevenue}
					isLoading={isLoading}
					valueFormatter={(v) =>
						v !== null
							? `$${(v / 100).toLocaleString('en-US', {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								})}`
							: '$0.00'
					}
				/>
				<TrendStat
					title="Open Maintenance"
					metric={openMaintenance}
					isLoading={isLoading}
					valueFormatter={(v) => v !== null ? v.toString() : '0'}
				/>
			</div>

			<div className="dashboard-grid">
				<MiniTrendChart
					title="Occupancy Rate (30 days)"
					data={timeSeries?.occupancyRate}
					isLoading={isLoading}
					valueFormatter={(v) => v !== null ? `${v.toFixed(1)}%` : '0%'}
					color="var(--color-primary)"
				/>
				<MiniTrendChart
					title="Monthly Revenue (30 days)"
					data={timeSeries?.monthlyRevenue}
					isLoading={isLoading}
					valueFormatter={(v) =>
						v !== null
							? `$${(v / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
							: '$0.00'
					}
					color="var(--color-success)"
				/>
			</div>
		</section>
	)
}

interface TrendStatProps {
	title: string
	metric: MetricTrend | null | undefined
	isLoading?: boolean
	valueFormatter?: (value: number) => string
}

function TrendStat({
	title,
	metric,
	isLoading = false,
	valueFormatter = (v) => v.toString()
}: TrendStatProps) {
	if (isLoading) {
		return (
			<Stat data-testid="trend-card" className="animate-pulse">
				<StatLabel>{title}</StatLabel>
				<Skeleton className="h-8 w-24 mt-1" />
				<Skeleton className="h-4 w-32 mt-2" />
			</Stat>
		)
	}

	if (!metric) {
		return (
			<Stat data-testid="trend-card">
				<StatLabel>{title}</StatLabel>
				<StatValue>--</StatValue>
				<StatDescription>No data available</StatDescription>
			</Stat>
		)
	}

	const isPositive = (metric.change ?? 0) > 0
	const isNegative = (metric.change ?? 0) < 0
	const TrendIcon = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus
	const trendDirection: 'up' | 'down' | 'neutral' = isPositive ? 'up' : isNegative ? 'down' : 'neutral'

	return (
		<Stat data-testid="trend-card">
			<StatLabel>{title}</StatLabel>
			<StatValue>{valueFormatter(metric.current ?? 0)}</StatValue>
			<StatSeparator />
			<StatTrend trend={trendDirection}>
				<TrendIcon />
				<span>
					{metric.change > 0 && '+'}
					{(metric.percentChange ?? 0).toFixed(1)}%
				</span>
				<span className="text-muted-foreground ml-1">vs last month</span>
			</StatTrend>
			{metric.change !== 0 && (
				<StatDescription>
					{metric.change > 0 ? '+' : ''}
					{valueFormatter(metric.change ?? 0)} from previous period
				</StatDescription>
			)}
		</Stat>
	)
}
