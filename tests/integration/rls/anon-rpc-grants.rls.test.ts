/**
 * Integration tests pinning the EXECUTE-grant state of every SECURITY DEFINER
 * RPC in `public` that the Supabase Security Advisor flagged as
 * "Public Can Execute SECURITY DEFINER Function".
 *
 * Lockdown migrations:
 *   - 20260529224926_revoke_anon_security_definer_rpcs.sql
 *     (IDOR fixes: revoke anon + authenticated on `confirm_lease_subscription`
 *      and `get_user_plan_limits`)
 *   - 20260529225039_revoke_anon_security_definer_rpcs_v2.sql
 *     (defense-in-depth: revoke FROM PUBLIC on 20 functions that gate on
 *      auth.uid() internally; re-grant to authenticated + service_role)
 *
 * Three contracts pinned here:
 *
 *   1. ANON cannot reach any of the 21 revoked functions. PostgREST surfaces
 *      a revoked EXECUTE as 42501 in current versions; older variants
 *      returned 42883 / PGRST202. Accept any of the three so the test pins
 *      "function is unreachable from anon", not a specific error code.
 *
 *   2. AUTHENTICATED cannot reach the two IDOR functions
 *      (`confirm_lease_subscription`, `get_user_plan_limits`). Same code set.
 *
 *   3. `is_admin()` IS still callable by anon — it lives inside RLS policy
 *      evaluation contexts and MUST remain executable from any role. Returns
 *      false for anon because `auth.uid()` is null.
 *
 * The classification spreadsheet lives at
 * `.planning/anon-exec-audit/CYCLE-1.md` and is the source of truth for
 * which functions are in each bucket.
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

const REVOKED_CODES = ["42501", "42883", "PGRST202"];

/** Functions revoked from anon (21 total: 2 IDOR + 19 defense-in-depth). */
const REVOKED_FROM_ANON: Array<{
	name: string;
	args?: Record<string, unknown>;
}> = [
	{ name: "cancel_account_deletion" },
	{
		name: "confirm_lease_subscription",
		args: {
			p_lease_id: "00000000-0000-0000-0000-000000000000",
			p_subscription_id: "sub_test",
		},
	},
	{
		name: "get_billing_insights",
		args: {
			owner_id_param: "00000000-0000-0000-0000-000000000000",
			start_date_param: "2026-01-01",
			end_date_param: "2026-01-31",
		},
	},
	{
		name: "get_dashboard_data_v2",
		args: { p_user_id: "00000000-0000-0000-0000-000000000000" },
	},
	{
		name: "get_dashboard_stats",
		args: { p_user_id: "00000000-0000-0000-0000-000000000000" },
	},
	{
		name: "get_dashboard_time_series",
		args: {
			p_user_id: "00000000-0000-0000-0000-000000000000",
			p_metric_name: "occupancy",
			p_days: 7,
		},
	},
	{ name: "get_deliverability_stats", args: { p_days: 7 } },
	{
		name: "get_financial_overview",
		args: { p_user_id: "00000000-0000-0000-0000-000000000000" },
	},
	{
		name: "get_funnel_stats",
		args: { p_from: "2026-01-01", p_to: "2026-01-31" },
	},
	{ name: "get_gate_conversion_stats", args: { p_days: 7 } },
	{
		name: "get_lease_stats",
		args: { p_user_id: "00000000-0000-0000-0000-000000000000" },
	},
	{
		name: "get_maintenance_stats",
		args: { p_user_id: "00000000-0000-0000-0000-000000000000" },
	},
	{
		name: "get_metric_trend",
		args: {
			p_user_id: "00000000-0000-0000-0000-000000000000",
			p_metric_name: "occupancy",
			p_period: "month",
		},
	},
	{
		name: "get_occupancy_trends_optimized",
		args: {
			p_owner_id: "00000000-0000-0000-0000-000000000000",
			p_months: 6,
		},
	},
	{
		name: "get_property_performance_cached",
		args: { p_user_id: "00000000-0000-0000-0000-000000000000" },
	},
	{
		name: "get_revenue_trends_optimized",
		args: {
			p_user_id: "00000000-0000-0000-0000-000000000000",
			p_months: 6,
		},
	},
	{
		name: "get_subscription_status",
		args: { p_customer_id: "cus_test" },
	},
	{ name: "get_user_invoices", args: { p_limit: 10 } },
	{
		name: "get_user_plan_limits",
		args: { p_user_id: "00000000-0000-0000-0000-000000000000" },
	},
	{
		name: "get_user_profile",
		args: { p_user_id: "00000000-0000-0000-0000-000000000000" },
	},
	{ name: "request_account_deletion" },
];

/** Functions also revoked from authenticated (the two IDOR fixes). */
const REVOKED_FROM_AUTHENTICATED: Array<{
	name: string;
	args: Record<string, unknown>;
}> = [
	{
		name: "confirm_lease_subscription",
		args: {
			p_lease_id: "00000000-0000-0000-0000-000000000000",
			p_subscription_id: "sub_test",
		},
	},
	{
		name: "get_user_plan_limits",
		args: { p_user_id: "00000000-0000-0000-0000-000000000000" },
	},
];

describe("anon-EXEC SECURITY DEFINER lockdown", () => {
	let anonClient: SupabaseClient;
	let authnClient: SupabaseClient;

	beforeAll(async () => {
		anonClient = createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!);
		const { ownerA } = getTestCredentials();
		authnClient = await createTestClient(ownerA.email, ownerA.password);
	});

	describe("anon cannot reach revoked SECURITY DEFINER functions", () => {
		for (const fn of REVOKED_FROM_ANON) {
			it(`${fn.name}: anon REVOKE'd`, async () => {
				const { error } = fn.args
					? await anonClient.rpc(fn.name, fn.args)
					: await anonClient.rpc(fn.name);
				expect(error).not.toBeNull();
				expect(REVOKED_CODES).toContain(error?.code);
			});
		}
	});

	describe("authenticated cannot reach the two IDOR functions", () => {
		for (const fn of REVOKED_FROM_AUTHENTICATED) {
			it(`${fn.name}: authenticated REVOKE'd`, async () => {
				const { error } = await authnClient.rpc(fn.name, fn.args);
				expect(error).not.toBeNull();
				expect(REVOKED_CODES).toContain(error?.code);
			});
		}
	});

	describe("is_admin() remains anon-executable (RLS policy contract)", () => {
		it("anon can call is_admin and gets false (auth.uid() is null)", async () => {
			const { data, error } = await anonClient.rpc("is_admin");
			expect(error).toBeNull();
			expect(data).toBe(false);
		});
	});
});
