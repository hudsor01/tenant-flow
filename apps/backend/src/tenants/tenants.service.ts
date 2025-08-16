import { Injectable } from '@nestjs/common'
import { Prisma, Tenant } from '@repo/database'
import * as crypto from 'crypto'
import { TenantsRepository } from './tenants.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { BaseCrudService, BaseStats } from '../common/services/base-crud.service'
import { ValidationException } from '../common/exceptions/base.exception'
import { TenantCreateDto, TenantQueryDto, TenantUpdateDto } from './dto'
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

	protected override validateCreateData(data: TenantCreateDto): void {
		// Standard validation first
		if (!data.firstName?.trim()) {
			throw new ValidationException('Tenant first name is required', 'firstName', ['First name is required'])
		}
		if (!data.lastName?.trim()) {
			throw new ValidationException('Tenant last name is required', 'lastName', ['Last name is required'])
		}
		if (!data.email?.trim()) {
			throw new ValidationException('Tenant email is required', 'email')
		}
	}

	protected async validateTenantData(data: TenantCreateDto): Promise<void> {
		// Fair Housing Act compliance validation - using data as TenantApplicationData
		await this.fairHousingService.validateTenantData(data as unknown as Record<string, unknown>, 'system')
		
		// Call standard validation
		this.validateCreateData(data)
	}

	protected prepareCreateData(data: TenantCreateDto, _ownerId: string): Prisma.TenantCreateInput {
		// Combine firstName and lastName to create the name field
		const name = `${data.firstName} ${data.lastName}`.trim()
		
		return {
			name: name,
			email: data.email,
			phone: data.phone,
			emergencyContact: data.emergencyContactName ? `${data.emergencyContactName}${data.emergencyContactPhone ? ` - ${data.emergencyContactPhone}` : ''}` : undefined
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
	// Backward Compatibility Aliases (DEPRECATED - Use base interface methods)
	// ========================================

	/** @deprecated Use getByOwner() instead */
	async getTenantsByOwner(ownerId: string, query?: TenantQueryDto): Promise<Tenant[]> {
		return this.getByOwner(ownerId, query)
	}

	/** @deprecated Use getStats() instead */
	async getTenantStats(ownerId: string) {
		return this.getStats(ownerId)
	}

	/** @deprecated Use findByIdAndOwner() protected method or getByIdOrThrow() instead */
	async getTenantById(id: string, ownerId: string): Promise<Tenant | null> {
		return this.findByIdAndOwner(id, ownerId)
	}

	/** @deprecated Use getByIdOrThrow() instead */
	async getTenantByIdOrThrow(id: string, ownerId: string): Promise<Tenant> {
		return this.getByIdOrThrow(id, ownerId)
	}

	override async create(data: TenantCreateDto, ownerId: string): Promise<Tenant> {
		// Add Fair Housing validation first
		await this.validateTenantData(data)
		
		// Use parent class create method
		return super.create(data, ownerId)
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
