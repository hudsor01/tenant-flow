-- Rewrite the 4 notify_n8n_* functions and notify_critical_error to read
-- their webhook URL + bearer secret from public.app_config (service-role
-- only, populated by the prior migration) instead of `current_setting`.
-- All functions remain SECURITY DEFINER with locked search_path.
--
-- Why: Supabase Studio's `postgres` role cannot ALTER DATABASE SET, so the
-- earlier GUC-based approach (20260504045301) was unwirable in prod without
-- supabase_admin. Reading from a regular table with service-role-only RLS
-- is fully manageable from the same MCP/Studio path that other migrations
-- use, and survives env rotations.

CREATE OR REPLACE FUNCTION public.notify_n8n_maintenance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_webhook_url    text;
  v_webhook_secret text;
  v_event_type     text;
BEGIN
  SELECT value INTO v_webhook_url    FROM public.app_config WHERE key = 'n8n.webhook.maintenance_url';
  SELECT value INTO v_webhook_secret FROM public.app_config WHERE key = 'n8n.webhook.secret';

  IF v_webhook_url IS NULL OR v_webhook_url = '' THEN
    RETURN NEW;
  END IF;

  -- For UPDATE: only fire if the status column changed. tg_op = 'UPDATE'
  -- gates access to OLD (only valid on update). Avoids spurious calls.
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_event_type := TG_OP;

  PERFORM net.http_post(
    url     := v_webhook_url,
    body    := jsonb_build_object(
      'type',   v_event_type,
      'table',  'maintenance_requests',
      'record', row_to_json(NEW)::jsonb
    ),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_webhook_secret, '')
    ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.notify_n8n_payment_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_webhook_url    text;
  v_webhook_secret text;
BEGIN
  SELECT value INTO v_webhook_url    FROM public.app_config WHERE key = 'n8n.webhook.payment_reminder_url';
  SELECT value INTO v_webhook_secret FROM public.app_config WHERE key = 'n8n.webhook.secret';

  IF v_webhook_url IS NULL OR v_webhook_url = '' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := v_webhook_url,
    body    := jsonb_build_object(
      'type',   'INSERT',
      'table',  'payment_reminders',
      'record', row_to_json(NEW)::jsonb
    ),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_webhook_secret, '')
    ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.notify_n8n_lease_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_webhook_url    text;
  v_webhook_secret text;
BEGIN
  SELECT value INTO v_webhook_url    FROM public.app_config WHERE key = 'n8n.webhook.lease_reminder_url';
  SELECT value INTO v_webhook_secret FROM public.app_config WHERE key = 'n8n.webhook.secret';

  IF v_webhook_url IS NULL OR v_webhook_url = '' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := v_webhook_url,
    body    := jsonb_build_object(
      'type',   'INSERT',
      'table',  'lease_reminders',
      'record', row_to_json(NEW)::jsonb
    ),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_webhook_secret, '')
    ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.notify_n8n_rent_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_webhook_url    text;
  v_webhook_secret text;
BEGIN
  SELECT value INTO v_webhook_url    FROM public.app_config WHERE key = 'n8n.webhook.rent_payment_url';
  SELECT value INTO v_webhook_secret FROM public.app_config WHERE key = 'n8n.webhook.secret';

  IF v_webhook_url IS NULL OR v_webhook_url = '' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := v_webhook_url,
    body    := jsonb_build_object(
      'type',   'INSERT',
      'table',  'rent_payments',
      'record', row_to_json(NEW)::jsonb
    ),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_webhook_secret, '')
    ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$function$;


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
  -- Spike detection unchanged: same error_message > 10 times in 5 minutes.
  SELECT COUNT(*) INTO recent_count
  FROM public.user_errors
  WHERE error_message = NEW.error_message
    AND created_at >= NOW() - INTERVAL '5 minutes';

  IF NEW.error_type = 'authorization' OR recent_count > 10 THEN
    v_payload := jsonb_build_object(
      'error_id',      NEW.id,
      'user_id',       NEW.user_id,
      'error_type',    NEW.error_type,
      'error_message', NEW.error_message,
      'error_count',   recent_count,
      'created_at',    NEW.created_at
    );

    -- pg_notify path preserved for LISTEN-based debugging.
    PERFORM pg_notify('critical_error', v_payload::text);

    SELECT value INTO v_webhook_url    FROM public.app_config WHERE key = 'n8n.webhook.critical_error_url';
    SELECT value INTO v_webhook_secret FROM public.app_config WHERE key = 'n8n.webhook.secret';

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
