---
phase: 53-renewal-reminder-delivery
verified: 2026-07-22T01:42:22Z
status: human_needed
score: 5/5 must-haves verified (mechanism-level; live delivery gated behind an explicit owner go-live)
overrides_applied: 0
human_verification:
  - test: "Deploy send-lease-reminders and confirm it is live with the full ordered shouldEmail() suppression stack"
    expected: "MCP get_edge_function shows a bumped version; deployed index.ts contains tier -> is_notification_suppressed -> email_suppressions -> notification_settings gate; correct-Bearer POST returns 200 {ok:true, skipped:'disabled'} (flag still off); wrong-Bearer POST returns 401"
    why_human: "PAT-blocked (401) this session; deploy requires the disk-reading script or dashboard action; non-ASCII source makes MCP deploy_edge_function unsafe (edge-deploy-mcp-fidelity)"
  - test: "Set REMINDERS_INVOKE_SECRET as a Supabase function secret and mirror the identical value into app_config.reminders.drain_secret; set app_config.reminders.drain_url to the deployed fn URL"
    expected: "Function secret == app_config.reminders.drain_secret byte-for-byte; drain_url populated so invoke_send_lease_reminders() stops early-returning on empty URL"
    why_human: "Secret generation/storage is an owner-run dashboard/MCP execute_sql action, not derivable from the repo"
  - test: "Apply Migration C2 (20260722014000_lease_reminders_delivery_flip.sql) only after the Step 4 preconditions in 53-GO-LIVE-RUNBOOK.md are green"
    expected: "app_config.reminders_delivery_enabled flips 'false' -> 'true' as the single, irreversible-by-design go-live statement"
    why_human: "Deliberately unapplied gate — flipping before the fn is deployed would falsely claim delivery is live (06:30 cron would POST to an empty/undeployed endpoint)"
  - test: "Run `deno test --allow-all --no-check --import-map=supabase/functions/deno.json supabase/functions/tests/send-lease-reminders-test.ts`"
    expected: "All 10 Deno.test cases pass (flag-off, 4 suppression layers, entitled-clear with Idempotency-Key===row.id, re-drain no-op, bad/missing bearer 401)"
    why_human: "Deno is not installed in this environment (`command -v deno` -> not found); structural grep fallback passed but the actual branch-matrix execution has never run"
  - test: "Run `bun run test:integration -- lease-reminders-delivery.rls.test.ts` against prod"
    expected: "All 8 dual-client RLS cases pass: owner-scoped SELECT on the new delivery columns, cross-owner isolation on lease_reminders and lease_renewal_reminder notifications, claim_lease_reminders/create_notification privilege-denied for authenticated, INSERT/UPDATE write-denied"
    why_human: "Requires .env.local + live prod credentials (synthetic ownerA/ownerB), routed to CI rls-security per project convention; not runnable in this session"
  - test: "Post-go-live smoke: fire `select public.invoke_send_lease_reminders();` (or wait for the 06:30 UTC cron) and confirm a queued-after-go-live lease_reminders row flips pending->sent with delivered_at/resend_message_id stamped, a lease_renewal_reminder notification exists, the entitled owner receives the email, and CI synthetic owners (e2e-owner-a/b@tenantflow.app) receive none"
    expected: "End-to-end delivery confirmed live with suppression honored"
    why_human: "Requires real email receipt confirmation and a live cron firing after go-live — cannot be verified from static code"
---

# Phase 53: Renewal Reminder Delivery Verification Report

