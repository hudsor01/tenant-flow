// Unit tests for finalizeSignedLease (supabase/functions/_shared/lease-signing.ts).
// Pure unit test against a hand-rolled fake SupabaseClient — no network, no
// `functions serve`, no deploy. Covers the branches the deploy-gated integration
// test cannot re-exercise: the precondition guard, the best-effort upload-error
// path, and the idempotent pointer write (`.is('signed_document_path', null)`).
//
// Run: deno test --allow-all --no-check \
//   --import-map=supabase/functions/deno.json \
//   supabase/functions/tests/lease-signing-test.ts

import { assert, assertEquals } from "jsr:@std/assert@1";
import type { SupabaseClient } from "@supabase/supabase-js";
import { finalizeSignedLease } from "../_shared/lease-signing.ts";

interface LeaseRowOverrides {
	owner_signed_at?: string | null;
	tenant_signed_at?: string | null;
	signed_document_path?: string | null;
}

function leaseRow(overrides: LeaseRowOverrides) {
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
		lease_status: "pending_signature",
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
		tenants: { first_name: "Jane", last_name: "Tenant", name: "Jane Tenant", email: "t@x.com" },
		...overrides,
	};
}

interface FakeCalls {
	uploads: Array<{ path: string }>;
	updates: Array<{ payload: Record<string, unknown>; is?: [string, unknown] }>;
}

function makeClient(opts: {
	row: ReturnType<typeof leaseRow>;
	uploadError?: { message: string } | null;
}): { client: SupabaseClient; calls: FakeCalls } {
	const calls: FakeCalls = { uploads: [], updates: [] };

	const builder = (table: string) => {
		let pendingUpdate: { payload: Record<string, unknown>; is?: [string, unknown] } | null =
			null;
		const b: Record<string, unknown> = {
			select: () => b,
			eq: () => b,
			is: (col: string, val: unknown) => {
				if (pendingUpdate) pendingUpdate.is = [col, val];
				return b;
			},
			update: (payload: Record<string, unknown>) => {
				pendingUpdate = { payload };
				calls.updates.push(pendingUpdate);
				return b;
			},
			maybeSingle: async () => {
				if (table === "leases") return { data: opts.row, error: null };
				if (table === "users")
					return { data: { full_name: "Owner", email: "o@x.com" }, error: null };
				return { data: null, error: null };
			},
			// Thenable so `await ...update().eq().is()` resolves on the write path.
			then: (resolve: (v: { error: null }) => void) => resolve({ error: null }),
		};
		return b;
	};

	const client = {
		from: (table: string) => builder(table),
		storage: {
			from: () => ({
				upload: async (path: string) => {
					calls.uploads.push({ path });
					return { error: opts.uploadError ?? null };
				},
			}),
		},
	} as unknown as SupabaseClient;

	return { client, calls };
}

Deno.test("finalizeSignedLease: no-op when only one party has signed", async () => {
	const { client, calls } = makeClient({
		row: leaseRow({ tenant_signed_at: null }),
	});
	await finalizeSignedLease(client, "lease-1");
	assertEquals(calls.uploads.length, 0);
	assertEquals(calls.updates.length, 0);
});

Deno.test("finalizeSignedLease: no-op when a signed document already exists", async () => {
	const { client, calls } = makeClient({
		row: leaseRow({ signed_document_path: "lease/lease-1/signed-lease.pdf" }),
	});
	await finalizeSignedLease(client, "lease-1");
	assertEquals(calls.uploads.length, 0);
	assertEquals(calls.updates.length, 0);
});

Deno.test("finalizeSignedLease: upload error does not write the pointer (best-effort)", async () => {
	const { client, calls } = makeClient({
		row: leaseRow({}),
		uploadError: { message: "boom" },
	});
	await finalizeSignedLease(client, "lease-1");
	assertEquals(calls.uploads.length, 1);
	assertEquals(calls.updates.length, 0);
});

Deno.test("finalizeSignedLease: happy path uploads + writes the pointer idempotently", async () => {
	const { client, calls } = makeClient({ row: leaseRow({}) });
	await finalizeSignedLease(client, "lease-1");
	assertEquals(calls.uploads.length, 1);
	assertEquals(calls.uploads[0].path, "lease/lease-1/signed-lease.pdf");
	assertEquals(calls.updates.length, 1);
	const update = calls.updates[0];
	assertEquals(update.payload.signed_document_path, "lease/lease-1/signed-lease.pdf");
	assert(typeof update.payload.signed_document_hash === "string");
	// Idempotency guard: the write is conditional on the pointer still being null.
	assertEquals(update.is, ["signed_document_path", null]);
});
