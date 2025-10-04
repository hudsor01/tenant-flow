-- Create ConnectedAccount table for Stripe Connect v2 accounts
-- This stores landlord Stripe Connect accounts for receiving tenant payments

CREATE TABLE IF NOT EXISTS public."ConnectedAccount" (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "stripeAccountId" text UNIQUE NOT NULL,
  "accountType" text NOT NULL DEFAULT 'express' CHECK ("accountType" IN ('express', 'standard', 'custom')),
  "accountStatus" text DEFAULT 'pending' CHECK ("accountStatus" IN ('pending', 'active', 'restricted', 'disabled')),
  "chargesEnabled" boolean DEFAULT false,
  "payoutsEnabled" boolean DEFAULT false,
  "detailsSubmitted" boolean DEFAULT false,
  "displayName" text,
  "contactEmail" text,
  "country" text DEFAULT 'US',
  "currency" text DEFAULT 'usd',
  "businessType" text CHECK ("businessType" IN ('individual', 'company', 'non_profit', 'government_entity')),
  "onboardingCompleted" boolean DEFAULT false,
  "onboardingCompletedAt" timestamptz,
  "capabilities" jsonb DEFAULT '{}',
  "requirements" jsonb DEFAULT '{}',
  "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Create index on userId for fast lookups
CREATE INDEX IF NOT EXISTS "ConnectedAccount_userId_idx" ON public."ConnectedAccount"("userId");

-- Create index on stripeAccountId for webhook processing
CREATE INDEX IF NOT EXISTS "ConnectedAccount_stripeAccountId_idx" ON public."ConnectedAccount"("stripeAccountId");

-- Enable RLS
ALTER TABLE public."ConnectedAccount" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own connected accounts
CREATE POLICY "Users can view own connected accounts"
  ON public."ConnectedAccount"
  FOR SELECT
  USING (auth.uid()::text = "userId");

-- Policy: Users can insert their own connected accounts
CREATE POLICY "Users can create own connected accounts"
  ON public."ConnectedAccount"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

-- Policy: Users can update their own connected accounts
CREATE POLICY "Users can update own connected accounts"
  ON public."ConnectedAccount"
  FOR UPDATE
  USING (auth.uid()::text = "userId");

-- Grant permissions
GRANT ALL ON TABLE public."ConnectedAccount" TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public."ConnectedAccount" TO authenticated;

-- Add comment
COMMENT ON TABLE public."ConnectedAccount" IS 'Stores Stripe Connect v2 account information for landlords receiving tenant payments';
