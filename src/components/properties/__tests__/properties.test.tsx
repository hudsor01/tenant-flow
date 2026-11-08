/**
 * Properties state-wiring tests (STATE-05): the prune effect reconciles the
 * selection against the fetched (active) list, and the bulk-delete guard only
 * targets still-listed ids so a soft-deleted property can't be resurrected.
 * Heavy children + mutations are mocked; PropertyActionBar is mocked to expose
 * its onBulkDelete so the action bar's Delete can be pressed directly.
 *
 * The bulk delete asks through the app's ConfirmDialog, not the browser's
 * `window.confirm` (66.2-39 fix round 4, Part 8g): the action bar's Delete
 * only opens it, naming the rows it will act on, and the deletes run only
 * from its Delete.
 */
import {
	act,
	cleanup,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
		addressLine1: "1 Main St",
		addressLine2: null,
		city: "Townsville",
		state: "TX",
		postalCode: "78701",
		propertyType: "single_family",
		status: "active",
		imageUrl: undefined,
		totalUnits: 1,
		occupiedUnits: 0,
		availableUnits: 1,
		maintenanceUnits: 0,
		occupancyRate: 0,
		monthlyRevenue: 0,
	};
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

	async function pressBulkDelete() {
		await act(async () => {
			(actionBarProps.onBulkDelete as () => void)();
		});
		return screen.getByRole("alertdialog");
	}

	it("opens the confirmation on the action bar's Delete, and deletes nothing", async () => {
		usePropertiesStore.setState({ selectedRows: new Set(["p1", "p2"]) });
		await renderProperties([property("p1"), property("p2")]);
		const dialog = await pressBulkDelete();
		expect(within(dialog).getByText("Delete 2 properties?")).toBeVisible();
		expect(
			within(dialog).getByText(
				"This marks the 2 selected properties as inactive, so they leave your property list.",
			),
		).toBeVisible();
		expect(deleteMutateAsync).not.toHaveBeenCalled();
	});

	it("names the one property it will delete", async () => {
		usePropertiesStore.setState({ selectedRows: new Set(["p1"]) });
		await renderProperties([property("p1"), property("p2")]);
		const dialog = await pressBulkDelete();
		expect(within(dialog).getByText("Delete 1 property?")).toBeVisible();
		expect(
			within(dialog).getByText(
				'This marks "Property p1" as inactive, so it leaves your property list.',
			),
		).toBeVisible();
	});

	it("deletes each still-listed property once, only from the confirmation's Delete", async () => {
		usePropertiesStore.setState({ selectedRows: new Set(["p1", "p2"]) });
		await renderProperties([property("p1"), property("p2")]);
		const dialog = await pressBulkDelete();
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Delete" }),
		);
		const targeted = deleteMutateAsync.mock.calls.map((c) => c[0]).sort();
		expect(targeted).toEqual(["p1", "p2"]);
		await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
		expect(usePropertiesStore.getState().selectedRows.size).toBe(0);
	});

	it("deletes nothing on Cancel, and keeps the selection", async () => {
		usePropertiesStore.setState({ selectedRows: new Set(["p1", "p2"]) });
		await renderProperties([property("p1"), property("p2")]);
		const dialog = await pressBulkDelete();
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Cancel" }),
		);
		await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
		expect(deleteMutateAsync).not.toHaveBeenCalled();
		expect([...usePropertiesStore.getState().selectedRows].sort()).toEqual([
			"p1",
			"p2",
		]);
	});

	it("skips a named property that left the list while the confirmation was open", async () => {
		usePropertiesStore.setState({ selectedRows: new Set(["p1", "p2"]) });
		const { Properties } = await import("../properties");
		const props: Omit<PropertiesProps, "properties"> = {
			summary: {} as PropertiesProps["summary"],
			onAddProperty: vi.fn(),
		};
		const { rerender } = render(
			<Properties {...props} properties={[property("p1"), property("p2")]} />,
		);
		await pressBulkDelete();
		rerender(<Properties {...props} properties={[property("p1")]} />);
		await userEvent.click(
			within(screen.getByRole("alertdialog")).getByRole("button", {
				name: "Delete",
			}),
		);
		expect(deleteMutateAsync.mock.calls.map((c) => c[0])).toEqual(["p1"]);
	});
});
