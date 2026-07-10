/**
 * Integration test for SEC-05: the e-signature audit trail is tamper-proof.
 *
 * Why this exists: RLS is row-level, not column-level, so a landlord who owns a
 * lease could PATCH a recorded signature-audit column (e.g.
 * `tenant_signature_name='Someone Else'`, a doctored IP / user-agent / method /
 * consent timestamp / signed-document hash) AFTER the tenant signed. The signed
 * PDF is regenerated live from these columns (`buildLeasePdfData` renders
 * `tenantSignatureName` onto the signature block + audit certificate), so a
 * forged value renders as if the tenant signed it.
 *
 * The write-once trigger `reject_signature_audit_tampering`
 * (20260710061130) blocks a single-step value->different overwrite, but is
 * bypassable via a two-step value->null->value (clear then rewrite). The
 * authoritative control (20260710070223) is COLUMN-LEVEL UPDATE privilege: the
 * 12 audit columns are revoked from `authenticated`, so an owner's direct
 * PostgREST session can no longer set, clear, or alter ANY of them. They are
 * written only by the SECURITY DEFINER signing RPCs
 * (`record_lease_signature` / `sign_lease_with_token`) and the service-role
 * signing edge function (cancel / finalize), which bypass column grants.
 *
 * This is a SAME-OWNER tamper concern (cross-owner UPDATE is already blocked by
 * RLS), so a single authenticated owner client is the correct shape. Pattern
 * matches `lease-terms-lock.test.ts` (single-owner privilege test: fixture
 * create, an allowed non-audit write, a chai6-safe rejection matcher, cleanup).
 * Synthetic owner account only; hits prod (runs in CI rls-security). The lease
 * is created UNSIGNED and hard-deleted in afterAll — the owner can never write
 * the audit columns, so no signed residue is possible.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

// The 12 audit columns the SEC-05 column-lock revokes from `authenticated`.
const AUDIT_COLUMNS = [
	"owner_signed_at",
	"owner_signature_ip",
	"owner_signature_user_agent",
	"owner_signature_method",
	"owner_signature_consent_at",
	"tenant_signed_at",
	"tenant_signature_ip",
	"tenant_signature_user_agent",
	"tenant_signature_method",
	"tenant_signature_name",
	"tenant_signature_consent_at",
	"signed_document_hash",
] as const;

describe("SEC-05 e-signature audit columns are owner-unwritable", () => {
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
		// The owner cannot write audit columns, so there is no signed residue to
		// reset — just hard-delete the lease + fixtures.
		if (leaseId) await clientA.from("leases").delete().eq("id", leaseId);
		if (unitA) await clientA.from("units").delete().eq("id", unitA.id);
		if (tenantA) await clientA.from("tenants").delete().eq("id", tenantA.id);
		if (propertyA)
			await clientA.from("properties").delete().eq("id", propertyA.id);
	});

	it("blocks a direct write to EVERY signature-audit column (permission denied)", async () => {
		if (!leaseId) {
			console.warn("Skipping: draft lease not created");
			return;
		}

		// An owner PATCHing any audit column directly is rejected at the privilege
		// layer (column UPDATE revoked from `authenticated`) — this is the forge
		// vector (set / clear / rewrite) that must be impossible from a session.
		const sampleValues: Record<string, string> = {
			owner_signed_at: new Date().toISOString(),
			owner_signature_ip: "10.0.0.9",
			owner_signature_user_agent: "forged-agent",
			owner_signature_method: "in_app",
			owner_signature_consent_at: new Date().toISOString(),
			tenant_signed_at: new Date().toISOString(),
			tenant_signature_ip: "10.0.0.9",
			tenant_signature_user_agent: "forged-agent",
			tenant_signature_method: "in_app",
			tenant_signature_name: "Forged Name",
			tenant_signature_consent_at: new Date().toISOString(),
			signed_document_hash: "deadbeef",
		};

		for (const col of AUDIT_COLUMNS) {
			const { error } = await clientA
				.from("leases")
				.update({ [col]: sampleValues[col] })
				.eq("id", leaseId);
			// PostgREST surfaces a column-privilege denial (SQLSTATE 42501).
			expect(error, `writing ${col} should be denied`).toMatchObject({
				message: expect.stringContaining("permission denied"),
			});
		}
	});

	it("also blocks nulling an audit column (the value->null half of the two-step forge)", async () => {
		if (!leaseId) {
			console.warn("Skipping: draft lease not created");
			return;
		}
		const { error } = await clientA
			.from("leases")
			.update({ tenant_signature_name: null })
			.eq("id", leaseId);
		expect(error).toMatchObject({
			message: expect.stringContaining("permission denied"),
		});
	});

	it("still allows the owner to update NON-audit columns on their own lease", async () => {
		if (!leaseId) {
			console.warn("Skipping: draft lease not created");
			return;
		}
		// The lock is column-scoped, not a full-row lock: normal lease edits work.
		const { error } = await clientA
			.from("leases")
			.update({ property_rules: "No smoking. Quiet hours after 10pm." })
			.eq("id", leaseId);
		expect(error).toBeNull();
	});
});
