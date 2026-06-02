# Authenticated-EXEC SECURITY DEFINER Audit — Cycle 2

**Continues:** [CYCLE-1.md](CYCLE-1.md) (anon-side lockdown → 0). This cycle classifies the **authenticated**-side surface and tightens the few functions no signed-in account should reach.

**Source:** Supabase Security Advisor `authenticated_security_definer_function_executable` (46 WARN) on prod `bshjmbshupiibfiewpxb`, captured 2026-06-02 via `mcp__supabase__get_advisors(security)`. Classification cross-verified live this session (`pg_proc`/`pg_policies`/`pg_trigger`/`cron.job` introspection + repo `.rpc()` grep). Milestone research: `.planning/research/{CLASSIFICATION,SUMMARY,ADVISOR-STATE}.md`.

**Phase:** v3.0 Security Hardening, Phase 1. **Requirements:** SDEF-01/02/03, TIGHTEN-01/02/03, SECTEST-01.

## Headline

46 flagged functions → **43 KEEP** (provably intentional, documented + test-pinned) + **2 TIGHTEN** (revoke authenticated/PUBLIC, keep service_role) + **1 REVIEW→gate** (`audit_for_all_policies`, internal `is_admin()` gate added, grant kept). 41 + 2 + 2 + 1 = 46. All 43 KEEP functions are either RLS-policy helpers the `authenticated` role must evaluate, or genuine frontend RPCs that gate internally on `auth.uid()`/owner-scope/`is_admin()` — so their `authenticated_security_definer_function_executable` WARN is **expected and correct by design**.

