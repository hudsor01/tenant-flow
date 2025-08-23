import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { performanceConfig } from '../config/performance.config'

interface PerformanceMetrics {
	requestCount: number
	errorCount: number
	responseTimes: number[]
	memoryUsage: {
		heapUsed: number
		heapTotal: number
		rss: number
		external: number
	}
	timestamp: Date
}

@Injectable()
export class PerformanceMonitorService implements OnModuleInit, OnModuleDestroy {
	private metrics: PerformanceMetrics = {
		requestCount: 0,
		errorCount: 0,
		responseTimes: [],
		memoryUsage: {
			heapUsed: 0,
			heapTotal: 0,
			rss: 0,
			external: 0
		},
		timestamp: new Date()
	}

	private intervalId?: NodeJS.Timeout

	onModuleInit() {
		// Start periodic metrics collection
		this.intervalId = setInterval(
			() => this.collectMetrics(),
			performanceConfig.monitoring.metricsInterval
		)
	}

	onModuleDestroy() {
		if (this.intervalId) {
			clearInterval(this.intervalId)
		}
	}

	/**
	 * Record a request and its response time
	 */
	recordRequest(responseTime: number, isError = false) {
		this.metrics.requestCount++
		this.metrics.responseTimes.push(responseTime)

		if (isError) {
			this.metrics.errorCount++
		}

		// Keep only last 1000 response times to prevent memory issues
		if (this.metrics.responseTimes.length > 1000) {
			this.metrics.responseTimes = this.metrics.responseTimes.slice(-1000)
		}
	}

	/**
	 * Collect current system metrics
	 */
	private collectMetrics() {
		const memUsage = process.memoryUsage()

		this.metrics.memoryUsage = {
			heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
			heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
			rss: Math.round(memUsage.rss / 1024 / 1024), // MB
			external: Math.round(memUsage.external / 1024 / 1024) // MB
		}

		this.metrics.timestamp = new Date()

		// Check memory thresholds
		this.checkMemoryThresholds()
	}

	/**
	 * Check if memory usage exceeds thresholds
	 */
	private checkMemoryThresholds() {
		const { heapUsed, rss } = this.metrics.memoryUsage
		const { memory } = performanceConfig

		if (heapUsed > memory.heapUsed.critical) {
			console.error(`CRITICAL: Heap memory usage (${heapUsed}MB) exceeds critical threshold (${memory.heapUsed.critical}MB)`)
		} else if (heapUsed > memory.heapUsed.warning) {
			console.warn(`WARNING: Heap memory usage (${heapUsed}MB) exceeds warning threshold (${memory.heapUsed.warning}MB)`)
		}

		if (rss > memory.rss.critical) {
			console.error(`CRITICAL: RSS memory usage (${rss}MB) exceeds critical threshold (${memory.rss.critical}MB)`)
		} else if (rss > memory.rss.warning) {
			console.warn(`WARNING: RSS memory usage (${rss}MB) exceeds warning threshold (${memory.rss.warning}MB)`)
		}
	}

	/**
	 * Get current performance metrics
	 */
	getMetrics(): PerformanceMetrics & { percentiles: Record<string, number> } {
		const sortedTimes = [...this.metrics.responseTimes].sort((a, b) => a - b)
		const percentiles = this.calculatePercentiles(sortedTimes)

		return {
			...this.metrics,
			percentiles
		}
	}

	/**
	 * Calculate response time percentiles
	 */
	private calculatePercentiles(sortedTimes: number[]): Record<string, number> {
		if (sortedTimes.length === 0) {
			return { p50: 0, p95: 0, p99: 0 }
		}

		const p50Index = Math.floor(sortedTimes.length * 0.5)
		const p95Index = Math.floor(sortedTimes.length * 0.95)
		const p99Index = Math.floor(sortedTimes.length * 0.99)

		return {
			p50: sortedTimes[p50Index] || 0,
			p95: sortedTimes[p95Index] || 0,
			p99: sortedTimes[p99Index] || 0
		}
	}

	/**
	 * Reset metrics (useful for testing)
	 */
	resetMetrics() {
		this.metrics = {
			requestCount: 0,
			errorCount: 0,
			responseTimes: [],
			memoryUsage: {
				heapUsed: 0,
				heapTotal: 0,
				rss: 0,
				external: 0
			},
			timestamp: new Date()
		}
	}

	/**
	 * Get health status based on current metrics
	 */
	getHealthStatus(): 'healthy' | 'degraded' | 'unhealthy' {
		const { heapUsed, rss } = this.metrics.memoryUsage
		const { memory, thresholds } = performanceConfig

		// Check memory
		if (heapUsed > memory.heapUsed.critical || rss > memory.rss.critical) {
			return 'unhealthy'
		}

		// Check response times
		const percentiles = this.calculatePercentiles([...this.metrics.responseTimes].sort((a, b) => a - b))
		if (percentiles.p95 && percentiles.p95 > thresholds.api.p95) {
			return 'degraded'
		}

		// Check error rate
		const errorRate = this.metrics.requestCount > 0 
			? this.metrics.errorCount / this.metrics.requestCount 
			: 0
		if (errorRate > 0.05) { // 5% error rate
			return 'degraded'
		}

		return 'healthy'
	}
}