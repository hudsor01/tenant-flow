---
phase: 05-dashboard-portfolio-datatable
plan: 03a
subsystem: ui
tags: [zustand, persist, localStorage, tanstack-table, presets, ssr]

# Dependency graph
requires:
  - phase: 05-01a
    provides: useClientDataTable controlled columnVisibility + flat nuqs filter mirror
  - phase: 05-02
    provides: PortfolioDataTable controlled shell (consumes columnVisibility prop)
provides:
  - "useDashboardPresetsStore — Zustand persist store: named full-snapshot presets (D-1) + live columnVisibility (D-3)"
  - "DashboardViewSnapshot + DashboardPreset exported shapes (Plan 05-03b snapshot contract)"
  - "DASHBOARD_PRESETS_STORAGE_KEY stable localStorage key"
affects: [05-03b]

# Tech tracking
tech-stack:
  added: []  # zustand/middleware persist already a dep; no new package
  patterns:
    - "Zustand persist middleware with createJSONStorage (first persist usage in src/stores)"
    - "SSR-safe storage adapter: typeof window guard + lazy per-call localStorage resolution"

key-files:
  created:
    - src/stores/dashboard-presets-store.ts
    - src/stores/__tests__/dashboard-presets-store.test.ts
  modified: []

key-decisions:
  - "Duplicate-name contract: OVERWRITE (latest wins) — savePreset replaces presets[name]"
  - "SSR-safety via guarded storage getter (typeof window === 'undefined' -> no-op read/write), NOT skipHydration"
  - "partialize persists only { presets, columnVisibility } — actions never serialized"
  - "Storage adapter re-resolves localStorage per call (not cached at createJSONStorage eval) so stubs/late globals are honored"

patterns-established:
  - "Pattern: dashboard-presets-store is URL-free — returns typed snapshots; caller (05-03b) owns nuqs + table wiring"

requirements-completed: [DT-05, DT-08]

# Metrics
duration: 3min
completed: 2026-05-31
---

# Phase 05 Plan 03a: Dashboard Presets Store Summary

**Zustand `persist` store that round-trips named full-view portfolio snapshots (filters + sort + columnVisibility + page) through localStorage and persists live column visibility in the same slice — the URL-free persistence engine Plan 05-03b wires to nuqs + the table.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-31T01:41:53Z
- **Completed:** 2026-05-31T01:45:27Z
- **Tasks:** 2 (TDD store author + unit test)
- **Files modified:** 2 (both created)

## Accomplishments

- `src/stores/dashboard-presets-store.ts` — `useDashboardPresetsStore` built with `create()(persist(...))` from `zustand/middleware`, under the stable key `tenantflow-dashboard-presets`.
- Exported the snapshot contract Plan 05-03b consumes (see below).
- `src/stores/__tests__/dashboard-presets-store.test.ts` — 6 tests, all passing.

## Exported shapes (Plan 05-03b contract)

```typescript
export interface DashboardViewSnapshot {
  filters: Record<string, string | string[]>; // flat nuqs filter keys (status[], property string)
  sort: SortingState;                          // [{ id, desc }]
  columnVisibility: VisibilityState;           // Record<string, boolean>
  page: number;
}
export interface DashboardPreset extends DashboardViewSnapshot { name: string; }

export const DASHBOARD_PRESETS_STORAGE_KEY = "tenantflow-dashboard-presets";
```

## Action signatures

```typescript
savePreset(name: string, snapshot: DashboardViewSnapshot): void   // overwrite (latest wins)
applyPreset(name: string): DashboardPreset | undefined            // pure read; never touches URL
deletePreset(name: string): void
listPresets(): DashboardPreset[]                                  // Object.values(presets)
setColumnVisibility(columnVisibility: VisibilityState): void      // live D-3 visibility
```

State: `{ presets: Record<string, DashboardPreset>, columnVisibility: VisibilityState }`.

## Decisions made

