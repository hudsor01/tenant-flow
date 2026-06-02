/**
 * Integration tests pinning the DENY side of the v3.0 Security Hardening Phase 2
 * RLS-no-policy lockdown (migration 20260602230717_rls_no_policy_resolution_phase2).
 *
 * The 10 `rls_enabled_no_policy` tables now each carry a `service_role_only` FOR
 * ALL policy (advisor lint 0008 -> 0), and the 5 Tier-A tables had their vestigial
 * `authenticated` table-grant revoked (advisor lint 0027 -> the 5 drop off). This
 * file pins that authenticated (ownerA) and anon cannot read any row from any of
 * the 10 tables.
 *
 *   Tier-A (revoked authenticated grant -> expected ERROR branch, 42501):
 *     app_config, email_suppressions, processed_internal_events, security_events,
 *     stripe_webhook_events.
 *   Tier-B (never had an authenticated grant):
 *     security_audit_log, user_access_log, webhook_attempts, webhook_events,
 *     webhook_metrics.
 *
 * The assertion is "error (a denied code) OR empty []" so it does not flake on
 * PostgREST version differences. A Tier-A grant re-add would switch the branch
 * from error to empty without failing here -- that regression is authoritatively
 * caught by the Supabase advisor re-flagging lint 0027; this test is the row-deny
 * pin, not the grant-state pin.
 *
 * The service_role ALLOW side is verified OUT-OF-BAND (advisor lint 0008 = 0 proves
 * a policy exists + MCP `has_table_privilege`): the `rls-security` CI harness has
 * NO service-role key (correctly), so a service-role test here would silently
 * skip / false-green. Do not add one.
 *
 * Requires the Plan 02-01 migration to be live on prod -- the Tier-A error branch
 * only fires post-revoke.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const SUPABASE_PUBLISHABLE_KEY =
	process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
	throw new Error(
		"Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
	);
}

// PostgREST surfaces a missing table grant / RLS denial as one of these.
const DENIED_CODES = ["42501", "PGRST301", "PGRST302", "PGRST116"];

const LOCKED_TABLES = [
	"app_config",
	"email_suppressions",
	"processed_internal_events",
	"security_events",
	"stripe_webhook_events",
	"security_audit_log",
	"user_access_log",
	"webhook_attempts",
	"webhook_events",
	"webhook_metrics",
] as const;

/** Assert a role cannot read rows: a denied error code OR an empty result set. */
async function expectDenied(
	client: SupabaseClient,
	table: string,
): Promise<void> {
	const { data, error } = await client.from(table).select("*").limit(1);
	if (error) {
		expect(DENIED_CODES).toContain(error.code);
	} else {
		expect(data ?? []).toHaveLength(0);
	}
}

describe("RLS-no-policy lockdown (v3.0 Phase 2)", () => {
	let anonClient: SupabaseClient;
	let authnClient: SupabaseClient;

	beforeAll(async () => {
		anonClient = createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!);
		const { ownerA } = getTestCredentials();
		authnClient = await createTestClient(ownerA.email, ownerA.password);
	});

	describe("authenticated (ownerA) cannot read locked tables", () => {
		for (const table of LOCKED_TABLES) {
			it(`${table}: authenticated denied`, async () => {
				await expectDenied(authnClient, table);
			});
		}
	});

	describe("anon cannot read locked tables", () => {
		for (const table of LOCKED_TABLES) {
			it(`${table}: anon denied`, async () => {
				await expectDenied(anonClient, table);
			});
		}
	});
});
