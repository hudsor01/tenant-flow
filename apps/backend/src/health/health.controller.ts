/**
 * Clean Health Controller - Service Delegation Pattern
 * Follows NestJS 2025 best practices for clean architecture
 */

import { Controller, Get, Logger, SetMetadata } from '@nestjs/common'
import { SkipThrottle, Throttle } from '@nestjs/throttler'
import { HealthCheck, HealthCheckService } from '@nestjs/terminus'
import { StripeSyncService } from '../modules/billing/stripe-sync.service'
import { CircuitBreakerService } from './circuit-breaker.service'
import { HealthService } from './health.service'
import { MetricsService } from './metrics.service'
import { SupabaseHealthIndicator } from './supabase.health'

@Throttle({ default: { ttl: 60000, limit: 300 } }) // TODO: Make configurable via environment variables
@Controller(['health', 'api/v1/health', 'auth', 'api/v1/auth'])
export class HealthController {
	private readonly logger = new Logger(HealthController.name)

	constructor(
		private readonly healthService: HealthService,
		private readonly metricsService: MetricsService,
		private readonly circuitBreakerService: CircuitBreakerService,
		private readonly health: HealthCheckService,
		private readonly supabase: SupabaseHealthIndicator,
		private readonly stripeSyncService: StripeSyncService
	) {}

	/**
	 * Backward compatibility alias for main health check
	 */
	@Get('check')
	@SetMetadata('isPublic', true)
	async checkEndpoint() {
		this.logger.log('Health check alias /check routed to main health handler')
		return this.check()
	}

	/**
	 * Simple ping endpoint for lightweight health checks
	 */
	@Get('ping')
	@SetMetadata('isPublic', true)
	ping() {
		return this.healthService.getPingResponse()
	}

	/**
	 * Railway readiness probe - zero-downtime deployments
	 */
	@SkipThrottle()
	@Get('ready')
	@SetMetadata('isPublic', true)
	@HealthCheck()
	ready() {
		return this.health.check([() => this.supabase.quickPing('database')])
	}

	/**
	 * Stripe sync service health
	 */
	@Get('stripe-sync')
	@SetMetadata('isPublic', true)
	async checkStripeSyncHealth() {
		return this.stripeSyncService.getHealthStatus()
	}

	/**
	 * Performance metrics endpoint
	 */
	@Get('performance')
	@SetMetadata('isPublic', true)
	performanceMetrics() {
		return this.metricsService.getDetailedPerformanceMetrics()
	}

	/**
	 * Circuit breaker status for zero-downtime deployments
	 */
	@Get('circuit-breaker')
	@SetMetadata('isPublic', true)
	circuitBreakerStatus() {
		return this.circuitBreakerService.getCircuitBreakerStatus()
	}

	/**
	 * Main health endpoint - MUST be last to avoid intercepting specific routes
	 * Delegates to HealthService for business logic
	 */
	@Get()
	@SetMetadata('isPublic', true)
	async check() {
		this.logger.log('Health check received via /health')
		const startedAt = Date.now()
		const healthResult = await this.healthService.checkSystemHealth()
		const duration = Date.now() - startedAt
		const statusCode = healthResult.status === 'ok' ? 200 : 503
		this.logger.log(
			`Health check completed with status ${statusCode} (${healthResult.status}) in ${duration}ms`
		)
		// Let NestJS handle the response - this avoids ClassSerializerInterceptor issues
		return healthResult
	}
}
