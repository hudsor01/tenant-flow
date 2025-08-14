import { Injectable, Logger } from '@nestjs/common'
import { StructuredLoggerService } from '../common/logging/structured-logger.service'
import { randomUUID } from 'crypto'
// Remove unused Stripe import

export interface TraceContext {
  traceId: string
  spanId: string
  parentSpanId?: string
  correlationId: string
  timestamp: Date
  operation: string
  metadata: Record<string, unknown>
}

export interface WebhookTrace {
  traceId: string
  correlationId: string
  eventType: string
  eventId: string
  startTime: Date
  endTime?: Date
  duration?: number
  success?: boolean
  spans: WebhookSpan[]
  tags: Record<string, string>
  baggage: Record<string, unknown>
}

export interface WebhookSpan {
  spanId: string
  parentSpanId?: string
  operationName: string
  startTime: Date
  endTime?: Date
  duration?: number
  success?: boolean
  tags: Record<string, string>
  logs: {
    timestamp: Date
    level: 'debug' | 'info' | 'warn' | 'error'
    message: string
    fields?: Record<string, unknown>
  }[]
  error?: {
    type: string
    message: string
    stack?: string
  }
}

export interface RequestContext {
  correlationId: string
  userAgent?: string
  sourceIp?: string
  requestId?: string
  stripeSignature?: string
  contentLength?: number
  headers?: Record<string, string>
}

export interface PerformanceBreakdown {
  total: number
  phases: {
    validation: number
    processing: number
    database: number
    external: number
    response: number
  }
  bottlenecks: {
    operation: string
    duration: number
    percentage: number
  }[]
}

@Injectable()
export class WebhookObservabilityService {
  private readonly logger = new Logger(WebhookObservabilityService.name)
  private readonly structuredLogger: StructuredLoggerService
  private readonly traces = new Map<string, WebhookTrace>()
  private readonly maxTraces = 1000 // Keep last 1000 traces in memory
  
  // Current trace context (thread-local simulation)
  private currentTraceContext: TraceContext | null = null

  constructor() {
    this.structuredLogger = new StructuredLoggerService('WebhookObservability')
    
    // Clean up old traces every 30 minutes
    setInterval(() => {
      this.cleanupOldTraces()
    }, 30 * 60 * 1000)
  }

  /**
   * Start a new webhook trace
   */
  startTrace(
    eventType: string,
    eventId: string,
    requestContext?: RequestContext
  ): string {
    const traceId = this.generateTraceId()
    const correlationId = requestContext?.correlationId || this.generateCorrelationId()
    
    const trace: WebhookTrace = {
      traceId,
      correlationId,
      eventType,
      eventId,
      startTime: new Date(),
      spans: [],
      tags: {
        'webhook.event_type': eventType,
        'webhook.event_id': eventId,
        'service.name': 'tenantflow-webhook',
        'service.version': '1.0.0'
      },
      baggage: {
        requestContext: requestContext || {}
      }
    }

    // Add request context tags
    if (requestContext) {
      if (requestContext.userAgent) {
        trace.tags['http.user_agent'] = requestContext.userAgent
      }
      if (requestContext.sourceIp) {
        trace.tags['http.client_ip'] = requestContext.sourceIp
      }
      if (requestContext.requestId) {
        trace.tags['http.request_id'] = requestContext.requestId
      }
    }

    this.traces.set(traceId, trace)
    this.trimTraces()

    // Set current trace context
    this.currentTraceContext = {
      traceId,
      spanId: this.generateSpanId(),
      correlationId,
      timestamp: new Date(),
      operation: 'webhook.process',
      metadata: { eventType, eventId }
    }

    this.structuredLogger.info('Started webhook trace', {
      traceId,
      correlationId,
      eventType,
      eventId,
      operation: 'webhook.trace_start'
    })

    return traceId
  }

  /**
   * End a webhook trace
   */
  endTrace(traceId: string, success: boolean, error?: Error): void {
    const trace = this.traces.get(traceId)
    if (!trace) {
      this.logger.warn(`Trace not found: ${traceId}`)
      return
    }

    trace.endTime = new Date()
    trace.duration = trace.endTime.getTime() - trace.startTime.getTime()
    trace.success = success

    if (error) {
      trace.tags['error'] = 'true'
      trace.tags['error.type'] = error.constructor.name
      trace.tags['error.message'] = error.message
    }

    // Close any open spans
    trace.spans.forEach(span => {
      if (!span.endTime) {
        this.endSpan(traceId, span.spanId, false, new Error('Span closed by trace end'))
      }
    })

    this.structuredLogger.info('Ended webhook trace', {
      traceId,
      correlationId: trace.correlationId,
      eventType: trace.eventType,
      duration: trace.duration,
      success,
      spanCount: trace.spans.length,
      operation: 'webhook.trace_end'
    })

    // Clear current trace context
    if (this.currentTraceContext?.traceId === traceId) {
      this.currentTraceContext = null
    }
  }

