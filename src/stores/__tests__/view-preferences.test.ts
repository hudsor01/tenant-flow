/**
 * View-preference persistence tests (STATE-11).
 *
 * The maintenance kanban/table toggle must persist across reloads: setViewPreference
 * writes to localStorage, getStoredViewPreferences reads it back (validating the
 * value and degrading corrupt/unknown data to null), and the provider rehydrates.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createPreferencesStore,
	getStoredViewPreferences,
	persistViewPreferences,
	VIEW_PREFERENCES_STORAGE_KEY,
} from "#stores/preferences-store";

describe("view preferences (STATE-11)", () => {
	let mockLocalStorage: Record<string, string>;

	beforeEach(() => {
		mockLocalStorage = {};
		vi.stubGlobal("localStorage", {
			getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
			setItem: vi.fn((key: string, value: string) => {
				mockLocalStorage[key] = value;
			}),
			removeItem: vi.fn((key: string) => {
				delete mockLocalStorage[key];
			}),
			clear: vi.fn(() => {
				mockLocalStorage = {};
			}),
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("persistViewPreferences writes the value under the storage key", () => {
		persistViewPreferences({ maintenance: "table" });
		expect(mockLocalStorage[VIEW_PREFERENCES_STORAGE_KEY]).toBe(
			JSON.stringify({ maintenance: "table" }),
		);
	});

	it("getStoredViewPreferences round-trips a valid persisted value", () => {
		persistViewPreferences({ maintenance: "kanban" });
		expect(getStoredViewPreferences()).toEqual({ maintenance: "kanban" });
	});

	it("returns null when nothing is stored", () => {
		expect(getStoredViewPreferences()).toBeNull();
	});

	it("degrades an invalid `maintenance` value to null", () => {
		mockLocalStorage[VIEW_PREFERENCES_STORAGE_KEY] = JSON.stringify({
			maintenance: "list",
		});
		expect(getStoredViewPreferences()).toBeNull();
	});

	it("degrades corrupted JSON to null instead of throwing", () => {
		mockLocalStorage[VIEW_PREFERENCES_STORAGE_KEY] = "{not json";
		expect(() => getStoredViewPreferences()).not.toThrow();
		expect(getStoredViewPreferences()).toBeNull();
	});

	it("setViewPreference updates state AND persists so the choice survives a reload", () => {
		const store = createPreferencesStore();
		store.getState().setViewPreference("maintenance", "table");
		expect(store.getState().viewPreferences.maintenance).toBe("table");
		// A fresh read (as the provider does on mount) sees the persisted value.
		expect(getStoredViewPreferences()).toEqual({ maintenance: "table" });
	});
});
