-- Create table to track processed Stripe webhook events for idempotency
-- This prevents duplicate processing of the same event after service restarts

-- Ensure pgcrypto extension is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.processed_stripe_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint for idempotency (prevents duplicate processing)
    CONSTRAINT idx_stripe_event_id_unique UNIQUE (stripe_event_id)
);

-- Index for cleanup queries by processed_at
CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_processed_at 
ON public.processed_stripe_events (processed_at);

-- RLS: Only backend service can access this table (no user access needed)
ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access (no user policies needed)
CREATE POLICY "Only service role can access processed events" 
ON public.processed_stripe_events 
FOR ALL 
TO service_role 
USING (true);

-- Add comment for documentation
COMMENT ON TABLE public.processed_stripe_events IS 
'Tracks processed Stripe webhook events to prevent duplicate processing across service restarts';