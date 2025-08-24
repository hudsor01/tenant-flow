import { Controller, Get, Logger } from '@nestjs/common'
import { HealthCheck, HealthCheckService } from '@nestjs/terminus'
import { hostname } from 'os'
import { Public } from '../shared/decorators/public.decorator'
import { SupabaseHealthIndicator } from './supabase.health'

@Controller('health')
export class HealthController {
	private readonly logger = new Logger(HealthController.name)

	constructor(
		private readonly health: HealthCheckService,
		private readonly supabase: SupabaseHealthIndicator
	) {}

	@Get()
	@Public()
	@HealthCheck()
	async check() {
		this.logger.log(
			`Health check started - Environment: ${process.env.NODE_ENV}`
		)
		return this.health.check([async () => this.supabase.pingCheck('database')])
	}

	@Get('ping')
	@Public()
	ping() {
		return {
			status: 'ok',
			timestamp: new Date(),
			uptime: Math.round(process.uptime()),
			memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
			env: process.env.NODE_ENV,
			port: process.env.PORT
		}
	}

	@Get('ready')
	@Public()
	@HealthCheck()
	async ready() {
		return this.health.check([async () => this.supabase.quickPing('database')])
	}

	@Get('debug')
	@Public()
	debug() {
		return {
			timestamp: new Date(),
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
