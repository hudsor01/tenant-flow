import { Injectable } from '@nestjs/common'
import { Tenant, Prisma } from '@repo/database'
import * as crypto from 'crypto'
import { TenantsRepository } from './tenants.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { BaseCrudService, BaseStats } from '../common/services/base-crud.service'
import { ValidationException } from '../common/exceptions/base.exception'
import { TenantCreateDto, TenantUpdateDto, TenantQueryDto } from './dto'
import { FairHousingService } from '../common/validation/fair-housing.service'

@Injectable()
export class TenantsService extends BaseCrudService<
	Tenant,
	TenantCreateDto,
	TenantUpdateDto,
	TenantQueryDto,
	Prisma.TenantCreateInput,
	Prisma.TenantUpdateInput,
	Prisma.TenantWhereInput
> {
	protected readonly entityName = 'tenant'
	protected readonly repository: TenantsRepository

	constructor(
		private readonly tenantsRepository: TenantsRepository,
		errorHandler: ErrorHandlerService,
		private readonly fairHousingService: FairHousingService
	) {
		super(errorHandler)
		this.repository = tenantsRepository
	}

	// ========================================
	// BaseCrudService Implementation
	// ========================================

	protected async findByIdAndOwner(id: string, ownerId: string): Promise<Tenant | null> {
		return await this.tenantsRepository.findByIdAndOwner(id, ownerId, true)
	}

	protected async calculateStats(ownerId: string): Promise<BaseStats> {
		return await this.tenantsRepository.getStatsByOwner(ownerId)
	}

	protected async validateCreate(data: TenantCreateDto): Promise<void> {
		// Fair Housing Act compliance validation - using data as TenantApplicationData
		await this.fairHousingService.validateTenantData(data as unknown as Record<string, unknown>, 'system')
		
		// Standard validation
		if (!data.name?.trim()) {
			throw new ValidationException('Tenant name is required', 'name')
		}
		if (!data.email?.trim()) {
			throw new ValidationException('Tenant email is required', 'email')
		}
	}

	protected prepareCreateData(data: TenantCreateDto, _ownerId: string): Prisma.TenantCreateInput {
		// For now, just use the data as-is
		// TODO: Implement field-level encryption if needed
		const encrypted = data
		
		return {
			name: encrypted.name || data.name,
			email: encrypted.email || data.email,
			phone: encrypted.phone,
			emergencyContact: encrypted.emergencyContact
		}
	}

	protected prepareUpdateData(data: TenantUpdateDto): Prisma.TenantUpdateInput {
		return {
			...data,
			updatedAt: new Date()
		}
	}

	protected createOwnerWhereClause(id: string, ownerId: string): Prisma.TenantWhereInput {
		return {
			id,
			Lease: {
				some: {
					Unit: {
						Property: {
							ownerId
						}
					}
				}
			}
		}
	}

	protected override async validateDeletion(entity: Tenant, ownerId: string): Promise<void> {
		// Check if tenant has active leases before deletion
		const hasActiveLeases = await this.tenantsRepository.hasActiveLeases(entity.id, ownerId)
		
		if (hasActiveLeases) {
			throw new ValidationException('Cannot delete tenant with active leases', 'tenantId')
		}
	}

	// ========================================
	// Override Methods for Tenant-Specific Logic
	// ========================================

	override async getByOwner(ownerId: string, query?: TenantQueryDto): Promise<Tenant[]> {
		// Add validations that base class would do
		if (!ownerId || typeof ownerId !== 'string' || ownerId.trim().length === 0) {
			throw new ValidationException('Owner ID is required', 'ownerId')
		}
		
		try {
			const options = this.parseQueryOptions(query)
			return await this.tenantsRepository.findByOwnerWithLeases(ownerId, options) as Tenant[]
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'getByOwner',
				resource: this.entityName,
				metadata: { ownerId }
			})
		}
	}

	// ========================================
	// Backward Compatibility Aliases
	// ========================================

	async getTenantsByOwner(ownerId: string, query?: TenantQueryDto): Promise<Tenant[]> {
		return this.getByOwner(ownerId, query)
	}

	async getTenantStats(ownerId: string) {
		return this.getStats(ownerId)
	}

	async getTenantById(id: string, ownerId: string): Promise<Tenant | null> {
		// Validate inputs - will throw ValidationException if invalid
		if (!id || typeof id !== 'string' || id.trim().length === 0) {
			throw new ValidationException('tenant ID is required', 'id')
		}
		if (!ownerId || typeof ownerId !== 'string' || ownerId.trim().length === 0) {
			throw new ValidationException('Owner ID is required', 'ownerId')
		}
		
		return this.findByIdAndOwner(id, ownerId)
	}

	async getTenantByIdOrThrow(id: string, ownerId: string): Promise<Tenant> {
		return this.getByIdOrThrow(id, ownerId)
	}

	async createTenant(data: TenantCreateDto, ownerId: string): Promise<Tenant> {
		return this.create(data, ownerId)
	}

	async updateTenant(id: string, data: TenantUpdateDto, ownerId: string): Promise<Tenant> {
		return this.update(id, data, ownerId)
	}

	async deleteTenant(id: string, ownerId: string): Promise<Tenant> {
		return this.delete(id, ownerId)
	}

	// ========================================
	// Tenant-Specific Methods
	// ========================================

	/**
	 * Add document to tenant
	 * Note: This is a placeholder implementation
	 */
	async addDocument(
		tenantId: string,
		documentData: {
			url: string
			filename: string
			mimeType: string
			documentType: string
			size: number
		},
		ownerId: string
	) {
		// Verify tenant ownership
		await this.getByIdOrThrow(tenantId, ownerId)
		
		// In a real implementation, you would store this in a TenantDocument table
		// For now, we'll return the document data as-is
		return {
			id: `tenant_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
			tenantId,
			...documentData,
			createdAt: new Date(),
			updatedAt: new Date()
		}
	}

	/**
	 * Remove document from tenant
	 * Note: This is a placeholder implementation
	 */
	async deleteTenantDocument(
		tenantId: string,
		_documentId: string,
		ownerId: string
	) {
		// Verify tenant ownership
		await this.getByIdOrThrow(tenantId, ownerId)
		
		// In a real implementation, you would delete from TenantDocument table
		// For now, we'll return success
		return {
			success: true,
			message: 'Document removed successfully'
		}
	}

	/**
	 * Alias for deleteTenantDocument
	 */
	async removeDocument(
		tenantId: string,
		documentId: string,
		ownerId: string
	) {
		return this.deleteTenantDocument(tenantId, documentId, ownerId)
	}

}
