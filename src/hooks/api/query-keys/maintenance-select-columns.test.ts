/**
 * The maintenance list and detail read no actual_cost (66.2-39 fix round 1,
 * part P): no form, mutation or function writes that column (spend is the
 * request's expenses, part N), so its read was dead; the column stays in the
 * database and in the generated types.
 */
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryChain } from "#test/mocks/supabase-query-mock";

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
});
