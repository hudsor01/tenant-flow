// Unit tests for the lease-signature edge fn e-sign metering hook (METER-01).
// Pure unit test against a hand-rolled fake SupabaseClient + a stubbed Resend
// fetch — no real network, no `functions serve`, no deploy. Mirrors the
// tests/send-lease-reminders-test.ts conventions (DENO_TEST_NO_SERVE + injected
// createClient dep + Resend-fetch stub + fetchCount primitive).
//
// The hook's contract, one Deno.test per branch:
//   - send + meter allowed=false (Growth over 25) -> 402 with upgrade_url, the
//     lease is NOT flipped to pending_signature, no token issued, no email
//   - send + meter allowed=true (Growth under cap) -> send proceeds: lease flips
//     to pending_signature, a token is inserted, exactly one email is sent
//   - send + meter unlimited=true (Max) -> send proceeds unchanged
//   - resend -> meter_esign_send is NEVER invoked (D-02: resend never meters)
//
// Run: deno test --allow-all --no-check \
//   --import-map=supabase/functions/deno.json \
//   supabase/functions/tests/lease-signature-metering-test.ts

import { assert, assertEquals } from "jsr:@std/assert@1";
import type { SupabaseClient } from "@supabase/supabase-js";

// The handler registers Deno.serve() as a module side-effect (like every edge fn
// in this repo). Setting DENO_TEST_NO_SERVE=1 before importing suppresses that
// server bind so the unit test can drive handleRequest() directly with a fake
// Request. validateEnv() caches on first call, so seed every required var first.
// UPSTASH_* is intentionally left unset so rateLimit() fails open (returns null).
Deno.env.set("DENO_TEST_NO_SERVE", "1");
Deno.env.set("SUPABASE_URL", "http://localhost");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
Deno.env.set("NEXT_PUBLIC_APP_URL", "https://app.tenantflow.app");
Deno.env.set("RESEND_API_KEY", "test-key");

const { handleRequest } = await import("../lease-signature/index.ts");

const APP_URL = "https://app.tenantflow.app";
const OWNER_ID = "owner-1";
const LEASE_ID = "lease-1";

interface MeterRow {
	allowed: boolean;
	used: number | null;
	cap: number;
	unlimited: boolean;
}

interface Scenario {
	/** meter_esign_send RPC result row (or null to model the empty-array case). */
	meter: MeterRow | null;
	/** Injected error for the meter_esign_send RPC. */
	meterError: { message: string } | null;
	/** lease_status returned by loadOwnedLease + fetchLeaseSigningData. */
	leaseStatus: string;
	/** users.subscription_status for the send tier gate. */
	ownerStatus: string;
	/** users.subscription_plan for the send tier gate. */
	ownerPlan: string;
	/** tenants.email for fetchLeaseSigningData (must pass EMAIL_RE for send). */
	tenantEmail: string;
}

function baseScenario(overrides: Partial<Scenario> = {}): Scenario {
	return {
		meter: { allowed: true, used: 5, cap: 25, unlimited: false },
		meterError: null,
		leaseStatus: "draft",
		ownerStatus: "active",
		ownerPlan: "growth", // entitled (GROWTH_AND_MAX_PLANS lookup-key fallback)
		tenantEmail: "tenant@example.com",
		...overrides,
	};
}

interface FakeCalls {
	rpcs: Array<{ name: string; args: Record<string, unknown> }>;
	/** every `leases` update payload (the pending_signature flip is asserted). */
	leaseUpdates: Array<Record<string, unknown>>;
	/** every `lease_signing_tokens` insert payload (a real send issues one). */
	tokenInserts: Array<Record<string, unknown>>;
}

/** The big fetchLeaseSigningData select row — only the fields the send path reads
 *  need to be present; tenants.email drives the EMAIL_RE guard. */
function fullLeaseRow(scenario: Scenario): Record<string, unknown> {
	return {
		id: LEASE_ID,
		owner_user_id: OWNER_ID,
		primary_tenant_id: "tenant-1",
		unit_id: "unit-1",
		start_date: "2026-01-01",
		end_date: "2026-12-31",
		rent_amount: 1500,
		security_deposit: 1500,
		governing_state: "TX",
		landlord_notice_address: "1 St",
		immediate_family_members: null,
		lease_status: scenario.leaseStatus,
		signed_document_path: null,
		owner_signed_at: null,
		owner_signature_ip: null,
		owner_signature_user_agent: null,
		owner_signature_method: null,
		tenant_signed_at: null,
		tenant_signature_ip: null,
		tenant_signature_user_agent: null,
		tenant_signature_method: null,
		tenant_signature_name: null,
		units: {
			unit_number: "1",
			properties: {
				name: "Prop",
				address_line1: "1 St",
				city: "Town",
				state: "TX",
				postal_code: "75001",
			},
		},
		tenants: {
			first_name: "Jane",
			last_name: "Tenant",
			name: "Jane Tenant",
			email: scenario.tenantEmail,
		},
	};
}

