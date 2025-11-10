-- Fix webhook_failures RLS permission error
-- Problem: Policy was set TO service_role, which doesn't need policies (bypasses RLS)
-- Solution: Disable RLS entirely since webhook_failures is backend-only table

-- Drop the incorrect policy (service_role doesn't need policies)
DROP POLICY IF EXISTS "Only service role can access webhook failures" ON public.webhook_failures;

-- Disable RLS on webhook_failures (backend-only table, no user access)
ALTER TABLE public.webhook_failures DISABLE ROW LEVEL SECURITY;

-- Document RLS is intentionally disabled for backend-only access
COMMENT ON TABLE public.webhook_failures IS 'Backend-only table for webhook failure logging. RLS is intentionally disabled because the backend uses service_role which bypasses RLS. WARNING: Do not expose this table to user-facing access without re-enabling RLS and implementing appropriate row-level security policies.';
