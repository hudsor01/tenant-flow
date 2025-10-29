-- Migration: Create email_queue table for email retry infrastructure
-- Date: 2025-10-28
-- Description: Database-backed email queue with exponential backoff retry
-- Purpose: Ensure critical emails (payment, subscription, invitations) are delivered reliably

-- Create email queue table
CREATE TABLE IF NOT EXISTS public.email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Email metadata
  email_type text NOT NULL CHECK (email_type IN (
    'tenant_invitation',
    'invitation_reminder',
    'payment_success',
    'payment_failed',
    'subscription_canceled',
    'trial_ending'
  )),
  recipient_email text NOT NULL,
  payload jsonb NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  
  -- Status tracking
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0,
  
  -- Error tracking
  last_error text,
  last_attempt_at timestamptz,
  
  -- Retry scheduling
  next_retry_at timestamptz NOT NULL,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  failed_at timestamptz
);

-- Create indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_email_queue_status_retry 
  ON public.email_queue(status, next_retry_at) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_queue_priority 
  ON public.email_queue(priority, created_at) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_queue_failed 
  ON public.email_queue(failed_at) 
  WHERE status = 'failed';

CREATE INDEX IF NOT EXISTS idx_email_queue_completed 
  ON public.email_queue(completed_at) 
  WHERE status = 'completed';

-- Enable Row Level Security (RLS)
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service role can access email queue
CREATE POLICY "Service role full access to email_queue"
  ON public.email_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to clean up old completed emails
CREATE OR REPLACE FUNCTION public.cleanup_old_email_queue_entries()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete completed emails older than 30 days
  DELETE FROM public.email_queue
  WHERE status = 'completed'
  AND completed_at < (now() - interval '30 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.cleanup_old_email_queue_entries() TO service_role;

-- Add comment for documentation
COMMENT ON TABLE public.email_queue IS 'Email retry queue with exponential backoff. Ensures critical emails are delivered reliably.';
COMMENT ON FUNCTION public.cleanup_old_email_queue_entries() IS 'SECURITY: Fixed search_path - Deletes email queue entries older than 30 days (completed status only).';

-- Create a view for monitoring email queue health
CREATE OR REPLACE VIEW public.email_queue_stats AS
SELECT
  email_type,
  status,
  priority,
  COUNT(*) as count,
  AVG(attempt_count) as avg_attempts,
  MAX(created_at) as last_created,
  MAX(completed_at) as last_completed,
  MAX(failed_at) as last_failed
FROM public.email_queue
GROUP BY email_type, status, priority
ORDER BY email_type, status, priority;

GRANT SELECT ON public.email_queue_stats TO service_role;

COMMENT ON VIEW public.email_queue_stats IS 'Email queue health monitoring - shows counts, averages, and timestamps by type/status/priority.';
