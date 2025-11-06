-- Grant service_role full access to rent_payment table
-- Service role needs explicit GRANT permissions in addition to RLS policies

GRANT ALL ON TABLE public.rent_payment TO service_role;

-- Authenticated users can only SELECT (INSERT/UPDATE/DELETE restricted by RLS)
GRANT SELECT ON TABLE public.rent_payment TO authenticated;

-- Anonymous users can only SELECT
GRANT SELECT ON TABLE public.rent_payment TO anon;
