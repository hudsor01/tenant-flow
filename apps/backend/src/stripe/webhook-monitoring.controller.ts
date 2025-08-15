import { Controller, Get, Query, Param, Post, Body, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Public } from '../auth/decorators/public.decorator'
import { RateLimit, MonitoringRateLimits } from '../common/decorators/rate-limit.decorator'
import { WebhookService } from './webhook.service'
import { WebhookMetricsService } from './webhook-metrics.service'
import { WebhookHealthService } from './webhook-health.service'
import { WebhookErrorMonitorService } from './webhook-error-monitor.service'
import { WebhookObservabilityService } from './webhook-observability.service'
import type { WebhookPerformanceStats } from './webhook-metrics.service'


@Controller('webhooks/monitoring')
export class WebhookMonitoringController {

  constructor(
    private readonly webhookService: WebhookService,
    private readonly metricsService: WebhookMetricsService,
    private readonly healthService: WebhookHealthService,
    private readonly errorMonitor: WebhookErrorMonitorService,
    private readonly observability: WebhookObservabilityService
  ) {}

  /**
   * Public health check endpoint for external monitoring
   */
  @Get('health')
  @Public()
  @RateLimit(MonitoringRateLimits.HEALTH_CHECK)
  async getHealthCheck() {
    const health = await this.webhookService.getSystemHealth()
    return {
      status: health.status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      details: health.details
    }
  }

  /**
   * Detailed system health with connectivity checks
   */
  @Get('health/detailed')
  @UseGuards(JwtAuthGuard)
  async getDetailedHealth() {
    const [systemReady, webhookEndpoints, deliveryMetrics] = await Promise.all([
      this.healthService.isSystemReady(),
      this.healthService.getWebhookEndpointDetails(),
      this.healthService.getWebhookDeliveryMetrics(24)
    ])

    return {
      systemReady,
      webhookEndpoints,
      deliveryMetrics,
      connectivity: await this.healthService.performHealthCheck()
    }
  }

  /**
   * Comprehensive webhook metrics
   */
  @Get('metrics')
  @UseGuards(JwtAuthGuard)
  @RateLimit(MonitoringRateLimits.METRICS_READ)
  getMetrics() {
    return this.webhookService.getMetrics()
  }

  /**
   * Performance statistics for specific event type or overall
   */
  @Get('metrics/performance')
  @UseGuards(JwtAuthGuard)
  getPerformanceMetrics(@Query('eventType') eventType?: string) {
    return {
      stats: this.metricsService.getPerformanceStats(eventType),
      trackedEventTypes: this.metricsService.getTrackedEventTypes(),
      thresholds: this.metricsService.getAlertThresholds()
    }
  }

  /**
   * Error statistics and recent errors
   */
  @Get('metrics/errors')
  @UseGuards(JwtAuthGuard)
  @RateLimit(MonitoringRateLimits.ERROR_METRICS)
  getErrorMetrics(
    @Query('hours') hours?: string,
    @Query('eventType') eventType?: string,
    @Query('severity') severity?: 'low' | 'medium' | 'high' | 'critical'
  ) {
    const hoursNum = hours ? parseInt(hours, 10) : 24
    return {
      statistics: this.errorMonitor.getErrorStatistics(hoursNum),
      recentErrors: this.errorMonitor.getRecentErrors(hoursNum, eventType, severity),
      deadLetterQueue: this.errorMonitor.getDeadLetterQueue(),
      retryPolicy: this.errorMonitor.getRetryPolicy()
    }
  }

  /**
   * Idempotency metrics
   */
  @Get('metrics/idempotency')
  @UseGuards(JwtAuthGuard)
  getIdempotencyMetrics() {
    // Access the private processedEvents Set through the public method
    const webhookMetrics = this.webhookService.getMetrics()
    return webhookMetrics.idempotency
  }

  /**
   * Observability traces for debugging
   */
  @Get('traces')
  @UseGuards(JwtAuthGuard)
  @RateLimit(MonitoringRateLimits.TRACE_READ)
  getTraces(
    @Query('eventType') eventType?: string,
    @Query('success') success?: string,
    @Query('minDuration') minDuration?: string,
    @Query('hasError') hasError?: string,
    @Query('limit') limit?: string
  ) {
    const criteria = {
      eventType,
      success: success ? success === 'true' : undefined,
      minDuration: minDuration ? parseInt(minDuration, 10) : undefined,
      hasError: hasError ? hasError === 'true' : undefined,
      limit: limit ? parseInt(limit, 10) : 50
    }

    // Remove undefined values
    Object.keys(criteria).forEach(key => {
      if (criteria[key as keyof typeof criteria] === undefined) {
        delete criteria[key as keyof typeof criteria]
      }
    })

    return {
      traces: this.webhookService.getTraces(criteria),
      observabilityMetrics: this.observability.getObservabilityMetrics()
    }
  }

  /**
   * Get specific trace by ID
   */
  @Get('traces/:traceId')
  @UseGuards(JwtAuthGuard)
  getTrace(@Param('traceId') traceId: string) {
    const trace = this.observability.getTrace(traceId)
    if (!trace) {
      return { error: 'Trace not found' }
    }

    return {
      trace,
      performanceBreakdown: this.observability.getPerformanceBreakdown(traceId),
      exportFormat: this.observability.exportTrace(traceId)
    }
  }

  /**
   * Get traces by correlation ID
   */
  @Get('traces/correlation/:correlationId')
  @UseGuards(JwtAuthGuard)
  getTracesByCorrelation(@Param('correlationId') correlationId: string) {
    return {
      traces: this.observability.getTracesByCorrelationId(correlationId),
      correlationId
    }
  }

