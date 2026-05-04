-- F-7: notify_critical_error now delivers via HTTP (n8n) in addition to
-- pg_notify. The pg_notify path had no consumer in prod (audit finding F-7);
-- this migration mirrors the notify_n8n_* pattern so critical errors actually
-- reach an external alerting channel.
--
-- Behavior:
--   - When app.settings.N8N_WEBHOOK_CRITICAL_ERROR_URL is unset (the empty
--     string or NULL), the function silently skips the HTTP call. This
--     matches the notify_n8n_* fail-open contract — triggers still fire,
--     but no external delivery happens until the operator wires the GUC.
--   - The existing pg_notify path is preserved for LISTEN-based local
--     debugging. Removing it would be a behavior change.
--   - Eligibility for delivery (authorization error OR >10 same errors in
--     5 minutes) is unchanged.
--
-- The function previously had no SECURITY DEFINER and no search_path lock.
-- Both are now applied per the project's RPC-hardening convention.

CREATE OR REPLACE FUNCTION public.notify_critical_error()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  recent_count     integer;
  v_webhook_url    text;
  v_webhook_secret text;
  v_payload        jsonb;
BEGIN
  -- Spike detection: same error_message > 10 times in 5 minutes (system-wide).
  SELECT COUNT(*) INTO recent_count
  FROM public.user_errors
  WHERE error_message = NEW.error_message
    AND created_at >= NOW() - INTERVAL '5 minutes';

  -- Eligibility: authorization error OR error spike.
  IF NEW.error_type = 'authorization' OR recent_count > 10 THEN
    v_payload := jsonb_build_object(
      'error_id',      NEW.id,
      'user_id',       NEW.user_id,
      'error_type',    NEW.error_type,
      'error_message', NEW.error_message,
      'error_count',   recent_count,
      'created_at',    NEW.created_at
    );

    -- Path 1: pg_notify for LISTEN-based debugging (preserved).
    PERFORM pg_notify('critical_error', v_payload::text);

    -- Path 2: HTTP delivery to n8n (new — F-7).
    v_webhook_url    := current_setting('app.settings.N8N_WEBHOOK_CRITICAL_ERROR_URL', true);
    v_webhook_secret := current_setting('app.settings.N8N_WEBHOOK_SECRET', true);

    IF v_webhook_url IS NOT NULL AND v_webhook_url <> '' THEN
      PERFORM net.http_post(
        url     := v_webhook_url,
        body    := jsonb_build_object(
          'type',   'critical_error',
          'table',  'user_errors',
          'record', v_payload
        ),
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || COALESCE(v_webhook_secret, '')
        ),
        timeout_milliseconds := 5000
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.notify_critical_error() IS
  'AFTER INSERT trigger on public.user_errors. On eligibility (authorization error OR same-message spike >10 in 5 minutes) emits pg_notify("critical_error", ...) AND POSTs to the configured n8n webhook (app.settings.N8N_WEBHOOK_CRITICAL_ERROR_URL). Webhook URL defaults to empty/null and the HTTP path is fail-open — set it via the runbook in supabase/runbooks/n8n-webhook-config.md.';
