# Phase 1: Foundation & Dedup - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Strip duplicate/dead dashboard code, kill the `*100`/`÷100` revenue round-trip, extract one shared data transform, and produce the **milestone-wide UI-SPEC** that phases 3/4/5 inherit. Zero new UI surfaces; this is corrective foundation.

**In scope:**
- Drop every `*100` and `/100` in the dashboard revenue path (3 lines in `page.tsx` + 1 line in `dashboard-types.ts` + 1 line in `revenue-overview-chart.tsx`)
- Replace `formatDashboardCurrency` with the project-wide `formatCurrency` from `src/lib/utils/currency.ts:26` (delete duplicate utility, update 4 callers)
- Delete dead dashboard files: `owner-dashboard.tsx`, `chart-area-interactive.tsx`, `dashboard-filters-compact.tsx` (duplicate of `dashboard-filters.tsx`), `dashboard-filters.tsx` if unused after dedup, second `portfolio-toolbar.tsx`, `skeletons.tsx`
- Extract shared RPC → view-model transform into new `src/components/dashboard/dashboard-data.ts`
- Write milestone-wide UI-SPEC at `01-UI-SPEC.md` (aesthetic, tokens, dark-mode rules, breakpoints, motion budget, density scale) — phases 3/4/5 inherit and extend

**Out of scope (deferred to later phases):**
- Any new dashboard UI surface (KPI tiles → Phase 3; new charts → Phase 4; DataTable → Phase 5)
- RPC schema changes (additive migration for per-property `open_maintenance` → Phase 2)
- `collection_rate` compute-or-drop decision (→ Phase 2 discuss)
- Section-level visual designs (KPI layout, chart shapes, DataTable density) — each phase writes its own UI-SPEC inheriting from this one

</domain>

<decisions>
## Implementation Decisions

### Bug fix scope (chart-display impact)
- **D-01:** Phase 1 fixes the revenue path **end-to-end in one PR**: drop `*100` in `page.tsx` (lines 71, 92, 107) + `/100` in `formatDashboardCurrency` (which is being deleted anyway) + `/100` in `revenue-overview-chart.tsx:41` (file gets deleted in Phase 4 — but the fix lands here for cycle-consistency).
- **D-02:** **One honest visible change ships with Phase 1**: chart values jump 100× to actually-correct dollars. KPI tiles render unchanged (the `*100`/`÷100` round-trip cancels itself through `formatDashboardCurrency`). Phase 1 success criterion #1 is reworded to make this intentional, not a regression: "KPI tiles render the same dollar values as before; chart values correct themselves to actual dollars (100× larger than the pre-fix display)."
- **D-03:** Phase 1 success criterion #3 (`grep -nE '\* ?100|/ ?100'` against currency variables) returns zero hits in `src/app/(owner)/dashboard/` and `src/components/dashboard/` post-PR. Verified with the same grep used during planning; the existing non-currency hits (`expiring-leases-widget.tsx:37` `60 * 24 * 60 * 60 * 1000`, `chart-area-interactive.tsx:73` `profitMargin = ... * 100`, `chart-area-interactive.tsx:268` and `revenue-overview-chart.tsx:70` `(value / 1000).toFixed(0)`) are excluded because (a) `chart-area-interactive.tsx` and `revenue-overview-chart.tsx` are both being deleted, and (b) the ms-arithmetic line is non-currency.

### UI-SPEC scope
- **D-04:** Milestone-wide UI-SPEC at `01-UI-SPEC.md` is **rules-only**: aesthetic principles + token reference + dark-mode rules + breakpoints + motion budget + status-color usage map + density scale.
- **D-05:** UI-SPEC explicitly enumerates:
  - Aesthetic: restrained B2B, no `@magicui` / `@aceternity`. `ui/bento-grid.tsx` (marketing component with absolute backgrounds + hover-reveal CTAs + fixed 18rem rows) is **forbidden** for KPI tiles.
  - Tokens: full `--color-*` (incl. `--color-chart-{1..5}`), `--spacing-*`, `--radius-*`, `--shadow-*`, `--duration-*`, `--ease-*`, `--text-*`.
  - Dark-mode rules: no `bg-white`, no white-on-white badges, no missing contrast on legend swatches; light↔dark toggle must reveal zero invisible elements.
  - Breakpoints: `375px` (mobile minimum, table forces grid view), `640px`, `768px`, `1024px`, `1280px` (`@container` queries preferred over media queries for tile/grid layouts).
  - Motion budget: `prefers-reduced-motion: reduce` guard on every animation (`NumberTicker`, `BlurFade`, chart transitions, CSS animations). `BlurFade` reveals capped at ~4 per page; `NumberTicker` reserved for KPI tile values only (NOT chart axis labels or table cells).
  - Status colors: `--color-success` (occupancy ≥ 90%), `--color-warning` (maintenance ≥ N open), `--color-info` (lease expiring within 30d), `--color-destructive` (overdue / negative trend). Numbers (N) finalized when KPI thresholds settle in Phase 3.
  - Density: compact tile padding (`p-4` to `p-6`), grid gaps `gap-3` / `gap-4` / `gap-6`, table row height `h-12` minimum for keyboard click target.
