/**
 * Integration test for LEASE-04: the `reject_signed_lease_term_edits`
 * BEFORE UPDATE trigger on `public.leases`.
 *
 * Why this exists: lease financial terms stayed editable while
 * `pending_signature` and after the tenant signed, so the finalize step could
 * render a signed PDF from terms the tenant never agreed to. A UI-only lock is
 * bypassable via direct PostgREST, so migration
 * `20260705004013_lease_terms_lock_before_update` adds a server-side BEFORE
 * UPDATE trigger that rejects changes to the financial-term columns
 * (rent_amount, security_deposit, late_fee_amount, payment_day,
 * grace_period_days, rent_currency) once the tenant has signed or the lease is
 * out for signature — while leaving end_date, lease_status, and the signature
 * columns writable so renew, terminate, and the signing workflow keep working.
 *
 * Pattern matches `bulk-import-create-lease.test.ts` (single-owner behavioral
 * test, fixture create + cleanup, chai6-safe rejection matcher).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

describe("LEASE-04 reject_signed_lease_term_edits trigger", () => {
	let clientA: SupabaseClient;
	let ownerAId: string;

	let propertyA: { id: string } | null = null;
	let unitA: { id: string } | null = null;
	let tenantA: { id: string } | null = null;
	const insertedLeaseIds: string[] = [];

	// Out-for-signature lease (lease_status='pending_signature') reused across the
	// lock/allow cases. The term-lock trigger fires on OLD.tenant_signed_at IS NOT
	// NULL *or* OLD.lease_status='pending_signature'; SEC-05 (20260710070223)
	// revoked the signature-audit columns from `authenticated`, so an owner client
	// can no longer set tenant_signed_at directly — lease_status is the writable
	// signal that drives the same lock.
	let signedLeaseId: string | null = null;
	// Unsigned draft used for the still-editable case.
	let draftLeaseId: string | null = null;

	async function createLease(
		start: string,
		end: string,
	): Promise<string | null> {
		if (!unitA || !tenantA) return null;
		const { data } = await clientA
			.from("leases")
			.insert({
				owner_user_id: ownerAId,
				unit_id: unitA.id,
				primary_tenant_id: tenantA.id,
				start_date: start,
				end_date: end,
				rent_amount: 1600,
				security_deposit: 1600,
			})
			.select("id")
			.single();
		if (data?.id) insertedLeaseIds.push(data.id);
		return data?.id ?? null;
	}

	beforeAll(async () => {
		const { ownerA } = getTestCredentials();
		clientA = await createTestClient(ownerA.email, ownerA.password);

		const {
			data: { user: userA },
		} = await clientA.auth.getUser();
		ownerAId = userA!.id;

		const { data: pA } = await clientA
			.from("properties")
			.insert({
				name: "Terms-Lock Test Property A",
				address_line1: "20 Lock St",
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
					unit_number: "LOCK-A-101",
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
				email: `lock-test-tenant-a-${Date.now()}@example.com`,
				first_name: "Lock",
				last_name: "TestA",
				owner_user_id: ownerAId,
			})
			.select("id")
			.single();
		tenantA = tA ? { id: tA.id } : null;

		// Drive the term-lock via lease_status='pending_signature' (owner-writable).
		// The lock-requiring case runs first, while the status is still
		// pending_signature; the later renew/terminate cases only exercise allowed
		// edits, so mutating lease_status afterwards is fine.
		signedLeaseId = await createLease("2036-01-01", "2036-12-31");
		if (signedLeaseId) {
			await clientA
				.from("leases")
				.update({ lease_status: "pending_signature" })
				.eq("id", signedLeaseId);
		}

		// Unsigned draft, still fully editable.
		draftLeaseId = await createLease("2037-01-01", "2037-12-31");
	});

	afterAll(async () => {
		for (const id of insertedLeaseIds) {
			await clientA.from("leases").delete().eq("id", id);
		}
		if (unitA) await clientA.from("units").delete().eq("id", unitA.id);
		if (tenantA) await clientA.from("tenants").delete().eq("id", tenantA.id);
		if (propertyA)
			await clientA.from("properties").delete().eq("id", propertyA.id);
	});

	it("rejects a rent_amount edit on a signed lease", async () => {
		if (!signedLeaseId) {
			console.warn("Skipping: signed lease not created");
			return;
		}
		const { error } = await clientA
			.from("leases")
			.update({ rent_amount: 9999 })
			.eq("id", signedLeaseId);

		// PostgREST surfaces the trigger's RAISE as an error object (not a
		// thrown rejection). Assert on the object via toMatchObject with an
		// asymmetric string matcher (chai6-safe — no `.rejects.toThrow`).
		expect(error).toMatchObject({
			message: expect.stringContaining("financial terms"),
		});
	});

	it("allows a renew-shaped edit (end_date + lease_status='active') on a signed lease", async () => {
		if (!signedLeaseId) {
			console.warn("Skipping: signed lease not created");
			return;
		}
		const { error } = await clientA
			.from("leases")
			.update({ end_date: "2037-01-31", lease_status: "active" })
			.eq("id", signedLeaseId);

		expect(error).toBeNull();
	});

	it("allows a terminate-shaped edit (end_date + lease_status='terminated') on a signed lease", async () => {
		if (!signedLeaseId) {
			console.warn("Skipping: signed lease not created");
			return;
		}
		const { error } = await clientA
			.from("leases")
			.update({ end_date: "2037-02-28", lease_status: "terminated" })
			.eq("id", signedLeaseId);

		expect(error).toBeNull();
	});

	it("allows a rent_amount edit on an unsigned draft lease", async () => {
		if (!draftLeaseId) {
			console.warn("Skipping: draft lease not created");
			return;
		}
		const { error } = await clientA
			.from("leases")
			.update({ rent_amount: 1700 })
			.eq("id", draftLeaseId);

		expect(error).toBeNull();
	});
});
