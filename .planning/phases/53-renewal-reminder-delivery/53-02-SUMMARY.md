---
phase: 53-renewal-reminder-delivery
plan: 02
subsystem: edge-functions
tags: [deno, edge-function, resend, lease-reminders, drainer, suppression, tier-gate, notifications, cron-invoke, verify-jwt-false]

# Dependency graph
requires:
  - phase: 53-renewal-reminder-delivery
    plan: 01
    provides: claim_lease_reminders RPC + lease_reminders delivery-state cols + reminders_delivery_enabled flag + lease_renewal_reminder notification type
  - phase: 52-notification-system
    provides: create_notification single-writer RPC
provides:
  - send-lease-reminders edge function (verify_jwt=false drainer, bearer-auth, flag-gated, claim -> in-app + ordered email suppression + Resend send + state stamp)
  - exported handleRequest seam + DrainDeps client injection for unit testing
  - branch-matrix Deno test (flag-off / 4 suppression layers / entitled-clear / re-drain / bad-bearer)
  - config.toml [functions.send-lease-reminders] verify_jwt=false registration
  - notification-item TYPE_VISUALS lease_renewal_reminder -> CalendarClock icon
affects: [53-03 deploy send-lease-reminders + drain cron, 53-04 go-flip migration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "verify_jwt=false machine-invoke drainer: constant-time shared-secret Bearer compare (timingSafeEqualStr) as the first check"
    - "app_config feature-flag early-return (D-07 physical kill-switch) before any claim/send"
    - "ordered cheap->expensive email suppression gate (tier -> is_notification_suppressed -> email_suppressions -> notification_settings)"
    - "in-app-always (A1) then conditional-email: create_notification before the suppression gate so all tiers get the free channel"
    - "Resend Idempotency-Key = queue row id + terminal delivery_status stamp for exactly-once"
    - "exported handleRequest + DrainDeps.createClient injection seam; Deno.serve guarded by DENO_TEST_NO_SERVE so the module is importable in `deno test`"
    - "NEW reminder email template on wrapEmailLayout + table-CTA, escapeHtml on every user value, absolute deep-link CTA"

key-files:
  created:
    - supabase/functions/send-lease-reminders/index.ts
    - supabase/functions/tests/send-lease-reminders-test.ts
  modified:
    - supabase/config.toml
    - src/components/notifications/notification-item.tsx

key-decisions:
  - "Idempotency-Key = lease_reminders.id (row.id), the per-(lease,reminder_type) queue row, as the exactly-once anchor (D-03)"
  - "Subject copy (D-05): `Renewal reminder: <property> lease ends in <days>` where <days> derives from reminder_type (30_days/7_days/1_day), NOT now() (Pitfall 5)"
  - "On send failure the row is stamped delivery_status='failed' only — attempt_count is NOT re-incremented in the fn because the applied claim_lease_reminders RPC already increments it on claim; re-incrementing would double-count a single drain attempt"
  - "Added a lease-or-owner-vanished guard (Rule 2): if the lease/owner was deleted between queue and drain, stamp 'failed' + captureWebhookError instead of crashing the row"
  - "Testability seam: exported handleRequest(req, deps) + DrainDeps.createClient; Deno.serve wrapped in `if (!Deno.env.get('DENO_TEST_NO_SERVE'))` so importing the module in the unit test never binds a real listener — prod never sets the var, so Deno.serve always runs"

patterns-established:
  - "Pattern: cron-invoked service-role edge drainer — bearer-auth, flag early-return, claim RPC, per-row best-effort processing with per-row try/catch (one bad row never aborts the batch)"
  - "Pattern: importable Deno.serve module via exported handler + env-guarded serve registration for pure-unit testing with a mocked fetch + injected client"

requirements-completed: [REMIND-01, REMIND-03, REMIND-05]

# Metrics
duration: ~6min
completed: 2026-07-22
---

# Phase 53 Plan 02: send-lease-reminders Drainer Edge Function Summary

**`send-lease-reminders` is the in-house verify_jwt=false drainer that replaces the dead n8n hop: a constant-time shared-secret Bearer authenticates the cron caller, an `app_config` flag early-returns while delivery is OFF, a batch is claimed via `claim_lease_reminders`, and per row it ALWAYS creates the in-app notification (all tiers, A1) then conditionally sends exactly one Resend email through the ordered tier -> is_notification_suppressed -> email_suppressions -> notification_settings gate with Idempotency-Key = row.id and a terminal delivery_status stamp.**

## Performance
- **Duration:** ~6 min
- **Completed:** 2026-07-22T01:06:38Z
- **Tasks:** 3 (all executed + committed)
- **Files:** 2 created, 2 modified

## Accomplishments
- **The drainer (`send-lease-reminders/index.ts`, ~330 lines):** mirrors `lease-signature`/`sign-lease-token` conventions —
  - **Bearer auth (T-53-01):** `timingSafeEqualStr` constant-time compare of the full `Authorization` header against `Bearer ${REMINDERS_INVOKE_SECRET}` as the FIRST check after env; 401 on mismatch, before any client is built.
  - **Flag early-return (D-07):** reads `app_config.reminders_delivery_enabled`; anything other than `'true'` returns `200 { ok, skipped: 'disabled' }` and runs nothing below — deploying pre-go-flip is a safe no-op.
  - **Claim (REMIND-02):** `claim_lease_reminders({ p_limit: 100 })`; loops the claimed rows with a per-row try/catch so one bad row never aborts the batch.
  - **In-app always (A1, REMIND-05):** `create_notification('lease_renewal_reminder', 'Lease renewal reminder', ..., '/leases/<id>')` for EVERY owner, before the email gate — the free expiry-awareness channel for all tiers. `action_url` stays app-relative (open-redirect guard).
  - **Ordered email gate (REMIND-03):** `shouldEmail(owner)` = (1) active/trialing AND `GROWTH_AND_MAX_PLANS.has(plan)` [reuses the SET only, never the per-request tier-gate helper], (2) NOT `is_notification_suppressed(email)` [re-ported CI guard, load-bearing before Plan 04 drops the trigger], (3) NOT in `email_suppressions`, (4) `notification_settings.email && .leases` (absent row = defaults true = send). Any false stamps `delivery_status='suppressed'` and continues; the in-app row is already created.
  - **Send + stamp (REMIND-01/02, D-04/D-05):** on pass, sends the NEW reminder template with `idempotencyKey: row.id` + a `lease_renewal_reminder` tag; success stamps `delivery_status='sent'` + `delivered_at` + `resend_message_id`; failure stamps `'failed'` + `captureWebhookError`, batch continues.
  - **Template (D-05):** local `buildReminderEmail` with its own subject/copy, `escapeHtml` on owner name + property label + days label, a `<table role="presentation">` CTA button deep-linking the ABSOLUTE `${appUrl}/leases/<id>`, wrapped in `wrapEmailLayout`. No emojis.
- **Branch-matrix Deno test (`tests/send-lease-reminders-test.ts`):** stateful fake `SupabaseClient` (rpc recorder + lease_reminders update recorder) + `withResendStub` (fetch stub with `fetchCount()` + captured Idempotency-Key headers), mirroring `lease-signing-test.ts`. 9 `Deno.test` cases: flag-off, non-entitled tier, `is_notification_suppressed`, `email_suppressions`, `notification_settings` opt-out, entitled-clear (exactly 1 send + `Idempotency-Key === 'reminder-1'`), re-drain no-op (claim returns []), bad Bearer 401, missing Bearer 401. Every suppressed/non-entitled case asserts `create_notification` was still recorded (A1).
- **config.toml:** `[functions.send-lease-reminders] verify_jwt = false` + `import_map = "./functions/deno.json"`, with the inline auth-boundary comment convention.
- **notification-item.tsx:** `TYPE_VISUALS.lease_renewal_reminder = { Icon: CalendarClock, chip: 'icon-bg-primary' }` (lucide-react import added); `FALLBACK_VISUAL` still covers unmapped types.

## Task Commits
Each task committed atomically (TDD RED -> GREEN -> config):

1. **Task 1: Deno branch-matrix test (RED)** - `1600b8e6c` (test)
2. **Task 2: send-lease-reminders drainer (GREEN)** - `b6d9d19c3` (feat)
3. **Task 3: config.toml block + notification-item TYPE_VISUALS entry** - `4c2b79041` (chore)

**Plan metadata:** committed with this SUMMARY (docs).

## Automated Verification
- **Task 1 structural gate (PASS):** test file contains `fetchCount`, `create_notification`, `Idempotency-Key`, `reminders_delivery_enabled`, and 9 `Deno.test` cases.
- **Task 2 structural gate (PASS):** drainer contains `timingSafeEqualStr`, `reminders_delivery_enabled`, `claim_lease_reminders`, `create_notification`, `lease_renewal_reminder`, `idempotencyKey: row.id`, `GROWTH_AND_MAX_PLANS`, and does NOT contain `checkTierEntitlement`.
- **Task 3 (PASS):** `[functions.send-lease-reminders]` block with `verify_jwt = false` + `import_map`; `lease_renewal_reminder` present in notification-item; `bun run typecheck` exits 0.
- **Lefthook pre-commit green on all three commits:** gitleaks, lockfile-verify, lint (biome ignores `supabase/functions/**`), typecheck, unit-tests. No `--no-verify`.

## Deno test run — DEFERRED (owner / CI at wave merge)
Deno is unavailable in this session (`command -v deno` -> not found), and the orchestrator scoped the actual `deno test` run to CI / owner-run at wave merge. The test was authored to the exact `lease-signing-test.ts` conventions and the structural gates confirm every required primitive is present, but `deno test --allow-all --no-check --import-map=supabase/functions/deno.json supabase/functions/tests/send-lease-reminders-test.ts` was NOT executed here. Run it at wave merge to turn the structural GREEN into a behavioral GREEN.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Correctness] attempt_count not re-incremented on send failure**
- **Found during:** Task 2
- **Issue:** The plan's action text stamps failure with `attempt_count=attempt_count+1`, but the applied Migration A (Plan 01) moved the increment INTO `claim_lease_reminders` (`attempt_count = lr.attempt_count + 1` on claim). Since failed rows are terminal (the claim only picks `pending`, never re-claims a `failed` row), re-incrementing in the fn would double-count a single drain attempt.
- **Fix:** On failure the fn stamps `delivery_status='failed'` only; the claim RPC owns the attempt count. PostgREST cannot express a `col = col + 1` self-reference anyway.
- **Files modified:** supabase/functions/send-lease-reminders/index.ts
- **Commit:** b6d9d19c3

