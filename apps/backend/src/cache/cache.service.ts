/**
 * Unified Redis Cache Service
 * Consolidates cache layers into a single Redis-backed cache with TTL tiers.
 */

import type { OnModuleDestroy } from '@nestjs/common'
import { Inject, Injectable } from '@nestjs/common'
import Redis from 'ioredis'
import type { CacheStats } from '@repo/shared/types/core'
import { AppConfigService } from '../config/app-config.service'
import { AppLogger } from '../logger/app-logger.service'
import {
	MODULE_OPTIONS_TOKEN,
	type CacheModuleOptions
} from './cache.module-definition'

type CacheTier = 'short' | 'medium' | 'long'

type CacheSetOptions = {
	ttlMs?: number
	tier?: CacheTier
	tags?: string[]
}

type InMemoryEntry = {
	value: string
	expiresAt?: number
	tags?: string[]
}

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
	private readonly stats: CacheStats = {
		hits: 0,
		misses: 0,
		invalidations: 0,
		entries: 0,
		memoryUsage: 0,
		hitRatio: 0
	}
	private readonly keyPrefix: string
	private readonly ttlConfig: Record<CacheTier, number>
	private redis: Redis | null = null
	private readonly fallbackCache = new Map<string, InMemoryEntry>()
	private cleanupInterval: NodeJS.Timeout | null = null

	constructor(
		@Inject(MODULE_OPTIONS_TOKEN) options: CacheModuleOptions,
		private readonly config: AppConfigService,
		private readonly logger: AppLogger
	) {
		this.keyPrefix = options.keyPrefix ?? 'cache'
		this.ttlConfig = {
			short: options.ttlShortMs ?? 30_000,
			medium: options.ttlMediumMs ?? 5 * 60 * 1000,
			long: options.ttlLongMs ?? 30 * 60 * 1000
		}

		const redisConfig = this.config.getRedisConfig()
		if (redisConfig.url || redisConfig.host) {
			this.redis = redisConfig.url
				? new Redis(redisConfig.url)
				: new Redis({
					...(redisConfig.host ? { host: redisConfig.host } : {}),
					...(redisConfig.port ? { port: redisConfig.port } : {}),
					...(redisConfig.username ? { username: redisConfig.username } : {}),
					...(redisConfig.password ? { password: redisConfig.password } : {}),
					...(redisConfig.db ? { db: redisConfig.db } : {}),
					...(redisConfig.tls ? { tls: {} } : {})
				})

			this.redis.on('error', error => {
				this.logger.error('Redis cache error', {
					error: error instanceof Error ? error.message : String(error)
				})
			})
		} else {
			this.logger.warn(
				'Redis cache not configured; falling back to in-memory cache'
			)
			this.cleanupInterval = setInterval(() => this.cleanupExpired(), 30_000)
		}
	}

	onModuleDestroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval)
			this.cleanupInterval = null
		}
		if (this.redis) {
			this.redis.disconnect()
			this.redis = null
		}
		this.fallbackCache.clear()
	}

	async get<T>(key: string): Promise<T | null> {
		const cacheKey = this.buildKey(key)

		if (this.redis) {
			try {
				const cached = await this.redis.get(cacheKey)
				if (!cached) {
					this.stats.misses++
					return null
				}
				try {
					this.stats.hits++
					return JSON.parse(cached) as T
				} catch (parseError) {
					this.stats.misses++
					this.logger.warn('Failed to parse cached value; evicting key', {
						key,
						error: parseError instanceof Error ? parseError.message : String(parseError)
					})
					await this.redis.del(cacheKey).catch(() => {})
					return null
				}
			} catch (error) {
				// Redis connection failed - fall back to in-memory cache
				this.logger.warn('Redis get failed, falling back to in-memory cache', {
					key,
					error: error instanceof Error ? error.message : String(error)
				})
			}
		}

		// In-memory fallback
		const entry = this.fallbackCache.get(cacheKey)
		if (!entry) {
			this.stats.misses++
			return null
		}

		if (entry.expiresAt && Date.now() > entry.expiresAt) {
			this.fallbackCache.delete(cacheKey)
			this.stats.misses++
			return null
		}

		this.stats.hits++
		return JSON.parse(entry.value) as T
	}

	async set<T>(key: string, data: T, options?: CacheSetOptions): Promise<void> {
		const cacheKey = this.buildKey(key)
		const ttlMs = options?.ttlMs ?? this.ttlConfig[options?.tier ?? 'medium']
		const payload = JSON.stringify(data)

		if (this.redis) {
			try {
				const pipeline = this.redis.pipeline()
				if (ttlMs > 0) {
					pipeline.set(cacheKey, payload, 'PX', ttlMs)
				} else {
					pipeline.set(cacheKey, payload)
				}

				if (options?.tags && options.tags.length > 0) {
					const tagKey = this.keyTagsKey(cacheKey)
					pipeline.del(tagKey)
					pipeline.sadd(tagKey, ...options.tags)
					for (const tag of options.tags) {
						pipeline.sadd(this.tagKey(tag), cacheKey)
					}
				}

				await pipeline.exec()
				return
			} catch (error) {
				// Redis connection failed - fall back to in-memory cache
				this.logger.warn('Redis set failed, falling back to in-memory cache', {
					key,
					error: error instanceof Error ? error.message : String(error)
				})
			}
		}

		// In-memory fallback
		const entry: InMemoryEntry = {
			value: payload,
			...(ttlMs > 0 ? { expiresAt: Date.now() + ttlMs } : {}),
			...(options?.tags?.length ? { tags: options.tags } : {})
		}
		this.fallbackCache.set(cacheKey, entry)
	}

	async del(keys: string | string[]): Promise<void> {
		const normalized = Array.isArray(keys) ? keys : [keys]
		const cacheKeys = normalized.map(key => this.buildKey(key))

		if (this.redis) {
			try {
				if (cacheKeys.length === 0) return

				// Batch fetch all tag sets in one pipeline (single round trip)
				const tagKeys = cacheKeys.map(key => this.keyTagsKey(key))
				const fetchPipeline = this.redis.pipeline()
				for (const tagKey of tagKeys) {
					fetchPipeline.smembers(tagKey)
				}
				const tagResults = await fetchPipeline.exec()

				// Build single pipeline for all deletions (single round trip)
				const deletePipeline = this.redis.pipeline()
				for (let i = 0; i < cacheKeys.length; i++) {
					const cacheKey = cacheKeys[i] as string
					const tagKey = tagKeys[i] as string
					const result = tagResults?.[i]
					const tags = (result?.[1] as string[]) ?? []

					for (const tag of tags) {
						deletePipeline.srem(this.tagKey(tag), cacheKey)
					}
					deletePipeline.del(tagKey)
					deletePipeline.del(cacheKey)
				}
				await deletePipeline.exec()
				return
			} catch (error) {
				// Redis connection failed - fall back to in-memory cache
				this.logger.warn('Redis del failed, falling back to in-memory cache', {
					keys: normalized,
					error: error instanceof Error ? error.message : String(error)
				})
			}
		}

		// In-memory fallback
		for (const cacheKey of cacheKeys) {
			this.fallbackCache.delete(cacheKey)
		}
	}

	async invalidate(pattern: string | RegExp, reason = 'data_changed'): Promise<number> {
		const keysToDelete = await this.findKeys(pattern)
		if (typeof pattern === 'string') {
			const tagged = await this.findTaggedKeys(pattern)
			for (const key of tagged) {
				if (!keysToDelete.includes(key)) {
					keysToDelete.push(key)
				}
			}
		}
		if (keysToDelete.length === 0) return 0

		const normalizedKeys = keysToDelete.map(key => this.stripKey(key))
		await this.del(normalizedKeys)
		this.stats.invalidations += keysToDelete.length

		this.logger.log(
			`Cache invalidation: ${keysToDelete.length} entries removed`,
			{ pattern: pattern.toString(), reason }
		)

		return keysToDelete.length
	}

	async invalidateByUser(user_id: string): Promise<number> {
		return this.invalidate(`user:${user_id}`, 'user_data_changed')
	}

	async invalidateByEntity(
		entityType:
			| 'properties'
			| 'units'
			| 'tenants'
			| 'leases'
			| 'maintenance',
		entityId?: string
	): Promise<number> {
		const pattern = entityId ? `${entityType}:${entityId}` : entityType
		return this.invalidate(pattern, `${entityType}_changed`)
	}

	async clear(): Promise<void> {
		if (this.redis) {
			try {
				const keys = await this.findKeys(/.*/)
				if (keys.length > 0) {
					await this.redis.del(...keys)
				}
				this.stats.invalidations += keys.length
				return
			} catch (error) {
				// Redis connection failed - fall back to in-memory cache
				this.logger.warn('Redis clear failed, falling back to in-memory cache', {
					error: error instanceof Error ? error.message : String(error)
				})
			}
		}

		const count = this.fallbackCache.size
		this.fallbackCache.clear()
		this.stats.invalidations += count
	}

	getStats(): CacheStats {
		this.stats.entries = this.redis ? 0 : this.fallbackCache.size
		if (!this.redis) {
			let memoryUsage = 0
			for (const entry of this.fallbackCache.values()) {
				memoryUsage += entry.value.length * 2
			}
			this.stats.memoryUsage = memoryUsage
		}
		this.stats.hitRatio =
			this.stats.hits / (this.stats.hits + this.stats.misses) || 0
		return { ...this.stats }
	}

	/**
	 * Health check for cache service
	 */
	isHealthy(): { healthy: boolean; details: Record<string, unknown> } {
		const memoryLimit = 100 * 1024 * 1024 // 100MB limit
		const hitRatioThreshold = 0.7 // 70% hit ratio minimum
		const stats = this.getStats()
		const healthy =
			stats.memoryUsage < memoryLimit && stats.hitRatio >= hitRatioThreshold

		return {
			healthy,
			details: {
				...stats,
				memoryLimitMB: memoryLimit / 1024 / 1024,
				isWithinMemoryLimit: stats.memoryUsage < memoryLimit,
				hasGoodHitRatio: stats.hitRatio >= hitRatioThreshold,
				uptime: Math.round(process.uptime())
			}
		}
	}

	static getUserKey(
		user_id: string,
		operation: string,
		params?: Record<string, unknown>
	): string {
		const paramsStr = params ? `:${JSON.stringify(params)}` : ''
		return `user:${user_id}:${operation}${paramsStr}`
	}

	static getEntityKey(
		entityType: string,
		entityId: string,
		operation?: string
	): string {
		return operation
			? `${entityType}:${entityId}:${operation}`
			: `${entityType}:${entityId}`
	}

	private buildKey(key: string): string {
		return `${this.keyPrefix}:${key}`
	}

	private stripKey(key: string): string {
		const prefix = `${this.keyPrefix}:`
		return key.startsWith(prefix) ? key.slice(prefix.length) : key
	}

	private tagKey(tag: string): string {
		return `${this.keyPrefix}:tag:${tag}`
	}

	private keyTagsKey(cacheKey: string): string {
		return `${this.keyPrefix}:tags:${cacheKey}`
	}

	private async findKeys(pattern: string | RegExp): Promise<string[]> {
		if (!this.redis) {
			const keys = Array.from(this.fallbackCache.keys())
			if (pattern instanceof RegExp) {
				return keys.filter(key => pattern.test(this.stripKey(key)))
			}
			return keys.filter(key => {
				const entry = this.fallbackCache.get(key)
				const stripped = this.stripKey(key)
				return (
					stripped.includes(pattern) ||
					(entry?.tags ? entry.tags.includes(pattern) : false)
				)
			})
		}

		try {
			const keys: string[] = []
			const matchPattern =
				pattern instanceof RegExp
					? `${this.keyPrefix}:*`
					: `${this.keyPrefix}:*${pattern}*`

			let cursor = '0'
			do {
				const [nextCursor, batch] = await this.redis.scan(
					cursor,
					'MATCH',
					matchPattern,
					'COUNT',
					500
				)
				cursor = nextCursor
				if (pattern instanceof RegExp) {
					for (const key of batch) {
						if (pattern.test(this.stripKey(key))) {
							keys.push(key)
						}
					}
				} else {
					keys.push(...batch)
				}
			} while (cursor !== '0')

			return keys
		} catch (error) {
			// Redis connection failed - fall back to in-memory cache
			this.logger.warn('Redis findKeys failed, falling back to in-memory cache', {
				pattern: pattern.toString(),
				error: error instanceof Error ? error.message : String(error)
			})
			const keys = Array.from(this.fallbackCache.keys())
			if (pattern instanceof RegExp) {
				return keys.filter(key => pattern.test(this.stripKey(key)))
			}
			return keys.filter(key => {
				const entry = this.fallbackCache.get(key)
				const stripped = this.stripKey(key)
				return (
					stripped.includes(pattern) ||
					(entry?.tags ? entry.tags.includes(pattern) : false)
				)
			})
		}
	}

	private async findTaggedKeys(tag: string): Promise<string[]> {
		if (!this.redis) {
			return Array.from(this.fallbackCache.entries())
				.filter(([, entry]) => entry.tags?.includes(tag))
				.map(([key]) => key)
		}

		try {
			return await this.redis.smembers(this.tagKey(tag))
		} catch (error) {
			// Redis connection failed - fall back to in-memory cache
			this.logger.warn('Redis findTaggedKeys failed, falling back to in-memory cache', {
				tag,
				error: error instanceof Error ? error.message : String(error)
			})
			return Array.from(this.fallbackCache.entries())
				.filter(([, entry]) => entry.tags?.includes(tag))
				.map(([key]) => key)
		}
	}

	private cleanupExpired(): void {
		const now = Date.now()
		let cleaned = 0
		for (const [key, entry] of this.fallbackCache.entries()) {
			if (entry.expiresAt && now > entry.expiresAt) {
				this.fallbackCache.delete(key)
				cleaned++
			}
		}
		if (cleaned > 0) {
			this.logger.debug(`Cleaned ${cleaned} expired cache entries`)
		}
	}
}

export type { CacheTier, CacheSetOptions }
