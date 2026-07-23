---
phase: 53-renewal-reminder-delivery
plan: 04
subsystem: database
tags: [migration, go-live, feature-flag, app_config, rls, pg_trigger, backlog-expire, runbook]

# Dependency graph
requires:
  - phase: 53-renewal-reminder-delivery
    plan: 01
    provides: delivery-state columns, reminders_delivery_enabled flag (default OFF), claim_lease_reminders RPC, notification_type CHECK incl lease_renewal_reminder
  - phase: 53-renewal-reminder-delivery
    plan: 02
    provides: send-lease-reminders drainer with re-ported shouldEmail() suppression stack
  - phase: 53-renewal-reminder-delivery
    plan: 03
    provides: invoke_send_lease_reminders() + send-lease-reminders-drain cron (Migration B applied)
provides:
  - Migration C1 (20260722013000_lease_reminders_goflip) — count + expire backlog without sending + drop n8n trigger/fn; NO flag flip (prod-apply deferred to orchestrator)
  - Migration C2 (20260722014000_lease_reminders_delivery_flip) — single reminders_delivery_enabled='true' flip; UNAPPLIED owner go-live gate
  - lease-reminders-delivery.rls.test.ts — dual-client owner isolation + privilege/write boundary (run deferred to CI)
  - 53-GO-LIVE-RUNBOOK.md — exact owner go-live sequence
affects: [phase-54 compliance key-date reminders (reuses the queue-drain-Resend rail), phase-62 scheduled owner digest]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Split go-live: mechanical pre-flip (C1, apply-now safe) separated from the irreversible flag flip (C2, owner-run) when the delivery fn is undeployed — the flip must not precede the deploy or it falsely claims delivery is live"
    - "Idempotent backlog clean-slate: RAISE NOTICE count -> UPDATE delivery_status='expired' WITHOUT sending -> drop the dead delivery path; only post-go-live rows ever send"

key-files:
  created:
    - supabase/migrations/20260722013000_lease_reminders_goflip.sql
    - supabase/migrations/20260722014000_lease_reminders_delivery_flip.sql
    - tests/integration/rls/lease-reminders-delivery.rls.test.ts
    - .planning/phases/53-renewal-reminder-delivery/53-GO-LIVE-RUNBOOK.md
  modified: []

key-decisions:
  - "Split the single Migration C into C1 (mechanical: expire backlog + drop n8n hop, apply-now safe, NO flag flip) + C2 (flag flip only, stays UNAPPLIED) because the send-lease-reminders edge fn is PAT-blocked/undeployed this session — flipping now would falsely claim delivery is live"
  - "C1 prod-apply DEFERRED TO ORCHESTRATOR; C2 is the owner go-live gate (applied only after deploy + secret wiring + drain_url + C1 per 53-GO-LIVE-RUNBOOK.md)"
  - "Both migrations authored pure ASCII (safe for MCP apply_migration — edge-deploy-mcp-fidelity)"
  - "RLS test uses the dual authenticated-client harness (no service-role client exists in the harness by design); lease_renewal_reminder + lease_reminders owner-scoping use the skip-if-empty pattern since no go-live rows exist pre-flip, plus unconditional privilege-boundary + write-block cases"

patterns-established:
  - "Pattern: apply-now/owner-run migration split for irreversible feature flips gated on an undeployed dependency — the mechanical prep applies immediately, the flip ships as an unapplied repo-only gate with a header runbook"

requirements-completed: []  # REMIND-01/REMIND-04 artifacts authored but NOT prod-live: C1 apply is deferred to the orchestrator and C2 (the go-live flip) stays owner-run/unapplied. Marked complete only after go-live wiring (mirrors 53-03).

# Metrics
duration: ~35min
completed: 2026-07-21
---

# Phase 53 Plan 04: Go-Live Split (C1 mechanical + C2 owner flip) Summary

**The REMIND-04 go-live was split into an apply-now mechanical migration (C1: RAISE NOTICE backlog count + expire the whole pre-existing queue WITHOUT sending + drop the dead n8n trigger/fn) and an UNAPPLIED owner-run flag flip (C2: `reminders_delivery_enabled='true'`), because the `send-lease-reminders` edge fn is PAT-blocked/undeployed this session — flipping now would falsely claim delivery is live. Shipped with a dual-client RLS isolation test (run-deferred to CI) and a step-by-step 53-GO-LIVE-RUNBOOK.md.**

