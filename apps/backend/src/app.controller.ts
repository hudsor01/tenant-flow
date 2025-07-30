import { Controller, Get } from '@nestjs/common'
import { AppService } from './app.service'
import { PrismaService } from './prisma/prisma.service'
import { ConfigService } from '@nestjs/config'
import { Public } from './auth/decorators/public.decorator'

@Controller()
export class AppController {
	constructor(
		private readonly appService: AppService,
		private readonly prismaService: PrismaService,
		private readonly configService: ConfigService
	) { }

	@Get()
	@Public()
	getHello(): string {
		return this.appService.getHello()
	}

	@Get('health')
	@Public()
	async getHealth() {
		const isAccelerateEnabled = this.configService.get<string>('ENABLE_PRISMA_ACCELERATE') === 'true'
		const hasAccelerateUrl = !!this.configService.get<string>('PRISMA_ACCELERATE_URL')
		
		// Test database connection
		let dbStatus = 'unknown'
		let dbLatency: number | undefined
		try {
			const start = Date.now()
			await this.prismaService.$queryRaw`SELECT 1`
			dbStatus = 'connected'
			dbLatency = Date.now() - start
		} catch {
			dbStatus = 'error'
		}
		
		return {
			status: 'ok',
			timestamp: new Date().toISOString(),
			service: 'tenantflow-api',
			version: '1.0.0',
			database: {
				status: dbStatus,
				latency: dbLatency ? `${dbLatency}ms` : undefined,
				accelerate: {
					enabled: isAccelerateEnabled,
					configured: hasAccelerateUrl,
					active: isAccelerateEnabled && hasAccelerateUrl && dbStatus === 'connected'
				}
			}
		}
	}
}
