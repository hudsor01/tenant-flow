import { Injectable } from '@nestjs/common'
import type { ServiceHealth, SystemHealth } from '@repo/shared'

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
export class MetricsService {
	private lastHealthCheck: SystemHealth | null = null
	private healthCheckCache = new Map<
		string,
		{ result: ServiceHealth; timestamp: number }
	>()

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
		return result
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
				cache: { memoryLimit: 100_000_000 }, // 100MB
				responseTime: { warning: 100, critical: 200 }
			},
			cache: {
				cacheSize: 0,
				memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
			}
		}
	}

	/**
	 * Update last health check for tracking
	 */
	updateLastHealthCheck(healthCheck: SystemHealth) {
		this.lastHealthCheck = healthCheck
	}
}
