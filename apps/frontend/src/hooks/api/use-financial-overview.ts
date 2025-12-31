/**
 * Financial Overview API Hooks
 *
 * TanStack Query hooks for financial overview and metrics endpoints.
 * Provides aggregated financial data for the dashboard.
 */

import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'

/**
 * Financial overview response shape
 */
export interface FinancialOverviewData {
	overview: {
		total_revenue: number
		total_expenses: number
		net_income: number
		accounts_receivable: number
		accounts_payable: number
	}
	highlights: Array<{
		label: string
		value: number
		trend: number | null
	}>
}

/**
 * Monthly metrics data shape
 */
export interface MonthlyMetric {
	month: string
	revenue: number
	expenses: number
	net_income: number
	cash_flow: number
}

/**
 * Expense summary data shape
 */
export interface ExpenseSummaryData {
	categories: Array<{
		category: string
		amount: number
		percentage: number
	}>
	monthly_totals: Array<{
		month: string
		amount: number
	}>
	total_amount: number
	monthly_average: number
	year_over_year_change: number | null
}

/**
 * Query keys for financial overview
 */
export const financialOverviewKeys = {
	all: ['financial-overview'] as const,
	overview: () => [...financialOverviewKeys.all, 'overview'] as const,
	monthly: () => [...financialOverviewKeys.all, 'monthly'] as const,
	expenses: () => [...financialOverviewKeys.all, 'expenses'] as const,
	expenseSummary: () =>
		[...financialOverviewKeys.all, 'expense-summary'] as const
}

/**
 * Hook to fetch financial overview metrics
 */
export function useFinancialOverview() {
	return useQuery({
		queryKey: financialOverviewKeys.overview(),
		queryFn: async (): Promise<FinancialOverviewData> => {
			const response = await apiRequest<{
				success: boolean
				data: FinancialOverviewData
			}>('/api/v1/financials/overview')
			return response.data
		},
		...QUERY_CACHE_TIMES.ANALYTICS,
		retry: 2
	})
}

/**
 * Hook to fetch monthly financial metrics (last 12 months)
 */
export function useMonthlyMetrics() {
	return useQuery({
		queryKey: financialOverviewKeys.monthly(),
		queryFn: async (): Promise<MonthlyMetric[]> => {
			const response = await apiRequest<{
				success: boolean
				data: MonthlyMetric[]
			}>('/api/v1/financials/monthly-metrics')
			return response.data
		},
		...QUERY_CACHE_TIMES.ANALYTICS,
		retry: 2
	})
}

/**
 * Hook to fetch expense summary with category breakdown
 */
export function useExpenseSummary() {
	return useQuery({
		queryKey: financialOverviewKeys.expenseSummary(),
		queryFn: async (): Promise<ExpenseSummaryData> => {
			const response = await apiRequest<{
				success: boolean
				data: ExpenseSummaryData
			}>('/api/v1/financials/expense-summary')
			return response.data
		},
		...QUERY_CACHE_TIMES.ANALYTICS,
		retry: 2
	})
}
