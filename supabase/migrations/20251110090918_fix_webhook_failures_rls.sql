-- Fix webhook_failures RLS permission error
-- Problem: Policy was set TO service_role, which doesn't need policies (bypasses RLS)
-- Solution: Disable RLS entirely since webhook_failures is backend-only table

-- Drop the incorrect policy (service_role doesn't need policies)
DROP POLICY IF EXISTS "Only service role can access webhook failures" ON public.webhook_failures;

-- Disable RLS on webhook_failures (backend-only table, no user access)
ALTER TABLE public.webhook_failures DISABLE ROW LEVEL SECURITY;

-- Note: Backend service uses admin client with service_role key which bypasses RLS anyway
-- Disabling RLS makes the intent explicit and prevents permission errors
