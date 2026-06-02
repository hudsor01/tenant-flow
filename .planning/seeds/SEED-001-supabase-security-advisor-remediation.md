---
trigger_when: starting a security, database-hardening, RLS, or SECURITY DEFINER milestone (or any milestone touching Supabase grants/policies)
planted_during: post-#771 (pass-3 anon SECURITY DEFINER lockdown shipped); user requested a queued milestone to audit the remaining advisor findings
status: queued
target_milestone: next (queue after v2.0 Dashboard Command Center ships)
---

# SEED-001: Supabase Security Advisor remediation audit (authenticated SECURITY DEFINER + RLS-no-policy)

## When to Surface
- Starting any security / database-hardening / RLS milestone.
- Before a Supabase security review or compliance pass.
- When the advisor `authenticated_security_definer_function_executable` or `rls_enabled_no_policy` counts are revisited.

## Why This Matters
The 3-pass anon-EXEC lockdown (PRs #758 / #771, migrations `20260529224926`, `20260529225039`, `20260602044104`) closed the **anon**-executable SECURITY DEFINER surface (advisor `anon_security_definer_function_executable` → 0). What remains is the **authenticated**-side review (46 WARN) plus the RLS-no-policy tables (10 INFO). Most authenticated findings are by-design (frontend RPCs + RLS helpers), but the set has never been systematically classified function-by-function, and a few are plausibly tightenable. Doing this milestone gets the advisor to a documented, intentional steady state with regression tests — closing the loop on the security posture.

## Scope (promote-ready milestone spec)

**Goal:** Systematically review and resolve the remaining open Supabase Security Advisor findings on prod (project `bshjmbshupiibfiewpxb`), getting the advisor to a documented, test-pinned steady state with zero RLS regressions.

### Finding class 1 — `authenticated_security_definer_function_executable` (46 WARN)
SECURITY DEFINER functions in `public` callable by the `authenticated` role via `/rest/v1/rpc/*`. For EACH, classify and act:
- **KEEP (by design):** genuine frontend RPCs (called via `.rpc()`) that gate internally on `auth.uid()`/`is_admin()`, AND RLS-helper functions that `{authenticated}`-scoped policies must evaluate (e.g. `is_admin`, `get_current_owner_user_id`). These legitimately need authenticated EXECUTE → document as intentional + pin with a regression test; do NOT revoke.
- **TIGHTEN:** functions NOT called by the frontend (`.rpc` grep) AND NOT referenced in any RLS policy AND NOT trigger/cron → candidates to `REVOKE EXECUTE` from `authenticated` (keep `service_role`), or switch to `SECURITY INVOKER` if they don't need definer privilege. Scrutinize especially: `audit_for_all_policies`, `calculate_maintenance_metrics`, `calculate_monthly_metrics`, `log_user_error`, `check_user_feature_access`, `assert_can_create_lease`, `get_current_owner_user_id`. Verify each safely (introspection: pg_policies, pg_trigger, cron.job, `.rpc` grep, internal-caller `prosrc`) before changing.

Full 46-function list: see the advisor output captured in this session. Classification method already established in `.planning/anon-exec-audit/CYCLE-1.md` and the `security-definer-advisor-state` memory.

### Finding class 2 — `rls_enabled_no_policy` (10 INFO)
Tables with RLS enabled but no policies: `app_config`, `email_suppressions`, `processed_internal_events`, `security_audit_log`, `security_events`, `stripe_webhook_events`, `user_access_log`, `webhook_attempts`, `webhook_events`, `webhook_metrics`. For each, confirm it is intentional fail-closed service-role-only (the default deny is correct) and either document the intent in-migration OR add an explicit deny/owner policy — WITHOUT re-introducing the rule removed in `20260527151342` (a naive "deny-all" suggestion was already rejected per `AUDIT-2026-05-29`).

### Explicitly OUT OF SCOPE
- `auth_leaked_password_protection` (WARN) — paid Supabase feature (HaveIBeenPwned check), intentionally left disabled. Do not include.

### Constraints
- Every grant/policy change is a prod migration (apply via Supabase MCP, reconcile timestamp per the `migration-mcp-prod-drift` convention).
- RLS integration test coverage in `tests/integration/rls/` for any tightening (extend `anon-rpc-grants.rls.test.ts` / `admin-rpc-grants.rls.test.ts` patterns; note the suite is PostgREST-only and can't introspect grants for trigger-returning functions).
- Perfect-PR merge gate (two consecutive zero-finding review cycles) per phase.

### Success
Advisor `authenticated_security_definer_function_executable` reduced to only the verified-intentional set (each documented + test-pinned), `rls_enabled_no_policy` resolved (documented or policy-covered), zero RLS regressions.

### Prior art / references
PRs #758, #771 · migrations `20260529224926` / `20260529225039` / `20260602044104` · `.planning/anon-exec-audit/CYCLE-1.md` · memory `security-definer-advisor-state` · `.planning/repo-audit/AUDIT-2026-05-29.md`.
