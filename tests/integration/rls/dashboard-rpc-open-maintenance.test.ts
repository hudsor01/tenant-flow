/**
 * Integration tests for `get_dashboard_data_v2` SECURITY DEFINER RPC —
 * pins the Phase 2 (POLISH-10) contract:
 *
 * 1. Each row in `property_performance` carries `open_maintenance`,
 *    `address`, `property_type`, and a derived `status` per the
 *    migrations applied in cycles 1 / 2 (`20260523223626` +
 *    `20260523234221`).
 * 2. Cross-owner queries are rejected with `Unauthorized` by the
 *    explicit `auth.uid() = p_user_id` guard added in cycle 4
 *    (`20260524001408`). SECURITY DEFINER bypasses RLS, so the
 *    per-CTE `where owner_user_id = p_user_id` is NOT enough — the
 *    function trusts whatever uuid the caller passes. Without this
 *    guard any authenticated user could exfil another owner's full
 *    dashboard payload via a direct PostgREST call.
 *
 * Pattern matches `tests/integration/rls/bulk-import-create-lease.test.ts`
 * (dual client, fixture-create + cleanup). Note: `getTestCredentials()`
 * throws when the four E2E_OWNER_* env vars are unset — this file does
 * NOT gracefully skip in that case. CI provides the env vars via repo
 * secrets; local runs require `.env.local`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PropertyPerformanceRpcResponse } from "#types/database-rpc";
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
			property_performance: PropertyPerformanceRpcResponse[];
		};
		expect(Array.isArray(result.property_performance)).toBe(true);

		const ownPropertyRow = result.property_performance.find(
			(p) => p.property_id === propertyA!.id,
		);
		expect(ownPropertyRow).toBeDefined();
		// Pin all four Phase 2 fields. Cycle-2 review caught that the RPC
		// was emitting `open_maintenance` correctly but had never emitted
		// `address` / `property_type` / `status` despite the type contract
		// declaring them — extending the test to all four prevents another
		// recurrence of the same blindspot.
		expect(typeof ownPropertyRow!.open_maintenance).toBe("number");
		expect(ownPropertyRow!.open_maintenance).toBeGreaterThanOrEqual(1);
		expect(ownPropertyRow!.address).toBe("1 RPC St");
		expect(ownPropertyRow!.property_type).toBe("APARTMENT");
		// Property A has 1 unit (RPC-A-101) and the unit is unoccupied
		// because no lease was created in this test's beforeAll. The
		// derived `status` should reflect that as "vacant".
		expect(ownPropertyRow!.status).toBe("vacant");
	});

	// -------------------------------------------------------------------------
	// ISOLATION — ownerA passing ownerB's user_id is rejected with `Unauthorized`
	// -------------------------------------------------------------------------

	it("rejects cross-owner calls with Unauthorized (SECURITY DEFINER auth.uid() guard)", async () => {
		const { data, error } = await clientA.rpc("get_dashboard_data_v2", {
			p_user_id: ownerBId,
		});
		// The function is SECURITY DEFINER, which bypasses RLS, so a
		// per-CTE `where owner_user_id = p_user_id` is NOT enough — it
		// trusts whatever uuid the caller passes. The Phase 2 cycle-4
		// migration (20260524001408) adds an explicit `auth.uid()
		// != p_user_id → raise Unauthorized` guard at the top of the
		// function body. This test pins that guard. If a future
		// refactor removes the guard, this test fails with non-null
		// data (ownerB's actual dashboard payload would surface to
		// ownerA, the original P0 leak).
		expect(data).toBeNull();
		expect(error).not.toBeNull();
		// PRIMARY pin: SQLSTATE. The guard is a bare `raise exception` (no
		// `using errcode`, migration 20260524012602) → PostgreSQL default
		// 'P0001' (raise_exception). The code is the drift-insulated pin; NOT
		// '42501' (that is only for EXECUTE-revoke / grant denials).
		expect(error?.code).toBe("P0001");
		// Defense-in-depth: strict regex against the project-standard message
		// "Access denied: cannot request data for another user" used by
		// 20+ other stats RPCs and asserted by
		// tests/integration/rls/rpc-auth.test.ts. Migration
		// 20260524012602 aligned this RPC to the project convention.
		expect(error?.message).toMatch(/access denied/i);
	});
});
