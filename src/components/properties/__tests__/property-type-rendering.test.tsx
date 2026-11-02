/**
 * A property's type on the properties list reads as stored, through the one
 * label map (66.2-39 fix round 1, part P). The list's mapper read the stored
 * type into a five-value union and fell back to "single_family" for anything
 * else, so a COMMERCIAL or OTHER property (both offered by the property form)
 * printed "Single Family", matched the Single Family filter and opened the bulk
 * edit dialog on Single Family; the filter and the dialog offered neither type.
 */
import type { VirtualItem } from "@tanstack/react-virtual";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { transformToPropertyItem } from "#app/(owner)/properties/components/property-transforms";
import { TooltipProvider } from "#components/ui/tooltip";
import { usePropertiesStore } from "#stores/properties-store";
import type { Property } from "#types/core";
import { PropertyBulkEditDialog } from "../property-bulk-edit-dialog";
import { PropertyTableRow } from "../property-table-row";
import type { ColumnId } from "../property-table-types";
import { PropertyToolbar } from "../property-toolbar";
import type { PropertiesProps, PropertyItem } from "../types";

const updateMutateAsync = vi.fn().mockResolvedValue(undefined);
vi.mock("#hooks/api/use-property-mutations", () => ({
	useDeletePropertyMutation: () => ({ mutateAsync: vi.fn() }),
	useUpdatePropertyMutation: () => ({ mutateAsync: updateMutateAsync }),
}));

function stored(id: string, propertyType: string): Property {
	return {
		acquisition_cost: null,
		acquisition_date: null,
		address_line1: "1 Main St",
		address_line2: null,
		city: "Austin",
		country: "US",
		created_at: "2026-01-01T00:00:00Z",
		date_sold: null,
		id,
		name: `Property ${id}`,
		owner_user_id: "owner-1",
		postal_code: "78701",
		property_type: propertyType,
		sale_price: null,
		search_vector: null,
		state: "TX",
		status: "active",
		updated_at: "2026-01-01T00:00:00Z",
	};
}

function item(id: string, propertyType: string): PropertyItem {
	return transformToPropertyItem(stored(id, propertyType), [], undefined);
}

const ROW: VirtualItem = {
	index: 0,
	start: 0,
	size: 64,
	end: 64,
	key: 0,
	lane: 0,
};

function typeCellText(property: PropertyItem): string {
	render(
		<TooltipProvider>
			<table>
				<tbody>
					<PropertyTableRow
						property={property}
						virtualRow={ROW}
						isSelected={false}
						visibleColumns={new Set<ColumnId>(["property"])}
						onSelectRow={vi.fn()}
						onView={undefined}
						onEdit={undefined}
						onDelete={undefined}
					/>
				</tbody>
			</table>
		</TooltipProvider>,
	);
	const name = screen.getByText(property.name);
	const text = name.nextElementSibling?.textContent ?? "";
	cleanup();
	return text;
}

