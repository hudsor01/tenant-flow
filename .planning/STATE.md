---
gsd_state_version: 1.0
milestone: v10.0
milestone_name: Claims Integrity + Canonical Feature Expansion
status: executing
last_updated: "2026-07-19T19:14:44.868Z"
last_activity: 2026-07-19 -- Phase 52 planning complete
progress:
  total_phases: 13
  completed_phases: 0
  total_plans: 8
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value (v10.0):** Every claim sold on the marketing surface is delivered end-to-end in the product, the built-but-unshipped backend becomes user-facing features, and the canonical landlord feature set ships within Next.js 16 idioms — extending, never violating, the landlord-only / no-rent-facilitation / tenants-are-records positioning. Grounded in the 2026-07-19 full feature audit (4 confirmed claims gaps + orphaned backend + canonical feature roadmap).

**Current focus:** Phase 52 — Notification Center, Activity Feed & Channel Honesty (NOTIF-01..05, ACT-01/02, HONEST-01/02, CLEAN-01/02)

## Current Position

Phase: 52 of 64 (Notification Center, Activity Feed & Channel Honesty)
Plan: — (not yet planned)
Status: Ready to execute
Last activity: 2026-07-19 -- Phase 52 planning complete

Progress: [░░░░░░░░░░] 0% (0/13 phases)

## Roadmap Summary (v10.0 — phases 52-64)

| Phase | Goal | Requirements | Criteria |
|-------|------|--------------|----------|
| 52. Notification Center, Activity Feed & Channel Honesty | Surface orphaned notifications/activity backend (bell+inbox+timeline), establish `create_notification` write-path, remove SMS/push toggles, drop orphan schema | NOTIF-01..05, ACT-01/02, HONEST-01/02, CLEAN-01/02 | 5 |
| 53. Renewal Reminder Delivery | Deliver sold Growth/Max renewal reminders in-house, exactly-once, suppression-honoring, backlog dry-run gated | REMIND-01..05 | 5 |
| 54. E-sign & Storage Metering | Enforce sold e-sign (25/mo) + storage quotas with visible usage + upgrade prompts; grandfather over-quota owners | METER-01..04 | 4 |
| 55. Rent Ledger | Record-keeping ledger (charges/receipts/balance/late flags) unlocking honest revenue analytics; no payment facilitation | LEDGER-01..08 | 5 |
| 56. Reporting Hub & Documents Landing | Collapse 3 financial-reporting surfaces into one `/reports` hub (tier-gate preserved); real `/documents` landing | RPTHUB-01..04, DOCS-01 | 4 |
| 57. Rental Application Intake | Public `/apply/[token]` intake (no accounts/SSN/screening) + owner review + convert-to-tenant | APPLY-01..06 | 5 |
| 58. Tenant Communication Log | Owner-side comms timeline: logged notes/calls + auto-logged suppression-honoring email | COMMS-01..03 | 3 |
| 59. State-Aware Notice Library | Counsel-reviewed state-aware notices on lease-template rails, saved to vault with service date | NOTICE-01..03 | 3 |
| 60. Compliance & Key-Date Tracking | Track per-property key dates + reminders via shared reminder rail | COMPLY-01/02 | 2 |
| 61. Schedule E Expense Intelligence | Map expenses to Schedule E lines, receipt photos, annual export; reconcile expenses money-type mismatch | TAX-01..04 | 4 |
| 62. Scheduled Owner Digest | Monthly ledger-backed email digest, exactly-once, opt-out honored | DIGEST-01/02 | 2 |
| 63. Unit Turnover Workflow | Chain inspection → maintenance → deposit worksheet → unit-ready over existing subsystems | TURN-01..03 | 3 |
| 64. Claims Alignment & Marketing Truth | Confirm-or-soften support claims (owner decision) + marketing/pricing truth sweep for shipped v10.0 capabilities | HONEST-03/04 | 2 |

**Coverage:** 58/58 v10 requirements mapped, 0 orphans, 0 double-mapped. (The source REQUIREMENTS coverage note read "46 total"; the enumerated REQ-IDs actually total 58 — corrected during roadmap creation.)

## Execution Disciplines (binding, phases 52-64)

