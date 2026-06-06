/**
 * Dual-client (ownerA / ownerB) RLS isolation tests for `inspection_photos`.
 *
 * `inspection_photos` is a JOIN-POLICY child table: it has NO direct owner
 * column. Owner isolation is enforced through the parent chain
 * `inspection_id` / `inspection_room_id` → `inspections.owner_user_id`
 * (every policy keys on `inspection_id IN (SELECT id FROM inspections WHERE
 * owner_user_id = auth.uid())`). This file is the regression proof (TEST-02 /
 * threats T-05-04, T-05-05) that a future RLS refactor cannot silently leak one
 * owner's inspection photos to another through the parent chain. It runs in the
 * `rls-security` CI gate.
 *
 * IMPORTANT — S/I/D ONLY: inspection_photos has SELECT, INSERT, and DELETE
 * policies but **NO UPDATE policy** (verified, LOCKED in 05-CONTEXT.md TEST-02).
 * There is intentionally NO UPDATE assertion in this file — asserting isolation
 * on a non-existent UPDATE policy would be a false test. Do NOT add one.
 *
 * The full parent chain (inspection → room → photo) is built under ownerA. When
 * ownerA has no active lease/unit the inspection cannot be built, so every test
 * skips gracefully (console.warn + return), matching the sibling tests.
 *
 * Every cross-owner case asserts the DENIAL side, not merely "no error":
 *  - SELECT: ownerA's photo id is ABSENT from ownerB's result (0 rows).
 *  - INSERT: ownerB referencing ownerA's inspection_id/inspection_room_id ->
 *    error not null + data null (WITH CHECK EXISTS(inspection owned) fails).
 *  - DELETE: ownerB -> error null + data [] (USING hides the row), then a re-read
 *    as ownerA confirms the photo survives.
 * Positive controls (ownerA self-SELECT/INSERT/DELETE) guard against a
 * false-green test that would pass even if isolation were broken.
 *
 * Reuses the shared `createTestClient` / `getTestCredentials` harness — no
 * reinvented chain-builder or auth.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

describe("inspection_photos RLS — cross-owner isolation (S/I/D only, join via inspection chain)", () => {
	let clientA: SupabaseClient;
	let clientB: SupabaseClient;
	let ownerAId: string;

	// ownerA's parent chain (inspection → room) + the photo row the cross-owner
	// tests target. Built in beforeAll, torn down FK-safe (photo → room →
	// inspection) in afterAll.
	let inspectionA: { id: string } | null = null;
	let roomA: { id: string } | null = null;
	let photoA: { id: string } | null = null;

	beforeAll(async () => {
		const { ownerA, ownerB } = getTestCredentials();
		clientA = await createTestClient(ownerA.email, ownerA.password);
		clientB = await createTestClient(ownerB.email, ownerB.password);

		const {
			data: { user: userA },
		} = await clientA.auth.getUser();
		ownerAId = userA!.id;

		// Build ownerA's inspection from an active lease + its unit/property.
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
		if (!inspectionA) return;

		// Room (intermediate parent — inspection_photos needs inspection_room_id).
		const { data: room } = await clientA
			.from("inspection_rooms")
			.insert({
				inspection_id: inspectionA.id,
				room_name: "RLS Photos Room A",
				room_type: "bedroom",
				condition_rating: "good",
			})
			.select("id")
			.single();
		roomA = room ? { id: room.id } : null;
		if (!roomA) return;

		// Child: an ownerA inspection_photos row referencing BOTH inspection_id
		// and inspection_room_id (required cols: storage_path, file_name).
		const { data: photo } = await clientA
			.from("inspection_photos")
			.insert({
				inspection_id: inspectionA.id,
				inspection_room_id: roomA.id,
				storage_path: "rls-test/owner-a-photo.jpg",
				file_name: "owner-a-photo.jpg",
				mime_type: "image/jpeg",
			})
			.select("id")
			.single();
		photoA = photo ? { id: photo.id } : null;
	});

	afterAll(async () => {
		// FK-safe: photo → room → inspection, under ownerA only.
		if (photoA)
			await clientA.from("inspection_photos").delete().eq("id", photoA.id);
		if (roomA)
			await clientA.from("inspection_rooms").delete().eq("id", roomA.id);
		if (inspectionA)
			await clientA.from("inspections").delete().eq("id", inspectionA.id);
	});

	// -------------------------------------------------------------------------
	// SELECT isolation
	// -------------------------------------------------------------------------

	it("owner A can read their own inspection photo (positive control)", async () => {
		if (!photoA) {
			console.warn("Skipping: ownerA inspection_photos fixture not created");
			return;
		}
		const { data, error } = await clientA
			.from("inspection_photos")
			.select("id")
			.eq("id", photoA.id);
		expect(error).toBeNull();
		expect(data).toEqual([{ id: photoA.id }]);
	});

	it("owner B cannot SELECT owner A's inspection photo (0 rows)", async () => {
		if (!photoA) {
			console.warn("Skipping: ownerA inspection_photos fixture not created");
			return;
		}
		const { data, error } = await clientB
			.from("inspection_photos")
			.select("id")
			.eq("id", photoA.id);
		// Join USING clause hides ownerA's photo from ownerB entirely.
		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	// -------------------------------------------------------------------------
	// INSERT isolation
	// -------------------------------------------------------------------------

	it("owner A can insert a photo for their own inspection/room (positive control)", async () => {
		if (!inspectionA || !roomA) {
			console.warn("Skipping: ownerA inspection/room fixture not created");
			return;
		}
		const { data, error } = await clientA
			.from("inspection_photos")
			.insert({
				inspection_id: inspectionA.id,
				inspection_room_id: roomA.id,
				storage_path: "rls-test/owner-a-insert-photo.jpg",
				file_name: "owner-a-insert-photo.jpg",
				mime_type: "image/jpeg",
			})
			.select("id")
			.single();
		expect(error).toBeNull();
		expect(data).not.toBeNull();
		// Clean up this extra control row immediately.
		if (data)
			await clientA.from("inspection_photos").delete().eq("id", data.id);
	});

	it("owner B cannot INSERT a photo referencing owner A's inspection_id/inspection_room_id", async () => {
		if (!inspectionA || !roomA) {
			console.warn("Skipping: ownerA inspection/room fixture not created");
			return;
		}
		const { data, error } = await clientB
			.from("inspection_photos")
			.insert({
				inspection_id: inspectionA.id,
				inspection_room_id: roomA.id,
				storage_path: "rls-test/owner-b-hijack-photo.jpg",
				file_name: "owner-b-hijack-photo.jpg",
				mime_type: "image/jpeg",
			})
			.select("id")
			.single();
		// WITH CHECK EXISTS(inspection owned by caller) fails — ownerB owns nothing here.
		expect(error).not.toBeNull();
		expect(data).toBeNull();
	});

	// -------------------------------------------------------------------------
	// DELETE isolation
	//
	// NOTE: inspection_photos has S/I/D policies ONLY — there is NO UPDATE policy
	// on this table. An UPDATE cross-owner assertion is deliberately omitted; a
	// test against a non-existent policy would be a false test. Do NOT add one.
	// -------------------------------------------------------------------------

	it("owner A can delete their own throwaway inspection photo (positive control)", async () => {
		if (!inspectionA || !roomA) {
			console.warn("Skipping: ownerA inspection/room fixture not created");
			return;
		}
		const { data: inserted } = await clientA
			.from("inspection_photos")
			.insert({
				inspection_id: inspectionA.id,
				inspection_room_id: roomA.id,
				storage_path: "rls-test/owner-a-delete-photo.jpg",
				file_name: "owner-a-delete-photo.jpg",
				mime_type: "image/jpeg",
			})
			.select("id")
			.single();
		expect(inserted).not.toBeNull();

		const { data, error } = await clientA
			.from("inspection_photos")
			.delete()
			.eq("id", inserted!.id)
			.select("id");
		expect(error).toBeNull();
		expect(data).toEqual([{ id: inserted!.id }]);
	});

	it("owner B cannot DELETE owner A's inspection photo (USING hides it: data []), photo survives", async () => {
		if (!photoA) {
			console.warn("Skipping: ownerA inspection_photos fixture not created");
			return;
		}
		const { data, error } = await clientB
			.from("inspection_photos")
			.delete()
			.eq("id", photoA.id)
			.select("id");
		// USING clause prevents ownerB from seeing/deleting the row.
		expect(error).toBeNull();
		expect(data).toEqual([]);

		// Verify the photo still exists for ownerA.
		const { data: stillExists } = await clientA
			.from("inspection_photos")
			.select("id")
			.eq("id", photoA.id)
			.single();
		expect(stillExists).not.toBeNull();
	});
});