function resolveRead(
	table: string,
	selectArg: string,
	scenario: Scenario,
): { data: unknown; error: unknown } {
	if (table === "users") {
		// checkTierEntitlement reads subscription_status/subscription_plan.
		if (selectArg.includes("subscription_status")) {
			return {
				data: {
					subscription_status: scenario.ownerStatus,
					subscription_plan: scenario.ownerPlan,
				},
				error: null,
			};
		}
		// fetchLeaseSigningData owner lookup (full_name, email).
		return { data: { full_name: "Olivia Owner", email: "o@x.com" }, error: null };
	}
	if (table === "leases") {
		// fetchLeaseSigningData uses the wide select (contains primary_tenant_id);
		// loadOwnedLease uses the narrow "id, owner_user_id, lease_status".
		if (selectArg.includes("primary_tenant_id")) {
			return { data: fullLeaseRow(scenario), error: null };
		}
		return {
			data: {
				id: LEASE_ID,
				owner_user_id: OWNER_ID,
				lease_status: scenario.leaseStatus,
			},
			error: null,
		};
	}
	return { data: null, error: null };
}

/** Fake client: records every rpc + the leases-update / token-insert payloads so
 *  the metering assertions can inspect them. Reads resolve via resolveRead(); the
 *  update/insert chains resolve through the thenable. */
function makeClient(scenario: Scenario): {
	client: SupabaseClient;
	calls: FakeCalls;
} {
	const calls: FakeCalls = { rpcs: [], leaseUpdates: [], tokenInserts: [] };

	const builder = (table: string) => {
		let selectArg = "";
		let updatePayload: Record<string, unknown> | null = null;
		let insertPayload: Record<string, unknown> | null = null;
		const b: Record<string, unknown> = {
			select: (arg?: unknown) => {
				selectArg = typeof arg === "string" ? arg : "";
				return b;
			},
			eq: () => b,
			is: () => b,
			update: (payload: Record<string, unknown>) => {
				updatePayload = payload;
				return b;
			},
			insert: (payload: Record<string, unknown>) => {
				insertPayload = payload;
				return b;
			},
			single: async () => resolveRead(table, selectArg, scenario),
			maybeSingle: async () => resolveRead(table, selectArg, scenario),
			// Thenable: awaiting an update/insert chain resolves here + records the
			// write. Read chains await single()/maybeSingle() directly, so this only
			// ever fires for writes.
			then: (resolve: (v: { data: null; error: null }) => void) => {
				if (table === "leases" && updatePayload) {
					calls.leaseUpdates.push(updatePayload);
				}
				if (table === "lease_signing_tokens" && insertPayload) {
					calls.tokenInserts.push(insertPayload);
				}
				resolve({ data: null, error: null });
			},
		};
		return b;
	};

	const client = {
		auth: {
			getUser: async (_token: string) => ({
				data: { user: { id: OWNER_ID } },
				error: null,
			}),
		},
		from: (table: string) => builder(table),
		rpc: async (name: string, args: Record<string, unknown>) => {
			calls.rpcs.push({ name, args });
			if (name === "meter_esign_send") {
				return {
					data: scenario.meter ? [scenario.meter] : [],
					error: scenario.meterError,
				};
			}
			return { data: null, error: null };
		},
	} as unknown as SupabaseClient;

	return { client, calls };
}

/** Stub Resend's fetch so sendEmail resolves deterministically without network. */
function withResendStub(
	opts: { ok: boolean },
	fn: (fetchCount: () => number) => Promise<void>,
): () => Promise<void> {
	return async () => {
		const prevFetch = globalThis.fetch;
		const prevKey = Deno.env.get("RESEND_API_KEY");
		Deno.env.set("RESEND_API_KEY", "test-key");
		let count = 0;
		globalThis.fetch = (async () => {
			count++;
			return new Response(JSON.stringify({ id: "email-1" }), {
				status: opts.ok ? 200 : 500,
			});
		}) as typeof fetch;
		try {
			await fn(() => count);
		} finally {
			globalThis.fetch = prevFetch;
			if (prevKey === undefined) Deno.env.delete("RESEND_API_KEY");
			else Deno.env.set("RESEND_API_KEY", prevKey);
		}
	};
}

function makeReq(
	action: string,
	extra: Record<string, unknown> = {},
): Request {
	return new Request(`${APP_URL}/functions/v1/lease-signature`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: "Bearer test-token",
		},
		body: JSON.stringify({ action, leaseId: LEASE_ID, ...extra }),
	});
}

const SEND_EXTRA = {
	missingFields: {
		landlord_notice_address: "1 Notice St",
		immediate_family_members: "",
	},
};

// -----------------------------------------------------------------------------
// Branch matrix
// -----------------------------------------------------------------------------

function meterCall(calls: FakeCalls) {
	return calls.rpcs.find((r) => r.name === "meter_esign_send");
}

