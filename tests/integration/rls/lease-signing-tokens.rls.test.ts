/**
 * Integration tests for token-based lease e-signature.
 *
 * Covers:
 *   - lease_signing_tokens RLS: owners read only their own lease's tokens;
 *     there are NO authenticated write policies (tokens are service-role-only).
 *   - Grant lockdown: record_lease_signature / sign_lease_with_token /
 *     get_lease_signing_context are REVOKED from authenticated (service_role only).
 *   - Durable activation happy paths (BOTH signing RPCs): owner-signs-second
 *     (record_lease_signature) and tenant-signs-second (sign_lease_with_token)
 *     each flip the lease to active + notify the owner + persist signatures.
 *   - sign_lease_with_token rejection paths: token-state (invalid/expired/used/
 *     revoked) AND lease-state (lease_not_pending_signature/tenant_already_signed).
 *   - get_lease_signing_context invalid-token path.
 *
 * Strategy: a service-role client seeds/cleans tokens + disposable
 * property/tenant/unit/lease fixtures (there is no authenticated write path);
 * ownerA / ownerB authenticated clients assert RLS + the grant lockdown.
 */

import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_ROLE_KEY =
	process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
	process.env["SUPABASE_SECRET_KEY"];

function sha256Hex(input: string): string {
	return createHash("sha256").update(input).digest("hex");
}

/** Probe whether the public sign-lease-token Edge Function is deployed (it is
 *  deployed out-of-band after merge). A gateway 404 with code NOT_FOUND means
 *  not deployed → the finalize test skips cleanly instead of false-failing. */
async function isSignFunctionDeployed(): Promise<boolean> {
	if (!SUPABASE_URL) return false;
	try {
		const probe = await fetch(`${SUPABASE_URL}/functions/v1/sign-lease-token`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "{}",
		});
		if (probe.status === 404) {
			const body = (await probe.json().catch(() => ({}))) as { code?: string };
			return body.code !== "NOT_FOUND";
		}
		return true;
	} catch {
		return true;
	}
}

const skipReason = !SUPABASE_URL
	? "NEXT_PUBLIC_SUPABASE_URL not set"
	: !SERVICE_ROLE_KEY
		? "SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY not set"
		: null;

const RUN_TAG = `rls-sign-test-${Date.now()}`;

/** A PostgREST/Postgres permission-denied error (42501), as opposed to a
 *  function-not-found (PGRST202) — so the grant-lockdown guard can't pass on a
 *  signature-drift regression that merely makes the function unresolvable. */
function isPermissionDenied(
	error: { code?: string; message?: string } | null,
): boolean {
	if (!error) return false;
	return (
		error.code === "42501" || /permission denied/i.test(error.message ?? "")
	);
}

