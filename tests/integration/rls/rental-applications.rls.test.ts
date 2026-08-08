/**
 * Integration tests for public.rental_applications (Phase 66, APPLY-02 /
 * APPLY-03 / APPLY-04).
 *
 * This file carries the invariant the whole phase exists for and that NO unit
 * test and NO Playwright run can reach: `anon` cannot write an application, and
 * neither can a signed-in owner. /apply/[token] is the product's only public,
 * write-capable surface, and the control is not RLS alone — it is the absence
 * of any INSERT or UPDATE policy for any role (66-01) plus an explicit grant
 * revoke, with every write funnelled through service-role SECURITY DEFINER
 * RPCs (66-04).
 *
 * Group A  the APPLY-02 anon/authenticated write denial (six operations)
 * Group B  the caps, including under GENUINE concurrency (T-66-05 / F-6)
 * Group C  idempotency, payload refusal, and the D-06 forbidden-column contract
 * Group D  status transitions, the retention clock, and the conversion edges
 * Group E  the deployed apply-token boundary: honeypot, timing, happy path
 *
 * Strategy: a service-role client seeds fixtures and drives the two
 * service-role RPCs (there is no other write path); ownerA / ownerB
 * authenticated clients assert RLS, the owner RPCs and cross-owner isolation;
 * an anon client asserts the grant lockdown.
 *
 * RUNS AGAINST PRODUCTION (CLAUDE.md). Synthetic owners only. Every row is
 * removed in afterAll, on the failure path too, and afterAll re-queries to
 * prove it rather than assuming it.
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

const skipReason = !SUPABASE_URL
	? "NEXT_PUBLIC_SUPABASE_URL not set"
	: !SUPABASE_PUBLISHABLE_KEY
		? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not set"
		: !SERVICE_ROLE_KEY
			? "SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY not set"
			: null;

const RUN_TAG = `rls-app-${Date.now()}`;
const NONEXISTENT_ID = "00000000-0000-0000-0000-000000000000";

/** The lifetime cap in submit_rental_application (D-04a). */
const LIFETIME_CAP = 250;
/** The rolling-hour cap in submit_rental_application. */
const HOUR_CAP = 25;

/**
 * D-06, asserted at the SCHEMA level. Every name here must be absent from
 * public.rental_applications forever: each one raises the PII retention
 * obligation and the first several are screening-shaped, which cuts directly
 * against APPLY-06. Mirrors FORBIDDEN_SUBMISSION_KEYS in
 * supabase/functions/_shared/application-guards.ts.
 */
const FORBIDDEN_COLUMNS: readonly string[] = [
	"ssn",
	"social_security",
	"date_of_birth",
	"dob",
	"government_id",
	"drivers_license",
	"passport",
	"bank_account",
	"routing",
	"card_number",
	"income_type",
	"marital_status",
	"criminal_history",
];

interface SubmitRow {
	success: boolean;
	reason: string | null;
	application_id: string | null;
}

interface ConversionRow {
	success: boolean;
	reason: string | null;
}

interface TestLink {
	id: string;
	raw: string;
	hash: string;
}

/**
 * Probe whether the public apply-token Edge Function is deployed. Copied from
 * lease-signing-tokens.rls.test.ts including the fail-CLOSED catch: a probe
 * that throws (DNS, timeout, network flake) SKIPS the deploy-gated tests
 * rather than false-failing them.
 */
async function isApplyFunctionDeployed(): Promise<boolean> {
	if (!SUPABASE_URL) return false;
	try {
		const probe = await fetch(`${SUPABASE_URL}/functions/v1/apply-token`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "context", token: "not-a-real-token" }),
		});
		if (probe.status === 404) {
			const body = (await probe.json().catch(() => ({}))) as { code?: string };
			return body.code !== "NOT_FOUND";
		}
		return true;
	} catch {
		return false;
	}
}

/** 64 hex characters, the same shape create_application_link mints. */
function makeRawToken(): string {
	return `${randomUUID()}${randomUUID()}`.replace(/-/g, "");
}

/** The public lookup key. Hashed in Node here, in Deno in the Edge Function —
 *  never in SQL, because pgcrypto lives in the `extensions` schema (D-15). */
function sha256Hex(input: string): string {
	return createHash("sha256").update(input).digest("hex");
}

