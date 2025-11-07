import { Injectable, OnModuleDestroy } from '@nestjs/common'
import type { ServiceHealth, SystemHealth } from '@repo/shared/types/health'
import { evictOldestEntries } from '../utils/cache-eviction'

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

export interface DetailedPerformanceMetrics extends PerformanceMetrics {
	healthCheckHistory: {
		lastStatus: string
		lastCheck: string
	} | null
	thresholds: {
		memory: { warning: number; critical: number }
		cache: { maxEntries: number }
		responseTime: { warning: number; critical: number }
	}
	cache: {
		cacheSize: number
		heapUsageMb: number
	}
}

export interface MetricsThresholds {
	memory: { warning: number; critical: number }
	cache: { maxEntries: number }
	responseTime: { warning: number; critical: number }
}

@Injectable()
export class MetricsService implements OnModuleDestroy {
	private lastHealthCheck: SystemHealth | null = null
	private healthCheckCache = new Map<
		string,
		{ result: ServiceHealth; timestamp: number }
	>()
	
	private readonly thresholds: MetricsThresholds
	private readonly MAX_CACHE_SIZE: number

	constructor(thresholds?: Partial<MetricsThresholds>) {
		const defaultThresholds: MetricsThresholds = {
			memory: { warning: 80, critical: 95 },
			cache: { maxEntries: 100 },
			responseTime: { warning: 100, critical: 200 }
		}

		this.thresholds = {
			memory: thresholds?.memory ?? defaultThresholds.memory,
			cache: thresholds?.cache ?? defaultThresholds.cache,
			responseTime: thresholds?.responseTime ?? defaultThresholds.responseTime
		}

		this.MAX_CACHE_SIZE = this.thresholds.cache.maxEntries
	}

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
	getDetailedPerformanceMetrics(): DetailedPerformanceMetrics {
		const performance = this.getPerformanceMetrics()

		return {
			...performance,
			healthCheckHistory: this.lastHealthCheck
				? {
						lastStatus: this.lastHealthCheck.status,
						lastCheck: this.lastHealthCheck.timestamp
					}
				: null,
			thresholds: this.thresholds,
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
		evictOldestEntries(this.healthCheckCache, this.MAX_CACHE_SIZE)

		return result
	}

	/**
	 * Update last health check for tracking
	 */
	updateLastHealthCheck(healthCheck: SystemHealth) {
		this.lastHealthCheck = healthCheck
	}
}
