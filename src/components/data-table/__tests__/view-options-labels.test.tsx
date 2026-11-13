/**
 * A table's "View" menu names each column as its header does (66.2-39 fix
 * round 3, part 6c). DataTableViewOptions lists a hideable column by its
 * `meta.label`, else by its id, so a column without a label was offered by
 * its key: the maintenance table's menu read "title", "properties", "status"
 * and "priority", the units list's "square_feet" and the units page's
 * "property_id". The sweep covered every table that renders DataTableToolbar
 * (which carries the menu) or DataTableViewOptions: these three were the ones
 * with an unlabeled column.
 *
 * @vitest-environment jsdom
 */
import {
	type ColumnDef,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { unitColumns } from "#app/(owner)/properties/units/columns";
import { DataTableViewOptions } from "#components/data-table/data-table-view-options";
import { columns as maintenanceColumns } from "#components/maintenance/table/columns";
import { render } from "#test/utils/test-render";

vi.mock("#lib/supabase/client", () => ({ createClient: () => ({}) }));

function ViewMenu<TData>({ columns }: { columns: ColumnDef<TData>[] }) {
	const table = useReactTable({
		data: [],
		columns,
		getCoreRowModel: getCoreRowModel(),
	});
	return <DataTableViewOptions table={table} />;
}

async function menuItems<TData>(
	columns: ColumnDef<TData>[],
): Promise<string[]> {
	render(<ViewMenu columns={columns} />);
	await userEvent.click(screen.getByRole("combobox", { name: "View columns" }));
	const list = await screen.findByRole("listbox");
	return within(list)
		.getAllByRole("option")
		.map((option) => option.textContent ?? "");
}

describe("each table's View menu names its columns", () => {
	it("on the maintenance table", async () => {
		expect(await menuItems(maintenanceColumns)).toEqual([
			"Request",
			"Location",
			"Vendor",
			"Status",
			"Priority",
		]);
	});

	it("on the units list", async () => {
		// The unit column cannot be hidden, so the menu does not offer it.
		expect(await menuItems(unitColumns)).toEqual([
			"Bedrooms",
			"Bathrooms",
			"Size",
			"Rent",
			"Status",
		]);
	});

	it("on the units page", async () => {
		vi.doMock("@tanstack/react-query", async () => {
			const actual = await vi.importActual<
				typeof import("@tanstack/react-query")
			>("@tanstack/react-query");
			return {
				...actual,
				useQuery: () => ({
					data: {
						data: [
							{
								id: "u1",
								property_id: "p1",
								owner_user_id: "owner-1",
								unit_number: "4B",
								bedrooms: 2,
								bathrooms: 1,
								square_feet: 850,
								rent_amount: 1500,
								rent_currency: "USD",
								rent_period: "month",
								status: "occupied",
								created_at: "2026-01-01T00:00:00Z",
								updated_at: "2026-01-01T00:00:00Z",
								propertyName: "Maple Court",
							},
						],
						total: 1,
					},
					isLoading: false,
					error: null,
				}),
			};
		});
		vi.doMock("#hooks/api/use-unit", () => ({
			useDeleteUnitMutation: () => ({ mutate: vi.fn(), isPending: false }),
		}));
		const { default: UnitsPage } = await import("#app/(owner)/units/page");
		render(<UnitsPage />);
		await userEvent.click(
			screen.getByRole("combobox", { name: "View columns" }),
		);
		const list = await screen.findByRole("listbox");
		expect(
			within(list)
				.getAllByRole("option")
				.map((option) => option.textContent),
		).toEqual([
			"Unit Number",
			"Property",
			"Bedrooms",
			"Bathrooms",
			"Square Feet",
			"Rent Amount",
			"Status",
		]);
		vi.doUnmock("@tanstack/react-query");
		vi.doUnmock("#hooks/api/use-unit");
	});
});
