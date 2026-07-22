---
phase: 53-renewal-reminder-delivery
plan: 03
subsystem: database
tags: [pg_cron, pg_net, drain-cron, security-definer, app_config, sentry-checkin, edge-function-deploy, migration]

# Dependency graph
requires:
  - phase: 53-renewal-reminder-delivery
    plan: 01
    provides: app_config seed keys (reminders.drain_url, reminders.drain_secret, sentry.cron.send_lease_reminders_url, reminders_delivery_enabled=false)
  - phase: 53-renewal-reminder-delivery
    plan: 02
    provides: send-lease-reminders edge fn (verify_jwt=false drainer) + config.toml block
provides:
  - invoke_send_lease_reminders() SECURITY DEFINER drain invoker (net.http_post Bearer + Sentry cron check-in)
  - cron.schedule('send-lease-reminders-drain','30 6 * * *') registration (Migration B)
  - authored-and-committed Migration B file (pure ASCII, safe for MCP apply_migration)
affects: [53-04 go-flip migration (depends on the drain cron + deployed fn existing first)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "cron->edge-fn drain invoker: SECURITY DEFINER wrapper reads drain_url+Bearer from app_config, early-returns on empty URL, net.http_post's the fn, posts a Sentry cron check-in (net-new composition assembled from notify_n8n_* + queue_payment_reminders analogs)"
    - "safe-no-op cron scheduling before go-live: empty app_config URL => inert invoker + flag-gated edge fn, so the drain job can be registered while delivery is still OFF"

key-files:
  created:
    - supabase/migrations/20260721130000_send_lease_reminders_drain_cron.sql
  modified: []

key-decisions:
  - "Sentry check-in reads sentry.cron.send_lease_reminders_url from app_config (not a GUC current_setting), matching the app_config approach the notify_n8n rewrite adopted because Studio's postgres role cannot ALTER DATABASE SET"
  - "Migration B authored pure ASCII (hyphens, no em-dashes/smart-quotes) so the orchestrator's MCP apply_migration cannot corrupt it (edge-deploy-mcp-fidelity trap applies to model-emitted non-ASCII)"
  - "Chose 30 6 * * * (06:30 UTC): free slot, just after the 06:00 queue-lease-reminders filler, clear of the entire 3AM cleanup cluster (:00/:05/:10/:15/:20/:30/:45/:50)"

patterns-established:
  - "Pattern: pg_cron drain invoker (invoke_send_lease_reminders) — the repo's first cron->edge-fn drainer; the demolished payment-reminders drain left no live analog"

requirements-completed: []  # REMIND-01 mechanism authored but NOT prod-live until the orchestrator deploys the fn + applies Migration B; the plan marks REMIND-01 completed only after go-live wiring

# Metrics
duration: ~9min
completed: 2026-07-21
---

# Phase 53 Plan 03: Drain Cron (Migration B) + Deploy Documentation Summary

**Migration B authored and committed: `invoke_send_lease_reminders()` is a pure-ASCII SECURITY DEFINER drain invoker that reads `reminders.drain_url`/`reminders.drain_secret` from `app_config`, early-returns on an empty URL, `net.http_post`s the deployed `send-lease-reminders` edge fn with a shared Bearer, and posts a Sentry cron check-in — scheduled at the free `30 6 * * *` (06:30 UTC) slot as a safe no-op until Plan 04 flips the delivery kill-flag. Prod apply + edge-fn deploy are DEFERRED TO THE ORCHESTRATOR (MCP + deploy tooling unavailable to this executor).**

## Performance
- **Duration:** ~9 min
- **Completed:** 2026-07-21
- **Tasks:** 1 of 3 executed here (Task 1); Tasks 2 & 3 deferred to orchestrator per spawn scope
- **Files:** 1 created (Migration B)

## Accomplishments
- **Migration B (`20260721130000_send_lease_reminders_drain_cron.sql`)** authored, verified, committed:
  - `invoke_send_lease_reminders()` — `security definer set search_path = public, extensions`; `select value into v_url/v_secret from public.app_config where key='reminders.drain_url'/'reminders.drain_secret'`; empty-URL early `return`; `perform net.http_post(url:=v_url, headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||coalesce(v_secret,'')), timeout_milliseconds:=5000)` — mirroring the `notify_n8n_lease_reminder` shape (`20260504162221:93-126`).
  - Sentry cron check-in — `select value into v_sentry from public.app_config where key='sentry.cron.send_lease_reminders_url'`; when non-empty, `net.http_post` with `status/environment/duration` (`round(extract(epoch from (clock_timestamp()-v_start))::numeric,3)`) — mirroring `queue_payment_reminders` (`20260224091106:255-275`).
  - `cron.schedule('send-lease-reminders-drain','30 6 * * *', $$select public.invoke_send_lease_reminders()$$)` — named SECURITY DEFINER fn, never inline SQL (CLAUDE.md cron rule); idempotent by jobname.
- **Slot collision check (verified):** grepped every `cron.schedule` across `supabase/migrations/`. Used slots near the window are `0 6` (queue-lease-reminders filler) and the 3AM cluster `0 3 / 5 3 / 10 3 / 15 3 / 20 3 / 30 3 / 45 3 / 50 3`. `30 6 * * *` is FREE — no collision.
- **No public/authenticated grant** on `invoke_send_lease_reminders` (pg_cron runs it as job owner); **no functional reference** to the delivery kill-flag (that gate lives in the edge fn + Migration C).

## Task Commits
1. **Task 1: Migration B — invoke_send_lease_reminders() + cron.schedule** - `e62b4eac2` (feat)

**Plan metadata:** committed with this SUMMARY (docs).

Tasks 2 (deploy) & 3 (prod apply + reconcile) produce no commit here — see "Deferred to Orchestrator".

## Automated Verification (Task 1 — PASS)
- Structural gate: file contains `create or replace function public.invoke_send_lease_reminders`, `security definer`, `net.http_post`, `reminders.drain_url`, `reminders.drain_secret`, `send-lease-reminders-drain` — all present.
- Guard checks: no `reminders_delivery_enabled` reference; no `grant ... invoke_send_lease_reminders`; `'30 6 * * *'` present.
- **Pure ASCII: PASS** (`LC_ALL=C grep '[^ -~\t]'` finds nothing) — safe for MCP `apply_migration`.
- Lefthook pre-commit green on `e62b4eac2` (gitleaks, lockfile-verify, lint, typecheck, unit-tests). No `--no-verify`.

## Deferred to Orchestrator (Tasks 2 & 3 — MCP + deploy tooling unavailable to this executor)

### Task 2 — Deploy `send-lease-reminders` + set the invoke secret (BLOCKING, before Plan 04)
1. **Deploy:** `bun scripts/deploy-edge-functions.ts send-lease-reminders`.
   - **DEPLOY-FIDELITY FLAG:** `supabase/functions/send-lease-reminders/index.ts` (Plan 02's file) contains em-dashes (non-ASCII) at lines 67/84/85/115/192/251/258/340. The disk-reading deploy script preserves them correctly; **do NOT deploy this fn via MCP `deploy_edge_function`** — MCP model-emission corrupts non-ASCII (edge-deploy-mcp-fidelity). If MCP deploy is the only path, make the source pure-ASCII first. The `p_message` template at line 258 also carries a user-facing em-dash (`... — lease ends in ...`) — optional cosmetic ASCII cleanup, Plan 02's call.
   - If the PAT is stale (CLI/PAT-401), this is the owner-run pause (same command).
   - **Verify via MCP `get_edge_function`/`list_edge_functions`** (name present, bumped version) — never trust deploy stdout.
2. **Invoke secret (byte-for-byte match):** generate a strong random secret; set it as the `REMINDERS_INVOKE_SECRET` Supabase function secret (Dashboard -> Edge Functions -> Secrets, or `supabase secrets set`); mirror the SAME value into app_config: `update public.app_config set value='<secret>' where key='reminders.drain_secret';`.
3. **Drain URL:** `update public.app_config set value='https://bshjmbshupiibfiewpxb.supabase.co/functions/v1/send-lease-reminders' where key='reminders.drain_url';`. Optionally set `sentry.cron.send_lease_reminders_url` if a Sentry cron monitor is registered (else leave empty -> check-in skipped).
4. **Smoke (flag still OFF -> no sends):** correct-Bearer POST -> `200 { ok:true, skipped:'disabled' }`; wrong-Bearer POST -> `401`.

### Task 3 — Apply Migration B to prod + reconcile filename (BLOCKING, AFTER Task 2 deploy)
1. `apply_migration` the committed `20260721130000_send_lease_reminders_drain_cron.sql` via MCP.
2. Reconcile the repo filename to the prod-assigned timestamp via MCP `list_migrations` (migration-mcp-prod-drift). The `20260721130000` timestamp is a PLACEHOLDER; it also sorts before the already-applied Migration A (`20260722005310`) — the invoker only reads app_config at runtime (not at apply time), so apply ordering is not a hard blocker, but reconcile to the prod version regardless.
3. Verify via MCP `execute_sql`: `select jobname, schedule from cron.job where jobname='send-lease-reminders-drain';` returns `30 6 * * *`; `select proname from pg_proc where proname='invoke_send_lease_reminders';` returns a row. Optionally `select public.invoke_send_lease_reminders();` and confirm 0 rows flip to `'sent'` (flag still off).
4. **Do NOT touch `reminders_delivery_enabled`** — it stays `'false'` until Plan 04's Migration C.

## Deviations from Plan
Tasks 2 & 3 were deferred to the orchestrator per the explicit spawn-context scope adjustment (prod migration apply AND edge-fn deploy are the orchestrator's job; MCP + deploy tooling are unavailable to this executor). This is a scope directive, not an auto-fix deviation — Task 1 (the authored artifact) executed exactly as written.

## Issues Encountered
- **Deploy-fidelity discovery (flagged, not fixed):** the Plan 02 edge fn source is non-ASCII (em-dashes). Out of this plan's Task-1 scope (Plan 02 owns that file), so it was NOT modified here — instead surfaced as the DEPLOY-FIDELITY FLAG above so the orchestrator deploys via the disk-reading script (correct for non-ASCII) rather than MCP.

## Threat surface
No new security-relevant surface beyond the plan's `<threat_model>`. The drain invoker's boundary is exactly the registered T-53-01 mitigation (the app_config Bearer the fn constant-time-compares); `reminders.drain_url`/`drain_secret` remain service-role-only app_config rows (T-53-07). No new endpoints or schema changes.

## Known Stubs
None. Migration B is complete and wired to the live Plan 01 app_config keys. It is a physical no-op only because (a) `reminders.drain_url` is still empty (operator fills at go-live) and (b) the delivery kill-flag is OFF — both by design (go-live ordering), not a stub.

## Next Phase Readiness
- Migration B is authored + committed. Once the orchestrator completes Task 2 (deploy + secret wiring) and Task 3 (apply + reconcile), the go-live sequence is poised for Plan 04's Migration C (backlog expire + n8n-trigger drop + flag flip as the LAST statement).
- REMIND-01 mechanism is fully assembled in code; it becomes prod-live only after the orchestrator's deploy + apply.

## Self-Check: PASSED
- FOUND: supabase/migrations/20260721130000_send_lease_reminders_drain_cron.sql
- FOUND: commit e62b4eac2 (Task 1)

---
*Phase: 53-renewal-reminder-delivery*
*Completed: 2026-07-21*
