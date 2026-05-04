# n8n Webhook URL Configuration

Five DB functions deliver event payloads to per-event n8n webhooks via
`net.http_post()`. Each reads its URL + bearer secret at fire time from rows
in `public.app_config` (a service-role-only key/value table).

- `notify_n8n_maintenance` — fires on maintenance_requests INSERT / status-change
- `notify_n8n_payment_reminder` — fires on payment_reminders INSERT
- `notify_n8n_lease_reminder` — fires on lease_reminders INSERT
- `notify_n8n_rent_payment` — fires on rent_payments INSERT
- `notify_critical_error` — fires on user_errors INSERT when the row is an
  authorization error or a >10-in-5-minutes spike (audit F-7; also keeps the
  `pg_notify('critical_error', …)` path for LISTEN-based debugging)

When a key's value is the empty string, the function returns without making
the HTTP call (fail-open). This means triggers fire and queue tables fill,
but no email/SMS is delivered. The 2026-05-03 audit (findings F-6 and F-7)
flagged this gap.

This runbook is the procedure to wire n8n webhook delivery in. Run it once
per environment (prod, staging if added later).

> **Why a config table instead of `ALTER DATABASE` / GUCs?**
> An earlier draft of this runbook used Postgres GUCs (`current_setting('app.settings.*')`)
> which require a superuser to set via `ALTER DATABASE postgres SET ...`.
> Supabase Studio's `postgres` role isn't a superuser on modern projects (only
> the internal `supabase_admin` role is), so `ALTER DATABASE SET` fails with
> `42501: permission denied`. The `public.app_config` table is service-role-only
> RLS — fully writable from Supabase MCP / Studio and from the SQL Editor.

## Required keys

| Key | Purpose | Trigger source |
|---|---|---|
| `n8n.webhook.maintenance_url` | New / status-changed maintenance request | `trg_maintenance_notify_n8n` |
| `n8n.webhook.payment_reminder_url` | Upcoming rent payment reminder (7/3/1d) | `trg_payment_reminders_notify_n8n` |
| `n8n.webhook.lease_reminder_url` | Lease expiry reminder (30/7/1d) | `trg_lease_reminders_notify_n8n` |
| `n8n.webhook.rent_payment_url` | New rent payment recorded | `trg_rent_payments_notify_n8n` |
| `n8n.webhook.critical_error_url` | Authorization error or error spike on user_errors (F-7) | `notify_critical_error` AFTER INSERT trigger |
| `n8n.webhook.secret` | Bearer token shared with n8n endpoints (used for the `Authorization: Bearer <token>` header) | All five |

The schema migration that creates `public.app_config` seeds the six rows as
empty strings. This runbook is the procedure to fill them in.

## Setting the values

Run from the Supabase SQL Editor (or any service-role connection):

```sql
INSERT INTO public.app_config (key, value) VALUES
    ('n8n.webhook.maintenance_url',      'https://<your-n8n-host>/webhook/<path>'),
    ('n8n.webhook.payment_reminder_url', 'https://<your-n8n-host>/webhook/<path>'),
    ('n8n.webhook.lease_reminder_url',   'https://<your-n8n-host>/webhook/<path>'),
    ('n8n.webhook.rent_payment_url',     'https://<your-n8n-host>/webhook/<path>'),
    ('n8n.webhook.critical_error_url',   'https://<your-n8n-host>/webhook/<path>'),
    ('n8n.webhook.secret',               '<generate-with-openssl-rand-base64-32>')
ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = now();
```

If your n8n routing is a single workflow that branches on `body.table` (the
recommended setup — see the `tenantflow-events` workflow in n8n), all five
URLs point to the same webhook URL.

`ON CONFLICT DO UPDATE` is idempotent — re-running this statement updates the
existing rows. The table's `BEFORE UPDATE` trigger refreshes `updated_at` on
each change.

## Verifying

```sql
SELECT key,
       CASE WHEN key = 'n8n.webhook.secret'
            THEN '<' || length(value) || ' chars set>'
            ELSE value
       END AS value_or_length,
       updated_at
FROM public.app_config
WHERE key LIKE 'n8n.webhook.%'
ORDER BY key;
```

Expected: 6 rows with the URLs visible, the secret row showing
`<NN chars set>` (never the actual token).

## End-to-end smoke test

After the values are set, fire one HTTP request via `pg_net` matching what a
trigger would send:

```sql
DO $$
DECLARE
  v_url    text;
  v_secret text;
  v_req_id bigint;
BEGIN
  SELECT value INTO v_url    FROM public.app_config WHERE key = 'n8n.webhook.maintenance_url';
  SELECT value INTO v_secret FROM public.app_config WHERE key = 'n8n.webhook.secret';

  SELECT net.http_post(
    url     := v_url,
    body    := jsonb_build_object(
      'type',   'INSERT',
      'table',  'maintenance_requests',
      'record', jsonb_build_object('id', 'smoke-' || extract(epoch from now())::int)
    ),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_secret, '')
    ),
    timeout_milliseconds := 5000
  ) INTO v_req_id;

  RAISE NOTICE 'pg_net request id: %', v_req_id;
END $$;

-- After ~5 seconds, check the response
SELECT id, status_code, error_msg, LEFT(content::text, 200) AS body_preview, created
FROM net._http_response
ORDER BY id DESC
LIMIT 5;
```

A row with `status_code = 200` confirms n8n received the webhook. n8n's
**Executions** list for the receiving workflow should also show the run.

## Cloudflare WAF

If your n8n is behind Cloudflare with Bot Fight Mode / Super Bot Fight Mode
enabled, the WAF will block non-browser User-Agents (HTTP 403, `error code: 1010`).
`pg_net.http_post` sends a non-browser UA. Add a Custom WAF rule that
**Skips** all managed rules (including Super Bot Fight Mode) for the n8n
webhook paths:

```
(http.host eq "<your-n8n-host>" and (
   starts_with(http.request.uri.path, "/webhook/")
   or starts_with(http.request.uri.path, "/webhook-test/")
))
```

Action: **Skip** → check **All managed rules** + **All Super Bot Fight Mode Rules**
+ **All remaining custom rules** + **All rate limiting rules**.

## Rotating the secret

```sql
UPDATE public.app_config
SET value = '<new-secret>'
WHERE key = 'n8n.webhook.secret';
```

Update the corresponding bearer credential in n8n at the same time — both
sides must rotate together.

## Disabling delivery without dropping triggers

To fail-open a single integration, set its URL to the empty string:

```sql
UPDATE public.app_config
SET value = ''
WHERE key = 'n8n.webhook.maintenance_url';
```

The function checks `IF v_webhook_url IS NULL OR v_webhook_url = '' THEN RETURN NEW;`
and skips the HTTP call, leaving the trigger in place for later re-enablement.
