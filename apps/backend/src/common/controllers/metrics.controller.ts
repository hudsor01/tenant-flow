import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common'
import { FastifyReply } from 'fastify'
import { MetricsService } from '../services/metrics.service'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { Public } from '../../auth/decorators/public.decorator'

@Controller('metrics')
export class MetricsController {
	constructor(private readonly metricsService: MetricsService) {}

	@Get()
	@Public()
	getPrometheusMetrics(@Res() res: FastifyReply) {
		// Prometheus-compatible metrics endpoint for Railway monitoring
		const systemMetrics = this.metricsService.getSystemMetrics()
		
		// Convert to Prometheus format
		const lines = [
			'# HELP nodejs_heap_size_used_bytes Process heap memory size used',
			'# TYPE nodejs_heap_size_used_bytes gauge',
			`nodejs_heap_size_used_bytes ${systemMetrics.memory.heapUsed}`,
			'',
			'# HELP nodejs_heap_size_total_bytes Process heap memory size total',
			'# TYPE nodejs_heap_size_total_bytes gauge',
			`nodejs_heap_size_total_bytes ${systemMetrics.memory.heapTotal}`,
			'',
			'# HELP nodejs_memory_rss_bytes Process resident memory size',
			'# TYPE nodejs_memory_rss_bytes gauge',
			`nodejs_memory_rss_bytes ${systemMetrics.memory.rss}`,
			'',
			'# HELP process_cpu_user_seconds_total Total user CPU time spent',
			'# TYPE process_cpu_user_seconds_total counter',
			`process_cpu_user_seconds_total ${systemMetrics.cpu.usage / 1000}`,
			'',
			'# HELP process_uptime_seconds Number of seconds the process has been running',
			'# TYPE process_uptime_seconds gauge',
			`process_uptime_seconds ${systemMetrics.system.uptime}`,
			''
		]
		
		res.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
		res.send(lines.join('\n'))
	}

	@Get('health')
	@Public()
	getHealthMetrics() {
		return {
			status: 'healthy',
			timestamp: new Date().toISOString(),
			system: this.metricsService.getSystemMetrics()
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
			exported_at: new Date().toISOString()
		}
	}
}
