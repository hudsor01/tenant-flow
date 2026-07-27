---
phase: 56
slug: reporting-hub-documents-landing
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-26
---

# Phase 56 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `56-RESEARCH.md` § Validation Architecture (line 1289).

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

### E2E reality — the load-bearing constraint for RPTHUB-04

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

---

## Sampling Rate

- **After every task commit:** `bun run validate:quick`
- **After every plan wave:** full unit suite + the wave's E2E project
- **Before `/gsd:verify-work`:** full suite green, `public` + `owner-axe` E2E green
- **Max feedback latency:** ~30s unit, ~90s with typecheck

---

## Per-Requirement Verification Map

Task IDs are assigned at plan time; this maps requirement → test so the planner can attach an
`<automated>` verify to every task.

| Req | Behavior | Type | Automated Command | Exists? |
|-----|----------|------|-------------------|---------|
| RPTHUB-01 | `/reports` renders 13 tiles in 3 labelled sections | component | `bun run test:unit -- --run "src/app/(owner)/reports/__tests__/reports-hub.test.tsx"` | ❌ W0 |
| RPTHUB-01 | Hub index is a Server Component, zero data deps (D-04) | source grep | `bun run test:unit -- --run "src/app/(owner)/reports/__tests__/reports-hub-purity.test.ts"` | ❌ W0 |
| RPTHUB-01 | Nav: 2 entries, zero-overlap hrefs, no `Financials` section | component | `bun run test:unit -- --run src/components/shell/__tests__/main-nav.test.tsx` | ✅ extend |
| RPTHUB-01 | Longest-prefix-wins: exactly one active entry + one `aria-current` across 6 pinned paths | component | same file | ✅ extend |
| RPTHUB-01 | Cmd+K `commandGroups` contains no `/financials` or `/analytics` href | component | `bun run test:unit -- --run src/components/shell/__tests__/app-shell-nav.test.tsx` | ❌ W0 |
| RPTHUB-01 | Breadcrumbs resolve new segments; `financials` label gone | unit | `bun run test:unit -- --run src/lib/__tests__/breadcrumbs.test.ts` | ✅ retarget |
| RPTHUB-02 | Map invariants: literals only, **no identity entries**, no dupes, `/reports`-only targets, exact 13-source coverage | unit | `bun run test:unit -- --run src/lib/seo/__tests__/reporting-redirects.test.ts` | ❌ W0 |
| RPTHUB-02 | Each of 13 legacy URLs returns 308 with exact `location` | **E2E `public`** | `bunx playwright test --config tests/e2e/playwright.config.ts --project=public -g "RPTHUB-02"` | ❌ W0 |
| RPTHUB-02 | The 4 identity paths do **NOT** redirect (infinite-loop guard) | **E2E `public`** | same | ❌ W0 |
| RPTHUB-02 | No proxy involvement: `proxy.ts` unchanged, no `rewrites()` added | source grep | `bun run test:unit -- --run src/lib/seo/__tests__/reporting-redirects.test.ts` | ❌ W0 |
| RPTHUB-03 | Both `PREMIUM_REPORT_TYPES` sets are set-equal (D-12) | unit (fs read) | `bun run test:unit -- --run supabase/functions/__tests__/premium-report-gate.test.ts` | ❌ W0 |
| RPTHUB-03 | Frontend premium-slug projection is faithful to the gated set | unit | same file | ❌ W0 |
| RPTHUB-03 | Call sites send unchanged `type=`/`reportType` values after the move (D-13) | unit | same file | ❌ W0 |
| RPTHUB-03 | Live free-tier 402 + `upgrade_url` | E2E `owner` | `--project=owner -g "Reports paywall"` | ⚠️ **manual-only** |
| RPTHUB-04 | All 13 hub routes render authenticated (no `/login`, no error boundary, expected `h1`) | **E2E `owner-axe`** | `bunx playwright test --config tests/e2e/playwright.config.ts --project=owner-axe -g "hub routes"` | ❌ W0 |
| DOCS-01 | `/documents` renders 6 tiles + recent panel; is **not** a redirect | **E2E `owner-axe`** | same spec | ❌ W0 |
| DOCS-01 | Recent panel calls `documentSearchQueries.list({page:0})`, slices to 5 | component | `bun run test:unit -- --run "src/app/(owner)/documents/__tests__/recent-documents-panel.test.tsx"` | ❌ W0 |
| DOCS-01 | Recent rows non-interactive (no `<a>`, no `<button>`) | component | same file | ❌ W0 |
| DOCS-01 | Loading → 5 skeletons; empty → `Empty` compound; error → inline + `Retry` | component | same file | ❌ W0 |
| D-18 | No standalone "Revenue" label under `reports/analytics/`; `Scheduled`/`Collected` present | component + grep | port `financial-overview-stats.test.tsx` verbatim | ✅ port |
| D-18 | `analytics-stats-row` no longer renders a "Total Revenue" card | component | `bun run test:unit -- --run "src/app/(owner)/reports/analytics/__tests__/analytics-stats-row.test.tsx"` | ❌ W0 |

