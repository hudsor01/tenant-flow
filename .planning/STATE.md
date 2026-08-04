---
gsd_state_version: 1.0
milestone: v10.0
milestone_name: Claims Integrity + Canonical Feature Expansion
status: executing
last_updated: 2026-08-04T14:43:51.788Z
last_activity: 2026-08-04 -- Phase 65 MERGED (#960) and deployed to production
progress:
  total_phases: 14
  completed_phases: 6
  total_plans: 38
  completed_plans: 38
  percent: 43
stopped_at: Phase 65 merged (#960) and live in production. Next by EXECUTION order is Phase 57.
---

<!--
CORRECTED BY HAND after `gsd-sdk query phase.complete 65`. The CLI wrote
`status: milestone_complete` with `stopped_at: "Milestone complete (Phase 65 was
final phase)"`, which is false: it sorts phases NUMERICALLY, and 65 is the highest
integer, but ROADMAP.md line 275 fixes the EXECUTION order as
52 → 53 → 54 → 55 → 56 → 65 → 57 → … Phases 57-64 are all still `[ ]` and read
"Not started" in the ROADMAP progress table. The same frontmatter contradicted
itself — 6 of 14 phases done cannot be a complete milestone.

`completed_phases` and `percent` were also left stale at 5 / 36% (52, 53, 54, 55,
56, 65 is six; 6/14 = 43%). Re-run of `phase.complete` on any later phase will
likely reintroduce the milestone_complete error — check this block first.
-->


# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value (v10.0):** Every claim sold on the marketing surface is delivered end-to-end in the product, the built-but-unshipped backend becomes user-facing features, and the canonical landlord feature set ships within Next.js 16 idioms — extending, never violating, the landlord-only / no-rent-facilitation / tenants-are-records positioning. Grounded in the 2026-07-19 full feature audit (4 confirmed claims gaps + orphaned backend + canonical feature roadmap).

**Current focus:** Phase 57 — Rental Application Intake (next by execution order)

## Current Position

Phase: 65 (documents-landing) — SHIPPED, MERGED (#960), DEPLOYED
Plan: 3 of 3 complete
Status: Between phases. Next by EXECUTION order is Phase 57 (Rental Application
Intake), not "milestone complete" — 57-64 remain. See the correction note in the
frontmatter above.
Last activity: 2026-08-04 -- Phase 65 verified passed (11/11), UAT 2/2, security 15/15,
perfect-PR two consecutive clean cycles; merged as `8dce5c6d6` and deployed
(`dpl_CYSWsXj68wT7pj7KABdzi9Mranw4`, READY, zero runtime errors)

> **Phase 65 production state — what is and is NOT verified live.** Confirmed
> against production: the deployed commit is `8dce5c6d6`; `/documents`,
> `/documents/vault`, `/documents/lease-template` and all four
> `/documents/templates/*` routes resolve to the auth gate rather than 404, so
> every Band 2 and Band 3 tile href points at a real route in the deployed tree;
> and `/documents` now carries `redirect=%2Fdocuments` into `/login` — its own
> path — so a bookmarked link returns to the landing after sign-in instead of
> bouncing to the vault as it did pre-65.
>
> **NOT verified: the rendered landing itself.** `/documents` sits behind the
> proxy auth + subscription gate, which fires before Next routing, so an
> unauthenticated check only ever observes the 307. The three bands, the
> medallion ladder and the recent-documents panel were measured pre-merge
> against the real compiled stylesheet (65-HUMAN-UAT.md test 2), NOT against
> production HTML. One logged-in load of `/documents` closes this.
>
> **Also shipped 2026-08-04, outside Phase 65** (production audit): the
> `www.tenantflow.app` certificate incident — www had never been added as a
> Vercel project domain, so no cert was ever provisioned and the leftover
> wildcard expired 2026-07-21. Domain added (cert valid to 2026-11-02) and the
> www -> apex redirect committed to `next.config.ts` (#962), verified live at
> 308 with path and query preserved, one hop, apex unaffected. Cron-failure
> dedupe shipped (#961). The `/blog` soft-404 was investigated and deliberately
> NOT fixed — see #961's body for why `dynamicParams = false` would be worse.

> **Verified against production, not just CI.** All six hub redirects return 308
> to their exact targets; `/reports/analytics` inverts to `/analytics/overview`;
> none of the ten guard paths leaked a 308; `/financials/nonexistent` 404s, so
> the six entries do not over-match the prefix; all eight hub routes resolve
> — see the caveat below; chains terminate in 2 hops at
> `/login?redirect=` carrying the NEW path, so a bookmarked legacy URL survives
> sign-in and lands on the hub.
>
> **A 307 to /login does NOT prove a hub route exists — do not reuse that
> inference.** `proxy.ts` matches `PRIVATE_ROUTE_PREFIXES` on the path PREFIX
> before Next routing, so `/reports/definitely-not-a-route` returns the same
> `307 -> /login?redirect=...` as every real route (verified live). The probe
> proves the routes are auth-gated and emit no stale permanent redirect, nothing
> more. Route EXISTENCE is established by the git tree at `ee6d48519` (all eight
> `page.tsx` present) and by the CI production build manifest, both recorded in
> `56-VERIFICATION.md`. `/dashboardxyz` and `/financials/nonexistent` 404 only
> because neither sits under a private prefix.
>
> **The perfect-PR gate record lives in `56-REVIEW.md`** — 15 cycles, and
> specifically the cycle-11 FALSE CLEAN where the harness coerced its own parse
> failure into zero findings. That file carries the standing instruction to audit
> `journal.jsonl` rather than the summary verdict, and the taxonomy of the 13
> guard-shaped findings. The harness is authored per phase, so the fix does not
> carry forward - only the written lesson does. Read it before running a gate.
>
> **Sentry post-deploy gate PASS — read the caveat.** Release `ee6d48519`
> introduced **0 new issue groups** against a threshold of 10, compared to
> baseline `2e8425bac`. But it ran with `SNAPSHOT_DEGRADED: true`: the token
> lacks `event:read`, so per-issue detail and the crash-free-rate delta were
> unavailable, and the prior baseline's error-rate value is a placeholder — the
> **error-rate rule was skipped entirely**. "All thresholds within bounds" is
> true of the one rule it evaluated, not of two. Swapping `SENTRY_AUTH_TOKEN`
> for a PERSONAL token with `event:read` is necessary but NOT sufficient to
> restore the rule on the next run. `post-deploy-sentry-gate.yml` sets
> `DEGRADED=1` from TWO independent causes — `CAN_READ_ISSUES != true` (:557)
> and `PREV_DEGRADED` read from the previous snapshot (:594-597) — and either
> forces `RATE_BREACH=0` (:612). The baseline this deploy just wrote carries
> `"degraded": true`, so the FIRST deploy after a token swap still trips the
> `PREV_DEGRADED` branch and skips the rule again. It takes two deploys, and the
> degraded summary hard-codes "the token lacks `event:read`", which would
> wrongly implicate the new token. Organization tokens structurally cannot read
> issues, so the swap itself is still required.
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
*Last updated: 2026-08-01 - Phase 56 shipped, merged (ee6d48519), deployed and verified in production; RPTHUB-01..04 marked Complete. Roadmap is 14 phases (52-65). Next: Phase 65 Documents Landing.*
