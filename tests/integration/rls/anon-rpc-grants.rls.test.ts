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
 *     (defense-in-depth: revoke FROM PUBLIC on 19 functions that gate on
 *      auth.uid() internally; re-grant to authenticated + service_role)
 *   - 20260602044104_revoke_anon_security_definer_pass3.sql
 *     (pass 3: revoke FROM PUBLIC on `is_admin` and `log_lease_signature_activity`
 *      -- the two functions pass 2 deliberately skipped. Every policy calling
 *      is_admin() is {authenticated}-scoped, so anon never evaluates it;
 *      authenticated keeps EXECUTE so RLS is unaffected.)
 *   - 20260816010000_rate_limit_counters.sql
 *     (Phase 66.1 / RATE-02: revoke FROM PUBLIC, anon and authenticated on
 *      `check_rate_limit` and `cleanup_rate_limit_counters`, granting only
 *      service_role. PostgreSQL auto-grants EXECUTE to PUBLIC at creation and
 *      anon inherits PUBLIC, so the revoke -- not the function body -- is the
 *      whole control. An anon caller who can reach the limiter can burn any
 *      victim's bucket to zero and deny service to real applicants on the
 *      product's only public unauthenticated write surface.)
 *
 * Four contracts pinned here:
 *
 *   1. ANON cannot reach any of the 22 revoked functions (incl. is_admin after
 *      pass 3). PostgREST surfaces a revoked EXECUTE as 42501 in current
 *      versions; older variants returned 42883 / PGRST202. Accept any of the
 *      three so the test pins "function is unreachable from anon", not a code.
 *
 *   2. AUTHENTICATED cannot reach the two IDOR functions
 *      (`confirm_lease_subscription`, `get_user_plan_limits`). Same code set.
 *
 *   3. `is_admin()` remains executable by AUTHENTICATED (the RLS policy
 *      contract -- 6 {authenticated}-scoped policies call it) and returns false
 *      for a non-admin owner. anon can no longer call it (contract 1): pass 2's
 *      assumption that "RLS needs anon to call is_admin" did not hold for this
 *      schema -- no anon/public policy references it.
 *
 *   4. The two Phase 66.1 rate-limit functions are unreachable from BOTH anon
 *      and authenticated, AND THEY ACTUALLY EXIST. The second half is not
 *      decoration: `REVOKED_CODES` accepts `PGRST202`, which is exactly what
 *      PostgREST returns for a function that is ABSENT. Without a positive
 *      control the revoke assertions pass unchanged against a database where
 *      the migration was never applied, where the function name was typo'd, or
 *      where the argument names drifted -- green, proving nothing. This file
 *      already documents that tautology for `log_lease_signature_activity`
 *      below; the service-role control in the last describe is what stops it
 *      being reintroduced here.
 *
 * The classification spreadsheet lives at
 * `.planning/anon-exec-audit/CYCLE-1.md` and is the source of truth for
 * which functions are in each bucket.
 */

import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";
import { REVOKED_CODES } from "./_helpers/revoked-codes";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const SUPABASE_PUBLISHABLE_KEY =
	process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
	throw new Error(
		"Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
	);
}

/**
 * Service-role env for the RATE-02 positive control only. Same resolution
 * ladder as esign-metering.rls.test.ts.
 *
 * WHEN THIS CONTROL SKIPS, THE RATE-02 REVOKE ASSERTIONS DEGRADE. They stop
 * distinguishing "EXECUTE was revoked" from "the function does not exist",
 * because PostgREST answers both with PGRST202 and REVOKED_CODES accepts it.
 * A green run on a machine without a service-role key therefore does NOT prove
 * the grants; it proves only that anon cannot reach those names for some
 * reason. Do not read it as more than that.
 */
const SERVICE_ROLE_KEY =
	process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
	process.env["SUPABASE_SECRET_KEY"];

const rateLimitControlSkipReason = !SERVICE_ROLE_KEY
	? "SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY not set"
	: null;

/** Namespaced so the control's counter rows are identifiable and disposable. */
const RATE_LIMIT_CONTROL_PREFIX = "test:anon-rpc-grants:";

/**
 * `returns table (...)` arrives over PostgREST as an ARRAY of row objects, so
 * `data.allowed` is always undefined. Read the first row explicitly.
 */
