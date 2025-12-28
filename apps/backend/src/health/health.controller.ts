/**
 * Clean Health Controller - Service Delegation Pattern
 * Follows NestJS 2025 best practices for clean architecture
 */

import { Controller, Get, SetMetadata } from '@nestjs/common'
import { SkipThrottle, Throttle } from '@nestjs/throttler'
import { HealthCheckService } from '@nestjs/terminus'
import { HealthCheck } from '@nestjs/terminus'
import { StripeSyncService } from '../modules/billing/stripe-sync.service'
import { createThrottleDefaults } from '../config/throttle.config'
import { CircuitBreakerService } from './circuit-breaker.service'
import { HealthService } from './health.service'
import { MetricsService } from './metrics.service'
import { SupabaseHealthIndicator } from './supabase.health'
import { AppLogger } from '../logger/app-logger.service'
import { BullMqHealthIndicator } from './bullmq.health'

const HEALTH_THROTTLE = createThrottleDefaults({
	envTtlKey: 'HEALTH_THROTTLE_TTL',
	envLimitKey: 'HEALTH_THROTTLE_LIMIT',
	defaultTtl: 60000,
	defaultLimit: 300
})

@Throttle({ default: HEALTH_THROTTLE })
@Controller(['health', 'auth'])
export class HealthController {
	constructor(
		private readonly healthService: HealthService,
		private readonly metricsService: MetricsService,
		private readonly circuitBreakerService: CircuitBreakerService,
		private readonly health: HealthCheckService,
		private readonly supabase: SupabaseHealthIndicator,
		private readonly bullmq: BullMqHealthIndicator,
		private readonly stripeSyncService: StripeSyncService,
		private readonly logger: AppLogger
	) {}

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
		return this.health.check([
			() => this.supabase.quickPing('database'),
			() => this.bullmq.quickPing('redis')
		])
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
