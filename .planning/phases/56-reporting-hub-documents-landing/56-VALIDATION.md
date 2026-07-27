---
phase: 56
slug: reporting-hub-documents-landing
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-26
rescoped: 2026-07-26
---

# Phase 56 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `56-RESEARCH.md` § Validation Architecture.

---

## Rescope Notice (2026-07-26)

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
| RPTHUB-01 | `/reports` renders **8 tiles** in 3 labelled sections (Statements 5 / Analytics 1 / Exports 2) | component | `bun run test:unit -- --run "src/app/(owner)/reports/__tests__/reports-hub.test.tsx"` | ❌ W0 |
| RPTHUB-01 | Hub index is a Server Component, zero data deps (D-04) | source grep | `bun run test:unit -- --run "src/app/(owner)/reports/__tests__/reports-hub-purity.test.ts"` | ❌ W0 |
| RPTHUB-01 | Nav: `Reports → /reports` + `Analytics → /analytics`, **no `Financials` section** | component | `bun run test:unit -- --run src/components/shell/__tests__/main-nav.test.tsx` | ✅ extend |
| RPTHUB-01 | Nav `Analytics` section still lists its surviving children; its `Financial` child cross-links to `/reports/analytics` (D-08) | component | same file | ✅ extend |
| RPTHUB-01 | Cmd+K `commandGroups` contains **no** `/financials*` href and **no** `/analytics/financial` href — and **still contains** the five surviving `/analytics/*` hrefs | component | `bun run test:unit -- --run src/components/shell/__tests__/app-shell-nav.test.tsx` | ❌ W0 |
| RPTHUB-01 | Breadcrumbs resolve the new `/reports/*` segments; `financials` label gone; **`analytics` label retained** | unit | `bun run test:unit -- --run src/lib/__tests__/breadcrumbs.test.ts` | ✅ retarget |
| RPTHUB-02 | Map invariants: literals only, **no identity entries**, no dupes, `/reports`-only targets, **exact 7-source equality** | unit | `bun run test:unit -- --run src/lib/seo/__tests__/reporting-redirects.test.ts` | ❌ W0 |
| RPTHUB-02 | **Guard B (unit):** `/analytics/financial` is the ONLY `/analytics*` source in the map | unit | same file | ❌ W0 |
| RPTHUB-02 | Each of **7** legacy URLs returns 308 with exact `location` | **E2E `public`** | `bunx playwright test --config tests/e2e/playwright.config.ts --project=public -g "RPTHUB-02"` | ❌ W0 |
| RPTHUB-02 | **Guard A:** the 4 identity paths do **NOT** redirect (infinite-loop guard) | **E2E `public`** | same | ❌ W0 |
| RPTHUB-02 | **Guard B (E2E):** the 6 unmoved `/analytics/*` routes do **NOT** redirect | **E2E `public`** | same | ❌ W0 |
| RPTHUB-02 | No proxy involvement: `proxy.ts` unchanged, no `rewrites()` added; `PRIVATE_ROUTE_PREFIXES` still contains `/analytics`, `/reports`, `/documents` | source grep | `bun run test:unit -- --run src/lib/seo/__tests__/reporting-redirects.test.ts` | ❌ W0 |
| RPTHUB-03 | Both `PREMIUM_REPORT_TYPES` sets are set-equal (D-12) | unit (fs read) | `bun run test:unit -- --run supabase/functions/__tests__/premium-report-gate.test.ts` | ❌ W0 |
| RPTHUB-03 | Frontend premium-slug projection is faithful to the gated set | unit | same file | ❌ W0 |
| RPTHUB-03 | Call sites send unchanged `type=`/`reportType` values after the move (D-13) | unit | same file | ❌ W0 |
| RPTHUB-03 | `ExportButtons` surfaces a 402 as `PaywallError`, not `FINANCIAL_EXPORT_FAILED` (D-21) | component | `bun run test:unit -- --run "src/components/shared/__tests__/export-buttons.test.tsx"` | ❌ W0 |
| RPTHUB-03 | Live free-tier 402 + `upgrade_url` | E2E `owner` | `--project=owner -g "Reports paywall"` | ⚠️ **manual-only** |
| RPTHUB-04 | All **9** hub routes render authenticated (no `/login`, no error boundary, expected `h1`) | **E2E `owner-axe`** | `bunx playwright test --config tests/e2e/playwright.config.ts --project=owner-axe -g "hub routes"` | ❌ W0 |
| D-18 | No standalone "Revenue" label under `reports/analytics/`; `Scheduled`/`Collected` present | component + grep | port `financial-overview-stats.test.tsx` verbatim | ✅ port |
| D-18 | `analytics-stats-row` no longer renders a "Total Revenue" card | component | `bun run test:unit -- --run "src/app/(owner)/reports/analytics/__tests__/analytics-stats-row.test.tsx"` | ❌ W0 |
| D-22 | The merged `/reports/analytics` exposes exactly one period control | component | `bun run test:unit -- --run "src/app/(owner)/reports/analytics/__tests__/merged-analytics-page.test.tsx"` | ❌ W0 |
| D-20 | The ported **Accounts Receivable** card renders on `/reports/analytics` | component | same file (`merged-analytics-page.test.tsx`) | ❌ W0 |
| D-20 | A/R is **absent** from the `/reports` index — the index stays navigation-only (D-04) | component | `bun run test:unit -- --run "src/app/(owner)/reports/__tests__/reports-hub.test.tsx"` | ❌ W0 |

