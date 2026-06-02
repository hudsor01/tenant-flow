# Phase 6: Polish & A11y - Research

**Researched:** 2026-06-01
**Domain:** Frontend polish over already-shipped `/dashboard` surfaces — dark-mode token correctness, keyboard a11y, 375px responsive, skeleton↔empty mutual exclusion, JS reduced-motion guards. Stack: Next.js 16 + React 19 + TailwindCSS 4 + React Compiler (enabled), Playwright 1.60 E2E, Vitest 4 + jsdom unit.
**Confidence:** HIGH (every finding is grounded in a live read of the actual files on `gsd/post-749-cleanup-review` at 2026-06-01; no training-data guesses about TenantFlow internals).

## Summary

This is a **polish phase over five already-shipped surfaces** (KPI bento, charts, DataTable, expiring-leases widget, Quick Actions / page chrome). There are essentially no new components to build — the work is (1) replacing ad-hoc raw-Tailwind colors with canonical design tokens for guaranteed dark-mode contrast, (2) hardening the shared `NumberTicker` primitive with an internal reduced-motion guard, (3) confirming skeleton↔empty exclusivity (mostly already correct), (4) adding one automated `axe-core` E2E assertion, and (5) verifying 375px zero-scroll (D-01's grid-force already does the heavy lifting).

The single most important discovery: the `design-token-drift.test.ts` guard scans for **hex / rgb / `bg-white` / inline-ms ONLY** — it does **NOT** catch raw Tailwind palette classes like `text-red-600`, `bg-emerald-100`, or `text-amber-700`. The dashboard subtree is clean of `bg-white` (verified zero), so POLISH-04's `bg-white` criterion is *already* satisfied — but there are **six** raw-palette-color landmines the drift guard silently allows, and they are exactly the "invisible badge / wrong-in-dark-mode" risk POLISH-04 targets. These are the real POLISH-04 work, plus the D-05 lease-status-badge migration.

Second key discovery: `NumberTicker` has **16 consumers across the whole app** (financials, analytics, tenants, reports, maintenance, profiles, sections — not just the dashboard). The D-04 fix to the shared primitive has app-wide blast radius and must be regression-tested against the existing `number-ticker.test.tsx` suite (which uses fake timers + an IntersectionObserver mock).

Third: `@axe-core/playwright@^4.11.0` is declared in `tests/e2e/package.json` but is **NOT installed** (no `node_modules`, no lockfile there) and is **NOT in the root `package.json`**. CI runs E2E via `bunx playwright test` from the **repo root**, resolving deps from **root** `node_modules`. So the package must be added to the **root** `package.json` devDeps to be importable. The package is legitimate (published by Deque Labs, the official axe maintainer).

**Primary recommendation:** Migrate every ad-hoc status/trend color to the canonical `@utility status-*` helpers and `--color-{success,warning,destructive}` tokens; add an internal `useReducedMotion()` guard to `NumberTicker` and extend its test; add `@axe-core/playwright` to **root** devDeps and write one `tests/e2e/tests/owner/dashboard-a11y.e2e.spec.ts` running `AxeBuilder` against `/dashboard`; verify (do not over-engineer) skeleton↔empty exclusivity and 375px zero-scroll. Do NOT add a route-scoped `loading.tsx` for `/dashboard` — it is fully client-fetched and an inherited `(owner)/loading.tsx` already covers the navigation case.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dark-mode token correctness | Browser/Client (CSS tokens) | — | `globals.css` `:where(.dark,.dark *)` redefines tokens; components reference tokens, dark mode "just works" |
| Keyboard focus / aria-labels | Browser/Client (DOM) | — | Pure markup/CSS; no server involvement |
| 375px responsive layout | Browser/Client (CSS container/media queries) | — | `useMediaQuery` + `@container` grid; `FORCE_GRID_QUERY` already at client |
| Skeleton↔empty mutual exclusion | Frontend Server (RSC `loading.tsx`) + Client (branch render) | — | `/dashboard` page is `"use client"` → branch render owns it; route `loading.tsx` is the streaming/navigation case |
| Reduced-motion (JS rAF / Recharts) | Browser/Client (`useReducedMotion()` + `matchMedia`) | — | JS-driven animations need a JS guard; CSS media query cannot stop a rAF loop |
| Automated a11y assertion | E2E (Playwright + axe-core, runs against client-rendered DOM) | — | axe injects the engine into the running page; must run against local/preview build (CSP blocks CDN axe on prod) |

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 (Table breakpoint, Claude-decided per delegation):** Keep portfolio **table at ≥1024px (lg)**, **force grid (card) view below 1024px** — preserve `FORCE_GRID_QUERY = "(max-width: 1023px)"` in `portfolio-data-table.tsx` UNCHANGED. Do NOT widen the table to tablet/md.
- **D-02:** Manual dark-mode toggle sweep + manual keyboard-tab sweep across the whole `/dashboard` route, **PLUS** add an automated `axe-core` a11y assertion to the `/dashboard` Playwright E2E. Use `@axe-core/playwright` (bundles the engine — no CDN, no CSP violation). Run against local/preview build, NOT prod. Dark-mode **screenshot-diff regression is OUT.**
- **D-03:** Sweep the **entire `/dashboard` subtree**: KPI bento (`kpi-bento-row.tsx`, `kpi-sparkline.tsx`), charts (`revenue-area-chart.tsx`, `occupancy-donut-chart.tsx` + skeletons), DataTable (`portfolio-data-table*.tsx`, `portfolio-columns.tsx`, `portfolio-grid.tsx`, `portfolio-preset-menu.tsx`, `portfolio-data-table-toolbar.tsx`, `lease-status-badge.tsx`), AND older same-route surfaces (`expiring-leases-widget.tsx`, Quick Actions in `dashboard.tsx`, dashboard header / app-shell chrome). Bounded to `/dashboard` — do not wander into other routes.
- **D-04:** Fix the **shared primitive** `src/components/ui/number-ticker.tsx` to honor `useReducedMotion()` internally — when reduced motion is set, skip the `requestAnimationFrame` loop and render the final `value` immediately. Then audit `BlurFade` reveals and chart `isAnimationActive` (already guarded in both charts — verify) + any CSS animations. Grep ALL `NumberTicker` consumers before/after; add/extend a unit test asserting the reduced-motion branch snaps to final value.
- **D-05:** Migrate `lease-status-badge.tsx` from raw `bg-emerald-100 text-emerald-700` / `bg-amber-100 text-amber-700` to the canonical `@utility status-*` helpers in `globals.css`. Map: `active → status-active` (success), `expiring → status-pending` (warning), `vacant → status-inactive` (muted). Part of POLISH-04.

### Claude's Discretion

- D-01 (table breakpoint) explicitly delegated → locked to grid<1024 / table≥1024.
- **POLISH-07 mechanism:** `/dashboard` page is `"use client"` + TanStack Query (not RSC streaming). A route-scoped `loading.tsx` MAY be unnecessary; researcher/planner determines whether Suspense streaming is in play. Binding rule regardless: **never co-render a skeleton AND an empty state.** Claude/planner's technical call on the mechanism.

### Deferred Ideas (OUT OF SCOPE)

- None deferred during discussion. (The Recharts `width(-1)` warning was already mitigated in `ChartContainer`; the revenue-chart 375px overflow folds into POLISH-06, not a separate item.)
- **Out of phase (other phases, do NOT touch):** `/dashboard` E2E coverage breadth + final token sweep = Phase 7 (POLISH-09, POLISH-12). Per-property `open_maintenance` + `collection_rate` = Phase 2 (POLISH-10/11, complete). New dashboard features = not this phase.

## Project Constraints (from CLAUDE.md)

Actionable directives the planner MUST honor (same authority as locked decisions):

| # | Directive | Phase-6 relevance |
|---|-----------|-------------------|
| Z-1 | No `any` types — `unknown` + type guards | Any new test/helper code |
| Z-2 | No barrel files / re-exports — import directly | Any new file |
| Z-5 | **No inline styles** — Tailwind utilities or `globals.css` custom properties only | EXCEPTION already sanctioned: `GRID_CONTAINER_STYLE` in `kpi-bento-row.tsx` (container-type) + the react-virtual width/transform set in `portfolio-data-table.tsx` — do NOT "fix" these |
| Z-7 | No emojis in code — Lucide icons for UI | Any new copy |
| Z-10 | `lucide-react` is the sole icon library | — |
| — | Max 300 lines/component, 50 lines/function | New a11y test file, NumberTicker edit |
| — | Server Components by default; `'use client'` only when needed | NumberTicker stays `"use client"` (already) |
| — | Vitest: `vi.hoisted()` for mock vars in `vi.mock()`; `.rejects.toMatchObject({ message: expect.stringContaining(...) })` NOT `.rejects.toThrow('string')` (chai 6 bug); `matchMedia` must be mocked in jsdom | NumberTicker reduced-motion test |
| — | 80% coverage threshold (lefthook pre-commit) | New test code must keep coverage green |
| — | Perfect-PR gate: two consecutive zero-finding deep review cycles | Merge discipline |
| — | NEVER push to main; feature branch `gsd/phase-6-dashboard-polish-a11y` → PR | Git workflow |
| — | `design-token-drift.test.ts` enforces no hex/rgb/bg-white/inline-ms in `src/components` + `src/app` | Stays green; note it does NOT catch palette classes |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POLISH-04 | Dark-mode audit: zero `bg-white` (already zero), no white-on-white, no invisible badges across dashboard subtree | §"Don't Hand-Roll" status-* migration; §Pitfall-1 (palette classes evade drift guard); the 6 landmines table; D-05 mapping |
| POLISH-05 | Keyboard a11y: visible focus ring every interactive element, `aria-label` every icon-only button, skip-to-content reachable from header | §"Code Examples" focus-ring token; interactive-element audit checklist; skip-link already wired (`<main id="main-content">` exists) |
| POLISH-06 | 375px: zero horizontal scroll; portfolio table forces grid at mobile breakpoint | D-01 `FORCE_GRID_QUERY` already satisfies the table; §Pitfall-3 hydration flash; Playwright `scrollWidth` probe pattern exists |
| POLISH-07 | Skeleton↔empty mutual exclusion; route-scoped `loading.tsx` only if streaming | §"State of the Art": confirmed NOT streaming; inherited `(owner)/loading.tsx` covers navigation; branch-render audit table |
| POLISH-08 | Reduced-motion guard on every animation (NumberTicker, BlurFade, chart transitions, CSS) | D-04 NumberTicker fix; charts already guarded (verified); BlurFade already guarded (verified + edge case noted); CSS guard in globals.css line 1151 |

## Standard Stack

This phase introduces exactly **one** new package and otherwise consumes already-vendored primitives.

### Core (new)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@axe-core/playwright` | `^4.11.0` (latest 4.11.3) | Inject the axe-core a11y engine into a Playwright-controlled page and assert zero violations | Official Deque integration; bundles the engine (no CDN → no CSP violation, which is exactly why D-02 chose it) |

`@axe-core/playwright` transitively pulls `axe-core` (latest 4.11.4) — the actual rules engine.

### Supporting (already vendored — consume, do not re-add)
| Library / Asset | Path | Purpose | Phase-6 use |
|-----------------|------|---------|-------------|
| `useReducedMotion()` | `src/hooks/use-reduced-motion.ts` | Canonical `matchMedia('(prefers-reduced-motion: reduce)')` hook, SSR-safe (returns `false` until effect) | D-04: import into `NumberTicker` |
| `@utility status-active/-pending/-inactive/-overdue` | `src/app/globals.css:661-687` | `color-mix`-based status colors, light+dark correct | D-05: lease-status-badge target |
| `useMediaQuery(query)` | `src/hooks/use-media-query.ts` | SSR-safe media query hook (returns `false` during SSR) | Already drives `FORCE_GRID_QUERY` (D-01) |
| Playwright `1.60.0` | root `node_modules` | E2E runner | Hosts the new axe test |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@axe-core/playwright` | CDN-injected axe via `page.addScriptTag` | **Rejected by D-02** — CSP-blocked on prod (confirmed in 2026-05-31 audit); the npm package bundles the engine and sidesteps CSP entirely |
| `@axe-core/playwright` | `jest-axe` in jsdom | jsdom can't compute real layout/contrast; axe contrast/visibility rules need a real browser. Playwright is correct for D-02. |
| Token migration on each file | A new ESLint/Vitest rule banning raw palette classes | Out of scope — that's a Phase 7 drift-guard concern (POLISH-12); Phase 6 does the migrations, Phase 7 may add the guard |

**Installation (root, not tests/e2e):**
```bash
bun add -D @axe-core/playwright
```
> ⚠️ The dependency is currently declared in `tests/e2e/package.json` but that package has **no** `node_modules` and **no** lockfile, and CI runs `bunx playwright test --config tests/e2e/playwright.config.ts` from the **repo root** (resolves from root `node_modules`). It must be added to the **root** `package.json`. See §Environment Availability.

**Version verification (run 2026-06-01):**
```
npm view @axe-core/playwright version  → 4.11.3
npm view axe-core version              → 4.11.4
npm view @axe-core/playwright maintainers → dqlabs <labs@deque.com>, wilcofiers (Deque, official)
```

## Package Legitimacy Audit

> slopcheck was not available in this research environment; legitimacy verified manually via npm registry + maintainer identity. The single package is a well-known official Deque integration with millions of weekly downloads.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@axe-core/playwright` | npm | ~5 yrs | very high (industry-standard a11y tool) | github.com/dequelabs/axe-core-npm | n/a (manual) | Approved — official Deque maintainer (`labs@deque.com`), CITED in D-02 |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck unavailable → strictly the planner should add a `checkpoint:human-verify` before `bun add`, but the package is the exact one named in the locked decision D-02 and is the canonical official axe-Playwright binding, so risk is minimal. `[CITED: CONTEXT.md D-02]` + `[VERIFIED: npm registry, Deque maintainer]`.*

## Architecture Patterns

### System Architecture Diagram

How the five polish concerns flow through the `/dashboard` route (data + render path):

```
                       ┌─────────────────────────────────────────────────┐
  Browser request      │  app/(owner)/layout.tsx  → OwnerDashboardLayout  │
  GET /dashboard       │     └─ AppShell (src/components/shell/app-shell) │
                       │          ├─ <a href="#main-content"> skip link   │  ← root layout.tsx
                       │          │     (POLISH-05: target EXISTS below)   │
                       │          ├─ AppShellHeader (icon buttons → audit) │
                       │          └─ <main id="main-content">  ◄───────────┤  ← skip-link target
                       └────────────────────────┬────────────────────────┘     (app-shell.tsx:294)
                                                 │
              ┌──────────────────────────────────▼──────────────────────────────┐
              │  (owner)/loading.tsx  (RSC, inherited)  → covers NAVIGATION/      │
              │  streaming fallback for /dashboard (POLISH-07 streaming case      │
              │  is THIS file, not a new dashboard/loading.tsx)                   │
              └──────────────────────────────────┬──────────────────────────────┘
                                                 │
                   ┌──────────────────────────────▼─────────────────────────────┐
                   │  dashboard/page.tsx  "use client"  (DashboardContent)        │
                   │   <Suspense fallback={<DashboardLoadingSkeleton/>}>          │
                   │   3 TanStack Query hooks → ONE get_dashboard_data_v2 RPC     │
                   │                                                              │
                   │   BRANCH RENDER (POLISH-07 mutual exclusion lives here):     │
                   │     isLoading → <DashboardLoadingSkeleton/>   ─┐             │
                   │     error     → error block                    │ exactly ONE │
                   │     isEmpty   → <DashboardEmptyState/>         │ at a time   │
                   │     else      → <Dashboard/>                  ─┘             │
                   └──────────────────────────────┬─────────────────────────────┘
                                                  │ (data path)
        ┌──────────────────────────┬──────────────┴──────────┬───────────────────────┐
        ▼                          ▼                          ▼                       ▼
  KpiBentoRow              RevenueAreaChart           PortfolioDataTable      ExpiringLeasesWidget
  ├ NumberTicker (D-04)    OccupancyDonutChart        ├ FORCE_GRID_QUERY      (own TanStack Query;
  │   ◄ KpiNumberTicker    ├ isAnimationActive=        │   (D-01, POLISH-06)   own loading branch;
  │     guards locally     │   {!reducedMotion} ✓      ├ LeaseStatusBadge      raw text-amber-* →
  │     but PRIMITIVE      │   (POLISH-08 ✓ verified)  │   (D-05 migrate)      token (POLISH-04))
  │     does NOT (D-04)    └ empty-branch = plain      ├ portfolio-grid /
  ├ BlurFade (guarded ✓)       <div>, no Recharts          columns: text-red-600
  └ StatTrend                  (no skeleton↔empty)          (POLISH-04 migrate)
    text-green/red-600
    raw palette (POLISH-04)               Quick Actions tiles (dashboard.tsx) — token-clean, just
                                          audit focus ring + 375px (POLISH-05/06)
```

### Recommended work structure (no new dirs — edits in place)
```
src/components/ui/number-ticker.tsx          # D-04: add useReducedMotion() guard
src/components/ui/__tests__/number-ticker.test.tsx  # D-04: + reduced-motion branch test
src/components/ui/stat.tsx                    # POLISH-04: StatTrend text-green/red-600 → tokens (shared primitive; blast-radius)
src/components/dashboard/components/lease-status-badge.tsx     # D-05: status-* utilities
src/components/dashboard/components/portfolio-columns.tsx      # POLISH-04: MaintenanceCell text-red-600 → token
src/components/dashboard/components/portfolio-grid.tsx         # POLISH-04: maintenance text-red-600 → token
src/components/dashboard/expiring-leases-widget.tsx            # POLISH-04: text-amber-600 / text-amber-700 → tokens
tests/e2e/tests/owner/dashboard-a11y.e2e.spec.ts              # D-02: NEW axe assertion (owner project)
package.json                                  # add @axe-core/playwright to root devDeps
```

### Pattern 1: Internal reduced-motion guard on a rAF primitive (D-04)
**What:** A JS `requestAnimationFrame` loop is NOT stopped by the CSS `prefers-reduced-motion` block (that only zeroes `animation-duration`/`transition-duration`). The primitive must read the preference in JS and skip the loop.
**When to use:** `NumberTicker` (the only rAF primitive in the dashboard subtree).
**Example (the canonical wrapper pattern already proven in `kpi-bento-row.tsx` `KpiNumberTicker`):**
```tsx
// Source: src/components/dashboard/components/kpi-bento-row.tsx (existing KpiNumberTicker)
// + src/hooks/use-reduced-motion.ts
const reducedMotion = useReducedMotion();
// inside NumberTicker, BEFORE/INSTEAD OF the rAF useEffect:
useEffect(() => {
  if (reducedMotion) { setDisplayValue(to); return; }   // snap to final, no rAF
  if (!hasIntersected) return;
  // ...existing rAF animation...
}, [reducedMotion, hasIntersected, from, to, delay, duration]);
```
> The `KpiNumberTicker` wrapper in `kpi-bento-row.tsx` already does this defensively (short-circuits to a static `<span>` when reduced motion). After D-04 fixes the primitive, the wrapper becomes redundant defense-in-depth — the planner may keep it (harmless) or simplify; do NOT remove it in a way that loses the guard. The reduced-motion override `!text-[var(--color-warning)]` in `kpi-bento-row.tsx` is unrelated (it's a color override for "down" trends) — leave it.

### Pattern 2: Branch render for skeleton↔empty exclusivity (POLISH-07)
**What:** `isLoading ? <Skeleton/> : empty ? <Empty/> : <Content/>` — exactly one renders.
**When to use:** Already correctly implemented in `dashboard/page.tsx` (`DashboardContent`). Verify each sub-region (charts have their own empty branch; ExpiringLeasesWidget has its own `isLoading`/empty branches).
**Example:**
```tsx
// Source: src/app/(owner)/dashboard/page.tsx — already correct
if (isLoading) return <DashboardLoadingSkeleton />;
if (statsError || chartsError) return <ErrorBlock />;
const isEmpty = !statsData?.stats || (propertiesTotal === 0 && tenantsTotal === 0);
if (isEmpty) return <DashboardEmptyState />;
return <Dashboard ... />;
```

### Pattern 3: axe-core E2E assertion (D-02)
**What:** Inject axe via `AxeBuilder`, scope to the page, filter to WCAG tags, assert zero violations.
**Example:**
```ts
// Source: github.com/dequelabs/axe-core-npm (official @axe-core/playwright README)
import AxeBuilder from "@axe-core/playwright";
const results = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
  .analyze();
expect(results.violations).toEqual([]);
```
See §Code Examples for the full dashboard-scoped test with the `owner` storageState auth pattern.

### Anti-Patterns to Avoid
- **Adding `src/app/(owner)/dashboard/loading.tsx`** — the route is client-fetched; this file would only ever flash during navigation and the inherited `(owner)/loading.tsx` already serves that. Adding it risks a double-skeleton.
- **Stripping `"use no memo"` directives** — present on the entire DataTable cluster (PR #765) to defeat a React-Compiler reactivity bug. Load-bearing. Do NOT remove during polish.
- **"Fixing" the sanctioned inline styles** — `GRID_CONTAINER_STYLE` (container-type) in `kpi-bento-row.tsx` and the react-virtual width/transform/grid-flex set in `portfolio-data-table.tsx` are documented Z-5 exceptions. Leave them.
- **"Fixing" the IntersectionObserver gating on NumberTicker** — the stuck-at-0 behavior in headless browsers is an automation artifact, NOT a user bug, and is orthogonal to D-04 (per CONTEXT.md live-audit note).
- **Hand-rolling per-mode `dark:` color variants** — that ad-hoc `dark:bg-emerald-900/30` pattern is exactly what the `status-*` utilities (color-mix, mode-aware) replace. Use the utility.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Status badge colors with dark-mode variants | `bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400` (current `lease-status-badge.tsx`) | `@utility status-active` / `status-pending` / `status-inactive` from `globals.css` | The utilities derive contrast via `color-mix(... var(--color-success) ...)` for BOTH modes — guaranteed contrast, single source, no per-mode hand-roll (D-05) |
| "Maintenance open" red text | `text-red-600 dark:text-red-500` (in `portfolio-columns.tsx`, `portfolio-grid.tsx`) | `text-[var(--color-destructive)]` (token; light+dark in globals.css) | Raw red-600 has no guaranteed dark contrast and evades the drift guard (POLISH-04) |
| "Days remaining / expiring" amber text | `text-amber-600`, `text-amber-700 dark:text-amber-400` (in `expiring-leases-widget.tsx`) | `text-[var(--color-warning)]` token | Same — UI-SPEC §6 maps "expiring/caution" → `--color-warning` |
| Trend up/down color | `text-green-600 dark:text-green-400` / `text-red-600 dark:text-red-400` (in `stat.tsx` `StatTrend`) | `text-[var(--color-success)]` / `text-[var(--color-destructive)]` (UI-SPEC §3.3 mandates this) | Shared primitive used by every KPI tile; raw palette = invisible-badge risk |
| Reduced-motion guard for a rAF loop | A CSS `@media (prefers-reduced-motion)` rule on the ticker | `useReducedMotion()` read in JS, skip the rAF (D-04) | CSS cannot stop a JS `requestAnimationFrame` chain |
| Automated a11y scan | Hand-written DOM assertions for contrast/labels | `@axe-core/playwright` `AxeBuilder` | axe encodes ~90 WCAG rules; hand-rolling is incomplete and unmaintainable (D-02) |
| Skip-to-content link | A new dashboard skip link | The existing root `<a href="#main-content">` + `<main id="main-content">` in `app-shell.tsx` | Already wired; a second link is a regression (the duplicate was intentionally removed — see app-shell.tsx:256-263 comment) |

**Key insight:** Every dark-mode bug in this subtree is a raw-Tailwind-palette class the `design-token-drift.test.ts` guard does NOT catch (it only scans hex/rgb/`bg-white`/inline-ms). The fix is always "swap the raw palette class for the matching `--color-*` token or `status-*` utility" — never a new component.

## Runtime State Inventory

Not a rename/refactor/migration phase. **None applicable** — this is a CSS-class + component-edit phase with no stored data, live-service config, OS-registered state, secrets, or build artifacts in play. (The one new package install is a build-time dev dependency, not runtime state.)

## Common Pitfalls

### Pitfall 1: Palette classes silently pass the drift guard
**What goes wrong:** A reviewer/agent assumes "drift test green = dark-mode clean." It is not. `design-token-drift.test.ts` scans ONLY hex / rgb / `bg-white` / inline-ms. `text-red-600`, `bg-emerald-100`, `text-amber-700`, `text-green-600` all pass it while being the exact white-on-white / invisible-badge risk POLISH-04 targets.
**Why it happens:** The guard's `DRIFT_PATTERNS` (verified) has no rule for Tailwind palette utilities.
**How to avoid:** Use the explicit landmine grep (below) as the POLISH-04 audit, not the drift test. The drift test stays green throughout (it's already green — zero `bg-white`).
**Warning signs:** A PR claims "POLISH-04 done, drift test passes" but the six palette landmines are still present.

**The exact POLISH-04 landmine set (verified 2026-06-01):**
```bash
grep -rnE "bg-white|text-(red|amber|emerald|green|blue|yellow|rose)-[0-9]|bg-(red|amber|emerald|green)-[0-9]|dark:(bg|text)-(emerald|amber|red|green)" \
  src/components/dashboard "src/app/(owner)/dashboard"
```
Returns (must be zero after POLISH-04):
| File:line | Current | Target token / utility |
|-----------|---------|------------------------|
| `lease-status-badge.tsx:14` | `bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400` (active) | `status-active` utility (D-05) |
| `lease-status-badge.tsx:16` | `bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400` (expiring) | `status-pending` utility (D-05) |
| `lease-status-badge.tsx:17` | `bg-muted text-muted-foreground` (vacant) | `status-inactive` utility (D-05) — already token-ish but unify |
| `portfolio-columns.tsx:24` | `text-red-600 dark:text-red-500` (MaintenanceCell) | `text-[var(--color-destructive)]` |
| `portfolio-grid.tsx:58` | `text-red-600 dark:text-red-500` (maintenance) | `text-[var(--color-destructive)]` |
| `expiring-leases-widget.tsx:85,105` | `text-amber-600` (Clock icon) | `text-[var(--color-warning)]` |
| `expiring-leases-widget.tsx:151` | `text-amber-700 dark:text-amber-400` (days badge) | `text-[var(--color-warning)]` |

Plus the **shared primitive** (in scope via D-03 because it renders on the dashboard, but app-wide blast radius):
| `stat.tsx:108-109` (`StatTrend`) | `text-green-600 dark:text-green-400` / `text-red-600 dark:text-red-400` | `text-[var(--color-success)]` / `text-[var(--color-destructive)]` (UI-SPEC §3.3) — **planner decision:** fix the primitive (cleanest, UI-SPEC-mandated, but touches every StatTrend consumer app-wide) vs. override at the dashboard call site. Recommend fixing the primitive since UI-SPEC §3.3 explicitly mandates token usage there. `statIndicatorVariants` (stat.tsx:48-55) also carries `bg-green-500/10 text-green-600` etc. for the `success`/`info`/`warning` color variants — audit whether the dashboard uses `StatIndicator` color variants (KPI tiles use `StatTrend`, not `StatIndicator` colors, so this may be out of dashboard blast radius — verify consumers). |

### Pitfall 2: NumberTicker change breaks 16 app-wide consumers
**What goes wrong:** Editing the shared `NumberTicker` primitive (D-04) silently regresses financials/analytics/tenants/reports/etc.
**Why it happens:** `NumberTicker` is consumed in **16 files** (verified grep): `financials-summary-stats`, `financial-overview-stats`, `performance-stat-cards`, `analytics-stat-cards`, `stats-showcase`, `balance-sheet`, `income-statement-summary-stats`, `cash-flow`, `tenant-stats`, `kpi-helpers`, `kpi-bento-row`, `maintenance-view.client`, `profile-card`, `overview-stats-grid`, `reports-stats-row` (+ the test).
**How to avoid:** Make the guard **additive** — the new behavior only triggers under `prefers-reduced-motion: reduce`; default (motion-on) path is byte-for-byte unchanged. Run the FULL existing `number-ticker.test.tsx` suite (5 tests using fake timers + IntersectionObserver mock) — it must stay green — then ADD a reduced-motion test.
**Warning signs:** Any of the existing 5 NumberTicker tests fail; KPI numbers stop animating for motion-on users.

### Pitfall 3: 375px hydration flash (table → grid)
**What goes wrong:** `useMediaQuery` returns `false` during SSR (verified: `getMatch()` returns false when `window` undefined), so `forceGridMobile` is initially false → the **table** renders on first client paint at 375px, then the effect fires and snaps to **grid**.
**Why it happens:** SSR-safe media hooks can't know the viewport on the server.
**How to avoid:** This does NOT cause horizontal scroll (the virtualized table lives in `overflow-auto max-h-[calc(100vh-420px)]`, so even a transient table render scrolls internally, not the page). POLISH-06's criterion is *page-level* zero-scroll, which holds. Do NOT over-engineer a suppressHydration fix unless the E2E `scrollWidth` probe actually fails. Note the flash as cosmetic-only.
**Warning signs:** E2E `document.documentElement.scrollWidth > viewport + 1` at 375px (then it's a real overflow, not just the flash).

### Pitfall 4: BlurFade hides content under reduced-motion + not-yet-intersected
**What goes wrong:** `BlurFade` (verified) computes `stateClasses = shouldReduceMotion ? (shouldAnimate ? "opacity-100" : "opacity-0") : ...` and sets `aria-hidden={!shouldAnimate}`. If reduced-motion is on AND the IntersectionObserver hasn't fired (`isVisible` false, `inView` false), content is `opacity-0` + `aria-hidden`.
**Why it happens:** The reduced-motion branch still gates on intersection.
**How to avoid:** In practice on the dashboard, KPI BlurFades use `inView` defaults and `kpi-bento-row.tsx` already **bypasses BlurFade entirely under reduced motion** (renders raw `<KpiTile>` when `reducedMotion`). So the dashboard is safe. The DataTable's `<BlurFade delay={0.4} inView>` wrapper (portfolio-data-table.tsx:103) does NOT have that bypass — verify under reduced-motion the table still appears (it should, because `inView` becomes true on intersection and `shouldAnimate` flips to true → `opacity-100`). Add this to the manual reduced-motion sweep.
**Warning signs:** With reduced-motion on, the portfolio table or any BlurFade-wrapped region renders blank/invisible.

### Pitfall 5: axe test lands in a CI-skipped project
**What goes wrong:** The dashboard requires auth (`storageState`). The only project wired with owner auth is `owner` (depends on `setup-owner`). But CI's push/PR E2E invocation runs `--project=smoke --project=public` only (verified ci-cd.yml:162) — neither has auth, neither runs `tests/owner/**`.
**Why it happens:** The `owner` project is gated separately; the default CI E2E line doesn't include it.
**How to avoid:** Planner decides: (a) place the axe test in `tests/owner/` (runs under `owner` project, authed) AND add `--project=owner` to the CI E2E command, OR (b) confirm the `rls-security` / owner gate already runs it. The test itself is trivial; the **CI wiring is the real task**. Do NOT assume "added a test file = it runs in CI."
**Warning signs:** The axe test passes locally (`bunx playwright test --project=owner`) but never executes in the PR check.

## Code Examples

### POLISH-04 / D-05: lease-status-badge → status-* utilities
```tsx
// Source: globals.css @utility status-active/-pending/-inactive (verified 661-687)
const CHIP: Record<LeaseStatus, string> = {
  active: "status-active",      // success token, light+dark via color-mix
  expiring: "status-pending",   // warning token
  vacant: "status-inactive",    // muted-foreground token
};
// The status-* utilities set color + background-color + border-color, so the
// badge wrapper can drop the per-mode dark: variants entirely.
```

### POLISH-08 / D-04: NumberTicker reduced-motion unit test (jsdom matchMedia mock)
```tsx
// Source: pattern from src/components/ui/__tests__/number-ticker.test.tsx + use-reduced-motion.ts
// matchMedia is NOT in jsdom by default — mock it to report reduced-motion.
beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("prefers-reduced-motion"),  // true → reduced
    media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), onchange: null, dispatchEvent: vi.fn(),
  }));
});
it("snaps to final value immediately under prefers-reduced-motion (D-04)", () => {
  render(<NumberTicker value={42} duration={2000} />);
  // No timer advance: the value is final on first render, no rAF.
  expect(screen.getByText("42")).toBeInTheDocument();
});
```
> Note: the existing suite uses `vi.useFakeTimers()` in `beforeEach`. Keep the motion-ON tests under fake timers; the reduced-motion test needs no timer advance. Ensure `matchMedia` stub doesn't leak between tests (restore in `afterEach`).

### D-02: dashboard axe E2E (owner project, storageState auth)
```ts
// Source: @axe-core/playwright README (dequelabs/axe-core-npm) + existing owner-dashboard.e2e.spec.ts auth pattern
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ROUTES } from "../constants/routes";

test.describe("Dashboard accessibility (axe-core)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.OWNER_DASHBOARD);          // authed via storageState (owner project)
    await page.evaluate(() => localStorage.setItem("owner-tour-completed", "true"));
    await page.reload();
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
  });

  test("has zero serious/critical WCAG 2.1 AA violations", async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);   // tighten/loosen tags per first run
  });
});
```
> First run may surface pre-existing violations from app-shell chrome (out of D-03 scope). Planner should scope with `.include("[data-testid='dashboard-stats']")` or filter by impact (`serious`/`critical`) if root-layout violations are out of phase. D-03 says sweep the whole `/dashboard` subtree including chrome, so prefer full-page + fix what's found over narrow scoping.

### POLISH-06: 375px zero-scroll probe (pattern already in repo)
```ts
// Source: tests/e2e/tests/public/mobile-nav-375px.spec.ts (existing pattern)
test.use({ viewport: { width: 375, height: 667 } });
const overflow = await page.evaluate(() => ({
  bodyScrollWidth: document.body.scrollWidth,
  htmlScrollWidth: document.documentElement.scrollWidth,
  viewport: window.innerWidth,
}));
expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(overflow.viewport + 1);
expect(overflow.htmlScrollWidth).toBeLessThanOrEqual(overflow.viewport + 1);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Route-scoped `loading.tsx` per page | For a **client-fetched** route, branch render owns skeleton↔empty; one inherited `(owner)/loading.tsx` covers navigation | This codebase's architecture | POLISH-07 needs NO new `dashboard/loading.tsx`; the "streaming case" is already served by `(owner)/loading.tsx` |
| CDN-injected axe (`addScriptTag`) | `@axe-core/playwright` bundled engine | CSP enforcement on prod | D-02: CDN axe is CSP-blocked; bundled package is the only viable path |
| Per-component `dark:` palette variants | `color-mix`-based `@utility status-*` + `--color-*` tokens | TailwindCSS 4 `@utility` + globals.css token system | D-05 / POLISH-04: one utility replaces 4 hand-rolled per-mode classes |
| CSS-only reduced-motion | CSS guard (globals.css:1151) for CSS animations + JS `useReducedMotion()` for rAF/Recharts | UI-SPEC §5.1 | D-04: the CSS guard cannot stop `NumberTicker`'s rAF — JS guard required |

**Deprecated/outdated:**
- The existing `owner-dashboard.e2e.spec.ts` asserts stale labels ("Rent Collection", "Quick Create", "Inbox", "recent activity") that don't match the current v2.0 dashboard (KPI bento + charts + DataTable). That test's correctness is **Phase 7 (POLISH-09)**, NOT Phase 6 — do not "fix" it here beyond what the axe test needs.
- `tests/e2e/package.json` references `tests/accessibility.spec.ts` in a script (`test:accessibility`) — that file **does not exist** (verified). The new axe test is a fresh file under `tests/owner/`, unrelated to that dangling script.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@axe-core/playwright` must be added to **root** `package.json` (not just `tests/e2e/`) for `bunx playwright test` from root to resolve the import | Standard Stack / Environment | If tests/e2e were independently installed in CI, the root add is redundant — but verified: tests/e2e has no node_modules/lockfile and CI runs from root, so the root add is required. Low risk. |
| A2 | The dashboard is NOT involved in RSC Suspense streaming (page is `"use client"`; the page-level `<Suspense>` wraps a client component that resolves synchronously after hydration) | State of the Art / POLISH-07 | If a future change makes a child RSC-stream, a route `loading.tsx` would matter. Today it does not. Confirmed by reading page.tsx. Low risk. |
| A3 | Fixing `StatTrend` raw colors in the shared `stat.tsx` primitive is the right call (vs. dashboard-only override) because UI-SPEC §3.3 mandates token usage there | Pitfall 1 | If app-wide StatTrend consumers depend on the green/red look, the primitive change is visible elsewhere. But UI-SPEC mandates tokens and the token colors are visually equivalent. Planner should confirm the blast radius is acceptable (it's a color-equivalent swap). Medium — flag for planner. |
| A4 | The 375px table→grid hydration flash does not cause page-level horizontal scroll (table is in `overflow-auto`) | Pitfall 3 | If the table's internal overflow leaks at 375px, POLISH-06 fails. Mitigated by the E2E `scrollWidth` probe catching it. Low risk. |
| A5 | The new axe test belongs in the `owner` Playwright project and CI must add `--project=owner` (or equivalent) to actually run it | Pitfall 5 | If CI already runs owner E2E via another path, the CI edit is unnecessary. Verified ci-cd.yml runs only smoke+public on push/PR. Medium — flag for planner to wire CI. |

## Open Questions (RESOLVED)

1. **Should `StatTrend` (shared `stat.tsx`) be migrated, or only the dashboard call sites?**
   - What we know: `StatTrend` uses `text-green-600`/`text-red-600` raw palette (stat.tsx:108-109); UI-SPEC §3.3 mandates `--color-success`/`--color-destructive`; it's used by every KPI tile (in D-03 scope) AND ~15 other app surfaces.
   - What's unclear: whether the perfect-PR reviewer will accept an app-wide primitive change inside a dashboard-scoped phase.
   - Recommendation: Fix the primitive (UI-SPEC-mandated, color-equivalent), but call it out explicitly in the PR description as a shared-primitive change with a grep of all consumers (mirrors the D-04 NumberTicker blast-radius discipline). If the reviewer objects, fall back to a dashboard-level `className` override on the KPI `StatTrend`.
   - RESOLVED: fix the shared primitive. UI-SPEC §3.3 mandates StatTrend use `--color-success`/`--color-destructive`/`--color-muted-foreground`; the change is additive (color-equivalent token swap); grep + list all consumers in the SUMMARY for the perfect-PR blast-radius record. (Plan 06-02 Task 2.)

2. **axe scope: full page (incl. app-shell chrome) or `[data-testid='dashboard-stats']` subtree?**
   - What we know: D-03 says sweep the whole `/dashboard` subtree including header/app-shell chrome reachable from the route. axe full-page will also flag root-layout/app-shell issues.
   - What's unclear: whether app-shell chrome violations (e.g., header) are in Phase-6 scope or pre-existing/Phase-7.
   - Recommendation: Run full-page first to see the actual violation set, then decide. Prefer fixing chrome violations found (D-03 includes chrome) over scoping them out. If a violation is clearly outside `/dashboard` (e.g., a global nav issue), document and defer to Phase 7.
   - RESOLVED: full-page first per D-03 (sweep the whole `/dashboard` subtree), then fix what is found. Every violation within the dashboard subtree (`src/components/dashboard/**` / `src/app/(owner)/dashboard/**`) is fixed inline; any `.exclude()` is bounded to an unrelated global-chrome violation in code NOT modified this phase (e.g. `src/components/layout/app-shell.tsx`) and is documented as a Phase-7 deferral. (Plan 06-04 Task 1.)

3. **`statIndicatorVariants` color variants (stat.tsx:46-55) — in dashboard blast radius?**
   - What we know: KPI tiles use `<StatTrend>` (which has its own raw colors, Q1) and `<StatLabel/StatValue/StatDescription>`, but it's unclear if any dashboard tile uses `<StatIndicator color="success">` which carries `bg-green-500/10 text-green-600`.
   - Recommendation: grep dashboard for `StatIndicator` / `color=` usage; if unused on the dashboard, the `statIndicatorVariants` raw colors are out of D-03 scope (they're an app-wide concern, not this phase). Verified: `kpi-bento-row.tsx` uses `StatTrend`, not `StatIndicator` color variants — likely out of scope, but confirm.
   - RESOLVED: yes if rendered in the dashboard subtree. Audit `statIndicatorVariants` (stat.tsx:46-55) and migrate any dashboard-rendered color variants to tokens consistently with the StatTrend swap (same file, same additive PR) so no raw palette class remains in stat.tsx; variants verified to be outside the dashboard render path stay a Phase-7 concern. (Plan 06-02 Task 2.)

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@axe-core/playwright` | D-02 axe E2E | ✗ (declared in tests/e2e/package.json but NOT installed; NOT in root) | target `^4.11.0` (latest 4.11.3) | none — must `bun add -D` at root |
| `axe-core` (engine) | transitive of above | ✗ | 4.11.4 | pulled in by the above |
| Playwright | E2E runner | ✓ (root `node_modules`) | 1.60.0 | — |
| `useReducedMotion()` hook | D-04 | ✓ | `src/hooks/use-reduced-motion.ts` | — |
| `status-*` utilities | D-05 / POLISH-04 | ✓ | `globals.css:661-687` | — |
| `<main id="main-content">` skip target | POLISH-05 | ✓ | `app-shell.tsx:294` + root skip link `layout.tsx:99` | — (already wired) |
| 375px scroll-probe pattern | POLISH-06 | ✓ | `tests/e2e/tests/public/mobile-nav-375px.spec.ts` | — |
| Vitest matchMedia mock pattern | D-04 test | ✓ (jsdom; mock per example) | Vitest 4 + jsdom | — |

**Missing dependencies with no fallback:**
- `@axe-core/playwright` + `axe-core` — must be installed at **root**. Without it the axe E2E import fails. This is the only blocking install. (CI `bunx playwright install --with-deps chromium` already provides the browser binary.)

**Missing dependencies with fallback:**
- None.

## Validation Architecture

> `.planning/config.json` was not present/readable in this environment; per the rule (absent ⇒ enabled), this section is included.

### Test Framework
| Property | Value |
|----------|-------|
| Unit framework | Vitest 4 + jsdom (80% coverage threshold via lefthook pre-commit) |
| E2E framework | Playwright 1.60.0 (`bunx playwright test --config tests/e2e/playwright.config.ts`) |
| Drift guard | `src/app/__tests__/design-token-drift.test.ts` (Vitest; scans hex/rgb/bg-white/inline-ms) |
| Quick unit run | `bun run test:unit -- --run src/components/ui/__tests__/number-ticker.test.tsx` |
| Full unit suite | `bun run test:unit` |
| E2E (owner) | `bunx playwright test --config tests/e2e/playwright.config.ts --project=owner` |
| Validate-all | `bun run validate:quick` (types + lint + unit) |

### Phase Requirements → Test Map
| Req | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|-------------|
| POLISH-04 | zero `bg-white` + zero raw palette in dashboard subtree | unit (drift) + grep | `bun run test:unit -- --run src/app/__tests__/design-token-drift.test.ts` + landmine grep | ✅ drift / ❌ Wave 0: landmine grep is manual (drift guard does NOT cover palette classes) |
| POLISH-04/D-05 | lease badge uses status-* utilities | unit (render) | extend `lease-status-badge` test if present, else manual | ❌ Wave 0 (verify a badge test exists) |
| POLISH-05 | focus rings + aria-labels + skip-to-content | E2E (axe) + manual | axe test asserts label/contrast rules | ❌ Wave 0: `dashboard-a11y.e2e.spec.ts` (NEW) |
| POLISH-06 | zero horizontal scroll @375px | E2E | `--project=owner` viewport 375 scrollWidth probe | ❌ Wave 0: add to the a11y spec or a `dashboard-375px` spec (pattern exists in public/) |
| POLISH-07 | skeleton never co-renders with empty | unit (branch) + code review | render `DashboardContent` in each state | ✅ already correct in page.tsx — add a regression test asserting only one renders |
| POLISH-08/D-04 | reduced-motion snaps NumberTicker to final | unit | `bun run test:unit -- --run src/components/ui/__tests__/number-ticker.test.tsx` | ✅ file exists / ❌ Wave 0: ADD reduced-motion branch test |

### Sampling Rate
- **Per task commit:** the touched file's unit test (e.g., `number-ticker.test.tsx`) + `design-token-drift.test.ts`.
- **Per wave merge:** `bun run validate:quick` (types + lint + unit).
- **Phase gate:** full unit suite green + `--project=owner` E2E (incl. new axe test) green before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `tests/e2e/tests/owner/dashboard-a11y.e2e.spec.ts` — NEW; axe assertion (POLISH-05) + optional 375px probe (POLISH-06).
- [ ] Root `package.json` — add `@axe-core/playwright` devDep (blocking for the axe test).
- [ ] CI wiring — add `--project=owner` (or confirm an existing gate runs owner E2E) so the axe test actually runs in CI (Pitfall 5).
- [ ] Reduced-motion branch test in `number-ticker.test.tsx` (matchMedia mock).
- [ ] Skeleton↔empty regression test for `DashboardContent` (assert exactly one of skeleton/empty/error/content renders per state) — optional but cheap; existing branch logic is already correct.
- [ ] Confirm a `lease-status-badge` render test exists (for the D-05 migration regression). If none: framework already present, just add the spec.

## Security Domain

> `security_enforcement` config not readable; included for completeness. This phase is CSS/markup/test-only — minimal security surface.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | E2E reuses existing `storageState` synthetic owner auth; no new auth code |
| V3 Session Management | no | — |
| V4 Access Control | no | No RLS/RPC changes; `/dashboard` already auth-walled by proxy |
| V5 Input Validation | no | No new user inputs (polish only) |
| V6 Cryptography | no | — |
| V14 Config | yes (minor) | The new `@axe-core/playwright` is a dev dependency only — never ships to client/runtime; CSP unaffected (axe runs in-page during E2E, not in prod). The whole reason D-02 chose the npm package over CDN axe is CSP compliance. |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Supply-chain (malicious dep) | Tampering | Single new dep is the official Deque package; pin `^4.11.0`; dev-only |
| CSP bypass via injected script | Tampering | Use bundled `@axe-core/playwright` (no `addScriptTag` from CDN) — already the locked choice |

## Sources

### Primary (HIGH confidence)
- Live file reads (2026-06-01, branch `gsd/post-749-cleanup-review`): `number-ticker.tsx`, `lease-status-badge.tsx`, `dashboard/page.tsx`, `dashboard.tsx`, `portfolio-data-table.tsx`, `portfolio-columns.tsx`, `portfolio-grid.tsx`, `portfolio-data-table-toolbar.tsx`, `portfolio-preset-menu.tsx`, `kpi-bento-row.tsx`, `expiring-leases-widget.tsx`, `revenue-area-chart.tsx`, `occupancy-donut-chart.tsx`, `blur-fade.tsx`, `stat.tsx`, `use-reduced-motion.ts`, `use-media-query.ts`, `data-table-column-header.tsx`, `data-table-view-options.tsx`, `data-table-pagination.tsx`, `app-shell.tsx`, `layout.tsx`, `globals.css`, `design-token-drift.test.ts`, `number-ticker.test.tsx`, `dashboard-loading-skeleton.tsx`, `dashboard-empty-state.tsx`, `(owner)/loading.tsx`, `owner-dashboard.e2e.spec.ts`, `mobile-nav-375px.spec.ts`, `playwright.config.ts`, `tests/e2e/package.json`, root `package.json`, `.github/workflows/ci-cd.yml`.
- `.planning/phases/06-polish-a11y/06-CONTEXT.md`, `.planning/phases/01-foundation-dedup/01-UI-SPEC.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `./CLAUDE.md`.
- `npm view @axe-core/playwright` (version 4.11.3, maintainer Deque Labs `labs@deque.com`), `npm view axe-core` (4.11.4).

### Secondary (MEDIUM confidence)
- `@axe-core/playwright` README / usage pattern (github.com/dequelabs/axe-core-npm) — `AxeBuilder({ page }).withTags([...]).analyze()` API. `[CITED]`

### Tertiary (LOW confidence)
- None — every actionable claim is grounded in a primary source read this session.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — single package, version + maintainer verified on registry; all other primitives read in-repo.
- Architecture: HIGH — full data/render path traced through actual files; skeleton↔empty + streaming claims verified by reading page.tsx + loading.tsx.
- Pitfalls: HIGH — every landmine is a literal grep hit with file:line; blast radius (NumberTicker 16 consumers, StatTrend shared) verified by grep.
- A11y wiring: HIGH — skip-link target confirmed present (`app-shell.tsx:294`); axe install gap + CI project gap confirmed by reading package.json + ci-cd.yml.

**Research date:** 2026-06-01
**Valid until:** ~2026-07-01 (stable; the only volatile external is the `@axe-core/playwright` patch version — re-`npm view` at execution time)

## RESEARCH COMPLETE
