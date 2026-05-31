---
phase: "05"
plan: 03a
type: execute
wave: 3
depends_on: ["05-01a", "05-02"]
files_modified:
  - src/stores/dashboard-presets-store.ts
  - src/stores/__tests__/dashboard-presets-store.test.ts
autonomous: true
requirements: [DT-05, DT-08]

must_haves:
  truths:
    - "dashboard-presets-store.ts is a Zustand store wrapped in the persist middleware (createJSONStorage(localStorage)) under a stable key (e.g. tenantflow-dashboard-presets)"
    - "a preset is a FULL view snapshot: { name, filters, sort, columnVisibility, page } (D-1) — applying a preset restores all four"
    - "the store ALSO holds the live columnVisibility (D-3) so column-visibility persists across sessions in the same persist slice as presets"
    - "actions: savePreset(name, snapshot), applyPreset(name) -> snapshot, deletePreset(name), setColumnVisibility(v); presets are keyed by unique name (save with an existing name overwrites or is rejected — pick + test one)"
    - "the store is SSR-safe: persist uses createJSONStorage with a guard so it does not throw during server render / first paint (skipHydration or typeof window check, mirroring preferences-store.ts)"
    - "applyPreset returns a typed snapshot the caller (Plan 05-03b) feeds to nuqs (filters/sort/page) + the table (columnVisibility) — the store does NOT itself touch the URL"
  artifacts:
    - path: "src/stores/dashboard-presets-store.ts"
      provides: "Zustand persist store: named full-snapshot presets + live columnVisibility"
      min_lines: 80
      exports: ["useDashboardPresetsStore"]
    - path: "src/stores/__tests__/dashboard-presets-store.test.ts"
      provides: "Preset round-trip + columnVisibility persistence + SSR-safety tests"
      contains: "savePreset"
  key_links:
    - from: "src/stores/dashboard-presets-store.ts"
      to: "zustand/middleware persist + createJSONStorage"
      via: "localStorage persistence under a stable key"
      pattern: "persist|createJSONStorage"
---

<objective>
Ship DT-08 (saved filter presets in localStorage) + the DT-05 persistence half (column visibility persists in the SAME slice, per D-3): a new `dashboard-presets-store.ts` Zustand store using the `persist` middleware. A preset is a FULL view snapshot — `{ name, filters, sort, columnVisibility, page }` (D-1) — so applying a named preset restores the entire portfolio view. The store also holds the live `columnVisibility` so the user's hidden/shown columns stick across sessions (D-3) without needing a saved preset.

Purpose: ROADMAP Phase 5 success criterion #3 is "the user can save a filter preset, refresh the page, and re-apply that preset from the preset menu (localStorage via Zustand `persist`)." This plan builds the persistence engine. It is deliberately UI-free and URL-free: the store exposes typed snapshot in/out, and Plan 05-03b is responsible for (a) collecting the current snapshot from nuqs + the table to pass to `savePreset`, and (b) feeding `applyPreset`'s returned snapshot back into nuqs (filters/sort/page) and the table (columnVisibility). Keeping the store free of nuqs/URL coupling means it round-trips cleanly across refresh and is trivially unit-testable.

Note on pattern: the repo's existing `preferences-store.ts` uses a HAND-ROLLED `localStorage.getItem/setItem` + `typeof window` guard rather than the `persist` middleware (there is no current `zustand/middleware` persist usage in `src/stores`). The CONTEXT (D-3) explicitly names "Zustand `persist` slice," so this plan introduces the `persist` middleware with `createJSONStorage` — the canonical Zustand approach the decision names. Preserve the SSR-safety lesson from `preferences-store.ts` (guard against server-side access) via `createJSONStorage(() => localStorage)` + `skipHydration` or an `onRehydrateStorage` no-op, so first server render does not throw.

Output:
- `src/stores/dashboard-presets-store.ts` — `useDashboardPresetsStore` (persist slice: `presets` map + live `columnVisibility` + save/apply/delete/setColumnVisibility actions).
- `src/stores/__tests__/dashboard-presets-store.test.ts` — round-trip + persistence + SSR-safety tests.

