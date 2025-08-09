-- Rent Payment System Database Schema
-- This migration creates the core tables for tenant rent collection

-- Payment Methods (PCI compliant via Stripe)
-- This table stores references to Stripe payment methods, not actual card data
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "stripePaymentMethodId" TEXT NOT NULL UNIQUE,
    "type" TEXT NOT NULL, -- 'card' or 'ach_debit'
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "lastFour" TEXT, -- Last 4 digits for display
    "brand" TEXT, -- For cards: visa, mastercard, etc. For ACH: bank name
    "expiryMonth" INTEGER, -- For cards only
    "expiryYear" INTEGER, -- For cards only
    "fingerprint" TEXT, -- Stripe fingerprint for duplicate detection
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Multi-tenant RLS
    "organizationId" TEXT NOT NULL,
    
    CONSTRAINT "PaymentMethod_tenantId_fkey" 
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
);

-- Rent Charges (monthly rent amounts due)
CREATE TABLE "RentCharge" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "leaseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL, -- Amount in cents
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "dueDate" DATE NOT NULL,
    "description" TEXT NOT NULL, -- "Rent for January 2025"
    "status" TEXT NOT NULL DEFAULT 'pending', -- pending, paid, overdue, cancelled
    "lateFeeDays" INTEGER NOT NULL DEFAULT 5, -- Grace period before late fees
    "lateFeeAmount" INTEGER, -- Late fee in cents
    "paidAt" TIMESTAMPTZ,
    "paymentId" TEXT, -- References RentPayment.id when paid
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Multi-tenant RLS
    "organizationId" TEXT NOT NULL,
    
    CONSTRAINT "RentCharge_leaseId_fkey" 
        FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE,
    CONSTRAINT "RentCharge_tenantId_fkey" 
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
);

-- Rent Payments (actual payment transactions)
CREATE TABLE "RentPayment" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "rentChargeId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL, -- Amount in cents
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "paymentMethodId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT NOT NULL UNIQUE,
    "status" TEXT NOT NULL DEFAULT 'pending', -- pending, processing, succeeded, failed, cancelled
    "failureReason" TEXT, -- If status is 'failed'
    "processingFee" INTEGER, -- Platform fee in cents
    "netAmount" INTEGER, -- Amount after fees in cents
    "receiptNumber" TEXT NOT NULL UNIQUE, -- Human-readable receipt number
    "receiptUrl" TEXT, -- URL to receipt PDF
    "paidAt" TIMESTAMPTZ,
    "failedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Multi-tenant RLS
    "organizationId" TEXT NOT NULL,
    
    CONSTRAINT "RentPayment_rentChargeId_fkey" 
        FOREIGN KEY ("rentChargeId") REFERENCES "RentCharge"("id") ON DELETE RESTRICT,
    CONSTRAINT "RentPayment_tenantId_fkey" 
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
    CONSTRAINT "RentPayment_paymentMethodId_fkey" 
        FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT
);

-- Update RentCharge to reference successful payment
ALTER TABLE "RentCharge" 
ADD CONSTRAINT "RentCharge_paymentId_fkey" 
    FOREIGN KEY ("paymentId") REFERENCES "RentPayment"("id") ON DELETE SET NULL;

-- Automatic Rent Collection Settings
CREATE TABLE "RentCollectionSettings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "leaseId" TEXT NOT NULL UNIQUE,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "dayOfMonth" INTEGER NOT NULL DEFAULT 1, -- Day rent is due (1-31)
    "autoChargeEnabled" BOOLEAN NOT NULL DEFAULT false, -- Automatically charge saved payment method
    "defaultPaymentMethodId" TEXT, -- Default payment method for auto-charge
    "reminderDays" INTEGER[] NOT NULL DEFAULT '{7,3,1}', -- Days before due date to send reminders
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 5, -- Days before late fees apply
    "lateFeeAmount" INTEGER, -- Late fee in cents
    "lateFeeType" TEXT NOT NULL DEFAULT 'fixed', -- fixed or percentage
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Multi-tenant RLS
    "organizationId" TEXT NOT NULL,
    
    CONSTRAINT "RentCollectionSettings_leaseId_fkey" 
        FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE,
    CONSTRAINT "RentCollectionSettings_defaultPaymentMethodId_fkey" 
        FOREIGN KEY ("defaultPaymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL
);

