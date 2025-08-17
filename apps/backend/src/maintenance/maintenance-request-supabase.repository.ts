import { Injectable } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase-generated'
import { BaseSupabaseRepository } from '../common/repositories/base-supabase.repository'
import { SupabaseService } from '../common/supabase/supabase.service'
import { MultiTenantSupabaseService } from '../common/supabase/multi-tenant-supabase.service'

type MaintenanceRequestRow =
	Database['public']['Tables']['MaintenanceRequest']['Row']
type MaintenanceRequestInsert =
	Database['public']['Tables']['MaintenanceRequest']['Insert']
type MaintenanceRequestUpdate =
	Database['public']['Tables']['MaintenanceRequest']['Update']

export interface MaintenanceRequestWithRelations extends MaintenanceRequestRow {
	Unit?: {
		id: string
		unitNumber: string
		status: string
		Property: {
			id: string
			name: string
			address: string
			ownerId: string
		}
	}
	_count?: {
		photos: number
	}
}

export interface MaintenanceRequestQueryOptions {
	status?: string
	priority?: string
	category?: string
	unitId?: string
	requestedByEmail?: string
	search?: string
	limit?: number
	offset?: number
	page?: number
}

/**
 * Supabase repository for MaintenanceRequest entity
 * Replaces the Prisma-based MaintenanceRequestRepository
 * Maintenance requests are owned through unit property ownership
 */
@Injectable()
export class MaintenanceRequestSupabaseRepository extends BaseSupabaseRepository<
	'MaintenanceRequest',
	MaintenanceRequestRow,
	MaintenanceRequestInsert,
	MaintenanceRequestUpdate
