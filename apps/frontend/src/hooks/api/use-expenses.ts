/**
 * Expenses API Hooks
 *
 * TanStack Query hooks for expense management endpoints.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'

/**
 * Expense record shape
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
 * Create expense input
 */
export interface CreateExpenseInput {
	description: string
	category: string
	amount: number
	property_id?: string
	expense_date: string
	vendor_name?: string
	maintenance_request_id?: string
}

/**
 * Query keys for expenses
 */
export const expenseKeys = {
	all: ['expenses'] as const,
	list: () => [...expenseKeys.all, 'list'] as const,
	detail: (id: string) => [...expenseKeys.all, 'detail', id] as const,
	byProperty: (propertyId: string) => [...expenseKeys.all, 'property', propertyId] as const,
	byCategory: (category: string) => [...expenseKeys.all, 'category', category] as const,
	byDateRange: (start: string, end: string) =>
		[...expenseKeys.all, 'dateRange', start, end] as const
}

/**
 * Hook to fetch all expenses
 */
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
		retry: 2,
		enabled: options?.enabled ?? true
	})
}

/**
 * Hook to fetch expenses by property
 */
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
		retry: 2,
		enabled: (options?.enabled ?? true) && Boolean(propertyId)
	})
}

/**
 * Hook to fetch expenses within a date range
 */
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
		retry: 2,
		enabled: (options?.enabled ?? true) && Boolean(startDate) && Boolean(endDate)
	})
}

/**
 * Hook to create a new expense
 */
export function useCreateExpense() {
	const queryClient = useQueryClient()

	return useMutation({
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

/**
 * Hook to delete an expense
 */
export function useDeleteExpense() {
	const queryClient = useQueryClient()

	return useMutation({
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
