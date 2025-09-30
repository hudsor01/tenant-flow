-- RPC function to atomically record a Stripe event
-- Uses ON CONFLICT to handle race conditions
CREATE OR REPLACE FUNCTION public.record_stripe_event(
    p_event_id TEXT,
    p_event_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.processed_stripe_events (
        stripe_event_id,
        event_type,
        processed_at
    )
    VALUES (
        p_event_id,
        p_event_type,
        NOW()
    )
    ON CONFLICT (stripe_event_id) DO NOTHING;

    -- Return true if a new row was inserted, false if it already existed
    RETURN FOUND;
END;
$$;

-- RPC function to check if an event has been processed
CREATE OR REPLACE FUNCTION public.check_event_processed(
    p_event_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.processed_stripe_events
        WHERE stripe_event_id = p_event_id
    ) INTO v_exists;

    RETURN v_exists;
END;
$$;

-- RPC function to cleanup old webhook events
CREATE OR REPLACE FUNCTION public.cleanup_old_stripe_events(
    p_days_to_keep INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM public.processed_stripe_events
    WHERE processed_at < NOW() - INTERVAL '1 day' * p_days_to_keep;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN v_deleted_count;
END;
$$;

-- RPC function to get webhook processing statistics
CREATE OR REPLACE FUNCTION public.get_webhook_statistics()
RETURNS TABLE(
    total_events BIGINT,
    today_events BIGINT,
    last_hour_events BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) AS total_events,
        COUNT(*) FILTER (WHERE processed_at >= CURRENT_DATE) AS today_events,
        COUNT(*) FILTER (WHERE processed_at >= NOW() - INTERVAL '1 hour') AS last_hour_events
    FROM public.processed_stripe_events;
END;
$$;

-- Grant execute permissions to service_role
GRANT EXECUTE ON FUNCTION public.record_stripe_event(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_event_processed(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_stripe_events(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_webhook_statistics() TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION public.record_stripe_event IS 'Atomically records a Stripe webhook event with idempotency';
COMMENT ON FUNCTION public.check_event_processed IS 'Checks if a Stripe webhook event has already been processed';
COMMENT ON FUNCTION public.cleanup_old_stripe_events IS 'Removes processed webhook events older than specified days';
COMMENT ON FUNCTION public.get_webhook_statistics IS 'Returns webhook processing statistics';