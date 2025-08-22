import { Controller, Get, Logger, ParseIntPipe, Query } from '@nestjs/common'
import { Public } from '../shared/decorators/public.decorator'
import { UnifiedPerformanceMonitoringService } from '../shared/services/unified-performance-monitoring.service'

/**
 * Performance Metrics Controller
 * 
 * Exposes lightweight performance monitoring data via HTTP endpoints.
 * These endpoints are designed for health checks, monitoring dashboards,
 * and operational visibility without requiring external APM tools.
 */
@Controller('health/performance')
export class PerformanceController {
	private readonly logger = new Logger(PerformanceController.name)

	constructor(
		private readonly performanceService: UnifiedPerformanceMonitoringService
	) {}

	/**
	 * Get comprehensive performance statistics
	 * 
	 * Includes request timing, status codes, memory usage, and system metrics.
	 * Results are cached for 30 seconds for efficiency.
	 * 
	 * @returns Complete performance statistics
	 */
	@Get('stats')
	@Public()
	getPerformanceStats() {
		this.logger.log('Performance stats requested')
		return {
			status: 'ok',
			timestamp: new Date().toISOString(),
			data: this.performanceService.getPerformanceStats()
		}
	}

	/**
	 * Get lightweight performance summary
	 * 
	 * Minimal data for quick health checks and monitoring.
	 * More efficient than full stats for frequent polling.
	 * 
	 * @returns Basic performance metrics summary
	 */
	@Get('summary')
	@Public()
	getPerformanceSummary() {
		return {
			status: 'ok',
			timestamp: new Date().toISOString(),
			...this.performanceService.getMetricsSummary()
		}
	}

	/**
	 * Get slowest requests
	 * 
	 * Useful for identifying performance bottlenecks and optimization targets.
	 * 
	 * @param limit Number of slow requests to return (default: 10, max: 50)
	 * @returns List of slowest requests with timing and metadata
	 */
	@Get('slow')
	@Public()
	getSlowRequests(
		@Query('limit', new ParseIntPipe({ optional: true })) limit = 10
	) {
		const safeLimit = Math.min(Math.max(1, limit), 50) // Clamp between 1-50
		
		this.logger.log(`Slow requests requested (limit: ${safeLimit})`)
		
		return {
			status: 'ok',
			timestamp: new Date().toISOString(),
			limit: safeLimit,
			data: this.performanceService.getSlowRequests(safeLimit)
		}
	}

	/**
	 * Get performance statistics by path
	 * 
	 * Shows which endpoints are being hit most frequently and their performance.
	 * Useful for identifying hot paths and optimization opportunities.
	 * 
	 * @returns Request statistics grouped by normalized path
	 */
	@Get('by-path')
	@Public()
	getStatsByPath() {
		this.logger.log('Path-based stats requested')
		
		return {
			status: 'ok',
			timestamp: new Date().toISOString(),
			data: this.performanceService.getStatsByPath()
		}
	}

	/**
	 * Get recent metrics within a time window
	 * 
	 * Allows filtering metrics by recency for trend analysis.
	 * 
	 * @param windowMinutes Time window in minutes (default: 60, max: 1440)
	 * @returns Recent metrics within the specified time window
	 */
	@Get('recent')
	@Public()
	getRecentMetrics(
		@Query('windowMinutes', new ParseIntPipe({ optional: true })) windowMinutes = 60
	) {
		const safeWindow = Math.min(Math.max(1, windowMinutes), 1440) // Clamp between 1-1440 minutes
		const windowMs = safeWindow * 60 * 1000
		
		this.logger.log(`Recent metrics requested (window: ${safeWindow} minutes)`)
		
		const metrics = this.performanceService.getMetricsInTimeWindow(windowMs)
		
		return {
			status: 'ok',
			timestamp: new Date().toISOString(),
			windowMinutes: safeWindow,
			count: metrics.length,
			data: metrics
		}
	}

