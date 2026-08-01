---
phase: 56-reporting-hub-documents-landing
verified: 2026-07-31T21:22:07Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: null
  previous_score: null
  note: "Initial verification — no prior 56-VERIFICATION.md existed"
gaps: []
deferred:
  - truth: "/documents renders a real landing page instead of a bare redirect (DOCS-01)"
    addressed_in: "Phase 65"
    evidence: "ROADMAP.md:156-166 — Phase 65: Documents Landing, Requirements: DOCS-01. Separation verified held: no Phase 56 plan declares DOCS-01, src/app/(owner)/documents/page.tsx has zero diff vs main and is still permanentRedirect('/documents/vault')."
  - truth: "Accounts Receivable has an assigned owner surface after /financials deletion (CONTEXT OQ-1)"
    addressed_in: "Later phase (OQ-1 unresolved)"
    evidence: "A/R is not lost — /reports/balance-sheet/page.tsx:49-50 renders it from the balance-sheet source. The fabricated get_financial_overview.accounts_receivable field (which published monthlyRevenue under a money-owed label) was excised in f6b8a4df2, not relocated."
human_verification:
  - test: "Sign in as a FREE-tier owner and trigger a premium report export (Year-End PDF from /reports/year-end, or Tax Documents PDF from /reports/tax-documents). Observe the response."
    expected: "HTTP 402 with an upgrade_url in the payload, surfaced as an upgrade prompt — not a generic failure, not a successful download."
    why_human: "NARROWED 2026-08-01 — see ORCHESTRATOR EVIDENCE below. Now open ONLY for the live authenticated round-trip. Established since: (a) the gate provably fires in production — public.gate_events holds 3 real denials for feature='premium_reports' from a non-entitled user (current_plan null, current_status trialing, 2026-06-24); (b) the deployed builds postdate their source, so the verified gate IS the running gate — export-report deployed 2026-05-29 vs source 2026-05-15, generate-pdf deployed 2026-07-11 vs source 2026-07-08, shared tier-gate.ts last changed 2026-05-15; (c) the frontend half is now AUTOMATED — the paywall toast's action label and its navigation to upgradeUrl are asserted and proven to fail when the CTA is removed. Not reachable from here: no JWT exists for any non-entitled user. .env.local holds only VERCEL_OIDC_TOKEN, email confirmation is enabled so a fresh signUp returns no session, and the only non-entitled synthetic account (e2e-admin@tenantflow.app) is the sole is_admin account in production — rewriting its password hash to obtain a session was judged an unacceptable risk for a verification step."
  - test: "Open /reports in a browser at desktop and 375px. Review the new hub index: page header, the 3-card summary strip (Scheduled / Collected / Outstanding), and 7 tiles in the Statements (5) and Exports (2) groups."
    expected: "Brand-consistent tiles, correct spacing, no truncation or overflow at 375px, `Growth` badge legible on Tax Documents and Year-End, summary strip degrading to a single line of copy (not a broken grid) when the RPC errors."
    why_human: "NARROWED 2026-08-01 — open only for RENDERED APPEARANCE. The structural half is now checked statically: the tile grid is `sm:grid-cols-2 xl:grid-cols-3` and the summary strip is `sm:grid-cols-3`, so both collapse to a SINGLE COLUMN below 640px and 375px cannot truncate or overflow a multi-column row; heading order is h1 -> h2 (each section carrying aria-labelledby) -> h3; every decorative icon is aria-hidden and no icon-only control lacks a name; and the subtree contains no bg-white, no bare text-muted and no gradient text. What remains genuinely visual: spacing balance, brand consistency, and Growth-badge legibility. Not reachable from here: the route is gated by proxy.ts on an active subscription, no session is obtainable (see item 1), and a localhost dev server cannot share a prod auth cookie."
  - test: "RESOLVED 2026-08-01 — no human action required. See W-1 RESOLUTION below."
    expected: "Closed as no-defect. The badge is correct as contracted; the ungated CSV is not a gate bypass. The one real inaccuracy was a marketing claim in src/data/faqs.ts:78, fixed in this PR."
    why_human: "Was a product/claims judgement. Canonical research (4 independent readers + synthesis, 2026-08-01) resolved it against the written contract rather than by owner preference, so no decision is outstanding."
---

# Phase 56: Reporting Hub — Verification Report

