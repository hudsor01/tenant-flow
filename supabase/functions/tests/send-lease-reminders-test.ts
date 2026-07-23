// Unit tests for the send-lease-reminders drainer (supabase/functions/send-lease-reminders/index.ts).
// Pure unit test against a hand-rolled STATEFUL fake SupabaseClient + a stubbed
// Resend fetch -- no real network, no `functions serve`, no deploy. Mirrors the
// tests/lease-signing-test.ts conventions (same runner, same fake-client rpc
// recorder + Resend-fetch stub + fetchCount primitive).
//
// The drainer's contract, one Deno.test per branch:
//   - flag off (app_config.reminders_delivery_enabled != 'true') -> 0 sends, early-return 200
//   - non-entitled tier (plan not in GROWTH_AND_MAX_PLANS) -> 0 sends, create_notification STILL recorded (A1)
//   - is_notification_suppressed(email)=true -> 0 sends, create_notification STILL recorded
//   - email in email_suppressions -> 0 sends, create_notification STILL recorded
//   - notification_settings.leases=false -> 0 sends, create_notification STILL recorded
//   - each suppression layer (2/3/4) ERRORS -> fail closed (0 sends), create_notification STILL recorded
//   - entitled + all clear -> exactly 1 send with Idempotency-Key === row.id; delivery_status -> 'sent'
//   - Resend send failure ({ok:false}) -> delivery_status='failed', in-app STILL created (A1), error captured
//   - re-drain of an already-'sent' row (claim returns nothing) -> 0 sends (exactly-once)
//   - multi-row batch: a failed middle row never aborts the batch; sent counts only successes
//   - transient leases-lookup error -> row left 'claimed' (reaper retries), no failed stamp
//   - genuine lease-not-found -> delivery_status='failed', no notification/email
//   - bad/missing Bearer -> 401, 0 sends
//
// Run: deno test --allow-all --no-check \
//   --import-map=supabase/functions/deno.json \
//   supabase/functions/tests/send-lease-reminders-test.ts

import { assert, assertEquals } from "jsr:@std/assert@1";
import type { SupabaseClient } from "@supabase/supabase-js";

// The drainer registers Deno.serve() as a module side-effect (like every edge fn
// in this repo). Setting DENO_TEST_NO_SERVE=1 before importing suppresses that
// server bind so the unit test can drive handleRequest() directly with a fake
// Request. validateEnv() caches on first call, so seed every required var first.
Deno.env.set("DENO_TEST_NO_SERVE", "1");
Deno.env.set("SUPABASE_URL", "http://localhost");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
Deno.env.set("NEXT_PUBLIC_APP_URL", "https://app.tenantflow.app");
Deno.env.set("RESEND_API_KEY", "test-key");
Deno.env.set("REMINDERS_INVOKE_SECRET", "drain-secret");

const { handleRequest } = await import("../send-lease-reminders/index.ts");

const INVOKE_SECRET = "drain-secret";
const APP_URL = "https://app.tenantflow.app";

interface ClaimedRow {
	id: string;
	lease_id: string;
	reminder_type: string;
	attempt_count: number;
}

interface OwnerRow {
	id: string;
	email: string;
	full_name: string | null;
	subscription_status: string | null;
	subscription_plan: string | null;
}

interface LeaseJoinRow {
	id: string;
	end_date: string | null;
	owner_user_id: string;
	users: OwnerRow | null;
	// property reached via units.property_id — mirrors the drainer's
	// units:unit_id(properties:property_id(name)) embed (leases has no property_id).
	units: { properties: { name: string | null } | null } | null;
}

