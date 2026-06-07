/**
 * Dual-client (ownerA / ownerB) RLS isolation tests for `reports`.
 *
 * `reports` is a DIRECT-owner table: `owner_user_id` references `users.id`
 * and all four policies (reports_{select,insert,update,delete}_owner) key on
 * `owner_user_id = get_current_owner_user_id()`. This file is the regression
 * proof (TEST-01 / threats T-05-01, T-05-02) that a future RLS refactor cannot
 * silently leak one owner's reports to another. It runs in the `rls-security`
 * CI gate.
 *
 * Every cross-owner case asserts the DENIAL side, not merely "no error":
 *  - SELECT: ownerA's report id is ABSENT from ownerB's result (0 rows).
 *  - INSERT: ownerB hijack -> error not null + data null (WITH CHECK).
 *  - UPDATE/DELETE: ownerB -> error null + data [] (USING hides the row), then
 *    a re-read as ownerA confirms the row survives unchanged.
 * Positive controls (ownerA self-SELECT/UPDATE/DELETE) prove the policy rejects
 * only the cross-owner case, not every call — guarding against a false-green
 * test that would pass even if isolation were broken.
 *
 * Mirrors `tests/integration/rls/properties.rls.test.ts`. `getTestCredentials()`
 * throws when the four E2E_OWNER_* env vars are unset; CI provides them via repo
 * secrets, local runs require `.env.local`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

describe("Reports RLS — cross-owner isolation", () => {
	let clientA: SupabaseClient;
	let clientB: SupabaseClient;
	let ownerAId: string;
	let ownerBId: string;

	// ownerA's report that the cross-owner denial tests target. Created in
	// beforeAll, removed in afterAll.
	let reportA: { id: string } | null = null;

	// Any extra ids inserted by individual tests (e.g. throwaway delete rows).
	const testInsertedIds: string[] = [];

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

		// Fresh ownerA report the cross-owner tests target.
		const { data: rA } = await clientA
			.from("reports")
			.insert({
				owner_user_id: ownerAId,
				title: "RLS Test Report A",
				report_type: "financial_summary",
			})
			.select("id")
			.single();
		reportA = rA ? { id: rA.id } : null;
	});

	afterAll(async () => {
		// Leaf table — simple delete by id under ownerA (the row's owner).
		if (reportA) await clientA.from("reports").delete().eq("id", reportA.id);
		for (const id of testInsertedIds) {
			await clientA.from("reports").delete().eq("id", id);
		}
	});

	// -------------------------------------------------------------------------
	// SELECT isolation
	// -------------------------------------------------------------------------

	it("owner A can only read their own reports", async () => {
		const { data, error } = await clientA
			.from("reports")
			.select("id, owner_user_id");
		expect(error).toBeNull();
		expect(data).not.toBeNull();
		data!.forEach((row) => {
			expect(row.owner_user_id).toBe(ownerAId);
		});
	});

	it("owner A finds the fixture report (positive control)", async () => {
		if (!reportA) {
			console.warn("Skipping: ownerA report fixture not created");
			return;
		}
		const { data, error } = await clientA
			.from("reports")
			.select("id")
			.eq("id", reportA.id);
		expect(error).toBeNull();
		expect(data).toEqual([{ id: reportA.id }]);
	});

	it("owner B cannot SELECT owner A's report (0 rows)", async () => {
		if (!reportA) {
			console.warn("Skipping: ownerA report fixture not created");
			return;
		}
		const { data, error } = await clientB
			.from("reports")
			.select("id")
			.eq("id", reportA.id);
		// USING clause hides ownerA's row from ownerB entirely.
		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	it("owner B results contain no rows from owner A", async () => {
		const { data: dataA } = await clientA
			.from("reports")
			.select("id, owner_user_id");
		const { data: dataB } = await clientB
			.from("reports")
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

	it("owner A can insert a report with their own owner_user_id (positive control)", async () => {
		const { data, error } = await clientA
			.from("reports")
			.insert({
				owner_user_id: ownerAId,
				title: "RLS Insert Test Report A",
				report_type: "financial_summary",
			})
			.select("id")
			.single();

		expect(error).toBeNull();
		expect(data).not.toBeNull();
		testInsertedIds.push(data!.id);
	});

	it("owner B cannot INSERT a report carrying owner A's owner_user_id", async () => {
		const { data, error } = await clientB
			.from("reports")
			.insert({
				owner_user_id: ownerAId,
				title: "RLS Hijack Report",
				report_type: "financial_summary",
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

	it("owner A can update their own report and restore it (positive control)", async () => {
		if (!reportA) {
			console.warn("Skipping: ownerA report fixture not created");
			return;
		}
		const { data, error } = await clientA
			.from("reports")
			.update({ title: "RLS Update Test Report" })
			.eq("id", reportA.id)
			.select("id");
		expect(error).toBeNull();
		expect(data).toEqual([{ id: reportA.id }]);

		// Restore original title.
		await clientA
			.from("reports")
			.update({ title: "RLS Test Report A" })
			.eq("id", reportA.id);
	});

	it("owner B cannot UPDATE owner A's report (USING hides it: data [])", async () => {
		if (!reportA) {
			console.warn("Skipping: ownerA report fixture not created");
			return;
		}
		const { data, error } = await clientB
			.from("reports")
			.update({ title: "RLS Hijack Update" })
			.eq("id", reportA.id)
			.select("id");

		// USING clause prevents ownerB from seeing/updating the row.
		expect(error).toBeNull();
		expect(data).toEqual([]);

		// Row survives unchanged for ownerA.
		const { data: stillExists } = await clientA
			.from("reports")
			.select("id, title")
			.eq("id", reportA.id)
			.single();
		expect(stillExists).not.toBeNull();
		expect(stillExists!.title).toBe("RLS Test Report A");
	});

	// -------------------------------------------------------------------------
	// DELETE isolation
	// -------------------------------------------------------------------------

	it("owner A can delete their own throwaway report (positive control)", async () => {
		const { data: inserted } = await clientA
			.from("reports")
			.insert({
				owner_user_id: ownerAId,
				title: "RLS Delete Test Report",
				report_type: "financial_summary",
			})
			.select("id")
			.single();
		expect(inserted).not.toBeNull();

		const { data, error } = await clientA
			.from("reports")
			.delete()
			.eq("id", inserted!.id)
			.select("id");
		expect(error).toBeNull();
		expect(data).toEqual([{ id: inserted!.id }]);
	});

	it("owner B cannot DELETE owner A's report (USING hides it: data []), row survives", async () => {
		if (!reportA) {
			console.warn("Skipping: ownerA report fixture not created");
			return;
		}
		const { data, error } = await clientB
			.from("reports")
			.delete()
			.eq("id", reportA.id)
			.select("id");

		// USING clause prevents ownerB from seeing/deleting the row.
		expect(error).toBeNull();
		expect(data).toEqual([]);

		// Verify the row still exists for ownerA.
		const { data: stillExists } = await clientA
			.from("reports")
			.select("id")
			.eq("id", reportA.id)
			.single();
		expect(stillExists).not.toBeNull();
	});
});
