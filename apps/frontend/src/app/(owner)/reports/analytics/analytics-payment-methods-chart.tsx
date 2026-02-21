'use client'

import { Card } from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts'
import type { ReportPaymentAnalytics } from '@repo/shared/types/reports'

interface AnalyticsPaymentMethodsChartProps {
	paymentAnalytics: ReportPaymentAnalytics | undefined
	isLoading: boolean
}

export function AnalyticsPaymentMethodsChart({
	paymentAnalytics,
	isLoading
}: AnalyticsPaymentMethodsChartProps) {
	return (
		<Card className="@container/card">
			<div className="p-6 border-b">
				<h2 className="typography-h4">Payment Methods</h2>
				<p className="text-muted-foreground text-sm">
					Distribution by payment type
				</p>
			</div>
			<div className="p-6">
				{isLoading ? (
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
	)
}
