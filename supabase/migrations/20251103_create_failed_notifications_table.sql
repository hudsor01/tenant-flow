-- =====================================================
-- Failed Notifications Backoff Store
-- =====================================================
-- Purpose: Persist notification delivery failures for diagnostics & manual retries
-- Created: 2025-11-03
-- =====================================================

CREATE TABLE IF NOT EXISTS public.failed_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 1,
    last_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failed_notifications_event_type_created_at
ON public.failed_notifications (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_failed_notifications_last_attempt
ON public.failed_notifications (last_attempt_at DESC);

COMMENT ON TABLE public.failed_notifications IS
'Tracks notification deliveries that exhausted retry attempts for observability and manual intervention';

COMMENT ON COLUMN public.failed_notifications.event_data IS
'JSON payload describing the event that failed to deliver';

ALTER TABLE public.failed_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "failed_notifications_service_access"
ON public.failed_notifications
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);
