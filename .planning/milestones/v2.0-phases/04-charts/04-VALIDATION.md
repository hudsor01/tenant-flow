---
phase: 4
slug: charts
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-26
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Sourced from `04-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.6 (verified `package.json`) |
| **Config file** | `vitest.config.ts` (recharts alias at line 51-52 maps to `src/test/mocks/recharts.tsx`) |
| **Quick run command** | `bun run test:unit -- --run src/components/dashboard/components/__tests__/revenue-area-chart.test.tsx src/components/dashboard/components/__tests__/occupancy-donut-chart.test.tsx` |
| **Full suite command** | `bun run test:unit` (lefthook pre-commit; 80% coverage threshold enforced) |
| **Integration suite command** | `bun run test:integration` (RLS dual-client against prod) |
| **Phase gate** | `bun run validate:quick` (types + lint + unit) + `bun run test:integration` green before `/gsd-verify-work 4` |
| **Estimated runtime** | ~10s (unit) + ~30s (integration with rate-limit cooldown) |

---

## Sampling Rate

- **After every task commit:** `bun run validate:quick` (typecheck + lint + unit — pre-commit hook enforced)
- **After every plan wave:** Full unit suite (`bun run test:unit`) — pre-commit hook enforces 80% coverage
- **Before `/gsd-verify-work 4`:** Unit + integration both green
- **PR gate:** `checks` + `e2e-smoke` + `rls-security` CI workflows (per CLAUDE.md CI Pipeline)
- **Perfect-PR gate:** Two consecutive zero-finding deep review cycles (D-11)
- **Max feedback latency:** ~10s for unit feedback; ~30s for integration

---

## Per-Requirement Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| CHART-01 | Toggle switches CardDescription `Last 30 days` ↔ `Last 6 months` | unit | `bun run test:unit -- --run src/components/dashboard/components/__tests__/revenue-area-chart.test.tsx` | ❌ Wave 0 | ⬜ pending |
| CHART-01 | Area renders with `dataKey="value"` and series stroke `var(--color-chart-1)` (or `var(--color-revenue)` post-config) | unit | same | ❌ Wave 0 | ⬜ pending |
| CHART-01 + D-01 | New `monthly_revenue_6mo` field present in RPC response for caller's own properties | integration | `bun run test:integration -- --run tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` | ❌ Wave 1 | ⬜ pending |
| CHART-01 + D-01 | Cross-owner RPC call returns `'Access denied'` error (auth guard preserved) | integration | same | ❌ Wave 1 | ⬜ pending |
| CHART-02 | Donut center value is `87%` for `{ occupied: 87, vacant: 13, total: 100 }` | unit | `bun run test:unit -- --run src/components/dashboard/components/__tests__/occupancy-donut-chart.test.tsx` | ❌ Wave 0 | ⬜ pending |
| CHART-02 | Donut empty branch when `units.total === 0` shows `No units yet` | unit | same | ❌ Wave 0 | ⬜ pending |
| CHART-02 | Donut legend renders as `<ul>` with two `<li>` (NOT `<div role="list">`) | unit | same | ❌ Wave 0 | ⬜ pending |
| CHART-02 | Computed `aria-label` matches `"Occupancy donut: {N} percent occupied ({occupied} of {total} units)"` | unit | same | ❌ Wave 0 | ⬜ pending |
| CHART-03 | All Phase 4 file color references are tokens (no hex/rgb in JSX strings) | unit | `bun run test:unit -- --run src/app/__tests__/design-token-drift.test.ts` | ✅ (existing gate) | ⬜ pending |
| CHART-04 | Dark-mode visual smoke | manual-only | (browser smoke during execute-phase; Phase 6 polishes) | n/a | ⬜ pending |
| CHART-05 | Skeleton renders inside Card shell with `lg:col-span-2` matching loaded chart | unit | Both chart test files include a skeleton snapshot test | ❌ Wave 0 | ⬜ pending |
| CHART-05 | Skeleton ↔ empty-state mutual exclusion (data branch logic) | unit | revenue test asserts `monthlyRevenue.length === 0 + window === '30d'` → empty-state, NOT skeleton | ❌ Wave 0 | ⬜ pending |
| CHART-06 | `dashboard.tsx` uses `dynamic(... { ssr: false, loading: () => <Skeleton /> })` for both | unit | dashboard test pins the dynamic import options (or integration check via snapshot) | partial | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/test/mocks/recharts.tsx` — **extend with `Label` export** (Pitfall 2 from RESEARCH.md). Without this, the donut test crashes on import.
- [ ] `src/components/dashboard/components/__tests__/revenue-area-chart.test.tsx` — covers CHART-01, CHART-03, CHART-05, CHART-06
- [ ] `src/components/dashboard/components/__tests__/occupancy-donut-chart.test.tsx` — covers CHART-02, CHART-03, CHART-05
- [ ] `tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` — covers CHART-01 + D-01 RLS isolation
- [ ] (Optional) update `src/components/dashboard/__tests__/dashboard.test.tsx` (if it exists) to assert the new pair of dynamic imports — verify via `grep -l "dashboard.test" src/components/dashboard/__tests__/` first

*Framework install: not needed — Vitest already installed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dark-mode contrast (no invisible series, no white-on-white legend swatches, axis label contrast) | CHART-04 | Visual diff requires browser eye-test in both light + dark; design-token-drift unit test pins color values but not perceptual contrast | Toggle dark mode via the project's theme toggle on `/dashboard`. Inspect: revenue area chart visible against `bg-card` in both modes; donut wedges + legend swatches distinct from `bg-card`; axis tick labels readable. |

---

## Validation Sign-Off

- [ ] All requirements have either `<automated>` verify OR a Wave 0 test stub OR a manual-only entry
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (Wave 0 stubs guarantee this)
- [ ] Wave 0 covers all MISSING references (recharts mock `Label` export, 4 new test files)
- [ ] No watch-mode flags in any verify command
- [ ] Feedback latency < 30s (unit ~10s, integration ~30s with cooldown)
- [ ] `nyquist_compliant: true` set in frontmatter once Wave 0 lands

**Approval:** pending
