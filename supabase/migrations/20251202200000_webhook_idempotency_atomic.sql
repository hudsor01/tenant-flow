-- Atomic idempotency check for webhook_events table
-- Implements SELECT-before-INSERT pattern via RPC to prevent race conditions
-- Consolidates webhook idempotency to single table (webhook_events)

-- Add unique constraint if not exists (for idempotency on external_id + webhook_source)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'webhook_events_source_external_id_unique'
  ) THEN
    ALTER TABLE public.webhook_events
    ADD CONSTRAINT webhook_events_source_external_id_unique
    UNIQUE (webhook_source, external_id);
  END IF;
END $$;

-- Atomic webhook event lock acquisition
-- Returns true if lock acquired (new event), false if already processed
CREATE OR REPLACE FUNCTION public.acquire_webhook_event_lock(
  p_webhook_source TEXT,
  p_external_id TEXT,
  p_event_type TEXT,
  p_raw_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_acquired BOOLEAN;
BEGIN
  -- Atomic INSERT with ON CONFLICT - returns whether row was inserted
  INSERT INTO webhook_events (webhook_source, external_id, event_type, raw_payload, processed_at)
  VALUES (p_webhook_source, p_external_id, p_event_type, p_raw_payload, NOW())
  ON CONFLICT (webhook_source, external_id) DO NOTHING;

  -- FOUND is true if INSERT succeeded (new row), false if conflict (duplicate)
  v_lock_acquired := FOUND;

  RETURN v_lock_acquired;
END;
$$;

-- Grant execute to authenticated users (webhooks use admin client, but safe to grant)
GRANT EXECUTE ON FUNCTION public.acquire_webhook_event_lock(TEXT, TEXT, TEXT, JSONB) TO service_role;

COMMENT ON FUNCTION public.acquire_webhook_event_lock IS
  'Atomically acquires webhook processing lock. Returns TRUE if this is a new event (lock acquired), FALSE if already processed (duplicate). Uses INSERT ON CONFLICT for race-condition-free idempotency.';

-- Atomic rent payment upsert to handle webhook retries
-- Uses stripe_payment_intent_id as idempotency key
CREATE OR REPLACE FUNCTION public.upsert_rent_payment(
  p_lease_id UUID,
  p_tenant_id UUID,
  p_amount INTEGER,
  p_currency TEXT,
  p_status TEXT,
  p_due_date DATE,
  p_paid_date TIMESTAMPTZ,
  p_period_start DATE,
  p_period_end DATE,
  p_payment_method_type TEXT,
  p_stripe_payment_intent_id TEXT,
  p_application_fee_amount INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  was_inserted BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_was_inserted BOOLEAN;
BEGIN
  -- Try to insert, on conflict return existing ID
  INSERT INTO rent_payments (
    lease_id, tenant_id, amount, currency, status,
    due_date, paid_date, period_start, period_end,
    payment_method_type, stripe_payment_intent_id, application_fee_amount
  )
  VALUES (
    p_lease_id, p_tenant_id, p_amount, p_currency, p_status,
    p_due_date, p_paid_date, p_period_start, p_period_end,
    p_payment_method_type, p_stripe_payment_intent_id, p_application_fee_amount
  )
  ON CONFLICT (stripe_payment_intent_id) DO UPDATE
  SET id = rent_payments.id  -- No-op update to get RETURNING to work
  RETURNING rent_payments.id INTO v_id;

  v_was_inserted := FOUND AND (xmax = 0);  -- xmax=0 means INSERT, not UPDATE

  RETURN QUERY SELECT v_id, v_was_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_rent_payment(UUID, UUID, INTEGER, TEXT, TEXT, DATE, TIMESTAMPTZ, DATE, DATE, TEXT, TEXT, INTEGER) TO service_role;

COMMENT ON FUNCTION public.upsert_rent_payment IS
  'Idempotent rent payment creation. Uses stripe_payment_intent_id as unique key. Returns payment ID and whether it was a new insert or existing record.';
