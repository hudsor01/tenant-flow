-- Migration: Create payment-related tables for tenant payment system
-- Description: TenantPaymentMethod, RentSubscription, RentPayment, PaymentSchedule
-- Date: 2025-10-04

-- =====================================================
-- 1. TenantPaymentMethod - Store Stripe payment methods
-- =====================================================
CREATE TABLE IF NOT EXISTS public."TenantPaymentMethod" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "stripePaymentMethodId" text UNIQUE NOT NULL,
  "stripeCustomerId" text NOT NULL,
  type text NOT NULL CHECK (type IN ('card', 'us_bank_account')),
  last4 text,
  brand text,
  "isDefault" boolean DEFAULT false,
  "verificationStatus" text DEFAULT 'pending' CHECK ("verificationStatus" IN ('pending', 'verified', 'failed')),
  "createdAt" timestamptz DEFAULT NOW(),
  "updatedAt" timestamptz DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_payment_methods_tenant 
  ON public."TenantPaymentMethod"("tenantId");
CREATE INDEX IF NOT EXISTS idx_tenant_payment_methods_customer 
  ON public."TenantPaymentMethod"("stripeCustomerId");

-- Comments
COMMENT ON TABLE public."TenantPaymentMethod" IS 'Stores tenant payment methods (cards and bank accounts) linked to Stripe';
COMMENT ON COLUMN public."TenantPaymentMethod"."stripePaymentMethodId" IS 'Stripe PaymentMethod ID (pm_xxx)';
COMMENT ON COLUMN public."TenantPaymentMethod"."stripeCustomerId" IS 'Stripe Customer ID (cus_xxx)';
COMMENT ON COLUMN public."TenantPaymentMethod".type IS 'Payment method type: card or us_bank_account';
COMMENT ON COLUMN public."TenantPaymentMethod"."verificationStatus" IS 'ACH verification status (instant via Plaid or microdeposits)';

-- =====================================================
-- 2. RentSubscription - Track autopay subscriptions
-- =====================================================
CREATE TABLE IF NOT EXISTS public."RentSubscription" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "landlordId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "leaseId" text NOT NULL REFERENCES public."Lease"(id) ON DELETE CASCADE,
  "stripeSubscriptionId" text UNIQUE NOT NULL,
  "stripeCustomerId" text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  "platformFeePercent" numeric(4,2) NOT NULL CHECK ("platformFeePercent" >= 0 AND "platformFeePercent" <= 100),
  "dueDay" integer NOT NULL CHECK ("dueDay" BETWEEN 1 AND 31),
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  "nextBillingDate" timestamptz,
  "createdAt" timestamptz DEFAULT NOW(),
  "updatedAt" timestamptz DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rent_subscriptions_tenant 
  ON public."RentSubscription"("tenantId");
CREATE INDEX IF NOT EXISTS idx_rent_subscriptions_landlord 
  ON public."RentSubscription"("landlordId");
CREATE INDEX IF NOT EXISTS idx_rent_subscriptions_lease 
  ON public."RentSubscription"("leaseId");
CREATE INDEX IF NOT EXISTS idx_rent_subscriptions_status 
  ON public."RentSubscription"(status);

-- Comments
COMMENT ON TABLE public."RentSubscription" IS 'Autopay subscriptions for recurring rent payments';
COMMENT ON COLUMN public."RentSubscription"."stripeSubscriptionId" IS 'Stripe Subscription ID (sub_xxx)';
COMMENT ON COLUMN public."RentSubscription"."platformFeePercent" IS 'Platform fee percentage (2%, 2.5%, or 3% based on landlord tier)';
COMMENT ON COLUMN public."RentSubscription"."dueDay" IS 'Day of month rent is due (1-31)';

-- =====================================================
-- 3. RentPayment - Individual payment records
-- =====================================================
CREATE TABLE IF NOT EXISTS public."RentPayment" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId" text NOT NULL REFERENCES public."User"(id),
  "landlordId" text NOT NULL REFERENCES public."User"(id),
  "leaseId" text NOT NULL REFERENCES public."Lease"(id),
  "subscriptionId" text REFERENCES public."RentSubscription"(id),
  "stripePaymentIntentId" text,
  "stripeInvoiceId" text,
  amount integer NOT NULL CHECK (amount > 0),
  "platformFee" integer NOT NULL,
  "stripeFee" integer NOT NULL,
  "landlordReceives" integer NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
  "paymentType" text NOT NULL CHECK ("paymentType" IN ('card', 'ach', 'manual')),
  "failureReason" text,
  "paidAt" timestamptz,
  "createdAt" timestamptz DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rent_payments_tenant 
  ON public."RentPayment"("tenantId");
CREATE INDEX IF NOT EXISTS idx_rent_payments_landlord 
  ON public."RentPayment"("landlordId");
CREATE INDEX IF NOT EXISTS idx_rent_payments_lease 
  ON public."RentPayment"("leaseId");
CREATE INDEX IF NOT EXISTS idx_rent_payments_status 
  ON public."RentPayment"(status);
CREATE INDEX IF NOT EXISTS idx_rent_payments_created 
  ON public."RentPayment"("createdAt" DESC);

