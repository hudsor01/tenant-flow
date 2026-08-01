---
phase: 56
slug: reporting-hub-documents-landing
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-26
rescoped: 2026-07-30
---

# Phase 56 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `56-RESEARCH.md` § Validation Architecture.

---

## ⚠ SECOND RESCOPE NOTICE (2026-07-30) — FULL SEPARATION — READ FIRST

The user rejected the 2026-07-26 partial-separation position (see `56-DISCUSSION-LOG.md` Session 2,
"Analytics boundary" Q1, where it was offered as the recommended option). **Nothing folds into the
hub.** Canonical decisions: `56-CONTEXT.md` D-29..D-34.

| # | Was (2026-07-26) | Now (2026-07-30) |
|---|-----|-----|
| A | `/analytics/financial` moves into the hub; `/reports/analytics` is the merge target | **INVERTED.** `/analytics/financial` **stays live and is guarded as non-moving**; `/reports/analytics` is **deleted** and 308s **into `/analytics/overview`** |
| B | 7 redirects + 4 identity guards + 6 unmoved-analytics guards = 17 assertions | **7 redirects (the 7th inverted) + 3 identity guards + 7 unmoved-analytics guards = 17 assertions.** Same total, different membership |
| C | Hub renders 8 tiles / 9 E2E routes (5 Statements + 1 Analytics + 2 Exports + index) | **7 tiles in 2 groups / 8 E2E routes** (5 Statements + 2 Exports + index) |
| D | `/reports` index is navigation-only, zero data (D-04) | **SUPERSEDED by D-30** — the index carries a Scheduled / Collected / Outstanding summary strip |
| E | Cmd+K: 6 hrefs change | **5 hrefs change** (`/financials*` only). `app-shell.tsx:115` (`/analytics/financial`) stays |
| F | Nav `Analytics` loses its `Financial` child | **Not edited.** `main-nav.tsx:60` stays — the route is live |
| G | D-18 row: `analytics-stats-row` no longer renders a "Total Revenue" card | **SUBSUMED by D-33** — the whole file is deleted, along with `analytics-payment-methods-chart.tsx` |
| H | D-20: A/R renders on `/reports/analytics` | **OPEN QUESTION** (CONTEXT OQ-1) — that route is deleted, and A/R must NOT be folded into the strip's Outstanding tile |
| I | D-21 / D-22 / D-23 rows | **MOOT** — no merge, no merged page, no Analytics tile |
| J | *(absent)* | **NEW: zero-charts invariant (D-34)** must be asserted — no `recharts` / `ChartContainer` / `ResponsiveContainer` under `src/app/(owner)/reports/**` |

**Unchanged and still the single most load-bearing constraint: D-25** — CI runs only
`--project=smoke --project=public --project=owner-axe`; the `owner` project never executes; and
`owner-axe` uses a filename allowlist, not a glob.

**The rows below marked with the old scope are corrected in place where the correction is
mechanical, and marked MOOT/OPEN where it is not. Nothing is silently deleted.**

---

## Rescope Notice (2026-07-26) — superseded on the analytics question by the block above

This contract was rebuilt after two binding user corrections. It supersedes the pre-correction
version; the deltas are listed so the reduction is auditable rather than silent.

| # | Was | Now |
|---|-----|-----|
| 1 | All of `/analytics/*` absorbed (D-05) | **REVERTED.** Only `/analytics/financial` moves. The six other analytics routes keep their URLs and are now **guarded as non-moving** |
| 2 | Nav = two doors into `/reports` (D-07) | **REVISED.** `Reports → /reports`, `Analytics → /analytics` |
| 3 | 6 pinned longest-prefix-wins nav active-state cases | **DROPPED.** `/reports` and `/analytics` have no prefix overlap, so the existing `startsWith` resolver at `main-nav.tsx:188-191` is already correct. The double-active bug cannot occur. Not carried forward as a latent fix — out of scope |
| 4 | 13 redirect entries | **7 entries** + 10 non-emitting guard assertions (4 identity + 6 unmoved analytics) |
| 5 | Hub renders 13 tiles / 13 E2E routes | **8 tiles / 9 E2E routes** (5 Statements + 1 Analytics + 2 Exports, plus the index itself) |
| 6 | DOCS-01 rows (4) | **MOVED to Phase 65.** No Phase 56 test may assert anything about `/documents` |

