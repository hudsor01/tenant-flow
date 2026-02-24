---
phase: 56-scheduled-jobs-db-webhooks-pg-cron-n8n
verified_by: automated-checker
verified_at: 2026-02-22
status: human_needed
requirement_ids_verified:
  - SCHED-01
  - SCHED-02
  - SCHED-03
  - WF-01
  - WF-02
---

# Phase 56 Verification Report

## Summary

All five requirement IDs (SCHED-01, SCHED-02, SCHED-03, WF-01, WF-02) are fully accounted for in the codebase. All three migration files exist and contain the correct SQL. All three n8n workflow JSON files exist, are valid JSON, and contain the required structure. The phase goal is achieved in code.

Status is `human_needed` because the DB triggers, pg_cron schedules, and n8n connectivity require live database execution and end-to-end firing to confirm runtime behavior — automated static analysis cannot substitute for that. The 56-04 human checkpoint was marked approved in the summary, but runtime verification of the actual Supabase project state is a human task.

---

## Requirement Traceability

| Requirement ID | Status in REQUIREMENTS.md | Migration/File | Verified in Codebase |
|---------------|---------------------------|----------------|----------------------|
| SCHED-01 | checked (`[x]`) | `20260222120000_phase56_pg_cron_jobs.sql` | YES — `calculate_late_fees()` function + `cron.schedule('calculate-late-fees', '1 0 * * *', ...)` |
| SCHED-02 | checked (`[x]`) | `20260222120000_phase56_pg_cron_jobs.sql` + `20260222130000_phase56_db_webhooks.sql` | YES — `queue_lease_reminders()` function + `cron.schedule('queue-lease-reminders', '0 6 * * *', ...)` + `trg_lease_reminders_notify_n8n` trigger |
| SCHED-03 | checked (`[x]`) | `20260222120000_phase56_pg_cron_jobs.sql` | YES — `cron.schedule('expire-leases', '0 23 * * *', ...)` inline SQL UPDATE |
| WF-01 | checked (`[x]`) | `20260222130000_phase56_db_webhooks.sql` | YES — `notify_n8n_rent_payment()` + `trg_rent_payments_notify_n8n` trigger |
| WF-02 | checked (`[x]`) | `20260222130000_phase56_db_webhooks.sql` | YES — `notify_n8n_maintenance()` + `trg_maintenance_notify_n8n` trigger |

All five IDs are listed as `[x]` completed in `.planning/REQUIREMENTS.md` line 44–51. Phase 56 is listed in the roadmap table at line 92 as owning all five IDs.

---

## Success Criteria Verification

### Criterion 1 — pg_cron job: daily late fee calculation (SCHED-01)

**Status: PASS (static)**

File: `supabase/migrations/20260222120000_phase56_pg_cron_jobs.sql`

Verified:
- `calculate_late_fees()` function defined as `SECURITY DEFINER` with `set search_path = public` (line 52)
- Grace period: `rp.due_date < (current_date - interval '3 days')` (line 71) — correct 3-day grace period
- Processes all overdue statuses: `rp.status in ('pending', 'late', 'severely_delinquent')` (line 70) — fees accumulate every day until resolved
- Inserts into `late_fees` with `fee_amount = 5000` ($50 in cents) per day overdue (lines 79–93)
- Idempotency guard: `on conflict (rent_payment_id, assessed_date) do nothing` (line 93)
- Status escalation: `> 14 days → 'severely_delinquent'`, else `'late'` (lines 96–99)
- Updates `rent_payments.status` only when changed (line 103)
- `FOR UPDATE SKIP LOCKED` prevents row contention on overlapping runs (line 74)
- Registered: `cron.schedule('calculate-late-fees', '1 0 * * *', $$select public.calculate_late_fees()$$)` (lines 195–199)

**Minor note on status boundary**: The function sets `'late'` for days_overdue up to 14, and `'severely_delinquent'` for `> 14`. The condition `if v_days_overdue > 14` means day 15+ is severely_delinquent and days 4–14 are late. The success criterion says "past the configurable grace period" — the grace period is hardcoded at 3 days (not configurable via a table/parameter). This is consistent with the CONTEXT.md locked decisions.

