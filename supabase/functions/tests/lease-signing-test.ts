// Unit tests for finalizeSignedLease (supabase/functions/_shared/lease-signing.ts).
// Pure unit test against a hand-rolled STATEFUL fake SupabaseClient + a stubbed
// Resend fetch — no real network, no `functions serve`, no deploy. Covers the two
// idempotent steps of the restructured finalize spine (SIGN-01/02):
//   1. ensure-PDF   — render -> upload -> pointer write (guarded, once)
//   2. ensure-email — claim-guarded one-time tenant email of the executed PDF,
//                     with claim-release-on-failure so a later retry re-sends.
//
// Run: deno test --allow-all --no-check \
//   --import-map=supabase/functions/deno.json \
//   supabase/functions/tests/lease-signing-test.ts

import { assert, assertEquals } from "jsr:@std/assert@1";
import type { SupabaseClient } from "@supabase/supabase-js";
import { finalizeSignedLease, formatMoney } from "../_shared/lease-signing.ts";

interface LeaseRowState {
	id: string;
	owner_user_id: string;
	primary_tenant_id: string;
	unit_id: string;
	start_date: string;
	end_date: string;
	rent_amount: number;
	security_deposit: number;
	governing_state: string | null;
	landlord_notice_address: string | null;
	immediate_family_members: string | null;
	lease_status: string;
	owner_signed_at: string | null;
	owner_signature_ip: string | null;
	owner_signature_user_agent: string | null;
	owner_signature_method: string | null;
	tenant_signed_at: string | null;
	tenant_signature_ip: string | null;
	tenant_signature_user_agent: string | null;
	tenant_signature_method: string | null;
	tenant_signature_name: string | null;
	signed_document_path: string | null;
	signed_document_hash: string | null;
	signed_lease_emailed_at: string | null;
	units: unknown;
	tenants: unknown;
	[key: string]: unknown;
}

function leaseRow(overrides: Partial<LeaseRowState> = {}): LeaseRowState {
	return {
		id: "lease-1",
		owner_user_id: "owner-1",
		primary_tenant_id: "tenant-1",
		unit_id: "unit-1",
		start_date: "2026-01-01",
		end_date: "2026-12-31",
		rent_amount: 1500,
		security_deposit: 1500,
		governing_state: "TX",
		landlord_notice_address: "1 St",
		immediate_family_members: null,
		lease_status: "active",
		owner_signed_at: "2026-01-01T00:00:00Z",
		owner_signature_ip: "1.1.1.1",
		owner_signature_user_agent: "ua",
		owner_signature_method: "in_app",
		tenant_signed_at: "2026-01-02T00:00:00Z",
		tenant_signature_ip: "2.2.2.2",
		tenant_signature_user_agent: "ua",
		tenant_signature_method: "in_app",
		tenant_signature_name: "Jane Tenant",
		signed_document_path: null,
		signed_document_hash: null,
		signed_lease_emailed_at: null,
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
			email: "t@x.com",
		},
		...overrides,
	};
}

interface UpdateCall {
	payload: Record<string, unknown>;
	is: Array<[string, unknown]>;
	applied: boolean;
}

interface FakeCalls {
	uploads: Array<{ path: string }>;
	downloads: Array<{ path: string }>;
	updates: UpdateCall[];
	rpcs: Array<{ name: string; args: Record<string, unknown> }>;
}

/** Stateful fake client: updates mutate the live row (subject to `.is()` guards),
 *  so a second finalize observes the first's writes (idempotency). */
