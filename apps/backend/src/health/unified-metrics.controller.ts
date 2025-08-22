import { Controller, Get, Header, Logger } from '@nestjs/common'
import { Public } from '../shared/decorators/public.decorator'
import { MetricsAggregatorService } from '../shared/services/metrics-aggregator.service'
import { MemoryMonitoringService } from '../shared/services/memory-monitoring.service'

/**
 * Unified Metrics Controller
 * 
 * Provides a comprehensive monitoring API that consolidates:
 * - Performance metrics from UnifiedPerformanceMonitoringService
 * - Memory monitoring from MemoryMonitoringService
 * - System metrics from Node.js APIs
 * - Prometheus-compatible metrics export
 * - Health check endpoints for load balancers
 * - Real-time dashboard data
 * 
 * This controller serves as the single source of truth for all
 * application monitoring and observability data.
 */
@Controller('metrics')
export class UnifiedMetricsController {
	private readonly logger = new Logger(UnifiedMetricsController.name)

	constructor(
		private readonly metricsAggregator: MetricsAggregatorService,
		private readonly memoryService: MemoryMonitoringService
	) {}

	/**
	 * Get unified metrics dashboard
	 * 
	 * Comprehensive monitoring dashboard with all key metrics,
	 * health status, alerts, and intelligent recommendations.
	 * 
	 * Perfect for operations dashboards and monitoring UIs.
	 * 
	 * @returns Unified metrics dashboard
	 */
	@Get('dashboard')
	@Public()
	getMetricsDashboard() {
		this.logger.log('Unified metrics dashboard requested')
		
		const dashboard = this.metricsAggregator.getUnifiedMetricsDashboard()
		
		return {
			...dashboard,
			meta: {
				endpoint: '/metrics/dashboard',
				description: 'Unified monitoring dashboard with all key metrics',
				updateFrequency: 'Real-time with 15-second cache',
				version: '2.0'
			}
		}
	}

	/**
	 * Get Prometheus-compatible metrics
	 * 
	 * Standard Prometheus metrics format for integration with
	 * Prometheus, Grafana, and other monitoring tools.
	 * 
	 * @returns Prometheus metrics in text format
	 */
	@Get()
	@Public()
	@Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
	getPrometheusMetrics(): string {
		this.logger.debug('Prometheus metrics requested')
		return this.metricsAggregator.getPrometheusTextFormat()
	}

	/**
	 * Get Prometheus metrics in JSON format
	 * 
	 * Alternative JSON format for systems that prefer
	 * structured data over Prometheus text format.
	 * 
	 * @returns Prometheus metrics in JSON format
	 */
	@Get('json')
	@Public()
	getPrometheusMetricsJSON() {
		this.logger.debug('Prometheus JSON metrics requested')
		
		const metrics = this.metricsAggregator.getPrometheusMetrics()
		
		return {
			status: 'success',
			timestamp: new Date().toISOString(),
			format: 'prometheus-json',
			version: '2.0',
			data: metrics,
			meta: {
				description: 'Prometheus-compatible metrics in JSON format',
				textFormatEndpoint: '/metrics',
				specification: 'https://prometheus.io/docs/instrumenting/exposition_formats/'
			}
		}
	}

	/**
	 * Health check endpoint (RFC 7807 compliant)
	 * 
	 * Standardized health check for load balancers, orchestrators,
	 * and monitoring systems. Follows RFC 7807 format.
	 * 
	 * @returns Health check status with detailed information
	 */
	@Get('health')
	@Public()
	@Header('Content-Type', 'application/health+json')
	getHealthCheck() {
		const healthCheck = this.metricsAggregator.getHealthCheckSummary()
		
		// Log health issues
		if (healthCheck.status !== 'pass') {
			this.logger.warn(`Health check failed: ${healthCheck.status}`, {
				notes: healthCheck.notes,
				output: healthCheck.output
			})
		}
		
		return healthCheck
	}

	/**
	 * Memory-specific metrics and analysis
	 * 
	 * Detailed memory monitoring including usage trends,
	 * garbage collection recommendations, and leak detection.
	 * 
	 * @returns Memory metrics and analysis
	 */
	@Get('memory')
	@Public()
	getMemoryMetrics() {
		this.logger.log('Memory metrics requested')
		
		const memoryStats = this.memoryService.getMemoryStatistics()
		const memorySummary = this.memoryService.getMemorySummary()
		const memoryHistory = this.memoryService.getMemoryHistory(30) // Last 30 minutes
		
		return {
			status: 'success',
			timestamp: new Date().toISOString(),
			version: '2.0',
			summary: memorySummary,
			detailed: memoryStats,
			history: {
				duration: '30 minutes',
				dataPoints: memoryHistory.length,
				data: memoryHistory.map(h => ({
					timestamp: new Date(h.timestamp).toISOString(),
					heapUsedMB: Math.round(h.heapUsed / 1024 / 1024),
					rssMB: Math.round(h.rss / 1024 / 1024)
				}))
			},
			meta: {
				description: 'Comprehensive memory monitoring and analysis',
				monitoringInterval: '5 seconds',
				historyRetention: '30 minutes'
			}
		}
	}

