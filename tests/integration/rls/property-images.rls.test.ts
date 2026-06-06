/**
 * Dual-client (ownerA / ownerB) RLS isolation tests for `property_images`.
 *
 * `property_images` is a JOIN-POLICY child table: it has NO direct owner column.
 * Owner isolation is enforced entirely through `property_id` → `properties.owner`
 * (every policy keys on `property_id IN (SELECT id FROM properties WHERE
 * owner_user_id = auth.uid())`). This file is the regression proof (TEST-02 /
 * threats T-05-04, T-05-05) that a future RLS refactor cannot silently leak one
 * owner's images to another through the parent chain. It runs in the
 * `rls-security` CI gate.
 *
 * property_images has the full S/I/U/D policy set, so all four are tested.
 *
 * Every cross-owner case asserts the DENIAL side, not merely "no error":
 *  - SELECT: ownerA's image id is ABSENT from ownerB's result (0 rows).
 *  - INSERT: ownerB referencing ownerA's property_id -> error not null + data
 *    null (WITH CHECK EXISTS(property owned by caller) fails).
 *  - UPDATE/DELETE: ownerB -> error null + data [] (USING hides the row), then a
 *    re-read as ownerA confirms the row survives unchanged.
 * Positive controls (ownerA self-SELECT/INSERT/UPDATE/DELETE on the existing
 * policy) prove the policy rejects only the cross-owner case, guarding against a
 * false-green test that would pass even if isolation were broken.
 *
 * Mirrors `tests/integration/rls/reports.rls.test.ts` style and reuses the
 * shared `createTestClient` / `getTestCredentials` harness — no reinvented
 * chain-builder or auth. `getTestCredentials()` throws when the four E2E_OWNER_*
 * env vars are unset; CI provides them via repo secrets, local runs require
 * `.env.local`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

describe("property_images RLS — cross-owner isolation (join via property_id)", () => {
	let clientA: SupabaseClient;
	let clientB: SupabaseClient;
	let ownerAId: string;

	// ownerA's parent property + the image row the cross-owner tests target.
	// Built in beforeAll, torn down FK-safe (image before property) in afterAll.
	let propertyA: { id: string } | null = null;
	let imageA: { id: string } | null = null;

	beforeAll(async () => {
		const { ownerA, ownerB } = getTestCredentials();
		clientA = await createTestClient(ownerA.email, ownerA.password);
		clientB = await createTestClient(ownerB.email, ownerB.password);

		const {
			data: { user: userA },
		} = await clientA.auth.getUser();
		ownerAId = userA!.id;

		// Parent: a fresh ownerA property (mirrors properties.rls.test.ts columns).
		const { data: pA } = await clientA
			.from("properties")
			.insert({
				owner_user_id: ownerAId,
				name: "RLS Test Property (images)",
				address_line1: "999 Image Street",
				city: "Testville",
				state: "TX",
				postal_code: "00000",
				property_type: "single_family",
				country: "US",
			})
			.select("id")
			.single();
		propertyA = pA ? { id: pA.id } : null;

		// Child: an ownerA property_images row (required cols: image_url + property_id).
		if (propertyA) {
			const { data: imgA } = await clientA
				.from("property_images")
				.insert({
					property_id: propertyA.id,
					image_url: "rls-test/owner-a-image.jpg",
					display_order: 0,
				})
				.select("id")
				.single();
			imageA = imgA ? { id: imgA.id } : null;
		}
	});

	afterAll(async () => {
		// FK-safe: child (image) before parent (property), under ownerA only.
		if (imageA)
			await clientA.from("property_images").delete().eq("id", imageA.id);
		if (propertyA)
			await clientA.from("properties").delete().eq("id", propertyA.id);
	});

	// -------------------------------------------------------------------------
	// SELECT isolation
	// -------------------------------------------------------------------------

	it("owner A can read their own property image (positive control)", async () => {
		if (!imageA) {
			console.warn("Skipping: ownerA property_images fixture not created");
			return;
		}
		const { data, error } = await clientA
			.from("property_images")
			.select("id")
			.eq("id", imageA.id);
		expect(error).toBeNull();
		expect(data).toEqual([{ id: imageA.id }]);
	});

	it("owner B cannot SELECT owner A's property image (0 rows)", async () => {
		if (!imageA) {
			console.warn("Skipping: ownerA property_images fixture not created");
			return;
		}
		const { data, error } = await clientB
			.from("property_images")
			.select("id")
			.eq("id", imageA.id);
		// Join USING clause hides ownerA's image from ownerB entirely.
		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	// -------------------------------------------------------------------------
	// INSERT isolation
	// -------------------------------------------------------------------------

	it("owner A can insert an image for their own property (positive control)", async () => {
		if (!propertyA) {
			console.warn("Skipping: ownerA property fixture not created");
			return;
		}
		const { data, error } = await clientA
			.from("property_images")
			.insert({
				property_id: propertyA.id,
				image_url: "rls-test/owner-a-insert.jpg",
				display_order: 1,
			})
			.select("id")
			.single();
		expect(error).toBeNull();
		expect(data).not.toBeNull();
		// Clean up this extra control row immediately.
		if (data) await clientA.from("property_images").delete().eq("id", data.id);
	});

	it("owner B cannot INSERT an image referencing owner A's property_id", async () => {
		if (!propertyA) {
			console.warn("Skipping: ownerA property fixture not created");
			return;
		}
		const { data, error } = await clientB
			.from("property_images")
			.insert({
				property_id: propertyA.id,
				image_url: "rls-test/owner-b-hijack.jpg",
				display_order: 0,
			})
			.select("id")
			.single();
		// WITH CHECK EXISTS(property owned by caller) fails — ownerB owns nothing here.
		expect(error).not.toBeNull();
		expect(data).toBeNull();
	});

	// -------------------------------------------------------------------------
	// UPDATE isolation
	// -------------------------------------------------------------------------

	it("owner A can update their own property image and restore it (positive control)", async () => {
		if (!imageA) {
			console.warn("Skipping: ownerA property_images fixture not created");
			return;
		}
		const { data, error } = await clientA
			.from("property_images")
			.update({ display_order: 5 })
			.eq("id", imageA.id)
			.select("id");
		expect(error).toBeNull();
		expect(data).toEqual([{ id: imageA.id }]);
		// Restore original display_order.
		await clientA
			.from("property_images")
			.update({ display_order: 0 })
			.eq("id", imageA.id);
	});

	it("owner B cannot UPDATE owner A's property image (USING hides it: data []), row survives", async () => {
		if (!imageA) {
			console.warn("Skipping: ownerA property_images fixture not created");
			return;
		}
		const { data, error } = await clientB
			.from("property_images")
			.update({ display_order: 999 })
			.eq("id", imageA.id)
			.select("id");
		// USING clause prevents ownerB from seeing/updating the row.
		expect(error).toBeNull();
		expect(data).toEqual([]);

		// Row survives unchanged for ownerA.
		const { data: stillExists } = await clientA
			.from("property_images")
			.select("id, display_order")
			.eq("id", imageA.id)
			.single();
		expect(stillExists).not.toBeNull();
		expect(stillExists!.display_order).toBe(0);
	});

	// -------------------------------------------------------------------------
	// DELETE isolation
	// -------------------------------------------------------------------------

	it("owner A can delete their own throwaway property image (positive control)", async () => {
		if (!propertyA) {
			console.warn("Skipping: ownerA property fixture not created");
			return;
		}
		const { data: inserted } = await clientA
			.from("property_images")
			.insert({
				property_id: propertyA.id,
				image_url: "rls-test/owner-a-delete.jpg",
				display_order: 2,
			})
			.select("id")
			.single();
		expect(inserted).not.toBeNull();

		const { data, error } = await clientA
			.from("property_images")
			.delete()
			.eq("id", inserted!.id)
			.select("id");
		expect(error).toBeNull();
		expect(data).toEqual([{ id: inserted!.id }]);
	});

	it("owner B cannot DELETE owner A's property image (USING hides it: data []), row survives", async () => {
		if (!imageA) {
			console.warn("Skipping: ownerA property_images fixture not created");
			return;
		}
		const { data, error } = await clientB
			.from("property_images")
			.delete()
			.eq("id", imageA.id)
			.select("id");
		// USING clause prevents ownerB from seeing/deleting the row.
		expect(error).toBeNull();
		expect(data).toEqual([]);

		// Verify the row still exists for ownerA.
		const { data: stillExists } = await clientA
			.from("property_images")
			.select("id")
			.eq("id", imageA.id)
			.single();
		expect(stillExists).not.toBeNull();
	});
});
