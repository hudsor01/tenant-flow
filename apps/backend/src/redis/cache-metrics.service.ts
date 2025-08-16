import { Injectable, Logger } from '@nestjs/common'

/**
 * Cache metrics tracking service
 */
@Injectable()
export class CacheMetricsService {
  private readonly logger = new Logger(CacheMetricsService.name)
  
  // In-memory metrics (in production, use Redis or external metrics service)
  private readonly metrics = {
    hits: new Map<string, number>(),
    misses: new Map<string, number>(),
    errors: new Map<string, number>(),
    responseTime: new Map<string, number[]>(),
    totalRequests: 0,
    totalHits: 0,
    totalMisses: 0,
    totalErrors: 0
  }

  /**
   * Record a cache hit
   */
  recordHit(key: string, responseTimeMs?: number): void {
    const prefix = this.extractPrefix(key)
    
    this.metrics.hits.set(prefix, (this.metrics.hits.get(prefix) || 0) + 1)
    this.metrics.totalHits++
    this.metrics.totalRequests++
    
    if (responseTimeMs !== undefined) {
      this.recordResponseTime(prefix, responseTimeMs)
    }
  }

  /**
   * Record a cache miss
   */
  recordMiss(key: string, responseTimeMs?: number): void {
    const prefix = this.extractPrefix(key)
    
    this.metrics.misses.set(prefix, (this.metrics.misses.get(prefix) || 0) + 1)
    this.metrics.totalMisses++
    this.metrics.totalRequests++
    
    if (responseTimeMs !== undefined) {
      this.recordResponseTime(prefix, responseTimeMs)
    }
  }

  /**
   * Record a cache error
   */
  recordError(key: string, error: Error): void {
    const prefix = this.extractPrefix(key)
    
    this.metrics.errors.set(prefix, (this.metrics.errors.get(prefix) || 0) + 1)
    this.metrics.totalErrors++
    
    this.logger.warn(`Cache error for ${prefix}: ${error.message}`)
  }

  /**
   * Record response time
   */
  private recordResponseTime(prefix: string, responseTimeMs: number): void {
    if (!this.metrics.responseTime.has(prefix)) {
      this.metrics.responseTime.set(prefix, [])
    }
    
    const times = this.metrics.responseTime.get(prefix) ?? []
    times.push(responseTimeMs)
    
    // Keep only last 100 measurements to prevent memory leak
    if (times.length > 100) {
      times.shift()
    }
  }

  /**
   * Get overall cache statistics
   */
  getOverallStats(): {
    totalRequests: number
    totalHits: number
    totalMisses: number
    totalErrors: number
    hitRate: number
    missRate: number
    errorRate: number
  } {
    const { totalRequests, totalHits, totalMisses, totalErrors } = this.metrics
    
    return {
      totalRequests,
      totalHits,
      totalMisses,
      totalErrors,
      hitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0,
      missRate: totalRequests > 0 ? (totalMisses / totalRequests) * 100 : 0,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0
    }
  }

  /**
   * Get per-entity cache statistics
   */
  getEntityStats(): Record<string, {
    hits: number
    misses: number
    errors: number
    hitRate: number
    avgResponseTime?: number
  }> {
    const stats: Record<string, {
      hits: number
      misses: number
      errors: number
      hitRate: number
      avgResponseTime?: number
    }> = {}
    
    // Get all unique prefixes
    const allPrefixes = new Set([
      ...this.metrics.hits.keys(),
      ...this.metrics.misses.keys(),
      ...this.metrics.errors.keys()
    ])
    
    allPrefixes.forEach(prefix => {
      const hits = this.metrics.hits.get(prefix) || 0
      const misses = this.metrics.misses.get(prefix) || 0
      const errors = this.metrics.errors.get(prefix) || 0
      const total = hits + misses
      
      stats[prefix] = {
        hits,
        misses,
        errors,
        hitRate: total > 0 ? (hits / total) * 100 : 0
      }
      
      // Calculate average response time
      const responseTimes = this.metrics.responseTime.get(prefix)
      if (responseTimes && responseTimes.length > 0) {
        const sum = responseTimes.reduce((a, b) => a + b, 0)
        stats[prefix].avgResponseTime = sum / responseTimes.length
      }
    })
    
    return stats
  }

