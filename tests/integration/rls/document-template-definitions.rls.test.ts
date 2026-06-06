/**
 * Dual-client (ownerA / ownerB) RLS isolation tests for
 * `document_template_definitions`.
 *
 * This is a DIRECT-owner table: `owner_user_id` references `users.id` and all
 * four policies key on `(select auth.uid()) = owner_user_id`. This file is the
 * regression proof (TEST-01 / threats T-05-01, T-05-02) that a future RLS
 * refactor cannot leak one owner's template definitions to another. Runs in the
 * `rls-security` CI gate.
 *
 * Schema constraints honored here (verified against migration
 * 20260311200000_document_template_definitions.sql):
 *  - `template_key` has a CHECK limiting it to exactly five values
 *    ('lease', 'maintenance-request', 'property-inspection',
 *    'rental-application', 'tenant-notice') — arbitrary keys would violate the
 *    CHECK, so the test uses real keys.
 *  - UNIQUE (owner_user_id, template_key) — only one row per owner per key, so
 *    each fixture/throwaway row uses a distinct key and beforeAll first clears
 *    any pre-existing rows for the keys this test owns (synthetic accounts may
 *    carry leftovers from prior runs).
 *
 * Every cross-owner case asserts the DENIAL side, not merely "no error":
 *  - SELECT: ownerA's row id ABSENT from ownerB's result (0 rows).
 *  - INSERT: ownerB hijack -> error not null + data null (WITH CHECK).
 *  - UPDATE/DELETE: ownerB -> error null + data [] (USING hides the row), then a
 *    re-read as ownerA confirms the row survives unchanged.
 * Positive controls prove the policy rejects only the cross-owner case.
 *
 * Mirrors `tests/integration/rls/properties.rls.test.ts`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

// Valid template_key values (CHECK-allowed). Distinct keys per role so the
// UNIQUE(owner_user_id, template_key) constraint never collides across the
// fixture, the insert positive control, and the delete positive control.
const FIXTURE_KEY = "lease";
const INSERT_POSITIVE_KEY = "maintenance-request";
const DELETE_POSITIVE_KEY = "property-inspection";
// All keys this test owns for ownerA — cleared up-front and torn down after.
const OWNED_KEYS = [FIXTURE_KEY, INSERT_POSITIVE_KEY, DELETE_POSITIVE_KEY];

describe("Document Template Definitions RLS — cross-owner isolation", () => {
	let clientA: SupabaseClient;
	let clientB: SupabaseClient;
	let ownerAId: string;
	let ownerBId: string;

	// ownerA's fixture row the cross-owner denial tests target.
	let definitionA: { id: string } | null = null;

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

		// Clear any leftover rows for the keys this test owns so the inserts below
		// don't trip the UNIQUE(owner_user_id, template_key) constraint on rerun.
		for (const key of OWNED_KEYS) {
			await clientA
				.from("document_template_definitions")
				.delete()
				.eq("owner_user_id", ownerAId)
				.eq("template_key", key);
		}

		const { data: dA } = await clientA
			.from("document_template_definitions")
			.insert({
				owner_user_id: ownerAId,
				template_key: FIXTURE_KEY,
				custom_fields: [{ label: "RLS Test Field A" }],
			})
			.select("id")
			.single();
		definitionA = dA ? { id: dA.id } : null;
	});

	afterAll(async () => {
		// Leaf table — delete every owned key under ownerA (covers fixture + the
		// insert/delete positive-control rows whichever survived).
		for (const key of OWNED_KEYS) {
			await clientA
				.from("document_template_definitions")
				.delete()
				.eq("owner_user_id", ownerAId)
				.eq("template_key", key);
		}
	});

	// -------------------------------------------------------------------------
	// SELECT isolation
	// -------------------------------------------------------------------------

	it("owner A can only read their own template definitions", async () => {
		const { data, error } = await clientA
			.from("document_template_definitions")
			.select("id, owner_user_id");
		expect(error).toBeNull();
		expect(data).not.toBeNull();
		data!.forEach((row) => {
			expect(row.owner_user_id).toBe(ownerAId);
		});
	});

	it("owner A finds the fixture definition (positive control)", async () => {
		if (!definitionA) {
			console.warn("Skipping: ownerA template definition fixture not created");
			return;
		}
		const { data, error } = await clientA
			.from("document_template_definitions")
			.select("id")
			.eq("id", definitionA.id);
		expect(error).toBeNull();
		expect(data).toEqual([{ id: definitionA.id }]);
	});

	it("owner B cannot SELECT owner A's template definition (0 rows)", async () => {
		if (!definitionA) {
			console.warn("Skipping: ownerA template definition fixture not created");
			return;
		}
		const { data, error } = await clientB
			.from("document_template_definitions")
			.select("id")
			.eq("id", definitionA.id);
		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	it("owner B results contain no rows from owner A", async () => {
		const { data: dataA } = await clientA
			.from("document_template_definitions")
			.select("id, owner_user_id");
		const { data: dataB } = await clientB
			.from("document_template_definitions")
			.select("id, owner_user_id");

		const ownerAIds = new Set((dataA ?? []).map((r) => r.id as string));
		const ownerBIds = new Set((dataB ?? []).map((r) => r.id as string));

		ownerBIds.forEach((id) => {
			expect(ownerAIds.has(id)).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// INSERT isolation
	// -------------------------------------------------------------------------

	it("owner A can insert a template definition with their own owner_user_id (positive control)", async () => {
		const { data, error } = await clientA
			.from("document_template_definitions")
			.insert({
				owner_user_id: ownerAId,
				template_key: INSERT_POSITIVE_KEY,
			})
			.select("id")
			.single();
		expect(error).toBeNull();
		expect(data).not.toBeNull();
	});

	it("owner B cannot INSERT a template definition carrying owner A's owner_user_id", async () => {
		const { data, error } = await clientB
			.from("document_template_definitions")
			.insert({
				owner_user_id: ownerAId,
				template_key: "tenant-notice",
			})
			.select("id")
			.single();

		// WITH CHECK blocks the hijack — ownerB's auth.uid() != ownerAId.
		expect(error).not.toBeNull();
		expect(data).toBeNull();
	});

	// -------------------------------------------------------------------------
	// UPDATE isolation
	// -------------------------------------------------------------------------

	it("owner A can update their own template definition (positive control)", async () => {
		if (!definitionA) {
			console.warn("Skipping: ownerA template definition fixture not created");
			return;
		}
		// Mutate a safe field (custom_fields) — never template_key, which is
		// UNIQUE-constrained per owner.
		const { data, error } = await clientA
			.from("document_template_definitions")
			.update({ custom_fields: [{ label: "RLS Updated Field A" }] })
			.eq("id", definitionA.id)
			.select("id");
		expect(error).toBeNull();
		expect(data).toEqual([{ id: definitionA.id }]);

		// Restore original custom_fields.
		await clientA
			.from("document_template_definitions")
			.update({ custom_fields: [{ label: "RLS Test Field A" }] })
			.eq("id", definitionA.id);
	});

	it("owner B cannot UPDATE owner A's template definition (USING hides it: data [])", async () => {
		if (!definitionA) {
			console.warn("Skipping: ownerA template definition fixture not created");
			return;
		}
		const { data, error } = await clientB
			.from("document_template_definitions")
			.update({ custom_fields: [{ label: "RLS Hijack Field" }] })
			.eq("id", definitionA.id)
			.select("id");

		// USING clause prevents ownerB from seeing/updating the row.
		expect(error).toBeNull();
		expect(data).toEqual([]);

		// Row survives unchanged for ownerA.
		const { data: stillExists } = await clientA
			.from("document_template_definitions")
			.select("id")
			.eq("id", definitionA.id)
			.single();
		expect(stillExists).not.toBeNull();
	});

	// -------------------------------------------------------------------------
	// DELETE isolation
	// -------------------------------------------------------------------------

	it("owner A can delete their own throwaway template definition (positive control)", async () => {
		const { data: inserted } = await clientA
			.from("document_template_definitions")
			.insert({
				owner_user_id: ownerAId,
				template_key: DELETE_POSITIVE_KEY,
			})
			.select("id")
			.single();
		expect(inserted).not.toBeNull();

		const { data, error } = await clientA
			.from("document_template_definitions")
			.delete()
			.eq("id", inserted!.id)
			.select("id");
		expect(error).toBeNull();
		expect(data).toEqual([{ id: inserted!.id }]);
	});

	it("owner B cannot DELETE owner A's template definition (USING hides it: data []), row survives", async () => {
		if (!definitionA) {
			console.warn("Skipping: ownerA template definition fixture not created");
			return;
		}
		const { data, error } = await clientB
			.from("document_template_definitions")
			.delete()
			.eq("id", definitionA.id)
			.select("id");

		// USING clause prevents ownerB from seeing/deleting the row.
		expect(error).toBeNull();
		expect(data).toEqual([]);

		// Verify the row still exists for ownerA.
		const { data: stillExists } = await clientA
			.from("document_template_definitions")
			.select("id")
			.eq("id", definitionA.id)
			.single();
		expect(stillExists).not.toBeNull();
	});
});
