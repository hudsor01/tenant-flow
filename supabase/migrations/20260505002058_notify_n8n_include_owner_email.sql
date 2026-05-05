-- Augment all 5 notify trigger functions to include the owner's email
-- (and full_name) in the webhook body. This lets n8n's Resend node use
-- {{ $json.body.owner_email }} directly without needing a separate
-- Supabase API call to look up the recipient.
--
-- For maintenance/payment-reminders/lease-reminders/rent-payments the
-- owner_user_id lives on the row (or on the joined lease for reminders /
-- payments queue tables). For user_errors we route to admin emails — the
-- function emits an array of admin emails so n8n can use $json.body.admin_emails.

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
  v_owner_email    text;
  v_owner_name     text;
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

  SELECT email, full_name INTO v_owner_email, v_owner_name
  FROM public.users WHERE id = NEW.owner_user_id;

  PERFORM net.http_post(
    url     := v_webhook_url,
    body    := jsonb_build_object(
      'type',         v_event_type,
      'table',        'maintenance_requests',
      'owner_email',  v_owner_email,
      'owner_name',   v_owner_name,
      'record',       row_to_json(NEW)::jsonb
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
  v_owner_id       uuid;
  v_owner_email    text;
  v_owner_name     text;
BEGIN
  SELECT value INTO v_webhook_url    FROM public.app_config WHERE key = 'n8n.webhook.payment_reminder_url';
  SELECT value INTO v_webhook_secret FROM public.app_config WHERE key = 'n8n.webhook.secret';

  IF v_webhook_url IS NULL OR v_webhook_url = ''
     OR v_webhook_secret IS NULL OR v_webhook_secret = '' THEN
    RETURN NEW;
  END IF;

  -- payment_reminders -> rent_payments -> leases -> owner_user_id
  SELECT l.owner_user_id INTO v_owner_id
  FROM public.rent_payments rp
  JOIN public.leases l ON l.id = rp.lease_id
  WHERE rp.id = NEW.rent_payment_id;

  IF v_owner_id IS NOT NULL THEN
    SELECT email, full_name INTO v_owner_email, v_owner_name
    FROM public.users WHERE id = v_owner_id;
  END IF;

  PERFORM net.http_post(
    url     := v_webhook_url,
    body    := jsonb_build_object(
      'type',          'INSERT',
      'table',         'payment_reminders',
      'owner_email',   v_owner_email,
      'owner_name',    v_owner_name,
      'owner_user_id', v_owner_id,
      'record',        row_to_json(NEW)::jsonb
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
  v_owner_id       uuid;
  v_owner_email    text;
  v_owner_name     text;
BEGIN
  SELECT value INTO v_webhook_url    FROM public.app_config WHERE key = 'n8n.webhook.lease_reminder_url';
  SELECT value INTO v_webhook_secret FROM public.app_config WHERE key = 'n8n.webhook.secret';

  IF v_webhook_url IS NULL OR v_webhook_url = ''
     OR v_webhook_secret IS NULL OR v_webhook_secret = '' THEN
    RETURN NEW;
  END IF;

  SELECT owner_user_id INTO v_owner_id FROM public.leases WHERE id = NEW.lease_id;

  IF v_owner_id IS NOT NULL THEN
    SELECT email, full_name INTO v_owner_email, v_owner_name
    FROM public.users WHERE id = v_owner_id;
  END IF;

  PERFORM net.http_post(
    url     := v_webhook_url,
    body    := jsonb_build_object(
      'type',          'INSERT',
      'table',         'lease_reminders',
      'owner_email',   v_owner_email,
      'owner_name',    v_owner_name,
      'owner_user_id', v_owner_id,
      'record',        row_to_json(NEW)::jsonb
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
  v_owner_id       uuid;
  v_owner_email    text;
  v_owner_name     text;
BEGIN
  SELECT value INTO v_webhook_url    FROM public.app_config WHERE key = 'n8n.webhook.rent_payment_url';
  SELECT value INTO v_webhook_secret FROM public.app_config WHERE key = 'n8n.webhook.secret';

  IF v_webhook_url IS NULL OR v_webhook_url = ''
     OR v_webhook_secret IS NULL OR v_webhook_secret = '' THEN
    RETURN NEW;
  END IF;

  SELECT owner_user_id INTO v_owner_id FROM public.leases WHERE id = NEW.lease_id;

  IF v_owner_id IS NOT NULL THEN
    SELECT email, full_name INTO v_owner_email, v_owner_name
    FROM public.users WHERE id = v_owner_id;
  END IF;

  PERFORM net.http_post(
    url     := v_webhook_url,
    body    := jsonb_build_object(
      'type',          'INSERT',
      'table',         'rent_payments',
      'owner_email',   v_owner_email,
      'owner_name',    v_owner_name,
      'owner_user_id', v_owner_id,
      'record',        row_to_json(NEW)::jsonb
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
  v_admin_emails   text[];
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
      -- Critical errors fan out to every active admin.
      SELECT array_agg(email) INTO v_admin_emails
      FROM public.users
      WHERE is_admin = true
        AND status <> 'inactive'
        AND email IS NOT NULL;

      PERFORM net.http_post(
        url     := v_webhook_url,
        body    := jsonb_build_object(
          'type',         'critical_error',
          'table',        'user_errors',
          'admin_emails', COALESCE(v_admin_emails, ARRAY[]::text[]),
          'record',       v_payload
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
