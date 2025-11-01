/**
 * Maintenance Service - Ultra-Native NestJS Implementation
 * Direct Supabase access, no repository abstractions
 * Simplified: Removed helper methods, consolidated status updates
 */

import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type {
	CreateMaintenanceRequest,
	UpdateMaintenanceRequest
} from '@repo/shared/types/backend-domain'
import type {
	MaintenanceRequest,
	MaintenanceStats
} from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from '../../database/supabase.service'
import {
	buildMultiColumnSearch,
	sanitizeSearchInput
} from '../../shared/utils/sql-safe.utils'
import { MaintenanceUpdatedEvent } from '../notifications/events/notification.events'

@Injectable()
export class MaintenanceService {
	private readonly logger = new Logger(MaintenanceService.name)

	constructor(
		private readonly supabase: SupabaseService,
		private readonly eventEmitter: EventEmitter2
	) {}

	/**
	 * Get all maintenance requests for a user with search and filters
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's maintenance requests
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

			// ✅ RLS SECURITY: User-scoped client automatically filters to user's maintenance requests
			const client = this.supabase.getUserClient(token)

			// Build query with filters (NO manual userId filtering needed)
			let queryBuilder = client
				.from('maintenance_request')
				.select('*')

			// Apply filters
			if (query.propertyId) {
				queryBuilder = queryBuilder.eq('propertyId', query.propertyId as string)
			}
			if (query.unitId) {
				queryBuilder = queryBuilder.eq('unitId', query.unitId as string)
			}
			if (query.tenantId) {
				queryBuilder = queryBuilder.eq('requestedBy', query.tenantId as string)
			}
			if (query.status) {
				const allowedStatuses: Database['public']['Enums']['RequestStatus'][] =
					['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'ON_HOLD', 'CLOSED']
				const normalizedStatus = String(
					query.status
				).toUpperCase() as Database['public']['Enums']['RequestStatus']
				if (allowedStatuses.includes(normalizedStatus)) {
					queryBuilder = queryBuilder.eq('status', normalizedStatus)
				}
			}
			if (query.priority) {
				const allowedPriorities: Database['public']['Enums']['Priority'][] = [
					'LOW',
					'MEDIUM',
					'HIGH',
					'URGENT'
				]
				const normalizedPriority = String(
					query.priority
				).toUpperCase() as Database['public']['Enums']['Priority']
				if (allowedPriorities.includes(normalizedPriority)) {
					queryBuilder = queryBuilder.eq('priority', normalizedPriority)
				}
			}
			if (query.category) {
				queryBuilder = queryBuilder.eq('category', query.category as string)
			}
			if (query.assignedTo) {
				queryBuilder = queryBuilder.eq('assignedTo', query.assignedTo as string)
			}
			if (query.dateFrom) {
				queryBuilder = queryBuilder.gte(
					'createdAt',
					new Date(query.dateFrom as string).toISOString()
				)
			}
			if (query.dateTo) {
				queryBuilder = queryBuilder.lte(
					'createdAt',
					new Date(query.dateTo as string).toISOString()
				)
			}
			// SECURITY FIX #2: Use safe search to prevent SQL injection
			if (query.search) {
				const sanitized = sanitizeSearchInput(String(query.search))
				if (sanitized) {
					queryBuilder = queryBuilder.or(
						buildMultiColumnSearch(sanitized, ['title', 'description'])
					)
				}
			}

			// Apply pagination
			const limit = query.limit ? Number(query.limit) : 50
			const offset = query.offset ? Number(query.offset) : 0
			queryBuilder = queryBuilder.range(offset, offset + limit - 1)

			// Apply sorting
			const sortBy = query.sortBy || 'createdAt'
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
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's maintenance requests
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

			// ✅ RLS SECURITY: User-scoped client automatically filters to user's maintenance requests
			const client = this.supabase.getUserClient(token)

			const { data, error } = await client
				.from('maintenance_request')
				.select('status, priority, estimatedCost, createdAt, completedAt')

			if (error) {
				this.logger.error('Failed to get maintenance stats from Supabase', {
					error: error.message
				})
				throw new BadRequestException('Failed to get maintenance statistics')
			}

			type MaintenanceRow =
				Database['public']['Tables']['maintenance_request']['Row']
			type RequestPick = Pick<
				MaintenanceRow,
				'createdAt' | 'completedAt' | 'estimatedCost' | 'priority' | 'status'
			>
			const requests = (data ?? []) as RequestPick[]
			const now = new Date()
			const todayStart = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate()
			)

			const completedRequests = requests.filter(
				(r): r is RequestPick & { completedAt: string } => !!r.completedAt
			)
			const avgResolutionTime =
				completedRequests.length > 0
					? completedRequests.reduce((sum: number, r) => {
							const created = new Date(r.createdAt).getTime()
							const completed = new Date(r.completedAt).getTime()
							return sum + (completed - created) / (1000 * 60 * 60)
						}, 0) / completedRequests.length
					: 0

			const stats: MaintenanceStats & {
				totalCost: number
				avgResponseTimeHours: number
			} = {
				total: requests.length,
				open: requests.filter(r => r.status === 'OPEN').length,
				inProgress: requests.filter(r => r.status === 'IN_PROGRESS').length,
				completed: requests.filter(r => r.status === 'COMPLETED').length,
				completedToday: requests.filter(
					r =>
						r.status === 'COMPLETED' &&
						r.completedAt &&
						new Date(r.completedAt) >= todayStart
				).length,
				avgResolutionTime,
				byPriority: {
					low: requests.filter(r => r.priority === 'LOW').length,
					medium: requests.filter(r => r.priority === 'MEDIUM').length,
					high: requests.filter(r => r.priority === 'HIGH').length,
					emergency: requests.filter(r => r.priority === 'URGENT').length
				},
				totalCost: requests.reduce(
					(sum: number, r) => sum + (r.estimatedCost || 0),
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
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's maintenance requests
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

			// ✅ RLS SECURITY: User-scoped client automatically filters to user's maintenance requests
			const client = this.supabase.getUserClient(token)

			const { data, error } = await client
				.from('maintenance_request')
				.select('*')
				.in('priority', ['HIGH', 'URGENT'])
				.neq('status', 'COMPLETED')
				.order('priority', { ascending: false })
				.order('createdAt', { ascending: true })

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
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's maintenance requests
	 */
	async getOverdue(token: string): Promise<MaintenanceRequest[]> {
		try {
			if (!token) {
				this.logger.warn(
					'Overdue maintenance requests requested without token'
				)
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log(
				'Getting overdue maintenance requests via RLS-protected query'
			)

			// ✅ RLS SECURITY: User-scoped client automatically filters to user's maintenance requests
			const client = this.supabase.getUserClient(token)

			const { data, error } = await client
				.from('maintenance_request')
				.select('*')
				.neq('status', 'COMPLETED')
				.lt('preferredDate', new Date().toISOString())
				.order('preferredDate', { ascending: true })

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
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's maintenance requests
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

			// ✅ RLS SECURITY: User-scoped client automatically filters to user's maintenance requests
			const client = this.supabase.getUserClient(token)

			const { data, error } = await client
				.from('maintenance_request')
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
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically verifies unit access
	 */
	async create(
		token: string,
		userId: string,
		createRequest: CreateMaintenanceRequest
	): Promise<MaintenanceRequest> {
		try {
			if (!token || !userId || !createRequest.title) {
				this.logger.warn(
					'Create maintenance request called with missing parameters',
					{ createRequest }
				)
				throw new BadRequestException('Authentication token, user ID, and title are required')
			}

			this.logger.log(
				'Creating maintenance request via RLS-protected query',
				{
					createRequest
				}
			)

			// Validate photo URLs if provided (inline validation)
			if (createRequest.photos?.length) {
				const validUrl =
					'https://bshjmbshupiibfiewpxb.supabase.co/storage/v1/object/public/maintenance-photos/'
				if (createRequest.photos.some(url => !url.startsWith(validUrl))) {
					throw new BadRequestException(
						'All photo URLs must be from Supabase Storage'
					)
				}
			}

			// ✅ RLS SECURITY: User-scoped client automatically verifies unit access
			const client = this.supabase.getUserClient(token)

			// Map priority
			const priorityMap: Record<
				string,
				Database['public']['Enums']['Priority']
			> = {
				LOW: 'LOW',
				MEDIUM: 'MEDIUM',
				HIGH: 'HIGH',
				URGENT: 'URGENT'
			}

			const maintenanceData: Database['public']['Tables']['maintenance_request']['Insert'] =
				{
					requestedBy: userId,
					title: createRequest.title,
					description: createRequest.description,
					priority: priorityMap[createRequest.priority || 'MEDIUM'] || 'MEDIUM',
					unitId: createRequest.unitId,
					allowEntry: true,
					photos: createRequest.photos || null,
					preferredDate: createRequest.scheduledDate
						? new Date(createRequest.scheduledDate).toISOString()
						: null,
					category: createRequest.category || null,
					estimatedCost: createRequest.estimatedCost || null
				}

			const { data, error} = await client
				.from('maintenance_request')
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
				userId,
				maintenanceId: maintenance.id,
				maintenanceTitle: maintenance.title,
				priority: maintenance.priority,
				unitId: maintenance.unitId
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
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically verifies ownership
	 */
	async update(
		token: string,
		maintenanceId: string,
		updateRequest: UpdateMaintenanceRequest,
		expectedVersion?: number // 🔐 Optimistic locking
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

			this.logger.log(
				'Updating maintenance request via RLS-protected query',
				{
					maintenanceId,
					updateRequest
				}
			)

			// ✅ RLS SECURITY: User-scoped client automatically verifies ownership
			const client = this.supabase.getUserClient(token)

			// Map status and priority
			const priorityMap: Record<
				string,
				Database['public']['Enums']['Priority']
			> = {
				LOW: 'LOW',
				MEDIUM: 'MEDIUM',
				HIGH: 'HIGH',
				URGENT: 'URGENT'
			}

			const statusMap: Record<
				string,
				Database['public']['Enums']['RequestStatus']
			> = {
				PENDING: 'OPEN',
				IN_PROGRESS: 'IN_PROGRESS',
				COMPLETED: 'COMPLETED',
				CANCELLED: 'CANCELED'
			}

			const updateData: Database['public']['Tables']['maintenance_request']['Update'] =
				{
					updatedAt: new Date().toISOString()
				}

			// 🔐 BUG FIX #2: Increment version for optimistic locking
			if (expectedVersion !== undefined) {
				updateData.version = expectedVersion + 1
			}

			if (updateRequest.title !== undefined)
				updateData.title = updateRequest.title
			if (updateRequest.description !== undefined)
				updateData.description = updateRequest.description
			if (updateRequest.priority !== undefined)
				updateData.priority = priorityMap[updateRequest.priority] || 'MEDIUM'
			if (updateRequest.status !== undefined)
				updateData.status = statusMap[updateRequest.status] || 'OPEN'
			if (updateRequest.estimatedCost !== undefined)
				updateData.estimatedCost = updateRequest.estimatedCost
			if (updateRequest.completedDate !== undefined)
				updateData.completedAt = new Date(
					updateRequest.completedDate
				).toISOString()

			// 🔐 Optimistic locking: Add version check
			let query = client
				.from('maintenance_request')
				.update(updateData)
				.eq('id', maintenanceId)

			// Add version check if expectedVersion provided
			if (expectedVersion !== undefined) {
				query = query.eq('version', expectedVersion)
			}

			const { data, error } = await query.select().single()

			if (error || !data) {
				// 🔐 Detect optimistic locking conflict
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
					.from('unit')
					.select('unitNumber, propertyId')
					.eq('id', updated.unitId)
					.single()

				let propertyName = 'Unknown Property'
				const unitName = unit?.unitNumber || 'Unknown Unit'

				if (unit?.propertyId) {
					const { data: property } = await client
						.from('property')
						.select('name')
						.eq('id', unit.propertyId)
						.single()
					propertyName = property?.name || 'Unknown Property'
				}

				this.eventEmitter.emit(
					'maintenance.updated',
					new MaintenanceUpdatedEvent(
						updated.requestedBy ?? '',
						updated.id,
						updated.title,
						updated.status,
						updated.priority,
						propertyName,
						unitName,
						updated.description
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
				error instanceof Error ? error.message : 'Failed to update maintenance request'
			)
		}
	}

	/**
	 * Remove maintenance request (soft delete)
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically verifies ownership
	 */
	async remove(token: string, maintenanceId: string): Promise<void> {
		try {
			if (!token || !maintenanceId) {
				this.logger.warn(
					'Remove maintenance request called with missing parameters',
					{ maintenanceId }
				)
				throw new BadRequestException('Authentication token and maintenance ID are required')
			}

			this.logger.log(
				'Removing maintenance request via RLS-protected query',
				{
					maintenanceId
				}
			)

			// ✅ RLS SECURITY: User-scoped client automatically verifies ownership
			const client = this.supabase.getUserClient(token)

			const { error } = await client
				.from('maintenance_request')
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
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically verifies ownership
	 */
	async updateStatus(
		token: string,
		maintenanceId: string,
		status: Database['public']['Enums']['RequestStatus'],
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

			// ✅ RLS SECURITY: User-scoped client automatically verifies ownership
			const client = this.supabase.getUserClient(token)

			const updateData: Database['public']['Tables']['maintenance_request']['Update'] =
				{
					status,
					updatedAt: new Date().toISOString()
				}

			if (notes) updateData.notes = notes
			if (status === 'COMPLETED')
				updateData.completedAt = new Date().toISOString()

			const { data, error } = await client
				.from('maintenance_request')
				.update(updateData)
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
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically verifies ownership
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

			// ✅ RLS SECURITY: User-scoped client automatically verifies ownership
			const client = this.supabase.getUserClient(token)

			const updateData: Database['public']['Tables']['maintenance_request']['Update'] =
				{
					status: 'COMPLETED' as Database['public']['Enums']['RequestStatus'],
					completedAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}

			if (actualCost !== undefined) updateData.actualCost = actualCost
			if (notes) updateData.notes = notes

			const { data, error } = await client
				.from('maintenance_request')
				.update(updateData)
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
				const propertyLabel = updated.unitId
					? `Unit ${updated.unitId}`
					: 'Unknown Property'
				const unitNumberLabel = updated.unitId ?? 'N/A'

				this.eventEmitter.emit(
					'maintenance.updated',
					new MaintenanceUpdatedEvent(
						updated.requestedBy ?? '',
						updated.id,
						updated.title ?? 'Maintenance request updated',
						updated.status ?? 'COMPLETED',
						(updated.priority ?? 'MEDIUM') as
							| 'LOW'
							| 'MEDIUM'
							| 'HIGH'
							| 'URGENT',
						propertyLabel,
						unitNumberLabel,
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
	 * ✅ RLS COMPLIANT: Delegates to updateStatus() which uses getUserClient(token)
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

			return this.updateStatus(token, maintenanceId, 'CANCELED', reason)
		} catch (error) {
			this.logger.error('Failed to cancel maintenance request', {
				error: error instanceof Error ? error.message : String(error),
				maintenanceId
			})
			return null
		}
	}
}