---

## Wave 0 Requirements

Ten new test files plus three extensions. Wave 0 must land before the routes it covers move.

- [ ] `src/lib/seo/__tests__/reporting-redirects.test.ts` — map invariants + identity guard + no-proxy grep (RPTHUB-02)
- [ ] `src/app/(owner)/reports/__tests__/reports-hub.test.tsx` — 13 tiles / 3 sections (RPTHUB-01)
- [ ] `src/app/(owner)/reports/__tests__/reports-hub-purity.test.ts` — no `"use client"`, no hooks, no `useQuery` (D-04)
- [ ] `src/components/shell/__tests__/app-shell-nav.test.tsx` — Cmd+K palette href sweep (RPTHUB-01)
- [ ] `supabase/functions/__tests__/premium-report-gate.test.ts` — set-equality + projection + call-site values (RPTHUB-03, D-12/D-13)
- [ ] `src/app/(owner)/documents/__tests__/recent-documents-panel.test.tsx` — factory reuse, non-interactive rows, 3 states (DOCS-01)
- [ ] `src/app/(owner)/reports/analytics/__tests__/analytics-stats-row.test.tsx` — "Total Revenue" card absent (D-18)
- [ ] E2E `public` spec — 13 redirects + 4 identity-path loop guards (RPTHUB-02)
- [ ] E2E `owner-axe` spec — 13 hub routes render + `/documents` landing (RPTHUB-04, DOCS-01)
- [ ] Extend `src/components/shell/__tests__/main-nav.test.tsx` — 6 pinned active-state cases
- [ ] Retarget `src/lib/__tests__/breadcrumbs.test.ts` — new segments, `financials` gone
- [ ] Port `financial-overview-stats.test.tsx` verbatim to the merged location (D-18 pinning test)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Instructions |
|----------|-------------|------------|--------------|
| Live free-tier 402 + `upgrade_url` on a gated export | RPTHUB-03 | Needs `E2E_OWNER_*` secrets **and** a free-tier fixture account; the `owner` Playwright project is not run by CI at all | Run `--project=owner -g "Reports paywall"` locally with owner credentials, or exercise `/reports/year-end` → Download PDF as a free-tier owner and confirm 402 + upgrade URL |

Same constraint that made Phase 55's RLS suites CI-gated. Everything else on this phase has
automated verification.

---

## Validation Sign-Off

- [x] Every requirement maps to at least one automated command
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (planner must preserve)
- [x] Wave 0 covers all ❌ MISSING references (12 items above)
- [x] No watch-mode flags in any command
- [x] Feedback latency < 90s
- [x] E2E routed to the projects CI **actually runs** (`public`, `owner-axe`) — never the dead `owner` project
- [x] `nyquist_compliant: true`
- [ ] `wave_0_complete` — flips true once Wave 0 lands

**Approval:** approved at plan time 2026-07-26 — Dimension 8 satisfied; `wave_0_complete` flips
when the twelve Wave 0 items above are committed.
