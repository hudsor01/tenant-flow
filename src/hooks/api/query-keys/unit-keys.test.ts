/**
 * The unit list names each unit's property from its own embed (66.2-39 fix
 * round 3, cycle 2, F23).
 *
 * The units page looked each unit's property up in
 * `propertyQueries.selectOptions()`, which lists active properties only, so
 * a unit whose property the owner deleted (a property soft-delete does not
 * cascade to its units) still listed, with no property. The list now embeds
 * `properties(name, status)` through the unit's foreign key and names a
 * deleted property as the reports do: "Gamma Flats (deleted)".
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryChain } from "#test/mocks/supabase-query-mock";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ from: mockFrom }),
}));
vi.mock("#lib/postgrest-error-handler", () => ({
	handlePostgrestError: vi.fn(),
}));

import { unitQueries } from "./unit-keys";

const ROW = {
	id: "u1",
	property_id: "p1",
	owner_user_id: "owner-1",
	unit_number: "2B",
	bedrooms: 2,
	bathrooms: 1,
	square_feet: 850,
	rent_amount: 1500,
	rent_currency: "USD",
	rent_period: "month",
	status: "occupied",
	created_at: "2026-01-01T00:00:00Z",
	updated_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe("unitQueries.list", () => {
	it("embeds each unit's property and names a deleted one as deleted", async () => {
		const chain = createQueryChain({
			data: [
				{ ...ROW, properties: { name: "Maple Court", status: "active" } },
				{
					...ROW,
					id: "u2",
					property_id: "p2",
					properties: { name: "Gamma Flats", status: "inactive" },
				},
			],
			count: 2,
		});
		mockFrom.mockReturnValue(chain);

		const result = await unitQueries
			.list({ limit: 100 })
			.queryFn?.({} as never);

		expect(mockFrom).toHaveBeenCalledWith("units");
		expect(chain.select).toHaveBeenCalledWith(
			expect.stringMatching(/, properties\(name, status\)$/),
			{ count: "exact" },
		);
		expect(chain.neq).toHaveBeenCalledWith("status", "inactive");
		expect(result?.data.map((unit) => [unit.id, unit.propertyName])).toEqual([
			["u1", "Maple Court"],
			["u2", "Gamma Flats (deleted)"],
		]);
		expect(result?.data[0]).not.toHaveProperty("properties");
		expect(result?.data[0]).toMatchObject(ROW);
	});
});