**Phase 56 requirements: RPTHUB-01, RPTHUB-02, RPTHUB-03, RPTHUB-04.** DOCS-01 is not one of them.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + jsdom (projects `unit` / `component` / `integration`) + Playwright E2E |
| **Config file** | `vitest.config.ts`, `tests/e2e/playwright.config.ts` |
| **Quick run command** | `bun run test:unit` |
| **Full suite command** | `bun run validate:quick` (typecheck ×3 + lint + unit) |
| **Estimated runtime** | ~27s unit; typecheck adds ~40s |
| **Coverage gate** | 80%, enforced by lefthook **pre-commit** (not CI) |

**Single-file invocation:** `bun run test:unit -- --run <file>`. The bare form
`bun run test:unit -- <file>` FAILS — the script already injects `--run` and a second one is a CAC
duplicate-flag error.

### E2E reality — the load-bearing constraint for RPTHUB-04 (D-25, UNCHANGED)

CI runs **only** three Playwright projects (`.github/workflows/ci-cd.yml:162`):

```
bunx playwright test --config tests/e2e/playwright.config.ts \
  --project=smoke --project=public --project=owner-axe
```

The **`owner` project never executes in CI.** Any spec added under `tests/e2e/tests/owner/` gates
nothing — `owner-financials.e2e.spec.ts` and `reports-gate.spec.ts` are already dead in this sense.
**RPTHUB-04 is therefore NOT satisfiable by adding an `owner` spec.** Hub-route coverage must land
in **`owner-axe`**, and redirect coverage in **`public`** (which needs no auth — config redirects
resolve at Next.js step 2, before Proxy at step 3).

`owner-axe` uses an **explicit filename allowlist**, not a glob: adding the spec file is not
enough, its filename must be appended to the `testMatch` array in `playwright.config.ts` (the
Phase 52 `notifications.spec.ts` precedent, recorded in a comment in that file).

**This constraint is unchanged by the rescope and remains the single most likely way to ship a
green PR with zero real coverage.**

---

## Sampling Rate

- **After every task commit:** `bun run validate:quick`
- **After every plan wave:** full unit suite + the wave's E2E project
- **Per wave merge:** the exact CI selection
  `--project=smoke --project=public --project=owner-axe` — running the real project list is what
  catches "wrote a test CI never runs"
- **Before `/gsd:verify-work`:** full suite green, `public` + `owner-axe` E2E green
- **Wave-boundary invariant (D-11):** the hub-route E2E spec must be green in CI **before** the
  wave that deletes legacy files. A sequencing assertion against the commit graph, not just the
  final state.
- **Max feedback latency:** ~30s unit, ~90s with typecheck

---

## Per-Requirement Verification Map

Task IDs are assigned at plan time; this maps requirement → test so the planner can attach an
`<automated>` verify to every task.

