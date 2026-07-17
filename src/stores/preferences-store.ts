import { createStore } from "zustand/vanilla";
import { DEFAULT_THEME_MODE } from "#lib/theme-utils";
import type { ThemeMode } from "#types/domain";

/**
 * Data Density modes for UI spacing and information density
 * - compact: Tighter spacing, smaller rows (h-8), more data visible
 * - comfortable: Default spacing (h-12), balanced view
 * - spacious: Generous spacing (h-16), easier scanning
 */
export type DataDensity = "compact" | "comfortable" | "spacious";

export const DEFAULT_DATA_DENSITY: DataDensity = "comfortable";

/**
 * LocalStorage key for persisting data density preference
 */
export const DATA_DENSITY_STORAGE_KEY = "tenantflow-data-density";

/**
 * View types for different entities in the application.
 * - maintenance: 'kanban' (workflow) | 'table' (data-dense)
 * - leases/tenants: locked to 'table' (best practice per UX research)
 */
export type ViewPreferences = {
	maintenance: "kanban" | "table";
};

const DEFAULT_VIEW_PREFERENCES: ViewPreferences = {
	maintenance: "kanban", // Workflow-driven per UX research
};

export type PreferencesState = {
	themeMode: ThemeMode;
	dataDensity: DataDensity;
	viewPreferences: ViewPreferences;
	setThemeMode: (mode: ThemeMode) => void;
	setDataDensity: (density: DataDensity) => void;
	setViewPreference: <K extends keyof ViewPreferences>(
		entity: K,
		view: ViewPreferences[K],
	) => void;
};

/**
 * Get stored data density from localStorage
 */
export function getStoredDataDensity(): DataDensity | null {
	if (typeof window === "undefined") return null;
	const stored = localStorage.getItem(DATA_DENSITY_STORAGE_KEY);
	if (stored && ["compact", "comfortable", "spacious"].includes(stored)) {
		return stored as DataDensity;
	}
	return null;
}

/**
 * Persist data density to localStorage
 */
export function persistDataDensity(density: DataDensity): void {
	if (typeof window === "undefined") return;
	localStorage.setItem(DATA_DENSITY_STORAGE_KEY, density);
}

/**
 * LocalStorage key for persisting view preferences (maintenance kanban/table toggle).
 */
export const VIEW_PREFERENCES_STORAGE_KEY = "tenantflow-view-preferences";

/**
 * Get stored view preferences from localStorage.
 * SSR-guarded; validates `maintenance` against known values and merges over defaults
 * so unknown/missing keys degrade gracefully.
 */
export function getStoredViewPreferences(): ViewPreferences | null {
	if (typeof window === "undefined") return null;
	try {
		const stored = localStorage.getItem(VIEW_PREFERENCES_STORAGE_KEY);
		if (!stored) return null;
		const parsed = JSON.parse(stored);
		if (
			parsed &&
			typeof parsed === "object" &&
			["kanban", "table"].includes(parsed.maintenance)
		) {
			return { maintenance: parsed.maintenance };
		}
	} catch {
		// Corrupted value — degrade to defaults
	}
	return null;
}

/**
 * Persist view preferences to localStorage.
 */
export function persistViewPreferences(prefs: ViewPreferences): void {
	if (typeof window === "undefined") return;
	localStorage.setItem(VIEW_PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
}

export const createPreferencesStore = (init?: Partial<PreferencesState>) =>
	createStore<PreferencesState>()((set) => ({
		themeMode: init?.themeMode ?? DEFAULT_THEME_MODE,
		dataDensity: init?.dataDensity ?? DEFAULT_DATA_DENSITY,
		viewPreferences: init?.viewPreferences ?? DEFAULT_VIEW_PREFERENCES,
		setThemeMode: (mode) => set({ themeMode: mode }),
		setDataDensity: (density) => {
			persistDataDensity(density);
			set({ dataDensity: density });
		},
		setViewPreference: (entity, view) =>
			set((state) => {
				const newPrefs = {
					...state.viewPreferences,
					[entity]: view,
				};
				persistViewPreferences(newPrefs);
				return { viewPreferences: newPrefs };
			}),
	}));
