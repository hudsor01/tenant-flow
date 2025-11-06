-- Add Stripe Connect columns to users table
-- This migration adds support for Stripe Connected Accounts for owners

-- Add connectedAccountId to track owner's Stripe Connected Account
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS "connectedAccountId" TEXT NULL,
ADD COLUMN IF NOT EXISTS "onboardingComplete" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS "detailsSubmitted" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "chargesEnabled" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "payoutsEnabled" BOOLEAN DEFAULT FALSE;

-- Add comment explaining the column usage
COMMENT ON COLUMN public.users."connectedAccountId" IS 'Stripe Connected Account ID for owners (acct_xxx)';
COMMENT ON COLUMN public.users."onboardingComplete" IS 'Whether the owner has completed Stripe onboarding';
COMMENT ON COLUMN public.users."onboardingCompletedAt" IS 'Timestamp when Stripe onboarding was completed';
COMMENT ON COLUMN public.users."detailsSubmitted" IS 'Whether details have been submitted to Stripe';
COMMENT ON COLUMN public.users."chargesEnabled" IS 'Whether the connected account can accept charges';
COMMENT ON COLUMN public.users."payoutsEnabled" IS 'Whether the connected account can receive payouts';

-- Create index for faster lookups by connectedAccountId
CREATE INDEX IF NOT EXISTS "idx_users_connectedAccountId"
ON public.users("connectedAccountId")
WHERE "connectedAccountId" IS NOT NULL;

-- Add index for onboarding status queries
CREATE INDEX IF NOT EXISTS "idx_users_onboarding_status"
ON public.users("onboardingComplete", "chargesEnabled", "payoutsEnabled")
WHERE "connectedAccountId" IS NOT NULL;
