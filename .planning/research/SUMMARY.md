# Research Summary: v3.0 Security Hardening

**For:** the roadmapper + requirement definition. **Grounded in:** live prod advisor (`bshjmbshupiibfiewpxb`), schema introspection, repo `.rpc()` grep, Supabase docs, and the canonical `rls-policies` / `sql-migration-rules` skills. Detail in `ADVISOR-STATE.md` + `CLASSIFICATION.md`.

## The headline

The remaining advisor surface is **much smaller than the raw counts suggest**. After live classification, the actionable work is tiny and the rest is documentation + test-pinning:

- **46 `authenticated_security_definer_function_executable`** → **43 KEEP by design** (41 genuine frontend RPCs that gate on `auth.uid()`/`is_admin()` + the 2 RLS helpers `is_admin`, `get_current_owner_user_id`; `is_admin` is itself frontend-called but counted once as a helper), **2 TIGHTEN** (`get_lead_paint_compliance_report`, `assert_can_create_lease`), **1 REVIEW** (`audit_for_all_policies`, test-only). 41+2+2+1 = 46. The 43 KEEP WARNs are expected and cannot be cleared without breaking features — the deliverable for them is *documented intentionality + a regression test*, not a grant change.
- **10 `rls_enabled_no_policy`** → all already fail-closed (RLS on, 0 policies). Resolve by making the lockdown explicit: **Tier A (5)** revoke a vestigial `authenticated` table-grant + add `service_role_only` policy; **Tier B (5)** add `service_role_only` policy. 4 Tier-A tables need a quick intent confirmation first.
- **`auth_leaked_password_protection`** → OUT (paid feature, locked).

**Net DDL footprint:** ~2-3 function `REVOKE`s + 10 table policies (+ ≤5 table `REVOKE`s). Everything else is classification docs + tests. Zero RLS regressions is the bar.

## Watch out for (pitfalls)

1. **`REVOKE FROM PUBLIC` is load-bearing** (carried from pass-3): Postgres auto-grants EXECUTE to PUBLIC at function creation and `anon`/`authenticated` inherit it. A bare `REVOKE FROM authenticated` is a no-op while the PUBLIC grant stands. Each tightening must `REVOKE FROM PUBLIC` then re-`GRANT` only the roles that need it (`service_role`).
2. **`assert_can_create_lease` overload/call-graph discrepancy** — the live `prosrc` scan found no internal caller, but migration `20260422120000` shows `bulk_import_create_lease` calling the `(uuid,uuid)` overload. Resolve the live signature/call graph before revoking, or you could break bulk import. Verify with a fresh introspection at execute-time.
3. **Don't re-introduce the `20260527151342`-removed rule** — a naive deny-all was already rejected (`AUDIT-2026-05-29`). Use positive `service_role_only` FOR ALL policies, never RESTRICTIVE deny-all.
4. **The integration suite is PostgREST-only** — it cannot introspect grants for trigger-returning functions and cannot read `pg_proc.proacl` directly. Pin grant state via the advisor + `.rpc()` reachability probes (the `anon-rpc-grants` / `admin-rpc-grants` pattern), not by reading catalogs from the test.
5. **`app_config` intent** — if feature flags are read client-side as `authenticated`, locking it down breaks reads. Confirm the read path (likely service-role/edge) before revoking. Same caution for `email_suppressions`, `security_events`, `stripe_webhook_events`.
6. **Prod migrations** — every grant/policy change is a prod migration via MCP `apply_migration`; reconcile the filename with the prod-assigned timestamp per `migration-mcp-prod-drift`.
7. **A few KEEP analytics RPCs** (`get_deliverability_stats`, `get_funnel_stats`, `get_gate_conversion_stats`, `get_billing_insights`, `get_error_*`) should be spot-checked for an internal `is_admin()` gate. If one is missing, that's a real finding — fix the gate, keep the grant.

## Suggested build order (roadmapper input — not binding)

The requirements map cleanly onto **3 phases**, each an atomic perfect-PR PR:

- **Phase 1 — Authenticated SECURITY DEFINER classification + tightening.** Produce the durable function-by-function classification doc (43 KEEP rationale + 2 TIGHTEN + 1 REVIEW); resolve `assert_can_create_lease` call-graph; ship the TIGHTEN migration(s) (`REVOKE FROM PUBLIC` + re-grant `service_role`) for `get_lead_paint_compliance_report`, `assert_can_create_lease`, and the `audit_for_all_policies` decision; spot-check admin gates on the analytics KEEPs. Extend `tests/integration/rls/anon-rpc-grants` / `admin-rpc-grants` to pin the tightened set unreachable from authenticated and the KEEP RLS-helpers still reachable.
- **Phase 2 — RLS-no-policy resolution.** Confirm intent for the 4 ambiguous Tier-A tables; one migration adding explicit `service_role_only` policies to all 10 + revoking the 5 vestigial `authenticated` grants. Integration test pinning authenticated/anon denial + service-role access.
- **Phase 3 — Documented steady state + verification.** Re-run `get_advisors(security)`; assert the only remaining `authenticated_security_definer_function_executable` WARNs are the documented KEEP set and `rls_enabled_no_policy` is 0; update `security-definer-advisor-state` memory + `.planning/anon-exec-audit`; full RLS integration suite green against prod.

## Requirement categories (for step 9)

- **SDEF** — classify all 46 authenticated SECURITY DEFINER functions; document each KEEP's intentional rationale.
- **TIGHTEN** — revoke authenticated (keep service_role) / switch to INVOKER for the verified non-authenticated-facing functions.
- **RLSNP** — resolve all 10 `rls_enabled_no_policy` tables (explicit `service_role_only` policy + vestigial-grant revoke), without re-adding the removed deny-all.
- **SECTEST** — `tests/integration/rls/` regression coverage for every change; documented advisor steady state with zero RLS regressions.