interface Scenario {
	/** app_config.reminders_delivery_enabled value. */
	flagValue: string;
	/** rows returned by the claim_lease_reminders RPC. */
	claimed: ClaimedRow[];
	/** lease_id -> lease+owner+property join row. */
	leases: Record<string, LeaseJoinRow>;
	/** Injected error for the leases lookup. A TRANSIENT error must leave the row
	 *  'claimed' for the WR-02 reaper (NOT stamp 'failed'); null = no error, so an
	 *  absent leases entry becomes a genuine not-found ({ data: null, error: null }). */
	leasesError: { message: string } | null;
	/** is_notification_suppressed(email) result. */
	suppressed: boolean;
	/** email_suppressions row (or null = not bounced/complained). */
	emailSuppression: { email: string } | null;
	/** notification_settings row (or null = absent = defaults true = send). */
	notificationSettings: { email: boolean; leases: boolean } | null;
	/** Injected error for the is_notification_suppressed rpc (layer 2 fail-closed). */
	suppressedError: { message: string } | null;
	/** Injected error for the email_suppressions select (layer 3 fail-closed). */
	emailSuppressionError: { message: string } | null;
	/** Injected error for the notification_settings select (layer 4 fail-closed). */
	notificationSettingsError: { message: string } | null;
}

interface UpdateCall {
	table: string;
	payload: Record<string, unknown>;
	filters: Array<[string, unknown]>;
}

interface FakeCalls {
	rpcs: Array<{ name: string; args: Record<string, unknown> }>;
	updates: UpdateCall[];
}

/** Stateful fake client: records every rpc + lease_reminders update so the
 *  per-branch assertions (create_notification-always, delivery_status stamp,
 *  claim call) can inspect them. Reads (maybeSingle) return scenario data. */
function makeClient(scenario: Scenario): {
	client: SupabaseClient;
	calls: FakeCalls;
} {
	const calls: FakeCalls = { rpcs: [], updates: [] };

	const builder = (table: string) => {
		const filters: Array<[string, unknown]> = [];
		let updatePayload: Record<string, unknown> | null = null;
		const b: Record<string, unknown> = {
			select: () => b,
			eq: (col: string, val: unknown) => {
				filters.push([col, val]);
				return b;
			},
			// The notification existence-guard time-bounds itself with
			// .gt("created_at", dedupSince) (F1); record the filter so the chain
			// resolves the same way as .eq (the notifications read returns null here).
			gt: (col: string, val: unknown) => {
				filters.push([col, val]);
				return b;
			},
			limit: () => b,
			update: (payload: Record<string, unknown>) => {
				updatePayload = payload;
				return b;
			},
			maybeSingle: async () => {
				if (table === "app_config") {
					return { data: { value: scenario.flagValue }, error: null };
				}
				if (table === "leases") {
					// Transient lookup blip: return the error so the drainer leaves the
					// row 'claimed' for the reaper (never mistaken for a deleted lease).
					if (scenario.leasesError) {
						return { data: null, error: scenario.leasesError };
					}
					const id = filters.find(([c]) => c === "id")?.[1] as
						| string
						| undefined;
					return { data: id ? (scenario.leases[id] ?? null) : null, error: null };
				}
				if (table === "email_suppressions") {
					return { data: scenario.emailSuppressionError ? null : scenario.emailSuppression, error: scenario.emailSuppressionError };
				}
				if (table === "notification_settings") {
					return { data: scenario.notificationSettingsError ? null : scenario.notificationSettings, error: scenario.notificationSettingsError };
				}
				return { data: null, error: null };
			},
			// Thenable: awaiting an `update().eq()` chain (the delivery-state stamp)
			// resolves here and records the write. Read chains await maybeSingle()
			// directly, so this only ever fires for updates.
			then: (resolve: (v: { data: null; error: null }) => void) => {
				if (updatePayload) {
					calls.updates.push({
						table,
						payload: updatePayload,
						filters: [...filters],
					});
				}
				resolve({ data: null, error: null });
			},
		};
		return b;
	};

	const client = {
		from: (table: string) => builder(table),
		rpc: async (name: string, args: Record<string, unknown>) => {
			calls.rpcs.push({ name, args });
			if (name === "claim_lease_reminders") {
				return { data: scenario.claimed, error: null };
			}
			if (name === "is_notification_suppressed") {
				return { data: scenario.suppressedError ? null : scenario.suppressed, error: scenario.suppressedError };
			}
			if (name === "create_notification") {
				return { data: "notification-1", error: null };
			}
			return { data: null, error: null };
		},
	} as unknown as SupabaseClient;

	return { client, calls };
}

interface ResendCapture {
	idempotencyKeys: Array<string | null>;
	bodies: string[];
}

