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

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

// ============================================================================
// METER-04 — storage upload-enforcement guard (enforce_storage_quota trigger)
// ============================================================================
// Extends the Plan 03 METER-03 suite above with the BEFORE INSERT enforcement
// matrix. Unlike METER-03 (authenticated owner clients only), METER-04 needs a
// SERVICE_ROLE client to:
//   - toggle the app_config kill-flag storage_enforcement_enabled ('true'/'false'),
//   - flip ownerA's subscription_plan to a LIMITED tier (the synthetic owners are
//     pinned 'max' = unlimited = exempt; `update on public.users` is revoked from
//     authenticated + guarded by guard_user_self_update, so only service_role can
//     set it — the guard bypasses service_role),
//   - stamp / clear ownerA.storage_grandfathered_at,
//   - and FABRICATE an over-quota state WITHOUT uploading gigabytes: seed one
//     storage.objects row carrying a large metadata.size and owner = ownerAId, so
//     get_owner_storage_usage(ownerAId) exceeds the tier limit. Seeding real bytes
//     up to even the 1 GB trial limit is infeasible in a test, so the size is
//     fabricated via a direct storage-schema insert (service_role, RLS-bypassing).
//
// SEED DEPENDENCY (orchestrator RUN — Task 2): fabricating the row requires the
// service_role PostgREST client to reach the `storage` schema
// (`.schema("storage").from("objects")`). This project already exposes a
// non-public schema to PostgREST (`stripe`, see subscriptions.rls.test.ts). If
// prod does NOT expose `storage`, seedOversize fails LOUDLY (expect(error)
// .toBeNull()) rather than silently passing — the orchestrator then either adds
// `storage` to the project's exposed schemas or pre-seeds the oversize row via
// MCP execute_sql before running this file.
//
// Trigger contract proven here (the DB half of D-03): a rejected upload surfaces
// through the Storage API (@supabase/storage-js) as an error whose message begins
// with the literal 'plan_limit_exceeded:' prefix — StorageApiError strips
// hint/detail, so the message prefix is the only surviving quota signal. storage-js
// returns the error in the { data, error } result (it does NOT throw), so the
// rejected case is asserted via error.message, not `.rejects`. The product UX half
// (client-side detector + upload pre-check) is Plan 07.
//
// afterAll RESTORES ownerA's real plan, clears the grandfather stamp, and LEAVES
// the prod flag 'false' — this plan must NOT enable enforcement.
//
// RUN is DEFERRED to the orchestrator: requires the 20260723140000_storage_
// enforcement_guard migration applied to prod (Task 2), then
// `bun run test:integration -- storage-metering.rls.test.ts`. Skips cleanly when
// the service-role / owner env vars are absent (local runs without secrets).

const M4_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const M4_SERVICE_ROLE_KEY =
	process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
	process.env["SUPABASE_SECRET_KEY"];
const M4_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
const M4_OWNER_A_EMAIL = process.env["E2E_OWNER_EMAIL"];
const M4_OWNER_A_PASSWORD = process.env["E2E_OWNER_PASSWORD"];

const m4SkipReason = !M4_URL
	? "NEXT_PUBLIC_SUPABASE_URL not set"
	: !M4_SERVICE_ROLE_KEY
		? "SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY not set"
		: !M4_ANON_KEY
			? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not set"
			: !M4_OWNER_A_EMAIL || !M4_OWNER_A_PASSWORD
				? "E2E owner credentials not set"
				: null;

// Starter tier = 10 GB quota (get_owner_storage_limit_gb); fabricate 11 GB so the
// owner is unambiguously over. (Growth is 50 GB, Max is -1 unlimited.) This is the
// finite-limit branch (Starter 10) that Plan 03's suite deferred to Plan 04.
const STARTER_PLAN = "starter";
const MAX_PLAN = "max";
const STARTER_LIMIT_BYTES = 10 * 1024 ** 3;
const OVER_STARTER_BYTES = 11 * 1024 ** 3;

