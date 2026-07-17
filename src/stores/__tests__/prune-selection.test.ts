/**
 * pruneSelection reconciliation tests (STATE-01 / STATE-05 / STATE-12).
 *
 * Each list store keeps a Set of selected ids in a module singleton. When a
 * row is (soft-)deleted, the selection must be reconciled against the fetched
 * dataset so a phantom id can't survive to be re-targeted by a bulk action.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { useLeasesStore } from "#stores/leases-store";
import { usePropertiesStore } from "#stores/properties-store";
import { useTenantsStore } from "#stores/tenants-store";

describe("leases store pruneSelection (STATE-01)", () => {
	beforeEach(() => {
		useLeasesStore.setState({ selectedRows: new Set(["a", "b", "c"]) });
	});

	it("drops ids absent from the valid set, keeps the rest", () => {
		useLeasesStore.getState().pruneSelection(["a", "c"]);
		expect([...useLeasesStore.getState().selectedRows].sort()).toEqual([
			"a",
			"c",
		]);
	});

	it("is a no-op (same Set reference) when every selected id is valid", () => {
		const before = useLeasesStore.getState().selectedRows;
		useLeasesStore.getState().pruneSelection(["a", "b", "c", "d"]);
		expect(useLeasesStore.getState().selectedRows).toBe(before);
	});
});

describe("properties store pruneSelection (STATE-05)", () => {
	beforeEach(() => {
		usePropertiesStore.setState({ selectedRows: new Set(["p1", "p2"]) });
	});

	it("removes a soft-deleted (absent) property id from the selection", () => {
		usePropertiesStore.getState().pruneSelection(["p1"]);
		expect([...usePropertiesStore.getState().selectedRows]).toEqual(["p1"]);
	});

	it("is a no-op (same Set reference) when all selected ids remain valid", () => {
		const before = usePropertiesStore.getState().selectedRows;
		usePropertiesStore.getState().pruneSelection(["p1", "p2"]);
		expect(usePropertiesStore.getState().selectedRows).toBe(before);
	});
});

describe("tenants store pruneSelection (STATE-12)", () => {
	beforeEach(() => {
		useTenantsStore.setState({ selectedIds: new Set(["t1", "t2"]) });
	});

	it("removes a single-deleted (absent) tenant id from the selection", () => {
		useTenantsStore.getState().pruneSelection(["t2"]);
		expect([...useTenantsStore.getState().selectedIds]).toEqual(["t2"]);
	});

	it("is a no-op (same Set reference) when all selected ids remain valid", () => {
		const before = useTenantsStore.getState().selectedIds;
		useTenantsStore.getState().pruneSelection(["t1", "t2"]);
		expect(useTenantsStore.getState().selectedIds).toBe(before);
	});
});
