/**
 * Domain Architecture Patterns and Type Safety Guidelines
 *
 * Shared architectural patterns for consistent domain modeling across
 * frontend and backend applications in the TenantFlow monorepo.
 *
 * This module provides standardized patterns for creating type-safe
 * domain models with proper multi-tenant support.
 */

/**
 * Standard Entity Interface
 * All domain entities should extend this base interface
 */
export interface BaseDomainEntity {
	id: string
	createdAt: Date | string
	updatedAt: Date | string
}

/**
 * Entity with ownership - for multi-tenant systems
 */
export interface OwnedEntity extends BaseDomainEntity {
	ownerId: string
}

/**
 * Organization-scoped entity for tenant isolation
 */
export interface OrganizationEntity extends BaseDomainEntity {
	organizationId: string
}

/**
 * Base query options for consistent pagination and filtering
 */
export interface BaseQueryOptions {
	limit?: number | string
	offset?: number | string
	page?: number | string
	search?: string
	sortBy?: string
	sortOrder?: 'asc' | 'desc'
}

/**
 * Standard statistics interface for dashboard metrics
 */
export interface BaseStats {
	total: number
	active?: number
	inactive?: number
	recent?: number
	growth?: {
		period: string
		percentage: number
		trend: 'up' | 'down' | 'stable'
	}
}

/**
 * Standard Query DTO Pattern
 * Extend this for entity-specific query parameters
 */
export interface StandardQueryDto extends BaseQueryOptions {
	status?: string
	dateFrom?: string
	dateTo?: string
	tags?: string[]
	categories?: string[]
}

/**
 * DTO Validation Rules Pattern
 */
export interface DTOValidationRules {
	required: string[]
	optional: string[]
	businessRules?: {
		field: string
		rule: (value: unknown) => boolean
		message: string
	}[]
	maxLengths?: Record<string, number>
	patterns?: Record<string, RegExp>
}

/**
 * Domain Event Pattern for CRUD Operations
 */
export interface DomainEvent<TEntity = Record<string, unknown>> {
	type: 'CREATED' | 'UPDATED' | 'DELETED' | 'RESTORED'
	entityType: string
	entityId: string
	entity: TEntity
	previousEntity?: TEntity
	timestamp: Date | string
	userId: string
	organizationId?: string
	metadata?: Record<string, unknown>
}

/**
 * Audit Log Entry Pattern for compliance and debugging
 */
export interface AuditLogEntry {
	id: string
	entityType: string
	entityId: string
	operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
	userId: string
	organizationId?: string
	timestamp: Date | string
	changes?: Record<string, { from: unknown; to: unknown }>
	metadata?: {
		userAgent?: string
		ipAddress?: string
		source?: string
		reason?: string
	}
}

/**
 * Type-safe Error Patterns
 */
export enum DomainErrorType {
	VALIDATION_ERROR = 'VALIDATION_ERROR',
	NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
	OWNERSHIP_ERROR = 'OWNERSHIP_ERROR',
	PERMISSION_ERROR = 'PERMISSION_ERROR',
	BUSINESS_RULE_ERROR = 'BUSINESS_RULE_ERROR',
	CONFLICT_ERROR = 'CONFLICT_ERROR',
	RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR'
}

export interface DomainError {
	type: DomainErrorType
	message: string
	field?: string
	code?: string
	metadata?: Record<string, unknown>
}

/**
 * Repository Contract Interface
 * Standard methods all repositories should implement
 */
export interface RepositoryContract<TEntity, TCreateInput, TUpdateInput> {
	// Core CRUD operations
	findById(id: string): Promise<TEntity | null>
	findMany(options?: StandardQueryDto): Promise<TEntity[]>
	create(data: TCreateInput): Promise<TEntity>
	update(id: string, data: TUpdateInput): Promise<TEntity>
	delete(id: string): Promise<TEntity>

	// Multi-tenant operations
	findByIdAndOwner(id: string, ownerId: string): Promise<TEntity | null>
	findManyByOwner(
		ownerId: string,
		options?: StandardQueryDto
	): Promise<TEntity[]>

	// Statistics and analytics
	count(options?: StandardQueryDto): Promise<number>
	getStats(ownerId?: string): Promise<BaseStats>
}

/**
 * Service Contract Interface
 * Standard methods all services should implement
 */
export interface ServiceContract<TEntity, TCreateDto, TUpdateDto> {
	// Public API methods
	findById(id: string, ownerId: string): Promise<TEntity | null>
	findAll(ownerId: string, query?: StandardQueryDto): Promise<TEntity[]>
	create(data: TCreateDto, ownerId: string): Promise<TEntity>
	update(id: string, data: TUpdateDto, ownerId: string): Promise<TEntity>
	delete(id: string, ownerId: string): Promise<void>

	// Statistics and dashboard data
	getStatistics(ownerId: string): Promise<BaseStats>

	// Business logic validation
	validateCreate?(data: TCreateDto, ownerId: string): Promise<void>
	validateUpdate?(
		id: string,
		data: TUpdateDto,
		ownerId: string
	): Promise<void>
	validateDelete?(id: string, ownerId: string): Promise<void>
}

/**
 * Type Guards for Runtime Validation
 */
