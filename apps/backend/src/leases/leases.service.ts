import {
	BadRequestException,
	Inject,
	Injectable,
	Logger,
	NotFoundException,
	Scope
} from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase-generated'
import type { AuthRequest } from '../shared/types'
import { SupabaseService } from '../database/supabase.service'
import { CreateLeaseDto, UpdateLeaseDto } from '../shared/types/dto-exports'

type Lease = Database['public']['Tables']['Lease']['Row']
type LeaseInsert = Database['public']['Tables']['Lease']['Insert']
type LeaseUpdate = Database['public']['Tables']['Lease']['Update']
type Unit = Database['public']['Tables']['Unit']['Row']
type Property = Database['public']['Tables']['Property']['Row']
type Tenant = Database['public']['Tables']['Tenant']['Row']

export interface LeaseWithRelations extends Lease {
	Unit?: Unit & {
		Property?: Property
	}
	Tenant?: Tenant
}

export interface LeaseQueryOptions {
	status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
	unitId?: string
	tenantId?: string
	startDateFrom?: string
	startDateTo?: string
	endDateFrom?: string
	endDateTo?: string
	search?: string
	limit?: number
	offset?: number
}

/**
 * Leases service - Direct Supabase implementation following KISS principle
 * No abstraction layers, no base classes, just simple CRUD operations
 */
@Injectable({ scope: Scope.REQUEST })
export class LeasesService {
	private readonly logger = new Logger(LeasesService.name)
	private readonly supabase: SupabaseClient<Database>

	constructor(
		@Inject(REQUEST) private request: AuthRequest,
		private supabaseService: SupabaseService
	) {
		// Get user-scoped client if token available, otherwise admin client
		// Safely read the Authorization header (may be undefined)
		const authHeader = this.request.headers.authorization ?? ''
		const headerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : undefined
		const token = this.request.user?.supabaseToken ?? headerToken

		// If token is falsy (undefined or empty string) use admin client
		this.supabase = token
			? this.supabaseService.getUserClient(token)
			: this.supabaseService.getAdminClient()
	}

	/**
	 * Get all leases for an owner
	 */
	async findAll(
		ownerId: string,
		options: LeaseQueryOptions = {}
	): Promise<LeaseWithRelations[]> {
		let query = this.supabase.from('Lease').select(`
				*,
				Unit!inner (
					*,
					Property!inner (*)
				),
				Tenant (*)
			`)

		// Filter by owner through join
		query = query.eq('Unit.Property.ownerId', ownerId)

		// Apply filters
		if (options.status) {
			query = query.eq('status', options.status)
		}
		if (options.unitId) {
			query = query.eq('unitId', options.unitId)
		}
		if (options.tenantId) {
			query = query.eq('tenantId', options.tenantId)
		}
		if (options.startDateFrom) {
			query = query.gte('startDate', options.startDateFrom)
		}
		if (options.startDateTo) {
			query = query.lte('startDate', options.startDateTo)
		}
		if (options.endDateFrom) {
			query = query.gte('endDate', options.endDateFrom)
		}
		if (options.endDateTo) {
			query = query.lte('endDate', options.endDateTo)
		}

		// Apply search
		if (options.search) {
			query = query.or(`
				Tenant.firstName.ilike.%${options.search}%,
				Tenant.lastName.ilike.%${options.search}%,
				Tenant.email.ilike.%${options.search}%,
				Unit.unitNumber.ilike.%${options.search}%,
				Unit.Property.name.ilike.%${options.search}%
			`)
		}

		// Apply pagination
		if (options.offset && options.limit) {
			query = query.range(
				options.offset,
				options.offset + options.limit - 1
			)
		} else if (options.limit) {
			query = query.limit(options.limit)
		}

		query = query.order('createdAt', { ascending: false })

		const { data, error } = await query

		if (error) {
			this.logger.error('Failed to fetch leases:', error)
			throw new BadRequestException(error.message)
		}

		return data as LeaseWithRelations[]
	}

