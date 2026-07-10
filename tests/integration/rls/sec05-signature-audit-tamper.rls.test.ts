/**
 * Integration test for SEC-05: the `reject_signature_audit_tampering`
 * BEFORE UPDATE trigger on `public.leases`
 * (migration 20260710061130_sec05_lease_signature_audit_tamper_guard).
 *
 * Why this exists: RLS is row-level, not column-level, so a landlord who owns a
 * lease could PATCH a recorded signature-audit column (e.g.
 * `tenant_signature_name='Someone Else'`, a doctored IP / user-agent / method /
 * consent timestamp / signed-document hash) AFTER the tenant signed. The signed
 * PDF is regenerated live from these columns (`buildLeasePdfData` renders
 * `tenantSignatureName` onto the signature block + audit certificate), so a
 * forged value renders as if the tenant signed it. The trigger enforces a
 * write-once state machine on the 12 audit columns:
 *   null  -> value      ALLOWED (sign)
 *   value -> null       ALLOWED (cancel / revert to draft)
 *   value -> same       ALLOWED (no-op)
 *   value -> different  REJECTED (tamper, SQLSTATE 42501)
 * It is independent of `reject_signed_lease_term_edits` (the financial
 * term-lock), and does NOT block the legit sign (`record_lease_signature` /
 * `sign_lease_with_token` null->value) or cancel (`lease-signature` cancel
 * value->null) flows.
 *
 * This is a SAME-OWNER tamper concern (cross-owner UPDATE is already blocked by
 * RLS), so a single authenticated owner client is the correct shape. Pattern
 * matches `lease-terms-lock.test.ts` (single-owner trigger test: fixture
 * create, an allowed signature-column write, chai6-safe rejection matcher,
 * cleanup). Synthetic owner account only; hits prod (runs in CI rls-security).
 *
 * Hygiene: the lease is created UNSIGNED (tenant_signed_at IS NULL) for the
 * null->value sign step, every touched audit column is reset to null in
 * afterAll, and the lease is hard-deleted — so the test is idempotent and
 * leaves no signed residue. The financial term-lock columns are never touched.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

// The 12 write-once audit columns the SEC-05 trigger guards. Nulling all of
// them mirrors the `lease-signature` cancel branch (value->null, allowed).
const AUDIT_COLUMNS_NULL = {
	owner_signed_at: null,
	owner_signature_ip: null,
	owner_signature_user_agent: null,
	owner_signature_method: null,
	owner_signature_consent_at: null,
	tenant_signed_at: null,
	tenant_signature_ip: null,
	tenant_signature_user_agent: null,
	tenant_signature_method: null,
	tenant_signature_name: null,
	tenant_signature_consent_at: null,
	signed_document_hash: null,
} as const;

describe("SEC-05 reject_signature_audit_tampering trigger", () => {
	let clientA: SupabaseClient;
	let ownerAId: string;

	let propertyA: { id: string } | null = null;
	let unitA: { id: string } | null = null;
	let tenantA: { id: string } | null = null;
	let leaseId: string | null = null;

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
				name: "Sig-Audit Test Property A",
				address_line1: "33 Signature St",
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
					unit_number: "SIG-A-101",
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
				email: `sig-test-tenant-a-${Date.now()}@example.com`,
				first_name: "Sig",
				last_name: "TestA",
				owner_user_id: ownerAId,
			})
			.select("id")
			.single();
		tenantA = tA ? { id: tA.id } : null;

		// One UNSIGNED draft lease (tenant_signed_at IS NULL) — required so the
		// first case exercises the null->value sign transition.
		if (unitA && tenantA) {
			const { data } = await clientA
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
			leaseId = data?.id ?? null;
		}
	});

	afterAll(async () => {
		// Reset every touched audit column to null (value->null is allowed by the
		// guard), then hard-delete the lease + fixtures so the test is idempotent
		// and leaves no signed residue on the synthetic owner's account.
		if (leaseId) {
			await clientA.from("leases").update(AUDIT_COLUMNS_NULL).eq("id", leaseId);
			await clientA.from("leases").delete().eq("id", leaseId);
		}
		if (unitA) await clientA.from("units").delete().eq("id", unitA.id);
		if (tenantA) await clientA.from("tenants").delete().eq("id", tenantA.id);
		if (propertyA)
			await clientA.from("properties").delete().eq("id", propertyA.id);
	});

	it("allows the tenant-sign transition (null -> value) on the owner's own lease", async () => {
		if (!leaseId) {
			console.warn("Skipping: unsigned draft lease not created");
			return;
		}

		// Simulate a tenant signature via an allowed null->value write (the shape
		// `sign_lease_with_token` produces). `tenant_signature_method` is
		// constrained to 'in_app' by leases_tenant_signature_method_check.
		const { error } = await clientA
			.from("leases")
			.update({
				tenant_signed_at: new Date().toISOString(),
				tenant_signature_name: "Original Signer",
				tenant_signature_ip: "203.0.113.10",
				tenant_signature_method: "in_app",
				tenant_signature_consent_at: new Date().toISOString(),
			})
			.eq("id", leaseId);

		expect(error).toBeNull();
	});

	it("rejects overwriting tenant_signature_name to a different value (value -> different)", async () => {
		if (!leaseId) {
			console.warn("Skipping: unsigned draft lease not created");
			return;
		}

		const { error } = await clientA
			.from("leases")
			.update({ tenant_signature_name: "Forged Name" })
			.eq("id", leaseId);

		// PostgREST surfaces the trigger's RAISE (SQLSTATE 42501) as an error
		// object, not a thrown rejection. Assert via toMatchObject + an
		// asymmetric string matcher (chai6-safe — no `.rejects.toThrow`).
		expect(error).toMatchObject({
			message: expect.stringContaining("recorded e-signature audit value"),
		});
	});

	it("rejects overwriting a second audit column, tenant_signature_ip (value -> different)", async () => {
		if (!leaseId) {
			console.warn("Skipping: unsigned draft lease not created");
			return;
		}

		const { error } = await clientA
			.from("leases")
			.update({ tenant_signature_ip: "10.0.0.1" })
			.eq("id", leaseId);

		expect(error).toMatchObject({
			message: expect.stringContaining("recorded e-signature audit value"),
		});
	});

	it("allows a same-value no-op write (value -> same)", async () => {
		if (!leaseId) {
			console.warn("Skipping: unsigned draft lease not created");
			return;
		}

		const { error } = await clientA
			.from("leases")
			.update({ tenant_signature_name: "Original Signer" })
			.eq("id", leaseId);

		expect(error).toBeNull();
	});

	it("allows the cancel transition — all 12 audit columns -> null in one PATCH", async () => {
		if (!leaseId) {
			console.warn("Skipping: unsigned draft lease not created");
			return;
		}

		// Mirrors the `lease-signature` cancel branch: every audit column reverts
		// to null (value->null is allowed). signed_document_path is not a guarded
		// column, but nulling it alongside matches the real cancel shape.
		const { error } = await clientA
			.from("leases")
			.update({ ...AUDIT_COLUMNS_NULL, signed_document_path: null })
			.eq("id", leaseId);

		expect(error).toBeNull();
	});

	it("allows a fresh owner-sign after cancel (null -> value on the owner columns)", async () => {
		if (!leaseId) {
			console.warn("Skipping: unsigned draft lease not created");
			return;
		}

		// After the cancel PATCH every audit column is null again, so writing the
		// owner signature columns is a clean null->value transition (the shape
		// `record_lease_signature` produces). owner_signature_method is
		// constrained to 'in_app' by leases_owner_signature_method_check.
		const { error } = await clientA
			.from("leases")
			.update({
				owner_signed_at: new Date().toISOString(),
				owner_signature_ip: "203.0.113.20",
				owner_signature_method: "in_app",
				owner_signature_consent_at: new Date().toISOString(),
			})
			.eq("id", leaseId);

		expect(error).toBeNull();
	});
});
