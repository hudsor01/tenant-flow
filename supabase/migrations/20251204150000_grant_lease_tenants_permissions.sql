-- Grant permissions on lease_tenants and payment_intents tables
-- Required for tenant list queries with lease info and payment summaries

-- lease_tenants: Required for tenant list with lease info
GRANT SELECT ON public.lease_tenants TO authenticated;
GRANT ALL ON public.lease_tenants TO service_role;

-- payment_intents: Required for payment summary queries
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'stripe'
      AND tablename = 'payment_intents'
  ) THEN
    GRANT SELECT ON stripe.payment_intents TO authenticated;
    GRANT ALL ON stripe.payment_intents TO service_role;
  ELSE
    RAISE NOTICE 'stripe.payment_intents not found; skipping grants';
  END IF;
END $$;
