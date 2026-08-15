/**
 * Integration tests for public.rental_application_links (Phase 66, APPLY-01).
 *
 * Covers:
 *   - Token generation: 32 bytes of server CSPRNG entropy, hex-encoded, whose
 *     SHA-256 is what lands in token_hash. The hash is RECOMPUTED in Node and
 *     compared; reading the column back and asserting it is 64 hex characters
 *     would pass against a table storing the raw token twice.
 *   - D-03a re-copyability: raw_token survives a second read. This is the one
 *     property /sign deliberately does NOT have (lease_signing_tokens stores
 *     only the hash), so a copy-paste of that migration fails here.
 *   - Owner isolation on both the read path (RLS select policy) and the write
 *     path (both owner RPCs), including that "not yours" and "does not exist"
 *     produce the SAME message so no owner can enumerate another's ids.
 *   - The deliberate absence of INSERT / UPDATE / DELETE policies: 66-01 ships
 *     a single SELECT policy, so authenticated direct writes must not land.
 *   - anon holds no grant at all (`revoke all on table ... from anon`).
 *   - One active link per unit, enforced by a predicate rather than a partial
 *     unique index (the predicate needs now(), which is not immutable).
 *
 * Strategy: a service-role client seeds and tears down disposable
 * property/unit fixtures (there is no authenticated write path into either
 * table); ownerA / ownerB authenticated clients assert RLS and the owner RPCs;
 * an anon client asserts the grant lockdown. This mirrors
 * lease-signing-tokens.rls.test.ts exactly.
 *
 * RUNS AGAINST PRODUCTION (CLAUDE.md). Synthetic owners only. Every row this
 * file writes is deleted in afterAll, on the failure path too: a leaked
 * rental_application_links row is a live public capability URL pointing at a
 * real unit.
 */