	/**
	 * Get single lease by ID
	 */
	async findOne(id: string, ownerId: string): Promise<LeaseWithRelations> {
		const { data, error } = await this.supabase
			.from('Lease')
			.select(
				`
				*,
				Unit!inner (
					*,
					Property!inner (*)
				),
				Tenant (*)
			`
			)
			.eq('id', id)
			.eq('Unit.Property.ownerId', ownerId)
			.single()

		if (error) {
			if (error.code === 'PGRST116') {
				throw new NotFoundException('Lease not found')
			}
			this.logger.error('Failed to fetch lease:', error)
			throw new BadRequestException(error.message)
		}

		return data as LeaseWithRelations
	}

	/**
	 * Create new lease
	 */
	async create(
		dto: CreateLeaseDto,
		ownerId: string
	): Promise<LeaseWithRelations> {
		// First validate that the unit belongs to the owner
		const { data: unit } = await this.supabase
			.from('Unit')
			.select(
				`
				*,
				Property (*)
			`
			)
			.eq('id', dto.unitId)
			.eq('Property.ownerId', ownerId)
			.single()

		if (!unit) {
			throw new BadRequestException('Unit not found or not owned by user')
		}

		// Validate tenant belongs to owner
		const tenantQuery = await this.supabase
			.from('Tenant')
			.select('id')
			.eq('id', dto.tenantId)
			.eq('ownerId', ownerId)
			.single()

		const tenant = tenantQuery.data

		if (!tenant) {
			throw new BadRequestException(
				'Tenant not found or not owned by user'
			)
		}

		// Validate lease dates
		this.validateLeaseDates(dto.startDate, dto.endDate)

		// Check for overlapping leases
		await this.checkLeaseConflicts(dto.unitId, dto.startDate, dto.endDate)

		const leaseData: LeaseInsert = {
			unitId: dto.unitId,
			tenantId: dto.tenantId,
			startDate: new Date(dto.startDate).toISOString(),
			endDate: new Date(dto.endDate).toISOString(),
			rentAmount: dto.rentAmount,
			securityDeposit: dto.securityDeposit,
			status: dto.status as
				| 'DRAFT'
				| 'ACTIVE'
				| 'EXPIRED'
				| 'TERMINATED',
			terms: dto.leaseTerms,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		}

		const { data, error } = await this.supabase
			.from('Lease')
			.insert(leaseData)
			.select(
				`
				*,
				Unit!inner (
					*,
					Property!inner (*)
				),
				Tenant (*)
			`
			)
			.single()

		if (error) {
			this.logger.error('Failed to create lease:', error)
			throw new BadRequestException(error.message)
		}

		this.logger.log(`Lease created: ${data.id}`)
		return data as LeaseWithRelations
	}

	/**
	 * Update lease
	 */
	async update(
		id: string,
		dto: UpdateLeaseDto,
		ownerId: string
	): Promise<LeaseWithRelations> {
		// Verify ownership
		const existing = await this.findOne(id, ownerId)

		// Validate dates if provided
		if (dto.startDate ?? dto.endDate) {
			const startDate = dto.startDate ?? existing.startDate
			const endDate = dto.endDate ?? existing.endDate
			this.validateLeaseDates(startDate, endDate)

			// Check for conflicts if dates changed
			if (dto.startDate ?? dto.endDate) {
				await this.checkLeaseConflicts(
					existing.unitId,
					startDate,
					endDate,
					id
				)
			}
		}

		const updateData: LeaseUpdate = {
			updatedAt: new Date().toISOString()
		}

		// Update fields
		if (dto.startDate) {
			updateData.startDate = new Date(dto.startDate).toISOString()
		}
		if (dto.endDate) {
			updateData.endDate = new Date(dto.endDate).toISOString()
		}
		if (dto.status) {
			updateData.status = dto.status as
				| 'DRAFT'
				| 'ACTIVE'
				| 'EXPIRED'
				| 'TERMINATED'
		}
		if (dto.rentAmount !== undefined) {
			updateData.rentAmount = dto.rentAmount
		}
		if (dto.securityDeposit !== undefined) {
			updateData.securityDeposit = dto.securityDeposit
		}
		if (dto.leaseTerms) {
			updateData.terms = dto.leaseTerms
		}

		const { data, error } = await this.supabase
			.from('Lease')
			.update(updateData)
			.eq('id', id)
			.select(
				`
				*,
				Unit!inner (
					*,
					Property!inner (*)
				),
				Tenant (*)
			`
			)
			.single()

		if (error) {
			this.logger.error('Failed to update lease:', error)
			throw new BadRequestException(error.message)
		}

		this.logger.log(`Lease updated: ${id}`)
		return data as LeaseWithRelations
	}

