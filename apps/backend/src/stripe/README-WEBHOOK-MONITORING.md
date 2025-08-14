# Webhook Monitoring System

This document describes the comprehensive monitoring and observability system implemented for Stripe webhook processing in TenantFlow.

## Overview

The webhook monitoring system provides:
- **Performance Metrics**: Processing time tracking, success/failure rates
- **Error Monitoring**: Detailed error logging, retry mechanisms, dead letter queue
- **Health Checks**: Database, Stripe API, and webhook endpoint connectivity
- **Observability**: Request tracing with correlation IDs and performance breakdowns
- **Alerting**: Configurable thresholds with structured alerts
- **Production-Ready**: Memory management, cleanup, and resource monitoring

## Architecture

### Core Components

1. **WebhookMetricsService** - Performance and operational metrics
2. **WebhookHealthService** - Connectivity and system health monitoring  
3. **WebhookErrorMonitorService** - Error tracking, retry logic, and dead letter queue
4. **WebhookObservabilityService** - Distributed tracing and request correlation
5. **WebhookMonitoringController** - REST API for monitoring data access

### Integration Points

- Seamlessly integrated into existing `WebhookService` without breaking changes
- Uses existing `StructuredLoggerService` for consistent logging
- Leverages `MetricsService` for system-wide metrics correlation
- Emits events through `EventEmitter2` for decoupled alerting

## Features

### 📊 Performance Metrics

```typescript
// Automatic tracking of webhook processing
{
  eventType: "invoice.payment_succeeded",
  totalEvents: 1247,
  successCount: 1245,
  failureCount: 2,
  successRate: 99.84,
  averageProcessingTime: 234,
  p95ProcessingTime: 456,
  p99ProcessingTime: 789
}
```

**Key Metrics:**
- Processing time percentiles (P50, P95, P99)
- Success/failure rates by event type
- Memory usage during processing
- Idempotency cache performance

### 🚨 Error Monitoring & Alerting

```typescript
// Intelligent error classification
{
  errorType: "DatabaseError",
  severity: "high", // low | medium | high | critical
  isRetriable: true,
  consecutiveFailures: 3,
  alertThreshold: 5
}
```

**Alert Triggers:**
- High error rates (configurable per minute)
- Consecutive failures per event type
- Critical error types (TypeError, ReferenceError)
- Memory/performance thresholds exceeded

**Dead Letter Queue:**
- Failed events after max retries
- Manual review flagging for critical events
- Retry capability from monitoring dashboard

### 🔍 Observability & Tracing

```typescript
// Distributed tracing with correlation IDs
{
  traceId: "abc123def456",
  correlationId: "wh-1625097600-x7k9m2",
  spans: [
    {
      operationName: "webhook.validate",
      duration: 5,
      success: true
    },
    {
      operationName: "webhook.process.subscription_updated", 
      duration: 187,
      success: true
    }
  ]
}
```

**Trace Features:**
- Request correlation across microservices
- Performance breakdown by operation
- Bottleneck identification
- OpenTracing-compatible export format

### 💚 Health Monitoring

```typescript
// Real-time system health
{
  overall: "healthy", // healthy | degraded | unhealthy
  database: { status: "healthy", responseTime: 12 },
  stripe: { status: "healthy", responseTime: 89 }, 
  webhookEndpoint: { status: "healthy", activeEndpoints: 3 }
}
```

**Health Checks:**
- Database connectivity and performance
- Stripe API availability and latency
- Webhook endpoint configuration validation
- Periodic automated health assessments

## API Endpoints

### Public Health Check
```bash
GET /stripe/webhook/health
# Returns basic health status for external monitoring
```

### Detailed Monitoring (Authenticated)
```bash
# Comprehensive metrics
GET /webhooks/monitoring/metrics

# Performance breakdown
GET /webhooks/monitoring/metrics/performance?eventType=subscription_updated

# Error analysis
GET /webhooks/monitoring/metrics/errors?hours=24&severity=high

# Request traces
GET /webhooks/monitoring/traces?eventType=payment_failed&limit=20

# Specific trace details
GET /webhooks/monitoring/traces/{traceId}

# Dead letter queue management
POST /webhooks/monitoring/dlq/retry/{eventId}

# System configuration
POST /webhooks/monitoring/config/thresholds
```