	/**
	 * Force garbage collection (if enabled)
	 * 
	 * Manually triggers garbage collection for memory management.
	 * Requires Node.js --expose-gc flag to function.
	 * 
	 * WARNING: Should be used sparingly in production.
	 */
	@Get('memory/gc')
	@Public() // TODO: Add admin authentication in production
	forceGarbageCollection() {
		this.logger.warn('Manual garbage collection requested via API')
		
		const beforeStats = this.memoryService.getMemorySummary()
		
		try {
			this.memoryService.forceGarbageCollection()
			
			// Wait a moment for GC to complete
			setTimeout(() => {
				const afterStats = this.memoryService.getMemorySummary()
				const freedMB = beforeStats.heapUsedMB - afterStats.heapUsedMB
				
				this.logger.log('Manual GC completed', {
					beforeMB: beforeStats.heapUsedMB,
					afterMB: afterStats.heapUsedMB,
					freedMB
				})
			}, 100)
			
			return {
				status: 'success',
				timestamp: new Date().toISOString(),
				message: 'Garbage collection triggered',
				before: beforeStats,
				note: 'Check memory metrics after a few seconds to see the result'
			}
		} catch (error) {
			this.logger.error('Failed to force garbage collection', { error })
			
			return {
				status: 'error',
				timestamp: new Date().toISOString(),
				message: 'Garbage collection failed',
				error: error instanceof Error ? error.message : 'Unknown error',
				note: 'Ensure Node.js was started with --expose-gc flag'
			}
		}
	}

	/**
	 * Application information and build metadata
	 * 
	 * Provides application version, build information, and
	 * runtime configuration for debugging and monitoring.
	 */
	@Get('info')
	@Public()
	getApplicationInfo() {
		return {
			status: 'success',
			timestamp: new Date().toISOString(),
			version: '2.0',
			application: {
				name: 'TenantFlow Backend',
				version: process.env.npm_package_version || 'unknown',
				environment: process.env.NODE_ENV || 'unknown',
				platform: process.platform,
				nodeVersion: process.version,
				pid: process.pid,
				uptime: Math.round(process.uptime()),
				startTime: new Date(Date.now() - process.uptime() * 1000).toISOString()
			},
			build: {
				commitSha: process.env.VERCEL_GIT_COMMIT_SHA || 
						 process.env.RAILWAY_GIT_COMMIT_SHA || 
						 'unknown',
				deploymentId: process.env.VERCEL_DEPLOYMENT_ID || 
							process.env.RAILWAY_DEPLOYMENT_ID || 
							'unknown',
				buildTime: process.env.BUILD_TIME || 'unknown'
			},
			runtime: {
				memoryLimitMB: process.env.NODE_OPTIONS?.includes('max-old-space-size') 
					? parseInt(process.env.NODE_OPTIONS.match(/max-old-space-size=(\d+)/)?.[1] || '0')
					: 'default',
				timezone: process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone,
				locale: process.env.LANG || 'unknown'
			},
			monitoring: {
				performanceMonitoring: 'enabled',
				memoryMonitoring: 'enabled',
				metricsAggregation: 'enabled',
				prometheusExport: 'enabled',
				healthChecks: 'enabled'
			}
		}
	}

	/**
	 * Real-time metrics stream endpoint
	 * 
	 * Provides real-time metrics for live dashboards.
	 * Returns minimal data optimized for frequent polling.
	 */
	@Get('realtime')
	@Public()
	getRealTimeMetrics() {
		const dashboard = this.metricsAggregator.getUnifiedMetricsDashboard()
		
		return {
			status: dashboard.status,
			timestamp: dashboard.timestamp,
			realTime: dashboard.realTime,
			health: {
				overall: dashboard.health.overall,
				alerts: dashboard.health.alerts
			},
			recommendations: dashboard.recommendations
				.filter(r => r.priority === 'critical' || r.priority === 'high')
				.slice(0, 3), // Top 3 critical recommendations
			meta: {
				description: 'Real-time metrics optimized for frequent polling',
				updateFrequency: 'Real-time',
				dataLatency: '<1 second'
			}
		}
	}

	/**
	 * Export metrics for external monitoring systems
	 * 
	 * Provides metrics in various formats for integration with
	 * external monitoring, alerting, and analytics systems.
	 * 
	 * @param format Export format (json, csv, prometheus)
	 */
	@Get('export')
	@Public()
	exportMetrics() {
		this.logger.log('Metrics export requested')
		
		const dashboard = this.metricsAggregator.getUnifiedMetricsDashboard()
		const prometheus = this.metricsAggregator.getPrometheusMetrics()
		
		return {
			status: 'success',
			timestamp: new Date().toISOString(),
			version: '2.0',
			formats: {
				dashboard: dashboard,
				prometheus: prometheus,
				healthCheck: this.metricsAggregator.getHealthCheckSummary()
			},
			exportInfo: {
				generatedAt: new Date().toISOString(),
				dataLatency: 'Real-time to 15 seconds',
				coverage: 'Complete application metrics'
			},
			availableEndpoints: {
				dashboard: '/metrics/dashboard',
				prometheus: '/metrics',
				prometheusJson: '/metrics/json',
				health: '/metrics/health',
				memory: '/metrics/memory',
				realtime: '/metrics/realtime',
				info: '/metrics/info'
			}
		}
	}

	/**
	 * Clear metrics data (for testing and maintenance)
	 * 
	 * WARNING: This clears all historical metrics data.
	 * Should only be used in development or for testing.
	 */
	@Get('clear')
	@Public() // TODO: Add admin authentication in production
	clearAllMetrics() {
		this.logger.warn('Metrics data clearing requested via API')
		
		try {
			// Clear all monitoring services
			this.metricsAggregator.clearTrendData()
			this.memoryService.clearHistory()
			
			return {
				status: 'success',
				timestamp: new Date().toISOString(),
				message: 'All metrics data cleared',
				warning: 'This action cannot be undone',
				note: 'Metrics collection will resume immediately'
			}
		} catch (error) {
			this.logger.error('Failed to clear metrics data', { error })
			
			return {
				status: 'error',
				timestamp: new Date().toISOString(),
				message: 'Failed to clear metrics data',
				error: error instanceof Error ? error.message : 'Unknown error'
			}
		}
	}
}