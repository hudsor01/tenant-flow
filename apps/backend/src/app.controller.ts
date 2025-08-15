import { Controller, Get } from '@nestjs/common'
import { Public } from './auth/decorators/public.decorator'
import { ModuleRef } from '@nestjs/core'
import { MetricsService } from './common/services/metrics.service'

@Controller()
export class AppController {
	constructor(
		private readonly moduleRef: ModuleRef,
		private readonly metricsService: MetricsService
	) {}

	@Get('metrics')
	@Public()
	getMetrics() {
		const systemMetrics = this.metricsService.getSystemMetrics()
		
		// Prometheus format for Railway monitoring
		return `# HELP nodejs_heap_used_bytes Node.js heap used in bytes
# TYPE nodejs_heap_used_bytes gauge
nodejs_heap_used_bytes ${systemMetrics.memory.heapUsed}

# HELP nodejs_heap_total_bytes Node.js heap total in bytes
# TYPE nodejs_heap_total_bytes gauge
nodejs_heap_total_bytes ${systemMetrics.memory.heapTotal}

# HELP nodejs_process_resident_memory_bytes Node.js process resident memory in bytes
# TYPE nodejs_process_resident_memory_bytes gauge
nodejs_process_resident_memory_bytes ${systemMetrics.memory.rss}

# HELP nodejs_version_info Node.js version info
# TYPE nodejs_version_info gauge
nodejs_version_info{version="${process.version}"} 1

# HELP process_cpu_user_seconds_total User CPU time spent in seconds
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total ${systemMetrics.cpu.usage / 1000}

# HELP process_start_time_seconds Start time of the process since unix epoch in seconds
# TYPE process_start_time_seconds gauge
process_start_time_seconds ${Date.now() / 1000 - systemMetrics.system.uptime}

# HELP http_requests_total Total HTTP requests processed
# TYPE http_requests_total counter
http_requests_total 1
`
	}

	@Get('api')
	@Public()
	getHello(): string {
		return 'TenantFlow Backend API - Core Routes Working'
	}

	@Get('ping')
	@Public()
	ping() {
		return {
			pong: true,
			timestamp: Date.now(),
			message: 'AppController routes working without service dependencies'
		}
	}

	@Get('debug/services')
	@Public()
	getServiceDebug() {
		return {
			message: 'AppController instantiated successfully',
			timestamp: new Date().toISOString(),
			environment: process.env.NODE_ENV || 'unknown',
			nodeVersion: process.version,
			pid: process.pid
		}
	}

	@Get('debug/modules')
	@Public()
	getModules() {
		try {
			const modules = []

			// Test if key services are available
			const testServices = [
				'AuthService',
				'UsersService',
				'PropertiesService',
				'TenantsService',
				'PrismaService'
			]

			for (const serviceName of testServices) {
				try {
					const service = this.moduleRef.get(serviceName, {
						strict: false
					})
					modules.push({
						name: serviceName,
						status: service ? 'loaded' : 'not_found',
						available: !!service
					})
				} catch (error) {
					modules.push({
						name: serviceName,
						status: 'error',
						error:
							error instanceof Error ? error.message : 'unknown',
						available: false
					})
				}
			}

			return {
				timestamp: new Date().toISOString(),
				environment: process.env.NODE_ENV,
				modules
			}
		} catch (error) {
			return {
				error: 'Failed to check modules',
				message: error instanceof Error ? error.message : 'unknown'
			}
		}
	}
}
