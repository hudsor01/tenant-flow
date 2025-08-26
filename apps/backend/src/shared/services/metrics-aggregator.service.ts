import { Injectable, Logger } from '@nestjs/common'
import { loadavg } from 'os'
import { UnifiedPerformanceMonitoringService } from './unified-performance-monitoring.service'
import { MemoryMonitoringService } from './memory-monitoring.service'

/**
 * Unified Metrics Dashboard
 */
export interface UnifiedMetricsDashboard {
	timestamp: string
	version: string
	status: 'healthy' | 'warning' | 'critical'
	
	// Overall health indicators
	health: {
		overall: 'healthy' | 'warning' | 'critical'
		performance: 'healthy' | 'warning' | 'critical'
		memory: 'healthy' | 'warning' | 'critical'
		system: 'healthy' | 'warning' | 'critical'
		issues: string[]
		alerts: number
	}
	
	// Real-time metrics
	realTime: {
		activeRequests: number
		requestsPerSecond: number
		avgResponseTimeMs: number
		errorRate: number
		memoryUsageMB: number
		cpuUtilization: number
		eventLoopUtilization: number
	}
	
	// Performance summary
	performance: {
		totalRequests: number
		successfulRequests: number
		failedRequests: number
		slowRequests: number
		p95ResponseTimeMs: number
		p99ResponseTimeMs: number
		topSlowPaths: {
			path: string
			avgDuration: number
			requestCount: number
		}[]
	}
	
	// Memory summary
	memory: {
		heapUsedMB: number
		heapTotalMB: number
		rssMB: number
		utilizationPercent: number
		trend: string
		gcRecommended: boolean
		fragmentationRatio: number
	}
	
	// System resources
	system: {
		uptime: number
		nodeVersion: string
		platform: string
		pid: number
		loadAverage?: number[]
	}
	
	// Recommendations
	recommendations: {
		type: 'optimization' | 'scaling' | 'maintenance' | 'alerting'
		priority: 'low' | 'medium' | 'high' | 'critical'
		message: string
		action?: string
	}[]
	
	// Historical trends (last hour)
	trends: {
		requestTrend: { timestamp: number; value: number }[]
		memoryTrend: { timestamp: number; value: number }[]
		errorRateTrend: { timestamp: number; value: number }[]
	}
}

/**
 * Prometheus-Compatible Metrics
 */
export interface PrometheusMetrics {
	// Counter metrics
	http_requests_total: { labels: Record<string, string>; value: number }[]
	http_request_duration_seconds: { labels: Record<string, string>; value: number }[]
	memory_usage_bytes: { labels: Record<string, string>; value: number }[]
	process_cpu_seconds_total: { value: number }
	process_uptime_seconds: { value: number }
	
	// Gauge metrics
	http_requests_active: { value: number }
	memory_heap_used_bytes: { value: number }
	memory_heap_total_bytes: { value: number }
	memory_rss_bytes: { value: number }
	event_loop_utilization: { value: number }
	
	// Histogram metrics (approximated)
	http_request_duration_histogram: {
		buckets: { le: string; count: number }[]
		sum: number
		count: number
	}
}

/**
 * Metrics Aggregator Service
 * 
 * Provides a unified interface for all monitoring data including:
 * - Performance metrics from UnifiedPerformanceMonitoringService
 * - Memory metrics from MemoryMonitoringService
 * - System metrics from Node.js APIs
 * - Unified health status and alerting
 * - Prometheus-compatible metrics export
 * - Real-time dashboard data
 */
@Injectable()
export class MetricsAggregatorService {
	private readonly logger = new Logger(MetricsAggregatorService.name)
	
	// Trend data storage (last hour)
	private readonly trendHistory = {
		requests: [] as { timestamp: number; value: number }[],
		memory: [] as { timestamp: number; value: number }[],
		errorRate: [] as { timestamp: number; value: number }[]
	}
	private trendCollectionInterval: NodeJS.Timeout | null = null
	
	constructor(
		private readonly performanceService: UnifiedPerformanceMonitoringService,
		private readonly memoryService: MemoryMonitoringService
	) {}

	/**
	 * Start trend data collection
	 * Should be called from main.ts after application startup
	 */
	startTrendCollection(): void {
		if (this.trendCollectionInterval) {
			this.logger.warn('Trend collection already started')
			return
		}
		
		// Collect trend data every minute
		this.trendCollectionInterval = setInterval(() => {
			this.collectTrendData()
		}, 60000)
		
		this.logger.log('Metrics trend collection started (1-minute intervals)')
	}

	/**
	 * Stop trend data collection
	 */
	stopTrendCollection(): void {
		if (this.trendCollectionInterval) {
			clearInterval(this.trendCollectionInterval)
			this.trendCollectionInterval = null
			this.logger.log('Metrics trend collection stopped')
		}
	}

