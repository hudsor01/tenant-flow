-- Add recovery columns to processed_stripe_events table
-- This enables proper webhook event recovery and retry mechanisms

-- Add recovery columns to existing processed_stripe_events table
ALTER TABLE public.processed_stripe_events
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'processed' CHECK (status IN ('processed', 'failed', 'permanently_failed')),
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS failure_reason TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for efficient recovery queries
CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_status_retry
ON public.processed_stripe_events (status, retry_count, last_retry_at)
WHERE status IN ('failed', 'permanently_failed');

-- Create index for event age queries
CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_created_at
ON public.processed_stripe_events (created_at);

-- Update RLS policy to allow service role access (already exists, but documenting)
-- The existing policy "Only service role can access processed events" should be sufficient

-- Add comment for documentation
COMMENT ON COLUMN public.processed_stripe_events.status IS
'Status of the event: processed, failed, permanently_failed';
COMMENT ON COLUMN public.processed_stripe_events.retry_count IS
'Number of retry attempts for failed events';
COMMENT ON COLUMN public.processed_stripe_events.last_retry_at IS
'Timestamp of last retry attempt';
COMMENT ON COLUMN public.processed_stripe_events.failure_reason IS
'Reason for event processing failure';
