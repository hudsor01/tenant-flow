# Phase 53 — Renewal Reminder Delivery: Go-Live Runbook

**Audience:** owner (rhudson42@yahoo.com / hudsor01). These are the exact,
ordered steps to turn renewal-reminder email delivery ON in prod. Every step
here is PAT-blocked or irreversible-by-design, which is why it is owner-run and
not executed by the phase executor.

**Why this runbook exists:** the go-live flag flip was split out of the single
Migration C into **Migration C2** (`supabase/migrations/20260722014000_lease_reminders_delivery_flip.sql`),
which is committed to the repo but deliberately **UNAPPLIED**. Flipping
`reminders_delivery_enabled='true'` before the `send-lease-reminders` edge
function is deployed and wired would falsely claim delivery is live (the 06:30
drain cron would POST to an empty fn URL and no email would send). Do the steps
below in order; do NOT apply C2 until steps 1-4 are green.

---

## Prod state at authoring (2026-07-21)

- **Migration A** (`20260722005310_lease_reminders_delivery_state.sql`) — APPLIED.
  Added `delivery_status`/`delivered_at`/`resend_message_id`/`attempt_count` +
  the pending partial index; extended `notifications_notification_type_check`
  with `lease_renewal_reminder`; seeded `app_config` keys
  (`reminders_delivery_enabled='false'`, `reminders.drain_url=''`,
  `reminders.drain_secret=''`, `sentry.cron.send_lease_reminders_url=''`);
  added `claim_lease_reminders(int)` (service_role-only).
- **Migration B** (`20260722012107_send_lease_reminders_drain_cron.sql`) — APPLIED.
  `invoke_send_lease_reminders()` + `cron.schedule('send-lease-reminders-drain','30 6 * * *')`.
  Inert: empty `drain_url` => early return, and the flag is still off.
- **Migration C1** (`20260722013850_lease_reminders_goflip.sql`) — authored,
  **prod-apply DEFERRED TO ORCHESTRATOR** (mechanical: expire backlog + drop n8n hop).
- **Migration C2** (`20260722014000_lease_reminders_delivery_flip.sql`) — authored,
  **UNAPPLIED (this runbook is its gate)**.