Post-migration advisor target: **46 → 44** (the 2 REVOKE'd functions drop off; `audit_for_all_policies` stays flagged because its authenticated grant is kept — the advisor checks grants, not function bodies).

## Verdict Roster (all 46 functions)

- KEEP `is_admin` — RLS-policy helper
- KEEP `get_current_owner_user_id` — RLS-policy helper
- KEEP `get_dashboard_data_v2` — frontend RPC, auth.uid() owner-scope
- KEEP `get_dashboard_stats` — frontend RPC, auth.uid() owner-scope
- KEEP `get_funnel_stats` — frontend RPC, is_admin() gate
- KEEP `get_expense_summary` — frontend RPC, auth.uid() owner-scope
- KEEP `bulk_import_create_lease` — frontend RPC, owner-scope + inline invariant
- KEEP `reassign_document_category` — frontend RPC, owner-scope
- KEEP `reorder_document_categories` — frontend RPC, owner-scope
- KEEP `cancel_account_deletion` — frontend RPC, auth.uid() self
- KEEP `get_financial_overview` — frontend RPC, auth.uid() owner-scope
- KEEP `get_deliverability_stats` — frontend RPC, is_admin() gate
- KEEP `request_account_deletion` — frontend RPC, auth.uid() self
- KEEP `get_billing_insights` — frontend RPC, owner-scope gate
- KEEP `get_maintenance_analytics` — frontend RPC, auth.uid() owner-scope
- KEEP `get_revenue_trends_optimized` — frontend RPC, auth.uid() owner-scope
- KEEP `get_occupancy_trends_optimized` — frontend RPC, auth.uid() owner-scope
- KEEP `get_property_performance_analytics` — frontend RPC, auth.uid() owner-scope
- KEEP `get_property_performance_with_trends` — frontend RPC, auth.uid() owner-scope
- KEEP `get_subscription_status` — frontend RPC, customer-scope
- KEEP `get_user_profile` — frontend RPC, auth.uid() self
- KEEP `get_user_sessions` — frontend RPC, auth.uid() self
- KEEP `revoke_user_session` — frontend RPC, auth.uid() self
- KEEP `search_documents` — frontend RPC, owner-scope
- KEEP `calculate_maintenance_metrics` — frontend RPC, auth.uid() owner-scope
- KEEP `calculate_monthly_metrics` — frontend RPC, auth.uid() owner-scope
- KEEP `check_user_feature_access` — frontend RPC, auth.uid() self
- KEEP `get_common_errors` — frontend RPC, is_admin() gate
- KEEP `get_dashboard_time_series` — frontend RPC, auth.uid() owner-scope
- KEEP `get_error_prone_users` — frontend RPC, is_admin() gate
- KEEP `get_error_summary` — frontend RPC, is_admin() gate
- KEEP `get_gate_conversion_stats` — frontend RPC, is_admin() gate
- KEEP `get_invoice_statistics` — frontend RPC, customer-scope
- KEEP `get_lease_stats` — frontend RPC, auth.uid() owner-scope
- KEEP `get_maintenance_stats` — frontend RPC, auth.uid() owner-scope
- KEEP `get_metric_trend` — frontend RPC, auth.uid() owner-scope
- KEEP `get_property_performance_cached` — frontend RPC, auth.uid() owner-scope
- KEEP `get_property_performance_trends` — frontend RPC, auth.uid() owner-scope
- KEEP `get_stripe_customer_by_user_id` — frontend RPC, customer-scope
- KEEP `get_user_dashboard_activities` — frontend RPC, auth.uid() owner-scope
- KEEP `get_user_invoices` — frontend RPC, customer-scope
- KEEP `log_user_error` — frontend RPC, auth.uid() self
- KEEP `search_properties` — frontend RPC, owner-scope
- TIGHTEN `get_lead_paint_compliance_report` — revoke authenticated/PUBLIC, keep service_role (no caller)
- TIGHTEN `assert_can_create_lease` — revoke authenticated/PUBLIC, keep service_role (orphaned; bulk-import validates inline)
- REVIEW `audit_for_all_policies` — add is_admin() body gate, keep grant (test-only caller)

(43 KEEP + 2 TIGHTEN + 1 REVIEW = 46.)

## KEEP — RLS-policy helpers (2)

Authenticated MUST retain EXECUTE so `{authenticated}`-scoped RLS policies evaluate them. Revoking would break owner isolation / admin policies. `anon` already revoked (CYCLE-1 / pass-3).

| Function | Rationale (SDEF-02) |
|----------|---------------------|
| `is_admin()` | KEEP — 6 `{authenticated}`-scoped admin policies call it (blogs_{insert,update,delete}_admin, email_deliverability_admin_select, "admins can read gate_events", onboarding_funnel_events_admin_select). Also `.rpc`-called for admin UI checks. `in_policy = true`. anon revoked in pass-3 (`20260602044104`). |
| `get_current_owner_user_id()` | KEEP — core owner-isolation helper used across owner RLS policies (`rls-policies` skill). `in_policy = true`. Not frontend-`.rpc`-called (RLS-only), but authenticated must evaluate it. |

## KEEP — genuine frontend RPCs (41)

Each is a real `.rpc()` caller in `src/`/`supabase/functions/` that gates internally on `auth.uid()`/owner-scope/`is_admin()`. Authenticated EXECUTE required → WARN is by design. (Hit counts from repo grep; `(.rpc=N)`.)

| Function | .rpc | Internal gate |
|----------|------|---------------|
| `get_dashboard_data_v2` | 8 | auth.uid() owner-scope |
| `get_dashboard_stats` | 8 | auth.uid() owner-scope |
| `get_funnel_stats` | 8 | **is_admin()** (SDEF-03 confirmed) |
| `get_expense_summary` | 7 | auth.uid() owner-scope |
| `bulk_import_create_lease` | 7 | owner-scope; inline overlap/conflict validation |
| `reassign_document_category` | 7 | owner-scope (document_categories ownership) |
| `reorder_document_categories` | 7 | owner-scope |
| `cancel_account_deletion` | 6 | auth.uid() self |
| `get_financial_overview` | 5 | auth.uid() owner-scope |
| `get_deliverability_stats` | 5 | **is_admin()** (SDEF-03 confirmed) |
| `request_account_deletion` | 5 | auth.uid() self |
| `get_billing_insights` | 4 | **owner-scope** (auth.uid() vs owner_id_param; SDEF-03 confirmed) |
| `get_maintenance_analytics` | 4 | auth.uid() owner-scope |
| `get_revenue_trends_optimized` | 3 | auth.uid() owner-scope |
| `get_occupancy_trends_optimized` | 2 | auth.uid() owner-scope |
| `get_property_performance_analytics` | 2 | auth.uid() owner-scope |
| `get_property_performance_with_trends` | 2 | auth.uid() owner-scope |
| `get_subscription_status` | 2 | auth.uid()/customer-scope |
| `get_user_profile` | 2 | auth.uid() self |
| `get_user_sessions` | 2 | auth.uid() self |
| `revoke_user_session` | 2 | auth.uid() self |
| `search_documents` | 18 | owner-scope (vault search) |
| `calculate_maintenance_metrics` | 1 | auth.uid() owner-scope |
| `calculate_monthly_metrics` | 1 | auth.uid() owner-scope |
| `check_user_feature_access` | 1 | auth.uid() self |
| `get_common_errors` | 1 | **is_admin()** (SDEF-03 confirmed) |
| `get_dashboard_time_series` | 1 | auth.uid() owner-scope |
| `get_error_prone_users` | 1 | **is_admin()** (SDEF-03 confirmed) |
| `get_error_summary` | 1 | **is_admin()** (SDEF-03 confirmed) |
| `get_gate_conversion_stats` | 1 | **is_admin()** (SDEF-03 confirmed) |
| `get_invoice_statistics` | 1 | auth.uid()/customer-scope |
| `get_lease_stats` | 1 | auth.uid() owner-scope |
| `get_maintenance_stats` | 1 | auth.uid() owner-scope |
| `get_metric_trend` | 1 | auth.uid() owner-scope |
| `get_property_performance_cached` | 1 | auth.uid() owner-scope |
| `get_property_performance_trends` | 1 | auth.uid() owner-scope |
| `get_stripe_customer_by_user_id` | 1 | auth.uid()/customer-scope |
| `get_user_dashboard_activities` | 1 | auth.uid() owner-scope |
| `get_user_invoices` | 1 | auth.uid()/customer-scope |
| `log_user_error` | 1 | auth.uid() self (client error logging) |
| `search_properties` | 1 | owner-scope |

### SDEF-03 admin-gate spot-check (live `pg_proc.prosrc`, 2026-06-02)

All 7 named analytics/admin RPCs are GATED — **zero UNGATED findings**, so no extra gate folded into the migration:

| Function | Gate | Args |
|----------|------|------|
| `get_deliverability_stats` | `is_admin()` | `p_days integer` |
| `get_funnel_stats` | `is_admin()` | `p_from timestamptz, p_to timestamptz` |
| `get_gate_conversion_stats` | `is_admin()` | `p_days integer` |
| `get_common_errors` | `is_admin()` | `hours_back integer, limit_count integer` |
| `get_error_summary` | `is_admin()` | `hours_back integer` |
| `get_error_prone_users` | `is_admin()` | `hours_back integer, min_errors integer` |
| `get_billing_insights` | owner-scope (`auth.uid()` vs `owner_id_param`) | `owner_id_param uuid, start/end timestamp` |

## TIGHTEN — revoke authenticated/PUBLIC, keep service_role (2)

| Function | Live signature / owner | Evidence (live, 2026-06-02) | Action |
|----------|------------------------|------------------------------|--------|
| `get_lead_paint_compliance_report` | `()` zero-arg, owner `postgres`, SECDEF | No frontend `.rpc` (asserting grep = 0 real callers; only generated `supabase.ts`). Not in policy/trigger/cron. service_role already granted. | `REVOKE EXECUTE FROM PUBLIC` + `GRANT EXECUTE TO service_role`. |
| `assert_can_create_lease` | `(uuid, uuid)` — exactly ONE signature, owner `postgres`, SECDEF, returns bool | **No caller anywhere.** Asserting grep = 0 real frontend callers. Live `prosrc` scan of all functions: **no body references it** — the live `bulk_import_create_lease` (owner postgres, SECDEF) does NOT call it (`bulk_calls_assert = false`) and enforces the lease invariant via an **inline** overlap/conflict check (`has_inline_overlap_check = true`). A later migration inlined the validation and dropped the `assert_can_create_lease` call. Function is now **orphaned**. | `REVOKE EXECUTE ON FUNCTION public.assert_can_create_lease(uuid, uuid) FROM PUBLIC` + `GRANT … TO service_role`. The `(uuid, uuid)` arg list is mandatory. |

### TIGHTEN-02 safety gate — RESOLVED (stronger than planned)

The plan expected `bulk_import_create_lease` to be `assert_can_create_lease`'s privileged-owner internal caller (so revoking authenticated would be safe because the call runs as owner). Live reality is **safer**: `assert_can_create_lease` has **no caller at all** (orphaned), and `bulk_import_create_lease`'s lease-creation invariant is enforced **inline**, fully independent of `assert_can_create_lease`. Therefore revoking `authenticated` cannot break the bulk-import invariant under any path. Single-signature `(uuid, uuid)` confirmed (no overload). Owner `postgres` confirmed. **Gate PASSED — safe to revoke.** (Post-revoke confirmation: `bulk-import-create-lease.test.ts` stays green — Plan 02 Task 2.)

## REVIEW → gate — `audit_for_all_policies` (1)

| Function | Evidence | Decision |
|----------|----------|----------|
| `audit_for_all_policies(p_role text)` | Only caller is `tests/integration/rls/for-all-audit.test.ts` (`.rpc`); admin schema-diagnostic enumerating `FOR ALL` policies; `authenticated`-only grant (no service_role). Exposing the policy inventory to an arbitrary signed-in account is a minor info-leak. | **Add internal `public.is_admin()` gate (CREATE OR REPLACE), KEEP the authenticated grant.** Chosen over tighten-to-service_role because the integration test harness has no service-role/admin client (`getAdminTestCredentials()` → null) — a service_role-only function couldn't be exercised. A non-admin caller now gets zero rows; the door stays open for a future admin client. The function STAYS advisor-flagged by design (grant kept). |

## Plan 02 deliverables

- **Migration:** `supabase/migrations/20260602202339_tighten_security_definer_phase1.sql` (prod-assigned timestamp `20260602202339`, reconciled via `list_migrations`; applied via MCP `apply_migration`).
- **Advisor delta (confirmed 2026-06-02 post-apply):** `authenticated_security_definer_function_executable` **46 → 44**. `get_lead_paint_compliance_report` + `assert_can_create_lease` absent from the WARN list; `audit_for_all_policies` still present (grant kept, body-gated). `rls_enabled_no_policy` unchanged at 10 (Phase 2's job); `auth_leaked_password_protection` 1 (out of scope).
- **ACL note (deviation from plan):** all three functions carried a **DIRECT `authenticated` EXECUTE grant**, NOT a PUBLIC-inherited one (a prior migration `20251230240000`/`20251231063902` already revoked PUBLIC). So the load-bearing revoke was `REVOKE … FROM authenticated`; a `REVOKE FROM PUBLIC` alone would have been a no-op. The migration includes a defensive `REVOKE FROM PUBLIC` (idempotent) plus the actual `REVOKE FROM authenticated`.

## Verification grid (post-apply, confirmed live via `has_function_privilege` 2026-06-02)

| Function | anon | authenticated | service_role | Notes |
|----------|------|---------------|--------------|-------|
| `get_lead_paint_compliance_report` | ✗ | ✗ ✅ | ✓ | revoked from authenticated (+ defensive PUBLIC) |
| `assert_can_create_lease(uuid,uuid)` | ✗ | ✗ ✅ | ✓ | revoked from authenticated; orphaned |
| `audit_for_all_policies` | ✗ | ✓ but `is_admin()`-gated → 0 rows for non-admin ✅ (body_has_is_admin=true) | (no grant) | grant kept, body-gated |
| `is_admin` (KEEP helper) | ✗ | ✓ reachable ✅ | ✓ | RLS contract intact |
| `get_current_owner_user_id` (KEEP helper) | ✗ | ✓ reachable ✅ | ✓ | RLS contract intact |

Integration regression pins (`anon-rpc-grants.rls.test.ts` + `bulk-import-create-lease.test.ts` + `for-all-audit.test.ts`) run in CI `rls-security` on the phase PR. Behavior independently confirmed pre-PR via the live `has_function_privilege` grid above.
