---
phase: 56-scheduled-jobs-db-webhooks-pg-cron-n8n
plan: 04
subsystem: infra
tags: [n8n, webhooks, workflow, json, notifications, rent-payments, maintenance-requests, lease-reminders]

# Dependency graph
requires:
  - phase: 56-02
    provides: pg_cron jobs that insert into lease_reminders and calculate late fees
  - phase: 56-03
    provides: DB webhook triggers that POST to n8n on rent_payments/maintenance_requests/lease_reminders INSERT/UPDATE
provides:
  - n8n workflow JSON for WF-01 — rent payment owner notifications + receipt generation stub
  - n8n workflow JSON for WF-02 — maintenance request owner/tenant notifications (INSERT vs UPDATE branching)
  - n8n workflow JSON for SCHED-02 — lease expiry reminder emails (30/7/1 day branching)
  - All three workflows use Authorization Bearer shared-secret verification as first node
  - Human verification checkpoint approved — Phase 56 end-to-end integration confirmed
affects:
  - phase-57 (NestJS cleanup — Phase 56 replaces all NestJS notification and scheduling logic)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - n8n webhook trigger node with Authorization header verification as gateway pattern
    - NoOp placeholder nodes with inline TODO notes for owner email configuration
    - Workflow branching on event type (INSERT vs UPDATE) via n8n IF node
    - Workflow branching on reminder_type (30_days/7_days/1_day) via n8n Switch node

key-files:
  created:
    - supabase/n8n-workflows/rent-payment-notification.json
    - supabase/n8n-workflows/maintenance-notification.json
    - supabase/n8n-workflows/lease-reminder-notification.json

key-decisions:
  - "NoOp nodes with notes serve as TODO placeholders for real email nodes (Resend/SMTP) — importable templates with zero n8n configuration required to test webhook delivery"
  - "active: false on all workflows — prevents auto-activation on import; user manually activates after wiring email nodes"
  - "Webhook path names match table names (rent-payment, maintenance, lease-reminder) — consistent with trigger function URL naming convention in 56-03"
  - "Human verification checkpoint approved — all pg_cron jobs, DB triggers, and n8n workflow JSONs confirmed by human review"

patterns-established:
  - "n8n workflow pattern: Webhook Trigger → Verify Auth Header (IF) → [Respond 401 on false] → Domain Logic → Respond 200"
  - "n8n branch-on-event pattern: IF node on $json.body.type === 'INSERT' separates new record vs update notification paths"

requirements-completed:
  - WF-01
  - WF-02
  - SCHED-02

# Metrics
duration: 5min
completed: 2026-02-22
---

# Phase 56 Plan 04: n8n Workflow JSON Definitions Summary

**Three importable n8n workflow JSON files for rent payment, maintenance request, and lease reminder notifications — each with Authorization header verification gateway, event-type branching logic, and NoOp placeholder nodes ready to be wired with real email nodes.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-22T17:50:00Z
- **Completed:** 2026-02-22T17:55:00Z
- **Tasks:** 2 (1 auto + 1 human checkpoint)
- **Files modified:** 3 files created

## Accomplishments

- `rent-payment-notification.json`: Webhook Trigger → Verify Auth Header → Send Owner Notification (NoOp stub) → Generate Receipt (NoOp stub) → Respond 200; Respond 401 on auth failure
- `maintenance-notification.json`: Webhook Trigger → Verify Auth Header → Branch on `$json.body.type` (`INSERT` = Notify Owner, `UPDATE` = Notify Tenant) → Respond 200
- `lease-reminder-notification.json`: Webhook Trigger → Verify Auth Header → Switch on `$json.body.record.reminder_type` (`30_days` / `7_days` / `1_day`) → three urgency-tiered notification stubs → Respond 200
- All workflows use `"active": false` — safe to import without auto-activation
- Human verification checkpoint approved — Phase 56 end-to-end integration confirmed

## Task Commits

Each task was committed atomically:

1. **Task 1: Create n8n workflow JSON files for all three notification channels** - `4552c87fa` (feat)
2. **Task 2: Human verification checkpoint — approved by user** - (no code commit — approval noted in planning docs)

## Files Created/Modified

- `supabase/n8n-workflows/rent-payment-notification.json` — WF-01 workflow: webhook trigger, auth check, owner notification stub, receipt generation stub, 200/401 responses
- `supabase/n8n-workflows/maintenance-notification.json` — WF-02 workflow: webhook trigger, auth check, INSERT/UPDATE branch, owner/tenant notification stubs
- `supabase/n8n-workflows/lease-reminder-notification.json` — SCHED-02 workflow: webhook trigger, auth check, 30/7/1 day reminder_type switch, urgency-tiered notification stubs

## Decisions Made

- NoOp nodes with inline notes serve as TODO placeholders for real email nodes (Resend/SMTP). This approach makes the JSON files importable and testable for webhook delivery without requiring email configuration upfront.
- `"active": false` on all three workflows prevents auto-activation on import — the user manually activates each workflow after wiring the email nodes in n8n Dashboard.
- Webhook path names (`rent-payment`, `maintenance`, `lease-reminder`) are consistent with the trigger function URL naming convention established in Plan 03.
- Human verification checkpoint confirmed: user approved all pg_cron jobs, DB triggers, and n8n workflow JSONs as ready.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. All JSON files validated as parseable. All three workflows contain the required Webhook Trigger node and Authorization header check.

## User Setup Required

See [56-03-USER-SETUP.md](./56-03-USER-SETUP.md) for:
- Four `ALTER DATABASE postgres SET` statements to configure webhook URLs and shared secret
- n8n workflow import steps (Dashboard → Workflows → Import from file)
- Webhook URL to copy into each trigger's `app.settings.N8N_WEBHOOK_*` setting

Note: The application runs normally without n8n configured. DB triggers gracefully skip webhook delivery when URLs are not set.

## Next Phase Readiness

- Phase 56 is fully complete: schema migrations (Plan 01) + pg_cron functions (Plan 02) + DB webhook triggers (Plan 03) + n8n workflow JSONs (Plan 04)
- All five Phase 56 requirements satisfied: SCHED-01, SCHED-02, SCHED-03, WF-01, WF-02
- Ready for Phase 57: Cleanup & Deletion — Remove NestJS Entirely (CLEAN-01 through CLEAN-05)
- No blocking concerns — n8n workflows are importable templates; email nodes are the only remaining owner configuration step

---
*Phase: 56-scheduled-jobs-db-webhooks-pg-cron-n8n*
*Completed: 2026-02-22*
