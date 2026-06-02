# Roadmap: TenantFlow

## Milestones

- ✅ **v1.0 Marketing Surface Honesty** — Phases 1-15 (shipped 2026-05-22) — see [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 Dashboard Command Center** — Phases 1-7 (shipped 2026-06-02, 34/34 requirements) — see [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)
- 🚧 **v3.0 Security Hardening** — Phases 1-3 (in progress, started 2026-06-02) — drive the Supabase Security Advisor on prod (`bshjmbshupiibfiewpxb`) to a documented, test-pinned steady state. See phase detail below.

## Phases

- [ ] **Phase 1: SECURITY DEFINER Classification & Tightening** - Classify all 46 authenticated SECURITY DEFINER functions and revoke `authenticated` EXECUTE from the few that no signed-in account should reach.
- [ ] **Phase 2: RLS-No-Policy Resolution** - Make the fail-closed lockdown explicit on all 10 `rls_enabled_no_policy` tables and revoke the vestigial `authenticated` GraphQL-exposing grants.
- [ ] **Phase 3: Documented Advisor Steady State & Verification** - Re-run the advisor against prod, prove the only remaining findings are the documented KEEP set, and pin zero RLS regressions across the full integration suite.

## Phase Details

### Phase 1: SECURITY DEFINER Classification & Tightening
**Goal**: Every authenticated SECURITY DEFINER WARN is provably intentional or eliminated — a durable classification doc explains each of the 46 functions, and the three that no signed-in account should reach have `authenticated`/`PUBLIC` EXECUTE revoked (with `service_role` retained).
**Depends on**: Nothing (first phase)
**Requirements**: SDEF-01, SDEF-02, SDEF-03, TIGHTEN-01, TIGHTEN-02, TIGHTEN-03, SECTEST-01
**Success Criteria** (what must be TRUE):
  1. A durable classification doc (`.planning/anon-exec-audit/` lineage) records all 46 `authenticated_security_definer_function_executable` functions as KEEP / TIGHTEN / REVIEW, each with live evidence (frontend `.rpc` reachability, RLS-policy reference, trigger/cron attachment, internal-caller graph), and every KEEP entry carries a one-line intentional-EXECUTE rationale.
  2. The 7 analytics/admin KEEP RPCs (`get_deliverability_stats`, `get_funnel_stats`, `get_gate_conversion_stats`, `get_billing_insights`, `get_error_summary`, `get_error_prone_users`, `get_common_errors`) are each confirmed to gate on `is_admin()` internally; any missing gate is fixed (grant kept), verified by live introspection.
  3. `anon`/`authenticated` calling `.rpc('get_lead_paint_compliance_report')` returns a revoked-EXECUTE error code, while `service_role` still executes it (PROD migration via MCP `apply_migration`, `REVOKE FROM PUBLIC` then re-`GRANT service_role`, timestamp reconciled).
  4. `assert_can_create_lease`'s live overload/call-graph is resolved and its `authenticated`/`PUBLIC` EXECUTE is revoked (`service_role` retained) with `bulk_import_create_lease`'s internal invariant enforcement still passing its existing integration test.
  5. `audit_for_all_policies` no longer exposes the policy inventory to an arbitrary signed-in account — either tightened to `service_role` (its test migrated to a service-role/admin client) or kept with an explicit `is_admin()` internal gate — and `tests/integration/rls/` pins each tightened function unreachable from `authenticated` while confirming the KEEP RLS helpers (`is_admin`, `get_current_owner_user_id`) remain reachable.
**Plans**: 2 plans
  - [ ] 01-01-PLAN.md — Durable classification doc (CYCLE-2.md): 46-function KEEP/TIGHTEN/REVIEW verdicts + KEEP rationale + 7-RPC admin-gate spot-check + assert_can_create_lease signature/caller/owner resolution (SDEF-01/02/03)
  - [ ] 01-02-PLAN.md — Atomic tighten migration (REVOKE FROM PUBLIC + re-GRANT service_role on get_lead_paint_compliance_report + assert_can_create_lease(uuid,uuid); is_admin() body gate on audit_for_all_policies) + extend anon-rpc-grants.rls.test.ts + bulk-import safety verify (TIGHTEN-01/02/03, SECTEST-01)

### Phase 2: RLS-No-Policy Resolution
**Goal**: All 10 `rls_enabled_no_policy` tables carry an explicit, intent-documenting policy that clears lint 0008, and the 5 vestigial `authenticated` table-grants are revoked so prod schema is no longer discoverable via `pg_graphql` introspection — without re-introducing the deny-all removed in `20260527151342`.
**Depends on**: Phase 1
**Requirements**: RLSNP-01, RLSNP-02, RLSNP-03, SECTEST-02
**Success Criteria** (what must be TRUE):
  1. Intent is confirmed and recorded for the 4 ambiguous Tier-A tables (`app_config`, `email_suppressions`, `security_events`, `stripe_webhook_events`) — each verified to have no expected `authenticated` read path before lockdown, or given a correct scoped policy instead if a real read path is found.
  2. All 10 tables (`app_config`, `email_suppressions`, `processed_internal_events`, `security_events`, `stripe_webhook_events`, `security_audit_log`, `user_access_log`, `webhook_attempts`, `webhook_events`, `webhook_metrics`) get an explicit positive `service_role_only` FOR ALL TO service_role policy (`USING (true) WITH CHECK (true)`), or a correct scoped policy where authenticated access is genuinely needed — applied as a PROD migration via MCP `apply_migration` with no RESTRICTIVE deny-all anywhere.
  3. The vestigial `authenticated` table-grant is revoked on the 5 Tier-A tables (`app_config`, `email_suppressions`, `processed_internal_events`, `security_events`, `stripe_webhook_events`) so they no longer surface in `/graphql/v1` introspection for signed-in users (lint 0027 cleared).
  4. `tests/integration/rls/` pins all 10 resolved tables denying `authenticated`/`anon` and allowing `service_role`, per each table's confirmed intent.
**Plans**: TBD

### Phase 3: Documented Advisor Steady State & Verification
**Goal**: The Supabase Security Advisor on prod is at a documented, test-pinned steady state — `rls_enabled_no_policy` is 0, the only remaining authenticated SECURITY DEFINER WARNs are the documented KEEP set, the project memory and audit trail reflect it, and the full RLS integration suite is green against prod with zero regressions.
**Depends on**: Phase 2
**Requirements**: SECTEST-03
**Success Criteria** (what must be TRUE):
  1. Re-running `get_advisors(security)` against prod (`bshjmbshupiibfiewpxb`) returns `rls_enabled_no_policy = 0`.
  2. The only remaining `authenticated_security_definer_function_executable` WARNs are exactly the documented KEEP set from Phase 1 (the 3 tightened functions no longer appear); `auth_leaked_password_protection` remains the sole out-of-scope WARN.
  3. The `security-definer-advisor-state` memory and `.planning/anon-exec-audit` are updated to record the new steady state (counts, KEEP rationale, tightened set, intent decisions).
  4. The full `tests/integration/rls/` suite runs green against prod (`rls-security` CI gate passing), confirming zero owner-isolation or grant regressions from any Phase 1 or Phase 2 change.
**Plans**: TBD

---

<details>
<summary>✅ v2.0 Dashboard Command Center (Phases 1-7) — SHIPPED 2026-06-02</summary>

- [x] Phase 1: Foundation & Dedup (3/3 plans) — PR #744 — completed 2026-05-22
- [x] Phase 2: Data Layer & RPC (3/3 plans) — PR #745 — completed 2026-05-22
- [x] Phase 3: KPI Bento Row (3/3 plans) — PR #746 — completed 2026-05-26
- [x] Phase 4: Charts (4/4 plans) — PR #748 — completed 2026-05-28
- [x] Phase 5: Portfolio DataTable (5/5 plans) — PR #763 — completed 2026-05-31
- [x] Phase 6: Polish & A11y (4/4 plans) — PR #767 — completed 2026-06-01
- [x] Phase 7: Verification (2/2 plans) — PR #773 — completed 2026-06-02

Closed at 34/34 requirements (KPI-01..07, CHART-01..06, DT-01..09, POLISH-01..12). Full phase detail + success criteria in [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md); milestone summary in [MILESTONES.md](MILESTONES.md).

</details>

<details>
<summary>✅ v1.0 Marketing Surface Honesty (Phases 1-15) — SHIPPED 2026-05-22</summary>

- [x] Phase 1: Critical Stop-Bleed (Blog Unpublish + Pricing Placeholder) (2/2 plans) — PR #686
- [x] Phase 2: Frontend Correctness (NumberTicker + Mobile) (2/2 plans) — PR #687
- [x] Phase 3: Routing & Legal-URL Aliases (1/1 plan) — merged inline
- [x] Phase 4: Persona & Copy Honesty (2/2 plans) — PR #688
- [x] Phase 5: Pricing Restructure (2/2 plans) — PR #689
- [x] Phase 6: Blog Rebuild + n8n Redesign (4/4 plans) — PR #690
- [x] Phase 7: Pricing-Card Chrome (2/2 plans) — PR #735
- [x] Phase 8: Nav, Active States & Dead Links (1/1 plan) — PR #736
- [x] Phase 9: Page-Level Cleanup (1/1 plan) — PR #737
- [x] Phase 10: CTA & Conversion Standardization (2/2 plans) — PR #738 + #739 (followup)
- [x] Phase 11: Design-Token Alignment & Resources Page (2/2 plans) — PR #740
- [x] Phase 12: SEO Metadata, Schema & Content Cleanup (3/3 plans) — PR #741
- [x] Phase 13: Performance & Conversion Polish (1/1 plan) — PR #742
- [x] Phase 14: Battle Test Findings Remediation (4/4 plans) — PR #705 + #708/#718-#724 followups
- [x] Phase 15: v1.0 Milestone Cleanup (5/5 plans) — PR #743

Audit round 3 verdict: PERFECT BY ALL MEASURES. Full detail in [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) + [milestones/v1.0-MILESTONE-AUDIT.md](milestones/v1.0-MILESTONE-AUDIT.md).

</details>

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. SECURITY DEFINER Classification & Tightening | v3.0 | 0/2 | Planned | - |
| 2. RLS-No-Policy Resolution | v3.0 | 0/TBD | Not started | - |
| 3. Documented Advisor Steady State & Verification | v3.0 | 0/TBD | Not started | - |

## Coverage Validation

All 12 v3.0 requirements mapped to exactly one phase. No orphans, no double-mapping.

| REQ-ID | Phase | Category |
|--------|-------|----------|
| SDEF-01 | Phase 1 | Authenticated SECURITY DEFINER classification |
| SDEF-02 | Phase 1 | Authenticated SECURITY DEFINER classification |
| SDEF-03 | Phase 1 | Authenticated SECURITY DEFINER classification |
| TIGHTEN-01 | Phase 1 | Least-privilege tightening |
| TIGHTEN-02 | Phase 1 | Least-privilege tightening |
| TIGHTEN-03 | Phase 1 | Least-privilege tightening |
| SECTEST-01 | Phase 1 | Regression coverage (function tightening) |
| RLSNP-01 | Phase 2 | RLS-no-policy resolution |
| RLSNP-02 | Phase 2 | RLS-no-policy resolution |
| RLSNP-03 | Phase 2 | RLS-no-policy resolution |
| SECTEST-02 | Phase 2 | Regression coverage (table lockdown) |
| SECTEST-03 | Phase 3 | Documented steady state + zero-regression verification |

**Coverage:** 12/12 requirements mapped ✓

## Cross-Cutting Constraints (apply to every phase)

- Every grant/policy change is a PROD migration via Supabase MCP `apply_migration`; reconcile the repo filename with the prod-assigned timestamp per `migration-mcp-prod-drift` (run `mcp__supabase__list_migrations` after each MCP apply).
- `REVOKE FROM PUBLIC` is load-bearing: a bare `REVOKE FROM authenticated` is a no-op while the PUBLIC grant stands. Each function tightening must `REVOKE FROM PUBLIC` then re-`GRANT` only `service_role`.
- Never re-introduce the deny-all/RESTRICTIVE rule removed in `20260527151342` (rejected per `AUDIT-2026-05-29`). Use positive `service_role_only` FOR ALL policies only.
- TIGHTEN revokes grants; it does NOT DROP functions (lower risk, reversible).
- The integration suite is PostgREST-only — it cannot introspect `pg_proc.proacl`. Pin grant state via the advisor + `.rpc()` reachability probes (`anon-rpc-grants` / `admin-rpc-grants` pattern), not by reading catalogs from the test.
- Each phase ships as ONE atomic PR through the perfect-PR gate (two consecutive zero-finding deep review cycles). Branch protection on `main` requires `checks` + `e2e-smoke` + `rls-security`.
- `auth_leaked_password_protection` is OUT of scope (paid HaveIBeenPwned feature, intentionally disabled).

---
*Last updated: 2026-06-02 — v3.0 Security Hardening roadmap created (3 phases, 12/12 requirements mapped). v2.0 Dashboard Command Center + v1.0 Marketing Surface Honesty archived above.*
