import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Phase 55 / LEDGER-06 — owner isolation on the rent ledger (T-55-01/T-55-02).
 *
 * Proves the RLS core of the two append-only ledger tables created in 55-01
 * (`20260724140000_rent_ledger_schema.sql`):
 *   - `rent_charges_select` / `rent_receipts_select` scope reads to
 *     `owner_user_id = (select auth.uid())` — owner B never sees owner A's rows.
 *   - `rent_charges_insert` / `rent_receipts_insert` `WITH CHECK` the same
 *     predicate — owner B cannot forge a row attributed to owner A (T-55-02).
 *   - The read RPCs from 55-02 (`get_lease_ledger_summary`, `get_lease_ledger`)
 *     guard lease ownership with a 42501 raise before returning anything, so
 *     SECURITY DEFINER never leaks another landlord's ledger (T-55-01).
 *
 * Client mix (mirrors esign-metering.rls.test.ts): a SERVICE_ROLE client seeds
 * the owner A fixture chain (property -> unit -> tenant -> lease) bypassing RLS,
 * plus two authenticated owner clients (the synthetic e2e-owner-a/b accounts)
 * for every behavioral assertion. Ledger rows are inserted through the
 * AUTHENTICATED client on purpose — that is the policy path under test.
 *
 * RUN is DEFERRED to Plan 55-04: it requires the 55-01/55-02 migrations applied
 * to prod + regenerated types, then
 * `bun run test:integration -- rent-ledger-isolation`. Skips cleanly when the
 * service-role / owner env vars are absent (local runs without secrets).
 *
 * Teardown note: the ledger tables are append-only for EVERY writer (the
 * `rent_ledger_append_only()` BEFORE UPDATE OR DELETE trigger fires for
 * service_role too), so seeded charges/receipts cannot be swept — and the
 * fixture lease cannot be deleted while they reference it. Every assertion is
 * therefore scoped to the ids this suite created, so residue from a previous
 * run can never change an outcome.
 */

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_ROLE_KEY =
	process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
	process.env["SUPABASE_SECRET_KEY"];
const ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
const OWNER_A_EMAIL = process.env["E2E_OWNER_EMAIL"];
const OWNER_A_PASSWORD = process.env["E2E_OWNER_PASSWORD"];
const OWNER_B_EMAIL = process.env["E2E_OWNER_B_EMAIL"];
const OWNER_B_PASSWORD = process.env["E2E_OWNER_B_PASSWORD"];

const skipReason = !SUPABASE_URL
	? "NEXT_PUBLIC_SUPABASE_URL not set"
	: !SERVICE_ROLE_KEY
		? "SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY not set"
		: !ANON_KEY
			? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not set"
			: !OWNER_A_EMAIL ||
					!OWNER_A_PASSWORD ||
					!OWNER_B_EMAIL ||
					!OWNER_B_PASSWORD
				? "E2E owner credentials not set"
				: null;

// Dollars — never cents (D-00). rent_amount is integer dollars in prod.
const RENT_AMOUNT = 1234;
const CHARGE_AMOUNT = 900;
const RECEIPT_AMOUNT = 400;