NO nuqs wiring (Plan 05-03b). NO dashboard.tsx changes. NO dashboard-store trim (Plan 05-03b). NO mount.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/05-dashboard-portfolio-datatable/05-CONTEXT.md
@CLAUDE.md
@src/stores/preferences-store.ts
@src/stores/dashboard-store.ts
@src/types/data-table.ts

<interfaces>
<!-- The snapshot shape (D-1) — define it as an exported type in this file. -->
```typescript
import type { SortingState, VisibilityState } from "@tanstack/react-table";
// filters: per-column filter state mirrored from nuqs (the same flat keys useClientDataTable writes).
// Keep it serializable: Record<string, string | string[]>. sort: SortingState. page: number.
export interface DashboardViewSnapshot {
  filters: Record<string, string | string[]>;
  sort: SortingState;            // [{ id, desc }]
  columnVisibility: VisibilityState; // Record<string, boolean>
  page: number;
}
export interface DashboardPreset extends DashboardViewSnapshot { name: string; }
```
<!-- SSR-safety reference (preferences-store.ts): typeof window === "undefined" guard before localStorage. -->
<!-- Persist middleware canonical usage: -->
```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
export const useDashboardPresetsStore = create<State & Actions>()(
  persist((set, get) => ({ /* ... */ }),
    { name: "tenantflow-dashboard-presets", storage: createJSONStorage(() => localStorage), skipHydration: false })
);
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Author dashboard-presets-store.ts (persist slice: full-snapshot presets + live columnVisibility)</name>
  <files>src/stores/dashboard-presets-store.ts</files>
  <read_first>
    - src/stores/preferences-store.ts (the existing localStorage pattern + the typeof window SSR guard to preserve the lesson from)
    - src/stores/dashboard-store.ts (the store being trimmed in 05-03b — confirm the snapshot fields map to its old searchQuery/statusFilter/sort/page state)
    - .planning/phases/05-dashboard-portfolio-datatable/05-CONTEXT.md (D-1 full snapshot; D-3 columnVisibility in the same slice; "Preset shape coupling" risk)
    - src/types/data-table.ts (for SortingState/VisibilityState import sources via @tanstack/react-table)
    - CLAUDE.md (Zero Tolerance: no any, no barrel files; Zustand for UI state; State store conventions)
  </read_first>
  <behavior>
    - Test "save then apply round-trips a full snapshot": savePreset("Q1", snapshot); applyPreset("Q1") returns a deep-equal snapshot (filters + sort + columnVisibility + page).
    - Test "columnVisibility persists independent of presets": setColumnVisibility({ maintenance: false }); the live columnVisibility in state reflects it (and is in the persisted slice).
    - Test "deletePreset removes it": after deletePreset("Q1"), applyPreset("Q1") returns undefined / the preset is gone from listPresets().
    - Test "duplicate-name behavior is defined": saving twice with the same name either overwrites (latest wins) or is rejected — assert the chosen contract explicitly.
    - Test "persist writes to localStorage under the stable key": after a savePreset, localStorage.getItem("tenantflow-dashboard-presets") contains the preset name (proves the persist slice serializes).
    - Test "SSR-safe": importing/instantiating the store with `window` undefined (or storage access guarded) does not throw.
  </behavior>
  <action>
    Create `src/stores/dashboard-presets-store.ts`. Define and export `DashboardViewSnapshot` + `DashboardPreset` (shapes in <interfaces>). Build a Zustand store via `create<State & Actions>()(persist(...))` from `zustand/middleware`:

    - **State**: `presets: Record<string, DashboardPreset>` (keyed by name), `columnVisibility: VisibilityState` (the live D-3 visibility).
    - **Actions**:
      - `savePreset(name: string, snapshot: DashboardViewSnapshot): void` — stores `{ ...snapshot, name }` under `presets[name]`. Decide overwrite-vs-reject for an existing name; implement overwrite (latest wins) for simplicity and test it (or reject — pick one and pin it).
      - `applyPreset(name: string): DashboardPreset | undefined` — returns the stored preset (the caller applies it to nuqs + table). Pure read; does not mutate URL.
      - `deletePreset(name: string): void`.
      - `listPresets(): DashboardPreset[]` (or expose `presets` directly for the menu).
      - `setColumnVisibility(v: VisibilityState): void` — updates the live D-3 visibility.
    - **persist config**: `name: "tenantflow-dashboard-presets"`, `storage: createJSONStorage(() => localStorage)`. Ensure SSR safety: either `skipHydration` + manual rehydrate on the client, OR rely on `createJSONStorage(() => localStorage)` only being read client-side (Zustand persist is lazy) — verify the store can be imported under `typeof window === "undefined"` without throwing (mirror the `preferences-store.ts` guard lesson). If needed, wrap the storage getter to return a no-op storage on the server.

    Zero-Tolerance: no `any` (type the snapshot and visibility via `@tanstack/react-table`'s `SortingState` / `VisibilityState`). No barrel file — export the hook + types directly. Keep `filters` serializable (`Record<string, string | string[]>`) so JSON persist round-trips.

    Do NOT couple to nuqs or the URL here (Plan 05-03b owns that). Do NOT store React state or functions in the snapshot (must be JSON-serializable for persist).
  </action>
  <verify>
    <automated>bun run typecheck && grep -Ec "persist\(|createJSONStorage" src/stores/dashboard-presets-store.ts</automated>
  </verify>
  <acceptance_criteria>
    - File exists; `export const useDashboardPresetsStore` present.
    - `export interface DashboardViewSnapshot` and `export interface DashboardPreset` present.
    - persist + createJSONStorage wired: verify grep returns 2.
    - `grep -c "tenantflow-dashboard-presets" src/stores/dashboard-presets-store.ts` >= 1 (stable key).
    - `grep -Ec "savePreset|applyPreset|deletePreset|setColumnVisibility" ...` >= 4 (all actions present).
    - No `any`: `grep -E ":\s*any[^a-z]|<any>|as any" src/stores/dashboard-presets-store.ts` returns zero matches.
    - `bun run typecheck` exits 0.
  </acceptance_criteria>
  <done>dashboard-presets-store.ts is a Zustand persist store holding full-snapshot presets (D-1) + live columnVisibility (D-3) under a stable localStorage key, SSR-safe, no any.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Unit-test the presets store (round-trip, columnVisibility persistence, SSR-safety)</name>
  <files>src/stores/__tests__/dashboard-presets-store.test.ts</files>
  <read_first>
    - src/stores/dashboard-presets-store.ts (the store under test, from Task 1)
    - src/stores/__tests__ (browse for an existing store test to copy the reset-between-tests + localStorage-mock pattern; jsdom provides localStorage)
    - CLAUDE.md (Vitest 4 + chai 6: use .rejects.toMatchObject not .rejects.toThrow; vi.hoisted for vi.mock vars; 80% coverage threshold)
  </read_first>
  <behavior>
    - Implement the 6 tests from Task 1's <behavior> block.
    - Reset the store + localStorage between tests (beforeEach: clear the persisted key and reset store state to defaults) so tests are order-independent.
    - For the SSR-safety test, simulate `window`/`localStorage` absence (e.g. temporarily stub) and assert no throw on a store read; restore afterward.
  </behavior>
  <action>
    Create `src/stores/__tests__/dashboard-presets-store.test.ts`. Use the Zustand store directly (call `useDashboardPresetsStore.getState()` for actions in a non-React test, or `renderHook` if a hook-context is needed). In `beforeEach`, clear `localStorage` (jsdom-provided) and reset the store to initial state (`useDashboardPresetsStore.setState(initialState, true)` or the store's reset path) so the persist slice does not leak across tests.

    Build a concrete `DashboardViewSnapshot` fixture: `{ filters: { status: ["active"] }, sort: [{ id: "rent", desc: true }], columnVisibility: { maintenance: false }, page: 2 }`. Assert `applyPreset` returns it deep-equal after `savePreset`. Assert `localStorage.getItem("tenantflow-dashboard-presets")` (or `JSON.parse` of it) contains the preset name after save.

    Zero-Tolerance: no `any` (type the fixture as `DashboardViewSnapshot`). Use `.rejects.toMatchObject` over `.rejects.toThrow` (chai 6). `vi.hoisted()` for any `vi.mock` variable.

    Do NOT depend on test ordering. Do NOT leave the persisted key dirty between tests.
  </action>
  <verify>
    <automated>bun run test:unit -- --run src/stores/__tests__/dashboard-presets-store.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - All 6 tests pass.
    - `grep -c "savePreset" src/stores/__tests__/dashboard-presets-store.test.ts` >= 1 and `grep -c "applyPreset" ...` >= 1.
    - `grep -c "localStorage" ...` >= 1 (persistence assertion).
    - No `any`: `grep -E ":\s*any[^a-z]|<any>|as any" src/stores/__tests__/dashboard-presets-store.test.ts` returns zero matches.
    - `bun run typecheck` exits 0.
  </acceptance_criteria>
  <done>Six unit tests pin preset save/apply/delete round-trip, columnVisibility persistence, duplicate-name contract, localStorage serialization, and SSR-safety; all pass; no any.</done>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| localStorage (persisted JSON) → store state on rehydrate | Persisted presets are user-local; on rehydrate the JSON is parsed back into typed state. Malformed/tampered localStorage could inject unexpected keys. |
| Snapshot in/out → caller (Plan 05-03b) | The store returns snapshots the caller applies to nuqs + table; values originate from the same user's prior view state. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-03a-01 | Tampering | tampered localStorage preset JSON on rehydrate | mitigate | The snapshot is consumed downstream by typed sinks: `sort` flows through `getSortingStateParser` (rejects unknown column ids), `filters` flow into TanStack client-side filters (string compare, no DB), `columnVisibility` keys that don't match a column are ignored by TanStack. A malformed persisted blob degrades to defaults, not a crash or privilege change. Plan 05-03b applies via the same validated nuqs parsers. |
| T-05-03a-02 | Information Disclosure | presets stored in localStorage | accept | Presets contain only the user's own filter/sort/visibility/page choices (no PII, no tokens) for the user's own browser; localStorage is origin-scoped. No cross-user exposure. |
| T-05-03a-03 | Denial of Service | unbounded preset count in localStorage | accept | Presets are user-initiated saves; localStorage quota is the natural bound. v2.0 needs no cap (deferrable polish). |
| T-05-03a-SC | Tampering | Supply chain — package installs | accept | `zustand` (incl. `zustand/middleware`) is already a project dependency (preferences-store + dashboard-store import it). No new package. No RESEARCH.md Package Legitimacy Audit required (no install step). |

</threat_model>

<verification>
- `dashboard-presets-store.ts` is a Zustand `persist` store under `tenantflow-dashboard-presets` holding `presets` (full snapshots, D-1) + live `columnVisibility` (D-3).
- Actions: `savePreset`, `applyPreset`, `deletePreset`, `setColumnVisibility` (+ a list accessor) all present and typed.
- Store is SSR-safe (no throw on server import) and JSON-serializable.
- The 6 store tests pass; round-trip + localStorage persistence + SSR-safety all asserted.
- `bun run typecheck` exits 0; `bun run lint` clean.
- No `any`, no barrel file, no new package.
</verification>

<success_criteria>
- DT-08 fulfilled (engine): named full-snapshot presets persist to localStorage via Zustand `persist` (advances ROADMAP Phase 5 success criterion #3 — save preset → refresh → re-apply).
- DT-05 persistence half fulfilled: live `columnVisibility` persists in the same slice (D-3).
- The "Preset shape coupling" risk (05-CONTEXT.md) is resolved: the snapshot shape is decided up-front ({filters, sort, columnVisibility, page}) and round-trips cleanly across refresh (pinned by test).
- Zero-Tolerance compliance: no `any`, no barrel file; Zustand for UI/persisted state per conventions.
</success_criteria>

<output>
Create `.planning/phases/05-dashboard-portfolio-datatable/05-03a-SUMMARY.md` when done. Record:
- The exported `DashboardViewSnapshot` / `DashboardPreset` shapes (Plan 05-03b consumes these).
- The action signatures (`savePreset`/`applyPreset`/`deletePreset`/`setColumnVisibility` + list accessor).
- The duplicate-name contract chosen (overwrite vs. reject).
- The SSR-safety approach taken (skipHydration vs. guarded storage getter).
- Test counts + pass status; `git diff --stat`.
- A note for Plan 05-03b: how to collect the current snapshot (from nuqs + table) for `savePreset`, and how to apply `applyPreset`'s result (filters/sort/page → nuqs, columnVisibility → table/store).
</output>
