# Research: Function & Table Classification (v3.0 Security Hardening)

Live introspection (`pg_proc`/`pg_policy`/`pg_trigger`/`cron.job` + `has_function_privilege`) cross-referenced with a repo-wide `.rpc()` grep. All 46 functions have `anon EXECUTE = false` (pass-3 already closed anon); the table below is about the **authenticated** grant.

## Decision rule

For each SECURITY DEFINER function flagged `authenticated_security_definer_function_executable`:

- **KEEP** if ANY of: (a) called from real frontend/edge `.rpc()` AND gates internally on `auth.uid()`/`is_admin()`; (b) referenced in an `{authenticated}`-scoped RLS policy expression (RLS helper). These legitimately need authenticated EXECUTE → document + pin with a regression test; the WARN stays BY DESIGN.
- **TIGHTEN** if NONE of: frontend-reachable, RLS-referenced, trigger-attached, cron-called, or internally called by a SECURITY DEFINER function. `REVOKE EXECUTE FROM authenticated` (keep `service_role`), or switch to `SECURITY INVOKER` if definer privilege isn't needed.
- **REVIEW** = ambiguous (e.g. only a test calls it) → resolve case-by-case during phase execution.

## Function verdicts (46)

### KEEP — RLS-policy helpers (2)
Authenticated MUST keep EXECUTE so `{authenticated}`-scoped policies evaluate. `anon` already revoked (pass 3 for `is_admin`).

| Function | rettype | in_policy | Notes |
|----------|---------|-----------|-------|
| `is_admin` | bool | ✅ | 6 `{authenticated}` admin policies call it; also `.rpc`-called (admin checks/tests). Pass-3 doc already pins this. |
| `get_current_owner_user_id` | uuid | ✅ | Core owner-isolation helper used across owner RLS policies (see `rls-policies` skill). |

### KEEP — genuine frontend RPCs (41)
Real `.rpc()` callers in `src/`/`supabase/functions/`; each gates on `auth.uid()`/owner-scope/`is_admin()` internally. Authenticated EXECUTE required. (Hit counts from grep in parens.)

`bulk_import_create_lease`(7), `cancel_account_deletion`(6), `check_user_feature_access`(1), `get_billing_insights`(4), `get_common_errors`(1), `get_dashboard_data_v2`(8), `get_dashboard_stats`(8), `get_dashboard_time_series`(1), `get_deliverability_stats`(5), `get_error_prone_users`(1), `get_error_summary`(1), `get_expense_summary`(7), `get_financial_overview`(5), `get_funnel_stats`(8), `get_gate_conversion_stats`(1), `get_invoice_statistics`(1), `get_lease_stats`(1), `get_maintenance_analytics`(4), `get_maintenance_stats`(1), `get_metric_trend`(1), `get_occupancy_trends_optimized`(2), `get_property_performance_analytics`(2), `get_property_performance_cached`(1), `get_property_performance_trends`(1), `get_property_performance_with_trends`(2), `get_revenue_trends_optimized`(3), `get_stripe_customer_by_user_id`(1), `get_subscription_status`(2), `get_user_dashboard_activities`(1), `get_user_invoices`(1), `get_user_profile`(2), `get_user_sessions`(2), `log_user_error`(1), `reassign_document_category`(7), `reorder_document_categories`(7), `request_account_deletion`(5), `revoke_user_session`(2), `search_documents`(18), `search_properties`(1), `calculate_maintenance_metrics`(1), `calculate_monthly_metrics`(1).

> Per-function execution note: a few KEEPs warrant a quick admin-gate confirmation (`get_deliverability_stats`, `get_funnel_stats`, `get_gate_conversion_stats`, `get_common_errors`, `get_error_*`, `get_billing_insights` — analytics/admin surfaces). Verify they gate on `is_admin()` internally; if any don't, that's a real finding (fix the gate, keep the grant).

### TIGHTEN — no authenticated caller (2)

| Function | Evidence | Action | Caveat |
|----------|----------|--------|--------|
| `get_lead_paint_compliance_report` | No frontend `.rpc` (only migration def + grants + types). Not in policy/trigger/cron. `service_role` already granted. | `REVOKE EXECUTE FROM authenticated`; keep `service_role`. | Clean — currently unused by authenticated. |
| `assert_can_create_lease` | No direct frontend `.rpc` — enforced **internally** by `bulk_import_create_lease` (migration `20260422120000:136 perform public.assert_can_create_lease(...)`) and the UI lease-create path; comment in `bulk-import-config.ts:125` confirms it's an invariant, not a direct call. | `REVOKE EXECUTE FROM authenticated`; keep `service_role`. | **Resolve first:** live `prosrc` scan returned no internal caller, yet the migration shows `bulk_import_create_lease` calling the `(uuid,uuid)` overload (granted to service_role in `20251231063902`). Confirm the live overload/call graph before revoking — there may be two signatures. |

### REVIEW — test-only / diagnostic (1)

| Function | Evidence | Recommendation |
|----------|----------|----------------|
| `audit_for_all_policies` | Only caller is `tests/integration/rls/for-all-audit.test.ts` (`.rpc`); admin schema-diagnostic that enumerates `FOR ALL` policies; `authenticated`-only (no service_role). | Tighten to `service_role` (update the test to a service-role/admin client) OR keep with an explicit `is_admin()` internal gate. Decide during execution; leaking the policy inventory to any signed-in account is a minor info-leak. |

## RLS-no-policy tables (10) — grant reality

RLS is ON with **0 policies** on all 10 → authenticated/anon are already **fail-closed (default deny)**. The split is in the residual table GRANTs:

### Tier A — vestigial `authenticated` grant present (5) → REVOKE + document
`app_config`, `email_suppressions`, `processed_internal_events`, `security_events`, `stripe_webhook_events`
- RLS denies rows, but the lingering `authenticated` table-grant exposes schema via `pg_graphql` `/graphql/v1` introspection (lint 0027). Revoke the authenticated grant (defense-in-depth) AND add an explicit `service_role_only` policy to clear lint 0008 + document intent.
- **Intent to confirm during execution:** `processed_internal_events` is in the skill's documented service-role list (clearly infra). `app_config`, `email_suppressions`, `security_events`, `stripe_webhook_events` are NOT in that list — confirm no authenticated read path is expected (e.g. is `app_config` feature-flags read client-side?). If a real authenticated read is needed, add the correct scoped SELECT policy instead of locking down.

### Tier B — already service-role-only (5) → add explicit `service_role_only` policy + document
`security_audit_log`, `user_access_log`, `webhook_attempts`, `webhook_events`, `webhook_metrics`
- `authenticated`/`anon` have no table grant; only `service_role`. These match the `rls-policies` skill's documented service-role-only set. Add the canonical `service_role_only` FOR ALL TO service_role policy (`USING (true) WITH CHECK (true)`) to clear lint 0008 and make the lockdown explicit/intentional in-migration.

### Constraint
Do NOT re-introduce the rule removed in `20260527151342` (a naive deny-all was already rejected per `AUDIT-2026-05-29`). The canonical fix is a positive `service_role_only` grant-policy, not a RESTRICTIVE deny-all.
