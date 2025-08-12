import { Injectable } from '@nestjs/common'
import { LoggerService } from './logger.service'
import * as os from 'os'
import * as process from 'process'

export interface PerformanceMetric {
	operation: string
	duration: number
	success: boolean
	metadata?: Record<string, unknown>
	timestamp: Date
}

export interface SystemMetrics {
	cpu: {
		usage: number
		loadAverage: number[]
	}
	memory: {
		heapUsed: number
		heapTotal: number
		rss: number
		external: number
		arrayBuffers: number
		percentUsed: number
	}
	system: {
		uptime: number
		platform: string
		nodeVersion: string
		totalMemory: number
		freeMemory: number
	}
}

@Injectable()
export class MetricsService {
	private metrics: PerformanceMetric[] = []
	private readonly maxMetrics = 1000 // Keep last 1000 metrics in memory

	constructor(private readonly logger: LoggerService) {
		if (this.logger && typeof this.logger.setContext === 'function') {
			this.logger.setContext('MetricsService')
		}

		// Log system metrics every 5 minutes
		setInterval(
			() => {
				this.logSystemMetrics()
			},
			5 * 60 * 1000
		)
	}

	// Record a performance metric
	recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
		const fullMetric: PerformanceMetric = {
			...metric,
			timestamp: new Date()
		}

		this.metrics.push(fullMetric)

		// Keep only the last maxMetrics entries
		if (this.metrics.length > this.maxMetrics) {
			this.metrics.shift()
		}

		// Log slow operations
		if (metric.duration > 1000) {
			this.logger.warn(
				`Slow operation detected - ${metric.operation}: ${metric.duration}ms`
			)
		}

		// Log performance metric
		this.logger.logPerformance(metric.operation, metric.duration, {
			success: metric.success,
			...metric.metadata
		})
	}

	// Track async operation performance
	async trackPerformance<T>(
		operation: string,
		fn: () => Promise<T>,
		metadata?: Record<string, unknown>
	): Promise<T> {
		const startTime = Date.now()
		let success = true

		try {
			const result = await fn()
			return result
		} catch (error) {
			success = false
			throw error
		} finally {
			const duration = Date.now() - startTime
			this.recordMetric({
				operation,
				duration,
				success,
				metadata
			})
		}
	}

	// Track sync operation performance
	trackSync<T>(
		operation: string,
		fn: () => T,
		metadata?: Record<string, unknown>
	): T {
		const startTime = Date.now()
		let success = true

		try {
			const result = fn()
			return result
		} catch (error) {
			success = false
			throw error
		} finally {
			const duration = Date.now() - startTime
			this.recordMetric({
				operation,
				duration,
				success,
				metadata
			})
		}
	}

	// Get current system metrics
	getSystemMetrics(): SystemMetrics {
		const memUsage = process.memoryUsage()
		const totalMem = os.totalmem()
		const freeMem = os.freemem()

		return {
			cpu: {
				usage: process.cpuUsage().user / 1000, // Convert to milliseconds
				loadAverage: os.loadavg()
			},
			memory: {
				heapUsed: memUsage.heapUsed,
				heapTotal: memUsage.heapTotal,
				rss: memUsage.rss,
				external: memUsage.external,
				arrayBuffers: memUsage.arrayBuffers,
				percentUsed: (memUsage.heapUsed / memUsage.heapTotal) * 100
			},
			system: {
				uptime: process.uptime(),
				platform: os.platform(),
				nodeVersion: process.version,
				totalMemory: totalMem,
				freeMemory: freeMem
			}
		}
	}

	// Log system metrics
	private logSystemMetrics(): void {
		const metrics = this.getSystemMetrics()

		this.logger.logWithMetadata('info', 'System metrics', {
			cpu: metrics.cpu,
			memory: {
				heapUsedMB: Math.round(metrics.memory.heapUsed / 1024 / 1024),
				heapTotalMB: Math.round(metrics.memory.heapTotal / 1024 / 1024),
				rssMB: Math.round(metrics.memory.rss / 1024 / 1024),
				percentUsed: metrics.memory.percentUsed.toFixed(2)
			},
			system: {
				uptimeHours: (metrics.system.uptime / 3600).toFixed(2),
				freeMemoryGB: (
					metrics.system.freeMemory /
					1024 /
					1024 /
					1024
				).toFixed(2),
				totalMemoryGB: (
					metrics.system.totalMemory /
					1024 /
					1024 /
					1024
				).toFixed(2)
			}
		})

		// Alert on high memory usage - use RSS vs system memory for more accurate alerts
		const rssMemoryPercent =
			(metrics.memory.rss / metrics.system.totalMemory) * 100
		const heapUsedMB = Math.round(metrics.memory.heapUsed / 1024 / 1024)

		// Alert if RSS memory exceeds 80% of system memory OR heap exceeds 3GB
		if (rssMemoryPercent > 80 || heapUsedMB > 3072) {
			this.logger.logWithMetadata('warn', 'High memory usage detected', {
				rssMemoryPercent: rssMemoryPercent.toFixed(2),
				heapUsedMB,
				heapTotalMB: Math.round(metrics.memory.heapTotal / 1024 / 1024),
				systemMemoryGB: (
					metrics.system.totalMemory /
					1024 /
					1024 /
					1024
				).toFixed(2)
			})
		}
	}

	// Get performance statistics
	getPerformanceStats(operation?: string): Record<string, unknown> {
		const relevantMetrics = operation
			? this.metrics.filter(m => m.operation === operation)
			: this.metrics

		if (relevantMetrics.length === 0) {
			return { message: 'No metrics available' }
		}

		const durations = relevantMetrics.map(m => m.duration)
		const successCount = relevantMetrics.filter(m => m.success).length
		const failureCount = relevantMetrics.length - successCount

		return {
			operation,
			count: relevantMetrics.length,
			successCount,
			failureCount,
			successRate: (successCount / relevantMetrics.length) * 100,
			avgDuration:
				durations.reduce((a, b) => a + b, 0) / durations.length,
			minDuration: Math.min(...durations),
			maxDuration: Math.max(...durations),
			p50: this.percentile(durations, 50),
			p95: this.percentile(durations, 95),
			p99: this.percentile(durations, 99)
		}
	}

	// Calculate percentile
	private percentile(values: number[], percentile: number): number {
		const sorted = [...values].sort((a, b) => a - b)
		const index = Math.ceil((percentile / 100) * sorted.length) - 1
		return sorted[index] || 0
	}

	// Clear metrics
	clearMetrics(): void {
		this.metrics = []
		this.logger.log('Performance metrics cleared')
	}

	// Export metrics for external monitoring
	exportMetrics(): PerformanceMetric[] {
		return [...this.metrics]
	}
}