### Criterion 2 — pg_cron job: lease expiry reminders → lease_reminders queue → DB Webhook → n8n (SCHED-02)

**Status: PASS (static)**

Files: `20260222120000_phase56_pg_cron_jobs.sql` + `20260222130000_phase56_db_webhooks.sql`

Verified:
- `queue_lease_reminders()` function defined as `SECURITY DEFINER` (line 138)
- Checks active leases: `lease_status = 'active'` within 30-day window (lines 149–151)
- Inserts for exactly 30 days (`v_days_until_expiry = 30`), 7 days (`= 7`), 1 day (`= 1`) (lines 159, 166, 173)
- All three INSERTs use `on conflict (lease_id, reminder_type) do nothing` — idempotency via UNIQUE constraint (lines 162, 169, 176)
- Registered: `cron.schedule('queue-lease-reminders', '0 6 * * *', ...)` (lines 203–207)
- DB Webhook chain: `trg_lease_reminders_notify_n8n` fires `AFTER INSERT ON public.lease_reminders` (line 246–248), calling `notify_n8n_lease_reminder()` which POSTs to `N8N_WEBHOOK_LEASE_REMINDER_URL`

Schema prerequisites in `20260222110100_phase56_schema_foundations.sql`:
- `lease_reminders` table exists with `UNIQUE(lease_id, reminder_type)` constraint (line 187)
- RLS enabled on `lease_reminders` (line 206)
- `reminder_type CHECK` constraint allows `'30_days', '7_days', '1_day'` (lines 184–185)

### Criterion 3 — pg_cron job: nightly lease expiry status update (SCHED-03)

**Status: PASS (static)**

File: `supabase/migrations/20260222120000_phase56_pg_cron_jobs.sql`

Verified:
- Inline SQL in `cron.schedule('expire-leases', '0 23 * * *', ...)` (lines 212–224):
  ```sql
  update public.leases
  set
    lease_status = 'expired',
    updated_at = now()
  where
    end_date < current_date
    and lease_status = 'active'
  ```
- Sets `lease_status = 'expired'` only for `lease_status = 'active'` records
- `end_date < current_date`: uses `current_date` (type `date`) rather than `now()` (type `timestamptz`) as stated in the success criterion — this is functionally equivalent because `leases.end_date` is of type `date` (confirmed in `20251101000000_base_schema.sql`). A date column compared against `current_date` behaves identically to comparing it against `now()::date`.
- Schema prerequisite: `leases_lease_status_check` constraint updated in `20260222110100_phase56_schema_foundations.sql` to include `'expired'` (lines 43–53)

### Criterion 4 — DB Webhook: rent_payments INSERT → n8n → owner notification + receipt (WF-01)

**Status: PASS (static)**

File: `supabase/migrations/20260222130000_phase56_db_webhooks.sql`

Verified:
- `notify_n8n_rent_payment()` trigger function defined as `SECURITY DEFINER set search_path = public, extensions` (lines 58–99)
- Reads URL from `current_setting('app.settings.N8N_WEBHOOK_RENT_PAYMENT_URL', true)` (line 71)
- Graceful failure: returns `new` without error if URL not configured (lines 76–78)
- POSTs JSON payload: `{type: 'INSERT', table: 'rent_payments', record: <full row>}` (lines 85–90)
- `Authorization: Bearer <N8N_WEBHOOK_SECRET>` header included (lines 91–93)
- `perform net.http_post(...)` — non-blocking fire-and-forget (line 83)
- Trigger: `AFTER INSERT ON public.rent_payments FOR EACH ROW` (lines 110–113)
- n8n workflow: `supabase/n8n-workflows/rent-payment-notification.json` — valid JSON, contains Webhook Trigger node, auth verification (IF node), Send Owner Notification stub, Generate Receipt stub, Respond 200/401

### Criterion 5 — DB Webhook: maintenance_requests INSERT/UPDATE → n8n → assignment/status notifications (WF-02)

