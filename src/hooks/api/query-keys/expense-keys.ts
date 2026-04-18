import { queryOptions, mutationOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { mutationKeys } from '../mutation-keys'
import type { TaxDocumentsData } from '#types/financial-statements'

export const financialTaxQueries = {
	taxDocuments: (year: number) =>
		queryOptions({
			queryKey: ['financials', 'tax-documents', year] as const,
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

// Separate root from financialKeys to preserve cache structure across consumers.
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

export const expenseQueries = {
	list: (options?: { enabled?: boolean }) =>
		queryOptions({
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
		}),

	byProperty: (propertyId: string, options?: { enabled?: boolean }) =>
		queryOptions({
			queryKey: expenseKeys.byProperty(propertyId),
			queryFn: async (): Promise<Expense[]> => {
				const supabase = createClient()
				// expenses table has no property_id column — filter via maintenance_requests join
				const { data: mrIds, error: mrError } = await supabase
					.from('maintenance_requests')
					.select('id')
					.eq('property_id', propertyId)
				if (mrError) handlePostgrestError(mrError, 'maintenance_requests')
				const ids = (mrIds ?? []).map(r => r.id)
				if (ids.length === 0) return []
				const { data, error } = await supabase
					.from('expenses')
					.select('id, amount, expense_date, vendor_name, maintenance_request_id, created_at')
					.in('maintenance_request_id', ids)
					.order('expense_date', { ascending: false })
				if (error) handlePostgrestError(error, 'expenses by property')
				return (data ?? []) as Expense[]
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			enabled: (options?.enabled ?? true) && Boolean(propertyId)
		}),

	byDateRange: (startDate: string, endDate: string, options?: { enabled?: boolean }) =>
		queryOptions({
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
			enabled: (options?.enabled ?? true) && Boolean(startDate) && Boolean(endDate)
		})
}

export interface CreateExpenseInput {
	amount: number
	expense_date: string
	maintenance_request_id: string
	vendor_name?: string
}

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

export const financialMutations = {
	createExpense: () =>
		mutationOptions({
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
			}
		}),

	deleteExpense: () =>
		mutationOptions({
			mutationKey: mutationKeys.expenses.delete,
			mutationFn: async (expenseId: string): Promise<void> => {
				const supabase = createClient()
				const { error } = await supabase
					.from('expenses')
					.delete()
					.eq('id', expenseId)
				if (error) handlePostgrestError(error, 'delete expense')
			}
		})
}
