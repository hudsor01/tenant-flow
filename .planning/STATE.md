---
gsd_state_version: 1.0
milestone: v10.0
milestone_name: Claims Integrity + Canonical Feature Expansion
status: verifying
last_updated: "2026-07-31T14:58:01.807Z"
last_activity: 2026-07-31
progress:
  total_phases: 14
  completed_phases: 5
  total_plans: 35
  completed_plans: 35
  percent: 36
---

# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value (v10.0):** Every claim sold on the marketing surface is delivered end-to-end in the product, the built-but-unshipped backend becomes user-facing features, and the canonical landlord feature set ships within Next.js 16 idioms — extending, never violating, the landlord-only / no-rent-facilitation / tenants-are-records positioning. Grounded in the 2026-07-19 full feature audit (4 confirmed claims gaps + orphaned backend + canonical feature roadmap).

**Current focus:** Phase 56 — reporting-hub-documents-landing

## Current Position

Phase: 56 (reporting-hub) — SHIPPED, MERGED, DEPLOYED, VERIFIED IN PRODUCTION
Plan: 8 of 8
Status: PR #957 merged as `ee6d48519`; production deploy READY from that SHA
Last activity: 2026-08-01 — live redirect verification + Sentry gate PASS

> **Verified against production, not just CI.** All six hub redirects return 308
> to their exact targets; `/reports/analytics` inverts to `/analytics/overview`;
> none of the ten guard paths leaked a 308; `/financials/nonexistent` 404s, so
> the six entries do not over-match the prefix; all eight hub routes resolve
> (307 to login = exists + gated, not 404); chains terminate in 2 hops at
> `/login?redirect=` carrying the NEW path, so a bookmarked legacy URL survives
> sign-in and lands on the hub.
>
> **Sentry post-deploy gate PASS — read the caveat.** Release `ee6d48519`
> introduced **0 new issue groups** against a threshold of 10, compared to
> baseline `2e8425bac`. But it ran with `SNAPSHOT_DEGRADED: true`: the token
> lacks `event:read`, so per-issue detail and the crash-free-rate delta were
> unavailable, and the prior baseline's error-rate value is a placeholder — the
> **error-rate rule was skipped entirely**. "All thresholds within bounds" is
> true of the one rule it evaluated, not of two. Swapping `SENTRY_AUTH_TOKEN`
> for a PERSONAL token with `event:read` restores the second rule; Organization
> tokens structurally cannot read issues.
>
> **Two human-verification items remain open** (`56-VERIFICATION.md`), neither
> blocking Phase 65, both now easier because the hub is live: the free-tier 402
> click-through, and a visual pass on `/reports` at desktop + 375px. The gate
> itself is proven to fire in production (3 `gate_events` denials) and the
> frontend upgrade CTA is now automated.

Progress: [██████████] 100%

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

- Phase 53 go-live is owner-run: apply C1 (orchestrator) then run 53-GO-LIVE-RUNBOOK.md (deploy send-lease-reminders, set REMINDERS_INVOKE_SECRET + drain_secret + drain_url, apply C2). REMIND-01/04 prod-complete only after.

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

**Phase 65: Documents Landing (DOCS-01).** It executes immediately after Phase 56
— the one deliberate departure from numeric order, recorded at `ROADMAP.md:26`.
It depends on nothing and shares no code, routes or tests with the reporting hub.

Start with `/gsd-discuss-phase 65`, then plan. Its research already exists: when
the phase was split on 2026-07-26, the DOCS-01 material was retained verbatim
under a `PHASE 65` banner in `56-RESEARCH.md` (§Documents Landing) and
`56-UI-SPEC.md` (§"MOVED TO PHASE 65") rather than deleted — including the
three-band ladder, six tiles, nested recent-documents panel, the vault-canonical
decision, and the reversed `permanentRedirect`. Read those before re-researching.

Two carried decisions to re-confirm rather than assume: the nav `Documents`
entry currently still targets `/documents/vault`, and the one-item `Templates`
nav section still exists. Both were consequences of DOCS-01 that Phase 56
deliberately did NOT apply (`56-UI-SPEC.md:261`).

## Overrides

(none active)

---
*Last updated: 2026-07-31 — Phase 56 execution complete (8/8 plans). v10.0 "Claims Integrity + Canonical Feature Expansion" roadmap authored 2026-07-19; REQUIREMENTS (58 reqs, traceability filled) + ROADMAP (13 phases 52-64). Integer phase numbers continue across milestones. Trust `git log main` + `gh pr list --state merged` + `.planning/ROADMAP.md` as source of truth over this cache.*
