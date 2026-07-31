---
gsd_state_version: 1.0
milestone: v10.0
milestone_name: Claims Integrity + Canonical Feature Expansion
status: executing
last_updated: "2026-07-31T13:59:42.935Z"
last_activity: 2026-07-31
progress:
  total_phases: 14
  completed_phases: 4
  total_plans: 35
  completed_plans: 33
  percent: 29
---

# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value (v10.0):** Every claim sold on the marketing surface is delivered end-to-end in the product, the built-but-unshipped backend becomes user-facing features, and the canonical landlord feature set ships within Next.js 16 idioms — extending, never violating, the landlord-only / no-rent-facilitation / tenants-are-records positioning. Grounded in the 2026-07-19 full feature audit (4 confirmed claims gaps + orphaned backend + canonical feature roadmap).

**Current focus:** Phase 56 — reporting-hub-documents-landing

## Current Position

Phase: 56 (reporting-hub-documents-landing) — EXECUTING
Plan: 7 of 8
Status: Wave 4 complete on paper — 56-06 authored and registered the hub E2E spec, but it HAS NOT RUN. Wave 5 (56-07 legacy deletion) is BLOCKED on a CI result, not on 56-06's completion.
Last activity: 2026-07-31 — executed 56-06 (2 tasks, 2 commits: `19a3e8453` spec, `e3e63f8aa` config registration)

> **THE RPTHUB-04 GATE IS NOT GREEN. Do not let 56-07 delete `/financials`.**
> 56-06 created `tests/e2e/tests/reports-hub.spec.ts` (9 tests: 8 hub routes +
> 1 D-31 index check) and registered it in the `owner-axe` Playwright project —
> one of the three CI's `e2e-smoke` job actually invokes
> (`--project=smoke --project=public --project=owner-axe`). Registration is
> **proven**: `--list` under that exact invocation enumerates all 9 tests, and
> `--project=chromium --list` enumerates 0 (no double-execution). Pre-registration
> the numbers were the reverse (chromium 9, owner-axe 0), so the entry is
> load-bearing.
>
> **But the spec has never executed.** Two independent blockers, both recorded
> with evidence in 56-06-SUMMARY.md:
> 1. `tests/e2e/playwright.config.ts:284-286` — the `webServer` command begins
>    `rm -rf .next && rm -f .env.local`. Running `playwright test` locally
>    **deletes the gitignored `.env.local`**, which is unrecoverable and
>    forbidden. Nothing was listening on :3050, so `reuseExistingServer` would
>    not have applied. The run was deliberately declined. (`--list` is safe and
>    was proven non-destructive: `.env.local` stat unchanged across all runs.)
> 2. No `tests/e2e/.env.test`, no `E2E_OWNER_EMAIL`/`E2E_OWNER_PASSWORD` in the
>    env or `.env.local`, no Supabase URL/key (falls back to
>    `127.0.0.1:54321`, nothing listening). `loginAsOwner` throws at
>    `auth-helpers.ts:277-279` before the first navigation. Those values are
>    GitHub Actions secrets, `e2e-smoke`-only.
>
> There is also **no CI run to cite**: the branch has no upstream and
> `gh pr list` returns `[]` — it has never been pushed.
>
> **The one action that closes the gate:** push the branch, open the PR, confirm
> `e2e-smoke` reports **9 passing `Reports hub routes` tests**. Only then may
> 56-07 remove `src/app/(owner)/financials/`. Shipping the deletion without that
> makes RPTHUB-04 a false claim inside a claims-integrity milestone.

> **Both route trees are live right now, and that is the point.** The five
> statement routes were **copied**, not `git mv`d: `/financials/{balance-sheet,
> cash-flow,expenses,income-statement,tax-documents}` and their `/reports/*`
> twins are byte-identical (`diff -r` clean on all five pairs) and all eleven
> routes compile into the same Next.js build, verified from
> `.next/server/app-paths-manifest.json`. A `git mv` is an atomic
> delete-plus-create, which would make RPTHUB-04's "prove the hub in CI BEFORE
> removing the legacy URLs" impossible to audit. **56-06 proves, then 56-07
> deletes.** Nothing may edit either tree in between, or the duplication
> diverges (threat T-56-19).
>
> **56-07 must delete the ORIGINALS.** `src/app/(owner)/financials/` only.
> After deletion, confirm the five `/reports/*` trees survive intact.

