-- =====================================================
-- Webhook Monitoring Infrastructure
-- =====================================================
-- Purpose: Production-grade webhook monitoring, failure tracking, and alerting
-- Created: 2025-10-31
-- =====================================================

-- =====================================================
-- 1. WEBHOOK FAILURE TRACKING
-- =====================================================
-- Track webhook processing failures for monitoring and debugging

CREATE TABLE IF NOT EXISTS public.webhook_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    failure_reason TEXT NOT NULL,
    error_message TEXT,
    error_stack TEXT,
    raw_event_data JSONB,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Index for querying unresolved failures
    CONSTRAINT idx_stripe_event_id_failures_unique UNIQUE (stripe_event_id, created_at)
);

CREATE INDEX IF NOT EXISTS idx_webhook_failures_unresolved
ON public.webhook_failures (created_at DESC)
WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_failures_event_type
ON public.webhook_failures (event_type, created_at DESC);

COMMENT ON TABLE public.webhook_failures IS
'Tracks webhook processing failures for monitoring, alerting, and debugging';

COMMENT ON COLUMN public.webhook_failures.failure_reason IS
'High-level failure category: signature_invalid, processing_error, database_error, business_logic_error';

COMMENT ON COLUMN public.webhook_failures.retry_count IS
'Number of retry attempts made for this failed webhook';

-- =====================================================
-- 2. WEBHOOK PERFORMANCE METRICS
-- =====================================================
-- Track webhook processing performance for monitoring

CREATE TABLE IF NOT EXISTS public.webhook_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    processing_duration_ms INTEGER NOT NULL,
    signature_verification_ms INTEGER,
    business_logic_ms INTEGER,
    database_operations_ms INTEGER,
    success BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT idx_stripe_event_id_metrics_unique UNIQUE (stripe_event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_metrics_created_at
ON public.webhook_metrics (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_metrics_slow_queries
ON public.webhook_metrics (processing_duration_ms DESC)
WHERE processing_duration_ms > 1000; -- Queries slower than 1 second

COMMENT ON TABLE public.webhook_metrics IS
'Performance metrics for webhook processing - tracks latency and success rates';

-- =====================================================
-- 3. WEBHOOK HEALTH MONITORING
-- =====================================================
-- Aggregated health metrics for real-time monitoring

CREATE OR REPLACE VIEW public.webhook_health_summary AS
SELECT
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE success = true) as successful_events,
    COUNT(*) FILTER (WHERE success = false) as failed_events,
    ROUND(AVG(processing_duration_ms)::numeric, 2) as avg_duration_ms,
    MAX(processing_duration_ms) as max_duration_ms,
    MIN(processing_duration_ms) as min_duration_ms,
    ROUND((COUNT(*) FILTER (WHERE success = true)::numeric / COUNT(*)::numeric * 100), 2) as success_rate_percentage
FROM public.webhook_metrics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

COMMENT ON VIEW public.webhook_health_summary IS
'Hourly aggregated webhook health metrics for the last 24 hours';

-- =====================================================
-- 4. WEBHOOK EVENT TYPE TRACKING
-- =====================================================
-- Track which event types are being received

CREATE OR REPLACE VIEW public.webhook_event_type_summary AS
SELECT
    event_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE success = true) as successful_count,
    COUNT(*) FILTER (WHERE success = false) as failed_count,
    ROUND(AVG(processing_duration_ms)::numeric, 2) as avg_duration_ms,
    MAX(created_at) as last_received_at
FROM public.webhook_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY event_type
ORDER BY total_count DESC;

COMMENT ON VIEW public.webhook_event_type_summary IS
'Event type breakdown for the last 7 days - identifies problematic event types';

-- =====================================================
-- 5. ALERT DETECTION FUNCTION
-- =====================================================
-- Function to detect webhook health issues

