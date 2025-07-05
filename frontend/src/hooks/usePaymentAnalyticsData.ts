import { useMemo } from 'react'
import { format } from 'date-fns'
import { usePaymentStats } from '@/hooks/usePayments'

interface MonthlyDataItem {
	month: string
	amount: number
	count: number
}

interface PaymentTypeData {
	name: string
	value: number
	percentage: string
}

interface ProcessedAnalyticsData {
	monthlyChange: number
	monthlyChartData: {
		month: string
		amount: number
		count: number
	}[]
	paymentTypesData: PaymentTypeData[]
	collectionEfficiency: number
	avgMonthlyRevenue: number
	isLoading: boolean
	error: unknown
	analytics: {
		totalAmount: number
		totalPayments: number
		avgPaymentAmount: number
		latePayments: number
		onTimePayments: number
	}
}

/**
 * Custom hook for processing payment analytics data
 * Handles complex calculations for trends, efficiency, and breakdowns
 */
export function usePaymentAnalyticsData(): ProcessedAnalyticsData {
	const { data: analytics, isLoading, error } = usePaymentStats()

	const processedData = useMemo(() => {
		if (!analytics) {
			return {
				monthlyChange: 0,
				monthlyChartData: [],
				paymentTypesData: [],
				collectionEfficiency: 0,
				avgMonthlyRevenue: 0,
				isLoading,
				error,
				analytics: null
			}
		}

		// Calculate percentage changes
		const monthlyChange =
			analytics.lastMonthAmount > 0
				? ((analytics.currentMonthAmount - analytics.lastMonthAmount) /
						analytics.lastMonthAmount) *
					100
				: 0

		// Prepare monthly chart data
		const monthlyChartData = (
			Object.values(analytics.monthlyData) as MonthlyDataItem[]
		)
			.sort((a, b) => a.month.localeCompare(b.month))
			.slice(-12) // Last 12 months
			.map(item => ({
				month: format(new Date(item.month + '-01'), 'MMM yyyy'),
				amount: item.amount,
				count: item.count
			}))

		// Prepare payment types data for pie chart
		const paymentTypeNames: Record<string, string> = {
			RENT: 'Rent',
			SECURITY_DEPOSIT: 'Security Deposit',
			LATE_FEE: 'Late Fee',
			UTILITY: 'Utility',
			MAINTENANCE: 'Maintenance',
			OTHER: 'Other'
		}

		const paymentTypesData = (
			Object.entries(analytics.paymentTypes) as [string, number][]
		)
			.map(([type, amount]) => ({
				name: paymentTypeNames[type] || type.replace('_', ' '),
				value: amount,
				percentage: ((amount / analytics.totalAmount) * 100).toFixed(1)
			}))
			.filter(item => item.value > 0)

		// Calculate collection efficiency based on expected vs actual payments
		const daysInCurrentMonth = new Date(
			new Date().getFullYear(),
			new Date().getMonth() + 1,
			0
		).getDate()
		const daysPassed = new Date().getDate()
		const monthProgress = daysPassed / daysInCurrentMonth

		// Estimate expected monthly revenue based on historical average
		const lastThreeMonths = (
			Object.values(analytics.monthlyData) as MonthlyDataItem[]
		)
			.sort((a, b) => b.month.localeCompare(a.month))
			.slice(1, 4) // Skip current month, take last 3

		const avgMonthlyRevenue =
			lastThreeMonths.length > 0
				? lastThreeMonths.reduce((sum, m) => sum + m.amount, 0) /
					lastThreeMonths.length
				: 0

		const expectedCurrentMonth = avgMonthlyRevenue * monthProgress
		const collectionEfficiency =
			expectedCurrentMonth > 0
				? Math.min(
						100,
						Math.round(
							(analytics.currentMonthAmount /
								expectedCurrentMonth) *
								100
						)
					)
				: analytics.currentMonthAmount > 0
					? 100
					: 0

		return {
			monthlyChange: Math.round(monthlyChange),
			monthlyChartData,
			paymentTypesData,
			collectionEfficiency,
			avgMonthlyRevenue,
			isLoading,
			error,
			analytics
		}
	}, [analytics, isLoading, error])

	return processedData
}

/**
 * Helper function to format currency values
 */
export function formatCurrency(amount: number): string {
	return `$${amount.toLocaleString()}`
}

/**
 * Helper function to calculate average payment amount
 */
export function calculateAveragePayment(
	totalAmount: number,
	totalPayments: number
): number {
	return totalPayments > 0 ? Math.round(totalAmount / totalPayments) : 0
}
