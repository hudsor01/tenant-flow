import { Controller, forwardRef, Get, Inject, Logger } from '@nestjs/common'
import { Public } from '../auth/decorators/public.decorator'
import { PrismaService } from '../prisma/prisma.service'

interface HealthStatus {
	status: 'ok' | 'degraded' | 'error'
	uptime: number
	timestamp: string
	database: 'healthy' | 'degraded' | 'unavailable' | 'connecting'
	databaseResponseTime?: number
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
		@Inject(forwardRef(() => PrismaService))
		private readonly prisma: PrismaService
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
	}> {
		try {
			// Use the new getConnectionStatus method from optimized PrismaService
			const connectionStatus = await this.prisma.getConnectionStatus()

			if (!connectionStatus.connected) {
				return {
					status: 'connecting',
					poolStats: connectionStatus.poolStats
				}
			}

			const responseTime = connectionStatus.responseTime ?? 0

			// Categorize response time
			if (responseTime < 100) {
				return {
					status: 'healthy',
					responseTime,
					poolStats: connectionStatus.poolStats
				}
			} else if (responseTime < 1000) {
				return {
					status: 'degraded',
					responseTime,
					poolStats: connectionStatus.poolStats
				}
			} else {
				this.logger.warn(
					`Database response time high: ${responseTime}ms`
				)
				return {
					status: 'degraded',
					responseTime,
					poolStats: connectionStatus.poolStats
				}
			}
		} catch (error) {
			this.logger.error('Database health check failed:', error)
			return { status: 'unavailable' }
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