- **D-06:** Phase-specific UI-SPECs (`03-UI-SPEC.md`, `04-UI-SPEC.md`, `05-UI-SPEC.md`) inherit from `01-UI-SPEC.md` and make concrete section-level decisions (KPI tile layout, chart heights, DataTable column widths). Phase 1's UI-SPEC does NOT prescribe section layouts.

### Currency utility consolidation
- **D-07:** **Delete `formatDashboardCurrency`** (`src/components/dashboard/dashboard-types.ts:29`) and **replace 4 callers** with the project-wide `formatCurrency` from `src/lib/utils/currency.ts:26`. Callers: `dashboard.tsx`, `dashboard-types.ts` self-reference removed, `components/portfolio-grid.tsx`, `components/portfolio-table.tsx`.
- **D-08:** This resolves the CLAUDE.md "no duplicate utilities" Zero Tolerance principle in the same PR as the bug fix. The two changes are tightly coupled (both touch `dashboard-types.ts`), so they ship atomically.
- **D-09:** `formatCurrency` from `currency.ts` takes a dollar value (per its signature at the line cited). No `/100` inside it. The Phase 1 swap is type-safe: callers pass `stats.revenue.monthly` which is already in dollars per `get_dashboard_data_v2`.

### Shared data transform location
- **D-10:** New file `src/components/dashboard/dashboard-data.ts` holds the pure RPC → view-model transform (`transformDashboardData(rpcPayload) → { stats, timeSeries, portfolioRows }`). `dashboard-types.ts` retains type defs + `chartConfig` + `quickActions`; it loses `formatDashboardCurrency` (D-07).
- **D-11:** Transform is a **pure function** (no React hooks, no React Query coupling), unit-testable in isolation. Phase 7 verification adds a regression-pin test for it.
- **D-12:** `use-owner-dashboard.ts` (the React Query hook) imports `transformDashboardData` and applies it inside `select:` so consumers get the view-model directly. Phases 2-5 read the view-model, not the raw RPC.

### Dedup target list
- **D-13:** Files to delete in Phase 1:
  - `src/components/dashboard/owner-dashboard.tsx` (near-duplicate of `dashboard.tsx` with a copy-pasted transform)
  - `src/components/dashboard/chart-area-interactive.tsx` (unused interactive chart; the new `RevenueAreaChart` in Phase 4 replaces it)
  - `src/components/dashboard/dashboard-filters-compact.tsx` (duplicate of `dashboard-filters.tsx`; verify with `grep -rn dashboard-filters-compact src/` returns only the file itself)
  - `src/components/dashboard/dashboard-filters.tsx` if it has zero consumers after `-compact` is removed; otherwise keep
  - The second `portfolio-toolbar.tsx` at `src/components/dashboard/portfolio-toolbar.tsx` (the canonical one is under `components/`)
  - `src/components/dashboard/skeletons.tsx` (unused; Phase 6 ships per-section skeletons that match shipped shapes)
- **D-14:** Verify each delete with `grep -rn '<filename>' src/ tests/ supabase/` returning zero imports before staging the delete. Any survivor that's actually imported gets investigated, not deleted (could be a forgotten dependency).
- **D-15:** Plan 15-style atomic commits: one commit per delete (`chore(01): delete duplicate owner-dashboard.tsx`) so review is small and reverts are surgical if any consumer surfaces.

### Cross-cutting (universal — [informational], parser-recognized)
- **D-16 [informational]:** Perfect-PR merge gate applies (two consecutive zero-finding deep review cycles). Same gate as every v1.0 phase.
- **D-17 [informational]:** No emojis in code. No hex/rgb/`bg-white`/inline-ms. Lucide icons only. Per CLAUDE.md Zero Tolerance Rules.
- **D-18 [informational]:** `bun install --frozen-lockfile` fails in command sandbox — run `git commit` with sandbox disabled. NEVER `--no-verify` / `LEFTHOOK_EXCLUDE` (HANDOFF blocking anti-pattern carried forward from v1.0).
- **D-19 [informational]:** After every code-fixer sub-agent return, run `git status --short` + `git diff --stat` to verify what actually landed against what the agent reported (Phase 10 IN-01/IN-02 lesson carried forward).
- **D-20 [informational]:** For TypeScript narrowing claims in tests, write `@ts-expect-error` probe to verify empirically before asserting; remove probe before commit (Phase 12 NavHref lesson + Phase 15-05 `dropdownItems` lesson carried forward).