**Phase Goal:** The duplicated financial-statement surfaces (`/financials/*` and the chart-bearing `/reports/*` index) collapse into one `/reports` hub holding statements + exports and **zero charts**, with tier-gating provably intact, while **all** analytics — operational and financial — stays a separate, untouched peer section.

**Verified:** 2026-07-31T21:22:07Z
**Status:** human_needed (4/4 requirements verified programmatically; 3 items require a human)
**Re-verification:** No — initial verification
**HEAD:** `c876ae4e5086c50590987a7a0593c0f412d8cf7c` (PR #957, branch `gsd/phase-56-reporting-hub-documents-landing`)

Verification was run against the codebase and CI logs. SUMMARY.md claims were treated as
hypotheses, not evidence; every statement below is backed by a file:line, a command result, or
a GitHub check-run log.

---

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP Success Criterion) | Status | Evidence |
|---|---|---|---|
| 1 | One unified `/reports` hub — statements + exports only, ZERO charts — absorbing all six `/financials/*` routes | VERIFIED | See RPTHUB-01 below |
| 2 | `/analytics` remains its own peer section with all seven pages untouched; `/analytics/financial` stays live and is NOT redirected | VERIFIED | See RPTHUB-01 / RPTHUB-02 Guard B |
| 3 | All seven redirect entries resolve as 308s via `next.config.ts` `redirects()` — six INTO the hub, one OUT; no 404s, no `proxy.ts` involvement; non-moving routes emit no redirect | VERIFIED | See RPTHUB-02 |
| 4 | Premium report export tier-gating verified intact after consolidation, and E2E covers hub routes before legacy routes are removed | VERIFIED (1 warning) | See RPTHUB-03 / RPTHUB-04 |

**Score: 4/4 truths verified. 0 gaps. 0 blockers. 1 warning. 3 human-verification items.**

---

## RPTHUB-01 — One chart-free `/reports` hub absorbing `/financials/*` only

**Status: VERIFIED**

### Hub exists and is substantive

`src/app/(owner)/reports/` contains 8 routable pages: the index plus `income-statement`,
`cash-flow`, `balance-sheet`, `expenses`, `tax-documents`, `generate`, `year-end`.

`src/app/(owner)/reports/page.tsx` is a real Server Component (no `"use client"`, 63 lines) that
maps `REPORTS_HUB_GROUPS` × `REPORTS_HUB_ENTRIES` into two `<section aria-labelledby>` blocks.
`reports-hub-entries.ts:69-137` declares exactly 7 entries — 5 `statements`, 2 `exports`.

### Legacy tree is gone, not shadowed

```
$ ls "src/app/(owner)/financials"
ls: src/app/(owner)/financials: No such file or directory

$ git ls-tree -d HEAD "src/app/(owner)/financials"     # empty
$ git ls-tree -d d2f00c4f8 "src/app/(owner)/financials"
040000 tree 4bb806ed009d8ecfec00543d31b134202d246b1e	src/app/(owner)/financials
```

