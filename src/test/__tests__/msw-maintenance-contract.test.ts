/**
 * The maintenance MSW handlers answer each query and mutation with a row its
 * mapper accepts (66.2-39 fix round 4, class D): every call below goes through
 * the real supabase-js client to the default handlers, with nothing mocked.
 *
 * The PATCH handler answered with the request's own columns after the update
 * began selecting the detail's embeds, so `maintenanceMutations.update()`
 * threw "embed 'units' missing" through MSW (G45); the GET handler answered a
 * `.single()` detail read with the list's array. And the list row its handler
 * serves mapped to a tenant the fixture it is "the same request" as did not
 * have (G46).
 */

import { QueryClient } from "@tanstack/react-query";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	maintenanceMutations,
	maintenanceQueries,
} from "#hooks/api/query-keys/maintenance-keys";
import { setQueryClientRef } from "#lib/supabase/get-cached-user";
import { enableMswServer } from "#test/mocks/msw/server";
import { DEFAULT_MAINTENANCE_REQUEST } from "#test/utils/test-data";

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

describe("the maintenance MSW handlers against the maintenance mappers", () => {
	beforeAll(() => {
		client.setQueryData(["auth", "user"], { id: "user-1" });
		setQueryClientRef(client);
	});
	afterAll(() => setQueryClientRef(null));

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