## Performance
- **Duration:** ~35 min
- **Completed:** 2026-07-21
- **Tasks:** 3 authoring artifacts committed (2 migrations, 1 RLS test, 1 runbook); prod-apply + test-run DEFERRED (orchestrator / owner / CI)
- **Files created:** 4

## Accomplishments
- **Migration C1** (`20260722013000_lease_reminders_goflip.sql`) — the mechanical pre-flip, apply-now safe, NO flag flip:
  1. `do $$ ... raise notice 'phase53 go-live: expiring % queued lease_reminders without sending', c; $$` — logs the backlog for the record (D-06; 0 in prod at authoring).
  2. `update public.lease_reminders set delivery_status='expired', delivered_at=now() where delivery_status='pending'` — clears the entire backlog WITHOUT sending (REMIND-04 clean slate, Pitfall 2 no storm).
  3. `drop trigger if exists trg_lease_reminders_notify_n8n on public.lease_reminders;` + `drop function if exists public.notify_n8n_lease_reminder();` — removes the dead n8n hop (REMIND-01, Pitfall 3); its `is_notification_suppressed` guard is already re-ported into the deployed drainer (Plan 02).
  - Idempotent, pure ASCII. Does NOT touch `queue_lease_reminders`, the `reminder_type` CHECK, or the 06:00 filler cron (D-01). **Contains NO flag flip** (verified: the flag key appears only in header comments).
- **Migration C2** (`20260722014000_lease_reminders_delivery_flip.sql`) — the owner go-live gate, stays UNAPPLIED:
  - single statement `update public.app_config set value='true' where key='reminders_delivery_enabled';`
  - header runbook lists the four preconditions (fn deployed with the ordered shouldEmail() stack, invoke secret == `reminders.drain_secret`, `reminders.drain_url` set, C1 applied) and the reversible rollback.
- **RLS integration test** (`tests/integration/rls/lease-reminders-delivery.rls.test.ts`) — dual-client ownerA/ownerB (mirrors notifications/activity harness, synthetic owners, hits prod):
  - owner-scoped SELECT on `lease_reminders` incl the new `delivery_status`/`delivered_at`/`resend_message_id`/`attempt_count` columns + cross-owner non-overlap (via the leases join);
  - `lease_renewal_reminder` notification owner-scoping + cross-owner isolation (skip-if-empty until go-live rows land);
  - `create_notification('lease_renewal_reminder',...)` and `claim_lease_reminders()` rejected for the authenticated role (`REVOKED_CODES`);
  - write boundary: INSERT denied (no INSERT policy — RLS default-deny before the CHECK) and UPDATE of `delivery_status` matches zero rows (no UPDATE policy).
- **53-GO-LIVE-RUNBOOK.md** — exact owner steps: apply C1 -> deploy `send-lease-reminders` -> set `REMINDERS_INVOKE_SECRET` + mirror into `app_config.reminders.drain_secret` -> set `reminders.drain_url` -> pre-flip verification gate -> apply C2 -> verify a manual invoke drains + stamps + emails a test; includes pre-flip smoke, post-go-live end-to-end checks, and the rollback.

## Task Commits
1. **Migrations C1 + C2 (split go-live)** - `52f367ed8` (feat)
2. **RLS integration test** - `c076f3d7b` (test)
3. **Go-live runbook** - `c380d400b` (docs)

**Plan metadata:** committed with this SUMMARY (docs).

## Files Created/Modified
- `supabase/migrations/20260722013000_lease_reminders_goflip.sql` - C1: count + expire backlog + drop n8n hop (no flag flip)
- `supabase/migrations/20260722014000_lease_reminders_delivery_flip.sql` - C2: single flag-flip; UNAPPLIED owner gate
- `tests/integration/rls/lease-reminders-delivery.rls.test.ts` - dual-client owner isolation + privilege/write boundary
- `.planning/phases/53-renewal-reminder-delivery/53-GO-LIVE-RUNBOOK.md` - owner go-live sequence

## Decisions Made
See key-decisions frontmatter. The load-bearing one: the orchestrator scope adjustment restructured the plan's single Migration C into C1 (apply-now mechanical) + C2 (owner-run flip) because the edge-fn deploy is PAT-blocked (401 this session). This preserves the REMIND-04 ordering guarantee (backlog cleared + n8n hop gone BEFORE any flip) while ensuring the flag physically cannot claim "live" before the drainer is deployed.

## Deviations from Plan

