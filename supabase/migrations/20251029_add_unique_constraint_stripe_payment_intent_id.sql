-- Migration: Add unique constraint for stripePaymentIntentId in rent_payment table
-- Purpose: Prevent duplicate rent payment records when Stripe webhooks are retried
-- Issue: Webhook retries can create duplicate entries without uniqueness protection

-- Add unique constraint on stripePaymentIntentId column
-- This ensures database-level idempotency and prevents duplicate payment records
-- Idempotent: Only adds constraint if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'unique_rent_payment_stripe_intent_id'
      AND table_name = 'rent_payments'
      AND constraint_type = 'UNIQUE'
  ) THEN
    ALTER TABLE rent_payments
    ADD CONSTRAINT unique_rent_payment_stripe_intent_id UNIQUE ("stripePaymentIntentId");
  END IF;
END $$;

-- Comment on the constraint for documentation
COMMENT ON CONSTRAINT unique_rent_payment_stripe_intent_id ON rent_payments IS
'Ensures atomic idempotency for rent payments. Prevents duplicate records when Stripe webhooks are retried by rejecting duplicate stripePaymentIntentId values at database level.';