-- Payment Attempts (for retry logic and audit trail)
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "rentPaymentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "stripePaymentIntentId" TEXT NOT NULL,
    "status" TEXT NOT NULL, -- pending, processing, succeeded, failed
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "processingFee" INTEGER, -- Fee for this attempt in cents
    "attemptedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "completedAt" TIMESTAMPTZ,
    
    -- Multi-tenant RLS
    "organizationId" TEXT NOT NULL,
    
    CONSTRAINT "PaymentAttempt_rentPaymentId_fkey" 
        FOREIGN KEY ("rentPaymentId") REFERENCES "RentPayment"("id") ON DELETE CASCADE,
        
    UNIQUE("rentPaymentId", "attemptNumber")
);

-- Indexes for performance
CREATE INDEX "idx_payment_method_tenant_id" ON "PaymentMethod"("tenantId");
CREATE INDEX "idx_payment_method_organization_id" ON "PaymentMethod"("organizationId");
CREATE INDEX "idx_payment_method_active" ON "PaymentMethod"("active") WHERE "active" = true;

CREATE INDEX "idx_rent_charge_lease_id" ON "RentCharge"("leaseId");
CREATE INDEX "idx_rent_charge_tenant_id" ON "RentCharge"("tenantId");
CREATE INDEX "idx_rent_charge_organization_id" ON "RentCharge"("organizationId");
CREATE INDEX "idx_rent_charge_due_date" ON "RentCharge"("dueDate");
CREATE INDEX "idx_rent_charge_status" ON "RentCharge"("status");
CREATE INDEX "idx_rent_charge_overdue" ON "RentCharge"("dueDate", "status") WHERE "status" = 'pending';

CREATE INDEX "idx_rent_payment_tenant_id" ON "RentPayment"("tenantId");
CREATE INDEX "idx_rent_payment_organization_id" ON "RentPayment"("organizationId");
CREATE INDEX "idx_rent_payment_status" ON "RentPayment"("status");
CREATE INDEX "idx_rent_payment_created_at" ON "RentPayment"("createdAt");
CREATE INDEX "idx_rent_payment_paid_at" ON "RentPayment"("paidAt");

CREATE INDEX "idx_rent_collection_settings_organization_id" ON "RentCollectionSettings"("organizationId");

CREATE INDEX "idx_payment_attempt_rent_payment_id" ON "PaymentAttempt"("rentPaymentId");
CREATE INDEX "idx_payment_attempt_organization_id" ON "PaymentAttempt"("organizationId");

-- Row Level Security (RLS) Policies
ALTER TABLE "PaymentMethod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RentCharge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RentPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RentCollectionSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentAttempt" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for multi-tenant isolation
CREATE POLICY "PaymentMethod_isolation" ON "PaymentMethod" 
    USING (("organizationId")::text = current_setting('app.current_organization_id'::text, false));

CREATE POLICY "RentCharge_isolation" ON "RentCharge" 
    USING (("organizationId")::text = current_setting('app.current_organization_id'::text, false));

CREATE POLICY "RentPayment_isolation" ON "RentPayment" 
    USING (("organizationId")::text = current_setting('app.current_organization_id'::text, false));

CREATE POLICY "RentCollectionSettings_isolation" ON "RentCollectionSettings" 
    USING (("organizationId")::text = current_setting('app.current_organization_id'::text, false));

CREATE POLICY "PaymentAttempt_isolation" ON "PaymentAttempt" 
    USING (("organizationId")::text = current_setting('app.current_organization_id'::text, false));

-- Receipt number sequence for human-readable receipts
CREATE SEQUENCE rent_receipt_sequence START 1000;

-- Function to generate receipt numbers
CREATE OR REPLACE FUNCTION generate_receipt_number() 
RETURNS TEXT AS $$
BEGIN
    RETURN 'RCP-' || TO_CHAR(nextval('rent_receipt_sequence'), 'FM000000');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate receipt numbers
CREATE OR REPLACE FUNCTION set_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."receiptNumber" IS NULL OR NEW."receiptNumber" = '' THEN
        NEW."receiptNumber" = generate_receipt_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_rent_payment_receipt_number
    BEFORE INSERT ON "RentPayment"
    FOR EACH ROW
    EXECUTE FUNCTION set_receipt_number();