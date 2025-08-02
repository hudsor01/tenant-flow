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
	) { }

	@Get()
	@Public()
	getHello(): string {
		return this.appService.getHello()
	}

	@Get('health/simple')
	@Public()
	getSimpleHealth() {
		return {
			status: 'ok',
			timestamp: new Date().toISOString(),
			service: 'tenantflow-api',
			uptime: process.uptime(),
			memory: process.memoryUsage(),
			version: '1.0.0'
		}
	}

	@Get('ping')
	@Public()
	ping() {
		return { pong: true, timestamp: Date.now() }
	}

	@Get('railway-debug')
	@Public()
	getRailwayDebug() {
		return {
			status: 'ok',
			timestamp: new Date().toISOString(),
			service: 'tenantflow-api',
			environment: {
				NODE_ENV: process.env.NODE_ENV,
				RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
				RAILWAY_SERVICE_NAME: process.env.RAILWAY_SERVICE_NAME,
				RAILWAY_PROJECT_NAME: process.env.RAILWAY_PROJECT_NAME,
				PORT: process.env.PORT,
				API_URL: process.env.API_URL,
				FRONTEND_URL: process.env.FRONTEND_URL
			},
			uptime: process.uptime(),
			memory: process.memoryUsage(),
			version: '1.0.0'
		}
	}

	@Get('health')
	@Public()
	getHealth() {
		// Ultra-simple health check for Railway
		return { status: 'ok' }
	}

	@Get('health/detailed')
	@Public()
	async getDetailedHealth() {
		const isAccelerateEnabled = this.configService.get<string>('ENABLE_PRISMA_ACCELERATE') === 'true'
		const hasAccelerateUrl = !!this.configService.get<string>('PRISMA_ACCELERATE_URL')
		const databaseUrl = this.configService.get<string>('DATABASE_URL')
		const hasDatabaseUrl = !!databaseUrl
		
		// Test database connection with timeout
		let dbStatus = 'unknown'
		let dbLatency: number | undefined
		let dbError: any = null
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
				code: (error as any)?.code,
				meta: (error as any)?.meta,
				stack: process.env.NODE_ENV !== 'production' ? (error as any)?.stack : undefined
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
				error: dbError,
				accelerate: {
					enabled: isAccelerateEnabled,
					configured: hasAccelerateUrl,
					active: isAccelerateEnabled && hasAccelerateUrl && dbStatus === 'connected'
				}
			}
		}
	}

	@Get('health/performance')
	@Public()
	async getPerformanceMetrics() {
		try {
			const adminMetrics = this.prismaService.getPerformanceMetrics()
			const multiTenantReport = this.multiTenantPrismaService.generatePerformanceReport()
			
			return {
				status: 'ok',
				timestamp: new Date().toISOString(),
				adminClient: {
					metrics: adminMetrics,
					report: this.prismaService.generatePerformanceReport()
				},
				multiTenant: multiTenantReport,
				summary: {
					totalTenantClients: multiTenantReport.poolStats.activeConnections,
					maxPoolSize: multiTenantReport.poolStats.maxPoolSize,
					averageClientAge: this.calculateAverageClientAge(multiTenantReport.poolStats.clients)
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

	private calculateAverageClientAge(clients: any[]): number {
		if (clients.length === 0) return 0
		const totalAge = clients.reduce((sum, client) => sum + client.ageMinutes, 0)
		return Math.round(totalAge / clients.length)
	}
}