> {
	protected readonly tableName = 'MaintenanceRequest' as const

	constructor(
		supabaseService: SupabaseService,
		multiTenantService: MultiTenantSupabaseService
	) {
		super(supabaseService, multiTenantService)
	}

	/**
	 * Find maintenance requests by owner with full unit/property data
	 * Maintenance requests are owned through unit property ownership
	 */
	async findByOwnerWithDetails(
		ownerId: string,
		options: MaintenanceRequestQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<MaintenanceRequestWithRelations[]> {
		try {
			const client = await this.getClient(userId, userToken)
			const {
				search,
				status,
				priority,
				category,
				unitId,
				requestedByEmail,
				limit = 10,
				offset = 0,
				page
			} = options

			// Calculate actual offset
			const actualOffset = page ? (page - 1) * limit : offset

			// Build the query with nested relationships
			let query = client.from('MaintenanceRequest').select(`
					*,
					Unit!inner (
						id,
						unitNumber,
						status,
						Property!inner (
							id,
							name,
							address,
							ownerId
						)
					)
				`)

			// Filter by owner through the relationship chain
			query = query.eq('Unit.Property.ownerId', ownerId)

			// Add filters
			if (status) {
				query = query.eq(
					'status',
					status as NonNullable<MaintenanceRequestRow['status']>
				)
			}

			if (priority) {
				query = query.eq(
					'priority',
					priority as NonNullable<MaintenanceRequestRow['priority']>
				)
			}

			if (category) {
				query = query.eq('category', category)
			}

			if (unitId) {
				query = query.eq('unitId', unitId)
			}

			if (requestedByEmail) {
				query = query.eq('requestedByEmail', requestedByEmail)
			}

			// Add search filter (searches in title, description, category, notes)
			if (search) {
				query = query.or(
					`title.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%,notes.ilike.%${search}%`
				)
			}

			// Apply ordering and pagination
			query = query
				.order('createdAt', { ascending: false })
				.range(actualOffset, actualOffset + limit - 1)

			const { data, error } = await query

			if (error) {
				this.logger.error(
					'Error fetching maintenance requests with details:',
					error
				)
				throw error
			}

			return (data || []) as MaintenanceRequestWithRelations[]
		} catch (error) {
			this.logger.error(
				'Failed to fetch maintenance requests by owner:',
				error
			)
			throw error
		}
	}

	/**
	 * Find maintenance request by ID with ownership validation
	 */
	async findByIdAndOwner(
		id: string,
		ownerId: string,
		includeDetails = true,
		userId?: string,
		userToken?: string
	): Promise<MaintenanceRequestWithRelations | null> {
		try {
			const client = await this.getClient(userId, userToken)

			// Build query with optional details
			const selectQuery = includeDetails
				? `
					*,
					Unit (
						id,
						unitNumber,
						status,
						Property (
							id,
							name,
							address,
							ownerId
						)
					)
				`
				: `
					*,
					Unit (
						Property (
							ownerId
						)
					)
				`

			const { data, error } = await client
				.from('MaintenanceRequest')
				.select(selectQuery)
				.eq('id', id)
				.single()

			if (error) {
				if (error.code === 'PGRST116') {
					return null // Not found
				}
				throw error
			}

			// Validate ownership
			if (data?.Unit?.Property?.ownerId !== ownerId) {
				return null // No ownership
			}

			return data as MaintenanceRequestWithRelations
		} catch (error) {
			this.logger.error(
				'Failed to find maintenance request by ID and owner:',
				error
			)
			throw error
		}
	}

	/**
	 * Find maintenance requests by unit ID
	 */
	async findByUnit(
		unitId: string,
		ownerId: string,
		options: MaintenanceRequestQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<MaintenanceRequestWithRelations[]> {
		try {
			const client = await this.getClient(userId, userToken)
			const { status, priority, search, limit = 10, offset = 0 } = options

			let query = client
				.from('MaintenanceRequest')
				.select(
					`
					*,
					Unit!inner (
						id,
						unitNumber,
						status,
						Property!inner (
							id,
							name,
							address,
							ownerId
						)
					)
				`
				)
				.eq('unitId', unitId)
				.eq('Unit.Property.ownerId', ownerId)

			// Add filters
			if (status) {
				query = query.eq(
					'status',
					status as NonNullable<MaintenanceRequestRow['status']>
				)
			}

			if (priority) {
				query = query.eq(
					'priority',
					priority as NonNullable<MaintenanceRequestRow['priority']>
				)
			}

			if (search) {
				query = query.or(
					`title.ilike.%${search}%,description.ilike.%${search}%`
				)
			}

			// Apply ordering and pagination
			query = query
				.order('createdAt', { ascending: false })
				.range(offset, offset + limit - 1)

			const { data, error } = await query

			if (error) {
				this.logger.error(
					'Error fetching maintenance requests by unit:',
					error
				)
				throw error
			}

			return (data || []) as MaintenanceRequestWithRelations[]
		} catch (error) {
			this.logger.error(
				'Failed to fetch maintenance requests by unit:',
				error
			)
			throw error
		}
	}

	/**
	 * Get maintenance request statistics for an owner
	 */
	async getStatsByOwner(
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<{
		total: number
		open: number
		inProgress: number
		completed: number
		emergency: number
		high: number
		medium: number
		low: number
	}> {
		try {
			const client = await this.getClient(userId, userToken)

			// Get all maintenance requests for the owner
			const { data: requests, error } = await client
				.from('MaintenanceRequest')
				.select(
					`
					status,
					priority,
					Unit!inner (
						Property!inner (
							ownerId
						)
					)
				`
				)
				.eq('Unit.Property.ownerId', ownerId)

			if (error) {
				this.logger.error(
					'Error fetching maintenance request stats:',
					error
				)
				throw error
			}

			// Calculate statistics
			const stats = {
				total: requests?.length || 0,
				open: 0,
				inProgress: 0,
				completed: 0,
				emergency: 0,
				high: 0,
				medium: 0,
				low: 0
			}

			if (requests) {
				for (const request of requests) {
					// Count by status
					switch (request.status) {
						case 'OPEN':
							stats.open++
							break
						case 'IN_PROGRESS':
							stats.inProgress++
							break
						case 'COMPLETED':
							stats.completed++
							break
					}

					// Count by priority
					switch (request.priority) {
						case 'EMERGENCY':
							stats.emergency++
							break
						case 'HIGH':
							stats.high++
							break
						case 'MEDIUM':
							stats.medium++
							break
						case 'LOW':
							stats.low++
							break
					}
				}
			}

			return stats
		} catch (error) {
			this.logger.error('Failed to get maintenance request stats:', error)
			throw error
		}
	}

	/**
	 * Find emergency maintenance requests (priority = EMERGENCY)
	 */
	async findEmergencyRequests(
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<MaintenanceRequestWithRelations[]> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data, error } = await client
				.from('MaintenanceRequest')
				.select(
					`
					*,
					Unit!inner (
						id,
						unitNumber,
						status,
						Property!inner (
							id,
							name,
							address,
							ownerId
						)
					)
				`
				)
				.eq('Unit.Property.ownerId', ownerId)
				.eq('priority', 'EMERGENCY')
				.in('status', ['OPEN', 'IN_PROGRESS'])
				.order('createdAt', { ascending: false })

			if (error) {
				this.logger.error(
					'Error fetching emergency maintenance requests:',
					error
				)
				throw error
			}

			return (data || []) as MaintenanceRequestWithRelations[]
		} catch (error) {
			this.logger.error(
				'Failed to fetch emergency maintenance requests:',
				error
			)
			throw error
		}
	}

	/**
	 * Find overdue maintenance requests (created more than specified days ago and still open)
	 */
	async findOverdueRequests(
		ownerId: string,
		days = 7,
		userId?: string,
		userToken?: string
	): Promise<MaintenanceRequestWithRelations[]> {
		try {
			const client = await this.getClient(userId, userToken)
			const overdueDate = new Date()
			overdueDate.setDate(overdueDate.getDate() - days)

			const { data, error } = await client
				.from('MaintenanceRequest')
				.select(
					`
					*,
					Unit!inner (
						id,
						unitNumber,
						status,
						Property!inner (
							id,
							name,
							address,
							ownerId
						)
					)
				`
				)
				.eq('Unit.Property.ownerId', ownerId)
				.in('status', ['OPEN', 'IN_PROGRESS'])
				.lt('createdAt', overdueDate.toISOString())
				.order('createdAt', { ascending: true })

			if (error) {
				this.logger.error(
					'Error fetching overdue maintenance requests:',
					error
				)
				throw error
			}

			return (data || []) as MaintenanceRequestWithRelations[]
		} catch (error) {
			this.logger.error(
				'Failed to fetch overdue maintenance requests:',
				error
			)
			throw error
		}
	}

	/**
	 * Create maintenance request with unit validation
	 */
	async createWithValidation(
		requestData: MaintenanceRequestInsert,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<MaintenanceRequestWithRelations> {
		try {
			const client = await this.getClient(userId, userToken)

			// First validate unit ownership
			const { data: unit, error: unitError } = await client
				.from('Unit')
				.select(
					`
					id,
					Property (
						ownerId
					)
				`
				)
				.eq('id', requestData.unitId)
				.single()

			if (unitError || !unit) {
				throw new Error('Unit not found')
			}

			if (unit.Property?.ownerId !== ownerId) {
				throw new Error('Unit not owned by user')
			}

			// Create the maintenance request
			const { data: createdRequest, error: createError } = await client
				.from('MaintenanceRequest')
				.insert(requestData)
				.select(
					`
					*,
					Unit (
						id,
						unitNumber,
						status,
						Property (
							id,
							name,
							address,
							ownerId
						)
					)
				`
				)
				.single()

			if (createError || !createdRequest) {
				this.logger.error(
					'Error creating maintenance request:',
					createError
				)
				throw (
					createError ||
					new Error('Failed to create maintenance request')
				)
			}

			return createdRequest as MaintenanceRequestWithRelations
		} catch (error) {
			this.logger.error(
				'Failed to create maintenance request with validation:',
				error
			)
			throw error
		}
	}

	/**
	 * Update maintenance request status
	 */
	async updateStatus(
		id: string,
		status: string,
		ownerId: string,
		notes?: string,
		userId?: string,
		userToken?: string
	): Promise<MaintenanceRequestWithRelations> {
		try {
			const client = await this.getClient(userId, userToken)

			// First validate ownership
			const existing = await this.findByIdAndOwner(
				id,
				ownerId,
				false,
				userId,
				userToken
			)
			if (!existing) {
				throw new Error(
					'Maintenance request not found or not owned by user'
				)
			}

			// Update the request
			const updateData: MaintenanceRequestUpdate = {
				status: status as MaintenanceRequestUpdate['status'],
				updatedAt: new Date().toISOString()
			}

			if (notes) {
				updateData.notes = notes
			}

			if (status === 'COMPLETED') {
				updateData.completedAt = new Date().toISOString()
			}

			const { data: updatedRequest, error: updateError } = await client
				.from('MaintenanceRequest')
				.update(updateData)
				.eq('id', id)
				.select(
					`
					*,
					Unit (
						id,
						unitNumber,
						status,
						Property (
							id,
							name,
							address,
							ownerId
						)
					)
				`
				)
				.single()

			if (updateError || !updatedRequest) {
				this.logger.error(
					'Error updating maintenance request status:',
					updateError
				)
				throw (
					updateError ||
					new Error('Failed to update maintenance request status')
				)
			}

			return updatedRequest as MaintenanceRequestWithRelations
		} catch (error) {
			this.logger.error(
				'Failed to update maintenance request status:',
				error
			)
			throw error
		}
	}
}