> **Why D-20 needs two assertions.** Accounts Receivable is the one figure lost when `/financials`
> is deleted, so it must provably land somewhere (UI-SPEC pins it to `/reports/analytics`). But it
> must equally provably NOT land on the hub index, or it silently breaks D-04's navigation-only
> rule. A single "does it render" test would pass in both the correct and the broken arrangement.

### Dropped rows (recorded, not silently removed)

| Dropped row | Why |
|-------------|-----|
| `Longest-prefix-wins: exactly one active entry + one aria-current across 6 pinned paths` | **Problem dissolved.** It only existed because D-07 pointed both nav hrefs into `/reports`. With `/reports` and `/analytics` there is no prefix overlap, so `main-nav.tsx`'s existing `startsWith` is correct and untouched. Do not re-add as a latent-bug fix |
| `DOCS-01 — /documents renders 6 tiles + recent panel; is not a redirect` | **Phase 65** |
| `DOCS-01 — recent panel calls documentSearchQueries.list({page:0}), slices to 5` | **Phase 65** |
| `DOCS-01 — recent rows non-interactive` | **Phase 65** |
| `DOCS-01 — loading/empty/error states` | **Phase 65** |

### The 17 E2E redirect assertions, enumerated

**7 positive (must 301/308 with an exact `location`):**

| `source` | `destination` |
|---|---|
| `/financials` | `/reports` |
| `/financials/balance-sheet` | `/reports/balance-sheet` |
| `/financials/cash-flow` | `/reports/cash-flow` |
| `/financials/expenses` | `/reports/expenses` |
| `/financials/income-statement` | `/reports/income-statement` |
| `/financials/tax-documents` | `/reports/tax-documents` |
| `/analytics/financial` | `/reports/analytics` |

**Guard A — 4 identity paths, must NOT 301/308** (a self-redirect is `ERR_TOO_MANY_REDIRECTS` on a
route that works today): `/reports`, `/reports/analytics`, `/reports/generate`, `/reports/year-end`.

**Guard B — 6 unmoved analytics routes, must NOT 301/308** (D-05 reverted; these are not in the map
at all): `/analytics`, `/analytics/leases`, `/analytics/maintenance`, `/analytics/occupancy`,
`/analytics/overview`, `/analytics/property-performance`.

> Both guards assert **"not 301/308"** rather than "200", which is auth-independent: these routes
> are gated, so an anonymous request legitimately sees proxy's **307** to `/login` (and `/analytics`
> would in any case be a filesystem-step **307** from its in-page `redirect()`). Any 301/308 on a
> guard path proves a config redirect matched — which is exactly the defect being guarded.
>
> **Guard B is the higher-risk of the two.** A stale pre-correction entry does not loop and is not
> a wildcard, so the identity guard and the literal-source guard both pass it — it just silently
> 308s a live section into a `/reports/*` URL that will never exist. The unit-level source-array
> **equality** assertion (not a subset check) is its second line of defence.

