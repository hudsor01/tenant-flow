import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

describe("FOR ALL policy audit — no FOR ALL policies on public/storage", () => {
	let client: SupabaseClient;

	beforeAll(async () => {
		const { ownerA } = getTestCredentials();
		client = await createTestClient(ownerA.email, ownerA.password);
	});

	it("no FOR ALL policies exist for service_role on public or storage schemas", async () => {
		// Use an RPC to query pg_policies (system catalog)
		const { data, error } = await client.rpc("audit_for_all_policies", {
			p_role: "service_role",
		});

		expect(error).toBeNull();

		const policies = Array.isArray(data) ? data : [];
		// The lone historical exception (rent_payments_service_role) died with
		// the rent_payments table in the demolition; prod now has zero FOR ALL
		// service_role policies, so this asserts the clean invariant directly.
		if (policies.length > 0) {
			const details = policies
				.map(
					(p: { schemaname: string; tablename: string; policyname: string }) =>
						`${p.schemaname}.${p.tablename}: "${p.policyname}"`,
				)
				.join(", ");
			throw new Error(
				`Found ${policies.length} service_role FOR ALL policies: ${details}`,
			);
		}

		expect(policies).toHaveLength(0);
	});

	it("no FOR ALL policies exist for authenticated on public or storage schemas", async () => {
		const { data, error } = await client.rpc("audit_for_all_policies", {
			p_role: "authenticated",
		});

		expect(error).toBeNull();

		const policies = Array.isArray(data) ? data : [];
		if (policies.length > 0) {
			const details = policies
				.map(
					(p: { schemaname: string; tablename: string; policyname: string }) =>
						`${p.schemaname}.${p.tablename}: "${p.policyname}"`,
				)
				.join(", ");
			throw new Error(
				`Found ${policies.length} authenticated FOR ALL policies: ${details}`,
			);
		}

		expect(policies).toHaveLength(0);
	});
});
