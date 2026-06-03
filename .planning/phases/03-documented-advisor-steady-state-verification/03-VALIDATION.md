---
phase: 3
slug: documented-advisor-steady-state-verification
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-02
plan_map:
  03-advisor: 03-01-PLAN.md (Task 1) — Wave 1
  03-doc: 03-01-PLAN.md (Task 2) — Wave 1
---

# Phase 3 — Validation Strategy

> Verification + documentation phase (NO prod DDL). The validation IS the verification: the live advisor oracle + the existing RLS integration suite green in CI. No new test code; this phase pins the steady state Phases 1+2 produced.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 (integration project); existing `tests/integration/rls/` suite |
| **Config file** | `tests/integration/`; CI `.github/workflows/rls-security-tests.yml` (`rls-security` gate) |
| **Full suite command** | `bun run test:integration` (hits prod; needs `.env.local`; CI has `E2E_OWNER_*` secrets) |
| **Advisor oracle** | `mcp__supabase__get_advisors({ type: "security" })` — the steady-state source of truth |
| **Estimated runtime** | ~60–120 seconds |

---

## Sampling Rate

- **Per task:** `get_advisors(security)` read (Task 1); doc grep (Task 2).
- **Phase gate (SECTEST-03):** the full `rls-security` integration suite green on the Phase-3 PR (the 3 pinning files: `anon-rpc-grants`, `rls-no-policy-lockdown`, `for-all-audit`) + the recorded advisor steady state.
- **Max feedback latency:** ~120 seconds.

---

## Per-Task Verification Map

| Task ID | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command / Oracle | Status |
|---------|------|-------------|------------|-----------------|-----------|-----------------------------|--------|
| 03-advisor | 1 | SECTEST-03 | T-03-02 (undetected revert) | Live advisor confirms `rls_enabled_no_policy=0`, `authenticated_security_definer`=44 (the documented KEEP set; only get_lead_paint_compliance_report + assert_can_create_lease dropped off — audit_for_all_policies stays by design), password lint sole out-of-scope | **advisor oracle** (read-only) + CI suite | `get_advisors(security)` deltas; `rls-security` suite green on PR | ⬜ pending |
| 03-doc | 1 | SECTEST-03 | T-03-01 (mis-documentation) | `STEADY-STATE.md` consolidates the v3.0 end-state + pointers to CYCLE-2/3; `security-definer-advisor-state` memory verified accurate | doc review | grep STEADY-STATE.md for the advisor counts + CYCLE pointers | ⬜ pending |

---

## Wave 0 Requirements

- [ ] No new test file — the existing `tests/integration/rls/` suite (3 pinning files) IS the SECTEST-03 regression gate; it runs in CI `rls-security`.
- [ ] `.planning/anon-exec-audit/STEADY-STATE.md` — new consolidation doc (the phase deliverable).

*No framework install needed; no prod DDL.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why | Test Instructions |
|----------|-------------|-----|-------------------|
| Advisor `rls_enabled_no_policy` = 0 + `authenticated_security_definer` = 44 (documented KEEP) | SECTEST-03 | Advisor is an external Supabase service, not introspectable from the PostgREST harness; it is NOT run in CI (out-of-band monitor) | `mcp__supabase__get_advisors({type:'security'})` and record in STEADY-STATE.md |

*The in-CI gate is the `rls-security` integration suite; the advisor is the out-of-band second oracle.*

---

## Validation Sign-Off

- [x] All tasks have an automated oracle (advisor read + CI suite) or a doc-review verify
- [x] Sampling continuity met (2 tasks, both with an oracle)
- [x] Wave 0 = the steady-state doc (no new test file; existing suite is the gate)
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true`

**Approval:** planned (verification phase; the rls-security CI suite is the SECTEST-03 gate)
