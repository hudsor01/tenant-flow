# Phase 6: Polish & A11y - Context

**Gathered:** 2026-05-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Polish over the already-shipped `/dashboard` surfaces — no new capabilities. Five requirements (POLISH-04..08):

- **POLISH-04** Dark-mode audit: zero `bg-white`, no white-on-white text, no invisible badges across the dashboard subtree.
- **POLISH-05** Keyboard a11y: visible focus ring on every interactive element, `aria-label` on every icon-only button, skip-to-content reachable from the dashboard header.
- **POLISH-06** 375px responsive: zero horizontal scroll; portfolio table forces grid view at the mobile breakpoint.
- **POLISH-07** Skeleton ↔ empty-state mutual exclusion: never co-render a skeleton AND an empty state; route-scoped `loading.tsx` only if streaming is actually involved.
- **POLISH-08** Reduced-motion guard on every animation (`NumberTicker`, `BlurFade`, chart transitions, any CSS animation).

Out of scope (other phases): `/dashboard` E2E coverage breadth + final token sweep are **Phase 7** (POLISH-09, POLISH-12); per-property `open_maintenance` + `collection_rate` were **Phase 2** (POLISH-10/11, complete). New dashboard features are not this phase.
</domain>

<decisions>
## Implementation Decisions

### Responsive / breakpoints
- **D-01 (Table breakpoint — Claude-decided per user delegation):** Keep the portfolio **table at ≥1024px (lg) and force grid (card) view below 1024px** — i.e. preserve #765's `FORCE_GRID_QUERY = "(max-width: 1023px)"` in `portfolio-data-table.tsx` unchanged. Rationale: the 7-column table plus its sort + column-visibility controls (the visibility control is `lg`-only) need desktop width to stay readable; this satisfies the 375px zero-horizontal-scroll criterion with large margin; it is zero-regression (matches the surface as shipped + live-verified in the post-#765 audit). Do NOT widen the table to tablet (md/768px) — 7 columns cramp there and there is no column-hiding affordance at that width.

### Verification rigor
- **D-02:** Manual dark-mode toggle sweep + manual keyboard-tab a11y sweep across the whole `/dashboard` route, **PLUS add an automated `axe-core` a11y assertion to the `/dashboard` Playwright E2E** this phase (regression-proof on every future PR). Dark-mode **screenshot-diff regression is OUT** (baselines are flaky / high-maintenance for a B2B dashboard). NOTE for researcher: `axe` injected from a CDN is **CSP-blocked on prod** (confirmed in the 2026-05-31 live audit) — run axe against the local/preview build in E2E (e.g. `@axe-core/playwright`, which bundles the engine and does not violate CSP), not against `tenantflow.app`.

### Polish scope
- **D-03:** Sweep the **entire `/dashboard` subtree**, not just the v2.0-added regions. In scope: KPI bento (`kpi-bento-row.tsx`, `kpi-sparkline.tsx`), charts (`revenue-area-chart.tsx`, `occupancy-donut-chart.tsx` + skeletons), DataTable (`portfolio-data-table*.tsx`, `portfolio-columns.tsx`, `portfolio-grid.tsx`, `portfolio-preset-menu.tsx`, `portfolio-data-table-toolbar.tsx`, `lease-status-badge.tsx`), AND the older same-route surfaces (`expiring-leases-widget.tsx`, Quick Actions tiles in `dashboard.tsx`, dashboard header / app-shell chrome reachable from `/dashboard`). Justified by success criteria #1 ("zero `bg-white` in the **dashboard subtree**") and #2 ("Tab-navigating through **`/dashboard`** … every interactive element"), which are route-wide by wording. Bounded to the `/dashboard` route — do not wander into other routes.

### Reduced-motion
- **D-04:** Fix the **shared primitive** `src/components/ui/number-ticker.tsx` to honor `useReducedMotion()` internally — when reduced motion is set, skip the `requestAnimationFrame` loop and render the final `value` immediately (a CSS `prefers-reduced-motion` media query CANNOT stop a JS rAF animation, so the global CSS guard alone is insufficient — confirmed by reading the component during the 2026-05-31 audit). Then audit the other animation sources: `BlurFade` reveals (`kpi-bento-row.tsx` and elsewhere) and chart `isAnimationActive={!reducedMotion}` (already guarded in both charts — verify) + any CSS animations. Blast-radius discipline: grep ALL `NumberTicker` consumers before/after the change, and add/extend a unit test asserting the reduced-motion branch snaps to final value.

### Status badges (locked by UI-SPEC, not a gray area — flagged for the planner)
- **D-05:** `lease-status-badge.tsx` uses ad-hoc raw Tailwind colors (`bg-emerald-100 text-emerald-700` / `bg-amber-100 text-amber-700`). UI-SPEC §6 (line 415) mandates Phase 6 audit ad-hoc badge implementations and adopt the canonical `@utility status-*` helpers in `globals.css` (`status-active` / `status-pending` / `status-inactive` / `status-overdue`, all `color-mix`-based with light+dark variants → guaranteed dark-mode contrast). Map the three lease statuses: `active → status-active` (success), `expiring → status-pending` (warning), `vacant → status-inactive` (muted). This is part of POLISH-04 (dark-mode correctness) — the raw `dark:` variants are an ad-hoc per-mode hand-roll the utility replaces.

