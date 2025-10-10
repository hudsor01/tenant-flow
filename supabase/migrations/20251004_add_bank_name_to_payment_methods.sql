-- Add bankName column to TenantPaymentMethod for ACH payment methods
-- Phase 3: Payment Methods - stores bank_name from Stripe PaymentMethod.us_bank_account

ALTER TABLE "TenantPaymentMethod"
ADD COLUMN IF NOT EXISTS "bankName" TEXT;

-- Add comment for documentation
COMMENT ON COLUMN "TenantPaymentMethod"."bankName" IS 'Bank name for ACH payment methods from Stripe PaymentMethod.us_bank_account.bank_name';