describe("a property's type on the properties list", () => {
	afterEach(() => {
		cleanup();
		usePropertiesStore.getState().reset();
		vi.clearAllMocks();
	});

	it.each([
		["COMMERCIAL", "Commercial"],
		["OTHER", "Other"],
		["commercial", "Commercial"],
		["single_family", "Single Family"],
		["multi_family", "Multi Family"],
		["MULTI_UNIT", "Multi Family"],
		["duplex", "duplex"],
	])("stored %s reads %s in its row", (stored, label) => {
		expect(typeCellText(item("p1", stored))).toBe(label);
	});

	it("filters by every type the form offers, and lists an unknown type under All only", async () => {
		const { Properties } = await import("../properties");
		const properties = [
			item("c", "COMMERCIAL"),
			item("o", "OTHER"),
			item("s", "SINGLE_FAMILY"),
			item("u", "duplex"),
		];
		const props = {
			properties,
			summary: {
				totalProperties: 4,
				totalUnits: 4,
				occupiedUnits: 0,
				availableUnits: 4,
				maintenanceUnits: 0,
				overallOccupancyRate: 0,
				totalMonthlyRevenue: 0,
			},
			onAddProperty: vi.fn(),
		} satisfies PropertiesProps;
		usePropertiesStore.setState({ viewMode: "table" });
		const { rerender } = render(<Properties {...props} />);

		const filter = screen.getByLabelText("Filter by property type");
		const offered = within(filter)
			.getAllByRole("option")
			.map((option) => option.textContent);
		expect(offered).toEqual([
			"All Types",
			"Single Family",
			"Multi Family",
			"Apartment",
			"Commercial",
			"Condo",
			"Townhouse",
			"Other",
		]);

		for (const [type, expected] of [
			["COMMERCIAL", "1 property"],
			["OTHER", "1 property"],
			["SINGLE_FAMILY", "1 property"],
			["all", "4 properties"],
		] as const) {
			usePropertiesStore.setState({ typeFilter: type });
			rerender(<Properties {...props} />);
			const toolbar = screen.getByLabelText(
				"Filter by property type",
			).parentElement;
			expect(toolbar).not.toBeNull();
			expect(
				within(toolbar as HTMLElement).getByText(expected),
			).toBeInTheDocument();
		}
	});

	it("opens bulk edit on the first property's own type, and asks for one it does not know", async () => {
		const { useBulkHandlers } = await import("../properties-filters");
		const openBulkEdit = vi.fn();
		for (const [storedType, initial] of [
			["COMMERCIAL", "COMMERCIAL"],
			["other", "OTHER"],
			["duplex", null],
		] as const) {
			const property = item("p1", storedType);
			const { handleBulkEditOpen } = useBulkHandlers(
				new Set(["p1"]),
				[property],
				openBulkEdit,
				{ mutateAsync: vi.fn() },
				vi.fn(),
			);
			handleBulkEditOpen();
			expect(openBulkEdit).toHaveBeenLastCalledWith("active", initial);
		}
	});

	it("offers every type in bulk edit and applies none until one is chosen", () => {
		const onSubmit = vi.fn();
		render(
			<PropertyBulkEditDialog
				open
				selectedCount={1}
				bulkEditStatus="active"
				bulkEditType={null}
				applyBulkStatus={false}
				applyBulkType
				isSaving={false}
				onOpenChange={vi.fn()}
				onStatusChange={vi.fn()}
				onTypeChange={vi.fn()}
				onApplyStatusChange={vi.fn()}
				onApplyTypeChange={vi.fn()}
				onSubmit={onSubmit}
			/>,
		);
		const select = screen.getByLabelText("Property type");
		expect(
			within(select)
				.getAllByRole("option")
				.map((option) => option.textContent),
		).toEqual([
			"Select a type",
			"Single Family",
			"Multi Family",
			"Apartment",
			"Commercial",
			"Condo",
			"Townhouse",
			"Other",
		]);
		expect(screen.getByRole("button", { name: "Apply to 1" })).toBeDisabled();
	});
});

describe("the property toolbar's type filter", () => {
	afterEach(() => cleanup());

	it("names the type it filters by, never a type outside the set", () => {
		const onTypeFilterChange = vi.fn();
		render(
			<PropertyToolbar
				searchQuery=""
				statusFilter="all"
				typeFilter="all"
				viewMode="table"
				filteredCount={0}
				onSearchChange={vi.fn()}
				onStatusFilterChange={vi.fn()}
				onTypeFilterChange={onTypeFilterChange}
				onViewModeChange={vi.fn()}
			/>,
		);
		const filter = screen.getByLabelText<HTMLSelectElement>(
			"Filter by property type",
		);
		filter.value = "OTHER";
		filter.dispatchEvent(new Event("change", { bubbles: true }));
		expect(onTypeFilterChange).toHaveBeenLastCalledWith("OTHER");
	});
});