- **Backlog:** 0 pending `lease_reminders` rows (VALIDATION.md pre-planning MCP;
  C1's `RAISE NOTICE` logs the exact count at apply time).
- **n8n hop:** `trg_lease_reminders_notify_n8n` trigger + `notify_n8n_lease_reminder()`
  fn still present (the SOLE non-internal trigger on `lease_reminders`); C1 drops them.

---

## Step 0 — Apply Migration C1 (if the orchestrator has not already)

C1 is the mechanical pre-flip: it logs + expires the backlog without sending and
drops the dead n8n hop. It never flips the flag, so it is safe to apply at any
time after Migration B.

```
# MCP apply_migration on 20260722013850_lease_reminders_goflip.sql, then reconcile
# the repo filename to the prod-assigned version (migration-mcp-prod-drift).
```

Verify after apply (MCP `execute_sql`):

```sql
-- n8n fn dropped
select to_regprocedure('public.notify_n8n_lease_reminder()') is null as fn_dropped;   -- expect: true
-- no non-internal trigger remains on lease_reminders
select count(*) from pg_trigger
 where tgrelid = 'public.lease_reminders'::regclass and not tgisinternal;              -- expect: 0
-- backlog cleared without sending (0 pending, 0 produced 'sent')
select delivery_status, count(*) from public.lease_reminders group by 1;              -- expect: only 'expired' (+ nothing 'sent')
-- flag still OFF (C1 did NOT flip it)
select value from public.app_config where key = 'reminders_delivery_enabled';        -- expect: 'false'
```

---

## Step 1 — Deploy the `send-lease-reminders` edge function

The full suppression stack must be live BEFORE the flag flip (Pitfall 1: dropping
the trigger's `is_notification_suppressed` guard without a live re-port spams CI
synthetic owners and bypasses per-owner opt-outs).

```bash
bun scripts/deploy-edge-functions.ts send-lease-reminders
```

> The fn source contains non-ASCII (em-dashes). Deploy ONLY via this disk-reading
> script — do NOT deploy via MCP `deploy_edge_function` (edge-deploy-mcp-fidelity:
> MCP model-emission corrupts non-ASCII). If the PAT is stale (CLI/PAT-401), this
> is the owner-run pause — same command.

Verify via MCP `get_edge_function send-lease-reminders` (never trust deploy stdout):
- deployed version bumped;
- the deployed `index.ts` contains the ordered `shouldEmail()` gate:
  tier -> `is_notification_suppressed` -> `email_suppressions` ->
  `notification_settings.email && .leases`.

---

## Step 2 — Set the invoke secret (function secret == app_config, byte-for-byte)

Generate a strong random secret and set it in BOTH places. They MUST be equal —
the fn constant-time-compares the incoming `Authorization: Bearer <secret>`.

```bash
# Function secret (Dashboard -> Edge Functions -> Secrets, or CLI):
supabase secrets set REMINDERS_INVOKE_SECRET='<secret>'
```

```sql
-- Mirror the SAME value into app_config (MCP execute_sql):
update public.app_config set value = '<secret>' where key = 'reminders.drain_secret';
```

---

## Step 3 — Set the drain URL

```sql
-- MCP execute_sql. Empty => invoke_send_lease_reminders() early-returns (inert).
update public.app_config
set value = 'https://bshjmbshupiibfiewpxb.supabase.co/functions/v1/send-lease-reminders'
where key = 'reminders.drain_url';
```

Optional: if a Sentry cron monitor is registered for the drain, set
`sentry.cron.send_lease_reminders_url`; otherwise leave it empty (the check-in is
skipped silently).

### Pre-flip smoke (flag still OFF => no sends)

```bash
# Correct Bearer -> 200 { ok:true, skipped:'disabled' }
curl -sS -X POST 'https://bshjmbshupiibfiewpxb.supabase.co/functions/v1/send-lease-reminders' \
  -H "Authorization: Bearer <secret>"
# Wrong Bearer -> 401
curl -sS -X POST 'https://bshjmbshupiibfiewpxb.supabase.co/functions/v1/send-lease-reminders' \
  -H "Authorization: Bearer wrong"
```

---

## Step 4 — Pre-flip verification gate (the original checkpoint)

Confirm ALL FOUR before applying C2 (this is the human-verify gate from the plan):

1. **Fn live with the full suppression stack** — Step 1 verify passed; the
   re-ported CI guard is live BEFORE the trigger's guard is dropped.
2. **Invoke wiring** — `app_config.reminders.drain_secret` == the
   `REMINDERS_INVOKE_SECRET` function secret; `reminders.drain_url` set; cron
   `send-lease-reminders-drain` scheduled (`select jobname, schedule from cron.job
   where jobname='send-lease-reminders-drain';` => `30 6 * * *`).
3. **Backlog reviewed** — C1 applied; `select count(*) from public.lease_reminders
   where delivery_status='pending';` => 0 (all prior rows `expired`, none emailed).
4. **Flag still OFF** — `select value from public.app_config where
   key='reminders_delivery_enabled';` => `'false'`.

---

## Step 5 — Apply Migration C2 (the irreversible go-live flip)

Only after Step 4 is fully green:

```
# MCP apply_migration on 20260722014000_lease_reminders_delivery_flip.sql,
# then reconcile the repo filename to the prod-assigned version.
```

C2 runs exactly one statement:

```sql
update public.app_config set value = 'true' where key = 'reminders_delivery_enabled';
```

---

## Step 6 — Post-go-live verification

```sql
-- Delivery is ON
select value from public.app_config where key = 'reminders_delivery_enabled';   -- expect: 'true'
```

Manual drain + end-to-end check:

```sql
-- Fire the drain once (or wait for the 06:30 cron):
select public.invoke_send_lease_reminders();
```

Then confirm a real reminder queued AFTER go-live:
- a `lease_reminders` row flips `delivery_status` `pending` -> `sent` with
  `delivered_at` + `resend_message_id` stamped (entitled Growth/Max owner, all
  suppression layers clear);
- a `lease_renewal_reminder` in-app notification row exists for the owner
  (`create_notification`, all tiers);
- the owner receives the email (test with a synthetic entitled owner, or a real
  Growth/Max owner with a lease inside the 30/7/1 window);
- CI synthetic owners (`e2e-owner-a/b@tenantflow.app`) receive NO email
  (`is_notification_suppressed` layer).

### Known residual (accepted)

At-least-once email delivery on stale-claim reclaim: if the isolate is torn
down in the sub-second window between Resend accepting a send and the terminal
`delivery_status` stamp, the row remains `claimed`, the >1h stale-claim reaper
reclaims it, and the next drain re-sends. The Resend `Idempotency-Key = row.id`
collapses the duplicate inside Resend's 24h idempotency window, so the owner
still receives at most one email. This is accepted (documented, not two-phase
committed) — no operator action required.

### Rollback

Delivery is reversible — disable at any time:

```sql
update public.app_config set value = 'false' where key = 'reminders_delivery_enabled';
```

The fn returns to early-return no-op; the drain cron stays inert.

---

## Regen types after C1/C2 apply

```bash
bun run db:types    # owner-run if PAT stale; MCP generate_typescript_types fallback
bun run typecheck
```

C1 changes no columns (delivery-state cols landed in Migration A), but regen keeps
`src/types/supabase.ts` in sync with the dropped `notify_n8n_lease_reminder` and
any prod drift.
