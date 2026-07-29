import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Phase 55 / LEDGER-06 — append-only immutability + reversal netting
 * (T-55-03/T-55-08).
 *
 * Proves the two independent immutability guards from 55-01
 * (`20260724140000_rent_ledger_schema.sql`) and the reversal RPCs from 55-02
 * (`20260724140200_rent_ledger_rpcs.sql`):
 *   - RLS grants authenticated owners SELECT + INSERT only. There is no UPDATE
 *     or DELETE policy, so an owner's edit/delete reaches zero rows and the
 *     booked amount survives untouched.
 *   - The `rent_ledger_append_only()` BEFORE UPDATE OR DELETE trigger raises
 *     `0A000` for EVERY writer, including service_role (RLS does not constrain
 *     service_role or the table owner — RESEARCH Pitfall 3). This is the guard
 *     that makes "booked amounts are immutable" true rather than merely
 *     policy-shaped.
 *   - `reverse_charge()` posts the paired negation (the charge AND the receipts
 *     allocated to it) so the lease balance nets back to zero with no orphan
 *     receipt leaving a phantom credit (Pitfall 4 / A6), and a second call is a
 *     no-op (double-reversal guard).
 *   - `reverse_receipt()` posts exactly one exact negation of a standalone
 *     receipt.
 *
 * chai-6 note: PostgREST returns failures in the `{ data, error }` shape rather
 * than throwing, so `raises()` re-throws the PostgrestError and the assertion
 * uses `.rejects.toMatchObject({ message: expect.stringContaining(...) })` —
 * never `.rejects.toThrow('string')`, which crashes under vitest 4 + chai 6.
 *
 * RUN is DEFERRED to Plan 55-04: it requires the 55-01/55-02 migrations applied
 * to prod + regenerated types, then
 * `bun run test:integration -- rent-ledger-append-only`. Skips cleanly when the
 * service-role / owner env vars are absent.
 *
 * Teardown note: by construction nothing here can be swept — that is the
 * property under test. Every assertion is scoped to the ids this run created.
 */

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_ROLE_KEY =
	process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
	process.env["SUPABASE_SECRET_KEY"];
const ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
const OWNER_A_EMAIL = process.env["E2E_OWNER_EMAIL"];
const OWNER_A_PASSWORD = process.env["E2E_OWNER_PASSWORD"];

const skipReason = !SUPABASE_URL
	? "NEXT_PUBLIC_SUPABASE_URL not set"
	: !SERVICE_ROLE_KEY
		? "SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY not set"
		: !ANON_KEY
			? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not set"
			: !OWNER_A_EMAIL || !OWNER_A_PASSWORD
				? "E2E owner credentials not set"
				: null;

// Dollars — never cents (D-00).
const RENT_AMOUNT = 1234;
const CHARGE_AMOUNT = 1000;
const RECEIPT_AMOUNT = 400;
const TAMPERED_AMOUNT = 1;

/** The append-only trigger's SQLSTATE (feature_not_supported). */
const APPEND_ONLY_CODE = "0A000";

interface PostgrestFailure {
	message: string;
	code?: string;
}

/**
 * Re-throw a PostgREST `{ error }` as a real rejection so immutability can be
 * asserted with `.rejects.toMatchObject` (chai-6 safe). Resolves when the call
 * reports no error — the caller then asserts the row is unchanged.
 */
async function raises(
	op: PromiseLike<{ error: PostgrestFailure | null }>,
): Promise<void> {
	const { error } = await op;
	if (error) {
		const raised: Error & { code?: string } = new Error(error.message);
		if (error.code !== undefined) {
			raised.code = error.code;
		}
		throw raised;
	}
}