import { createHash, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";
import { REVOKED_CODES } from "./_helpers/revoked-codes";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const SUPABASE_PUBLISHABLE_KEY =
	process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
const SERVICE_ROLE_KEY =
	process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
	process.env["SUPABASE_SECRET_KEY"];

function sha256Hex(input: string): string {
	return createHash("sha256").update(input).digest("hex");
}

const skipReason = !SUPABASE_URL
	? "NEXT_PUBLIC_SUPABASE_URL not set"
	: !SUPABASE_PUBLISHABLE_KEY
		? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not set"
		: !SERVICE_ROLE_KEY
			? "SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY not set"
			: null;

const RUN_TAG = `rls-applink-${Date.now()}`;
const NONEXISTENT_ID = "00000000-0000-0000-0000-000000000000";

/** The shape create_application_link returns (one row). */
interface CreatedLink {
	link_id: string;
	raw_token: string;
	expires_at: string;
}

describe.skipIf(skipReason)(
	"rental_application_links RLS + link lifecycle RPCs",
	() => {
		let service: SupabaseClient;
		let clientA: SupabaseClient;
		let clientB: SupabaseClient;
		let anonClient: SupabaseClient;
		let ownerAId: string;
		let ownerBId: string;

		// Disposable fixtures, all removed in afterAll.
		let propertyAId: string | undefined;
		let propertyBId: string | undefined;
		let unitA1Id: string | undefined; // shape / hashing / isolation / anon
		let unitA2Id: string | undefined; // active-link refusal + re-create
		let unitA3Id: string | undefined; // revoke idempotency
		let unitBId: string | undefined; // ownerB positive control
		const linkIds: string[] = [];

		/** The link minted in the first test, reused by the read-path assertions. */
		let primaryLink: CreatedLink | undefined;

		async function makeUnit(
			propertyId: string,
			ownerId: string,
			unitNumber: string,
		): Promise<string | undefined> {
			const { data } = await service
				.from("units")
				.insert({
					property_id: propertyId,
					owner_user_id: ownerId,
					unit_number: unitNumber,
					rent_amount: 1500,
				})
				.select("id")
				.single();
			return data?.id;
		}

		async function makeProperty(
			ownerId: string,
			label: string,
		): Promise<string | undefined> {
			const { data } = await service
				.from("properties")
				.insert({
					owner_user_id: ownerId,
					name: `${RUN_TAG} ${label}`,
					address_line1: "1 Test St",
					city: "Testville",
					state: "TX",
					postal_code: "75001",
					property_type: "single_family",
				})
				.select("id")
				.single();
			return data?.id;
		}

		/** Mint through the owner RPC and register the row for teardown. */
		async function mintLink(
			client: SupabaseClient,
			unitId: string,
		): Promise<{ row: CreatedLink | undefined; message: string | undefined }> {
			const { data, error } = await client.rpc("create_application_link", {
				p_unit_id: unitId,
				p_expires_days: 60,
			});
			const row: CreatedLink | undefined = data?.[0];
			if (row?.link_id) linkIds.push(row.link_id);
			return { row, message: error?.message };
		}

		beforeAll(async () => {
			service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
				auth: { persistSession: false, autoRefreshToken: false },
			});
			anonClient = createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!);

			const { ownerA, ownerB } = getTestCredentials();
			clientA = await createTestClient(ownerA.email, ownerA.password);
			clientB = await createTestClient(ownerB.email, ownerB.password);
			const {
				data: { user: userA },
			} = await clientA.auth.getUser();
			const {
				data: { user: userB },
			} = await clientB.auth.getUser();
			ownerAId = userA!.id;
			ownerBId = userB!.id;

			propertyAId = await makeProperty(ownerAId, "property A");
			propertyBId = await makeProperty(ownerBId, "property B");
			if (propertyAId) {
				unitA1Id = await makeUnit(propertyAId, ownerAId, "A1");
				unitA2Id = await makeUnit(propertyAId, ownerAId, "A2");
				unitA3Id = await makeUnit(propertyAId, ownerAId, "A3");
			}
			if (propertyBId) unitBId = await makeUnit(propertyBId, ownerBId, "B1");

			// Fixtures are required. Without them every isolation and rejection
			// assertion below would pass vacuously against a missing row.
			expect(propertyAId).toBeTruthy();
			expect(propertyBId).toBeTruthy();
			expect(unitA1Id).toBeTruthy();
			expect(unitA2Id).toBeTruthy();
			expect(unitA3Id).toBeTruthy();
			expect(unitBId).toBeTruthy();
		}, 60_000);

		afterAll(async () => {
			// Applications first: rental_applications.link_id is ON DELETE SET NULL,
			// so deleting links first would orphan any row rather than remove it.
			if (linkIds.length > 0) {
				await service
					.from("rental_applications")
					.delete()
					.in("link_id", linkIds);
				await service
					.from("rental_application_links")
					.delete()
					.in("id", linkIds);
			}
			const unitIds = [unitA1Id, unitA2Id, unitA3Id, unitBId].filter(
				(id): id is string => typeof id === "string",
			);
			if (unitIds.length > 0)
				await service.from("units").delete().in("id", unitIds);
			const propertyIds = [propertyAId, propertyBId].filter(
				(id): id is string => typeof id === "string",
			);
			if (propertyIds.length > 0)
				await service.from("properties").delete().in("id", propertyIds);

			// Verified, not assumed: a leaked link row is a live public capability
			// URL on a real unit.
			if (linkIds.length > 0) {
				const { count } = await service
					.from("rental_application_links")
					.select("id", { count: "exact", head: true })
					.in("id", linkIds);
				expect(count ?? 0).toBe(0);
			}
		}, 60_000);

		// ── token generation and hashing ─────────────────────────────────────────

		it("mints a 256-bit hex token whose SHA-256, recomputed in Node, is token_hash", async () => {
			const { row, message } = await mintLink(clientA, unitA1Id!);
			expect(message).toBeUndefined();
			expect(row?.link_id).toBeTruthy();
			primaryLink = row;

			// 32 bytes from extensions.gen_random_bytes, hex-encoded. Never a uuid
			// (122 bits and structured) and never client-supplied.
			expect(row?.raw_token).toMatch(/^[0-9a-f]{64}$/);

			const { data: stored } = await service
				.from("rental_application_links")
				.select("token_hash, raw_token, owner_user_id, unit_id, revoked_at")
				.eq("id", row!.link_id)
				.single();

			// The assertion is the RECOMPUTATION. Reading token_hash back and
			// asserting it is 64 hex characters would also pass against a column
			// storing the raw token a second time.
			expect(stored?.token_hash).toBe(sha256Hex(row!.raw_token));
			expect(stored?.token_hash).not.toBe(row!.raw_token);
			expect(stored?.raw_token).toBe(row!.raw_token);
			expect(stored?.owner_user_id).toBe(ownerAId);
			expect(stored?.unit_id).toBe(unitA1Id);
			expect(stored?.revoked_at).toBeNull();
		});

		it("D-03a: raw_token is still readable by the owner on a second read", async () => {
			expect(primaryLink?.link_id).toBeTruthy();

			// Read twice through the OWNER's client, so this also exercises the
			// rental_application_links_select policy rather than only service role.
			const first = await clientA
				.from("rental_application_links")
				.select("raw_token")
				.eq("id", primaryLink!.link_id)
				.single();
			const second = await clientA
				.from("rental_application_links")
				.select("raw_token")
				.eq("id", primaryLink!.link_id)
				.single();

			expect(first.error).toBeNull();
			expect(second.error).toBeNull();
			// A shown-once implementation (the /sign pattern) leaves this null on
			// the second read, or on the first. Both fail here, which is the point
			// of D-03a: the owner re-copies this URL for the life of the listing.
			expect(first.data?.raw_token).toBe(primaryLink!.raw_token);
			expect(second.data?.raw_token).toBe(primaryLink!.raw_token);
		});

		// ── owner isolation, read ────────────────────────────────────────────────

		it("owner A can read their own link; owner B gets zero rows for that id", async () => {
			expect(primaryLink?.link_id).toBeTruthy();

			// Positive control FIRST. Without it, "B sees nothing" also passes when
			// the row does not exist at all.
			const { data: aRead, count: aCount } = await clientA
				.from("rental_application_links")
				.select("id", { count: "exact" })
				.eq("id", primaryLink!.link_id);
			expect(aCount).toBe(1);
			expect((aRead ?? []).map((r) => r.id)).toContain(primaryLink!.link_id);

			// Count for THAT id, not an empty-array check: ownerB may legitimately
			// hold links of their own.
			const { count: bCount } = await clientB
				.from("rental_application_links")
				.select("id", { count: "exact", head: true })
				.eq("id", primaryLink!.link_id);
			expect(bCount).toBe(0);
		});

		// ── owner isolation, write ───────────────────────────────────────────────

		it("create_application_link answers another owner's unit exactly as it answers a missing unit", async () => {
			const notYours = await clientB.rpc("create_application_link", {
				p_unit_id: unitA1Id!,
				p_expires_days: 60,
			});
			const notFound = await clientB.rpc("create_application_link", {
				p_unit_id: NONEXISTENT_ID,
				p_expires_days: 60,
			});

			expect(notYours.error?.message).toBe("unit not found");
			// Equal messages, or a signed-in owner can probe unit ids and learn
			// which ones belong to someone else (T-66-02).
			expect(notYours.error?.message).toBe(notFound.error?.message);

			// Positive control: ownerB is not blanket-refused — the refusal above is
			// about ownership, not about ownerB being unable to mint links at all.
			const { row, message } = await mintLink(clientB, unitBId!);
			expect(message).toBeUndefined();
			expect(row?.raw_token).toMatch(/^[0-9a-f]{64}$/);
		});

		it("revoke_application_link answers another owner's link exactly as it answers a missing link", async () => {
			expect(primaryLink?.link_id).toBeTruthy();

			const notYours = await clientB.rpc("revoke_application_link", {
				p_link_id: primaryLink!.link_id,
			});
			const notFound = await clientB.rpc("revoke_application_link", {
				p_link_id: NONEXISTENT_ID,
			});

			expect(notYours.error?.message).toBe("link not found");
			expect(notYours.error?.message).toBe(notFound.error?.message);

			// And the refusal actually refused: the row is still live.
			const { data: still } = await service
				.from("rental_application_links")
				.select("revoked_at")
				.eq("id", primaryLink!.link_id)
				.single();
			expect(still?.revoked_at).toBeNull();
		});

		// ── no authenticated direct write path ───────────────────────────────────

		it("authenticated owners cannot INSERT, UPDATE or DELETE links directly (SELECT policy only)", async () => {
			expect(primaryLink?.link_id).toBeTruthy();

			// Positive control: the owner CAN read the row, so a zero-row write
			// result below is the write policy's absence and not a broken fixture.
			const { count: readable } = await clientA
				.from("rental_application_links")
				.select("id", { count: "exact", head: true })
				.eq("id", primaryLink!.link_id);
			expect(readable).toBe(1);

			const raw = `${RUN_TAG}-direct-insert`;
			const insert = await clientA
				.from("rental_application_links")
				.insert({
					unit_id: unitA1Id!,
					owner_user_id: ownerAId,
					token_hash: sha256Hex(raw),
					raw_token: raw,
					expires_at: new Date(Date.now() + 864e5).toISOString(),
					created_by: ownerAId,
				})
				.select("id");
			expect(insert.error !== null || (insert.data ?? []).length === 0).toBe(
				true,
			);

			const update = await clientA
				.from("rental_application_links")
				.update({ revoked_at: new Date().toISOString() })
				.eq("id", primaryLink!.link_id)
				.select("id");
			expect(update.error !== null || (update.data ?? []).length === 0).toBe(
				true,
			);

			const del = await clientA
				.from("rental_application_links")
				.delete()
				.eq("id", primaryLink!.link_id)
				.select("id");
			expect(del.error !== null || (del.data ?? []).length === 0).toBe(true);

			// None of the three landed.
			const { data: after } = await service
				.from("rental_application_links")
				.select("revoked_at")
				.eq("id", primaryLink!.link_id)
				.single();
			expect(after?.revoked_at).toBeNull();

			const { count: strays } = await service
				.from("rental_application_links")
				.select("id", { count: "exact", head: true })
				.eq("token_hash", sha256Hex(raw));
			expect(strays).toBe(0);
		});

		// ── anon lockdown ────────────────────────────────────────────────────────

		it("anon can neither read nor write rental_application_links", async () => {
			const read = await anonClient
				.from("rental_application_links")
				.select("id")
				.limit(1);
			expect(read.error).not.toBeNull();
			expect(read.data).toBeNull();

			const raw = `${RUN_TAG}-anon-insert`;
			const write = await anonClient
				.from("rental_application_links")
				.insert({
					unit_id: unitA1Id!,
					owner_user_id: ownerAId,
					token_hash: sha256Hex(raw),
					raw_token: raw,
					expires_at: new Date(Date.now() + 864e5).toISOString(),
					created_by: ownerAId,
				})
				.select("id");
			expect(write.error).not.toBeNull();

			const { count } = await service
				.from("rental_application_links")
				.select("id", { count: "exact", head: true })
				.eq("token_hash", sha256Hex(raw));
			expect(count).toBe(0);
		});

		it("both link RPCs are unreachable from anon", async () => {
			const create = await anonClient.rpc("create_application_link", {
				p_unit_id: unitA1Id!,
				p_expires_days: 60,
			});
			expect(REVOKED_CODES).toContain(create.error?.code);

			const revoke = await anonClient.rpc("revoke_application_link", {
				p_link_id: NONEXISTENT_ID,
			});
			expect(REVOKED_CODES).toContain(revoke.error?.code);
		});

		// ── one active link per unit ─────────────────────────────────────────────

		it("refuses a second link while one is active, and allows one after revoke", async () => {
			const first = await mintLink(clientA, unitA2Id!);
			expect(first.message).toBeUndefined();
			expect(first.row?.link_id).toBeTruthy();

			// Refusal while active. On its own this half would also pass against an
			// implementation that never allows a second link at all.
			const blocked = await clientA.rpc("create_application_link", {
				p_unit_id: unitA2Id!,
				p_expires_days: 60,
			});
			expect(blocked.error?.message).toBe("link already active");

			// Revoke succeeds for the owner — the positive control for every
			// "link not found" refusal asserted above.
			const revoked = await clientA.rpc("revoke_application_link", {
				p_link_id: first.row!.link_id,
			});
			expect(revoked.error).toBeNull();

			// ...and the unit is now re-listable. This is the half that makes an
			// expired or revoked listing recoverable rather than permanently dead.
			const second = await mintLink(clientA, unitA2Id!);
			expect(second.message).toBeUndefined();
			expect(second.row?.link_id).toBeTruthy();
			expect(second.row?.link_id).not.toBe(first.row?.link_id);
			expect(second.row?.raw_token).not.toBe(first.row?.raw_token);
		});

		it("revoking an already-revoked link raises not-found and leaves revoked_at unchanged", async () => {
			const { row, message } = await mintLink(clientA, unitA3Id!);
			expect(message).toBeUndefined();

			const first = await clientA.rpc("revoke_application_link", {
				p_link_id: row!.link_id,
			});
			expect(first.error).toBeNull();

			const { data: afterFirst } = await service
				.from("rental_application_links")
				.select("revoked_at")
				.eq("id", row!.link_id)
				.single();
			const stamp = afterFirst?.revoked_at;
			expect(stamp).not.toBeNull();

			const second = await clientA.rpc("revoke_application_link", {
				p_link_id: row!.link_id,
			});
			// Same message as a link that never existed — idempotent-SAFE, not
			// idempotent: a silent re-stamp would move the date the UI shows.
			expect(second.error?.message).toBe("link not found");

			const { data: afterSecond } = await service
				.from("rental_application_links")
				.select("revoked_at")
				.eq("id", row!.link_id)
				.single();
			expect(afterSecond?.revoked_at).toBe(stamp);
		});

		it("a revoked link does not block a fresh one, and an unknown unit id is still refused", async () => {
			// Closes the loop on the guard's predicate: it checks for an ACTIVE
			// link (`revoked_at is null and expires_at > now()`), not for any link.
			// "Any link exists" would make every relisted unit permanently dead.
			const { row, message } = await mintLink(clientA, unitA3Id!);
			expect(message).toBeUndefined();
			expect(row?.link_id).toBeTruthy();

			const unknown = await clientA.rpc("create_application_link", {
				p_unit_id: randomUUID(),
				p_expires_days: 60,
			});
			expect(unknown.error?.message).toBe("unit not found");
		});
	},
);
