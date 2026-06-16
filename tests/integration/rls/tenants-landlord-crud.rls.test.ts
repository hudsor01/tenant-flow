import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

/**
 * Landlord-only tenant CRUD integration tests.
 *
 * After migration 20260418150000_tenants_contact_columns, the tenants table
 * becomes self-contained: owners INSERT/SELECT/UPDATE tenant records with
 * contact fields (first_name, last_name, email, phone) directly on the row.
 * Tenants are records, never auth users — the legacy user_id column was
 * dropped in LEGACY-TENANT-06 (migration 20260616161248).
 *
 * RLS must allow owners to INSERT tenants they manage and isolate them across
 * owners via direct owner_user_id = auth.uid() scoping (the four tenants
 * policies are pure owner_user_id checks; no lease_tenants join).
 */
describe("Tenants landlord-only CRUD (RLS)", () => {
	let clientA: SupabaseClient;
	let clientB: SupabaseClient;
	let ownerAId: string;
	const createdTenantIds: string[] = [];

	beforeAll(async () => {
		const { ownerA, ownerB } = getTestCredentials();
		clientA = await createTestClient(ownerA.email, ownerA.password);
		clientB = await createTestClient(ownerB.email, ownerB.password);

		const {
			data: { user: userA },
		} = await clientA.auth.getUser();
		ownerAId = userA!.id;
	});

	afterAll(async () => {
		// Best-effort cleanup of rows created by this suite
		for (const id of createdTenantIds) {
			try {
				await clientA.from("tenants").delete().eq("id", id);
			} catch {
				// ignore
			}
		}
	});

	it("owner A can INSERT a landlord-managed tenant (record, not a user)", async () => {
		const { data, error } = await clientA
			.from("tenants")
			.insert({
				owner_user_id: ownerAId,
				first_name: "Jane",
				last_name: "Doe",
				name: "Jane Doe",
				email: `jane-${Date.now()}@test.tenantflow.invalid`,
				phone: "555-1234",
			})
			.select("id, first_name, last_name, name, email, phone, status")
			.single();

		expect(error).toBeNull();
		expect(data).not.toBeNull();
		expect(data!.first_name).toBe("Jane");
		expect(data!.last_name).toBe("Doe");
		expect(data!.name).toBe("Jane Doe");
		expect(data!.email).toMatch(/^jane-/);
		expect(data!.phone).toBe("555-1234");
		expect(data!.status).toBe("active");

		createdTenantIds.push(data!.id as string);
	});

	it("owner A can SELECT the landlord-managed tenant without joining users", async () => {
		const tenantId = createdTenantIds[0];
		if (!tenantId) throw new Error("prior test did not create a tenant");

		const { data, error } = await clientA
			.from("tenants")
			.select("id, first_name, last_name, email, phone, status")
			.eq("id", tenantId)
			.single();

		expect(error).toBeNull();
		expect(data).not.toBeNull();
		expect(data!.first_name).toBe("Jane");
		expect(data!.last_name).toBe("Doe");
		expect(data!.status).toBe("active");
	});

	it("owner A can UPDATE status to inactive (move-out flow)", async () => {
		const tenantId = createdTenantIds[0];
		if (!tenantId) throw new Error("prior test did not create a tenant");

		const { data, error } = await clientA
			.from("tenants")
			.update({ status: "inactive" })
			.eq("id", tenantId)
			.select("id, status")
			.single();

		expect(error).toBeNull();
		expect(data).not.toBeNull();
		expect(data!.status).toBe("inactive");
	});

	it("owner B cannot SELECT owner A landlord-managed tenants", async () => {
		const tenantId = createdTenantIds[0];
		if (!tenantId) throw new Error("prior test did not create a tenant");

		const { data, error } = await clientB
			.from("tenants")
			.select("id")
			.eq("id", tenantId)
			.maybeSingle();

		// Owner B must not see owner A's landlord-managed tenant: the tenants
		// SELECT policy scopes rows to owner_user_id = auth.uid(), so a tenant
		// owned by owner A is invisible to owner B.
		expect(error).toBeNull();
		expect(data).toBeNull();
	});
});