function makeClient(row: LeaseRowState): {
	client: SupabaseClient;
	calls: FakeCalls;
	state: { row: LeaseRowState };
} {
	const state = { row };
	const calls: FakeCalls = {
		uploads: [],
		downloads: [],
		updates: [],
		rpcs: [],
	};

	const builder = (table: string) => {
		let currentUpdate: UpdateCall | null = null;
		const b: Record<string, unknown> = {
			select: () => b,
			eq: () => b,
			is: (col: string, val: unknown) => {
				if (currentUpdate) currentUpdate.is.push([col, val]);
				return b;
			},
			update: (payload: Record<string, unknown>) => {
				currentUpdate = { payload, is: [], applied: false };
				calls.updates.push(currentUpdate);
				return b;
			},
			maybeSingle: async () => {
				if (table === "leases") return { data: state.row, error: null };
				if (table === "users")
					return {
						data: { full_name: "Owner", email: "o@x.com" },
						error: null,
					};
				return { data: null, error: null };
			},
			// Thenable: awaiting an `update().eq().is()[.select()]` chain resolves
			// here. Apply the write only when every `.is()` guard matches the live
			// row, then return the claimed rows (for `.select('id')` claims).
			then: (resolve: (v: { data: unknown[]; error: null }) => void) => {
				const u = currentUpdate;
				if (u && !u.applied) {
					u.applied = true;
					const guardsOk = u.is.every(([c, v]) => state.row[c] === v);
					if (guardsOk) Object.assign(state.row, u.payload);
					resolve({ data: guardsOk ? [{ id: state.row.id }] : [], error: null });
				} else {
					resolve({ data: [], error: null });
				}
			},
		};
		return b;
	};

	const client = {
		from: (table: string) => builder(table),
		// Records every create_notification call so the finalize-failed notification
		// (NOTIF-04, lease_finalize_failed) can be asserted on the failure branches.
		rpc: async (name: string, args: Record<string, unknown>) => {
			calls.rpcs.push({ name, args });
			return { data: null, error: null };
		},
		storage: {
			from: () => ({
				upload: async (path: string) => {
					calls.uploads.push({ path });
					return { error: null };
				},
				download: async (path: string) => {
					calls.downloads.push({ path });
					return {
						data: new Blob([new Uint8Array([1, 2, 3])]),
						error: null,
					};
				},
			}),
		},
	} as unknown as SupabaseClient;

	return { client, calls, state };
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

Deno.test("formatMoney: a single trailing decimal renders with two fraction digits", () => {
	assertEquals(formatMoney(1500.5), "$1,500.50");
});

Deno.test("formatMoney: a whole-dollar amount renders with .00", () => {
	assertEquals(formatMoney(1500), "$1,500.00");
});

Deno.test("formatMoney: null and empty string fall back to N/A", () => {
	assertEquals(formatMoney(null), "N/A");
	assertEquals(formatMoney(""), "N/A");
});

Deno.test("finalizeSignedLease: no-op when only one party has signed", async () => {
	const { client, calls } = makeClient(leaseRow({ tenant_signed_at: null }));
	await finalizeSignedLease(client, "lease-1");
	assertEquals(calls.uploads.length, 0);
	assertEquals(calls.updates.length, 0);
});

Deno.test(
	"finalizeSignedLease: fully finalized (PDF + emailed) is a no-op",
	withResendStub({ ok: true }, async (fetchCount) => {
		const { client, calls } = makeClient(
			leaseRow({
				signed_document_path: "lease/lease-1/signed-lease.pdf",
				signed_lease_emailed_at: "2026-01-03T00:00:00Z",
			}),
		);
		await finalizeSignedLease(client, "lease-1");
		assertEquals(calls.uploads.length, 0);
		// The claim update runs but matches no row (already emailed) — no email.
		assertEquals(fetchCount(), 0);
	}),
);

Deno.test(
	"finalizeSignedLease: upload error writes no pointer and sends no email",
	withResendStub({ ok: true }, async (fetchCount) => {
		const row = leaseRow({});
		const { client, calls, state } = makeClient(row);
		// Force the upload to fail.
		(client.storage.from as unknown) = () => ({
			upload: async () => ({ error: { message: "boom" } }),
			download: async () => ({ data: null, error: { message: "no" } }),
		});
		await finalizeSignedLease(client, "lease-1");
		assertEquals(state.row.signed_document_path, null);
		assertEquals(fetchCount(), 0);
		assertEquals(calls.uploads.length, 0); // replaced storage stub records nothing
	}),
);

Deno.test(
	"finalizeSignedLease: happy path renders, writes the pointer, emails once",
	withResendStub({ ok: true }, async (fetchCount) => {
		const { client, calls, state } = makeClient(leaseRow({}));
		await finalizeSignedLease(client, "lease-1");

		assertEquals(calls.uploads.length, 1);
		assertEquals(calls.uploads[0].path, "lease/lease-1/signed-lease.pdf");
		assertEquals(state.row.signed_document_path, "lease/lease-1/signed-lease.pdf");
		assert(typeof state.row.signed_document_hash === "string");
		// Exactly one email (attachment reused from the freshly-rendered buffer, so
		// no storage download on the first pass).
		assertEquals(fetchCount(), 1);
		assertEquals(calls.downloads.length, 0);
		assert(typeof state.row.signed_lease_emailed_at === "string");
		// Pointer write is guarded on the pointer still being null (idempotency).
		const pointerWrite = calls.updates.find(
			(u) => u.payload.signed_document_path === "lease/lease-1/signed-lease.pdf",
		);
		assert(pointerWrite);
		assert(
			pointerWrite.is.some(([c, v]) => c === "signed_document_path" && v === null),
		);
	}),
);

Deno.test(
	"finalizeSignedLease: a second finalize does not re-render or re-email",
	withResendStub({ ok: true }, async (fetchCount) => {
		const { client, calls, state } = makeClient(leaseRow({}));
		await finalizeSignedLease(client, "lease-1"); // first: renders + emails
		await finalizeSignedLease(client, "lease-1"); // second: no-op

		assertEquals(calls.uploads.length, 1); // no second render/upload
		assertEquals(fetchCount(), 1); // no second email
		assert(typeof state.row.signed_lease_emailed_at === "string");
	}),
);

Deno.test(
	"finalizeSignedLease: PDF exists but email not yet sent re-sends from storage",
	withResendStub({ ok: true }, async (fetchCount) => {
		const { client, calls, state } = makeClient(
			leaseRow({ signed_document_path: "lease/lease-1/signed-lease.pdf" }),
		);
		await finalizeSignedLease(client, "lease-1");

		assertEquals(calls.uploads.length, 0); // PDF already exists — no re-render
		assertEquals(calls.downloads.length, 1); // pulled the stored PDF to attach
		assertEquals(fetchCount(), 1); // emailed once
		assert(typeof state.row.signed_lease_emailed_at === "string");
	}),
);

Deno.test(
	"finalizeSignedLease: a failed email releases the claim so a retry re-sends",
	async () => {
		// First finalize with a FAILING Resend stub: the claim must be released.
		const { client, state } = makeClient(leaseRow({}));
		await withResendStub({ ok: false }, async (fetchCount) => {
			await finalizeSignedLease(client, "lease-1");
			assertEquals(fetchCount(), 1); // attempted once
			// Claim released back to null so a later retry can re-attempt.
			assertEquals(state.row.signed_lease_emailed_at, null);
		})();

		// Second finalize with a SUCCEEDING stub re-sends and sticks the claim.
		await withResendStub({ ok: true }, async (fetchCount) => {
			await finalizeSignedLease(client, "lease-1");
			assertEquals(fetchCount(), 1);
			assert(typeof state.row.signed_lease_emailed_at === "string");
		})();
	},
);

// -----------------------------------------------------------------------------
// notifyFinalizeFailed (NOTIF-04) — every finalize failure exit publishes a
// single lease_finalize_failed "Lease signing needs attention" notification for
// the owner via the service_role create_notification RPC. Assert two branches:
// the upload-error exit (finalizeSignedLease) and the email-failure exit
// (ensureSignedLeaseEmail).
// -----------------------------------------------------------------------------

Deno.test(
	"finalizeSignedLease: an upload error notifies the owner (lease_finalize_failed)",
	withResendStub({ ok: true }, async () => {
		const { client, calls } = makeClient(leaseRow({}));
		// Force the upload to fail (drives the inline uploadError exit).
		(client.storage.from as unknown) = () => ({
			upload: async () => ({ error: { message: "boom" } }),
			download: async () => ({ data: null, error: { message: "no" } }),
		});
		await finalizeSignedLease(client, "lease-1");

		const failNotice = calls.rpcs.find(
			(r) =>
				r.name === "create_notification" &&
				r.args.p_type === "lease_finalize_failed",
		);
		assert(failNotice, "expected a lease_finalize_failed notification");
		assertEquals(failNotice.args.p_title, "Lease signing needs attention");
		assertEquals(failNotice.args.p_entity_type, "lease");
		assertEquals(failNotice.args.p_action_url, "/leases/lease-1");
	}),
);

Deno.test(
	"finalizeSignedLease: a failed email notifies the owner (lease_finalize_failed)",
	async () => {
		const { client, calls } = makeClient(leaseRow({}));
		await withResendStub({ ok: false }, async (fetchCount) => {
			await finalizeSignedLease(client, "lease-1");
			assertEquals(fetchCount(), 1); // email attempted once, then failed
		})();

		const failNotice = calls.rpcs.find(
			(r) =>
				r.name === "create_notification" &&
				r.args.p_type === "lease_finalize_failed",
		);
		assert(failNotice, "expected a lease_finalize_failed notification");
		assertEquals(failNotice.args.p_title, "Lease signing needs attention");
		assertEquals(failNotice.args.p_action_url, "/leases/lease-1");
	},
);
