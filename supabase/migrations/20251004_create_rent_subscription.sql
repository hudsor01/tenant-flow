-- Migration: Create RentSubscription table for autopay subscriptions
-- Phase 4: Autopay Subscriptions
-- Description: Stores recurring rent payment subscriptions with Stripe billing

-- Create RentSubscription table
CREATE TABLE IF NOT EXISTS public."RentSubscription" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "leaseId" UUID NOT NULL REFERENCES public."Lease"(id) ON DELETE CASCADE,
  "tenantId" UUID NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "landlordId" UUID NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "stripeSubscriptionId" TEXT NOT NULL UNIQUE,
  "stripeCustomerId" TEXT NOT NULL,
  "paymentMethodId" UUID NOT NULL REFERENCES public."TenantPaymentMethod"(id) ON DELETE RESTRICT,
  "amount" DECIMAL(10, 2) NOT NULL CHECK ("amount" > 0),
  "currency" TEXT NOT NULL DEFAULT 'usd',
  "billingDayOfMonth" INTEGER NOT NULL CHECK ("billingDayOfMonth" BETWEEN 1 AND 31),
  "status" TEXT NOT NULL CHECK ("status" IN ('active', 'paused', 'canceled', 'past_due', 'incomplete')),
  "platformFeePercentage" DECIMAL(5, 2) NOT NULL DEFAULT 2.9 CHECK ("platformFeePercentage" >= 0 AND "platformFeePercentage" <= 100),
  "pausedAt" TIMESTAMPTZ,
  "canceledAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS "RentSubscription_leaseId_idx" ON public."RentSubscription"("leaseId");
CREATE INDEX IF NOT EXISTS "RentSubscription_tenantId_idx" ON public."RentSubscription"("tenantId");
CREATE INDEX IF NOT EXISTS "RentSubscription_landlordId_idx" ON public."RentSubscription"("landlordId");
CREATE INDEX IF NOT EXISTS "RentSubscription_status_idx" ON public."RentSubscription"("status");
CREATE INDEX IF NOT EXISTS "RentSubscription_stripeSubscriptionId_idx" ON public."RentSubscription"("stripeSubscriptionId");

-- Enable Row Level Security
ALTER TABLE public."RentSubscription" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenants can view their own subscriptions
CREATE POLICY "Tenants can view own subscriptions"
  ON public."RentSubscription"
  FOR SELECT
  USING (
    (auth.uid())::text IN (
      SELECT "userId" FROM public."Tenant" WHERE id = "tenantId"
    )
  );

-- RLS Policy: Tenants can create subscriptions for their leases
CREATE POLICY "Tenants can create own subscriptions"
  ON public."RentSubscription"
  FOR INSERT
  WITH CHECK (
    (auth.uid())::text IN (
      SELECT "userId" FROM public."Tenant" WHERE id = "tenantId"
    )
  );

-- RLS Policy: Tenants can update their own subscriptions
CREATE POLICY "Tenants can update own subscriptions"
  ON public."RentSubscription"
  FOR UPDATE
  USING (
    (auth.uid())::text IN (
      SELECT "userId" FROM public."Tenant" WHERE id = "tenantId"
    )
  );

-- RLS Policy: Landlords can view subscriptions for their properties
CREATE POLICY "Landlords can view property subscriptions"
  ON public."RentSubscription"
  FOR SELECT
  USING (
    (auth.uid())::text = "landlordId"::text
  );

-- Create updated_at trigger
CREATE TRIGGER set_rent_subscription_updated_at
  BEFORE UPDATE ON public."RentSubscription"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public."RentSubscription" TO authenticated;
GRANT SELECT ON public."RentSubscription" TO anon;

-- Add comment
COMMENT ON TABLE public."RentSubscription" IS 'Stores recurring rent payment subscriptions managed through Stripe Billing';