/** Stub Resend's fetch so sendEmail resolves deterministically without network.
 *  Captures the Idempotency-Key header of each send so the exactly-once anchor
 *  (row.id) can be asserted. */
function withResendStub(
	opts: { ok: boolean },
	fn: (fetchCount: () => number, captured: ResendCapture) => Promise<void>,
): () => Promise<void> {
	return async () => {
		const prevFetch = globalThis.fetch;
		const prevKey = Deno.env.get("RESEND_API_KEY");
		Deno.env.set("RESEND_API_KEY", "test-key");
		let count = 0;
		const captured: ResendCapture = { idempotencyKeys: [], bodies: [] };
		globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
			count++;
			const headers = new Headers(init?.headers);
			captured.idempotencyKeys.push(headers.get("Idempotency-Key"));
			if (init?.body) captured.bodies.push(String(init.body));
			return new Response(JSON.stringify({ id: "email-1" }), {
				status: opts.ok ? 200 : 500,
			});
		}) as typeof fetch;
		try {
			await fn(() => count, captured);
		} finally {
			globalThis.fetch = prevFetch;
			if (prevKey === undefined) Deno.env.delete("RESEND_API_KEY");
			else Deno.env.set("RESEND_API_KEY", prevKey);
		}
	};
}

function makeReq(bearer: string | null): Request {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (bearer !== null) headers["Authorization"] = bearer;
	return new Request(`${APP_URL}/functions/v1/send-lease-reminders`, {
		method: "POST",
		headers,
	});
}

function ownerRow(overrides: Partial<OwnerRow> = {}): OwnerRow {
	return {
		id: "owner-1",
		email: "owner@example.com",
		full_name: "Olivia Owner",
		subscription_status: "active",
		subscription_plan: "growth", // in GROWTH_AND_MAX_PLANS (lookup-key fallback)
		...overrides,
	};
}

function leaseRow(owner: OwnerRow): LeaseJoinRow {
	return {
		id: "lease-1",
		end_date: "2026-08-30",
		owner_user_id: owner.id,
		users: owner,
		units: { properties: { name: "Maple Court" } },
	};
}

function baseScenario(overrides: Partial<Scenario> = {}): Scenario {
	return {
		flagValue: "true",
		claimed: [
			{ id: "reminder-1", lease_id: "lease-1", reminder_type: "30_days", attempt_count: 1 },
		],
		leases: { "lease-1": leaseRow(ownerRow()) },
		suppressed: false,
		emailSuppression: null,
		notificationSettings: null,
		suppressedError: null,
		emailSuppressionError: null,
		notificationSettingsError: null,
		leasesError: null,
		...overrides,
	};
}

function findNotification(calls: FakeCalls) {
	return calls.rpcs.find(
		(r) =>
			r.name === "create_notification" &&
			r.args.p_type === "lease_renewal_reminder",
	);
}

// -----------------------------------------------------------------------------
// Branch matrix
// -----------------------------------------------------------------------------

Deno.test(
	"send-lease-reminders: flag off -> early-return 200, zero sends, no claim",
	withResendStub({ ok: true }, async (fetchCount) => {
		const scenario = baseScenario({ flagValue: "false" });
		const { client, calls } = makeClient(scenario);
		const res = await handleRequest(makeReq(`Bearer ${INVOKE_SECRET}`), {
			createClient: () => client,
		});
		assertEquals(res.status, 200);
		assertEquals(fetchCount(), 0);
		// Nothing below the flag runs: no claim, no in-app notification.
		assert(!calls.rpcs.some((r) => r.name === "claim_lease_reminders"));
		assertEquals(findNotification(calls), undefined);
	}),
);

Deno.test(
	"send-lease-reminders: non-entitled tier -> 0 sends, in-app STILL created (A1)",
	withResendStub({ ok: true }, async (fetchCount) => {
		const owner = ownerRow({ subscription_plan: "starter" }); // not Growth/Max
		const scenario = baseScenario({ leases: { "lease-1": leaseRow(owner) } });
		const { client, calls } = makeClient(scenario);
		await handleRequest(makeReq(`Bearer ${INVOKE_SECRET}`), {
			createClient: () => client,
		});
		assertEquals(fetchCount(), 0);
		assert(findNotification(calls), "in-app notification created for all tiers");
		const stamp = calls.updates.find((u) => u.table === "lease_reminders");
		assertEquals(stamp?.payload.delivery_status, "suppressed");
	}),
);

