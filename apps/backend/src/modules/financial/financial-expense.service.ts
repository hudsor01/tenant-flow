import { Injectable } from '@nestjs/common'
import type { ExpenseRecord } from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'

/**
 * Financial Expense Service
 *
 * Handles expense-related queries and calculations for financial reporting.
 * Fetches expense data through maintenance_requests → units → properties relationships.
 *
 * SEC-001: FIXED - Token is now required, getAdminClient() fallback removed.
 * All queries use getUserClient(token) to enforce RLS.
 */
@Injectable()
export class FinancialExpenseService {
	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get expense summary for a given year
	 * @param token - Required Supabase access token for RLS enforcement
	 */
	async getExpenseSummary(
		property_ids: string[],
		year: number | undefined,
		token: string
	): Promise<{
		totalExpenses: number
		expensesByCategory: Record<string, number>
		expenseCount: number
		averageExpense: number
		year: number
	}> {
		const targetYear = year || new Date().getFullYear()
		this.logger.log('Getting expense summary', {
			targetYear,
			propertyCount: property_ids.length
		})

		const { start_date, end_date } = this.calculateYearRange(targetYear)
		const expenses = await this.fetchExpenses(
			property_ids,
			start_date,
			end_date,
			token
		)

		const totalExpenses = expenses.reduce(
			(sum, expense) => sum + (expense.amount ?? 0),
			0
		)

		// NOTE: expenses table does NOT have a category column
		const expensesByCategory: Record<string, number> = {
			Uncategorized: totalExpenses
		}

		return {
			totalExpenses,
			expensesByCategory,
			expenseCount: expenses.length,
			averageExpense: expenses.length > 0 ? totalExpenses / expenses.length : 0,
			year: targetYear
		}
	}

	/**
	 * Fetch expenses for given property IDs with optional date range
	 * Expenses link through: expenses → maintenance_requests → units → properties
	 * @param token - Required Supabase access token for RLS enforcement
	 */
	async fetchExpenses(
		property_ids: string[],
		start_date: Date | undefined,
		end_date: Date | undefined,
		token: string
	): Promise<ExpenseRecord[]> {
		if (!property_ids.length) {
			return []
		}

		if (!token) {
			this.logger.error('fetchExpenses called without token - RLS bypass prevented')
			throw new Error('Authentication token required for expense queries')
		}

		try {
			const client = this.supabaseService.getUserClient(token)

			let query = client.from('expenses')
				.select(`
					*,
					maintenance_requests!inner (
						unit_id,
						units!inner (
							property_id
						)
					)
				`)

			if (start_date) {
				query = query.gte('expense_date', start_date.toISOString())
			}
			if (end_date) {
				query = query.lte('expense_date', end_date.toISOString())
			}

			const { data, error } = await query

			if (error) {
				this.logger.error('Failed to fetch expense data', {
					error: error.message,
					propertyCount: property_ids.length,
					start_date: start_date?.toISOString(),
					end_date: end_date?.toISOString()
				})
				return []
			}

			// Filter by property_id through the join
			const filtered = (data ?? []).filter(
				(row: {
					maintenance_requests?: { units?: { property_id?: string } }
				}) => {
					const property_id = row.maintenance_requests?.units?.property_id
					return property_id ? property_ids.includes(property_id) : false
				}
			)

			return filtered.map(
				(row: {
					id: string
					maintenance_request_id: string
					vendor_name: string | null
					amount: number
					expense_date: string
					created_at: string | null
					updated_at: string | null
				}) => ({
					id: row.id,
					maintenance_request_id: row.maintenance_request_id,
					vendor_name: row.vendor_name ?? 'Unknown Vendor',
					amount: row.amount,
					expense_date: row.expense_date,
					created_at: row.created_at ?? new Date().toISOString(),
					updated_at:
						row.updated_at ?? row.created_at ?? new Date().toISOString()
				})
			) as ExpenseRecord[]
		} catch (error) {
			this.logger.error('Unexpected error fetching expenses', {
				error: error instanceof Error ? error.message : String(error),
				propertyCount: property_ids.length
			})
			return []
		}
	}

	/**
	 * Group expenses by month for trend analysis
	 */
	groupExpensesByMonth(expenses: ExpenseRecord[]): Map<string, number> {
		const map = new Map<string, number>()
		for (const expense of expenses) {
			if (!expense.expense_date) {
				continue
			}
			const expenseDate = new Date(expense.expense_date)
			const key = this.buildMonthKey(
				expenseDate.getFullYear(),
				expenseDate.getMonth()
			)
			map.set(key, (map.get(key) ?? 0) + (expense.amount ?? 0))
		}
		return map
	}

	/**
	 * Calculate year date range
	 */
	calculateYearRange(year: number): { start_date: Date; end_date: Date } {
		const start_date = new Date(year, 0, 1)
		start_date.setHours(0, 0, 0, 0)
		const end_date = new Date(year + 1, 0, 1)
		end_date.setHours(23, 59, 59, 999)
		return { start_date, end_date }
	}

	/**
	 * Build month key for grouping (YYYY-MM format)
	 */
	buildMonthKey(year: number, monthIndex: number): string {
		return `${year}-${(monthIndex + 1).toString().padStart(2, '0')}`
	}
}
