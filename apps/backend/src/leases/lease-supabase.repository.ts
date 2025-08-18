import { Injectable } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase-generated'
import { BaseSupabaseRepository } from '../common/repositories/base-supabase.repository'
import { SupabaseService } from '../common/supabase/supabase.service'
import { MultiTenantSupabaseService } from '../common/supabase/multi-tenant-supabase.service'

type LeaseRow = Database['public']['Tables']['Lease']['Row']
type LeaseInsert = Database['public']['Tables']['Lease']['Insert']
type LeaseUpdate = Database['public']['Tables']['Lease']['Update']

export interface LeaseWithRelations extends LeaseRow {
	id: string // Explicit id field to ensure it's always available
	startDate: string // Explicit date fields
	endDate: string
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
	Tenant?: {
		id: string
		name: string
		email: string
		phone: string | null
	}
	_count?: {
		Document: number
	}
}

export interface LeaseQueryOptions {
	status?: string
	unitId?: string
	tenantId?: string
	startDateFrom?: string
	startDateTo?: string
	endDateFrom?: string
	endDateTo?: string
	search?: string
	limit?: number
	offset?: number
	page?: number
}

/**
 * Supabase repository for Lease entity
 * Replaces the Prisma-based LeaseRepository
 * Leases are owned through property ownership via units
 */
@Injectable()
export class LeaseSupabaseRepository extends BaseSupabaseRepository<
	'Lease',
	LeaseRow,
	LeaseInsert,
	LeaseUpdate
