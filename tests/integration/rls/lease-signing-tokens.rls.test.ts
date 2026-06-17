/**
 * Integration tests for token-based lease e-signature (migration
 * 20260617142623_token_based_lease_esignature).
 *
 * Covers:
 *   - lease_signing_tokens RLS: owners read only their own lease's tokens;
 *     there are NO authenticated write policies (tokens are service-role-only).
 *   - Grant lockdown: record_lease_signature / sign_lease_with_token /
 *     get_lease_signing_context are REVOKED from authenticated (service_role only).
 *   - sign_lease_with_token rejection paths (invalid / expired / used / revoked),
 *     which short-circuit before any lease mutation.
 *   - get_lease_signing_context invalid-token path.
 *
 * Strategy: service-role client seeds/cleans tokens (no authenticated write
 * policy exists); ownerA / ownerB authenticated clients assert RLS + grants.
 * The happy-path signature recording requires a pending_signature lease fixture
 * and is exercised by the SignLeaseForm unit tests + the edge-function flow.
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

describe.skipIf(skipReason)(
	"lease_signing_tokens RLS + signing RPC grants",
	() => {
		let service: SupabaseClient;
		let clientA: SupabaseClient;
		let clientB: SupabaseClient;
		let ownerAId: string;
		let leaseAId: string | null = null;
		const insertedTokenIds: string[] = [];

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
		});

		afterAll(async () => {
			if (insertedTokenIds.length > 0) {
				await service
					.from("lease_signing_tokens")
					.delete()
					.in("id", insertedTokenIds);
			}
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

		it("signing RPCs are not callable by authenticated users", async () => {
			const ctx = await clientA.rpc("get_lease_signing_context", {
				p_token_hash: "x",
			});
			expect(ctx.error).not.toBeNull();

			const sign = await clientA.rpc("sign_lease_with_token", {
				p_token_hash: "x",
				p_signature_ip: "1.1.1.1",
				p_signature_user_agent: "ua",
				p_signed_at: new Date().toISOString(),
			});
			expect(sign.error).not.toBeNull();

			const owner = await clientA.rpc("record_lease_signature", {
				p_lease_id: leaseAId ?? "00000000-0000-0000-0000-000000000000",
				p_signature_ip: "1.1.1.1",
				p_signature_user_agent: "ua",
				p_signed_at: new Date().toISOString(),
				p_method: "in_app",
			});
			expect(owner.error).not.toBeNull();
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