**Phase Goal:** Deliver the Growth/Max renewal-reminder feature in-house — send-lease-reminders edge fn drains lease_reminders on pg_cron, sends one email per due reminder via Resend exactly once honoring every suppression layer, creates an in-app notification via the Phase 52 write-path, removes the dead n8n hop, gated by a clean-slate pre-flip.
**Verified:** 2026-07-22T01:42:22Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A Growth/Max owner with an expiring lease receives an automated renewal-reminder email via `send-lease-reminders` draining `lease_reminders` on pg_cron; dead n8n hop removed (REMIND-01) | VERIFIED (mechanism) — gated, not yet live | `supabase/functions/send-lease-reminders/index.ts` implements the full drain-claim-notify-suppress-send-stamp pipeline (404 lines); Migration B (`20260722012107_send_lease_reminders_drain_cron.sql`) registers `invoke_send_lease_reminders()` + `cron.schedule('send-lease-reminders-drain','30 6 * * *')` — both APPLIED to prod per commit `0efc9a6ee`; Migration C1 (`20260722013850_lease_reminders_goflip.sql`) drops `trg_lease_reminders_notify_n8n` + `notify_n8n_lease_reminder()` — APPLIED per commit `fad0db5c6`. **Not yet observably true**: `reminders_delivery_enabled` is still `'false'` and the edge fn has not been confirmed deployed this session (PAT-401) — see Human Verification #1-3 |
| 2 | Each reminder delivered exactly once per (lease, reminder_type) via delivery-state column + `FOR UPDATE SKIP LOCKED` + Resend Idempotency-Key (REMIND-02) | VERIFIED | Migration A (`20260722005310_lease_reminders_delivery_state.sql`, APPLIED, commit `c7a368a21`) adds `delivery_status`/`delivered_at`/`resend_message_id`/`attempt_count` + `claim_lease_reminders(int)` (`for update skip locked`, service_role-only: `revoke all ... from public, anon, authenticated` + `grant execute ... to service_role`); `index.ts` line 292 passes `idempotencyKey: row.id`, lines 297-306 stamp `delivery_status='sent'` + `delivered_at` + `resend_message_id` on success — a re-claim can never re-pick a `'sent'` row (claim only selects `delivery_status='pending'`) |
| 3 | Reminder delivery honors all suppression layers — `notification_settings`, `email_suppressions`, re-ported CI-synthetic-owner guard (REMIND-03) | VERIFIED | `index.ts` `shouldEmail()` (lines 117-152) implements the exact ordered gate: (1) tier via `GROWTH_AND_MAX_PLANS` + active/trialing, (2) `is_notification_suppressed` RPC (the CI-owner guard re-ported from the dropped n8n trigger, live in code BEFORE Migration C1 dropped the trigger — correct sequencing, Pitfall 1 honored), (3) `email_suppressions` table check, (4) `notification_settings.email && .leases`; any `false` stamps `delivery_status='suppressed'` (line 274-277) and the in-app notification is already recorded |
| 4 | Each delivered reminder also creates an in-app notification via the Phase 52 write-path (REMIND-05) | VERIFIED | `index.ts` lines 251-268: `create_notification` RPC called with `p_type: 'lease_renewal_reminder'`, `p_action_url: '/leases/' + row.lease_id` — called unconditionally for every claimed row, BEFORE the `shouldEmail()` gate (A1: in-app for all tiers regardless of email suppression); Migration A extends `notifications_notification_type_check` to include `'lease_renewal_reminder'` (verified present in the applied migration) so the RPC cannot raise `23514` |
| 5 | Delivery only enabled after a backlog dry-run counts and expires/clears queued `lease_reminders` (no reminder storm) (REMIND-04) | VERIFIED (mechanism) — gate deliberately unflipped | Migration C1 (APPLIED) executes in order: `RAISE NOTICE` backlog count -> `UPDATE ... delivery_status='expired' WHERE delivery_status='pending'` -> drop the n8n trigger/fn; Migration C2 (`20260722014000_lease_reminders_delivery_flip.sql`, committed, **deliberately UNAPPLIED**) contains only the flag flip and is explicitly gated by `53-GO-LIVE-RUNBOOK.md` Step 4's four preconditions. This is the designed REMIND-04 gate itself, not a defect — see Human Verification #3 |

