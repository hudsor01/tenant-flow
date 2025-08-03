/**
 * Production-Grade Distributed Caching Service
 * 
 * Multi-layer caching strategy with Redis backend
 * Supports cache invalidation, warming, and performance monitoring
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis, { Cluster } from 'ioredis'

export interface CacheOptions {
  ttl?: number              // Time to live in seconds
  tags?: string[]          // Cache tags for invalidation
  compress?: boolean       // Enable compression for large values
  serialize?: boolean      // Custom serialization
}

export interface CacheMetrics {
  hits: number
  misses: number
  operations: number
  avgResponseTime: number
  errorRate: number
}

@Injectable()
export class DistributedCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(DistributedCacheService.name)
  private redis!: Redis | Cluster
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    operations: 0,
    avgResponseTime: 0,
    errorRate: 0
  }
  private responseTimes: number[] = []

  constructor(private configService: ConfigService) {
    this.initializeRedis()
  }

  private initializeRedis(): void {
    const redisUrl = this.configService.get<string>('REDIS_URL')
    if (!redisUrl) {
      throw new Error('REDIS_URL configuration is required')
    }
    
    const isCluster = this.configService.get<boolean>('REDIS_CLUSTER_ENABLED', false)

    if (isCluster) {
      const nodes = this.configService
        .get<string>('REDIS_CLUSTER_NODES', '')
        .split(',')
        .map(node => {
          const [host, port] = node.split(':')
          return { host: host || 'localhost', port: parseInt(port || '6379', 10) }
        })

      this.redis = new Cluster(nodes, {
        redisOptions: {
          password: this.configService.get<string>('REDIS_PASSWORD'),
          maxRetriesPerRequest: 3,
          lazyConnect: true
        },
        retryDelayOnFailover: 2000,
        retryDelayOnClusterDown: 1000,
        maxRedirections: 6
      })
    } else {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000
      })
    }

    this.redis.on('connect', () => {
      this.logger.log('✅ Redis connection established')
    })

    this.redis.on('error', (error) => {
      this.logger.error('❌ Redis connection error:', error)
      this.metrics.errorRate++
    })
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect()
      this.logger.log('Redis connection closed')
    }
  }

  /**
   * Get value from cache with performance tracking
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now()
    this.metrics.operations++

    try {
      const value = await this.redis.get(this.buildKey(key))
      const responseTime = Date.now() - startTime
      this.trackResponseTime(responseTime)

      if (value) {
        this.metrics.hits++
        return this.deserialize<T>(value)
      } else {
        this.metrics.misses++
        return null
      }
    } catch (error) {
      this.metrics.errorRate++
      this.logger.error(`Cache GET error for key ${key}:`, error)
      return null
    }
  }

  /**
   * Set value in cache with options
   */
  async set<T>(
    key: string, 
    value: T, 
    options: CacheOptions = {}
  ): Promise<boolean> {
    const startTime = Date.now()
    this.metrics.operations++

    try {
      const serializedValue = this.serialize(value, options.compress)
      const cacheKey = this.buildKey(key)

      const pipeline = this.redis.pipeline()
      
      if (options.ttl) {
        pipeline.setex(cacheKey, options.ttl, serializedValue)
      } else {
        pipeline.set(cacheKey, serializedValue)
      }

      // Add cache tags for invalidation
      if (options.tags && options.tags.length > 0) {
        for (const tag of options.tags) {
          const tagKey = this.buildTagKey(tag)
          pipeline.sadd(tagKey, cacheKey)
          
          // Set TTL for tag keys
          if (options.ttl) {
            pipeline.expire(tagKey, options.ttl + 300)
          }
        }
      }

      await pipeline.exec()
      
      const responseTime = Date.now() - startTime
      this.trackResponseTime(responseTime)
      
      return true
    } catch (error) {
      this.metrics.errorRate++
      this.logger.error(`Cache SET error for key ${key}:`, error)
      return false
    }
  }

  /**
   * Delete single key from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(this.buildKey(key))
      return result > 0
    } catch (error) {
      this.logger.error(`Cache DELETE error for key ${key}:`, error)
      return false
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let deletedCount = 0

    try {
      for (const tag of tags) {
        const tagKey = this.buildTagKey(tag)
        const members = await this.redis.smembers(tagKey)
        
        if (members.length > 0) {
          const pipeline = this.redis.pipeline()
          members.forEach(key => pipeline.del(key))
          pipeline.del(tagKey)
          
          const results = await pipeline.exec()
          deletedCount += results?.filter(([err, result]) => !err && result === 1).length || 0
        }
      }

      this.logger.debug(`Invalidated ${deletedCount} cache entries for tags: ${tags.join(', ')}`)
      return deletedCount
    } catch (error) {
      this.logger.error(`Cache invalidation error for tags ${tags.join(', ')}:`, error)
      return 0
    }
  }

  /**
   * Warm cache with precomputed values
   */
  async warmCache<T>(entries: { key: string; value: T; options?: CacheOptions }[]): Promise<void> {
    const pipeline = this.redis.pipeline()

    for (const entry of entries) {
      const serializedValue = this.serialize(entry.value, entry.options?.compress)
      const cacheKey = this.buildKey(entry.key)
      
      if (entry.options?.ttl) {
        pipeline.setex(cacheKey, entry.options.ttl, serializedValue)
      } else {
        pipeline.set(cacheKey, serializedValue)
      }
    }

    try {
      await pipeline.exec()
      this.logger.log(`Cache warmed with ${entries.length} entries`)
    } catch (error) {
      this.logger.error('Cache warming error:', error)
    }
  }

  /**
   * Get or set pattern - fetch from cache or execute function
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {

    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Fetch fresh data
    try {
      const freshData = await fetchFunction()
      
      // Cache the result
      await this.set(key, freshData, options)
      
      return freshData
    } catch (error) {
      this.logger.error(`Error in getOrSet for key ${key}:`, error)
      throw error
    }
  }

  /**
   * Batch operations for multiple keys
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const cacheKeys = keys.map(key => this.buildKey(key))
      const values = await this.redis.mget(...cacheKeys)
      
      return values.map(value => {
        if (value) {
          this.metrics.hits++
          return this.deserialize<T>(value)
        } else {
          this.metrics.misses++
          return null
        }
      })
    } catch (error) {
      this.logger.error('Cache MGET error:', error)
      return keys.map(() => null)
    }
  }

  async mset<T>(entries: { key: string; value: T; ttl?: number }[]): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline()

      for (const entry of entries) {
        const serializedValue = this.serialize(entry.value)
        const cacheKey = this.buildKey(entry.key)
        
        if (entry.ttl) {
          pipeline.setex(cacheKey, entry.ttl, serializedValue)
        } else {
          pipeline.set(cacheKey, serializedValue)
        }
      }

      await pipeline.exec()
      return true
    } catch (error) {
      this.logger.error('Cache MSET error:', error)
      return false
    }
  }

  /**
   * Get cache metrics for monitoring
   */
  getMetrics(): CacheMetrics & { hitRate: number } {
    const hitRate = this.metrics.operations > 0 
      ? (this.metrics.hits / this.metrics.operations) * 100 
      : 0

    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100) / 100
    }
  }

  /**
   * Reset metrics (useful for monitoring intervals)
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      operations: 0,
      avgResponseTime: 0,
      errorRate: 0
    }
    this.responseTimes = []
  }

  /**
   * Check if cache is healthy
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    const startTime = Date.now()
    
    try {
      const testKey = `health:${Date.now()}`
      await this.redis.set(testKey, 'test', 'EX', 10)
      const value = await this.redis.get(testKey)
      await this.redis.del(testKey)
      
      const latency = Date.now() - startTime
      
      return {
        status: value === 'test' ? 'healthy' : 'unhealthy',
        latency
      }
    } catch {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime
      }
    }
  }

  // Private helper methods
  private buildKey(key: string): string {
    const prefix = this.configService.get<string>('CACHE_KEY_PREFIX', 'tenantflow')
    return `${prefix}:${key}`
  }

  private buildTagKey(tag: string): string {
    return this.buildKey(`tag:${tag}`)
  }

  private serialize<T>(value: T, compress = false): string {
    const serialized = JSON.stringify(value)
    
    if (compress && serialized.length > 1000) {
      // Implement compression for large values
      // Could use gzip or lz-string here
      return serialized
    }
    
    return serialized
  }

  private deserialize<T>(value: string): T {
    try {
      return JSON.parse(value)
    } catch (error) {
      this.logger.error('Cache deserialization error:', error)
      throw new Error('Failed to deserialize cached value')
    }
  }

  private trackResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime)
    
    // Keep only last 1000 response times for average calculation
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift()
    }
    
    // Update average response time
    this.metrics.avgResponseTime = 
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
  }
}

/**
 * Cache key patterns for different data types
 */
