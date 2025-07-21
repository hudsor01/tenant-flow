/**
 * Service Pattern Example
 * 
 * This file demonstrates the standard service pattern to be used
 * throughout the TenantFlow backend. All services should follow
 * this structure for consistency.
 */

import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { ErrorHandlerService, ErrorCode } from '../errors/error-handler.service'

// Example repository interface
interface EntityRepository {
	findById(id: string): Promise<Entity | null>
	findMany(filters: EntityFilters): Promise<Entity[]>
	count(filters: EntityFilters): Promise<number>
	create(data: CreateEntityData): Promise<Entity>
	update(id: string, data: UpdateEntityData): Promise<Entity>
	delete(id: string): Promise<void>
}

// Example business service interface
interface EntityBusinessService {
	validateCreate(data: CreateEntityDto): Promise<void>
	validateUpdate(id: string, data: UpdateEntityDto): Promise<void>
	applyBusinessRules(entity: Entity): Entity
	checkPermissions(userId: string, entity: Entity, operation: string): void
}

// Example DTOs
interface CreateEntityDto {
	name: string
	description?: string
	metadata?: Record<string, unknown>
}

interface UpdateEntityDto {
	name?: string
	description?: string
	metadata?: Record<string, unknown>
}

interface EntityFilters {
	search?: string
	status?: string
	userId?: string
	page?: number
	limit?: number
}

// Example entity type
interface Entity {
	id: string
	name: string
	description?: string
	status: string
	userId: string
	createdAt: Date
	updatedAt: Date
}

interface CreateEntityData extends Omit<Entity, 'id' | 'createdAt' | 'updatedAt'> {}
interface UpdateEntityData extends Partial<Omit<Entity, 'id' | 'createdAt' | 'updatedAt'>> {}

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
			// Validate input
			if (!id || typeof id !== 'string') {
				throw this.errorHandler.createValidationError(
					'Invalid entity ID provided',
					{ id: 'Entity ID must be a valid string' }
				)
			}

			// Fetch from repository
			const entity = await this.repository.findById(id)
			
			if (!entity) {
				throw this.errorHandler.createNotFoundError('Entity', id)
			}

			// Check permissions
			this.businessService.checkPermissions(userId, entity, 'read')

			// Apply business rules
			return this.businessService.applyBusinessRules(entity)
		} catch (error) {
			// Log and re-throw with context
			this.logger.error(`Failed to find entity: ${id}`, error)
			throw this.errorHandler.handleError(error, {
				operation: 'findById',
				resource: 'entity',
				userId,
				metadata: { entityId: id }
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
			// Set defaults
			const page = filters.page || 1
			const limit = Math.min(filters.limit || 10, 100) // Max 100 items
			
			// Add user filter for multi-tenancy
			const userFilters = { ...filters, userId }

			// Fetch from repository
			const [items, total] = await Promise.all([
				this.repository.findMany(userFilters),
				this.repository.count(userFilters)
			])

			// Apply business rules to each item
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
			throw this.errorHandler.handleError(error, {
				operation: 'findMany',
				resource: 'entity',
				userId,
				metadata: { filters }
			})
		}
	}

	/**
	 * Create new entity with validation
	 */
	async create(dto: CreateEntityDto, userId: string): Promise<Entity> {
		try {
			// Validate input
			await this.businessService.validateCreate(dto)

			// Prepare data
			const data: CreateEntityData = {
				...dto,
				userId,
				status: 'active'
			}

			// Create in repository
			const entity = await this.repository.create(data)

			// Log success
			this.logger.log(`Entity created: ${entity.id} by user: ${userId}`)

			// Apply business rules and return
			return this.businessService.applyBusinessRules(entity)
		} catch (error) {
			this.logger.error('Failed to create entity', error)
			throw this.errorHandler.handleError(error, {
				operation: 'create',
				resource: 'entity',
				userId,
				metadata: { dto }
			})
		}
	}

	/**
	 * Update existing entity with validation
	 */
	async update(id: string, dto: UpdateEntityDto, userId: string): Promise<Entity> {
		try {
			// Find existing entity
			const existing = await this.findById(id, userId)

			// Validate update
			await this.businessService.validateUpdate(id, dto)

			// Check permissions
			this.businessService.checkPermissions(userId, existing, 'update')

			// Update in repository
			const updated = await this.repository.update(id, dto)

			// Log success
			this.logger.log(`Entity updated: ${id} by user: ${userId}`)

			// Apply business rules and return
			return this.businessService.applyBusinessRules(updated)
		} catch (error) {
			this.logger.error(`Failed to update entity: ${id}`, error)
			throw this.errorHandler.handleError(error, {
				operation: 'update',
				resource: 'entity',
				userId,
				metadata: { entityId: id, dto }
			})
		}
	}

	/**
	 * Delete entity with cascade handling
	 */
	async delete(id: string, userId: string): Promise<void> {
		try {
			// Find existing entity
			const existing = await this.findById(id, userId)

			// Check permissions
			this.businessService.checkPermissions(userId, existing, 'delete')

			// Check for dependencies
			const hasDependencies = await this.checkDependencies(id)
			if (hasDependencies) {
				throw this.errorHandler.createBusinessError(
					ErrorCode.CONFLICT,
					'Cannot delete entity with active dependencies',
					{ operation: 'delete', resource: 'entity', metadata: { entityId: id } }
				)
			}

			// Delete from repository
			await this.repository.delete(id)

			// Log success
			this.logger.log(`Entity deleted: ${id} by user: ${userId}`)
		} catch (error) {
			this.logger.error(`Failed to delete entity: ${id}`, error)
			throw this.errorHandler.handleError(error, {
				operation: 'delete',
				resource: 'entity',
				userId,
				metadata: { entityId: id }
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
			throw this.errorHandler.handleError(error, {
				operation: 'getStats',
				resource: 'entity',
				userId
			})
		}
	}

	/**
	 * Private helper to check dependencies
	 */
	private async checkDependencies(id: string): Promise<boolean> {
		// Implementation would check related entities
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