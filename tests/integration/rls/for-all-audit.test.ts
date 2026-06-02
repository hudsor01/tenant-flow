import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

// `audit_for_all_policies` is an admin schema-diagnostic that enumerates FOR ALL
// policies on public/storage. As of v3.0 Security Hardening Phase 1 (migration
// 20260602202339, TIGHTEN-03) its body gates on `public.is_admin()` BEFORE the
// catalog filter, so a non-admin caller receives an empty set regardless of
// which policies exist -- closing a policy-inventory info-leak to arbitrary
// signed-in accounts.
//
// This file now pins the GATE behavior (non-admin -> no rows, no error). It will
// catch a future regression that removes the gate ONCE a matching FOR ALL policy
// exists (e.g. the `service_role_only` FOR ALL policies Phase 2 adds): an ungated
// body would then leak those rows to a non-admin and `toHaveLength(0)` would fail.
// Today prod has zero FOR ALL service_role/authenticated policies, so the gate
// and an ungated body are indistinguishable here -- a true admin-session
// non-empty assertion is the only way to pin it unconditionally, and the harness
// has no admin client (see below). It does NOT assert the historical "zero FOR
// ALL <role> policies" invariant:
//   - the harness has no admin client (getAdminTestCredentials() -> null), so the
//     catalog filter can only be exercised by an admin session; verify that
//     invariant out-of-band via the Supabase advisor / an admin session until an
//     admin test client exists; and
//   - Phase 2 intentionally adds `service_role_only` FOR ALL policies to the
//     rls_enabled_no_policy tables, so a blanket "zero FOR ALL service_role
//     policies" assertion would be wrong going forward anyway.
describe("audit_for_all_policies is admin-gated (non-admin sees no rows)", () => {
	let client: SupabaseClient;

	beforeAll(async () => {
		const { ownerA } = getTestCredentials();
		client = await createTestClient(ownerA.email, ownerA.password);
	});

	for (const role of ["service_role", "authenticated"]) {
		it(`non-admin gets an empty set for p_role=${role} (gate, not error)`, async () => {
			const { data, error } = await client.rpc("audit_for_all_policies", {
				p_role: role,
			});
			// authenticated grant is KEPT, so the call is reachable (no
			// revoked-EXECUTE error); the is_admin() gate returns an empty set for a
			// non-admin owner -- no policy-inventory enumeration.
			expect(error).toBeNull();
			expect(data ?? []).toHaveLength(0);
		});
	}
});
