-- Add idempotency constraints for webhook and payment processing
-- Prevents duplicate records on webhook retries

-- Payment transactions: unique per (rent_payment_id, stripe_payment_intent_id, status)
-- Allows multiple statuses for same payment (pending -> succeeded, or pending -> failed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_transactions_unique_payment_status'
  ) THEN
    ALTER TABLE public.payment_transactions
    ADD CONSTRAINT payment_transactions_unique_payment_status
    UNIQUE (rent_payment_id, stripe_payment_intent_id, status);
  END IF;
END $$;

-- Webhook attempts: unique per (webhook_event_id, status)
-- Each event can only have one record per status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'webhook_attempts_unique_event_status'
  ) THEN
    ALTER TABLE public.webhook_attempts
    ADD CONSTRAINT webhook_attempts_unique_event_status
    UNIQUE (webhook_event_id, status);
  END IF;
END $$;

COMMENT ON CONSTRAINT payment_transactions_unique_payment_status ON public.payment_transactions IS
  'Idempotency constraint: prevents duplicate transaction records for same payment+status combination on webhook retries';

COMMENT ON CONSTRAINT webhook_attempts_unique_event_status ON public.webhook_attempts IS
  'Idempotency constraint: prevents duplicate attempt records for same event+status combination on retries';

-- Enhanced webhook event lock that returns both lock status AND event ID
-- Used to properly link webhook_attempts to webhook_events
CREATE OR REPLACE FUNCTION public.acquire_webhook_event_lock_with_id(
  p_webhook_source TEXT,
  p_external_id TEXT,
  p_event_type TEXT,
  p_raw_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  lock_acquired BOOLEAN,
  webhook_event_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_acquired BOOLEAN;
  v_event_id UUID;
BEGIN
  -- Try to insert, get the ID whether inserted or existing
  INSERT INTO webhook_events (webhook_source, external_id, event_type, raw_payload, processed_at)
  VALUES (p_webhook_source, p_external_id, p_event_type, p_raw_payload, NOW())
  ON CONFLICT (webhook_source, external_id) DO UPDATE
  SET id = webhook_events.id  -- No-op to get RETURNING to work
  RETURNING id INTO v_event_id;

  -- Check if this was an insert (xmax = 0) or update
  v_lock_acquired := (SELECT xmax = 0 FROM webhook_events WHERE id = v_event_id);

  RETURN QUERY SELECT v_lock_acquired, v_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.acquire_webhook_event_lock_with_id(TEXT, TEXT, TEXT, JSONB) TO service_role;

COMMENT ON FUNCTION public.acquire_webhook_event_lock_with_id IS
  'Atomically acquires webhook processing lock and returns the webhook_event UUID. Returns lock_acquired=TRUE for new events, FALSE for duplicates. Always returns the event ID for linking webhook_attempts.';
