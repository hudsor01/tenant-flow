import { Injectable, Logger } from '@nestjs/common'
import type { ExpenseRecord } from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'

/**
 * Financial Expense Service
 *
 * Handles expense-related queries and calculations for financial reporting.
 * Fetches expense data through maintenance_requests → units → properties relationships.
 */
@Injectable()
export class FinancialExpenseService {
	private readonly logger = new Logger(FinancialExpenseService.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Get expense summary for a given year
	 */
	async getExpenseSummary(
		property_ids: string[],
		year?: number
	): Promise<{
		totalExpenses: number
		expensesByCategory: Record<string, number>
		expenseCount: number
		averageExpense: number
		year: number
	}> {
		const targetYear = year || new Date().getFullYear()
		this.logger.log('Getting expense summary', { targetYear, propertyCount: property_ids.length })

		const { start_date, end_date } = this.calculateYearRange(targetYear)
		const expenses = await this.fetchExpenses(property_ids, start_date, end_date)

		const totalExpenses = expenses.reduce(
			(sum, expense) => sum + (expense.amount ?? 0),
			0
		)

		// NOTE: expenses table does NOT have a category column
		const expensesByCategory: Record<string, number> = {
			'Uncategorized': totalExpenses
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
	 */
	async fetchExpenses(
		property_ids: string[],
		start_date?: Date,
		end_date?: Date
	): Promise<ExpenseRecord[]> {
		if (!property_ids.length) {
			return []
		}

		try {
			let query = this.supabaseService
				.getAdminClient()
				.from('expenses')
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
					updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString()
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
