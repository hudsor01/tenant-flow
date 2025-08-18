import { Injectable } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase-generated'
import { BaseSupabaseRepository } from '../common/repositories/base-supabase.repository'
import { SupabaseService } from '../common/supabase/supabase.service'
import { MultiTenantSupabaseService } from '../common/supabase/multi-tenant-supabase.service'

type TenantRow = Database['public']['Tables']['Tenant']['Row']
type TenantInsert = Database['public']['Tables']['Tenant']['Insert']

export interface TenantWithRelations extends TenantRow {
	Lease?: {
		id: string
		startDate: string
		endDate: string
		status: string
		rent: number
		Unit?: {
			id: string
			unitNumber: string
			Property?: {
				id: string
				name: string
				address: string
				ownerId: string
			}
		}
	}[]
}

export interface TenantQueryOptions {
	status?: string
	search?: string
	limit?: number
	offset?: number
	page?: number
}

/**
 * Supabase repository for Tenant entity
 * Replaces the Prisma-based TenantsRepository
 * Note: Tenants have indirect ownership through leases
 */
@Injectable()
export class TenantsSupabaseRepository extends BaseSupabaseRepository<TenantRow> {
	protected readonly tableName = 'Tenant'

	constructor(
		supabaseService: SupabaseService,
		multiTenantService: MultiTenantSupabaseService
	) {
		super(supabaseService, multiTenantService)
	}

	/**
	 * Find tenants by owner with full lease/property data
	 * Tenants are owned through property ownership via leases
	 */
	async findByOwnerWithLeases(
		ownerId: string,
		options: TenantQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<TenantWithRelations[]> {
		try {
			const client = await this.getClient(userId, userToken)
			const { search, status, limit = 10, offset = 0, page } = options

			// Calculate actual offset
			const actualOffset = page ? (page - 1) * limit : offset

			// Build the query with nested relationships
			let query = client.from('Tenant').select(`
					*,
					Lease!inner (
						id,
						startDate,
						endDate,
						status,
						rent,
						Unit!inner (
							id,
							unitNumber,
							Property!inner (
								id,
								name,
								address,
								ownerId
							)
						)
					)
				`)

			// Filter by owner through the relationship chain
			query = query.eq('Lease.Unit.Property.ownerId', ownerId)

			// Add status filter if provided
			if (status) {
				// Assuming status refers to lease status
				query = query.eq('Lease.status', status as 'ACTIVE' | 'DRAFT' | 'EXPIRED' | 'TERMINATED')
			}

			// Add search filter (searches in name, email, and phone)
			if (search) {
				query = query.or(
					`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
				)
			}

			// Apply pagination
			query = query.range(actualOffset, actualOffset + limit - 1)

			const { data, error } = await query

			if (error) {
				this.logger.error('Error fetching tenants with leases:', error)
				throw error
			}

			return (data || []) as unknown as TenantWithRelations[]
		} catch (error) {
			this.logger.error('Failed to fetch tenants by owner:', error)
			throw error
		}
	}

	/**
	 * Find tenant by ID with ownership validation
	 */
	async findByIdAndOwner(
		id: string,
		ownerId: string,
		includeDetails = false,
		userId?: string,
		userToken?: string
	): Promise<TenantWithRelations | null> {
		try {
			const client = await this.getClient(userId, userToken)

			// Build query with optional details
			const selectQuery = includeDetails
				? `
					*,
					Lease (
						id,
						startDate,
						endDate,
						status,
						rent,
						Unit (
							id,
							unitNumber,
							Property (
								id,
								name,
								address,
								ownerId
							)
						)
					)
				`
				: '*'

			const { data, error } = await client
				.from('Tenant')
				.select(selectQuery)
				.eq('id', id)
				.single()

			if (error) {
				if (error.code === 'PGRST116') {
					return null // Not found
				}
				throw error
			}

			// Validate ownership through lease relationship
			if (data && includeDetails) {
				const tenant = data as unknown as TenantWithRelations
				const hasOwnership = tenant.Lease?.some(
					lease => lease.Unit?.Property?.ownerId === ownerId
				)

				if (!hasOwnership) {
					return null // No ownership relationship
				}
			}

			return data as unknown as TenantWithRelations
		} catch (error) {
			this.logger.error('Failed to find tenant by ID and owner:', error)
			throw error
		}
	}

	/**
	 * Get tenant statistics for an owner
	 */
	async getStatsByOwner(
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<{
		total: number
		active: number
		inactive: number
		withActiveLeases: number
	}> {
		try {
			const client = await this.getClient(userId, userToken)

			// Get all tenants for the owner through leases
			const { data: tenants, error } = await client
				.from('Tenant')
				.select(
					`
					id,
					Lease!inner (
						status,
						Unit!inner (
							Property!inner (
								ownerId
							)
						)
					)
				`
				)
				.eq('Lease.Unit.Property.ownerId', ownerId)

			if (error) {
				this.logger.error('Error fetching tenant stats:', error)
				throw error
			}

			// Calculate statistics
			const total = tenants?.length || 0
			const withActiveLeases =
				tenants?.filter(tenant =>
					tenant.Lease?.some(
						(lease: { status: string }) => lease.status === 'ACTIVE'
					)
				).length || 0

			return {
				total,
				active: withActiveLeases,
				inactive: total - withActiveLeases,
				withActiveLeases
			}
		} catch (error) {
			this.logger.error('Failed to get tenant stats:', error)
			throw error
		}
	}

	/**
	 * Check if tenant has active leases
	 */
	async hasActiveLeases(
		tenantId: string,
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
						Property!inner (
							ownerId
						)
					)
				`
				)
				.eq('tenantId', tenantId)
				.eq('status', 'ACTIVE')
				.eq('Unit.Property.ownerId', ownerId)
				.limit(1)

			if (error) {
				this.logger.error('Error checking active leases:', error)
				throw error
			}

			return (data?.length || 0) > 0
		} catch (error) {
			this.logger.error('Failed to check active leases:', error)
			throw error
		}
	}

	/**
	 * Create tenant with optional lease assignment
	 */
	async createWithLease(
		tenantData: TenantInsert,
		leaseData?: Database['public']['Tables']['Lease']['Insert'],
		userId?: string,
		userToken?: string
	): Promise<TenantWithRelations> {
		try {
			const client = await this.getClient(userId, userToken)

			// Create tenant first
			const { data: tenant, error: tenantError } = await client
				.from('Tenant')
				.insert(tenantData)
				.select('*')
				.single()

			if (tenantError || !tenant) {
				this.logger.error('Error creating tenant:', tenantError)
				throw tenantError || new Error('Failed to create tenant')
			}

			// Create lease if provided
			let lease = null
			if (leaseData) {
				const leaseWithTenant = {
					...leaseData,
					tenantId: tenant.id
				}

				const { data: createdLease, error: leaseError } = await client
					.from('Lease')
					.insert(leaseWithTenant)
					.select(
						`
						id,
						startDate,
						endDate,
						status,
						rent,
						Unit (
							id,
							unitNumber,
							Property (
								id,
								name,
								address
							)
						)
					`
					)
					.single()

				if (leaseError) {
					this.logger.error('Error creating lease:', leaseError)
					// Don't throw - tenant was created successfully
				} else {
					lease = createdLease
				}
			}

			return {
				...tenant,
				Lease: lease ? [lease] : []
			} as unknown as TenantWithRelations
		} catch (error) {
			this.logger.error('Failed to create tenant with lease:', error)
			throw error
		}
	}
}
