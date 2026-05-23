/**
 * Integration tests for `get_dashboard_data_v2` SECURITY DEFINER RPC —
 * pins the Phase 2 (POLISH-10) contract: each row in `property_performance`
 * carries an `open_maintenance: number` count, and the SECURITY DEFINER +
 * shared-CTE `where owner_user_id = p_user_id` filter chain prevents
 * cross-owner data leakage even when an authenticated client passes
 * another owner's user_id.
 *
 * Why this exists: Plan 02-01 extended the RPC's `property_perf` CTE with
 * a `perf_open_maintenance` aggregate. The frontend (Plan 02-02) now
 * trusts that field end-to-end. Without an integration test, a future
 * regression that strips the owner filter from one of the shared CTEs
 * would expose every owner's open-maintenance counts to every other
 * owner. This test pins the contract so CI catches that regression.
 *
 * Pattern matches `tests/integration/rls/bulk-import-create-lease.test.ts`
 * (dual client, fixture-create + cleanup, graceful skip if env missing).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

describe("get_dashboard_data_v2 — open_maintenance per-property RLS isolation", () => {
	let clientA: SupabaseClient;
	let clientB: SupabaseClient;
	let ownerAId: string;
	let ownerBId: string;

	// Fixtures created in beforeAll, cleaned in afterAll.
	let propertyA: { id: string } | null = null;
	let unitA: { id: string } | null = null;
	let tenantA: { id: string } | null = null;
	let maintenanceA: { id: string } | null = null;
	let propertyB: { id: string } | null = null;
	let unitB: { id: string } | null = null;

	beforeAll(async () => {
		const { ownerA, ownerB } = getTestCredentials();
		clientA = await createTestClient(ownerA.email, ownerA.password);
		clientB = await createTestClient(ownerB.email, ownerB.password);

		const {
			data: { user: userA },
		} = await clientA.auth.getUser();
		const {
			data: { user: userB },
		} = await clientB.auth.getUser();
		ownerAId = userA!.id;
		ownerBId = userB!.id;

		// Fresh fixtures owned by this test — afterAll removes them so the
		// dashboard RPC's data shape stays clean for other test runs.
		const { data: pA } = await clientA
			.from("properties")
			.insert({
				name: "Dashboard RPC Test Property A",
				address_line1: "1 RPC St",
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
					unit_number: "RPC-A-101",
					bedrooms: 1,
					bathrooms: 1,
					rent_amount: 1500,
					owner_user_id: ownerAId,
				})
				.select("id")
				.single();
			unitA = uA ? { id: uA.id } : null;
		}

		// `maintenance_requests.tenant_id` is NOT NULL — create a tenant under
		// ownerA so we can attach the test fixture to it. This tenant does NOT
		// need a lease; it's a record-only tenant for fixture purposes (matches
		// the v1.0 honesty principle: tenants are records, not users).
		const { data: tA } = await clientA
			.from("tenants")
			.insert({
				email: `dashboard-rpc-test-tenant-a-${Date.now()}@example.com`,
				first_name: "Dashboard",
				last_name: "TestA",
				owner_user_id: ownerAId,
			})
			.select("id")
			.single();
		tenantA = tA ? { id: tA.id } : null;

		if (unitA && tenantA) {
			const { data: mA } = await clientA
				.from("maintenance_requests")
				.insert({
					unit_id: unitA.id,
					tenant_id: tenantA.id,
					title: "Test Open Maintenance",
					description: "RLS test fixture — pins the open_maintenance count",
					priority: "normal",
					status: "open",
					owner_user_id: ownerAId,
				})
				.select("id")
				.single();
			maintenanceA = mA ? { id: mA.id } : null;
		}

		// Mirror fixtures for owner B so the cross-owner isolation test has
		// real data on the other side that we can prove is masked.
		const { data: pB } = await clientB
			.from("properties")
			.insert({
				name: "Dashboard RPC Test Property B",
				address_line1: "2 RPC St",
				city: "Testville",
				state: "CA",
				postal_code: "94105",
				country: "US",
				property_type: "APARTMENT",
				owner_user_id: ownerBId,
			})
			.select("id")
			.single();
		propertyB = pB ? { id: pB.id } : null;

		if (propertyB) {
			const { data: uB } = await clientB
				.from("units")
				.insert({
					property_id: propertyB.id,
					unit_number: "RPC-B-101",
					bedrooms: 1,
					bathrooms: 1,
					rent_amount: 1500,
					owner_user_id: ownerBId,
				})
				.select("id")
				.single();
			unitB = uB ? { id: uB.id } : null;
		}
	});

	afterAll(async () => {
		// Reverse dependency order: maintenance_requests → tenants → units →
		// properties. tenants must outlive maintenance_requests (which carry a
		// NOT NULL tenant_id), and properties must outlive units (FK).
		if (maintenanceA)
			await clientA
				.from("maintenance_requests")
				.delete()
				.eq("id", maintenanceA.id);
		if (tenantA) await clientA.from("tenants").delete().eq("id", tenantA.id);
		if (unitA) await clientA.from("units").delete().eq("id", unitA.id);
		if (propertyA)
			await clientA.from("properties").delete().eq("id", propertyA.id);
		if (unitB) await clientB.from("units").delete().eq("id", unitB.id);
		if (propertyB)
			await clientB.from("properties").delete().eq("id", propertyB.id);
	});

	// -------------------------------------------------------------------------
	// HAPPY PATH — ownerA sees own property with real open_maintenance count
	// -------------------------------------------------------------------------

	it("returns real per-property open_maintenance count for the calling owner's properties", async () => {
		if (!propertyA || !maintenanceA) {
			console.warn("Skipping: fixtures not created");
			return;
		}

		const { data, error } = await clientA.rpc("get_dashboard_data_v2", {
			p_user_id: ownerAId,
		});
		expect(error).toBeNull();
		expect(data).toBeDefined();

		const result = data as {
			property_performance: Array<{
				property_id: string;
				open_maintenance: number;
			}>;
		};
		expect(Array.isArray(result.property_performance)).toBe(true);

		const ownPropertyRow = result.property_performance.find(
			(p) => p.property_id === propertyA!.id,
		);
		expect(ownPropertyRow).toBeDefined();
		expect(typeof ownPropertyRow!.open_maintenance).toBe("number");
		// The fixture inserted exactly 1 open maintenance request on this
		// property. Asserting >=1 (not ===1) lets the test stay green if a
		// future test file leaks another open request onto the same property
		// — that would be a bug in the OTHER test, not this one.
		expect(ownPropertyRow!.open_maintenance).toBeGreaterThanOrEqual(1);
	});

	// -------------------------------------------------------------------------
	// ISOLATION — ownerA passing ownerB's user_id receives empty data
	// -------------------------------------------------------------------------

	it("returns empty property_performance when ownerA passes ownerB's user_id (RLS-via-owner-filter)", async () => {
		const { data, error } = await clientA.rpc("get_dashboard_data_v2", {
			p_user_id: ownerBId,
		});
		expect(error).toBeNull();
		expect(data).toBeDefined();

		const result = data as {
			property_performance: Array<{ property_id: string }>;
		};
		expect(Array.isArray(result.property_performance)).toBe(true);
		// The function is SECURITY DEFINER but every shared CTE
		// (`owner_properties`, `all_units`, `all_maintenance`) filters on
		// `owner_user_id = p_user_id`. When ownerA passes ownerB's id, the
		// CTE chain returns no rows for ownerA's owned data AND no rows for
		// ownerB's owned data (because clientA's session can't satisfy the
		// CTE filter for ownerB's user_id). The result is empty.
		//
		// Pin the strict contract. If a future regression strips one of the
		// owner filters from a CTE, this would surface as a non-empty array
		// for cross-owner queries — exactly the threat we're testing.
		expect(result.property_performance).toEqual([]);
	});
});
