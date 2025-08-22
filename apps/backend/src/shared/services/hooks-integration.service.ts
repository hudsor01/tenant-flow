import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import type { FastifyInstance } from 'fastify'
import { UnifiedFastifyHooksService } from './unified-fastify-hooks.service'
import { RouteScopedHooksService } from './route-scoped-hooks.service'
import { ErrorResponseHooksService } from './error-response-hooks.service'
import { RequestContextHooksService } from './request-context-hooks.service'

/**
 * Hooks Integration Service
 * 
 * Centralized service for coordinating all Fastify hooks:
 * - Manages hook registration order
 * - Prevents hook conflicts
 * - Provides unified configuration
 * - Handles graceful degradation
 * - Monitors hook performance
 */
@Injectable()
export class HooksIntegrationService implements OnModuleInit {
	private readonly logger = new Logger(HooksIntegrationService.name)
	private isInitialized = false
	private fastifyInstance?: FastifyInstance

	constructor(
		private readonly moduleRef: ModuleRef,
		private readonly unifiedHooks: UnifiedFastifyHooksService,
		private readonly routeScopedHooks: RouteScopedHooksService,
		private readonly errorResponseHooks: ErrorResponseHooksService,
		private readonly requestContextHooks: RequestContextHooksService
	) {}

	async onModuleInit() {
		this.logger.log('Hooks Integration Service initialized')
	}

	/**
	 * Register all hooks in the correct order
	 * This should be called from main.ts after Fastify instance creation
	 */
	registerAllHooks(fastify: FastifyInstance): void {
		if (this.isInitialized) {
			this.logger.warn('Hooks already initialized, skipping re-registration')
			return
		}

		this.fastifyInstance = fastify
		
		try {
			// 1. Register base request context hooks (lowest level)
			this.logger.debug('Registering request context hooks...')
			this.requestContextHooks.registerContextHooks(fastify)

			// 2. Register unified hooks (auth, validation, response formatting)
			this.logger.debug('Registering unified hooks...')
			this.unifiedHooks.registerHooks(fastify)

			// 3. Register route-scoped hooks (specific business rules)
			this.logger.debug('Registering route-scoped hooks...')
			this.routeScopedHooks.registerRouteScopedHooks(fastify)

			// 4. Register error response hooks (error handling and formatting)
			this.logger.debug('Registering error response hooks...')
			this.errorResponseHooks.registerErrorHooks(fastify)

			this.isInitialized = true
			this.logger.log('✅ All Fastify hooks registered successfully')

			// Register cleanup handlers
			this.registerCleanupHandlers(fastify)

		} catch (error) {
			this.logger.error('❌ Failed to register Fastify hooks:', error)
			throw error
		}
	}

	/**
	 * Register graceful shutdown handlers
	 */
	private registerCleanupHandlers(fastify: FastifyInstance): void {
		fastify.addHook('onClose', async () => {
			this.logger.log('Cleaning up hooks during server shutdown...')
			
			try {
				// Clear any cached data
				this.errorResponseHooks.clearErrorStatistics()
				this.logger.log('Hook cleanup completed')
			} catch (error) {
				this.logger.error('Error during hook cleanup:', error)
			}
		})
	}

	/**
	 * Get hook performance metrics
	 */
	getHookMetrics(): Record<string, unknown> {
		if (!this.isInitialized) {
			return { initialized: false }
		}

		return {
			initialized: true,
			errorStatistics: this.errorResponseHooks.getErrorStatistics(),
			securityEvents: this.errorResponseHooks.getRecentSecurityEvents().length,
			configuredRoutes: this.routeScopedHooks.getConfiguredRoutes().length
		}
	}

	/**
	 * Health check for hooks system
	 */
	healthCheck(): { status: 'healthy' | 'degraded' | 'unhealthy'; details: Record<string, unknown> } {
		try {
			const metrics = this.getHookMetrics()
			
			return {
				status: this.isInitialized ? 'healthy' : 'unhealthy',
				details: {
					initialized: this.isInitialized,
					fastifyInstanceAvailable: !!this.fastifyInstance,
					metrics
				}
			}
		} catch (error) {
			return {
				status: 'unhealthy',
				details: {
					error: String(error),
					initialized: this.isInitialized
				}
			}
		}
	}

	/**
	 * Add dynamic route configuration
	 */
	addDynamicRouteConfig(routePattern: string, config: any): void {
		if (!this.isInitialized) {
			throw new Error('Hooks not initialized')
		}

		this.routeScopedHooks.addRouteConfig(routePattern, config)
		this.logger.debug(`Added dynamic route configuration for ${routePattern}`)
	}

	/**
	 * Remove route configuration
	 */
	removeDynamicRouteConfig(routePattern: string): void {
		if (!this.isInitialized) {
			throw new Error('Hooks not initialized')
		}

		this.routeScopedHooks.removeRouteConfig(routePattern)
		this.logger.debug(`Removed route configuration for ${routePattern}`)
	}
}