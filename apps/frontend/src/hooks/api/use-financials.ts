/**
 * Financials Hooks
 * TanStack Query hooks for financial data, statements, and expense management
 *
 * Includes:
 * - Financial overview and metrics
 * - Income statement, cash flow, balance sheet
 * - Expense management
 *
 * React 19 + TanStack Query v5 patterns
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { mutationKeys } from './mutation-keys'
import type {
	IncomeStatementData,
	CashFlowData,
	BalanceSheetData,
	TaxDocumentsData
} from '@repo/shared/types/financial-statements'
import type { ApiResponse } from '@repo/shared/types/api-contracts'
import type { ExpenseCategorySummary } from '@repo/shared/types/analytics'

// ============================================================================
// API RESPONSE TYPES
// These types represent the actual API response format (snake_case).
// They differ from shared domain types which use camelCase convention.
// See: FinancialOverviewSnapshot, MonthlyFinancialMetric, ExpenseSummaryResponse
// in @repo/shared/types/analytics for the domain model equivalents.
// ============================================================================

/**
 * Financial overview API response
 * @see FinancialOverviewSnapshot in shared/types/analytics for domain model
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
 * Monthly financial metrics API response
 * @see MonthlyFinancialMetric in shared/types/analytics for domain model
 */
export interface MonthlyMetric {
	month: string
	revenue: number
	expenses: number
	net_income: number
	cash_flow: number
}

/**
 * Expense summary API response
 * Uses ExpenseCategorySummary from shared for category items.
 * @see ExpenseSummaryResponse in shared/types/analytics for domain model
 */
export interface ExpenseSummaryData {
	categories: ExpenseCategorySummary[]
	monthly_totals: Array<{
		month: string
		amount: number
	}>
	total_amount: number
	monthly_average: number
	year_over_year_change: number | null
}

/**
 * Expense list item API response
 * Extended view with joined property and maintenance request data.
 * @see ExpenseRecord in shared/types/core for base database type
 */
export interface Expense {
	id: string
	description?: string
	category?: string
	amount?: number
	property_name?: string
	property_id?: string
	expense_date?: string
	vendor_name?: string
	maintenance_request_id?: string
	created_at?: string
}

/**
 * Create expense mutation input
 */
export interface CreateExpenseInput {
	amount: number
	expense_date: string
	maintenance_request_id: string
	vendor_name?: string
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const financialKeys = {
	all: ['financials'] as const,
	overview: () => [...financialKeys.all, 'overview'] as const,
	monthly: () => [...financialKeys.all, 'monthly'] as const,
	expenseSummary: () => [...financialKeys.all, 'expense-summary'] as const,
	incomeStatement: (params: { start_date: string; end_date: string }) =>
		[...financialKeys.all, 'income-statement', params] as const,
	cashFlow: (params: { start_date: string; end_date: string }) =>
		[...financialKeys.all, 'cash-flow', params] as const,
	balanceSheet: (asOfDate: string) =>
		[...financialKeys.all, 'balance-sheet', asOfDate] as const
}

export const expenseKeys = {
	all: ['expenses'] as const,
	list: () => [...expenseKeys.all, 'list'] as const,
	detail: (id: string) => [...expenseKeys.all, 'detail', id] as const,
	byProperty: (propertyId: string) =>
		[...expenseKeys.all, 'property', propertyId] as const,
	byCategory: (category: string) =>
		[...expenseKeys.all, 'category', category] as const,
	byDateRange: (start: string, end: string) =>
		[...expenseKeys.all, 'dateRange', start, end] as const
}

// Legacy key exports for backwards compatibility
export const financialOverviewKeys = financialKeys
export const financialStatementsKeys = financialKeys

// ============================================================================
// FINANCIAL OVERVIEW HOOKS
// ============================================================================

export function useFinancialOverview() {
	return useQuery({
		queryKey: financialKeys.overview(),
		queryFn: async (): Promise<FinancialOverviewData> => {
			const response = await apiRequest<{
				success: boolean
				data: FinancialOverviewData
			}>('/api/v1/financials/overview')
			return response.data
		},
		...QUERY_CACHE_TIMES.ANALYTICS
	})
}

export function useMonthlyMetrics() {
	return useQuery({
		queryKey: financialKeys.monthly(),
		queryFn: async (): Promise<MonthlyMetric[]> => {
			const response = await apiRequest<{
				success: boolean
				data: MonthlyMetric[]
			}>('/api/v1/financials/monthly-metrics')
			return response.data
		},
		...QUERY_CACHE_TIMES.ANALYTICS
	})
}

export function useExpenseSummary() {
	return useQuery({
		queryKey: financialKeys.expenseSummary(),
		queryFn: async (): Promise<ExpenseSummaryData> => {
			const response = await apiRequest<{
				success: boolean
				data: ExpenseSummaryData
			}>('/api/v1/financials/expense-summary')
			return response.data
		},
		...QUERY_CACHE_TIMES.ANALYTICS
	})
}

// ============================================================================
// FINANCIAL STATEMENTS HOOKS
// ============================================================================

export function useIncomeStatement(params: {
	start_date: string
	end_date: string
}) {
	return useQuery<ApiResponse<IncomeStatementData>>({
		queryKey: financialKeys.incomeStatement(params),
		queryFn: async () => {
			const searchParams = new URLSearchParams({
				start_date: params.start_date,
				end_date: params.end_date
			})
			return apiRequest<ApiResponse<IncomeStatementData>>(
				`/api/v1/financials/income-statement?${searchParams.toString()}`
			)
		},
		...QUERY_CACHE_TIMES.ANALYTICS
	})
}

export function useCashFlow(params: { start_date: string; end_date: string }) {
	return useQuery<ApiResponse<CashFlowData>>({
		queryKey: financialKeys.cashFlow(params),
		queryFn: async () => {
			const searchParams = new URLSearchParams({
				start_date: params.start_date,
				end_date: params.end_date
			})
			return apiRequest<ApiResponse<CashFlowData>>(
				`/api/v1/financials/cash-flow?${searchParams.toString()}`
			)
		},
		...QUERY_CACHE_TIMES.ANALYTICS
	})
}

export function useBalanceSheet(asOfDate: string) {
	return useQuery<ApiResponse<BalanceSheetData>>({
		queryKey: financialKeys.balanceSheet(asOfDate),
		queryFn: async () => {
			const searchParams = new URLSearchParams({ asOfDate })
			return apiRequest<ApiResponse<BalanceSheetData>>(
				`/api/v1/financials/balance-sheet?${searchParams.toString()}`
			)
		},
		...QUERY_CACHE_TIMES.ANALYTICS
	})
}

// ============================================================================
// EXPENSE HOOKS
// ============================================================================

export function useExpenses(options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: expenseKeys.list(),
		queryFn: async (): Promise<Expense[]> => {
			const response = await apiRequest<{ success: boolean; data: Expense[] }>(
				'/api/v1/financials/expenses'
			)
			return response.data
		},
		...QUERY_CACHE_TIMES.LIST,
		enabled: options?.enabled ?? true
	})
}

