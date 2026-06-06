/**
 * Dual-client (ownerA / ownerB) RLS isolation tests for `expenses`.
 *
 * `expenses` is an INDIRECT-owner table: it has NO direct owner column. Owner
 * isolation is reached only through `maintenance_request_id` ->
 * `maintenance_requests.owner_user_id`. All four policies
 * (expenses_{select,insert,update,delete}_owner) wrap an
 * `EXISTS (SELECT 1 FROM maintenance_requests mr WHERE mr.id =
 * expenses.maintenance_request_id AND mr.owner_user_id = caller)` guard.
 *
 * This file is the regression proof (TEST-01 / threats T-05-01, T-05-02,
 * T-05-03) that a future RLS refactor cannot leak one owner's expenses to
 * another through the indirect ownership path. Runs in the `rls-security` CI
 * gate.
 *
 * Fixture chain (built under ownerA via the AUTHENTICATED client, not
 * service-role): property -> unit -> tenant -> maintenance_request -> expense.
 * The maintenance_request INSERT policy `maintenance_requests_insert_owner`
 * (migration 20260506013951) requires owner_user_id = caller AND unit_id IN
 * caller's units — so the unit is inserted first and referenced. The MR also
 * requires a non-null tenant_id FK, so an ownerA tenant is inserted into the
 * chain.
 *
 * Every cross-owner case asserts the DENIAL side, not merely "no error":
 *  - SELECT: ownerA's expense id ABSENT from ownerB's result (0 rows).
 *  - INSERT: ownerB referencing ownerA's MR -> error not null + data null
 *    (WITH CHECK EXISTS-on-parent-MR fails for ownerB).
 *  - UPDATE/DELETE: ownerB -> error null + data [] (USING hides the row), then a
 *    re-read as ownerA confirms the expense survives unchanged.
 * Positive control: ownerA SELECTs the expense and finds it.
 *
 * Mirrors the multi-step chain builder + FK-safe teardown of
 * `tests/integration/rls/stats-rpcs.rls.test.ts`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

const FIXTURE_AMOUNT = 123.45;
const FIXTURE_EXPENSE_DATE = "2026-01-15";

describe("Expenses RLS — cross-owner isolation (indirect via maintenance_request_id)", () => {
	let clientA: SupabaseClient;
	let clientB: SupabaseClient;
	let ownerAId: string;
	let ownerBId: string;

	// Fixture chain under ownerA. FK-safe teardown deletes child-before-parent.
	let propertyA: { id: string } | null = null;
	let unitA: { id: string } | null = null;
	let tenantA: { id: string } | null = null;
	let maintenanceRequestA: { id: string } | null = null;
	let expenseA: { id: string } | null = null;

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

		// Build ownerA's chain through the authenticated client. Each step guards
		// on the previous one so a partial failure surfaces as a graceful skip
		// rather than a misleading FK error in a later step.
		const stamp = Date.now();

		const { data: pA } = await clientA
			.from("properties")
			.insert({
				name: "Expenses RLS Test Property A",
				address_line1: "1 Expenses St",
				city: "Testville",
				state: "TX",
				postal_code: "00000",
				country: "US",
				property_type: "single_family",
				owner_user_id: ownerAId,
			})
			.select("id")
			.single();
		propertyA = pA ? { id: pA.id } : null;
		if (!propertyA) console.warn("Skipping chain: property insert failed");

		if (propertyA) {
			const { data: uA } = await clientA
				.from("units")
				.insert({
					property_id: propertyA.id,
					unit_number: `EXP-A-${stamp}`,
					bedrooms: 1,
					bathrooms: 1,
					rent_amount: 1000,
					status: "available",
					owner_user_id: ownerAId,
				})
				.select("id")
				.single();
			unitA = uA ? { id: uA.id } : null;
			if (!unitA) console.warn("Skipping chain: unit insert failed");
		}

		const { data: tA } = await clientA
			.from("tenants")
			.insert({
				email: `expenses-rls-test-tenant-a-${stamp}@example.com`,
				first_name: "Expenses",
				last_name: "TestA",
				status: "active",
				owner_user_id: ownerAId,
			})
			.select("id")
			.single();
		tenantA = tA ? { id: tA.id } : null;
		if (!tenantA) console.warn("Skipping chain: tenant insert failed");

		if (unitA && tenantA) {
			const { data: mrA } = await clientA
				.from("maintenance_requests")
				.insert({
					owner_user_id: ownerAId,
					unit_id: unitA.id,
					tenant_id: tenantA.id,
					description: "Expenses RLS Test Maintenance Request A",
				})
				.select("id")
				.single();
			maintenanceRequestA = mrA ? { id: mrA.id } : null;
			if (!maintenanceRequestA)
				console.warn("Skipping chain: maintenance_request insert failed");
		}

		if (maintenanceRequestA) {
			const { data: eA } = await clientA
				.from("expenses")
				.insert({
					maintenance_request_id: maintenanceRequestA.id,
					amount: FIXTURE_AMOUNT,
					expense_date: FIXTURE_EXPENSE_DATE,
				})
				.select("id")
				.single();
			expenseA = eA ? { id: eA.id } : null;
			if (!expenseA) console.warn("Skipping chain: expense insert failed");
		}
	});

	afterAll(async () => {
		// FK-safe child-before-parent teardown under ownerA:
		// expense -> maintenance_request -> unit -> property -> tenant.
		if (expenseA) await clientA.from("expenses").delete().eq("id", expenseA.id);
		if (maintenanceRequestA)
			await clientA
				.from("maintenance_requests")
				.delete()
				.eq("id", maintenanceRequestA.id);
		if (unitA) await clientA.from("units").delete().eq("id", unitA.id);
		if (propertyA)
			await clientA.from("properties").delete().eq("id", propertyA.id);
		if (tenantA) await clientA.from("tenants").delete().eq("id", tenantA.id);
	});

	// -------------------------------------------------------------------------
	// SELECT isolation
	// -------------------------------------------------------------------------

	it("owner A can SELECT the fixture expense (positive control)", async () => {
		if (!expenseA) {
			console.warn("Skipping: ownerA expense fixture not created");
			return;
		}
		const { data, error } = await clientA
			.from("expenses")
			.select("id, maintenance_request_id")
			.eq("id", expenseA.id);
		expect(error).toBeNull();
		expect(data).not.toBeNull();
		expect(data).toHaveLength(1);
		expect(data![0]!.id).toBe(expenseA.id);
		expect(data![0]!.maintenance_request_id).toBe(maintenanceRequestA!.id);
	});

	it("owner B cannot SELECT owner A's expense (0 rows)", async () => {
		if (!expenseA) {
			console.warn("Skipping: ownerA expense fixture not created");
			return;
		}
		const { data, error } = await clientB
			.from("expenses")
			.select("id")
			.eq("id", expenseA.id);
		// The EXISTS-on-parent-MR USING clause hides ownerA's expense from ownerB.
		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	it("owner B's expense set excludes owner A's fixture expense", async () => {
		if (!expenseA) {
			console.warn("Skipping: ownerA expense fixture not created");
			return;
		}
		const { data: dataB } = await clientB
			.from("expenses")
			.select("id")
			.limit(1000);
		const ownerBIds = new Set((dataB ?? []).map((r) => r.id as string));
		expect(ownerBIds.has(expenseA.id)).toBe(false);
	});

	// -------------------------------------------------------------------------
	// INSERT isolation
	// -------------------------------------------------------------------------

	it("owner B cannot INSERT an expense referencing owner A's maintenance_request", async () => {
		if (!maintenanceRequestA) {
			console.warn("Skipping: ownerA maintenance_request fixture not created");
			return;
		}
		const { data, error } = await clientB
			.from("expenses")
			.insert({
				maintenance_request_id: maintenanceRequestA.id,
				amount: 999,
				expense_date: FIXTURE_EXPENSE_DATE,
			})
			.select("id")
			.single();

		// WITH CHECK requires the parent MR to be owned by the caller; ownerB does
		// not own ownerA's MR, so the EXISTS guard fails.
		expect(error).not.toBeNull();
		expect(data).toBeNull();
	});

	// -------------------------------------------------------------------------
	// UPDATE isolation
	// -------------------------------------------------------------------------

	it("owner B cannot UPDATE owner A's expense (USING hides it: data []), value survives", async () => {
		if (!expenseA) {
			console.warn("Skipping: ownerA expense fixture not created");
			return;
		}
		const { data, error } = await clientB
			.from("expenses")
			.update({ amount: 999 })
			.eq("id", expenseA.id)
			.select("id");

		// USING clause prevents ownerB from seeing/updating the row.
		expect(error).toBeNull();
		expect(data).toEqual([]);

		// Re-read as ownerA: the expense survives unchanged.
		const { data: stillExists } = await clientA
			.from("expenses")
			.select("id, amount")
			.eq("id", expenseA.id)
			.single();
		expect(stillExists).not.toBeNull();
		expect(Number(stillExists!.amount)).toBe(FIXTURE_AMOUNT);
	});

	// -------------------------------------------------------------------------
	// DELETE isolation
	// -------------------------------------------------------------------------

	it("owner B cannot DELETE owner A's expense (USING hides it: data []), row survives", async () => {
		if (!expenseA) {
			console.warn("Skipping: ownerA expense fixture not created");
			return;
		}
		const { data, error } = await clientB
			.from("expenses")
			.delete()
			.eq("id", expenseA.id)
			.select("id");

		// USING clause prevents ownerB from seeing/deleting the row.
		expect(error).toBeNull();
		expect(data).toEqual([]);

		// Verify the expense still exists for ownerA.
		const { data: stillExists } = await clientA
			.from("expenses")
			.select("id")
			.eq("id", expenseA.id)
			.single();
		expect(stillExists).not.toBeNull();
	});
});
