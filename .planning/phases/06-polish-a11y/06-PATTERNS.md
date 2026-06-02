# Phase 6: Polish & A11y - Pattern Map

**Mapped:** 2026-06-01
**Files analyzed:** 11 (8 MODIFIED source/config, 1 MODIFIED test, 2 NEW)
**Analogs found:** 11 / 11

This phase is overwhelmingly MODIFICATIONS to already-shipped files plus 1 NEW E2E spec and 1 reduced-motion test addition. There are NO new components. Every dark-mode fix is a raw-palette-class → token/utility swap; the one new primitive behavior is the JS reduced-motion guard on `NumberTicker`. All line numbers below were re-verified against the live files on `gsd/post-749-cleanup-review` at 2026-06-01 (they match RESEARCH.md).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/ui/number-ticker.tsx` (MOD) | shared UI primitive | transform (rAF tween) | `KpiNumberTicker` in `kpi-bento-row.tsx` (proven reduced-motion guard) | exact (same guard, applied internally) |
| `src/components/dashboard/components/lease-status-badge.tsx` (MOD) | dashboard component | transform (status→class map) | `@utility status-active/-pending/-inactive` in `globals.css` | exact (canonical migration target) |
| `src/components/ui/stat.tsx` (MOD) | shared UI primitive | transform (trend→class) | `globals.css` `--color-success`/`--color-destructive` tokens | exact (token swap, color-equivalent) |
| `src/components/dashboard/components/portfolio-columns.tsx` (MOD) | dashboard component | transform (cell render) | `lease-status-badge.tsx` token usage / `--color-destructive` token | exact (palette→token swap) |
| `src/components/dashboard/components/portfolio-grid.tsx` (MOD) | dashboard component | transform (card render) | same destructive-token swap as columns | exact (palette→token swap) |
| `src/components/dashboard/expiring-leases-widget.tsx` (MOD) | dashboard component | request-response (own TanStack Query) | `--color-warning` token (UI-SPEC §6) | exact (palette→token swap) |
| `src/components/ui/__tests__/number-ticker.test.tsx` (MOD) | test (unit) | — | existing 6-test suite in same file + `matchMedia` stub pattern | exact (extend in place) |
| `tests/e2e/tests/owner/dashboard-a11y.e2e.spec.ts` (NEW) | test (E2E) | — | `tests/e2e/tests/owner/owner-dashboard.e2e.spec.ts` (storageState auth + `owner` project) | exact (same project + beforeEach) |
| `package.json` (MOD) | config | — | existing root `devDependencies` block | role-match (add one devDep) |
| `.github/workflows/ci-cd.yml` (MOD) | config | — | existing `bunx playwright test --project=smoke --project=public` line (162) | role-match (add `--project=owner`) |
| `tests/e2e/tests/owner/dashboard-a11y.e2e.spec.ts` (375px probe, may co-locate) | test (E2E) | — | `tests/e2e/tests/public/mobile-nav-375px.spec.ts` `scrollWidth` probe | exact (copy probe) |

> NOTE: `portfolio-data-table.tsx` is the D-01 LOCK point, not an edit point — see Shared Patterns. `kpi-bento-row.tsx`, both charts, and `dashboard/page.tsx` are VERIFY-ONLY (already guarded/correct) — see No Analog Found / verify notes.

## Pattern Assignments

### `src/components/ui/number-ticker.tsx` (shared UI primitive, transform) — D-04 / POLISH-08

**Analog:** `src/components/dashboard/components/kpi-bento-row.tsx` `KpiNumberTicker` (lines 51-81) — the proven reduced-motion guard; `src/hooks/use-reduced-motion.ts` — the hook to import.

**Current state to change** (`number-ticker.tsx`):
- Imports (lines 3-11): `useEffect`/`useRef`/`useState` + `useIntersectionObserver` + `cn`. NO `useReducedMotion` import yet — ADD `import { useReducedMotion } from "#hooks/use-reduced-motion";`.
- The rAF `useEffect` (lines 46-87) is the ENTIRE animation. Current dep array: `[hasIntersected, from, to, delay, duration]`. It gates only on `if (!hasIntersected) return;` (line 47) — there is NO reduced-motion short-circuit.
- `to` is computed at line 44 (`direction === "down" ? startValue : value`). `displayValue` state at line 33.

**Required edit (additive — motion-ON path byte-for-byte unchanged):** read `const reducedMotion = useReducedMotion();` near line 33, then prepend the short-circuit at the top of the effect and add `reducedMotion` to the dep array:
```tsx
// inside the existing useEffect, BEFORE the `if (!hasIntersected) return;`:
if (reducedMotion) {
  setDisplayValue(to);   // snap to final, no rAF
  return;
}
// ...existing rAF body unchanged...
}, [reducedMotion, hasIntersected, from, to, delay, duration]);
```

**Guard pattern to mirror** (`kpi-bento-row.tsx:63-73`):
```tsx
const reducedMotion = useReducedMotion();
if (reducedMotion) {
  return (
    <span className="inline-block tabular-nums tracking-wider">
      {Intl.NumberFormat("en-US", { ... }).format(value)}
    </span>
  );
}
```
> Apply the SAME `useReducedMotion()` read, but inside the effect (snap `displayValue` to `to`), not as an early return — `NumberTicker` must still render its `<span ref={ref}>` (lines 89-100) so the IntersectionObserver ref stays attached. After this lands, `KpiNumberTicker` becomes redundant defense-in-depth; do NOT remove it in a way that loses a guard (CONTEXT D-04).

**Blast radius (Pitfall 2):** 16 app-wide consumers. Grep before/after:
```bash
grep -rln "NumberTicker" src --include="*.tsx" --include="*.ts"
```

---

### `src/components/ui/__tests__/number-ticker.test.tsx` (test, unit) — D-04 / POLISH-08

**Analog:** the existing suite IN THIS FILE (6 tests, NOT 5 — RESEARCH said 5). Uses `vi.useFakeTimers()` in `beforeEach` (line 19), `vi.useRealTimers()` in `afterEach` (line 22), `render` from `#test/utils/test-render` (line 14). The IntersectionObserver fires synchronously on `observe()` (jsdom mock from `unit-setup.ts`, line 5-7 comment), and tests advance fake timers via `await vi.advanceTimersByTimeAsync(...)`.

