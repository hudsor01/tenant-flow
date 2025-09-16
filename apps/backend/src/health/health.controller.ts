/**
 * Enhanced Health Controller - Zero-Downtime Architecture
 * Implements Apple's health check obsession with detailed service monitoring
 * Integrates with existing PinoLogger patterns
 */

import { Controller, Get, Optional } from '@nestjs/common'
import { HealthCheck, HealthCheckService } from '@nestjs/terminus'
import { PinoLogger } from 'nestjs-pino'
import { hostname } from 'os'
import { Public } from '../shared/decorators/public.decorator'
import { SupabaseHealthIndicator } from './supabase.health'
import { StripeFdwHealthIndicator } from './stripe-fdw.health'
import { ResilienceService } from '../shared/services/resilience.service'

interface ServiceHealth {
	healthy: boolean
	responseTime?: number
	lastCheck?: string
	details?: unknown // Flexible to accept any health check details
}

interface SystemHealth {
	status: 'healthy' | 'degraded' | 'unhealthy'
	timestamp: string
	services: Record<string, ServiceHealth>
	performance: {
		uptime: number
		memory: {
			used: number
			free: number
			total: number
			usagePercent: number
		}
		cpu: {
			user: number
			system: number
		}
	}
	cache: {
		healthy: boolean
		metrics?: Record<string, number>
	}
	version: string
	deployment: {
		environment: string
		region?: string
		instance: string
	}
}

@Controller('health')
export class HealthController {
	private lastHealthCheck: SystemHealth | null = null
	private healthCheckCache = new Map<string, { result: ServiceHealth; timestamp: number }>()

	constructor(
		private readonly health: HealthCheckService,
		private readonly supabase: SupabaseHealthIndicator,
		private readonly stripeFdw: StripeFdwHealthIndicator,
		private readonly resilience: ResilienceService,
		@Optional() private readonly logger?: PinoLogger
	) {}

	@Get()
	@Public()
	@HealthCheck()
	async check() {
		return this.health.check([
			() => this.supabase.pingCheck('database'),
			() => this.stripeFdw.isHealthy('stripe_fdw')
		])
	}

	@Get('ping')
	@Public()
	ping() {
		return {
			status: 'ok',
			timestamp: new Date().toISOString(),
			uptime: Math.round(process.uptime()),
			memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
			env: process.env.NODE_ENV,
			port: process.env.PORT
		}
	}

	@Get('ready')
	@Public()
	@HealthCheck()
	ready() {
		return this.health.check([
			() => this.supabase.quickPing('database'),
			() => this.stripeFdw.quickPing('stripe_fdw')
		])
	}

	/**
	 * Comprehensive system health with all services and performance metrics
	 */
	@Get('system')
	@Public()
	async systemHealth(): Promise<SystemHealth> {
		const startTime = Date.now()

		try {
			// Parallel health checks for faster response
			const [databaseHealth, stripeHealth, cacheHealth] = await Promise.allSettled([
				this.checkDatabaseHealth(),
				this.checkStripeHealth(),
				this.checkCacheHealth()
			])

			const services = {
				database: this.extractHealthResult(databaseHealth),
				stripe: this.extractHealthResult(stripeHealth),
				cache: this.extractHealthResult(cacheHealth)
			}

			// Overall system status based on critical services
			const criticalServices = ['database', 'cache']
			const criticalHealthy = criticalServices.every(service => services[service as keyof typeof services]?.healthy)
			const allHealthy = Object.values(services).every(service => service.healthy)

			const status = allHealthy ? 'healthy' : criticalHealthy ? 'degraded' : 'unhealthy'

			const systemHealth: SystemHealth = {
				status,
				timestamp: new Date().toISOString(),
				services,
				performance: this.getPerformanceMetrics(),
				cache: this.resilience.getHealthStatus(),
				version: process.env.npm_package_version || '1.0.0',
				deployment: {
					environment: process.env.NODE_ENV || 'development',
					region: process.env.RAILWAY_REGION || process.env.VERCEL_REGION || 'unknown',
					instance: hostname()
				}
			}

			this.lastHealthCheck = systemHealth

			// Log performance warning if response takes >100ms
			const responseTime = Date.now() - startTime
			if (responseTime > 100) {
				this.logger?.warn(
					{ responseTime, target: 100 },
					`Health check took ${responseTime}ms (target: <100ms)`
				)
			}

			return systemHealth
		} catch (error) {
			this.logger?.error({ error: error instanceof Error ? error.message : String(error) }, 'System health check failed')
			throw error
		}
	}

	/**
	 * Service-specific health endpoints for individual monitoring
	 */
	@Get('services/database')
	@Public()
	async databaseHealth() {
		return this.getCachedOrFresh('database', () => this.checkDatabaseHealth(), 30_000)
	}

