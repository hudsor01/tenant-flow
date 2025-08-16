import { SetMetadata } from '@nestjs/common'
import { CacheConfigService } from '../../redis/cache.config'

/**
 * Cache configuration for the @Cacheable decorator
 */
export interface CacheableOptions {
  /**
   * Cache key prefix (e.g., 'properties', 'tenants')
   */
  key: string
  
  /**
   * Time to live in seconds
   */
  ttl?: number
  
  /**
   * Custom key generator function
   * If not provided, uses default key generation
   */
  keyGenerator?: (...args: unknown[]) => string
  
  /**
   * Tags for grouped cache invalidation
   */
  tags?: string[] | ((...args: unknown[]) => string[])
  
  /**
   * Whether caching is enabled (default: true)
   */
  enabled?: boolean
  
  /**
   * Cache strategy
   */
  strategy?: 'cache-aside' | 'write-through' | 'write-behind'
  
  /**
   * Method name (auto-populated)
   */
  methodName?: string
}

/**
 * Metadata key for cacheable configuration
 */
export const CACHEABLE_KEY = 'cacheable'

/**
 * Decorator to mark methods for caching
 * 
 * @example
 * ```typescript
 * @Cacheable({ key: 'properties' })
 * async findById(id: string, ownerId: string): Promise<Property> {
 *   return await this.repository.findByIdAndOwner(id, ownerId)
 * }
 * ```
 */
export const Cacheable = (options: CacheableOptions) => {
  return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
    // Apply configuration defaults from cache config
    const entityConfig = CacheConfigService.getEntityConfig(options.key)
    
    const finalOptions = {
      ...options,
      ttl: options.ttl || entityConfig.ttl,
      enabled: options.enabled !== false && entityConfig.enabled,
      strategy: options.strategy || entityConfig.strategy,
      methodName: propertyKey
    }
    
    SetMetadata(CACHEABLE_KEY, finalOptions)(target, propertyKey, descriptor)
    
    return descriptor
  }
}