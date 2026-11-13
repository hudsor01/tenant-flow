/**
 * Vendor assignment on maintenance requests: the BEFORE trigger
 * trg_maintenance_request_vendor_rules (migration *_maintenance_vendor_assignment).
 *
 *  - A request's vendor must be one of the request owner's vendors. The
 *    UPDATE/INSERT policies check only the owner (and the unit on insert) and
 *    the foreign key accepts any vendor id, so this is the only guard against
 *    owner A pointing a request at owner B's vendor: 23514, row unchanged.
 *  - A vendor set on an open request moves it to assigned (insert or update);
 *    the vendor cleared from an assigned request moves it to
 *    needs_reassignment, including when the vendor is deleted (the foreign
 *    key's ON DELETE SET NULL is an UPDATE the trigger sees). A write that sets
 *    the status itself keeps the status it sets; changing vendors keeps it.
 *
 * Fixture chain under owner A through the authenticated client (property ->
 * unit -> tenant -> vendors -> requests), as expenses.rls.test.ts builds it;
 * owner B gets one vendor. A failed fixture throws: nothing here skips.
 * Teardown deletes child before parent.
 */

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

function required<T>(
	result: { data: T; error: PostgrestError | null },
	what: string,
): NonNullable<T> {
	const { data, error } = result;
	if (error || data === null || data === undefined) {
		throw new Error(`fixture ${what} failed: ${error?.message ?? "no row"}`);
	}
	return data;
}