| Req | Behavior | Type | Automated Command | Exists? |
|-----|----------|------|-------------------|---------|
| RPTHUB-01 | `/reports` renders **7 tiles** in **2** labelled sections (Statements 5 / Exports 2) — **and NO Analytics group** | component | `bun run test:unit -- --run "src/app/(owner)/reports/__tests__/reports-hub.test.tsx"` | ❌ W0 |
| RPTHUB-01 | Hub index has **exactly one** data dependency — the summary strip (D-30). The tile grid has no hooks / `useQuery` / `supabase` import | source grep | `bun run test:unit -- --run "src/app/(owner)/reports/__tests__/reports-hub-purity.test.ts"` | ❌ W0 |
| **D-34** | **ZERO CHARTS: no `recharts`, `ChartContainer` or `ResponsiveContainer` anywhere under `src/app/(owner)/reports/**`** | source grep | same file (`reports-hub-purity.test.ts`) | ❌ W0 |
| **D-30** | Summary strip renders Scheduled / Collected / Outstanding from **one** payload; Outstanding = `scheduled − collected`, **never** `accounts_receivable`; no `* 100`; `tabular-nums` present; `$0` shown honestly with no ledger data; a strip error does **not** remove the tile grid | component | `bun run test:unit -- --run "src/app/(owner)/reports/__tests__/reports-summary-strip.test.tsx"` | ❌ W0 |
| RPTHUB-01 | Nav: `Reports → /reports` + `Analytics → /analytics`, **no `Financials` section** | component | `bun run test:unit -- --run src/components/shell/__tests__/main-nav.test.tsx` | ✅ extend |
| RPTHUB-01 | Nav `Analytics` section is **UNCHANGED** — it still lists **all three** children including **`Financial → /analytics/financial`**. *(REVISED 2026-07-30: the Round-1 cross-link assertion is DELETED — there is no cross-link and `main-nav.tsx:60` is not edited)* | component | same file | ✅ extend |
| RPTHUB-01 | Cmd+K `commandGroups` contains **no** `/financials*` href — and **still contains all six** `/analytics/*` hrefs **including `/analytics/financial`**. *(REVISED 2026-07-30: 5 hrefs change, not 6)* | component | `bun run test:unit -- --run src/components/shell/__tests__/app-shell-nav.test.tsx` | ❌ W0 |
| RPTHUB-01 | Breadcrumbs resolve the new `/reports/*` segments; `financials` label gone; **`analytics` AND `financial` labels retained** — both segments stay live | unit | `bun run test:unit -- --run src/lib/__tests__/breadcrumbs.test.ts` | ✅ retarget |
| RPTHUB-02 | Map invariants: literals only, **no identity entries**, no dupes, **exact 7-source equality**. *(REVISED: targets are no longer `/reports`-only — entry 7 targets `/analytics/overview`)* | unit | `bun run test:unit -- --run src/lib/seo/__tests__/reporting-redirects.test.ts` | ❌ W0 |
| RPTHUB-02 | **Guard B (unit), REVISED:** **NO `/analytics*` path appears as a source** — above all not `/analytics/financial`, the highest-risk stale entry. Assert by **equality**, never subset | unit | same file | ❌ W0 |
| RPTHUB-02 | **Inversion assertion (NEW):** exactly one entry has a destination outside `/reports` — `/reports/analytics → /analytics/overview` — and it targets the **concrete** route, never bare `/analytics` (chain guard) | unit | same file | ❌ W0 |
| RPTHUB-02 | Each of **7** map sources returns 308 with exact `location` | **E2E `public`** | `bunx playwright test --config tests/e2e/playwright.config.ts --project=public -g "RPTHUB-02"` | ❌ W0 |
| RPTHUB-02 | **Guard A:** the **3** identity paths do **NOT** redirect (infinite-loop guard) — `/reports`, `/reports/generate`, `/reports/year-end` | **E2E `public`** | same | ❌ W0 |
| RPTHUB-02 | **Guard B (E2E):** **all 7** `/analytics/*` routes do **NOT** 301/308 — **including `/analytics/financial`** | **E2E `public`** | same | ❌ W0 |
| RPTHUB-02 | No proxy involvement: `proxy.ts` unchanged, no `rewrites()` added; `PRIVATE_ROUTE_PREFIXES` still contains `/analytics`, `/reports`, `/documents` | source grep | `bun run test:unit -- --run src/lib/seo/__tests__/reporting-redirects.test.ts` | ❌ W0 |
| RPTHUB-03 | Both `PREMIUM_REPORT_TYPES` sets are set-equal (D-12) | unit (fs read) | `bun run test:unit -- --run supabase/functions/__tests__/premium-report-gate.test.ts` | ❌ W0 |
| RPTHUB-03 | Frontend premium-slug projection is faithful to the gated set | unit | same file | ❌ W0 |
| RPTHUB-03 | Call sites send unchanged `type=`/`reportType` values after the move (D-13) | unit | same file | ❌ W0 |
| ~~RPTHUB-03~~ | ~~`ExportButtons` surfaces a 402 as `PaywallError`, not `FINANCIAL_EXPORT_FAILED` (D-21)~~ — **MOOT for Phase 56.** Its sole call site is `src/app/(owner)/analytics/financial/page.tsx:103`, on a route this phase does not touch, and the D-06 merge that would have imported it into the hub no longer happens. Finding preserved in CONTEXT Deferred Ideas + OQ-3 | — | — | **DROPPED** |
| RPTHUB-03 | Live free-tier 402 + `upgrade_url` | E2E `owner` | `--project=owner -g "Reports paywall"` | ⚠️ **manual-only** |
| RPTHUB-04 | All **8** hub routes render authenticated (index + 5 statements + generate + year-end; no `/login`, no error boundary, expected `h1`) | **E2E `owner-axe`** | `bunx playwright test --config tests/e2e/playwright.config.ts --project=owner-axe -g "hub routes"` | ❌ W0 |
| **D-33** | `analytics-stats-row.tsx` and `analytics-payment-methods-chart.tsx` **no longer exist**, and nothing anywhere reads `total_payments` / `total_revenue` / `payments_by_method` off `get_billing_insights` | source grep | `bun run test:unit -- --run "src/app/(owner)/reports/__tests__/reports-hub-purity.test.ts"` | ❌ W0 |
| D-18 | No standalone "Revenue" label anywhere under `src/app/(owner)/reports/**`; the summary strip's labels are exactly `Scheduled` / `Collected` / `Outstanding` | component + grep | `bun run test:unit -- --run "src/app/(owner)/reports/__tests__/reports-summary-strip.test.tsx"` | ❌ W0 |
| ~~D-18~~ | ~~`analytics-stats-row` no longer renders a "Total Revenue" card~~ — **SUBSUMED by D-33**: the whole file is deleted, so the card cannot survive by any route. Do not author `analytics-stats-row.test.tsx` | — | — | **DROPPED** |
| ~~D-22~~ | ~~The merged `/reports/analytics` exposes exactly one period control~~ — **MOOT**: there is no merged page. Do not author `merged-analytics-page.test.tsx` | — | — | **DROPPED** |
| ~~D-20~~ | ~~The ported Accounts Receivable card renders on `/reports/analytics`~~ — **BLOCKED on CONTEXT OQ-1.** That route is deleted and A/R has no assigned home. Do not author this test until OQ-1 is answered | component | TBD once OQ-1 resolves | ⚠️ **BLOCKED** |
| D-20 | A/R is **not** conflated with the strip's `Outstanding` figure — different derivations, so `Outstanding` must come from the collection-rate payload and never from `get_financial_overview.accounts_receivable` | component | `bun run test:unit -- --run "src/app/(owner)/reports/__tests__/reports-summary-strip.test.tsx"` | ❌ W0 |

