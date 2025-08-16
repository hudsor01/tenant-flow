import { Injectable, Logger } from '@nestjs/common'
import { MetricsService } from '../common/services/metrics.service'
import { StructuredLoggerService } from '../common/logging/structured-logger.service'
// Remove unused Stripe import

export interface WebhookMetrics {
  eventType: string
  processingTime: number
  success: boolean
  errorType?: string
  errorMessage?: string
  retryAttempt?: number
  correlationId: string
  timestamp: Date
  memoryUsage: NodeJS.MemoryUsage
}

export interface WebhookPerformanceStats {
  eventType: string
  totalEvents: number
  successCount: number
  failureCount: number
  successRate: number
  averageProcessingTime: number
  p50ProcessingTime: number
  p95ProcessingTime: number
  p99ProcessingTime: number
  minProcessingTime: number
  maxProcessingTime: number
  totalProcessingTime: number
  lastEventTimestamp?: Date
  errorBreakdown: Record<string, number>
}

export interface WebhookAlertThresholds {
  maxProcessingTime: number // ms
  minSuccessRate: number // percentage
  maxErrorRate: number // events per minute
  maxMemoryUsage: number // MB
  criticalFailureCount: number // consecutive failures
}

export interface IdempotencyMetrics {
  totalChecks: number
  duplicateEvents: number
  duplicateRate: number
  cacheSize: number
  cacheHitRate: number
  memoryUsage: number // bytes
}

@Injectable()
export class WebhookMetricsService {
  private readonly logger = new Logger(WebhookMetricsService.name)
  private readonly structuredLogger: StructuredLoggerService
  private readonly webhookMetrics: WebhookMetrics[] = []
  private readonly maxMetricsInMemory = 5000 // Keep last 5000 events
  private consecutiveFailures = new Map<string, number>()
  private readonly performanceCache = new Map<string, WebhookPerformanceStats>()
  private cacheUpdateInterval: NodeJS.Timeout | null = null

  // Default alert thresholds - can be configured
  private alertThresholds: WebhookAlertThresholds = {
    maxProcessingTime: 5000, // 5 seconds
    minSuccessRate: 95, // 95%
    maxErrorRate: 10, // 10 errors per minute
    maxMemoryUsage: 512, // 512 MB
    criticalFailureCount: 5 // 5 consecutive failures
  }

  constructor(private readonly metricsService: MetricsService) {
    this.structuredLogger = new StructuredLoggerService('WebhookMetrics')
    
    // Update performance cache every minute
    this.cacheUpdateInterval = setInterval(() => {
      this.updatePerformanceCache()
    }, 60000)

    // Log webhook metrics summary every 10 minutes
    setInterval(() => {
      this.logMetricsSummary()
    }, 10 * 60 * 1000)
  }

  /**
   * Record webhook event processing metrics
   */
  recordWebhookEvent(
    eventType: string,
    processingTime: number,
    success: boolean,
    correlationId: string,
    error?: Error,
    retryAttempt?: number
  ): void {
    const metrics: WebhookMetrics = {
      eventType,
      processingTime,
      success,
      errorType: error?.constructor.name,
      errorMessage: error?.message,
      retryAttempt,
      correlationId,
      timestamp: new Date(),
      memoryUsage: process.memoryUsage()
    }

    // Store metrics
    this.webhookMetrics.push(metrics)
    
    // Trim old metrics to prevent memory leaks
    if (this.webhookMetrics.length > this.maxMetricsInMemory) {
      this.webhookMetrics.shift()
    }

    // Track consecutive failures for alerting
    this.trackConsecutiveFailures(eventType, success)

    // Record in general metrics service for system-wide tracking
    this.metricsService.recordMetric({
      operation: `webhook.${eventType}`,
      duration: processingTime,
      success,
      metadata: {
        eventType,
        correlationId,
        retryAttempt,
        errorType: metrics.errorType,
        memoryUsageMB: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024)
      }
    })

    // Check for alerts
    this.checkAlerts(metrics)

