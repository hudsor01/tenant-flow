/**
 * Cache configuration for different entities
 */
export interface EntityCacheConfig {
  /**
   * Time to live in seconds
   */
  ttl: number
  
  /**
   * Cache strategy
   */
  strategy: 'cache-aside' | 'write-through' | 'write-behind'
  
  /**
   * Cache invalidation strategy
   */
  invalidationStrategy: 'time-based' | 'event-based' | 'manual'
  
  /**
   * Whether caching is enabled for this entity
   */
  enabled: boolean
  
  /**
   * Maximum number of entries to cache for this entity per user
   */
  maxEntriesPerUser?: number
  
  /**
   * Warm cache on application startup
   */
  warmOnStartup?: boolean
  
  /**
   * Cache priority (higher priority items are less likely to be evicted)
   */
  priority?: 'low' | 'medium' | 'high'
}

/**
 * Default cache configurations for all entities
 */
export const CACHE_CONFIGS: Record<string, EntityCacheConfig> = {
  // Properties change less frequently, longer cache
  properties: {
    ttl: 600, // 10 minutes
    strategy: 'cache-aside',
    invalidationStrategy: 'event-based',
    enabled: true,
    maxEntriesPerUser: 1000,
    warmOnStartup: false,
    priority: 'high'
  },
  
  // Tenants change moderately, medium cache
  tenants: {
    ttl: 300, // 5 minutes
    strategy: 'write-through',
    invalidationStrategy: 'event-based',
    enabled: true,
    maxEntriesPerUser: 500,
    warmOnStartup: false,
    priority: 'medium'
  },
  
  // Units can change frequently, shorter cache
  units: {
    ttl: 450, // 7.5 minutes
    strategy: 'cache-aside',
    invalidationStrategy: 'event-based',
    enabled: true,
    maxEntriesPerUser: 2000,
    warmOnStartup: false,
    priority: 'medium'
  },
  
  // Leases are time-sensitive, shortest cache
  leases: {
    ttl: 180, // 3 minutes
    strategy: 'write-through',
    invalidationStrategy: 'event-based',
    enabled: true,
    maxEntriesPerUser: 200,
    warmOnStartup: false,
    priority: 'high'
  },
  
  // User stats don't change often
  stats: {
    ttl: 900, // 15 minutes
    strategy: 'cache-aside',
    invalidationStrategy: 'event-based',
    enabled: true,
    maxEntriesPerUser: 50,
    warmOnStartup: true,
    priority: 'low'
  },
  
  // Documents are relatively static
  documents: {
    ttl: 1200, // 20 minutes
    strategy: 'cache-aside',
    invalidationStrategy: 'event-based',
    enabled: true,
    maxEntriesPerUser: 500,
    warmOnStartup: false,
    priority: 'medium'
  },
  
  // Maintenance requests change frequently
  maintenance: {
    ttl: 120, // 2 minutes
    strategy: 'write-through',
    invalidationStrategy: 'event-based',
    enabled: true,
    maxEntriesPerUser: 100,
    warmOnStartup: false,
    priority: 'medium'
  }
}

/**
 * Global cache settings
 */
export interface GlobalCacheConfig {
  /**
   * Default TTL for entities not in CACHE_CONFIGS
   */
  defaultTtl: number
  
  /**
   * Maximum total cache size (in MB)
   */
  maxMemoryMB: number
  
  /**
   * Cache eviction policy
   */
  evictionPolicy: 'lru' | 'lfu' | 'ttl'
  
  /**
   * Enable cache metrics collection
   */
  metricsEnabled: boolean
  
  /**
   * Enable cache warming on startup
   */
  warmingEnabled: boolean
  
  /**
   * Number of concurrent warming operations
   */
  warmingConcurrency: number
}

export const GLOBAL_CACHE_CONFIG: GlobalCacheConfig = {
  defaultTtl: 300, // 5 minutes
  maxMemoryMB: 512, // 512 MB
  evictionPolicy: 'lru',
  metricsEnabled: true,
  warmingEnabled: false, // Disabled by default
  warmingConcurrency: 3
}

/**
 * Cache configuration service
 */
export class CacheConfigService {
  /**
   * Get cache configuration for an entity
   */
  static getEntityConfig(entityName: string): EntityCacheConfig {
    const config = CACHE_CONFIGS[entityName.toLowerCase()]
    
    if (!config) {
      // Return default configuration for unknown entities
      return {
        ttl: GLOBAL_CACHE_CONFIG.defaultTtl,
        strategy: 'cache-aside',
        invalidationStrategy: 'time-based',
        enabled: true,
        priority: 'medium'
      }
    }
    
    return config
  }
  
  /**
   * Check if caching is enabled for an entity
   */
  static isCachingEnabled(entityName: string): boolean {
    return this.getEntityConfig(entityName).enabled
  }
  
  /**
   * Get TTL for an entity
   */
  static getTtl(entityName: string): number {
    return this.getEntityConfig(entityName).ttl
  }
  
  /**
   * Get cache strategy for an entity
   */
  static getStrategy(entityName: string): string {
    return this.getEntityConfig(entityName).strategy
  }
  
  /**
   * Get all configured entity names
   */
  static getConfiguredEntities(): string[] {
    return Object.keys(CACHE_CONFIGS)
  }
  
  /**
   * Override configuration for an entity (useful for testing)
   */
  static overrideConfig(entityName: string, config: Partial<EntityCacheConfig>): void {
    const currentConfig = this.getEntityConfig(entityName)
    CACHE_CONFIGS[entityName.toLowerCase()] = {
      ...currentConfig,
      ...config
    }
  }
  
  /**
   * Reset configuration to defaults
   */
  static resetConfig(): void {
    // This would reload from environment variables or config files in a real implementation
    // For now, configurations are static
  }
  
  /**
   * Validate configuration
   */
  static validateConfig(entityName: string): { valid: boolean; errors: string[] } {
    const config = CACHE_CONFIGS[entityName.toLowerCase()]
    const errors: string[] = []
    
    if (!config) {
      return { valid: true, errors: [] } // Unknown entities use defaults
    }
    
    if (config.ttl <= 0) {
      errors.push('TTL must be positive')
    }
    
    if (config.ttl > 86400) { // 24 hours
      errors.push('TTL should not exceed 24 hours')
    }
    
    if (config.maxEntriesPerUser && config.maxEntriesPerUser <= 0) {
      errors.push('maxEntriesPerUser must be positive')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  /**
   * Get cache configuration summary for all entities
   */
  static getConfigSummary(): Record<string, {
    enabled: boolean
    ttl: number
    strategy: string
    priority?: string
  }> {
    const summary: Record<string, {
      enabled: boolean
      ttl: number
      strategy: string
      priority?: string
    }> = {}
    
    Object.entries(CACHE_CONFIGS).forEach(([entity, config]) => {
      summary[entity] = {
        enabled: config.enabled,
        ttl: config.ttl,
        strategy: config.strategy,
        priority: config.priority
      }
    })
    
    return summary
  }
}