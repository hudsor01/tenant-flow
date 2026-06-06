/**
 * Integration tests for the Phase 3 (PERF-02 / PERF-03) stats RPCs —
 * `get_unit_stats(p_user_id uuid)` + `get_tenant_stats(p_user_id uuid)`.
 *
 * Both functions are SECURITY DEFINER, which bypasses RLS, so the
 * per-aggregate `where owner_user_id = p_user_id` filter is NOT enough on
 * its own — the function trusts whatever uuid the caller passes. The first
 * statement in each body is the identity guard, mirroring
 * `get_maintenance_stats`:
 *
 *   if p_user_id != (select auth.uid()) then raise exception 'Unauthorized';
 *
 * This file IS the regression proof for that guard (success criterion 3 /
 * threat T-03-06): ownerB calling `get_X_stats(ownerA_id)` is rejected with
 * a `/unauthorized/i` error and null data; each owner's self-call succeeds
 * and returns only their own counts. It runs in the `rls-security` CI gate,
 * so a future refactor that drops the guard fails CI with another owner's
 * stats leaking.
 *
 * Note: the stats RPCs raise the bare message 'Unauthorized' (matching
 * `get_maintenance_stats`), NOT the "Access denied: cannot request data for
 * another user" message used by the dashboard-group RPCs in
 * `rpc-auth.test.ts` — hence the `/unauthorized/i` assertion here.
 *
 * Pattern matches `tests/integration/rls/dashboard-rpc-open-maintenance.test.ts`
 * (dual client, fixture-create + cleanup, graceful skip if fixtures fail).
 * `getTestCredentials()` throws when the four E2E_OWNER_* env vars are unset;
 * CI provides them via repo secrets, local runs require `.env.local`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

// The RPCs return jsonb (typed `Json` in the generated client). Narrow to the
// known aggregate shapes here rather than reaching for `as unknown as` — the
// mappers in src do the Zod-validated version; this test only needs the raw
// numeric fields the RPC emits.
interface UnitStatsRaw {
	total: number;
	occupied: number;
	available: number;
	maintenance: number;
	totalActualRent: number;
}

interface TenantStatsRaw {
	total: number;
	active: number;
	inactive: number;
}

const FIXTURE_RENT = 1337;

describe("get_unit_stats / get_tenant_stats — owner-isolation RLS", () => {
	let clientA: SupabaseClient;
	let clientB: SupabaseClient;
	let ownerAId: string;
	let ownerBId: string;

	// Fixtures created in beforeAll, cleaned in afterAll.
	let propertyA: { id: string } | null = null;
	let unitA: { id: string } | null = null;
	let tenantA: { id: string } | null = null;

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

		// Fresh owner-A fixtures so the self-call returns non-zero counts that
		// this test owns. afterAll removes them. One property → one available
		// unit (known rent) → one active tenant.
		const { data: pA } = await clientA
			.from("properties")
			.insert({
				name: "Stats RPC Test Property A",
				address_line1: "1 Stats St",
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
					unit_number: "STATS-A-101",
					bedrooms: 1,
					bathrooms: 1,
					rent_amount: FIXTURE_RENT,
					status: "available",
					owner_user_id: ownerAId,
				})
				.select("id")
				.single();
			unitA = uA ? { id: uA.id } : null;
		}

		const { data: tA } = await clientA
			.from("tenants")
			.insert({
				email: `stats-rpc-test-tenant-a-${Date.now()}@example.com`,
				first_name: "Stats",
				last_name: "TestA",
				status: "active",
				owner_user_id: ownerAId,
			})
			.select("id")
			.single();
		tenantA = tA ? { id: tA.id } : null;
	});

	afterAll(async () => {
		// FK-safe order: unit (child of property) before property; tenant is
		// standalone. All under ownerA.
		if (unitA) await clientA.from("units").delete().eq("id", unitA.id);
		if (propertyA)
			await clientA.from("properties").delete().eq("id", propertyA.id);
		if (tenantA) await clientA.from("tenants").delete().eq("id", tenantA.id);
	});

	// -------------------------------------------------------------------------
	// ISOLATION — ownerB passing ownerA's user_id is rejected with Unauthorized
	// -------------------------------------------------------------------------

	it("rejects ownerB calling get_unit_stats(ownerA_id) with Unauthorized", async () => {
		// SECURITY DEFINER bypasses RLS; the `auth.uid() != p_user_id` guard is
		// the only thing stopping ownerB from reading ownerA's unit aggregates.
		// If a future refactor drops the guard, this fails with non-null data
		// (ownerA's counts leaking to ownerB — the P0 this test pins).
		const { data, error } = await clientB.rpc("get_unit_stats", {
			p_user_id: ownerAId,
		});
		expect(data).toBeNull();
		expect(error).not.toBeNull();
		expect(error?.message).toMatch(/unauthorized/i);
	});

	it("rejects ownerB calling get_tenant_stats(ownerA_id) with Unauthorized", async () => {
		const { data, error } = await clientB.rpc("get_tenant_stats", {
			p_user_id: ownerAId,
		});
		expect(data).toBeNull();
		expect(error).not.toBeNull();
		expect(error?.message).toMatch(/unauthorized/i);
	});

	// -------------------------------------------------------------------------
	// SELF-CALL SUCCESS — each owner reads only their own counts
	// -------------------------------------------------------------------------

	it("allows ownerA self-call to get_unit_stats and reflects the fixtures", async () => {
		if (!unitA) {
			console.warn("Skipping: ownerA unit fixture not created");
			return;
		}

		const { data, error } = await clientA.rpc("get_unit_stats", {
			p_user_id: ownerAId,
		});
		expect(error).toBeNull();
		expect(data).not.toBeNull();

		const stats = data as UnitStatsRaw;
		// Don't hard-pin exact totals — the synthetic account may carry prior
		// fixtures. Assert the aggregates are numbers and >= the values this
		// test just created (one available unit at FIXTURE_RENT).
		expect(typeof stats.total).toBe("number");
		expect(typeof stats.occupied).toBe("number");
		expect(typeof stats.available).toBe("number");
		expect(typeof stats.maintenance).toBe("number");
		expect(typeof stats.totalActualRent).toBe("number");
		expect(stats.total).toBeGreaterThanOrEqual(1);
		expect(stats.available).toBeGreaterThanOrEqual(1);
		expect(stats.totalActualRent).toBeGreaterThanOrEqual(FIXTURE_RENT);
	});

	it("allows ownerA self-call to get_tenant_stats and counts by tenants.status", async () => {
		if (!tenantA) {
			console.warn("Skipping: ownerA tenant fixture not created");
			return;
		}

		const { data, error } = await clientA.rpc("get_tenant_stats", {
			p_user_id: ownerAId,
		});
		expect(error).toBeNull();
		expect(data).not.toBeNull();

		const stats = data as TenantStatsRaw;
		// Counting is by `tenants.status` (PERF-03 correctness fix). The active
		// fixture tenant guarantees active >= 1 and total >= 1.
		expect(typeof stats.total).toBe("number");
		expect(typeof stats.active).toBe("number");
		expect(typeof stats.inactive).toBe("number");
		expect(stats.total).toBeGreaterThanOrEqual(1);
		expect(stats.active).toBeGreaterThanOrEqual(1);
	});

	// -------------------------------------------------------------------------
	// ISOLATION (positive) — ownerB's own self-call succeeds, proving the guard
	// rejects only the mismatch, not every call.
	// -------------------------------------------------------------------------

	it("allows ownerB self-call to get_unit_stats(ownerB_id) — guard rejects only the mismatch", async () => {
		const { data, error } = await clientB.rpc("get_unit_stats", {
			p_user_id: ownerBId,
		});
		expect(error).toBeNull();
		expect(data).not.toBeNull();
	});
});
