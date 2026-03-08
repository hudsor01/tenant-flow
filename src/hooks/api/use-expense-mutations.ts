/**
 * Expense Hooks — expense queries, CRUD mutations, and tax documents.
 * Financial overview/statement hooks remain in use-financials.ts.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { handleMutationError } from '#lib/mutation-error-handler'
import { mutationKeys } from './mutation-keys'
import type { TaxDocumentsData } from '#types/financial-statements'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Expense list item API response
 * Extended view with joined property and maintenance request data.
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

/** Create expense mutation input */
export interface CreateExpenseInput {
	amount: number
	expense_date: string
	maintenance_request_id: string
	vendor_name?: string
}

// ============================================================================
// QUERY KEYS
// ============================================================================

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

export const taxDocumentKeys = {
	all: ['taxDocuments'] as const,
	byYear: (taxYear: number) => [...taxDocumentKeys.all, taxYear] as const
}

// ============================================================================
// EXPENSE QUERY HOOKS
// ============================================================================

export function useExpenses(options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: expenseKeys.list(),
		queryFn: async (): Promise<Expense[]> => {
			const supabase = createClient()
			const { data, error } = await supabase
				.from('expenses')
				.select('id, amount, expense_date, vendor_name, maintenance_request_id, created_at')
				.order('expense_date', { ascending: false })
			if (error) handlePostgrestError(error, 'expenses')
			return (data ?? []) as Expense[]
		},
		staleTime: 2 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
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
			const supabase = createClient()
			const { data, error } = await supabase
				.from('expenses')
				.select('id, amount, expense_date, vendor_name, maintenance_request_id, created_at')
				.order('expense_date', { ascending: false })
			if (error) handlePostgrestError(error, 'expenses by property')
			void propertyId
			return (data ?? []) as Expense[]
		},
		staleTime: 2 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
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
			const supabase = createClient()
			const { data, error } = await supabase
				.from('expenses')
				.select('id, amount, expense_date, vendor_name, maintenance_request_id, created_at')
				.gte('expense_date', startDate)
				.lte('expense_date', endDate)
				.order('expense_date', { ascending: false })
			if (error) handlePostgrestError(error, 'expenses by date range')
			return (data ?? []) as Expense[]
		},
		staleTime: 2 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		enabled:
			(options?.enabled ?? true) && Boolean(startDate) && Boolean(endDate)
	})
}

// ============================================================================
// EXPENSE MUTATION HOOKS
// ============================================================================

export function useCreateExpenseMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.expenses.create,
		mutationFn: async (input: CreateExpenseInput): Promise<Expense> => {
			const supabase = createClient()
			const { data, error } = await supabase
				.from('expenses')
				.insert({
					amount: input.amount,
					expense_date: input.expense_date,
					maintenance_request_id: input.maintenance_request_id,
					vendor_name: input.vendor_name
				})
				.select('id, amount, expense_date, vendor_name, maintenance_request_id, created_at')
				.single()
			if (error) handlePostgrestError(error, 'create expense')
			return data as Expense
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: expenseKeys.all })
		},
		onError: (error: unknown) => handleMutationError(error, 'Create expense')
	})
}

export function useDeleteExpenseMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.expenses.delete,
		mutationFn: async (expenseId: string): Promise<void> => {
			const supabase = createClient()
			const { error } = await supabase
				.from('expenses')
				.delete()
				.eq('id', expenseId)
			if (error) handlePostgrestError(error, 'delete expense')
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: expenseKeys.all })
		},
		onError: (error: unknown) => handleMutationError(error, 'Delete expense')
	})
}

// ============================================================================
// TAX DOCUMENTS
// ============================================================================

export function useTaxDocuments(taxYear?: number) {
	const year = taxYear ?? new Date().getFullYear()

	return useQuery({
		queryKey: taxDocumentKeys.byYear(year),
		queryFn: async (): Promise<TaxDocumentsData> => {
			const supabase = createClient()
			const user = await getCachedUser()
			const userId = user?.id
			if (!userId) {
				return {
					period: { start_date: `${year}-01-01`, end_date: `${year}-12-31`, label: `Tax Year ${year}` },
					taxYear: year,
					totals: { totalIncome: 0, totalDeductions: 0, netTaxableIncome: 0 },
					incomeBreakdown: { grossRentalIncome: 0, totalExpenses: 0, netOperatingIncome: 0, depreciation: 0, mortgageInterest: 0, taxableIncome: 0 },
					schedule: { scheduleE: { grossRentalIncome: 0, totalExpenses: 0, depreciation: 0, netIncome: 0 } },
					expenseCategories: [],
					propertyDepreciation: []
				}
			}

			const [dashResult, expenseResult] = await Promise.all([
				supabase.rpc('get_dashboard_stats', { p_user_id: userId }),
				supabase.rpc('get_expense_summary', { p_user_id: userId })
			])

			if (dashResult.error) handlePostgrestError(dashResult.error, 'tax documents')

			const stats = (dashResult.data as Array<Record<string, unknown>> | null)?.[0]
			const revenue = stats?.revenue as Record<string, unknown> | undefined
			const totalIncome = Number(revenue?.yearly ?? 0)
			const expenseSummary = expenseResult.data as Record<string, unknown> | null
			const totalExpenses = Number(expenseSummary?.total_amount ?? 0)
			const netIncome = totalIncome - totalExpenses

			return {
				period: { start_date: `${year}-01-01`, end_date: `${year}-12-31`, label: `Tax Year ${year}` },
				taxYear: year,
				totals: { totalIncome, totalDeductions: totalExpenses, netTaxableIncome: netIncome },
				incomeBreakdown: {
					grossRentalIncome: totalIncome,
					totalExpenses,
					netOperatingIncome: netIncome,
					depreciation: 0,
					mortgageInterest: 0,
					taxableIncome: netIncome
				},
				schedule: { scheduleE: { grossRentalIncome: totalIncome, totalExpenses, depreciation: 0, netIncome } },
				expenseCategories: ((expenseSummary?.categories ?? []) as Array<Record<string, unknown>>).map(c => ({
					category: String(c.category ?? ''),
					amount: Number(c.amount ?? 0),
					percentage: Number(c.percentage ?? 0),
					deductible: true
				})),
				propertyDepreciation: []
			}
		},
		staleTime: 2 * 60 * 1000,
		gcTime: 10 * 60 * 1000
	})
}
