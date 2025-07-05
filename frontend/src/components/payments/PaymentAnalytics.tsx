import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle } from 'lucide-react'
import { usePaymentAnalyticsData } from '@/hooks/usePaymentAnalyticsData'
import AnalyticsMetricsSection from './AnalyticsMetricsSection'
import PaymentTrendsSection from './PaymentTrendsSection'
import PaymentBreakdownSection from './PaymentBreakdownSection'
import CollectionAnalysisSection from './CollectionAnalysisSection'

interface PaymentAnalyticsProps {
	propertyId?: string
	title?: string
	description?: string
}

/**
 * Comprehensive payment analytics dashboard component
 * Uses decomposed sections for better maintainability:
 * - AnalyticsMetricsSection: Key statistics cards
 * - PaymentTrendsSection: Monthly trend charts
 * - PaymentBreakdownSection: Payment type analysis
 * - CollectionAnalysisSection: Collection performance metrics
 */
export default function PaymentAnalytics({
	propertyId,
	title = 'Payment Analytics',
	description = 'Comprehensive payment insights and trends'
}: PaymentAnalyticsProps) {
	const {
		monthlyChange,
		monthlyChartData,
		paymentTypesData,
		collectionEfficiency,
		isLoading,
		error,
		analytics
	} = usePaymentAnalyticsData({ propertyId })

	if (isLoading) {
		return (
			<Card>
				<CardContent className="flex h-64 items-center justify-center">
					<div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
				</CardContent>
			</Card>
		)
	}

	if (error || !analytics) {
		return (
			<Card>
				<CardContent className="flex h-64 items-center justify-center">
					<div className="text-center">
						<AlertCircle className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
						<p className="text-muted-foreground">
							Failed to load payment analytics
						</p>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h2 className="text-2xl font-bold tracking-tight">{title}</h2>
				<p className="text-muted-foreground">{description}</p>
			</div>

			{/* Statistics Cards */}
			<AnalyticsMetricsSection
				analytics={analytics}
				monthlyChange={monthlyChange}
				collectionEfficiency={collectionEfficiency}
			/>

			{/* Charts and Analytics */}
			<Tabs defaultValue="trends" className="space-y-4">
				<TabsList>
					<TabsTrigger value="trends">Monthly Trends</TabsTrigger>
					<TabsTrigger value="types">Payment Types</TabsTrigger>
					<TabsTrigger value="collection">
						Collection Analysis
					</TabsTrigger>
				</TabsList>

				<PaymentTrendsSection monthlyChartData={monthlyChartData} />

				<PaymentBreakdownSection paymentTypesData={paymentTypesData} />

				<CollectionAnalysisSection
					analytics={analytics}
					collectionEfficiency={collectionEfficiency}
				/>
			</Tabs>
		</div>
	)
}
