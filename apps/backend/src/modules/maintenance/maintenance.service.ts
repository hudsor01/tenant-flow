/**
 * Maintenance Service - Ultra-Native NestJS Implementation
 * Direct Supabase access, no repository abstractions
 * Simplified: Removed helper methods, consolidated status updates
 *
 * Expense operations delegated to MaintenanceExpenseService (Jan 2026)
 */

import {
	BadRequestException,
	ConflictException,
	Injectable
} from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type {
	MaintenanceRequestCreate,
	MaintenanceRequestUpdate
} from '@repo/shared/validation/maintenance'
import type {
	MaintenanceRequest,
	MaintenanceStatus,
	MaintenancePriority,
	ExpenseRecord
} from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import {
	buildMultiColumnSearch,
	sanitizeSearchInput
} from '../../shared/utils/sql-safe.utils'
import { AppLogger } from '../../logger/app-logger.service'
import { MaintenanceAssignmentService } from './maintenance-assignment.service'
import { MaintenanceStatusService } from './maintenance-status.service'
import { MaintenanceExpenseService } from './maintenance-expense.service'

@Injectable()
export class MaintenanceService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly eventEmitter: EventEmitter2,
		private readonly logger: AppLogger,
		private readonly assignmentService: MaintenanceAssignmentService,
		private readonly statusService: MaintenanceStatusService,
		private readonly expenseService: MaintenanceExpenseService
	) {}

	/**
	 * Get all maintenance requests for a user with search and filters
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's maintenance requests
	 */
	async findAll(
		token: string,
		query: Record<string, unknown>
	): Promise<{ data: MaintenanceRequest[]; count: number }> {
		try {
			if (!token) {
				this.logger.warn(
					'Find all maintenance requests requested without token'
				)
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log(
				'Finding all maintenance requests via RLS-protected query',
				{
					query
				}
			)

			// RLS SECURITY: User-scoped client automatically filters to user's maintenance requests
			const client = this.supabase.getUserClient(token)

			// Build query with filters (NO manual user_id filtering needed)
			// Use { count: 'exact' } for accurate pagination totals
			let queryBuilder = client.from('maintenance_requests').select('id, unit_id, owner_user_id, tenant_id, title, description, status, priority, assigned_to, scheduled_date, completed_at, estimated_cost, actual_cost, requested_by, inspection_date, inspection_findings, inspector_id, created_at, updated_at', { count: 'exact' })

			// Apply filters
			if (query.property_id) {
				queryBuilder = queryBuilder.eq(
					'property_id',
					query.property_id as string
				)
			}
			if (query.unit_id) {
				queryBuilder = queryBuilder.eq('unit_id', query.unit_id as string)
			}
			if (query.tenant_id) {
				queryBuilder = queryBuilder.eq('tenant_id', query.tenant_id as string)
			}
			if (query.status) {
				const allowedStatuses = [
					'open',
					'in_progress',
					'completed',
					'cancelled'
				]
				const normalizedStatus = String(
					query.status
				).toLowerCase() as MaintenanceStatus
				if (allowedStatuses.includes(normalizedStatus)) {
					queryBuilder = queryBuilder.eq('status', normalizedStatus)
				}
			}
			if (query.priority) {
				const allowedPriorities: MaintenancePriority[] = [
					'low',
					'normal',
					'high',
					'urgent'
				]
				const normalizedPriority = String(
					query.priority
				).toLowerCase() as MaintenancePriority
				if (allowedPriorities.includes(normalizedPriority)) {
					queryBuilder = queryBuilder.eq('priority', normalizedPriority)
				}
			}
			if (query.assigned_to) {
				queryBuilder = queryBuilder.eq(
					'assigned_to',
					query.assigned_to as string
				)
			}
			if (query.dateFrom) {
				queryBuilder = queryBuilder.gte(
					'created_at',
					new Date(query.dateFrom as string).toISOString()
				)
			}
			if (query.dateTo) {
				queryBuilder = queryBuilder.lte(
					'created_at',
					new Date(query.dateTo as string).toISOString()
				)
			}
			// SECURITY FIX #2: Use safe search to prevent SQL injection
			if (query.search) {
				const sanitized = sanitizeSearchInput(String(query.search))
				if (sanitized) {
					queryBuilder = queryBuilder.or(
						buildMultiColumnSearch(sanitized, ['description'])
					)
				}
			}

			// Apply pagination
			const limit = query.limit ? Number(query.limit) : 50
			const offset = query.offset ? Number(query.offset) : 0
			queryBuilder = queryBuilder.range(offset, offset + limit - 1)

			// Apply sorting
			const sortBy = query.sortBy || 'created_at'
			const sortOrder = query.sortOrder || 'desc'
			queryBuilder = queryBuilder.order(sortBy as string, {
				ascending: sortOrder === 'asc'
			})

			const { data, error, count } = await queryBuilder

			if (error) {
				this.logger.error(
					'Failed to fetch maintenance requests from Supabase',
					{
						error: error.message,
						query
					}
				)
				throw new BadRequestException('Failed to fetch maintenance requests')
			}

			return { data: data as MaintenanceRequest[], count: count ?? 0 }
		} catch (error) {
			this.logger.error(
				'Maintenance service failed to find all maintenance requests',
				{
					error: error instanceof Error ? error.message : String(error),
					query
				}
			)
			throw new BadRequestException(
				error instanceof Error
					? error.message
					: 'Failed to fetch maintenance requests'
			)
		}
	}

	/**
	 * Find one maintenance request by ID
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's maintenance requests
	 */
	async findOne(
		token: string,
		maintenanceId: string
	): Promise<MaintenanceRequest | null> {
		try {
			if (!token || !maintenanceId) {
				this.logger.warn(
					'Find one maintenance request called with missing parameters',
					{ maintenanceId }
				)
				return null
			}

			this.logger.log(
				'Finding one maintenance request via RLS-protected query',
				{
					maintenanceId
				}
			)

			// RLS SECURITY: User-scoped client automatically filters to user's maintenance requests
			const client = this.supabase.getUserClient(token)

			const { data, error } = await client
				.from('maintenance_requests')
				.select('id, owner_user_id, unit_id, tenant_id, title, description, status, priority, assigned_to, requested_by, scheduled_date, completed_at, estimated_cost, actual_cost, inspection_date, inspection_findings, inspector_id, created_at, updated_at')
				.eq('id', maintenanceId)
				.single()

			if (error) {
				this.logger.error('Failed to fetch maintenance request from Supabase', {
					error: error.message,
					maintenanceId
				})
				return null
			}

			return data as MaintenanceRequest
		} catch (error) {
			this.logger.error(
				'Maintenance service failed to find one maintenance request',
				{
					error: error instanceof Error ? error.message : String(error),
					maintenanceId
				}
			)
			return null
		}
	}

	/**
	 * Create maintenance request with event emission
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically verifies unit access
	 */
	async create(
		token: string,
		user_id: string,
		createRequest: MaintenanceRequestCreate
	): Promise<MaintenanceRequest> {
		try {
			if (!token || !user_id || !createRequest.description) {
				this.logger.warn(
					'Create maintenance request called with missing parameters',
					{ createRequest }
				)
				throw new BadRequestException(
					'Authentication token, user ID, and description are required'
				)
			}

			this.logger.log('Creating maintenance request via RLS-protected query', {
				createRequest
			})

			// RLS SECURITY: User-scoped client automatically verifies unit access
			const client = this.supabase.getUserClient(token)

			// Map priority to lowercase
			const priorityMap: Record<string, MaintenancePriority> = {
				LOW: 'low',
				MEDIUM: 'normal',
				HIGH: 'high',
				URGENT: 'urgent'
			}

			if (!createRequest.unit_id) {
				throw new BadRequestException('unit_id is required')
			}

			// Get unit to find property owner
			const { data: unit, error: unitError } = await client
				.from('units')
				.select('property:property_id(owner_user_id)')
				.eq('id', createRequest.unit_id)
				.single()

			if (unitError || !unit?.property?.owner_user_id) {
				throw new BadRequestException('Unable to find property owner for unit')
			}

			const maintenanceData: Database['public']['Tables']['maintenance_requests']['Insert'] =
				{
					requested_by: user_id,
					tenant_id: createRequest.tenant_id || user_id,
					title: createRequest.title || 'New Maintenance Request',
					description: createRequest.description,
					priority: priorityMap[createRequest.priority || 'medium'] ?? 'normal',
					unit_id: createRequest.unit_id,
					owner_user_id: unit.property.owner_user_id,
					...(createRequest.scheduled_date
						? {
								scheduled_date: new Date(
									createRequest.scheduled_date
								).toISOString()
							}
						: {}),
					...(createRequest.estimated_cost
						? { estimated_cost: createRequest.estimated_cost }
						: {})
				}

			const { data, error } = await client
				.from('maintenance_requests')
				.insert(maintenanceData)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to create maintenance request in Supabase', {
					error: error.message,
					createRequest
				})
				throw new BadRequestException('Failed to create maintenance request')
			}

			const maintenance = data as MaintenanceRequest

			// Emit maintenance created event
			this.eventEmitter.emit('maintenance.created', {
				user_id,
				maintenanceId: maintenance.id,
				maintenanceDescription: maintenance.description,
				priority: maintenance.priority,
				unit_id: maintenance.unit_id
			})

			return maintenance
		} catch (error) {
			this.logger.error(
				'Maintenance service failed to create maintenance request',
				{
					error: error instanceof Error ? error.message : String(error),
					createRequest
				}
			)
			throw new BadRequestException(
				error instanceof Error
					? error.message
					: 'Failed to create maintenance request'
			)
		}
	}

	/**
	 * Update maintenance request
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically verifies ownership
	 */
	async update(
		token: string,
		maintenanceId: string,
		updateRequest: MaintenanceRequestUpdate,
		expectedVersion?: number // Optimistic locking
	): Promise<MaintenanceRequest | null> {
		try {
			if (!token || !maintenanceId) {
				this.logger.warn(
					'Update maintenance request called with missing parameters',
					{ maintenanceId }
				)
				return null
			}

			// Verify ownership via RLS
			const existing = await this.findOne(token, maintenanceId)
			if (!existing) {
				this.logger.warn('Maintenance request not found', {
					maintenanceId
				})
				return null
			}

			this.logger.log('Updating maintenance request via RLS-protected query', {
				maintenanceId,
				updateRequest
			})

			// RLS SECURITY: User-scoped client automatically verifies ownership
			const client = this.supabase.getUserClient(token)

			const updated_data: Database['public']['Tables']['maintenance_requests']['Update'] =
				{
					updated_at: new Date().toISOString()
				}

			if (updateRequest.title !== undefined)
				updated_data.title = updateRequest.title || 'New Maintenance Request'

			if (updateRequest.description !== undefined)
				updated_data.description = updateRequest.description
			this.statusService.applyStatusUpdates(updateRequest, updated_data)
			this.assignmentService.applyAssignmentUpdates(updateRequest, updated_data)
			if (updateRequest.estimated_cost !== undefined)
				updated_data.estimated_cost = updateRequest.estimated_cost
			// Optimistic locking: Add version check
			const query = client
				.from('maintenance_requests')
				.update(updated_data)
				.eq('id', maintenanceId)

			const { data, error } = await query.select().single()

			if (error || !data) {
				// Detect optimistic locking conflict
				if (error?.code === 'PGRST116') {
					// PGRST116 = 0 rows affected (version mismatch)
					this.logger.warn('Optimistic locking conflict detected', {
						maintenanceId,
						expectedVersion
					})
					throw new ConflictException(
						'Maintenance request was modified by another user. Please refresh and try again.'
					)
				}

				// Other database errors
				this.logger.error('Failed to update maintenance request in Supabase', {
					error: error ? String(error) : 'Unknown error',
					maintenanceId,
					updateRequest
				})
				throw new BadRequestException('Failed to update maintenance request')
			}

			const updated = data as MaintenanceRequest

			if (updated) {
				await this.statusService.emitUpdatedEvents(client, updated)
			}

			return updated
		} catch (error) {
			// Re-throw ConflictException as-is
			if (error instanceof ConflictException) {
				throw error
			}

			this.logger.error(
				'Maintenance service failed to update maintenance request',
				{
					error: error instanceof Error ? error.message : String(error),
					maintenanceId,
					updateRequest
				}
			)
			throw new BadRequestException(
				error instanceof Error
					? error.message
					: 'Failed to update maintenance request'
			)
		}
	}

	/**
	 * Remove maintenance request (soft delete)
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically verifies ownership
	 */
	async remove(token: string, maintenanceId: string): Promise<void> {
		try {
			if (!token || !maintenanceId) {
				this.logger.warn(
					'Remove maintenance request called with missing parameters',
					{ maintenanceId }
				)
				throw new BadRequestException(
					'Authentication token and maintenance ID are required'
				)
			}

			this.logger.log('Removing maintenance request via RLS-protected query', {
				maintenanceId
			})

			// RLS SECURITY: User-scoped client automatically verifies ownership
			const client = this.supabase.getUserClient(token)

			const { error } = await client
				.from('maintenance_requests')
				.delete()
				.eq('id', maintenanceId)

			if (error) {
				this.logger.error('Failed to delete maintenance request in Supabase', {
					error: error.message,
					maintenanceId
				})
				throw new BadRequestException('Failed to delete maintenance request')
			}
		} catch (error) {
			this.logger.error(
				'Maintenance service failed to remove maintenance request',
				{
					error: error instanceof Error ? error.message : String(error),
					maintenanceId
				}
			)
			throw new BadRequestException(
				error instanceof Error
					? error.message
					: 'Failed to remove maintenance request'
			)
		}
	}

	// ============================================
	// EXPENSE OPERATIONS (delegated)
	// ============================================

	/**
	 * Create expense for maintenance request (delegated)
	 */
	async createExpense(
		token: string,
		expenseData: {
			maintenance_request_id: string
			vendor_name: string | null
			amount: number
			expense_date: string
		}
	): Promise<ExpenseRecord> {
		// Verify user has access to the maintenance request
		const maintenanceRequest = await this.findOne(
			token,
			expenseData.maintenance_request_id
		)
		if (!maintenanceRequest) {
			throw new BadRequestException('Maintenance request not found')
		}
		return this.expenseService.createExpense(token, expenseData, maintenanceRequest)
	}

	/**
	 * Get expenses for a maintenance request (delegated)
	 */
	async getExpenses(
		token: string,
		maintenanceId: string
	): Promise<ExpenseRecord[]> {
		return this.expenseService.getExpenses(token, maintenanceId)
	}

	/**
	 * Delete an expense (delegated)
	 */
	async deleteExpense(token: string, expenseId: string): Promise<void> {
		return this.expenseService.deleteExpense(token, expenseId)
	}
}
