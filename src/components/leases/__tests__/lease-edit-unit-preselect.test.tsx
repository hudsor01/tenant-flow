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
 *
 * The pickers read capped lists (the 50 newest active properties and
 * tenants, a property's first 500 active units), so a lease on the 51st
 * tenant or property, or a deleted one, opened on a blank value (part 7b).
 * The form keeps the lease's own tenant, property and unit, from the
 * detail's embeds, in the options.
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

/**
 * What each picker's query returns. The property and tenant pickers read the
 * 50 newest active rows (`propertyQueries.list()`, `tenantQueries.list()`) and
 * the unit picker its property's first 500 active units
 * (`unitQueries.listByProperty`).
 */
interface PickerRows {
	properties: Array<{ id: string; name: string; status: string }>;
	tenants: Array<{
		id: string;
		name: string;
		email: string;
		status: string;
		lease_tenants: [];
	}>;
	units: Array<{ id: string; unit_number: string; property_id: string }>;
}

function mockPickers(rows: PickerRows) {
	mockFrom.mockReset();
	mockFrom.mockImplementation((table: string) => {
		if (table === "leases") {
			return createQueryChain({ data: DETAIL_ROW, error: null });
		}
		if (table === "properties") {
			return createQueryChain({
				data: rows.properties,
				error: null,
				count: rows.properties.length,
			});
		}
		if (table === "tenants") {
			return createQueryChain({
				data: rows.tenants,
				error: null,
				count: rows.tenants.length,
			});
		}
		if (table === "units") {
			return createQueryChain({ data: rows.units, error: null });
		}
		return createQueryChain({ data: [], error: null, count: 0 });
	});
}

beforeEach(() => {
	mockPickers({
		properties: [{ id: "property-1", name: "Maple Court", status: "active" }],
		tenants: [],
		units: [
			{ id: "unit-2a", unit_number: "2A", property_id: "property-1" },
			{ id: "unit-4b", unit_number: "4B", property_id: "property-1" },
		],
	});
});

async function renderEditPage() {
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
	return screen.findByRole("combobox", { name: /property/i });
}

describe("the lease edit page", () => {
	it("opens on the lease's property and unit", async () => {
		const property = await renderEditPage();
		await waitFor(() => expect(property.textContent).toBe("Maple Court"));
		const unit = screen.getByRole("combobox", { name: /unit/i });
		await waitFor(() => expect(unit.textContent).toBe("4B"));
	});

	it("names the lease's tenant, property and unit when the capped pickers leave them out", async () => {
		// A full page of 50 newer properties and tenants, and 500 other units on
		// the lease's property: the lease's own rows are on none of those pages.
		mockPickers({
			properties: Array.from({ length: 50 }, (_, i) => ({
				id: `property-new-${i}`,
				name: `Newer Property ${i}`,
				status: "active",
			})),
			tenants: Array.from({ length: 50 }, (_, i) => ({
				id: `tenant-new-${i}`,
				name: `Newer Tenant ${i}`,
				email: `newer-${i}@example.com`,
				status: "active",
				lease_tenants: [],
			})),
			units: Array.from({ length: 500 }, (_, i) => ({
				id: `unit-other-${i}`,
				unit_number: `X${i}`,
				property_id: "property-1",
			})),
		});
		const property = await renderEditPage();
		await waitFor(() => expect(property.textContent).toBe("Maple Court"));
		const unit = screen.getByRole("combobox", { name: /unit/i });
		await waitFor(() => expect(unit.textContent).toBe("4B"));
		const tenant = screen.getByRole("combobox", { name: /primary tenant/i });
		await waitFor(() => expect(tenant.textContent).toBe("Sam Lee"));
	});
});
