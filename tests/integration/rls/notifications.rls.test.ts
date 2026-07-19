import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";
import { REVOKED_CODES } from "./_helpers/revoked-codes";

describe("Notifications RLS — cross-owner isolation", () => {
	let clientA: SupabaseClient;
	let clientB: SupabaseClient;
	let ownerAId: string;
	let ownerBId: string;

	beforeAll(async () => {
		const { ownerA, ownerB } = getTestCredentials();
		clientA = await createTestClient(ownerA.email, ownerA.password);
		clientB = await createTestClient(ownerB.email, ownerB.password);

		const {
			data: { user: userA },
		} = await clientA.auth.getUser();
		const {
			data: { user: userB },
		} = await clientB.auth.getUser();
		ownerAId = userA!.id;
		ownerBId = userB!.id;
	});

	// ---------------------------------------------------------------------------
	// SELECT isolation — notifications scoped by user_id = auth.uid()
	// ---------------------------------------------------------------------------

	it("owner A can only read their own notifications", async () => {
		const { data, error } = await clientA
			.from("notifications")
			.select("id, user_id");

		expect(error).toBeNull();
		expect(data).not.toBeNull();

		if (!data || data.length === 0) return;

		data.forEach((row) => {
			expect(row.user_id).toBe(ownerAId);
		});
	});

	it("owner B can only read their own notifications", async () => {
		const { data, error } = await clientB
			.from("notifications")
			.select("id, user_id");

		expect(error).toBeNull();
		expect(data).not.toBeNull();

		if (!data || data.length === 0) return;

		data.forEach((row) => {
			expect(row.user_id).toBe(ownerBId);
		});
	});

	it("owner A results contain no rows from owner B", async () => {
		const { data: dataA } = await clientA.from("notifications").select("id");
		const { data: dataB } = await clientB.from("notifications").select("id");

		const ownerAIds = new Set((dataA ?? []).map((r) => r.id as string));
		const ownerBIds = new Set((dataB ?? []).map((r) => r.id as string));

		// Cross-owner isolation: no overlap
		ownerBIds.forEach((id) => {
			expect(ownerAIds.has(id)).toBe(false);
		});
	});

	// ---------------------------------------------------------------------------
	// UPDATE isolation — only own notifications can be updated (e.g., mark as read)
	// ---------------------------------------------------------------------------

	it("owner B cannot update owner A notifications", async () => {
		const { data: notificationsA } = await clientA
			.from("notifications")
			.select("id")
			.limit(1);

		// Skip if owner A has no notifications
		if (!notificationsA || notificationsA.length === 0) return;

		const targetId = notificationsA[0]!.id as string;

		// Owner B tries to update owner A's notification — RLS blocks.
		// Column is `is_read` (generated types) — `read` is not a column; using it
		// would 400 at the PostgREST boundary and mask the RLS assertion.
		const { data, error } = await clientB
			.from("notifications")
			.update({ is_read: true })
			.eq("id", targetId)
			.select("id");

		// RLS USING clause prevents owner B from seeing/updating the row
		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	// ---------------------------------------------------------------------------
	// create_notification privilege boundary (T-52-01) — the write-path RPC is
	// service_role-only. An authenticated owner must NOT be able to mint
	// notifications (for themselves or anyone else); writes go through triggers.
	// ---------------------------------------------------------------------------

	it("create_notification is not callable by the authenticated role", async () => {
		const { data, error } = await clientA.rpc("create_notification", {
			p_user_id: ownerAId,
			p_type: "lease_signed",
			p_title: "x",
		});

		// EXECUTE is revoked from public/authenticated (granted to service_role
		// only). PostgREST surfaces this as insufficient_privilege / undefined_
		// function / not-found — accept the canonical revoked-EXECUTE code set.
		expect(error).not.toBeNull();
		expect(REVOKED_CODES).toContain(error?.code);
		expect(data).toBeNull();
	});
});

// -----------------------------------------------------------------------------
// Event-trigger insertion (NOTIF-04) — the notify_owner_maintenance AFTER INSERT
// trigger publishes a maintenance_created notification through the service_role
// create_notification RPC. Exercises the full un-bypassable write path (trigger →
// SECURITY DEFINER RPC → notification row) plus cross-owner isolation.
//
// Requires the 20260719130000_notification_and_activity_event_triggers migration
// applied to prod (deferred to the orchestrator; see 52-02-SUMMARY). Until then
// this block fails because no notification row is written — that is the intended
// signal that the trigger is not yet live.
// -----------------------------------------------------------------------------
describe("Notifications RLS — event trigger insertion (NOTIF-04)", () => {
	let clientA: SupabaseClient;
	let clientB: SupabaseClient;
	let ownerAId: string;

	// Fixtures created in beforeAll, removed in afterAll (best-effort).
	let propertyA: { id: string } | null = null;
	let unitA: { id: string } | null = null;
	let tenantA: { id: string } | null = null;
	let maintenanceA: { id: string } | null = null;

	beforeAll(async () => {
		const { ownerA, ownerB } = getTestCredentials();
		clientA = await createTestClient(ownerA.email, ownerA.password);
		clientB = await createTestClient(ownerB.email, ownerB.password);

		const {
			data: { user: userA },
		} = await clientA.auth.getUser();
		ownerAId = userA!.id;

		// Property → unit → tenant fixtures owned by ownerA (mirrors the
		// dashboard-rpc-open-maintenance dual-client fixture pattern). tenant_id and
		// unit_id are NOT NULL on maintenance_requests, so both are required.
		const { data: pA } = await clientA
			.from("properties")
			.insert({
				name: "Notif Trigger Test Property A",
				address_line1: "1 Notif St",
				city: "Testville",
				state: "CA",
				postal_code: "94105",
				country: "US",
				property_type: "APARTMENT",
				owner_user_id: ownerAId,
			})
			.select("id")
			.single();
		propertyA = pA ? { id: pA.id } : null;

		if (propertyA) {
			const { data: uA } = await clientA
				.from("units")
				.insert({
					property_id: propertyA.id,
					unit_number: "NOTIF-A-101",
					bedrooms: 1,
					bathrooms: 1,
					rent_amount: 1500,
					owner_user_id: ownerAId,
				})
				.select("id")
				.single();
			unitA = uA ? { id: uA.id } : null;
		}

		const { data: tA } = await clientA
			.from("tenants")
			.insert({
				email: `notif-trigger-test-tenant-a-${Date.now()}@example.com`,
				first_name: "Notif",
				last_name: "TestA",
				owner_user_id: ownerAId,
			})
			.select("id")
			.single();
		tenantA = tA ? { id: tA.id } : null;

		// The INSERT under test — the AFTER INSERT trigger fires create_notification.
		if (unitA && tenantA) {
			const { data: mA } = await clientA
				.from("maintenance_requests")
				.insert({
					unit_id: unitA.id,
					tenant_id: tenantA.id,
					title: "Trigger test — leaky faucet",
					description: "RLS trigger fixture — pins notify_owner_maintenance",
					priority: "normal",
					status: "open",
					owner_user_id: ownerAId,
				})
				.select("id")
				.single();
			maintenanceA = mA ? { id: mA.id } : null;
		}
	});

	afterAll(async () => {
		// Best-effort fixture teardown. The trigger-created notification rows cannot
		// be removed by the authenticated role (no DELETE policy — cleanup is the
		// NOTIF-05 retention cron's job), so they persist harmlessly for the
		// synthetic owner; only the source entities are deleted here.
		if (maintenanceA)
			await clientA
				.from("maintenance_requests")
				.delete()
				.eq("id", maintenanceA.id);
		if (tenantA) await clientA.from("tenants").delete().eq("id", tenantA.id);
		if (unitA) await clientA.from("units").delete().eq("id", unitA.id);
		if (propertyA)
			await clientA.from("properties").delete().eq("id", propertyA.id);
	});

	it("a maintenance INSERT creates a maintenance_created notification for the owner", async () => {
		expect(maintenanceA).not.toBeNull();

		const { data, error, count } = await clientA
			.from("notifications")
			.select("id, title, entity_id, action_url", { count: "exact" })
			.eq("notification_type", "maintenance_created")
			.eq("entity_id", maintenanceA!.id);

		expect(error).toBeNull();
		expect(count).toBe(1);
		expect(data?.[0]?.title).toBe("New maintenance request");
		expect(data?.[0]?.action_url).toBe(`/maintenance/${maintenanceA!.id}`);
	});

	it("the other owner cannot see the maintenance notification (cross-owner isolation)", async () => {
		expect(maintenanceA).not.toBeNull();

		const { data, error } = await clientB
			.from("notifications")
			.select("id")
			.eq("entity_id", maintenanceA!.id);

		expect(error).toBeNull();
		expect(data).toEqual([]);
	});
});