describe.skipIf(skipReason)(
	"lease_signing_tokens RLS + signing RPC grants",
	() => {
		let service: SupabaseClient;
		let clientA: SupabaseClient;
		let clientB: SupabaseClient;
		let ownerAId: string;

		// Disposable fixtures (cleaned up in afterAll). All leases hang off one
		// shared property + tenant; each pending/active lease gets its own unit to
		// satisfy the per-unit overlap EXCLUDE constraint.
		let propertyId: string | undefined;
		let tenantId: string | undefined;
		const unitIds: string[] = [];
		const leaseIds: string[] = [];
		// Named leases for specific scenarios.
		let tenantSecondLeaseId: string | undefined; // pending, owner pre-signed
		let ownerSecondLeaseId: string | undefined; // pending, tenant pre-signed
		let draftLeaseId: string | undefined; // draft
		let tenantSignedLeaseId: string | undefined; // pending, tenant pre-signed
		let tenantFirstLeaseId: string | undefined; // pending, no signatures
		let ownerFirstLeaseId: string | undefined; // pending, no signatures
		let ownerSignedLeaseId: string | undefined; // pending, owner pre-signed
		let finalizeLeaseId: string | undefined; // pending, owner pre-signed
		let contextLeaseId: string | undefined; // pending, no signatures
		// Any owned lease for the token-table RLS assertions.
		let leaseAId: string | undefined;
		let signFnDeployed = false;

		let unitCounter = 0;
		async function makeLease(
			fields: Record<string, unknown>,
		): Promise<string | undefined> {
			if (!propertyId || !tenantId) return undefined;
			unitCounter += 1;
			const { data: unit } = await service
				.from("units")
				.insert({
					property_id: propertyId,
					owner_user_id: ownerAId,
					unit_number: String(unitCounter),
					rent_amount: 1500,
				})
				.select("id")
				.single();
			if (!unit?.id) return undefined;
			unitIds.push(unit.id);
			const { data: lease } = await service
				.from("leases")
				.insert({
					unit_id: unit.id,
					primary_tenant_id: tenantId,
					owner_user_id: ownerAId,
					start_date: "2026-01-01",
					end_date: "2026-12-31",
					rent_amount: 1500,
					security_deposit: 1500,
					...fields,
				})
				.select("id")
				.single();
			if (lease?.id) leaseIds.push(lease.id);
			return lease?.id;
		}

		let tokenCounter = 0;
		const insertedTokenIds: string[] = [];
		async function seedToken(
			leaseId: string,
			overrides: Record<string, unknown> = {},
		): Promise<string> {
			tokenCounter += 1;
			const hash = `${RUN_TAG}-${tokenCounter}`;
			const { data } = await service
				.from("lease_signing_tokens")
				.insert({
					lease_id: leaseId,
					tenant_email: "tenant@example.com",
					token_hash: hash,
					expires_at: new Date(Date.now() + 14 * 864e5).toISOString(),
					created_by: ownerAId,
					...overrides,
				})
				.select("id")
				.single();
			if (data?.id) insertedTokenIds.push(data.id);
			return hash;
		}

		beforeAll(async () => {
			service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
				auth: { persistSession: false, autoRefreshToken: false },
			});
			const { ownerA, ownerB } = getTestCredentials();
			clientA = await createTestClient(ownerA.email, ownerA.password);
			clientB = await createTestClient(ownerB.email, ownerB.password);
			const {
				data: { user: userA },
			} = await clientA.auth.getUser();
			ownerAId = userA!.id;

			const { data: property } = await service
				.from("properties")
				.insert({
					owner_user_id: ownerAId,
					name: `${RUN_TAG} property`,
					address_line1: "1 Test St",
					city: "Testville",
					state: "TX",
					postal_code: "75001",
					property_type: "single_family",
				})
				.select("id")
				.single();
			propertyId = property?.id;
			const { data: tenant } = await service
				.from("tenants")
				.insert({
					owner_user_id: ownerAId,
					name: "Happy Path Tenant",
					email: "happy@example.com",
				})
				.select("id")
				.single();
			tenantId = tenant?.id;

			const now = new Date().toISOString();
			tenantSecondLeaseId = await makeLease({
				lease_status: "pending_signature",
				owner_signed_at: now,
				owner_signature_method: "in_app",
			});
			ownerSecondLeaseId = await makeLease({
				lease_status: "pending_signature",
				tenant_signed_at: now,
				tenant_signature_method: "in_app",
			});
			draftLeaseId = await makeLease({ lease_status: "draft" });
			tenantSignedLeaseId = await makeLease({
				lease_status: "pending_signature",
				tenant_signed_at: now,
				tenant_signature_method: "in_app",
			});
			tenantFirstLeaseId = await makeLease({
				lease_status: "pending_signature",
			});
			ownerFirstLeaseId = await makeLease({
				lease_status: "pending_signature",
			});
			ownerSignedLeaseId = await makeLease({
				lease_status: "pending_signature",
				owner_signed_at: now,
				owner_signature_method: "in_app",
			});
			finalizeLeaseId = await makeLease({
				lease_status: "pending_signature",
				owner_signed_at: now,
				owner_signature_method: "in_app",
			});
			contextLeaseId = await makeLease({ lease_status: "pending_signature" });
			leaseAId = tenantSecondLeaseId;
			signFnDeployed = await isSignFunctionDeployed();

			// Fixtures are required — fail loudly rather than letting RLS/rejection
			// assertions pass vacuously on a missing fixture.
			expect(propertyId).toBeTruthy();
			expect(tenantId).toBeTruthy();
			expect(leaseAId).toBeTruthy();
		});

		afterAll(async () => {
			if (insertedTokenIds.length > 0) {
				await service
					.from("lease_signing_tokens")
					.delete()
					.in("id", insertedTokenIds);
			}
			if (finalizeLeaseId) {
				await service.storage
					.from("tenant-documents")
					.remove([`lease/${finalizeLeaseId}/signed-lease.pdf`]);
			}
			if (leaseIds.length > 0) {
				await service.from("notifications").delete().in("entity_id", leaseIds);
				await service.from("leases").delete().in("id", leaseIds);
			}
			if (unitIds.length > 0)
				await service.from("units").delete().in("id", unitIds);
			if (tenantId) await service.from("tenants").delete().eq("id", tenantId);
			if (propertyId)
				await service.from("properties").delete().eq("id", propertyId);
		});

		// ── token table RLS ────────────────────────────────────────────────────────

		it("owner A can read their own lease's signing token; owner B cannot", async () => {
			tokenCounter += 1;
			const hash = `${RUN_TAG}-rls-read`;
			const { data: row } = await service
				.from("lease_signing_tokens")
				.insert({
					lease_id: leaseAId!,
					tenant_email: "tenant@example.com",
					token_hash: hash,
					expires_at: new Date(Date.now() + 864e5).toISOString(),
					created_by: ownerAId,
				})
				.select("id")
				.single();
			const id = row?.id;
			expect(id).toBeTruthy();
			if (id) insertedTokenIds.push(id);

			const { data: aRead } = await clientA
				.from("lease_signing_tokens")
				.select("id")
				.eq("id", id!);
			expect((aRead ?? []).map((r) => r.id)).toContain(id);

			const { data: bRead } = await clientB
				.from("lease_signing_tokens")
				.select("id")
				.eq("id", id!);
			expect(bRead ?? []).toHaveLength(0);
		});

		it("authenticated owners cannot INSERT signing tokens (no write policy)", async () => {
			const { data, error } = await clientA
				.from("lease_signing_tokens")
				.insert({
					lease_id: leaseAId!,
					tenant_email: "tenant@example.com",
					token_hash: `${RUN_TAG}-direct-insert`,
					expires_at: new Date(Date.now() + 864e5).toISOString(),
					created_by: ownerAId,
				})
				.select("id");
			// RLS with no INSERT policy → rejected (error) or zero rows written.
			expect(error !== null || (data ?? []).length === 0).toBe(true);
		});

		it("owner B cannot revoke owner A's token", async () => {
			const hash = await seedToken(leaseAId!);
			const { data: seeded } = await service
				.from("lease_signing_tokens")
				.select("id")
				.eq("token_hash", hash)
				.single();
			const id = seeded?.id;
			const { data } = await clientB
				.from("lease_signing_tokens")
				.update({ revoked_at: new Date().toISOString() })
				.eq("id", id!)
				.select("id");
			expect(data ?? []).toHaveLength(0);

			const { data: still } = await service
				.from("lease_signing_tokens")
				.select("revoked_at")
				.eq("id", id!)
				.single();
			expect(still?.revoked_at).toBeNull();
		});

		// ── grant lockdown ───────────────────────────────────────────────────────

		it("signing RPCs are permission-denied for authenticated users", async () => {
			const ctx = await clientA.rpc("get_lease_signing_context", {
				p_token_hash: "x",
			});
			expect(isPermissionDenied(ctx.error)).toBe(true);

			const sign = await clientA.rpc("sign_lease_with_token", {
				p_token_hash: "x",
				p_signature_ip: "1.1.1.1",
				p_signature_user_agent: "ua",
				p_signed_at: new Date().toISOString(),
			});
			expect(isPermissionDenied(sign.error)).toBe(true);

			const owner = await clientA.rpc("record_lease_signature", {
				p_lease_id: leaseAId ?? "00000000-0000-0000-0000-000000000000",
				p_signature_ip: "1.1.1.1",
				p_signature_user_agent: "ua",
				p_signed_at: new Date().toISOString(),
				p_method: "in_app",
			});
			expect(isPermissionDenied(owner.error)).toBe(true);
		});

		// ── durable activation happy paths ───────────────────────────────────────

		it("tenant signs second: records signature, durably activates, persists name, notifies owner", async () => {
			const hash = await seedToken(tenantSecondLeaseId!);
			const { data, error } = await service.rpc("sign_lease_with_token", {
				p_token_hash: hash,
				p_signature_ip: "203.0.113.9",
				p_signature_user_agent: "vitest-agent",
				p_signed_at: new Date().toISOString(),
				p_signer_name: "Jane Q Tenant",
			});
			expect(error).toBeNull();
			expect(data?.[0]?.success).toBe(true);
			expect(data?.[0]?.both_signed).toBe(true);
			expect(data?.[0]?.lease_id).toBe(tenantSecondLeaseId);

			const { data: leaseRow } = await service
				.from("leases")
				.select("lease_status, tenant_signed_at, tenant_signature_name")
				.eq("id", tenantSecondLeaseId!)
				.single();
			expect(leaseRow?.lease_status).toBe("active");
			expect(leaseRow?.tenant_signed_at).not.toBeNull();
			expect(leaseRow?.tenant_signature_name).toBe("Jane Q Tenant");

			const { data: notifs } = await service
				.from("notifications")
				.select("title")
				.eq("entity_id", tenantSecondLeaseId!)
				.eq("user_id", ownerAId);
			expect((notifs ?? []).some((n) => n.title === "Lease fully signed")).toBe(
				true,
			);
		});

		it("owner signs second: records signature, durably activates, notifies owner", async () => {
			const { data, error } = await service.rpc("record_lease_signature", {
				p_lease_id: ownerSecondLeaseId!,
				p_signature_ip: "203.0.113.10",
				p_signature_user_agent: "vitest-agent",
				p_signed_at: new Date().toISOString(),
				p_method: "in_app",
			});
			expect(error).toBeNull();
			expect(data?.[0]?.success).toBe(true);
			expect(data?.[0]?.both_signed).toBe(true);

			const { data: leaseRow } = await service
				.from("leases")
				.select("lease_status, owner_signed_at")
				.eq("id", ownerSecondLeaseId!)
				.single();
			expect(leaseRow?.lease_status).toBe("active");
			expect(leaseRow?.owner_signed_at).not.toBeNull();

			const { data: notifs } = await service
				.from("notifications")
				.select("title")
				.eq("entity_id", ownerSecondLeaseId!)
				.eq("user_id", ownerAId);
			expect((notifs ?? []).some((n) => n.title === "Lease fully signed")).toBe(
				true,
			);
		});

		// ── finalize (render -> upload -> signed_document pointer) ───────────────
		// Drives the full tenant-sign path through the DEPLOYED Edge Function, which
		// runs finalizeSignedLease + renderLeasePdf inline. Skips cleanly until the
		// function is deployed (out-of-band, post-merge).

		it("tenant sign through the deployed function finalizes the signed PDF", async (ctx) => {
			if (!signFnDeployed || !finalizeLeaseId) ctx.skip();
			const rawToken = `${RUN_TAG}-finalize-raw`;
			const { data: tok } = await service
				.from("lease_signing_tokens")
				.insert({
					lease_id: finalizeLeaseId!,
					tenant_email: "finalize@example.com",
					token_hash: sha256Hex(rawToken),
					expires_at: new Date(Date.now() + 864e5).toISOString(),
					created_by: ownerAId,
				})
				.select("id")
				.single();
			if (tok?.id) insertedTokenIds.push(tok.id);

			const res = await fetch(`${SUPABASE_URL}/functions/v1/sign-lease-token`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "sign",
					token: rawToken,
					signerName: "Finalize Tenant",
					consent: true,
				}),
			});
			expect(res.status).toBe(200);
			const json = (await res.json()) as {
				success?: boolean;
				both_signed?: boolean;
			};
			expect(json.success).toBe(true);
			expect(json.both_signed).toBe(true);

			const { data: leaseRow } = await service
				.from("leases")
				.select("lease_status, signed_document_path, signed_document_hash")
				.eq("id", finalizeLeaseId!)
				.single();
			expect(leaseRow?.lease_status).toBe("active");
			expect(leaseRow?.signed_document_path).toBe(
				`lease/${finalizeLeaseId}/signed-lease.pdf`,
			);
			expect(leaseRow?.signed_document_hash).toBeTruthy();

			const { data: dl, error: dlErr } = await service.storage
				.from("tenant-documents")
				.download(leaseRow!.signed_document_path!);
			expect(dlErr).toBeNull();
			expect(dl).toBeTruthy();
		});

		// ── first-signer paths (no premature activation) ─────────────────────────

		it("tenant signs first: both_signed=false, lease stays pending, no notification", async () => {
			const hash = await seedToken(tenantFirstLeaseId!);
			const { data } = await service.rpc("sign_lease_with_token", {
				p_token_hash: hash,
				p_signature_ip: "1.1.1.1",
				p_signature_user_agent: "ua",
				p_signed_at: new Date().toISOString(),
				p_signer_name: "First Tenant",
			});
			expect(data?.[0]?.success).toBe(true);
			expect(data?.[0]?.both_signed).toBe(false);

			const { data: leaseRow } = await service
				.from("leases")
				.select("lease_status")
				.eq("id", tenantFirstLeaseId!)
				.single();
			expect(leaseRow?.lease_status).toBe("pending_signature");

			const { data: notifs } = await service
				.from("notifications")
				.select("id")
				.eq("entity_id", tenantFirstLeaseId!);
			expect(notifs ?? []).toHaveLength(0);
		});

		it("owner signs first: both_signed=false, lease stays pending, no notification", async () => {
			const { data } = await service.rpc("record_lease_signature", {
				p_lease_id: ownerFirstLeaseId!,
				p_signature_ip: "1.1.1.1",
				p_signature_user_agent: "ua",
				p_signed_at: new Date().toISOString(),
				p_method: "in_app",
			});
			expect(data?.[0]?.success).toBe(true);
			expect(data?.[0]?.both_signed).toBe(false);

			const { data: leaseRow } = await service
				.from("leases")
				.select("lease_status")
				.eq("id", ownerFirstLeaseId!)
				.single();
			expect(leaseRow?.lease_status).toBe("pending_signature");

			const { data: notifs } = await service
				.from("notifications")
				.select("id")
				.eq("entity_id", ownerFirstLeaseId!);
			expect(notifs ?? []).toHaveLength(0);
		});

		// ── record_lease_signature rejections ────────────────────────────────────

		it("record_lease_signature rejects a lease that is not pending signature", async () => {
			const { data } = await service.rpc("record_lease_signature", {
				p_lease_id: draftLeaseId!,
				p_signature_ip: "1.1.1.1",
				p_signature_user_agent: "ua",
				p_signed_at: new Date().toISOString(),
				p_method: "in_app",
			});
			expect(data?.[0]?.success).toBe(false);
			expect(data?.[0]?.error_message).toBe(
				"Lease must be pending signature to sign",
			);
		});

		it("record_lease_signature is idempotent on the owner-already-signed string", async () => {
			const { data } = await service.rpc("record_lease_signature", {
				p_lease_id: ownerSignedLeaseId!,
				p_signature_ip: "1.1.1.1",
				p_signature_user_agent: "ua",
				p_signed_at: new Date().toISOString(),
				p_method: "in_app",
			});
			expect(data?.[0]?.success).toBe(false);
			// The lease-signature Edge Function treats this EXACT string as an
			// idempotent no-op success; pin it so wording drift can't break that.
			expect(data?.[0]?.error_message).toBe(
				"Owner has already signed this lease",
			);
		});

		// ── sign_lease_with_token token-state rejections ────────────────────────

		it("rejects an unknown token", async () => {
			const { data, error } = await service.rpc("sign_lease_with_token", {
				p_token_hash: `${RUN_TAG}-does-not-exist`,
				p_signature_ip: "1.1.1.1",
				p_signature_user_agent: "ua",
				p_signed_at: new Date().toISOString(),
			});
			expect(error).toBeNull();
			expect(data?.[0]?.success).toBe(false);
			expect(data?.[0]?.error_message).toBe("invalid_token");
		});

		it("rejects an expired token", async () => {
			const hash = await seedToken(leaseAId!, {
				expires_at: new Date(Date.now() - 1000).toISOString(),
			});
			const { data } = await service.rpc("sign_lease_with_token", {
				p_token_hash: hash,
				p_signature_ip: "1.1.1.1",
				p_signature_user_agent: "ua",
				p_signed_at: new Date().toISOString(),
			});
			expect(data?.[0]?.success).toBe(false);
			expect(data?.[0]?.error_message).toBe("expired_token");
		});

		it("rejects an already-used token", async () => {
			const hash = await seedToken(leaseAId!, {
				used_at: new Date().toISOString(),
			});
			const { data } = await service.rpc("sign_lease_with_token", {
				p_token_hash: hash,
				p_signature_ip: "1.1.1.1",
				p_signature_user_agent: "ua",
				p_signed_at: new Date().toISOString(),
			});
			expect(data?.[0]?.success).toBe(false);
			expect(data?.[0]?.error_message).toBe("used_token");
		});

		it("rejects a revoked token", async () => {
			const hash = await seedToken(leaseAId!, {
				revoked_at: new Date().toISOString(),
			});
			const { data } = await service.rpc("sign_lease_with_token", {
				p_token_hash: hash,
				p_signature_ip: "1.1.1.1",
				p_signature_user_agent: "ua",
				p_signed_at: new Date().toISOString(),
			});
			expect(data?.[0]?.success).toBe(false);
			expect(data?.[0]?.error_message).toBe("revoked_token");
		});

		// ── sign_lease_with_token lease-state rejections ─────────────────────────

		it("rejects signing a lease that is not pending signature", async () => {
			const hash = await seedToken(draftLeaseId!);
			const { data } = await service.rpc("sign_lease_with_token", {
				p_token_hash: hash,
				p_signature_ip: "1.1.1.1",
				p_signature_user_agent: "ua",
				p_signed_at: new Date().toISOString(),
			});
			expect(data?.[0]?.success).toBe(false);
			expect(data?.[0]?.error_message).toBe("lease_not_pending_signature");
		});

		it("rejects a second tenant signature on the same lease", async () => {
			const hash = await seedToken(tenantSignedLeaseId!);
			const { data } = await service.rpc("sign_lease_with_token", {
				p_token_hash: hash,
				p_signature_ip: "1.1.1.1",
				p_signature_user_agent: "ua",
				p_signed_at: new Date().toISOString(),
			});
			expect(data?.[0]?.success).toBe(false);
			expect(data?.[0]?.error_message).toBe("tenant_already_signed");
		});

		it("get_lease_signing_context returns the render context for a valid token", async () => {
			const hash = await seedToken(contextLeaseId!);
			const { data, error } = await service.rpc("get_lease_signing_context", {
				p_token_hash: hash,
			});
			expect(error).toBeNull();
			const row = data?.[0];
			expect(row?.valid).toBe(true);
			expect(row?.reason).toBeNull();
			expect(row?.lease_id).toBe(contextLeaseId);
			expect(row?.tenant_name).toBe("Happy Path Tenant");
			expect(row?.property_label).toContain("property");
			expect(Number(row?.rent_amount)).toBe(1500);
		});

		it("get_lease_signing_context reports an unknown token as invalid", async () => {
			const { data, error } = await service.rpc("get_lease_signing_context", {
				p_token_hash: `${RUN_TAG}-nope`,
			});
			expect(error).toBeNull();
			expect(data?.[0]?.valid).toBe(false);
			expect(data?.[0]?.reason).toBe("invalid_token");
		});
	},
);