function firstRowAllowed(data: unknown): unknown {
	return Array.isArray(data) ? data[0]?.allowed : undefined;
}

/** Functions revoked from anon (22 total: 2 IDOR + 19 defense-in-depth + is_admin via pass 3). */
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
	// Pass 3: is_admin() takes no args and was revoked FROM PUBLIC. anon now
	// hits a revoked-EXECUTE code instead of getting `false` back.
	{ name: "is_admin" },
	// Phase 66.1 / RATE-02. Argument names must match the migration's parameter
	// names exactly (p_bucket_key, p_max_requests, p_window_ms) -- a drift here
	// turns the assertion into "PostgREST could not resolve the overload",
	// which passes for the wrong reason. The service-role control at the bottom
	// of this file is what pins the names.
	{
		name: "check_rate_limit",
		args: {
			p_bucket_key: "test:anon-grant-probe",
			p_max_requests: 1,
			p_window_ms: 60000,
		},
	},
	{ name: "cleanup_rate_limit_counters" },
];

// Pass 3 also revoked `log_lease_signature_activity` FROM PUBLIC, but it is
// intentionally NOT pinned in this list: it `RETURNS trigger`, so PostgREST never
// exposes it as an RPC -- an anon `.rpc()` probe returns PGRST202 regardless of the
// grant (a tautology, not a real assertion). Its grant state (service_role only) is
// enforced by migration 20260602044104 and monitored by the Supabase Security
// Advisor, which re-flags any anon/PUBLIC re-grant.

/**
 * Functions also revoked from authenticated (the two IDOR fixes, plus the two
 * Phase 66.1 rate-limit functions).
 *
 * The rate-limit pair is revoked from `authenticated` as well as `anon`
 * because an owner session reaching a limiter it can call at will is the same
 * griefing surface as anon reaching it -- it just costs the attacker a signup.
 */
const REVOKED_FROM_AUTHENTICATED: Array<{
	name: string;
	args?: Record<string, unknown>;
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
	{
		name: "check_rate_limit",
		args: {
			p_bucket_key: "test:anon-grant-probe",
			p_max_requests: 1,
			p_window_ms: 60000,
		},
	},
	{ name: "cleanup_rate_limit_counters" },
];

/**
 * v3.0 Security Hardening Phase 1 (migration 20260602202339): functions revoked
 * from `authenticated` (and PUBLIC), service_role retained. Unlike the pass-1/2/3
 * functions these carried a DIRECT `authenticated` EXECUTE grant (not
 * PUBLIC-inherited), so the migration uses REVOKE FROM authenticated -- a bare
 * REVOKE FROM PUBLIC would have been a no-op. Advisor
 * authenticated_security_definer count: 46 -> 44.
 *   - get_lead_paint_compliance_report(): no caller anywhere.
 *   - assert_can_create_lease(uuid, uuid): orphaned; bulk_import_create_lease
 *     validates the lease invariant inline, independent of this function.
 * audit_for_all_policies is intentionally NOT here -- it keeps its authenticated
 * grant under an is_admin() body gate (pinned separately below).
 */
