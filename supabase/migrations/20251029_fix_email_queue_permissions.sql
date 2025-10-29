-- Migration: Fix email_queue table permissions for service role
-- Date: 2025-10-29
-- Description: Grant missing table-level permissions to service_role
-- Issue: Backend getting "permission denied for table email_queue" errors

-- Grant full access to email_queue table for service role
GRANT ALL ON public.email_queue TO service_role;

-- Also grant usage on sequences if any (for id generation)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Add comment
COMMENT ON TABLE public.email_queue IS 'Email retry queue with exponential backoff. Service role has full access for queue processing.';