-- Comments
COMMENT ON TABLE public."RentPayment" IS 'Individual rent payment transactions';
COMMENT ON COLUMN public."RentPayment"."stripePaymentIntentId" IS 'Stripe PaymentIntent ID for one-time payments (pi_xxx)';
COMMENT ON COLUMN public."RentPayment"."stripeInvoiceId" IS 'Stripe Invoice ID for subscription payments (in_xxx)';
COMMENT ON COLUMN public."RentPayment"."platformFee" IS 'Platform fee in cents (2-3% of amount)';
COMMENT ON COLUMN public."RentPayment"."stripeFee" IS 'Stripe processing fee in cents';
COMMENT ON COLUMN public."RentPayment"."landlordReceives" IS 'Net amount landlord receives (amount - platformFee)';

-- =====================================================
-- 4. PaymentSchedule - Track due dates and late fees
-- =====================================================
CREATE TABLE IF NOT EXISTS public."PaymentSchedule" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "leaseId" text NOT NULL REFERENCES public."Lease"(id) ON DELETE CASCADE,
  "dueDate" timestamptz NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  "lateFeeAmount" integer DEFAULT 0,
  "lateFeeGraceDays" integer DEFAULT 0,
  state text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'waived')),
  "paidAt" timestamptz,
  "createdAt" timestamptz DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_schedule_lease 
  ON public."PaymentSchedule"("leaseId");
CREATE INDEX IF NOT EXISTS idx_payment_schedule_due_date 
  ON public."PaymentSchedule"("dueDate");
CREATE INDEX IF NOT EXISTS idx_payment_schedule_status 
  ON public."PaymentSchedule"(status);

-- Comments
COMMENT ON TABLE public."PaymentSchedule" IS 'Payment schedule with due dates and late fee tracking';
COMMENT ON COLUMN public."PaymentSchedule".state IS 'US state code for late fee compliance (e.g., CA, NY, TX)';
COMMENT ON COLUMN public."PaymentSchedule"."lateFeeAmount" IS 'Late fee in cents (state-dependent calculation)';
COMMENT ON COLUMN public."PaymentSchedule"."lateFeeGraceDays" IS 'Grace period before late fee applies';

-- =====================================================
-- 5. Stripe Webhook Event Tracking (Idempotency)
-- =====================================================
CREATE TABLE IF NOT EXISTS public."StripeWebhookEvent" (
  "eventId" text PRIMARY KEY,
  type text NOT NULL,
  "processedAt" timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed 
  ON public."StripeWebhookEvent"("processedAt");

COMMENT ON TABLE public."StripeWebhookEvent" IS 'Tracks processed Stripe webhook events for idempotency';
COMMENT ON COLUMN public."StripeWebhookEvent"."eventId" IS 'Stripe Event ID (evt_xxx) - prevents duplicate processing';


-- =====================================================
-- 6. Row Level Security Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public."TenantPaymentMethod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RentSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RentPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PaymentSchedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StripeWebhookEvent" ENABLE ROW LEVEL SECURITY;

-- TenantPaymentMethod Policies
CREATE POLICY "Tenants can view own payment methods"
  ON public."TenantPaymentMethod"
  FOR SELECT
  USING (auth.uid()::text = "tenantId");

CREATE POLICY "Tenants can insert own payment methods"
  ON public."TenantPaymentMethod"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "tenantId");

CREATE POLICY "Tenants can update own payment methods"
  ON public."TenantPaymentMethod"
  FOR UPDATE
  USING (auth.uid()::text = "tenantId");

CREATE POLICY "Tenants can delete own payment methods"
  ON public."TenantPaymentMethod"
  FOR DELETE
  USING (auth.uid()::text = "tenantId");

-- RentSubscription Policies
CREATE POLICY "Tenants can view own subscriptions"
  ON public."RentSubscription"
  FOR SELECT
  USING (auth.uid()::text = "tenantId");

CREATE POLICY "Landlords can view tenant subscriptions"
  ON public."RentSubscription"
  FOR SELECT
  USING (auth.uid()::text = "landlordId");

CREATE POLICY "Service role full access to subscriptions"
  ON public."RentSubscription"
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- RentPayment Policies
CREATE POLICY "Tenants can view own payments"
  ON public."RentPayment"
  FOR SELECT
  USING (auth.uid()::text = "tenantId");

CREATE POLICY "Landlords can view received payments"
  ON public."RentPayment"
  FOR SELECT
  USING (auth.uid()::text = "landlordId");

CREATE POLICY "Service role full access to payments"
  ON public."RentPayment"
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- PaymentSchedule Policies
CREATE POLICY "Tenants can view own payment schedule"
  ON public."PaymentSchedule"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public."Lease"
      WHERE "Lease".id = "PaymentSchedule"."leaseId"
      AND "Lease"."tenantId" = auth.uid()::text
    )
  );

CREATE POLICY "Landlords can view tenant payment schedules"
  ON public."PaymentSchedule"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public."Lease"
      JOIN public."Unit" ON "Unit".id = "Lease"."unitId"
      JOIN public."Property" ON "Property".id = "Unit"."propertyId"
      WHERE "Lease".id = "PaymentSchedule"."leaseId"
      AND "Property"."ownerId" = auth.uid()::text
    )
  );

CREATE POLICY "Service role full access to schedules"
  ON public."PaymentSchedule"
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- StripeWebhookEvent Policies (Backend only)
CREATE POLICY "Service role full access to webhook events"
  ON public."StripeWebhookEvent"
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