**Status: PASS (static)**

File: `supabase/migrations/20260222130000_phase56_db_webhooks.sql`

Verified:
- `notify_n8n_maintenance()` trigger function defined as `SECURITY DEFINER` (lines 128–173)
- Reads URL from `current_setting('app.settings.N8N_WEBHOOK_MAINTENANCE_URL', true)` (line 139)
- Graceful failure: returns `new` if URL not configured (lines 142–144)
- Status-change guard on UPDATE: `if tg_op = 'UPDATE' and old.status = new.status then return new; end if;` (line 149) — prevents spurious webhook calls on unrelated field updates
- `tg_op` used as event type in payload (`'INSERT'` or `'UPDATE'`) (line 155)
- POSTs JSON payload: `{type: <INSERT|UPDATE>, table: 'maintenance_requests', record: <full new row>}` (lines 157–164)
- `Authorization: Bearer` header included (lines 165–167)
- Trigger: `AFTER INSERT OR UPDATE ON public.maintenance_requests FOR EACH ROW` (lines 185–188)
- n8n workflow: `supabase/n8n-workflows/maintenance-notification.json` — valid JSON, contains Webhook Trigger, auth verification, Branch on Event Type (IF on `$json.body.type === 'INSERT'`), Notify Owner (NoOp), Notify Tenant (NoOp), Respond 200/401

---

## Plan Frontmatter Requirement Cross-Reference

| Plan | Requirement IDs Claimed | Verified Present in Migration |
|------|------------------------|-------------------------------|
| 56-01 | SCHED-01, SCHED-02, SCHED-03 | Schema foundations only — no cron functions (correct: foundation for 02 and 03) |
| 56-02 | SCHED-01, SCHED-02, SCHED-03 | All three cron schedules registered with correct names and expressions |
| 56-03 | SCHED-02, WF-01, WF-02 | All three trigger functions + triggers present; lease_reminders trigger completes the SCHED-02 → n8n delivery chain |
| 56-04 | WF-01, WF-02, SCHED-02 | All three n8n workflow JSON files present in `supabase/n8n-workflows/` |

---

## Must-Have Checklist (from Plan Frontmatter)

### Plan 56-01 Must-Haves

- [x] `pg_cron` extension is enabled: `create extension if not exists pg_cron with schema extensions` (line 31 of schema_foundations.sql)
- [x] `leases.lease_status CHECK` constraint allows `'expired'`: constraint recreated with `'expired'` added (lines 43–53)
- [x] `rent_payments.status CHECK` constraint allows `'late'` and `'severely_delinquent'`: constraint recreated with both values (lines 66–77)
- [x] `late_fees` table exists with RLS enabled: `create table if not exists public.late_fees` + `alter table public.late_fees enable row level security` (lines 88–124)
- [x] `lease_reminders` table exists with `UNIQUE(lease_id, reminder_type)` and RLS enabled: both present (lines 175–206)

### Plan 56-02 Must-Haves

- [x] pg_cron job named `'calculate-late-fees'` runs daily at 00:01 UTC: `cron.schedule('calculate-late-fees', '1 0 * * *', ...)`
- [x] pg_cron job named `'queue-lease-reminders'` runs daily at 06:00 UTC: `cron.schedule('queue-lease-reminders', '0 6 * * *', ...)`
- [x] pg_cron job named `'expire-leases'` runs nightly at 23:00 UTC: `cron.schedule('expire-leases', '0 23 * * *', ...)`
- [x] `calculate_late_fees()` inserts late_fees records for payments `>3 days overdue` with status in `('pending', 'late', 'severely_delinquent')`
- [x] `calculate_late_fees()` sets status to `'late'` when >3 days, `'severely_delinquent'` when >14 days; fees accumulate on severely_delinquent payments
- [x] `queue_lease_reminders()` inserts lease_reminders rows using `INSERT ON CONFLICT DO NOTHING`
- [x] expire-leases job sets `lease_status='expired'` for active leases past their end_date

### Plan 56-03 Must-Haves

