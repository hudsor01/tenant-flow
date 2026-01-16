/**
 * MaintenanceExpenseService
 *
 * Handles maintenance expense operations (CRUD for expenses).
 * Extracted from MaintenanceService for single responsibility.
 */
import { BadRequestException, Injectable } from '@nestjs/common'
import type { ExpenseRecord, MaintenanceRequest } from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class MaintenanceExpenseService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Create expense for maintenance request
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically verifies ownership
	 */
	async createExpense(
		token: string,
		expenseData: {
			maintenance_request_id: string
			vendor_name: string | null
			amount: number
			expense_date: string
		},
		maintenanceRequest: MaintenanceRequest
	): Promise<ExpenseRecord> {
		try {
			if (!token) {
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log('Creating expense via RLS-protected query', {
				expenseData
			})

			const client = this.supabase.getUserClient(token)

			const { data, error } = await client
				.from('expenses')
				.insert({
					maintenance_request_id: expenseData.maintenance_request_id,
					vendor_name: expenseData.vendor_name,
					amount: expenseData.amount,
					expense_date: expenseData.expense_date,
					owner_user_id: maintenanceRequest.owner_user_id
				})
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to create expense in Supabase', {
					error: error.message,
					expenseData
				})
				throw new BadRequestException('Failed to create expense')
			}

			return data as ExpenseRecord
		} catch (error) {
			this.logger.error('Maintenance expense service failed to create expense', {
				error: error instanceof Error ? error.message : String(error),
				expenseData
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to create expense'
			)
		}
	}

	/**
	 * Get expenses for a maintenance request
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's expenses
	 */
	async getExpenses(
		token: string,
		maintenanceId: string
	): Promise<ExpenseRecord[]> {
		try {
			if (!token || !maintenanceId) {
				this.logger.warn('Get expenses called with missing parameters', {
					maintenanceId
				})
				return []
			}

			this.logger.log('Getting expenses via RLS-protected query', {
				maintenanceId
			})

			const client = this.supabase.getUserClient(token)

			const { data, error } = await client
				.from('expenses')
				.select('*')
				.eq('maintenance_request_id', maintenanceId)
				.order('expense_date', { ascending: false })

			if (error) {
				this.logger.error('Failed to fetch expenses from Supabase', {
					error: error.message,
					maintenanceId
				})
				return []
			}

			return data as ExpenseRecord[]
		} catch (error) {
			this.logger.error('Maintenance expense service failed to get expenses', {
				error: error instanceof Error ? error.message : String(error),
				maintenanceId
			})
			return []
		}
	}

	/**
	 * Delete an expense
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically verifies ownership
	 */
	async deleteExpense(token: string, expenseId: string): Promise<void> {
		try {
			if (!token || !expenseId) {
				throw new BadRequestException(
					'Authentication token and expense ID are required'
				)
			}

			this.logger.log('Deleting expense via RLS-protected query', { expenseId })

			const client = this.supabase.getUserClient(token)

			const { error } = await client
				.from('expenses')
				.delete()
				.eq('id', expenseId)

			if (error) {
				this.logger.error('Failed to delete expense in Supabase', {
					error: error.message,
					expenseId
				})
				throw new BadRequestException('Failed to delete expense')
			}
		} catch (error) {
			this.logger.error('Maintenance expense service failed to delete expense', {
				error: error instanceof Error ? error.message : String(error),
				expenseId
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to delete expense'
			)
		}
	}
}