	@Get('services/stripe')
	@Public()
	async stripeHealthCheck() {
		return this.getCachedOrFresh('stripe', () => this.checkStripeHealth(), 30_000)
	}

	@Get('services/cache')
	@Public()
	async cacheHealthCheck() {
		return this.getCachedOrFresh('cache', () => Promise.resolve(this.checkCacheHealth()), 10_000)
	}

	/**
	 * Performance metrics endpoint for monitoring
	 */
	@Get('performance')
	@Public()
	performanceMetrics() {
		const performance = this.getPerformanceMetrics()
		const cache = this.resilience.getHealthStatus()

		return {
			...performance,
			cache,
			healthCheckHistory: this.lastHealthCheck ? {
				lastStatus: this.lastHealthCheck.status,
				lastCheck: this.lastHealthCheck.timestamp
			} : null,
			thresholds: {
				memory: { warning: 80, critical: 95 },
				cache: { memoryLimit: 100_000_000 }, // 100MB
				responseTime: { warning: 100, critical: 200 }
			}
		}
	}

	/**
	 * Circuit breaker status for zero-downtime deployments
	 */
	@Get('circuit-breaker')
	@Public()
	circuitBreakerStatus() {
		const services = ['database', 'stripe', 'cache']
		const status = services.reduce((acc, service) => {
			const cached = this.healthCheckCache.get(service)
			const isStale = !cached || Date.now() - cached.timestamp > 60_000

			acc[service] = {
				open: isStale || !cached.result.healthy,
				lastSuccess: cached?.timestamp || null,
				failureCount: 0 // Implement failure tracking if needed
			}
			return acc
		}, {} as Record<string, {
			open: boolean
			lastSuccess: number | null
			failureCount: number
		}>)

		return {
			timestamp: new Date().toISOString(),
			services: status,
			systemStatus: Object.values(status).some(s => s.open) ? 'degraded' : 'healthy'
		}
	}

	private async checkDatabaseHealth(): Promise<ServiceHealth> {
		const startTime = Date.now()
		try {
			const result = await this.supabase.pingCheck('database')
			return {
				healthy: result.database.status === 'up',
				responseTime: Date.now() - startTime,
				lastCheck: new Date().toISOString(),
				details: result.database
			}
		} catch (error) {
			return {
				healthy: false,
				responseTime: Date.now() - startTime,
				lastCheck: new Date().toISOString(),
				details: { error: error instanceof Error ? error.message : String(error) }
			}
		}
	}

	private async checkStripeHealth(): Promise<ServiceHealth> {
		const startTime = Date.now()
		try {
			const result = await this.stripeFdw.isHealthy('stripe_fdw')
			return {
				healthy: result.stripe_fdw?.status === 'up',
				responseTime: Date.now() - startTime,
				lastCheck: new Date().toISOString(),
				details: result.stripe_fdw
			}
		} catch (error) {
			return {
				healthy: false,
				responseTime: Date.now() - startTime,
				lastCheck: new Date().toISOString(),
				details: { error: error instanceof Error ? error.message : String(error) }
			}
		}
	}

	private checkCacheHealth(): ServiceHealth {
		// Simple cache health check based on memory usage
		const memUsage = process.memoryUsage()
		return {
			healthy: memUsage.heapUsed < memUsage.heapTotal * 0.9, // Healthy if under 90% heap
			responseTime: 1, // In-memory check is instant
			lastCheck: new Date().toISOString(),
			details: {
				heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
				heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024)
			}
		}
	}

	private getPerformanceMetrics() {
		const memoryUsage = process.memoryUsage()
		const cpuUsage = process.cpuUsage()

		return {
			uptime: Math.round(process.uptime()),
			memory: {
				used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
				free: Math.round((memoryUsage.heapTotal - memoryUsage.heapUsed) / 1024 / 1024),
				total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
				usagePercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
			},
			cpu: {
				user: Math.round(cpuUsage.user / 1000),
				system: Math.round(cpuUsage.system / 1000)
			}
		}
	}

	private extractHealthResult(result: PromiseSettledResult<ServiceHealth>): ServiceHealth {
		if (result.status === 'fulfilled') {
			return result.value
		}
		return {
			healthy: false,
			lastCheck: new Date().toISOString(),
			details: { error: result.reason?.message || 'Unknown error' }
		}
	}

	private async getCachedOrFresh(key: string, fn: () => Promise<ServiceHealth>, maxAge: number): Promise<ServiceHealth> {
		const cached = this.healthCheckCache.get(key)

		if (cached && Date.now() - cached.timestamp < maxAge) {
			return cached.result
		}

		const result = await fn()
		this.healthCheckCache.set(key, { result, timestamp: Date.now() })
		return result
	}
}