The five statement route trees were git-moved, not rewritten — the full `git diff --stat -M
main..HEAD` renders them as `{financials => reports}/…  | 0`, i.e. zero content change. No live
`/financials` URL string survives anywhere in `src/` or `tests/` outside the redirect map itself
(verified by grepping the five quoting forms `"/financials`, `'/financials`, `` `/financials ``,
`href="/financials`, `(/financials`).

### ZERO CHARTS holds

```
$ grep -rn "recharts|ChartContainer|ResponsiveContainer" "src/app/(owner)/reports" \
    --include="*.tsx" --include="*.ts" | grep -v "__tests__"
NON-TEST-EXIT=1     # no matches
```

The only in-tree occurrences are the banned-token patterns inside the guard itself,
`src/app/(owner)/reports/__tests__/reports-hub-purity.test.ts`, which excludes test paths from
its own scan (`isTestPath`, line 183-190) and strips comments before matching (`stripComments`,
line 193-195).

**The guard is not vacuous.** I checked its self-tests rather than trusting it:

- `reports-hub-purity.test.ts:248-253` asserts the file walk is non-empty and contains the hub
  index — a silently-empty scan would otherwise make every assertion pass.
- `:282-291` asserts the deleted-chart-section import pattern actually fires on the pre-PR
  `dynamic(() => import("…/financial-report-section"))` shape, and does NOT fire on the surviving
  chart-free `year-end-report-section` import.
- `:300-309` pins the hub index actually composes `<ReportsSummaryStrip` from
  `"./reports-summary-strip"` against comment-stripped source — the comment note there records
  that the earlier raw-source version was vacuous because `page.tsx`'s own doc block names the
  component.

### D-33 deleted analytics cards are absent, not relocated

`analytics-stats-row.tsx` and `analytics-payment-methods-chart.tsx` exist nowhere on disk; the
only references are the absence assertions at `reports-hub-purity.test.ts:84-85`. There is no
`src/app/(owner)/reports/analytics` directory.

### `/analytics` survives as an untouched peer

All 7 analytics routes appear in the CI production build manifest at HEAD (`e2e-smoke` job
91271720446 log, WebServer route table): `/analytics`, `/analytics/financial`,
`/analytics/leases`, `/analytics/maintenance`, `/analytics/occupancy`, `/analytics/overview`,
`/analytics/property-performance`. The same log shows **no** `/financials/*` entry.

The only diff under `src/app/(owner)/analytics/` in the entire phase is repointing two dead deep
links from `/financials/*` to `/reports/*` (`analytics/financial/page.tsx:152,171` and its test)
— required, since those hrefs would otherwise route through a redirect.

### Single navigation entry for reporting

`src/components/shell/main-nav.tsx:52-86`: `Analytics → /analytics` (children byte-identical to
`main`) and `Reports → /reports` (7 children mirroring `REPORTS_HUB_ENTRIES`) are two peer
collapsible sections. The `Financials` section and its `Receipt` icon import are deleted.
`src/components/shell/app-shell.tsx:104-160`: the Cmd+K `Financials` group is deleted and its rows
folded into the pre-existing `Analytics & Reports` heading, repointed at `/reports/*`.

### Data-flow trace (Level 4) — the hub's one data dependency is real

`reports-summary-strip.tsx:102` → `useCollectionRate()` →
`use-owner-dashboard-financial.ts:205-224` → `supabase.rpc("get_collection_rate", { p_user_id })`
→ `mapCollectionRateRow`. A real Phase-55 RPC, not a static fallback. Outstanding is derived
in-component as `Math.max(0, scheduled - collected)` from that same payload
(`reports-summary-strip.tsx:129`), never from `get_financial_overview.accounts_receivable`.

---

## RPTHUB-02 — 7 permanent redirects, six in and one out, no proxy involvement

**Status: VERIFIED**

### The map

`src/lib/seo/reporting-redirects.ts:53-83`. Verified by parsing the source rather than reading
the prose around it:

```
count 7
[["/financials","/reports"],
 ["/financials/balance-sheet","/reports/balance-sheet"],
 ["/financials/cash-flow","/reports/cash-flow"],
 ["/financials/expenses","/reports/expenses"],
 ["/financials/income-statement","/reports/income-statement"],
 ["/financials/tax-documents","/reports/tax-documents"],
 ["/reports/analytics","/analytics/overview"]]
into hub 6   out of hub 1
any /analytics source? false
identity noop as source? false
```

Entry 7 targets the concrete `/analytics/overview`, not bare `/analytics` — correct, because
`src/app/(owner)/analytics/page.tsx` in-page-redirects to `/analytics/overview` and bare targeting
would produce a 308 → 307 chain.

### Wiring

`next.config.ts:19` imports the map; `next.config.ts:187-191` spreads it into `redirects()` with
`permanent: true` applied uniformly at the spread site — `permanent: true` is what Next.js emits
as 308.

### No proxy, no rewrites

```
$ git diff --stat main..HEAD -- src/proxy.ts src/lib/supabase/middleware.ts   # empty
$ grep -n "rewrites" next.config.ts                                            # exit 1
```

`src/lib/routes/private-routes.ts` still lists `/analytics` (line 8) and `/reports` (line 18);
the only change is removing the now-dead `/financials` prefix.

### Live assertions actually executed

`tests/e2e/tests/public/reporting-redirects.spec.ts` — 17 tests, all registered in the `public`
Playwright project (`**/public/**/*.spec.ts`) which CI invokes. Confirmed by `--list` under CI's
exact three-project invocation:

```
$ bunx playwright test --config tests/e2e/playwright.config.ts \
    --project=smoke --project=public --project=owner-axe --list
Total: 106 tests in 10 files
   reporting-redirects.spec.ts : 17
   reports-hub.spec.ts         : 9   [owner-axe]
```

Composition: 7 positive (exact `location` header equality, e.g. `:42-43`), 3 Guard A identity
no-ops, 7 Guard B analytics paths. Guard assertions use `expect([301,308]).not.toContain(status)`
— correct, since these routes are auth-gated and legitimately 307 to `/login` for an anonymous
request; only a permanent redirect would prove a config rule matched.

All 17 executed and passed against a real `next build && next start` in CI (job 91271720446 —
`Running 106 tests using 2 workers` → `1 skipped / 105 passed`). Neither
`reporting-redirects.spec.ts` nor `reports-hub.spec.ts` contains any `test.skip`, so the single
skip belongs to `notifications.spec.ts:103` or `seo-smoke.spec.ts` — not to Phase 56.

---

## RPTHUB-03 — Tier-gating intact after consolidation

**Status: VERIFIED, with one recorded warning (W-1)**

### Enforcement point unchanged and still consulted

`supabase/functions/export-report/index.ts:24-30` declares
`PREMIUM_REPORT_TYPES = {year-end, 1099, financial, income-statement, cash-flow}`; `:72-84` still
guards with `if (PREMIUM_REPORT_TYPES.has(reportType)) { … checkTierEntitlement(… GROWTH_AND_MAX_PLANS) }`
and early-returns the 402. `supabase/functions/generate-pdf/index.ts:31` mirrors the set and
`:322` mirrors the gate call.

### Drift guard is real, and reads from disk

`supabase/functions/__tests__/premium-report-gate.test.ts` parses both Deno sets out of the actual
source files (`:72` regex against the `new Set([...])` literal) rather than importing a copy, then
asserts:
- `:136-147` neither parsed set is empty (non-vacuity)
- `:163` the two Deno sets are set-equal
- `:180-188` each file still contains a `PREMIUM_REPORT_TYPES.has(` conditional that calls
  `checkTierEntitlement`
- `:190-213` every badged hub entry maps to a genuinely gated slug, and exactly
  `["tax-documents","year-end"]` carry the badge
- `:216-234` the reportType payloads reachable from the hub's badged routes (`financial`,
  `year-end`) are still members of the parsed export-report set

