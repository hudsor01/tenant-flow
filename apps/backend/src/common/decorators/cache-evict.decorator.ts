import { SetMetadata } from '@nestjs/common'

/**
 * Cache eviction configuration for the @CacheEvict decorator
 */
export interface CacheEvictOptions {
  /**
   * Cache key pattern to evict (e.g., 'properties:*')
   */
  pattern?: string
  
  /**
   * Specific cache key to evict
   */
  key?: string
  
  /**
   * Tags to invalidate
   */
  tags?: string[] | ((...args: unknown[]) => string[])
  
  /**
   * Custom eviction function
   */
  keyGenerator?: (...args: unknown[]) => string | string[]
  
  /**
   * Whether to evict before or after method execution
   * - 'before': Evict cache before method execution
   * - 'after': Evict cache after method execution (default)
   */
  when?: 'before' | 'after'
  
  /**
   * Whether eviction is enabled (default: true)
   */
  enabled?: boolean
  
  /**
   * Evict all cached entries for the entity
   */
  evictAll?: boolean
  
  /**
   * Method name (auto-populated)
   */
  methodName?: string
}

/**
 * Metadata key for cache eviction configuration
 */
export const CACHE_EVICT_KEY = 'cache_evict'

/**
 * Decorator to mark methods that should evict cache entries
 * 
 * @example
 * ```typescript
 * @CacheEvict({ tags: ['properties'] })
 * async create(data: CreatePropertyDto, ownerId: string): Promise<Property> {
 *   return await super.create(data, ownerId)
 * }
 * ```
 */
export const CacheEvict = (options: CacheEvictOptions = {}) => {
  return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_EVICT_KEY, {
      ...options,
      enabled: options.enabled !== false, // Default to true
      when: options.when || 'after', // Default to after
      methodName: propertyKey
    })(target, propertyKey, descriptor)
    
    return descriptor
  }
}