export function useExpensesByProperty(
	propertyId: string,
	options?: { enabled?: boolean }
) {
	return useQuery({
		queryKey: expenseKeys.byProperty(propertyId),
		queryFn: async (): Promise<Expense[]> => {
			const response = await apiRequest<{ success: boolean; data: Expense[] }>(
				`/api/v1/financials/expenses?property_id=${propertyId}`
			)
			return response.data
		},
		...QUERY_CACHE_TIMES.LIST,
		enabled: (options?.enabled ?? true) && Boolean(propertyId)
	})
}

export function useExpensesByDateRange(
	startDate: string,
	endDate: string,
	options?: { enabled?: boolean }
) {
	return useQuery({
		queryKey: expenseKeys.byDateRange(startDate, endDate),
		queryFn: async (): Promise<Expense[]> => {
			const params = new URLSearchParams({
				start_date: startDate,
				end_date: endDate
			})
			const response = await apiRequest<{ success: boolean; data: Expense[] }>(
				`/api/v1/financials/expenses?${params.toString()}`
			)
			return response.data
		},
		...QUERY_CACHE_TIMES.LIST,
		enabled:
			(options?.enabled ?? true) && Boolean(startDate) && Boolean(endDate)
	})
}

export function useCreateExpenseMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.expenses.create,
		mutationFn: async (input: CreateExpenseInput): Promise<Expense> => {
			const response = await apiRequest<{ success: boolean; data: Expense }>(
				'/api/v1/financials/expenses',
				{
					method: 'POST',
					body: JSON.stringify(input)
				}
			)
			return response.data
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: expenseKeys.all })
		}
	})
}

export function useDeleteExpenseMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.expenses.delete,
		mutationFn: async (expenseId: string): Promise<void> => {
			await apiRequest(`/api/v1/financials/expenses/${expenseId}`, {
				method: 'DELETE'
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: expenseKeys.all })
		}
	})
}

// ============================================================================
// Tax Documents
// ============================================================================

export const taxDocumentKeys = {
	all: ['taxDocuments'] as const,
	byYear: (taxYear: number) => [...taxDocumentKeys.all, taxYear] as const
}

export function useTaxDocuments(taxYear?: number) {
	const year = taxYear ?? new Date().getFullYear()

	return useQuery({
		queryKey: taxDocumentKeys.byYear(year),
		queryFn: async (): Promise<TaxDocumentsData> => {
			const response = await apiRequest<{ success: boolean; data: TaxDocumentsData }>(
				`/api/v1/financials/tax-documents?taxYear=${year}`
			)
			return response.data
		},
		...QUERY_CACHE_TIMES.STATS
	})
}
