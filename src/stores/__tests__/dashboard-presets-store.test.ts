/**
 * Dashboard presets store unit tests (DT-08 + DT-05 persistence half).
 *
 * Pins the contract Plan 05-03b consumes:
 *  - savePreset/applyPreset round-trip a FULL view snapshot (D-1)
 *  - live columnVisibility persists in the same slice (D-3)
 *  - persist writes to localStorage under the stable key
 *  - SSR-safety: the store can be read with `window` undefined without throwing
 *
 * Tests reset both the persisted key and the store state in beforeEach so they
 * are order-independent (the persist slice must not leak across tests).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	DASHBOARD_PRESETS_STORAGE_KEY,
	type DashboardViewSnapshot,
	useDashboardPresetsStore,
} from "#stores/dashboard-presets-store";

const SNAPSHOT: DashboardViewSnapshot = {
	filters: { status: ["active"], property: "maple" },
	sort: [{ id: "rent", desc: true }],
	columnVisibility: { maintenance: false },
	page: 2,
};

let mockLocalStorage: Record<string, string>;

const installLocalStorage = () => {
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
};

const resetStore = () => {
	localStorage.removeItem(DASHBOARD_PRESETS_STORAGE_KEY);
	useDashboardPresetsStore.setState(
		{ presets: {}, columnVisibility: {} },
		false,
	);
};

describe("dashboard presets store", () => {
	beforeEach(() => {
		installLocalStorage();
		resetStore();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("round-trips a full snapshot through save then apply", () => {
		const { savePreset } = useDashboardPresetsStore.getState();
		savePreset("Q1", SNAPSHOT);

		const applied = useDashboardPresetsStore.getState().applyPreset("Q1");

		expect(applied).toBeDefined();
		expect(applied?.name).toBe("Q1");
		expect(applied?.filters).toEqual(SNAPSHOT.filters);
		expect(applied?.sort).toEqual(SNAPSHOT.sort);
		expect(applied?.columnVisibility).toEqual(SNAPSHOT.columnVisibility);
		expect(applied?.page).toBe(SNAPSHOT.page);
	});

	it("persists live columnVisibility independent of presets (D-3)", () => {
		const { setColumnVisibility } = useDashboardPresetsStore.getState();
		setColumnVisibility({ maintenance: false });

		expect(useDashboardPresetsStore.getState().columnVisibility).toEqual({
			maintenance: false,
		});

		const persisted = JSON.parse(
			localStorage.getItem(DASHBOARD_PRESETS_STORAGE_KEY) ?? "{}",
		) as { state?: { columnVisibility?: Record<string, boolean> } };
		expect(persisted.state?.columnVisibility).toEqual({ maintenance: false });
	});

	it("deletePreset removes the preset from list and apply", () => {
		const store = useDashboardPresetsStore.getState();
		store.savePreset("Q1", SNAPSHOT);
		expect(useDashboardPresetsStore.getState().listPresets()).toHaveLength(1);

		useDashboardPresetsStore.getState().deletePreset("Q1");

		expect(useDashboardPresetsStore.getState().listPresets()).toHaveLength(0);
		expect(
			useDashboardPresetsStore.getState().applyPreset("Q1"),
		).toBeUndefined();
	});

	it("saving with a duplicate name overwrites (latest wins)", () => {
		const { savePreset } = useDashboardPresetsStore.getState();
		savePreset("View", SNAPSHOT);
		savePreset("View", {
			...SNAPSHOT,
			page: 9,
			filters: { status: ["vacant"] },
		});

		const applied = useDashboardPresetsStore.getState().applyPreset("View");

		expect(useDashboardPresetsStore.getState().listPresets()).toHaveLength(1);
		expect(applied?.page).toBe(9);
		expect(applied?.filters).toEqual({ status: ["vacant"] });
	});

	it("persist serializes the preset to localStorage under the stable key", () => {
		useDashboardPresetsStore.getState().savePreset("Q1", SNAPSHOT);

		const raw = localStorage.getItem(DASHBOARD_PRESETS_STORAGE_KEY);
		expect(raw).not.toBeNull();
		expect(raw).toContain("Q1");

		const persisted = JSON.parse(raw ?? "{}") as {
			state?: { presets?: Record<string, DashboardViewSnapshot> };
		};
		expect(persisted.state?.presets?.Q1).toMatchObject({ page: 2, name: "Q1" });
	});

	it("is SSR-safe: reading the store with window undefined does not throw", () => {
		const originalWindow = globalThis.window;
		// Simulate a server render where window/localStorage are absent.
		// @ts-expect-error deliberately removing window to assert no throw on read.
		delete globalThis.window;
		try {
			expect(() => {
				const state = useDashboardPresetsStore.getState();
				state.savePreset("ServerSafe", SNAPSHOT);
				state.listPresets();
				state.applyPreset("ServerSafe");
			}).not.toThrow();
		} finally {
			globalThis.window = originalWindow;
		}
	});
});