**Current pattern to mirror for the motion-ON tests** (lines 26-35):
```tsx
it("animates to the target value after duration elapses (CRIT-02 regression)", async () => {
  render(<NumberTicker value={5} duration={2000} />);
  await vi.advanceTimersByTimeAsync(2100);
  expect(screen.getByText("5")).toBeInTheDocument();
});
```

**Required addition — reduced-motion branch** (no timer advance needed; `matchMedia` is NOT in jsdom by default, stub it to report reduced):
```tsx
// add a nested describe or standalone it; stub matchMedia → reduced, restore after
it("snaps to final value immediately under prefers-reduced-motion (D-04)", () => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
    media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
  render(<NumberTicker value={42} duration={2000} />);
  expect(screen.getByText("42")).toBeInTheDocument();
  vi.unstubAllGlobals();   // do NOT leak into the fake-timer motion-ON tests
});
```
> `use-reduced-motion.ts` reads `window.matchMedia("(prefers-reduced-motion: reduce)")` inside `useEffect` and seeds `false` first, so the stub must be in place BEFORE render and the snap will apply after the effect commits (React test render flushes effects). Keep the existing 6 tests unchanged — they must stay green (Pitfall 2). Ensure the `matchMedia` stub does not leak (`afterEach`/`vi.unstubAllGlobals`).

---

### `src/components/dashboard/components/lease-status-badge.tsx` (dashboard component, transform) — D-05 / POLISH-04

**Analog:** `@utility status-active/-pending/-inactive` in `src/app/globals.css` (lines 661-687).

**Current state to change** (`lease-status-badge.tsx:12-18`) — the `CHIP` record, ad-hoc per-mode hand-roll:
```tsx
const CHIP: Record<LeaseStatus, string> = {
  active:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  expiring:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  vacant: "bg-muted text-muted-foreground",
};
```
The wrapper (lines 25-35) applies `cn("inline-flex items-center rounded px-2 py-0.5 font-medium text-xs", CHIP[status])`.

