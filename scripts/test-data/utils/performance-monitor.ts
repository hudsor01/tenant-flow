/**
 * Performance Monitor for Test Data Operations
 * 
 * Tracks timing, memory usage, and operation metrics during test data seeding
 * to help optimize performance and identify bottlenecks.
 */

import { performance } from 'perf_hooks'

export interface PerformanceMetric {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  memoryStart?: NodeJS.MemoryUsage
  memoryEnd?: NodeJS.MemoryUsage
  memoryDelta?: {
    rss: number
    heapUsed: number
    heapTotal: number
    external: number
  }
  operations?: number
  metadata?: Record<string, any>
}

export interface PerformanceSummary {
  totalDuration: number
  totalOperations: number
  operationsPerSecond: number
  memoryPeakUsage: number
  memoryEfficiency: number
  slowestOperations: PerformanceMetric[]
  recommendations: string[]
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private completedMetrics: PerformanceMetric[] = []
  private enabled: boolean = true

  constructor(enabled: boolean = true) {
    this.enabled = enabled
  }

  start(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return

    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      memoryStart: process.memoryUsage(),
      operations: 0,
      metadata: metadata || {}
    }

    this.metrics.set(name, metric)
  }

  end(name: string, operations?: number): PerformanceMetric | null {
    if (!this.enabled) return null

    const metric = this.metrics.get(name)
    if (!metric) {
      console.warn(`Performance metric '${name}' not found`)
      return null
    }

    const endTime = performance.now()
    const memoryEnd = process.memoryUsage()
    const duration = endTime - metric.startTime

    const completedMetric: PerformanceMetric = {
      ...metric,
      endTime,
      duration,
      memoryEnd,
      memoryDelta: {
        rss: memoryEnd.rss - metric.memoryStart!.rss,
        heapUsed: memoryEnd.heapUsed - metric.memoryStart!.heapUsed,
        heapTotal: memoryEnd.heapTotal - metric.memoryStart!.heapTotal,
        external: memoryEnd.external - metric.memoryStart!.external
      },
      operations: operations || metric.operations
    }

    this.completedMetrics.push(completedMetric)
    this.metrics.delete(name)

    return completedMetric
  }

  incrementOperations(name: string, count: number = 1): void {
    if (!this.enabled) return

    const metric = this.metrics.get(name)
    if (metric) {
      metric.operations = (metric.operations || 0) + count
    }
  }

  addMetadata(name: string, metadata: Record<string, any>): void {
    if (!this.enabled) return

    const metric = this.metrics.get(name)
    if (metric) {
      metric.metadata = { ...metric.metadata, ...metadata }
    }
  }

  getMetric(name: string): PerformanceMetric | null {
    return this.completedMetrics.find(m => m.name === name) || null
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.completedMetrics]
  }

  getCurrentMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values())
  }

  clear(): void {
    this.metrics.clear()
    this.completedMetrics = []
  }

  disable(): void {
    this.enabled = false
  }

  enable(): void {
    this.enabled = true
  }

  generateSummary(): PerformanceSummary {
    const metrics = this.getMetrics()
    
    if (metrics.length === 0) {
      return {
        totalDuration: 0,
        totalOperations: 0,
        operationsPerSecond: 0,
        memoryPeakUsage: 0,
        memoryEfficiency: 1,
        slowestOperations: [],
        recommendations: ['No performance data collected']
      }
    }

    const totalDuration = metrics.reduce((sum, m) => sum + (m.duration || 0), 0)
    const totalOperations = metrics.reduce((sum, m) => sum + (m.operations || 0), 0)
    const operationsPerSecond = totalOperations / (totalDuration / 1000)

    // Memory analysis
    const memoryPeakUsage = Math.max(
      ...metrics.map(m => m.memoryEnd?.heapUsed || 0)
    )
    const memoryStart = metrics[0]?.memoryStart?.heapUsed || 0
    const memoryEnd = metrics[metrics.length - 1]?.memoryEnd?.heapUsed || 0
    const memoryEfficiency = memoryStart / Math.max(memoryEnd, 1)

    // Find slowest operations
    const slowestOperations = metrics
      .filter(m => m.duration)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 5)

    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, {
      totalDuration,
      totalOperations,
      operationsPerSecond,
      memoryPeakUsage,
      memoryEfficiency
    })

    return {
      totalDuration,
      totalOperations,
      operationsPerSecond,
      memoryPeakUsage,
      memoryEfficiency,
      slowestOperations,
      recommendations
    }
  }

  private generateRecommendations(
    metrics: PerformanceMetric[],
    summary: Partial<PerformanceSummary>
  ): string[] {
    const recommendations: string[] = []

    // Performance recommendations
    if (summary.operationsPerSecond! < 10) {
      recommendations.push('Consider batching operations to improve throughput')
    }

    // Memory recommendations
    if (summary.memoryPeakUsage! > 500 * 1024 * 1024) { // > 500MB
      recommendations.push('High memory usage detected - consider processing data in smaller chunks')
    }

    if (summary.memoryEfficiency! < 0.5) {
      recommendations.push('Memory usage grew significantly - check for memory leaks')
    }

    // Operation-specific recommendations
    const slowOperations = metrics.filter(m => (m.duration || 0) > 5000) // > 5 seconds
    if (slowOperations.length > 0) {
      recommendations.push(`Slow operations detected: ${slowOperations.map(o => o.name).join(', ')}`)
    }

    // Database-specific recommendations
    const dbOperations = metrics.filter(m => m.name.includes('database') || m.name.includes('prisma'))
    if (dbOperations.length > 0) {
      const avgDbTime = dbOperations.reduce((sum, op) => sum + (op.duration || 0), 0) / dbOperations.length
      if (avgDbTime > 1000) { // > 1 second average
        recommendations.push('Consider using database transactions for batch operations')
      }
    }

    // If no issues found
    if (recommendations.length === 0) {
      recommendations.push('Performance looks good! No optimization recommendations at this time.')
    }

    return recommendations
  }

  formatMetric(metric: PerformanceMetric): string {
    const duration = metric.duration ? `${metric.duration.toFixed(2)}ms` : 'ongoing'
    const operations = metric.operations ? ` (${metric.operations} ops)` : ''
    const memory = metric.memoryDelta 
      ? ` [Memory: ${this.formatBytes(metric.memoryDelta.heapUsed)}]`
      : ''
    
    return `${metric.name}: ${duration}${operations}${memory}`
  }

  formatSummary(summary: PerformanceSummary): string {
    const lines = [
      '📊 Performance Summary',
      '─'.repeat(50),
      `Total Duration: ${summary.totalDuration.toFixed(2)}ms`,
      `Total Operations: ${summary.totalOperations}`,
      `Operations/Second: ${summary.operationsPerSecond.toFixed(2)}`,
      `Memory Peak Usage: ${this.formatBytes(summary.memoryPeakUsage)}`,
      `Memory Efficiency: ${(summary.memoryEfficiency * 100).toFixed(1)}%`,
      '',
      '🐌 Slowest Operations:',
      ...summary.slowestOperations.map(op => 
        `  • ${op.name}: ${op.duration?.toFixed(2)}ms`
      ),
      '',
      '💡 Recommendations:',
      ...summary.recommendations.map(rec => `  • ${rec}`)
    ]

    return lines.join('\n')
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k))
    
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  // Utility methods for common patterns
  async timeAsync<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    this.start(name, metadata)
    try {
      const result = await fn()
      this.end(name)
      return result
    } catch (error) {
      this.end(name)
      throw error
    }
  }

  timeSync<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    this.start(name, metadata)
    try {
      const result = fn()
      this.end(name)
      return result
    } catch (error) {
      this.end(name)
      throw error
    }
  }

  // Batch operation tracking
  trackBatch<T>(
    name: string, 
    items: T[], 
    processor: (item: T, index: number) => Promise<any>,
    batchSize: number = 50
  ): Promise<any[]> {
    return new Promise(async (resolve, reject) => {
      this.start(name, { totalItems: items.length, batchSize })
      
      try {
        const results = []
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize)
          const batchResults = await Promise.all(
            batch.map((item, index) => processor(item, i + index))
          )
          results.push(...batchResults)
          this.incrementOperations(name, batch.length)
        }
        
        this.end(name, items.length)
        resolve(results)
      } catch (error) {
        this.end(name, items.length)
        reject(error)
      }
    })
  }
}