Deno.test(
	"send-lease-reminders: Growth/Max owner with inactive status (past_due) -> 0 sends, in-app STILL created (A1)",
	withResendStub({ ok: true }, async (fetchCount) => {
		// The tier gate is BOTH halves: ACTIVE_SUB_STATUSES.has(status) AND
		// GROWTH_AND_MAX_PLANS.has(plan). This owner is on the Growth plan but the
		// subscription lapsed (past_due -- outside {active, trialing}), so the paid
		// email must be suppressed. Guards the regression where dropping the status
		// half of the check would let a canceled/past_due paid owner keep receiving
		// the email; the in-app notification (A1) is still created for all tiers.
		const owner = ownerRow({ subscription_status: "past_due" }); // plan stays 'growth'
		const scenario = baseScenario({ leases: { "lease-1": leaseRow(owner) } });
		const { client, calls } = makeClient(scenario);
		await handleRequest(makeReq(`Bearer ${INVOKE_SECRET}`), {
			createClient: () => client,
		});
		assertEquals(fetchCount(), 0);
		assert(findNotification(calls), "in-app notification created for lapsed paid owner");
		const stamp = calls.updates.find((u) => u.table === "lease_reminders");
		assertEquals(stamp?.payload.delivery_status, "suppressed");
	}),
);

Deno.test(
	"send-lease-reminders: is_notification_suppressed=true -> 0 sends, in-app STILL created (A1)",
	withResendStub({ ok: true }, async (fetchCount) => {
		const scenario = baseScenario({ suppressed: true });
		const { client, calls } = makeClient(scenario);
		await handleRequest(makeReq(`Bearer ${INVOKE_SECRET}`), {
			createClient: () => client,
		});
		assertEquals(fetchCount(), 0);
		assert(findNotification(calls), "in-app notification created despite CI-suppression");
		const stamp = calls.updates.find((u) => u.table === "lease_reminders");
		assertEquals(stamp?.payload.delivery_status, "suppressed");
	}),
);

Deno.test(
	"send-lease-reminders: email in email_suppressions -> 0 sends, in-app STILL created (A1)",
	withResendStub({ ok: true }, async (fetchCount) => {
		const scenario = baseScenario({
			emailSuppression: { email: "owner@example.com" },
		});
		const { client, calls } = makeClient(scenario);
		await handleRequest(makeReq(`Bearer ${INVOKE_SECRET}`), {
			createClient: () => client,
		});
		assertEquals(fetchCount(), 0);
		assert(findNotification(calls), "in-app notification created despite bounce suppression");
		const stamp = calls.updates.find((u) => u.table === "lease_reminders");
		assertEquals(stamp?.payload.delivery_status, "suppressed");
	}),
);

Deno.test(
	"send-lease-reminders: notification_settings.leases=false -> 0 sends, in-app STILL created (A1)",
	withResendStub({ ok: true }, async (fetchCount) => {
		const scenario = baseScenario({
			notificationSettings: { email: true, leases: false },
		});
		const { client, calls } = makeClient(scenario);
		await handleRequest(makeReq(`Bearer ${INVOKE_SECRET}`), {
			createClient: () => client,
		});
		assertEquals(fetchCount(), 0);
		assert(findNotification(calls), "in-app notification created despite opt-out");
		const stamp = calls.updates.find((u) => u.table === "lease_reminders");
		assertEquals(stamp?.payload.delivery_status, "suppressed");
	}),
);

// The fail-closed safety property (CR-01/WR-01): if a suppression check cannot
// PROVE the address is safe, the email must not go out. Each of the three DB/RPC
// suppression layers, when it errors, must suppress the EMAIL while the in-app
// notification (A1) is still created upstream.

