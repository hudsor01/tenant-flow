/**
 * Maintenance Service - Ultra-Native NestJS Implementation
 * Direct Supabase access, no repository abstractions
 * Simplified: Removed helper methods, consolidated status updates
 */

import {
	BadRequestException,
	ConflictException,
	Injectable,
	Logger
} from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type {
	CreateMaintenanceRequest,
	UpdateMaintenanceRequest
} from '@repo/shared/types/api-contracts'
import type {
	MaintenanceRequest,
	MaintenanceStats
} from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import {
	buildMultiColumnSearch,
	sanitizeSearchInput
} from '../../shared/utils/sql-safe.utils'
import { MaintenanceUpdatedEvent } from '../notifications/events/notification.events'

@Injectable()
export class MaintenanceService {
	private readonly logger = new Logger(MaintenanceService.name)

	// Reverse map for converting database priority values to enum values for events
	private readonly reversePriorityMap: Record<string, 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'> = {
		low: 'LOW',
		normal: 'MEDIUM',
		high: 'HIGH',
		urgent: 'URGENT'
	}

	constructor(
		private readonly supabase: SupabaseService,
		private readonly eventEmitter: EventEmitter2
	) {}

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
				const normalizedStatus = String(query.status).toLowerCase()
				if (allowedStatuses.includes(normalizedStatus)) {
					queryBuilder = queryBuilder.eq('status', normalizedStatus)
				}
			}
			if (query.priority) {
				const allowedPriorities = ['low', 'normal', 'high', 'urgent']
				const normalizedPriority = String(query.priority).toLowerCase()
				if (allowedPriorities.includes(normalizedPriority)) {
					queryBuilder = queryBuilder.eq('priority', normalizedPriority)
				}
			}
			if (query.category) {
				queryBuilder = queryBuilder.eq('category', query.category as string)
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
	 * Get maintenance statistics
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's maintenance requests
	 */
	async getStats(
		token: string
	): Promise<
		MaintenanceStats & { totalCost: number; avgResponseTimeHours: number }
	> {
		try {
			if (!token) {
				this.logger.warn('Maintenance stats requested without token')
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log('Getting maintenance stats via RLS-protected query')

			// RLS SECURITY: User-scoped client automatically filters to user's maintenance requests
			const client = this.supabase.getUserClient(token)

			const { data, error } = await client
				.from('maintenance_requests')
				.select('status, priority, estimated_cost, created_at, completed_at')

			if (error) {
				this.logger.error('Failed to get maintenance stats from Supabase', {
					error: error.message
				})
				throw new BadRequestException('Failed to get maintenance statistics')
			}

			type MaintenanceRow =
				Database['public']['Tables']['maintenance_requests']['Row']
			type RequestPick = Pick<
				MaintenanceRow,
				'created_at' | 'completed_at' | 'estimated_cost' | 'priority' | 'status'
			>
			const requests = (data ?? []) as RequestPick[]
			const now = new Date()
			const todayStart = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate()
			)

			const completedRequests = requests.filter(
				(r): r is RequestPick & { completed_at: string; created_at: string } =>
					!!r.completed_at && !!r.created_at
			)
			const avgResolutionTime =
				completedRequests.length > 0
					? completedRequests.reduce((sum: number, r) => {
							const created = new Date(r.created_at).getTime()
							const completed = new Date(r.completed_at).getTime()
							return sum + (completed - created) / (1000 * 60 * 60)
						}, 0) / completedRequests.length
					: 0

			const stats: MaintenanceStats & {
				totalCost: number
				avgResponseTimeHours: number
			} = {
				total: requests.length,
				open: requests.filter(r => r.status === 'open').length,
				inProgress: requests.filter(r => r.status === 'in_progress').length,
				completed: requests.filter(r => r.status === 'completed').length,
				completedToday: requests.filter(
					r =>
						r.status === 'completed' &&
						r.completed_at &&
						new Date(r.completed_at) >= todayStart
				).length,
				avgResolutionTime,
				byPriority: {
					low: requests.filter(r => r.priority === 'low').length,
					medium: requests.filter(r => r.priority === 'normal').length,
					high: requests.filter(r => r.priority === 'high').length,
					emergency: requests.filter(r => r.priority === 'urgent').length
				},
				totalCost: requests.reduce(
					(sum: number, r) => sum + (r.estimated_cost || 0),
					0
				),
				avgResponseTimeHours: avgResolutionTime
			}

			return stats
		} catch (error) {
			this.logger.error('Maintenance service failed to get stats', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw new BadRequestException(
				error instanceof Error
					? error.message
					: 'Failed to get maintenance statistics'
			)
		}
	}

	/**
	 * Get urgent maintenance requests (HIGH and URGENT priority)
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's maintenance requests
	 */
	async getUrgent(token: string): Promise<MaintenanceRequest[]> {
		try {
			if (!token) {
				this.logger.warn('Urgent maintenance requests requested without token')
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log(
				'Getting urgent maintenance requests via RLS-protected query'
			)

			// RLS SECURITY: User-scoped client automatically filters to user's maintenance requests
			const client = this.supabase.getUserClient(token)

			const { data, error} = await client
				.from('maintenance_requests')
				.select('*')
				.in('priority', ['high', 'urgent'])
				.neq('status', 'completed')
				.order('priority', { ascending: false })
				.order('created_at', { ascending: true })

			if (error) {
				this.logger.error(
					'Failed to get urgent maintenance requests from Supabase',
					{
						error: error.message
					}
				)
				throw new BadRequestException(
					'Failed to get urgent maintenance requests'
				)
			}

			return data as MaintenanceRequest[]
		} catch (error) {
			this.logger.error('Maintenance service failed to get urgent requests', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw new BadRequestException(
				error instanceof Error
					? error.message
					: 'Failed to get urgent maintenance requests'
			)
		}
	}

	/**
	 * Get overdue maintenance requests
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's maintenance requests
	 */
	async getOverdue(token: string): Promise<MaintenanceRequest[]> {
		try {
			if (!token) {
				this.logger.warn('Overdue maintenance requests requested without token')
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log(
				'Getting overdue maintenance requests via RLS-protected query'
			)

			// RLS SECURITY: User-scoped client automatically filters to user's maintenance requests
			const client = this.supabase.getUserClient(token)

			const { data, error } = await client
				.from('maintenance_requests')
				.select('*')
				.neq('status', 'completed')
				.lt('scheduled_date', new Date().toISOString())
				.order('scheduled_date', { ascending: true })

			if (error) {
				this.logger.error(
					'Failed to get overdue maintenance requests from Supabase',
					{
						error: error.message
					}
				)
				throw new BadRequestException(
					'Failed to get overdue maintenance requests'
				)
			}

			return data as MaintenanceRequest[]
		} catch (error) {
			this.logger.error('Maintenance service failed to get overdue requests', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw new BadRequestException(
				error instanceof Error
					? error.message
					: 'Failed to get overdue maintenance requests'
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
		createRequest: CreateMaintenanceRequest
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
			const priorityMap: Record<string, string> = {
				LOW: 'low',
				MEDIUM: 'normal',
				HIGH: 'high',
				URGENT: 'urgent'
			}

			const maintenanceData: Database['public']['Tables']['maintenance_requests']['Insert'] =
				{
					requested_by: user_id,
					tenant_id: createRequest.tenant_id || user_id,
					description: createRequest.description,
					priority: priorityMap[createRequest.priority || 'MEDIUM'] ||
						'normal',
					unit_id: createRequest.unit_id,
					...(createRequest.category ? { category: createRequest.category } : {}),
					...(createRequest.scheduledDate ? { scheduled_date: new Date(createRequest.scheduledDate).toISOString() } : {}),
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
		updateRequest: UpdateMaintenanceRequest,
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
			const priorityMap: Record<string, string> = {
				LOW: 'low',
				MEDIUM: 'normal',
				HIGH: 'high',
				URGENT: 'urgent'
			}

			const statusMap: Record<string, string> = {
				PENDING: 'open',
				IN_PROGRESS: 'in_progress',
				COMPLETED: 'completed',
				CANCELLED: 'cancelled'
			}

			const updated_data: Database['public']['Tables']['maintenance_requests']['Update'] =
				{
					updated_at: new Date().toISOString()
				}

			if (updateRequest.description !== undefined)
				updated_data.description = updateRequest.description
			if (updateRequest.priority !== undefined)
				updated_data.priority = priorityMap[updateRequest.priority] ||
					'normal'
			if (updateRequest.status !== undefined)
				updated_data.status = statusMap[updateRequest.status] ||
					'open'
			if (updateRequest.estimated_cost !== undefined)
				updated_data.estimated_cost = updateRequest.estimated_cost
			if (updateRequest.completedDate !== undefined)
				updated_data.completed_at = new Date(
					updateRequest.completedDate
				).toISOString()

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
				// Get unit and property names inline
				const { data: unit } = await client
					.from('units')
					.select('unit_number, property_id')
					.eq('id', updated.unit_id)
					.single()

				let propertyName = 'Unknown Property'
				const unitName = unit?.unit_number || 'Unknown Unit'

				if (unit?.property_id) {
					const { data: property } = await client
						.from('properties')
						.select('name')
						.eq('id', unit.property_id)
						.single()
					propertyName = property?.name || 'Unknown Property'
				}

				this.eventEmitter.emit(
					'maintenance.updated',
					new MaintenanceUpdatedEvent(
						updated.requested_by ?? '',
						updated.id,
						updated.description ?? '',
						updated.status,
						this.reversePriorityMap[updated.priority] || 'MEDIUM',
						propertyName,
						unitName,
						updated.description ?? ''
					)
				)
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
	 * Update status - consolidated method (replaces complete and cancel)
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically verifies ownership
	 */
	async updateStatus(
		token: string,
		maintenanceId: string,
		status: string,
		notes?: string
	): Promise<MaintenanceRequest | null> {
		try {
			if (!token || !maintenanceId || !status) {
				this.logger.warn(
					'Update maintenance status called with missing parameters',
					{ maintenanceId, status }
				)
				return null
			}

			this.logger.log('Updating maintenance status via RLS-protected query', {
				maintenanceId,
				status,
				notes
			})

			// RLS SECURITY: User-scoped client automatically verifies ownership
			const client = this.supabase.getUserClient(token)

			const updated_data: Database['public']['Tables']['maintenance_requests']['Update'] =
				{
					status: status,
					updated_at: new Date().toISOString()
				}

			// Note: "notes" column doesn't exist in the schema
			if (status === 'completed')
				updated_data.completed_at = new Date().toISOString()

			const { data, error } = await client
				.from('maintenance_requests')
				.update(updated_data)
				.eq('id', maintenanceId)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to update maintenance status in Supabase', {
					error: error.message,
					maintenanceId,
					status
				})
				return null
			}

			return data as MaintenanceRequest
		} catch (error) {
			this.logger.error('Maintenance service failed to update status', {
				error: error instanceof Error ? error.message : String(error),
				maintenanceId,
				status,
				notes
			})
			return null
		}
	}

	/**
	 * Complete maintenance request - convenience method for marking as completed
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically verifies ownership
	 */
	async complete(
		token: string,
		maintenanceId: string,
		actualCost?: number,
		notes?: string
	): Promise<MaintenanceRequest | null> {
		try {
			this.logger.log('Completing maintenance request', {
				maintenanceId,
				actualCost,
				notes
			})

			// RLS SECURITY: User-scoped client automatically verifies ownership
			const client = this.supabase.getUserClient(token)

			const updated_data: Database['public']['Tables']['maintenance_requests']['Update'] =
				{
					status: 'completed',
					completed_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				}

			if (actualCost !== undefined) updated_data.actual_cost = actualCost

			const { data, error } = await client
				.from('maintenance_requests')
				.update(updated_data)
				.eq('id', maintenanceId)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to complete maintenance request', {
					error: error.message,
					maintenanceId
				})
				return null
			}

			// Emit event for notifications
			if (data) {
				const updated = data as MaintenanceRequest
				const propertyLabel = updated.unit_id
					? `Unit ${updated.unit_id}`
					: 'Unknown Property'
				const unit_numberLabel = updated.unit_id ?? 'N/A'

				this.eventEmitter.emit(
					'maintenance.updated',
					new MaintenanceUpdatedEvent(
						updated.requested_by ?? '',
						updated.id,
						updated.description ?? '',
						updated.status ?? 'completed',
						this.reversePriorityMap[updated.priority || 'normal'] || 'MEDIUM',
						propertyLabel,
						unit_numberLabel,
						updated.description ?? ''
					)
				)
			}

			return data as MaintenanceRequest
		} catch (error) {
			this.logger.error('Failed to complete maintenance request', {
				error: error instanceof Error ? error.message : String(error),
				maintenanceId
			})
			return null
		}
	}

	/**
	 * Cancel maintenance request - convenience method for marking as canceled
	 * RLS COMPLIANT: Delegates to updateStatus() which uses getUserClient(token)
	 */
	async cancel(
		token: string,
		maintenanceId: string,
		reason?: string
	): Promise<MaintenanceRequest | null> {
		try {
			this.logger.log('Canceling maintenance request', {
				maintenanceId,
				reason
			})

			return this.updateStatus(token, maintenanceId, 'cancelled', reason)
		} catch (error) {
			this.logger.error('Failed to cancel maintenance request', {
				error: error instanceof Error ? error.message : String(error),
				maintenanceId
			})
			return null
		}
	}
}
