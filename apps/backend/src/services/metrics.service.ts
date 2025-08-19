import { Injectable } from '@nestjs/common'

@Injectable()
export class MetricsService {
	getSystemMetrics() {
		const memoryUsage = process.memoryUsage()

		return {
			memory: {
				heapUsed: memoryUsage.heapUsed,
				heapTotal: memoryUsage.heapTotal,
				rss: memoryUsage.rss,
				external: memoryUsage.external
			},
			cpu: {
				usage: process.cpuUsage().user + process.cpuUsage().system
			},
			system: {
				uptime: process.uptime(),
				platform: process.platform,
				arch: process.arch,
				nodeVersion: process.version
			}
		}
	}

	getHealthMetrics() {
		const memoryUsage = process.memoryUsage()

		return {
			status: 'healthy',
			timestamp: new Date().toISOString(),
			environment: process.env.NODE_ENV || 'development',
			uptime: process.uptime(),
			memory: {
				heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
				heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
				rss: Math.round(memoryUsage.rss / 1024 / 1024)
			}
		}
	}
}