**Migration target** — the canonical utilities (each sets `color` + `background-color` + `border-color` via `color-mix`, light+dark correct):
```css
/* globals.css:661-677 */
@utility status-active   { color: var(--color-success); background-color: color-mix(...); border-color: ...; }
@utility status-pending  { color: var(--color-warning); ... }
@utility status-inactive { color: var(--color-muted-foreground); background-color: var(--color-muted); border-color: var(--color-border); }
```

**Required edit** (D-05 mapping: active→success, expiring→warning, vacant→muted):
```tsx
const CHIP: Record<LeaseStatus, string> = {
  active: "status-active",
  expiring: "status-pending",
  vacant: "status-inactive",
};
```
> The `status-*` utilities own color/background/border, so DROP every `dark:` variant. `LeaseStatusBadge` is rendered by BOTH `portfolio-columns.tsx` and `portfolio-grid.tsx`, so one change covers table + grid (CONTEXT integration point). No standalone badge test exists; the D-05 regression is covered by `portfolio-columns.test.tsx` (renders columns through a real table) — verify it stays green, optionally add a direct badge render test (analog: `__tests__/portfolio-columns.test.tsx` `makeRow` + `render`/`screen` setup, lines 25-40).

---

### `src/components/ui/stat.tsx` (shared UI primitive, transform) — POLISH-04 (StatTrend)

**Analog:** `--color-success`/`--color-destructive` tokens (UI-SPEC §3.3 mandate).

