---
gsd_state_version: 1.0
milestone: v10.0
milestone_name: Claims Integrity + Canonical Feature Expansion
status: executing
last_updated: 2026-08-08T00:00:00.000Z
last_activity: 2026-08-08 -- Phase 66 EXECUTED, all 17 plans across 7 waves; DB + edge fn LIVE in prod
progress:
  total_phases: 14
  completed_phases: 6
  total_plans: 55
  completed_plans: 55
  percent: 43
stopped_at: Phase 66 executed (17/17). NOT yet verified or shipped -- next is /gsd-verify-work 66, then the perfect-PR gate and a PR. Branch gsd/phase-66-rental-application-intake.
---

<!--
NUMERIC ORDER NOW EQUALS EXECUTION ORDER — the hand-correction this block used to
carry is no longer needed, because the cause was removed rather than patched.

GSD derives execution order from the phase-number integer and nothing else.
`isLastPhase` starts true (sdk/src/query/phase-lifecycle.ts:1189) and is cleared only
by `comparePhaseNum(...) > 0`, which reads integer + letter suffix + decimal segments
(helpers.ts:231-261). ROADMAP's `**Depends on:**` and its execution-order sentence are
display metadata that no ordering code reads. So when 65 completed, nothing exceeded
it numerically and the CLI stamped `milestone_complete` with 8 phases outstanding.

Renumbering the unstarted phases 57-64 -> 66-73 (2026-08-04) makes the tool's only
ordering input agree with the intended order. Phase 65 keeps its number; the append-only
integer convention recorded in PROJECT.md is honoured, not reopened.

Progress-table first cells are BARE NUMBERS deliberately. The read side
(phase-lifecycle.ts:1309) matches `\|\s*\d+[A-Z]?\S*\s*\|...`, which a cell containing
spaces can never satisfy — that is why `completed_phases`/`percent` silently stopped
deriving and sat stale at 5 / 36%. The write side (:1105-1121) has an explicit 4-cell
branch, so bare numbers still update correctly on completion. Do NOT restore names to
this table, and do NOT use slug cells — a slug satisfies the read side but breaks the
write side, which requires whitespace immediately after the number. Phase names live in
the checklist and the `### Phase N:` headings.

Still hand-maintained: `total_phases`. The header regex expects `| Phase | Plans | ... |`
and this table reads `Plans Complete`, so `derivedTotalPhases` is null either way;
`percent` derives from the frontmatter fallback.
-->


# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value (v10.0):** Every claim sold on the marketing surface is delivered end-to-end in the product, the built-but-unshipped backend becomes user-facing features, and the canonical landlord feature set ships within Next.js 16 idioms — extending, never violating, the landlord-only / no-rent-facilitation / tenants-are-records positioning. Grounded in the 2026-07-19 full feature audit (4 confirmed claims gaps + orphaned backend + canonical feature roadmap).

**Current focus:** Phase 66 — Rental Application Intake (next by execution order)

## Current Position

Phase: 66 (rental-application-intake) — EXECUTED, not yet verified or shipped
Plan: 17 of 17 complete (7 waves)

**Production changes are ALREADY LIVE** (both owner-approved at their blocking gates):
- 4 migrations applied 2026-08-07 via Supabase MCP. Prod-assigned versions `20260807003342`
  (schema) / `003555` (7 RPCs) / `003630` (retention + cron `35 3 * * *`) / `003639` (GDPR
  cascade). Repo filenames reconciled to match. `src/types/supabase.ts` regenerated.
- Edge function `apply-token` deployed **v1 ACTIVE**, `verify_jwt=false`. All 13 bundled
  files sha256-identical to disk.

Smoke-verified against prod in rolled-back transactions: `create_application_link` returns a
64-char hex token (proves the `extensions.digest` qualification resolves — the one line that
applies clean and fails only at first call), and `create_notification` accepts
`application_received` without 23514. Zero rows persisted.

**Not yet exercised end-to-end.** No valid application has ever been submitted. The E2E and
RLS suites are authored but have never run locally — see the env note below.

**Local test-env blockers (pre-existing, NOT introduced by this phase):**
- `.env.local` holds only `VERCEL_OIDC_TOKEN`, so `bun run test:integration` dies in
  globalSetup and `next build` fails at `/blog/[slug]` page-data collection. Confirmed
  pre-existing by running an untouched suite. **Never edit `.env.local`.**
