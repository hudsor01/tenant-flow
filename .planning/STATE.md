---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Security Hardening
status: planning
last_updated: "2026-06-02T18:33:52.564Z"
last_activity: 2026-06-02
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-02 after v2.0)

**Core value:** Every public claim on tenantflow.app maps to working code, and every visual aligns to canonical design tokens in `src/app/globals.css`. The authenticated owner dashboard at `/dashboard` is a restrained, professional B2B command center.
**Current focus:** v3.0 Security Hardening — drive the prod Supabase Security Advisor to a documented, test-pinned steady state (classify + tighten authenticated SECURITY DEFINER functions; resolve all 10 `rls_enabled_no_policy` tables) with zero RLS regressions.

## Phase Index

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 1 | SECURITY DEFINER Classification & Tightening | SDEF-01, SDEF-02, SDEF-03, TIGHTEN-01, TIGHTEN-02, TIGHTEN-03, SECTEST-01 | Executed (2/2 plans; advisor 46→44; pre-merge) |
| 2 | RLS-No-Policy Resolution | RLSNP-01, RLSNP-02, RLSNP-03, SECTEST-02 | Not started |
| 3 | Documented Advisor Steady State & Verification | SECTEST-03 | Not started |

## Current Position

Phase: 1 — SECURITY DEFINER Classification & Tightening (executed, pre-merge)
Plan: 01-01 + 01-02 complete
Status: Executed — migration `20260602202339` applied to prod, advisor `authenticated_security_definer_function_executable` 46→44 confirmed live. Tests extended (CI `rls-security` runs them on the PR). Awaiting perfect-PR review + merge.
Last activity: 2026-06-02 — Phase 1 executed: tightened get_lead_paint_compliance_report + assert_can_create_lease (revoked authenticated; both orphaned) + is_admin() gate on audit_for_all_policies. CYCLE-2.md classification doc written (43 KEEP / 2 TIGHTEN / 1 REVIEW).

## Deferred Items

Items acknowledged and deferred at v2.0 milestone close on 2026-06-02:

| Category | Item | Status |
|----------|------|--------|
| uat_gap | 06-HUMAN-UAT.md — manual tab + focus-ring visual audit on /dashboard | partial (1 pending scenario) |
| verification_gap | 06-VERIFICATION.md — SC2 manual focus-ring / aria-label review | human_needed |

Both are v2.0 Phase-6 **manual** human-in-the-loop accessibility sign-offs. The automated coverage that substantially supersedes them passed in CI: the `owner-axe` Playwright project runs `AxeBuilder().withTags([wcag2a, wcag2aa, wcag21a, wcag21aa])` over the full `/dashboard` subtree (covers name/role/value, aria-labels, focus order programmatically) and reported zero violations on PR #767 (`e2e-smoke` green, commit `d78bd32ca`) and again on the Phase-7 smoke. The only residual is the human-perceptible focus-ring *visual quality* confirmation, which axe partially covers but cannot fully substitute. Low risk; revisit during the next a11y-touching milestone.

Deferred out of v3.0 scope (recorded in REQUIREMENTS.md "Future Requirements"):

| Category | Item | Status |
|----------|------|--------|
| ci_gap | Periodic advisor drift check in CI (advisor not run in CI today) | deferred — later milestone |
| hardening | `search_path` hardening sweep on the broader function set (`project_pending_followups_2026-05-29`) | deferred — separate concern from grant findings |

## Accumulated Context

**Cross-cutting constraints for every v3.0 phase** (mirrored in ROADMAP.md):

- Every grant/policy change is a PROD migration via Supabase MCP `apply_migration`; reconcile the repo filename with the prod-assigned timestamp per `migration-mcp-prod-drift` (`mcp__supabase__list_migrations` after each apply).
- `REVOKE FROM PUBLIC` is load-bearing: a bare `REVOKE FROM authenticated` is a no-op while the PUBLIC grant stands. Each function tightening must `REVOKE FROM PUBLIC` then re-`GRANT` only `service_role`.
- Never re-introduce the deny-all/RESTRICTIVE rule removed in `20260527151342` (rejected per `AUDIT-2026-05-29`). Use positive `service_role_only` FOR ALL policies only.
- TIGHTEN revokes grants; it does NOT DROP functions (lower risk, reversible).
- The integration suite is PostgREST-only — pin grant state via the advisor + `.rpc()` reachability probes (`anon-rpc-grants` / `admin-rpc-grants` pattern), not by reading `pg_proc.proacl` from the test.
- Each phase ships as ONE atomic PR through the perfect-PR gate (two consecutive zero-finding deep review cycles). Branch protection on `main` requires `checks` + `e2e-smoke` + `rls-security`.
- `auth_leaked_password_protection` is OUT of scope (paid HaveIBeenPwned feature, intentionally disabled).

