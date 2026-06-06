---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: Hardening & Hygiene
status: planning
last_updated: "2026-06-05T21:43:54.948Z"
last_activity: 2026-06-05 — executed Phase 2 plan 02-03 (TYPE-02 maintenance boundary → mapMaintenanceRow)
progress:
  total_phases: 8
  completed_phases: 1
  total_plans: 8
  completed_plans: 7
  percent: 88
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-04 — v4.0 Hardening & Hygiene active)

**Core value:** Every shipped surface is provably correct — typed at its data boundaries, tested for owner isolation, accessible, and CI-gated against regressions — and the decayed organic-search assets from the v1.0 blog rebuild are reclaimed. No new product features; this milestone converts the verified audit tail into permanent, regression-pinned hardening.
**Current focus:** Plan Phase 1 (Security-CI Hardening) — `/gsd-plan-phase 1`.

## Current Position

Phase: 2 of 8 (Typed RPC Boundaries) — v4.0
Plan: 03 of 04 complete (02-04 pending)
Status: 02-03 executed — TYPE-02 maintenance boundary routed through validated mapMaintenanceRow
Progress: [█████████░] 88%
Last activity: 2026-06-05 — executed Phase 2 plan 02-03 (TYPE-02 maintenance boundary → mapMaintenanceRow)

## Roadmap Summary (v4.0)

| Phase | Goal | Requirements |
|-------|------|--------------|
| 1. Security-CI Hardening | Edge-fn assertions gate CI + CSP/constant-time/SHA-pin hardening | CISEC-01..04 |
| 2. Typed RPC Boundaries | Zero `as unknown as` at `src/hooks/api/` RPC boundaries + drift guard | TYPE-01..03 |
| 3. Stats RPC Consolidation | `get_unit_stats()` + `get_tenant_stats()` SECURITY DEFINER RPCs | PERF-02, PERF-03 |
| 4. Cron Stagger & Index Cleanup | Stagger 4 pg_cron jobs; drop unused (non-FK) indexes | PERF-01, PERF-04 |
| 5. Cross-Owner RLS Coverage | Dual-client RLS tests + SQLSTATE assertions + shared `REVOKED_CODES` | TEST-01, TEST-02, TEST-04 |
| 6. Auth & Dollar-Hook Unit Tests | Vitest coverage for auth + expense/report hooks | TEST-03 |
| 7. Accessibility Labels | Programmatic labels + accessible names + `text-muted` fix | A11Y-01..03 |
| 8. SEO Recovery | Republish deleted posts; fix `/pricing` JSON-LD; empty category pages | SEO-01..03 |

## Blockers

None.

## Roadmap Evolution

- 2026-05-22: v1.0 "Marketing Surface Honesty" archived (15 phases, 56/56 audit findings, Round 3 verdict PERFECT BY ALL MEASURES).
- 2026-06-02: v2.0 "Dashboard Command Center" shipped + archived (7 phases, 24 plans, 34/34 requirements).
- 2026-06-02: v3.0 "Security Hardening" shipped + archived (3 phases, 5 plans, 12/12 requirements). Advisor `authenticated_security_definer` 46→44, `rls_enabled_no_policy` 10→0, steady state documented.
- 2026-06-04: v4.0 "Hardening & Hygiene" roadmap created (8 phases, 21/21 requirements: CISEC-01..04, TYPE-01..03, PERF-01..04, TEST-01..04, A11Y-01..03, SEO-01..03). Phases sequenced to keep DB/migration-boundary work (stats RPCs in P3, cron/index in P4) and typed-mapper work (P2) from bunching into one mega-phase; SEO content-pipeline phase (P8) kept distinct from the code-only phases.

## Next Action

**Roadmap created.** Plan the first phase:

```
/gsd-plan-phase 1
```

Phase 1 (Security-CI Hardening) closes CISEC-01..04: edge-function/Stripe-webhook test gate in CI, CSP per-request nonce + `strict-dynamic` (drop `unsafe-inline`), constant-time secret compare in `auth-email-send`, and SHA-pinned GitHub Actions. (CodeQL + gitleaks gates already shipped via PR #781 — out of scope.)

## Overrides

(none active)

---
*Last updated: 2026-06-04 — v4.0 roadmap created, Current Position set to Phase 1 of 8. Integer phase numbers only (locked project decision; phase numbering resets per major-version milestone). Trust `git log main` + `gh pr list --state merged` + `.planning/ROADMAP.md` as source of truth over this cache.*
