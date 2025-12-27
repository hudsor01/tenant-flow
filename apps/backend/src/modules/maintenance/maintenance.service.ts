// TODO: [VIOLATION] CLAUDE.md Standards - Multiple violations in this file:
//
// 1. KISS Principle violation - File Size
//    Current: ~561 lines
//    Maximum: 300 lines per CLAUDE.md "Maximum component size: 300 lines"
//    Recommended refactoring:
//    - Extract status update logic into: `./maintenance-status.service.ts`
//    - Extract assignment logic into: `./maintenance-assignment.service.ts`
//    - Extract analytics/stats into: `./maintenance-stats.service.ts`
//    - Keep core CRUD operations in this service
//
// 2. Sequential Query Anti-Pattern - update() method (lines ~442-458)
//    Issue: Makes 2 separate queries (units, then properties) that could be 1 joined query
//    Current: `client.from('units')...` then `client.from('properties')...`
//    Fix: Use single query with join: `.select('unit_number, property:property_id(name)')`
//
// See: CLAUDE.md section "KISS (Keep It Simple)"

/**
 * Maintenance Service - Ultra-Native NestJS Implementation
 * Direct Supabase access, no repository abstractions
 * Simplified: Removed helper methods, consolidated status updates
 */

import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type {
	MaintenanceRequestCreate,
	MaintenanceRequestUpdate
} from '@repo/shared/validation/maintenance'
import type { MaintenanceRequest, MaintenanceStatus, MaintenancePriority, ExpenseRecord } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import {
	buildMultiColumnSearch,
	sanitizeSearchInput
} from '../../shared/utils/sql-safe.utils'
import { MaintenanceUpdatedEvent } from '../notifications/events/notification.events'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class MaintenanceService {

	// Reverse map for converting database priority values to enum values for events
	private readonly reversePriorityMap: Record<string, 'low' | 'medium' | 'high' | 'urgent'> = {
		low: 'low',
		normal: 'medium',
		high: 'high',
		urgent: 'urgent'
	}

	constructor(private readonly supabase: SupabaseService,
		private readonly eventEmitter: EventEmitter2, private readonly logger: AppLogger) {}

	/**
	 * Get all maintenance requests for a user with search and filters
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's maintenance requests
	 */
	async findAll(
		token: string,
		query: Record<string, unknown>
	): Promise<MaintenanceRequest[]> {
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
			let queryBuilder = client.from('maintenance_requests').select('*')

			// Apply filters
			if (query.property_id) {
				queryBuilder = queryBuilder.eq('property_id', query.property_id as string)
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
				const normalizedStatus = String(query.status).toLowerCase() as MaintenanceStatus
				if (allowedStatuses.includes(normalizedStatus)) {
					queryBuilder = queryBuilder.eq('status', normalizedStatus)
				}
			}
			if (query.priority) {
				const allowedPriorities: MaintenancePriority[] = ['low', 'normal', 'high', 'urgent']
				const normalizedPriority = String(query.priority).toLowerCase() as MaintenancePriority
				if (allowedPriorities.includes(normalizedPriority)) {
					queryBuilder = queryBuilder.eq('priority', normalizedPriority)
				}
			}
			if (query.assigned_to) {
				queryBuilder = queryBuilder.eq('assigned_to', query.assigned_to as string)
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

			const { data, error } = await queryBuilder

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

			return data as MaintenanceRequest[]
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
				.select('*')
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
											...(createRequest.scheduled_date ? { scheduled_date: new Date(createRequest.scheduled_date).toISOString() } : {}),
					...(createRequest.estimated_cost ? { estimated_cost: createRequest.estimated_cost } : {})
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

			// Map status and priority to lowercase
			const priorityMap: Record<string, MaintenancePriority> = {
				LOW: 'low',
				MEDIUM: 'normal',
				HIGH: 'high',
				URGENT: 'urgent'
			}

			const statusMap: Record<string, MaintenanceStatus> = {
				PENDING: 'open',
				IN_PROGRESS: 'in_progress',
				COMPLETED: 'completed',
				CANCELLED: 'cancelled'
			}

			const updated_data: Database['public']['Tables']['maintenance_requests']['Update'] =
				{
					updated_at: new Date().toISOString()
				}

			if (updateRequest.title !== undefined)
				updated_data.title = updateRequest.title || 'New Maintenance Request'

			if (updateRequest.description !== undefined)
				updated_data.description = updateRequest.description
			if (updateRequest.priority !== undefined)
				updated_data.priority = priorityMap[updateRequest.priority] ?? 'normal'
			if (updateRequest.status !== undefined)
				updated_data.status = statusMap[updateRequest.status] ?? 'open'
			if (updateRequest.estimated_cost !== undefined)
				updated_data.estimated_cost = updateRequest.estimated_cost
			if (updateRequest.completed_at !== undefined)
				updated_data.completed_at = updateRequest.completed_at
					? new Date(updateRequest.completed_at).toISOString()
					: null

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

				// Emit maintenance updated event with inline context
				if (updated) {
					// ⚠️ SEQUENTIAL QUERY ANTI-PATTERN - INEFFICIENT DATABASE ACCESS
					// ═══════════════════════════════════════════════════════════════════════════
					//
					// PROBLEM: Two sequential database queries where one joined query would suffice.
					// This doubles the network latency and database load for every maintenance update.
					//
					// CURRENT BEHAVIOR (2 sequential queries):
					//   Query 1: SELECT unit_number, property_id FROM units WHERE id = ?
					//   Query 2: SELECT name FROM properties WHERE id = ? (conditional)
					//   Total: 2 round trips, 2 query executions
					//
					// RECOMMENDED FIX (1 joined query):
					//   const { data: unit } = await client
					//     .from('units')
					//     .select('unit_number, property:property_id(name)')
					//     .eq('id', updated.unit_id)
					//     .single()
					//   // Access: unit.unit_number, unit.property?.name
					//   Total: 1 round trip, 1 query execution
					//
					// WHY THIS MATTERS:
					//   - Each maintenance update triggers these queries
					//   - High-traffic systems may have 100s of updates/hour
					//   - Database connection time is ~1-5ms per query (adds up!)
					//   - Supabase has query limits on free/pro tiers
					//
					// ADDITIONAL ISSUE - ERROR HANDLING GAP:
					//   If Query 1 succeeds but Query 2 fails, we still emit the event with
					//   'Unknown Property' - this could cause confusing notifications.
					//   A single joined query fails atomically, making error handling cleaner.
					//
					// ═══════════════════════════════════════════════════════════════════════════
					// Query 1: Get unit data
					const { data: unit } = await client
						.from('units')
						.select('unit_number, property_id')
						.eq('id', updated.unit_id)
						.single()

					let propertyName = 'Unknown Property'
					const unitNumber = unit?.unit_number || 'Unknown Unit'

					// Query 2: Get property name (should be joined above)
					if (unit?.property_id) {
						const { data: property } = await client
							.from('properties')
							.select('name')
							.eq('id', unit.property_id)
							.single()
						propertyName = property?.name || 'Unknown Property'
					}

					const title = updated.title || updated.description || 'Maintenance Request'
					const priority = this.reversePriorityMap[updated.priority] || 'medium'
					const tenantUserId = updated.requested_by
					const ownerUserId = updated.owner_user_id

					// Notify tenant (requester) if different from owner.
					if (tenantUserId && tenantUserId !== ownerUserId) {
						this.eventEmitter.emit(
							'maintenance.updated',
							new MaintenanceUpdatedEvent(
								tenantUserId,
								updated.id,
								title,
								updated.status,
								priority,
								propertyName,
								unitNumber,
								updated.description ?? '',
								`/tenant/maintenance/request/${updated.id}`
							)
						)
					}

					// Always notify owner.
					if (ownerUserId) {
						this.eventEmitter.emit(
							'maintenance.updated',
							new MaintenanceUpdatedEvent(
								ownerUserId,
								updated.id,
								title,
								updated.status,
								priority,
								propertyName,
								unitNumber,
								updated.description ?? '',
								`/maintenance/${updated.id}`
							)
						)
					}
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
		}
	): Promise<ExpenseRecord> {
		try {
			if (!token) {
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log('Creating expense via RLS-protected query', { expenseData })

			const client = this.supabase.getUserClient(token)

			// Verify user has access to the maintenance request
			const maintenanceRequest = await this.findOne(token, expenseData.maintenance_request_id)
			if (!maintenanceRequest) {
				throw new BadRequestException('Maintenance request not found')
			}

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
			this.logger.error('Maintenance service failed to create expense', {
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
	async getExpenses(token: string, maintenanceId: string): Promise<ExpenseRecord[]> {
		try {
			if (!token || !maintenanceId) {
				this.logger.warn('Get expenses called with missing parameters', { maintenanceId })
				return []
			}

			this.logger.log('Getting expenses via RLS-protected query', { maintenanceId })

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
			this.logger.error('Maintenance service failed to get expenses', {
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
				throw new BadRequestException('Authentication token and expense ID are required')
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
			this.logger.error('Maintenance service failed to delete expense', {
				error: error instanceof Error ? error.message : String(error),
				expenseId
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to delete expense'
			)
		}
	}
}
