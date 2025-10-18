-- Migration: Add late fee fields to Lease and RentPayment tables
-- Description: Adds configurable late fee settings to Lease table and tracking fields to RentPayment table

-- Add late fee configuration fields to Lease table
ALTER TABLE "lease"
ADD COLUMN IF NOT EXISTS "gracePeriodDays" INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS "lateFeeAmount" INTEGER DEFAULT 5000, -- $50 in cents
ADD COLUMN IF NOT EXISTS "lateFeePercentage" DOUBLE PRECISION DEFAULT 0.05; -- 5%

-- Add comments for clarity
COMMENT ON COLUMN "lease"."gracePeriodDays" IS 'Number of days after due date before late fee applies (default: 5)';
COMMENT ON COLUMN "lease"."lateFeeAmount" IS 'Flat late fee amount in cents (default: $50 = 5000 cents)';
COMMENT ON COLUMN "lease"."lateFeePercentage" IS 'Percentage late fee as decimal (default: 0.05 = 5%)';

-- Add late fee tracking fields to RentPayment table
ALTER TABLE "RentPayment"
ADD COLUMN IF NOT EXISTS "lateFeeApplied" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "lateFeeAmount" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lateFeeAppliedAt" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP WITH TIME ZONE;

-- Add comments for clarity
COMMENT ON COLUMN "RentPayment"."lateFeeApplied" IS 'Whether a late fee has been applied to this payment';
COMMENT ON COLUMN "RentPayment"."lateFeeAmount" IS 'Late fee amount in cents that was applied';
COMMENT ON COLUMN "RentPayment"."lateFeeAppliedAt" IS 'Timestamp when late fee was applied';
COMMENT ON COLUMN "RentPayment"."dueDate" IS 'When the payment was/is due';

-- Add index for efficient late fee queries
CREATE INDEX IF NOT EXISTS "idx_rent_payment_overdue" ON "RentPayment" ("leaseId", "status", "dueDate", "lateFeeApplied");
COMMENT ON INDEX "idx_rent_payment_overdue" IS 'Optimizes late fee processing queries';

-- Update RLS policies if needed (current policies should cover new columns)
-- No RLS changes needed - existing row-level security policies cover new columns
