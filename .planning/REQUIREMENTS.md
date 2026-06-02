# Requirements: TenantFlow v3.0 — Security Hardening

**Defined:** 2026-06-02
**Milestone goal:** Get the Supabase Security Advisor on prod (`bshjmbshupiibfiewpxb`) to a documented, test-pinned steady state — classify and resolve the remaining authenticated SECURITY DEFINER + RLS-no-policy findings with zero RLS regressions.
**Source:** `.planning/seeds/SEED-001-supabase-security-advisor-remediation.md` + `.planning/research/{ADVISOR-STATE,CLASSIFICATION,SUMMARY}.md` (live Supabase MCP introspection).

## v1 Requirements

### Authenticated SECURITY DEFINER classification (SDEF)

- [ ] **SDEF-01**: All 46 `authenticated_security_definer_function_executable` functions are classified KEEP / TIGHTEN / REVIEW with live evidence (frontend `.rpc` reachability, RLS-policy reference, trigger/cron attachment, internal-caller graph) captured in a durable doc.
- [ ] **SDEF-02**: Each KEEP function's intentional authenticated-EXECUTE rationale is documented (so every remaining WARN is provably by-design, not unreviewed).
- [ ] **SDEF-03**: The analytics/admin KEEP RPCs (`get_deliverability_stats`, `get_funnel_stats`, `get_gate_conversion_stats`, `get_billing_insights`, `get_error_summary`, `get_error_prone_users`, `get_common_errors`) are confirmed to gate on `is_admin()` internally; any missing gate is fixed (grant kept).

### Least-privilege tightening (TIGHTEN)

- [ ] **TIGHTEN-01**: `get_lead_paint_compliance_report` has `EXECUTE` revoked from `authenticated` (and `PUBLIC`); `service_role` retained. No authenticated caller exists.
- [ ] **TIGHTEN-02**: `assert_can_create_lease` call graph / overload is resolved against the live schema, then `EXECUTE` is revoked from `authenticated` (and `PUBLIC`) with `service_role` retained, without breaking `bulk_import_create_lease`'s internal invariant enforcement.
- [ ] **TIGHTEN-03**: `audit_for_all_policies` is resolved — tightened to `service_role` (test updated to a service-role/admin client) OR kept with an explicit `is_admin()` internal gate — so the policy inventory is not exposed to arbitrary signed-in accounts.

### RLS-no-policy resolution (RLSNP)

- [ ] **RLSNP-01**: Intent is confirmed for the 4 ambiguous Tier-A tables (`app_config`, `email_suppressions`, `security_events`, `stripe_webhook_events`) — verify no expected `authenticated` read path before locking down (if a real read path exists, add the correct scoped policy instead).
- [ ] **RLSNP-02**: All 10 `rls_enabled_no_policy` tables get an explicit policy that clears lint 0008 and documents intent in-migration (canonical `service_role_only` FOR ALL TO service_role for the locked-down tables; a correct scoped policy for any table found to need authenticated access).
- [ ] **RLSNP-03**: The vestigial `authenticated` table-grant is revoked on the 5 Tier-A tables (`app_config`, `email_suppressions`, `processed_internal_events`, `security_events`, `stripe_webhook_events`) so schema is no longer exposed via `pg_graphql` `/graphql/v1` introspection (lint 0027), without re-introducing the deny-all removed in `20260527151342`.

### Regression coverage + steady state (SECTEST)

- [ ] **SECTEST-01**: `tests/integration/rls/` pins each tightened function unreachable from `authenticated` and confirms the KEEP RLS helpers (`is_admin`, `get_current_owner_user_id`) remain reachable (extends the `anon-rpc-grants` / `admin-rpc-grants` patterns).
- [ ] **SECTEST-02**: `tests/integration/rls/` pins all 10 resolved tables deny `authenticated`/`anon` and allow `service_role` (per their confirmed intent).
- [ ] **SECTEST-03**: A documented advisor steady state — re-running `get_advisors(security)` shows `rls_enabled_no_policy = 0` and the only remaining `authenticated_security_definer_function_executable` WARNs are the documented KEEP set; `security-definer-advisor-state` memory + `.planning/anon-exec-audit` updated; full RLS integration suite green against prod (zero regressions).

## Future Requirements (deferred)

- Periodic advisor drift check in CI (the advisor is currently not run in CI — `security-definer-advisor-state` memory). Candidate for a later milestone; out of v3.0 scope to avoid CI-secret + flakiness surface.
- `search_path` hardening sweep on the broader function set (noted in `project_pending_followups_2026-05-29`) — separate concern from the advisor grant findings.

## Out of Scope

- **`auth_leaked_password_protection`** (advisor WARN) — paid Supabase HaveIBeenPwned feature, intentionally disabled. Explicitly excluded per user instruction.
- **Re-introducing a deny-all / RESTRICTIVE policy** on the RLS-no-policy tables — already rejected (`AUDIT-2026-05-29`, migration `20260527151342`). Resolution uses positive `service_role_only` policies only.
- **Dropping orphaned functions** — TIGHTEN revokes grants; it does not DROP functions (lower risk, reversible).
- **Anon-side SECURITY DEFINER work** — already complete (`anon_security_definer_function_executable` → 0 via PRs #758/#771).

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| SDEF-01 | Phase 1 | Pending |
| SDEF-02 | Phase 1 | Pending |
| SDEF-03 | Phase 1 | Pending |
| TIGHTEN-01 | Phase 1 | Pending |
| TIGHTEN-02 | Phase 1 | Pending |
| TIGHTEN-03 | Phase 1 | Pending |
| RLSNP-01 | Phase 2 | Pending |
| RLSNP-02 | Phase 2 | Pending |
| RLSNP-03 | Phase 2 | Pending |
| SECTEST-01 | Phase 1 | Pending |
| SECTEST-02 | Phase 2 | Pending |
| SECTEST-03 | Phase 3 | Pending |

**Coverage:** 12/12 requirements mapped to exactly one phase — no orphans, no double-mapping.