---

## Wave 0 Requirements

Eight new test files plus three extensions/ports. Wave 0 must land before the routes it covers move.

- [ ] `src/lib/seo/reporting-redirects.ts` — the map module itself (must exist before its test)
- [ ] `src/lib/seo/__tests__/reporting-redirects.test.ts` — map invariants + identity guard + **Guard B unit assertion** + no-proxy/`PRIVATE_ROUTE_PREFIXES` grep (RPTHUB-02)
- [ ] `src/app/(owner)/reports/__tests__/reports-hub.test.tsx` — **8 tiles / 3 sections** (RPTHUB-01)
- [ ] `src/app/(owner)/reports/__tests__/reports-hub-purity.test.ts` — no `"use client"`, no hooks, no `useQuery` (D-04)
- [ ] `src/components/shell/__tests__/app-shell-nav.test.tsx` — Cmd+K palette href sweep: 6 hrefs gone, 5 `/analytics/*` retained (RPTHUB-01)
- [ ] `supabase/functions/__tests__/premium-report-gate.test.ts` — set-equality + projection + call-site values (RPTHUB-03, D-12/D-13)
- [ ] `src/components/shared/__tests__/export-buttons.test.tsx` — 402 → `PaywallError` (D-21)
- [ ] `src/app/(owner)/reports/analytics/__tests__/analytics-stats-row.test.tsx` — "Total Revenue" card absent (D-18)
- [ ] E2E `public` spec — **7 redirects + Guard A (4) + Guard B (6)** (RPTHUB-02)
- [ ] E2E `owner-axe` spec — **9 hub routes render** (RPTHUB-04); filename **must be appended to the `owner-axe` `testMatch` array**
- [ ] `tests/e2e/tests/constants/routes.ts` — add `REPORTS_*` keys before specs reference them (the six surviving `ANALYTICS_*` keys stay)
- [ ] Extend `src/components/shell/__tests__/main-nav.test.tsx` — two sections, no `Financials`, `Analytics` children intact
- [ ] Retarget `src/lib/__tests__/breadcrumbs.test.ts` — `/reports/*` segments in, `financials` out, **`/analytics` assertions left passing untouched**
- [ ] Port `financial-overview-stats.test.tsx` verbatim to the merged location (D-18 pinning test)

**Not in Wave 0 (recorded):** the 6 pinned nav active-state cases (dissolved — see Dropped rows) and
`recent-documents-panel.test.tsx` (Phase 65).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Instructions |
|----------|-------------|------------|--------------|
| Live free-tier 402 + `upgrade_url` on a gated export | RPTHUB-03 | Needs `E2E_OWNER_*` secrets **and** a free-tier fixture account; the `owner` Playwright project is not run by CI at all | Run `--project=owner -g "Reports paywall"` locally with owner credentials, or exercise `/reports/year-end` → Download PDF as a free-tier owner and confirm 402 + upgrade URL |

Same constraint that made Phase 55's RLS suites CI-gated. Everything else on this phase has
automated verification. The D-21 fix is covered at the **component** level (402 → `PaywallError`),
which is where the delta this phase introduces actually lives; the live-402 gap is pre-existing and
not a regression this phase creates.

---

## Validation Sign-Off

- [x] Every Phase 56 requirement (RPTHUB-01..04) maps to at least one automated command
- [x] DOCS-01 removed — it is Phase 65's contract, not this one's
- [x] Dropped rows recorded with a reason, not silently deleted
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (planner must preserve)
- [x] Wave 0 covers all ❌ MISSING references (14 items above)
- [x] No watch-mode flags in any command
- [x] Feedback latency < 90s
- [x] E2E routed to the projects CI **actually runs** (`public`, `owner-axe`) — never the dead `owner` project (D-25)
- [x] Both non-emitting redirect guards are asserted at unit **and** E2E level
- [x] `nyquist_compliant: true`
- [ ] `wave_0_complete` — flips true once Wave 0 lands

**Approval:** approved at plan time 2026-07-26; **rebuilt 2026-07-26** for the D-05 revert and the
56/65 split. Dimension 8 satisfied; `wave_0_complete` flips when the fourteen Wave 0 items above
are committed.