	/**
	 * Get performance health status
	 * 
	 * Quick boolean health check based on performance thresholds.
	 * Useful for load balancers and monitoring systems.
	 * 
	 * @returns Health status with performance indicators
	 */
	@Get('health')
	@Public()
	getPerformanceHealth() {
		const stats = this.performanceService.getPerformanceStats()
		const summary = this.performanceService.getMetricsSummary()
		
		// Define health thresholds
		const thresholds = {
			avgResponseTime: 1000, // 1 second
			errorRate: 10, // 10%
			memoryUsage: 1024, // 1GB
			eventLoopUtilization: 90 // 90%
		}
		
		// Calculate health indicators
		const indicators = {
			responseTime: summary.avgResponseTime < thresholds.avgResponseTime,
			memory: summary.memoryUsageMB < thresholds.memoryUsage,
			eventLoop: stats.system.eventLoopUtilization < thresholds.eventLoopUtilization,
			errors: (stats.status.clientError + stats.status.serverError) / 
					 Math.max(1, stats.requests.total) * 100 < thresholds.errorRate
		}
		
		const isHealthy = Object.values(indicators).every(Boolean)
		
		// Log unhealthy conditions
		if (!isHealthy) {
			const issues = Object.entries(indicators)
				.filter(([_, healthy]) => !healthy)
				.map(([key, _]) => key)
			
			this.logger.warn(`Performance health issues detected: ${issues.join(', ')}`, {
				avgResponseTime: summary.avgResponseTime,
				memoryUsageMB: summary.memoryUsageMB,
				eventLoopUtilization: stats.system.eventLoopUtilization,
				errorRate: (stats.status.clientError + stats.status.serverError) / 
						  Math.max(1, stats.requests.total) * 100
			})
		}
		
		return {
			status: isHealthy ? 'healthy' : 'degraded',
			timestamp: new Date().toISOString(),
			healthy: isHealthy,
			indicators,
			thresholds,
			metrics: {
				avgResponseTime: summary.avgResponseTime,
				memoryUsageMB: summary.memoryUsageMB,
				eventLoopUtilization: stats.system.eventLoopUtilization,
				errorRatePercent: Math.round(
					(stats.status.clientError + stats.status.serverError) / 
					Math.max(1, stats.requests.total) * 100 * 100
				) / 100,
				totalRequests: stats.requests.total
			}
		}
	}

	/**
	 * Clear performance metrics
	 * 
	 * Useful for testing or resetting metrics collection.
	 * Should be protected in production environments.
	 */
	@Get('clear')
	@Public() // TODO: Add admin guard in production
	clearMetrics() {
		this.logger.warn('Performance metrics cleared via API')
		this.performanceService.clearMetrics()
		
		return {
			status: 'ok',
			timestamp: new Date().toISOString(),
			message: 'Performance metrics cleared'
		}
	}

	/**
	 * Get system resource usage
	 * 
	 * Current system metrics without historical data.
	 * Lightweight endpoint for system monitoring.
	 */
	@Get('system')
	@Public()
	getSystemMetrics() {
		const memUsage = process.memoryUsage()
		const cpuUsage = process.cpuUsage()
		
		// Calculate event loop utilization if available
		let eventLoopUtil = 0
		try {
			if (performance.eventLoopUtilization) {
				eventLoopUtil = performance.eventLoopUtilization().utilization
			}
		} catch {
			// Not available in older Node versions
		}
		
		return {
			status: 'ok',
			timestamp: new Date().toISOString(),
			system: {
				uptime: Math.round(process.uptime()),
				memory: {
					heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
					heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
					rssMB: Math.round(memUsage.rss / 1024 / 1024),
					externalMB: Math.round(memUsage.external / 1024 / 1024)
				},
				cpu: {
					userMicros: cpuUsage.user,
					systemMicros: cpuUsage.system
				},
				eventLoop: {
					utilizationPercent: Math.round(eventLoopUtil * 10000) / 100
				},
				process: {
					pid: process.pid,
					version: process.version,
					platform: process.platform,
					arch: process.arch
				}
			}
		}
	}
}