> **Why D-20's assertions changed.** Accounts Receivable is the one figure lost when `/financials`
> is deleted, so it must provably land somewhere. Round 1 pinned it to `/reports/analytics`; full
> separation deletes that route, so the "does it render there" assertion is now unanswerable and is
> **blocked on OQ-1** rather than silently dropped. What survives — and is testable today — is the
> negative: A/R must NOT be silently absorbed into the summary strip's `Outstanding` tile. The two
> figures have different derivations, and a single figure wearing a label it did not earn is exactly
> the D-18 failure. A "does it render" test would pass in both the correct and the broken
> arrangement; the derivation assertion will not.

### Dropped rows (recorded, not silently removed)

| Dropped row | Why |
|-------------|-----|
| `Longest-prefix-wins: exactly one active entry + one aria-current across 6 pinned paths` | **Problem dissolved.** It only existed because D-07 pointed both nav hrefs into `/reports`. With `/reports` and `/analytics` there is no prefix overlap, so `main-nav.tsx`'s existing `startsWith` is correct and untouched. Do not re-add as a latent-bug fix |
| `DOCS-01 — /documents renders 6 tiles + recent panel; is not a redirect` | **Phase 65** |
| `DOCS-01 — recent panel calls documentSearchQueries.list({page:0}), slices to 5` | **Phase 65** |
| `DOCS-01 — recent rows non-interactive` | **Phase 65** |
| `DOCS-01 — loading/empty/error states` | **Phase 65** |

### The 17 E2E redirect assertions, enumerated — REVISED 2026-07-30

Total is still 17, but the membership changed: `/analytics/financial` moved from the positive set
into Guard B, and `/reports/analytics` moved from Guard A into the positive set.

**7 positive (must 301/308 with an exact `location`):**

