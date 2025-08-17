import { Injectable, Logger } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase-generated'
import {
	TenantQueryOptions,
	TenantsSupabaseRepository,
	TenantWithRelations
} from './tenants-supabase.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { ValidationException } from '../common/exceptions/base.exception'
import { TenantCreateDto, TenantUpdateDto } from './dto'
import { FairHousingService } from '../common/validation/fair-housing.service'

type TenantInsert = Database['public']['Tables']['Tenant']['Insert']
type TenantUpdate = Database['public']['Tables']['Tenant']['Update']

/**
 * Tenants service using Supabase
 * Handles tenant management with property ownership validation through leases
 */
@Injectable()
export class TenantsService {
	private readonly logger = new Logger(TenantsService.name)

	constructor(
		private readonly repository: TenantsSupabaseRepository,
		private readonly errorHandler: ErrorHandlerService,
		private readonly fairHousingService: FairHousingService
	) {}

	/**
	 * Create a new tenant with Fair Housing compliance validation
	 */
	async create(
		data: TenantCreateDto,
		_ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<TenantWithRelations> {
		try {
			// Fair Housing Act compliance validation
			await this.fairHousingService.validateTenantData(
				data as unknown as Record<string, unknown>,
				'system'
			)

			// Standard validation
			this.validateCreateData(data)

			// Combine firstName and lastName to create the name field
			const tenantData: TenantInsert = {
				name: data.name,
				email: data.email,
				phone: data.phone,
				emergencyContact: data.emergencyContact
					? `${data.emergencyContact}${data.emergencyPhone ? ` - ${data.emergencyPhone}` : ''}`
					: undefined,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			const tenant = await this.repository.create(
				tenantData,
				userId,
				userToken
			)

			this.logger.log('Tenant created successfully', {
				tenantId: tenant.id,
				name: tenant.name,
				email: tenant.email
			})

			return tenant
		} catch (error) {
			this.logger.error('Failed to create tenant:', error)
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'create',
				resource: 'tenant',
				metadata: {
					email: data.email,
					name: data.name
				}
			})
		}
	}

	/**
	 * Validate tenant create data
	 */
	private validateCreateData(data: TenantCreateDto): void {
		if (!data.name?.trim()) {
			throw new ValidationException(
				'Tenant name is required',
				'name',
				['Name is required']
			)
		}
		if (!data.email?.trim()) {
			throw new ValidationException('Tenant email is required', 'email')
		}
	}

	/**
	 * Find tenant by ID
	 */
	async findById(
		id: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<TenantWithRelations> {
		try {
			const tenant = await this.repository.findByIdAndOwner(
				id,
				ownerId,
				true,
				userId,
				userToken
			)

			if (!tenant) {
				throw new Error('Tenant not found')
			}

			return tenant
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'findById',
				resource: 'tenant',
				metadata: { tenantId: id, ownerId }
			})
		}
	}

	/**
	 * Get all tenants for an owner through lease relationships
	 */
	async findByOwner(
		ownerId: string,
		options: TenantQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<TenantWithRelations[]> {
		try {
			// Validate owner ID
			if (
				!ownerId ||
				typeof ownerId !== 'string' ||
				ownerId.trim().length === 0
			) {
				throw new ValidationException('Owner ID is required', 'ownerId')
			}

			return await this.repository.findByOwnerWithLeases(
				ownerId,
				options,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'findByOwner',
				resource: 'tenant',
				metadata: { ownerId }
			})
		}
	}

	/**
	 * Update tenant
	 */
	async update(
		id: string,
		data: TenantUpdateDto,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<TenantWithRelations> {
		try {
			// Verify ownership first
			const existing = await this.repository.findByIdAndOwner(
				id,
				ownerId,
				false,
				userId,
				userToken
			)

			if (!existing) {
				throw new Error('Tenant not found')
			}

			const updateData: TenantUpdate = {
				...data,
				updatedAt: new Date().toISOString()
			}

			const updated = await this.repository.update(
				id,
				updateData,
				userId,
				userToken
			)

			this.logger.log('Tenant updated successfully', {
				tenantId: id,
				ownerId
			})

			return updated
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'update',
				resource: 'tenant',
				metadata: { tenantId: id, ownerId }
			})
		}
	}

	/**
	 * Delete tenant (with validation for active leases)
	 */
	async delete(
		id: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<void> {
		try {
			// Verify ownership first
			const existing = await this.repository.findByIdAndOwner(
				id,
				ownerId,
				false,
				userId,
				userToken
			)

			if (!existing) {
				throw new Error('Tenant not found')
			}

			// Check for active leases before deletion
			const hasActiveLeases = await this.repository.hasActiveLeases(
				id,
				ownerId,
				userId,
				userToken
			)

			if (hasActiveLeases) {
				throw new ValidationException(
					'Cannot delete tenant with active leases',
					'tenantId'
				)
			}

			await this.repository.delete(id, userId, userToken)

			this.logger.log('Tenant deleted successfully', {
				tenantId: id,
				ownerId
			})
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'delete',
				resource: 'tenant',
				metadata: { tenantId: id, ownerId }
			})
		}
	}

	/**
	 * Get tenant statistics for owner
	 */
	async getStats(
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
			return await this.repository.getStatsByOwner(
				ownerId,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'getStats',
				resource: 'tenant',
				metadata: { ownerId }
			})
		}
	}

	/**
	 * Create tenant with lease assignment
	 */
	async createWithLease(
		tenantData: TenantCreateDto,
		leaseData: Database['public']['Tables']['Lease']['Insert'],
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<TenantWithRelations> {
		try {
			// Fair Housing validation
			await this.fairHousingService.validateTenantData(
				tenantData as unknown as Record<string, unknown>,
				'system'
			)

			this.validateCreateData(tenantData)

			// Prepare tenant data
			const tenantInsert: TenantInsert = {
				name: tenantData.name,
				email: tenantData.email,
				phone: tenantData.phone,
				emergencyContact: tenantData.emergencyContact
					? `${tenantData.emergencyContact}${tenantData.emergencyPhone ? ` - ${tenantData.emergencyPhone}` : ''}`
					: undefined,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			const result = await this.repository.createWithLease(
				tenantInsert,
				leaseData,
				userId,
				userToken
			)

			this.logger.log('Tenant created with lease successfully', {
				tenantId: result.id,
				name: result.name,
				ownerId
			})

			return result
		} catch (error) {
			this.logger.error('Failed to create tenant with lease:', error)
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'createWithLease',
				resource: 'tenant',
				metadata: {
					email: tenantData.email,
					name: tenantData.name,
					ownerId
				}
			})
		}
	}

	/**
	 * Search tenants by text
	 */
	async search(
		ownerId: string,
		searchTerm: string,
		options: TenantQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<TenantWithRelations[]> {
		try {
			const searchOptions = {
				...options,
				search: searchTerm
			}

			return await this.repository.findByOwnerWithLeases(
				ownerId,
				searchOptions,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'search',
				resource: 'tenant',
				metadata: { ownerId, searchTerm }
			})
		}
	}

	/**
	 * Get tenants with active leases only
	 */
	async getActiveTenantsWithLeases(
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<TenantWithRelations[]> {
		try {
			const options: TenantQueryOptions = {
				status: 'ACTIVE'
			}

			return await this.repository.findByOwnerWithLeases(
				ownerId,
				options,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'getActiveTenantsWithLeases',
				resource: 'tenant',
				metadata: { ownerId }
			})
		}
	}
}