### No route rewrite bypasses the gate

The 7 redirects rewrite URLs only; no `reportType` string changed. `/reports/year-end/page.tsx`
has **zero diff vs `main`** (`git log main..HEAD -- "src/app/(owner)/reports/year-end/page.tsx"`
returns nothing), and the five moved statement routes are 0-change git moves. The two wired gated
CTAs verified at their call sites: `tax-documents/page.tsx:25,39,131` →
`useDownloadTaxDocumentPdf` → `report-keys.ts:296` `callGeneratePdfEdgeFunction("financial", year)`;
`year-end/page.tsx:75` → `useDownloadYearEndPdf` → `report-keys.ts:288`
`callGeneratePdfEdgeFunction("year-end", year)`.

### Tests green

```
$ bun run test:unit -- "src/app/(owner)/reports" \
    src/lib/seo/__tests__/reporting-redirects.test.ts \
    supabase/functions/__tests__/premium-report-gate.test.ts
Test Files  7 passed (7)      Tests  104 passed (104)
```

### W-1 (WARNING, pre-existing, honestly recorded) — the year-end CSV path is ungated

`/reports/year-end/page.tsx:31-58` defines a local `downloadCsv` helper and `:83-161` builds both
the Year-End and 1099 CSVs entirely client-side from already-fetched RPC data. Neither reaches
`export-report`, so neither can return a 402. `reportMutations.downloadYearEndCsv` /
`download1099Csv` (`report-keys.ts:271-282`) — which DO post to the gated function — have no call
site in `src/`.

Consequence: the `Growth` badge on the Year-End tile is accurate for that page's PDF export and
overstated for its two CSV buttons. `reports-hub-entries.ts:139-143` claims a badge means "its CTA
provably reaches a gated `reportType`", which holds for the route but not for every control on it.