export const CacheKeys = {
  // User-related cache keys
  user: (userId: string) => `user:${userId}`,
  userProfile: (userId: string) => `user:profile:${userId}`,
  userSubscription: (userId: string) => `user:subscription:${userId}`,
  
  // Property-related cache keys  
  property: (propertyId: string) => `property:${propertyId}`,
  propertiesByOwner: (ownerId: string, page = 1, limit = 20) => 
    `properties:owner:${ownerId}:${page}:${limit}`,
  propertyStats: (ownerId: string) => `property:stats:${ownerId}`,
  
  // Tenant-related cache keys
  tenant: (tenantId: string) => `tenant:${tenantId}`,
  tenantsByProperty: (propertyId: string) => `tenants:property:${propertyId}`,
  
  // Maintenance-related cache keys
  maintenanceRequest: (requestId: string) => `maintenance:${requestId}`,
  maintenanceByUnit: (unitId: string) => `maintenance:unit:${unitId}`,
  
  // Application-level cache keys
  subscriptionPlans: () => 'subscription:plans',
  appConfig: () => 'app:config',
  featureFlags: () => 'features:flags'
}

/**
 * Cache tags for invalidation strategies
 */
export const CacheTags = {
  user: (userId: string) => [`user:${userId}`],
  property: (propertyId: string, ownerId: string) => [`property:${propertyId}`, `user:${ownerId}`],
  tenant: (tenantId: string, propertyId: string) => [`tenant:${tenantId}`, `property:${propertyId}`],
  maintenance: (requestId: string, unitId: string, propertyId: string) => [
    `maintenance:${requestId}`, 
    `unit:${unitId}`, 
    `property:${propertyId}`
  ],
  subscription: (userId: string) => [`subscription:${userId}`, `user:${userId}`]
}