export const TypeGuards = {
	isDomainEntity: (obj: unknown): obj is BaseDomainEntity => {
		return (
			obj !== null &&
			typeof obj === 'object' &&
			'id' in obj &&
			typeof obj.id === 'string' &&
			'createdAt' in obj &&
			'updatedAt' in obj
		)
	},

	isOwnedEntity: (obj: unknown): obj is OwnedEntity => {
		return (
			TypeGuards.isDomainEntity(obj) &&
			'ownerId' in obj &&
			typeof (obj as OwnedEntity).ownerId === 'string'
		)
	},

	isOrganizationEntity: (obj: unknown): obj is OrganizationEntity => {
		return (
			TypeGuards.isDomainEntity(obj) &&
			'organizationId' in obj &&
			typeof (obj as OrganizationEntity).organizationId === 'string'
		)
	},

	isValidQueryOptions: (obj: unknown): obj is BaseQueryOptions => {
		if (obj === null || obj === undefined) {return true}
		if (typeof obj !== 'object') {return false}

		const query = obj as Record<string, unknown>

		// Check limit
		if (
			'limit' in query &&
			typeof query.limit !== 'number' &&
			typeof query.limit !== 'string'
		) {
			return false
		}

		// Check offset
		if (
			'offset' in query &&
			typeof query.offset !== 'number' &&
			typeof query.offset !== 'string'
		) {
			return false
		}

		// Check sortOrder
		if (
			'sortOrder' in query &&
			query.sortOrder !== 'asc' &&
			query.sortOrder !== 'desc'
		) {
			return false
		}

		return true
	},

	isDomainEvent: (obj: unknown): obj is DomainEvent => {
		return (
			obj !== null &&
			typeof obj === 'object' &&
			'type' in obj &&
			'entityType' in obj &&
			'entityId' in obj &&
			'entity' in obj &&
			'timestamp' in obj &&
			'userId' in obj
		)
	}
}

/**
 * Performance Monitoring Interface
 */
export interface PerformanceMetrics {
	operationType: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
	entityType: string
	duration: number
	timestamp: Date | string
	success: boolean
	errorType?: string
	metadata?: {
		recordCount?: number
		queryComplexity?: 'simple' | 'medium' | 'complex'
		cacheHit?: boolean
		region?: string
		userAgent?: string
	}
}

/**
 * Cache Strategy Interface for consistent caching patterns
 */
export interface CacheStrategy<TEntity> {
	get(key: string): Promise<TEntity | null>
	set(key: string, value: TEntity, ttl?: number): Promise<void>
	delete(key: string): Promise<void>
	invalidatePattern(pattern: string): Promise<void>
	generateKey(
		entityType: string,
		operation: string,
		params: Record<string, unknown>
	): string
}

/**
 * Pagination Helper Types
 */
export interface PaginatedResult<T> {
	data: T[]
	pagination: {
		total: number
		page: number
		limit: number
		totalPages: number
		hasNext: boolean
		hasPrev: boolean
	}
}

/**
 * Search Configuration Interface
 */
export interface SearchConfig {
	fields: string[]
	weights?: Record<string, number>
	fuzzy?: boolean
	caseSensitive?: boolean
	highlightFields?: string[]
}

/**
 * Common Business Rules Patterns
 */
export const BusinessRules = {
	/**
	 * Validate entity ownership for multi-tenant security
	 */
	validateOwnership: <T extends OwnedEntity>(
		entity: T,
		requestedOwnerId: string
	): boolean => {
		return entity.ownerId === requestedOwnerId
	},

	/**
	 * Validate required fields are present
	 */
	validateRequired: (
		data: Record<string, unknown>,
		requiredFields: string[]
	): string[] => {
		const missing: string[] = []
		for (const field of requiredFields) {
			if (
				!(field in data) ||
				data[field] === null ||
				data[field] === undefined ||
				data[field] === ''
			) {
				missing.push(field)
			}
		}
		return missing
	},

	/**
	 * Validate field lengths
	 */
	validateLengths: (
		data: Record<string, unknown>,
		maxLengths: Record<string, number>
	): Record<string, string> => {
		const errors: Record<string, string> = {}
		for (const [field, maxLength] of Object.entries(maxLengths)) {
			const value = data[field]
			if (typeof value === 'string' && value.length > maxLength) {
				errors[field] = `Must be no more than ${maxLength} characters`
			}
		}
		return errors
	}
}

/**
 * Export standardized patterns for easy consumption
 */
export const DomainArchitecturePatterns = {
	TypeGuards,
	BusinessRules,
	DomainErrorType
} as const

/**
 * Development Guidelines
 *
 * ## Creating Domain Entities:
 * 1. Extend BaseDomainEntity for all entities
 * 2. Add OwnedEntity for multi-tenant entities
 * 3. Use OrganizationEntity for organization-scoped data
 * 4. Always include proper TypeScript types
 *
 * ## Repository Pattern:
 * 1. Implement RepositoryContract interface
 * 2. Use TypeGuards for runtime validation
 * 3. Include owner filtering for security
 * 4. Add comprehensive error handling
 *
 * ## Service Pattern:
 * 1. Implement ServiceContract interface
 * 2. Add business rule validation
 * 3. Use proper error types from DomainErrorType
 * 4. Include audit logging for sensitive operations
 *
 * ## Query Patterns:
 * 1. Extend StandardQueryDto for entity queries
 * 2. Use BaseQueryOptions for pagination
 * 3. Include search functionality where appropriate
 * 4. Add proper sorting and filtering
 *
 * ## Event Patterns:
 * 1. Emit DomainEvent for all CRUD operations
 * 2. Include previous state for audit trails
 * 3. Add metadata for debugging and analytics
 * 4. Use consistent event naming conventions
 */
