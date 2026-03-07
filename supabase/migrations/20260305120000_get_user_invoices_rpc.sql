-- Migration: get_user_invoices RPC
-- Purpose: Query stripe.invoices for the calling user's invoices (PAY-20 gap closure)
-- The stripe schema is not exposed via PostgREST, so we need a public RPC
-- to bridge between the frontend and stripe.invoices data.

CREATE OR REPLACE FUNCTION public.get_user_invoices(p_limit integer DEFAULT 50)
RETURNS TABLE (
  invoice_id text,
  amount_due numeric,
  amount_paid numeric,
  status text,
  created_at timestamptz,
  invoice_pdf text,
  hosted_invoice_url text,
  customer_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_stripe_customer_id text;
BEGIN
  -- Guard: caller must be authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the user's stripe_customer_id
  SELECT u.stripe_customer_id INTO v_stripe_customer_id
  FROM public.users u
  WHERE u.id = v_user_id;

  IF v_stripe_customer_id IS NULL THEN
    RETURN; -- No Stripe customer, return empty set
  END IF;

  -- Query stripe.invoices for this customer
  -- Amounts in stripe.invoices are in cents (bigint) — convert to dollars
  -- Dates are Unix timestamps (integer) — convert to timestamptz
  RETURN QUERY
  SELECT
    i.id AS invoice_id,
    (i.amount_due / 100.0)::numeric AS amount_due,
    (i.amount_paid / 100.0)::numeric AS amount_paid,
    i.status::text AS status,
    to_timestamp(i.created)::timestamptz AS created_at,
    i.invoice_pdf,
    i.hosted_invoice_url,
    i.customer_email
  FROM stripe.invoices i
  WHERE i.customer = v_stripe_customer_id
  ORDER BY i.created DESC
  LIMIT GREATEST(1, LEAST(p_limit, 100));
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_invoices(integer) TO authenticated;

COMMENT ON FUNCTION public.get_user_invoices IS 'Returns Stripe invoices for the calling user. Amounts converted from cents to dollars. PAY-20 gap closure.';
