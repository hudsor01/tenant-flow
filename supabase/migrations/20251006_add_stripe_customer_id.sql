-- Add Stripe Customer ID to User table for platform subscription billing
-- This is different from stripeAccountId which is for Stripe Connect (landlord receiving payments)
-- stripeCustomerId is for the user's subscription to our platform

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT UNIQUE;

-- Add index for faster lookups by Stripe Customer ID
CREATE INDEX IF NOT EXISTS "idx_user_stripe_customer"
ON "users"("stripeCustomerId");

-- Add helpful comments
COMMENT ON COLUMN "users"."stripeCustomerId"
IS 'Stripe Customer ID for user platform subscription billing (different from stripeAccountId for Connect)';