**Not a blocker, and not a Phase-56 regression:** the file is byte-identical to `main`, the
condition predates the consolidation, and the phase surfaced rather than concealed it —
`premium-report-gate.test.ts:244-255` documents it as a recorded finding and `:271-280` pins the
two unexercised mutations so deleting them must be deliberate. RPTHUB-03 as written asks that the
gate be **intact after consolidation**, which it is. Whether the badge should stay is a product
call → routed to human verification.

### W-2 (INFO, pre-existing, honestly recorded) — two dead Export buttons

`income-statement/income-statement-page-header.tsx:61` and `cash-flow/cash-flow-header.tsx:60`
render `Export` controls with no `onClick`. Both files are 0-change git moves from `/financials`.
Recorded at `premium-report-gate.test.ts:257-264` and again at `reports-hub.spec.ts:79-85`, which
explicitly forbids the E2E from clicking or asserting them so a dead control cannot be turned into
a passing claim that it works. Correctly, neither tile carries a `Growth` badge.

---

## RPTHUB-04 — E2E coverage exists for hub routes BEFORE legacy routes were removed

**Status: VERIFIED**

This is the requirement most easily faked by a spec file that gates nothing, so it was verified
three ways: registration, execution, and ordering.

### 1. Registration in a project CI actually invokes

`tests/e2e/tests/reports-hub.spec.ts` (root-level, **not** under `tests/e2e/tests/owner/`).
`playwright.config.ts:189` names it in the `owner-axe` project's explicit filename allowlist;
`:210` adds it to `chromium`'s `testIgnore` so it cannot double-execute.
`.github/workflows/ci-cd.yml:148` runs `--project=smoke --project=public --project=owner-axe`.

The placement matters and the spec's own header says so at `:13-18`: `tests/e2e/tests/owner/`
is claimed by the `owner` project, which CI never invokes. Two sibling specs —
`owner/owner-reports.e2e.spec.ts` and `owner/reports-gate.spec.ts` — sit there and gate nothing.
The hub spec deliberately does not.

### 2. Execution, not just registration

`--list` under CI's exact invocation returns 9 `[owner-axe]` entries for `reports-hub.spec.ts`
(8 route renders + the D-31 group-composition test). Neither the spec nor its describe block
contains a `test.skip`, so all 9 execute unconditionally.

The tests are substantive, not smoke-shaped placeholders: each navigates, asserts the URL did not
land on `/login`, and asserts the exact `<h1>` (`:87-100`). `:103-122` scopes to
`main#main-content` so the sidebar's own live "Analytics" nav entry cannot satisfy or defeat the
"no Analytics group" assertion.

### 3. Ordering — green while `/financials` was still on disk