	/**
	 * Get unified metrics dashboard
	 */
	getUnifiedMetricsDashboard(): UnifiedMetricsDashboard {
		const timestamp = new Date().toISOString()
		const performanceStats = this.performanceService.getEnhancedPerformanceStats()
		const performanceSummary = this.performanceService.getPerformanceSummary()
		const systemMetrics = this.performanceService.getSystemMetrics()
		const memoryStats = this.memoryService.getMemoryStatistics()
		const memorySummary = this.memoryService.getMemorySummary()
		
		// Calculate overall health
		const healthStatuses = [
			performanceStats.health.overall,
			memoryStats.health.status
		]
		const overallHealth = healthStatuses.includes('critical') ? 'critical'
			: healthStatuses.includes('warning') ? 'warning'
			: 'healthy'
		
		// Combine all issues
		const allIssues = [
			...performanceStats.health.issues,
			...memoryStats.health.issues
		]
		
		// Generate intelligent recommendations
		const recommendations = this.generateRecommendations(
			performanceStats,
			memoryStats,
			systemMetrics
		)
		
		return {
			timestamp,
			version: '2.0',
			status: overallHealth,
			
			health: {
				overall: overallHealth,
				performance: performanceStats.health.overall,
				memory: memoryStats.health.status,
				system: systemMetrics.eventLoop.isHealthy ? 'healthy' : 'warning',
				issues: allIssues,
				alerts: performanceStats.alerts.length
			},
			
			realTime: {
				activeRequests: systemMetrics.performance.activeRequests,
				requestsPerSecond: systemMetrics.performance.requestsPerSecond,
				avgResponseTimeMs: performanceSummary.avgResponseTime,
				errorRate: performanceSummary.errorRate,
				memoryUsageMB: memorySummary.heapUsedMB,
				cpuUtilization: systemMetrics.cpu.utilizationPercent,
				eventLoopUtilization: systemMetrics.eventLoop.utilizationPercent
			},
			
			performance: {
				totalRequests: performanceStats.requests.total,
				successfulRequests: performanceStats.requests.successful,
				failedRequests: performanceStats.requests.failed,
				slowRequests: performanceStats.requests.slow,
				p95ResponseTimeMs: performanceStats.response.p95Ms,
				p99ResponseTimeMs: performanceStats.response.p99Ms,
				topSlowPaths: performanceStats.slowestPaths.slice(0, 5).map(p => ({
					path: p.path,
					avgDuration: p.avgDuration,
					requestCount: p.requestCount
				}))
			},
			
			memory: {
				heapUsedMB: memorySummary.heapUsedMB,
				heapTotalMB: Math.round(memoryStats.current.heapTotal / 1024 / 1024),
				rssMB: memorySummary.rssMB,
				utilizationPercent: memorySummary.utilizationPercent,
				trend: memorySummary.trend,
				gcRecommended: memoryStats.gc.recommendForce,
				fragmentationRatio: Math.round(
					((memoryStats.current.heapTotal - memoryStats.current.heapUsed) / 
					 memoryStats.current.heapTotal) * 100
				) / 100
			},
			
			system: {
				uptime: systemMetrics.process.uptime,
				nodeVersion: systemMetrics.process.version,
				platform: systemMetrics.process.platform,
				pid: systemMetrics.process.pid,
				loadAverage: process.platform !== 'win32' ? loadavg() : undefined
			},
			
			recommendations,
			
			trends: {
				requestTrend: this.trendHistory.requests.slice(-60), // Last hour
				memoryTrend: this.trendHistory.memory.slice(-60),
				errorRateTrend: this.trendHistory.errorRate.slice(-60)
			}
		}
	}

