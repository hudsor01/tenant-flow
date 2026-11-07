/**
 * The maintenance list and detail read no actual_cost (66.2-39 fix round 1,
 * part P): no form, mutation or function writes that column (spend is the
 * request's expenses, part N), so its read was dead; the column stays in the
 * database and in the generated types.
 *
 * The list embeds what it shows each request by (fix round 3, part 6c): the
 * unit's number, the unit's property and the tenant's name, through the
 * request's own foreign keys. Its rows carried none, and the board and table
 * printed the unit's id and "Unassigned" in their place.
 */
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryChain } from "#test/mocks/supabase-query-mock";
import { MAINTENANCE_LIST_POSTGREST_ROW } from "#test/utils/test-data";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ from: mockFrom }),
}));
vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: async () => ({ id: "owner-1" }),
}));

import { maintenanceQueries } from "./maintenance-keys";

describe("the maintenance queries' columns", () => {
	beforeEach(() => mockFrom.mockReset());

	it("select every column the app reads, and not actual_cost", async () => {
		const chain = createQueryChain({ data: [], error: null, count: 0 });
		mockFrom.mockReturnValue(chain);
		await new QueryClient().query(maintenanceQueries.list());
		const columns = String(chain.select?.mock.calls[0]?.[0] ?? "");
		expect(columns).toContain("estimated_cost");
		expect(columns).not.toContain("actual_cost");
	});

	it("embeds the unit, its property and the tenant, and maps their names", async () => {
		const chain = createQueryChain({
			data: [MAINTENANCE_LIST_POSTGREST_ROW],
			error: null,
			count: 1,
		});
		mockFrom.mockReturnValue(chain);
		const page = await new QueryClient().query(maintenanceQueries.list());
		const columns = String(chain.select?.mock.calls[0]?.[0] ?? "");
		expect(columns).toContain(
			"units(unit_number, property_id, properties(name, status))",
		);
		expect(columns).toContain("tenant:tenant_id(name, first_name, last_name)");
		expect(columns).not.toContain("units!inner");
		expect(page.data[0]).toMatchObject({
			propertyName: "Test Property",
			unitNumber: "Apt 101",
			tenantName: "John Doe",
		});
		expect(chain.range).toHaveBeenCalledWith(0, 49);
	});

	it("inner-joins the unit when it filters by property", async () => {
		const chain = createQueryChain({ data: [], error: null, count: 0 });
		mockFrom.mockReturnValue(chain);
		await new QueryClient().query(
			maintenanceQueries.list({ property_id: "property-1" }),
		);
		const columns = String(chain.select?.mock.calls[0]?.[0] ?? "");
		expect(columns).toContain(
			"units!inner(unit_number, property_id, properties(name, status))",
		);
		expect(chain.eq).toHaveBeenCalledWith("units.property_id", "property-1");
	});
});
