import { Controller, Get, Post, Delete, Param, Query, HttpCode, HttpStatus } from '@nestjs/common'
import { Public } from '../auth/decorators/public.decorator'
import { CacheService } from './cache.service'
import { CacheMetricsService } from './cache-metrics.service'
import { CacheConfigService } from './cache.config'
import { QueueService } from '../queues/queue.service'

/**
 * Cache Debug Controller
 * Provides endpoints for cache and queue operational debugging (not metrics - those go to Prometheus)
 * Focuses on operational tasks: inspection, testing, manual operations
 */
@Controller('debug/cache')
export class CacheDebugController {
  constructor(
    private readonly cacheService: CacheService,
    private readonly metricsService: CacheMetricsService,
    private readonly queueService: QueueService
  ) {}

  /**
   * Get overall cache statistics
   */
  @Get('stats')
  @Public()
  async getStats() {
    const overallStats = this.metricsService.getOverallStats()
    const entityStats = this.metricsService.getEntityStats()
    const performanceMetrics = this.metricsService.getPerformanceMetrics()
    const cacheServiceStats = await this.cacheService.getStats()
    
    return {
      overall: overallStats,
      byEntity: entityStats,
      performance: performanceMetrics,
      service: cacheServiceStats,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Get cache status (internal use only - use main /health endpoint for external health checks)
   */
  async getCacheStatus() {
    const healthStatus = this.metricsService.getHealthStatus()
    const isAvailable = this.cacheService.isAvailable()
    
    return {
      ...healthStatus,
      serviceAvailable: isAvailable,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Get cache configuration
   */
  @Get('config')
  @Public()
  getConfig() {
    return {
      entities: CacheConfigService.getConfigSummary(),
      configuredEntities: CacheConfigService.getConfiguredEntities(),
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Get cache configuration for specific entity
   */
  @Get('config/:entity')
  @Public()
  getEntityConfig(@Param('entity') entity: string) {
    const config = CacheConfigService.getEntityConfig(entity)
    const validation = CacheConfigService.validateConfig(entity)
    
    return {
      entity,
      config,
      validation,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Get cache entry by key
   */
  @Get('entries/:key')
  @Public()
  async getCacheEntry(@Param('key') key: string) {
    const value = await this.cacheService.get(key)
    
    return {
      key,
      exists: value !== null,
      value,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Search cache entries by pattern (expensive operation)
   */
  @Get('entries')
  @Public()
  async searchCacheEntries(
    @Query('pattern') pattern?: string,
    @Query('limit') limit = '10'
  ) {
    if (!pattern) {
      return {
        error: 'Pattern parameter is required',
        example: '/debug/cache/entries?pattern=properties:*&limit=5'
      }
    }

    // This is an expensive operation - warn in logs
    console.warn(`Cache pattern search requested: ${pattern}`)
    
    const maxLimit = Math.min(parseInt(limit), 100) // Cap at 100 entries
    
    return {
      pattern,
      limit: maxLimit,
      warning: 'This is an expensive operation that scans Redis keys',
      entries: [], // TODO: Implement if needed for debugging
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Clear cache metrics
   */
  @Post('metrics/reset')
  @Public()
  @HttpCode(HttpStatus.OK)
  resetMetrics() {
    this.metricsService.reset()
    
    return {
      message: 'Cache metrics reset successfully',
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Delete cache entry by key
   */
  @Delete('entries/:key')
  @Public()
  async deleteCacheEntry(@Param('key') key: string) {
    const deleted = await this.cacheService.del(key)
    
    return {
      key,
      deleted,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Invalidate cache by tag
   */
  @Delete('tags/:tag')
  @Public()
  async invalidateTag(@Param('tag') tag: string) {
    const deletedCount = await this.cacheService.invalidateTag(tag)
    
    return {
      tag,
      deletedCount,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Test cache operations
   */
  @Post('test')
  @Public()
  async testCache() {
    const testKey = `test:${Date.now()}`
    const testValue = { message: 'Cache test', timestamp: Date.now() }
    
    try {
      // Test set
      const setResult = await this.cacheService.set(testKey, testValue, 60)
      
      // Test get
      const getValue = await this.cacheService.get(testKey)
      
      // Test delete
      const deleteResult = await this.cacheService.del(testKey)
      
      return {
        test: 'cache_operations',
        results: {
          set: setResult,
          get: getValue !== null,
          getValue,
          delete: deleteResult
        },
        success: setResult && getValue !== null && deleteResult,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        test: 'cache_operations',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Get cache warming status
   */
  @Get('warming')
  @Public()
  async getWarmingStatus() {
    // TODO: Implement cache warming logic
    return {
      enabled: false,
      inProgress: false,
      lastWarmed: null,
      entities: [],
      message: 'Cache warming not yet implemented',
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Trigger cache warming for entity
   */
  @Post('warming/:entity')
  @Public()
  async warmCache(@Param('entity') entity: string) {
    // TODO: Implement cache warming logic
    return {
      entity,
      warming: false,
      message: 'Cache warming not yet implemented',
      timestamp: new Date().toISOString()
    }
  }

  // ===== QUEUE OPERATIONAL ENDPOINTS (Not metrics - those go to Prometheus) =====

  /**
   * Pause specific queue for maintenance
   */
  @Post('queue/:queueName/pause')
  @Public()
  @HttpCode(HttpStatus.OK)
  async pauseQueue(@Param('queueName') queueName: string) {
    try {
      if (queueName !== 'emails' && queueName !== 'payments') {
        return { error: 'Invalid queue name. Use: emails, payments' }
      }
      
      const queueKey = queueName.toUpperCase() as 'EMAILS' | 'PAYMENTS'
      await this.queueService.pauseQueue(queueKey)
      
      return {
        queue: queueName,
        action: 'paused',
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        error: `Failed to pause ${queueName} queue`,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Resume paused queue
   */
  @Post('queue/:queueName/resume')
  @Public()
  @HttpCode(HttpStatus.OK)
  async resumeQueue(@Param('queueName') queueName: string) {
    try {
      if (queueName !== 'emails' && queueName !== 'payments') {
        return { error: 'Invalid queue name. Use: emails, payments' }
      }
      
      const queueKey = queueName.toUpperCase() as 'EMAILS' | 'PAYMENTS'
      await this.queueService.resumeQueue(queueKey)
      
      return {
        queue: queueName,
        action: 'resumed',
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        error: `Failed to resume ${queueName} queue`,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Clean completed/failed jobs (operational task)
   */
  @Post('queue/:queueName/clean')
  @Public()
  @HttpCode(HttpStatus.OK)
  async cleanQueue(@Param('queueName') queueName: string) {
    try {
      if (queueName !== 'emails' && queueName !== 'payments') {
        return { error: 'Invalid queue name. Use: emails, payments' }
      }
      
      const queueKey = queueName.toUpperCase() as 'EMAILS' | 'PAYMENTS'
      await this.queueService.cleanQueue(queueKey)
      
      return {
        queue: queueName,
        action: 'cleaned',
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        error: `Failed to clean ${queueName} queue`,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Test queue connectivity (debugging)
   */
  @Post('queue/:queueName/test')
  @Public()
  async testQueue(@Param('queueName') queueName: string) {
    try {
      if (queueName !== 'emails' && queueName !== 'payments') {
        return { error: 'Invalid queue name. Use: emails, payments' }
      }
      
      const queueKey = queueName.toUpperCase() as 'EMAILS' | 'PAYMENTS'
      const testData = { test: true, timestamp: Date.now() }
      
      const job = await this.queueService.addJob(queueKey, 'debug-test', testData)
      
      return {
        queue: queueName,
        action: 'test_job_added',
        jobId: job.id,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        error: `Failed to test ${queueName} queue`,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}