- `tests/e2e/playwright.config.ts:323` starts its webServer with
  `rm -rf .next && rm -f .env.local` — running the E2E suite locally DELETES `.env.local`.
  Both suites run in CI, where `e2e-smoke` and `rls-security` fail hard on missing secrets.

**Three upstream defects this phase found and fixed:**
1. ROADMAP SC-1 / REQUIREMENTS APPLY-01 specified a `PUBLIC_ROUTES` allow-list that does not
   exist — gating is a DENY-list, so implementing it as written would have shipped
   `/applications` publicly reachable. ROADMAP and CLAUDE.md both corrected.
2. 66-04's summary claimed `coalesce` stops `approved -> reviewing -> approved` re-stamping
   the retention clock. Verified false against the live function; the non-terminal branch
   nulls `decided_at`. SQL deliberately unchanged (clocking from the latest decision is
   defensible under 42 USC 3613(a)(1)(A)); the summary was corrected.
3. 66-17 found the owner E2E spec would have run in NO CI project — CI runs
   `smoke`/`public`/`owner-axe` and never `owner`. Re-wired into `owner-axe`; verified 16
   tests land in `[public]` and 5 in `[owner-axe]`.

**Carried-forward hazards:** `scripts/deploy-edge-functions.ts` duplicates the `verify_jwt`
matrix from `config.toml` and pins itself to a superseded commit — both must be edited for
any new function. And 29 production migration versions have no repo file, which blocks
`supabase db push` project-wide (a history repair would falsely claim they never ran; not done).
Status: Planning complete and verified. Branch `gsd/phase-66-rental-application-intake`
is 8 doc commits ahead of `origin/main` with nothing missing from main. Phase 65 shipped,
merged (#960) and is live; 66-73 remain.

**Phase 66 planning artifacts** — CONTEXT (D-01..D-17) · RESEARCH · UI-SPEC (approved by
gsd-ui-checker after one BLOCK + adversarial re-verify) · VALIDATION · 66-01..66-17 PLAN.md
(plan-checker: VERIFICATION PASSED, 2 non-blocking warnings, one of which is now closed).
Requirements coverage independently re-checked: APPLY-01..06 all covered, 6/6.

**Two owner-gated plans** (`autonomous: false`) — 66-06 applies migrations to PRODUCTION
via Supabase MCP (there is no local stack; `supabase db push` would hit prod directly, and
the CLI has a standing auth failure here), then reconciles repo filenames against the
prod-assigned timestamps and regenerates types. 66-08 deploys the edge function. Neither
runs unattended, and build/typecheck pass WITHOUT the migration ever being applied — that
false-green already happened once in v9.0, where three migrations sat unapplied behind
green CI.

**Two upstream corrections made during planning** — ROADMAP SC-1 and REQUIREMENTS APPLY-01
both said the public route is "added to proxy `PUBLIC_ROUTES`". No such list exists: gating
is a DENY-list (`PRIVATE_ROUTE_PREFIXES` in `src/lib/routes/private-routes.ts`), so `/apply`
is public by absence and `/applications` must be ADDED or the owner review queue ships
publicly reachable. ROADMAP was corrected; CLAUDE.md still carries the stale wording.
Separately, RESEARCH's honeypot assertion (`toBeHidden()`) is wrong — Playwright visibility
is geometric, so `left:-9999px` reads as visible; UI-SPEC §E-6/E-7 carries the fix.
Numeric order now equals execution order, so the tool and the roadmap agree — see
the note in the frontmatter above for why that matters.
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

- **Phase 68 (Notice Library):** per-state notice-period data + UPL-safe disclaimer language are jurisdiction-specific (MEDIUM confidence). Run `/gsd-plan-phase 59 --research-phase`; align with resolved ToS governing-law (Texas, MKTUI-02).
- **Phase 70 (Schedule E):** `expenses.amount` integer-vs-`numeric(10,2)` reconciliation (migrate column vs mapper boundary) is a planning-time decision. Run `/gsd-plan-phase 61 --research-phase`.
- **Phase 72 (Unit Turnover):** highest orchestration surface; advisory non-gating state-machine design must be worked out against the live inspection/maintenance/lease schemas. Run `/gsd-plan-phase 63 --research-phase`.

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
