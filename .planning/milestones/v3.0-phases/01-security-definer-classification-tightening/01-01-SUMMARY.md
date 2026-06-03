---
phase: 01-security-definer-classification-tightening
plan: 01
completed: 2026-06-02
requirements: [SDEF-01, SDEF-02, SDEF-03]
status: complete
---

# Plan 01-01 Summary — Classification doc + live introspection

**One-liner:** Live-verified the 46-function classification (43 KEEP / 2 TIGHTEN / 1 REVIEW), ran the TIGHTEN-02 safety gate + SDEF-03 admin-gate spot-check against prod, and wrote the durable `.planning/anon-exec-audit/CYCLE-2.md` audit doc — read-only, no DDL.

## What was done

- **CYCLE-2.md** written (continues CYCLE-1 lineage): 46-function verdict roster + grouped KEEP/TIGHTEN/REVIEW tables with per-function rationale (SDEF-01/02), the SDEF-03 spot-check results, the TIGHTEN-02 resolution, the TIGHTEN-03 decision, Plan-02 placeholders, and the post-apply verification grid.
- **TIGHTEN-02 safety gate (live introspection):** `assert_can_create_lease` has exactly ONE signature `(uuid, uuid)`, owner `postgres`, SECURITY DEFINER (no overload). `get_lead_paint_compliance_report()` zero-arg, owner `postgres`. Both have **0 real frontend `.rpc()` callers** (asserting grep).
- **SDEF-03 spot-check:** all 7 analytics/admin RPCs are gated — 6 via `is_admin()` (`get_funnel_stats`, `get_deliverability_stats`, `get_gate_conversion_stats`, `get_common_errors`, `get_error_summary`, `get_error_prone_users`) + `get_billing_insights` via owner-scope. **Zero UNGATED findings** → no extra gate to fold into the Plan 02 migration.

## Deviation (important for Plan 02)

The plan's acceptance criterion expected the internal-caller scan to return `bulk_import_create_lease` as `assert_can_create_lease`'s privileged-owner caller. **Live reality is different — and safer:** `assert_can_create_lease` has **no caller at all** (orphaned). The live `bulk_import_create_lease` (owner `postgres`, SECDEF) does NOT reference it (`prosrc ILIKE '%assert_can_create_lease%'` = false); it enforces the lease-creation invariant via an **inline** overlap/conflict check (`has_inline_overlap_check` = true). A later migration inlined the validation and dropped the `assert_can_create_lease` call.

**Implication:** revoking `authenticated` EXECUTE on `assert_can_create_lease(uuid, uuid)` is unambiguously safe — nothing reachable from `authenticated` calls it, and the bulk-import invariant is independent of it. The TIGHTEN-02 gate is **PASSED** (single signature ✓, owner `postgres` ✓, no authenticated-reachable caller ✓, invariant inline ✓). Plan 02 proceeds; the post-revoke `bulk-import-create-lease.test.ts` green run remains the confirming gate.

## Verification

- Plan 01 Task 1 asserting grep: 0 real frontend callers for both TIGHTEN targets (exit 0).
- Plan 01 Task 2 gate: `CYCLE-2.md` exists, `grep -c KEEP|TIGHTEN|REVIEW` = 59 (≥46), `assert_can_create_lease` + `audit_for_all_policies` present. 46-line verdict roster.
- No DDL applied in this plan (introspection + doc only).

## Hands off to Plan 02

- TIGHTEN-01: `REVOKE EXECUTE ON FUNCTION public.get_lead_paint_compliance_report() FROM PUBLIC` + `GRANT … TO service_role`.
- TIGHTEN-02: `REVOKE EXECUTE ON FUNCTION public.assert_can_create_lease(uuid, uuid) FROM PUBLIC` + `GRANT … TO service_role`.
- TIGHTEN-03: `CREATE OR REPLACE audit_for_all_policies(p_role text)` adding `public.is_admin()` as the first WHERE predicate (preserve `LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''` + the `pg_catalog.pg_policies` body), keep the `authenticated` grant.
- No SDEF-03 fix needed (all 7 gated).
