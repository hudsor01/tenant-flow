-- Make lease.endDate nullable for month-to-month leases
-- Replace 100-year workaround with proper NULL handling

-- Make endDate nullable
ALTER TABLE public.lease
ALTER COLUMN "endDate" DROP NOT NULL;

-- Add comment explaining the design
COMMENT ON COLUMN public.lease."endDate" IS 'End date of the lease. NULL indicates month-to-month lease with no fixed end date.';

-- Update any existing far-future dates (>50 years from now) to NULL
-- This catches the 100-year workaround dates
UPDATE public.lease
SET "endDate" = NULL
WHERE "endDate" > NOW() + INTERVAL '50 years';
