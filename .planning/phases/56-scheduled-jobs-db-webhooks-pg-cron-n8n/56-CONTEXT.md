# Phase 56: Scheduled Jobs & DB Webhooks — pg_cron + n8n - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement all scheduled background jobs as pg_cron entries in Postgres and configure Supabase DB Webhooks to POST to n8n on k3s for notification and automation workflows. This replaces any cron or event-driven logic that lived in NestJS. Deliverables:

- SQL migrations: pg_cron jobs for late fees, lease reminders, lease expiry
- SQL migrations: Supabase DB Webhooks for `rent_payments` (INSERT) and `maintenance_requests` (INSERT + status UPDATE)
- New tables: `lease_reminders` (dedup queue), `late_fees` (if not already exists)
- n8n workflows on k3s: payment receipt + owner notification, maintenance assignment/status-update notifications

NestJS cron and event-driven modules will be replaced entirely. End-to-end: all scheduled automation and notification triggers run through pg_cron + Supabase DB Webhooks + n8n only.

</domain>

<decisions>
## Implementation Decisions

### Late Fee Rules
- **Grace period**: 3 days after payment due date before any fee is assessed
- **Fee amount**: $50 flat fee per day overdue (a new fee record is inserted each day the payment remains overdue past grace)
- **Accumulation**: Daily — each day past grace period creates a new fee record; fees accumulate
- **Status transition**: **Claude's discretion** — decide when to flip `rent_payments.status` to `late` and whether to update it further as fees accumulate (e.g. `late` → `severely_delinquent`)
- **Writer**: pg_cron calls a Postgres function (SQL) that INSERTs fee records and updates payment status directly in the DB — n8n is NOT in the write path for fee creation. More reliable; no round-trip dependency on k3s availability.

### Lease Reminders
- **Trigger thresholds**: 30 days, 7 days, and 1 day before `lease.end_date`
- **Dedup**: Use a `lease_reminders` table to track which (lease_id, reminder_type) combinations have been sent. The cron job checks this table before inserting/firing to prevent duplicates on re-run. Schema: `(id, lease_id, reminder_type text, sent_at timestamptz)` with a UNIQUE constraint on `(lease_id, reminder_type)`.
- **Queue pattern**: pg_cron inserts a `lease_reminders` row → DB Webhook fires on that INSERT → POSTs to n8n → n8n sends the email

### Lease Expiry
- Nightly pg_cron job sets `leases.status = 'expired'` where `end_date < now()` and `status = 'active'`
- Direct SQL UPDATE — no n8n involvement

### n8n Connectivity
- **Deployment**: k3s self-hosted on known URL
- **Auth on webhook endpoints**: **Claude's discretion** — pick HMAC signature verification or a shared secret header token (whichever is simpler to configure in Supabase DB Webhook headers and verify in n8n)
- **URL storage**: **Claude's discretion** — store n8n webhook URLs as Supabase secrets (same pattern as other Edge Function secrets); reference via env vars in DB Webhook config
- **Dev vs prod URL separation**: **Claude's discretion** — use separate Supabase secrets per environment (e.g. `N8N_WEBHOOK_URL` in dev vs prod project)

### DB Webhook Payloads
- **Payload content**: Full new row (Supabase default `record` field) — n8n receives the complete `rent_payments` or `maintenance_requests` row without needing a callback to fetch details
- **Old row on UPDATE**: New row only — no `old_record` included (keep payload small; n8n branches on current `status` field)
- **Retry behavior**: Rely on Supabase DB Webhook built-in retry with exponential backoff — no custom dead-letter queue needed
- **Maintenance triggers**: INSERT (new request) + status UPDATE — n8n routes by event type:
  - INSERT → notify owner (new request submitted)
  - UPDATE → notify tenant (status changed: open → in_progress → completed)

### Notification Routing (n8n)
- **Payment webhook**: INSERT on `rent_payments` → n8n sends owner notification + generates receipt
- **Maintenance webhook**: INSERT → notify owner; UPDATE → notify tenant (both via n8n workflow branching on `type` field in payload)

### pg_cron Management
- **Creation method**: SQL migration files (version-controlled in `supabase/migrations/`) — jobs are reproducible, tracked in git, and deployed via `pnpm db:push`
- All pg_cron `cron.schedule()` calls live in a single migration

### Claude's Discretion
- Late fee status transition timing (`late` threshold and escalation)
- n8n webhook auth method (HMAC vs shared secret header token)
- n8n URL storage location (Supabase secrets naming convention)
- Dev vs prod n8n URL separation strategy
- `late_fees` table schema (if not already in migrations)

</decisions>

<specifics>
## Specific Ideas

- **pg_cron extension**: Must be enabled via `create extension if not exists pg_cron` — check if already enabled in existing migrations before adding.
- **Late fee SQL function**: A `SECURITY DEFINER` Postgres function called by pg_cron that loops over overdue payments. Use `FOR UPDATE SKIP LOCKED` to avoid row contention if the job ever overlaps itself.
- **Lease reminders UNIQUE constraint**: `UNIQUE (lease_id, reminder_type)` on `lease_reminders` is the idempotency guard. The cron job uses `INSERT ... ON CONFLICT DO NOTHING` — simple and reliable.
- **DB Webhook headers**: Supabase DB Webhooks support custom headers — use a `Authorization: Bearer <shared-secret>` header that n8n verifies in the first node of each triggered workflow.
- **n8n workflow structure reference**: Each webhook workflow should start with a Webhook Trigger node, verify the auth header, then branch on `body.type` (INSERT vs UPDATE) for maintenance requests.
- **Lease expiry job**: Simple `UPDATE leases SET status = 'expired' WHERE end_date < now() AND status = 'active'` — no function needed, inline SQL in `cron.schedule()` call is fine.
- The Stripe webhook implementation (`supabase/functions/stripe-webhooks/index.ts`) is a reference for how the project verifies inbound webhook payloads — n8n auth verification should follow a similar shared-secret pattern.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 56-scheduled-jobs-db-webhooks-pg-cron-n8n*
*Context gathered: 2026-02-22*
