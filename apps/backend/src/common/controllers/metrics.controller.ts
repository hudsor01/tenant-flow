import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { MetricsService } from '../services/metrics.service'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { Public } from '../../auth/decorators/public.decorator'

@Controller('metrics')
export class MetricsController {
	constructor(private readonly metricsService: MetricsService) {}

	@Get('health')
	@Public()
	getHealthMetrics() {
		return {
			status: 'healthy',
			timestamp: new Date().toISOString(),
			system: this.metricsService.getSystemMetrics(),
		}
	}

	@Get('system')
	@UseGuards(JwtAuthGuard)
	getSystemMetrics() {
		return this.metricsService.getSystemMetrics()
	}

	@Get('performance')
	@UseGuards(JwtAuthGuard)
	getPerformanceStats(@Query('operation') operation?: string) {
		return this.metricsService.getPerformanceStats(operation)
	}

	@Get('export')
	@UseGuards(JwtAuthGuard)
	exportMetrics() {
		return {
			metrics: this.metricsService.exportMetrics(),
			exported_at: new Date().toISOString(),
		}
	}
}