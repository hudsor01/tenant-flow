import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";
import { REVOKED_CODES } from "./_helpers/revoked-codes";

// -----------------------------------------------------------------------------
// Phase 53 (Renewal Reminder Delivery) - lease_reminders delivery-state + the
// lease_renewal_reminder notification are owner-scoped, and the delivery write
// path is service-role-only. Dual-client ownerA/ownerB harness mirroring
// notifications.rls.test.ts + activity.rls.test.ts (synthetic owners only,
// sequential, hits PROD via the publishable key + a user session - never the
// service role). Chai-6: reject-shape assertions use `.rejects.toMatchObject`
// elsewhere; here the PostgREST client returns { data, error } rather than
// throwing, so we assert on `error`/`data` directly (the harness convention).
//
// RUN is DEFERRED (needs prod + .env.local; runs in CI rls-security). At the time
// of authoring, delivery is still OFF (Migration C2 unapplied) and no
// lease_renewal_reminder rows exist yet - the owner-scoping cases use the
// established skip-if-empty pattern so they pass cleanly pre-go-live and pin
// isolation once rows land. The privilege-boundary + write-block cases are
// unconditional (they need no seeded data).
// -----------------------------------------------------------------------------

describe("Lease reminders delivery RLS - cross-owner isolation + write boundary", () => {
	let clientA: SupabaseClient;
	let clientB: SupabaseClient;
	let ownerAId: string;

	// An existing owned lease id (if the synthetic owner has one) for the
	// INSERT-denied assertion; falls back to a random UUID (RLS denies either way).
	let ownedLeaseId: string | null = null;

	beforeAll(async () => {
		const { ownerA, ownerB } = getTestCredentials();
		clientA = await createTestClient(ownerA.email, ownerA.password);
		clientB = await createTestClient(ownerB.email, ownerB.password);

		const {
			data: { user: userA },
		} = await clientA.auth.getUser();
		ownerAId = userA!.id;

		const { data: leaseA } = await clientA.from("leases").select("id").limit(1);
		ownedLeaseId =
			leaseA && leaseA.length > 0 ? (leaseA[0]!.id as string) : null;
	});

	// ---------------------------------------------------------------------------
	// SELECT isolation on lease_reminders (owner-scoped via the leases join).
	// Policy: "Property owners can view lease reminder history" - SELECT for
	// authenticated WHERE lease_id IN (leases owned by auth.uid()). No INSERT/
	// UPDATE/DELETE policies (pg_cron/service-role only).
	// ---------------------------------------------------------------------------

	it("owner A can read their own lease_reminders including the new delivery columns", async () => {
		// Selecting the Phase-53 delivery columns proves they exist and are
		// readable by the owner (a missing/unreadable column 400s at PostgREST).
		const { data, error } = await clientA
			.from("lease_reminders")
			.select(
				"id, lease_id, delivery_status, delivered_at, resend_message_id, attempt_count",
			);

		expect(error).toBeNull();
		expect(data).not.toBeNull();

		if (!data || data.length === 0) return;

		// Every visible row must carry a valid delivery_status (the CHECK domain).
		const allowed = new Set([
			"pending",
			"claimed",
			"sent",
			"suppressed",
			"failed",
			"expired",
		]);
		data.forEach((row) => {
			expect(allowed.has(row.delivery_status as string)).toBe(true);
		});
	});

	it("owner A cannot read owner B's lease_reminders (cross-owner isolation via the leases join)", async () => {
		const { data: dataA } = await clientA.from("lease_reminders").select("id");
		const { data: dataB } = await clientB.from("lease_reminders").select("id");

		const ownerAIds = new Set((dataA ?? []).map((r) => r.id as string));
		const ownerBIds = new Set((dataB ?? []).map((r) => r.id as string));

		// No overlap: the leases-join RLS scopes each owner to their own reminders.
		ownerBIds.forEach((id) => {
			expect(ownerAIds.has(id)).toBe(false);
		});
	});

	// ---------------------------------------------------------------------------
	// lease_renewal_reminder notification (REMIND-05) - owner-scoped like every
	// other notification (user_id = auth.uid()). Skip-if-empty until go-live rows
	// land; the isolation invariant is pinned regardless.
	// ---------------------------------------------------------------------------

	it("lease_renewal_reminder notifications are readable only by their owner", async () => {
		const { data, error } = await clientA
			.from("notifications")
			.select("id, user_id, notification_type")
			.eq("notification_type", "lease_renewal_reminder");

		expect(error).toBeNull();
		expect(data).not.toBeNull();

		if (!data || data.length === 0) return;

		data.forEach((row) => {
			expect(row.user_id).toBe(ownerAId);
			expect(row.notification_type).toBe("lease_renewal_reminder");
		});
	});

	it("owner B cannot see owner A's lease_renewal_reminder notifications", async () => {
		const { data: dataA } = await clientA
			.from("notifications")
			.select("id")
			.eq("notification_type", "lease_renewal_reminder");
		const { data: dataB } = await clientB
			.from("notifications")
			.select("id")
			.eq("notification_type", "lease_renewal_reminder");

		const ownerAIds = new Set((dataA ?? []).map((r) => r.id as string));
		const ownerBIds = new Set((dataB ?? []).map((r) => r.id as string));

		ownerBIds.forEach((id) => {
			expect(ownerAIds.has(id)).toBe(false);
		});
	});

	// ---------------------------------------------------------------------------
	// Privilege boundaries - the delivery write path is service-role-only. An
	// authenticated owner must NOT be able to mint reminder notifications or claim
	// queued reminders (those run inside the SECURITY DEFINER drainer).
	// ---------------------------------------------------------------------------

	it("create_notification('lease_renewal_reminder', ...) is not callable by the authenticated role", async () => {
		const { data, error } = await clientA.rpc("create_notification", {
			p_user_id: ownerAId,
			p_type: "lease_renewal_reminder",
			p_title: "Lease renewal reminder",
		});

		// EXECUTE revoked from public/authenticated (service_role only). PostgREST
		// surfaces this as insufficient_privilege / undefined_function / not-found.
		expect(error).not.toBeNull();
		expect(REVOKED_CODES).toContain(error?.code);
		expect(data).toBeNull();
	});

	it("claim_lease_reminders is not callable by the authenticated role", async () => {
		const { data, error } = await clientA.rpc("claim_lease_reminders", {
			p_limit: 10,
		});

		expect(error).not.toBeNull();
		expect(REVOKED_CODES).toContain(error?.code);
		expect(data).toBeNull();
	});

	// ---------------------------------------------------------------------------
	// Write boundary - lease_reminders has NO INSERT/UPDATE policy for
	// authenticated. Owners cannot write delivery state directly; the delivery_
	// status CHECK is never even reached because RLS default-denies the write
	// first (blocked by RLS, not just the CHECK).
	// ---------------------------------------------------------------------------

	it("owner A cannot INSERT a lease_reminders row (no INSERT policy - pg_cron/service-role only)", async () => {
		const leaseId = ownedLeaseId ?? crypto.randomUUID();

		const { data, error } = await clientA
			.from("lease_reminders")
			.insert({
				lease_id: leaseId,
				reminder_type: "30_days",
				delivery_status: "pending",
			})
			.select("id")
			.single();

		// RLS default-deny (no INSERT policy) rejects the write; the row never
		// reaches the delivery_status CHECK. The write must not succeed.
		expect(error).not.toBeNull();
		expect(data).toBeNull();
	});

	it("owner A cannot UPDATE delivery_status on lease_reminders (no UPDATE policy)", async () => {
		const { data: own } = await clientA
			.from("lease_reminders")
			.select("id")
			.limit(1);

		const targetId =
			own && own.length > 0 ? (own[0]!.id as string) : crypto.randomUUID();

		const { data, error } = await clientA
			.from("lease_reminders")
			.update({ delivery_status: "sent" })
			.eq("id", targetId)
			.select("id");

		// No UPDATE policy: the row is not updatable by the owner, so the update
		// matches zero rows (RLS USING is SELECT-only) - never mutates delivery state.
		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	// ---------------------------------------------------------------------------
	// claim_lease_reminders exactly-once claim + WR-02 stale-claim reaper
	// (REMIND-02) - owner-visible invariants. BEHAVIORAL COVERAGE IS DEFERRED (F5).
	//
	// The claim RPC's state transitions - a 'pending' row flips to 'claimed' with
	// claimed_at stamped + attempt_count incremented; a stale 'claimed' row
	// (claimed_at > 1h ago) IS reclaimed; a recently-'claimed' row (< 1h) is NOT
	// reclaimed; a 'sent' row is NEVER claimed - cannot be exercised from THIS
	// harness. It has only authenticated dual-client sessions (publishable key +
	// user JWT); there is no service_role path, and:
	//   (a) lease_reminders has no INSERT policy for authenticated, so we cannot
	//       seed pending/claimed rows (pinned by the INSERT-denied case above), and
	//   (b) claim_lease_reminders is service_role-only, so we cannot invoke it
	//       (pinned by the "not callable by authenticated" case above).
	// The transition assertions therefore live with the drainer's Deno unit tests
	// (supabase/functions/tests/send-lease-reminders-test.ts, which fakes the claim
	// result) + the SQL definition (20260722005310 / 20260722015716). Here we pin
	// the closest OWNER-VISIBLE invariants the claim RPC guarantees on any row an
	// owner can read; skip-if-empty until go-live rows land in CI (rls-security).
	// ---------------------------------------------------------------------------

	it("every 'claimed' lease_reminders row carries a claimed_at stamp + attempt_count >= 1 (reaper clock)", async () => {
		const { data, error } = await clientA
			.from("lease_reminders")
			.select("id, delivery_status, claimed_at, attempt_count")
			.eq("delivery_status", "claimed");

		expect(error).toBeNull();
		expect(data).not.toBeNull();

		if (!data || data.length === 0) return;

		// claim_lease_reminders stamps claimed_at = now() and increments attempt_count
		// in the same UPDATE that sets 'claimed', so the >1h staleness clock the WR-02
		// reaper keys off is always present on a claimed row, and the row has been
		// through the claim at least once.
		data.forEach((row) => {
			expect(row.claimed_at).not.toBeNull();
			expect(row.attempt_count as number).toBeGreaterThanOrEqual(1);
		});
	});

	it("every 'sent' lease_reminders row is terminal-shaped: delivered_at + resend_message_id + attempt_count >= 1", async () => {
		const { data, error } = await clientA
			.from("lease_reminders")
			.select(
				"id, delivery_status, delivered_at, resend_message_id, attempt_count",
			)
			.eq("delivery_status", "sent");

		expect(error).toBeNull();
		expect(data).not.toBeNull();

		if (!data || data.length === 0) return;

		// A 'sent' row was claimed (attempt_count incremented) then stamped by the
		// drainer with the Resend id + delivered_at. The claim WHERE clause matches
		// only pending / stale-claimed rows, so a 'sent' row is never re-claimed -
		// this terminal shape is stable.
		data.forEach((row) => {
			expect(row.delivered_at).not.toBeNull();
			expect(row.resend_message_id).not.toBeNull();
			expect(row.attempt_count as number).toBeGreaterThanOrEqual(1);
		});
	});
});
