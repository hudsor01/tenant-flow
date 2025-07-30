/**
 * Production Performance Monitoring Service
 * 
 * Comprehensive APM integration with Core Web Vitals tracking,
 * database performance monitoring, and real-time alerting
 */

import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PerformanceObserver } from 'perf_hooks'
import type { FastifyRequest, FastifyReply } from 'fastify'

export interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  tags?: Record<string, string>
  type: 'counter' | 'gauge' | 'histogram' | 'timer'
}

export interface DatabaseMetrics {
  queryTime: number
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  tableName?: string
  isSlowQuery: boolean
  connectionPoolSize: number
  activeConnections: number
}

export interface APIMetrics {
  endpoint: string
  method: string
  statusCode: number
  responseTime: number
  errorRate: number
  throughput: number
}

@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name)
  private metrics = new Map<string, PerformanceMetric[]>()
  private performanceObserver!: PerformanceObserver
  private alertThresholds!: Record<string, number>

  constructor(private configService: ConfigService) {
    this.setupPerformanceObserver()
    this.initializeAlertThresholds()
    this.startMetricsCollection()
  }

  private setupPerformanceObserver(): void {
    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        this.recordMetric({
          name: entry.name,
          value: entry.duration,
          timestamp: Date.now(),
          type: 'timer',
          tags: {
            entryType: entry.entryType
          }
        })
      })
    })

    this.performanceObserver.observe({ 
      entryTypes: ['measure', 'function', 'gc', 'http'] 
    })
  }

  private initializeAlertThresholds(): void {
    this.alertThresholds = {
      // API response time thresholds (ms)
      'api.response.time.p95': 2000,
      'api.response.time.p99': 5000,
      
      // Database query thresholds (ms)
      'db.query.time.avg': 500,
      'db.query.time.max': 2000,
      
      // Memory usage thresholds (MB)
      'memory.heap.used': 1024,
      'memory.heap.total': 2048,
      
      // Error rate thresholds (%)
      'error.rate.5min': 1.0,
      'error.rate.1min': 5.0,
      
      // Connection pool thresholds
      'db.pool.utilization': 80,
      'cache.hit.rate.min': 70
    }
  }

  private startMetricsCollection(): void {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics()
    }, 30000)

    // Collect GC metrics
    if (global.gc) {
      setInterval(() => {
        this.collectGCMetrics()
      }, 60000)
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    const key = metric.name
    if (!this.metrics.has(key)) {
      this.metrics.set(key, [])
    }

    const metrics = this.metrics.get(key)!
    metrics.push(metric)

    // Keep only last 1000 metrics per key
    if (metrics.length > 1000) {
      metrics.shift()
    }

    // Check for alert conditions
    this.checkAlertThresholds(metric)

    // Send to APM service
    this.sendToAPM(metric)
  }

  /**
   * Record API request metrics
   */
  recordAPIMetric(apiMetric: APIMetrics): void {
    const baseMetric = {
      timestamp: Date.now(),
      tags: {
        endpoint: apiMetric.endpoint,
        method: apiMetric.method,
        statusCode: apiMetric.statusCode.toString()
      }
    }

    this.recordMetric({
      ...baseMetric,
      name: 'api.response.time',
      value: apiMetric.responseTime,
      type: 'timer'
    })

    this.recordMetric({
      ...baseMetric,
      name: 'api.requests.total',
      value: 1,
      type: 'counter'
    })

    if (apiMetric.statusCode >= 400) {
      this.recordMetric({
        ...baseMetric,
        name: 'api.errors.total',
        value: 1,
        type: 'counter'
      })
    }
  }

  /**
   * Record database query metrics
   */
  recordDatabaseMetric(dbMetric: DatabaseMetrics): void {
    const baseMetric = {
      timestamp: Date.now(),
      tags: {
        queryType: dbMetric.queryType,
        tableName: dbMetric.tableName || 'unknown',
        isSlowQuery: dbMetric.isSlowQuery.toString()
      }
    }

    this.recordMetric({
      ...baseMetric,
      name: 'db.query.time',
      value: dbMetric.queryTime,
      type: 'timer'
    })

    this.recordMetric({
      ...baseMetric,
      name: 'db.pool.size',
      value: dbMetric.connectionPoolSize,
      type: 'gauge'
    })

    this.recordMetric({
      ...baseMetric,
      name: 'db.connections.active',
      value: dbMetric.activeConnections,
      type: 'gauge'
    })

    if (dbMetric.isSlowQuery) {
      this.recordMetric({
        ...baseMetric,
        name: 'db.slow.queries.total',
        value: 1,
        type: 'counter'
      })
    }
  }

  /**
   * Record Core Web Vitals (for frontend monitoring)
   */
  recordWebVital(name: 'FCP' | 'LCP' | 'FID' | 'CLS' | 'TTFB', value: number): void {
    this.recordMetric({
      name: `web.vitals.${name.toLowerCase()}`,
      value,
      timestamp: Date.now(),
      type: 'gauge',
      tags: {
        vital: name
      }
    })
  }

  /**
   * Get performance summary for monitoring dashboard
   */
  getPerformanceSummary(): Record<string, unknown> {
    const summary: Record<string, unknown> = {}

    for (const [metricName, metrics] of this.metrics.entries()) {
      if (metrics.length === 0) continue

      const values = metrics.map(m => m.value)
      const recent = metrics.filter(m => Date.now() - m.timestamp < 300000) // Last 5 minutes

      summary[metricName] = {
        count: metrics.length,
        recentCount: recent.length,
        avg: this.calculateAverage(values),
        min: Math.min(...values),
        max: Math.max(...values),
        p95: this.calculatePercentile(values, 95),
        p99: this.calculatePercentile(values, 99),
        lastUpdated: Math.max(...metrics.map(m => m.timestamp))
      }
    }

    return summary
  }

  /**
   * Get health check status based on metrics
   */
  getHealthStatus(): { status: 'healthy' | 'degraded' | 'unhealthy'; details: Record<string, unknown> } {
    const summary = this.getPerformanceSummary()
    const alerts: string[] = []
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

    // Check API response times
    const apiResponseTime = summary['api.response.time'] as { p95?: number } | undefined
    if (apiResponseTime?.p95 && apiResponseTime.p95 > (this.alertThresholds['api.response.time.p95'] || 1000)) {
      alerts.push(`High API response time: ${apiResponseTime.p95}ms`)
      status = 'degraded'
    }

    // Check database performance
    const dbQueryTime = summary['db.query.time'] as { avg?: number } | undefined
    if (dbQueryTime?.avg && dbQueryTime.avg > (this.alertThresholds['db.query.time.avg'] || 500)) {
      alerts.push(`High database query time: ${dbQueryTime.avg}ms`)
      status = 'degraded'
    }

    // Check error rates
    const errorRate = this.calculateErrorRate()
    if (errorRate && errorRate > (this.alertThresholds['error.rate.5min'] || 5)) {
      alerts.push(`High error rate: ${errorRate}%`)
      status = status === 'healthy' ? 'degraded' : 'unhealthy'
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage()
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024
    if (heapUsedMB && heapUsedMB > (this.alertThresholds['memory.heap.used'] || 512)) {
      alerts.push(`High memory usage: ${heapUsedMB.toFixed(2)}MB`)
      status = 'degraded'
    }

    return {
      status,
      details: {
        alerts,
        metrics: summary,
        memory: {
          heapUsed: `${heapUsedMB.toFixed(2)}MB`,
          heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
          external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)}MB`
        },
        uptime: `${(process.uptime() / 3600).toFixed(2)} hours`
      }
    }
  }

  private collectSystemMetrics(): void {
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    this.recordMetric({
      name: 'system.memory.heap.used',
      value: memoryUsage.heapUsed,
      timestamp: Date.now(),
      type: 'gauge'
    })

    this.recordMetric({
      name: 'system.memory.heap.total',
      value: memoryUsage.heapTotal,
      timestamp: Date.now(),
      type: 'gauge'
    })

    this.recordMetric({
      name: 'system.cpu.user',
      value: cpuUsage.user,
      timestamp: Date.now(),
      type: 'gauge'
    })

    this.recordMetric({
      name: 'system.cpu.system',
      value: cpuUsage.system,
      timestamp: Date.now(),
      type: 'gauge'
    })
  }

  private collectGCMetrics(): void {
    if (global.gc) {
      const before = process.memoryUsage()
      global.gc()
      const after = process.memoryUsage()

      this.recordMetric({
        name: 'gc.freed.memory',
        value: before.heapUsed - after.heapUsed,
        timestamp: Date.now(),
        type: 'gauge'
      })
    }
  }

  private checkAlertThresholds(metric: PerformanceMetric): void {
    const threshold = this.alertThresholds[metric.name]
    if (threshold && metric.value > threshold) {
      this.triggerAlert(metric, threshold)
    }
  }

  private triggerAlert(metric: PerformanceMetric, threshold: number): void {
    this.logger.warn(`🚨 Performance Alert: ${metric.name} = ${metric.value} exceeds threshold ${threshold}`, {
      metric: metric.name,
      value: metric.value,
      threshold,
      tags: metric.tags
    })

    // Send to external alerting system (Slack, PagerDuty, etc.)
    this.sendAlert({
      title: `Performance Alert: ${metric.name}`,
      message: `Metric ${metric.name} value ${metric.value} exceeds threshold ${threshold}`,
      severity: metric.value > threshold * 2 ? 'critical' : 'warning',
      metric,
      threshold
    })
  }

  private async sendAlert(alert: {
    title: string
    message: string
    severity: 'warning' | 'critical'
    metric: PerformanceMetric
    threshold: number
  }): Promise<void> {
    // Implementation for external alerting
    // Could integrate with Slack, PagerDuty, email, etc.
    
    const webhookUrl = this.configService.get<string>('ALERT_WEBHOOK_URL')
    if (webhookUrl) {
      try {
        // Send webhook notification
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert)
        })
      } catch (error) {
        this.logger.error('Failed to send alert webhook:', error)
      }
    }
  }

  private sendToAPM(metric: PerformanceMetric): void {
    // Integration with APM services (New Relic, DataDog, etc.)
    const apmEndpoint = this.configService.get<string>('APM_ENDPOINT')
    const apmApiKey = this.configService.get<string>('APM_API_KEY')

    if (apmEndpoint && apmApiKey) {
      // Send to APM service asynchronously
      setImmediate(async () => {
        try {
          await fetch(apmEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apmApiKey}`
            },
            body: JSON.stringify({
              metric: metric.name,
              value: metric.value,
              timestamp: metric.timestamp,
              tags: metric.tags,
              type: metric.type
            })
          })
        } catch {
          // Don't log APM errors to avoid noise
        }
      })
    }
  }

  private calculateAverage(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0
    
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)] || 0
  }

  private calculateErrorRate(): number {
    const totalRequests = this.metrics.get('api.requests.total')?.length || 0
    const totalErrors = this.metrics.get('api.errors.total')?.length || 0
    
    return totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0
  }
}

/**
 * Performance monitoring hook for Fastify
 * Records API metrics for all requests
 */
export function createPerformanceHook(performanceMonitor: PerformanceMonitorService) {
  return {
    preHandler: async (request: FastifyRequest, _reply: FastifyReply) => {
      request.startTime = Date.now()
    },
    
    onResponse: async (request: FastifyRequest, reply: FastifyReply) => {
      if (request.startTime && performanceMonitor) {
        const responseTime = Date.now() - request.startTime
        
        performanceMonitor.recordAPIMetric({
          endpoint: request.routeOptions?.url || request.url,
          method: request.method,
          statusCode: reply.statusCode,
          responseTime,
          errorRate: reply.statusCode >= 400 ? 1 : 0,
          throughput: 1
        })
      }
    }
  }
}