import { Controller, forwardRef, Get, Inject, Logger } from '@nestjs/common'
import { Public } from '../auth/decorators/public.decorator'
import { SupabaseService } from '../common/supabase/supabase.service'

interface HealthStatus {
	status: 'ok' | 'degraded' | 'error'
	uptime: number
	timestamp: string
	database: 'healthy' | 'degraded' | 'unavailable' | 'connecting'
	databaseResponseTime?: number
	databaseError?: string
	environment: string
	memory: {
		used: number
		total: number
		percentage: number
	}
	_meta?: {
		apiVersion: string
		timestamp: string
		poolStats?: Record<string, unknown>
		cached?: boolean
		cacheAge?: number
	}
}

@Controller('/')
export class HealthController {
	private readonly startTime = Date.now()
	private readonly logger = new Logger('HealthCheck')
	private lastHealthCheck: HealthStatus | null = null
	private lastCheckTime = 0
	private readonly CACHE_TTL = 5000 // Cache health status for 5 seconds

	constructor(
		@Inject(forwardRef(() => SupabaseService))
		private readonly supabaseService: SupabaseService
	) {}

	@Get('health')
	@Public()
	async getHealth(): Promise<HealthStatus> {
		const now = Date.now()

		// Return cached result if recent enough (reduces database load)
		if (this.lastHealthCheck && now - this.lastCheckTime < this.CACHE_TTL) {
			return {
				...this.lastHealthCheck,
				timestamp: new Date().toISOString(),
				_meta: {
					apiVersion: this.lastHealthCheck._meta?.apiVersion || '',
					timestamp: this.lastHealthCheck._meta?.timestamp || '',
					...(this.lastHealthCheck._meta || {}),
					cached: true,
					cacheAge: now - this.lastCheckTime
				}
			}
		}

		// Perform actual health check
		const healthStatus = await this.performHealthCheck()

		// Cache the result
		this.lastHealthCheck = healthStatus
		this.lastCheckTime = now

		return healthStatus
	}

	private async performHealthCheck(): Promise<HealthStatus> {
		const uptime = Math.floor((Date.now() - this.startTime) / 1000)
		const memUsage = process.memoryUsage()

		// Check database with timeout
		const dbStatus = await this.checkDatabaseHealth()

		// Determine overall status
		let overallStatus: 'ok' | 'degraded' | 'error' = 'ok'
		if (dbStatus.status === 'unavailable') {
			overallStatus = 'error'
		} else if (
			dbStatus.status === 'degraded' ||
			dbStatus.status === 'connecting'
		) {
			overallStatus = 'degraded'
		}

		return {
			status: overallStatus,
			uptime,
			timestamp: new Date().toISOString(),
			database: dbStatus.status,
			databaseResponseTime: dbStatus.responseTime,
			databaseError: dbStatus.error,
			environment: process.env.NODE_ENV || 'unknown',
			memory: {
				used: Math.round(memUsage.heapUsed / 1024 / 1024),
				total: Math.round(memUsage.heapTotal / 1024 / 1024),
				percentage: Math.round(
					(memUsage.heapUsed / memUsage.heapTotal) * 100
				)
			},
			_meta: {
				apiVersion: 'v1',
				timestamp: new Date().toISOString(),
				poolStats: dbStatus.poolStats
			}
		}
	}

	private async checkDatabaseHealth(): Promise<{
		status: 'healthy' | 'degraded' | 'unavailable' | 'connecting'
		responseTime?: number
		poolStats?: Record<string, unknown>
		error?: string
	}> {
		try {
			const startTime = Date.now()

			// Add timeout to the health check itself
			const timeoutPromise = new Promise<boolean>((_, reject) => {
				setTimeout(
					() =>
						reject(
							new Error('Health check timeout after 8 seconds')
						),
					8000
				)
			})

			const connectionPromise = this.supabaseService.checkConnection()
			const connected = await Promise.race([
				connectionPromise,
				timeoutPromise
			])
			const responseTime = Date.now() - startTime

			if (!connected) {
				return {
					status: 'unavailable',
					responseTime,
					error: 'Database connection failed'
				}
			}

			// Categorize response time with more granular thresholds
			if (responseTime < 50) {
				return {
					status: 'healthy',
					responseTime
				}
			} else if (responseTime < 200) {
				return {
					status: 'healthy',
					responseTime
				}
			} else if (responseTime < 1000) {
				this.logger.warn(
					`Database response time elevated: ${responseTime}ms`
				)
				return {
					status: 'degraded',
					responseTime
				}
			} else {
				this.logger.warn(
					`Database response time high: ${responseTime}ms`
				)
				return {
					status: 'degraded',
					responseTime
				}
			}
		} catch (error) {
			this.logger.error('Database health check failed:', error)
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'

			// Check if it's a timeout issue specifically
			if (errorMessage.includes('timeout')) {
				return {
					status: 'unavailable',
					error: `Database timeout: ${errorMessage}`
				}
			}

			return {
				status: 'unavailable',
				error: errorMessage
			}
		}
	}

	@Get('health/detailed')
	@Public()
	async getDetailedHealth() {
		const health = await this.getHealth()

		// Add more detailed metrics
		return {
			...health,
			system: {
				nodeVersion: process.version,
				platform: process.platform,
				pid: process.pid,
				cpuUsage: process.cpuUsage(),
				memory: {
					rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
					heapUsed: Math.round(
						process.memoryUsage().heapUsed / 1024 / 1024
					),
					heapTotal: Math.round(
						process.memoryUsage().heapTotal / 1024 / 1024
					),
					external: Math.round(
						process.memoryUsage().external / 1024 / 1024
					),
					arrayBuffers: Math.round(
						process.memoryUsage().arrayBuffers / 1024 / 1024
					)
				}
			},
			checks: {
				database: await this.checkDatabaseHealth(),
				memory: this.checkMemoryHealth(),
				uptime: this.checkUptimeHealth()
			}
		}
	}

	private checkMemoryHealth(): {
		status: string
		details: Record<string, unknown>
	} {
		const memUsage = process.memoryUsage()
		const percentUsed = (memUsage.heapUsed / memUsage.heapTotal) * 100

		return {
			status:
				percentUsed > 90
					? 'critical'
					: percentUsed > 75
						? 'warning'
						: 'healthy',
			details: {
				percentUsed: Math.round(percentUsed),
				heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
				heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024)
			}
		}
	}

	private checkUptimeHealth(): { status: string; uptimeSeconds: number } {
		const uptime = Math.floor((Date.now() - this.startTime) / 1000)
		return {
			status: uptime < 60 ? 'warming' : 'stable',
			uptimeSeconds: uptime
		}
	}

	@Get('/')
	@Public()
	getRoot() {
		return {
			status: 'ok',
			service: 'tenantflow-backend',
			version: '1.0.0',
			health: '/health',
			detailed: '/health/detailed'
		}
	}
}