Deno.test(
	"send-lease-reminders: layer 2 (is_notification_suppressed) ERRORS -> fail closed, 0 sends, in-app STILL created (A1)",
	withResendStub({ ok: true }, async (fetchCount, _captured) => {
		const scenario = baseScenario({
			suppressedError: { message: "permission denied for function is_notification_suppressed" },
		});
		const { client, calls } = makeClient(scenario);
		await handleRequest(makeReq(`Bearer ${INVOKE_SECRET}`), {
			createClient: () => client,
		});
		// Fail closed: an unverifiable suppression state must NOT send.
		assertEquals(fetchCount(), 0);
		// A1 still holds — the notification is created before the email gate.
		assert(findNotification(calls), "in-app notification created despite layer-2 error");
		const stamp = calls.updates.find((u) => u.table === "lease_reminders");
		assertEquals(stamp?.payload.delivery_status, "suppressed");
	}),
);

Deno.test(
	"send-lease-reminders: layer 3 (email_suppressions) ERRORS -> fail closed, 0 sends, in-app STILL created (A1)",
	withResendStub({ ok: true }, async (fetchCount, _captured) => {
		const scenario = baseScenario({
			emailSuppressionError: { message: "email_suppressions read failed" },
		});
		const { client, calls } = makeClient(scenario);
		await handleRequest(makeReq(`Bearer ${INVOKE_SECRET}`), {
			createClient: () => client,
		});
		assertEquals(fetchCount(), 0);
		assert(findNotification(calls), "in-app notification created despite layer-3 error");
		const stamp = calls.updates.find((u) => u.table === "lease_reminders");
		assertEquals(stamp?.payload.delivery_status, "suppressed");
	}),
);

Deno.test(
	"send-lease-reminders: layer 4 (notification_settings) ERRORS -> fail closed, 0 sends, in-app STILL created (A1)",
	withResendStub({ ok: true }, async (fetchCount, _captured) => {
		const scenario = baseScenario({
			notificationSettingsError: { message: "notification_settings read failed" },
		});
		const { client, calls } = makeClient(scenario);
		await handleRequest(makeReq(`Bearer ${INVOKE_SECRET}`), {
			createClient: () => client,
		});
		assertEquals(fetchCount(), 0);
		assert(findNotification(calls), "in-app notification created despite layer-4 error");
		const stamp = calls.updates.find((u) => u.table === "lease_reminders");
		assertEquals(stamp?.payload.delivery_status, "suppressed");
	}),
);

Deno.test(
	"send-lease-reminders: entitled + all clear -> exactly 1 send, Idempotency-Key === row.id, delivery_status='sent'",
	withResendStub({ ok: true }, async (fetchCount, captured) => {
		const scenario = baseScenario();
		const { client, calls } = makeClient(scenario);
		await handleRequest(makeReq(`Bearer ${INVOKE_SECRET}`), {
			createClient: () => client,
		});
		assertEquals(fetchCount(), 1);
		// The Idempotency-Key is the lease_reminders row id (exactly-once anchor).
		assertEquals(captured.idempotencyKeys[0], "reminder-1");
		// F2: inspect the actual Resend request body (subject + escaped HTML).
		const rawBody = captured.bodies[0];
		assert(rawBody, "the Resend send recorded a request body");
		const payload = JSON.parse(rawBody) as { subject: string; html: string };
		// (a) CTA deep-links the ABSOLUTE lease URL (D-04). Guards the exact
		//     regression class: never a relative link and never /leases/undefined.
		assert(
			payload.html.includes(`href="${APP_URL}/leases/lease-1"`),
			"email CTA deep-links the absolute lease URL",
		);
		assert(
			!payload.html.includes("/leases/undefined"),
			"CTA carries the real lease id, not undefined",
		);
		// (b) subject carries the property label + days-remaining.
		assert(payload.subject.includes("Maple Court"), "subject names the property");
		assert(payload.subject.includes("30 days"), "subject states days remaining");
		// In-app notification is still created on the happy path.
		const notification = findNotification(calls);
		assert(notification, "in-app notification created on the send path");
		// F2: the notification targets the app-relative lease URL (the open-redirect
		// guard: never an absolute origin) and carries the lease entity id -- not just
		// the notification_type findNotification already filters on.
		assertEquals(notification?.args.p_action_url, "/leases/lease-1");
		assertEquals(notification?.args.p_entity_id, "lease-1");
		assertEquals(notification?.args.p_entity_type, "lease");
		const stamp = calls.updates.find((u) => u.table === "lease_reminders");
		assertEquals(stamp?.payload.delivery_status, "sent");
		assertEquals(stamp?.payload.resend_message_id, "email-1");
	}),
);

