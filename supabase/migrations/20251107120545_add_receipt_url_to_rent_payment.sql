-- Add receiptUrl column to rent_payment table
-- Stores the Stripe receipt URL so tenants can access payment confirmations

ALTER TABLE public.rent_payment
	ADD COLUMN IF NOT EXISTS "receiptUrl" text;

COMMENT ON COLUMN public.rent_payment."receiptUrl"
	IS 'Stripe receipt URL for tenant access';
