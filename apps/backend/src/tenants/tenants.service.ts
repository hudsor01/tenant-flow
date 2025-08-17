import { Injectable, Logger } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase-generated'
import {
	TenantQueryOptions,
	TenantsSupabaseRepository,
	TenantWithRelations
} from './tenants-supabase.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { ValidationException } from '../common/exceptions/base.exception'
import { TenantCreateDto, TenantQueryDto, TenantUpdateDto } from './dto'
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
			const name = `${data.firstName} ${data.lastName}`.trim()

			const tenantData: TenantInsert = {
				name,
				email: data.email,
				phone: data.phone,
				emergencyContact: data.emergencyContactName
					? `${data.emergencyContactName}${data.emergencyContactPhone ? ` - ${data.emergencyContactPhone}` : ''}`
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
					name: `${data.firstName} ${data.lastName}`
				}
			})
		}
	}

	/**
	 * Validate tenant create data
	 */
	private validateCreateData(data: TenantCreateDto): void {
		if (!data.firstName?.trim()) {
			throw new ValidationException(
				'Tenant first name is required',
				'firstName',
				['First name is required']
			)
		}
		if (!data.lastName?.trim()) {
			throw new ValidationException(
				'Tenant last name is required',
				'lastName',
				['Last name is required']
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
			const name = `${tenantData.firstName} ${tenantData.lastName}`.trim()
			const tenantInsert: TenantInsert = {
				name,
				email: tenantData.email,
				phone: tenantData.phone,
				emergencyContact: tenantData.emergencyContactName
					? `${tenantData.emergencyContactName}${tenantData.emergencyContactPhone ? ` - ${tenantData.emergencyContactPhone}` : ''}`
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
					name: `${tenantData.firstName} ${tenantData.lastName}`,
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

	// ========================================
	// Backward Compatibility Methods (Deprecated)
	// ========================================

	/** @deprecated Use findByOwner() instead */
	async getTenantsByOwner(
		ownerId: string,
		query?: TenantQueryDto
	): Promise<TenantWithRelations[]> {
		return this.findByOwner(ownerId, query)
	}

	/** @deprecated Use getStats() instead */
	async getTenantStats(ownerId: string) {
		return this.getStats(ownerId)
	}

	/** @deprecated Use findById() instead */
	async getTenantById(
		id: string,
		ownerId: string
	): Promise<TenantWithRelations | null> {
		try {
			return await this.findById(id, ownerId)
		} catch (_error) {
			return null
		}
	}

	/** @deprecated Use findById() instead */
	async getTenantByIdOrThrow(
		id: string,
		ownerId: string
	): Promise<TenantWithRelations> {
		return this.findById(id, ownerId)
	}
}
