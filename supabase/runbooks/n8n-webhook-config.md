# n8n Webhook URL Configuration

The four DB functions `notify_n8n_maintenance`, `notify_n8n_payment_reminder`,
`notify_n8n_lease_reminder`, and `notify_n8n_rent_payment` use `net.http_post()`
to deliver event payloads to per-event n8n webhooks. Each reads its URL from a
Postgres GUC (`current_setting('app.settings.<NAME>', true)`) at fire time.

When a GUC is unset, the function returns without making the HTTP call (fail-open).
This means triggers fire and queue tables fill, but no email/SMS is delivered.
The 2026-05-03 audit (finding F-6) flagged this gap: no migration or runtime
config sets these GUCs in prod.

This runbook is the procedure to wire n8n webhook delivery in. Run it once per
environment (prod, staging if added later).

## Required GUCs

| GUC | Purpose | Trigger source |
|---|---|---|
| `app.settings.N8N_WEBHOOK_MAINTENANCE_URL` | New / status-changed maintenance request | `trg_maintenance_notify_n8n` |
| `app.settings.N8N_WEBHOOK_PAYMENT_REMINDER_URL` | Upcoming rent payment reminder (7/3/1d) | `trg_payment_reminders_notify_n8n` |
| `app.settings.N8N_WEBHOOK_LEASE_REMINDER_URL` | Lease expiry reminder (30/7/1d) | `trg_lease_reminders_notify_n8n` |
| `app.settings.N8N_WEBHOOK_RENT_PAYMENT_URL` | New rent payment recorded | `trg_rent_payments_notify_n8n` |
| `app.settings.N8N_WEBHOOK_SECRET` | Bearer token shared with n8n endpoints (used for the `Authorization: Bearer <token>` header) | All four |

## Set the values

Run as a privileged user (Supabase SQL editor or `psql` with service role / db
owner). `ALTER DATABASE` writes the value into `pg_db_role_setting` and is
session-cached, so existing connections keep using the old value until they
reconnect.

```sql
ALTER DATABASE postgres SET "app.settings.N8N_WEBHOOK_MAINTENANCE_URL"      = 'https://n8n.example.com/webhook/maintenance';
ALTER DATABASE postgres SET "app.settings.N8N_WEBHOOK_PAYMENT_REMINDER_URL" = 'https://n8n.example.com/webhook/payment-reminder';
ALTER DATABASE postgres SET "app.settings.N8N_WEBHOOK_LEASE_REMINDER_URL"   = 'https://n8n.example.com/webhook/lease-reminder';
ALTER DATABASE postgres SET "app.settings.N8N_WEBHOOK_RENT_PAYMENT_URL"     = 'https://n8n.example.com/webhook/rent-payment';
ALTER DATABASE postgres SET "app.settings.N8N_WEBHOOK_SECRET"               = '<generate-a-32-byte-random-token>';
```

Do **not** put real URLs or secrets into a migration — environment-specific
values do not belong in source control. If you need them per-environment for
staging, set them once in each environment's database.

## Verify

```sql
-- Show the values currently set on the database (for the current session,
-- this returns what was loaded at connection start):
SELECT name, setting
FROM pg_settings
WHERE name LIKE 'app.settings.n8n%'
ORDER BY name;

-- Or read the persisted value (independent of session cache):
SELECT setdatabase::regnamespace, unnest(setconfig) AS guc
FROM pg_db_role_setting
WHERE setdatabase = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND setrole = 0
  AND EXISTS (SELECT 1 FROM unnest(setconfig) c WHERE c LIKE 'app.settings.n8n%');
```

After setting, force the postgres user (and any connection-pooled roles) to
reload — the simplest way is to recycle the pgbouncer pool, or:

```sql
-- Disconnects every other session on this database (use sparingly):
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid();
```

## End-to-end smoke test

After the GUCs are set and existing connections recycled, trigger one event of
each type and confirm the egress hit:

```sql
-- 1. Insert a test maintenance request as a real owner. Replace the IDs.
INSERT INTO public.maintenance_requests (
  property_id, owner_user_id, title, description, priority, status
)
VALUES (
  '<owner-property-id>', '<owner-user-id>', 'n8n smoke test', 'webhook test', 'low', 'submitted'
);

-- 2. Inspect the recent http egress queue:
SELECT id, method, url, status_code, error_msg, created
FROM net._http_response
ORDER BY created DESC
LIMIT 5;

-- 3. Roll back the test row.
DELETE FROM public.maintenance_requests
WHERE title = 'n8n smoke test';
```

A successful row in `net._http_response` confirms the webhook was POSTed.

## Rotating the secret

Update the GUC value with a new `ALTER DATABASE`, then recycle pooled
connections (see the `pg_terminate_backend` snippet above). The next firing of
each `notify_n8n_*` function will use the new bearer token.

If n8n is rejecting webhooks after rotation, check that the n8n endpoint is
also configured with the new shared secret — both sides must rotate together.

## Cleanup / disabling

To disable a single integration without dropping the trigger, set the URL to
the empty string:

```sql
ALTER DATABASE postgres SET "app.settings.N8N_WEBHOOK_MAINTENANCE_URL" = '';
```

The `notify_n8n_maintenance` body checks `coalesce(NULLIF(url, ''), NULL) IS NULL`
(or the equivalent — confirm in `pg_proc`) and returns early. To fully revert,
`RESET` the GUC:

```sql
ALTER DATABASE postgres RESET "app.settings.N8N_WEBHOOK_MAINTENANCE_URL";
```
