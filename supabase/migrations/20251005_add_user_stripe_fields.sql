-- Add Stripe Connect fields to User table
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT,
ADD COLUMN IF NOT EXISTS "subscriptionTier" TEXT DEFAULT 'STARTER';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_user_stripe_account" ON "users"("stripeAccountId");

-- Add comment
COMMENT ON COLUMN "users"."stripeAccountId" IS 'Stripe Connect account ID for landlords to receive payments';
COMMENT ON COLUMN "users"."subscriptionTier" IS 'User subscription tier: STARTER, PROFESSIONAL, ENTERPRISE';
