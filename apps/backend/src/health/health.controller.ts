/**
 * Clean Health Controller - Service Delegation Pattern
 * Follows NestJS 2025 best practices for clean architecture
 */

import { Controller, Get, Logger, Res, SetMetadata } from '@nestjs/common'
import { HealthCheck, HealthCheckService } from '@nestjs/terminus'
import type { Response } from 'express'
import { StripeSyncService } from '../billing/stripe-sync.service'
import { CircuitBreakerService } from './circuit-breaker.service'
import { HealthService } from './health.service'
import { MetricsService } from './metrics.service'
import { StripeFdwHealthIndicator } from './stripe-fdw.health'
import { SupabaseHealthIndicator } from './supabase.health'

@Controller(['health', 'api/v1/health'])
export class HealthController {
	private readonly logger = new Logger(HealthController.name)

	constructor(
		private readonly healthService: HealthService,
		private readonly metricsService: MetricsService,
		private readonly circuitBreakerService: CircuitBreakerService,
		private readonly health: HealthCheckService,
		private readonly supabase: SupabaseHealthIndicator,
		private readonly stripeFdw: StripeFdwHealthIndicator,
		private readonly stripeSyncService: StripeSyncService
	) {}

	/**
	 * Backward compatibility alias for main health check
	 */
	@Get('check')
	@SetMetadata('isPublic', true)
	async checkEndpoint(@Res() res: Response) {
		this.logger.log('Health check alias /check routed to main health handler')
		return this.check(res)
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
	 * Kubernetes readiness probe
	 */
	@Get('ready')
	@SetMetadata('isPublic', true)
	@HealthCheck()
	ready() {
		return this.health.check([
			() => this.supabase.quickPing('database'),
			() => this.stripeFdw.quickPing('stripe_fdw')
		])
	}

	/**
	 * Stripe FDW health check
	 */
	@Get('stripe')
	@SetMetadata('isPublic', true)
	@HealthCheck()
	async stripeCheck() {
		this.logger.log('Stripe FDW health check started')
		return this.health.check([() => this.stripeFdw.detailedCheck('stripe_fdw')])
	}

	/**
	 * Stripe sync service health
	 */
	@Get('stripe-sync')
	@SetMetadata('isPublic', true)
	async checkStripeSyncHealth() {
		const health = this.stripeSyncService.getHealthStatus()
		return {
			status:
				health.initialized && health.migrationsRun ? 'healthy' : 'unhealthy',
			...health,
			timestamp: new Date().toISOString()
		}
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
	async check(@Res() res: Response) {
		const requestPath = res.req?.originalUrl ?? 'unknown'
		this.logger.log(`Health check received via ${requestPath}`)
		const startedAt = Date.now()
		const healthResult = await this.healthService.checkSystemHealth()
		const duration = Date.now() - startedAt
		const statusCode = healthResult.status === 'ok' ? 200 : 503
		this.logger.log(
			`Health check completed with status ${statusCode} (${healthResult.status}) in ${duration}ms`
		)
		return res.status(statusCode).json(healthResult)
	}
}
