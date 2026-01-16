/**
 * Clean Health Controller - Service Delegation Pattern
 * Follows NestJS 2025 best practices for clean architecture
 */

import { Controller, Get, SetMetadata } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { SkipThrottle, Throttle } from '@nestjs/throttler'
import { HealthCheckService } from '@nestjs/terminus'
import { HealthCheck } from '@nestjs/terminus'
import { StripeSyncService } from '../modules/billing/stripe-sync.service'
import { createThrottleDefaults } from '../config/throttle.config'
import { CircuitBreakerService } from './circuit-breaker.service'
import { HealthService } from './health.service'
import { HealthMetricsService } from './health-metrics.service'
import { SupabaseHealthIndicator } from './supabase.health'
import { AppLogger } from '../logger/app-logger.service'
import { BullMqHealthIndicator } from './bullmq.health'

const HEALTH_THROTTLE = createThrottleDefaults({
	envTtlKey: 'HEALTH_THROTTLE_TTL',
	envLimitKey: 'HEALTH_THROTTLE_LIMIT',
	defaultTtl: 60000,
	defaultLimit: 300
})

@ApiTags('Health')
@Throttle({ default: HEALTH_THROTTLE })
@Controller(['health', 'auth'])
export class HealthController {
	constructor(
		private readonly healthService: HealthService,
		private readonly metricsService: HealthMetricsService,
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
	@ApiOperation({
		summary: 'Lightweight ping check',
		description: 'Simple ping endpoint for lightweight health checks. Returns minimal response for fast checks.'
	})
	@ApiResponse({
		status: 200,
		description: 'Service is alive',
		schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } }
	})
	@Get('ping')
	@SetMetadata('isPublic', true)
	ping() {
		return this.healthService.getPingResponse()
	}

	/**
	 * Railway readiness probe - zero-downtime deployments
	 */
	@ApiOperation({
		summary: 'Readiness probe',
		description: 'Railway readiness probe for zero-downtime deployments. Checks database and Redis connectivity.'
	})
	@ApiResponse({ status: 200, description: 'Service is ready to accept traffic' })
	@ApiResponse({ status: 503, description: 'Service is not ready' })
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
	@ApiOperation({
		summary: 'Stripe sync health',
		description: 'Check Stripe sync service health and webhook processing status'
	})
	@ApiResponse({ status: 200, description: 'Stripe sync service health status' })
	@Get('stripe-sync')
	@SetMetadata('isPublic', true)
	async checkStripeSyncHealth() {
		return this.stripeSyncService.getHealthStatus()
	}

	/**
	 * Performance metrics endpoint
	 */
	@ApiOperation({
		summary: 'Performance metrics',
		description: 'Detailed performance metrics including memory usage, CPU, and request statistics'
	})
	@ApiResponse({ status: 200, description: 'Performance metrics retrieved' })
	@Get('performance')
	@SetMetadata('isPublic', true)
	performanceMetrics() {
		return this.metricsService.getDetailedPerformanceMetrics()
	}

	/**
	 * Circuit breaker status for zero-downtime deployments
	 */
	@ApiOperation({
		summary: 'Circuit breaker status',
		description: 'Circuit breaker status for zero-downtime deployments. Shows current state of external service connections.'
	})
	@ApiResponse({ status: 200, description: 'Circuit breaker status retrieved' })
	@Get('circuit-breaker')
	@SetMetadata('isPublic', true)
	circuitBreakerStatus() {
		return this.circuitBreakerService.getCircuitBreakerStatus()
	}

	/**
	 * Main health endpoint - MUST be last to avoid intercepting specific routes
	 * Delegates to HealthService for business logic
	 */
	@ApiOperation({
		summary: 'Full health check',
		description: 'Comprehensive health check including database, Redis, and external service status. Returns 503 if unhealthy.'
	})
	@ApiResponse({ status: 200, description: 'All systems operational' })
	@ApiResponse({ status: 503, description: 'One or more systems unhealthy' })
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