**2. [Rule 2 - Missing guard] lease-or-owner-vanished handling**
- **Found during:** Task 2
- **Issue:** A lease (or its owner) can be deleted between queue-time and drain-time. Dereferencing a null owner for `create_notification`/email would throw and (without the per-row try/catch) could strand the row.
- **Fix:** If the lease join returns no row or no owner, stamp `delivery_status='failed'` + `captureWebhookError` and `continue` — the row is not left `claimed` forever and the batch proceeds.
- **Files modified:** supabase/functions/send-lease-reminders/index.ts
- **Commit:** b6d9d19c3

**3. [Rule 3 - Testability] importable Deno.serve module**
- **Found during:** Task 1/2
- **Issue:** The plan requires the test to import the handler from `index.ts`, but every edge fn in the repo calls `Deno.serve(...)` as a module side-effect, which would bind a real listener during `deno test`.
- **Fix:** Exported `handleRequest(req, deps)` with a `DrainDeps.createClient` injection seam, and guarded the serve registration with `if (!Deno.env.get('DENO_TEST_NO_SERVE'))`. The test sets the var + dynamic-imports; prod never sets it, so `Deno.serve` always runs. Chosen over `import.meta.main` because Supabase edge-runtime's `import.meta.main` value is ambiguous and getting it wrong silently breaks the deployed fn.
- **Files modified:** supabase/functions/send-lease-reminders/index.ts, supabase/functions/tests/send-lease-reminders-test.ts
- **Commit:** 1600b8e6c, b6d9d19c3

