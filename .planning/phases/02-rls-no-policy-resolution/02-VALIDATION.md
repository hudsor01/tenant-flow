---
phase: 2
slug: rls-no-policy-resolution
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-02
plan_map:
  02-introspect: 02-01-PLAN.md (Task 1) — Wave 1
  02-mig: 02-01-PLAN.md (Task 2) — Wave 1
  02-test: 02-02-PLAN.md (Task 1) — Wave 2
  02-regress: 02-02-PLAN.md (Task 2) — Wave 2
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `02-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + `@supabase/supabase-js` (publishable/anon key + ownerA/ownerB JWTs) |
| **Config file** | `tests/integration/` (run via `bun run test:integration`); CI `.github/workflows/rls-security-tests.yml` |
| **Quick run command** | `bun run test:integration -- --run tests/integration/rls/rls-no-policy-lockdown.rls.test.ts` |
| **Full suite command** | `bun run test:integration` (hits prod; needs `.env.local` creds; ~45 sign-ins/min cap) |
| **Advisor oracle** | `mcp__supabase__get_advisors({ type: "security" })` — `rls_enabled_no_policy` (lint 0008) + `pg_graphql_authenticated_table_exposed` (lint 0027) |
| **Estimated runtime** | ~60–120 seconds (full integration suite, prod round-trips) |

---

## Sampling Rate

- **After every task commit:** `bun run validate:quick` (types + lint + unit) + the touched test file in `--run` mode.
- **Per migration apply:** `get_advisors(security)` snapshot (lint 0008 count + 0027 list) BEFORE vs AFTER.
- **After the wave / pre-PR:** full `bun run test:integration` + `get_advisors(security)` showing `rls_enabled_no_policy` 10 → 0.
- **Before `/gsd:verify-work`:** full suite green + advisor delta recorded.
- **Max feedback latency:** ~120 seconds.

---

## Per-Task Verification Map

| Task ID | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command / Oracle | File Exists | Status |
|---------|------|-------------|------------|-----------------|-----------|-----------------------------|-------------|--------|
| 02-introspect | 1 | RLSNP-01 | T-stale-state | Live per-table policy/grant state captured (repo migrations contradict the advisor — A1) before any DDL | **intentional manual gate** (live MCP introspection; no automated proxy exists — the CYCLE-3.md recorded content IS the acceptance oracle) | `execute_sql` pg_policies + aclexplode per table → record in CYCLE-3.md | ❌ W1 | ⬜ pending |
| 02-mig | 1 | RLSNP-02, RLSNP-03 | T-overlock / T-deny-all-reintro | 10× `service_role_only FOR ALL TO service_role USING(true) WITH CHECK(true)`; `REVOKE … FROM authenticated` on the 5 Tier-A tables (+ defensive anon/PUBLIC). No RESTRICTIVE/deny-all. | migration (MCP apply) + advisor oracle | grep migration shape; `get_advisors` 0008 10→0; 0027 drops the 5 tables; timestamp reconciled | ❌ W1 (new migration) | ⬜ pending |
| 02-test | **2** | SECTEST-02 (deny) | T-overlock | authenticated + anon DENIED on all 10 (no read leak) | integration | `bun run test:integration -- --run tests/integration/rls/rls-no-policy-lockdown.rls.test.ts` | ❌ W2 (new test, Plan 02-02) | ⬜ pending |
| 02-regress | **2** | SECTEST-02 | T-foralltest-retrip | the new service_role FOR ALL policies do NOT re-trip `for-all-audit.test.ts` (Phase 1 rewrote it to anticipate them) | integration | `bun run test:integration -- --run tests/integration/rls/for-all-audit.test.ts` | ✅ exists | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `tests/integration/rls/rls-no-policy-lockdown.rls.test.ts` — new file: SECTEST-02 deny side for all 10 tables (authenticated + anon). Reuses `createTestClient`/`getTestCredentials` + an anon client from the publishable key (pattern: `anon-rpc-grants.rls.test.ts`).
- [ ] Live introspection SQL (research A1) is a **plan/execute-time prerequisite**, not a test file — repo migrations contradict the live advisor about which policies currently exist, so the executor MUST introspect prod before authoring the migration.

*No framework install needed — the integration harness + `rls-security` CI job already exist.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `rls_enabled_no_policy` lint 10 → 0 | RLSNP-02 | Advisor is an external Supabase service, not introspectable from the PostgREST-only harness | `mcp__supabase__get_advisors({type:'security'})` before + after; record delta |
| lint 0027 drops the 5 Tier-A tables | RLSNP-03 | Same advisor oracle | Confirm the 5 tables absent from `pg_graphql_authenticated_table_exposed` post-revoke |
| service_role still reads/writes all 10 (allow side) | SECTEST-02 | The `rls-security` harness has NO service-role key (correctly) — cannot test the allow side from CI | MCP `execute_sql` as service_role returns rows; lint 0008=0 proves a policy exists; service_role writers (stripe-webhooks, notify_n8n) keep functioning |

*The integration suite is PostgREST-only; the deny side is pinned via `.from()` probes, the allow side via the advisor + MCP introspection.*

---

## Validation Sign-Off

- [x] All tasks have an `<automated>` verify or a documented out-of-band oracle (02-introspect is an intentional manual gate; allow-side is the advisor oracle)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify/oracle
- [x] Wave 0 covers the new test file (02-test, Plan 02-02) + the introspection prerequisite (02-introspect, Plan 02-01)
- [x] No watch-mode flags (integration runs `--run`)
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set; per-task map mapped to plans/tasks/waves

**Approval:** planned (per-task map covered by 02-01 + 02-02)
