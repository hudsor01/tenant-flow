/**
 * resetAllStores tests (STATE-02): sign-out must return every module-singleton
 * store to its initial state so a next user on the same browser can't inherit
 * the prior user's selection / filters / preferences.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// resetAllStores() touches the persisted dashboard-presets store, whose storage
// adapter calls `localStorage` directly; the store test env has none, so stub a
// minimal in-memory implementation.
const memStore = new Map<string, string>();
vi.stubGlobal("localStorage", {
	getItem: (k: string) => memStore.get(k) ?? null,
	setItem: (k: string, v: string) => {
		memStore.set(k, v);
	},
	removeItem: (k: string) => {
		memStore.delete(k);
	},
	clear: () => {
		memStore.clear();
	},
});

import { useDashboardStore } from "#stores/dashboard-store";
import { useErrorBoundaryStore } from "#stores/error-boundary-store";
import { useLeasesStore } from "#stores/leases-store";
import { useNavigationStore } from "#stores/navigation-store";
import { usePropertiesStore } from "#stores/properties-store";
import { resetAllStores } from "#stores/reset-all-stores";
import { useTenantsStore } from "#stores/tenants-store";

describe("resetAllStores (STATE-02)", () => {
	beforeEach(() => {
		// Seed each store with "prior user" state.
		useLeasesStore.setState({ selectedRows: new Set(["l1", "l2"]) });
		usePropertiesStore.setState({ selectedRows: new Set(["p1"]) });
		useTenantsStore.setState({ selectedIds: new Set(["t1"]) });
		useDashboardStore.setState({ viewMode: "grid" });
		useNavigationStore.setState({ isMobileMenuOpen: true });
		useErrorBoundaryStore.setState({ errorState: { hasError: true } });
	});

	it("clears list-store selections", () => {
		resetAllStores();
		expect(useLeasesStore.getState().selectedRows.size).toBe(0);
		expect(usePropertiesStore.getState().selectedRows.size).toBe(0);
		expect(useTenantsStore.getState().selectedIds.size).toBe(0);
	});

	it("resets dashboard view mode to the documented default and closes the mobile menu", () => {
		resetAllStores();
		expect(useDashboardStore.getState().viewMode).toBe("table");
		expect(useNavigationStore.getState().isMobileMenuOpen).toBe(false);
	});

	it("clears any lingering error-boundary state", () => {
		resetAllStores();
		expect(useErrorBoundaryStore.getState().errorState.hasError).toBe(false);
	});

	it("is idempotent (safe to call twice)", () => {
		resetAllStores();
		expect(() => resetAllStores()).not.toThrow();
		expect(useLeasesStore.getState().selectedRows.size).toBe(0);
	});
});