- **Duplicate-name contract: OVERWRITE (latest wins).** `savePreset("View", …)` twice keeps one entry with the newest snapshot. Pinned by the "saving with a duplicate name overwrites" test.
- **SSR-safety: guarded storage getter, not `skipHydration`.** `createJSONStorage` wraps a storage object whose `getItem`/`setItem`/`removeItem` each short-circuit to a no-op when `typeof window === "undefined"`, then resolve the bare `localStorage` global. This both prevents a server-render throw AND re-resolves the global per call (zustand caches `getStorage()` once at construction; a cached binding would otherwise ignore a late/stubbed global — which is exactly how the unit test installs its mock).
- **`partialize`** persists only `{ presets, columnVisibility }` so the action functions never serialize into the JSON slice.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SSR storage getter caching defeated the test mock + would have skipped persistence**
- **Found during:** Task 1/2 GREEN phase.
- **Issue:** `createJSONStorage(() => …localStorage)` evaluates the getter ONCE at module-eval and caches the result (zustand `middleware.mjs:281`). Because the store module is imported at the top of the test file — before `beforeEach` installs the `vi.stubGlobal("localStorage")` mock — the cached storage was the import-time global (undefined in this jsdom config), so every persist write threw `Cannot read properties of undefined (reading 'setItem')`.
- **Fix:** Returned a storage adapter object whose `getItem`/`setItem`/`removeItem` re-resolve `localStorage` lazily on each call behind a `typeof window` guard, instead of returning `localStorage` directly. This is also the correct production behavior (honors a `localStorage` that becomes available after first paint) and keeps the store genuinely SSR-safe.
- **Files modified:** src/stores/dashboard-presets-store.ts
- **Commit:** 735fb50e8

**2. [Rule 3 - Blocking] jsdom did not auto-provide `localStorage`**
- **Found during:** Task 2 RED→GREEN.
- **Issue:** The test environment's `localStorage` global is undefined (`--localstorage-file` not provided), so `resetStore` threw on `localStorage.removeItem`.
- **Fix:** Added a `vi.stubGlobal("localStorage", …)` mock in `beforeEach` (mirroring the existing `data-density.test.ts` pattern) + `vi.unstubAllGlobals()` in `afterEach`.
- **Files modified:** src/stores/__tests__/dashboard-presets-store.test.ts
- **Commit:** 735fb50e8

## Authentication Gates

None.

## Known Stubs

None — the store is fully wired and round-trips real state. No data sources are stubbed.

## Verification

- `bun run typecheck` — exits 0.
- `bun run lint` (biome) — clean (1228 files checked, 0 errors).
- `bun run test:unit -- src/stores/__tests__/dashboard-presets-store.test.ts` — 6/6 pass.
- `grep -Ec "persist\(|createJSONStorage"` → 3. `grep -c "tenantflow-dashboard-presets"` → 1. `grep -Ec "savePreset|applyPreset|deletePreset|setColumnVisibility"` → 8. No `any` / `as unknown as` in either file.
- Full lefthook pre-commit gate (gitleaks, lockfile-verify, lint, typecheck, unit-tests, commitlint) all green on the commit.

`git diff --stat`:
```
 src/stores/__tests__/dashboard-presets-store.test.ts | 150 +++++++++++++++
 src/stores/dashboard-presets-store.ts                | 114 ++++++++++++
 2 files changed, 264 insertions(+)
```

## Note for Plan 05-03b (snapshot collect + apply)

**Collect the current snapshot for `savePreset`** by reading the SAME nuqs keys `useClientDataTable` writes — do NOT invent a separate `search`/`q` key:

- `page` → `parseAsInteger`
- `sort` → `getSortingStateParser(columnIds)` (returns `SortingState`)
- `status` (faceted, array) → `parseAsArrayOf(parseAsString)` with `ARRAY_SEPARATOR`
- `property` (SEARCH key, W-3 — search filters the Property column's name||address filterFn) → `parseAsString`

Build `filters` as a flat `Record<string, string | string[]>`, e.g. `{ status: selectedStatuses, property: searchText }`. Pull `columnVisibility` from the presets store (`useDashboardPresetsStore().columnVisibility`), not from the URL.

**Apply `applyPreset(name)`'s returned snapshot:**
- `snapshot.filters.status` / `snapshot.filters.property` → set the `status` + `property` nuqs params.
- `snapshot.sort` → set the `sort` nuqs param (same `getSortingStateParser`).
- `snapshot.page` → set the `page` nuqs param.
- `snapshot.columnVisibility` → `setColumnVisibility(snapshot.columnVisibility)` (D-1 full restore); this is the same controlled `columnVisibility` value passed into `<PortfolioDataTable columnVisibility={…} />` (B-2 forwarding).

The store NEVER touches the URL — 05-03b owns the nuqs read/write on both the collect and apply paths. The URL is the source of truth for filter/sort/page (resolves the nuqs↔Zustand ordering risk); column visibility lives only in this persist store.

## Self-Check: PASSED

- FOUND: src/stores/dashboard-presets-store.ts
- FOUND: src/stores/__tests__/dashboard-presets-store.test.ts
- FOUND: commit 735fb50e8
