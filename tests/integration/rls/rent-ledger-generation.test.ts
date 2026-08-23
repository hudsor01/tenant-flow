import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { REVOKED_CODES } from "./_helpers/revoked-codes";

/**
 * Phase 55 / LEDGER-01 + LEDGER-04 — charge generation: amount exactness,
 * idempotency, coverage predicate, privilege boundary (T-55-05/T-55-06).
 *
 * Proves `generate_rent_charges()` from 55-01
 * (`20260724140100_rent_charges_generation_cron.sql`), the pg_cron job behind
 * the whole ledger:
 *   - THE MONEY BOUNDARY (D-00, T-55-05): the generated charge amount equals
 *     `leases.rent_amount` exactly. `rent_amount` is integer DOLLARS; the
 *     generator's single `::numeric(10,2)` cast is the only conversion in the
 *     subsystem. A generated amount of 123400 for a $1,234 rent is the v8.0
 *     MONEY-01/02 100x regression, and this assertion is what catches it.
 *   - Coverage (D-04): a lease with `ledger_start_date IS NULL` is not
 *     onboarded and gets no charges at all.
 *   - Bounded-range generation (A3/D-04): one `type='rent'` charge per calendar
 *     month from the track-since month through the current month, each dated on
 *     the 1st with `due_date = period_start` (D-01) — never an unbounded
 *     backfill before track-since.
 *   - Idempotency (T-55-06): a second call inserts nothing. The partial unique
 *     index `uq_rent_charges_lease_period_rent ... where type = 'rent'` and the
 *     matching `on conflict ... do nothing` arbiter make cron re-runs no-ops.
 *   - Privilege boundary: the generator is service_role-only, so an
 *     authenticated owner cannot call it to fabricate charges.
 *
 * The generator is global (it walks every onboarded lease), so this suite
 * asserts per-lease row counts scoped to its own fixture ids rather than the
 * RPC's global inserted-count — the daily cron and other suites may legitimately
 * have generated rows in between.
 *
 * RUN is DEFERRED to Plan 55-04: it requires the 55-01/55-02 migrations applied
 * to prod + regenerated types, then
 * `bun run test:integration -- rent-ledger-generation`. Skips cleanly when the
 * service-role / owner env vars are absent.
 *
 * Teardown note: generated charges are append-only for every writer (the guard
 * trigger fires for service_role and for the ON DELETE CASCADE from leases), so
 * the fixture leases may survive the run. Every assertion is lease-scoped.
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

/** Integer DOLLARS, exactly as prod stores leases.rent_amount. */
const RENT_AMOUNT = 1234;
/** Track-since is 2 months back, so the tracked window is [m-2, m-1, m]. */
const TRACKED_MONTHS = 3;

/** The 1st of the month `offset` months from the current UTC month. */
function firstOfMonth(offset: number): string {
	const now = new Date();
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1))
		.toISOString()
		.slice(0, 10);
}

interface RentChargeRow {
	id: string;
	amount: number;
	period_start: string;
	due_date: string;
	type: string;
	description: string | null;
}

