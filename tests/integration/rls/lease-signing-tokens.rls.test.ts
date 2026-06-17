/**
 * Integration tests for token-based lease e-signature (migration
 * 20260617142623_token_based_lease_esignature).
 *
 * Covers:
 *   - lease_signing_tokens RLS: owners read only their own lease's tokens;
 *     there are NO authenticated write policies (tokens are service-role-only).
 *   - Grant lockdown: record_lease_signature / sign_lease_with_token /
 *     get_lease_signing_context are REVOKED from authenticated (service_role only).
 *   - sign_lease_with_token happy path: records the signature, persists the
 *     typed name, durably activates the lease (RPC-side), and notifies the owner.
 *   - sign_lease_with_token rejection paths (invalid / expired / used / revoked),
 *     which short-circuit before any lease mutation.
 *   - get_lease_signing_context invalid-token path.
 *
 * Strategy: service-role client seeds/cleans tokens + a disposable
 * pending-signature lease fixture (no authenticated write policy exists);
 * ownerA / ownerB authenticated clients assert RLS + the grant lockdown.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_ROLE_KEY =
	process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
	process.env["SUPABASE_SECRET_KEY"];

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
		let leaseAId: string | null = null;
		const insertedTokenIds: string[] = [];

		// Disposable property -> unit -> tenant -> lease (pending_signature, owner
		// pre-signed) for the happy-path sign test. Fully cleaned up in afterAll.
		const fixture: {
			propertyId?: string;
			unitId?: string;
			tenantId?: string;
			leaseId?: string;
		} = {};

		let tokenCounter = 0;
		async function seedToken(
			overrides: Record<string, unknown> = {},
		): Promise<{ hash: string; id: string | null; error: unknown }> {
			tokenCounter += 1;
			const hash = `${RUN_TAG}-${tokenCounter}`;
			const { data, error } = await service
				.from("lease_signing_tokens")
				.insert({
					lease_id: leaseAId,
					tenant_email: "tenant@example.com",
					token_hash: hash,
					expires_at: new Date(Date.now() + 14 * 864e5).toISOString(),
					created_by: ownerAId,
					...overrides,
				})
				.select("id")
				.single();
			if (data?.id) insertedTokenIds.push(data.id);
			return { hash, id: data?.id ?? null, error };
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

			const { data: leases } = await clientA
				.from("leases")
				.select("id")
				.neq("lease_status", "inactive")
				.limit(1);
			leaseAId = leases?.[0]?.id ?? null;

			// Build a disposable, isolated lease in pending_signature with the owner
			// already signed, so the tenant sign happy-path flips it to active.
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
			if (property?.id) {
				fixture.propertyId = property.id;
				const { data: unit } = await service
					.from("units")
					.insert({
						property_id: property.id,
						owner_user_id: ownerAId,
						unit_number: "1",
						rent_amount: 1500,
					})
					.select("id")
					.single();
				const { data: tenant } = await service
					.from("tenants")
					.insert({
						owner_user_id: ownerAId,
						name: "Happy Path Tenant",
						email: "happy@example.com",
					})
					.select("id")
					.single();
				if (unit?.id && tenant?.id) {
					fixture.unitId = unit.id;
					fixture.tenantId = tenant.id;
					const { data: lease } = await service
						.from("leases")
						.insert({
							unit_id: unit.id,
							primary_tenant_id: tenant.id,
							owner_user_id: ownerAId,
							start_date: "2026-01-01",
							end_date: "2026-12-31",
							rent_amount: 1500,
							security_deposit: 1500,
							lease_status: "pending_signature",
							owner_signed_at: new Date().toISOString(),
							owner_signature_method: "in_app",
						})
						.select("id")
						.single();
					fixture.leaseId = lease?.id;
				}
			}
		});

		afterAll(async () => {
			if (insertedTokenIds.length > 0) {
				await service
					.from("lease_signing_tokens")
					.delete()
					.in("id", insertedTokenIds);
			}
			if (fixture.leaseId) {
				await service
					.from("notifications")
					.delete()
					.eq("entity_id", fixture.leaseId);
				await service.from("leases").delete().eq("id", fixture.leaseId);
			}
			if (fixture.unitId)
				await service.from("units").delete().eq("id", fixture.unitId);
			if (fixture.propertyId)
				await service.from("properties").delete().eq("id", fixture.propertyId);
			if (fixture.tenantId)
				await service.from("tenants").delete().eq("id", fixture.tenantId);
		});

		// ── token table RLS ────────────────────────────────────────────────────────

		it("owner A can read their own lease's signing token; owner B cannot", async () => {
			if (!leaseAId) return; // no lease fixture for owner A
			const { id, error } = await seedToken();
			expect(error).toBeNull();
			expect(id).not.toBeNull();

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
			if (!leaseAId) return;
			const { data, error } = await clientA
				.from("lease_signing_tokens")
				.insert({
					lease_id: leaseAId,
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
			if (!leaseAId) return;
			const { id } = await seedToken();
			const { data } = await clientB
				.from("lease_signing_tokens")
				.update({ revoked_at: new Date().toISOString() })
				.eq("id", id!)
				.select("id");
			expect(data ?? []).toHaveLength(0);

			// Confirm the row is still live via the service client.
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

		// ── sign_lease_with_token happy path (service client) ────────────────────

		it("records the tenant signature, activates the lease, persists the typed name, and notifies the owner", async () => {
			if (!fixture.leaseId) return;
			tokenCounter += 1;
			const hash = `${RUN_TAG}-happy`;
			const { data: tok } = await service
				.from("lease_signing_tokens")
				.insert({
					lease_id: fixture.leaseId,
					tenant_email: "happy@example.com",
					token_hash: hash,
					expires_at: new Date(Date.now() + 864e5).toISOString(),
					created_by: ownerAId,
				})
				.select("id")
				.single();
			if (tok?.id) insertedTokenIds.push(tok.id);

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
			expect(data?.[0]?.lease_id).toBe(fixture.leaseId);

			const { data: tokenRow } = await service
				.from("lease_signing_tokens")
				.select("used_at")
				.eq("id", tok!.id)
				.single();
			expect(tokenRow?.used_at).not.toBeNull();

			// Activation + typed name are durable (written inside the RPC).
			const { data: leaseRow } = await service
				.from("leases")
				.select("lease_status, tenant_signed_at, tenant_signature_name")
				.eq("id", fixture.leaseId)
				.single();
			expect(leaseRow?.lease_status).toBe("active");
			expect(leaseRow?.tenant_signed_at).not.toBeNull();
			expect(leaseRow?.tenant_signature_name).toBe("Jane Q Tenant");

			const { data: notifs } = await service
				.from("notifications")
				.select("title")
				.eq("entity_id", fixture.leaseId)
				.eq("user_id", ownerAId);
			expect((notifs ?? []).some((n) => n.title === "Lease fully signed")).toBe(
				true,
			);
		});

		// ── sign_lease_with_token rejection paths (service client) ───────────────

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
			if (!leaseAId) return;
			const { hash } = await seedToken({
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
			if (!leaseAId) return;
			const { hash } = await seedToken({
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
			if (!leaseAId) return;
			const { hash } = await seedToken({
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
