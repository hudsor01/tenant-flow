/**
 * Integration test for SEC-04: the cross-owner FK-ownership guards on
 * `public.leases` and `public.lease_tenants`.
 *
 * Why this exists: `leases_update_owner` WITH CHECK pins only `owner_user_id`,
 * so owner A could `UPDATE leases SET unit_id=<B's unit>, primary_tenant_id=<B's
 * tenant>` and bind their lease to another account's rows; `lease_tenants`
 * update validated only the parent lease, not `tenant_id`. RLS is row-level not
 * FK-target-level, and a UI-only check is bypassable via direct PostgREST, so
 * migration `reject_cross_owner_lease_fk` adds two SECURITY DEFINER BEFORE
 * UPDATE triggers:
 *   - `reject_cross_owner_lease_fk()` on `leases` — rejects re-pointing unit_id
 *     or primary_tenant_id to a unit/tenant not owned by the lease owner.
 *   - `reject_cross_owner_lease_tenant_fk()` on `lease_tenants` — rejects
 *     re-pointing tenant_id to a tenant not owned by the parent lease owner.
 * Both fire only on an actual FK change (IS DISTINCT FROM old), so pre-existing
 * rows stay updatable for non-FK edits. The migration also tightened the INSERT
 * WITH CHECKs to require owner-owned FK targets.
 *
 * Pattern matches `lease-tenants-trigger.test.ts` (dual client, fixture create +
 * cleanup, graceful skip if env missing) and `lease-terms-lock.test.ts`
 * (chai6-safe rejection matcher — assert on the returned PostgREST `error`
 * object via `toMatchObject`, never `.rejects.toThrow`).
 *
 * Synthetic accounts only (e2e-owner-a / e2e-owner-b). Runs in CI rls-security.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

describe("SEC-04 cross-owner lease FK guard", () => {
	let clientA: SupabaseClient;
	let clientB: SupabaseClient;
	let ownerAId: string;
	let ownerBId: string;

	// Owner A fixtures (property/unit/tenant + a lease pointing at them).
	let propertyA: { id: string } | null = null;
	let unitA: { id: string } | null = null;
	let tenantA: { id: string } | null = null;
	let leaseAId: string | null = null;

	// Owner B fixtures — cross-owner FK re-point targets.
	let propertyB: { id: string } | null = null;
	let unitB: { id: string } | null = null;
	let tenantB: { id: string } | null = null;

	beforeAll(async () => {
		const { ownerA, ownerB } = getTestCredentials();
		clientA = await createTestClient(ownerA.email, ownerA.password);
		clientB = await createTestClient(ownerB.email, ownerB.password);

		const {
			data: { user: userA },
		} = await clientA.auth.getUser();
		ownerAId = userA!.id;
		const {
			data: { user: userB },
		} = await clientB.auth.getUser();
		ownerBId = userB!.id;

		// --- Owner A fixtures ---
		const { data: pA } = await clientA
			.from("properties")
			.insert({
				name: "SEC04 Property A",
				address_line1: "40 FK St",
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
					unit_number: "SEC04-A-101",
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
				email: `sec04-tenant-a-${Date.now()}@example.com`,
				first_name: "Sec04",
				last_name: "TenantA",
				owner_user_id: ownerAId,
			})
			.select("id")
			.single();
		tenantA = tA ? { id: tA.id } : null;

		// Lease under owner A. The AFTER INSERT trigger (LEASE-02) creates the
		// primary lease_tenants row with tenant_id = tenantA.
		if (unitA && tenantA) {
			const { data: lease } = await clientA
				.from("leases")
				.insert({
					owner_user_id: ownerAId,
					unit_id: unitA.id,
					primary_tenant_id: tenantA.id,
					start_date: "2038-01-01",
					end_date: "2038-12-31",
					rent_amount: 1600,
					security_deposit: 1600,
				})
				.select("id")
				.single();
			leaseAId = lease?.id ?? null;
		}

		// --- Owner B fixtures (the cross-owner targets) ---
		const { data: pB } = await clientB
			.from("properties")
			.insert({
				name: "SEC04 Property B",
				address_line1: "41 FK St",
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
					unit_number: "SEC04-B-101",
					bedrooms: 1,
					bathrooms: 1,
					rent_amount: 1500,
					owner_user_id: ownerBId,
				})
				.select("id")
				.single();
			unitB = uB ? { id: uB.id } : null;
		}

		const { data: tB } = await clientB
			.from("tenants")
			.insert({
				email: `sec04-tenant-b-${Date.now()}@example.com`,
				first_name: "Sec04",
				last_name: "TenantB",
				owner_user_id: ownerBId,
			})
			.select("id")
			.single();
		tenantB = tB ? { id: tB.id } : null;
	});

	afterAll(async () => {
		// Hard-delete the lease first (lease_tenants cascades), then each owner's
		// fixtures with that owner's own client (RLS-scoped).
		if (leaseAId) await clientA.from("leases").delete().eq("id", leaseAId);
		if (unitA) await clientA.from("units").delete().eq("id", unitA.id);
		if (tenantA) await clientA.from("tenants").delete().eq("id", tenantA.id);
		if (propertyA)
			await clientA.from("properties").delete().eq("id", propertyA.id);

		if (unitB) await clientB.from("units").delete().eq("id", unitB.id);
		if (tenantB) await clientB.from("tenants").delete().eq("id", tenantB.id);
		if (propertyB)
			await clientB.from("properties").delete().eq("id", propertyB.id);
	});

	it("rejects re-pointing a lease's unit_id to another owner's unit", async () => {
		if (!leaseAId || !unitB) {
			console.warn("Skipping: fixtures not created");
			return;
		}

		const { error } = await clientA
			.from("leases")
			.update({ unit_id: unitB.id })
			.eq("id", leaseAId);

		// PostgREST surfaces the trigger's RAISE (SQLSTATE 42501) as an error
		// object, not a thrown rejection. Assert on it with an asymmetric string
		// matcher (chai6-safe — no `.rejects.toThrow`).
		expect(error).toMatchObject({
			message: expect.stringContaining("unit owned by a different account"),
		});
	});

	it("rejects re-pointing a lease's primary_tenant_id to another owner's tenant", async () => {
		if (!leaseAId || !tenantB) {
			console.warn("Skipping: fixtures not created");
			return;
		}

		const { error } = await clientA
			.from("leases")
			.update({ primary_tenant_id: tenantB.id })
			.eq("id", leaseAId);

		expect(error).toMatchObject({
			message: expect.stringContaining("tenant owned by a different account"),
		});
	});

	it("allows a non-FK update (rent_amount) on the same draft lease", async () => {
		if (!leaseAId) {
			console.warn("Skipping: lease not created");
			return;
		}

		// unit_id / primary_tenant_id unchanged → the guard does not fire; the
		// lease is a draft so the term-lock trigger does not fire either. Proves
		// legit edits (and pre-existing rows) stay updatable.
		const { error } = await clientA
			.from("leases")
			.update({ rent_amount: 1725 })
			.eq("id", leaseAId);

		expect(error).toBeNull();
	});

	it("rejects re-pointing a lease_tenants row's tenant_id to another owner's tenant", async () => {
		if (!leaseAId || !tenantB) {
			console.warn("Skipping: fixtures not created");
			return;
		}

		const { error } = await clientA
			.from("lease_tenants")
			.update({ tenant_id: tenantB.id })
			.eq("lease_id", leaseAId);

		expect(error).toMatchObject({
			message: expect.stringContaining("tenant owned by a different account"),
		});
	});
});