  /**
   * Start a new span within a trace
   */
  startSpan(
    traceId: string,
    operationName: string,
    parentSpanId?: string,
    tags?: Record<string, string>
  ): string {
    const trace = this.traces.get(traceId)
    if (!trace) {
      this.logger.warn(`Trace not found for span: ${traceId}`)
      return ''
    }

    const spanId = this.generateSpanId()
    const span: WebhookSpan = {
      spanId,
      parentSpanId,
      operationName,
      startTime: new Date(),
      tags: {
        'span.kind': 'internal',
        ...tags
      },
      logs: []
    }

    trace.spans.push(span)

    this.structuredLogger.debug('Started webhook span', {
      traceId,
      spanId,
      parentSpanId,
      operationName,
      correlationId: trace.correlationId,
      operation: 'webhook.span_start'
    })

    return spanId
  }

  /**
   * End a span
   */
  endSpan(traceId: string, spanId: string, success: boolean, error?: Error): void {
    const trace = this.traces.get(traceId)
    if (!trace) {
      this.logger.warn(`Trace not found for span end: ${traceId}`)
      return
    }

    const span = trace.spans.find(s => s.spanId === spanId)
    if (!span) {
      this.logger.warn(`Span not found: ${spanId} in trace ${traceId}`)
      return
    }

    span.endTime = new Date()
    span.duration = span.endTime.getTime() - span.startTime.getTime()
    span.success = success

    if (error) {
      span.tags['error'] = 'true'
      span.error = {
        type: error.constructor.name,
        message: error.message,
        stack: error.stack
      }
    }

    this.structuredLogger.debug('Ended webhook span', {
      traceId,
      spanId,
      operationName: span.operationName,
      duration: span.duration,
      success,
      correlationId: trace.correlationId,
      operation: 'webhook.span_end'
    })
  }

  /**
   * Add a log entry to a span
   */
  addSpanLog(
    traceId: string,
    spanId: string,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    fields?: Record<string, unknown>
  ): void {
    const trace = this.traces.get(traceId)
    if (!trace) return

    const span = trace.spans.find(s => s.spanId === spanId)
    if (!span) return

    span.logs.push({
      timestamp: new Date(),
      level,
      message,
      fields
    })
  }

  /**
   * Add tags to a span
   */
  addSpanTags(traceId: string, spanId: string, tags: Record<string, string>): void {
    const trace = this.traces.get(traceId)
    if (!trace) return

    const span = trace.spans.find(s => s.spanId === spanId)
    if (!span) return

    Object.assign(span.tags, tags)
  }

  /**
   * Get current trace context
   */
  getCurrentTraceContext(): TraceContext | null {
    return this.currentTraceContext
  }

  /**
   * Create a child trace context
   */
  createChildContext(operation: string, metadata?: Record<string, unknown>): TraceContext | null {
    if (!this.currentTraceContext) return null

    return {
      traceId: this.currentTraceContext.traceId,
      spanId: this.generateSpanId(),
      parentSpanId: this.currentTraceContext.spanId,
      correlationId: this.currentTraceContext.correlationId,
      timestamp: new Date(),
      operation,
      metadata: metadata || {}
    }
  }

  /**
   * Get a specific trace
   */
  getTrace(traceId: string): WebhookTrace | undefined {
    return this.traces.get(traceId)
  }

  /**
   * Get traces by correlation ID
   */
  getTracesByCorrelationId(correlationId: string): WebhookTrace[] {
    return Array.from(this.traces.values()).filter(
      trace => trace.correlationId === correlationId
    )
  }

  /**
   * Get recent traces
   */
  getRecentTraces(limit = 50): WebhookTrace[] {
    return Array.from(this.traces.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit)
  }

  /**
   * Search traces by criteria
   */
  searchTraces(criteria: {
    eventType?: string
    success?: boolean
    minDuration?: number
    maxDuration?: number
    hasError?: boolean
    since?: Date
    until?: Date
  }): WebhookTrace[] {
    return Array.from(this.traces.values()).filter(trace => {
      if (criteria.eventType && trace.eventType !== criteria.eventType) return false
      if (criteria.success !== undefined && trace.success !== criteria.success) return false
      if (criteria.minDuration && (!trace.duration || trace.duration < criteria.minDuration)) return false
      if (criteria.maxDuration && (!trace.duration || trace.duration > criteria.maxDuration)) return false
      if (criteria.hasError !== undefined) {
        const hasError = trace.tags['error'] === 'true'
        if (hasError !== criteria.hasError) return false
      }
      if (criteria.since && trace.startTime < criteria.since) return false
      if (criteria.until && trace.startTime > criteria.until) return false
      return true
    })
  }

