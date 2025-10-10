-- Migration: Add unique constraint for webhook event idempotency
-- Phase 6F: 2025 Best Practices Alignment
-- Purpose: Prevent race conditions in webhook processing by ensuring atomic deduplication

-- Add unique constraint on eventId column
-- This ensures database-level idempotency and prevents duplicate event processing
ALTER TABLE "StripeWebhookEvent"
ADD CONSTRAINT unique_webhook_event_id UNIQUE (eventId);

-- Add index for faster lookups (unique constraint already creates index, but being explicit)
-- CREATE INDEX IF NOT EXISTS idx_webhook_event_id ON "StripeWebhookEvent"(eventId);
-- Note: UNIQUE constraint already creates an index, so this is redundant

-- Add createdAt column if it doesn't exist (for audit trail)
ALTER TABLE "StripeWebhookEvent"
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Comment on the constraint for documentation
COMMENT ON CONSTRAINT unique_webhook_event_id ON "StripeWebhookEvent" IS
'Ensures atomic idempotency for Stripe webhook events. Prevents race conditions by rejecting duplicate event IDs at database level.';