| `source` | `destination` | direction |
|---|---|---|
| `/financials` | `/reports` | into hub |
| `/financials/balance-sheet` | `/reports/balance-sheet` | into hub |
| `/financials/cash-flow` | `/reports/cash-flow` | into hub |
| `/financials/expenses` | `/reports/expenses` | into hub |
| `/financials/income-statement` | `/reports/income-statement` | into hub |
| `/financials/tax-documents` | `/reports/tax-documents` | into hub |
| **`/reports/analytics`** | **`/analytics/overview`** | **OUT of hub** |

The last row is the **only** redirect pointing away from `/reports`, and its `location` must be the
**concrete** `/analytics/overview` — never bare `/analytics`, which in-page-redirects and would make
this a 308 → 307 chain.

**Guard A — 3 identity paths, must NOT 301/308** (a self-redirect is `ERR_TOO_MANY_REDIRECTS` on a
route that works today): `/reports`, `/reports/generate`, `/reports/year-end`.
*(`/reports/analytics` LEFT this set — it is now a positive assertion.)*

**Guard B — 7 unmoved analytics routes, must NOT 301/308** (none is in the map at all):
`/analytics`, **`/analytics/financial`**, `/analytics/leases`, `/analytics/maintenance`,
`/analytics/occupancy`, `/analytics/overview`, `/analytics/property-performance`.
*(`/analytics/financial` JOINED this set — it stays live under full separation.)*

> Both guards assert **"not 301/308"** rather than "200", which is auth-independent: these routes
> are gated, so an anonymous request legitimately sees proxy's **307** to `/login` (and `/analytics`
> would in any case be a filesystem-step **307** from its in-page `redirect()`). Any 301/308 on a
> guard path proves a config redirect matched — which is exactly the defect being guarded.
>
> **Guard B is the higher-risk of the two, and `/analytics/financial` is its highest-risk member.**
> A stale `/analytics/financial → /reports/analytics` entry left over from the 2026-07-26 map does
> not loop and is not a wildcard, so the identity guard and the literal-source guard both pass it —
> it just silently 308s a live page into a URL that will not exist, **and entry 7 would then bounce
> it straight back out**. The unit-level source-array **equality** assertion (never a subset check)
> is the only structural defence.

---

## Wave 0 Requirements

Six new test files plus two extensions. **REVISED 2026-07-30** — three previously-listed files are
struck. Wave 0 must land before the routes it covers move.

- [ ] `src/lib/seo/reporting-redirects.ts` — the map module itself (must exist before its test). Its comment must state that entry 7 deliberately points away from `/reports`
- [ ] `src/lib/seo/__tests__/reporting-redirects.test.ts` — map invariants + Guard A (3) + **Guard B unit assertion by source-array EQUALITY (7 analytics paths absent)** + the inversion/chain assertion + no-proxy/`PRIVATE_ROUTE_PREFIXES` grep (RPTHUB-02)
- [ ] `src/app/(owner)/reports/__tests__/reports-hub.test.tsx` — **7 tiles / 2 sections, no Analytics group** (RPTHUB-01)
- [ ] `src/app/(owner)/reports/__tests__/reports-hub-purity.test.ts` — tile grid has no hooks/`useQuery`/`supabase`; **zero-charts grep over `src/app/(owner)/reports/**` (D-34)**; **`analytics-stats-row.tsx` and `analytics-payment-methods-chart.tsx` absent (D-33)**
- [ ] **NEW** `src/app/(owner)/reports/__tests__/reports-summary-strip.test.tsx` — single-payload sourcing, Outstanding = `scheduled − collected` (never `accounts_receivable`), no `* 100`, `tabular-nums`, honest `$0`, error does not remove the tile grid, no bare "Revenue" label (D-30 / D-18 / D-20-negative)
- [ ] `src/components/shell/__tests__/app-shell-nav.test.tsx` — Cmd+K palette href sweep: **5 `/financials*` hrefs gone, all 6 `/analytics/*` retained including `/analytics/financial`** (RPTHUB-01)
- [ ] `supabase/functions/__tests__/premium-report-gate.test.ts` — set-equality + projection + call-site values (RPTHUB-03, D-12/D-13)
- [ ] E2E `public` spec — **7 redirects (incl. the inverted entry 7) + Guard A (3) + Guard B (7)** (RPTHUB-02)
- [ ] E2E `owner-axe` spec — **8 hub routes render** (RPTHUB-04); filename **must be appended to the `owner-axe` `testMatch` array**
- [ ] `tests/e2e/tests/constants/routes.ts` — add `REPORTS_*` keys before specs reference them (**all seven** `ANALYTICS_*` keys stay, including the financial one)
- [ ] Extend `src/components/shell/__tests__/main-nav.test.tsx` — two sections, no `Financials`, **`Analytics` children fully intact (all three, including `Financial`)**
- [ ] Retarget `src/lib/__tests__/breadcrumbs.test.ts` — `/reports/*` segments in, `financials` out, **all `/analytics` assertions left passing untouched**