describe.skipIf(skipReason)(
	"Rent ledger RLS - LEDGER-06 append-only immutability + reversal netting",
	() => {
		let service: SupabaseClient;
		let clientA: SupabaseClient;
		let ownerAId: string;

		let propertyAId: string | null = null;
		let unitAId: string | null = null;
		let tenantAId: string | null = null;
		let leaseAId: string | null = null;

		// The charge/receipt pair the immutability + reversal cases operate on.
		let chargeId: string | null = null;
		let receiptId: string | null = null;
		// A standalone charge/receipt pair for the reverse_receipt case.
		let soloChargeId: string | null = null;
		let soloReceiptId: string | null = null;

		async function readBalance(): Promise<number> {
			const { data, error } = await clientA.rpc("get_lease_ledger_summary", {
				p_lease_id: leaseAId,
			});
			expect(error).toBeNull();
			const row = Array.isArray(data) ? data[0] : data;
			return Number(row?.balance ?? 0);
		}

		async function countReversalsOf(
			table: "rent_charges" | "rent_receipts",
			originalId: string | null,
		): Promise<number> {
			const { count, error } = await service
				.from(table)
				.select("id", { count: "exact", head: true })
				.eq("reverses_id", originalId);
			expect(error).toBeNull();
			return count ?? 0;
		}

		beforeAll(async () => {
			service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
				auth: { persistSession: false, autoRefreshToken: false },
			});
			clientA = createClient(SUPABASE_URL!, ANON_KEY!, {
				auth: { persistSession: false, autoRefreshToken: false },
			});

			await clientA.auth.signInWithPassword({
				email: OWNER_A_EMAIL!,
				password: OWNER_A_PASSWORD!,
			});
			const {
				data: { user: userA },
			} = await clientA.auth.getUser();
			ownerAId = userA!.id;

			const { data: pA } = await service
				.from("properties")
				.insert({
					name: "Ledger Append-Only Test Property A",
					address_line1: "2 Ledger St",
					city: "Testville",
					state: "CA",
					postal_code: "94105",
					country: "US",
					property_type: "APARTMENT",
					owner_user_id: ownerAId,
				})
				.select("id")
				.single();
			propertyAId = pA ? (pA.id as string) : null;

			if (propertyAId) {
				const { data: uA } = await service
					.from("units")
					.insert({
						property_id: propertyAId,
						unit_number: "LEDGER-AO-101",
						bedrooms: 1,
						bathrooms: 1,
						rent_amount: RENT_AMOUNT,
						owner_user_id: ownerAId,
					})
					.select("id")
					.single();
				unitAId = uA ? (uA.id as string) : null;
			}

			const { data: tA } = await service
				.from("tenants")
				.insert({
					email: `ledger-ao-tenant-a-${Date.now()}@example.com`,
					first_name: "Ledger",
					last_name: "AppendOnlyA",
					owner_user_id: ownerAId,
				})
				.select("id")
				.single();
			tenantAId = tA ? (tA.id as string) : null;

			if (unitAId && tenantAId) {
				const { data: lA } = await service
					.from("leases")
					.insert({
						owner_user_id: ownerAId,
						unit_id: unitAId,
						primary_tenant_id: tenantAId,
						start_date: "2099-01-01",
						end_date: "2099-12-31",
						rent_amount: RENT_AMOUNT,
						security_deposit: RENT_AMOUNT,
						lease_status: "active",
					})
					.select("id")
					.single();
				leaseAId = lA ? (lA.id as string) : null;
			}

			// The charge + allocated receipt every case below reads.
			const { data: charge } = await clientA
				.from("rent_charges")
				.insert({
					lease_id: leaseAId,
					owner_user_id: ownerAId,
					type: "manual_charge",
					amount: CHARGE_AMOUNT,
					period_start: "2099-03-01",
					due_date: "2099-03-01",
					description: "Append-only fixture charge",
				})
				.select("id")
				.single();
			chargeId = charge ? (charge.id as string) : null;

			const { data: receipt } = await clientA
				.from("rent_receipts")
				.insert({
					charge_id: chargeId,
					lease_id: leaseAId,
					owner_user_id: ownerAId,
					amount: RECEIPT_AMOUNT,
					method: "check",
					received_date: "2099-03-05",
					description: "Append-only fixture receipt",
				})
				.select("id")
				.single();
			receiptId = receipt ? (receipt.id as string) : null;
		});

		afterAll(async () => {
			// Best-effort only: the ledger rows are immutable for every writer, and
			// the ON DELETE CASCADE from leases fires the same guard trigger, so the
			// fixture chain may survive. All assertions are id-scoped.
			if (leaseAId) await service.from("leases").delete().eq("id", leaseAId);
			if (tenantAId) await service.from("tenants").delete().eq("id", tenantAId);
			if (unitAId) await service.from("units").delete().eq("id", unitAId);
			if (propertyAId)
				await service.from("properties").delete().eq("id", propertyAId);
		});

		// ---------------------------------------------------------------------
		// T-55-03: no writer can edit or delete a booked amount
		// ---------------------------------------------------------------------

		it("service_role UPDATE of a charge amount raises the append-only guard", async () => {
			await expect(
				raises(
					service
						.from("rent_charges")
						.update({ amount: TAMPERED_AMOUNT })
						.eq("id", chargeId),
				),
			).rejects.toMatchObject({
				message: expect.stringContaining("append-only"),
				code: APPEND_ONLY_CODE,
			});

			const { data } = await service
				.from("rent_charges")
				.select("amount")
				.eq("id", chargeId)
				.single();
			expect(Number(data?.amount)).toBe(CHARGE_AMOUNT);
		});

		it("service_role DELETE of a charge raises the append-only guard", async () => {
			await expect(
				raises(service.from("rent_charges").delete().eq("id", chargeId)),
			).rejects.toMatchObject({
				message: expect.stringContaining("append-only"),
				code: APPEND_ONLY_CODE,
			});

			const { count } = await service
				.from("rent_charges")
				.select("id", { count: "exact", head: true })
				.eq("id", chargeId);
			expect(count).toBe(1);
		});

		it("service_role UPDATE and DELETE of a receipt both raise the append-only guard", async () => {
			await expect(
				raises(
					service
						.from("rent_receipts")
						.update({ amount: TAMPERED_AMOUNT })
						.eq("id", receiptId),
				),
			).rejects.toMatchObject({
				message: expect.stringContaining("append-only"),
				code: APPEND_ONLY_CODE,
			});

			await expect(
				raises(service.from("rent_receipts").delete().eq("id", receiptId)),
			).rejects.toMatchObject({
				message: expect.stringContaining("append-only"),
				code: APPEND_ONLY_CODE,
			});

			const { data } = await service
				.from("rent_receipts")
				.select("amount")
				.eq("id", receiptId)
				.single();
			expect(Number(data?.amount)).toBe(RECEIPT_AMOUNT);
		});

		it("the authenticated owner's UPDATE and DELETE change nothing (no policy for either op)", async () => {
			// RLS exposes no UPDATE/DELETE policy, so the statements match zero rows.
			// PostgREST reports success with nothing affected; the guard trigger is
			// never even reached. Either way the booked amounts must be intact.
			await clientA
				.from("rent_charges")
				.update({ amount: TAMPERED_AMOUNT })
				.eq("id", chargeId);
			await clientA.from("rent_charges").delete().eq("id", chargeId);
			await clientA
				.from("rent_receipts")
				.update({ amount: TAMPERED_AMOUNT })
				.eq("id", receiptId);
			await clientA.from("rent_receipts").delete().eq("id", receiptId);

			const { data: charge } = await service
				.from("rent_charges")
				.select("amount")
				.eq("id", chargeId)
				.single();
			expect(Number(charge?.amount)).toBe(CHARGE_AMOUNT);

			const { data: receipt } = await service
				.from("rent_receipts")
				.select("amount")
				.eq("id", receiptId)
				.single();
			expect(Number(receipt?.amount)).toBe(RECEIPT_AMOUNT);
		});

		// ---------------------------------------------------------------------
		// T-55-08: corrections are reversal inserts that net the balance to zero
		// ---------------------------------------------------------------------

		it("reverse_charge posts the paired negation and nets the lease balance to zero", async () => {
			// Before: 1000 charged, 400 received -> 600 owed.
			expect(await readBalance()).toBe(CHARGE_AMOUNT - RECEIPT_AMOUNT);

			const { error } = await clientA.rpc("reverse_charge", {
				p_charge_id: chargeId,
			});
			expect(error).toBeNull();

			// After: the charge negation AND the paired receipt negation both landed,
			// so neither stream leaves a phantom balance (Pitfall 4).
			expect(await readBalance()).toBe(0);
			expect(await countReversalsOf("rent_charges", chargeId)).toBe(1);
			expect(await countReversalsOf("rent_receipts", receiptId)).toBe(1);

			// The negations are exact — nothing was rescaled on the way through.
			const { data: chargeReversal } = await service
				.from("rent_charges")
				.select("amount, reverses_id")
				.eq("reverses_id", chargeId)
				.single();
			expect(Number(chargeReversal?.amount)).toBe(-CHARGE_AMOUNT);

			const { data: receiptReversal } = await service
				.from("rent_receipts")
				.select("amount, reverses_id")
				.eq("reverses_id", receiptId)
				.single();
			expect(Number(receiptReversal?.amount)).toBe(-RECEIPT_AMOUNT);
		});

		it("reverse_charge is a no-op the second time (double-reversal guard)", async () => {
			const { error } = await clientA.rpc("reverse_charge", {
				p_charge_id: chargeId,
			});
			expect(error).toBeNull();

			expect(await countReversalsOf("rent_charges", chargeId)).toBe(1);
			expect(await countReversalsOf("rent_receipts", receiptId)).toBe(1);
			expect(await readBalance()).toBe(0);
		});

		it("the original rows stay visible on the ledger after reversal (nothing is deleted)", async () => {
			const { data, error } = await clientA.rpc("get_lease_ledger", {
				p_lease_id: leaseAId,
			});
			expect(error).toBeNull();
			const entries = (Array.isArray(data) ? data : []) as {
				id: string;
				kind: string;
				amount: number;
				reverses_id: string | null;
			}[];

			const original = entries.find((entry) => entry.id === chargeId);
			expect(original).toBeDefined();
			expect(Number(original?.amount)).toBe(CHARGE_AMOUNT);
			expect(original?.reverses_id).toBeNull();

			expect(
				entries.filter((entry) => entry.reverses_id !== null).length,
			).toBeGreaterThanOrEqual(2);
		});

		it("reverse_receipt posts exactly one exact negation of a standalone receipt", async () => {
			const { data: charge } = await clientA
				.from("rent_charges")
				.insert({
					lease_id: leaseAId,
					owner_user_id: ownerAId,
					type: "manual_charge",
					amount: CHARGE_AMOUNT,
					period_start: "2099-04-01",
					due_date: "2099-04-01",
					description: "Standalone receipt-reversal fixture charge",
				})
				.select("id")
				.single();
			soloChargeId = charge ? (charge.id as string) : null;

			const { data: receipt } = await clientA
				.from("rent_receipts")
				.insert({
					charge_id: soloChargeId,
					lease_id: leaseAId,
					owner_user_id: ownerAId,
					amount: RECEIPT_AMOUNT,
					method: "zelle",
					received_date: "2099-04-05",
					description: "Standalone receipt-reversal fixture receipt",
				})
				.select("id")
				.single();
			soloReceiptId = receipt ? (receipt.id as string) : null;

			// 1000 charged, 400 received against it -> 600 owed on this pair.
			const owedWithReceipt = await readBalance();
			expect(owedWithReceipt).toBe(CHARGE_AMOUNT - RECEIPT_AMOUNT);

			const { error } = await clientA.rpc("reverse_receipt", {
				p_receipt_id: soloReceiptId,
			});
			expect(error).toBeNull();

			// The receipt is cancelled, so the full charge is owed again.
			expect(await readBalance()).toBe(CHARGE_AMOUNT);
			expect(await countReversalsOf("rent_receipts", soloReceiptId)).toBe(1);

			const { data: reversal } = await service
				.from("rent_receipts")
				.select("amount, charge_id")
				.eq("reverses_id", soloReceiptId)
				.single();
			expect(Number(reversal?.amount)).toBe(-RECEIPT_AMOUNT);
			expect(reversal?.charge_id).toBe(soloChargeId);

			// Second call changes nothing (double-reversal guard).
			await clientA.rpc("reverse_receipt", { p_receipt_id: soloReceiptId });
			expect(await countReversalsOf("rent_receipts", soloReceiptId)).toBe(1);
		});
	},
);
