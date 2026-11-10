/**
 * The Unit Management table names each unit's property from the unit list's
 * own embed (66.2-39 fix round 3, the F23 class). The page cast the list's
 * rows to UnitRowWithRelations, whose `property` no query fills, so the
 * Unit Details cell never showed a property at all.
 */

import {
	QueryClient,
	QueryClientProvider,
	queryOptions,
} from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { UnitListRow } from "#hooks/api/query-keys/unit-keys";

const UNIT_ROW = {
	id: "u1",
	property_id: "p9",
	owner_user_id: "o1",
	unit_number: "2B",
	bedrooms: 2,
	bathrooms: 1,
	square_feet: 850,
	rent_amount: 1450,
	rent_currency: "USD",
	rent_period: "monthly",
	status: "occupied",
	created_at: "2026-01-01T00:00:00Z",
	updated_at: "2026-01-01T00:00:00Z",
};

const { rows } = vi.hoisted(() => ({ rows: { current: [] as unknown[] } }));

vi.mock("next/dynamic", () => ({
	default: () => () => createElement("div", { "data-testid": "chart" }),
}));
vi.mock("#hooks/api/query-keys/unit-keys", () => ({
	unitQueries: {
		list: () =>
			queryOptions({
				queryKey: ["test", "units"],
				queryFn: async () => ({
					data: rows.current,
					total: rows.current.length,
				}),
			}),
		stats: () =>
			queryOptions({
				queryKey: ["test", "unit-stats"],
				queryFn: async () => ({
					total: 1,
					occupied: 1,
					vacant: 0,
					maintenance: 0,
					occupancyRate: 100,
				}),
			}),
	},
}));
vi.mock("#hooks/api/query-keys/property-keys", () => ({
	propertyQueries: {
		list: () =>
			queryOptions({
				queryKey: ["test", "properties"],
				queryFn: async () => ({ data: [] }),
			}),
	},
}));
vi.mock("#hooks/api/use-unit", () => ({
	useCreateUnitMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
	useDeleteUnitMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import UnitsPage from "../page";

function renderPage(list: UnitListRow[]) {
	rows.current = list;
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, staleTime: Infinity } },
	});
	return render(
		createElement(QueryClientProvider, { client }, createElement(UnitsPage)),
	);
}

describe("the units table's property line", () => {
	it("names the property the list embeds, a deleted one included", async () => {
		renderPage([{ ...UNIT_ROW, propertyName: "Gamma Flats (deleted)" }]);
		expect(await screen.findByText("Unit 2B")).toBeInTheDocument();
		expect(screen.getByText("Gamma Flats (deleted)")).toBeInTheDocument();
	});

	it("prints no property line for a unit with no property row", async () => {
		renderPage([{ ...UNIT_ROW, propertyName: null }]);
		const unit = await screen.findByText("Unit 2B");
		expect(unit.parentElement?.textContent).toBe("Unit 2B");
	});
});
