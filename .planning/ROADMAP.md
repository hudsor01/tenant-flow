# Roadmap: TenantFlow

## Milestones

- ✅ **v1.0 Marketing Surface Honesty** — Phases 1-15 (shipped 2026-05-22) — see [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 Dashboard Command Center** — Phases 1-7 (shipped 2026-06-02, 34/34 requirements) — see [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)
- ✅ **v3.0 Security Hardening** — Phases 1-3 (shipped 2026-06-02, 12/12 requirements) — see [milestones/v3.0-ROADMAP.md](milestones/v3.0-ROADMAP.md)
- 📋 **Next milestone** — not yet planned. Run `/gsd:new-milestone`.

## Phases

<details>
<summary>✅ v3.0 Security Hardening (Phases 1-3) — SHIPPED 2026-06-02</summary>

- [x] Phase 1: SECURITY DEFINER Classification & Tightening (2/2 plans) — PR #776 — advisor `authenticated_security_definer` 46→44
- [x] Phase 2: RLS-No-Policy Resolution (2/2 plans) — PR #777 — advisor `rls_enabled_no_policy` 10→0
- [x] Phase 3: Documented Advisor Steady State & Verification (1/1 plan) — PR #778 — steady state 44/0/1 confirmed

Closed at 12/12 requirements (SDEF-01..03, TIGHTEN-01..03, RLSNP-01..03, SECTEST-01..03). Full phase detail in [milestones/v3.0-ROADMAP.md](milestones/v3.0-ROADMAP.md); summary in [MILESTONES.md](MILESTONES.md); steady-state in [anon-exec-audit/STEADY-STATE.md](anon-exec-audit/STEADY-STATE.md).

</details>

<details>
<summary>✅ v2.0 Dashboard Command Center (Phases 1-7) — SHIPPED 2026-06-02</summary>

- [x] Phase 1: Foundation & Dedup (3/3 plans) — PR #744
- [x] Phase 2: Data Layer & RPC (3/3 plans) — PR #745
- [x] Phase 3: KPI Bento Row (3/3 plans) — PR #746
- [x] Phase 4: Charts (4/4 plans) — PR #748
- [x] Phase 5: Portfolio DataTable (5/5 plans) — PR #763
- [x] Phase 6: Polish & A11y (4/4 plans) — PR #767
- [x] Phase 7: Verification (2/2 plans) — PR #773

Closed at 34/34 requirements. Full detail in [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md).

</details>

<details>
<summary>✅ v1.0 Marketing Surface Honesty (Phases 1-15) — SHIPPED 2026-05-22</summary>

15 phases, 33 plans, 56/56 audit findings closed. Audit round 3 verdict: PERFECT BY ALL MEASURES. Full detail in [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) + [milestones/v1.0-MILESTONE-AUDIT.md](milestones/v1.0-MILESTONE-AUDIT.md).

</details>

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. SECURITY DEFINER Classification & Tightening | v3.0 | 2/2 | Shipped (PR #776) | 2026-06-02 |
| 2. RLS-No-Policy Resolution | v3.0 | 2/2 | Shipped (PR #777) | 2026-06-02 |
| 3. Documented Advisor Steady State & Verification | v3.0 | 1/1 | Shipped (PR #778) | 2026-06-02 |

---
*Last updated: 2026-06-02 — v3.0 Security Hardening archived (3 phases, 5 plans, 12/12 requirements; advisor steady state 44/0/1). Next milestone unplanned.*
