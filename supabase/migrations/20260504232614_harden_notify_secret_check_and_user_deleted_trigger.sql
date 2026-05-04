-- Code-review followups for the audit-quickwins PR.
--
-- I-5 (defense-in-depth): every notify_n8n_* and notify_critical_error
-- function should bail out when the shared bearer secret is missing or empty.
-- The current code falls back to `Bearer ` (empty token) which n8n's IF gate
-- would reject anyway, but it still emits a useless network request. Mirror
-- the URL-empty short-circuit on the secret too.
--
-- M-1 (signature brittleness): user.deleted trigger fires on the
-- '[deleted user]' / '[deleted-' rename signature. Add a status='inactive'
-- predicate (anonymize_deleted_user always sets that too) so a user typing
-- their actual name as '[deleted user]' in profile settings cannot trigger
-- a false-positive security_event.

-- =============================================================================
-- I-5: Short-circuit on empty bearer secret in all 5 notify functions
-- =============================================================================

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

  IF v_webhook_url IS NULL OR v_webhook_url = ''
     OR v_webhook_secret IS NULL OR v_webhook_secret = '' THEN
    RETURN NEW;
  END IF;

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
      'Authorization', 'Bearer ' || v_webhook_secret
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

  IF v_webhook_url IS NULL OR v_webhook_url = ''
     OR v_webhook_secret IS NULL OR v_webhook_secret = '' THEN
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
      'Authorization', 'Bearer ' || v_webhook_secret
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

  IF v_webhook_url IS NULL OR v_webhook_url = ''
     OR v_webhook_secret IS NULL OR v_webhook_secret = '' THEN
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
      'Authorization', 'Bearer ' || v_webhook_secret
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

  IF v_webhook_url IS NULL OR v_webhook_url = ''
     OR v_webhook_secret IS NULL OR v_webhook_secret = '' THEN
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
      'Authorization', 'Bearer ' || v_webhook_secret
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

    PERFORM pg_notify('critical_error', v_payload::text);

    SELECT value INTO v_webhook_url    FROM public.app_config WHERE key = 'n8n.webhook.critical_error_url';
    SELECT value INTO v_webhook_secret FROM public.app_config WHERE key = 'n8n.webhook.secret';

    IF v_webhook_url IS NOT NULL AND v_webhook_url <> ''
       AND v_webhook_secret IS NOT NULL AND v_webhook_secret <> '' THEN
      PERFORM net.http_post(
        url     := v_webhook_url,
        body    := jsonb_build_object(
          'type',   'critical_error',
          'table',  'user_errors',
          'record', v_payload
        ),
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || v_webhook_secret
        ),
        timeout_milliseconds := 5000
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;


-- =============================================================================
-- M-1: strengthen user.deleted trigger gate
-- =============================================================================
-- The trigger now requires the row to actually be flipping to status='inactive'
-- AND the rename signature, so a profile-edit setting full_name to the literal
-- string '[deleted user]' cannot fire a false-positive event.

CREATE OR REPLACE FUNCTION public.log_security_event_user_anonymized()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- All four conditions must hold, AND-style:
  --   (a) status flipped to inactive (set by anonymize_deleted_user)
  --   (b) full_name rewritten to the anonymization sentinel
  --   (c) email rewritten to the anonymization prefix
  --   (d) row was not already anonymized (avoid duplicate events on
  --       repeated UPDATEs of the same anonymized row)
  IF NEW.status = 'inactive'
     AND OLD.status IS DISTINCT FROM 'inactive'
     AND NEW.full_name = '[deleted user]'
     AND NEW.email LIKE '[deleted-%'
     AND COALESCE(OLD.full_name, '') <> '[deleted user]' THEN
    INSERT INTO public.security_events (
      event_type, severity, user_id, message, resource_type, resource_id, metadata
    )
    VALUES (
      'user.deleted',
      'critical',
      NEW.id,
      'User account anonymized (GDPR)',
      'user',
      NEW.id,
      jsonb_build_object(
        'deletion_requested_at', OLD.deletion_requested_at,
        'anonymized_at',         NOW()
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the trigger with WHEN clauses on the status column too so the
-- function only fires on UPDATEs that touched status / full_name / email.
DROP TRIGGER IF EXISTS trg_security_user_anonymized ON public.users;
CREATE TRIGGER trg_security_user_anonymized
AFTER UPDATE OF status, full_name, email ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.log_security_event_user_anonymized();
