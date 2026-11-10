/**
 * The properties table names its selection checkboxes (66.2-39 fix round 4,
 * Part 8h; WCAG 4.1.2).
 *
 * Radix's Checkbox is a `<button role="checkbox">` whose only content is its
 * check icon, so it has no name of its own. The table's select-all and each
 * row's checkbox had none: the rendered ARIA snapshot read a bare "checkbox",
 * and axe's `button-name` failed all 15 of them on /properties in its table
 * view, at 320 and 1280. owner-axe never scans /properties, and the table view
 * is a client state no URL names. The select-all now names its scope and each
 * row's checkbox its property, as the grid view's cards already did.
 */
import type { VirtualItem } from "@tanstack/react-virtual";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { transformToPropertyItem } from "#app/(owner)/properties/components/property-transforms";
import { TooltipProvider } from "#components/ui/tooltip";
import { PropertyTable } from "../property-table";

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

function property(id: string, name: string) {
	return transformToPropertyItem(
		{
			acquisition_cost: null,
			acquisition_date: null,
			address_line1: "1 Main St",
			address_line2: null,
			city: "Austin",
			country: "US",
			created_at: "2026-01-01T00:00:00Z",
			date_sold: null,
			id,
			name,
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
}

describe("the properties table's selection checkboxes", () => {
	it("name the select-all's scope and each row's property", () => {
		render(
			<TooltipProvider>
				<PropertyTable
					properties={[
						property("p1", "Maple Court"),
						property("p2", "Riverside Gardens"),
					]}
					selectedRows={new Set()}
					onSelectRow={vi.fn()}
					onSelectAll={vi.fn()}
					onView={undefined}
					onEdit={undefined}
					onDelete={undefined}
				/>
			</TooltipProvider>,
		);
		const names = screen
			.getAllByRole("checkbox")
			.map((checkbox) => checkbox.getAttribute("aria-label"));
		expect(names).toEqual([
			"Select all properties",
			"Select Maple Court",
			"Select Riverside Gardens",
		]);
		expect(
			screen.getByRole("checkbox", { name: "Select all properties" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("checkbox", { name: "Select Riverside Gardens" }),
		).toBeInTheDocument();
	});
});