### Claude's Discretion

- Exact filename for the new transform file inside the agreed location — `dashboard-data.ts` per D-10, but if the executor finds a more idiomatic project naming (e.g., the project uses `.transforms.ts` suffix elsewhere), prefer the convention.
- Wording of the UI-SPEC section headings — D-04 + D-05 enumerate the topics; executor picks the structure.
- Whether to keep `dashboard-filters.tsx` after deleting `-compact.tsx` — depends on consumer grep result per D-14.
- Test file locations for the regression-pin test of `transformDashboardData` — Phase 7's responsibility; Phase 1 writes the transform but does NOT necessarily ship its test (could be deferred to Phase 7's verification sweep).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 source-of-truth
- `.planning/REQUIREMENTS.md` — POLISH-01, POLISH-02, POLISH-03 with descriptions; cross-cutting constraints (token alignment, no `*100`/`/100`, restrained B2B, independently shippable phases)
- `.planning/ROADMAP.md` § "Phase 1: Foundation & Dedup" — goal + 4 success criteria + dep order
- `.planning/milestones/v1.0-phases/15-*/15-CONTEXT.md` — example of CONTEXT.md structure with `[informational]`-tagged cross-cutting decisions (the parser-recognized format that makes the decision-coverage gate pass clean). New v2.0 phases should mirror this format.
- `/Users/richard/.claude/plans/i-want-to-enhance-hazy-island.md` — the user's parked plan; the canonical source for the 7-phase structure and the critical files map (kept on disk outside the repo because the user owns the plan personally).

### Live-code anchors (read before writing any fix)
- `src/app/(owner)/dashboard/page.tsx` — RPC fetcher entry; lines 71, 92, 107 carry the `*100` bug. The actual file lines may have shifted; re-grep `* 100` at execution time.
- `src/components/dashboard/dashboard-types.ts` — defines `PortfolioRow`, `chartConfig`, `quickActions`, and currently `formatDashboardCurrency` (line 29). The first 3 stay; the 4th is deleted.
- `src/components/dashboard/dashboard.tsx` — current renderer; will be replaced by `dashboard-view.tsx` in Phase 3 but is touched in Phase 1 for the formatCurrency swap.
- `src/components/dashboard/owner-dashboard.tsx` — duplicate of dashboard.tsx; deleted in Phase 1.
- `src/components/dashboard/chart-area-interactive.tsx` — unused; deleted in Phase 1.
- `src/components/dashboard/components/revenue-overview-chart.tsx` — has the `/100` at line 41. File gets fully deleted in Phase 4; the `/100` removal in Phase 1 is a one-line bug fix that lives for ~3 phases until Phase 4 supplants it.
- `src/components/dashboard/components/portfolio-grid.tsx` + `components/portfolio-table.tsx` — consume `formatDashboardCurrency`; need the swap.
- `src/lib/utils/currency.ts:26` — `formatCurrency` (the canonical project-wide helper that replaces the duplicate).
- `src/hooks/api/use-owner-dashboard.ts` — React Query hook; Phase 1 adds the `transformDashboardData` import + `select:` wiring.

### Cross-cutting standards (inherited from v1.0)
- `CLAUDE.md` — Zero Tolerance Rules (no `any`, no barrel files, no duplicate types, no commented-out code, no inline styles, no `as unknown as`, no string-literal query keys, lucide-react only). The `formatDashboardCurrency` duplicate is exactly the kind of violation v1.0 audit-round-3 wanted closed; this phase resolves it.
- `src/app/__tests__/design-token-drift.test.ts` (v1.0 Phase 11) — drift guard continues to enforce; Phase 1 changes must not regress it.
- `.planning/MILESTONES.md` § "Lessons Carried Forward to v2.0" — explicit lessons from v1.0 including sandbox-disabled commits, code-fixer verification, `@ts-expect-error` probe pattern, user-directive-is-the-directive.

### Reference implementation (UI-SPEC template)
- `.planning/milestones/v1.0-phases/12-*/12-UI-SPEC.md` — if exists, it's the canonical template structure to mirror (v1.0 Phase 12 SEO/metadata had a UI-SPEC). Otherwise, the GSD-builtin UI-SPEC template at `~/.claude/get-shit-done/templates/ui-spec.md`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/lib/utils/currency.ts:26` `formatCurrency`** — project-wide, already used in 10+ files across `(owner)/analytics`, `(owner)/reports`, `components/financials`. The dashboard subtree is the lone holdout.
- **`src/components/ui/stat.tsx`** — Stat shell + StatLabel + StatValue + StatTrend + StatDescription. Vendored but unused by the current dashboard. Will be heavily used in Phase 3.
- **`src/components/ui/number-ticker.tsx`** — `NumberTicker` (Phase 2 v1.0 hardened the IntersectionObserver one-shot + rAF cleanup). Phase 3 consumer.
- **`src/components/ui/blur-fade.tsx`** — BlurFade. Phase 3 consumer.
- **`src/components/ui/chart.tsx`** + `chart-tooltip.tsx` — shadcn chart primitives. Phase 4 consumer.
- **`src/components/data-table/*` (8 files) + `src/hooks/use-data-table.ts`** — DiceUI DataTable stack (server-mode). Phase 5 consumer; needs the client-mode variant.
- **`src/app/__tests__/design-token-drift.test.ts`** — v1.0 Phase 11 drift guard; runs in CI for every PR including Phase 1's.