describe.skipIf(skipReason)(
	"Rent ledger - LEDGER-01/04 charge generation (amount exactness, idempotency, coverage)",
	() => {
		let service: SupabaseClient;
		let clientA: SupabaseClient;
		let ownerAId: string;

		let propertyAId: string | null = null;
		let unitAId: string | null = null;
		let tenantAId: string | null = null;
		/** Onboarded lease: ledger_start_date set 2 months back. */
		let trackedLeaseId: string | null = null;
		/** Never onboarded: ledger_start_date stays NULL for the whole run. */
		let untrackedLeaseId: string | null = null;

		async function createLease(): Promise<string | null> {
			// ASSERTS ITS OWN SETUP. This swallowed the insert error and returned
			// null, so the caller passed null where a uuid was expected and the
			// failure surfaced three layers away as `22P02 invalid input syntax` --
			// which reads like a ledger defect rather than a fixture that never
			// existed. A setup failure must look like a setup failure.
			const { data, error } = await service
				.from("leases")
				.insert({
					owner_user_id: ownerAId,
					unit_id: unitAId,
					primary_tenant_id: tenantAId,
					// Starts before track-since so generation is floored by
					// ledger_start_date, not by the lease term.
					start_date: firstOfMonth(-TRACKED_MONTHS),
					end_date: firstOfMonth(12),
					rent_amount: RENT_AMOUNT,
					security_deposit: RENT_AMOUNT,
					lease_status: "active",
				})
				.select("id")
				.single();
			expect(error).toBeNull();
			expect(data?.id).toBeTruthy();
			return data ? (data.id as string) : null;
		}

		async function generate(): Promise<void> {
			const { error } = await service.rpc("generate_rent_charges");
			expect(error).toBeNull();
		}

		async function rentChargesFor(
			leaseId: string | null,
		): Promise<RentChargeRow[]> {
			const { data, error } = await service
				.from("rent_charges")
				.select("id, amount, period_start, due_date, type, description")
				.eq("lease_id", leaseId)
				.eq("type", "rent")
				.order("period_start", { ascending: true });
			expect(error).toBeNull();
			return (data ?? []) as RentChargeRow[];
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
					name: "Ledger Generation Test Property A",
					address_line1: "3 Ledger St",
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
						unit_number: "LEDGER-GEN-101",
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
					email: `ledger-gen-tenant-a-${Date.now()}@example.com`,
					first_name: "Ledger",
					last_name: "GenA",
					owner_user_id: ownerAId,
				})
				.select("id")
				.single();
			tenantAId = tA ? (tA.id as string) : null;

			if (unitAId && tenantAId) {
				// Two identical leases: one is onboarded mid-suite (ledger_start_date
				// set), the other never is — the coverage-predicate control.
				trackedLeaseId = await createLease();
				untrackedLeaseId = await createLease();
			}
		});

		afterAll(async () => {
			// Best-effort: generated charges cannot be deleted (append-only guard),
			// which also blocks the cascade from leases. Assertions are lease-scoped.
			if (trackedLeaseId)
				await service.from("leases").delete().eq("id", trackedLeaseId);
			if (untrackedLeaseId)
				await service.from("leases").delete().eq("id", untrackedLeaseId);
			if (tenantAId) await service.from("tenants").delete().eq("id", tenantAId);
			if (unitAId) await service.from("units").delete().eq("id", unitAId);
			if (propertyAId)
				await service.from("properties").delete().eq("id", propertyAId);
		});

		// ---------------------------------------------------------------------
		// LEDGER-04: no track-since date -> no ledger at all
		// ---------------------------------------------------------------------

		it("generates nothing for a lease that was never onboarded (ledger_start_date NULL)", async () => {
			await generate();
			expect(await rentChargesFor(untrackedLeaseId)).toHaveLength(0);
		});

		// ---------------------------------------------------------------------
		// LEDGER-01 + T-55-05: one charge per tracked month, amount EXACT dollars
		// ---------------------------------------------------------------------

		it("generates one 'rent' charge per tracked month, dated the 1st, at the exact rent_amount", async () => {
			const { error: onboardErr } = await service
				.from("leases")
				.update({ ledger_start_date: firstOfMonth(-(TRACKED_MONTHS - 1)) })
				.eq("id", trackedLeaseId);
			expect(onboardErr).toBeNull();

			await generate();

			const charges = await rentChargesFor(trackedLeaseId);
			// Track-since month through the current month, inclusive.
			expect(charges).toHaveLength(TRACKED_MONTHS);

			const expectedPeriods = [
				firstOfMonth(-(TRACKED_MONTHS - 1)),
				firstOfMonth(-(TRACKED_MONTHS - 2)),
				firstOfMonth(0),
			];
			expect(charges.map((row) => row.period_start)).toEqual(expectedPeriods);

			for (const charge of charges) {
				// THE assertion this whole suite exists for: dollars in, dollars out.
				// Not rent_amount scaled by a hundred, not cents — the same number.
				expect(Number(charge.amount)).toBe(RENT_AMOUNT);
				// due_date = the 1st = period_start (D-01: no rent-due-day column).
				expect(charge.due_date).toBe(charge.period_start);
				expect(charge.type).toBe("rent");
			}
		});

		it("reports the generated dollars unchanged through the summary RPC", async () => {
			const { data, error } = await clientA.rpc("get_lease_ledger_summary", {
				p_lease_id: trackedLeaseId,
			});
			expect(error).toBeNull();
			const row = Array.isArray(data) ? data[0] : data;
			// Nothing has been received yet, so the balance is the charged total —
			// still in dollars end to end (no scaling at the read boundary either).
			expect(Number(row?.charges_total)).toBe(RENT_AMOUNT * TRACKED_MONTHS);
			expect(Number(row?.receipts_total)).toBe(0);
			expect(Number(row?.balance)).toBe(RENT_AMOUNT * TRACKED_MONTHS);
		});

		// ---------------------------------------------------------------------
		// T-55-06: idempotency — cron re-runs are no-ops
		// ---------------------------------------------------------------------

		it("inserts nothing on a second run (partial-unique idempotency)", async () => {
			const before = await rentChargesFor(trackedLeaseId);

			await generate();
			await generate();

			const after = await rentChargesFor(trackedLeaseId);
			expect(after).toHaveLength(before.length);
			expect(after.map((row) => row.id)).toEqual(before.map((row) => row.id));
			// Amounts are untouched by the re-runs (no accumulation, no rescale).
			after.forEach((row) => {
				expect(Number(row.amount)).toBe(RENT_AMOUNT);
			});
			// And the untracked lease still has nothing.
			expect(await rentChargesFor(untrackedLeaseId)).toHaveLength(0);
		});

		// ---------------------------------------------------------------------
		// Privilege boundary: the generator is service_role-only
		// ---------------------------------------------------------------------

		it("generate_rent_charges is not callable by the authenticated role", async () => {
			const { data, error } = await clientA.rpc("generate_rent_charges");

			// EXECUTE revoked from public/anon/authenticated — PostgREST surfaces
			// this as insufficient_privilege / undefined_function / not-found.
			expect(error).not.toBeNull();
			expect(REVOKED_CODES).toContain(error?.code);
			expect(data).toBeNull();
		});
	},
);
