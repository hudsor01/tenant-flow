/**
 * Financial Statements API Hooks
 *
 * TanStack Query hooks for income statement, cash flow, and balance sheet endpoints.
 * Follows the pattern from use-dashboard.ts with proper caching and error handling.
 */

import { useQuery } from '@tanstack/react-query'
import { clientFetch } from '#lib/api/client'
import { QUERY_CACHE_TIMES } from '#lib/constants'
import type {
	IncomeStatementData,
	CashFlowData,
	BalanceSheetData
} from '@repo/shared/types/financial-statements'

/**
 * API response wrapper type (backend returns {success: true, data})
 */
type ApiResponse<T> = {
	success: boolean
	data: T
}

/**
 * Query keys for financial statements (hierarchical, typed)
 */
export const financialStatementsKeys = {
	all: ['financial-statements'] as const,
	incomeStatement: (params: { startDate: string; endDate: string }) =>
		[...financialStatementsKeys.all, 'income-statement', params] as const,
	cashFlow: (params: { startDate: string; endDate: string }) =>
		[...financialStatementsKeys.all, 'cash-flow', params] as const,
	balanceSheet: (asOfDate: string) =>
		[...financialStatementsKeys.all, 'balance-sheet', asOfDate] as const
}

/**
 * Hook to fetch income statement data
 * Returns revenue, expenses, and net income with period comparisons
 */
export function useIncomeStatement(params: {
	startDate: string
	endDate: string
}) {
	return useQuery<ApiResponse<IncomeStatementData>>({
		queryKey: financialStatementsKeys.incomeStatement(params),
		queryFn: async () => {
			const searchParams = new URLSearchParams({
				startDate: params.startDate,
				endDate: params.endDate
			})
			return clientFetch<ApiResponse<IncomeStatementData>>(
				`/api/v1/financials/income-statement?${searchParams.toString()}`
			)
		},
		...QUERY_CACHE_TIMES.ANALYTICS,
		retry: 2,
		retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000)
	})
}

/**
 * Hook to fetch cash flow statement data
 * Returns operating, investing, and financing activities
 */
export function useCashFlow(params: { startDate: string; endDate: string }) {
	return useQuery<ApiResponse<CashFlowData>>({
		queryKey: financialStatementsKeys.cashFlow(params),
		queryFn: async () => {
			const searchParams = new URLSearchParams({
				startDate: params.startDate,
				endDate: params.endDate
			})
			return clientFetch<ApiResponse<CashFlowData>>(
				`/api/v1/financials/cash-flow?${searchParams.toString()}`
			)
		},
		...QUERY_CACHE_TIMES.ANALYTICS,
		retry: 2,
		retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000)
	})
}

/**
 * Hook to fetch balance sheet data
 * Returns assets, liabilities, and equity at a point in time
 */
export function useBalanceSheet(asOfDate: string) {
	return useQuery<ApiResponse<BalanceSheetData>>({
		queryKey: financialStatementsKeys.balanceSheet(asOfDate),
		queryFn: async () => {
			const searchParams = new URLSearchParams({
				asOfDate
			})
			return clientFetch<ApiResponse<BalanceSheetData>>(
				`/api/v1/financials/balance-sheet?${searchParams.toString()}`
			)
		},
		...QUERY_CACHE_TIMES.ANALYTICS,
		retry: 2,
		retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000)
	})
}
