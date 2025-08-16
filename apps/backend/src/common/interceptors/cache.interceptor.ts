import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
  Optional
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable, of } from 'rxjs'
import { catchError, tap } from 'rxjs/operators'
import { CacheService } from '../../redis/cache.service'
import { CACHEABLE_KEY, CacheableOptions } from '../decorators/cacheable.decorator'
import { CACHE_EVICT_KEY, CacheEvictOptions } from '../decorators/cache-evict.decorator'
import { CacheKeyGenerator } from '../decorators/cache-key.decorator'

/**
 * Cache Interceptor
 * Handles caching and cache eviction based on decorators
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name)

  constructor(
    private readonly reflector: Reflector,
    @Optional() @Inject(CacheService) private readonly cacheService?: CacheService
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    // Skip if cache service is not available
    if (!this.cacheService) {
      return next.handle()
    }

    const handler = context.getHandler()
    const cacheableOptions = this.reflector.get<CacheableOptions>(CACHEABLE_KEY, handler)
    const evictOptions = this.reflector.get<CacheEvictOptions>(CACHE_EVICT_KEY, handler)

    // Handle cache eviction (before)
    if (evictOptions?.enabled && evictOptions.when === 'before') {
      await this.handleCacheEviction(context, evictOptions)
    }

    // Handle caching
    if (cacheableOptions?.enabled) {
      const cached = await this.handleCaching(context, cacheableOptions)
      if (cached !== null) {
        this.logger.debug(`Cache hit for ${cacheableOptions.key}:${cacheableOptions.methodName}`)
        return of(cached)
      }
    }

    // Execute the method
    return next.handle().pipe(
      tap((result) => {
        // Cache the result if cacheable
        if (cacheableOptions?.enabled && result !== undefined) {
          // Fire and forget - don't await in tap
          void this.storeInCache(context, cacheableOptions, result)
        }

        // Handle cache eviction (after)
        if (evictOptions?.enabled && evictOptions.when === 'after') {
          // Fire and forget - don't await in tap
          void this.handleCacheEviction(context, evictOptions)
        }
      }),
      catchError(async (error) => {
        // Don't cache errors, just re-throw
        throw error
      })
    )
  }

  /**
   * Handle caching logic
   */
  private async handleCaching(
    context: ExecutionContext,
    options: CacheableOptions
  ): Promise<unknown> {
    try {
      const cacheKey = this.generateCacheKey(context, options)
      if (!cacheKey) {return null}

      if (!this.cacheService) {return null}
      const cached = await this.cacheService.get(cacheKey)
      return cached
    } catch (error) {
      this.logger.warn(`Cache get failed: ${error instanceof Error ? error.message : String(error)}`)
      return null
    }
  }

  /**
   * Store result in cache
   */
  private async storeInCache(
    context: ExecutionContext,
    options: CacheableOptions,
    result: unknown
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(context, options)
      if (!cacheKey) {return}

      const tags = this.generateTags(context, options)
      
      if (!this.cacheService) {return}
      
      if (tags.length > 0) {
        await this.cacheService.setWithTags(cacheKey, result, tags, options.ttl)
      } else {
        await this.cacheService.set(cacheKey, result, options.ttl)
      }

      this.logger.debug(`Cached result for ${options.key}:${options.methodName}`)
    } catch (error) {
      this.logger.warn(`Cache set failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Handle cache eviction
   */
  private async handleCacheEviction(
    context: ExecutionContext,
    options: CacheEvictOptions
  ): Promise<void> {
    try {
      if (options.tags) {
        const tags = typeof options.tags === 'function' 
          ? options.tags(...this.getMethodArgs(context))
          : options.tags

        if (!this.cacheService) {return}
        
        for (const tag of tags) {
          await this.cacheService.invalidateTag(tag)
        }
      }

      if (options.pattern) {
        if (!this.cacheService) {return}
        await this.cacheService.delByPattern(options.pattern)
      }

      if (options.key) {
        if (!this.cacheService) {return}
        await this.cacheService.del(options.key)
      }

      if (options.keyGenerator) {
        const keys = options.keyGenerator(...this.getMethodArgs(context))
        const keyArray = Array.isArray(keys) ? keys : [keys]
        
        if (!this.cacheService) {return}
        
        for (const key of keyArray) {
          await this.cacheService.del(key)
        }
      }

      this.logger.debug(`Cache evicted for ${options.methodName}`)
    } catch (error) {
      this.logger.warn(`Cache eviction failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Generate cache key for the method call
   */
  private generateCacheKey(
    context: ExecutionContext,
    options: CacheableOptions
  ): string | null {
    try {
      const args = this.getMethodArgs(context)
      
      if (options.keyGenerator) {
        return options.keyGenerator(...args)
      }

      // Extract common parameters from method arguments
      const [firstArg, secondArg, thirdArg] = args
      
      // Convert arguments to strings safely
      const firstArgStr = String(firstArg ?? '')
      const secondArgStr = String(secondArg ?? '')
      
      // Handle different method patterns
      if (options.methodName?.includes('findById') || options.methodName?.includes('getById')) {
        // findById(id, ownerId) pattern
        return CacheKeyGenerator.generateEntityKey(options.key, 'findById', secondArgStr, firstArgStr)
      }
      
      if (options.methodName?.includes('getByOwner') || options.methodName?.includes('findByOwner')) {
        // getByOwner(ownerId, query?) pattern
        return CacheKeyGenerator.generateListKey(options.key, firstArgStr, secondArg as Record<string, unknown>)
      }
      
      if (options.methodName?.includes('getStats')) {
        // getStats(ownerId) pattern
        return CacheKeyGenerator.generateStatsKey(options.key, firstArgStr)
      }
      
      if (options.methodName?.includes('getBy') || options.methodName?.includes('findBy')) {
        // getByUnit(unitId, ownerId, query?) pattern
        const relation = this.extractRelationFromMethod(options.methodName)
        return CacheKeyGenerator.generateRelationKey(options.key, relation, firstArgStr, secondArgStr, thirdArg as Record<string, unknown>)
      }

      // Fallback: generate key with all arguments
      const methodName = options.methodName ?? 'unknown'
      return CacheKeyGenerator.generateKey(options.key, methodName, firstArgStr, secondArgStr, thirdArg as Record<string, unknown>)
    } catch (error) {
      this.logger.warn(`Failed to generate cache key: ${error instanceof Error ? error.message : String(error)}`)
      return null
    }
  }

  /**
   * Generate cache tags for the method call
   */
  private generateTags(
    context: ExecutionContext,
    options: CacheableOptions
  ): string[] {
    try {
      if (options.tags) {
        if (typeof options.tags === 'function') {
          return options.tags(...this.getMethodArgs(context))
        }
        return options.tags
      }

      // Generate default tags
      const args = this.getMethodArgs(context)
      const [firstArg, secondArg] = args
      
      // Convert arguments to strings safely
      const firstArgStr = String(firstArg ?? '')
      const secondArgStr = String(secondArg ?? '')
      
      if (options.methodName?.includes('findById') || options.methodName?.includes('getById')) {
        // findById(id, ownerId) pattern
        return CacheKeyGenerator.generateTags(options.key, secondArgStr, firstArgStr)
      }
      
      // Default tag generation
      return CacheKeyGenerator.generateTags(options.key, firstArgStr)
    } catch (error) {
      this.logger.warn(`Failed to generate cache tags: ${error instanceof Error ? error.message : String(error)}`)
      return []
    }
  }

  /**
   * Get method arguments from execution context
   */
  private getMethodArgs(context: ExecutionContext): unknown[] {
    return context.getArgs().slice(0, -2) // Remove response and next from args
  }

  /**
   * Extract relation name from method name
   */
  private extractRelationFromMethod(methodName: string): string {
    // getByUnit -> unit, findByTenant -> tenant
    const match = methodName.match(/(?:getBy|findBy)([A-Z][a-z]+)/)
    return match?.[1]?.toLowerCase() ?? 'relation'
  }
}