**Live advisor baseline (2026-06-02, prod `bshjmbshupiibfiewpxb`):**

- `authenticated_security_definer_function_executable` WARN × 46 → 43 KEEP-by-design (41 genuine frontend RPCs gating on `auth.uid()`/`is_admin()` + the 2 RLS helpers `is_admin`, `get_current_owner_user_id`), 2 TIGHTEN (`get_lead_paint_compliance_report`, `assert_can_create_lease`), 1 REVIEW (`audit_for_all_policies`, test-only). 41+2+2+1 = 46.
- `rls_enabled_no_policy` INFO × 10 → all fail-closed already. Tier A (5: `app_config`, `email_suppressions`, `processed_internal_events`, `security_events`, `stripe_webhook_events`) revoke vestigial `authenticated` grant + add `service_role_only`. Tier B (5: `security_audit_log`, `user_access_log`, `webhook_attempts`, `webhook_events`, `webhook_metrics`) add `service_role_only`.
- Net DDL footprint: ~2-3 function REVOKEs + 10 table policies (+ ≤5 table REVOKEs). Everything else is classification docs + tests.

**Prior art / references:** PRs #758 / #771; migrations `20260529224926` / `20260529225039` / `20260602044104`; `.planning/anon-exec-audit/CYCLE-1.md`; memory `security-definer-advisor-state`; skills `rls-policies` (service-role-only set + `service_role_only` pattern) + `sql-migration-rules`.

## Blockers

None.

## Roadmap Evolution

- 2026-05-22: v1.0 "Marketing Surface Honesty" archived (15 phases, 56/56 audit findings closed, Round 3 audit verdict PERFECT BY ALL MEASURES).
- 2026-06-02: v2.0 "Dashboard Command Center" shipped and archived (7 phases, 24 plans, 40 tasks, 34/34 requirements). Final phase merged via PR #773 → `3e1a4cc29`. Perfect-PR gate held on every phase. Phase 7 (verification) served as the binding milestone audit — its 7-test `/dashboard` E2E smoke passed in CI against live prod.
- 2026-06-02: v3.0 "Security Hardening" roadmap created — 3 phases (SECURITY DEFINER classification + tightening → RLS-no-policy resolution → documented steady state + verification), 12/12 requirements mapped (SDEF-01..03, TIGHTEN-01..03, RLSNP-01..03, SECTEST-01..03), no orphans, no double-mapping. Phase numbering reset to 1 at the major-version boundary (per locked convention); v2.0 phase dirs archived to `milestones/v2.0-phases/`.

## Next Action

**v3.0 roadmap complete.** Plan the first phase:

```
/gsd-plan-phase 1
```

Phase 1 (SECURITY DEFINER Classification & Tightening) produces the durable function-by-function classification doc (43 KEEP rationale + 2 TIGHTEN + 1 REVIEW), resolves `assert_can_create_lease`'s live overload/call-graph, ships the TIGHTEN migration(s) (`REVOKE FROM PUBLIC` + re-grant `service_role`) for `get_lead_paint_compliance_report` / `assert_can_create_lease` / the `audit_for_all_policies` decision, spot-checks admin gates on the 7 analytics KEEPs, and extends `tests/integration/rls/anon-rpc-grants` / `admin-rpc-grants` to pin the tightened set unreachable from authenticated while the KEEP RLS helpers stay reachable.

## Overrides

(none active)

---
*Last updated: 2026-06-02 — v3.0 Security Hardening roadmap created (3 phases, 12/12 requirements). Trust `git log main` + `gh pr list --state merged` + `.planning/MILESTONES.md` as source of truth over this cache.*
