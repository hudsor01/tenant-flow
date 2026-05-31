import type { SortingState, VisibilityState } from "@tanstack/react-table";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Stable localStorage key for the persisted presets slice. Plan 05-03b reads
 * the same key when it round-trips snapshots; the store-test asserts against it.
 */
export const DASHBOARD_PRESETS_STORAGE_KEY = "tenantflow-dashboard-presets";

/**
 * A FULL portfolio view snapshot (D-1). Applying a preset restores all four
 * dimensions. `filters` mirrors the flat nuqs filter keys `useClientDataTable`
 * writes (the faceted `status` array + the `property` search string per W-3) and
 * stays JSON-serializable so the persist middleware round-trips it cleanly.
 *
 * The store is deliberately URL-free: Plan 05-03b feeds `filters`/`sort`/`page`
 * to nuqs and `columnVisibility` to the table; the store never touches the URL.
 */
export interface DashboardViewSnapshot {
	filters: Record<string, string | string[]>;
	sort: SortingState;
	columnVisibility: VisibilityState;
	page: number;
}

/** A named preset — a snapshot plus its unique menu name (the map key). */
export interface DashboardPreset extends DashboardViewSnapshot {
	name: string;
}

interface DashboardPresetsState {
	/** Named presets, keyed by their unique name (D-1). */
	presets: Record<string, DashboardPreset>;
	/** Live column visibility persisted in the same slice (D-3). */
	columnVisibility: VisibilityState;
}

interface DashboardPresetsActions {
	/** Save (or overwrite — latest wins) a named full-snapshot preset. */
	savePreset: (name: string, snapshot: DashboardViewSnapshot) => void;
	/**
	 * Read a stored preset for the caller to apply to nuqs + the table.
	 * Pure read — never mutates the URL. Returns undefined for unknown names.
	 */
	applyPreset: (name: string) => DashboardPreset | undefined;
	/** Remove a named preset. */
	deletePreset: (name: string) => void;
	/** List presets for the menu, ordered by insertion. */
	listPresets: () => DashboardPreset[];
	/** Update the live column visibility (D-3). */
	setColumnVisibility: (columnVisibility: VisibilityState) => void;
}

type DashboardPresetsStore = DashboardPresetsState & DashboardPresetsActions;

/**
 * SSR-safe storage adapter. Each call re-resolves the global `localStorage`
 * behind a `typeof window` guard (mirroring the lesson from
 * `preferences-store.ts`), so:
 *  - first server render never throws (no `localStorage` access when
 *    `window` is undefined — the read/write is a no-op),
 *  - the binding is resolved lazily per call rather than cached at module
 *    eval, which keeps it correct when the global is (re)installed later.
 */
const ssrSafeStorage = createJSONStorage(() => ({
	getItem: (name: string) =>
		typeof window === "undefined" ? null : localStorage.getItem(name),
	setItem: (name: string, value: string) => {
		if (typeof window === "undefined") return;
		localStorage.setItem(name, value);
	},
	removeItem: (name: string) => {
		if (typeof window === "undefined") return;
		localStorage.removeItem(name);
	},
}));

export const useDashboardPresetsStore = create<DashboardPresetsStore>()(
	persist(
		(set, get) => ({
			presets: {},
			columnVisibility: {},

			savePreset: (name, snapshot) =>
				set((state) => ({
					// Duplicate name overwrites (latest wins) — pinned by test.
					presets: { ...state.presets, [name]: { ...snapshot, name } },
				})),

			applyPreset: (name) => get().presets[name],

			deletePreset: (name) =>
				set((state) => {
					const next = { ...state.presets };
					delete next[name];
					return { presets: next };
				}),

			listPresets: () => Object.values(get().presets),

			setColumnVisibility: (columnVisibility) => set({ columnVisibility }),
		}),
		{
			name: DASHBOARD_PRESETS_STORAGE_KEY,
			storage: ssrSafeStorage,
			// Persist only state (presets + live visibility), never the actions.
			partialize: (state) => ({
				presets: state.presets,
				columnVisibility: state.columnVisibility,
			}),
		},
	),
);
