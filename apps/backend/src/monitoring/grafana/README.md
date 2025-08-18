# TenantFlow Grafana Dashboards

This directory contains pre-configured Grafana dashboards for monitoring TenantFlow's payment infrastructure.

## Dashboard Overview

### 1. Payment Operations Dashboard
- **File**: `payment-operations-dashboard.json`
- **Purpose**: Real-time monitoring of payment processing
- **Key Metrics**:
  - Payment success rate
  - Payment volume and revenue
  - Processing time percentiles
  - Payment method distribution
  - Error analysis

### 2. Subscription Analytics Dashboard
- **File**: `subscription-analytics-dashboard.json`
- **Purpose**: Business intelligence for subscription metrics
- **Key Metrics**:
  - Monthly Recurring Revenue (MRR)
  - Active subscriptions count
  - Trial conversion rates
  - Churn analysis
  - Customer lifetime value

### 3. Webhook Monitoring Dashboard
- **File**: `webhook-monitoring-dashboard.json`
- **Purpose**: Monitoring Stripe webhook processing
- **Key Metrics**:
  - Webhook success rate
  - Processing volume
  - Response time distribution
  - Error categorization

## Installation

### Prerequisites

1. **Grafana Instance**: Ensure you have Grafana running
2. **Prometheus Data Source**: Configure Prometheus as a data source in Grafana
3. **Metrics Collection**: Ensure the TenantFlow backend is exposing Prometheus metrics

### Import Dashboards

1. **Access Grafana UI**:
   ```
   http://your-grafana-instance:3000
   ```

2. **Import Each Dashboard**:
   - Navigate to **Dashboards** → **Import**
   - Copy the JSON content from each dashboard file
   - Paste into the import dialog
   - Configure data source (select your Prometheus instance)
   - Save the dashboard

3. **Set Up Variables** (if needed):
   - Configure any dashboard variables for filtering
   - Set appropriate time ranges and refresh intervals

## Configuration

### Data Source Configuration

Ensure your Prometheus data source is configured to scrape metrics from:
```
http://your-backend-api:3000/metrics
```

### Alert Rules

Consider setting up alerts for critical metrics:

#### Payment Operations Alerts
```yaml
# Payment success rate below 95%
- alert: PaymentSuccessRateLow
  expr: rate(payment_attempts_total{status="succeeded"}[5m]) / rate(payment_attempts_total[5m]) * 100 < 95
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Payment success rate is below 95%"

# High payment processing time
- alert: PaymentProcessingTimeSlow
  expr: histogram_quantile(0.95, payment_duration_seconds_bucket) > 5
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "95th percentile payment processing time exceeds 5 seconds"
```

#### Subscription Alerts
```yaml
# Churn rate above 10%
- alert: HighChurnRate
  expr: business_churn_rate > 10
  for: 15m
  labels:
    severity: critical
  annotations:
    summary: "Monthly churn rate exceeds 10%"

# MRR decline
- alert: MRRDecline
  expr: deriv(subscription_mrr_total[7d]) < 0
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "MRR showing declining trend over 7 days"
```

#### Webhook Alerts
```yaml
# Webhook failure rate above 5%
- alert: WebhookFailureRateHigh
  expr: rate(webhook_events_total{status="failed"}[5m]) / rate(webhook_events_total[5m]) * 100 > 5
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Webhook failure rate exceeds 5%"
```

## Customization

### Adding Custom Panels

To add custom panels to existing dashboards:

1. **Edit Dashboard**: Click the gear icon in any dashboard
2. **Add Panel**: Click "Add panel" button
3. **Configure Query**: Set up your Prometheus query
4. **Style Panel**: Configure visualization type and styling
5. **Save**: Save the updated dashboard

### Common Queries

#### Revenue by Time Period
```promql
# Daily revenue
increase(payment_amount_total[1d]) / 100

# Monthly revenue growth
deriv(payment_amount_total[30d]) * 86400 * 30 / 100
```

#### Customer Metrics
```promql
# New customers today
increase(subscription_created_total[1d])

# Active subscription growth
deriv(subscription_count_total{status="active"}[7d]) * 86400 * 7
```

#### Performance Metrics
```promql
# Average payment processing time
rate(payment_duration_seconds_sum[5m]) / rate(payment_duration_seconds_count[5m])

# Webhook processing rate
rate(webhook_events_total[5m])
```

## Troubleshooting

### No Data Appearing

1. **Check Prometheus Connection**:
   - Verify Prometheus is scraping the `/metrics` endpoint
   - Check that metrics are being exported by the application

2. **Verify Metric Names**:
   - Ensure metric names in queries match those exported
   - Check for typos in label selectors

3. **Time Range Issues**:
   - Adjust time range if recent metrics aren't available
   - Check that the application has been running long enough

### Dashboard Performance

1. **Optimize Queries**:
   - Use appropriate time ranges for rate calculations
   - Avoid overly complex queries with multiple aggregations

2. **Adjust Refresh Rates**:
   - Set reasonable refresh intervals (30s-5m depending on use case)
   - Consider different refresh rates for different panels

### Missing Metrics

If certain metrics aren't available:

1. **Check Application Deployment**:
   - Ensure the PrometheusMetricsService is properly initialized
   - Verify that metric collection is enabled

2. **Update Metric Collection**:
   - Add missing metrics to the PrometheusMetricsService
   - Redeploy the application

## Maintenance

### Regular Tasks

1. **Review and Update Dashboards**:
   - Update queries as metrics evolve
   - Add new panels for additional insights
   - Remove deprecated metrics

2. **Monitor Dashboard Performance**:
   - Check query execution times
   - Optimize slow-performing panels

3. **Backup Dashboard Configurations**:
   - Export updated dashboard JSON regularly
   - Version control dashboard changes

### Best Practices

1. **Consistent Naming**: Use consistent naming conventions for dashboards and panels
2. **Documentation**: Add descriptions to panels explaining what they measure
3. **Color Coding**: Use consistent color schemes across dashboards
4. **Thresholds**: Set meaningful thresholds for status indicators
5. **Grouping**: Organize related metrics into logical panel groups

## Support

For issues with dashboard configuration:
1. Check Grafana documentation for panel configuration
2. Verify Prometheus query syntax
3. Review TenantFlow metrics implementation
4. Contact the development team for metric-specific questions