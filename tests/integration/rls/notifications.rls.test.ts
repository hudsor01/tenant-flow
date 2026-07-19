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
