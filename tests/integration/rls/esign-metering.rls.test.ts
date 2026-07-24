import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { REVOKED_CODES } from "./_helpers/revoked-codes";

/**
 * Phase 54 / METER-01 - race-safe, append-only e-sign send metering.
 *
 * Proves the DB-layer enforcement core: the advisory-lock count-and-insert
 * `meter_esign_send(uuid, uuid)` RPC (service_role-only), the owner-scoped
 * append-only `esign_events` table, and the param-less
 * `get_esign_usage_current_month()` read RPC (authenticated).
 *
 * Client mix (mirrors blogs-status-workflow.rls.test.ts + notifications.rls.
 * test.ts): a SERVICE_ROLE client drives the write path (meter_esign_send is
 * service_role-only, and seeding/back-dating events + overriding a plan need
 * to bypass RLS), plus two authenticated owner clients (ownerA / ownerB, the
 * synthetic e2e-owner-a/b accounts) for the owner-SELECT isolation and the
 * privilege-boundary assertions.
 *
 * Plan override: the synthetic owners are pinned `subscription_plan='max'`
 * (unlimited = exempt from the cap), so the Growth cap cases temporarily set
 * ownerA's `subscription_plan` to a growth slug via the service-role client and
 * restore the original value in afterAll. Each behavioral test also sets the
 * plan it needs and sweeps ownerA's events first, so the cases are
 * order-independent (RLS integration tests run sequentially against prod).
 *
 * RUN is DEFERRED to the orchestrator: it requires the 20260723120000_esign_
 * metering migration applied to prod (Task 2) + regenerated types, then
 * `bun run test:integration -- esign-metering.rls.test.ts`. Skips cleanly when
 * the service-role / owner env vars are absent (local runs without secrets).
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

// A growth-tier slug for the cap cases (RPC lowercases + matches 'growth').
const GROWTH_PLAN = "growth";
// Unlimited tier for the Max-unbounded case (matches the RPC's max branch).
const MAX_PLAN = "max";
// The per-calendar-month Growth cap the RPC enforces (D-01a).
const CAP = 25;

describe.skipIf(skipReason)(
	"E-sign metering RLS - METER-01 cap / race / calendar-month / isolation / privilege",
	() => {
		let service: SupabaseClient;
		let clientA: SupabaseClient;
		let clientB: SupabaseClient;
		let ownerAId: string;
		let ownerBId: string;

		// ownerA fixture chain (property -> unit -> tenant -> lease). esign_events.
		// lease_id is a NOT NULL FK to leases(id), so seeded/metered events need a
		// real owned lease id.
		let propertyAId: string | null = null;
		let unitAId: string | null = null;
		let tenantAId: string | null = null;
		let leaseAId: string | null = null;

		// The synthetic owner's original plan (restored in afterAll).
		let originalPlanA: string | null = null;

		// -------------------------------------------------------------------------
		// Helpers (all via the service-role client - bypass RLS for setup/teardown)
		// -------------------------------------------------------------------------

		async function setPlanA(plan: string): Promise<void> {
			const { error } = await service
				.from("users")
				.update({ subscription_plan: plan })
				.eq("id", ownerAId);
			expect(error).toBeNull();
		}

		async function sweepOwnerAEvents(): Promise<void> {
			const { error } = await service
				.from("esign_events")
				.delete()
				.eq("owner_user_id", ownerAId);
			expect(error).toBeNull();
		}

		async function seedEvents(
			count: number,
			opts: { createdAt?: string } = {},
		): Promise<void> {
			if (count <= 0) return;
			const rows = Array.from({ length: count }, () => ({
				owner_user_id: ownerAId,
				lease_id: leaseAId,
				...(opts.createdAt ? { created_at: opts.createdAt } : {}),
			}));
			const { error } = await service.from("esign_events").insert(rows);
			expect(error).toBeNull();
		}

		async function countOwnerAEvents(): Promise<number> {
			const { count, error } = await service
				.from("esign_events")
				.select("id", { count: "exact", head: true })
				.eq("owner_user_id", ownerAId);
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

			// Capture the synthetic owner's real plan so we restore it, not a guess.
			const { data: planRow } = await service
				.from("users")
				.select("subscription_plan")
				.eq("id", ownerAId)
				.single();
			originalPlanA = (planRow?.subscription_plan as string | null) ?? MAX_PLAN;

			// Build the ownerA fixture chain while the owner is still unlimited (max),
			// so the property/unit plan-limit triggers never fire during setup.
			const { data: pA } = await service
				.from("properties")
				.insert({
					name: "Esign Metering Test Property A",
					address_line1: "1 Meter St",
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
						unit_number: "METER-A-101",
						bedrooms: 1,
						bathrooms: 1,
						rent_amount: 1500,
						owner_user_id: ownerAId,
					})
					.select("id")
					.single();
				unitAId = uA ? (uA.id as string) : null;
			}

			const { data: tA } = await service
				.from("tenants")
				.insert({
					email: `esign-meter-test-tenant-a-${Date.now()}@example.com`,
					first_name: "Esign",
					last_name: "MeterA",
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
						rent_amount: 1500,
						security_deposit: 1500,
					})
					.select("id")
					.single();
				leaseAId = lA ? (lA.id as string) : null;
			}

			// Clean slate for ownerA's metering, then pin the cap-case default plan.
			await sweepOwnerAEvents();
			await setPlanA(GROWTH_PLAN);
		});

		afterAll(async () => {
			// Remove seeded metering rows and restore the synthetic owner's real plan.
			if (ownerAId) {
				await sweepOwnerAEvents();
				await setPlanA(originalPlanA ?? MAX_PLAN);
			}
			// Tear down the fixture chain (lease -> tenant -> unit -> property). The
			// lease delete also cascades any remaining esign_events (FK on delete
			// cascade), but the sweep above already cleared them.
			if (leaseAId) await service.from("leases").delete().eq("id", leaseAId);
			if (tenantAId) await service.from("tenants").delete().eq("id", tenantAId);
			if (unitAId) await service.from("units").delete().eq("id", unitAId);
			if (propertyAId)
				await service.from("properties").delete().eq("id", propertyAId);
		});

		// -------------------------------------------------------------------------
		// Growth hard cap (D-01a): 25th allowed, 26th refused with NO insert.
		// -------------------------------------------------------------------------

		it("Growth owner: the 25th send is allowed, the 26th is blocked with no row inserted", async () => {
			await setPlanA(GROWTH_PLAN);
			await sweepOwnerAEvents();
			await seedEvents(CAP - 1); // 24 current-month sends already used

			// 25th send: under cap -> allowed, records the event.
			const { data: r25, error: e25 } = await service.rpc("meter_esign_send", {
				p_owner: ownerAId,
				p_lease: leaseAId,
			});
			expect(e25).toBeNull();
			expect(r25?.[0]).toMatchObject({
				allowed: true,
				used: CAP,
				cap: CAP,
				unlimited: false,
			});
			expect(await countOwnerAEvents()).toBe(CAP);

			// 26th send: at cap -> blocked, NO new row.
			const { data: r26, error: e26 } = await service.rpc("meter_esign_send", {
				p_owner: ownerAId,
				p_lease: leaseAId,
			});
			expect(e26).toBeNull();
			expect(r26?.[0]).toMatchObject({
				allowed: false,
				used: CAP,
				cap: CAP,
				unlimited: false,
			});
			expect(await countOwnerAEvents()).toBe(CAP);
		});

		// -------------------------------------------------------------------------
		// Max is unlimited: records the event, returns unlimited=true, never blocks.
		// -------------------------------------------------------------------------

		it("Max owner: send is never blocked, returns unlimited=true, and still records the event", async () => {
			await setPlanA(MAX_PLAN);
			await sweepOwnerAEvents();
			await seedEvents(CAP + 5); // already past the Growth cap - irrelevant for Max

			const before = await countOwnerAEvents();
			const { data, error } = await service.rpc("meter_esign_send", {
				p_owner: ownerAId,
				p_lease: leaseAId,
			});
			expect(error).toBeNull();
			expect(data?.[0]?.allowed).toBe(true);
			expect(data?.[0]?.unlimited).toBe(true);
			expect(data?.[0]?.cap).toBe(CAP);
			// Max records the send for the usage widget (one new row).
			expect(await countOwnerAEvents()).toBe(before + 1);

			// The param-less read RPC reports unlimited for a Max caller.
			const { data: usage } = await clientA.rpc(
				"get_esign_usage_current_month",
			);
			expect(usage?.[0]?.unlimited).toBe(true);
			expect(usage?.[0]?.cap).toBe(CAP);
		});

		// -------------------------------------------------------------------------
		// Calendar-month window (D-01): a prior-month event does not count toward
		// the current-month cap (date_trunc('month', now()) boundary).
		// -------------------------------------------------------------------------

		it("Calendar-month boundary: a prior-month send is excluded from the current-month count", async () => {
			await setPlanA(GROWTH_PLAN);
			await sweepOwnerAEvents();

			// 15th of the previous calendar month (safely before the 1st of this
			// month in any timezone) - must NOT count toward the current window.
			const now = new Date();
			const priorMonthIso = new Date(
				Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15, 12, 0, 0),
			).toISOString();

			await seedEvents(CAP, { createdAt: priorMonthIso }); // 25 prior-month sends
			await seedEvents(2); // 2 current-month sends

			// The owner-scoped read counts only the current calendar month.
			const { data: usage, error: usageErr } = await clientA.rpc(
				"get_esign_usage_current_month",
			);
			expect(usageErr).toBeNull();
			expect(usage?.[0]?.used).toBe(2);
			expect(usage?.[0]?.cap).toBe(CAP);
			expect(usage?.[0]?.unlimited).toBe(false);

			// And a send is allowed (current window is 2, not 27) - proving the 25
			// back-dated rows are excluded (if counted, this would block).
			const { data: meter, error: meterErr } = await service.rpc(
				"meter_esign_send",
				{ p_owner: ownerAId, p_lease: leaseAId },
			);
			expect(meterErr).toBeNull();
			expect(meter?.[0]?.allowed).toBe(true);
			expect(meter?.[0]?.used).toBe(3);
		});

		// -------------------------------------------------------------------------
		// Advisory-lock race safety (T-54-01): N concurrent sends at count=24 yield
		// exactly one additional insert (25 total) and exactly one allowed=false.
		// -------------------------------------------------------------------------

		it("Concurrent sends at count=24 produce exactly one 25th insert (no TOCTOU 26th)", async () => {
			await setPlanA(GROWTH_PLAN);
			await sweepOwnerAEvents();
			await seedEvents(CAP - 1); // 24 current-month sends

			const CONCURRENCY = 5;
			const results = await Promise.all(
				Array.from({ length: CONCURRENCY }, () =>
					service.rpc("meter_esign_send", {
						p_owner: ownerAId,
						p_lease: leaseAId,
					}),
				),
			);

			const allowed = results.filter((r) => r.data?.[0]?.allowed === true);
			const blocked = results.filter((r) => r.data?.[0]?.allowed === false);

			// The advisory lock serializes the check-then-insert: exactly one call
			// consumes the 25th slot, the rest are refused.
			expect(allowed).toHaveLength(1);
			expect(blocked).toHaveLength(CONCURRENCY - 1);
			// Total events land at exactly the cap - never 26.
			expect(await countOwnerAEvents()).toBe(CAP);
		});

		// -------------------------------------------------------------------------
		// get_esign_usage_current_month: param-less, resolves auth.uid() internally.
		// -------------------------------------------------------------------------

		it("get_esign_usage_current_month returns the caller's {used, cap, unlimited} without an owner arg", async () => {
			await setPlanA(GROWTH_PLAN);
			await sweepOwnerAEvents();
			await seedEvents(5);

			const { data, error } = await clientA.rpc(
				"get_esign_usage_current_month",
			);
			expect(error).toBeNull();
			expect(data?.[0]).toMatchObject({
				used: 5,
				cap: CAP,
				unlimited: false,
			});
		});

		// -------------------------------------------------------------------------
		// Owner-SELECT isolation (T-54-03): an owner reads only their own events;
		// the other owner never sees them.
		// -------------------------------------------------------------------------

		it("owner A reads only their own esign_events; owner B cannot see them", async () => {
			await setPlanA(GROWTH_PLAN);
			await sweepOwnerAEvents();
			await seedEvents(3);

			const { data: aRows, error: aErr } = await clientA
				.from("esign_events")
				.select("id, owner_user_id");
			expect(aErr).toBeNull();
			expect(aRows).not.toBeNull();
			// Every visible row belongs to ownerA (owner-scoped SELECT policy).
			(aRows ?? []).forEach((row) => {
				expect(row.owner_user_id).toBe(ownerAId);
			});
			const aIds = new Set((aRows ?? []).map((r) => r.id as string));
			expect(aIds.size).toBeGreaterThanOrEqual(3);

			// Owner B cannot see any of ownerA's seeded rows.
			const { data: bRows, error: bErr } = await clientB
				.from("esign_events")
				.select("id");
			expect(bErr).toBeNull();
			(bRows ?? []).forEach((row) => {
				expect(aIds.has(row.id as string)).toBe(false);
			});
		});

		// -------------------------------------------------------------------------
		// Privilege boundary (T-54-02): the write-path RPC is service_role-only.
		// An authenticated owner must NOT be able to call meter_esign_send.
		// -------------------------------------------------------------------------

		it("meter_esign_send is not callable by the authenticated role", async () => {
			const { data, error } = await clientA.rpc("meter_esign_send", {
				p_owner: ownerAId,
				p_lease: leaseAId,
			});

			// EXECUTE revoked from public/anon/authenticated (service_role only).
			// PostgREST surfaces this as insufficient_privilege / undefined_function /
			// not-found - accept the canonical revoked-EXECUTE code set.
			expect(error).not.toBeNull();
			expect(REVOKED_CODES).toContain(error?.code);
			expect(data).toBeNull();
		});
	},
);
