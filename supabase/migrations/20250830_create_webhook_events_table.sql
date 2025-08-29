-- Create WebhookEvent table for Stripe webhook idempotency
-- Safeguards: IF NOT EXISTS to allow repeated migrations in similar environments

-- Ensure pgcrypto for gen_random_uuid (on most Supabase projects it is enabled by default)
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public."WebhookEvent" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "stripeEventId" TEXT UNIQUE NOT NULL,
  "eventType" TEXT NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (service role bypasses RLS, but we codify least-privilege policies)
ALTER TABLE public."WebhookEvent" ENABLE ROW LEVEL SECURITY;

-- Allow only service_role to manage rows (backend insertion/removal)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'WebhookEvent' AND policyname = 'service_role_manage_webhook_events'
  ) THEN
    CREATE POLICY service_role_manage_webhook_events
      ON public."WebhookEvent"
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END$$;

COMMENT ON TABLE public."WebhookEvent" IS 'Idempotency table for Stripe webhooks (event IDs). Created by migration 20250829.';