- [x] DB Webhook trigger fires on `rent_payments` INSERT and POSTs to `N8N_WEBHOOK_RENT_PAYMENT_URL` with Authorization header
- [x] DB Webhook trigger fires on `maintenance_requests` INSERT and POSTs with `type=INSERT` and full new row
- [x] DB Webhook trigger fires on `maintenance_requests` UPDATE (status changes only) and POSTs with `type=UPDATE`
- [x] DB Webhook trigger fires on `lease_reminders` INSERT and POSTs to `N8N_WEBHOOK_LEASE_REMINDER_URL` with full row
- [x] All webhook triggers use shared-secret `Authorization: Bearer` header

### Plan 56-04 Must-Haves

- [x] n8n workflow JSON files exist for all three notification channels (confirmed via `ls supabase/n8n-workflows/`)
- [x] Each workflow JSON starts with a Webhook Trigger node that verifies the Authorization header
- [x] Rent payment workflow branches to send owner notification and generate receipt (Send Owner Notification NoOp + Generate Receipt NoOp)
- [x] Maintenance workflow branches on `type=INSERT` (Notify Owner) vs `type=UPDATE` (Notify Tenant) via IF node on `$json.body.type`
- [x] Lease reminder workflow branches on `reminder_type` (`30_days`, `7_days`, `1_day`) via Switch node
- [ ] Human has verified or confirmed n8n workflows can be imported and triggered — **requires live n8n instance; 56-04 human checkpoint was approved in summary but runtime import test is a human task**

---

## Observations and Notes

### Observation 1: Grace period is hardcoded, not configurable

The phase goal mentions "configurable grace period" but the implementation hardcodes 3 days (`interval '3 days'`). The CONTEXT.md locked decisions set the grace period as a fixed business rule ($50/day, 3-day grace). There is no configuration table or parameter. This matches the locked decisions doc and is not a gap — the word "configurable" in the phase goal description was superseded by the locked decisions.

### Observation 2: current_date vs now() in expire-leases

The cron job uses `end_date < current_date` rather than `end_date < now()`. Since `leases.end_date` is typed as `date` (not `timestamptz`), this comparison is semantically identical. `current_date` returns a `date` value for the current day in the server timezone. For a nightly job at 23:00 UTC, this correctly marks all leases whose end date has passed.

### Observation 3: n8n workflows are stubs with NoOp nodes

The n8n workflow JSON files use `n8n-nodes-base.noOp` placeholder nodes for the actual email/notification logic. This is by design (per 56-04-SUMMARY.md decisions) — the workflows are importable templates with TODO notes. The actual email nodes (Resend/SMTP) must be wired by the operator. This is a human configuration step, not a code gap.

### Observation 4: pg_net is a runtime prerequisite

The DB webhook triggers rely on `net.http_post()` from the `pg_net` extension. The migration includes `create extension if not exists pg_net with schema extensions` as a safety check. pg_net is enabled by default on Supabase — but this cannot be verified without querying the live database.

### Observation 5: No dead-letter queue

The CONTEXT.md explicitly deferred dead-letter queue implementation ("Rely on Supabase DB Webhook built-in retry with exponential backoff — no custom dead-letter queue needed"). This is not a gap.

---

## Why status is `human_needed` (not `passed`)

All static checks pass. Runtime verification requires a human to:

1. Confirm the three migrations applied without errors to the actual Supabase project (`pnpm db:push` output)
2. Query `select jobname, schedule from cron.job` to confirm all three pg_cron jobs are registered in the live database
3. Query `information_schema.triggers` to confirm all three triggers are attached
4. Import the n8n workflow JSONs into the live n8n instance and activate them
5. Configure the four `ALTER DATABASE postgres SET "app.settings.*"` parameters with real n8n webhook URLs and shared secret (per `56-03-USER-SETUP.md`)
6. Optionally: manually insert a test `rent_payments` row or `maintenance_requests` row and confirm n8n receives the POST

The 56-04 SUMMARY states "Human verification checkpoint approved" — but the VERIFICATION.md cannot mark `passed` based on a summary document alone without direct database query results.
