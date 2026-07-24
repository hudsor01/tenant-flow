/**
 * Storage metering (METER-03) integration tests — dual-client vs prod.
 *
 * Proves the storage_quota_functions data layer:
 *   - get_storage_usage_summary() sums (metadata->>'size')::bigint across the
 *     owner-attributable buckets (here: avatars via path[1]=uid, and
 *     tenant-documents via the property branch join) — SUM correctness.
 *   - System / ephemeral buckets (bulk-imports, blog-covers, lease-documents) are
 *     never counted (the SUM's bucket allowlist excludes them).
 *   - Cross-owner attribution isolation: owner B's objects never count toward A.
 *   - Privilege boundary (T-54-09): the raw get_owner_storage_usage /
 *     get_owner_storage_limit_gb functions are service_role-only — an
 *     authenticated owner cannot call them to probe usage. Only the param-less,
 *     owner-guarded get_storage_usage_summary() is authenticated-callable.
 *
 * Runs against REAL prod Supabase under dual-client auth (synthetic owners
 * e2e-owner-a/b). Sequential. Requires the 20260723130000_storage_quota_functions
 * migration applied to prod (DEFERRED to the orchestrator; until applied the RPC
 * calls fail — the intended "not live yet" signal). This file is EXTENDED by
 * Plan 04 with the METER-04 upload-enforcement / grandfather / max / service_role
 * matrix; the METER-03 cases below are self-contained and clean up their rows.
 *
 * Note on null-size rows: (metadata->>'size') is NULL for in-flight uploads and
 * is skipped by the coalesce(sum(...),0) SUM — a byte-exact delta below implies
 * no phantom/null inflation. A null-size row cannot be deterministically seeded
 * via the authenticated Storage API (Storage finalizes metadata before .upload()
 * resolves), so that skip is asserted at the SQL level, not fabricated here.
 *
 * Note on the finite-limit branches (Trial 1 / Starter 10 / Growth 50): the
 * synthetic owners are pinned subscription_plan='max' (-1) and
 * `update on public.users` is REVOKED from authenticated
 * (20260507190024_lock_privileged_user_columns_and_p0_security), so the plan
 * cannot be flipped from within this dual-client suite. The finite CASE branches
 * live in get_owner_storage_limit_gb and are exercised by Plan 04's enforcement
 * matrix with a dedicated limited-plan owner. Here we assert the max branch (-1).
 *
 * chai-6 note: RPC failures surface in the returned { data, error } shape (not
 * thrown), so revoked-EXECUTE is asserted via error.code — no
 * `.rejects.toThrow('string')` (which crashes under vitest 4 + chai 6).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";
import { REVOKED_CODES } from "./_helpers/revoked-codes";

// Deterministic payloads — object byte size equals the payload length, so the
// expected usage delta is computable up front.
const PNG_BYTES = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
	"base64",
);
const PDF_BYTES = new TextEncoder().encode("%PDF-1.4\n%%EOF");
const AVATAR_SIZE = PNG_BYTES.length;
const PDF_SIZE = PDF_BYTES.length;

function pngBlob(): Blob {
	return new Blob([PNG_BYTES], { type: "image/png" });
}
function pdfBlob(): Blob {
	return new Blob([PDF_BYTES], { type: "application/pdf" });
}

interface UploadedPaths {
	avatars: string[];
	tenantDocuments: string[];
	bulkImports: string[];
}
function emptyUploaded(): UploadedPaths {
	return { avatars: [], tenantDocuments: [], bulkImports: [] };
}

async function createProperty(
	client: SupabaseClient,
	ownerId: string,
	label: string,
): Promise<{ id: string } | null> {
	const { data } = await client
		.from("properties")
		.insert({
			name: `METER-03 ${label} Property`,
			address_line1: "1 Metering St",
			city: "Testville",
			state: "CA",
			postal_code: "94105",
			country: "US",
			property_type: "APARTMENT",
			owner_user_id: ownerId,
		})
		.select("id")
		.single();
	return data ? { id: data.id } : null;
}

async function readUsage(
	client: SupabaseClient,
): Promise<{ usedBytes: number; limitGb: number }> {
	const { data, error } = await client.rpc("get_storage_usage_summary");
	expect(error).toBeNull();
	const row = Array.isArray(data) ? data[0] : data;
	return {
		usedBytes: Number(row?.used_bytes ?? 0),
		limitGb: Number(row?.limit_gb ?? 0),
	};
}

// Poll for the expected usage delta to absorb any metadata-finalize lag; returns
// the last observed delta so the caller asserts equality (a timeout still fails).
async function waitForUsageDelta(
	client: SupabaseClient,
	baseline: number,
	expected: number,
): Promise<number> {
	let last = 0;
	for (let attempt = 0; attempt < 10; attempt++) {
		const { usedBytes } = await readUsage(client);
		last = usedBytes - baseline;
		if (last === expected) return last;
		await new Promise((resolve) => setTimeout(resolve, 200));
	}
	return last;
}

describe("Storage metering (METER-03) — usage SUM + attribution", () => {
	let clientA: SupabaseClient;
	let clientB: SupabaseClient;
	let ownerAId: string;
	let ownerBId: string;
	let propertyA: { id: string } | null = null;
	let propertyB: { id: string } | null = null;
	const uploadedA = emptyUploaded();
	const uploadedB = emptyUploaded();

	beforeAll(async () => {
		const { ownerA, ownerB } = getTestCredentials();
		clientA = await createTestClient(ownerA.email, ownerA.password);
		clientB = await createTestClient(ownerB.email, ownerB.password);
		const {
			data: { user: uA },
		} = await clientA.auth.getUser();
		const {
			data: { user: uB },
		} = await clientB.auth.getUser();
		ownerAId = uA!.id;
		ownerBId = uB!.id;

		propertyA = await createProperty(clientA, ownerAId, "A");
		propertyB = await createProperty(clientB, ownerBId, "B");

		// Fail loudly if a fixture failed — a silent null would let downstream
		// non-null unwraps skip with zero assertions (cross-entity cycle-3 lesson).
		expect(
			propertyA,
			"owner A property fixture failed to create — check RLS/plan-limit drift",
		).not.toBeNull();
		expect(
			propertyB,
			"owner B property fixture failed to create — check RLS/plan-limit drift",
		).not.toBeNull();
	});

	afterAll(async () => {
		if (uploadedA.avatars.length)
			await clientA.storage
				.from("avatars")
				.remove(uploadedA.avatars)
				.catch(() => {});
		if (uploadedA.tenantDocuments.length)
			await clientA.storage
				.from("tenant-documents")
				.remove(uploadedA.tenantDocuments)
				.catch(() => {});
		if (uploadedA.bulkImports.length)
			await clientA.storage
				.from("bulk-imports")
				.remove(uploadedA.bulkImports)
				.catch(() => {});
		if (uploadedB.tenantDocuments.length)
			await clientB.storage
				.from("tenant-documents")
				.remove(uploadedB.tenantDocuments)
				.catch(() => {});
		if (propertyA)
			await clientA.from("properties").delete().eq("id", propertyA.id);
		if (propertyB)
			await clientB.from("properties").delete().eq("id", propertyB.id);
	});

	it("sums bytes across owner-attributable buckets (avatars path[1]=uid + tenant-documents property branch)", async () => {
		const before = await readUsage(clientA);

		// avatars/{uid}/... → attributed to the owner by path[1] directly.
		const avatarPath = `${ownerAId}/avatar-${Date.now()}.png`;
		const { error: avErr } = await clientA.storage
			.from("avatars")
			.upload(avatarPath, pngBlob(), { contentType: "image/png" });
		expect(avErr).toBeNull();
		uploadedA.avatars.push(avatarPath);

		// tenant-documents property/{propertyId}/... → attributed via
		// properties.owner_user_id by path[2].
		const docPath = `property/${propertyA!.id}/${Date.now()}-usage.pdf`;
		const { error: docErr } = await clientA.storage
			.from("tenant-documents")
			.upload(docPath, pdfBlob(), { contentType: "application/pdf" });
		expect(docErr).toBeNull();
		uploadedA.tenantDocuments.push(docPath);

		const expectedDelta = AVATAR_SIZE + PDF_SIZE;
		const observed = await waitForUsageDelta(
			clientA,
			before.usedBytes,
			expectedDelta,
		);
		expect(observed).toBe(expectedDelta);
	});

	it("excludes system/ephemeral buckets from usage (bulk-imports; blog-covers + lease-documents excluded by the same allowlist)", async () => {
		const before = await readUsage(clientA);

		// bulk-imports is a system bucket kept OUT of the usage allowlist. The
		// write may or may not be permitted for this synthetic owner; either way
		// the SUM must not move (the exclusion is enforced by the bucket IN(...)
		// allowlist in get_owner_storage_usage, not by write-permission).
		const csvPath = `${ownerAId}/${Date.now()}-usage.csv`;
		const { error: csvErr } = await clientA.storage
			.from("bulk-imports")
			.upload(csvPath, new Blob(["a,b\n1,2\n"], { type: "text/csv" }), {
				contentType: "text/csv",
			});
		if (!csvErr) uploadedA.bulkImports.push(csvPath);

		const after = await readUsage(clientA);
		expect(after.usedBytes - before.usedBytes).toBe(0);
	});

	it("isolates attribution across owners — owner B's upload never counts toward owner A", async () => {
		const aBefore = await readUsage(clientA);
		const bBefore = await readUsage(clientB);

		const docPath = `property/${propertyB!.id}/${Date.now()}-iso.pdf`;
		const { error } = await clientB.storage
			.from("tenant-documents")
			.upload(docPath, pdfBlob(), { contentType: "application/pdf" });
		expect(error).toBeNull();
		uploadedB.tenantDocuments.push(docPath);

		// B's own usage rises by exactly its upload; A is unchanged.
		const bObserved = await waitForUsageDelta(
			clientB,
			bBefore.usedBytes,
			PDF_SIZE,
		);
		expect(bObserved).toBe(PDF_SIZE);

		const aAfter = await readUsage(clientA);
		expect(aAfter.usedBytes).toBe(aBefore.usedBytes);
	});

	it("keeps the raw usage/limit functions service_role-only (T-54-09 — not callable by authenticated)", async () => {
		const usage = await clientA.rpc("get_owner_storage_usage", {
			p_owner: ownerAId,
		});
		expect(usage.data).toBeNull();
		expect(REVOKED_CODES).toContain(usage.error?.code);

		const limit = await clientA.rpc("get_owner_storage_limit_gb", {
			p_owner: ownerAId,
		});
		expect(limit.data).toBeNull();
		expect(REVOKED_CODES).toContain(limit.error?.code);
	});

	it("get_storage_usage_summary() is param-less and returns the caller's {used_bytes, limit_gb} (max owner => -1 unlimited)", async () => {
		const { data, error } = await clientA.rpc("get_storage_usage_summary");
		expect(error).toBeNull();

		const row = Array.isArray(data) ? data[0] : data;
		expect(row).toBeTruthy();

		const usedBytes = Number(row?.used_bytes ?? 0);
		expect(Number.isNaN(usedBytes)).toBe(false);
		expect(usedBytes).toBeGreaterThanOrEqual(0);

		// Synthetic owners are pinned subscription_plan='max'
		// (20260505213825_enforce_plan_limits) → unlimited storage (-1).
		expect(Number(row?.limit_gb)).toBe(-1);
	});
});
