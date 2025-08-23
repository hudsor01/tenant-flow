import { Injectable, Logger } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { SubscriptionsManagerService } from '../../billing/subscriptions-manager.service'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { ValidatedUser } from '../../auth/auth.service'

interface AuthenticatedRequest extends FastifyRequest {
	user?: ValidatedUser
}

interface RouteHookConfig {
	requireAuth?: boolean
	requireAdmin?: boolean
	allowedRoles?: string[]
	rateLimiting?: {
		maxRequests: number
		windowMs: number
	}
	customValidation?: (req: AuthenticatedRequest) => Promise<boolean> | boolean
}

/**
 * Route-Scoped Hooks Service
 * 
 * Provides targeted hooks that apply only to specific routes or route patterns,
 * avoiding global catch-all patterns where route-specific logic is clearer.
 * 
 * This complements the UnifiedFastifyHooksService by providing:
 * - Route-specific authentication requirements
 * - Custom business rule validation per route
 * - Targeted rate limiting for sensitive endpoints
 * - Conditional hook execution based on route characteristics
 */
@Injectable()
export class RouteScopedHooksService {
[ x: string ]: any
private readonly logger = new Logger(RouteScopedHooksService.name)

constructor(private readonly moduleRef: ModuleRef) {}
	
	// Route-specific configurations
	private readonly routeConfigs = new Map<string, RouteHookConfig>()

	/**
	 * Register route-scoped hooks for specific endpoints
	 */
	registerRouteScopedHooks(fastify: FastifyInstance): void {
		// Configure route-specific requirements
		this.configureRouteRequirements()

		// Add route-scoped preHandler hooks
		this.registerAuthenticationHooks(fastify)
		this.registerBusinessRuleHooks(fastify)
		this.registerRateLimitingHooks(fastify)

		this.logger.log('Route-scoped hooks registered successfully')
	}

	/**
	 * Configure specific requirements for different route patterns
	 */
	private configureRouteRequirements(): void {
		// Admin-only endpoints
		this.routeConfigs.set('/api/v1/admin/*', {
			requireAuth: true,
			requireAdmin: true,
			rateLimiting: { maxRequests: 50, windowMs: 60000 }
		})

		// Billing and subscription endpoints - sensitive
		this.routeConfigs.set('/api/v1/stripe/*', {
			requireAuth: true,
			rateLimiting: { maxRequests: 20, windowMs: 60000 }
		})

		this.routeConfigs.set('/api/v1/billing/*', {
			requireAuth: true,
			rateLimiting: { maxRequests: 30, windowMs: 60000 }
		})

		// User profile endpoints
		this.routeConfigs.set('/api/v1/users/profile', {
			requireAuth: true,
			rateLimiting: { maxRequests: 100, windowMs: 60000 }
		})

		// Properties creation - usage-limited
		this.routeConfigs.set('/api/v1/properties', {
			requireAuth: true,
			customValidation: this.validatePropertyCreation.bind(this)
		})

		// Document generation - resource-intensive
		this.routeConfigs.set('/api/v1/documents/generate', {
			requireAuth: true,
			rateLimiting: { maxRequests: 10, windowMs: 60000 }
		})

		// PDF generation - resource-intensive
		this.routeConfigs.set('/api/v1/pdf/*', {
			requireAuth: true,
			rateLimiting: { maxRequests: 15, windowMs: 60000 }
		})
	}

