import { BadRequestException, Inject, Injectable, Logger, NotFoundException, Scope } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase-generated'
import type { AuthRequest } from '../shared/types'
import { SupabaseService } from '../database/supabase.service'
import { CreateTenantDto as TenantCreateDto, UpdateTenantDto as TenantUpdateDto } from './dto'

type Tenant = Database['public']['Tables']['Tenant']['Row']
type TenantInsert = Database['public']['Tables']['Tenant']['Insert']
type TenantUpdate = Database['public']['Tables']['Tenant']['Update']

export interface TenantWithRelations extends Tenant {
	_Lease?: {
		id: string
		startDate: string
		endDate: string
		status: string
		rentAmount: number
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

/**
 * Tenants service - Direct Supabase implementation following KISS principle
 * No abstraction layers, no base classes, just simple CRUD operations
 * Note: Tenants are accessed through property ownership via leases
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantsService {
	private readonly logger = new Logger(TenantsService.name)
	private readonly supabase: SupabaseClient<Database>

	constructor(
		@Inject(REQUEST) private request: AuthRequest,
		private supabaseService: SupabaseService
	) {
		// Get user-scoped client if token available, otherwise admin client
		const token = this.request.user?.supabaseToken ||
			this.request.headers?.authorization?.replace('Bearer ', '')
		
		this.supabase = token 
			? this.supabaseService.getUserClient(token)
			: this.supabaseService.getAdminClient()
	}

	/**
	 * Get all tenants for an owner through lease relationships
	 */
	async findAll(ownerId: string): Promise<TenantWithRelations[]> {
		const { data, error } = await this.supabase
			.from('Tenant')
			.select(`
				*,
				Lease!inner (
					id,
					startDate,
					endDate,
					status,
					rentAmount,
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
			.eq('Lease.Unit.Property.ownerId', ownerId)
			.order('createdAt', { ascending: false })

		if (error) {
			this.logger.error('Failed to fetch tenants:', error)
			throw new BadRequestException(error.message)
		}

		return data as TenantWithRelations[]
	}

	/**
	 * Get single tenant by ID with ownership validation
	 */
	async findOne(id: string, ownerId: string): Promise<TenantWithRelations> {
		const { data, error } = await this.supabase
			.from('Tenant')
			.select(`
				*,
				Lease (
					id,
					startDate,
					endDate,
					status,
					rentAmount,
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
			`)
			.eq('id', id)
			.single()

		if (error) {
			if (error.code === 'PGRST116') {
				throw new NotFoundException(`Tenant not found`)
			}
			this.logger.error('Failed to fetch tenant:', error)
			throw new BadRequestException(error.message)
		}

		// Validate ownership through lease relationship
		const tenant = data as TenantWithRelations
		const hasOwnership = tenant.Lease?.some(
			lease => lease.Unit?.Property?.ownerId === ownerId
		)

		if (!hasOwnership) {
			throw new NotFoundException(`Tenant not found`)
		}

		return tenant
	}

	/**
	 * Create new tenant
	 */
	async create(dto: TenantCreateDto, _ownerId: string): Promise<TenantWithRelations> {
		const tenantData: TenantInsert = {
			name: dto.name,
			email: dto.email,
			phone: dto.phone,
			emergencyContact: dto.emergencyContact
				? `${dto.emergencyContact}${dto.emergencyPhone ? ` - ${dto.emergencyPhone}` : ''}`
				: undefined,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		}

		const { data, error } = await this.supabase
			.from('Tenant')
			.insert(tenantData)
			.select(`
				*,
				Lease (
					id,
					startDate,
					endDate,
					status,
					rentAmount,
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
			`)
			.single()

		if (error) {
			this.logger.error('Failed to create tenant:', error)
			throw new BadRequestException(error.message)
		}

		this.logger.log(`Tenant created: ${data.id}`)
		return data as TenantWithRelations
	}

	/**
	 * Update tenant
	 */
	async update(
		id: string, 
		dto: TenantUpdateDto, 
		ownerId: string
	): Promise<TenantWithRelations> {
		// Verify ownership first
		await this.findOne(id, ownerId)

		const updateData: TenantUpdate = {
			...dto,
			emergencyContact: dto.emergencyContact
				? `${dto.emergencyContact}${dto.emergencyPhone ? ` - ${dto.emergencyPhone}` : ''}`
				: undefined,
			updatedAt: new Date().toISOString()
		}

		const { data, error } = await this.supabase
			.from('Tenant')
			.update(updateData)
			.eq('id', id)
			.select(`
				*,
				Lease (
					id,
					startDate,
					endDate,
					status,
					rentAmount,
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
			`)
			.single()

		if (error) {
			this.logger.error('Failed to update tenant:', error)
			throw new BadRequestException(error.message)
		}

		this.logger.log(`Tenant updated: ${id}`)
		return data as TenantWithRelations
	}

	/**
	 * Delete tenant (with validation for active leases)
	 */
	async remove(id: string, ownerId: string): Promise<void> {
		// Verify ownership first
		await this.findOne(id, ownerId)

		// Check for active leases
		const { data: activeLeases } = await this.supabase
			.from('Lease')
			.select('id')
			.eq('tenantId', id)
			.eq('status', 'ACTIVE')
			.limit(1)

		if (activeLeases && activeLeases.length > 0) {
			throw new BadRequestException('Cannot delete tenant with active leases')
		}

		const { error } = await this.supabase
			.from('Tenant')
			.delete()
			.eq('id', id)

		if (error) {
			this.logger.error('Failed to delete tenant:', error)
			throw new BadRequestException(error.message)
		}

		this.logger.log(`Tenant deleted: ${id}`)
	}

	/**
	 * Get tenant statistics for owner
	 */
	async getStats(ownerId: string): Promise<{
		total: number
		active: number
		inactive: number
		withActiveLeases: number
	}> {
		const tenants = await this.findAll(ownerId)

		const stats = {
			total: tenants.length,
			active: 0,
			inactive: 0,
			withActiveLeases: 0
		}

		for (const tenant of tenants) {
			const hasActiveLeases = tenant.Lease?.some(
				lease => lease.status === 'ACTIVE'
			)

			if (hasActiveLeases) {
				stats.active++
				stats.withActiveLeases++
			} else {
				stats.inactive++
			}
		}

		return stats
	}

	/**
	 * Search tenants
	 */
	async search(ownerId: string, searchTerm: string): Promise<TenantWithRelations[]> {
		const { data, error } = await this.supabase
			.from('Tenant')
			.select(`
				*,
				Lease!inner (
					id,
					startDate,
					endDate,
					status,
					rentAmount,
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
			.eq('Lease.Unit.Property.ownerId', ownerId)
			.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
			.order('createdAt', { ascending: false })

		if (error) {
			this.logger.error('Failed to search tenants:', error)
			throw new BadRequestException(error.message)
		}

		return data as TenantWithRelations[]
	}
}