### Claude's Discretion
- D-01 (table breakpoint) was explicitly delegated ("you canonically decide") → locked to grid<1024 / table≥1024 above.
- POLISH-07 mechanism: the `/dashboard` page (`src/app/(owner)/dashboard/page.tsx`) is `"use client"` and fetches via TanStack Query (`useDashboardStats`/`useDashboardCharts`/`usePropertyPerformance` — all one shared `get_dashboard_data_v2` query), NOT RSC streaming. So a route-scoped `loading.tsx` may be unnecessary; the researcher/planner determines whether Suspense streaming is actually in play. The binding rule regardless: **never co-render a skeleton and an empty state** — fix any component that can show both. Claude/planner's technical call on the mechanism.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone design contract (highest priority)
- `.planning/phases/01-foundation-dedup/01-UI-SPEC.md` — milestone-wide UI design contract; Phase 6 enforces it directly. Key sections: **§3 Dark-Mode Rules** (hard prohibitions, surface mapping, status-badge utilities), **§4 Breakpoints** (375px hard floor §4.3, grid-force), **§5 Motion Budget** (§5.1 reduced-motion guard is non-negotiable, §5.2 reveal-density budget), **§6 Status-Color Usage Map** (line 415: "Phase 6 audits for ad-hoc badge implementations"), **§7 Density Scale**.

### Roadmap + requirements
- `.planning/ROADMAP.md` — Phase 6 detail section + the 5 success criteria (the TRUE/FALSE acceptance bar).
- `.planning/REQUIREMENTS.md` — POLISH-04, 05, 06, 07, 08 (full text + traceability table).

### Inherited phase context (read for carried-forward decisions)
- `.planning/phases/05-dashboard-portfolio-datatable/05-CONTEXT.md` — DataTable decisions; the surface D-01/D-03 polish.
- `.planning/phases/04-charts/04-CONTEXT.md` — chart token/motion decisions (D-09 token flow, reduced-motion).
- `.planning/phases/03-kpi-bento-row/03-CONTEXT.md` — KPI bento + NumberTicker/BlurFade reveal decisions.

### Token source of truth
- `src/app/globals.css` — `@theme` tokens, `:where(.dark, .dark *)` overrides, the `@utility status-*` helpers (lines ~661-686), and the global `prefers-reduced-motion` block (UI-SPEC §5.1). `src/**/design-token-drift.test.ts` enforces no hex/rgb/`bg-white`/inline-ms in dashboard files.
</canonical_refs>

<code_context>
## Existing Code Insights

(Scouted directly during the 2026-05-31 live `/dashboard` audit — high-confidence.)

### Reusable Assets
- `@utility status-active / status-pending / status-inactive / status-overdue` in `src/app/globals.css` — canonical, dark-mode-correct status badges (D-05 migration target).
- `useReducedMotion()` (`src/hooks/use-reduced-motion.ts`) — already consumed by charts + `KpiNumberTicker`; the canonical guard hook for D-04.
- `src/components/ui/chart.tsx` `ChartContainer` — already defers `ResponsiveContainer` mount until layout settles + sets `minWidth={1} minHeight={1}` (the historical Recharts `width(-1)` warning is already mitigated; no work needed there).
- `DashboardLoadingSkeleton` + chart skeletons (`*-skeleton.tsx`) — shape-matching skeletons already exist (POLISH-07 building blocks).

### Established Patterns
- `"use no memo"` directives were added to the DataTable component cluster in #765 (portfolio-data-table, toolbar, preset-menu, column-header, faceted-filter, view-options, pagination, portfolio-grid) to defeat a React-Compiler reactivity bug. **Do NOT strip these during polish** — they are load-bearing (React Compiler is enabled repo-wide).
- Charts already gate animation: `isAnimationActive={!reducedMotion}` in both `revenue-area-chart.tsx` and `occupancy-donut-chart.tsx`. Both have empty-state branches that render a plain `<div>` (no Recharts) when there is no data.
- `kpi-bento-row.tsx` wraps `NumberTicker` in `KpiNumberTicker`, which already short-circuits on reduced motion — but the underlying `NumberTicker` does not (D-04).

### Integration Points
- `src/components/ui/number-ticker.tsx` — D-04 edit point (shared primitive; grep consumers).
- `src/components/dashboard/components/lease-status-badge.tsx` — D-05 edit point (used by both `portfolio-columns.tsx` and `portfolio-grid.tsx`, so one change covers table + grid).
- `src/components/dashboard/components/portfolio-data-table.tsx` — `FORCE_GRID_QUERY` is the D-01 lock point (leave at `(max-width: 1023px)`).
- `tests/e2e/` — D-02 axe-core assertion lands here (Playwright; `@axe-core/playwright`).
- `src/app/(owner)/dashboard/page.tsx` — `"use client"`, shared `get_dashboard_data_v2` query; POLISH-07 skeleton↔empty lives here + in each region.
- `src/components/dashboard/expiring-leases-widget.tsx` + Quick Actions block in `dashboard.tsx` — older surfaces newly in scope per D-03.

### Live-audit note (relevant, not a Phase-6 bug)
- `NumberTicker`'s animation is gated on an `IntersectionObserver`; in headless/cloud browsers it does not fire on load, so the KPI numbers read stuck-0 until a scroll. This is an automation artifact, NOT a user-facing bug, and is orthogonal to the D-04 reduced-motion fix. Do not "fix" the IntersectionObserver gating as part of this phase.
</code_context>

<specifics>
## Specific Ideas

No bespoke "make it like X" references — the milestone UI-SPEC is the design source of truth and the five success criteria are the acceptance bar. Status-badge mapping (D-05) is the one concrete design choice: active→success, expiring→warning, vacant→muted.
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (The Recharts `width(-1)` warning was investigated and is already mitigated in `ChartContainer`; no separate item. The revenue-chart 375px overflow is folded into POLISH-06, not a separate deferral.)
</deferred>

---

*Phase: 6-Polish & A11y*
*Context gathered: 2026-05-31*