**Struck from Wave 0 by the 2026-07-30 rescope (recorded, not silently removed):**
- ~~`src/components/shared/__tests__/export-buttons.test.tsx`~~ — D-21 is moot for Phase 56; sole call site is on `/analytics/financial`, outside the phase boundary (OQ-3)
- ~~`src/app/(owner)/reports/analytics/__tests__/analytics-stats-row.test.tsx`~~ — subsumed by D-33; the file under test is deleted
- ~~Port `financial-overview-stats.test.tsx` to the merged location~~ — there is no merged location. The test stays exactly where it is, on `/analytics/financial`, which this phase does not touch

**Also not in Wave 0 (recorded):** the 6 pinned nav active-state cases (dissolved — see Dropped
rows), `merged-analytics-page.test.tsx` (no merged page), the D-20 A/R landing assertion (blocked on
OQ-1), and `recent-documents-panel.test.tsx` (Phase 65).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Instructions |
|----------|-------------|------------|--------------|
| Live free-tier 402 + `upgrade_url` on a gated export | RPTHUB-03 | Needs `E2E_OWNER_*` secrets **and** a free-tier fixture account; the `owner` Playwright project is not run by CI at all | Run `--project=owner -g "Reports paywall"` locally with owner credentials, or exercise `/reports/year-end` → Download PDF as a free-tier owner and confirm 402 + upgrade URL |

Same constraint that made Phase 55's RLS suites CI-gated. Everything else on this phase has
automated verification. **REVISED 2026-07-30:** the D-21 component-level 402 coverage is struck
along with D-21 itself (moot for Phase 56 — sole call site on `/analytics/financial`, outside the
phase boundary). The live-402 gap is pre-existing and not a regression this phase creates.

---

## Validation Sign-Off

- [x] Every Phase 56 requirement (RPTHUB-01..04) maps to at least one automated command
- [x] DOCS-01 removed — it is Phase 65's contract, not this one's
- [x] Dropped rows recorded with a reason, not silently deleted — including the three struck by the 2026-07-30 rescope
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (planner must preserve)
- [x] Wave 0 covers all ❌ MISSING references (12 items above)
- [x] No watch-mode flags in any command
- [x] Feedback latency < 90s
- [x] E2E routed to the projects CI **actually runs** (`public`, `owner-axe`) — never the dead `owner` project (D-25)
- [x] Both non-emitting redirect guards are asserted at unit **and** E2E level, with Guard B by source-array **equality**
- [x] The inverted 7th redirect is asserted positively AND its chain hazard is guarded (target must be `/analytics/overview`, not `/analytics`)
- [x] D-33 and D-34 (deletions) are asserted by absence, not assumed
- [x] `nyquist_compliant: true`
- [ ] `wave_0_complete` — flips true once Wave 0 lands

**One requirement row is BLOCKED, not covered:** D-20's Accounts Receivable landing surface
(CONTEXT OQ-1). Its previous target route is deleted and no replacement is decided. The *negative*
assertion (A/R is not conflated with `Outstanding`) IS covered. **`nyquist_compliant` remains true
because D-20 is a decision, not a Phase 56 requirement — but a verifier must not read the missing
positive assertion as an oversight.**

**Approval:** approved at plan time 2026-07-26; rebuilt 2026-07-26 for the D-05 revert and the
56/65 split; **rebuilt again 2026-07-30 for full separation** (redirect inversion, 3/7 guard split,
7 tiles, summary strip, D-33/D-34 deletions, three Wave 0 files struck). Dimension 8 satisfied;
`wave_0_complete` flips when the twelve Wave 0 items above are committed.