  /**
   * Update alert thresholds
   */
  @Post('config/thresholds')
  @UseGuards(JwtAuthGuard)
  @RateLimit(MonitoringRateLimits.CONFIG_UPDATE)
  updateThresholds(@Body() thresholds: Record<string, unknown>) {
    if (thresholds.metrics) {
      this.metricsService.updateAlertThresholds(thresholds.metrics)
    }
    if (thresholds.retry) {
      this.errorMonitor.updateRetryPolicy(thresholds.retry)
    }

    return {
      success: true,
      currentThresholds: {
        metrics: this.metricsService.getAlertThresholds(),
        retry: this.errorMonitor.getRetryPolicy()
      }
    }
  }

  /**
   * Retry event from dead letter queue
   */
  @Post('dlq/retry/:eventId')
  @UseGuards(JwtAuthGuard)
  @RateLimit(MonitoringRateLimits.DLQ_RETRY)
  async retryFromDeadLetterQueue(@Param('eventId') eventId: string) {
    return await this.errorMonitor.retryFromDeadLetterQueue(eventId)
  }

  /**
   * Test webhook endpoint connectivity
   */
  @Post('test/connectivity')
  @UseGuards(JwtAuthGuard)
  @RateLimit(MonitoringRateLimits.CONNECTIVITY_TEST)
  async testConnectivity(@Body('url') url: string) {
    return await this.healthService.testWebhookReachability(url)
  }

  /**
   * Get webhook delivery metrics from Stripe
   */
  @Get('delivery-metrics')
  @UseGuards(JwtAuthGuard)
  async getDeliveryMetrics(@Query('hours') hours?: string) {
    const hoursNum = hours ? parseInt(hours, 10) : 24
    return await this.healthService.getWebhookDeliveryMetrics(hoursNum)
  }

  /**
   * Clear metrics (for testing/maintenance)
   */
  @Post('clear')
  @UseGuards(JwtAuthGuard)
  clearMetrics() {
    this.metricsService.clearMetrics()
    this.errorMonitor.clearErrorData()
    this.observability.clearTraces()
    
    return {
      success: true,
      message: 'All webhook monitoring data cleared',
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Export metrics for external monitoring systems
   */
  @Get('export')
  @UseGuards(JwtAuthGuard)
  @RateLimit(MonitoringRateLimits.METRICS_EXPORT)
  exportMetrics(@Query('format') format: 'json' | 'prometheus' = 'json') {
    const metrics = this.webhookService.getMetrics()
    
    if (format === 'prometheus') {
      // Convert to Prometheus format
      return this.convertToPrometheusFormat(metrics)
    }
    
    return {
      timestamp: new Date().toISOString(),
      metrics,
      format: 'json'
    }
  }

  /**
   * Get system resource usage
   */
  @Get('resources')
  @UseGuards(JwtAuthGuard)
  @RateLimit(MonitoringRateLimits.RESOURCE_USAGE)
  getResourceUsage() {
    const memory = process.memoryUsage()
    const cpu = process.cpuUsage()
    
    return {
      memory: {
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024), // MB
        rss: Math.round(memory.rss / 1024 / 1024), // MB
        external: Math.round(memory.external / 1024 / 1024), // MB
        percentUsed: Math.round((memory.heapUsed / memory.heapTotal) * 100)
      },
      cpu: {
        user: cpu.user,
        system: cpu.system
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  }

  private convertToPrometheusFormat(metrics: Record<string, unknown>): string {
    const lines: string[] = []
    const timestamp = Date.now()

    // Helper function to add metric
    const addMetric = (name: string, value: number, labels: Record<string, string> = {}) => {
      const labelStr = Object.entries(labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',')
      lines.push(`${name}{${labelStr}} ${value} ${timestamp}`)
    }

    // Performance metrics
    if (metrics.performance && typeof metrics.performance === 'object' && 'overall' in metrics.performance && metrics.performance.overall) {
      const perf = metrics.performance.overall as WebhookPerformanceStats | null
      if (!perf) return lines.join('\n')
      addMetric('webhook_events_total', perf.totalEvents || 0)
      addMetric('webhook_events_success_total', perf.successCount || 0)
      addMetric('webhook_events_failure_total', perf.failureCount || 0)
      addMetric('webhook_success_rate', perf.successRate || 0)
      addMetric('webhook_processing_time_avg_ms', perf.averageProcessingTime || 0)
      addMetric('webhook_processing_time_p95_ms', perf.p95ProcessingTime || 0)
    }

    // Error metrics
    if (metrics.errors && typeof metrics.errors === 'object') {
      const errors = metrics.errors as Record<string, unknown>
      addMetric('webhook_errors_total', (errors.totalErrors as number) || 0)
      addMetric('webhook_dead_letter_queue_size', (errors.deadLetterQueueSize as number) || 0)
      addMetric('webhook_retry_attempts_avg', (errors.averageRetryAttempts as number) || 0)
    }

    // Health status (1 = healthy, 0.5 = degraded, 0 = unhealthy)
    if (metrics.health && typeof metrics.health === 'object') {
      const health = metrics.health as { status: 'healthy' | 'warning' | 'critical' }
      const healthValue = health.status === 'healthy' ? 1 : 
                         health.status === 'warning' ? 0.5 : 0
      addMetric('webhook_health_status', healthValue)
    }

    return lines.join('\n')
  }
}