**Score:** 5/5 truths verified at the mechanism/artifact level. Live, end-to-end delivery (an actual email reaching an actual owner) is not yet true in prod — it is explicitly and correctly gated behind an unapplied migration and an undeployed-this-session edge function, by design (REMIND-04's own requirement).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260722005310_lease_reminders_delivery_state.sql` | delivery-state columns + CHECK extension + flag seed + claim RPC | VERIFIED | Applied to prod (commit `c7a368a21`); contains `lease_reminders_delivery_status_check`, `idx_lease_reminders_pending`, `lease_renewal_reminder` in the type CHECK, `reminders_delivery_enabled','false'` seed, `claim_lease_reminders(int)` with `for update skip locked` + service_role-only grants |
| `supabase/migrations/20260722012107_send_lease_reminders_drain_cron.sql` | invoke fn + cron.schedule | VERIFIED | Applied to prod (commit `0efc9a6ee`); `invoke_send_lease_reminders()` SECURITY DEFINER + `cron.schedule('send-lease-reminders-drain','30 6 * * *')`; `revoke all ... from public, anon, authenticated` present |
| `supabase/migrations/20260722013850_lease_reminders_goflip.sql` (C1) | count + expire backlog + drop n8n hop, NO flip | VERIFIED | Applied to prod (commit `fad0db5c6`); statement order matches plan exactly; flag key appears nowhere as an UPDATE target |
| `supabase/migrations/20260722014000_lease_reminders_delivery_flip.sql` (C2) | single flag-flip statement | VERIFIED (file) / UNAPPLIED (prod) | File committed, single `update ... set value='true' where key='reminders_delivery_enabled'` statement, header explicitly marks it DO NOT APPLY until the runbook gate clears — intentional |
| `supabase/functions/send-lease-reminders/index.ts` | drainer: bearer auth, flag gate, claim, in-app-always, ordered suppression, send, stamp | VERIFIED | 345 lines; contains every required primitive (`timingSafeEqualStr`, `reminders_delivery_enabled`, `claim_lease_reminders`, `create_notification`, `lease_renewal_reminder`, `idempotencyKey: row.id`, `GROWTH_AND_MAX_PLANS`, no `checkTierEntitlement`); `bun run typecheck` exits 0 |
| `supabase/functions/tests/send-lease-reminders-test.ts` | branch-matrix Deno test | VERIFIED (structural) / NOT EXECUTED | 404 lines, 10 `Deno.test` cases covering flag-off/4 suppression layers/entitled-clear/re-drain/bad-bearer/missing-bearer; contains `fetchCount`, `create_notification`, `Idempotency-Key`; `deno` binary unavailable in this environment so the actual run could not be reproduced — see Human Verification #4 |
| `supabase/config.toml` `[functions.send-lease-reminders]` | verify_jwt=false + import_map | VERIFIED | Lines 484-486: `verify_jwt = false`, `import_map = "./functions/deno.json"` |
| `src/components/notifications/notification-item.tsx` | `lease_renewal_reminder` TYPE_VISUALS entry | VERIFIED | Line 35: `lease_renewal_reminder: { Icon: CalendarClock, chip: "icon-bg-primary" }`; `CalendarClock` imported from `lucide-react` |
| `tests/integration/rls/lease-reminders-delivery.rls.test.ts` | dual-client owner isolation + privilege boundary | VERIFIED (structural) / NOT EXECUTED | 212 lines, 8 `it` cases: owner-scoped SELECT on delivery columns, cross-owner isolation (lease_reminders + lease_renewal_reminder notifications), `claim_lease_reminders`/`create_notification` privilege-denied via `REVOKED_CODES`, INSERT/UPDATE write-denied. Run deferred to CI `rls-security` (needs `.env.local` + live prod) — see Human Verification #5 |
| `.planning/phases/53-renewal-reminder-delivery/53-GO-LIVE-RUNBOOK.md` | owner go-live sequence | VERIFIED | 215 lines, 7-step ordered runbook (C1 verify -> deploy -> secret -> drain_url -> pre-flip gate -> C2 -> post-go-live verify + rollback) |
| `scripts/deploy-edge-functions.ts` | `send-lease-reminders` registered for disk-reading deploy | VERIFIED | Line 42: `{ slug: "send-lease-reminders", entrypoint: "index.ts", verify_jwt: false }` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `claim_lease_reminders` | `lease_reminders` | `UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED) RETURNING` | WIRED | Present verbatim in the applied Migration A |
| `app_config.reminders_delivery_enabled` | `send-lease-reminders` early-return | flag row read via `.eq('key','reminders_delivery_enabled')` | WIRED | `index.ts` lines 194-204; `flag?.value !== 'true'` -> 200 skip |
| `send-lease-reminders/index.ts` | `public.claim_lease_reminders` | `supabase.rpc('claim_lease_reminders', { p_limit: 100 })` | WIRED | `index.ts` line 210-213 |
| `send-lease-reminders/index.ts` | `public.create_notification` | `supabase.rpc('create_notification', { p_type: 'lease_renewal_reminder', ... })` | WIRED | `index.ts` lines 254-262, unconditional (before suppression gate) |
| `send-lease-reminders/index.ts` | Resend | `sendEmail({ idempotencyKey: row.id })` | WIRED | `index.ts` lines 283-294 |
| cron job `send-lease-reminders-drain` | `invoke_send_lease_reminders()` | `cron.schedule('send-lease-reminders-drain','30 6 * * *', ...)` | WIRED | Migration B, applied |
| `invoke_send_lease_reminders()` | `send-lease-reminders` edge fn | `net.http_post(reminders.drain_url, Bearer reminders.drain_secret)` | WIRED (code) / INERT (prod, empty `drain_url`) | `invoke_send_lease_reminders()` early-returns on empty URL by design until the owner fills `reminders.drain_url` (Human Verification #2) |

### Data-Flow Trace (Level 4)

Not applicable in the standard UI-rendering sense — this phase's "data flow" is the drain pipeline itself, traced above as Key Links. One notable trace: `notification-item.tsx` TYPE_VISUALS is a cosmetic mapping (icon-only); it does not gate rendering — `FALLBACK_VISUAL` already covers unmapped types, so its absence would not have hidden a delivery failure, correctly scoped as cosmetic per the plan.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Drainer contains every required primitive | `grep` for `timingSafeEqualStr`, `reminders_delivery_enabled`, `claim_lease_reminders`, `create_notification`, `lease_renewal_reminder`, `idempotencyKey: row.id`, `GROWTH_AND_MAX_PLANS`, absence of `checkTierEntitlement` | All 8 present/absent as expected | PASS |
| `bun run typecheck` | `tsc --noEmit` | Exits 0, no errors | PASS |
| No debt markers in phase-53 files | `grep -E "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER"` across all 9 phase-53 files | Zero matches | PASS |
| Migration C1 tail has no flag flip; C2 has only the flip | `tail` inspection of both files | Confirmed: C1 ends on `drop function ... notify_n8n_lease_reminder()`; C2's only statement is the flag UPDATE | PASS |
| D-01 preserved: `queue_lease_reminders()` untouched | `grep` across `supabase/migrations/` for redefinition in phase-53 files | Only the original `20260222120000_phase56_pg_cron_jobs.sql` defines it; no phase-53 migration touches it | PASS |
| Edge fn source is deploy-fidelity safe (ASCII check) | `LC_ALL=C grep '[^ -~\t]'` | Contains non-ASCII em-dashes in comments only (not code logic); the SUMMARY correctly flags this to route deploy through the disk-reading script, not MCP | INFO (handled, not a gap) |

### Probe Execution

| Probe | Command | Result | Status |
|-------|---------|--------|--------|
| `deno test` (branch-matrix, `send-lease-reminders-test.ts`) | `deno test --allow-all --no-check --import-map=supabase/functions/deno.json supabase/functions/tests/send-lease-reminders-test.ts` | `deno: command not found` | MISSING_TOOLING — deno is not installed in this verification environment; structural grep fallback (see Behavioral Spot-Checks) passed, but the actual RED->GREEN execution has never been observed. Routed to Human Verification #4 |
| RLS integration test (`lease-reminders-delivery.rls.test.ts`) | `bun run test:integration -- lease-reminders-delivery.rls.test.ts` | Not run (requires `.env.local` + live prod credentials, per project convention routed to CI `rls-security`) | DEFERRED — routed to Human Verification #5 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| REMIND-01 | 53-02, 53-03, 53-04 | In-house drainer replaces n8n hop | SATISFIED (mechanism) / gated for live-prod | Drainer code + drain cron + n8n-drop all applied; delivery not yet flipped on |
| REMIND-02 | 53-01, 53-02 | Exactly-once delivery (delivery-state + SKIP LOCKED + Idempotency-Key) | SATISFIED | Migration A applied; `index.ts` idempotencyKey + terminal stamping confirmed |
| REMIND-03 | 53-02 | All suppression layers honored, CI guard re-ported | SATISFIED | `shouldEmail()` ordered 4-layer gate confirmed in code |
| REMIND-04 | 53-01, 53-04 | Backlog dry-run gate before enabling sends | SATISFIED (mechanism) / gate correctly unflipped | C1 (count+expire+drop) applied; C2 (flip) deliberately unapplied pending owner runbook |
| REMIND-05 | 53-01, 53-02 | In-app notification created per delivered reminder | SATISFIED | `create_notification('lease_renewal_reminder', ...)` called unconditionally per row |

No orphaned requirements — REMIND-01 through REMIND-05 are the full Phase 53 requirement set per `.planning/REQUIREMENTS.md` traceability table, and all five are claimed across the four plans' frontmatter with no gaps.

### Anti-Patterns Found

None in the phase-53-modified files. No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers, no empty handlers, no hardcoded-empty stub returns. The one `placeholder-client-id`/`placeholder-secret` match in `supabase/config.toml` (lines 289/291) is a pre-existing, unrelated OAuth provider stub not touched by this phase.

### Human Verification Required

See YAML frontmatter `human_verification` for the full structured list. Summary: (1) deploy `send-lease-reminders` and confirm it's live with the full suppression stack, (2) wire `REMINDERS_INVOKE_SECRET` + `app_config.reminders.drain_secret`/`drain_url`, (3) apply Migration C2 only after the runbook's four preconditions are green, (4) run the Deno branch-matrix test (tooling unavailable this session), (5) run the RLS integration test against prod (routed to CI), (6) confirm a real post-go-live email + in-app notification land and CI synthetic owners are suppressed.

None of these are code gaps — every one is either (a) an intentionally deferred owner-run go-live action explicitly designed as the REMIND-04 gate itself, or (b) a test-execution step blocked by missing local tooling / prod credentials rather than a missing/incorrect implementation. The full, ordered sequence is documented in `53-GO-LIVE-RUNBOOK.md`.

### Gaps Summary

No implementation gaps found. All four plans' must-haves are present, substantive, and correctly wired in the codebase: the delivery-state model, the claim RPC, the drainer's bearer-auth/flag-gate/claim/in-app-always/ordered-suppression/send/stamp pipeline, the drain cron, the backlog-expire-and-n8n-removal migration, and the split go-live flip are all exactly as specified and — where MCP-verifiable this session — confirmed applied to prod. The only reason this phase is not `passed` is that REMIND-04's own design requires an irreversible, owner-authorized flag flip (Migration C2) preceded by an edge-function deploy that is PAT-blocked in this session; that gate is the intended checkpoint, not a defect, and status is `human_needed` accordingly per the verification decision tree (human items take priority over an otherwise-clean score).

---

*Verified: 2026-07-22T01:42:22Z*
*Verifier: Claude (gsd-verifier)*
