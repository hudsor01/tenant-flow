-- Ensures webhook processing uses a single RPC-backed lock to avoid race windows
-- while keeping the lock acquisition logic in the database layer.

CREATE OR REPLACE FUNCTION public.record_processed_stripe_event_lock(
  p_stripe_event_id TEXT,
  p_event_type TEXT,
  p_processed_at TIMESTAMPTZ,
  p_status TEXT DEFAULT 'processing'
)
RETURNS TABLE (lock_acquired BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO processed_stripe_events (stripe_event_id, event_type, processed_at, status)
  VALUES (p_stripe_event_id, p_event_type, p_processed_at, p_status)
  ON CONFLICT (stripe_event_id) DO NOTHING;

  lock_acquired := FOUND;
  RETURN NEXT;
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_processed_stripe_event_lock(TEXT, TEXT, TIMESTAMPTZ, TEXT) TO authenticated;

COMMENT ON FUNCTION public.record_processed_stripe_event_lock IS
  'Acquires the Stripe webhook lock via INSERT ... ON CONFLICT DO NOTHING and returns whether the current request inserted the row.'