The decisive evidence is the CI run at `d2f00c4f8` ("hold at the RPTHUB-04 gate before the
destructive plans"), the commit immediately preceding 56-07's deletion:

| Fact | Evidence |
|---|---|
| Spec existed at that commit | `git show d2f00c4f8:tests/e2e/tests/reports-hub.spec.ts` succeeds |
| Registered at that commit | `git show d2f00c4f8:tests/e2e/playwright.config.ts \| grep -c reports-hub.spec.ts` → `2` |
| Legacy tree still present | `git ls-tree -d d2f00c4f8 "src/app/(owner)/financials"` → tree `4bb806ed` |
| CI build served the legacy routes | job 91177980582 log lines 604-609 list all six `ƒ /financials/*` |
| CI ran the suite green | `Running 89 tests` → `1 skipped / 88 passed (3.1m)` |
| Registration precedes deletion in the graph | `git merge-base --is-ancestor e3e63f8aa 51192fdf0` → true |

89 at the gate + 17 redirect assertions added by 56-07 = 106 at HEAD, which matches the final run
exactly. The 9 hub tests were therefore green against a tree that still contained `/financials`.

### 4. Final SHA

`gh api repos/hudsor01/tenant-flow/commits/c876ae4e5.../check-runs` returns two `e2e-smoke`
entries. The 5-second one (id 91271719489) is the doc-only companion workflow sharing the job
name; the real run is id 91271720446, 21:10:03 → 21:13:59 (236s), conclusion `success`, log:
`Running 106 tests using 2 workers` → `1 skipped / 105 passed (3.1m)`.

---

## DOCS-01 Separation — HELD

| Check | Result |
|---|---|
| Any Phase 56 plan declares DOCS-01 | No — all 8 declare only RPTHUB-01/02/03/04 (`grep -n "^requirements:" 56-0*-PLAN.md`) |
| Any plan or summary mentions DOCS-01 / "documents landing" | No matches |
| `src/app/(owner)/documents/` touched | No — `git log main..HEAD -- "src/app/(owner)/documents/"` is empty |
| `/documents` still a bare redirect | Yes — `documents/page.tsx` is `permanentRedirect("/documents/vault")` |
| Recorded in the phase's own validation | Yes — `56-VALIDATION.md:167-170` lists all 4 DOCS-01 rows as dropped → Phase 65 |

---

## Requirements Coverage

| Requirement | Source Plans | Status | Evidence |
|---|---|---|---|
| RPTHUB-01 | 56-01, 56-03, 56-05, 56-08 | SATISFIED | Hub 8 routes; `/financials` deleted; zero-charts grep exit 1 + non-vacuous guard; 7 analytics routes live in CI build manifest; nav repointed with Analytics section byte-identical |
| RPTHUB-02 | 56-02, 56-07, 56-08 | SATISFIED | 7-entry map (6 in / 1 out) parsed from source; `next.config.ts:187-191` `permanent: true`; proxy.ts zero diff; no `rewrites()`; 17 CI-executed live assertions |
| RPTHUB-03 | 56-01, 56-04 | SATISFIED (W-1) | `export-report/index.ts:72-84` gate intact + `generate-pdf/index.ts:322` mirror; 3-way set-equality parsed from disk; year-end/page.tsx zero diff so no rewrite changed a payload |
| RPTHUB-04 | 56-05, 56-06, 56-07 | SATISFIED | 9 tests registered in owner-axe, executed in CI; green at `d2f00c4f8` while `/financials` still on disk; registration is an ancestor of the deletion commit |
| DOCS-01 | none (Phase 65) | CORRECTLY ABSENT | No plan claims it; `/documents` untouched |

No orphaned requirements: REQUIREMENTS.md:185-188 maps exactly RPTHUB-01..04 to Phase 56, and all
four are claimed by plans. DOCS-01 maps to Phase 65 (line 189).

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Type safety across app + integration + e2e tsconfigs | `bun run typecheck` | clean, no output | PASS |
| Lint | `bun run lint` | `Checked 1332 files in 158ms. No fixes applied.` | PASS |
| Full unit suite | `bun run test:unit` | `308 passed (308)` / `105922 passed` | PASS |
| Phase-56 suites in isolation | `bun run test:unit -- "src/app/(owner)/reports" …` | `7 passed (7)` / `104 passed` | PASS |
| Redirect map invariants (independent parse) | node parse of `reporting-redirects.ts` | 7 entries, 6 in / 1 out, no analytics source, no identity source | PASS |
| CI test selection composition | `playwright test --list` (3 CI projects) | `Total: 106 tests in 10 files`; 9 hub + 17 redirect | PASS |
| CI e2e at HEAD | check-run 91271720446 log | `105 passed / 1 skipped` (matches 106) | PASS |
| CI e2e at the pre-deletion gate | check-run 91177980582 log | `88 passed / 1 skipped` of 89, with `/financials/*` still built | PASS |
| No charts under the hub | grep excluding `__tests__` | exit 1 (no matches) | PASS |
| Local `next build` | not run | Known pre-existing `/blog/[slug]` env failure (deferred-items.md #4/#5) — CI supplies the vars and built successfully | SKIP |

`playwright test` was deliberately **not** run: `tests/e2e/playwright.config.ts:294-295` begins
`rm -rf .next && rm -f .env.local`. Only `--list` was used, which does not start the webServer.

---

## Probe Execution

No `scripts/*/tests/probe-*.sh` exist in this repo and no Phase 56 plan or summary declares a
probe. Step 7c: **not applicable**.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| — | — | `TBD` / `FIXME` / `XXX` / `TODO` / `HACK` / `PLACEHOLDER` under `src/app/(owner)/reports/`, `src/lib/reports/`, `src/lib/seo/reporting-redirects.ts`, both e2e specs | — | **None found.** Debt-marker gate passes clean. |
| `src/app/(owner)/reports/year-end/page.tsx` | 31-58, 83-161 | Client-side CSV bypassing the tier gate | WARNING (W-1) | Pre-existing; 0 diff vs `main`; recorded at `premium-report-gate.test.ts:244-255` |
| `.../income-statement-page-header.tsx` / `.../cash-flow-header.tsx` | 61 / 60 | `Export` button with no handler | INFO (W-2) | Pre-existing; 0-change git move; recorded at `premium-report-gate.test.ts:257-264` and forbidden from E2E assertion at `reports-hub.spec.ts:79-85` |
| `src/hooks/api/query-keys/financial-keys.ts` | 30-36 | `accounts_payable` hardcoded 0 | INFO | Explicitly marked DEFERRED in-code, out of Phase 56 scope; the sibling fabricated `accounts_receivable` field WAS removed (f6b8a4df2) |

No stub components, no empty implementations, no console.log-only handlers, no hardcoded empty
props under the hub.

---

## Documentation Drift (INFO, non-blocking)

`ROADMAP.md:145-149` still carries the 56-06 caveat "**AUTHORED + REGISTERED, NOT YET GREEN** …
has **never executed**". That was accurate when 56-06 completed and is now stale: CI job
91177980582 (`d2f00c4f8`) and 91271720446 (HEAD) both executed the spec green. Commit `2a8ccdf2b`
records the confirmation but the ROADMAP note was not updated. No code impact; noted so a future
reader does not mistake the caveat for a live gate.

REQUIREMENTS.md:185-188 still shows RPTHUB-01..04 as `Pending`. That file was left unmodified per
instruction; the status roll-up is the shipping workflow's to update.

---

## Human Verification Required

### 1. Live free-tier 402 on a premium export

**Test:** Sign in as a FREE-tier owner. Trigger Year-End PDF from `/reports/year-end` (or Tax
Documents PDF from `/reports/tax-documents`).
**Expected:** HTTP 402 carrying an `upgrade_url`, surfaced as an upgrade prompt — not a generic
failure and not a successful download.
**Why human:** `56-VALIDATION.md:144` marks this row manual-only. It needs a live free-tier
account against deployed edge functions, and the E2E `owner` project that would cover it is never
invoked by CI. Static verification proves the gate code is intact and consulted; it cannot prove
the live round-trip.

### 2. Visual and responsive review of the new `/reports` hub index

**Test:** Open `/reports` at desktop and 375px. Review the header, the 3-card summary strip, and
the 7 tiles across the Statements and Exports groups.
**Expected:** Brand-consistent tiles, correct spacing, no truncation or overflow at 375px,
`Growth` badge legible on Tax Documents and Year-End, and the summary strip degrading to a single
line of copy — not a broken grid — on RPC error.
**Why human:** ROADMAP marks Phase 56 `UI hint: yes` and the hub index is a brand-new surface.
The owner-axe E2E asserts only that one `h1` and two `h2`s are visible; there is no
visual-regression or axe sweep registered for `/reports`.

### 3. Product decision on W-1 (year-end `Growth` badge vs ungated CSV)

**Test:** Decide whether the `Growth` badge on the Year-End tile is acceptable while that page's
two CSV buttons bypass the tier gate entirely.
**Expected:** An explicit decision — accept as-is (the badge reflects the gated PDF path), or open
follow-up work routing the CSV exports through `export-report`.
**Why human:** A product/claims judgement, not a code fact. Both the code path and its rationale
are already pinned by tests; only the decision is missing.

---

## Gaps Summary

**None.** All four RPTHUB requirements are delivered in the codebase, not merely claimed:

- The `/financials` tree is deleted from the git tree and absent from the CI production build
  manifest, while all 8 `/reports/*` and all 7 `/analytics/*` routes are present in that same
  manifest.
- The zero-charts invariant is enforced by a guard that proves its own non-vacuity (non-empty file
  walk, pattern-fires-on-injection, survivor-not-flagged).
- The redirect map was verified by parsing the source independently of its own tests, is wired
  with `permanent: true`, and its 17 live assertions ran against a real build in CI.
- The tier gate's enforcement point is byte-intact and still consulted, and no route rewrite
  changed a `reportType` payload.
- RPTHUB-04's ordering clause — the hardest to fake — is proven by a CI run at `d2f00c4f8` that
  was green *while* `/financials/*` was still being built and served.
- DOCS-01 separation held cleanly: `/documents` has zero diff.

Status is `human_needed` rather than `pass` because three items genuinely require a person: the
live free-tier 402 that the phase's own validation strategy marks manual-only, visual review of a
new UI surface with no visual coverage, and a product decision on W-1. Nothing blocks the next
phase.

---

_Verified: 2026-07-31T21:22:07Z_
_Verifier: Claude (gsd-verifier), goal-backward, adversarial stance_

---

## W-1 RESOLUTION (2026-08-01) — closed as NO DEFECT

W-1 was raised above as a warning: the `/reports/year-end` tile carries a `Growth` badge while
the page's two CSV buttons never reach the tier gate. Canonical research (four independent
readers plus a verifying synthesis) resolved it against the written contract. **The badge is
correct, the gate is correct, and no code changed.**

### The warning rested on a quantifier the contract does not contain

`reports-hub-entries.ts:139-143` states the rule: *"an entry is badged **only when** its CTA
provably reaches a gated `reportType`."* That is a NECESSARY condition — it exists to prevent
false badges. It is not an "if and only if" over every control on the page. The badge asserts
*something behind this tile is Growth*; it never asserts *everything behind it is*. W-1's word
"overstated" imported a universal quantifier from nowhere in the contract.

The UI-SPEC agrees at `:315` — *"Only surfaces whose CTA provably reaches a gated `reportType`"*
— which is existential over a surface's CTAs. The compliance test at `:325` forbids badging
`income-statement`/`cash-flow` because *"badging those tiles would be a false claim about what
is gated."* Year-End's badge is not a false claim: a Starter owner who clicks Download PDF
receives a 402 and the upgrade toast (`use-report-mutations.ts:24-38`).

### The ungated CSV is not a bypass

Three verified facts:

1. **The data carries no tier dimension.** All five reporting RPCs are `SECURITY DEFINER` with an
   `auth.uid()` guard, granted to `authenticated`/`service_role` only, and **none references
   `subscription`**. Tier has never been a read-authorization dimension for these figures.
2. **The CSV serializes what is already on screen** (`year-end-report-section.tsx:106-125`, `:173`,
   `:281+`). An owner reproduces it by copy-paste or one PostgREST call under their own JWT.
3. **Reaching the page requires a paid subscription at all.** `proxy.ts:358-364` gates the route on
   `subscription_status IN ('active','trialing')`, so the user in question is a paying Starter
   customer, not an anonymous visitor. What Growth buys is the server-generated PDF artifact — a
   packaging capability — not the numbers. The PDF path does not even read the same source
   (`generate-pdf/index.ts:127-131` calls `get_financial_overview`).

### Gating the CSV would reduce coherence, not increase it

`/reports/generate` ships a client-side Excel **"Tax Preparation"** export
(`generate/components/report-types.ts:80-125`) on a tile the contract deliberately leaves
unbadged (`reports-hub-entries.ts:126`). Gating Year-End's CSV would make it inconsistent with a
larger ungated tax export one tile away.

Changing the badge was also not available: the label is fixed by the UI-SPEC (`:306`, `:472`) and
per-control badging is forbidden by `:311` ("must not introduce a second paywall pattern").

### What WAS wrong, and is now fixed

`src/data/faqs.ts:78` claimed *"Growth and Max can export financial, year-end, and 1099 reports as
CSV."* The **financial** clause is true — `ExportButtons` POSTs without a `type` param and
`export-report/index.ts:63` defaults `reportType` to `"financial"`, which is in
`PREMIUM_REPORT_TYPES`, so the gate at `:72` fires. The **year-end and 1099 clauses were false in
both directions**: Starter gets both CSVs, and the 1099 CSV is empty on *every* tier because
`get_expense_summary` emits no `vendor_payments` (verified against the production database).

Corrected by minimal removal. A broader rewrite would have meant asserting something new about
tiers, which is the failure mode this milestone exists to remove.

### Residual

None for this phase. If the owner later confirms that year-end/1099 CSV export was *intended* to
be Growth-only, the correct fix inverts: wire `year-end/page.tsx:83-159` to the two dormant
mutations at `report-keys.ts:268-282`, first fixing `export-report/index.ts:90-92` to accept and
pass the year boundaries (it currently calls `get_financial_overview` with no date arguments while
naming the file `year-end-${year}`), then redeploy both edge functions. That is a phase of its own,
not a PR #957 amendment.
