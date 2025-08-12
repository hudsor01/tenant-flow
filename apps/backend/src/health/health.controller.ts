import { Controller, Get } from '@nestjs/common'
import { Public } from '../auth/decorators/public.decorator'
import { PrismaService } from '../prisma/prisma.service'

// Set explicit path to bypass global prefix
// Railway expects /health endpoint at root
// Using forward slash to ensure absolute path
@Controller('/')
export class HealthController {
	private startTime = Date.now()

	constructor(private readonly prisma: PrismaService) {}

	@Get('health')
	@Public()
	async getHealth() {
		let dbStatus = 'unknown'
		try {
			await this.prisma.$queryRaw`SELECT 1`
			dbStatus = 'connected'
		} catch (_error) {
			dbStatus = 'disconnected'
		}

		return {
			status: 'ok',
			uptime: Math.floor((Date.now() - this.startTime) / 1000),
			timestamp: new Date().toISOString(),
			database: dbStatus,
			environment: process.env.NODE_ENV || 'unknown'
		}
	}

	@Get('/')
	@Public()
	getRoot() {
		return {
			status: 'ok',
			service: 'tenantflow-backend',
			version: '1.0.0'
		}
	}
}
