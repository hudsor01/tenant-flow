# Supabase Security Advisor — Documented Steady State (v3.0 Security Hardening)

**Captured:** 2026-06-02 via `mcp__supabase__get_advisors({ type: "security" })` against prod `bshjmbshupiibfiewpxb` (read-only). **Milestone:** v3.0 Security Hardening, **Phase 3** (closing). **Requirement:** SECTEST-03.

This is the consolidated end-state of the v3.0 milestone. It supersedes the in-progress notes in [CYCLE-1.md](CYCLE-1.md) / [CYCLE-2.md](CYCLE-2.md) / [CYCLE-3.md](CYCLE-3.md) as the single steady-state reference.

## Live advisor end-state

| Lint | Level | Count | Disposition |
|------|-------|-------|-------------|
| `authenticated_security_definer_function_executable` (0029) | WARN | **44** | **BY DESIGN — documented KEEP set** |
| `rls_enabled_no_policy` (0008) | INFO | **0** | **RESOLVED** (was 10) |
| `pg_graphql_authenticated_table_exposed` (0027) for the 5 Tier-A tables | — | **0** | **RESOLVED** (vestigial authenticated grants revoked) |
| `auth_leaked_password_protection` | WARN | **1** | **OUT OF SCOPE** (paid HaveIBeenPwned feature, intentionally disabled) |

Verified this phase: the 2 tightened functions (`get_lead_paint_compliance_report`, `assert_can_create_lease`) are **absent** from the WARN list; `audit_for_all_policies` is **present by design** (it keeps its `authenticated` grant under an `is_admin()` body gate — the advisor checks grants, not function bodies, so it stays listed).

## What v3.0 did

- **Phase 1** (PR #776, migration `20260602202339`): classified all 46 `authenticated_security_definer` functions (**43 KEEP / 2 TIGHTEN / 1 REVIEW** — see [CYCLE-2.md](CYCLE-2.md)) and tightened 3 → count **46 → 44**. The 2 TIGHTEN dropped off; `audit_for_all_policies` (REVIEW) was gated, not revoked, so it stays flagged by design.
- **Phase 2** (PR #777, migration `20260602230717`): added an explicit `service_role_only` FOR ALL policy to all 10 `rls_enabled_no_policy` tables + revoked the 5 vestigial Tier-A `authenticated` grants → `rls_enabled_no_policy` **10 → 0**, lint 0027 cleared for the 5 Tier-A tables (see [CYCLE-3.md](CYCLE-3.md)).
- **Phase 3** (this phase): verified the steady state above + this consolidation doc.

## Why the 44 are KEEP (do NOT blanket-revoke)

The 44 remaining `authenticated_security_definer` WARNs are the documented intentional set: 41 genuine frontend RPCs that gate internally on `auth.uid()`/owner-scope/`is_admin()` + the 2 RLS-policy helpers `is_admin` & `get_current_owner_user_id` (authenticated must evaluate them for `{authenticated}`-scoped policies) + `audit_for_all_policies` (kept under an `is_admin()` body gate). Revoking authenticated EXECUTE would break the app or RLS. Per-function evidence: [CYCLE-2.md](CYCLE-2.md).

## Verification & monitoring

- **In-CI gate (SECTEST-03):** the `rls-security` integration suite — `tests/integration/rls/anon-rpc-grants.rls.test.ts` (anon + the tightened-from-authenticated pins + the KEEP-helper reachability), `tests/integration/rls/rls-no-policy-lockdown.rls.test.ts` (authenticated + anon deny on all 10 locked tables), and `tests/integration/rls/for-all-audit.test.ts` (the `is_admin()` gate) — runs green against prod on every PR. This is the authoritative zero-regression gate.
- **Out-of-band oracle:** the Supabase Security Advisor is **NOT run in CI** (no workflow invokes `get_advisors`). It is a second, out-of-band monitor that re-flags any grant/policy regression (e.g. a re-added authenticated grant re-trips lint 0027; a dropped policy re-trips lint 0008). The integration suite is the in-CI catch; the advisor is the periodic external catch.
- **Project memory:** `security-definer-advisor-state` records this steady state (44 / 0 / 1) — verified accurate against this live re-run, no drift.
