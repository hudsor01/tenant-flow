
/**
 * Prisma Accelerate Middleware
 * Performance monitoring and optimization
 */

import type { PrismaClient } from '@prisma/client'
import { Logger } from '@nestjs/common'

export class AccelerateMiddleware {
  private logger = new Logger('AccelerateMiddleware')
  private metrics = new Map<string, { timestamp: number; duration: number }[]>()

  constructor(private prisma: PrismaClient) {
    this.setupMiddleware()
    this.startMetricsCollection()
  }

  private setupMiddleware() {
    // Query performance tracking
    this.prisma.$use(async (params, next) => {
      const start = Date.now()
      
      try {
        const result = await next(params)
        const duration = Date.now() - start
        
        // Record metrics
        this.recordQueryMetric(params.model || 'unknown', params.action || 'unknown', duration)
        
        // Log slow queries
        if (duration > 500) {
          this.logger.warn(`Slow query detected: ${params.model}.${params.action} took ${duration}ms`)
        }
        
        return result
      } catch (error) {
        const duration = Date.now() - start
        this.logger.error(`Query failed: ${params.model}.${params.action} after ${duration}ms`, error)
        throw error
      }
    })

    // Cache hit tracking
    this.prisma.$use(async (params, next) => {
      const cacheHint = this.getCacheHint(params.model, params.action)
      if (cacheHint) {
        // Add cache headers or hints
        params.args = params.args || {}
        params.args._cacheHint = cacheHint
      }
      
      return next(params)
    })
  }

  private recordQueryMetric(model: string, action: string, duration: number) {
    const key = `${model}.${action}`
    if (!this.metrics.has(key)) {
      this.metrics.set(key, [])
    }
    
    const metrics = this.metrics.get(key)
    if (metrics) {
      metrics.push({ timestamp: Date.now(), duration })
      
      // Keep only last 100 metrics per operation
      if (metrics.length > 100) {
        metrics.shift()
      }
    }
  }

  private getCacheHint(model: string | undefined, action: string | undefined): { ttl: number; tags: string[] } | null {
    if (!model || !action) return null
    
    // Cache hints based on model and operation
    const cacheRules: Record<string, Record<string, { ttl: number; tags: string[] }>> = {
      Property: {
        findMany: { ttl: 600, tags: ['property'] },
        findUnique: { ttl: 600, tags: ['property'] },
        findFirst: { ttl: 300, tags: ['property'] }
      },
      Tenant: {
        findMany: { ttl: 300, tags: ['tenant'] },
        findUnique: { ttl: 300, tags: ['tenant'] }
      },
      Lease: {
        findMany: { ttl: 600, tags: ['lease'] },
        findUnique: { ttl: 600, tags: ['lease'] }
      },
      MaintenanceRequest: {
        findMany: { ttl: 180, tags: ['maintenance'] },
        findUnique: { ttl: 180, tags: ['maintenance'] }
      }
    }
    
    return cacheRules[model]?.[action] || null
  }

  /**
   * Get performance metrics summary
   */
  getMetrics() {
    const summary: Record<string, {
      count: number
      avgDuration: number
      p95Duration: number
      p99Duration: number
      slowQueries: number
    }> = {}
    
    // Convert Map entries to array to avoid iterator issues
    const metricsEntries = Array.from(this.metrics.entries())
    
    for (const [operation, metrics] of metricsEntries) {
      const recent = metrics.filter(m => Date.now() - m.timestamp < 300000) // Last 5 minutes
      const durations = recent.map(m => m.duration)
      
      if (durations.length > 0) {
        summary[operation] = {
          count: recent.length,
          avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
          p95Duration: this.calculatePercentile(durations, 95),
          p99Duration: this.calculatePercentile(durations, 99),
          slowQueries: durations.filter(d => d > 500).length
        }
      }
    }
    
    return summary
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[index] || 0
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const metrics = this.getMetrics()
    const report = {
      timestamp: new Date().toISOString(),
      totalOperations: Object.keys(metrics).length,
      metrics,
      recommendations: this.generateRecommendations(metrics)
    }
    
    return report
  }

  private generateRecommendations(metrics: Record<string, { avgDuration: number; p95Duration: number; slowQueries: number }>): string[] {
    const recommendations = []
    
    for (const [operation, stats] of Object.entries(metrics)) {
      const { avgDuration, p95Duration, slowQueries } = stats
      
      if (avgDuration > 200) {
        recommendations.push(`Consider optimizing ${operation} - average duration ${avgDuration}ms`)
      }
      
      if (p95Duration > 1000) {
        recommendations.push(`${operation} has high P95 latency (${p95Duration}ms) - check indexes`)
      }
      
      if (slowQueries > 5) {
        recommendations.push(`${operation} has ${slowQueries} slow queries - investigate query pattern`)
      }
    }
    
    return recommendations
  }

  private startMetricsCollection() {
    // Export metrics every minute
    setInterval(() => {
      const report = this.generateReport()
      this.logger.log('Accelerate Performance Report:', JSON.stringify(report, null, 2))
    }, 60000)
  }
}

// Usage in your Prisma service
export function setupAccelerateMonitoring(prisma: PrismaClient): AccelerateMiddleware {
  return new AccelerateMiddleware(prisma)
}
