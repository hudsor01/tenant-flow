'use client'

/**
 * Reports Analytics Dashboard
 * Phase 5: Advanced Features - Custom Reports & Analytics
 */

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import {
	useMonthlyRevenue,
	useOccupancyMetrics,
	usePaymentAnalytics
} from '#hooks/api/use-reports'
import { useState } from 'react'
import { AnalyticsStatsRow } from './analytics-stats-row'
import { AnalyticsRevenueChart } from './analytics-revenue-chart'
import { AnalyticsPaymentMethodsChart } from './analytics-payment-methods-chart'
import { AnalyticsOccupancyChart } from './analytics-occupancy-chart'
import { AnalyticsPropertyTable } from './analytics-property-table'

export default function AnalyticsPage() {
	const [timeRange, setTimeRange] = useState('12')

	const { data: revenueData, isLoading: revenueLoading } = useMonthlyRevenue(
		parseInt(timeRange, 10)
	)
	const { data: paymentAnalytics, isLoading: paymentsLoading } =
		usePaymentAnalytics()
	const { data: occupancyMetrics, isLoading: occupancyLoading } =
		useOccupancyMetrics()

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

			<AnalyticsStatsRow
				paymentAnalytics={paymentAnalytics}
				occupancyMetrics={occupancyMetrics}
				paymentsLoading={paymentsLoading}
				occupancyLoading={occupancyLoading}
			/>

			{/* Charts Section */}
			<div className="flex flex-col gap-6">
				<AnalyticsRevenueChart
					revenueData={revenueData}
					isLoading={revenueLoading}
				/>

				<div className="grid lg:grid-cols-2 gap-6">
					<AnalyticsPaymentMethodsChart
						paymentAnalytics={paymentAnalytics}
						isLoading={paymentsLoading}
					/>
					<AnalyticsOccupancyChart
						occupancyMetrics={occupancyMetrics}
						isLoading={occupancyLoading}
					/>
				</div>

				{occupancyMetrics && occupancyMetrics.byProperty.length > 0 && (
					<AnalyticsPropertyTable occupancyMetrics={occupancyMetrics} />
				)}
			</div>
		</div>
	)
}
