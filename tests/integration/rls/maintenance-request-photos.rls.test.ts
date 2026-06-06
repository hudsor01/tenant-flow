/**
 * Dual-client (ownerA / ownerB) RLS isolation tests for
 * `maintenance_request_photos`.
 *
 * `maintenance_request_photos` is a JOIN-POLICY child table: it has NO direct
 * owner column. Owner isolation is enforced through `maintenance_request_id` →
 * `maintenance_requests.owner_user_id` (every policy keys on
 * `maintenance_request_id IN (SELECT id FROM maintenance_requests WHERE
 * owner_user_id = auth.uid())`). This file is the regression proof (TEST-02 /
 * threats T-05-04, T-05-05) that a future RLS refactor cannot silently leak one
 * owner's maintenance photos to another through the parent chain. It runs in the
 * `rls-security` CI gate.
 *
 * IMPORTANT — S/I/D ONLY: maintenance_request_photos has SELECT, INSERT, and
 * DELETE policies but **NO UPDATE policy** (verified, LOCKED in 05-CONTEXT.md
 * TEST-02). There is intentionally NO UPDATE assertion in this file — asserting
 * isolation on a non-existent UPDATE policy would be a false test. Do NOT add one.
 *
 * The maintenance_request parent is SELECTED (not inserted): owners cannot INSERT
 * maintenance_requests (the INSERT policy requires tenant_id =
 * get_current_tenant_id()), so this test reuses a pre-existing ownerA request
 * (`.limit(1).single()`) and skips gracefully when ownerA has none — mirroring
 * maintenance.rls.test.ts. The pre-existing request is NEVER deleted; only the
 * photo rows this test inserts are cleaned up.
 *
 * Every cross-owner case asserts the DENIAL side, not merely "no error":
 *  - SELECT: ownerA's photo id is ABSENT from ownerB's result (0 rows).
 *  - INSERT: ownerB referencing ownerA's maintenance_request_id -> error not null
 *    + data null (WITH CHECK EXISTS(request owned by caller) fails).
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

describe("maintenance_request_photos RLS — cross-owner isolation (S/I/D only, join via maintenance_request_id)", () => {
	let clientA: SupabaseClient;
	let clientB: SupabaseClient;

	// ownerA's pre-existing maintenance_request parent (SELECTED, never created /
	// deleted) + the photo row the cross-owner tests target (inserted/cleaned up).
	let requestA: { id: string } | null = null;
	let photoA: { id: string } | null = null;

	beforeAll(async () => {
		const { ownerA, ownerB } = getTestCredentials();
		clientA = await createTestClient(ownerA.email, ownerA.password);
		clientB = await createTestClient(ownerB.email, ownerB.password);

		// Owners cannot INSERT maintenance_requests (INSERT policy is tenant-scoped),
		// so SELECT an existing ownerA request as the parent. Skip if none exist.
		const { data: mr } = await clientA
			.from("maintenance_requests")
			.select("id")
			.limit(1)
			.single();
		requestA = mr ? { id: mr.id } : null;
		if (!requestA) return;

		// Child: an ownerA maintenance_request_photos row (required cols:
		// storage_path, file_name).
		const { data: photo } = await clientA
			.from("maintenance_request_photos")
			.insert({
				maintenance_request_id: requestA.id,
				storage_path: "rls-test/owner-a-mr-photo.jpg",
				file_name: "owner-a-mr-photo.jpg",
				mime_type: "image/jpeg",
			})
			.select("id")
			.single();
		photoA = photo ? { id: photo.id } : null;
	});

	afterAll(async () => {
		// Delete ONLY the photo this test inserted. NEVER delete the pre-existing
		// maintenance_request (it belongs to ownerA's real data, not this test).
		if (photoA)
			await clientA
				.from("maintenance_request_photos")
				.delete()
				.eq("id", photoA.id);
	});

	// -------------------------------------------------------------------------
	// SELECT isolation
	// -------------------------------------------------------------------------

	it("owner A can read their own maintenance request photo (positive control)", async () => {
		if (!photoA) {
			console.warn(
				"Skipping: ownerA maintenance_request_photos fixture not created",
			);
			return;
		}
		const { data, error } = await clientA
			.from("maintenance_request_photos")
			.select("id")
			.eq("id", photoA.id);
		expect(error).toBeNull();
		expect(data).toEqual([{ id: photoA.id }]);
	});

	it("owner B cannot SELECT owner A's maintenance request photo (0 rows)", async () => {
		if (!photoA) {
			console.warn(
				"Skipping: ownerA maintenance_request_photos fixture not created",
			);
			return;
		}
		const { data, error } = await clientB
			.from("maintenance_request_photos")
			.select("id")
			.eq("id", photoA.id);
		// Join USING clause hides ownerA's photo from ownerB entirely.
		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	// -------------------------------------------------------------------------
	// INSERT isolation
	// -------------------------------------------------------------------------

	it("owner A can insert a photo for their own maintenance request (positive control)", async () => {
		if (!requestA) {
			console.warn("Skipping: ownerA maintenance_request fixture not found");
			return;
		}
		const { data, error } = await clientA
			.from("maintenance_request_photos")
			.insert({
				maintenance_request_id: requestA.id,
				storage_path: "rls-test/owner-a-mr-insert.jpg",
				file_name: "owner-a-mr-insert.jpg",
				mime_type: "image/jpeg",
			})
			.select("id")
			.single();
		expect(error).toBeNull();
		expect(data).not.toBeNull();
		// Clean up this extra control row immediately.
		if (data)
			await clientA
				.from("maintenance_request_photos")
				.delete()
				.eq("id", data.id);
	});

	it("owner B cannot INSERT a photo referencing owner A's maintenance_request_id", async () => {
		if (!requestA) {
			console.warn("Skipping: ownerA maintenance_request fixture not found");
			return;
		}
		const { data, error } = await clientB
			.from("maintenance_request_photos")
			.insert({
				maintenance_request_id: requestA.id,
				storage_path: "rls-test/owner-b-mr-hijack.jpg",
				file_name: "owner-b-mr-hijack.jpg",
				mime_type: "image/jpeg",
			})
			.select("id")
			.single();
		// WITH CHECK EXISTS(request owned by caller) fails — ownerB owns nothing here.
		expect(error).not.toBeNull();
		expect(data).toBeNull();
	});

	// -------------------------------------------------------------------------
	// DELETE isolation
	//
	// NOTE: maintenance_request_photos has S/I/D policies ONLY — there is NO
	// UPDATE policy on this table. An UPDATE cross-owner assertion is deliberately
	// omitted; a test against a non-existent policy would be a false test. Do NOT
	// add one.
	// -------------------------------------------------------------------------

	it("owner A can delete their own throwaway maintenance request photo (positive control)", async () => {
		if (!requestA) {
			console.warn("Skipping: ownerA maintenance_request fixture not found");
			return;
		}
		const { data: inserted } = await clientA
			.from("maintenance_request_photos")
			.insert({
				maintenance_request_id: requestA.id,
				storage_path: "rls-test/owner-a-mr-delete.jpg",
				file_name: "owner-a-mr-delete.jpg",
				mime_type: "image/jpeg",
			})
			.select("id")
			.single();
		expect(inserted).not.toBeNull();

		const { data, error } = await clientA
			.from("maintenance_request_photos")
			.delete()
			.eq("id", inserted!.id)
			.select("id");
		expect(error).toBeNull();
		expect(data).toEqual([{ id: inserted!.id }]);
	});

	it("owner B cannot DELETE owner A's maintenance request photo (USING hides it: data []), photo survives", async () => {
		if (!photoA) {
			console.warn(
				"Skipping: ownerA maintenance_request_photos fixture not created",
			);
			return;
		}
		const { data, error } = await clientB
			.from("maintenance_request_photos")
			.delete()
			.eq("id", photoA.id)
			.select("id");
		// USING clause prevents ownerB from seeing/deleting the row.
		expect(error).toBeNull();
		expect(data).toEqual([]);

		// Verify the photo still exists for ownerA.
		const { data: stillExists } = await clientA
			.from("maintenance_request_photos")
			.select("id")
			.eq("id", photoA.id)
			.single();
		expect(stillExists).not.toBeNull();
	});
});
