/**
 * Financial Mutation Options
 * mutationOptions() factories for expense CRUD.
 *
 * Factories contain ONLY mutationKey + mutationFn.
 * onSuccess/onError/onSettled remain in the hook files.
 */

import { mutationOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { mutationKeys } from '../mutation-keys'

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// MUTATION OPTIONS FACTORIES
// ============================================================================

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
