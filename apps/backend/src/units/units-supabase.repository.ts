import { Injectable } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase-generated'
import { BaseSupabaseRepository } from '../common/repositories/base-supabase.repository'
import { SupabaseService } from '../common/supabase/supabase.service'
import { MultiTenantSupabaseService } from '../common/supabase/multi-tenant-supabase.service'

type UnitRow = Database['public']['Tables']['Unit']['Row']
type UnitInsert = Database['public']['Tables']['Unit']['Insert']
type UnitUpdate = Database['public']['Tables']['Unit']['Update']

export interface UnitWithRelations extends UnitRow {
	Property?: {
		id: string
		name: string
		address: string
		ownerId: string
	}
	Lease?: {
		id: string
		status: string
		startDate: string
		endDate: string
		rentAmount: number
		Tenant?: {
			id: string
			name: string
			email: string
			phone: string | null
		}
	}[]
}

export interface UnitQueryOptions {
	propertyId?: string
	status?: string
	search?: string
	limit?: number
	offset?: number
	page?: number
}

/**
 * Supabase repository for Unit entity
 * Replaces the Prisma-based UnitsRepository
 * Units are owned through property ownership
 */
@Injectable()
export class UnitsSupabaseRepository extends BaseSupabaseRepository<
	'Unit',
	UnitRow,
	UnitInsert,
	UnitUpdate
