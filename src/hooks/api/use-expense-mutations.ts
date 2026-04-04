/**
 * Expense Hooks — expense queries, CRUD mutations, and tax documents.
 * Financial overview/statement hooks remain in use-financials.ts.
 *
 * Query keys and queryOptions factories live in query-keys/financial-keys.ts.
 * This file re-exports keys for backward compatibility and provides thin hooks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financialMutations, expenseKeys, expenseQueries, financialTaxQueries } from './query-keys/financial-keys'
import { createMutationCallbacks } from '#hooks/create-mutation-callbacks'

// Re-export types from factory for backward compatibility
export type { Expense, CreateExpenseInput } from './query-keys/financial-keys'

// Re-export keys for existing consumers
export { expenseKeys, taxDocumentKeys } from './query-keys/financial-keys'

// ============================================================================
// EXPENSE QUERY HOOKS
// ============================================================================

export function useExpenses(options?: { enabled?: boolean }) {
	return useQuery(expenseQueries.list(options))
}

export function useExpensesByProperty(
	propertyId: string,
	options?: { enabled?: boolean }
) {
	return useQuery(expenseQueries.byProperty(propertyId, options))
}

export function useExpensesByDateRange(
	startDate: string,
	endDate: string,
	options?: { enabled?: boolean }
) {
	return useQuery(expenseQueries.byDateRange(startDate, endDate, options))
}

// ============================================================================
// EXPENSE MUTATION HOOKS
// ============================================================================

export function useCreateExpenseMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...financialMutations.createExpense(),
		...createMutationCallbacks(queryClient, {
			invalidate: [expenseKeys.all],
			errorContext: 'Create expense'
		})
	})
}

export function useDeleteExpenseMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...financialMutations.deleteExpense(),
		...createMutationCallbacks(queryClient, {
			invalidate: [expenseKeys.all],
			errorContext: 'Delete expense'
		})
	})
}

// ============================================================================
// TAX DOCUMENTS
// ============================================================================

export function useTaxDocuments(taxYear?: number) {
	const year = taxYear ?? new Date().getFullYear()
	return useQuery(financialTaxQueries.taxDocuments(year))
}
