import { Injectable, Logger } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Database } from '@repo/shared/types/supabase-generated'
import { type AppError, SecurityEventType } from '@repo/shared'
import { ErrorHandlerService } from '../errors/error-handler.service'
import {
	NotFoundException,
	ValidationException
} from '../exceptions/base.exception'
import { SecurityAuditService } from '../security/audit.service'
import { BaseSupabaseRepository } from '../repositories/base-supabase.repository'

type Tables = Database['public']['Tables']
type TableName = keyof Tables

/**
 * Query options interface for list operations
 */
export interface BaseQueryOptions {
	search?: string
	limit?: number | string
	offset?: number | string
	page?: number | string
	status?: string
	sortBy?: string
	sortOrder?: 'asc' | 'desc'
	[key: string]: unknown
}

/**
 * Statistics interface for owner stats
 */
export type BaseStats = Record<string, number | string | boolean>

/**
 * Service interface for consistent CRUD contracts
 */
export interface ISupabaseCrudService<
	TEntity,
	TCreateDto,
	TUpdateDto,
	TQueryDto extends BaseQueryOptions
> {
	// Core CRUD operations
	getByOwner(
		ownerId: string,
		query?: TQueryDto,
		userId?: string,
		userToken?: string
	): Promise<TEntity[]>
	getByIdOrThrow(
		id: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<TEntity>
	getStats(
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<BaseStats>
	create(
		data: TCreateDto,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<TEntity>
	update(
		id: string,
		data: TUpdateDto,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<TEntity>
	delete(
		id: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<void>
}

/**
 * Base CRUD service providing common operations for multi-tenant entities using Supabase.
 * Replaces the Prisma-based BaseCrudService.
 *
 * @template TTableName - The Supabase table name
 * @template TEntity - The entity type (Row from Supabase)
 * @template TCreateDto - DTO for create operations
 * @template TUpdateDto - DTO for update operations
 * @template TQueryDto - DTO for query operations
 * @template TInsert - Supabase insert type
 * @template TUpdate - Supabase update type
 */
@Injectable()
export abstract class BaseSupabaseCrudService<
	TTableName extends TableName,
	TEntity = Tables[TTableName]['Row'],
	TCreateDto = unknown,
	TUpdateDto = unknown,
	TQueryDto extends BaseQueryOptions = BaseQueryOptions,
	TInsert = Tables[TTableName]['Insert'],
	TUpdate = Tables[TTableName]['Update']
> implements ISupabaseCrudService<TEntity, TCreateDto, TUpdateDto, TQueryDto>
{
	protected readonly logger: Logger
	protected readonly errorHandler = new ErrorHandlerService()

	constructor(
		protected readonly repository: BaseSupabaseRepository<TEntity>,
		protected readonly auditService?: SecurityAuditService,
		protected readonly entityName?: string
	) {
		this.logger = new Logger(this.constructor.name)
	}

	/**
	 * Transform DTO to Supabase insert format
	 */
	protected abstract toInsertInput(dto: TCreateDto, ownerId: string): TInsert

	/**
	 * Transform DTO to Supabase update format
	 */
	protected abstract toUpdateInput(dto: TUpdateDto): TUpdate

	/**
	 * Transform query DTO to Supabase filters
	 */
	protected toQueryFilters(query?: TQueryDto): {
		column: string
		operator: string
		value: unknown
	}[] {
		const filters: { column: string; operator: string; value: unknown }[] =
			[]

		if (query?.status) {
			filters.push({
				column: 'status',
				operator: 'eq',
				value: query.status
			})
		}

		if (query?.search) {
			// This should be overridden in specific services for search logic
			this.logger.debug('Search not implemented in base service')
		}

		return filters
	}

	/**
	 * Get entities by owner
	 */
	@Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 requests per minute
	async getByOwner(
		ownerId: string,
		query?: TQueryDto,
		userId?: string,
		userToken?: string
	): Promise<TEntity[]> {
		try {
			this.logger.debug(
				`Fetching ${this.entityName || 'entities'} for owner: ${ownerId}`
			)

			const filters = [
				{ column: 'ownerId', operator: 'eq', value: ownerId },
				...this.toQueryFilters(query)
			]

			const options = {
				filters,
				limit: query?.limit ? Number(query.limit) : 10,
				offset: query?.offset ? Number(query.offset) : 0,
				page: query?.page ? Number(query.page) : undefined,
				order: query?.sortBy
					? [
							{
								column: query.sortBy,
								ascending: query.sortOrder !== 'desc'
							}
						]
					: undefined
			}

			return await this.repository.findMany(options, userId, userToken)
		} catch (error) {
			this.logger.error(
				`Failed to fetch ${this.entityName || 'entities'}:`,
				error
			)
			throw this.errorHandler.handleError(
				error as Error | AppError,
				{ operation: 'getByOwner' }
			)
		}
	}

	/**
	 * Get entity by ID with ownership validation
	 */
	@Throttle({ default: { limit: 100, ttl: 60000 } })
	async getByIdOrThrow(
		id: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<TEntity> {
		try {
			const entity = await this.repository.findById(id, userId, userToken)

			if (!entity) {
				throw new NotFoundException(
					`${this.entityName || 'Entity'} not found`
				)
			}

			// Validate ownership
			if (
				(entity as unknown as { ownerId: string }).ownerId !== ownerId
			) {
				await this.auditService?.logSecurityEvent({
					eventType: SecurityEventType.FORBIDDEN_ACCESS,
					userId: ownerId,
					resource: this.entityName || 'unknown',
					action: 'access',
					details: JSON.stringify({
						resourceId: id,
						attemptedOwnerId: ownerId
					})
				})

				throw new NotFoundException(
					`${this.entityName || 'Entity'} not found`
				)
			}

			return entity
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error
			}
			this.logger.error(
				`Failed to fetch ${this.entityName || 'entity'} by ID:`,
				error
			)
			throw this.errorHandler.handleError(
				error as Error | AppError,
				{ operation: 'getByIdOrThrow' }
			)
		}
	}

	/**
	 * Get statistics for owner
	 */
	@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
	async getStats(
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<BaseStats> {
		try {
			const count = await this.repository.count(
				[{ column: 'ownerId', operator: 'eq', value: ownerId }],
				userId,
				userToken
			)

			return {
				total: count,
				active: 0, // Override in specific services
				inactive: 0 // Override in specific services
			}
		} catch (error) {
			this.logger.error(`Failed to get stats:`, error)
			throw this.errorHandler.handleError(
				error as Error | AppError,
				{ operation: 'getStats' }
			)
		}
	}

	/**
	 * Create entity with ownership
	 */
	@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 writes per minute
	async create(
		data: TCreateDto,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<TEntity> {
		try {
			// Validate input
			await this.validateCreateInput(data)

			// Transform to Supabase format
			const insertData = this.toInsertInput(data, ownerId)

			// Create entity
			const created = await this.repository.create(
				insertData as Record<string, unknown>,
				userId,
				userToken
			)

			// Log audit event
			await this.auditService?.logSecurityEvent({
				eventType: SecurityEventType.ADMIN_ACTION,
				userId: ownerId,
				resource: this.entityName || 'unknown',
				action: 'create',
				details: JSON.stringify({
					resourceId: (created as { id: string }).id
				})
			})

			this.logger.log(
				`Created ${this.entityName || 'entity'}: ${(created as { id: string }).id}`
			)
			return created
		} catch (error) {
			this.logger.error(
				`Failed to create ${this.entityName || 'entity'}:`,
				error
			)
			throw this.errorHandler.handleError(
				error as Error | AppError,
				{ operation: 'create' }
			)
		}
	}

	/**
	 * Update entity with ownership validation
	 */
	@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 writes per minute
	async update(
		id: string,
		data: TUpdateDto,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<TEntity> {
		try {
			// Verify ownership first
			await this.getByIdOrThrow(id, ownerId, userId, userToken)

			// Validate input
			await this.validateUpdateInput(data)

			// Transform to Supabase format
			const updateData = this.toUpdateInput(data)

			// Update entity
			const updated = await this.repository.update(
				id,
				updateData as Record<string, unknown>,
				userId,
				userToken
			)

			// Log audit event
			await this.auditService?.logSecurityEvent({
				eventType: SecurityEventType.ADMIN_ACTION,
				userId: ownerId,
				resource: this.entityName || 'unknown',
				action: 'update',
				details: JSON.stringify({ resourceId: id })
			})

			this.logger.log(`Updated ${this.entityName || 'entity'}: ${id}`)
			return updated
		} catch (error) {
			this.logger.error(
				`Failed to update ${this.entityName || 'entity'}:`,
				error
			)
			throw this.errorHandler.handleError(
				error as Error | AppError,
				{ operation: 'update' }
			)
		}
	}

	/**
	 * Delete entity with ownership validation
	 */
	@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 writes per minute
	async delete(
		id: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<void> {
		try {
			// Verify ownership first
			await this.getByIdOrThrow(id, ownerId, userId, userToken)

			// Check for dependencies
			await this.checkDeletionConstraints(id, ownerId, userId, userToken)

			// Delete entity
			await this.repository.delete(id, userId, userToken)

			// Log audit event
			await this.auditService?.logSecurityEvent({
				eventType: SecurityEventType.ADMIN_ACTION,
				userId: ownerId,
				resource: this.entityName || 'unknown',
				action: 'delete',
				details: JSON.stringify({ resourceId: id })
			})

			this.logger.log(`Deleted ${this.entityName || 'entity'}: ${id}`)
		} catch (error) {
			this.logger.error(
				`Failed to delete ${this.entityName || 'entity'}:`,
				error
			)
			throw this.errorHandler.handleError(
				error as Error | AppError,
				{ operation: 'delete' }
			)
		}
	}

	/**
	 * Validate create input (override in specific services)
	 */
	protected async validateCreateInput(data: TCreateDto): Promise<void> {
		if (!data) {
			throw new ValidationException('Create data is required')
		}
	}

	/**
	 * Validate update input (override in specific services)
	 */
	protected async validateUpdateInput(data: TUpdateDto): Promise<void> {
		if (!data) {
			throw new ValidationException('Update data is required')
		}
	}

	/**
	 * Check deletion constraints (override in specific services)
	 */
	protected async checkDeletionConstraints(
		_id: string,
		_ownerId: string,
		_userId?: string,
		_userToken?: string
	): Promise<void> {
		// Override in specific services to check for dependencies
		return
	}
}
