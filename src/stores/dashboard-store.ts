import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

export type DashboardViewMode = "table" | "grid";

interface DashboardState {
	viewMode: DashboardViewMode;
}

interface DashboardActions {
	setViewMode: (mode: DashboardViewMode) => void;
}

/**
 * Trimmed to `viewMode` ONLY (Phase 5 DT-09 / D-4). Filter/sort/page state now
 * lives in nuqs URL params inside `useClientDataTable`; column visibility +
 * saved presets live in `dashboard-presets-store.ts`. The grid/table toggle
 * (DT-07) is the single atomic piece of UI state that remains in Zustand.
 */
export const useDashboardStore = create<DashboardState & DashboardActions>(
	(set) => ({
		viewMode: "table",
		setViewMode: (mode) => set({ viewMode: mode }),
	}),
);

export const useDashboardViewMode = () =>
	useDashboardStore(
		useShallow((state) => ({
			viewMode: state.viewMode,
			setViewMode: state.setViewMode,
		})),
	);