describe.skipIf(skipReason)(
	"rental_applications: anon denial, caps under concurrency, conversion edges",
	() => {
		let service: SupabaseClient;
		let clientA: SupabaseClient;
		let clientB: SupabaseClient;
		let anonClient: SupabaseClient;
		let ownerAId: string;
		let ownerBId: string;

		let propertyAId: string | undefined;
		let unitAId: string | undefined;
		let tenantAId: string | undefined;
		let tenantBId: string | undefined;
		let applyFnDeployed = false;

		const linkIds: string[] = [];
		/** Every application id this file creates, for notification teardown. */
		const createdAppIds = new Set<string>();
		/** Tenants created inside tests (the D-09 pair), removed in afterAll. */
		const extraTenantIds = new Set<string>();

		// ── fixture helpers ──────────────────────────────────────────────────────

		async function seedLink(
			overrides: Record<string, unknown> = {},
		): Promise<TestLink> {
			const raw = makeRawToken();
			// The RPCs look links up by SHA-256 hash only and never hash a raw
			// value themselves. The raw token matters only to the Group E tests,
			// which post it to the deployed function and let Deno do the hashing.
			const hash = sha256Hex(raw);
			const { data, error } = await service
				.from("rental_application_links")
				.insert({
					unit_id: unitAId!,
					owner_user_id: ownerAId,
					created_by: ownerAId,
					token_hash: hash,
					raw_token: raw,
					expires_at: new Date(Date.now() + 60 * 864e5).toISOString(),
					...overrides,
				})
				.select("id")
				.single();
			if (error) throw new Error(`seedLink failed: ${error.message}`);
			linkIds.push(data!.id);
			return { id: data!.id, raw, hash };
		}

		/** The D-05 field contract, exactly as parseSubmissionPayload emits it. */
		function makePayload(
			overrides: Record<string, unknown> = {},
		): Record<string, unknown> {
			return {
				first_name: "Test",
				last_name: "Applicant",
				email: `${RUN_TAG}-applicant@example.com`,
				phone: "555-0100",
				desired_move_in_date: "2027-01-01",
				current_street: "1 Test St",
				current_city: "Testville",
				current_state: "TX",
				current_postal_code: "75001",
				gross_monthly_income: 5000,
				occupant_count: 2,
				reference_1_name: "Ref One",
				reference_1_phone: "555-0101",
				certified: true,
				...overrides,
			};
		}

		async function submit(
			link: TestLink,
			submissionId: string,
			payload: Record<string, unknown> = makePayload(),
			client: SupabaseClient = service,
		): Promise<{
			row: SubmitRow | undefined;
			code: string | undefined;
			message: string | undefined;
		}> {
			const { data, error } = await client.rpc("submit_rental_application", {
				p_token_hash: link.hash,
				p_submission_id: submissionId,
				p_payload: payload,
				p_ip: "203.0.113.7",
				p_user_agent: "vitest-integration",
			});
			const row: SubmitRow | undefined = data?.[0];
			if (row?.application_id) createdAppIds.add(row.application_id);
			return { row, code: error?.code, message: error?.message };
		}

		/** Direct service-role insert. Used where the RPC's side effects (the
		 *  owner notification, the counter increment) are not under test. */
		async function seedApplication(
			overrides: Record<string, unknown> = {},
		): Promise<string> {
			const { data, error } = await service
				.from("rental_applications")
				.insert({
					owner_user_id: ownerAId,
					unit_id: unitAId!,
					property_label: `${RUN_TAG} property`,
					unit_label: "A1",
					submission_id: randomUUID(),
					occupant_count: 2,
					certified_at: new Date().toISOString(),
					applicant_first_name: "Seeded",
					applicant_last_name: "Applicant",
					applicant_email: `${RUN_TAG}-seed@example.com`,
					...overrides,
				})
				.select("id")
				.single();
			if (error) throw new Error(`seedApplication failed: ${error.message}`);
			createdAppIds.add(data!.id);
			return data!.id;
		}

		async function countForLink(linkId: string): Promise<number> {
			const { count } = await service
				.from("rental_applications")
				.select("id", { count: "exact", head: true })
				.eq("link_id", linkId);
			return count ?? 0;
		}

		async function submissionCount(linkId: string): Promise<number> {
			const { data } = await service
				.from("rental_application_links")
				.select("submission_count")
				.eq("id", linkId)
				.single();
			return data?.submission_count ?? -1;
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

			const { data: property } = await service
				.from("properties")
				.insert({
					owner_user_id: ownerAId,
					name: `${RUN_TAG} property`,
					address_line1: "1 Test St",
					city: "Testville",
					state: "TX",
					postal_code: "75001",
					property_type: "single_family",
				})
				.select("id")
				.single();
			propertyAId = property?.id;

			if (propertyAId) {
				const { data: unit } = await service
					.from("units")
					.insert({
						property_id: propertyAId,
						owner_user_id: ownerAId,
						unit_number: "A1",
						rent_amount: 1500,
					})
					.select("id")
					.single();
				unitAId = unit?.id;
			}

			const { data: tenantA } = await service
				.from("tenants")
				.insert({
					owner_user_id: ownerAId,
					name: `${RUN_TAG} tenant A`,
					email: `${RUN_TAG}-tenant-a@example.com`,
				})
				.select("id")
				.single();
			tenantAId = tenantA?.id;

			const { data: tenantB } = await service
				.from("tenants")
				.insert({
					owner_user_id: ownerBId,
					name: `${RUN_TAG} tenant B`,
					email: `${RUN_TAG}-tenant-b@example.com`,
				})
				.select("id")
				.single();
			tenantBId = tenantB?.id;

			applyFnDeployed = await isApplyFunctionDeployed();

			// Required. Every denial assertion below would pass vacuously against a
			// missing fixture.
			expect(propertyAId).toBeTruthy();
			expect(unitAId).toBeTruthy();
			expect(tenantAId).toBeTruthy();
			expect(tenantBId).toBeTruthy();
		}, 60_000);

		afterAll(async () => {
			// Notifications first — submit_rental_application writes one per accepted
			// application through create_notification, and they are keyed on an
			// application id that is about to disappear.
			const appIds = [...createdAppIds];
			if (appIds.length > 0) {
				await service.from("notifications").delete().in("entity_id", appIds);
				await service.from("rental_applications").delete().in("id", appIds);
			}
			if (linkIds.length > 0) {
				// Anything the RPC wrote that this file did not record by id.
				await service
					.from("rental_applications")
					.delete()
					.in("link_id", linkIds);
				await service
					.from("rental_application_links")
					.delete()
					.in("id", linkIds);
			}
			const tenantIds = [tenantAId, tenantBId, ...extraTenantIds].filter(
				(id): id is string => typeof id === "string",
			);
			if (tenantIds.length > 0)
				await service.from("tenants").delete().in("id", tenantIds);
			if (unitAId) await service.from("units").delete().eq("id", unitAId);
			if (propertyAId)
				await service.from("properties").delete().eq("id", propertyAId);

			// Verified, not assumed.
			if (linkIds.length > 0) {
				const links = await service
					.from("rental_application_links")
					.select("id", { count: "exact", head: true })
					.in("id", linkIds);
				expect(links.count ?? 0).toBe(0);

				const apps = await service
					.from("rental_applications")
					.select("id", { count: "exact", head: true })
					.in("link_id", linkIds);
				expect(apps.count ?? 0).toBe(0);
			}
			if (appIds.length > 0) {
				const orphans = await service
					.from("rental_applications")
					.select("id", { count: "exact", head: true })
					.in("id", appIds);
				expect(orphans.count ?? 0).toBe(0);
			}
		}, 60_000);

		// ═════════════════════════════════════════════════════════════════════════
		// GROUP A — the APPLY-02 invariant. This is the group the requirement
		// exists for, and the only place in the repo where it is proven.
		// ═════════════════════════════════════════════════════════════════════════

		it("A1: anon cannot INSERT into rental_applications", async () => {
			const submissionId = randomUUID();
			const { error } = await anonClient
				.from("rental_applications")
				.insert({
					owner_user_id: ownerAId,
					property_label: "anon attempt",
					submission_id: submissionId,
					occupant_count: 1,
					certified_at: new Date().toISOString(),
					applicant_first_name: "Anon",
					applicant_last_name: "Attacker",
					applicant_email: "anon@example.com",
				})
				.select("id");
			expect(error).not.toBeNull();

			const { count } = await service
				.from("rental_applications")
				.select("id", { count: "exact", head: true })
				.eq("submission_id", submissionId);
			expect(count).toBe(0);
		});

		it("A2: anon cannot SELECT from rental_applications", async () => {
			const seeded = await seedApplication();

			// Positive control: the row genuinely exists and its owner can read it,
			// so "anon sees nothing" is the grant revoke and not an empty table.
			const { count: ownerCount } = await clientA
				.from("rental_applications")
				.select("id", { count: "exact", head: true })
				.eq("id", seeded);
			expect(ownerCount).toBe(1);

			const { data, error } = await anonClient
				.from("rental_applications")
				.select("id")
				.limit(1);
			expect(error !== null || (data ?? []).length === 0).toBe(true);
		});

		it("A3: anon cannot EXECUTE submit_rental_application", async () => {
			const link = await seedLink();
			const { error } = await anonClient.rpc("submit_rental_application", {
				p_token_hash: link.hash,
				p_submission_id: randomUUID(),
				p_payload: makePayload(),
				p_ip: "203.0.113.7",
				p_user_agent: "vitest-anon",
			});
			expect(REVOKED_CODES).toContain(error?.code);
			expect(await countForLink(link.id)).toBe(0);
		});

		it("A4: an authenticated owner cannot EXECUTE submit_rental_application (service_role only)", async () => {
			const link = await seedLink();
			const submissionId = randomUUID();
			const payload = makePayload();

			// A signed-in owner can observe a link hash. If they could call this,
			// they could inject applications against any hash they can see — the
			// entire surface the Edge Function exists to mediate.
			const denied = await submit(link, submissionId, payload, clientA);
			expect(REVOKED_CODES).toContain(denied.code);
			expect(await countForLink(link.id)).toBe(0);

			// Positive control with the SAME arguments: the call is well-formed and
			// the refusal above is the grant, not a bad request.
			const allowed = await submit(link, submissionId, payload);
			expect(allowed.code).toBeUndefined();
			expect(allowed.row?.success).toBe(true);
			expect(await countForLink(link.id)).toBe(1);
		});

		it("A5: an authenticated owner cannot INSERT into rental_applications (no INSERT policy)", async () => {
			const submissionId = randomUUID();
			const { data, error } = await clientA
				.from("rental_applications")
				.insert({
					owner_user_id: ownerAId,
					property_label: "owner direct insert",
					submission_id: submissionId,
					occupant_count: 1,
					certified_at: new Date().toISOString(),
					applicant_first_name: "Owner",
					applicant_last_name: "Direct",
					applicant_email: "owner-direct@example.com",
				})
				.select("id");
			expect(error !== null || (data ?? []).length === 0).toBe(true);

			const { count } = await service
				.from("rental_applications")
				.select("id", { count: "exact", head: true })
				.eq("submission_id", submissionId);
			expect(count).toBe(0);
		});

		it("A6: an authenticated owner cannot UPDATE rental_applications (no UPDATE policy)", async () => {
			const seeded = await seedApplication({ status: "new" });

			const { data, error } = await clientA
				.from("rental_applications")
				.update({ status: "approved" })
				.eq("id", seeded)
				.select("id");
			expect(error !== null || (data ?? []).length === 0).toBe(true);

			// The owner CAN read the row, so the zero-row write result above is the
			// missing UPDATE policy rather than a missing row. An owner-editable
			// application is not an audit trail — that is why 66-01 ships no UPDATE
			// policy even though 66-RESEARCH.md proposed one.
			const { data: after } = await clientA
				.from("rental_applications")
				.select("status, applicant_email")
				.eq("id", seeded)
				.single();
			expect(after?.status).toBe("new");

			// The same holds for the applicant-typed fields, which are the record
			// the 730-day retention window exists to preserve.
			const rewrite = await clientA
				.from("rental_applications")
				.update({ applicant_email: "rewritten@example.com" })
				.eq("id", seeded)
				.select("id");
			expect(rewrite.error !== null || (rewrite.data ?? []).length === 0).toBe(
				true,
			);
			const { data: stillOriginal } = await service
				.from("rental_applications")
				.select("applicant_email")
				.eq("id", seeded)
				.single();
			expect(stillOriginal?.applicant_email).toBe(after?.applicant_email);
		});

		it("A7: owner B cannot read owner A's application", async () => {
			const seeded = await seedApplication();

			// Positive control first — without it the negative passes against a row
			// that was never written.
			const { count: aCount } = await clientA
				.from("rental_applications")
				.select("id", { count: "exact", head: true })
				.eq("id", seeded);
			expect(aCount).toBe(1);

			const { count: bCount } = await clientB
				.from("rental_applications")
				.select("id", { count: "exact", head: true })
				.eq("id", seeded);
			expect(bCount).toBe(0);
		});

		// ═════════════════════════════════════════════════════════════════════════
		// GROUP B — the caps. The lifetime cap is set directly rather than walked
		// to by 250 real submissions: the rolling-hour cap would fire at 25 first,
		// and 250 live rows on production for a test is not a trade worth making.
		// ═════════════════════════════════════════════════════════════════════════

		it("B1: the lifetime cap boundary is exactly 250", async () => {
			const link = await seedLink({ submission_count: LIFETIME_CAP - 1 });

			// At 249 the next submission is still accepted. Without this half, an
			// off-by-one that capped at 249 would pass.
			const accepted = await submit(link, randomUUID());
			expect(accepted.row?.success).toBe(true);
			expect(accepted.row?.reason).toBeNull();
			expect(await submissionCount(link.id)).toBe(LIFETIME_CAP);

			const refused = await submit(link, randomUUID());
			expect(refused.row?.success).toBe(false);
			expect(refused.row?.reason).toBe("link_capped");
			expect(refused.row?.application_id).toBeNull();

			// One row, not two.
			expect(await countForLink(link.id)).toBe(1);
			expect(await submissionCount(link.id)).toBe(LIFETIME_CAP);
		});

		it("B2: the cap holds under genuine concurrency (FOR UPDATE, T-66-05/F-6)", async () => {
			const link = await seedLink({ submission_count: LIFETIME_CAP - 1 });
			const parallel = 5;
			const ids = Array.from({ length: parallel }, () => randomUUID());

			// GENUINELY parallel: five independent HTTPS requests to PostgREST,
			// dispatched together, each landing in its own transaction. Without the
			// `select ... for update` on the link row, all five read
			// submission_count = 249, all five pass the cap check and all five
			// insert — the classic check-then-act race, and one a sequential loop
			// cannot see.
			const results = await Promise.all(
				ids.map((submissionId) => submit(link, submissionId)),
			);

			const succeeded = results.filter((r) => r.row?.success === true);
			const capped = results.filter((r) => r.row?.reason === "link_capped");
			expect(succeeded).toHaveLength(1);
			expect(capped).toHaveLength(parallel - 1);

			// The delta is the assertion that discriminates. Exactly one row, and
			// the counter advanced exactly once.
			expect(await countForLink(link.id)).toBe(1);
			expect(await submissionCount(link.id)).toBe(LIFETIME_CAP);
		}, 60_000);

		it("B3: the rolling-hour cap refuses the 26th submission in an hour", async () => {
			const link = await seedLink();

			// 24 rows backdated within the hour, then one REAL submission. That
			// makes the 25th a proven acceptance rather than a seeded row, so the
			// refusal below is a boundary and not an artefact of direct inserts.
			const bulk = Array.from({ length: HOUR_CAP - 1 }, (_unused, i) => ({
				owner_user_id: ownerAId,
				link_id: link.id,
				unit_id: unitAId!,
				property_label: `${RUN_TAG} property`,
				unit_label: "A1",
				submission_id: randomUUID(),
				occupant_count: 1,
				certified_at: new Date().toISOString(),
				created_at: new Date(Date.now() - (i + 1) * 60_000).toISOString(),
				applicant_first_name: "Burst",
				applicant_last_name: `Applicant${i}`,
				applicant_email: `${RUN_TAG}-burst-${i}@example.com`,
			}));
			const { data: inserted, error } = await service
				.from("rental_applications")
				.insert(bulk)
				.select("id");
			expect(error).toBeNull();
			for (const row of inserted ?? []) createdAppIds.add(row.id);
			expect(await countForLink(link.id)).toBe(HOUR_CAP - 1);

			const accepted = await submit(link, randomUUID());
			expect(accepted.row?.success).toBe(true);
			expect(accepted.row?.reason).toBeNull();
			expect(await countForLink(link.id)).toBe(HOUR_CAP);

			const refused = await submit(link, randomUUID());
			expect(refused.row?.success).toBe(false);
			expect(refused.row?.reason).toBe("rate_capped");
			expect(await countForLink(link.id)).toBe(HOUR_CAP);
		}, 60_000);

		it("B4: a revoked link and an expired link are both refused, by distinct reasons", async () => {
			const revoked = await seedLink({
				revoked_at: new Date().toISOString(),
			});
			const revokedResult = await submit(revoked, randomUUID());
			expect(revokedResult.row?.success).toBe(false);
			expect(revokedResult.row?.reason).toBe("revoked_token");
			expect(await countForLink(revoked.id)).toBe(0);

			const expired = await seedLink({
				expires_at: new Date(Date.now() - 1000).toISOString(),
			});
			const expiredResult = await submit(expired, randomUUID());
			expect(expiredResult.row?.success).toBe(false);
			expect(expiredResult.row?.reason).toBe("expired_token");
			expect(await countForLink(expired.id)).toBe(0);

			// An unknown hash is invalid_token and writes nothing.
			const unknown = await submit(
				{ id: NONEXISTENT_ID, raw: "x", hash: `${RUN_TAG}-no-such-hash` },
				randomUUID(),
			);
			expect(unknown.row?.success).toBe(false);
			expect(unknown.row?.reason).toBe("invalid_token");
		});

		// ═════════════════════════════════════════════════════════════════════════
		// GROUP C — idempotency, payload refusal, and the D-06 column contract.
		// ═════════════════════════════════════════════════════════════════════════

		it("C1: a repeated submission_id reports success, writes one row, increments once", async () => {
			const link = await seedLink();
			const submissionId = randomUUID();

			const first = await submit(link, submissionId);
			expect(first.row?.success).toBe(true);
			expect(first.row?.reason).toBeNull();
			expect(first.row?.application_id).toBeTruthy();

			const second = await submit(link, submissionId);
			// The applicant's data IS stored; telling them otherwise makes them
			// submit again.
			expect(second.row?.success).toBe(true);
			expect(second.row?.reason).toBe("duplicate");
			expect(second.row?.application_id).toBeNull();

			const { count } = await service
				.from("rental_applications")
				.select("id", { count: "exact", head: true })
				.eq("submission_id", submissionId);
			expect(count).toBe(1);

			// All three assertions matter. A duplicate branch that still incremented
			// would let a flaky connection walk the lifetime cap toward zero without
			// a single extra application being stored.
			expect(await submissionCount(link.id)).toBe(1);
			expect(await countForLink(link.id)).toBe(1);
		});

		it("C2: a payload missing a required key is refused and writes nothing", async () => {
			const link = await seedLink();
			const incomplete = makePayload();
			delete incomplete["email"];

			const refused = await submit(link, randomUUID(), incomplete);
			expect(refused.row?.success).toBe(false);
			expect(refused.row?.reason).toBe("invalid_payload");
			expect(refused.row?.application_id).toBeNull();
			expect(await countForLink(link.id)).toBe(0);
			expect(await submissionCount(link.id)).toBe(0);

			// A false attestation is a refusal too: an application recorded without
			// the UI-05 certification is not evidence of anything.
			const uncertified = await submit(
				link,
				randomUUID(),
				makePayload({ certified: false }),
			);
			expect(uncertified.row?.reason).toBe("invalid_payload");
			expect(await countForLink(link.id)).toBe(0);

			// Positive control on the SAME link: the refusals above are the payload,
			// not a dead link.
			const accepted = await submit(link, randomUUID());
			expect(accepted.row?.success).toBe(true);
			expect(await countForLink(link.id)).toBe(1);
		});

		it("C3: the D-06 forbidden columns do not exist, and an ssn in the payload is stored nowhere", async () => {
			// Positive control: the probe mechanism works and a real column selects
			// cleanly, so the errors below mean "no such column".
			const control = await service
				.from("rental_applications")
				.select("id")
				.limit(1);
			expect(control.error).toBeNull();

			for (const column of FORBIDDEN_COLUMNS) {
				const { data, error } = await service
					.from("rental_applications")
					.select(column)
					.limit(1);
				// A schema-level assertion: it cannot be satisfied by a passing code
				// path, only by the column genuinely being absent.
				expect(
					error !== null,
					`column ${column} must not exist on rental_applications`,
				).toBe(true);
				expect(data).toBeNull();
			}

			// Key-level REJECTION of an ssn is the Edge Function's job
			// (parseSubmissionPayload rejects unknown keys; unit-tested by
			// supabase/functions/__tests__/application-guards.test.ts). The RPC takes
			// p_payload jsonb and does not enumerate keys, so what is asserted HERE
			// is the storage layer: a payload carrying an ssn stores it nowhere.
			const link = await seedLink();
			const secret = "078-05-1120";
			const submissionId = randomUUID();
			const accepted = await submit(
				link,
				submissionId,
				makePayload({ ssn: secret, date_of_birth: "1990-01-01" }),
			);
			expect(accepted.row?.success).toBe(true);

			const { data: stored } = await service
				.from("rental_applications")
				.select("*")
				.eq("submission_id", submissionId)
				.single();
			expect(stored).toBeTruthy();
			for (const column of FORBIDDEN_COLUMNS) {
				expect(Object.keys(stored ?? {})).not.toContain(column);
			}
			// Nothing retrievable holds the value, in any column, under any name.
			expect(JSON.stringify(stored)).not.toContain(secret);
			expect(JSON.stringify(stored)).not.toContain("1990-01-01");
		});

		// ═════════════════════════════════════════════════════════════════════════
		// GROUP D — status transitions, the retention clock, and conversion.
		// ═════════════════════════════════════════════════════════════════════════

		it("D1: set_application_status accepts the four D-07 values and rejects anything else", async () => {
			const appId = await seedApplication({ status: "new" });

			for (const status of ["reviewing", "approved", "new"]) {
				const { error } = await clientA.rpc("set_application_status", {
					p_application_id: appId,
					p_status: status,
				});
				expect(error, `status ${status} should be accepted`).toBeNull();
				const { data } = await service
					.from("rental_applications")
					.select("status")
					.eq("id", appId)
					.single();
				expect(data?.status).toBe(status);
			}

			const rejected = await clientA.rpc("set_application_status", {
				p_application_id: appId,
				p_status: "rejected",
				p_disposition_reason: "another_applicant_selected",
			});
			expect(rejected.error).toBeNull();

			const nonsense = await clientA.rpc("set_application_status", {
				p_application_id: appId,
				p_status: "nonsense",
			});
			expect(nonsense.error?.message).toBe("invalid application status");

			// Still rejected — the refusal refused.
			const { data: after } = await service
				.from("rental_applications")
				.select("status")
				.eq("id", appId)
				.single();
			expect(after?.status).toBe("rejected");
		});

		it("D2: a decline requires a closed-vocabulary reason", async () => {
			const appId = await seedApplication({ status: "new" });

			const noReason = await clientA.rpc("set_application_status", {
				p_application_id: appId,
				p_status: "rejected",
			});
			expect(noReason.error?.message).toBe("a decline reason is required");

			const badReason = await clientA.rpc("set_application_status", {
				p_application_id: appId,
				p_status: "rejected",
				p_disposition_reason: "did not like them",
			});
			expect(badReason.error?.message).toBe("invalid decline reason");

			// Neither refusal changed the row.
			const { data: untouched } = await service
				.from("rental_applications")
				.select("status, decided_at, disposition_reason")
				.eq("id", appId)
				.single();
			expect(untouched?.status).toBe("new");
			expect(untouched?.decided_at).toBeNull();

			const good = await clientA.rpc("set_application_status", {
				p_application_id: appId,
				p_status: "rejected",
				p_disposition_reason: "income_requirement",
			});
			expect(good.error).toBeNull();

			const { data: decided } = await service
				.from("rental_applications")
				.select("status, decided_at, disposition_reason")
				.eq("id", appId)
				.single();
			expect(decided?.status).toBe("rejected");
			expect(decided?.decided_at).not.toBeNull();
			expect(decided?.disposition_reason).toBe("income_requirement");

			// A reason on a non-decline is refused: disposition_reason is the
			// decision record, not a general note field.
			const misplaced = await clientA.rpc("set_application_status", {
				p_application_id: appId,
				p_status: "reviewing",
				p_disposition_reason: "income_requirement",
			});
			expect(misplaced.error?.message).toBe(
				"a decline reason applies only to a declined application",
			);
		});

		it("D3: decided_at is coalesced across terminal transitions", async () => {
			const appId = await seedApplication({ status: "new" });

			await clientA.rpc("set_application_status", {
				p_application_id: appId,
				p_status: "approved",
			});
			const { data: firstDecision } = await service
				.from("rental_applications")
				.select("decided_at")
				.eq("id", appId)
				.single();
			const original = firstDecision?.decided_at;
			expect(original).not.toBeNull();

			// approved -> rejected is terminal -> terminal, so decided_at is written
			// with coalesce(decided_at, now()) and the FIRST decision survives. A
			// bare now() here would push the anonymization date forward every time
			// an owner changed their mind, holding applicant PII past policy.
			await clientA.rpc("set_application_status", {
				p_application_id: appId,
				p_status: "rejected",
				p_disposition_reason: "another_applicant_selected",
			});
			const { data: secondDecision } = await service
				.from("rental_applications")
				.select("decided_at")
				.eq("id", appId)
				.single();
			expect(secondDecision?.decided_at).toBe(original);
		});

		it("D4: returning to a non-terminal status CLEARS decided_at and restarts the retention clock", async () => {
			// PINS ACTUAL SHIPPED BEHAVIOUR, WHICH CONTRADICTS 66-04-SUMMARY.
			//
			// That summary claims "a status flipped approved -> reviewing ->
			// approved does not push the anonymization date forward". The shipped
			// function (20260807003555_rental_application_rpcs.sql) has two UPDATE
			// branches, and the non-terminal branch sets `decided_at = null`
			// outright. So the coalesce protects terminal -> terminal only (D3
			// above), and a round trip through `reviewing` DOES re-stamp the clock.
			//
			// This test asserts what production actually does. The behaviour is
			// deliberate per that migration's own comment ("leaving a stale
			// timestamp would age an undecided row from a decision that was
			// withdrawn"), but the retention-clock claim built on top of it is
			// wrong, and this assertion is what makes any future change to either
			// side visible instead of silent.
			const appId = await seedApplication({ status: "new" });

			await clientA.rpc("set_application_status", {
				p_application_id: appId,
				p_status: "approved",
			});
			const { data: first } = await service
				.from("rental_applications")
				.select("decided_at")
				.eq("id", appId)
				.single();
			const original = first?.decided_at;
			expect(original).not.toBeNull();

			await clientA.rpc("set_application_status", {
				p_application_id: appId,
				p_status: "reviewing",
			});
			const { data: cleared } = await service
				.from("rental_applications")
				.select("decided_at, disposition_reason")
				.eq("id", appId)
				.single();
			expect(cleared?.decided_at).toBeNull();
			expect(cleared?.disposition_reason).toBeNull();

			await clientA.rpc("set_application_status", {
				p_application_id: appId,
				p_status: "approved",
			});
			const { data: restamped } = await service
				.from("rental_applications")
				.select("decided_at")
				.eq("id", appId)
				.single();
			expect(restamped?.decided_at).not.toBeNull();
			expect(restamped?.decided_at).not.toBe(original);
		});

		it("D5: owner B cannot change the status of owner A's application", async () => {
			const appId = await seedApplication({ status: "new" });

			const notYours = await clientB.rpc("set_application_status", {
				p_application_id: appId,
				p_status: "approved",
			});
			const notFound = await clientB.rpc("set_application_status", {
				p_application_id: NONEXISTENT_ID,
				p_status: "approved",
			});
			expect(notYours.error?.message).toBe("application not found");
			expect(notYours.error?.message).toBe(notFound.error?.message);

			// The refusal refused...
			const { data: untouched } = await service
				.from("rental_applications")
				.select("status")
				.eq("id", appId)
				.single();
			expect(untouched?.status).toBe("new");

			// ...and the same call from the owner succeeds, so the refusal is
			// ownership and not a malformed request.
			const mine = await clientA.rpc("set_application_status", {
				p_application_id: appId,
				p_status: "approved",
			});
			expect(mine.error).toBeNull();
		});

		it("D6: owner B cannot write owner A's notes", async () => {
			const appId = await seedApplication();

			const notYours = await clientB.rpc("set_application_notes", {
				p_application_id: appId,
				p_notes: "owner B was here",
			});
			expect(notYours.error?.message).toBe("application not found");

			const mine = await clientA.rpc("set_application_notes", {
				p_application_id: appId,
				p_notes: "  owner A note  ",
			});
			expect(mine.error).toBeNull();

			const { data } = await service
				.from("rental_applications")
				.select("owner_notes")
				.eq("id", appId)
				.single();
			// Trimmed, and blank normalizes to NULL so "no notes" has exactly one
			// representation.
			expect(data?.owner_notes).toBe("owner A note");

			await clientA.rpc("set_application_notes", {
				p_application_id: appId,
				p_notes: "   ",
			});
			const { data: blanked } = await service
				.from("rental_applications")
				.select("owner_notes")
				.eq("id", appId)
				.single();
			expect(blanked?.owner_notes).toBeNull();
		});

		it("D7: record_application_conversion stamps once and refuses a second call", async () => {
			const appId = await seedApplication({ status: "new" });

			const { data, error } = await clientA.rpc(
				"record_application_conversion",
				{ p_application_id: appId, p_tenant_id: tenantAId! },
			);
			expect(error).toBeNull();
			const row: ConversionRow | undefined = data?.[0];
			expect(row?.success).toBe(true);
			expect(row?.reason).toBeNull();

			const { data: converted } = await service
				.from("rental_applications")
				.select("converted_tenant_id, converted_at, status, decided_at")
				.eq("id", appId)
				.single();
			expect(converted?.converted_tenant_id).toBe(tenantAId);
			expect(converted?.converted_at).not.toBeNull();
			expect(converted?.status).toBe("approved");
			expect(converted?.decided_at).not.toBeNull();

			const repeat = await clientA.rpc("record_application_conversion", {
				p_application_id: appId,
				p_tenant_id: tenantAId!,
			});
			const repeatRow: ConversionRow | undefined = repeat.data?.[0];
			// Returned, not raised: a double-click on a slow network is benign, and
			// enforcing it in the RPC rather than the UI is what stops a second
			// tenant being minted (T-66-20).
			expect(repeatRow?.success).toBe(false);
			expect(repeatRow?.reason).toBe("already_converted");

			const { data: unchanged } = await service
				.from("rental_applications")
				.select("converted_tenant_id")
				.eq("id", appId)
				.single();
			expect(unchanged?.converted_tenant_id).toBe(tenantAId);

			// Once converted, the status is settled: a flip to rejected would leave
			// a live tenant whose originating application says they were declined.
			const flip = await clientA.rpc("set_application_status", {
				p_application_id: appId,
				p_status: "rejected",
				p_disposition_reason: "applicant_withdrew",
			});
			expect(flip.error?.message).toBe(
				"application already converted to a tenant",
			);
		});

		it("D8: conversion refuses another owner's tenant", async () => {
			const appId = await seedApplication({ status: "new" });

			// Verifying only the application would let an owner point their own
			// application at another owner's tenant id (T-66-14).
			const crossOwner = await clientA.rpc("record_application_conversion", {
				p_application_id: appId,
				p_tenant_id: tenantBId!,
			});
			expect(crossOwner.error?.message).toBe("tenant not found");

			const { data: untouched } = await service
				.from("rental_applications")
				.select("converted_tenant_id")
				.eq("id", appId)
				.single();
			expect(untouched?.converted_tenant_id).toBeNull();

			// Positive control: the same application converts against a tenant the
			// caller does own.
			const mine = await clientA.rpc("record_application_conversion", {
				p_application_id: appId,
				p_tenant_id: tenantAId!,
			});
			const row: ConversionRow | undefined = mine.data?.[0];
			expect(row?.success).toBe(true);
		});

		it("D9: deleting a tenant leaves the application; deleting an application leaves the tenant", async () => {
			const appId = await seedApplication({ status: "new" });
			const { data: firstTenant } = await service
				.from("tenants")
				.insert({
					owner_user_id: ownerAId,
					name: `${RUN_TAG} d9 tenant 1`,
					email: `${RUN_TAG}-d9-1@example.com`,
				})
				.select("id")
				.single();
			const tenant1 = firstTenant!.id;
			extraTenantIds.add(tenant1);

			const convert1 = await clientA.rpc("record_application_conversion", {
				p_application_id: appId,
				p_tenant_id: tenant1,
			});
			expect(convert1.data?.[0]?.success).toBe(true);

			// Direction 1 — delete the tenant. converted_tenant_id is ON DELETE SET
			// NULL, so the application survives with a null pointer, which the
			// detail page renders honestly rather than as an error.
			await service.from("tenants").delete().eq("id", tenant1);
			extraTenantIds.delete(tenant1);

			const { data: survivingApp } = await service
				.from("rental_applications")
				.select("id, converted_tenant_id")
				.eq("id", appId)
				.single();
			expect(survivingApp?.id).toBe(appId);
			expect(survivingApp?.converted_tenant_id).toBeNull();

			// Direction 2 — delete the application. NOTHING points from tenants back
			// to rental_applications, so no cascade can reach the tenant.
			const { data: secondTenant } = await service
				.from("tenants")
				.insert({
					owner_user_id: ownerAId,
					name: `${RUN_TAG} d9 tenant 2`,
					email: `${RUN_TAG}-d9-2@example.com`,
				})
				.select("id")
				.single();
			const tenant2 = secondTenant!.id;
			extraTenantIds.add(tenant2);

			const convert2 = await clientA.rpc("record_application_conversion", {
				p_application_id: appId,
				p_tenant_id: tenant2,
			});
			expect(convert2.data?.[0]?.success).toBe(true);

			await service.from("notifications").delete().eq("entity_id", appId);
			await service.from("rental_applications").delete().eq("id", appId);
			createdAppIds.delete(appId);

			const { count: appGone } = await service
				.from("rental_applications")
				.select("id", { count: "exact", head: true })
				.eq("id", appId);
			expect(appGone).toBe(0);

			const { count: tenantAlive } = await service
				.from("tenants")
				.select("id", { count: "exact", head: true })
				.eq("id", tenant2);
			expect(tenantAlive).toBe(1);
		}, 60_000);

		// ═════════════════════════════════════════════════════════════════════════
		// GROUP E — the deployed apply-token boundary.
		//
		// These live here rather than in Playwright because Node has no CORS: a
		// browser POST from localhost:3050 would be refused by the function's
		// exact-match origin check, and stubbing that response in a browser test
		// would prove nothing about the server. Every assertion is on ROW COUNT,
		// not HTTP status — the honeypot answers an indistinguishable 200 by
		// design, so status alone proves nothing.
		// ═════════════════════════════════════════════════════════════════════════

		async function postApply(
			body: Record<string, unknown>,
		): Promise<{ status: number; json: Record<string, unknown> }> {
			const res = await fetch(`${SUPABASE_URL}/functions/v1/apply-token`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const json = (await res.json().catch(() => ({}))) as Record<
				string,
				unknown
			>;
			return { status: res.status, json };
		}

		it("E1: a tripped honeypot answers 200 success and writes zero rows", async (ctx) => {
			if (!applyFnDeployed) ctx.skip();
			const link = await seedLink();

			const { status, json } = await postApply({
				action: "submit",
				token: link.raw,
				submission_id: randomUUID(),
				company_website: "http://spam.example.com",
				form_loaded_at: Date.now() - 10_000,
				application: makePayload(),
			});
			expect(status).toBe(200);
			// Indistinguishable from acceptance, on purpose: a 400 tells the bot
			// which field is the trap.
			expect(json["success"]).toBe(true);
			expect(await countForLink(link.id)).toBe(0);
			expect(await submissionCount(link.id)).toBe(0);
		}, 60_000);

		it("E2: a machine-fast form_loaded_at answers 200 success and writes zero rows", async (ctx) => {
			if (!applyFnDeployed) ctx.skip();
			const link = await seedLink();

			const { status, json } = await postApply({
				action: "submit",
				token: link.raw,
				submission_id: randomUUID(),
				form_loaded_at: Date.now(),
				application: makePayload(),
			});
			expect(status).toBe(200);
			expect(json["success"]).toBe(true);
			expect(await countForLink(link.id)).toBe(0);
			expect(await submissionCount(link.id)).toBe(0);
		}, 60_000);

		it("E3: a clean submission writes exactly one row with a lowercased email", async (ctx) => {
			if (!applyFnDeployed) ctx.skip();
			const link = await seedLink();
			const mixedCase = `${RUN_TAG}-MixedCase@Example.COM`;

			const { status, json } = await postApply({
				action: "submit",
				token: link.raw,
				submission_id: randomUUID(),
				form_loaded_at: Date.now() - 10_000,
				application: makePayload({ email: mixedCase }),
			});
			expect(status).toBe(200);
			expect(json["success"]).toBe(true);
			expect(json["reason"]).toBeNull();

			expect(await countForLink(link.id)).toBe(1);
			expect(await submissionCount(link.id)).toBe(1);

			const { data: written } = await service
				.from("rental_applications")
				.select("id, applicant_email, owner_user_id, unit_id, status")
				.eq("link_id", link.id)
				.single();
			expect(written?.applicant_email).toBe(mixedCase.toLowerCase());
			expect(written?.owner_user_id).toBe(ownerAId);
			expect(written?.unit_id).toBe(unitAId);
			expect(written?.status).toBe("new");
			if (written?.id) createdAppIds.add(written.id);
		}, 60_000);

		it("E4: the context action answers uniformly for an unknown token", async (ctx) => {
			if (!applyFnDeployed) ctx.skip();

			const garbage = await postApply({
				action: "context",
				token: "not-a-real-token",
			});
			const wellFormed = await postApply({
				action: "context",
				token: makeRawToken(),
			});

			expect(garbage.status).toBe(200);
			expect(wellFormed.status).toBe(200);
			// Byte-identical: a caller cannot distinguish "malformed" from
			// "well-formed but unknown", which is what stops a brute-forcer learning
			// when they have found a real token (T-66-01/T-66-02).
			expect(JSON.stringify(garbage.json)).toBe(
				JSON.stringify(wellFormed.json),
			);
			expect(garbage.json["valid"]).toBe(false);
			expect(garbage.json["reason"]).toBe("invalid_token");
		}, 60_000);

		it("E5: a revoked link's context answer carries no listing detail", async (ctx) => {
			if (!applyFnDeployed) ctx.skip();
			const link = await seedLink({ revoked_at: new Date().toISOString() });

			const { status, json } = await postApply({
				action: "context",
				token: link.raw,
			});
			expect(status).toBe(200);
			expect(json["valid"]).toBe(false);
			expect(json["reason"]).toBe("revoked_token");
			// No listing block at all — anyone still holding a dead link must not be
			// able to confirm which property it belonged to.
			expect(json["listing"]).toBeUndefined();
			expect(JSON.stringify(json)).not.toContain(RUN_TAG);
		}, 60_000);
	},
);