const TIGHTENED_FROM_AUTHENTICATED: Array<{
	name: string;
	args?: Record<string, unknown>;
}> = [
	{ name: "get_lead_paint_compliance_report" },
	{
		name: "assert_can_create_lease",
		args: {
			p_unit_id: "00000000-0000-0000-0000-000000000000",
			p_primary_tenant_id: "00000000-0000-0000-0000-000000000000",
		},
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

	describe("authenticated cannot reach the IDOR + rate-limit functions", () => {
		for (const fn of REVOKED_FROM_AUTHENTICATED) {
			it(`${fn.name}: authenticated REVOKE'd`, async () => {
				const { error } = fn.args
					? await authnClient.rpc(fn.name, fn.args)
					: await authnClient.rpc(fn.name);
				expect(error).not.toBeNull();
				expect(REVOKED_CODES).toContain(error?.code);
			});
		}
	});

	describe("is_admin() pass-3: authenticated retains EXECUTE (RLS policy contract)", () => {
		it("authenticated can still call is_admin and gets false (non-admin owner)", async () => {
			// The 6 policies that call is_admin() are all {authenticated}-scoped,
			// so authenticated MUST keep EXECUTE for RLS to evaluate. ownerA is not
			// an admin, so it returns false (not an error).
			const { data, error } = await authnClient.rpc("is_admin");
			expect(error).toBeNull();
			expect(data).toBe(false);
		});
	});

	describe("v3.0 phase 1: authenticated cannot reach tightened SECURITY DEFINER functions", () => {
		for (const fn of TIGHTENED_FROM_AUTHENTICATED) {
			it(`${fn.name}: authenticated REVOKE'd`, async () => {
				const { error } = fn.args
					? await authnClient.rpc(fn.name, fn.args)
					: await authnClient.rpc(fn.name);
				expect(error).not.toBeNull();
				expect(REVOKED_CODES).toContain(error?.code);
			});
		}
	});

	describe("v3.0 phase 1: KEEP RLS helper remains reachable by authenticated", () => {
		it("get_current_owner_user_id: authenticated reachable, returns ownerA's uuid", async () => {
			// RLS owner-isolation helper (`select auth.uid()`); authenticated MUST
			// keep EXECUTE. For a signed-in owner it returns that owner's uuid -- a
			// non-null uuid string, never a revoked-EXECUTE error and never null
			// (auth.uid() is non-null for an authenticated session). Asserting the
			// shape distinguishes "reachable + correct" from a silent regression to
			// null/garbage. The is_admin() KEEP helper is pinned by the pass-3 test
			// above.
			const { data, error } = await authnClient.rpc(
				"get_current_owner_user_id",
			);
			expect(error).toBeNull();
			expect(typeof data).toBe("string");
			expect(data).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
			);
		});
	});

	describe("v3.0 phase 1: audit_for_all_policies is_admin() leak-closure (TIGHTEN-03)", () => {
		it("non-admin authenticated gets zero rows, not an error", async () => {
			// The authenticated grant is KEPT, but the body now gates on
			// public.is_admin(). ownerA is not an admin, so the policy inventory is not
			// enumerable -- the gate returns an empty set with no error.
			const { data, error } = await authnClient.rpc("audit_for_all_policies", {
				p_role: "service_role",
			});
			expect(error).toBeNull();
			expect(data ?? []).toHaveLength(0);
		});
	});

	// -----------------------------------------------------------------------
	// RATE-02 POSITIVE CONTROL. This is what gives the two rate-limit revoke
	// pins above their meaning.
	//
	// PGRST202 is in REVOKED_CODES and is ALSO what PostgREST returns for a
	// function that does not exist. So "anon got PGRST202" is satisfied by a
	// database where 20260816010000_rate_limit_counters.sql was never applied,
	// by a misspelled function name, and by drifted argument names -- all
	// green, all proving nothing. The assertions below fail in every one of
	// those states.
	//
	// Skips when the service-role key is absent; see the note on
	// rateLimitControlSkipReason for exactly what the pins degrade to then.
	// -----------------------------------------------------------------------
	describe.skipIf(rateLimitControlSkipReason)(
		"RATE-02 positive control: the rate-limit functions exist and resolve",
		() => {
			let serviceClient: SupabaseClient;
			const controlBucketKey = `${RATE_LIMIT_CONTROL_PREFIX}${randomUUID()}`;

			beforeAll(() => {
				serviceClient = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
					auth: { persistSession: false, autoRefreshToken: false },
				});
			});

			afterAll(async () => {
				const { error } = await serviceClient
					.from("rate_limit_counters")
					.delete()
					.like("bucket_key", `${RATE_LIMIT_CONTROL_PREFIX}%`);
				expect(error).toBeNull();
			});

			it("check_rate_limit: service_role reaches it and the first request is admitted", async () => {
				const { data, error } = await serviceClient.rpc("check_rate_limit", {
					p_bucket_key: controlBucketKey,
					p_max_requests: 1,
					p_window_ms: 60000,
				});
				expect(error).toBeNull();
				expect(Array.isArray(data)).toBe(true);
				expect(firstRowAllowed(data)).toBe(true);
			});

			it("cleanup_rate_limit_counters: service_role reaches it and it returns a row count", async () => {
				const { data, error } = await serviceClient.rpc(
					"cleanup_rate_limit_counters",
				);
				expect(error).toBeNull();
				expect(typeof data).toBe("number");
			});
		},
	);
});
