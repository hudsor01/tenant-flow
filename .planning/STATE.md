---
gsd_state_version: 1.0
milestone: v10.0
milestone_name: Claims Integrity + Canonical Feature Expansion
status: executing
last_updated: "2026-07-31T14:33:27.399Z"
last_activity: 2026-07-31
progress:
  total_phases: 14
  completed_phases: 4
  total_plans: 35
  completed_plans: 34
  percent: 29
---

# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value (v10.0):** Every claim sold on the marketing surface is delivered end-to-end in the product, the built-but-unshipped backend becomes user-facing features, and the canonical landlord feature set ships within Next.js 16 idioms — extending, never violating, the landlord-only / no-rent-facilitation / tenants-are-records positioning. Grounded in the 2026-07-19 full feature audit (4 confirmed claims gaps + orphaned backend + canonical feature roadmap).

**Current focus:** Phase 56 — reporting-hub-documents-landing

## Current Position

Phase: 56 (reporting-hub-documents-landing) — EXECUTING
Plan: 8 of 8
Status: Wave 5 complete — the RPTHUB-04 gate is DISCHARGED and the legacy `/financials` tree is deleted. Only 56-08 (wave 6, the global sweep) remains.
Last activity: 2026-07-31 — executed 56-07 (3 tasks, 3 commits: `51192fdf0` deletion, `4d0c39526` next.config.ts wiring, `e2c2fa1d9` the 17 redirect assertions)

> **THE RPTHUB-04 GATE IS GREEN. This supersedes the block that stood here
> after 56-06.** PR #957's `e2e-smoke` job executed
> `tests/e2e/tests/reports-hub.spec.ts`: **PASS in 3m53s, 88 passed + 1 skipped
> = 89 tests.** A local `--list` under CI's exact
> `--project=smoke --project=public --project=owner-axe` selection resolves to
> the same 89 tests in 9 files, 9 of them `reports-hub`. The hub spec contains
> **zero** skips — the single skip is a conditional in
> `critical-paths`/`seo-smoke`. All 8 hub routes render for an authenticated
> owner.
>
> **56-07 therefore deleted `src/app/(owner)/financials/` legitimately**, after
> the proof rather than with it, which is exactly what RPTHUB-04 requires. The
> ordering is auditable in the commit graph: the CI run precedes `51192fdf0`.

> **The duplication is over — `/financials` is gone and `/reports` is the only
> tree.** 44 files deleted, `"/financials"` removed from
> `PRIVATE_ROUTE_PREFIXES` (a `0 insertions / 1 deletion` diff), and
> `grep -c 'financials' .next/server/app-paths-manifest.json` returns **0** while
> all 8 `/(owner)/reports/**/page` keys remain. Threat T-56-19 (the two trees
> diverging) and T-56-20 (doubled colocated tests) are both closed — the unit
> suite went 310 → **308 files, 106181 tests passed**.
>
> **All six `financials-*` components were DELETED, not moved — D-41 overridden
> with evidence.** D-41 claimed `financials-summary-stats.tsx` had a second
> consumer at `expenses/_components/expense-stats.tsx`. **False:** that is a code
> COMMENT (`// Match financials-summary-stats: dollars, two decimals...`), not an
> import, and it exists in *both* the legacy and 56-05's copied tree.
> `financials/page.tsx` was the sole importer of all six, so moving any of them
> would have shipped dead files.

> **The 7 redirects are wired and compiled — verified from
> `.next/routes-manifest.json`, not asserted.** All 7 sources present as **308**
> with exact destinations, **0 of the 10 guard paths leaked**. Every compiled
> regex is both-ends-anchored (`^(?!/_next)/financials/cash-flow(?:/)?$`), so
> D-32's ordering non-issue holds. The check script was proven to *detect*: fed a
> synthetic manifest with the stale `/analytics/financial -> /reports/analytics`
> entry it exited 1 naming the leak.
>
> `next.config.ts` gained **+23 / -0** — all 5 pre-existing literal entries, the
> blog spread and `fetchPublishedBlogSlugs` are byte-unchanged, `rewrites` count
> is 0, and `experimental.useTypeScriptCli` is intact (**never remove it** —
> TypeScript 7 is the Go-native compiler and ships no JS compiler API).
>
> The 17 live assertions are in `tests/e2e/tests/public/reporting-redirects.spec.ts`,
> selected by the `public` project (`-g "RPTHUB-02"` → 17 tests; CI's three-project
> selection went 89 → **106 tests in 10 files**). **They have not executed yet** —
> `e2e-smoke` on the next push is their first run.
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
>
> **Workaround found by 56-07 for the manifest case:**
> `SKIP_ENV_VALIDATION=true bunx next build --experimental-build-mode compile`
> exits **0** and writes `.next/routes-manifest.json`; compile-only mode skips
> the page-data collection step that hits the missing env. The full-build failure
> was proven pre-existing by reproducing it at HEAD with 56-07's `next.config.ts`
> change reverted. Note either build mode rewrites `next-env.d.ts` — revert with
> `git checkout -- next-env.d.ts`.