  /**
   * Get performance breakdown for a trace
   */
  getPerformanceBreakdown(traceId: string): PerformanceBreakdown | null {
    const trace = this.traces.get(traceId)
    if (!trace || !trace.duration) return null

    const phases = {
      validation: 0,
      processing: 0,
      database: 0,
      external: 0,
      response: 0
    }

    const operationDurations: { operation: string, duration: number }[] = []

    trace.spans.forEach(span => {
      if (!span.duration) return

      operationDurations.push({
        operation: span.operationName,
        duration: span.duration
      })

      // Categorize span duration into phases
      if (span.operationName.includes('validate') || span.operationName.includes('verify')) {
        phases.validation += span.duration
      } else if (span.operationName.includes('database') || span.operationName.includes('prisma')) {
        phases.database += span.duration
      } else if (span.operationName.includes('stripe') || span.operationName.includes('external')) {
        phases.external += span.duration
      } else if (span.operationName.includes('response') || span.operationName.includes('emit')) {
        phases.response += span.duration
      } else {
        phases.processing += span.duration
      }
    })

    // Find bottlenecks (operations taking more than 10% of total time)
    const bottlenecks = operationDurations
      .filter(op => trace.duration && op.duration > trace.duration * 0.1)
      .sort((a, b) => b.duration - a.duration)
      .map(op => ({
        operation: op.operation,
        duration: op.duration,
        percentage: trace.duration ? (op.duration / trace.duration) * 100 : 0
      }))

    return {
      total: trace.duration,
      phases,
      bottlenecks
    }
  }

  /**
   * Export trace in OpenTracing format (simplified)
   */
  exportTrace(traceId: string): Record<string, unknown> | null {
    const trace = this.traces.get(traceId)
    if (!trace) return null

    return {
      traceID: traceId,
      spans: trace.spans.map(span => ({
        traceID: traceId,
        spanID: span.spanId,
        parentSpanID: span.parentSpanId,
        operationName: span.operationName,
        startTime: span.startTime.getTime() * 1000, // microseconds
        duration: (span.duration || 0) * 1000, // microseconds
        tags: Object.entries(span.tags).map(([key, value]) => ({
          key,
          type: 'string',
          value: String(value)
        })),
        logs: span.logs.map(log => ({
          timestamp: log.timestamp.getTime() * 1000,
          fields: [
            { key: 'level', value: log.level },
            { key: 'message', value: log.message },
            ...(log.fields ? Object.entries(log.fields).map(([key, value]) => ({
              key,
              value: String(value)
            })) : [])
          ]
        }))
      }))
    }
  }

  /**
   * Get observability metrics
   */
  getObservabilityMetrics(): {
    totalTraces: number
    averageTraceDuration: number
    successRate: number
    mostCommonOperations: { operation: string, count: number }[]
    errorRate: number
    tracesWithBottlenecks: number
  } {
    const traces = Array.from(this.traces.values())
    
    if (traces.length === 0) {
      return {
        totalTraces: 0,
        averageTraceDuration: 0,
        successRate: 100,
        mostCommonOperations: [],
        errorRate: 0,
        tracesWithBottlenecks: 0
      }
    }

    const completedTraces = traces.filter(t => t.duration !== undefined)
    const successfulTraces = traces.filter(t => t.success === true)
    const tracesWithErrors = traces.filter(t => t.tags['error'] === 'true')

    const operationCounts: Record<string, number> = {}
    let totalBottlenecks = 0

    traces.forEach(trace => {
      trace.spans.forEach(span => {
        operationCounts[span.operationName] = (operationCounts[span.operationName] || 0) + 1
      })

      const breakdown = this.getPerformanceBreakdown(trace.traceId)
      if (breakdown && breakdown.bottlenecks.length > 0) {
        totalBottlenecks++
      }
    })

    const mostCommonOperations = Object.entries(operationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([operation, count]) => ({ operation, count }))

    const averageDuration = completedTraces.length > 0 ?
      completedTraces.reduce((sum, t) => sum + (t.duration || 0), 0) / completedTraces.length : 0

    return {
      totalTraces: traces.length,
      averageTraceDuration: averageDuration,
      successRate: traces.length > 0 ? (successfulTraces.length / traces.length) * 100 : 100,
      mostCommonOperations,
      errorRate: traces.length > 0 ? (tracesWithErrors.length / traces.length) * 100 : 0,
      tracesWithBottlenecks: totalBottlenecks
    }
  }

  /**
   * Clear all traces (useful for testing)
   */
  clearTraces(): void {
    this.traces.clear()
    this.currentTraceContext = null
    this.logger.log('All webhook traces cleared')
  }

  private generateTraceId(): string {
    return randomUUID().replace(/-/g, '')
  }

  private generateSpanId(): string {
    return randomUUID().replace(/-/g, '').substring(0, 16)
  }

  private generateCorrelationId(): string {
    return `wh-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  }

  private trimTraces(): void {
    if (this.traces.size > this.maxTraces) {
      const sortedTraces = Array.from(this.traces.entries())
        .sort(([, a], [, b]) => a.startTime.getTime() - b.startTime.getTime())
      
      const toRemove = sortedTraces.slice(0, this.traces.size - this.maxTraces)
      toRemove.forEach(([traceId]) => {
        this.traces.delete(traceId)
      })
    }
  }

  private cleanupOldTraces(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours
    const initialSize = this.traces.size
    
    for (const [traceId, trace] of this.traces.entries()) {
      if (trace.startTime < cutoff) {
        this.traces.delete(traceId)
      }
    }
    
    const removed = initialSize - this.traces.size
    if (removed > 0) {
      this.logger.log(`Cleaned up ${removed} old webhook traces`)
    }
  }
}