describe.skipIf(skipReason)(
	"Rent ledger RLS - LEDGER-06 owner isolation (charges, receipts, read RPCs)",
	() => {
		let service: SupabaseClient;
		let clientA: SupabaseClient;
		let clientB: SupabaseClient;
		let ownerAId: string;
		let ownerBId: string;

		let propertyAId: string | null = null;
		let unitAId: string | null = null;
		let tenantAId: string | null = null;
		let leaseAId: string | null = null;

		// Ledger rows owner A creates through the authenticated client.
		let chargeAId: string | null = null;
		let receiptAId: string | null = null;

		beforeAll(async () => {
			service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
				auth: { persistSession: false, autoRefreshToken: false },
			});
			clientA = createClient(SUPABASE_URL!, ANON_KEY!, {
				auth: { persistSession: false, autoRefreshToken: false },
			});
			clientB = createClient(SUPABASE_URL!, ANON_KEY!, {
				auth: { persistSession: false, autoRefreshToken: false },
			});

			await clientA.auth.signInWithPassword({
				email: OWNER_A_EMAIL!,
				password: OWNER_A_PASSWORD!,
			});
			await clientB.auth.signInWithPassword({
				email: OWNER_B_EMAIL!,
				password: OWNER_B_PASSWORD!,
			});

			const {
				data: { user: userA },
			} = await clientA.auth.getUser();
			const {
				data: { user: userB },
			} = await clientB.auth.getUser();
			ownerAId = userA!.id;
			ownerBId = userB!.id;

			// Owner A fixture chain (service role — setup only, bypasses RLS).
			const { data: pA } = await service
				.from("properties")
				.insert({
					name: "Ledger Isolation Test Property A",
					address_line1: "1 Ledger St",
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
						unit_number: "LEDGER-ISO-101",
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
					email: `ledger-iso-tenant-a-${Date.now()}@example.com`,
					first_name: "Ledger",
					last_name: "IsoA",
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
		});

		afterAll(async () => {
			// Best-effort teardown. The ledger rows are immutable by design
			// (append-only trigger blocks DELETE for every writer, including
			// service_role and the ON DELETE CASCADE from leases), so the lease and
			// its parents may survive once ledger rows exist. Assertions below are
			// id-scoped, so leftovers are harmless.
			if (leaseAId) await service.from("leases").delete().eq("id", leaseAId);
			if (tenantAId) await service.from("tenants").delete().eq("id", tenantAId);
			if (unitAId) await service.from("units").delete().eq("id", unitAId);
			if (propertyAId)
				await service.from("properties").delete().eq("id", propertyAId);
		});

		// ---------------------------------------------------------------------
		// Owner A writes through the authenticated client (the INSERT policy path)
		// ---------------------------------------------------------------------

		it("owner A can insert a charge and an allocated receipt for their own lease", async () => {
			const { data: charge, error: chargeErr } = await clientA
				.from("rent_charges")
				.insert({
					lease_id: leaseAId,
					owner_user_id: ownerAId,
					type: "manual_charge",
					amount: CHARGE_AMOUNT,
					period_start: "2099-01-01",
					due_date: "2099-01-01",
					description: "Isolation fixture charge",
				})
				.select("id, amount, owner_user_id")
				.single();

			expect(chargeErr).toBeNull();
			expect(charge).not.toBeNull();
			// Dollars round-trip untouched — no hundredfold scaling (D-00).
			expect(Number(charge?.amount)).toBe(CHARGE_AMOUNT);
			expect(charge?.owner_user_id).toBe(ownerAId);
			chargeAId = charge ? (charge.id as string) : null;

			const { data: receipt, error: receiptErr } = await clientA
				.from("rent_receipts")
				.insert({
					charge_id: chargeAId,
					lease_id: leaseAId,
					owner_user_id: ownerAId,
					amount: RECEIPT_AMOUNT,
					method: "check",
					received_date: "2099-01-05",
					description: "Isolation fixture receipt",
				})
				.select("id, amount, owner_user_id")
				.single();

			expect(receiptErr).toBeNull();
			expect(Number(receipt?.amount)).toBe(RECEIPT_AMOUNT);
			expect(receipt?.owner_user_id).toBe(ownerAId);
			receiptAId = receipt ? (receipt.id as string) : null;
		});

		it("owner A reads back only their own ledger rows", async () => {
			const { data: charges, error: chargeErr } = await clientA
				.from("rent_charges")
				.select("id, owner_user_id")
				.eq("lease_id", leaseAId);
			expect(chargeErr).toBeNull();
			expect((charges ?? []).length).toBeGreaterThanOrEqual(1);
			(charges ?? []).forEach((row) => {
				expect(row.owner_user_id).toBe(ownerAId);
			});

			const { data: receipts, error: receiptErr } = await clientA
				.from("rent_receipts")
				.select("id, owner_user_id")
				.eq("lease_id", leaseAId);
			expect(receiptErr).toBeNull();
			(receipts ?? []).forEach((row) => {
				expect(row.owner_user_id).toBe(ownerAId);
			});
		});

		// ---------------------------------------------------------------------
		// T-55-01: cross-owner SELECT is empty (table + RPC paths)
		// ---------------------------------------------------------------------

		it("owner B cannot SELECT owner A's charges or receipts", async () => {
			const { data: charges, error: chargeErr } = await clientB
				.from("rent_charges")
				.select("id")
				.eq("id", chargeAId);
			expect(chargeErr).toBeNull();
			expect(charges ?? []).toHaveLength(0);

			const { data: receipts, error: receiptErr } = await clientB
				.from("rent_receipts")
				.select("id")
				.eq("id", receiptAId);
			expect(receiptErr).toBeNull();
			expect(receipts ?? []).toHaveLength(0);

			// And nothing of owner A's lease leaks through a broad read either.
			const { data: leaseScoped } = await clientB
				.from("rent_charges")
				.select("id, owner_user_id")
				.eq("lease_id", leaseAId);
			expect(leaseScoped ?? []).toHaveLength(0);
		});

		it("owner B cannot read owner A's ledger through the SECURITY DEFINER read RPCs", async () => {
			// SECURITY DEFINER bypasses RLS, so both RPCs guard lease ownership with
			// an explicit 42501 raise before touching a row (55-02).
			const { data: summary, error: summaryErr } = await clientB.rpc(
				"get_lease_ledger_summary",
				{ p_lease_id: leaseAId },
			);
			expect(summaryErr).not.toBeNull();
			expect(summaryErr?.code).toBe("42501");
			expect(summary).toBeNull();

			const { data: entries, error: entriesErr } = await clientB.rpc(
				"get_lease_ledger",
				{ p_lease_id: leaseAId },
			);
			expect(entriesErr).not.toBeNull();
			expect(entriesErr?.code).toBe("42501");
			expect(entries).toBeNull();
		});

		// ---------------------------------------------------------------------
		// T-55-02: cross-owner INSERT is refused by the WITH CHECK predicate
		// ---------------------------------------------------------------------

		it("owner B cannot insert a charge attributed to owner A", async () => {
			const { data, error } = await clientB
				.from("rent_charges")
				.insert({
					lease_id: leaseAId,
					owner_user_id: ownerAId, // forged attribution
					type: "manual_charge",
					amount: 50,
					period_start: "2099-02-01",
					due_date: "2099-02-01",
					description: "Cross-owner forgery attempt",
				})
				.select("id");

			// RLS WITH CHECK violation — PostgREST surfaces 42501.
			expect(error).not.toBeNull();
			expect(error?.code).toBe("42501");
			expect(data).toBeNull();
		});

		it("owner B cannot insert a receipt attributed to owner A", async () => {
			const { data, error } = await clientB
				.from("rent_receipts")
				.insert({
					charge_id: chargeAId,
					lease_id: leaseAId,
					owner_user_id: ownerAId, // forged attribution
					amount: 25,
					method: "cash",
					received_date: "2099-02-05",
				})
				.select("id");

			expect(error).not.toBeNull();
			expect(error?.code).toBe("42501");
			expect(data).toBeNull();
		});

		it("owner A's rows are still intact after owner B's attempts", async () => {
			const { data } = await service
				.from("rent_charges")
				.select("id, amount, owner_user_id")
				.eq("id", chargeAId)
				.single();
			expect(data?.owner_user_id).toBe(ownerAId);
			expect(Number(data?.amount)).toBe(CHARGE_AMOUNT);

			// No row was ever attributed to owner A by owner B.
			const { data: forged } = await service
				.from("rent_charges")
				.select("id")
				.eq("lease_id", leaseAId)
				.eq("description", "Cross-owner forgery attempt");
			expect(forged ?? []).toHaveLength(0);
			expect(ownerBId).not.toBe(ownerAId);
		});
	},
);
