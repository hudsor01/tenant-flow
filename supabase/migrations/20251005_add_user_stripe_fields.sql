-- Add Stripe Connect fields to User table
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT,
ADD COLUMN IF NOT EXISTS "subscriptionTier" TEXT DEFAULT 'STARTER';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_user_stripe_account" ON "User"("stripeAccountId");

-- Add comment
COMMENT ON COLUMN "User"."stripeAccountId" IS 'Stripe Connect account ID for landlords to receive payments';
COMMENT ON COLUMN "User"."subscriptionTier" IS 'User subscription tier: STARTER, PROFESSIONAL, ENTERPRISE';