CREATE OR REPLACE FUNCTION public.detect_webhook_health_issues()
RETURNS TABLE (
    issue_type TEXT,
    severity TEXT,
    description TEXT,
    affected_count INTEGER,
    first_occurrence TIMESTAMP WITH TIME ZONE,
    last_occurrence TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check for high failure rate in last hour
    RETURN QUERY
    SELECT
        'high_failure_rate'::TEXT as issue_type,
        CASE
            WHEN (COUNT(*) FILTER (WHERE success = false)::numeric / COUNT(*)::numeric) > 0.5 THEN 'critical'
            WHEN (COUNT(*) FILTER (WHERE success = false)::numeric / COUNT(*)::numeric) > 0.2 THEN 'warning'
            ELSE 'info'
        END::TEXT as severity,
        FORMAT(
            'Webhook failure rate is %.1f%% in the last hour (%s/%s failed)',
            (COUNT(*) FILTER (WHERE success = false)::numeric / COUNT(*)::numeric * 100),
            COUNT(*) FILTER (WHERE success = false),
            COUNT(*)
        )::TEXT as description,
        COUNT(*) FILTER (WHERE success = false)::INTEGER as affected_count,
        MIN(created_at) as first_occurrence,
        MAX(created_at) as last_occurrence
    FROM public.webhook_metrics
    WHERE created_at > NOW() - INTERVAL '1 hour'
    HAVING COUNT(*) > 10 AND (COUNT(*) FILTER (WHERE success = false)::numeric / COUNT(*)::numeric) > 0.1;

    -- Check for unresolved failures older than 1 hour
    RETURN QUERY
    SELECT
        'unresolved_failures'::TEXT as issue_type,
        CASE
            WHEN COUNT(*) > 10 THEN 'critical'
            WHEN COUNT(*) > 5 THEN 'warning'
            ELSE 'info'
        END::TEXT as severity,
        FORMAT(
            '%s webhook failures have not been resolved for over 1 hour',
            COUNT(*)
        )::TEXT as description,
        COUNT(*)::INTEGER as affected_count,
        MIN(created_at) as first_occurrence,
        MAX(created_at) as last_occurrence
    FROM public.webhook_failures
    WHERE resolved_at IS NULL
    AND created_at < NOW() - INTERVAL '1 hour'
    HAVING COUNT(*) > 0;

    -- Check for slow webhook processing
    RETURN QUERY
    SELECT
        'slow_processing'::TEXT as issue_type,
        CASE
            WHEN AVG(processing_duration_ms) > 5000 THEN 'critical'
            WHEN AVG(processing_duration_ms) > 2000 THEN 'warning'
            ELSE 'info'
        END::TEXT as severity,
        FORMAT(
            'Average webhook processing time is %.0fms in the last hour (threshold: 2000ms)',
            AVG(processing_duration_ms)
        )::TEXT as description,
        COUNT(*)::INTEGER as affected_count,
        MIN(created_at) as first_occurrence,
        MAX(created_at) as last_occurrence
    FROM public.webhook_metrics
    WHERE created_at > NOW() - INTERVAL '1 hour'
    HAVING COUNT(*) > 10 AND AVG(processing_duration_ms) > 1500;

    -- Check for missing critical event types
    RETURN QUERY
    WITH expected_events AS (
        SELECT unnest(ARRAY[
            'customer.subscription.created',
            'customer.subscription.updated',
            'customer.subscription.deleted',
            'payment_intent.succeeded',
            'checkout.session.completed'
        ]) AS event_type
    ),
    recent_events AS (
        SELECT DISTINCT event_type
        FROM public.webhook_metrics
        WHERE created_at > NOW() - INTERVAL '24 hours'
    )
    SELECT
        'missing_critical_events'::TEXT as issue_type,
        'warning'::TEXT as severity,
        FORMAT(
            'Critical event type "%s" has not been received in 24 hours',
            e.event_type
        )::TEXT as description,
        0::INTEGER as affected_count,
        NOW() - INTERVAL '24 hours' as first_occurrence,
        NOW() as last_occurrence
    FROM expected_events e
    LEFT JOIN recent_events r ON e.event_type = r.event_type
    WHERE r.event_type IS NULL;

END;
$$;

COMMENT ON FUNCTION public.detect_webhook_health_issues IS
'Detects webhook health issues: high failure rates, unresolved failures, slow processing, missing events';

-- =====================================================
-- 6. CLEANUP FUNCTIONS
-- =====================================================
-- Automatic cleanup of old webhook data (retention: 90 days)

CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_data()
RETURNS TABLE (
    table_name TEXT,
    rows_deleted INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    processed_events_deleted INTEGER;
    metrics_deleted INTEGER;
    failures_deleted INTEGER;
BEGIN
    -- Clean up processed events older than 90 days
    DELETE FROM public.processed_stripe_events
    WHERE processed_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS processed_events_deleted = ROW_COUNT;

    -- Clean up metrics older than 90 days
    DELETE FROM public.webhook_metrics
    WHERE created_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS metrics_deleted = ROW_COUNT;

    -- Clean up resolved failures older than 30 days
    DELETE FROM public.webhook_failures
    WHERE resolved_at IS NOT NULL
    AND resolved_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS failures_deleted = ROW_COUNT;

    RETURN QUERY VALUES
        ('processed_stripe_events'::TEXT, processed_events_deleted),
        ('webhook_metrics'::TEXT, metrics_deleted),
        ('webhook_failures'::TEXT, failures_deleted);
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_webhook_data IS
'Cleans up webhook data older than retention period (90 days for events/metrics, 30 days for resolved failures)';

-- =====================================================
-- 7. ROW LEVEL SECURITY
-- =====================================================
-- Only service role can access webhook monitoring tables

ALTER TABLE public.webhook_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can access webhook failures"
ON public.webhook_failures
FOR ALL
TO service_role
USING (true);

CREATE POLICY "Only service role can access webhook metrics"
ON public.webhook_metrics
FOR ALL
TO service_role
USING (true);

-- =====================================================
-- 8. GRANTS
-- =====================================================
-- Grant necessary permissions

GRANT SELECT ON public.webhook_health_summary TO service_role;
GRANT SELECT ON public.webhook_event_type_summary TO service_role;
GRANT EXECUTE ON FUNCTION public.detect_webhook_health_issues() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_webhook_data() TO service_role;