> **The purity guard's D-18 label scan is now path-scoped, and the scoping is
> self-invalidating.** The copied income statement carries a GAAP "Total
> Revenue" subtotal — itemised on its own face from `get_income_statement`, not
> a third undefined derivation — so `/reports/income-statement/` is exempt from
> the D-18 *label* check. It was paid for: the JSX matcher was widened to span
> newlines in the same edit, so everywhere else under `/reports` D-18 is now
> stricter than 56-03 shipped it. Three assertions bound the exemption — it must
> resolve to a real directory, it must still be flagging something, and it can
> never reach `page.tsx`, `reports-hub-entries.ts`, `report-hub-tile.tsx` or
> `reports-summary-strip.tsx`. **Do not widen `D18_EXEMPT_DIRS` to silence a new
> failure**; a Revenue label on any other hub surface is exactly the defect D-18
> exists to catch. The D-34 zero-charts block was never touched and is green.

> **`bun run dev` and `next build` cannot run in this working copy.**
> `.env.local` is missing the app vars, so dev fails env validation and a
> `SKIP_ENV_VALIDATION=true` build dies in `/blog/[slug]`'s build-time Supabase
> fetch. Never edit `.env.local`. Local verification must use the unit suite,
> typecheck, lint and the build manifest — not a running server.

> **Requirements still NOT marked complete — including RPTHUB-03, which 56-04
> does deliver.** RPTHUB-01 is listed in 56-01's and 56-03's frontmatter,
> RPTHUB-02 in 56-02's, RPTHUB-03 in 56-01's and 56-04's. Of these only
> **RPTHUB-03 is now genuinely satisfied** (56-04's drift guard, proven to fail
> against six perturbations). The rest are not: the five statement routes do not
> exist yet (56-05), `/financials` is not absorbed (56-07), and the redirect map
> is authored but deliberately unwired from `next.config.ts` until 56-07 (D-11).
> `.planning/REQUIREMENTS.md` remains untouched by all four plans — 56-04 was
> explicitly instructed not to run `requirements.mark-complete`, because 56-01's
> reflexive run flipped RPTHUB-01/03 to Complete while both were still false and
> had to be reverted. The phase-level verifier marks RPTHUB-03.

> **D-34 is now enforced, not just decided.** `/reports` holds zero charts:
> `/reports/analytics` and its five children are deleted, the four recharts
> report sections are deleted, and
> `src/app/(owner)/reports/__tests__/reports-hub-purity.test.ts` scans the whole
> subtree on every unit run. It was proven to fail against a planted `recharts`
> import. Any later plan adding a file under `src/app/(owner)/reports/` inherits
> that guard plus the D-30 index-purity, D-33 broken-key and D-18 no-bare-Revenue
> assertions.

> **Phase 56 is planned and gate-clean.** Branch `gsd/phase-56-reconciled`.
> Two planning lines were reconciled to full separation (D-29): `/reports`
> becomes the hub, `/analytics` stays a peer section, `/financials` is deleted
> behind 308s. DOCS-01 and the whole `/documents` landing split out to
> **Phase 65** — no Phase 56 plan, task or test may claim it.
>
> Waves: 1 = 56-01 (hub scaffold) + 56-02 (redirect map); 2 = 56-03, 56-04;
> 3 = 56-05; 4 = 56-06 (E2E proof); 5 = 56-07 (legacy deletion); 6 = 56-08
> (second route table + A/R and export deletions). Waves 3-6 are strictly
> serial by design — the phase's central requirement is an ordering guarantee
> (prove the new surface green BEFORE deleting the old one).
>
> Three live production defects are fixed by deletion in this phase: the
> fabricated A/R tile (`financial-keys.ts:153` assigns monthly revenue to
> `accounts_receivable`), the permanently-zero analytics cards, and the same
> broken mapper reaching customer-facing executive-monthly exports.

Progress: [█████████░] 94%

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

Execute **Phase 56** (Reporting Hub). Run `/gsd-execute-phase 56` on branch `gsd/phase-56-reconciled`.

Two things the executor must not get wrong:

1. **Wave order is load-bearing, not a scheduling nicety.** 56-06 proves the new `/reports` surface green in E2E; only then does 56-07 delete `/financials`. Running them concurrently, or reordering, means deleting the old surface before the new one is proven.
2. **The `/financials` sweep in 56-08 carries a deliberate `grep -v 'reporting-redirects'` exclusion.** Three files must permanently name the six legacy `/financials` sources — the redirect map (`src/lib/seo/reporting-redirects.ts`), its unit test, and the E2E spec. Without the filter the sweep is unsatisfiable in any order. The filter is bounded by a companion assertion that the map still holds all 6 sources; do not drop that assertion, and do not rename any of those three files.

## Overrides

(none active)

---
*Last updated: 2026-07-19 — v10.0 "Claims Integrity + Canonical Feature Expansion" roadmap authored; REQUIREMENTS (58 reqs, traceability filled) + ROADMAP (13 phases 52-64). Integer phase numbers continue across milestones. Trust `git log main` + `gh pr list --state merged` + `.planning/ROADMAP.md` as source of truth over this cache.*