**Current state to change** (`stat.tsx:108-110`, inside `StatTrend`'s `cn` object):
```tsx
{
  "text-green-600 dark:text-green-400": trend === "up",
  "text-red-600 dark:text-red-400": trend === "down",
  "text-muted-foreground": trend === "neutral" || !trend,
}
```

**Required edit** (color-equivalent token swap):
```tsx
{
  "text-[var(--color-success)]": trend === "up",
  "text-[var(--color-destructive)]": trend === "down",
  "text-muted-foreground": trend === "neutral" || !trend,
}
```
> **App-wide blast radius (Open Question 1 / Pitfall 1):** `StatTrend` is the shared KPI-trend primitive used by every KPI tile AND ~15 other surfaces. UI-SPEC §3.3 mandates tokens here, so fix the primitive (recommended), and call it out in the PR description with a consumer grep (mirror the NumberTicker discipline). Fallback if a reviewer objects: dashboard-level `className` override at the KPI `StatTrend` call site.
> **Out of scope — DO NOT touch:** `statIndicatorVariants` (stat.tsx:45-56) carries `bg-green-500/10 text-green-600`, `text-blue-600`, `text-orange-600` for the `success`/`info`/`warning` color variants. Verified the dashboard KPI tiles use `<StatTrend>`, NOT `<StatIndicator color=...>` — so these palette classes are an app-wide concern outside D-03's dashboard blast radius (Open Question 3). Leave them for Phase 7.

---

### `src/components/dashboard/components/portfolio-columns.tsx` (dashboard component, transform) — POLISH-04

**Analog:** `--color-destructive` token (same swap pattern as `stat.tsx`).

**Current state to change** (`portfolio-columns.tsx:24`, inside `MaintenanceCell`):
```tsx
<span className="text-sm font-medium tabular-nums text-red-600 dark:text-red-500">
```

**Required edit:** replace `text-red-600 dark:text-red-500` → `text-[var(--color-destructive)]`.
> Keep the `aria-label="No open requests"` (line 31) and `aria-label={`Edit ${row.original.property}`}` (line 198) — those satisfy POLISH-05 icon-button labeling and are correct. No other palette classes here.

---

### `src/components/dashboard/components/portfolio-grid.tsx` (dashboard component, transform) — POLISH-04

**Analog:** same `--color-destructive` swap as columns.

**Current state to change** (`portfolio-grid.tsx:58`, maintenance count conditional):
```tsx
? "text-red-600 dark:text-red-500"
```

**Required edit:** replace `text-red-600 dark:text-red-500` → `text-[var(--color-destructive)]`.
> `aria-label="No tenants"` (line 45) and `aria-label="No open requests"` (line 66) are correct — leave them.

---

### `src/components/dashboard/expiring-leases-widget.tsx` (dashboard component, request-response) — POLISH-04

**Analog:** `--color-warning` token (UI-SPEC §6: expiring/caution → warning).

**Current state to change** (3 sites):
- Line 85: `<Clock className="size-4 text-amber-600" aria-hidden="true" />`
- Line 105: `<Clock className="size-4 text-amber-600" aria-hidden="true" />`
- Line 151: `className={\`text-xs font-semibold ${urgent ? "text-destructive" : "text-amber-700 dark:text-amber-400"}\`}`

**Required edit:** `text-amber-600` → `text-[var(--color-warning)]` (lines 85, 105); `text-amber-700 dark:text-amber-400` → `text-[var(--color-warning)]` (line 151, keep the `urgent ? "text-destructive" : ...` branch — `text-destructive` is already token-correct).

---

### `package.json` (config) — D-02 install

**Analog:** existing root `devDependencies` block.

**Current state:** `@axe-core/playwright` is NOT in root `package.json` (verified — grep returns nothing). It IS declared in `tests/e2e/package.json`, but that package has no `node_modules`/lockfile and CI runs `bunx playwright test` from the REPO ROOT, resolving from root `node_modules`.

**Required edit:**
```bash
bun add -D @axe-core/playwright   # target ^4.11.0 (latest 4.11.3); pulls axe-core 4.11.4
```
> Official Deque package (`labs@deque.com`). Dev-only — never ships to client/runtime, CSP unaffected. CITED in D-02. The slopcheck tool was unavailable in research; the planner should add a `checkpoint:human-verify` before `bun add`, but risk is minimal (this is the exact package named in the locked decision).

---

### `.github/workflows/ci-cd.yml` (config) — D-02 CI wiring (Pitfall 5)

**Analog:** the existing E2E run line.

**Current state to change** (`ci-cd.yml:162`):
```yaml
run: bunx playwright test --config tests/e2e/playwright.config.ts --project=smoke --project=public
```
The new axe test lands in `tests/owner/` → runs under the `owner` project (which depends on `setup-owner` for storageState auth). The current PR/push line runs ONLY `smoke` + `public` — neither has auth, neither matches `**/owner/**`. **So a passing local `--project=owner` run does NOT mean it runs in CI.**

**Required edit:** add `--project=owner` (and its `setup-owner` dependency resolves automatically) OR confirm an existing gate runs owner E2E. The test file is trivial; THIS CI wiring is the real task.
> Verify the `owner` project's webserver/storageState auth holds in CI (the config builds a production `next build` + synthetic owner auth via `auth-api.setup.ts`). Flag for planner per Assumption A5.

---

### `tests/e2e/tests/owner/dashboard-a11y.e2e.spec.ts` (NEW — test, E2E) — D-02 axe + POLISH-06 375px

**Analog (auth + project):** `tests/e2e/tests/owner/owner-dashboard.e2e.spec.ts` (storageState auth via `owner` project) — its `beforeEach` is the exact pattern to mirror.

**Auth/setup pattern to copy** (`owner-dashboard.e2e.spec.ts:1-3, 40-52`):
```ts
import { expect, test } from "@playwright/test";
import { ROUTES } from "../constants/routes";   // ROUTES.OWNER_DASHBOARD = "/dashboard" (routes.ts:14)

test.describe("Dashboard accessibility (axe-core)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.OWNER_DASHBOARD);                 // authed via storageState (owner project)
    await page.evaluate(() => localStorage.setItem("owner-tour-completed", "true"));
    await page.reload();
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
  });
});
```

**`owner` project config** (`playwright.config.ts:139-147`) — the project that runs `**/owner/**/*.spec.ts` with `storageState: OWNER_AUTH_FILE` (`playwright/.auth/owner.json`) and `dependencies: ["setup-owner"]`. The new file matches `**/owner/**` and `**/*.e2e.spec.ts` (testMatch line 44), so it is auto-collected by the `owner` project. NOTE: `bypassCSP: true` is set globally (line 99) — and `@axe-core/playwright` bundles the engine anyway, so no CSP/CDN issue (this is exactly why D-02 chose the npm package).

**axe assertion to add** (`@axe-core/playwright` README pattern):
```ts
import AxeBuilder from "@axe-core/playwright";

test("has zero serious/critical WCAG 2.1 AA violations", async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);   // tighten/loosen per first run
});
```
> First run may surface pre-existing app-shell chrome violations. D-03 says sweep the whole `/dashboard` subtree incl. chrome, so prefer full-page + fix found over narrow `.include(...)` scoping. If a violation is clearly outside `/dashboard` (global nav), document + defer to Phase 7 (Open Question 2).

**375px zero-scroll probe (POLISH-06) — co-locate here or a sibling spec.** Analog: `tests/e2e/tests/public/mobile-nav-375px.spec.ts:1-35`:
```ts
test.use({ viewport: { width: 375, height: 667 } });
const overflow = await page.evaluate(() => ({
  bodyScrollWidth: document.body.scrollWidth,
  htmlScrollWidth: document.documentElement.scrollWidth,
  viewport: window.innerWidth,
}));
expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(overflow.viewport + 1);
expect(overflow.htmlScrollWidth).toBeLessThanOrEqual(overflow.viewport + 1);
```
> D-01's `FORCE_GRID_QUERY` already forces grid <1024px, so the page-level probe should pass with margin. The table's transient SSR→grid flash (Pitfall 3) does not leak because the virtualized table lives in `overflow-auto` — the probe asserts page-level scroll, which holds. Do NOT over-engineer a suppressHydration fix unless this probe actually fails.

---

## Shared Patterns

### Palette-class → token swap (the universal POLISH-04 fix)
**Source:** `src/app/globals.css` `--color-success` / `--color-warning` / `--color-destructive` tokens (light+dark redefined under `:where(.dark, .dark *)`) + the `@utility status-*` helpers (lines 661-687).
**Apply to:** `lease-status-badge.tsx`, `stat.tsx`, `portfolio-columns.tsx`, `portfolio-grid.tsx`, `expiring-leases-widget.tsx`.
**Mapping (UI-SPEC §3.3 / §6):**
| Raw palette | Token | Meaning |
|-------------|-------|---------|
| `text-green-600 dark:text-green-400` / `bg-emerald-100...` | `text-[var(--color-success)]` / `status-active` | success / active |
| `text-amber-*` / `bg-amber-100...` | `text-[var(--color-warning)]` / `status-pending` | warning / expiring |
| `text-red-600 dark:text-red-500` | `text-[var(--color-destructive)]` / `status-overdue` | destructive / maintenance |
| `bg-muted text-muted-foreground` | `status-inactive` | muted / vacant |
> **CRITICAL (Pitfall 1):** `design-token-drift.test.ts` scans ONLY hex/rgb/`bg-white`/inline-ms — it does NOT catch these palette classes. The drift test stays green throughout (dashboard already has zero `bg-white`). The audit is the explicit landmine grep, NOT the drift test:
> ```bash
> grep -rnE "bg-white|text-(red|amber|emerald|green|blue|yellow|rose)-[0-9]|bg-(red|amber|emerald|green)-[0-9]|dark:(bg|text)-(emerald|amber|red|green)" \
>   src/components/dashboard "src/app/(owner)/dashboard"
> ```
> Must return ZERO after POLISH-04.

### Reduced-motion JS guard for rAF/Recharts
**Source:** `src/hooks/use-reduced-motion.ts` (canonical `matchMedia('(prefers-reduced-motion: reduce)')` hook, SSR-safe — seeds `false`, subscribes in effect).
**Apply to:** `number-ticker.tsx` (D-04 — the only unguarded rAF primitive). VERIFY-ONLY for charts (`isAnimationActive={!reducedMotion}` already in both `revenue-area-chart.tsx` + `occupancy-donut-chart.tsx`) and `BlurFade` (`kpi-bento-row.tsx` bypasses it entirely under reduced motion).
> A CSS `@media (prefers-reduced-motion)` rule (globals.css:1151) zeroes CSS durations but CANNOT stop a JS `requestAnimationFrame` chain — the JS guard is mandatory for `NumberTicker`.

### D-01 LOCK point (do NOT edit)
**Source:** `src/components/dashboard/components/portfolio-data-table.tsx:40` — `const FORCE_GRID_QUERY = "(max-width: 1023px)";` (consumed line 92 via `useMediaQuery`).
**Constraint:** leave UNCHANGED. Table ≥1024px, grid <1024px. This already satisfies POLISH-06's 375px zero-scroll.

### Load-bearing patterns to PRESERVE (anti-patterns to avoid)
- **`"use no memo"`** directives on the entire DataTable cluster (PR #765) — defeat a React-Compiler reactivity bug. Do NOT strip during polish.
- **Sanctioned inline styles (Z-5 exceptions):** `GRID_CONTAINER_STYLE` (container-type) in `kpi-bento-row.tsx` + the react-virtual width/transform/grid-flex set in `portfolio-data-table.tsx`. Leave them.
- **Skip-to-content link:** existing root `<a href="#main-content">` (`layout.tsx:99`) + `<main id="main-content">` (`app-shell.tsx:294`). Already wired — a second link is a regression. POLISH-05 skip-link criterion is ALREADY satisfied.
- **NumberTicker IntersectionObserver gating** — the headless stuck-at-0 behavior is an automation artifact, NOT a user bug. Do NOT "fix" it; it's orthogonal to D-04.
- **NO `src/app/(owner)/dashboard/loading.tsx`** — the route is fully client-fetched (`"use client"` + TanStack Query, one `get_dashboard_data_v2`), the inherited `(owner)/loading.tsx` covers navigation. Adding a dashboard-scoped `loading.tsx` risks a double-skeleton.

## No Analog Found

These are VERIFY-ONLY (already correct — confirm, do not migrate) — no new pattern, listed so the planner does not over-engineer:

| File | Role | Reason it needs no new pattern |
|------|------|-------------------------------|
| `src/app/(owner)/dashboard/page.tsx` | page (client) | POLISH-07 branch render already correct: `isLoading → skeleton`, `error → block`, `isEmpty → empty`, else `<Dashboard/>` — exactly one. Optionally add a regression test asserting mutual exclusion. |
| `src/components/dashboard/components/revenue-area-chart.tsx` | dashboard component | `isAnimationActive={!reducedMotion}` already guarded (POLISH-08 ✓); empty branch renders plain `<div>` (no skeleton↔empty co-render). Verify only. |
| `src/components/dashboard/components/occupancy-donut-chart.tsx` | dashboard component | Same — already guarded + empty-branch correct. Verify only. |
| `src/components/dashboard/components/kpi-bento-row.tsx` | dashboard component | `KpiNumberTicker` + BlurFade bypass already guarded. After D-04 the wrapper is redundant defense-in-depth — keep or simplify WITHOUT losing the guard. The `!text-[var(--color-warning)]` down-trend override is unrelated — leave it. |
| `src/components/shell/app-shell.tsx` + Quick Actions in `dashboard.tsx` | chrome / component | Token-clean per RESEARCH; audit focus ring + icon-button `aria-label` + 375px during the manual sweep + the axe run. Edit only if axe/grep surfaces a real violation. |

## Metadata

**Analog search scope:** `src/components/ui/`, `src/components/dashboard/`, `src/hooks/`, `src/app/globals.css`, `tests/e2e/tests/owner/`, `tests/e2e/tests/public/`, `tests/e2e/playwright.config.ts`, root `package.json`, `.github/workflows/ci-cd.yml`.
**Files scanned (read or grepped):** number-ticker.tsx, lease-status-badge.tsx, use-reduced-motion.ts, kpi-bento-row.tsx, globals.css (status utilities), number-ticker.test.tsx, owner-dashboard.e2e.spec.ts, playwright.config.ts, routes.ts, stat.tsx, portfolio-columns.tsx, portfolio-grid.tsx, expiring-leases-widget.tsx, portfolio-data-table.tsx, mobile-nav-375px.spec.ts, portfolio-columns.test.tsx, package.json, ci-cd.yml.
**Pattern extraction date:** 2026-06-01
