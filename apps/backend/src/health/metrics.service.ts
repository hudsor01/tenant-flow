import { Injectable, OnModuleDestroy } from '@nestjs/common'
import type { ServiceHealth, SystemHealth } from '@repo/shared/types/health'

export interface PerformanceMetrics {
	uptime: number
	memory: {
		used: number
		free: number
		total: number
		usagePercent: number
	}
	cpu: {
		user: number
		system: number
	}
}

@Injectable()
export class MetricsService implements OnModuleDestroy {
	private lastHealthCheck: SystemHealth | null = null
	private healthCheckCache = new Map<
		string,
		{ result: ServiceHealth; timestamp: number }
	>()
	private readonly MAX_CACHE_SIZE = 100

	/**
	 * Cleanup cache on module destruction to prevent memory leaks
	 */
	onModuleDestroy(): void {
		this.healthCheckCache.clear()
	}

	/**
	 * Get system performance metrics
	 */
	getPerformanceMetrics(): PerformanceMetrics {
		const memoryUsage = process.memoryUsage()
		const cpuUsage = process.cpuUsage()

		return {
			uptime: Math.round(process.uptime()),
			memory: {
				used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
				free: Math.round(
					(memoryUsage.heapTotal - memoryUsage.heapUsed) / 1024 / 1024
				),
				total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
				usagePercent: Math.round(
					(memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
				)
			},
			cpu: {
				user: Math.round(cpuUsage.user / 1000),
				system: Math.round(cpuUsage.system / 1000)
			}
		}
	}

	/**
	 * Get performance metrics with thresholds and history
	 */
	getDetailedPerformanceMetrics() {
		const performance = this.getPerformanceMetrics()

		return {
			...performance,
			healthCheckHistory: this.lastHealthCheck
				? {
						lastStatus: this.lastHealthCheck.status,
						lastCheck: this.lastHealthCheck.timestamp
					}
				: null,
		thresholds: {
				memory: { warning: 80, critical: 95 },
				cache: { maxEntries: 100 }, // max entries (100)
				responseTime: { warning: 100, critical: 200 }
			},
			cache: {
				cacheSize: this.healthCheckCache.size,
				heapUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
			}
		}
	}

	/**
	 * Cache health check results for better performance
	 */
	async getCachedOrFresh<T>(
		key: string,
		fn: () => Promise<T>,
		maxAge: number
	): Promise<T> {
		const cached = this.healthCheckCache.get(key) as
			| { result: T; timestamp: number }
			| undefined

		if (cached && Date.now() - cached.timestamp < maxAge) {
			return cached.result
		}

		const result = await fn()
		this.healthCheckCache.set(key, {
			result: result as ServiceHealth,
			timestamp: Date.now()
		})

		// Prevent memory leaks by limiting cache size
		if (this.healthCheckCache.size > this.MAX_CACHE_SIZE) {
			// Remove oldest entries (simple LRU approximation)
			const entries = Array.from(this.healthCheckCache.entries())
			entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
			const toRemove = Math.min(
				this.healthCheckCache.size - this.MAX_CACHE_SIZE,
				entries.length
			)
			for (let i = 0; i < toRemove; i++) {
				const entry = entries[i]
				if (entry) {
					this.healthCheckCache.delete(entry[0])
				}
			}
		}

		return result
	}

	/**
	 * Update last health check for tracking
	 */
	updateLastHealthCheck(healthCheck: SystemHealth) {
		this.lastHealthCheck = healthCheck
	}
}