> {
	protected readonly tableName = 'Lease' as const

	constructor(
		supabaseService: SupabaseService,
		multiTenantService: MultiTenantSupabaseService
	) {
		super(supabaseService, multiTenantService)
	}

	/**
	 * Find leases by owner with full unit/tenant/property data
	 * Leases are owned through property ownership via units
	 */
	async findByOwnerWithDetails(
		ownerId: string,
		options: LeaseQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<LeaseWithRelations[]> {
		try {
			const client = await this.getClient(userId, userToken)
			const {
				search,
				status,
				unitId,
				tenantId,
				startDateFrom,
				startDateTo,
				endDateFrom,
				endDateTo,
				limit = 10,
				offset = 0,
				page
			} = options

			// Calculate actual offset
			const actualOffset = page ? (page - 1) * limit : offset

			// Build the query with nested relationships
			let query = client.from('Lease').select(`
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
					),
					Tenant (
						id,
						name,
						email,
						phone
					)
				`)

			// Filter by owner through the relationship chain
			query = query.eq('Unit.Property.ownerId', ownerId)

			// Add filters
			if (status) {
				query = query.eq(
					'status',
					status as NonNullable<LeaseRow['status']>
				)
			}

			if (unitId) {
				query = query.eq('unitId', unitId)
			}

			if (tenantId) {
				query = query.eq('tenantId', tenantId)
			}

			if (startDateFrom) {
				query = query.gte('startDate', startDateFrom)
			}

			if (startDateTo) {
				query = query.lte('startDate', startDateTo)
			}

			if (endDateFrom) {
				query = query.gte('endDate', endDateFrom)
			}

			if (endDateTo) {
				query = query.lte('endDate', endDateTo)
			}

			// Add search filter (searches in terms and tenant info)
			if (search) {
				// Note: Complex OR searches across relationships are challenging in Supabase
				// We'll search in the terms field for now
				query = query.ilike('terms', `%${search}%`)
			}

			// Apply ordering and pagination
			query = query
				.order('createdAt', { ascending: false })
				.range(actualOffset, actualOffset + limit - 1)

			const { data, error } = await query

			if (error) {
				this.logger.error('Error fetching leases with details:', error)
				throw error
			}

			return (data || []) as LeaseWithRelations[]
		} catch (error) {
			this.logger.error('Failed to fetch leases by owner:', error)
			throw error
		}
	}

	/**
	 * Find lease by ID with ownership validation
	 */
	async findByIdAndOwner(
		id: string,
		ownerId: string,
		includeDetails = true,
		userId?: string,
		userToken?: string
	): Promise<LeaseWithRelations | null> {
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
					),
					Tenant (
						id,
						name,
						email,
						phone
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
				.from('Lease')
				.select(selectQuery)
				.eq('id', id)
				.single()

			if (error) {
				if (error.code === 'PGRST116') {
					return null // Not found
				}
				throw error
			}

			// Validate ownership - need to check if data has the expected structure
			if (data && typeof data === 'object' && 'Unit' in data) {
				const leaseData = data as unknown as LeaseWithRelations
				if (leaseData.Unit?.Property?.ownerId !== ownerId) {
					return null // No ownership
				}
				return leaseData
			}

			return null
		} catch (error) {
			this.logger.error('Failed to find lease by ID and owner:', error)
			throw error
		}
	}

	/**
	 * Find leases by unit ID
	 */
	async findByUnit(
		unitId: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<LeaseWithRelations[]> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data, error } = await client
				.from('Lease')
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
					),
					Tenant (
						id,
						name,
						email,
						phone
					)
				`
				)
				.eq('unitId', unitId)
				.eq('Unit.Property.ownerId', ownerId)
				.order('startDate', { ascending: false })

			if (error) {
				this.logger.error('Error fetching leases by unit:', error)
				throw error
			}

			return (data || []) as LeaseWithRelations[]
		} catch (error) {
			this.logger.error('Failed to fetch leases by unit:', error)
			throw error
		}
	}

	/**
	 * Find leases by tenant ID
	 */
	async findByTenant(
		tenantId: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<LeaseWithRelations[]> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data, error } = await client
				.from('Lease')
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
					),
					Tenant (
						id,
						name,
						email,
						phone
					)
				`
				)
				.eq('tenantId', tenantId)
				.eq('Unit.Property.ownerId', ownerId)
				.order('startDate', { ascending: false })

			if (error) {
				this.logger.error('Error fetching leases by tenant:', error)
				throw error
			}

			return (data || []) as LeaseWithRelations[]
		} catch (error) {
			this.logger.error('Failed to fetch leases by tenant:', error)
			throw error
		}
	}

	/**
	 * Get lease statistics for an owner
	 */
	async getStatsByOwner(
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<{
		total: number
		active: number
		expired: number
		terminated: number
		pending: number
		draft: number
	}> {
		try {
			const client = await this.getClient(userId, userToken)

			// Get all leases for the owner
			const { data: leases, error } = await client
				.from('Lease')
				.select(
					`
					status,
					Unit!inner (
						Property!inner (
							ownerId
						)
					)
				`
				)
				.eq('Unit.Property.ownerId', ownerId)

			if (error) {
				this.logger.error('Error fetching lease stats:', error)
				throw error
			}

			// Calculate statistics
			const stats = {
				total: leases?.length || 0,
				active: 0,
				expired: 0,
				terminated: 0,
				pending: 0,
				draft: 0
			}

			if (leases) {
				for (const lease of leases) {
					switch (lease.status) {
						case 'ACTIVE':
							stats.active++
							break
						case 'EXPIRED':
							stats.expired++
							break
						case 'TERMINATED':
							stats.terminated++
							break
						case 'DRAFT':
							stats.draft++
							break
					}
				}
			}

			return stats
		} catch (error) {
			this.logger.error('Failed to get lease stats:', error)
			throw error
		}
	}

	/**
	 * Find expiring leases (within the next 30 days)
	 */
	async findExpiringLeases(
		ownerId: string,
		days = 30,
		userId?: string,
		userToken?: string
	): Promise<LeaseWithRelations[]> {
		try {
			const client = await this.getClient(userId, userToken)
			const expirationDate = new Date()
			expirationDate.setDate(expirationDate.getDate() + days)

			const { data, error } = await client
				.from('Lease')
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
					),
					Tenant (
						id,
						name,
						email,
						phone
					)
				`
				)
				.eq('Unit.Property.ownerId', ownerId)
				.eq('status', 'ACTIVE')
				.lte('endDate', expirationDate.toISOString())
				.order('endDate', { ascending: true })

			if (error) {
				this.logger.error('Error fetching expiring leases:', error)
				throw error
			}

			return (data || []) as LeaseWithRelations[]
		} catch (error) {
			this.logger.error('Failed to fetch expiring leases:', error)
			throw error
		}
	}

	/**
	 * Create lease with unit and tenant validation
	 */
	async createWithValidation(
		leaseData: LeaseInsert,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<LeaseWithRelations> {
		try {
			const client = await this.getClient(userId, userToken)

			// First validate unit ownership and availability
			const { data: unit, error: unitError } = await client
				.from('Unit')
				.select(
					`
					id,
					status,
					Property (
						ownerId
					)
				`
				)
				.eq('id', leaseData.unitId)
				.single()

			if (unitError || !unit) {
				throw new Error('Unit not found')
			}

			if (unit.Property?.ownerId !== ownerId) {
				throw new Error('Unit not owned by user')
			}

			// Check for overlapping active leases
			const { data: existingLeases, error: leaseError } = await client
				.from('Lease')
				.select('id')
				.eq('unitId', leaseData.unitId)
				.eq('status', 'ACTIVE')
				.or(
					`and(startDate.lte.${leaseData.endDate},endDate.gte.${leaseData.startDate})`
				)

			if (leaseError) {
				throw leaseError
			}

			if (existingLeases && existingLeases.length > 0) {
				throw new Error('Unit has overlapping active lease')
			}

			// Create the lease
			const { data: createdLease, error: createError } = await client
				.from('Lease')
				.insert(leaseData)
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
							address
						)
					),
					Tenant (
						id,
						name,
						email,
						phone
					)
				`
				)
				.single()

			if (createError || !createdLease) {
				this.logger.error('Error creating lease:', createError)
				throw createError || new Error('Failed to create lease')
			}

			return createdLease as LeaseWithRelations
		} catch (error) {
			this.logger.error('Failed to create lease with validation:', error)
			throw error
		}
	}
}