## Threat surface
No new security-relevant surface beyond the plan's `<threat_model>`. The drainer's boundaries (cron->fn bearer, owner free-text->email HTML, action_url app-relative, exactly-once, ordered suppression, generic error responses) are exactly the registered T-53-01/03/04/05/06/02 mitigations. No new endpoints, auth paths, or schema changes.

## Known Stubs
None. The drainer is fully wired to the live Plan 01 contract (`claim_lease_reminders`, `create_notification`, the `lease_renewal_reminder` type, the `reminders_delivery_enabled` flag — all applied to prod by the orchestrator this session per the spawn context). It is a physical no-op only because the flag is OFF (by design, D-07), not because of any stub.

## TDD Gate Compliance
- RED gate: `test(53-02)` commit `1600b8e6c` precedes the GREEN gate.
- GREEN gate: `feat(53-02)` commit `b6d9d19c3` follows RED.
- Both gate commits present in order. The actual RED-fails / GREEN-passes execution is DEFERRED to the wave-merge `deno test` run (Deno unavailable in-session).

## User Setup Required (later plans, not this one)
- Deploy `send-lease-reminders` — DEFERRED to Plan 03 + the orchestrator (`bun scripts/deploy-edge-functions.ts send-lease-reminders`; CLI-401 owner-run if PAT stale).
- Set the `REMINDERS_INVOKE_SECRET` Supabase function secret and mirror it into `app_config.reminders.drain_secret` (Plan 03 runbook).
- Fill `app_config.reminders.drain_url` (Plan 03) and flip `reminders_delivery_enabled='true'` (Migration C, Plan 04).

## Next Phase Readiness
- The drainer code, its branch-matrix test, the config registration, and the notification icon are authored + committed. Plan 03 can deploy the fn (flag OFF -> safe no-op) and wire the drain cron; Plan 04's go-flip is the only step that makes it physically send.

## Self-Check: PASSED
- FOUND: supabase/functions/send-lease-reminders/index.ts
- FOUND: supabase/functions/tests/send-lease-reminders-test.ts
- FOUND: supabase/config.toml (send-lease-reminders block)
- FOUND: src/components/notifications/notification-item.tsx (lease_renewal_reminder)
- FOUND: commit 1600b8e6c (Task 1)
- FOUND: commit b6d9d19c3 (Task 2)
- FOUND: commit 4c2b79041 (Task 3)

---
*Phase: 53-renewal-reminder-delivery*
*Completed: 2026-07-22*
