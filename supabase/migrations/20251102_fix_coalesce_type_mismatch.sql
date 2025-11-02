-- Fix COALESCE type mismatch in get_user_active_subscription function
-- Error: "COALESCE types jsonb and text cannot be matched"
-- Root cause: Mixing jsonb extraction (->>) with json extraction (->)

CREATE OR REPLACE FUNCTION public.get_user_active_subscription(p_user_id UUID)
RETURNS TABLE (
  subscription_id TEXT,
  status TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN,
  canceled_at TIMESTAMP WITH TIME ZONE,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  plan_id TEXT,
  plan_name TEXT,
  plan_amount BIGINT,
  plan_currency TEXT,
  plan_interval TEXT,
  customer_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('search_path', 'public,pg_temp', true);

  -- Return active subscription if stripe schema exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'stripe' AND table_name = 'subscriptions'
  ) THEN
    RETURN QUERY EXECUTE format('
      SELECT
        s.id AS subscription_id,
        s.status,
        to_timestamp(s.current_period_start) AS current_period_start,
        to_timestamp(s.current_period_end) AS current_period_end,
        COALESCE((s.attrs->>''cancel_at_period_end'')::boolean, false) AS cancel_at_period_end,
        to_timestamp(s.canceled_at) AS canceled_at,
        to_timestamp(s.trial_start) AS trial_start,
        to_timestamp(s.trial_end) AS trial_end,
        -- Extract price ID from attrs->items array (FIX: cast both to text)
        COALESCE(
          (s.attrs->''items''->0->''price''->>''id''),
          (s.attrs->''items''->0->>''price'')
        )::text AS plan_id,
        -- Get plan name from product
        COALESCE(prod.name, ''Unknown Plan'') AS plan_name,
        -- Get plan amount from price
        COALESCE(p.unit_amount, 0) AS plan_amount,
        COALESCE(p.currency, ''usd'') AS plan_currency,
        COALESCE(p.recurring->>''interval'', ''month'') AS plan_interval,
        s.customer AS customer_id
      FROM stripe.subscriptions s
      JOIN stripe.customers c ON s.customer = c.id
      -- Join price using extracted ID from attrs (FIX: use ->> for text extraction)
      LEFT JOIN stripe.prices p ON p.id = COALESCE(
        (s.attrs->''items''->0->''price''->>''id''),
        (s.attrs->''items''->0->>''price'')
      )::text
      -- Join product from price
      LEFT JOIN stripe.products prod ON p.product = prod.id
      WHERE c.user_id = $1
        AND s.status IN (''active'', ''trialing'', ''past_due'')
      ORDER BY s.current_period_end DESC
      LIMIT 1
    ') USING p_user_id;
  END IF;

  RETURN;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_active_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_active_subscription(UUID) TO service_role;

COMMENT ON FUNCTION public.get_user_active_subscription(UUID) IS
'Returns the active subscription for a user from Stripe sync tables. Fixed COALESCE type mismatch by using ->> operator for text extraction instead of mixing -> and ->>.';