Deno.test(
	"lease-signature send: over-cap meter (allowed=false) -> 402 upgrade_url, NO pending_signature flip, no token/email",
	withResendStub({ ok: true }, async (fetchCount) => {
		const scenario = baseScenario({
			meter: { allowed: false, used: 25, cap: 25, unlimited: false },
		});
		const { client, calls } = makeClient(scenario);
		const res = await handleRequest(makeReq("send", SEND_EXTRA), {
			createClient: () => client,
		});

		// 402 carrying the actionable upgrade payload.
		assertEquals(res.status, 402);
		const body = (await res.json()) as {
			upgrade_required?: boolean;
			upgrade_url?: string;
		};
		assertEquals(body.upgrade_required, true);
		assertEquals(body.upgrade_url, "/billing/plans?source=esign_quota");

		// The meter WAS consulted, keyed to the validated owner + lease.
		const meter = meterCall(calls);
		assert(meter, "meter_esign_send was called on send");
		assertEquals(meter?.args.p_owner, OWNER_ID);
		assertEquals(meter?.args.p_lease, LEASE_ID);

		// NO lease state change: a blocked send never flips draft -> pending_signature.
		assert(
			!calls.leaseUpdates.some((u) => u.lease_status === "pending_signature"),
			"blocked send must not flip the lease to pending_signature",
		);
		// No token issued, no email sent.
		assertEquals(calls.tokenInserts.length, 0);
		assertEquals(fetchCount(), 0);
	}),
);

Deno.test(
	"lease-signature send: under-cap meter (allowed=true) -> send proceeds, lease flips to pending_signature, one email",
	withResendStub({ ok: true }, async (fetchCount) => {
		const scenario = baseScenario({
			meter: { allowed: true, used: 5, cap: 25, unlimited: false },
		});
		const { client, calls } = makeClient(scenario);
		const res = await handleRequest(makeReq("send", SEND_EXTRA), {
			createClient: () => client,
		});

		assertEquals(res.status, 200);
		assert(meterCall(calls), "meter_esign_send was called on send");
		// The reservation passed, so the lease flips + a token is issued + one email.
		assert(
			calls.leaseUpdates.some((u) => u.lease_status === "pending_signature"),
			"allowed send flips the lease to pending_signature",
		);
		assertEquals(calls.tokenInserts.length, 1);
		assertEquals(fetchCount(), 1);
	}),
);

Deno.test(
	"lease-signature send: Max owner (unlimited=true) -> never blocked, send proceeds",
	withResendStub({ ok: true }, async (fetchCount) => {
		const scenario = baseScenario({
			ownerPlan: "max",
			meter: { allowed: true, used: null, cap: 25, unlimited: true },
		});
		const { client, calls } = makeClient(scenario);
		const res = await handleRequest(makeReq("send", SEND_EXTRA), {
			createClient: () => client,
		});

		assertEquals(res.status, 200);
		assert(meterCall(calls), "meter_esign_send is called for Max (records usage)");
		assert(
			calls.leaseUpdates.some((u) => u.lease_status === "pending_signature"),
			"Max send is never blocked by metering",
		);
		assertEquals(fetchCount(), 1);
	}),
);

Deno.test(
	"lease-signature send: meter RPC error -> 500, no pending_signature flip",
	withResendStub({ ok: true }, async (fetchCount) => {
		const scenario = baseScenario({
			meter: null,
			meterError: { message: "permission denied for function meter_esign_send" },
		});
		const { client, calls } = makeClient(scenario);
		const res = await handleRequest(makeReq("send", SEND_EXTRA), {
			createClient: () => client,
		});

		// RPC errors route through errorResponse (generic body, never raw message).
		assertEquals(res.status, 500);
		const body = (await res.json()) as { error?: string };
		assertEquals(body.error, "An error occurred");
		assert(meterCall(calls), "meter_esign_send was attempted");
		assert(
			!calls.leaseUpdates.some((u) => u.lease_status === "pending_signature"),
			"a meter error must not flip the lease to pending_signature",
		);
		assertEquals(fetchCount(), 0);
	}),
);

Deno.test(
	"lease-signature resend: NEVER meters (D-02), still emails",
	withResendStub({ ok: true }, async (fetchCount) => {
		// resend requires the lease to already be pending_signature.
		const scenario = baseScenario({ leaseStatus: "pending_signature" });
		const { client, calls } = makeClient(scenario);
		const res = await handleRequest(makeReq("resend", { message: "" }), {
			createClient: () => client,
		});

		assertEquals(res.status, 200);
		// The load-bearing D-02 assertion: resend consumes no metering slot.
		assertEquals(
			meterCall(calls),
			undefined,
			"resend must never invoke meter_esign_send",
		);
		// resend still issues a fresh token + one email (its normal behavior).
		assertEquals(calls.tokenInserts.length, 1);
		assertEquals(fetchCount(), 1);
	}),
);