    // Log structured event
    this.logWebhookEvent(metrics)
  }

  /**
   * Record idempotency check metrics
   */
  recordIdempotencyCheck(
    eventId: string,
    wasDuplicate: boolean,
    cacheSize: number,
    correlationId: string
  ): void {
    this.structuredLogger.debug('Idempotency check performed', {
      eventId,
      wasDuplicate,
      cacheSize,
      correlationId,
      operation: 'webhook.idempotency_check'
    })

    // Track idempotency metrics
    this.metricsService.recordMetric({
      operation: 'webhook.idempotency_check',
      duration: 0, // Idempotency checks are near-instantaneous
      success: true,
      metadata: {
        eventId,
        wasDuplicate,
        cacheSize,
        correlationId
      }
    })
  }

  /**
   * Get performance statistics for a specific event type or all events
   */
  getPerformanceStats(eventType?: string): WebhookPerformanceStats | null {
    if (eventType) {
      return this.performanceCache.get(eventType) || this.calculatePerformanceStats(eventType)
    }
    
    // Return aggregated stats for all event types
    return this.calculateAggregatedStats()
  }

  /**
   * Get all event types being tracked
   */
  getTrackedEventTypes(): string[] {
    const eventTypes = new Set(this.webhookMetrics.map(m => m.eventType))
    return Array.from(eventTypes)
  }

  /**
   * Get idempotency metrics from processed events cache
   */
  getIdempotencyMetrics(processedEventsSet: Set<string>): IdempotencyMetrics {
    const totalChecks = this.webhookMetrics.length
    const duplicateEvents = this.webhookMetrics.filter(m => 
      this.webhookMetrics.some(other => 
        other.correlationId === m.correlationId && other.timestamp < m.timestamp
      )
    ).length

    // Estimate memory usage of the Set (approximate)
    const averageEventIdLength = 30 // Stripe event IDs are typically around 30 chars
    const memoryUsage = processedEventsSet.size * averageEventIdLength * 2 // 2 bytes per char in JS

    return {
      totalChecks,
      duplicateEvents,
      duplicateRate: totalChecks > 0 ? (duplicateEvents / totalChecks) * 100 : 0,
      cacheSize: processedEventsSet.size,
      cacheHitRate: totalChecks > 0 ? (duplicateEvents / totalChecks) * 100 : 0,
      memoryUsage
    }
  }

  /**
   * Get recent errors with context
   */
  getRecentErrors(limit = 50): {
    eventType: string
    errorType: string
    errorMessage: string
    timestamp: Date
    correlationId: string
    processingTime: number
  }[] {
    return this.webhookMetrics
      .filter(m => !m.success && m.errorType && m.errorMessage)
      .slice(-limit)
      .map(m => ({
        eventType: m.eventType,
        errorType: m.errorType || 'unknown',
        errorMessage: m.errorMessage || 'no message',
        timestamp: m.timestamp,
        correlationId: m.correlationId,
        processingTime: m.processingTime
      }))
  }

  /**
   * Update alert thresholds
   */
  updateAlertThresholds(thresholds: Partial<WebhookAlertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds }
    this.logger.log('Updated webhook alert thresholds', { thresholds: this.alertThresholds })
  }

  /**
   * Get current alert thresholds
   */
  getAlertThresholds(): WebhookAlertThresholds {
    return { ...this.alertThresholds }
  }

  /**
   * Clear metrics (useful for testing)
   */
  clearMetrics(): void {
    this.webhookMetrics.length = 0
    this.consecutiveFailures.clear()
    this.performanceCache.clear()
    this.logger.log('Webhook metrics cleared')
  }

  /**
   * Get health status based on recent metrics
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical'
    issues: string[]
    metrics: {
      recentSuccessRate: number
      averageProcessingTime: number
      activeEventTypes: number
      memoryUsageMB: number
    }
  } {
    const issues: string[] = []
    const recentMetrics = this.webhookMetrics.slice(-100) // Last 100 events
    
    if (recentMetrics.length === 0) {
      return {
        status: 'healthy',
        issues: ['No recent webhook activity'],
        metrics: {
          recentSuccessRate: 100,
          averageProcessingTime: 0,
          activeEventTypes: 0,
          memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
        }
      }
    }

    const successCount = recentMetrics.filter(m => m.success).length
    const recentSuccessRate = (successCount / recentMetrics.length) * 100
    const averageProcessingTime = recentMetrics.reduce((sum, m) => sum + m.processingTime, 0) / recentMetrics.length
    const activeEventTypes = new Set(recentMetrics.map(m => m.eventType)).size
    const memoryUsageMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024)

    // Check for issues
    if (recentSuccessRate < this.alertThresholds.minSuccessRate) {
      issues.push(`Low success rate: ${recentSuccessRate.toFixed(1)}%`)
    }

    if (averageProcessingTime > this.alertThresholds.maxProcessingTime) {
      issues.push(`High processing time: ${averageProcessingTime.toFixed(0)}ms`)
    }

    if (memoryUsageMB > this.alertThresholds.maxMemoryUsage) {
      issues.push(`High memory usage: ${memoryUsageMB}MB`)
    }

    // Check for consecutive failures
    for (const [eventType, failures] of this.consecutiveFailures) {
      if (failures >= this.alertThresholds.criticalFailureCount) {
        issues.push(`Critical: ${failures} consecutive failures for ${eventType}`)
      }
    }

    const status = issues.some(i => i.startsWith('Critical:')) ? 'critical' :
                  issues.length > 0 ? 'warning' : 'healthy'

    return {
      status,
      issues,
      metrics: {
        recentSuccessRate,
        averageProcessingTime,
        activeEventTypes,
        memoryUsageMB
      }
    }
  }

  /**
   * Cleanup resources
   */
  onModuleDestroy(): void {
    if (this.cacheUpdateInterval) {
      clearInterval(this.cacheUpdateInterval)
    }
  }

  private trackConsecutiveFailures(eventType: string, success: boolean): void {
    if (success) {
      this.consecutiveFailures.delete(eventType)
    } else {
      const current = this.consecutiveFailures.get(eventType) || 0
      this.consecutiveFailures.set(eventType, current + 1)
    }
  }

  private calculatePerformanceStats(eventType: string): WebhookPerformanceStats {
    const relevantMetrics = this.webhookMetrics.filter(m => m.eventType === eventType)
    
    if (relevantMetrics.length === 0) {
      return {
        eventType,
        totalEvents: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        averageProcessingTime: 0,
        p50ProcessingTime: 0,
        p95ProcessingTime: 0,
        p99ProcessingTime: 0,
        minProcessingTime: 0,
        maxProcessingTime: 0,
        totalProcessingTime: 0,
        errorBreakdown: {}
      }
    }

    const successCount = relevantMetrics.filter(m => m.success).length
    const failureCount = relevantMetrics.length - successCount
    const processingTimes = relevantMetrics.map(m => m.processingTime).sort((a, b) => a - b)
    const totalProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0)

    // Calculate percentiles
    const p50 = this.calculatePercentile(processingTimes, 50)
    const p95 = this.calculatePercentile(processingTimes, 95)
    const p99 = this.calculatePercentile(processingTimes, 99)

    // Error breakdown
    const errorBreakdown: Record<string, number> = {}
    relevantMetrics.filter(m => !m.success && m.errorType).forEach(m => {
      const errorType = m.errorType || 'unknown'
      errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1
    })

    const stats: WebhookPerformanceStats = {
      eventType,
      totalEvents: relevantMetrics.length,
      successCount,
      failureCount,
      successRate: (successCount / relevantMetrics.length) * 100,
      averageProcessingTime: totalProcessingTime / relevantMetrics.length,
      p50ProcessingTime: p50,
      p95ProcessingTime: p95,
      p99ProcessingTime: p99,
      minProcessingTime: Math.min(...processingTimes),
      maxProcessingTime: Math.max(...processingTimes),
      totalProcessingTime,
      lastEventTimestamp: relevantMetrics[relevantMetrics.length - 1]?.timestamp,
      errorBreakdown
    }

    return stats
  }

  private calculateAggregatedStats(): WebhookPerformanceStats {
    if (this.webhookMetrics.length === 0) {
      return {
        eventType: 'all',
        totalEvents: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        averageProcessingTime: 0,
        p50ProcessingTime: 0,
        p95ProcessingTime: 0,
        p99ProcessingTime: 0,
        minProcessingTime: 0,
        maxProcessingTime: 0,
        totalProcessingTime: 0,
        errorBreakdown: {}
      }
    }

    const successCount = this.webhookMetrics.filter(m => m.success).length
    const failureCount = this.webhookMetrics.length - successCount
    const processingTimes = this.webhookMetrics.map(m => m.processingTime).sort((a, b) => a - b)
    const totalProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0)

    // Error breakdown
    const errorBreakdown: Record<string, number> = {}
    this.webhookMetrics.filter(m => !m.success && m.errorType).forEach(m => {
      const errorType = m.errorType || 'unknown'
      errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1
    })

    return {
      eventType: 'all',
      totalEvents: this.webhookMetrics.length,
      successCount,
      failureCount,
      successRate: (successCount / this.webhookMetrics.length) * 100,
      averageProcessingTime: totalProcessingTime / this.webhookMetrics.length,
      p50ProcessingTime: this.calculatePercentile(processingTimes, 50),
      p95ProcessingTime: this.calculatePercentile(processingTimes, 95),
      p99ProcessingTime: this.calculatePercentile(processingTimes, 99),
      minProcessingTime: Math.min(...processingTimes),
      maxProcessingTime: Math.max(...processingTimes),
      totalProcessingTime,
      lastEventTimestamp: this.webhookMetrics[this.webhookMetrics.length - 1]?.timestamp,
      errorBreakdown
    }
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) {return 0}
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1
    return sortedValues[Math.max(0, index)] || 0
  }

  private updatePerformanceCache(): void {
    const eventTypes = this.getTrackedEventTypes()
    eventTypes.forEach(eventType => {
      this.performanceCache.set(eventType, this.calculatePerformanceStats(eventType))
    })
  }

  private checkAlerts(metrics: WebhookMetrics): void {
    const alerts: string[] = []

    // Check processing time
    if (metrics.processingTime > this.alertThresholds.maxProcessingTime) {
      alerts.push(`Slow webhook processing: ${metrics.processingTime}ms for ${metrics.eventType}`)
    }

    // Check memory usage
    const memoryUsageMB = Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024)
    if (memoryUsageMB > this.alertThresholds.maxMemoryUsage) {
      alerts.push(`High memory usage: ${memoryUsageMB}MB during ${metrics.eventType} processing`)
    }

    // Check consecutive failures
    const consecutiveFailures = this.consecutiveFailures.get(metrics.eventType) || 0
    if (consecutiveFailures >= this.alertThresholds.criticalFailureCount) {
      alerts.push(`Critical: ${consecutiveFailures} consecutive failures for ${metrics.eventType}`)
    }

    // Log alerts
    alerts.forEach(alert => {
      this.logger.error(`🚨 WEBHOOK ALERT: ${alert}`, {
        correlationId: metrics.correlationId,
        eventType: metrics.eventType,
        processingTime: metrics.processingTime,
        memoryUsageMB,
        consecutiveFailures
      })
    })
  }

  private logWebhookEvent(metrics: WebhookMetrics): void {
    const message = `Webhook ${metrics.eventType} ${metrics.success ? 'processed' : 'failed'}`
    const context = {
      eventType: metrics.eventType,
      processingTime: metrics.processingTime,
      success: metrics.success,
      correlationId: metrics.correlationId,
      retryAttempt: metrics.retryAttempt,
      errorType: metrics.errorType,
      errorMessage: metrics.errorMessage,
      memoryUsageMB: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024),
      operation: 'webhook.process_event'
    }
    
    if (metrics.success) {
      this.structuredLogger.info(message, context)
    } else {
      // Create error object for structured logger
      const error = new Error(metrics.errorMessage || 'Unknown webhook processing error')
      error.name = metrics.errorType || 'WebhookError'
      this.structuredLogger.error(metrics.errorMessage || 'Unknown webhook processing error', error, context)
    }
  }

  private logMetricsSummary(): void {
    const health = this.getHealthStatus()
    const eventTypes = this.getTrackedEventTypes()
    
    this.logger.log(`📊 Webhook Metrics Summary - Status: ${health.status.toUpperCase()}`, {
      status: health.status,
      issues: health.issues,
      metrics: health.metrics,
      trackedEventTypes: eventTypes.length,
      totalEventsProcessed: this.webhookMetrics.length,
      cacheSize: this.performanceCache.size
    })

    // Log performance stats for each event type
    eventTypes.forEach(eventType => {
      const stats = this.getPerformanceStats(eventType)
      if (stats && stats.totalEvents > 0) {
        this.logger.log(`📈 ${eventType} Performance`, {
          eventType,
          totalEvents: stats.totalEvents,
          successRate: `${stats.successRate.toFixed(1)}%`,
          avgProcessingTime: `${stats.averageProcessingTime.toFixed(0)}ms`,
          p95ProcessingTime: `${stats.p95ProcessingTime}ms`,
          errors: Object.keys(stats.errorBreakdown).length
        })
      }
    })
  }
}