1. **Strictly sequential** — each phase branches (`gsd/phase-{N}-{slug}`) only after the previous phase's PR is MERGED to main. Never stack phase branches; shared surfaces (Settings, notification write-path, Resend rail, reporting export, money boundary) mean a stacked branch could silently overwrite a prior fix.
2. **Perfect-PR gate per phase** — merge only after two consecutive zero-finding deep review cycles on the frozen final state (a mid-streak edit resets the streak).
3. **Positioning invariants are load-bearing** — tenants/applicants never get accounts, no rent-payment facilitation, no screening, no service worker, no fabricated data, zero new npm runtime deps. Any violation fails review regardless of feature completeness.
4. **Money boundary discipline** — Phases 55 & 61 touch integer money columns (`leases.rent_amount`, `expenses.amount`) vs the `numeric(10,2)` dollars convention. Convert exactly once at a typed mapper boundary with cent-exact allocation property tests (no v8.0 100× regression).
5. **Pre-flip gates** — REMIND-04 (backlog dry-run before sends), METER-04 (over-quota grandfather report before upload enforcement), NOTICE-02 (counsel review before notices ship), HONEST-03 (owner decision before support-copy direction). HONEST-03 is a `/gsd-discuss-phase 64` input, not a blocker to earlier phases.
6. **Owner-run deployment residuals** — edge-function deploys via `bun scripts/deploy-edge-functions.ts` (CLI-401 workaround); MCP-applied migrations reconciled to prod timestamps via `list_migrations`, then `bun run db:types`.

## Research Flags (deeper research at plan time)

- **Phase 59 (Notice Library):** per-state notice-period data + UPL-safe disclaimer language are jurisdiction-specific (MEDIUM confidence). Run `/gsd-plan-phase 59 --research-phase`; align with resolved ToS governing-law (Texas, MKTUI-02).
- **Phase 61 (Schedule E):** `expenses.amount` integer-vs-`numeric(10,2)` reconciliation (migrate column vs mapper boundary) is a planning-time decision. Run `/gsd-plan-phase 61 --research-phase`.
- **Phase 63 (Unit Turnover):** highest orchestration surface; advisory non-gating state-machine design must be worked out against the live inspection/maintenance/lease schemas. Run `/gsd-plan-phase 63 --research-phase`.

## Blockers

None.

## Roadmap Evolution

- 2026-05-22: v1.0 "Marketing Surface Honesty" shipped + archived (15 phases).
- 2026-06-02: v2.0 "Dashboard Command Center" shipped + archived (7 phases, 34/34).
- 2026-06-02: v3.0 "Security Hardening" shipped + archived (3 phases, 12/12).
- 2026-06-07: v4.0 "Hardening & Hygiene" shipped + archived (8 phases, 20/21).
- 2026-06-10: v5.0 "AI Blog Content Engine" shipped + archived (6 phases 9-14, 9/9).
- 2026-06-14: v6.0 "Final Canonical Cleanup" created + resolved (5 phases 15-19).
- 2026-06-25: v7.0 "TanStack Form Composition Migration" (5 phases 20-24) paused mid-flight (20-22 merged).
- 2026-07-10: v8.0 "Correctness Restoration" shipped + archived (11 phases 25-35, 71/72 + remediation).
- 2026-07-17: v9.0 "Full-Surface Remediation" shipped + archived (16 phases 36-51, 296/296 accounted).
- 2026-07-19: v10.0 "Claims Integrity + Canonical Feature Expansion" started — REQUIREMENTS (58 reqs, traceability filled) + ROADMAP (13 phases 52-64) authored. Integer phase numbers continue across milestones (v9.0 ended at 51; v10.0 is 52-64).

## Next Action

Plan **Phase 52** (Notification Center, Activity Feed & Channel Honesty). It establishes the shared `create_notification` write-path RPC that nearly every later phase calls, so it lands first. Run `/gsd-plan-phase 52`. Branch (`gsd/phase-52-...`) only after confirming main is at the v9.0 end-state. This phase is primarily UI + write-path wiring over existing `notifications`/`activity` tables, folds in the SMS/push toggle removal (HONEST-01/02) and orphan schema cleanup (CLEAN-01/02), and ships the retention cron.

## Overrides

(none active)

---
*Last updated: 2026-07-19 — v10.0 "Claims Integrity + Canonical Feature Expansion" roadmap authored; REQUIREMENTS (58 reqs, traceability filled) + ROADMAP (13 phases 52-64). Integer phase numbers continue across milestones. Trust `git log main` + `gh pr list --state merged` + `.planning/ROADMAP.md` as source of truth over this cache.*
