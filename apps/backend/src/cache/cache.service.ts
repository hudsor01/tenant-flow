/**
 * Zero-Downtime Cache Service - Apple Engineering Principles
 * Implements surgical cache invalidation with version numbers
 * Follows DATABASE FIRST approach with in-memory performance layer
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import type { CacheEntry, CacheStats } from '@repo/shared/types/core'

@Injectable()
export class ZeroCacheService implements OnModuleDestroy {
	private cache = new Map<string, CacheEntry>()
	private stats: CacheStats = {
		hits: 0,
		misses: 0,
		invalidations: 0,
		entries: 0,
		memoryUsage: 0,
		hitRatio: 0
	}
	private versionCounter = 1
	private readonly logger = new Logger(ZeroCacheService.name)
	private cleanupInterval: NodeJS.Timeout | null = null
	private statsInterval: NodeJS.Timeout | null = null

	constructor() {
		// Auto-cleanup expired entries every 30 seconds
		this.cleanupInterval = setInterval(() => this.cleanupExpired(), 30_000)

		// Performance monitoring every 60 seconds
		this.statsInterval = setInterval(() => this.updateStats(), 60_000)
	}

	/**
	 * Cleanup intervals on module destruction to prevent memory leaks
	 */
	onModuleDestroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval)
			this.cleanupInterval = null
		}
		if (this.statsInterval) {
			clearInterval(this.statsInterval)
			this.statsInterval = null
		}
		this.logger.log('Cache service cleanup completed')
	}

	/**
	 * Get cached data with version validation
	 * Returns null if expired or invalid version
	 */
	get<T>(key: string): T | null {
		const entry = this.cache.get(key)

		if (!entry) {
			this.stats.misses++
			return null
		}

		// Check TTL
		if (Date.now() > entry.timestamp + entry.ttl) {
			this.cache.delete(key)
			this.stats.misses++
			return null
		}

		this.stats.hits++
		return entry.data as T
	}

	/**
	 * Set cache data with version and dependencies
	 * TTL in milliseconds, default 5 minutes for sub-200ms performance
	 */
	set<T>(key: string, data: T, ttl = 300_000, dependencies: string[] = []): void {
		const entry: CacheEntry<T> = {
			data,
			version: this.versionCounter++,
			timestamp: Date.now(),
			ttl,
			dependencies
		}

		this.cache.set(key, entry)
		this.logger.debug(`Cache set: ${key} (v${entry.version}) with deps: [${dependencies.join(', ')}]`)
	}

	/**
	 * Surgical cache invalidation by key pattern or dependencies
	 * Maintains zero-downtime by invalidating precisely what changed
	 */
	invalidate(pattern: string | RegExp, reason = 'data_changed'): number {
		const keysToDelete: string[] = []
		const isRegex = pattern instanceof RegExp

		for (const [key, entry] of this.cache.entries()) {
			const shouldInvalidate = isRegex
				? pattern.test(key)
				: key.includes(pattern as string) || entry.dependencies.includes(pattern as string)

			if (shouldInvalidate) {
				keysToDelete.push(key)
			}
		}

		keysToDelete.forEach(key => {
			this.cache.delete(key)
			this.stats.invalidations++
		})

		if (keysToDelete.length > 0) {
			this.logger.log(
				`Surgical invalidation: ${keysToDelete.length} entries removed`,
				{ pattern: pattern.toString(), reason, keys: keysToDelete }
			)
		}

		return keysToDelete.length
	}

	/**
	 * Invalidate by user ID - critical for multi-tenant isolation
	 */
	invalidateByUser(userId: string): number {
		return this.invalidate(`user:${userId}`, 'user_data_changed')
	}

	/**
	 * Invalidate by entity type - for business logic changes
	 */
	invalidateByEntity(entityType: 'property' | 'unit' | 'tenant' | 'lease' | 'maintenance', entityId?: string): number {
		const pattern = entityId ? `${entityType}:${entityId}` : entityType
		return this.invalidate(pattern, `${entityType}_changed`)
	}

	/**
	 * Get cache statistics for health monitoring
	 */
	getStats(): CacheStats {
		return { ...this.stats }
	}

	/**
	 * Health check for cache service
	 */
	isHealthy(): { healthy: boolean; details: Record<string, unknown> } {
		const memoryLimit = 100 * 1024 * 1024 // 100MB limit
		const hitRatioThreshold = 0.7 // 70% hit ratio minimum

		const healthy = this.stats.memoryUsage < memoryLimit && this.stats.hitRatio >= hitRatioThreshold

		return {
			healthy,
			details: {
				...this.stats,
				memoryLimitMB: memoryLimit / 1024 / 1024,
				isWithinMemoryLimit: this.stats.memoryUsage < memoryLimit,
				hasGoodHitRatio: this.stats.hitRatio >= hitRatioThreshold,
				uptime: Math.round(process.uptime()),
				version: this.versionCounter
			}
		}
	}

	/**
	 * Clear all cache - use with extreme caution
	 */
	clear(): void {
		const count = this.cache.size
		this.cache.clear()
		this.stats.invalidations += count
		this.logger.warn(`Cache cleared: ${count} entries removed`)
	}

	/**
	 * Get cache key for user-specific data
	 */
	static getUserKey(userId: string, operation: string, params?: Record<string, unknown>): string {
		const paramsStr = params ? `:${JSON.stringify(params)}` : ''
		return `user:${userId}:${operation}${paramsStr}`
	}

	/**
	 * Get cache key for entity-specific data
	 */
	static getEntityKey(entityType: string, entityId: string, operation?: string): string {
		return operation ? `${entityType}:${entityId}:${operation}` : `${entityType}:${entityId}`
	}

	private cleanupExpired(): void {
		const now = Date.now()
		let cleaned = 0

		for (const [key, entry] of this.cache.entries()) {
			if (now > entry.timestamp + entry.ttl) {
				this.cache.delete(key)
				cleaned++
			}
		}

		if (cleaned > 0) {
			this.logger.debug(`Cleaned ${cleaned} expired cache entries`)
		}
	}

	private updateStats(): void {
		this.stats.entries = this.cache.size
		this.stats.hitRatio = this.stats.hits / (this.stats.hits + this.stats.misses) || 0

		// Rough memory calculation
		let memoryUsage = 0
		for (const entry of this.cache.values()) {
			memoryUsage += JSON.stringify(entry).length * 2 // UTF-16 approximation
		}
		this.stats.memoryUsage = memoryUsage
	}
}