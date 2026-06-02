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

### GATES_INTERNALLY — 16 functions

Function body accepts a parameter but checks `param = (select auth.uid())` and raises `Access denied: cannot request data for another user` (or `Unauthorized`) if mismatched. Anon callers waste cycles tripping the exception but cannot get useful data. **Revoke from PUBLIC + re-grant to authenticated + service_role** (defense-in-depth removes the function-existence leak from error responses).

`get_billing_insights`, `get_dashboard_data_v2`, `get_dashboard_stats`, `get_dashboard_time_series`, `get_deliverability_stats`, `get_financial_overview`, `get_funnel_stats`, `get_gate_conversion_stats`, `get_lease_stats`, `get_maintenance_stats`, `get_metric_trend`, `get_occupancy_trends_optimized`, `get_property_performance_cached`, `get_revenue_trends_optimized`, `get_subscription_status`, `get_user_profile`

(The three admin-gated aggregates — `get_deliverability_stats`, `get_funnel_stats`, `get_gate_conversion_stats` — gate on `is_admin()` rather than `auth.uid()`; same defense-in-depth treatment applies.)

### NO_PARAM — 4 functions

Function takes no user-identifying input; reads `(select auth.uid())` directly and raises if null. No IDOR risk regardless of grants. **Revoke from PUBLIC + re-grant to authenticated + service_role.**

`cancel_account_deletion`, `get_user_invoices`, `request_account_deletion`, `log_lease_signature_activity`

(`log_lease_signature_activity` is a trigger function — `RETURNS trigger`. Trigger execution doesn't go through GRANT/EXECUTE; the grant on a trigger function is moot. Left as-is in passes 1–2 to avoid noise. **Pass 3 (`20260602044104`) revoked its PUBLIC grant anyway** after confirming it is *orphaned* — no trigger is currently attached, and `RETURNS trigger` means PostgREST can't expose it — so the grant was pure advisor noise. Re-granted `service_role` only.)

### ~~INTENTIONALLY_PUBLIC~~ → REVOKED IN PASS 3 — `is_admin` (1 of pass 3's 2; `log_lease_signature_activity` is the other, in NO_PARAM above)

| Function | Cycle-1 disposition (superseded) | Pass-3 correction |
|---|---|---|
| `is_admin()` | Kept public: "RLS evaluation needs to call this from any role, including anon. Revoking from anon would break every RLS policy that consults it." | **Disproven against the live schema.** All 6 policies that call `is_admin()` are `{authenticated}`-scoped (`blogs_{insert,update,delete}_admin`, `email_deliverability_admin_select`, "admins can read gate_events", `onboarding_funnel_events_admin_select`) — none apply to anon/public, so anon never evaluates `is_admin()`. Every SECURITY DEFINER function that calls it internally invokes it as the function owner and is itself not anon-executable, so the revoke is inert for them. Pass 3 (`20260602044104`) revokes `FROM PUBLIC` and re-grants `authenticated` + `service_role`; signed-in RLS is unaffected. |

## Migration plan

