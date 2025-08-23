import { Injectable, Logger, Scope } from '@nestjs/common'
import { requestContext } from '@fastify/request-context'

/**
 * Enhanced Request Context for Multi-tenant Operations
 * 
 * Extends the basic @fastify/request-context with tenant-aware context
 * for simplified service access patterns without manual ID passing.
 */
export interface TenantRequestContext {
	// Core request tracking
	correlationId: string
	traceId: string
	startTime: number
	
	// Tenant/User context
	userId?: string
	organizationId?: string
	tenantId?: string // Alias for organizationId for backward compatibility
	
	// Request metadata
	method: string
	path: string
	ip: string
	userAgent?: string
	
	// Performance tracking
	timing: {
		startTime: number
		endTime?: number
		duration?: number
		hrStart?: bigint // High-resolution start time
		startMemory?: number // Memory usage at request start
	}
}

/**
 * Minimal Request Context Service
 * 
 * Uses @fastify/request-context under the hood to provide:
 * - Request/trace ID generation and storage
 * - Tenant/organization scoping
 * - Per-request timing for performance monitoring
 * - Simple accessor methods for services
 * 
 * USAGE PATTERN:
 * 1. Guards populate context during authentication
 * 2. Services access context via this service
 * 3. No manual threading of user/org IDs needed
 */
@Injectable({ scope: Scope.REQUEST })
export class RequestContextService {
	private readonly logger = new Logger(RequestContextService.name)

	/**
	 * Get the current request context
	 * Returns undefined if no context is available (e.g., during app startup)
	 */
	getCurrentContext(): TenantRequestContext | undefined {
		try {
			// Access the store from @fastify/request-context
			const store = requestContext.get('store')
			
			if (!store) {
				this.logger.warn('No request context store available')
				return undefined
			}

			return store as TenantRequestContext
		} catch (error) {
			this.logger.warn('Failed to get request context', { error })
			return undefined
		}
	}

	/**
	 * Get correlation ID for request tracking
	 */
	getCorrelationId(): string | undefined {
		return this.getCurrentContext()?.correlationId
	}

	/**
	 * Get trace ID for distributed tracing
	 */
	getTraceId(): string | undefined {
		return this.getCurrentContext()?.traceId
	}

	/**
	 * Get current user ID from context
	 */
	getUserId(): string | undefined {
		return this.getCurrentContext()?.userId
	}

	/**
	 * Get current organization/tenant ID from context
	 */
	getOrganizationId(): string | undefined {
		const context = this.getCurrentContext()
		return context?.organizationId || context?.tenantId
	}

	/**
	 * Get tenant ID (alias for organization ID)
	 */
	getTenantId(): string | undefined {
		return this.getOrganizationId()
	}

	/**
	 * Get request metadata (method, path, IP)
	 */
	getRequestMetadata(): { method: string; path: string; ip: string } | undefined {
		const context = this.getCurrentContext()
		
		if (!context) {
			return undefined
		}

		return {
			method: context.method,
			path: context.path,
			ip: context.ip
		}
	}

	/**
	 * Get current request timing information
	 */
	getTiming(): { startTime: number; duration?: number } | undefined {
		const context = this.getCurrentContext()
		
		if (!context) {
			return undefined
		}

		const duration = context.timing.endTime 
			? context.timing.endTime - context.timing.startTime
			: Date.now() - context.timing.startTime

		return {
			startTime: context.timing.startTime,
			duration
		}
	}

	/**
	 * Set user context (called by auth guards)
	 */
	setUserContext(userId: string, organizationId?: string): void {
		try {
			const store = requestContext.get('store')
			
			if (store) {
				;(store as TenantRequestContext).userId = userId
				;(store as TenantRequestContext).organizationId = organizationId
				;(store as TenantRequestContext).tenantId = organizationId // Backward compatibility
			}
		} catch (error) {
			this.logger.error('Failed to set user context', { error, userId, organizationId })
		}
	}

	/**
	 * Update timing when request completes (called by hooks)
	 */
	setEndTime(): void {
		try {
			const store = requestContext.get('store') as TenantRequestContext
			
			if (store?.timing) {
				store.timing.endTime = Date.now()
				store.timing.duration = store.timing.endTime - store.timing.startTime
			}
		} catch (error) {
			this.logger.error('Failed to set end time', { error })
		}
	}

	/**
	 * Enhanced logging with context
	 */
	log(message: string, data?: Record<string, unknown>): void {
		const context = this.getCurrentContext()
		
		this.logger.log(message, {
			...data,
			correlationId: context?.correlationId,
			userId: context?.userId,
			organizationId: context?.organizationId,
			duration: this.getTiming()?.duration
		})
	}

	/**
	 * Enhanced error logging with context
	 */
	error(message: string, error?: Error | string, data?: Record<string, unknown>): void {
		const context = this.getCurrentContext()
		
		this.logger.error(message, {
			error: error instanceof Error ? error.message : error,
			stack: error instanceof Error ? error.stack : undefined,
			...data,
			correlationId: context?.correlationId,
			userId: context?.userId,
			organizationId: context?.organizationId,
			duration: this.getTiming()?.duration
		})
	}

	/**
	 * Check if we're in a request context (useful for conditional logic)
	 */
	hasContext(): boolean {
		return this.getCurrentContext() !== undefined
	}

	/**
	 * Get context for multi-tenant validation
	 * Throws error if organization is required but missing
	 */
	requireOrganizationContext(): { userId: string; organizationId: string } {
		const context = this.getCurrentContext()
		
		if (!context?.userId) {
			throw new Error('User context required but not available')
		}

		if (!context?.organizationId) {
			throw new Error('Organization context required but not available')
		}

		return {
			userId: context.userId,
			organizationId: context.organizationId
		}
	}
}