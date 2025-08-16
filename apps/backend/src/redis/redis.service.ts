import { Injectable, Inject, Logger } from '@nestjs/common'
import { Redis } from 'ioredis'

/**
 * Redis Service
 * Core Redis operations for the application
 */
@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name)

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis | null
  ) {}

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.redis !== null && this.redis.status === 'ready'
  }

  /**
   * Get a value from Redis
   */
  async get(key: string): Promise<string | null> {
    if (!this.redis) return null
    
    try {
      return await this.redis.get(key)
    } catch (error) {
      this.logger.error(`Failed to get key ${key}:`, error)
      return null
    }
  }

  /**
   * Set a value in Redis with optional TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!this.redis) return false
    
    try {
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, value)
      } else {
        await this.redis.set(key, value)
      }
      return true
    } catch (error) {
      this.logger.error(`Failed to set key ${key}:`, error)
      return false
    }
  }

  /**
   * Delete a key from Redis
   */
  async del(key: string): Promise<boolean> {
    if (!this.redis) return false
    
    try {
      await this.redis.del(key)
      return true
    } catch (error) {
      this.logger.error(`Failed to delete key ${key}:`, error)
      return false
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.redis) return false
    
    try {
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      this.logger.error(`Failed to check existence of key ${key}:`, error)
      return false
    }
  }

  /**
   * Set expiration on a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.redis) return false
    
    try {
      const result = await this.redis.expire(key, seconds)
      return result === 1
    } catch (error) {
      this.logger.error(`Failed to set expiration for key ${key}:`, error)
      return false
    }
  }

  /**
   * Get TTL of a key
   */
  async ttl(key: string): Promise<number> {
    if (!this.redis) return -2
    
    try {
      return await this.redis.ttl(key)
    } catch (error) {
      this.logger.error(`Failed to get TTL for key ${key}:`, error)
      return -2
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number | null> {
    if (!this.redis) return null
    
    try {
      return await this.redis.incr(key)
    } catch (error) {
      this.logger.error(`Failed to increment key ${key}:`, error)
      return null
    }
  }

  /**
   * Decrement a counter
   */
  async decr(key: string): Promise<number | null> {
    if (!this.redis) return null
    
    try {
      return await this.redis.decr(key)
    } catch (error) {
      this.logger.error(`Failed to decrement key ${key}:`, error)
      return null
    }
  }

  /**
   * Get the Redis client for advanced operations
   */
  getClient(): Redis | null {
    return this.redis
  }
}