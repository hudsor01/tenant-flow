# Phase 56-03: User Setup Required

**Generated:** 2026-02-22
**Phase:** 56-scheduled-jobs-db-webhooks-pg-cron-n8n
**Status:** Incomplete

Complete these items for n8n DB Webhook delivery to function. The trigger functions are deployed and will gracefully skip if these settings are not configured — the app runs normally without them.

## Database-Level Configuration

**IMPORTANT:** These are PostgreSQL database-level config params read by trigger functions via `current_setting()`. They are NOT Edge Function env vars. Do NOT use Supabase Dashboard → Project Settings → Edge Functions → Secrets for these values.

Run these SQL statements in **Supabase Dashboard → SQL Editor** (one per webhook URL):

| Status | Setting Name | How to Set |
|--------|-------------|------------|
| [ ] | `app.settings.N8N_WEBHOOK_SECRET` | Generate with: `openssl rand -hex 16`. Then run: `ALTER DATABASE postgres SET "app.settings.N8N_WEBHOOK_SECRET" = 'your-secret-here';` |
| [ ] | `app.settings.N8N_WEBHOOK_RENT_PAYMENT_URL` | Get from n8n → Rent Payment Workflow → Webhook Trigger → Production URL. Then run: `ALTER DATABASE postgres SET "app.settings.N8N_WEBHOOK_RENT_PAYMENT_URL" = 'https://...';` |
| [ ] | `app.settings.N8N_WEBHOOK_MAINTENANCE_URL` | Get from n8n → Maintenance Notifications Workflow → Webhook Trigger → Production URL. Then run: `ALTER DATABASE postgres SET "app.settings.N8N_WEBHOOK_MAINTENANCE_URL" = 'https://...';` |
| [ ] | `app.settings.N8N_WEBHOOK_LEASE_REMINDER_URL` | Get from n8n → Lease Reminder Workflow → Webhook Trigger → Production URL. Then run: `ALTER DATABASE postgres SET "app.settings.N8N_WEBHOOK_LEASE_REMINDER_URL" = 'https://...';` |

## n8n Dashboard Configuration

- [ ] **Configure n8n Rent Payment Webhook Trigger node**
  - Location: n8n Dashboard → Workflows → Rent Payment Workflow → Webhook Trigger node
  - Set HTTP Method: POST
  - Under Header Auth: validate `Authorization: Bearer <N8N_WEBHOOK_SECRET>` matches the secret you generated above
  - Activate workflow in Production mode and copy the Production URL

- [ ] **Configure n8n Maintenance Notifications Webhook Trigger node**
  - Location: n8n Dashboard → Workflows → Maintenance Notifications Workflow → Webhook Trigger node
  - Set HTTP Method: POST
  - The `type` field in the payload will be either `INSERT` (new request) or `UPDATE` (status change) — add an IF node to branch on this
  - Under Header Auth: validate `Authorization: Bearer <N8N_WEBHOOK_SECRET>`
  - Activate workflow and copy Production URL

- [ ] **Configure n8n Lease Reminder Webhook Trigger node**
  - Location: n8n Dashboard → Workflows → Lease Reminder Workflow → Webhook Trigger node
  - Set HTTP Method: POST
  - The `record.reminder_type` field will be `30_days`, `7_days`, or `1_day`
  - Under Header Auth: validate `Authorization: Bearer <N8N_WEBHOOK_SECRET>`
  - Activate workflow and copy Production URL

## Verification

After completing setup, verify the database settings were applied:

```sql
-- Run in Supabase SQL Editor
SELECT current_setting('app.settings.N8N_WEBHOOK_SECRET', true) AS secret_set,
       current_setting('app.settings.N8N_WEBHOOK_RENT_PAYMENT_URL', true) AS rent_url_set,
       current_setting('app.settings.N8N_WEBHOOK_MAINTENANCE_URL', true) AS maintenance_url_set,
       current_setting('app.settings.N8N_WEBHOOK_LEASE_REMINDER_URL', true) AS lease_url_set;
```

Expected: All four columns return non-null, non-empty values.

To test a webhook fires correctly, insert a test rent payment in Supabase SQL Editor and check n8n execution history:

```sql
-- Only run in a non-production environment with test data
-- Check pg_net queue after insert to confirm request was queued
SELECT * FROM net._http_response ORDER BY created DESC LIMIT 5;
```

---

**Once all items complete:** Mark status as "Complete" at top of file.