	/**
	 * Register authentication hooks for specific route patterns
	 */
	private registerAuthenticationHooks(fastify: FastifyInstance): void {
		fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
			const req = request as AuthenticatedRequest
			const config = this.getRouteConfig(req.url)

			if (!config) {return} // No specific config for this route

			// Admin-only validation
			if (config.requireAdmin && !this.isAdminUser(req.user)) {
				reply.code(403).send({
					success: false,
					error: {
						code: 'ADMIN_REQUIRED',
						message: 'Administrator privileges required',
						statusCode: 403
					},
					timestamp: new Date().toISOString()
				})
				return
			}

			// Role-based validation
			if (config.allowedRoles && req.user?.role && !config.allowedRoles.includes(req.user.role)) {
				reply.code(403).send({
					success: false,
					error: {
						code: 'INSUFFICIENT_ROLE',
						message: `Access denied. Required roles: ${config.allowedRoles.join(', ')}`,
						statusCode: 403
					},
					timestamp: new Date().toISOString()
				})
				return
			}
		})
	}

	/**
	 * Register business rule validation hooks
	 */
	private registerBusinessRuleHooks(fastify: FastifyInstance): void {
		fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
			const req = request as AuthenticatedRequest
			const config = this.getRouteConfig(req.url)

			if (!config?.customValidation) {return}

			try {
				const isValid = await config.customValidation(req)
				
				if (!isValid) {
					reply.code(403).send({
						success: false,
						error: {
							code: 'BUSINESS_RULE_VIOLATION',
							message: 'Request violates business rules',
							statusCode: 403
						},
						timestamp: new Date().toISOString()
					})
					return
				}
			} catch (error) {
				this.logger.error('Custom validation error', { 
					error: String(error), 
					url: req.url,
					userId: req.user?.id 
				})
				
				reply.code(500).send({
					success: false,
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Internal validation error',
						statusCode: 500
					},
					timestamp: new Date().toISOString()
				})
			}
		})
	}

	/**
	 * Register targeted rate limiting hooks
	 */
	private registerRateLimitingHooks(fastify: FastifyInstance): void {
		const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

		fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
			const req = request as AuthenticatedRequest
			const config = this.getRouteConfig(req.url)

			if (!config?.rateLimiting) {return}

			const key = this.getRateLimitKey(req, config)
			const now = Date.now()
			const limit = rateLimitStore.get(key)

			// Reset window if expired
			if (!limit || now > limit.resetTime) {
				rateLimitStore.set(key, {
					count: 1,
					resetTime: now + config.rateLimiting.windowMs
				})
				return
			}

			// Check if limit exceeded
			if (limit.count >= config.rateLimiting.maxRequests) {
				const retryAfter = Math.ceil((limit.resetTime - now) / 1000)
				
				reply
					.code(429)
					.header('Retry-After', retryAfter.toString())
					.send({
						success: false,
						error: {
							code: 'RATE_LIMIT_EXCEEDED',
							message: `Rate limit exceeded for this endpoint. Try again in ${retryAfter} seconds.`,
							statusCode: 429,
							retryAfter
						},
						timestamp: new Date().toISOString()
					})
				return
			}

			// Increment counter
			limit.count++
		})
	}

	// ========== Route Configuration Helpers ==========

	private getRouteConfig(url: string): RouteHookConfig | undefined {
		// Direct match first
		if (this.routeConfigs.has(url)) {
			return this.routeConfigs.get(url)
		}

		// Pattern matching for wildcards
		for (const [pattern, config] of this.routeConfigs.entries()) {
			if (pattern.includes('*')) {
				const regex = new RegExp(pattern.replace('*', '.*'))
				if (regex.test(url)) {
					return config
				}
			}
		}

		return undefined
	}

	private getRateLimitKey(req: AuthenticatedRequest, _config: RouteHookConfig): string {
		// Create composite key for rate limiting
		const userKey = req.user?.id || req.ip || 'anonymous'
		const routeKey = req.url.split('?')[0] // Remove query params
		return `${userKey}:${routeKey}`
	}

	private isAdminUser(user?: ValidatedUser): boolean {
		return user?.role === 'ADMIN'
	}

	// ========== Custom Business Rule Validators ==========

	/**
	 * Validate property creation based on subscription limits
	 */
	private async validatePropertyCreation(req: AuthenticatedRequest): Promise<boolean> {
		if (!req.user?.id) {return false}

		try {
			// This would integrate with subscription service
			// For now, we'll implement a simple check
			
			// Skip validation for admin users
			if (this.isAdminUser(req.user)) {
				return true
			}

 // Check subscription limits via SubscriptionsManagerService
 const subscriptionService = this.moduleRef.get(SubscriptionsManagerService, { strict: false })
 const metrics = await subscriptionService.calculateUsageMetrics(req.user.id)
 return (metrics.usage ?? 0) < (metrics.limit ?? Infinity)

		} catch (error) {
			this.logger.error('Property creation validation failed', { 
				error: String(error),
				userId: req.user.id 
			})
			return false
		}
	}

	/**
	 * Add a new route configuration dynamically
	 */
	public addRouteConfig(routePattern: string, config: RouteHookConfig): void {
		this.routeConfigs.set(routePattern, config)
		this.logger.debug(`Added route configuration for ${routePattern}`)
	}

	/**
	 * Remove a route configuration
	 */
	public removeRouteConfig(routePattern: string): void {
		this.routeConfigs.delete(routePattern)
		this.logger.debug(`Removed route configuration for ${routePattern}`)
	}

	/**
	 * Get all configured routes
	 */
	public getConfiguredRoutes(): string[] {
		return Array.from(this.routeConfigs.keys())
	}
}