> **Requirements still NOT marked complete.** RPTHUB-01 is listed in 56-01's and
> 56-03's frontmatter, RPTHUB-02 in 56-02's and 56-07's, RPTHUB-03 in 56-01's and
> 56-04's, RPTHUB-04 in 56-06's and 56-07's. **RPTHUB-03** (56-04's drift guard,
> proven against six perturbations) and **RPTHUB-04** (PR #957's `e2e-smoke`
> proving the hub green before 56-07's deletion) are now genuinely satisfied.
> RPTHUB-01 and RPTHUB-02 are NOT: 56-08 still has to repoint the nav, the Cmd+K
> palette and the breadcrumb LABEL_MAP, all of which still deep-link into
> `/financials`. `.planning/REQUIREMENTS.md` remains untouched by all seven plans
> — 56-04 onward were explicitly instructed not to run
> `requirements.mark-complete`, because 56-01's reflexive run flipped
> RPTHUB-01/03 to Complete while both were still false and had to be reverted.
> **The phase-level verifier marks all four, after 56-08.**

> **D-34 is now enforced, not just decided.** `/reports` holds zero charts:
> `/reports/analytics` and its five children are deleted, the four recharts
> report sections are deleted, and
> `src/app/(owner)/reports/__tests__/reports-hub-purity.test.ts` scans the whole
> subtree on every unit run. It was proven to fail against a planted `recharts`
> import. Any later plan adding a file under `src/app/(owner)/reports/` inherits
> that guard plus the D-30 index-purity, D-33 broken-key and D-18 no-bare-Revenue
> assertions.

> **Phase 56 is mid-execution: 7 of 8 plans done, gate DISCHARGED.**
> Branch `gsd/phase-56-reporting-hub-documents-landing`, PR #957 open.
>
> **Local E2E execution remains impossible and that has not changed.**
> `E2E_OWNER_*` are `e2e-smoke` GitHub secrets, and
> `tests/e2e/playwright.config.ts:284`'s webServer command begins
> `rm -rf .next && rm -f .env.local` — running the suite locally DELETES
> `.env.local`. **CI is the only place any Playwright spec in this repo can
> run.** `--list` is safe and is how 56-06 and 56-07 both proved selection.
> Only 56-07's 17 redirect assertions are still awaiting a first execution.
>
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

Progress: [██████████] 97%

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

Execute **56-08**, the final plan of Phase 56, on branch
`gsd/phase-56-reporting-hub-documents-landing` (PR #957 open). Wave order is
discharged: 56-06 proved the hub in CI, 56-07 deleted `/financials`.

Four things 56-08 must not get wrong:

1. **The `/financials` sweep carries a deliberate `grep -v 'reporting-redirects'` exclusion.** Three files must permanently name the six legacy `/financials` sources — the redirect map (`src/lib/seo/reporting-redirects.ts`), its unit test, and 56-07's E2E spec (`tests/e2e/tests/public/reporting-redirects.spec.ts`). Without the filter the sweep is unsatisfiable in any order. The filter is bounded by a companion assertion that the map still holds all 6 sources; do not drop that assertion, and do not rename any of those three files.
2. **Expect 39 remaining matches, not 36.** `grep -rn '/financials' src tests | grep -v 'reporting-redirects'` returns 39 across 10 files: breadcrumbs.test.ts 12, main-nav.tsx 5, app-shell.tsx 5, e2e routes.ts 4, auth-redirect.test.ts 3, main-nav.test.tsx 3, reports-hub.spec.ts 2, analytics/financial/page.tsx 2, breakdown-list.test.tsx 2, playwright.config.ts 1. The 3 over the planned 36 are 56-06 comment lines added after 56-02 took its baseline — do NOT delete them, they explain the gate.
3. **Do not remove `experimental.useTypeScriptCli` from `next.config.ts`.** TypeScript 7 is the Go-native compiler and ships no JS compiler API; without the flag `next build` exits 1 immediately.
4. **`tests/e2e/tests/constants/routes.ts` still carries 4 `FINANCIALS_*` keys plus `REPORTS_ANALYTICS`, all pointing at deleted routes.** `owner/owner-financials.e2e.spec.ts` consumes the four; it is superseded by `reports-hub.spec.ts` and runs only in the `owner` project CI never invokes (D-25). Deleting the spec and its constants together is the clean move.

## Overrides

(none active)

---
*Last updated: 2026-07-19 — v10.0 "Claims Integrity + Canonical Feature Expansion" roadmap authored; REQUIREMENTS (58 reqs, traceability filled) + ROADMAP (13 phases 52-64). Integer phase numbers continue across milestones. Trust `git log main` + `gh pr list --state merged` + `.planning/ROADMAP.md` as source of truth over this cache.*
