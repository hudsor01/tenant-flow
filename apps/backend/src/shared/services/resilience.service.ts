/**
 * Resilience Service - Zero-Downtime Architecture
 * Ultra-simple implementation following CLAUDE.md principles
 * Integrates with existing PinoLogger patterns
 */

import { Injectable, Optional } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'

interface CacheEntry<T = any> {
	data: T
	timestamp: number
	ttl: number
}

@Injectable()
export class ResilienceService {
	private cache = new Map<string, CacheEntry>()

	constructor(@Optional() private readonly logger?: PinoLogger) {
		// Auto-cleanup expired entries every 30 seconds
		setInterval(() => this.cleanupExpired(), 30_000)
	}

	/**
	 * Execute operation with cache fallback for zero-downtime
	 */
	async executeWithCache<T>(
		cacheKey: string,
		operation: () => Promise<T>,
		cacheTtl = 300_000 // 5 minutes
	): Promise<T> {
		// Try cache first for performance
		const cached = this.get<T>(cacheKey)
		if (cached !== null) {
			return cached
		}

		try {
			// Execute operation
			const result = await operation()

			// Cache successful result
			this.set(cacheKey, result, cacheTtl)

			return result
		} catch (error) {
			// If we have cached data, return it as fallback
			const fallbackCached = this.getExpired<T>(cacheKey)
			if (fallbackCached !== null) {
				this.logger?.warn(
					{ error: error.message, cacheKey },
					'Operation failed, returning cached fallback data'
				)
				return fallbackCached
			}

			// No fallback available, re-throw
			throw error
		}
	}

	/**
	 * Invalidate cache by pattern for surgical updates
	 */
	invalidate(pattern: string): number {
		let count = 0
		for (const [key] of this.cache.entries()) {
			if (key.includes(pattern)) {
				this.cache.delete(key)
				count++
			}
		}

		if (count > 0) {
			this.logger?.debug({ pattern, count }, 'Cache invalidation completed')
		}

		return count
	}

	/**
	 * Get cache key for user-specific data
	 */
	static getUserKey(userId: string, operation: string, params?: any): string {
		const paramsStr = params ? `:${JSON.stringify(params)}` : ''
		return `user:${userId}:${operation}${paramsStr}`
	}

	/**
	 * Get health status for monitoring
	 */
	getHealthStatus() {
		const now = Date.now()
		let expiredCount = 0

		for (const entry of this.cache.values()) {
			if (now > entry.timestamp + entry.ttl) {
				expiredCount++
			}
		}

		return {
			healthy: true,
			entries: this.cache.size,
			expired: expiredCount,
			memoryUsage: this.estimateMemoryUsage()
		}
	}

	private get<T>(key: string): T | null {
		const entry = this.cache.get(key)
		if (!entry) return null

		// Check if expired
		if (Date.now() > entry.timestamp + entry.ttl) {
			this.cache.delete(key)
			return null
		}

		return entry.data as T
	}

	private getExpired<T>(key: string): T | null {
		const entry = this.cache.get(key)
		return entry ? (entry.data as T) : null
	}

	private set<T>(key: string, data: T, ttl: number): void {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl
		})
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
			this.logger?.debug({ cleaned }, 'Cleaned expired cache entries')
		}
	}

	private estimateMemoryUsage(): number {
		let size = 0
		for (const entry of this.cache.values()) {
			size += JSON.stringify(entry).length * 2 // UTF-16 approximation
		}
		return size
	}
}