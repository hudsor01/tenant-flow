-- Config-driven notification suppression (no hardcoded addresses in code).
--
-- Problem: every CI run's RLS/E2E tests insert maintenance rows for the
-- synthetic owners (e2e-owner-a/b@tenantflow.app), and each insert fires the
-- notify trigger -> n8n -> Resend, spamming the owner inbox 4+ emails per run.
--
-- Fix: a `notifications.suppressed_emails` app_config row (comma-separated
-- list) consulted by the notify functions AFTER resolving the recipient.
-- Suppression is DATA: add/remove recipients with an UPDATE, no migration.
-- Missing or empty key = nothing suppressed (fail-open). The row insert
-- itself is untouched -- only the outbound webhook/email is skipped.

insert into public.app_config (key, value)
values (
	'notifications.suppressed_emails',
	'e2e-owner-a@tenantflow.app,e2e-owner-b@tenantflow.app'
)
on conflict (key) do update set value = excluded.value;

-- Shared helper: is this recipient suppressed? SECURITY DEFINER + locked
-- search_path per house rules; STABLE (reads config only).
create or replace function public.is_notification_suppressed(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select coalesce(
		p_email = any (
			string_to_array(
				(select value from public.app_config
				 where key = 'notifications.suppressed_emails'),
				','
			)
		),
		false
	);
$$;

revoke execute on function public.is_notification_suppressed(text) from public, anon, authenticated;

-- notify_n8n_maintenance: unchanged except the suppression check after the
-- recipient is resolved.
create or replace function public.notify_n8n_maintenance()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
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

  -- config-driven suppression (synthetic CI accounts etc.)
  IF public.is_notification_suppressed(v_owner_email) THEN
    RETURN NEW;
  END IF;

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

-- notify_n8n_lease_reminder: same suppression check.
create or replace function public.notify_n8n_lease_reminder()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
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

  -- config-driven suppression (synthetic CI accounts etc.)
  IF public.is_notification_suppressed(v_owner_email) THEN
    RETURN NEW;
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
