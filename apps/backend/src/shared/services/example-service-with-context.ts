import { Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import { RequestContextService } from './request-context.service'

/**
 * Example Service demonstrating Request Context usage patterns
 * 
 * This shows how to migrate from manual ID passing to request context
 * for cleaner, more maintainable service methods.
 */
@Injectable()
export class ExampleServiceWithContext {
	private readonly logger = new Logger(ExampleServiceWithContext.name)

	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly requestContext: RequestContextService
	) {}

	// =============================================================================
	// PATTERN 1: Simple context access
	// =============================================================================

	/**
	 * BEFORE: async findUserProperties(userId: string, authToken?: string)
	 * AFTER: async findUserProperties()
	 */
	async findUserProperties() {
		// Get user/org IDs from context instead of parameters
		const userId = this.requestContext.getUserId()
		const organizationId = this.requestContext.getOrganizationId()

		if (!userId) {
			throw new Error('User context required')
		}

		this.requestContext.log('Fetching user properties', { userId, organizationId })

		const supabase = this.supabaseService.getUserClient()
		
		const { data, error } = await supabase
			.from('Property')
			.select('*')
			.eq('ownerId', userId)

		if (error) {
			this.requestContext.error('Failed to fetch properties', error)
			throw error
		}

		return data
	}

	// =============================================================================
	// PATTERN 2: Multi-tenant validation with context
	// =============================================================================

	/**
	 * BEFORE: async updateProperty(id: string, data: any, userId: string, orgId: string)
	 * AFTER: async updateProperty(id: string, data: any)
	 */
	async updateProperty(id: string, data: any) {
		// Require organization context for multi-tenant operations
		const { userId, organizationId } = this.requestContext.requireOrganizationContext()

		this.requestContext.log('Updating property', { propertyId: id, userId, organizationId })

		const supabase = this.supabaseService.getUserClient()

		// Verify property belongs to user's organization
		const { data: property, error: fetchError } = await supabase
			.from('Property')
			.select('ownerId, organizationId')
			.eq('id', id)
			.single()

		if (fetchError || !property) {
			this.requestContext.error('Property not found', fetchError)
			throw new Error('Property not found')
		}

		// Multi-tenant validation
		if (property.ownerId !== userId) {
			this.requestContext.error('Access denied - wrong owner', undefined, {
				requestedBy: userId,
				actualOwner: property.ownerId
			})
			throw new Error('Access denied')
		}

		// Update the property
		const { error: updateError } = await supabase
			.from('Property')
			.update(data)
			.eq('id', id)

		if (updateError) {
			this.requestContext.error('Failed to update property', updateError)
			throw updateError
		}

		this.requestContext.log('Property updated successfully', { propertyId: id })
	}

	// =============================================================================
	// PATTERN 3: Optional context with fallback
	// =============================================================================

	/**
	 * Method that works both with and without request context
	 * (useful during migration or for background jobs)
	 */
	async findPropertiesFlexible(userIdOverride?: string) {
		// Try context first, fallback to parameter
		const userId = userIdOverride || this.requestContext.getUserId()

		if (!userId) {
			throw new Error('User ID required (from context or parameter)')
		}

		// Use context logging if available
		if (this.requestContext.hasContext()) {
			this.requestContext.log('Fetching properties with context', { userId })
		} else {
			this.logger.log('Fetching properties without context', { userId })
		}

		const supabase = this.supabaseService.getAdminClient()
		
		const { data, error } = await supabase
			.from('Property')
			.select('*')
			.eq('ownerId', userId)

		if (error) {
			if (this.requestContext.hasContext()) {
				this.requestContext.error('Failed to fetch properties', error)
			} else {
				this.logger.error('Failed to fetch properties', error)
			}
			throw error
		}

		return data
	}

	// =============================================================================
	// PATTERN 4: Background job context handling
	// =============================================================================

	/**
	 * Background job method that doesn't have request context
	 * Shows how to handle operations outside of HTTP request lifecycle
	 */
	async processPropertiesJob() {
		// Check if we're in request context
		if (this.requestContext.hasContext()) {
			this.logger.warn('Background job called within request context - this may indicate a problem')
		}

		// Use regular logger for background operations
		this.logger.log('Starting property processing job')

		const supabase = this.supabaseService.getAdminClient()
		
		const { data: properties, error } = await supabase
			.from('Property')
			.select('*')
			.limit(100)

		if (error) {
			this.logger.error('Failed to fetch properties for job', error)
			throw error
		}

		// Process properties...
		this.logger.log(`Processed ${properties?.length || 0} properties`)
	}

	// =============================================================================
	// PATTERN 5: Performance monitoring with context
	// =============================================================================

	/**
	 * Service method with built-in performance monitoring
	 */
	async expensiveOperation() {
		const startTime = Date.now()
		const correlationId = this.requestContext.getCorrelationId()

		try {
			this.requestContext.log('Starting expensive operation', { correlationId })

			// Simulate expensive work
			await new Promise(resolve => setTimeout(resolve, 100))

			const duration = Date.now() - startTime
			this.requestContext.log('Expensive operation completed', { 
				correlationId, 
				duration,
				performanceClass: duration > 1000 ? 'slow' : 'normal'
			})

		} catch (error) {
			const duration = Date.now() - startTime
			this.requestContext.error('Expensive operation failed', error as Error, {
				correlationId,
				duration,
				failurePoint: 'during_processing'
			})
			throw error
		}
	}

	// =============================================================================
	// PATTERN 6: Context-aware caching
	// =============================================================================

	/**
	 * Method that uses tenant-specific caching
	 */
	async getCachedUserData() {
		const userId = this.requestContext.getUserId()
		const organizationId = this.requestContext.getOrganizationId()

		if (!userId) {
			throw new Error('User context required for caching')
		}

		// Create tenant-specific cache key
		const cacheKey = `user_data:${organizationId}:${userId}`
		
		this.requestContext.log('Cache lookup', { cacheKey })

		// In a real implementation, you'd use Redis or similar
		// This is just a demonstration of the pattern
		
		return {
			userId,
			organizationId,
			cacheKey,
			timestamp: Date.now()
		}
	}
}

// =============================================================================
// MIGRATION EXAMPLES: Before and After
// =============================================================================

/**
 * BEFORE: Manual ID passing pattern
 */
export class OldPatternService {
	async findProperties(userId: string, organizationId: string, authToken?: string) {
		// Verbose parameter passing
		// Risk of parameter confusion
		// Repeated validation logic
		return []
	}

	async updateProperty(id: string, data: any, userId: string, organizationId: string) {
		// Even more parameters
		// Easy to mix up parameter order
		// Manual tenant validation everywhere
		return {}
	}
}

/**
 * AFTER: Request context pattern
 */
export class NewPatternService {
	constructor(private readonly requestContext: RequestContextService) {}

	async findProperties() {
		// Clean interface - no parameter threading
		// Automatic context access
		// Built-in logging and monitoring
		const { userId, organizationId } = this.requestContext.requireOrganizationContext()
		return []
	}

	async updateProperty(id: string, data: any) {
		// Simplified interface
		// Automatic multi-tenant validation
		// Enhanced logging and tracing
		const { userId, organizationId } = this.requestContext.requireOrganizationContext()
		return {}
	}
}