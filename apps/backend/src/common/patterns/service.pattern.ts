/**
 * Service Pattern Example
 * 
 * This file demonstrates the standard service pattern to be used
 * throughout the TenantFlow backend. All services should follow
 * this structure for consistency.
 */

import { Injectable, Logger } from '@nestjs/common'
import { ErrorHandlerService, ErrorCode } from '../errors/error-handler.service'

interface EntityRepository {
	findById(id: string): Promise<Entity | null>
	findMany(filters: EntityFilters): Promise<Entity[]>
	count(filters: EntityFilters): Promise<number>
	create(data: CreateEntityData): Promise<Entity>
	update(id: string, data: UpdateEntityData): Promise<Entity>
	delete(id: string): Promise<void>
}

interface EntityBusinessService {
	validateCreateData(data: CreateEntityDto): void
	validateUpdateData(data: UpdateEntityDto): void
	applyBusinessRules(entity: Entity): Entity
	checkPermissions(userId: string, entity: Entity, operation: string): void
}

interface CreateEntityDto {
	name: string
	description?: string
	metadata?: Record<string, string | number | boolean | null>
}

interface UpdateEntityDto {
	name?: string
	description?: string
	metadata?: Record<string, string | number | boolean | null>
}

interface EntityFilters {
	search?: string
	status?: string
	userId?: string
	page?: number
	limit?: number
}

interface Entity {
	id: string
	name: string
	description?: string
	status: string
	userId: string
	createdAt: Date
	updatedAt: Date
}

interface CreateEntityData extends Omit<Entity, 'id' | 'createdAt' | 'updatedAt'> {
	status: string
	userId: string
}

interface UpdateEntityData extends Partial<Omit<Entity, 'id' | 'createdAt' | 'updatedAt'>> {
	name?: string
	description?: string
}

/**
 * Standard Service Pattern Implementation
 * 
 * Key principles:
 * 1. Constructor injection for all dependencies
 * 2. Private logger instance
 * 3. Consistent error handling with ErrorHandlerService
 * 4. Clear separation of concerns (repository, business logic, service)
 * 5. Comprehensive logging for debugging
 * 6. Type-safe throughout
 */
@Injectable()
export class EntityService {
	private readonly logger = new Logger(EntityService.name)

	constructor(
		private readonly repository: EntityRepository,
		private readonly businessService: EntityBusinessService,
		private readonly errorHandler: ErrorHandlerService
	) {}

	/**
	 * Find entity by ID with proper error handling
	 */
	async findById(id: string, userId: string): Promise<Entity> {
		try {

			if (!id || typeof id !== 'string') {
				throw this.errorHandler.createValidationError(
					'Invalid entity ID provided',
					{ id: 'Entity ID must be a valid string' }
				)
			}

			const entity = await this.repository.findById(id)
			
			if (!entity) {
				throw this.errorHandler.createNotFoundError('Entity', id)
			}

			this.businessService.checkPermissions(userId, entity, 'read')

			return this.businessService.applyBusinessRules(entity)
		} catch (error) {
			this.logger.error(`Failed to find entity: ${id}`, error)
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'findById',
				resource: 'entity',
				metadata: { entityId: id, userId }
			})
		}
	}

	/**
	 * Find many entities with pagination and filtering
	 */
	async findMany(filters: EntityFilters, userId: string): Promise<{
		items: Entity[]
		total: number
		page: number
		pageSize: number
	}> {
		try {

			const page = filters.page || 1
			const limit = Math.min(filters.limit || 10, 100)
			
			const userFilters = { ...filters, userId }

			const [items, total] = await Promise.all([
				this.repository.findMany(userFilters),
				this.repository.count(userFilters)
			])

			const processedItems = items.map(item => 
				this.businessService.applyBusinessRules(item)
			)

			return {
				items: processedItems,
				total,
				page,
				pageSize: limit
			}
		} catch (error) {
			this.logger.error('Failed to find entities', error)
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'findMany',
				resource: 'entity',
				metadata: { 
					filtersCount: Object.keys(filters || {}).length,
					userId: userId
				}
			})
		}
	}

	/**
	 * Create new entity with validation
	 */
	async create(dto: CreateEntityDto, userId: string): Promise<Entity> {
		try {
			this.businessService.validateCreateData(dto)

			const data: CreateEntityData = {
				...dto,
				userId,
				status: 'active'
			}

			const entity = await this.repository.create(data)

			this.logger.log(`Entity created: ${entity.id} by user: ${userId}`)

			return this.businessService.applyBusinessRules(entity)
		} catch (error) {
			this.logger.error('Failed to create entity', error)
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'create',
				resource: 'entity',
				metadata: { 
					dtoType: dto.constructor.name,
					userId: userId
				}
			})
		}
	}

	/**
	 * Update existing entity with validation
	 */
	async update(id: string, dto: UpdateEntityDto, userId: string): Promise<Entity> {
		try {
			const existing = await this.findById(id, userId)

			this.businessService.validateUpdateData(dto)

			this.businessService.checkPermissions(userId, existing, 'update')

			const updated = await this.repository.update(id, dto)

			this.logger.log(`Entity updated: ${id} by user: ${userId}`)

			return this.businessService.applyBusinessRules(updated)
		} catch (error) {
			this.logger.error(`Failed to update entity: ${id}`, error)
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'update',
				resource: 'entity',
				metadata: { 
					entityId: id, 
					dtoType: dto.constructor.name, 
					userId: userId 
				}
			})
		}
	}

	/**
	 * Delete entity with cascade handling
	 */
	async delete(id: string, userId: string): Promise<void> {
		try {
			const existing = await this.findById(id, userId)

			this.businessService.checkPermissions(userId, existing, 'delete')

			const hasDependencies = await this.checkDependencies(id)
			if (hasDependencies) {
				throw this.errorHandler.createBusinessError(
					ErrorCode.CONFLICT,
					'Cannot delete entity with active dependencies',
					{ operation: 'delete', resource: 'entity', metadata: { entityId: id } }
				)
			}

			await this.repository.delete(id)

			this.logger.log(`Entity deleted: ${id} by user: ${userId}`)
		} catch (error) {
			this.logger.error(`Failed to delete entity: ${id}`, error)
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'delete',
				resource: 'entity',
				metadata: { entityId: id, userId }
			})
		}
	}

	/**
	 * Get statistics for dashboard
	 */
	async getStats(userId: string): Promise<{
		total: number
		active: number
		inactive: number
	}> {
		try {
			const [total, active, inactive] = await Promise.all([
				this.repository.count({ userId }),
				this.repository.count({ userId, status: 'active' }),
				this.repository.count({ userId, status: 'inactive' })
			])

			return { total, active, inactive }
		} catch (error) {
			this.logger.error('Failed to get entity stats', error)
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'getStats',
				resource: 'entity',
				metadata: { userId }
			})
		}
	}

	/**
	 * Private helper to check dependencies
	 */
	private async checkDependencies(_id: string): Promise<boolean> {
		return false
	}
}

/**
 * Export pattern interfaces for reuse
 */
export type { 
	EntityRepository,
	EntityBusinessService,
	CreateEntityDto,
	UpdateEntityDto,
	EntityFilters 
}