import { Controller, Get } from '@nestjs/common'
import { AppService } from './app.service'
import { PrismaService } from './prisma/prisma.service'
import { ConfigService } from '@nestjs/config'
import { Public } from './auth/decorators/public.decorator'
import { MultiTenantPrismaService } from './common/prisma/multi-tenant-prisma.service'

@Controller()
export class AppController {
	constructor(
		private readonly appService: AppService,
		private readonly prismaService: PrismaService,
		private readonly configService: ConfigService,
		private readonly multiTenantPrismaService: MultiTenantPrismaService
	) {}

	@Get('api')
	@Public()
	getHello(): string {
		return this.appService?.getHello() || 'TenantFlow Backend API'
	}

	@Get('ping')
	@Public()
	ping() {
		return { pong: true, timestamp: Date.now() }
	}



	@Get('health/detailed')
	@Public()
	async getDetailedHealth() {
		const databaseUrl = this.configService.get<string>('DATABASE_URL')
		const hasDatabaseUrl = !!databaseUrl
		
		// Test database connection with timeout
		let dbStatus = 'unknown'
		let dbLatency: number | undefined
		let dbError: { message: string; code?: string; meta?: unknown; stack?: string } | null = null
		try {
			const start = Date.now()
			// Add timeout to prevent hanging
			await Promise.race([
				this.prismaService.$queryRaw`SELECT 1`,
				new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 5000))
			])
			dbStatus = 'connected'
			dbLatency = Date.now() - start
		} catch (error) {
			dbStatus = 'error'
			dbError = {
				message: error instanceof Error ? error.message : 'Unknown error',
				code: (error as { code?: string })?.code,
				meta: (error as { meta?: unknown })?.meta,
				stack: process.env.NODE_ENV !== 'production' ? (error as { stack?: string })?.stack : undefined
			}
			console.error('Health check DB error:', dbError)
		}
		
		return {
			status: dbStatus === 'connected' ? 'ok' : 'degraded',
			timestamp: new Date().toISOString(),
			service: 'tenantflow-api',
			version: '1.0.0',
			uptime: process.uptime(),
			environment: this.configService.get<string>('NODE_ENV'),
			port: this.configService.get<number>('PORT'),
			database: {
				status: dbStatus,
				latency: dbLatency ? `${dbLatency}ms` : undefined,
				configured: hasDatabaseUrl,
				urlPrefix: databaseUrl ? databaseUrl.substring(0, 15) + '...' : 'not set',
				error: dbError
			}
		}
	}

	@Get('health/performance')
	@Public()
	async getPerformanceMetrics() {
		try {
			const poolStats = this.multiTenantPrismaService.getPoolStats()
			
			return {
				status: 'ok',
				timestamp: new Date().toISOString(),
				multiTenant: {
					poolStats,
					summary: {
						totalTenantClients: poolStats.activeConnections,
						maxPoolSize: poolStats.maxPoolSize,
						averageClientAge: this.calculateAverageClientAge(poolStats.clients)
					}
				}
			}
		} catch (error) {
			return {
				status: 'error',
				timestamp: new Date().toISOString(),
				error: error instanceof Error ? error.message : 'Unknown error'
			}
		}
	}

	private calculateAverageClientAge(clients: { ageMinutes: number }[]): number {
		if (clients.length === 0) return 0
		const totalAge = clients.reduce((sum, client) => sum + client.ageMinutes, 0)
		return Math.round(totalAge / clients.length)
	}
}