	/**
	 * Delete lease
	 */
	async remove(id: string, ownerId: string): Promise<void> {
		// Verify ownership
		await this.findOne(id, ownerId)

		const { error } = await this.supabase
			.from('Lease')
			.delete()
			.eq('id', id)

		if (error) {
			this.logger.error('Failed to delete lease:', error)
			throw new BadRequestException(error.message)
		}

		this.logger.log(`Lease deleted: ${id}`)
	}

	/**
	 * Get lease statistics
	 */
	async getStats(ownerId: string): Promise<{
		total: number
		active: number
		expired: number
		terminated: number
		draft: number
	}> {
		const leases = await this.findAll(ownerId)

		const stats = {
			total: leases.length,
			active: 0,
			expired: 0,
			terminated: 0,
			draft: 0
		}

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
				default:
					// Handle any other statuses
					break
			}
		}

		return stats
	}

	/**
	 * Get leases by unit
	 */
	async findByUnit(
		unitId: string,
		ownerId: string
	): Promise<LeaseWithRelations[]> {
		return this.findAll(ownerId, { unitId })
	}

	/**
	 * Get leases by tenant
	 */
	async findByTenant(
		tenantId: string,
		ownerId: string
	): Promise<LeaseWithRelations[]> {
		return this.findAll(ownerId, { tenantId })
	}

	/**
	 * Search leases
	 */
	async search(
		ownerId: string,
		searchTerm: string
	): Promise<LeaseWithRelations[]> {
		return this.findAll(ownerId, { search: searchTerm })
	}

	/**
	 * Get expiring leases
	 */
	async getExpiringLeases(
		ownerId: string,
		days = 30
	): Promise<LeaseWithRelations[]> {
		const futureDate = new Date()
		futureDate.setDate(futureDate.getDate() + days)

		return this.findAll(ownerId, {
			status: 'ACTIVE',
			endDateTo: futureDate.toISOString()
		})
	}

	/**
	 * Private helper methods
	 */
	private validateLeaseDates(
		startDate: string | Date,
		endDate: string | Date
	): void {
		const start = new Date(startDate)
		const end = new Date(endDate)

		if (end <= start) {
			throw new BadRequestException('End date must be after start date')
		}
	}

	private async checkLeaseConflicts(
		unitId: string,
		startDate: string | Date,
		endDate: string | Date,
		excludeLeaseId?: string
	): Promise<void> {
		const start = new Date(startDate).toISOString()
		const end = new Date(endDate).toISOString()

		let query = this.supabase
			.from('Lease')
			.select('id')
			.eq('unitId', unitId)
			.neq('status', 'TERMINATED')
			.or(`startDate.lte.${end},endDate.gte.${start}`)

		if (excludeLeaseId) {
			query = query.neq('id', excludeLeaseId)
		}

		const { data: conflicts } = await query.limit(1)

		if (conflicts && conflicts.length > 0) {
			throw new BadRequestException(
				'Lease dates conflict with existing lease'
			)
		}
	}
}
