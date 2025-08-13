import { Controller, Get } from '@nestjs/common'
import { Public } from '../auth/decorators/public.decorator'

// Set explicit path to bypass global prefix
// Railway expects /health endpoint at root
// Using forward slash to ensure absolute path
@Controller('/')
export class HealthController {
	private startTime = Date.now()


	@Get('health')
	@Public()
	async getHealth() {
		return {
			status: 'ok',
			uptime: Math.floor((Date.now() - this.startTime) / 1000),
			timestamp: new Date().toISOString(),
			database: 'skipped',
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