Deno.test(
	"send-lease-reminders: Resend send failure -> delivery_status='failed', in-app STILL created (A1), error captured",
	withResendStub({ ok: false }, async (fetchCount) => {
		const scenario = baseScenario();
		const { client, calls } = makeClient(scenario);
		// Capture console.error so we can assert captureWebhookError fired for the
		// failed send (it logs a structured JSON line via console.error).
		const prevError = console.error;
		const errorLogs: string[] = [];
		console.error = (...args: unknown[]) => {
			errorLogs.push(args.map((a) => String(a)).join(" "));
		};
		try {
			await handleRequest(makeReq(`Bearer ${INVOKE_SECRET}`), {
				createClient: () => client,
			});
		} finally {
			console.error = prevError;
		}
		// The email was attempted exactly once (entitled + all clear) then failed.
		assertEquals(fetchCount(), 1);
		// A1: the in-app notification is created regardless of the send outcome.
		assert(findNotification(calls), "in-app notification created despite send failure");
		// Terminal stamp records the failure (never 'sent').
		const stamp = calls.updates.find((u) => u.table === "lease_reminders");
		assertEquals(stamp?.payload.delivery_status, "failed");
		// captureWebhookError fired for the failed send (action 'send_reminder').
		assert(
			errorLogs.some((line) => line.includes('"action":"send_reminder"')),
			"captureWebhookError logged the send failure",
		);
	}),
);

Deno.test(
	"send-lease-reminders: re-drain of an already-sent row (claim returns nothing) -> 0 sends",
	withResendStub({ ok: true }, async (fetchCount) => {
		// claim_lease_reminders only returns 'pending' rows; a 'sent' row is never
		// re-claimed, so a second drain claims an empty batch and sends nothing.
		const scenario = baseScenario({ claimed: [] });
		const { client, calls } = makeClient(scenario);
		await handleRequest(makeReq(`Bearer ${INVOKE_SECRET}`), {
			createClient: () => client,
		});
		assertEquals(fetchCount(), 0);
		assertEquals(findNotification(calls), undefined);
		assert(calls.rpcs.some((r) => r.name === "claim_lease_reminders"));
	}),
);

Deno.test(
	"send-lease-reminders: multi-row batch — a failed middle row never aborts the batch, sent counts only successes",
	withResendStub({ ok: true }, async (fetchCount) => {
		// Three claimed rows for three different leases/owners. The MIDDLE row's
		// lease is absent from the join map (deleted between queue + drain) -> the
		// genuine not-found branch stamps it 'failed' with no notification/email. The
		// per-row try/catch + the `sent` accumulator must still fully process rows 1
		// and 3 -- this is the only >1-row scenario, so it is the sole exercise of the
		// batch isolation guarantee + the accumulator counting only successes.
		const ownerA = ownerRow({ id: "owner-a", email: "a@example.com" });
		const ownerC = ownerRow({ id: "owner-c", email: "c@example.com" });
		const scenario = baseScenario({
			claimed: [
				{ id: "reminder-a", lease_id: "lease-a", reminder_type: "30_days", attempt_count: 1 },
				{ id: "reminder-b", lease_id: "lease-b", reminder_type: "7_days", attempt_count: 1 },
				{ id: "reminder-c", lease_id: "lease-c", reminder_type: "1_day", attempt_count: 1 },
			],
			leases: {
				"lease-a": { ...leaseRow(ownerA), id: "lease-a" },
				// lease-b intentionally absent -> not-found middle row
				"lease-c": { ...leaseRow(ownerC), id: "lease-c" },
			},
		});
		const { client, calls } = makeClient(scenario);
		const res = await handleRequest(makeReq(`Bearer ${INVOKE_SECRET}`), {
			createClient: () => client,
		});

		// The batch processed all three rows and returned 200 (never aborted).
		assertEquals(res.status, 200);
		const body = (await res.json()) as { processed: number; sent: number };
		assertEquals(body.processed, 3);
		// Only the two good rows sent; the not-found middle row did not.
		assertEquals(body.sent, 2);
		assertEquals(fetchCount(), 2);

		// Rows 1 and 3 each created their in-app notification; the vanished middle
		// lease never did (cannot notify a lease that no longer exists).
		const notifyLeaseIds = calls.rpcs
			.filter((r) => r.name === "create_notification")
			.map((r) => r.args.p_entity_id);
		assert(notifyLeaseIds.includes("lease-a"), "row 1 notified");
		assert(notifyLeaseIds.includes("lease-c"), "row 3 notified");
		assert(!notifyLeaseIds.includes("lease-b"), "not-found row not notified");

		// Terminal stamps: the good rows 'sent', the middle row 'failed'.
		const stampFor = (id: string) =>
			calls.updates.find(
				(u) =>
					u.table === "lease_reminders" &&
					u.filters.some(([c, v]) => c === "id" && v === id),
			);
		assertEquals(stampFor("reminder-a")?.payload.delivery_status, "sent");
		assertEquals(stampFor("reminder-b")?.payload.delivery_status, "failed");
		assertEquals(stampFor("reminder-c")?.payload.delivery_status, "sent");
	}),
);