> {
	protected readonly tableName = 'Unit' as const

	constructor(
		supabaseService: SupabaseService,
		multiTenantService: MultiTenantSupabaseService
	) {
		super(supabaseService, multiTenantService)
	}

	/**
	 * Find units by owner with full property/lease data
	 * Units are owned through property ownership
	 */
	async findByOwnerWithDetails(
		ownerId: string,
		options: UnitQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<UnitWithRelations[]> {
		try {
			const client = await this.getClient(userId, userToken)
			const {
				search,
				status,
				propertyId,
				limit = 10,
				offset = 0,
				page
			} = options

			// Calculate actual offset
			const actualOffset = page ? (page - 1) * limit : offset

			// Build the query with nested relationships
			let query = client.from('Unit').select(`
					*,
					Property!inner (
						id,
						name,
						address,
						ownerId
					),
					Lease (
						id,
						status,
						startDate,
						endDate,
						rentAmount,
						Tenant (
							id,
							name,
							email,
							phone
						)
					)
				`)

			// Filter by owner through property relationship
			query = query.eq('Property.ownerId', ownerId)

			// Add property filter if provided
			if (propertyId) {
				query = query.eq('propertyId', propertyId)
			}

			// Add status filter if provided
			if (status) {
				query = query.eq('status', status)
			}

			// Add search filter (searches in unit number and property name)
			if (search) {
				// Note: Supabase doesn't support OR conditions across relationships easily
				// So we'll search in unit number only for now
				query = query.ilike('unitNumber', `%${search}%`)
			}

			// Apply pagination
			query = query
				.order('createdAt', { ascending: false })
				.range(actualOffset, actualOffset + limit - 1)

			const { data, error } = await query

			if (error) {
				this.logger.error('Error fetching units with details:', error)
				throw error
			}

			return (data || []) as UnitWithRelations[]
		} catch (error) {
			this.logger.error('Failed to fetch units by owner:', error)
			throw error
		}
	}

	/**
	 * Find units by property ID
	 */
	async findByProperty(
		propertyId: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<UnitWithRelations[]> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data, error } = await client
				.from('Unit')
				.select(
					`
					*,
					Property!inner (
						id,
						name,
						address,
						ownerId
					),
					Lease (
						id,
						status,
						startDate,
						endDate,
						rentAmount,
						Tenant (
							id,
							name,
							email,
							phone
						)
					)
				`
				)
				.eq('propertyId', propertyId)
				.eq('Property.ownerId', ownerId)
				.order('unitNumber', { ascending: true })

			if (error) {
				this.logger.error('Error fetching units by property:', error)
				throw error
			}

			return (data || []) as UnitWithRelations[]
		} catch (error) {
			this.logger.error('Failed to fetch units by property:', error)
			throw error
		}
	}

	/**
	 * Find unit by ID with ownership validation
	 */
	async findByIdAndOwner(
		id: string,
		ownerId: string,
		includeDetails = false,
		userId?: string,
		userToken?: string
	): Promise<UnitWithRelations | null> {
		try {
			const client = await this.getClient(userId, userToken)

			// Build query with optional details
			const selectQuery = includeDetails
				? `
					*,
					Property (
						id,
						name,
						address,
						ownerId
					),
					Lease (
						id,
						status,
						startDate,
						endDate,
						rentAmount,
						Tenant (
							id,
							name,
							email,
							phone
						)
					)
				`
				: `
					*,
					Property (
						ownerId
					)
				`

			const { data, error } = await client
				.from('Unit')
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
			if (data?.Property?.ownerId !== ownerId) {
				return null // No ownership
			}

			return data as UnitWithRelations
		} catch (error) {
			this.logger.error('Failed to find unit by ID and owner:', error)
			throw error
		}
	}

	/**
	 * Get unit statistics for an owner
	 */
	async getStatsByOwner(
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<{
		total: number
		available: number
		occupied: number
		maintenance: number
		reserved: number
	}> {
		try {
			const client = await this.getClient(userId, userToken)

			// Get all units for the owner
			const { data: units, error } = await client
				.from('Unit')
				.select(
					`
					status,
					Property!inner (
						ownerId
					)
				`
				)
				.eq('Property.ownerId', ownerId)

			if (error) {
				this.logger.error('Error fetching unit stats:', error)
				throw error
			}

			// Calculate statistics
			const stats = {
				total: units?.length || 0,
				available: 0,
				occupied: 0,
				maintenance: 0,
				reserved: 0
			}

			if (units) {
				for (const unit of units) {
					switch (unit.status) {
						case 'VACANT':
							stats.available++
							break
						case 'OCCUPIED':
							stats.occupied++
							break
						case 'MAINTENANCE':
							stats.maintenance++
							break
						case 'RESERVED':
							stats.reserved++
							break
					}
				}
			}

			return stats
		} catch (error) {
			this.logger.error('Failed to get unit stats:', error)
			throw error
		}
	}

	/**
	 * Check if unit has active lease
	 */
	async hasActiveLease(
		unitId: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<boolean> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data, error } = await client
				.from('Lease')
				.select(
					`
					id,
					Unit!inner (
						id,
						Property!inner (
							ownerId
						)
					)
				`
				)
				.eq('unitId', unitId)
				.eq('status', 'ACTIVE')
				.eq('Unit.Property.ownerId', ownerId)
				.limit(1)

			if (error) {
				this.logger.error('Error checking active lease:', error)
				throw error
			}

			return (data?.length || 0) > 0
		} catch (error) {
			this.logger.error('Failed to check active lease:', error)
			throw error
		}
	}

	/**
	 * Bulk create units for a property
	 */
	async createBulkForProperty(
		propertyId: string,
		units: Omit<UnitInsert, 'propertyId'>[],
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<UnitRow[]> {
		try {
			const client = await this.getClient(userId, userToken)

			// First verify property ownership
			const { data: property, error: propertyError } = await client
				.from('Property')
				.select('id')
				.eq('id', propertyId)
				.eq('ownerId', ownerId)
				.single()

			if (propertyError || !property) {
				throw new Error('Property not found or not owned by user')
			}

			// Prepare units with propertyId
			const unitsToCreate = units.map(unit => ({
				...unit,
				propertyId
			}))

			// Bulk insert units
			const { data: createdUnits, error } = await client
				.from('Unit')
				.insert(unitsToCreate)
				.select('*')

			if (error) {
				this.logger.error('Error creating units:', error)
				throw error
			}

			return (createdUnits || []) as UnitRow[]
		} catch (error) {
			this.logger.error('Failed to bulk create units:', error)
			throw error
		}
	}

	/**
	 * Update unit status
	 */
	async updateStatus(
		unitId: string,
		status: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<UnitRow> {
		try {
			// First verify ownership
			const existing = await this.findByIdAndOwner(
				unitId,
				ownerId,
				false,
				userId,
				userToken
			)

			if (!existing) {
				throw new Error('Unit not found or not owned by user')
			}

			// Update the status
			return await this.update(
				unitId,
				{ status } as UnitUpdate,
				userId,
				userToken
			)
		} catch (error) {
			this.logger.error('Failed to update unit status:', error)
			throw error
		}
	}
}
