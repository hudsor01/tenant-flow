/**
 * Dual-client (ownerA / ownerB) RLS isolation tests for `inspection_rooms`.
 *
 * `inspection_rooms` is a JOIN-POLICY child table: it has NO direct owner column.
 * Owner isolation is enforced entirely through `inspection_id` →
 * `inspections.owner_user_id` (every policy keys on `inspection_id IN
 * (SELECT id FROM inspections WHERE owner_user_id = auth.uid())`). This file is
 * the regression proof (TEST-02 / threats T-05-04, T-05-05) that a future RLS
 * refactor cannot silently leak one owner's inspection rooms to another through
 * the parent chain. It runs in the `rls-security` CI gate.
 *
 * inspection_rooms has the full S/I/U/D policy set, so all four are tested.
 *
 * The inspection parent is built from an ownerA lease+unit (mirroring
 * inspections.rls.test.ts). When ownerA has no active lease/unit, the fixture
 * cannot be built and every test skips gracefully (console.warn + return),
 * matching the sibling tests.
 *
 * Every cross-owner case asserts the DENIAL side, not merely "no error":
 *  - SELECT: ownerA's room id is ABSENT from ownerB's result (0 rows).
 *  - INSERT: ownerB referencing ownerA's inspection_id -> error not null + data
 *    null (WITH CHECK EXISTS(inspection owned by caller) fails).
 *  - UPDATE/DELETE: ownerB -> error null + data [] (USING hides the row), then a
 *    re-read as ownerA confirms the row survives unchanged.
 * Positive controls (ownerA self-SELECT/INSERT/UPDATE/DELETE) guard against a
 * false-green test that would pass even if isolation were broken.
 *
 * Reuses the shared `createTestClient` / `getTestCredentials` harness — no
 * reinvented chain-builder or auth.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

describe("inspection_rooms RLS — cross-owner isolation (join via inspection_id)", () => {
	let clientA: SupabaseClient;
	let clientB: SupabaseClient;
	let ownerAId: string;

	// ownerA's parent inspection + the room row the cross-owner tests target.
	// Built in beforeAll, torn down FK-safe (room before inspection) in afterAll.
	let inspectionA: { id: string } | null = null;
	let roomA: { id: string } | null = null;

	beforeAll(async () => {
		const { ownerA, ownerB } = getTestCredentials();
		clientA = await createTestClient(ownerA.email, ownerA.password);
		clientB = await createTestClient(ownerB.email, ownerB.password);

		const {
			data: { user: userA },
		} = await clientA.auth.getUser();
		ownerAId = userA!.id;

		// Build ownerA's inspection parent from an active lease + its unit/property
		// (mirrors inspections.rls.test.ts). Graceful skip if no lease/unit exists.
		const { data: leaseA } = await clientA
			.from("leases")
			.select("id, unit_id")
			.neq("lease_status", "inactive")
			.limit(1)
			.single();
		if (!leaseA) return;

		const { data: unitA } = await clientA
			.from("units")
			.select("id, property_id")
			.eq("id", leaseA.unit_id)
			.single();
		if (!unitA) return;

		const { data: insp } = await clientA
			.from("inspections")
			.insert({
				owner_user_id: ownerAId,
				lease_id: leaseA.id,
				property_id: unitA.property_id,
				unit_id: unitA.id,
				inspection_type: "move_in",
				status: "pending",
			})
			.select("id")
			.single();
		inspectionA = insp ? { id: insp.id } : null;

		// Child: an ownerA inspection_rooms row.
		if (inspectionA) {
			const { data: room } = await clientA
				.from("inspection_rooms")
				.insert({
					inspection_id: inspectionA.id,
					room_name: "RLS Test Room A",
					room_type: "bedroom",
					condition_rating: "good",
				})
				.select("id")
				.single();
			roomA = room ? { id: room.id } : null;
		}
	});

	afterAll(async () => {
		// FK-safe: child (room) before parent (inspection), under ownerA only.
		if (roomA)
			await clientA.from("inspection_rooms").delete().eq("id", roomA.id);
		if (inspectionA)
			await clientA.from("inspections").delete().eq("id", inspectionA.id);
	});

	// -------------------------------------------------------------------------
	// SELECT isolation
	// -------------------------------------------------------------------------

	it("owner A can read their own inspection room (positive control)", async () => {
		if (!roomA) {
			console.warn("Skipping: ownerA inspection_rooms fixture not created");
			return;
		}
		const { data, error } = await clientA
			.from("inspection_rooms")
			.select("id")
			.eq("id", roomA.id);
		expect(error).toBeNull();
		expect(data).toEqual([{ id: roomA.id }]);
	});

	it("owner B cannot SELECT owner A's inspection room (0 rows)", async () => {
		if (!roomA) {
			console.warn("Skipping: ownerA inspection_rooms fixture not created");
			return;
		}
		const { data, error } = await clientB
			.from("inspection_rooms")
			.select("id")
			.eq("id", roomA.id);
		// Join USING clause hides ownerA's room from ownerB entirely.
		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	// -------------------------------------------------------------------------
	// INSERT isolation
	// -------------------------------------------------------------------------

	it("owner A can insert a room for their own inspection (positive control)", async () => {
		if (!inspectionA) {
			console.warn("Skipping: ownerA inspection fixture not created");
			return;
		}
		const { data, error } = await clientA
			.from("inspection_rooms")
			.insert({
				inspection_id: inspectionA.id,
				room_name: "RLS Insert Room A",
				room_type: "kitchen",
				condition_rating: "excellent",
			})
			.select("id")
			.single();
		expect(error).toBeNull();
		expect(data).not.toBeNull();
		// Clean up this extra control row immediately.
		if (data) await clientA.from("inspection_rooms").delete().eq("id", data.id);
	});

	it("owner B cannot INSERT a room referencing owner A's inspection_id", async () => {
		if (!inspectionA) {
			console.warn("Skipping: ownerA inspection fixture not created");
			return;
		}
		const { data, error } = await clientB
			.from("inspection_rooms")
			.insert({
				inspection_id: inspectionA.id,
				room_name: "RLS Hijack Room",
				room_type: "bedroom",
				condition_rating: "good",
			})
			.select("id")
			.single();
		// WITH CHECK EXISTS(inspection owned by caller) fails — ownerB owns nothing here.
		expect(error).not.toBeNull();
		expect(data).toBeNull();
	});

	// -------------------------------------------------------------------------
	// UPDATE isolation
	// -------------------------------------------------------------------------

	it("owner A can update their own inspection room and restore it (positive control)", async () => {
		if (!roomA) {
			console.warn("Skipping: ownerA inspection_rooms fixture not created");
			return;
		}
		const { data, error } = await clientA
			.from("inspection_rooms")
			.update({ notes: "RLS update test" })
			.eq("id", roomA.id)
			.select("id");
		expect(error).toBeNull();
		expect(data).toEqual([{ id: roomA.id }]);
		// Restore original (null notes).
		await clientA
			.from("inspection_rooms")
			.update({ notes: null })
			.eq("id", roomA.id);
	});

	it("owner B cannot UPDATE owner A's inspection room (USING hides it: data []), row survives", async () => {
		if (!roomA) {
			console.warn("Skipping: ownerA inspection_rooms fixture not created");
			return;
		}
		const { data, error } = await clientB
			.from("inspection_rooms")
			.update({ notes: "RLS hijack update" })
			.eq("id", roomA.id)
			.select("id");
		// USING clause prevents ownerB from seeing/updating the row.
		expect(error).toBeNull();
		expect(data).toEqual([]);

		// Row survives unchanged for ownerA.
		const { data: stillExists } = await clientA
			.from("inspection_rooms")
			.select("id, notes")
			.eq("id", roomA.id)
			.single();
		expect(stillExists).not.toBeNull();
		expect(stillExists!.notes).toBeNull();
	});

	// -------------------------------------------------------------------------
	// DELETE isolation
	// -------------------------------------------------------------------------

	it("owner A can delete their own throwaway inspection room (positive control)", async () => {
		if (!inspectionA) {
			console.warn("Skipping: ownerA inspection fixture not created");
			return;
		}
		const { data: inserted } = await clientA
			.from("inspection_rooms")
			.insert({
				inspection_id: inspectionA.id,
				room_name: "RLS Delete Room A",
				room_type: "bathroom",
				condition_rating: "fair",
			})
			.select("id")
			.single();
		expect(inserted).not.toBeNull();

		const { data, error } = await clientA
			.from("inspection_rooms")
			.delete()
			.eq("id", inserted!.id)
			.select("id");
		expect(error).toBeNull();
		expect(data).toEqual([{ id: inserted!.id }]);
	});

	it("owner B cannot DELETE owner A's inspection room (USING hides it: data []), row survives", async () => {
		if (!roomA) {
			console.warn("Skipping: ownerA inspection_rooms fixture not created");
			return;
		}
		const { data, error } = await clientB
			.from("inspection_rooms")
			.delete()
			.eq("id", roomA.id)
			.select("id");
		// USING clause prevents ownerB from seeing/deleting the row.
		expect(error).toBeNull();
		expect(data).toEqual([]);

		// Verify the row still exists for ownerA.
		const { data: stillExists } = await clientA
			.from("inspection_rooms")
			.select("id")
			.eq("id", roomA.id)
			.single();
		expect(stillExists).not.toBeNull();
	});
});
