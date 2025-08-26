<<<<<<< HEAD
/**
 * 🚨 ULTRA-NATIVE SERVICE - DO NOT ADD ORCHESTRATION 🚨
 *
 * DIRECT PostgreSQL RPC calls ONLY. Each method <30 lines.
 * ❌ FORBIDDEN: Service layers, repositories, business logic classes
 * See: apps/backend/ULTRA_NATIVE_ARCHITECTURE.md
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import type {
	CreateTenantRequest,
	UpdateTenantRequest
} from '../schemas/tenants.schema'
=======
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
import {
	CreateTenantDto as TenantCreateDto,
	UpdateTenantDto as TenantUpdateDto
} from './dto'
>>>>>>> origin/main

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
<<<<<<< HEAD

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Get all tenants for a user using RPC
	 */
	async findAll(userId: string, query: Record<string, unknown>) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_user_tenants', {
				p_user_id: userId,
				p_search: query.search as string | undefined,
				p_invitation_status: query.invitationStatus as
					| string
					| undefined,
				p_limit: query.limit as number | undefined,
				p_offset: query.offset as number | undefined,
				p_sort_by: query.sortBy as string | undefined,
				p_sort_order: query.sortOrder as string | undefined
			})

		if (error) {
			this.logger.error('Failed to get tenants', {
				userId,
				error: error.message
			})
			throw new BadRequestException('Failed to retrieve tenants')
		}

		return data
	}

	/**
	 * Get tenant statistics using RPC
	 */
	async getStats(userId: string) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_tenant_stats', { p_user_id: userId })
			.single()

		if (error) {
			this.logger.error('Failed to get tenant stats', {
				userId,
				error: error.message
			})
			throw new BadRequestException(
				'Failed to retrieve tenant statistics'
			)
		}

		return data
	}

	/**
	 * Get single tenant using RPC
	 */
	async findOne(userId: string, tenantId: string) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_tenant_by_id', {
				p_user_id: userId,
				p_tenant_id: tenantId
			})
			.single()

		if (error) {
			this.logger.error('Failed to get tenant', {
				userId,
				tenantId,
				error: error.message
			})
			return null
		}

		return data
	}

	/**
	 * Create tenant using RPC
	 */
	async create(userId: string, createRequest: CreateTenantRequest) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('create_tenant', {
				p_user_id: userId,
				p_name: createRequest.name,
				p_email: createRequest.email,
				p_phone: createRequest.phone || undefined,
				p_emergency_contact: createRequest.emergencyContact || undefined
			})
			.single()

		if (error) {
			this.logger.error('Failed to create tenant', {
				userId,
				error: error.message
			})
			throw new BadRequestException('Failed to create tenant')
		}

		return data
	}

	/**
	 * Update tenant using RPC
	 */
	async update(
		userId: string,
		tenantId: string,
		updateRequest: UpdateTenantRequest
	) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('update_tenant', {
				p_user_id: userId,
				p_tenant_id: tenantId,
				p_name: updateRequest.name,
				p_email: updateRequest.email,
				p_phone: updateRequest.phone,
				p_emergency_contact: updateRequest.emergencyContact
			})
			.single()

		if (error) {
			this.logger.error('Failed to update tenant', {
				userId,
				tenantId,
				error: error.message
			})
			return null
		}

		return data
	}

	/**
	 * Delete tenant using RPC
	 */
	async remove(userId: string, tenantId: string) {
		const { error } = await this.supabaseService
			.getAdminClient()
			.rpc('delete_tenant', {
				p_user_id: userId,
				p_tenant_id: tenantId
			})

		if (error) {
			this.logger.error('Failed to delete tenant', {
				userId,
				tenantId,
				error: error.message
			})
			throw new BadRequestException('Failed to delete tenant')
		}
	}

	/**
	 * Send invitation to tenant using RPC
	 */
	async sendInvitation(userId: string, tenantId: string) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('send_tenant_invitation', {
				p_user_id: userId,
				p_tenant_id: tenantId
			})
			.single()

		if (error) {
			this.logger.error('Failed to send invitation', {
				userId,
				tenantId,
				error: error.message
			})
			throw new BadRequestException('Failed to send invitation')
		}

		return data
	}

	/**
	 * Resend invitation to tenant using RPC
	 */
	async resendInvitation(userId: string, tenantId: string) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('resend_tenant_invitation', {
				p_user_id: userId,
				p_tenant_id: tenantId
			})
			.single()

		if (error) {
			this.logger.error('Failed to resend invitation', {
				userId,
				tenantId,
				error: error.message
			})
			throw new BadRequestException('Failed to resend invitation')
		}

		return data
=======
	private readonly supabase: SupabaseClient<Database>

	constructor(
		@Inject(REQUEST) private request: AuthRequest,
		private supabaseService: SupabaseService
	) {
		// Get user-scoped client if token available, otherwise admin client
		const token =
			this.request.user?.supabaseToken ||
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
			.select(
				`
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
			`
			)
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
			.select(
				`
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
			`
			)
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
		const hasOwnership = tenant._Lease?.some(
			lease => lease.Unit?.Property?.ownerId === ownerId
		)

		if (!hasOwnership) {
			throw new NotFoundException(`Tenant not found`)
		}

		return tenant
	}

	/**
	 * Get tenants by property ID
	 */
	async findByProperty(
		propertyId: string,
		ownerId: string
	): Promise<TenantWithRelations[]> {
		const { data, error } = await this.supabase
			.from('Tenant')
			.select(
				`
				*,
				Lease!inner (
					id,
					startDate,
					endDate,
					monthlyRent,
					status,
					Unit!inner (
						id,
						unitNumber,
						bedrooms,
						bathrooms,
						Property!inner (
							id,
							name,
							ownerId
						)
					)
				)
			`
			)
			.eq('Lease.Unit.Property.id', propertyId)
			.eq('Lease.Unit.Property.ownerId', ownerId)
			.order('createdAt', { ascending: false })

		if (error) {
			this.logger.error('Failed to fetch tenants by property:', error)
			throw new BadRequestException(error.message)
		}

		return data as TenantWithRelations[]
	}

	/**
	 * Create new tenant
	 */
	async create(
		dto: TenantCreateDto,
		_ownerId: string
	): Promise<TenantWithRelations> {
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
			.select(
				`
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
			`
			)
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
			.select(
				`
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
			`
			)
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
			throw new BadRequestException(
				'Cannot delete tenant with active leases'
			)
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
			const hasActiveLeases = tenant._Lease?.some(
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
	async search(
		ownerId: string,
		searchTerm: string
	): Promise<TenantWithRelations[]> {
		const { data, error } = await this.supabase
			.from('Tenant')
			.select(
				`
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
			`
			)
			.eq('Lease.Unit.Property.ownerId', ownerId)
			.or(
				`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
			)
			.order('createdAt', { ascending: false })

		if (error) {
			this.logger.error('Failed to search tenants:', error)
			throw new BadRequestException(error.message)
		}

		return data as TenantWithRelations[]
>>>>>>> origin/main
	}
}