The plan's single Migration C (count -> expire -> drop -> flip-as-last-statement) was restructured per the explicit orchestrator scope adjustment into C1 (count + expire + drop, NO flip) + C2 (flip only, unapplied). This is a scope directive, not an auto-fix deviation. Consequences:
- The plan's Task 1 verify grep expected the flip in the goflip file's tail (`tail -3 | grep reminders_delivery_enabled`); with the split, the flip lives in C2 (verified as C2's final/only statement) and C1 deliberately has NO flip (verified: the flag key appears only in C1's header comments, no UPDATE statement).
- The plan's Task 2 (blocking human-verify go-live gate) and Task 3 (apply Migration C via MCP + reconcile + regen types + run RLS test) are NOT executed here: the go-live flip is owner-run (C2 unapplied) and C1's prod-apply is deferred to the orchestrator. The human-verify gate is captured as Step 4 of 53-GO-LIVE-RUNBOOK.md (the owner performs it before applying C2). No checkpoint stop was returned because the irreversible flip is explicitly deferred out of this session's scope.

**Total deviations:** 0 auto-fixed. 1 orchestrator-directed structural restructure (single Migration C -> C1 + C2).
**Impact on plan:** Preserves every REMIND-04 safety invariant (no storm, no double-send, flag never claims live before deploy). No scope creep.

## Issues Encountered
- The new RLS test tripped biome's formatter on first commit (chained PostgREST calls that fit on one line must collapse). Resolved with `biome check --write` and re-committed; typecheck + unit + lint green on `c076f3d7b`. No `--no-verify`.

## Threat surface
No new security-relevant surface beyond the plan's `<threat_model>`. C1 removes a delivery path (drops the n8n trigger/fn — closes T-53-05 double-send); C2 is a single app_config flip (service-role-only KV, T-53-04b — flip is C2's only statement, applied only after C1 clears the backlog). The RLS test pins T-53-08 (cross-owner leakage of delivery state / reminder notifications) + the claim/create privilege boundary.

## Known Stubs
None. C1 and C2 are complete SQL wired to the live Plan 01 app_config keys + Plan 02/03 drainer. They are not "live" only by design (go-live ordering): C1's prod-apply is the orchestrator's job and C2 is the owner's irreversible go-live gate — both intentional, both documented in 53-GO-LIVE-RUNBOOK.md, not stubs.

## Deferred / Owner-run residuals
- **C1 prod-apply (orchestrator):** MCP `apply_migration` on `20260722013000_lease_reminders_goflip.sql` -> reconcile filename to prod version -> verify `to_regprocedure('notify_n8n_lease_reminder')` IS NULL, 0 non-internal triggers on `lease_reminders`, 0 pending (all 'expired', 0 'sent'), flag still 'false'. Record the RAISE NOTICE backlog count.
- **Go-live (owner):** the full 53-GO-LIVE-RUNBOOK.md sequence ending in applying C2. REMIND-01/REMIND-04 become prod-complete only after this.
- **RLS test run:** deferred to CI `rls-security` (needs prod + `.env.local`). Pre-flip it passes via skip-if-empty; post-go-live it pins live isolation.
- **db:types regen:** owner-run after C1/C2 apply (PAT-stale; MCP `generate_typescript_types` fallback). C1 changes no columns (delivery-state landed in Migration A), so the diff is limited to the dropped n8n fn.

## Next Phase Readiness
- All Phase 53 code + migrations are authored and committed. The go-live sequence is fully documented; once the orchestrator applies C1 and the owner completes the runbook (deploy + secrets + drain_url + C2), renewal reminder delivery is live and REMIND-01..05 close.
- The queue-drain-Resend rail proven here is the analog Phase 54 (compliance key-date reminders) reuses.

## Self-Check: PASSED
- FOUND: supabase/migrations/20260722013000_lease_reminders_goflip.sql
- FOUND: supabase/migrations/20260722014000_lease_reminders_delivery_flip.sql
- FOUND: tests/integration/rls/lease-reminders-delivery.rls.test.ts
- FOUND: .planning/phases/53-renewal-reminder-delivery/53-GO-LIVE-RUNBOOK.md
- FOUND: commit 52f367ed8 (C1+C2 feat)
- FOUND: commit c076f3d7b (RLS test)
- FOUND: commit c380d400b (runbook docs)

---
*Phase: 53-renewal-reminder-delivery*
*Completed: 2026-07-21*