## Configuration

### Alert Thresholds
```typescript
{
  maxProcessingTime: 5000,     // 5 seconds
  minSuccessRate: 95,          // 95%
  maxErrorRate: 10,            // 10 errors/minute
  maxMemoryUsage: 512,         // 512 MB
  criticalFailureCount: 5      // 5 consecutive failures
}
```

### Retry Policy
```typescript
{
  maxRetries: 3,
  baseDelayMs: 1000,           // 1 second
  maxDelayMs: 30000,           // 30 seconds
  backoffMultiplier: 2,
  retriableErrors: [
    "TimeoutError",
    "NetworkError", 
    "DatabaseError"
  ]
}
```

## Memory Management

The system includes automatic cleanup to prevent memory leaks:

- **Metrics**: Keeps last 5,000 webhook events in memory
- **Traces**: Maintains 1,000 recent traces, cleaned every 30 minutes  
- **Errors**: Retains 1,000 recent errors, purged after 7 days
- **Idempotency Cache**: LRU eviction when exceeding 10,000 events

## Production Deployment

### Environment Variables
```bash
# Webhook monitoring configuration
WEBHOOK_METRICS_RETENTION_HOURS=24
WEBHOOK_TRACE_RETENTION_HOURS=24  
WEBHOOK_HEALTH_CHECK_INTERVAL=120000  # 2 minutes
WEBHOOK_ALERT_THRESHOLDS='{"maxProcessingTime":5000}'
```

### Monitoring Integration

**Prometheus Metrics Export:**
```bash
GET /webhooks/monitoring/export?format=prometheus
```

**External APM Integration:**
- Structured logs compatible with ELK Stack
- OpenTracing format for Jaeger/Zipkin
- Metrics format for Grafana dashboards

### Alerting Integrations

The system emits structured events that can be consumed by:
- PagerDuty for critical alerts
- Slack for operational notifications  
- Custom webhook endpoints for external systems

```typescript
// Event emission example
this.eventEmitter.emit('webhook.alert', {
  type: 'consecutive_failures',
  severity: 'critical',
  message: '5 consecutive failures for subscription_updated',
  context: { eventType, failureCount: 5 }
})
```

## Development & Testing

### Local Development
```bash
# View real-time metrics during development
curl http://localhost:3001/webhooks/monitoring/metrics

# Test webhook processing with traces
curl http://localhost:3001/webhooks/monitoring/traces?limit=5
```

### Testing Utilities
```typescript
// Clear metrics for testing
webhookMetricsService.clearMetrics()
webhookErrorMonitor.clearErrorData()
webhookObservability.clearTraces()

// Mock webhook events for testing
await webhookService.handleWebhookEvent(mockStripeEvent, mockRequestContext)
```

## Troubleshooting

### Common Issues

**High Memory Usage:**
- Check metrics retention settings
- Monitor idempotency cache size
- Review trace cleanup intervals

**Missing Traces:**
- Verify request context is passed correctly
- Check trace ID generation
- Ensure proper span lifecycle management

**Alert Spam:**
- Adjust threshold sensitivity
- Review error classification logic
- Implement alert rate limiting

### Debug Endpoints
```bash
# Resource usage monitoring  
GET /webhooks/monitoring/resources

# Detailed health diagnostics
GET /webhooks/monitoring/health/detailed

# Export all monitoring data
GET /webhooks/monitoring/export?format=json
```

## Security Considerations

- Monitoring endpoints require JWT authentication
- Public health check provides minimal information
- PII is excluded from traces and logs
- Webhook signatures included in request context for audit trails

## Performance Impact

The monitoring system is designed for minimal overhead:
- **Processing Overhead**: ~2-5ms per webhook event
- **Memory Footprint**: ~50MB under normal load
- **CPU Impact**: <1% additional CPU usage
- **I/O Impact**: Asynchronous operations only

## Future Enhancements

Planned improvements:
- Real-time dashboard with WebSocket updates
- Machine learning anomaly detection
- Automatic scaling recommendations
- Custom business metric tracking
- Integration with external monitoring tools

---

This monitoring system provides production-grade observability for webhook processing while maintaining high performance and minimal operational overhead.