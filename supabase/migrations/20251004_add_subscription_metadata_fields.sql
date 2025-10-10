-- Add missing fields to RentSubscription table for comprehensive Stripe integration
-- Phase 4 improvements: currency, pausedAt, canceledAt timestamps

ALTER TABLE "RentSubscription"
ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'usd',
ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "canceledAt" TIMESTAMPTZ;

-- Add constraint to ensure currency is a valid ISO code (expandable)
ALTER TABLE "RentSubscription"
ADD CONSTRAINT "RentSubscription_currency_check"
CHECK ("currency" IN ('usd', 'cad', 'gbp', 'eur'));

-- Add index for querying paused/canceled subscriptions
CREATE INDEX IF NOT EXISTS "idx_rent_subscriptions_paused" ON "RentSubscription"("pausedAt");
CREATE INDEX IF NOT EXISTS "idx_rent_subscriptions_canceled" ON "RentSubscription"("canceledAt");

-- Comment for documentation
COMMENT ON COLUMN "RentSubscription"."currency" IS 'ISO currency code for subscription (usd, cad, gbp, eur)';
COMMENT ON COLUMN "RentSubscription"."pausedAt" IS 'Timestamp when subscription was paused';
COMMENT ON COLUMN "RentSubscription"."canceledAt" IS 'Timestamp when subscription was canceled';
