/**
 * The properties table's Property column keeps a floor (66.2-39 fix round 1,
 * part Q).
 *
 * The three flexible columns (property, address, status) had no minimum and
 * shared what the fixed ones left: measured on the production build, 8.94 px
 * of name at 1280 and 6.11 px at 390, the name an ellipsis. The column now
 * keeps 14 rem below lg and 10 rem from lg and takes the rest; the status
 * column is sized to its badges; the address column shows from 2xl; and the
 * table is at least its columns' floors wide, so its own box scrolls below
 * that, never the page. Measured after: the whole name (88 px of "Maple
 * Court") at 1280 and 390, the 876 px box at 1280 with nothing to scroll.
 */
import type { VirtualItem } from "@tanstack/react-virtual";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { transformToPropertyItem } from "#app/(owner)/properties/components/property-transforms";
import { TooltipProvider } from "#components/ui/tooltip";
import { PropertyTable } from "../property-table";
import { PROPERTY_COLUMN_CLASS } from "../property-table-types";

vi.mock("#hooks/api/use-property-mutations", () => ({
	useDeletePropertyMutation: () => ({ mutateAsync: vi.fn() }),
	useUpdatePropertyMutation: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@tanstack/react-virtual", () => ({
	useVirtualizer: ({ count }: { count: number }) => ({
		getTotalSize: () => count * 64,
		getVirtualItems: (): VirtualItem[] =>
			Array.from({ length: count }, (_, index) => ({
				index,
				start: index * 64,
				size: 64,
				end: index * 64 + 64,
				key: index,
				lane: 0,
			})),
		measureElement: () => undefined,
	}),
}));

const NAME = "Maple Court Garden Apartments";

describe("the properties table's Property column", () => {
	it("keeps a floor below lg and from lg, never min-w-0", () => {
		expect(PROPERTY_COLUMN_CLASS.property).toContain("min-w-56");
		expect(PROPERTY_COLUMN_CLASS.property).toContain("lg:min-w-40");
		expect(PROPERTY_COLUMN_CLASS.property).not.toContain("min-w-0");
		expect(PROPERTY_COLUMN_CLASS.status).toContain("w-32");
		expect(PROPERTY_COLUMN_CLASS.status).toContain("shrink-0");
		expect(PROPERTY_COLUMN_CLASS.address).toContain("2xl:flex");
	});

	it("is at least its columns' floors wide, and names each property in full", () => {
		const property = transformToPropertyItem(
			{
				acquisition_cost: null,
				acquisition_date: null,
				address_line1: "1 Main St",
				address_line2: null,
				city: "Austin",
				country: "US",
				created_at: "2026-01-01T00:00:00Z",
				date_sold: null,
				id: "p1",
				name: NAME,
				owner_user_id: "owner-1",
				postal_code: "78701",
				property_type: "COMMERCIAL",
				sale_price: null,
				search_vector: null,
				state: "TX",
				status: "active",
				updated_at: "2026-01-01T00:00:00Z",
			},
			[],
			undefined,
		);
		render(
			<TooltipProvider>
				<PropertyTable
					properties={[property]}
					selectedRows={new Set()}
					onSelectRow={vi.fn()}
					onSelectAll={vi.fn()}
					onView={undefined}
					onEdit={undefined}
					onDelete={undefined}
				/>
			</TooltipProvider>,
		);
		expect(screen.getByRole("table").className).toContain("min-w-min");
		const name = screen.getByText(NAME);
		expect(name).toHaveAttribute("title", NAME);
		expect(name.className).toContain("truncate");
		const cell = name.closest("td");
		expect(cell?.className).toContain("min-w-56");
	});
});