Two-pass migration (matches prod's actual apply chain via MCP):

- `20260529224926_revoke_anon_security_definer_rpcs.sql` — IDOR fixes only. Revoke from `PUBLIC` + `anon` + `authenticated`; grant to `service_role`. Belt-and-suspenders form since Postgres auto-grants EXECUTE to `PUBLIC` and `anon` inherits from `PUBLIC`.
- `20260529225039_revoke_anon_security_definer_rpcs_v2.sql` — defense-in-depth. Revoke from `PUBLIC` on the 19 functions in GATES_INTERNALLY ∪ NO_PARAM (16 + 3, minus the trigger function `log_lease_signature_activity`); re-grant to `authenticated` + `service_role`.
- `20260602044104_revoke_anon_security_definer_pass3.sql` — **pass 3.** Revoke `FROM PUBLIC` on the two the prior passes skipped: `is_admin` (re-grant `authenticated` + `service_role`) and `log_lease_signature_activity` (re-grant `service_role`). The skip-reasoning was re-verified against the live schema and disproven (see the REVOKED-IN-PASS-3 correction above).

Total: 23 functions revoked from anon (2 IDOR + 19 defense-in-depth + `is_admin` + `log_lease_signature_activity`). `is_admin` and the 19 keep `authenticated`; the 2 IDOR + `log_lease_signature_activity` are `service_role`-only.

## Verification (cross-checked post-apply)

```
SELECT proname, has_function_privilege('anon', oid, 'EXECUTE')
FROM pg_proc WHERE prosecdef AND pronamespace='public'::regnamespace AND ...
```

| Class | Count | anon | authn | service |
|---|---|---|---|---|
| IDOR fixes | 2 | ✗ | ✗ | ✓ |
| Defense-in-depth (16 gated + 3 no-param) | 19 | ✗ | ✓ | ✓ |
| `is_admin` (pass 3: revoked from anon; RLS keeps authenticated) | 1 | ✗ | ✓ | ✓ |
| `log_lease_signature_activity` (pass 3: orphaned trigger fn, locked to service_role) | 1 | ✗ | ✗ | ✓ |

Match against migration intent: ✓

## Regression-pinning test

`tests/integration/rls/anon-rpc-grants.rls.test.ts` — pins the lockdown state of every function:
- 22 anon-RPC tests assert `error.code ∈ {42501, 42883, PGRST202}` (PostgREST's three flavors of "revoked") — includes `is_admin` after pass 3. (`log_lease_signature_activity` is the 23rd anon-revoke but is **not** `.rpc`-pinnable — it `RETURNS trigger`, so PostgREST never exposes it regardless of grant; its grant state is enforced by the migration and re-flagged by the Security Advisor on any anon re-grant.)
- 2 authenticated-RPC tests assert the IDOR fixes
- 1 positive test asserts `is_admin()` remains executable by **authenticated** (returns `false` for a non-admin owner) — the RLS-policy contract that requires authenticated to keep EXECUTE

Runs against prod under the existing dual-client `rls-security` CI job.

## Cycle-1 review verifications (resolved during cycle)

- **Functions added by `20260528231201_repair_analytics_rpcs.sql`** — 5 SECURITY DEFINER functions (`get_invoice_statistics`, `calculate_monthly_metrics`, `get_property_performance_analytics`, `get_property_performance_trends`, `get_property_performance_with_trends`) were correctly granted only to `authenticated + service_role` at creation. Live prod query confirms `anon = false` on all 5. They were not in the audit's 23-function list because the Security Advisor only flags functions where `anon CAN execute`.
- **Trigger chain ownership** — `enforce_property_plan_limit`, `enforce_unit_plan_limit`, and `get_user_plan_limits` are all owned by `postgres`. Owners always have implicit EXECUTE on their own objects regardless of GRANT, so the trigger chain works even after we revoke EXECUTE from authenticated on `get_user_plan_limits`.

## Pre-existing observation (not fixed here)

- **Null-vulnerable guard pattern** — the GATES_INTERNALLY functions use `IF p_user_id != (select auth.uid()) THEN RAISE`. When `auth.uid()` is NULL (anon caller pre-lockdown), `NULL != NULL` is NULL, the IF doesn't fire, and the guard misses. Pre-existing bug; revoking from anon at the role level (this PR) is the correct fix because the guard inside the body can't be trusted for anon callers. Worth a separate hardening PR to also change the pattern to `IF p_user_id IS DISTINCT FROM (select auth.uid())` for belt-and-suspenders.

## Out of scope (deferred follow-ups)

1. **`search_path = public` → `search_path = ''` hardening** on 75 SECURITY DEFINER functions. Separate body-by-body PR; each function body must be reviewed to ensure FQ-name correctness before flipping the search path. Source: cycle-1 audit of #758, Supabase security-best-practices doc.
2. **`IS DISTINCT FROM` belt-and-suspenders** on the in-body guard pattern. The 16 GATES_INTERNALLY functions use `IF p_id != (select auth.uid())`. NULL-vs-NULL comparison evaluates to NULL, IF doesn't fire. Role-level revoke (this PR) is the primary fix; in-body guard tightening is defense-in-depth. Source: cycle-3 WR-03.
3. **Extract `REVOKED_CODES` to a shared test helper.** The literal `["42501", "42883", "PGRST202"]` is duplicated across 4 test files. It already drifted once during this PR's cycle-2. Source: cycle-3 INF-01.
4. **Supabase "Grace period is over" billing banner.** Surfaced by the browser audit agent during the FRONTEND_URL rollout. Functions are serving fine but the project is at/near quota. Needs billing attention before quota actually blocks service. Source: Supabase Claude browser agent report, 2026-05-29.
5. ~~**Trigger-function grant cleanup** on `log_lease_signature_activity` and similar.~~ **Done in pass 3** (`20260602044104`) — revoked its PUBLIC grant after confirming it is orphaned (no trigger attached, `RETURNS trigger` so not PostgREST-callable).

Each item is independently scoped and can ship as its own perfect-PR.
