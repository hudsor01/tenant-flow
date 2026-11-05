/**
 * @vitest-environment jsdom
 * The lease edit form opens on the lease's property and unit (66.2-39 fix
 * round 3, part 7).
 *
 * The form preselects its property from `lease.unit.property_id`, but the
 * edit page hands it `leaseQueries.detail`'s row, which carried the raw
 * `units` embed and no `unit`: the form opened with no property chosen, so
 * the unit picker had no units and showed its placeholder for a lease that
 * has a unit. The detail now maps the embed onto `LeaseDetailRow.unit`.
 */
import { screen, waitFor } from "@testing-library/react";
import { act, Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryChain } from "#test/mocks/supabase-query-mock";
import { DEFAULT_LEASE } from "#test/utils/test-data";
import { render } from "#test/utils/test-render";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ from: mockFrom }),
}));
vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: async () => ({ id: "owner-1" }),
}));
vi.mock("#hooks/use-current-user", () => ({
	useCurrentUser: () => ({ isLoading: false }),
}));

const DETAIL_ROW = {
	...DEFAULT_LEASE,
	id: "lease-1",
	unit_id: "unit-4b",
	lease_status: "draft",
	tenants: {
		id: "tenant-1",
		name: "Sam Lee",
		first_name: null,
		last_name: null,
		email: "sam@example.com",
	},
	units: {
		id: "unit-4b",
		unit_number: "4B",
		bedrooms: 2,
		bathrooms: 1,
		square_feet: null,
		property_id: "property-1",
		properties: {
			name: "Maple Court",
			address_line1: "1 Maple Ave",
			city: "Austin",
			state: "TX",
		},
	},
};

beforeEach(() => {
	mockFrom.mockReset();
	mockFrom.mockImplementation((table: string) => {
		if (table === "leases") {
			return createQueryChain({ data: DETAIL_ROW, error: null });
		}
		if (table === "properties") {
			return createQueryChain({
				data: [{ id: "property-1", name: "Maple Court", status: "active" }],
				error: null,
				count: 1,
			});
		}
		if (table === "units") {
			return createQueryChain({
				data: [
					{ id: "unit-2a", unit_number: "2A", property_id: "property-1" },
					{ id: "unit-4b", unit_number: "4B", property_id: "property-1" },
				],
				error: null,
			});
		}
		return createQueryChain({ data: [], error: null, count: 0 });
	});
});

describe("the lease edit page", () => {
	it("opens on the lease's property and unit", async () => {
		const { default: LeaseEditPage } = await import(
			"#app/(owner)/leases/[id]/edit/page"
		);
		// The page reads its id through `use(params)`, so it suspends once.
		await act(async () => {
			render(
				<Suspense fallback={null}>
					<LeaseEditPage params={Promise.resolve({ id: "lease-1" })} />
				</Suspense>,
			);
		});
		const property = await screen.findByRole("combobox", {
			name: /property/i,
		});
		await waitFor(() => expect(property.textContent).toBe("Maple Court"));
		const unit = screen.getByRole("combobox", { name: /unit/i });
		await waitFor(() => expect(unit.textContent).toBe("4B"));
	});
});