describe.skipIf(m4SkipReason)(
	"Storage metering (METER-04) — upload guard: enforce / grandfather / max / service_role / system-bucket / flag-off + reads unaffected",
	() => {
		let service: SupabaseClient;
		let clientA: SupabaseClient;
		let ownerAId: string;
		let originalPlanA: string | null = null;

		// storage.objects rows fabricated via the service-role storage-schema client
		// (the over-quota seed) — tracked for teardown.
		const seededObjectIds: string[] = [];
		// Real objects the allowed cases uploaded — tracked for teardown.
		const uploadedAvatars: string[] = [];
		const uploadedBulkImports: string[] = [];

		// -- service-role helpers (bypass RLS; guard_user_self_update bypasses
		//    service_role, and app_config is service_role-only) -------------------

		async function setFlag(value: "true" | "false"): Promise<void> {
			const { error } = await service
				.from("app_config")
				.update({ value })
				.eq("key", "storage_enforcement_enabled");
			expect(error).toBeNull();
		}

		async function setPlanA(plan: string): Promise<void> {
			const { error } = await service
				.from("users")
				.update({ subscription_plan: plan })
				.eq("id", ownerAId);
			expect(error).toBeNull();
		}

		async function setGrandfatherA(ts: string | null): Promise<void> {
			const { error } = await service
				.from("users")
				.update({ storage_grandfathered_at: ts })
				.eq("id", ownerAId);
			expect(error).toBeNull();
		}

		// Fabricate an over-quota storage.objects row attributed to ownerA via a
		// direct storage-schema insert (service_role) so the size exceeds the tier
		// limit without uploading real bytes. The trigger fires on this insert too
		// but short-circuits at step 1 (auth.uid() is null for service_role).
		async function seedOversize(bytes: number): Promise<void> {
			const name = `${ownerAId}/meter04-oversize-${Date.now()}-${seededObjectIds.length}.bin`;
			const { data, error } = await service
				.schema("storage")
				.from("objects")
				.insert({
					bucket_id: "avatars",
					name,
					owner: ownerAId,
					metadata: { size: bytes, mimetype: "application/octet-stream" },
				})
				.select("id")
				.single();
			// Fail loudly (not a silent skip) if the storage schema is unreachable —
			// the orchestrator needs the signal to expose it / pre-seed via MCP.
			expect(error).toBeNull();
			if (data?.id) seededObjectIds.push(data.id as string);
		}

		async function readUsageA(): Promise<number> {
			const { data, error } = await service.rpc("get_owner_storage_usage", {
				p_owner: ownerAId,
			});
			expect(error).toBeNull();
			return Number(data ?? 0);
		}

		beforeAll(async () => {
			service = createClient(M4_URL!, M4_SERVICE_ROLE_KEY!, {
				auth: { persistSession: false, autoRefreshToken: false },
			});
			clientA = createClient(M4_URL!, M4_ANON_KEY!, {
				auth: { persistSession: false, autoRefreshToken: false },
			});
			await clientA.auth.signInWithPassword({
				email: M4_OWNER_A_EMAIL!,
				password: M4_OWNER_A_PASSWORD!,
			});
			const {
				data: { user },
			} = await clientA.auth.getUser();
			ownerAId = user!.id;

			// Capture the synthetic owner's real plan so we restore it, not a guess.
			const { data: planRow } = await service
				.from("users")
				.select("subscription_plan")
				.eq("id", ownerAId)
				.single();
			originalPlanA = (planRow?.subscription_plan as string | null) ?? MAX_PLAN;

			// Clean slate: not grandfathered, flag off.
			await setGrandfatherA(null);
			await setFlag("false");
		});

		afterEach(async () => {
			// Remove any real objects the allowed cases uploaded.
			if (uploadedAvatars.length) {
				await service.storage
					.from("avatars")
					.remove(uploadedAvatars.splice(0))
					.catch(() => {});
			}
			if (uploadedBulkImports.length) {
				await service.storage
					.from("bulk-imports")
					.remove(uploadedBulkImports.splice(0))
					.catch(() => {});
			}
			// Remove the fabricated over-quota rows.
			if (seededObjectIds.length) {
				await service
					.schema("storage")
					.from("objects")
					.delete()
					.in("id", seededObjectIds.splice(0));
			}
			// Reset the mutable owner/flag state between cases (order-independence).
			await setGrandfatherA(null);
			await setPlanA(STARTER_PLAN);
			await setFlag("false");
		});

		afterAll(async () => {
			// Restore the synthetic owner's real plan, clear the grandfather stamp,
			// and LEAVE the prod flag 'false' (this plan must not enable enforcement).
			await setGrandfatherA(null);
			await setPlanA(originalPlanA ?? MAX_PLAN);
			await setFlag("false");
		});

		// -- enforce ------------------------------------------------------------

		it("flag ON + Starter + non-grandfathered + over quota: authenticated upload is blocked with plan_limit_exceeded", async () => {
			await setPlanA(STARTER_PLAN);
			await setGrandfatherA(null);
			await seedOversize(OVER_STARTER_BYTES);

			// Sanity: the fabricated SUM really is over the Starter limit.
			expect(await readUsageA()).toBeGreaterThanOrEqual(STARTER_LIMIT_BYTES);

			await setFlag("true");

			// storage-js returns the error in the result (does not throw), so assert
			// on error.message — NOT `.rejects`. The Storage API strips hint/detail,
			// so the plan_limit_exceeded MESSAGE PREFIX is the only surviving signal.
			const { data, error } = await clientA.storage
				.from("avatars")
				.upload(`${ownerAId}/meter04-blocked-${Date.now()}.png`, pngBlob(), {
					contentType: "image/png",
				});
			expect(data).toBeNull();
			expect(error).not.toBeNull();
			expect(error?.message ?? "").toContain("plan_limit_exceeded");
		});

		// -- grandfather --------------------------------------------------------

		it("flag ON + over quota + grandfathered: authenticated upload SUCCEEDS (D-04 full exemption)", async () => {
			await setPlanA(STARTER_PLAN);
			await seedOversize(OVER_STARTER_BYTES);
			await setGrandfatherA(new Date().toISOString());
			await setFlag("true");

			const path = `${ownerAId}/meter04-grandfathered-${Date.now()}.png`;
			const { error } = await clientA.storage
				.from("avatars")
				.upload(path, pngBlob(), { contentType: "image/png" });
			expect(error).toBeNull();
			uploadedAvatars.push(path);
		});

		// -- max / unlimited ----------------------------------------------------

		it("flag ON + over quota + Max tier (-1 unlimited): authenticated upload SUCCEEDS", async () => {
			await setPlanA(MAX_PLAN);
			await seedOversize(OVER_STARTER_BYTES);
			await setFlag("true");

			const path = `${ownerAId}/meter04-max-${Date.now()}.png`;
			const { error } = await clientA.storage
				.from("avatars")
				.upload(path, pngBlob(), { contentType: "image/png" });
			expect(error).toBeNull();
			uploadedAvatars.push(path);
		});

		// -- service_role / signed-lease finalize (auth.uid() is null) ----------

		it("flag ON + over quota: a service_role upload (auth.uid() null) is NEVER blocked (signed-lease finalize)", async () => {
			await setPlanA(STARTER_PLAN);
			await seedOversize(OVER_STARTER_BYTES);
			await setFlag("true");

			// The service-role Storage upload leaves owner/auth.uid() null → the guard
			// short-circuits at step 1. A legal artifact must never be blocked by
			// quota (Pitfall 3 / T-54-14).
			const path = `${ownerAId}/meter04-service-${Date.now()}.png`;
			const { error } = await service.storage
				.from("avatars")
				.upload(path, pngBlob(), { contentType: "image/png" });
			expect(error).toBeNull();
			uploadedAvatars.push(path);
		});

		// -- system / unattributable bucket -------------------------------------

		it("flag ON + over quota: an upload to a system bucket (not in the metered set) is never a quota block", async () => {
			await setPlanA(STARTER_PLAN);
			await seedOversize(OVER_STARTER_BYTES);
			await setFlag("true");

			// bulk-imports is NOT one of the five owner-attributable buckets → the
			// guard short-circuits at step 3. The synthetic owner's write may or may
			// not be permitted by bucket RLS; either way it must NOT be a quota block,
			// so assert the trigger did not raise plan_limit_exceeded.
			const path = `${ownerAId}/meter04-system-${Date.now()}.csv`;
			const { error } = await clientA.storage
				.from("bulk-imports")
				.upload(path, new Blob(["a,b\n1,2\n"], { type: "text/csv" }), {
					contentType: "text/csv",
				});
			expect(error?.message ?? "").not.toContain("plan_limit_exceeded");
			if (!error) uploadedBulkImports.push(path);
		});

		// -- flag OFF (pre-flip no-op) ------------------------------------------

		it("flag OFF + over quota: authenticated upload SUCCEEDS (pre-flip no-op)", async () => {
			await setPlanA(STARTER_PLAN);
			await setGrandfatherA(null);
			await seedOversize(OVER_STARTER_BYTES);
			await setFlag("false");

			const path = `${ownerAId}/meter04-flagoff-${Date.now()}.png`;
			const { error } = await clientA.storage
				.from("avatars")
				.upload(path, pngBlob(), { contentType: "image/png" });
			expect(error).toBeNull();
			uploadedAvatars.push(path);
		});

		// -- reads / deletes unaffected (D-03; guard is INSERT-only) -------------

		it("flag ON + over quota: reads (list) and deletes on the owner's objects are unaffected (guard is INSERT-only)", async () => {
			await setPlanA(STARTER_PLAN);
			await setGrandfatherA(null);

			// Upload a real object while enforcement is OFF (so the INSERT is allowed),
			// then flip enforcement ON + push the owner over quota. list()/remove() go
			// through SELECT/DELETE, which never fire the BEFORE INSERT trigger.
			const path = `${ownerAId}/meter04-rw-${Date.now()}.png`;
			const { error: upErr } = await clientA.storage
				.from("avatars")
				.upload(path, pngBlob(), { contentType: "image/png" });
			expect(upErr).toBeNull();

			await seedOversize(OVER_STARTER_BYTES);
			await setFlag("true");

			// Read (list) still works for the over-quota owner.
			const { data: listed, error: listErr } = await clientA.storage
				.from("avatars")
				.list(ownerAId);
			expect(listErr).toBeNull();
			expect((listed ?? []).some((o) => path.endsWith(o.name))).toBe(true);

			// Delete still works for the over-quota owner (DELETE never fires the
			// INSERT guard).
			const { error: delErr } = await clientA.storage
				.from("avatars")
				.remove([path]);
			expect(delErr).toBeNull();
		});
	},
);
