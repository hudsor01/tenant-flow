/**
 * RLS integration test: public.analytics_events and get_marketing_funnel
 * (2026-11-24 SEO audit T1, migration 20261125172716_analytics_events).
 *
 * The table is written only by the `track-event` Edge Function (service
 * role). Pinned here, against production:
 *   1. an owner can neither read nor write it (admin-only SELECT, no INSERT
 *      grant), and anon cannot reach it at all;
 *   2. get_marketing_funnel rejects a non-admin owner in its body and anon at
 *      the role-level revoke;
 *   3. positive controls, so the denials above cannot pass against a missing
 *      table: a service-role seeded row exists, an admin reads it, and the
 *      funnel returns its five steps in order.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	createTestClient,
	getAdminTestCredentials,
	getTestCredentials,
} from "../setup/supabase-client";
import { REVOKED_CODES } from "./_helpers/revoked-codes";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const SUPABASE_PUBLISHABLE_KEY =
	process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
const SERVICE_ROLE_KEY =
	process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
	process.env["SUPABASE_SECRET_KEY"];
const adminCreds = getAdminTestCredentials();

const STEPS = [
	"cta_start_free",
	"signup_started",
	"signup_completed",
	"checkout_started",
	"checkout_completed",
];
/** Marks this run's seeded row, so cleanup touches only it. */
const SEED_PATH = `/rls-test/${Date.now()}`;

describe("analytics_events and get_marketing_funnel", () => {
	let ownerClient: SupabaseClient;
	let anonClient: SupabaseClient;
	let serviceClient: SupabaseClient;
	let adminClient: SupabaseClient;

	beforeAll(async () => {
		if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !SERVICE_ROLE_KEY) {
			throw new Error(
				"Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / SUPABASE_SERVICE_ROLE_KEY",
			);
		}
		if (!adminCreds)
			throw new Error("Missing E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD");
		const { ownerA } = getTestCredentials();
		ownerClient = await createTestClient(ownerA.email, ownerA.password);
		adminClient = await createTestClient(
			adminCreds.admin.email,
			adminCreds.admin.password,
		);
		anonClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
		serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
			auth: { persistSession: false, autoRefreshToken: false },
		});

		const { error } = await serviceClient.from("analytics_events").insert({
			name: "cta_start_free",
			props: { location: "rls-test" },
			path: SEED_PATH,
		});
		if (error) throw new Error(`seed failed: ${error.message}`);
	});

	afterAll(async () => {
		await serviceClient
			?.from("analytics_events")
			.delete()
			.eq("path", SEED_PATH);
	});

	it("lets an admin read a seeded event (positive control)", async () => {
		const { data, error } = await adminClient
			.from("analytics_events")
			.select("name, path")
			.eq("path", SEED_PATH);
		expect(error).toBeNull();
		expect(data).toEqual([{ name: "cta_start_free", path: SEED_PATH }]);
	});

	it("hides every event from a non-admin owner", async () => {
		const { data, error } = await ownerClient
			.from("analytics_events")
			.select("id")
			.eq("path", SEED_PATH);
		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	it("refuses an owner's insert: only the Edge Function writes", async () => {
		const { error } = await ownerClient
			.from("analytics_events")
			.insert({ name: "cta_start_free", path: `${SEED_PATH}/owner` });
		expect(error?.code).toBe("42501");
	});

	it("gives anon no access to the table", async () => {
		const read = await anonClient
			.from("analytics_events")
			.select("id")
			.limit(1);
		expect(read.error?.code).toBe("42501");
		const write = await anonClient
			.from("analytics_events")
			.insert({ name: "cta_start_free", path: `${SEED_PATH}/anon` });
		expect(write.error?.code).toBe("42501");
	});

	it("returns the five funnel steps, in order, to an admin", async () => {
		const { data, error } = await adminClient.rpc("get_marketing_funnel", {
			p_days: 1,
		});
		expect(error).toBeNull();
		const rows = (data ?? []) as Array<{ step: string; events: number }>;
		expect(rows.map((row) => row.step)).toEqual(STEPS);
		expect(rows[0]?.events).toBeGreaterThanOrEqual(1);
	});

	it("rejects a non-admin owner's funnel call in its body", async () => {
		const { data, error } = await ownerClient.rpc("get_marketing_funnel", {
			p_days: 30,
		});
		expect(data).toBeNull();
		expect(error?.message).toMatch(/unauthorized/i);
	});

	it("rejects anon's funnel call at the role-level revoke", async () => {
		const { data, error } = await anonClient.rpc("get_marketing_funnel", {
			p_days: 30,
		});
		expect(data).toBeNull();
		expect(REVOKED_CODES).toContain(error?.code);
	});
});
