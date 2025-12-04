-- Migration: Create processed_internal_events table for @OnEvent handler idempotency
-- Purpose: Track processed internal events to prevent duplicate processing

-- Table for internal event idempotency (idempotent)
CREATE TABLE IF NOT EXISTS public.processed_internal_events (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    event_name text NOT NULL,
    idempotency_key text NOT NULL,
    payload_hash text NOT NULL,
    status text DEFAULT 'processing' CHECK (status IN ('processing', 'processed', 'failed')),
    processed_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(event_name, idempotency_key)
);

-- Comment on table
COMMENT ON TABLE public.processed_internal_events IS 'Tracks processed internal events for idempotency. Used by @OnEvent handlers to prevent duplicate processing.';

-- Comments on columns
COMMENT ON COLUMN public.processed_internal_events.event_name IS 'Event name (e.g., maintenance.updated, payment.received)';
COMMENT ON COLUMN public.processed_internal_events.idempotency_key IS 'SHA-256 hash of event_name + payload for deduplication';
COMMENT ON COLUMN public.processed_internal_events.payload_hash IS 'Short hash of payload for debugging/auditing';
COMMENT ON COLUMN public.processed_internal_events.status IS 'Processing status: processing, processed, or failed';

-- Indexes for performance (idempotent)
CREATE INDEX IF NOT EXISTS idx_processed_internal_events_created_at ON public.processed_internal_events(created_at);
CREATE INDEX IF NOT EXISTS idx_processed_internal_events_event_name ON public.processed_internal_events(event_name);
CREATE INDEX IF NOT EXISTS idx_processed_internal_events_status ON public.processed_internal_events(status) WHERE status = 'processing';

-- RPC function for atomic lock acquisition (mirrors existing stripe webhook pattern)
CREATE OR REPLACE FUNCTION public.acquire_internal_event_lock(
    p_event_name text,
    p_idempotency_key text,
    p_payload_hash text
) RETURNS TABLE(lock_acquired boolean) AS $$
BEGIN
    -- Atomic INSERT with ON CONFLICT DO NOTHING
    -- FOUND will be true only if the INSERT succeeded (no conflict)
    INSERT INTO public.processed_internal_events (event_name, idempotency_key, payload_hash, status, created_at)
    VALUES (p_event_name, p_idempotency_key, p_payload_hash, 'processing', now())
    ON CONFLICT (event_name, idempotency_key) DO NOTHING;

    RETURN QUERY SELECT FOUND AS lock_acquired;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.acquire_internal_event_lock IS 'Atomically acquires a lock for processing an internal event. Returns lock_acquired=true if successful, false if event already exists.';

-- Cleanup function (for scheduled cron job)
CREATE OR REPLACE FUNCTION public.cleanup_old_internal_events(days_to_keep integer DEFAULT 30)
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM public.processed_internal_events
    WHERE created_at < now() - (days_to_keep || ' days')::interval;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_old_internal_events IS 'Removes old processed events. Default retention: 30 days.';

-- Enable RLS (no policies needed - admin client only)
ALTER TABLE public.processed_internal_events ENABLE ROW LEVEL SECURITY;
