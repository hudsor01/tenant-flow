# Anon-EXEC SECURITY DEFINER Audit — Cycle 1

**Source:** Supabase Security Advisor flagged 23 SECURITY DEFINER functions in `public` as "Public Can Execute SECURITY DEFINER Function" during the post-#747 audit (browser agent report, 2026-05-29).

**Scope of this audit:** classify each function and produce a migration that revokes EXECUTE from the appropriate roles without breaking live callers.

## Classification

Source: read every function body from prod via MCP, looked for `auth.uid()` reference vs. caller-supplied parameter usage. Function bodies snapshot saved at `/tmp/supabase-mcp-securityrpc-bodies-snapshot.txt` (in-session).

### IDOR_RISK — 2 functions

Real exposure. Function body accepts a user-identifying parameter and uses it directly without comparing to `auth.uid()`. Anon caller can pass any UUID and get/modify data for any user. **Revoke from anon + authenticated + PUBLIC. Keep service_role.**

| Function | Args | Risk |
|---|---|---|
| `confirm_lease_subscription` | `p_lease_id uuid, p_subscription_id text` | **Write IDOR.** Body has zero `auth.uid()` check; `UPDATE leases SET stripe_subscription_status = 'active' ... WHERE id = p_lease_id AND stripe_subscription_status = 'pending'`. Anon could flip any pending lease to active with attacker-controlled subscription ID, corrupting billing state. |
| `get_user_plan_limits` | `p_user_id uuid` | **Read IDOR.** `SELECT u.subscription_plan, u.is_admin FROM public.users u WHERE u.id = p_user_id` with no auth check. Anon could enumerate plan + admin flag for any UUID. Existing test at `tests/integration/rls/rpc-auth.test.ts:202` already documented the INTENT as "REVOKE'd from authenticated entirely" — that comment was an unfinished TODO. |

### GATES_INTERNALLY — 15 functions

Function body accepts a parameter but checks `param = (select auth.uid())` and raises `Access denied: cannot request data for another user` (or `Unauthorized`) if mismatched. Anon callers waste cycles tripping the exception but cannot get useful data. **Revoke from PUBLIC + re-grant to authenticated + service_role** (defense-in-depth removes the function-existence leak from error responses).

`get_billing_insights`, `get_dashboard_data_v2`, `get_dashboard_stats`, `get_dashboard_time_series`, `get_deliverability_stats`, `get_financial_overview`, `get_funnel_stats`, `get_gate_conversion_stats`, `get_lease_stats`, `get_maintenance_stats`, `get_metric_trend`, `get_occupancy_trends_optimized`, `get_property_performance_cached`, `get_revenue_trends_optimized`, `get_subscription_status`, `get_user_profile`

(The three admin-gated aggregates — `get_deliverability_stats`, `get_funnel_stats`, `get_gate_conversion_stats` — gate on `is_admin()` rather than `auth.uid()`; same defense-in-depth treatment applies.)

### NO_PARAM — 4 functions

Function takes no user-identifying input; reads `(select auth.uid())` directly and raises if null. No IDOR risk regardless of grants. **Revoke from PUBLIC + re-grant to authenticated + service_role.**

`cancel_account_deletion`, `get_user_invoices`, `request_account_deletion`, `log_lease_signature_activity`

(`log_lease_signature_activity` is a trigger function — `RETURNS trigger`. Trigger execution doesn't go through GRANT/EXECUTE; the grant on a trigger function is moot. Left as-is to avoid noise in the migration.)

### INTENTIONALLY_PUBLIC — 1 function

| Function | Why kept public |
|---|---|
| `is_admin()` | Used inside RLS policies. RLS evaluation needs to call this from any role, including anon. Returns `false` for anon because `auth.uid()` is null, so the gate fails safely. Revoking from anon would break every RLS policy that consults it. |

## Migration plan

Two-pass migration (matches prod's actual apply chain via MCP):

- `20260529224926_revoke_anon_security_definer_rpcs.sql` — IDOR fixes only. Revoke from `PUBLIC` + `anon` + `authenticated`; grant to `service_role`. Belt-and-suspenders form since Postgres auto-grants EXECUTE to `PUBLIC` and `anon` inherits from `PUBLIC`.
- `20260529225039_revoke_anon_security_definer_rpcs_v2.sql` — defense-in-depth. Revoke from `PUBLIC` on the 19 functions in GATES_INTERNALLY ∪ NO_PARAM (minus `log_lease_signature_activity`); re-grant to `authenticated` + `service_role`.

Total: 22 functions locked down. 1 (`is_admin`) intentionally untouched. 1 (`log_lease_signature_activity`) skipped as moot.

## Verification (cross-checked post-apply)

```
SELECT proname, has_function_privilege('anon', oid, 'EXECUTE')
FROM pg_proc WHERE prosecdef AND pronamespace='public'::regnamespace AND ...
```

| Class | Count | anon | authn | service |
|---|---|---|---|---|
| IDOR fixes | 2 | ✗ | ✗ | ✓ |
| Defense-in-depth (gated + no-param) | 19 | ✗ | ✓ | ✓ |
| `is_admin` (intentionally public) | 1 | ✓ | ✓ | ✓ |

Match against migration intent: ✓

## Regression-pinning test

`tests/integration/rls/anon-rpc-grants.rls.test.ts` — pins the lockdown state of every function:
- 22 anon-RPC tests assert `error.code ∈ {42501, 42883, PGRST202}` (PostgREST's three flavors of "revoked")
- 2 authenticated-RPC tests assert the IDOR fixes
- 1 positive test asserts `is_admin()` is still anon-callable and returns `false`

Runs against prod under the existing dual-client `rls-security` CI job.

## Out of scope (deferred)

- **`search_path = public` → `search_path = ''` hardening** on 75 SECURITY DEFINER functions. Separate body-by-body PR; each function body must be reviewed to ensure FQ-name correctness before flipping the search path.
- **Trigger-function grant cleanup** on `log_lease_signature_activity` and similar. Moot for security but worth tidying.
