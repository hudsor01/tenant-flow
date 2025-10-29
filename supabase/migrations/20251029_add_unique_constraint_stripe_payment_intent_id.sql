-- Migration: Add unique constraint for stripePaymentIntentId in rent_payment table
-- Purpose: Prevent duplicate rent payment records when Stripe webhooks are retried
-- Issue: Webhook retries can create duplicate entries without uniqueness protection

-- Add unique constraint on stripePaymentIntentId column
-- This ensures database-level idempotency and prevents duplicate payment records
ALTER TABLE "RentPayment"
ADD CONSTRAINT unique_rent_payment_stripe_intent_id UNIQUE ("stripePaymentIntentId");

-- Add index for faster lookups (unique constraint already creates index, but being explicit)
-- CREATE INDEX IF NOT EXISTS idx_rent_payment_stripe_intent_id ON "RentPayment"("stripePaymentIntentId");
-- Note: UNIQUE constraint already creates an index, so this is redundant

-- Add createdAt column if it doesn't exist for audit trail
ALTER TABLE "RentPayment"
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Comment on the constraint for documentation
COMMENT ON CONSTRAINT unique_rent_payment_stripe_intent_id ON "RentPayment" IS
'Ensures atomic idempotency for rent payments. Prevents duplicate records when Stripe webhooks are retried by rejecting duplicate stripePaymentIntentId values at database level.';
