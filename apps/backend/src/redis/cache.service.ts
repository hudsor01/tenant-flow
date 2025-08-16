import { Injectable, Logger, Optional } from '@nestjs/common'
import { RedisService } from './redis.service'
import { CacheMetricsService } from './cache-metrics.service'

/**
 * Enhanced Cache Service
 * High-level caching operations with JSON serialization, stampede protection, and optimized invalidation
 */
@Injectable()
export class CacheService {
	private readonly logger = new Logger(CacheService.name)
	private readonly DEFAULT_TTL = 3600 // 1 hour
	private readonly pendingRequests = new Map<string, Promise<unknown>>()

	constructor(
		private readonly redisService: RedisService,
		@Optional() private readonly metricsService?: CacheMetricsService
	) {}

	/**
	 * Get a cached object
	 */
	async get<T>(key: string): Promise<T | null> {
		const start = Date.now()

		try {
			const cached = await this.redisService.get(key)
			const responseTime = Date.now() - start

			if (!cached) {
				this.metricsService?.recordMiss(key, responseTime)
				return null
			}

			this.metricsService?.recordHit(key, responseTime)
			return JSON.parse(cached) as T
		} catch (error) {
			this.logger.error(`Failed to get cached object ${key}:`, error)
			this.metricsService?.recordError(key, error as Error)
			return null
		}
	}

