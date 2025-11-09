-- Drop old snake_case receiptUrl column
-- We're using camelCase receiptUrl instead

ALTER TABLE public.rent_payment
	DROP COLUMN IF EXISTS receiptUrl;
