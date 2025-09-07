import { Controller, Get } from '@nestjs/common'
import { HealthCheck, HealthCheckService } from '@nestjs/terminus'
import { PinoLogger } from 'nestjs-pino'
import { hostname } from 'os'
import { Public } from '../shared/decorators/public.decorator'
import { SupabaseHealthIndicator } from './supabase.health'
import { StripeFdwHealthIndicator } from './stripe-fdw.health'
import { StripeSyncService } from '../billing/stripe-sync.service'

@Controller('health')
export class HealthController {
	constructor(
		private readonly health: HealthCheckService,
		private readonly supabase: SupabaseHealthIndicator,
		private readonly stripeFdw: StripeFdwHealthIndicator,
		private readonly stripeSyncService: StripeSyncService,
		private readonly logger: PinoLogger
	) {
		// PinoLogger context handled automatically via app-level configuration
	}

	@Get()
	@Public()
	@HealthCheck()
	async check() {
		this.logger.info(
			{
				health: {
					environment: process.env.NODE_ENV,
					checkType: 'full'
				}
			},
			`Health check started - Environment: ${process.env.NODE_ENV}`
		)
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

	@Get('stripe')
	@Public()
	@HealthCheck()
	async stripeCheck() {
		this.logger.info('Stripe FDW health check started')
		return this.health.check([() => this.stripeFdw.detailedCheck('stripe_fdw')])
	}

	@Get('stripe-sync')
	@Public()
	async checkStripeSyncHealth() {
		const health = this.stripeSyncService.getHealthStatus()
		return {
			status: health.initialized && health.migrationsRun ? 'healthy' : 'unhealthy',
			...health,
			timestamp: new Date().toISOString()
		}
	}

	@Get('debug')
	@Public()
	debug() {
		return {
			timestamp: new Date().toISOString(),
			process: {
				pid: process.pid,
				uptime: Math.round(process.uptime()),
				version: process.version,
				platform: process.platform,
				arch: process.arch,
				memory: process.memoryUsage(),
				cpuUsage: process.cpuUsage()
			},
			environment: {
				NODE_ENV: process.env.NODE_ENV,
				PORT: process.env.PORT,
				hostname: hostname(),
				DOCKER_CONTAINER: process.env.DOCKER_CONTAINER,
				RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,

				hasSupabaseUrl: !!process.env.SUPABASE_URL,
				hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
			}
		}
	}
}