describe("Maintenance vendor assignment — ownership and status rules", () => {
	let clientA: SupabaseClient;
	let clientB: SupabaseClient;
	let ownerAId: string;
	let ownerBId: string;

	let propertyId: string;
	let unitId: string;
	let tenantId: string;
	let vendorA1: string;
	let vendorA2: string;
	let vendorB: string;
	const vendorIds: string[] = [];
	const requestIds: string[] = [];

	async function newRequest(fields: Record<string, unknown> = {}) {
		const row = required(
			await clientA
				.from("maintenance_requests")
				.insert({
					owner_user_id: ownerAId,
					unit_id: unitId,
					tenant_id: tenantId,
					title: "Vendor assignment test",
					description: "Vendor assignment integration test request",
					priority: "normal",
					status: "open",
					...fields,
				})
				.select("id, status, vendor_id")
				.single(),
			"maintenance request",
		);
		requestIds.push(row.id);
		return row;
	}

	async function update(id: string, fields: Record<string, unknown>) {
		return clientA
			.from("maintenance_requests")
			.update(fields)
			.eq("id", id)
			.select("id, status, vendor_id")
			.single();
	}

	async function newVendor(
		client: SupabaseClient,
		ownerId: string,
		name: string,
	) {
		const row = required(
			await client
				.from("vendors")
				.insert({ owner_user_id: ownerId, name, trade: "plumbing" })
				.select("id")
				.single(),
			`vendor ${name}`,
		);
		vendorIds.push(row.id);
		return row.id;
	}

	beforeAll(async () => {
		const { ownerA, ownerB } = getTestCredentials();
		clientA = await createTestClient(ownerA.email, ownerA.password);
		clientB = await createTestClient(ownerB.email, ownerB.password);
		ownerAId = (await clientA.auth.getUser()).data.user!.id;
		ownerBId = (await clientB.auth.getUser()).data.user!.id;

		const stamp = Date.now();
		propertyId = required(
			await clientA
				.from("properties")
				.insert({
					name: "Vendor Assignment Test Property",
					address_line1: "1 Vendor St",
					city: "Testville",
					state: "TX",
					postal_code: "00000",
					country: "US",
					property_type: "single_family",
					owner_user_id: ownerAId,
				})
				.select("id")
				.single(),
			"property",
		).id;
		unitId = required(
			await clientA
				.from("units")
				.insert({
					property_id: propertyId,
					unit_number: `VND-${stamp}`,
					bedrooms: 1,
					bathrooms: 1,
					rent_amount: 1000,
					status: "available",
					owner_user_id: ownerAId,
				})
				.select("id")
				.single(),
			"unit",
		).id;
		tenantId = required(
			await clientA
				.from("tenants")
				.insert({
					email: `vendor-assignment-test-${stamp}@example.com`,
					first_name: "Vendor",
					last_name: "Assignment",
					status: "active",
					owner_user_id: ownerAId,
				})
				.select("id")
				.single(),
			"tenant",
		).id;

		vendorA1 = await newVendor(clientA, ownerAId, `Vendor A1 ${stamp}`);
		vendorA2 = await newVendor(clientA, ownerAId, `Vendor A2 ${stamp}`);
		vendorB = await newVendor(clientB, ownerBId, `Vendor B ${stamp}`);
	});

	afterAll(async () => {
		if (requestIds.length > 0) {
			await clientA.from("maintenance_requests").delete().in("id", requestIds);
		}
		await clientA.from("vendors").delete().in("id", vendorIds);
		await clientB.from("vendors").delete().in("id", vendorIds);
		if (unitId) await clientA.from("units").delete().eq("id", unitId);
		if (propertyId)
			await clientA.from("properties").delete().eq("id", propertyId);
		if (tenantId) await clientA.from("tenants").delete().eq("id", tenantId);
	});

	it("rejects another owner's vendor on an update, and leaves the request as it was", async () => {
		const request = await newRequest();
		const { data, error } = await update(request.id, { vendor_id: vendorB });
		expect(data).toBeNull();
		expect(error?.code).toBe("23514");

		const after = required(
			await clientA
				.from("maintenance_requests")
				.select("status, vendor_id")
				.eq("id", request.id)
				.single(),
			"re-read",
		);
		expect(after).toEqual({ status: "open", vendor_id: null });
	});

	it("rejects another owner's vendor on an insert", async () => {
		const { data, error } = await clientA
			.from("maintenance_requests")
			.insert({
				owner_user_id: ownerAId,
				unit_id: unitId,
				tenant_id: tenantId,
				title: "Vendor assignment test",
				description: "Vendor assignment integration test request",
				priority: "normal",
				status: "open",
				vendor_id: vendorB,
			})
			.select("id")
			.single();
		if (data) requestIds.push(data.id);
		expect(data).toBeNull();
		expect(error?.code).toBe("23514");
	});

	it("assigns an open request its vendor, and needs reassignment when the vendor is cleared", async () => {
		const request = await newRequest();
		const assigned = required(
			await update(request.id, { vendor_id: vendorA1 }),
			"assign",
		);
		expect(assigned).toMatchObject({ status: "assigned", vendor_id: vendorA1 });

		const changed = required(
			await update(request.id, { vendor_id: vendorA2 }),
			"change vendor",
		);
		expect(changed).toMatchObject({ status: "assigned", vendor_id: vendorA2 });

		const cleared = required(
			await update(request.id, { vendor_id: null }),
			"clear vendor",
		);
		expect(cleared).toMatchObject({
			status: "needs_reassignment",
			vendor_id: null,
		});
	});

	it("keeps a status the same write sets, and a status past assigned", async () => {
		const request = await newRequest();
		const explicit = required(
			await update(request.id, { vendor_id: vendorA1, status: "in_progress" }),
			"assign with a status",
		);
		expect(explicit).toMatchObject({
			status: "in_progress",
			vendor_id: vendorA1,
		});

		const cleared = required(
			await update(request.id, { vendor_id: null }),
			"clear an in-progress vendor",
		);
		expect(cleared).toMatchObject({ status: "in_progress", vendor_id: null });
	});

	it("creates a request with a vendor as assigned", async () => {
		const request = await newRequest({ vendor_id: vendorA1 });
		expect(request).toMatchObject({ status: "assigned", vendor_id: vendorA1 });
	});

	it("clears a deleted vendor from its requests, and an assigned one needs reassignment", async () => {
		const doomed = await newVendor(
			clientA,
			ownerAId,
			`Vendor A3 ${Date.now()}`,
		);
		const request = await newRequest({ vendor_id: doomed });
		expect(request.status).toBe("assigned");

		const { error } = await clientA.from("vendors").delete().eq("id", doomed);
		expect(error).toBeNull();

		const after = required(
			await clientA
				.from("maintenance_requests")
				.select("status, vendor_id")
				.eq("id", request.id)
				.single(),
			"re-read",
		);
		expect(after).toEqual({ status: "needs_reassignment", vendor_id: null });
	});

	it("embeds the vendor for its owner and shows owner B nothing", async () => {
		const request = await newRequest({ vendor_id: vendorA1 });
		const own = required(
			await clientA
				.from("maintenance_requests")
				.select("vendor:vendor_id(name, trade)")
				.eq("id", request.id)
				.single(),
			"embed",
		);
		expect(own.vendor).toMatchObject({ trade: "plumbing" });

		const { data } = await clientB
			.from("maintenance_requests")
			.select("id")
			.eq("id", request.id);
		expect(data).toEqual([]);
	});
});
