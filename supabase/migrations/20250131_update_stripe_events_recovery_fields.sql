-- Add recovery fields to processed_stripe_events table
ALTER TABLE public.processed_stripe_events
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'processed' CHECK (status IN ('processing', 'processed', 'failed')),
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS failure_reason TEXT,
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP;

-- Create index for recovery queries
CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_recovery
ON public.processed_stripe_events(status, retry_count, processed_at)
WHERE status = 'processing';

-- Create index for failed events
CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_failed
ON public.processed_stripe_events(status, failed_at)
WHERE status = 'failed';

-- RPC function to get events pending recovery
CREATE OR REPLACE FUNCTION public.get_events_pending_recovery(
    p_max_retries INTEGER DEFAULT 5,
    p_hours_old INTEGER DEFAULT 24
)
RETURNS TABLE(
    stripe_event_id TEXT,
    event_type TEXT,
    retry_count INTEGER,
    last_retry_at TIMESTAMP,
    processed_at TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pse.stripe_event_id,
        pse.event_type,
        pse.retry_count,
        pse.last_retry_at,
        pse.processed_at
    FROM public.processed_stripe_events pse
    WHERE pse.status = 'processing'
    AND pse.retry_count < p_max_retries
    AND pse.processed_at < NOW() - INTERVAL '1 hour' * p_hours_old
    ORDER BY pse.processed_at ASC
    LIMIT 50;
END;
$$;

-- RPC function to update retry attempt
CREATE OR REPLACE FUNCTION public.update_stripe_event_retry(
    p_event_id TEXT,
    p_retry_count INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated BOOLEAN;
BEGIN
    UPDATE public.processed_stripe_events
    SET
        retry_count = p_retry_count,
        last_retry_at = NOW()
    WHERE stripe_event_id = p_event_id;

    v_updated := FOUND;

    RETURN v_updated;
END;
$$;

-- RPC function to mark event as permanently failed
CREATE OR REPLACE FUNCTION public.mark_stripe_event_failed(
    p_event_id TEXT,
    p_failure_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated BOOLEAN;
BEGIN
    UPDATE public.processed_stripe_events
    SET
        status = 'failed',
        failure_reason = p_failure_reason,
        failed_at = NOW()
    WHERE stripe_event_id = p_event_id;

    v_updated := FOUND;

    RETURN v_updated;
END;
$$;

-- Grant execute permissions to service_role
GRANT EXECUTE ON FUNCTION public.get_events_pending_recovery(INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_stripe_event_retry(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_stripe_event_failed(TEXT, TEXT) TO service_role;

-- Add comments for documentation
COMMENT ON COLUMN public.processed_stripe_events.status IS 'Status of event processing: processing, processed, or failed';
COMMENT ON COLUMN public.processed_stripe_events.retry_count IS 'Number of retry attempts for this event';
COMMENT ON COLUMN public.processed_stripe_events.last_retry_at IS 'Timestamp of last retry attempt';
COMMENT ON COLUMN public.processed_stripe_events.failure_reason IS 'Reason for permanent failure if status is failed';
COMMENT ON COLUMN public.processed_stripe_events.failed_at IS 'Timestamp when event was marked as permanently failed';
COMMENT ON FUNCTION public.get_events_pending_recovery IS 'Gets webhook events that need recovery processing';
COMMENT ON FUNCTION public.update_stripe_event_retry IS 'Updates retry count and timestamp for an event';
COMMENT ON FUNCTION public.mark_stripe_event_failed IS 'Marks an event as permanently failed with a reason';