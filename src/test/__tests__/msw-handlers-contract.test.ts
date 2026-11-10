/**
 * The default MSW handlers answer each query and mutation with the row its
 * select returns, so its mapper accepts it (66.2-39 fix round 4, class D):
 * every call below goes through the real supabase-js client to the default
 * handlers, with nothing mocked.
 *
 * Maintenance: the PATCH handler answered with the request's own columns after
 * the update began selecting the detail's embeds, so
 * `maintenanceMutations.update()` threw "embed 'tenant' missing" through MSW
 * (G45), and the list row its handler serves mapped to a tenant the fixture it
 * is "the same request" as did not have (G46). Units and leases: the PR's
 * unit list reads each unit's property embed and its lease detail the tenant
 * and unit embeds, which the handlers did not serve (the list threw on the
 * property's name, the detail on the unit). Every GET handler answered a
 * `.single()` read with an array.
 */

import { QueryClient } from "@tanstack/react-query";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { leaseQueries } from "#hooks/api/query-keys/lease-keys";
import {
	maintenanceMutations,
	maintenanceQueries,
} from "#hooks/api/query-keys/maintenance-keys";
import {
	propertyMutations,
	propertyQueries,
} from "#hooks/api/query-keys/property-keys";
import { tenantQueries } from "#hooks/api/query-keys/tenant-keys";
import { tenantMutations } from "#hooks/api/query-keys/tenant-mutation-options";
import { unitMutations, unitQueries } from "#hooks/api/query-keys/unit-keys";
import { setQueryClientRef } from "#lib/supabase/get-cached-user";
import { enableMswServer } from "#test/mocks/msw/server";
import {
	DEFAULT_LEASE,
	DEFAULT_MAINTENANCE_REQUEST,
	DEFAULT_PROPERTY,
	DEFAULT_TENANT,
	DEFAULT_UNIT,
} from "#test/utils/test-data";

enableMswServer();

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});
const context = { client, meta: undefined };

/** The request's own columns: what the list row is, less its names. */
function ownColumns() {
	const {
		propertyName: _propertyName,
		unitNumber: _unitNumber,
		tenantName: _tenantName,
		...columns
	} = DEFAULT_MAINTENANCE_REQUEST;
	return columns;
}

beforeAll(() => {
	client.setQueryData(["auth", "user"], { id: "user-1" });
	setQueryClientRef(client);
});
afterAll(() => setQueryClientRef(null));

describe("the maintenance MSW handlers against the maintenance mappers", () => {
	it("serve the list a row that maps to DEFAULT_MAINTENANCE_REQUEST", async () => {
		const page = await client.query(maintenanceQueries.list());
		expect(page.data).toEqual([DEFAULT_MAINTENANCE_REQUEST]);
		expect(page.total).toBe(1);
	});

	it("serve the detail one row, with the tenant's email and phone", async () => {
		const detail = await client.query(
			maintenanceQueries.detail("maintenance-1"),
		);
		expect(detail).toEqual({
			...DEFAULT_MAINTENANCE_REQUEST,
			tenantEmail: "john.doe@example.com",
			tenantPhone: "555-0100",
		});
	});

	it("answer a create with the request's own columns", async () => {
		const created = await maintenanceMutations.create().mutationFn?.(
			{
				unit_id: "unit-1",
				tenant_id: "tenant-1",
				title: "Plumbing Issue",
				description: "Kitchen faucet has been dripping for the past week",
				priority: "medium",
			},
			context,
		);
		expect(created).toEqual(ownColumns());
	});

	it("answer an update with the detail's row, which replaces the cached detail", async () => {
		const updated = await maintenanceMutations
			.update()
			.mutationFn?.(
				{ id: "maintenance-1", data: { status: "in_progress" } },
				context,
			);
		expect(updated).toEqual({
			...DEFAULT_MAINTENANCE_REQUEST,
			tenantEmail: "john.doe@example.com",
			tenantPhone: "555-0100",
		});
	});

	it("answer a delete with no row", async () => {
		await expect(
			maintenanceMutations.delete().mutationFn?.("maintenance-1", context),
		).resolves.toBeUndefined();
	});
});

describe("the unit handlers against the unit queries", () => {
	it("serve the list each unit with its property's name", async () => {
		const page = await client.query(unitQueries.list());
		expect(page.data).toEqual([
			{ ...DEFAULT_UNIT, propertyName: "Test Property" },
		]);
	});

	it("serve a detail read one unit", async () => {
		expect(await client.query(unitQueries.detail("unit-1"))).toEqual(
			DEFAULT_UNIT,
		);
	});

	it("answer a create and an update with the unit", async () => {
		expect(
			await unitMutations.create().mutationFn?.(
				{
					property_id: "property-1",
					unit_number: "Apt 101",
					bedrooms: 2,
					bathrooms: 1,
					rent_amount: 1500,
				},
				context,
			),
		).toEqual(DEFAULT_UNIT);
		expect(
			await unitMutations
				.update()
				.mutationFn?.({ id: "unit-1", data: { bedrooms: 3 } }, context),
		).toEqual(DEFAULT_UNIT);
	});
});

describe("the lease handlers against the lease queries", () => {
	it("serve the list the lease row", async () => {
		const page = await client.query(leaseQueries.list());
		expect(page.data).toEqual([DEFAULT_LEASE]);
	});

	it("serve a detail read the lease with its tenant and its unit's property", async () => {
		expect(await client.query(leaseQueries.detail("lease-1"))).toEqual({
			...DEFAULT_LEASE,
			tenant: {
				id: "tenant-1",
				name: "Test Tenant",
				first_name: "Test",
				last_name: "Tenant",
				email: "tenant@example.com",
			},
			unit: {
				id: "unit-1",
				unit_number: "Apt 101",
				bedrooms: 2,
				bathrooms: 1,
				square_feet: 850,
				property_id: "property-1",
				property: {
					name: "Test Property",
					address_line1: "123 Main St",
					city: "San Francisco",
					state: "CA",
				},
			},
		});
	});
});

describe("the property and tenant handlers against their queries", () => {
	it("serve the property list, a detail read and a create", async () => {
		expect((await client.query(propertyQueries.list())).data).toEqual([
			DEFAULT_PROPERTY,
		]);
		expect(await client.query(propertyQueries.detail("property-1"))).toEqual(
			DEFAULT_PROPERTY,
		);
		expect(
			await propertyMutations.create().mutationFn?.(
				{
					name: "Test Property",
					address_line1: "123 Main St",
					city: "San Francisco",
					state: "CA",
					postal_code: "94102",
					property_type: "APARTMENT",
				},
				context,
			),
		).toEqual(DEFAULT_PROPERTY);
	});

	it("serve the tenant list, a detail read and an update", async () => {
		const page = await client.query(tenantQueries.list());
		expect(page.data[0]).toMatchObject({
			id: "tenant-1",
			email: "tenant@example.com",
		});
		expect(await client.query(tenantQueries.detail("tenant-1"))).toEqual(
			DEFAULT_TENANT,
		);
		expect(
			await tenantMutations
				.update()
				.mutationFn?.(
					{ id: "tenant-1", data: { first_name: "Test" } },
					context,
				),
		).toMatchObject({ id: "tenant-1", email: "tenant@example.com" });
	});
});
