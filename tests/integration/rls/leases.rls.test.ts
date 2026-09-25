import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

describe("Leases RLS — cross-tenant isolation", () => {
	let clientA: SupabaseClient;
	let clientB: SupabaseClient;
	let ownerAId: string;
	let ownerBId: string;

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
	});

	// ---------------------------------------------------------------------------
	// SELECT isolation (existing tests)
	// ---------------------------------------------------------------------------

	it("owner A can only read their own leases", async () => {
		const { data, error } = await clientA
			.from("leases")
			.select("id, owner_user_id");
		expect(error).toBeNull();
		expect(data).not.toBeNull();
		data!.forEach((row) => {
			expect(row.owner_user_id).toBe(ownerAId);
		});
	});

	it("owner B can only read their own leases", async () => {
		const { data, error } = await clientB
			.from("leases")
			.select("id, owner_user_id");
		expect(error).toBeNull();
		expect(data).not.toBeNull();
		data!.forEach((row) => {
			expect(row.owner_user_id).toBe(ownerBId);
		});
	});

	it("owner A results contain no rows from owner B", async () => {
		const { data: dataA } = await clientA
			.from("leases")
			.select("id, owner_user_id");
		const { data: dataB } = await clientB
			.from("leases")
			.select("id, owner_user_id");

		const ownerAIds = new Set((dataA ?? []).map((r) => r.id as string));
		const ownerBIds = new Set((dataB ?? []).map((r) => r.id as string));

		ownerBIds.forEach((id) => {
			expect(ownerAIds.has(id)).toBe(false);
		});
	});

	// ---------------------------------------------------------------------------
	// UPDATE isolation
	// ---------------------------------------------------------------------------

	it("owner A can update their own lease", async () => {
		// THE LEASE HAS TO BE ONE THE BUSINESS RULES ALLOW EDITING, and the old
		// `.limit(1)` with no filter and no order did not guarantee that.
		//
		// `grace_period_days` is one of the financial-term columns that
		// `reject_signed_lease_term_edits` (BEFORE UPDATE on public.leases) locks
		// once `tenant_signed_at` is set or `lease_status = 'pending_signature'`.
		// PostgREST returns an arbitrary row for an unordered `.limit(1)`, so the
		// moment owner A acquired signed leases -- an e2e batch created eleven on
		// 2026-09-20 -- this test started picking one at random and failing with
		// 23514 "Cannot edit financial terms of a signed lease". That is the
		// database enforcing a deliberate rule, not an RLS defect: this test is
		// about OWNERSHIP, so it must not collide with the signing workflow.
		//
		// The filter mirrors the trigger's condition exactly, and the order makes
		// the choice reproducible instead of physical-order-dependent.
		const { data: leaseList, error: selectError } = await clientA
			.from("leases")
			.select("id, grace_period_days")
			.is("tenant_signed_at", null)
			.neq("lease_status", "pending_signature")
			.order("created_at", { ascending: true })
			.limit(1);

		expect(selectError).toBeNull();

		// ASSERT RATHER THAN SKIP. The old `if (!lease) return` turned a missing
		// fixture into a silent pass, which is indistinguishable from a test that
		// quietly stopped exercising UPDATE isolation.
		const lease = leaseList?.[0];
		expect(
			lease,
			"owner A has no editable lease to test UPDATE against",
		).toBeTruthy();

		const original = lease!.grace_period_days;
		try {
			const { error } = await clientA
				.from("leases")
				.update({ grace_period_days: 99 })
				.eq("id", lease!.id);

			expect(error).toBeNull();
		} finally {
			// RESTORE IN `finally`. Previously the restore sat after the assertion,
			// so a failing run left the sentinel 99 behind -- lease
			// 05b0ba0e-9882-46f9-9177-7a0d8e22475b still carried it from an earlier
			// failure, which is how a test leaks state into the next run's fixtures.
			await clientA
				.from("leases")
				.update({ grace_period_days: original })
				.eq("id", lease!.id);
		}
	});

	it("owner B cannot update owner A lease", async () => {
		const { data: leaseList } = await clientA
			.from("leases")
			.select("id")
			.limit(1);

		const lease = leaseList?.[0];
		if (!lease) return;

		// Owner B tries to update owner A's lease — RLS blocks
		const { data, error } = await clientB
			.from("leases")
			.update({ grace_period_days: 1 })
			.eq("id", lease.id)
			.select("id");

		// RLS USING clause prevents owner B from seeing/updating the row
		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	// ---------------------------------------------------------------------------
	// DELETE isolation
	// ---------------------------------------------------------------------------

	it("owner B cannot delete owner A lease", async () => {
		const { data: leaseList } = await clientA
			.from("leases")
			.select("id")
			.limit(1);

		const lease = leaseList?.[0];
		if (!lease) return;

		// Owner B tries to delete owner A's lease — RLS blocks
		const { data, error } = await clientB
			.from("leases")
			.delete()
			.eq("id", lease.id)
			.select("id");

		// RLS USING clause prevents owner B from seeing/deleting the row
		expect(error).toBeNull();
		expect(data).toEqual([]);

		// Verify still exists for owner A
		const { data: stillExists } = await clientA
			.from("leases")
			.select("id")
			.eq("id", lease.id)
			.single();

		expect(stillExists).not.toBeNull();
	});

	// ---------------------------------------------------------------------------
	// INSERT isolation
	// Lease INSERT has complex FK requirements (unit_id, primary_tenant_id).
	// Cross-tenant test: owner B cannot create a lease under owner A's unit.
	// ---------------------------------------------------------------------------

	it("owner B cannot insert a lease under owner A unit", async () => {
		// Get one of owner A's units and a tenant for FK
		const { data: unitList } = await clientA
			.from("units")
			.select("id")
			.limit(1);

		const { data: tenantList } = await clientA
			.from("tenants")
			.select("id")
			.limit(1);

		const unitA = unitList?.[0];
		const tenantA = tenantList?.[0];

		// Skip if no test data available
		if (!unitA || !tenantA) return;

		const { data, error } = await clientB
			.from("leases")
			.insert({
				owner_user_id: ownerBId,
				unit_id: unitA.id,
				primary_tenant_id: tenantA.id,
				start_date: "2099-01-01",
				end_date: "2099-12-31",
				rent_amount: 1000,
				security_deposit: 500,
			})
			.select("id")
			.single();

		// RLS should block: owner B cannot create a lease under owner A's unit
		expect(error).not.toBeNull();
		expect(data).toBeNull();
	});
});