### Established Patterns
- **Atomic-commit-per-change** — Phase 1 will have multiple delete commits + multiple swap commits + one transform-extract commit + one UI-SPEC commit. Each independently revertible. Matches Phase 15's discipline.
- **Sandbox-disabled commits** — `lockfile-verify` lefthook hook fails inside command sandbox; bypass via `dangerouslyDisableSandbox: true` on the `git commit` Bash call ONLY (NEVER on other operations). NEVER `--no-verify` / `LEFTHOOK_EXCLUDE`.
- **Per-phase branches** — `gsd/phase-1-foundation-dedup` (matches the slug; init resolved `01-foundation-dedup` as `expected_phase_dir`, but the branch template includes the `dashboard-` prefix per parked plan + ROADMAP).
- **`'use client'` only when needed** — dashboard renderer + components are mostly `'use client'` because they consume React Query hooks; transform module (`dashboard-data.ts`) is **pure** and should be Server-Component-safe (no client directive).

### Integration Points
- **`get_dashboard_data_v2` RPC contract** — unchanged in Phase 1. The transform reads dollars from the RPC and emits dollars to the view-model. Phase 2 makes the additive migration; Phase 1 doesn't touch the schema.
- **React Query hook `use-owner-dashboard.ts`** — Phase 1 wires `select: transformDashboardData` so all consumers get the view-model; this is the integration seam between data layer and view layer.
- **`design-token-drift.test.ts`** — every Phase 1 file change goes through it in CI. Phase 1 introduces no new tokens; it only deletes files and swaps utility imports.
- **`marketing-copy-landlord-only.test.ts`** (v1.0 Phase 4 banlist) — does NOT scan `src/components/dashboard/`; the persona-honesty banlist is marketing-surface-scoped. Phase 1 dashboard work doesn't touch it. Confirm at execution time that the test path globs don't accidentally include dashboard files.

</code_context>

<specifics>
## Specific Ideas

- User explicitly chose "Fix everything in Phase 1" for the chart-bug visible change (D-01/D-02): "make it perfect" / "everything no matter severity, canonically" pattern carried over from v1.0. The brief 100×-chart-jump is acceptable because the alternative is leaving a known bug visible for 3 more phases.
- The `formatCurrency` consolidation (D-07) was a happy accident discovered during gray-area triage — the duplicate utility wasn't even listed in the parked plan; surfaced live during codebase scout. Closing it in Phase 1 prevents an audit-round-N "documented imperfection" from accumulating.
- v1.0 closed with audit round 3 verdict PERFECT BY ALL MEASURES; the user's directive for v2.0 is to maintain that bar. Phase 1's success criteria are stricter than usual (zero `* 100` / `/ 100` hits in the dashboard subtree, including non-currency arithmetic if it shares the lexical shape — verify each hit individually).

</specifics>

<deferred>
## Deferred Ideas

- **Phase 2 RPC migration for per-property `open_maintenance`** — Phase 1's dedup work surfaces it as a hardcoded `0` in the portfolio data model. Phase 2 ships the additive migration + RLS test.
- **`collection_rate` compute-or-drop** — TenantFlow demolished rent facilitation, so this metric is likely uncomputable. Phase 2 discuss-phase decides: compute from existing data OR drop the KPI tile entirely (NEVER fabricate `0` — v1.0 honesty principle).
- **Replacement of `dashboard.tsx` itself** — Phase 3 replaces this file with `dashboard-view.tsx` as the new entry. Phase 1 touches `dashboard.tsx` (for the formatCurrency swap) but does NOT replace it.
- **Test for `transformDashboardData`** — Phase 7 verification adds the unit test. Phase 1 writes the transform; phase 7 pins it.
- **Section-level visual designs** — Phase 3 UI-SPEC (KPI), Phase 4 UI-SPEC (charts), Phase 5 UI-SPEC (DataTable). Phase 1 UI-SPEC is rules-only and inherited by these.

</deferred>

---

*Phase: 01-foundation-dedup*
*Context gathered: 2026-05-22*
