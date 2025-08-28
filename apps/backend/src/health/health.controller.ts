import { Controller, Get } from '@nestjs/common'
import { HealthCheck, HealthCheckService } from '@nestjs/terminus'
import { PinoLogger } from 'nestjs-pino'
import { hostname } from 'os'
import { Public } from '../shared/decorators/public.decorator'
import { SupabaseHealthIndicator } from './supabase.health'

@Controller('health')
export class HealthController {
	constructor(
		private readonly health: HealthCheckService,
		private readonly supabase: SupabaseHealthIndicator,
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
		return this.health.check([() => this.supabase.pingCheck('database')])
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
		return this.health.check([() => this.supabase.quickPing('database')])
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