	/**
	 * Get Prometheus-compatible metrics
	 */
	getPrometheusMetrics(): PrometheusMetrics {
		const performanceStats = this.performanceService.getEnhancedPerformanceStats()
		const systemMetrics = this.performanceService.getSystemMetrics()
		const memoryStats = this.memoryService.getMemoryStatistics()
		
		// Generate histograms approximation
		const requestDurations = this.performanceService.getActiveMetrics()
			.map(m => m.duration / 1000) // Convert to seconds
		const durationSum = requestDurations.reduce((a, b) => a + b, 0)
		
		// Create histogram buckets
		const buckets = [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
		const histogramBuckets = buckets.map(le => ({
			le: le.toString(),
			count: requestDurations.filter(d => d <= le).length
		}))
		
		return {
			// Counter metrics
			http_requests_total: [
				{ labels: { method: 'GET', status: '200' }, value: performanceStats.status.success },
				{ labels: { method: 'POST', status: '400' }, value: performanceStats.status.clientError },
				{ labels: { method: 'ALL', status: '500' }, value: performanceStats.status.serverError }
			],
			
			http_request_duration_seconds: requestDurations.map((duration, _i) => ({
				labels: { path: '/api', method: 'GET' }, // Simplified for example
				value: duration
			})),
			
			memory_usage_bytes: [
				{ labels: { type: 'heap_used' }, value: memoryStats.current.heapUsed },
				{ labels: { type: 'heap_total' }, value: memoryStats.current.heapTotal },
				{ labels: { type: 'rss' }, value: memoryStats.current.rss }
			],
			
			process_cpu_seconds_total: { 
				value: (systemMetrics.cpu.userMicros + systemMetrics.cpu.systemMicros) / 1_000_000 
			},
			
			process_uptime_seconds: { value: systemMetrics.process.uptime },
			
			// Gauge metrics
			http_requests_active: { value: systemMetrics.performance.activeRequests },
			memory_heap_used_bytes: { value: memoryStats.current.heapUsed },
			memory_heap_total_bytes: { value: memoryStats.current.heapTotal },
			memory_rss_bytes: { value: memoryStats.current.rss },
			event_loop_utilization: { value: systemMetrics.eventLoop.utilizationPercent / 100 },
			
			// Histogram metrics
			http_request_duration_histogram: {
				buckets: histogramBuckets,
				sum: durationSum,
				count: requestDurations.length
			}
		}
	}

	/**
	 * Export metrics in Prometheus text format
	 */
	getPrometheusTextFormat(): string {
		const metrics = this.getPrometheusMetrics()
		const lines: string[] = []
		
		// Helper function to format metric line
		const formatMetric = (name: string, labels: Record<string, string>, value: number) => {
			const labelStr = Object.entries(labels)
				.map(([k, v]) => `${k}="${v}"`)
				.join(',')
			return `${name}{${labelStr}} ${value}`
		}
		
		// Counter metrics
		lines.push('# HELP http_requests_total Total number of HTTP requests')
		lines.push('# TYPE http_requests_total counter')
		metrics.http_requests_total.forEach(metric => {
			lines.push(formatMetric('http_requests_total', metric.labels, metric.value))
		})
		
		// Gauge metrics
		lines.push('# HELP http_requests_active Currently active HTTP requests')
		lines.push('# TYPE http_requests_active gauge')
		lines.push(`http_requests_active ${metrics.http_requests_active.value}`)
		
		lines.push('# HELP memory_heap_used_bytes Current heap memory usage in bytes')
		lines.push('# TYPE memory_heap_used_bytes gauge')
		lines.push(`memory_heap_used_bytes ${metrics.memory_heap_used_bytes.value}`)
		
		lines.push('# HELP memory_rss_bytes Current RSS memory usage in bytes')
		lines.push('# TYPE memory_rss_bytes gauge')
		lines.push(`memory_rss_bytes ${metrics.memory_rss_bytes.value}`)
		
		lines.push('# HELP event_loop_utilization Event loop utilization ratio (0-1)')
		lines.push('# TYPE event_loop_utilization gauge')
		lines.push(`event_loop_utilization ${metrics.event_loop_utilization.value}`)
		
		// Process metrics
		lines.push('# HELP process_uptime_seconds Process uptime in seconds')
		lines.push('# TYPE process_uptime_seconds counter')
		lines.push(`process_uptime_seconds ${metrics.process_uptime_seconds.value}`)
		
		lines.push('# HELP process_cpu_seconds_total Process CPU time in seconds')
		lines.push('# TYPE process_cpu_seconds_total counter')
		lines.push(`process_cpu_seconds_total ${metrics.process_cpu_seconds_total.value}`)
		
		// Histogram
		lines.push('# HELP http_request_duration_histogram HTTP request duration histogram')
		lines.push('# TYPE http_request_duration_histogram histogram')
		metrics.http_request_duration_histogram.buckets.forEach(bucket => {
			lines.push(`http_request_duration_histogram_bucket{le="${bucket.le}"} ${bucket.count}`)
		})
		lines.push(`http_request_duration_histogram_sum ${metrics.http_request_duration_histogram.sum}`)
		lines.push(`http_request_duration_histogram_count ${metrics.http_request_duration_histogram.count}`)
		
		return lines.join('\n') + '\n'
	}

	/**
	 * Get health check summary for load balancers
	 */
	getHealthCheckSummary(): {
		status: 'pass' | 'warn' | 'fail'
		version: string
		releaseId: string
		notes: string[]
		output: string
		details: {
			uptime: number
			memory: { status: string; utilization: number }
			performance: { status: string; avgResponseTime: number }
			database: { status: string }
		}
	} {
		const dashboard = this.getUnifiedMetricsDashboard()
		
		const status = dashboard.status === 'healthy' ? 'pass'
			: dashboard.status === 'warning' ? 'warn'
			: 'fail'
		
		return {
			status,
			version: '2.0',
			releaseId: process.env.VERCEL_GIT_COMMIT_SHA || process.env.RAILWAY_GIT_COMMIT_SHA || 'unknown',
			notes: dashboard.health.issues,
			output: dashboard.recommendations
				.filter(r => r.priority === 'critical' || r.priority === 'high')
				.map(r => r.message)
				.join('; ') || 'All systems operational',
			details: {
				uptime: dashboard.system.uptime,
				memory: {
					status: dashboard.health.memory,
					utilization: dashboard.memory.utilizationPercent
				},
				performance: {
					status: dashboard.health.performance,
					avgResponseTime: dashboard.realTime.avgResponseTimeMs
				},
				database: {
					status: 'pass' // TODO: Integrate with Supabase health check
				}
			}
		}
	}

	/**
	 * Generate intelligent recommendations based on metrics
	 */
	private generateRecommendations(
		performanceStats: any,
		memoryStats: any,
		systemMetrics: any
	): UnifiedMetricsDashboard['recommendations'] {
		const recommendations: UnifiedMetricsDashboard['recommendations'] = []
		
		// Memory recommendations
		if (memoryStats.health.status === 'critical') {
			recommendations.push({
				type: 'maintenance',
				priority: 'critical',
				message: 'Critical memory usage detected',
				action: 'Consider forcing garbage collection or restarting the application'
			})
		} else if (memoryStats.trend.direction === 'increasing' && memoryStats.trend.rate > 20) {
			recommendations.push({
				type: 'alerting',
				priority: 'high',
				message: `Memory usage increasing rapidly at ${memoryStats.trend.rate} MB/min`,
				action: 'Monitor for potential memory leaks'
			})
		}
		
		// Performance recommendations
		if (performanceStats.response.p95Ms > 2000) {
			recommendations.push({
				type: 'optimization',
				priority: 'high',
				message: 'P95 response time exceeds 2 seconds',
				action: 'Review slowest paths and consider optimization'
			})
		}
		
		if (performanceStats.status.errorRate > 5) {
			recommendations.push({
				type: 'alerting',
				priority: 'high',
				message: `Error rate is ${performanceStats.status.errorRate.toFixed(1)}%`,
				action: 'Investigate recent errors and fix underlying issues'
			})
		}
		
		// Scaling recommendations
		if (systemMetrics.performance.requestsPerSecond > 50 && performanceStats.response.averageMs > 1000) {
			recommendations.push({
				type: 'scaling',
				priority: 'medium',
				message: 'High request volume with elevated response times',
				action: 'Consider scaling up or optimizing critical paths'
			})
		}
		
		// System recommendations
		if (systemMetrics.eventLoop.utilizationPercent > 80) {
			recommendations.push({
				type: 'optimization',
				priority: 'high',
				message: 'Event loop utilization is high',
				action: 'Review CPU-intensive operations and consider async alternatives'
			})
		}
		
		// Maintenance recommendations
		if (memoryStats.gc.recommendForce) {
			recommendations.push({
				type: 'maintenance',
				priority: 'medium',
				message: 'Garbage collection recommended',
				action: 'Force GC to reclaim memory'
			})
		}
		
		return recommendations
	}

	/**
	 * Collect trend data for dashboard
	 */
	private collectTrendData(): void {
		const now = Date.now()
		const summary = this.performanceService.getPerformanceSummary()
		const _memoryStats = this.memoryService.getMemoryStatistics()
		
		// Add current values
		this.trendHistory.requests.push({ timestamp: now, value: summary.requestsPerSecond })
		this.trendHistory.memory.push({ timestamp: now, value: summary.memoryUsageMB })
		this.trendHistory.errorRate.push({ timestamp: now, value: summary.errorRate })
		
		// Keep only last hour (60 data points at 1-minute intervals)
		const oneHourAgo = now - (60 * 60 * 1000)
		this.trendHistory.requests = this.trendHistory.requests.filter(p => p.timestamp > oneHourAgo)
		this.trendHistory.memory = this.trendHistory.memory.filter(p => p.timestamp > oneHourAgo)
		this.trendHistory.errorRate = this.trendHistory.errorRate.filter(p => p.timestamp > oneHourAgo)
	}

	/**
	 * Clear all trend data (useful for testing)
	 */
	clearTrendData(): void {
		this.trendHistory.requests.length = 0
		this.trendHistory.memory.length = 0
		this.trendHistory.errorRate.length = 0
		this.logger.log('Trend data cleared')
	}
}