	/**
	 * Cache an object with optional TTL
	 */
	async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
		try {
			const serialized = JSON.stringify(value)
			return this.redisService.set(
				key,
				serialized,
				ttlSeconds || this.DEFAULT_TTL
			)
		} catch (error) {
			this.logger.error(`Failed to cache object ${key}:`, error)
			return false
		}
	}

	/**
	 * Delete cached object
	 */
	async del(key: string): Promise<boolean> {
		return this.redisService.del(key)
	}

	/**
	 * Delete multiple keys by pattern (DEPRECATED - use tag-based invalidation instead)
	 * This method is expensive and should be avoided in production
	 */
	async delByPattern(pattern: string): Promise<number> {
		const client = this.redisService.getClient()
		if (!client) {
			return 0
		}

		this.logger.warn(
			`Using expensive delByPattern operation: ${pattern}. Consider using tag-based invalidation instead.`
		)

		try {
			// Use SCAN instead of KEYS for better performance
			const keys: string[] = []
			let cursor = '0'

			do {
				const result = await client.scan(
					cursor,
					'MATCH',
					pattern,
					'COUNT',
					100
				)
				cursor = result[0]
				keys.push(...result[1])
			} while (cursor !== '0')

			if (keys.length === 0) {
				return 0
			}

			// Delete in batches to avoid blocking Redis
			const batchSize = 100
			let deletedCount = 0

			for (let i = 0; i < keys.length; i += batchSize) {
				const batch = keys.slice(i, i + batchSize)
				await client.del(...batch)
				deletedCount += batch.length
			}

			this.logger.debug(
				`Deleted ${deletedCount} keys matching pattern ${pattern}`
			)
			return deletedCount
		} catch (error) {
			this.logger.error(
				`Failed to delete keys by pattern ${pattern}:`,
				error
			)
			return 0
		}
	}

	/**
	 * Cache with tags for grouped invalidation
	 */
	async setWithTags<T>(
		key: string,
		value: T,
		tags: string[],
		ttlSeconds?: number
	): Promise<boolean> {
		const client = this.redisService.getClient()
		if (!client) {
			return false
		}

		const pipeline = client.pipeline()

		try {
			// Store the actual value
			const serialized = JSON.stringify(value)
			if (ttlSeconds) {
				pipeline.setex(key, ttlSeconds || this.DEFAULT_TTL, serialized)
			} else {
				pipeline.set(key, serialized)
			}

			// Add key to tag sets
			for (const tag of tags) {
				pipeline.sadd(`tag:${tag}`, key)
				if (ttlSeconds) {
					pipeline.expire(
						`tag:${tag}`,
						ttlSeconds || this.DEFAULT_TTL
					)
				}
			}

			await pipeline.exec()
			return true
		} catch (error) {
			this.logger.error(`Failed to cache with tags ${key}:`, error)
			return false
		}
	}

	/**
	 * Invalidate all keys with a specific tag
	 */
	async invalidateTag(tag: string): Promise<number> {
		const client = this.redisService.getClient()
		if (!client) {
			return 0
		}

		try {
			const keys = await client.smembers(`tag:${tag}`)
			if (keys.length === 0) {
				return 0
			}

			const pipeline = client.pipeline()
			for (const key of keys) {
				pipeline.del(key)
			}
			pipeline.del(`tag:${tag}`)

			await pipeline.exec()
			this.logger.debug(`Invalidated ${keys.length} keys with tag ${tag}`)
			return keys.length
		} catch (error) {
			this.logger.error(`Failed to invalidate tag ${tag}:`, error)
			return 0
		}
	}

	/**
	 * Get or set cache with stampede protection (cache-aside pattern)
	 */
	async getOrSet<T>(
		key: string,
		factory: () => Promise<T>,
		ttlSeconds?: number
	): Promise<T> {
		// Try to get from cache
		const cached = await this.get<T>(key)
		if (cached !== null) {
			this.logger.debug(`Cache hit for key ${key}`)
			return cached
		}

		// Check if there's already a pending request for this key (stampede protection)
		const pendingRequest = this.pendingRequests.get(key)
		if (pendingRequest) {
			this.logger.debug(`Waiting for pending request for key ${key}`)
			return pendingRequest as Promise<T>
		}

		// Cache miss - create and track the factory promise
		this.logger.debug(`Cache miss for key ${key}`)
		const factoryPromise = factory()
		this.pendingRequests.set(key, factoryPromise)

		try {
			const fresh = await factoryPromise

			// Cache the fresh data
			await this.set(key, fresh, ttlSeconds)

			return fresh
		} finally {
			// Always clean up the pending request
			this.pendingRequests.delete(key)
		}
	}

	/**
	 * Memoize a function result
	 */
	static createMemoizeDecorator(
		cacheService: CacheService,
		keyPrefix: string,
		ttlSeconds?: number
	) {
		return (
			_target: unknown,
			propertyKey: string,
			descriptor: PropertyDescriptor
		) => {
			const originalMethod = descriptor.value

			descriptor.value = async function (
				this: unknown,
				...args: unknown[]
			) {
				const key = `${keyPrefix}:${propertyKey}:${JSON.stringify(args)}`

				return cacheService.getOrSet(
					key,
					() => originalMethod.apply(this, args),
					ttlSeconds
				)
			}

			return descriptor
		}
	}

	memoize(keyPrefix: string, ttlSeconds?: number) {
		return CacheService.createMemoizeDecorator(this, keyPrefix, ttlSeconds)
	}

	/**
	 * Get multiple keys in a single operation
	 */
	async getMany<T>(keys: string[]): Promise<Record<string, T | null>> {
		const client = this.redisService.getClient()
		if (!client || keys.length === 0) {
			return {}
		}

		try {
			const values = await client.mget(...keys)
			const result: Record<string, T | null> = {}

			keys.forEach((key, index) => {
				const value = values[index]
				result[key] = value ? (JSON.parse(value) as T) : null
			})

			return result
		} catch (error) {
			this.logger.error(`Failed to get multiple keys:`, error)
			return {}
		}
	}

	/**
	 * Set multiple keys in a single operation
	 */
	async setMany<T>(
		entries: Record<string, T>,
		ttlSeconds?: number
	): Promise<boolean> {
		const client = this.redisService.getClient()
		if (!client) {
			return false
		}

		try {
			const pipeline = client.pipeline()

			Object.entries(entries).forEach(([key, value]) => {
				const serialized = JSON.stringify(value)
				if (ttlSeconds) {
					pipeline.setex(key, ttlSeconds, serialized)
				} else {
					pipeline.set(key, serialized)
				}
			})

			await pipeline.exec()
			return true
		} catch (error) {
			this.logger.error(`Failed to set multiple keys:`, error)
			return false
		}
	}

	/**
	 * Check if cache is available
	 */
	isAvailable(): boolean {
		return this.redisService.getClient() !== null
	}

	/**
	 * Get cache statistics
	 */
	async getStats(): Promise<{
		connected: boolean
		pendingRequests: number
		redisInfo?: Record<string, unknown>
	}> {
		const client = this.redisService.getClient()

		const stats = {
			connected: client !== null,
			pendingRequests: this.pendingRequests.size,
			redisInfo: undefined as Record<string, unknown> | undefined
		}

		if (client) {
			try {
				const info = await client.info('memory')
				stats.redisInfo = this.parseRedisInfo(info)
			} catch (error) {
				this.logger.warn('Failed to get Redis info:', error)
			}
		}

		return stats
	}

	/**
	 * Parse Redis INFO command output
	 */
	private parseRedisInfo(info: string): Record<string, string> {
		const parsed: Record<string, string> = {}

		info.split('\r\n').forEach(line => {
			if (line && !line.startsWith('#')) {
				const [key, value] = line.split(':')
				if (key && value) {
					parsed[key] = value
				}
			}
		})

		return parsed
	}

	/**
	 * Clear all pending requests (useful for testing)
	 */
	clearPendingRequests(): void {
		this.pendingRequests.clear()
	}
}
