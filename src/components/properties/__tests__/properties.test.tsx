/**
 * Properties state-wiring tests (STATE-05): the prune effect reconciles the
 * selection against the fetched (active) list, and the bulk-delete guard only
 * targets still-listed ids so a soft-deleted property can't be resurrected.
 * Heavy children + mutations are mocked; PropertyActionBar is mocked to expose
 * its onBulkDelete so the guard can be invoked directly.
 */
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePropertiesStore } from "#stores/properties-store";
import type { PropertiesProps, PropertyItem } from "../types";

const deleteMutateAsync = vi.fn().mockResolvedValue(undefined);
const updateMutateAsync = vi.fn().mockResolvedValue(undefined);
vi.mock("#hooks/api/use-property-mutations", () => ({
	useDeletePropertyMutation: () => ({ mutateAsync: deleteMutateAsync }),
	useUpdatePropertyMutation: () => ({ mutateAsync: updateMutateAsync }),
}));

let actionBarProps: Record<string, unknown> = {};
vi.mock("../property-action-bar", () => ({
	PropertyActionBar: (props: Record<string, unknown>) => {
		actionBarProps = props;
		return null;
	},
}));
vi.mock("../property-bulk-edit-dialog", () => ({
	PropertyBulkEditDialog: () => null,
}));
vi.mock("../property-select-card", () => ({ PropertyCard: () => null }));
vi.mock("../property-stats-section", () => ({
	PropertyStatsSection: () => null,
}));
vi.mock("../property-table", () => ({ PropertyTable: () => null }));
vi.mock("../property-toolbar", () => ({ PropertyToolbar: () => null }));
vi.mock("../properties-header", () => ({ PropertiesHeader: () => null }));
vi.mock("../properties-filters", async (orig) => ({
	...(await orig()),
	EmptyProperties: () => null,
}));

function property(id: string): PropertyItem {
	return {
		id,
		name: `Property ${id}`,
		addressLine: "1 Main St",
		city: "Townsville",
		availableUnits: 1,
		maintenanceUnits: 0,
		propertyType: "single_family",
		status: "active",
	} as unknown as PropertyItem;
}

async function renderProperties(properties: PropertyItem[]) {
	const { Properties } = await import("../properties");
	const props = {
		properties,
		summary: {} as PropertiesProps["summary"],
		onAddProperty: vi.fn(),
	} as PropertiesProps;
	return render(<Properties {...props} />);
}

describe("Properties state wiring (STATE-05)", () => {
	afterEach(() => {
		cleanup();
		usePropertiesStore.getState().reset();
		vi.clearAllMocks();
		vi.unstubAllGlobals();
	});

	it("prunes a phantom selected id absent from the fetched list", async () => {
		usePropertiesStore.setState({ selectedRows: new Set(["p1", "ghost"]) });
		await renderProperties([property("p1")]);
		await waitFor(() => {
			const sel = usePropertiesStore.getState().selectedRows;
			expect(sel.has("ghost")).toBe(false);
			expect(sel.has("p1")).toBe(true);
		});
	});

	it("bulk delete only targets still-listed property ids", async () => {
		vi.stubGlobal("confirm", () => true);
		usePropertiesStore.setState({ selectedRows: new Set(["p1", "p2"]) });
		await renderProperties([property("p1"), property("p2")]);
		await (actionBarProps.onBulkDelete as () => Promise<void>)();
		const targeted = deleteMutateAsync.mock.calls.map((c) => c[0]).sort();
		expect(targeted).toEqual(["p1", "p2"]);
	});
});
