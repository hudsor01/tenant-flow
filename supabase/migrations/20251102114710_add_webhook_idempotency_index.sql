-- Add unique index to support atomic idempotency check for Stripe webhooks
-- Context: stripe-webhook.service.ts uses INSERT for atomic lock acquisition (line 48)
-- Issue: Without unique index, constraint check is slow and race conditions possible under high load
-- Fix: Add unique index on stripe_event_id for performant atomic operations

CREATE UNIQUE INDEX IF NOT EXISTS idx_processed_stripe_events_event_id
ON processed_stripe_events(stripe_event_id);

-- Verify index created
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'processed_stripe_events'
  AND indexname = 'idx_processed_stripe_events_event_id';

-- Expected: Index should exist and be UNIQUE on stripe_event_id column
