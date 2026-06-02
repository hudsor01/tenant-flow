---
phase: 1
slug: security-definer-classification-tightening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-02
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `01-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (integration project) |
| **Config file** | `tests/integration/` + `tests/integration/tsconfig.json` (runs via the `rls-security` CI job) |
| **Quick run command** | `bun run test:integration -- --run tests/integration/rls/anon-rpc-grants.rls.test.ts` |
| **Full suite command** | `bun run test:integration` (hits prod; needs `.env.local` creds; ~45 sign-ins/min cap) |
| **Advisor oracle** | `mcp__supabase__get_advisors({ type: "security" })` — the grant-state source of truth |
| **Estimated runtime** | ~60–120 seconds (full integration suite, prod round-trips) |

---

## Sampling Rate

- **After every task commit:** Run the touched test file in `--run` mode (`anon-rpc-grants.rls.test.ts` or `bulk-import-create-lease.test.ts`).
- **After every plan wave / pre-PR:** Run `bun run test:integration` (full suite, prod) + `get_advisors(security)` delta showing 46 → 43 authenticated WARNs.
- **Before `/gsd:verify-work`:** Full suite green + advisor delta recorded in `CYCLE-2.md`.
- **Max feedback latency:** ~120 seconds.

---

## Per-Task Verification Map

| Task ID | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-class | 0 | SDEF-01, SDEF-02 | T-inventory-enum | All 46 classified KEEP/TIGHTEN/REVIEW + KEEP rationale in CYCLE-2.md | doc review | manual diff vs `research/CLASSIFICATION.md` | ❌ W0 (`CYCLE-2.md`) | ⬜ pending |
| 01-gate | 0 | SDEF-03 | T-under-revoke | 7 analytics RPCs show `is_admin()`/owner-scope gate; any bare gate fixed | live introspection | `execute_sql` `pg_get_functiondef` per fn → record in CYCLE-2.md | ✅ MCP | ⬜ pending |
| 01-mig | 1 | TIGHTEN-01, TIGHTEN-02, TIGHTEN-03 | T-over-revoke / T-bulk-bypass | `REVOKE FROM PUBLIC` + re-`GRANT service_role` on the 2 TIGHTEN fns; `is_admin()` gate added to `audit_for_all_policies` | migration (MCP apply) | `get_advisors(security)` delta 46→43; timestamp reconciled via `list_migrations` | ❌ W1 (new migration) | ⬜ pending |
| 01-test | 1 | SECTEST-01, TIGHTEN-01, TIGHTEN-02 | T-over-revoke / T-keep-helper-loss | tightened fns return a revoked-EXECUTE code from authenticated; `is_admin`/`get_current_owner_user_id` still reachable | integration | `bun run test:integration -- --run tests/integration/rls/anon-rpc-grants.rls.test.ts` | ⚠️ extends existing | ⬜ pending |
| 01-safety | 1 | TIGHTEN-02 | T-bulk-bypass | bulk-import invariant still enforced after revoke | integration | `bun run test:integration -- --run tests/integration/rls/bulk-import-create-lease.test.ts` | ✅ exists | ⬜ pending |
| 01-verify | 1 | SECTEST-01, TIGHTEN-03 | — | non-admin `audit_for_all_policies` returns 0 rows (no enumeration) | integration | `for-all-audit.test.ts` green (semantics shift) | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.planning/anon-exec-audit/CYCLE-2.md` — the durable classification doc (SDEF-01/02/03 evidence + TIGHTEN decisions + advisor delta). New file (continues the CYCLE-1 lineage).
- [ ] New `describe` block + `TIGHTENED_FROM_AUTHENTICATED` array in `anon-rpc-grants.rls.test.ts` — TIGHTEN-01/02 revoke probes + SECTEST-01.
- [ ] Positive `get_current_owner_user_id` reachability assertion (SECTEST-01 KEEP-helper contract).
- [ ] (Optional) positive 0-row assertion on `audit_for_all_policies` for a non-admin (TIGHTEN-03 leak-closure pin).

*No framework install needed — the integration harness + `rls-security` CI job already exist.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Advisor `authenticated_security_definer_function_executable` count drops 46 → 43 | TIGHTEN-01/02 | Advisor is an external Supabase service, not introspectable from the PostgREST-only test harness | Run `mcp__supabase__get_advisors({type:'security'})` before + after the migration; record the delta in `CYCLE-2.md` |
| `get_lead_paint_compliance_report` no longer flagged | TIGHTEN-01 | Same — advisor delta | Confirm the function is absent from the post-migration advisor WARN list |

*The integration suite is PostgREST-only and cannot read `pg_proc.proacl`; grant state is pinned via `.rpc()` reachability probes + the advisor oracle, not catalog reads.*

---

## Validation Sign-Off

- [ ] All tasks have an `<automated>` verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`CYCLE-2.md`, new test rows)
- [ ] No watch-mode flags (integration runs `--run`)
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter (after planner fills the per-task map)

**Approval:** pending
