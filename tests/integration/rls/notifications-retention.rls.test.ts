import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";
import { REVOKED_CODES } from "./_helpers/revoked-codes";

// -----------------------------------------------------------------------------
// Notifications retention (NOTIF-05 / D-12) — privilege boundary probes.
//
// The retention cron (cleanup_old_notifications) archives read notifications
// older than 90d and unread older than 180d into notifications_archive, then
// deletes only the archived rows, in 10k batches with FOR UPDATE SKIP LOCKED.
//
// The archive table and the cleanup function are BOTH service_role-only, so the
// deep archive-then-delete behaviour cannot be exercised by an authenticated
// dual-client. Those assertions (cron.job has 'cleanup-notifications' at
// '45 3 * * *'; to_regclass('public.notifications_archive') is non-null; the
// tiered archive count) are verified by the orchestrator via MCP execute_sql
// and recorded in 52-03-SUMMARY.
//
// What an authenticated client CAN assert are the two security boundaries the
// retention migration establishes — and those are exactly what the threat model
// (T-52-10, T-52-11) requires:
//   1. cleanup_old_notifications() is NOT callable by the authenticated role
//      (no cross-tenant archive-and-delete sweep triggerable from a client).
//   2. notifications_archive is NOT readable by the authenticated role
//      (service_role-only; no information disclosure of archived rows).
//
// Requires 20260719202447_notifications_retention_cron applied to prod (deferred
// to the orchestrator; see 52-03-SUMMARY). Before it is applied the RPC surfaces
// as function-not-found and the table as not-in-schema-cache — both still
// non-null errors, so the privilege boundary holds either way. Synthetic owners
// only, sequential, hits prod (CLAUDE.md).
// -----------------------------------------------------------------------------
describe("Notifications retention — privilege boundaries (NOTIF-05)", () => {
	let clientA: SupabaseClient;
	let ownerAId: string;

	beforeAll(async () => {
		const { ownerA } = getTestCredentials();
		clientA = await createTestClient(ownerA.email, ownerA.password);

		const {
			data: { user: userA },
		} = await clientA.auth.getUser();
		ownerAId = userA!.id;
	});

	// ---------------------------------------------------------------------------
	// T-52-11 — the cleanup batch job is a SECURITY DEFINER cron function granted
	// to service_role only. An authenticated owner must NOT be able to invoke it
	// (invoking it would run a cross-tenant archive-and-delete sweep, bypassing
	// RLS via the definer context).
	// ---------------------------------------------------------------------------
	it("cleanup_old_notifications is not callable by the authenticated role", async () => {
		const { data, error } = await clientA.rpc("cleanup_old_notifications");

		// EXECUTE is revoked from public/authenticated (granted to service_role
		// only). PostgREST surfaces this as insufficient_privilege /
		// undefined_function / function-not-found — accept the canonical
		// revoked-EXECUTE code set.
		expect(error).not.toBeNull();
		expect(REVOKED_CODES).toContain(error?.code);
		expect(data).toBeNull();
	});

	// ---------------------------------------------------------------------------
	// T-52-10 — the archive table holds operational copies of every user's
	// notifications. It is service_role-only (RLS enabled, no authenticated
	// policy, no authenticated grant), so an authenticated owner must NOT be able
	// to read from it (no cross-tenant information disclosure of archived rows).
	// ---------------------------------------------------------------------------
	it("notifications_archive is not readable by the authenticated role", async () => {
		const { data, error } = await clientA
			.from("notifications_archive")
			.select("id")
			.limit(1);

		// Missing table grant / RLS row-deny surfaces as a non-null error (42501
		// permission-denied once applied, or not-in-schema-cache before). Either
		// way the authenticated role gets no rows back.
		expect(error).not.toBeNull();
		expect(data).toBeNull();
	});
});