  /**
   * Get detailed performance metrics
   */
  getPerformanceMetrics(): {
    byEntity: Record<string, {
      p50: number
      p95: number
      p99: number
      min: number
      max: number
      count: number
    }>
    overall: {
      slowestEntity: string
      fastestEntity: string
      averageResponseTime: number
    }
  } {
    const byEntity: Record<string, {
      p50: number
      p95: number
      p99: number
      min: number
      max: number
      count: number
    }> = {}
    const overallTimes: number[] = []
    
    this.metrics.responseTime.forEach((times, prefix) => {
      if (times.length === 0) return
      
      const sorted = [...times].sort((a, b) => a - b)
      byEntity[prefix] = {
        p50: this.percentile(sorted, 50),
        p95: this.percentile(sorted, 95),
        p99: this.percentile(sorted, 99),
        min: sorted[0] ?? 0,
        max: sorted[sorted.length - 1] ?? 0,
        count: sorted.length
      }
      
      overallTimes.push(...times)
    })
    
    // Calculate overall metrics
    const entityAvgs = Object.entries(byEntity).map(([entity, metrics]) => ({
      entity,
      avg: metrics.p50
    }))
    
    const slowestEntity = entityAvgs.reduce((slowest, current) => 
      current.avg > slowest.avg ? current : slowest, 
      { entity: 'none', avg: 0 }
    )
    
    const fastestEntity = entityAvgs.reduce((fastest, current) => 
      current.avg < fastest.avg ? current : fastest, 
      { entity: 'none', avg: Infinity }
    )
    
    const averageResponseTime = overallTimes.length > 0 
      ? overallTimes.reduce((a, b) => a + b, 0) / overallTimes.length 
      : 0
    
    return {
      byEntity,
      overall: {
        slowestEntity: slowestEntity.entity,
        fastestEntity: fastestEntity.entity,
        averageResponseTime
      }
    }
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.metrics.hits.clear()
    this.metrics.misses.clear()
    this.metrics.errors.clear()
    this.metrics.responseTime.clear()
    this.metrics.totalRequests = 0
    this.metrics.totalHits = 0
    this.metrics.totalMisses = 0
    this.metrics.totalErrors = 0
  }

  /**
   * Extract entity prefix from cache key
   */
  private extractPrefix(key: string): string {
    const parts = key.split(':')
    return parts.length > 0 ? (parts[0] ?? 'unknown') : 'unknown'
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0
    
    const index = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))] ?? 0
  }

  /**
   * Get health status based on metrics
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    issues: string[]
    recommendations: string[]
  } {
    const overallStats = this.getOverallStats()
    const performanceMetrics = this.getPerformanceMetrics()
    
    const issues: string[] = []
    const recommendations: string[] = []
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    // Check hit rate
    if (overallStats.hitRate < 50) {
      issues.push(`Low cache hit rate: ${overallStats.hitRate.toFixed(1)}%`)
      recommendations.push('Consider increasing cache TTL or reviewing cache strategy')
      status = 'degraded'
    }
    
    // Check error rate
    if (overallStats.errorRate > 5) {
      issues.push(`High cache error rate: ${overallStats.errorRate.toFixed(1)}%`)
      recommendations.push('Investigate cache service connectivity and error logs')
      status = 'unhealthy'
    }
    
    // Check response times
    if (performanceMetrics.overall.averageResponseTime > 100) {
      issues.push(`Slow cache response time: ${performanceMetrics.overall.averageResponseTime.toFixed(1)}ms`)
      recommendations.push('Consider cache service optimization or hardware upgrade')
      if (status === 'healthy') status = 'degraded'
    }
    
    return { status, issues, recommendations }
  }
}