Deno.test(
	"send-lease-reminders: transient leases-lookup error -> row left 'claimed' (reaper retries), no failed stamp",
	withResendStub({ ok: true }, async (fetchCount) => {
		// A TRANSIENT lookup error (network blip, PostgREST hiccup) must NOT be
		// mistaken for a deleted lease. Stamping 'failed' would drop the reminder
		// permanently (claim_lease_reminders never reclaims 'failed'); instead the
		// drainer leaves the row 'claimed' so the >1h stale-claim reaper (WR-02)
		// retries it on a later drain.
		const scenario = baseScenario({
			leasesError: { message: "leases read timed out" },
		});
		const { client, calls } = makeClient(scenario);
		await handleRequest(makeReq(`Bearer ${INVOKE_SECRET}`), {
			createClient: () => client,
		});
		// No email, no notification: the drainer `continue`s before either.
		assertEquals(fetchCount(), 0);
		assertEquals(findNotification(calls), undefined);
		// Crucially: NO terminal stamp at all -- the row stays 'claimed' (as the claim
		// RPC left it) for the reaper, rather than being marked 'failed'.
		assertEquals(
			calls.updates.find((u) => u.table === "lease_reminders"),
			undefined,
		);
	}),
);

Deno.test(
	"send-lease-reminders: genuine lease-not-found -> delivery_status='failed', no notification/email",
	withResendStub({ ok: true }, async (fetchCount) => {
		// leasesError null + the claimed row's lease absent from the map => the lookup
		// returns { data: null, error: null }: the lease genuinely vanished (deleted
		// between queue + drain). Cannot notify or email, so stamp 'failed' and move on.
		const scenario = baseScenario({ leases: {} });
		const { client, calls } = makeClient(scenario);
		await handleRequest(makeReq(`Bearer ${INVOKE_SECRET}`), {
			createClient: () => client,
		});
		assertEquals(fetchCount(), 0);
		assertEquals(findNotification(calls), undefined);
		const stamp = calls.updates.find((u) => u.table === "lease_reminders");
		assertEquals(stamp?.payload.delivery_status, "failed");
	}),
);

Deno.test(
	"send-lease-reminders: bad Bearer -> 401, zero sends, no claim",
	withResendStub({ ok: true }, async (fetchCount) => {
		const scenario = baseScenario();
		const { client, calls } = makeClient(scenario);
		const res = await handleRequest(makeReq("Bearer wrong-secret"), {
			createClient: () => client,
		});
		assertEquals(res.status, 401);
		assertEquals(fetchCount(), 0);
		assert(!calls.rpcs.some((r) => r.name === "claim_lease_reminders"));
	}),
);

Deno.test(
	"send-lease-reminders: missing Bearer -> 401, zero sends",
	withResendStub({ ok: true }, async (fetchCount) => {
		const scenario = baseScenario();
		const { client } = makeClient(scenario);
		const res = await handleRequest(makeReq(null), {
			createClient: () => client,
		});
		assertEquals(res.status, 401);
		assertEquals(fetchCount(), 0);
	}),
);
