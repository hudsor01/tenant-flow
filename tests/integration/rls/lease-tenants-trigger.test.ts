/**
 * Integration test for LEASE-02: the `create_primary_lease_tenant`
 * AFTER INSERT trigger on `public.leases`.
 *
 * Why this exists: UI create paths (lease-creation-wizard + the lease-form
 * `leaseMutations.create`) insert only lease columns and never wrote the
 * `lease_tenants` join row, so a UI-created lease was invisible on its tenant
 * and that tenant could be soft-deleted despite an active lease. Migration
 * `20260705003811_lease_tenants_primary_trigger` adds an AFTER INSERT trigger
 * that creates the primary `lease_tenants` row on EVERY create path. This test
 * pins that a plain PostgREST insert into `leases` (the lease-form path, which
 * does NOT call `bulk_import_create_lease`) yields exactly one primary
 * `lease_tenants` row, and that the row is owner-isolated.
 *
 * Pattern matches `bulk-import-create-lease.test.ts` (dual client, fixture
 * create + cleanup, graceful skip if env missing).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

describe("LEASE-02 create_primary_lease_tenant trigger", () => {
	let clientA: SupabaseClient;
	let clientB: SupabaseClient;
	let ownerAId: string;

	let propertyA: { id: string } | null = null;
	let unitA: { id: string } | null = null;
	let tenantA: { id: string } | null = null;
	const insertedLeaseIds: string[] = [];

	beforeAll(async () => {
		const { ownerA, ownerB } = getTestCredentials();
		clientA = await createTestClient(ownerA.email, ownerA.password);
		clientB = await createTestClient(ownerB.email, ownerB.password);

		const {
			data: { user: userA },
		} = await clientA.auth.getUser();
		ownerAId = userA!.id;

		const { data: pA } = await clientA
			.from("properties")
			.insert({
				name: "Trigger Test Property A",
				address_line1: "10 Trigger St",
				city: "Testville",
				state: "CA",
				postal_code: "94105",
				country: "US",
				property_type: "APARTMENT",
				owner_user_id: ownerAId,
			})
			.select("id")
			.single();
		propertyA = pA ? { id: pA.id } : null;

		if (propertyA) {
			const { data: uA } = await clientA
				.from("units")
				.insert({
					property_id: propertyA.id,
					unit_number: "TRG-A-101",
					bedrooms: 1,
					bathrooms: 1,
					rent_amount: 1500,
					owner_user_id: ownerAId,
				})
				.select("id")
				.single();
			unitA = uA ? { id: uA.id } : null;
		}

		const { data: tA } = await clientA
			.from("tenants")
			.insert({
				email: `trg-test-tenant-a-${Date.now()}@example.com`,
				first_name: "Trigger",
				last_name: "TestA",
				owner_user_id: ownerAId,
			})
			.select("id")
			.single();
		tenantA = tA ? { id: tA.id } : null;
	});

	afterAll(async () => {
		// Hard-delete leases first (lease_tenants cascades), then fixtures.
		for (const id of insertedLeaseIds) {
			await clientA.from("leases").delete().eq("id", id);
		}
		if (unitA) await clientA.from("units").delete().eq("id", unitA.id);
		if (tenantA) await clientA.from("tenants").delete().eq("id", tenantA.id);
		if (propertyA)
			await clientA.from("properties").delete().eq("id", propertyA.id);
	});

	it("a PostgREST-created lease (lease-form path) yields one primary lease_tenants row", async () => {
		if (!unitA || !tenantA) {
			console.warn("Skipping: fixtures not created");
			return;
		}

		// The lease-form path: a plain insert into `leases`, NOT the
		// bulk_import RPC. Pre-trigger this wrote NO lease_tenants row.
		const { data: lease, error } = await clientA
			.from("leases")
			.insert({
				owner_user_id: ownerAId,
				unit_id: unitA.id,
				primary_tenant_id: tenantA.id,
				start_date: "2035-01-01",
				end_date: "2035-12-31",
				rent_amount: 1600,
				security_deposit: 1600,
			})
			.select("id")
			.single();

		expect(error).toBeNull();
		expect(lease).toBeTruthy();
		if (lease?.id) insertedLeaseIds.push(lease.id);

		// lease_tenants has no direct SELECT policy — read it via the parent
		// leases join (owner-scoped), mirroring how the app reads the data.
		const { data: leaseRow } = await clientA
			.from("leases")
			.select(
				"id, primary_tenant_id, lease_tenants(tenant_id, is_primary, responsibility_percentage)",
			)
			.eq("id", lease!.id)
			.single();

		expect(leaseRow).toBeTruthy();
		expect(leaseRow!.lease_tenants).toHaveLength(1);
		expect(leaseRow!.lease_tenants[0]!.tenant_id).toBe(tenantA.id);
		expect(leaseRow!.lease_tenants[0]!.is_primary).toBe(true);
		expect(leaseRow!.lease_tenants[0]!.responsibility_percentage).toBe(100);
	});

	it("owner B cannot see owner A's lease or its lease_tenants row", async () => {
		const leaseId = insertedLeaseIds[0];
		if (!leaseId) {
			console.warn("Skipping: no lease created");
			return;
		}

		// Owner B queries the lease + its junction rows — RLS on `leases`
		// blocks the row entirely, so the join is unreachable.
		const { data, error } = await clientB
			.from("leases")
			.select("id, lease_tenants(tenant_id, is_primary)")
			.eq("id", leaseId);

		expect(error).toBeNull();
		expect(data).toEqual([]);
	});
});
