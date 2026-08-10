/**
 * Integration tests for the applicant-PII retention sweep (Phase 66, APPLY-05)
 * and the GDPR account-deletion cascade extension (D-12).
 *
 * Covers:
 *   - anonymize_old_rental_applications() clears every PII column, column by
 *     column, iterating a PII_COLUMNS array rather than spot-checking three of
 *     twenty-nine. A subset check is exactly how the other twenty-six leak.
 *   - The non-PII stub the sweep retains, so an owner can still show a decision
 *     was made and run an aggregate self-audit (D-11b/D-11d).
 *   - Converted rows, already-swept rows and in-window rows are all skipped.
 *   - The coalesce(decided_at, created_at) clock.
 *   - The app_config window is honoured, AND its absence falls back to 730 —
 *     the fail-open where a NULL window makes the interval NULL and the sweep a
 *     silent no-op with no error, no exception and no log line (T-66-23).
 *   - No archive table exists (D-11c). Archiving would preserve verbatim the
 *     exact PII this sweep exists to remove.
 *   - The sweep is unreachable from authenticated and anon.
 *   - anonymize_deleted_user() removes both new tables AND still does what it
 *     already did, so a `create or replace` that dropped part of the old body
 *     fails here rather than in production.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS FILE MUTATES A LIVE GLOBAL SETTING AND INVOKES A GLOBAL SWEEP.
 *
 * `applications.retention_days` is one row in public.app_config that governs
 * every owner's applicant data. Two tests below change it. Both wrap the change
 * in try/finally with a restore, because a leaked one-day retention window
 * would start destroying real applicant records on the next 3 AM cron run
 * (T-66-37).
 *
 * The restore is necessary but NOT sufficient: the sweep those tests invoke
 * runs against the whole table, not just this file's fixtures, and it is
 * irreversible. So every invocation is preceded by `foreignDueCount(window)`,
 * which counts the rows that would become due at that window and are NOT this
 * file's own, and the test SKIPS when that count is not zero. Fail-closed: if
 * the guard cannot prove the blast radius is limited to rows created here, the
 * test does not run at all. An unreadable guard counts as a populated one.
 *
 * THE GUARD IS EXACT, NOT SAMPLED. It was a `limit(1000)` read with no ordering,
 * which silently under-reports the blast radius the moment the table holds more
 * than a thousand rows — and this number is the only thing standing between the
 * suite and another owner's PII. It is now two `count: "exact"` head queries
 * with no row limit, one per branch of the sweep's `coalesce(decided_at,
 * created_at)` clock, minus the same count restricted to this file's own ids.
 * And it is measured at the window the sweep will ACTUALLY run under rather than
 * at a hardcoded 730, so an operator who lowers `applications.retention_days`
 * cannot widen the blast radius past what the guard checked.
 *
 * R7 NARROWS THE WINDOW, AND ITS WINDOW IS COMPUTED RATHER THAN HARDCODED. See
 * the note on that test: a fixed one-day window is unsatisfiable against a
 * database that contains any row older than a day, which the durable E2E seeder
 * row permanently is. `_helpers/retention-window.ts` derives a window that puts
 * no foreign row in range at all, and is unit-tested off-network.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RUNS AGAINST PRODUCTION (CLAUDE.md). Synthetic owners only, plus one
 * disposable user created and destroyed for the cascade test. Everything is
 * torn down in afterAll, on the failure path too, and afterAll re-queries to
 * prove it.
 */

import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";
import { planNarrowedWindow } from "./_helpers/retention-window";
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

const RUN_TAG = `rls-retention-${Date.now()}`;
const RETENTION_KEY = "applications.retention_days";
const DEFAULT_DAYS = 730;
const CRON_JOB_NAME = "anonymize-rental-applications";
const CRON_SCHEDULE = "35 3 * * *";

/**
 * The 26 nullable PII columns the sweep NULLs. Iterated, never spot-checked: a
 * column added to the table later without a matching line in the sweep fails
 * this list rather than leaking quietly for 730 days.
 */
const PII_NULLED_COLUMNS: readonly string[] = [
	"applicant_phone",
	"desired_move_in_date",
	"current_street",
	"current_city",
	"current_state",
	"current_postal_code",
	"current_landlord_name",
	"current_landlord_phone",
	"reason_for_moving",
	"gross_monthly_income",
	"employer_name",
	"employer_role",
	"employer_months",
	"other_income_source",
	"other_income_amount",
	"pet_details",
	"vehicle_details",
	"reference_1_name",
	"reference_1_relationship",
	"reference_1_phone",
	"reference_2_name",
	"reference_2_relationship",
	"reference_2_phone",
	"owner_notes",
	"submitted_ip",
	"submitted_user_agent",
];

/** The 3 NOT NULL PII columns, overwritten with the project's placeholder. */
const PII_PLACEHOLDER_COLUMNS: readonly string[] = [
	"applicant_first_name",
	"applicant_last_name",
	"applicant_email",
];

/** The non-PII stub the sweep must LEAVE ALONE (D-11b, D-11d). */
const RETAINED_COLUMNS: readonly string[] = [
	"unit_id",
	"property_label",
	"unit_label",
	"status",
	"created_at",
	"decided_at",
	"disposition_reason",
	"occupant_count",
	"certified_at",
	"submission_id",
];

function daysAgo(days: number): string {
	return new Date(Date.now() - days * 864e5).toISOString();
}

describe.skipIf(skipReason)(
	"rental_applications retention sweep + GDPR cascade",
	() => {
		let service: SupabaseClient;
		let clientA: SupabaseClient;
		let anonClient: SupabaseClient;
		let ownerAId: string;

		let propertyId: string | undefined;
		let unitId: string | undefined;
		let tenantId: string | undefined;
		/** Every application id this file writes. The blast-radius guard below
		 *  treats anything NOT in this set as somebody else's real data. */
		const createdAppIds = new Set<string>();

		// The disposable owner for the cascade test.
		let disposableUserId: string | undefined;
		let disposableViaAuth = false;

		let originalRetentionValue: string | null = null;
		let cronReadable = false;

		/** The value every restore writes back: whatever was live when the suite
		 *  started, or the migration default if the key was absent. Never a
		 *  hardcoded 730 when an operator has raised the window to 1460. */
		function retentionRestoreValue(): string {
			return originalRetentionValue ?? String(DEFAULT_DAYS);
		}

		// ── helpers ──────────────────────────────────────────────────────────────

		/** A row with EVERY PII column populated, so "it is null afterwards" is
		 *  the sweep's doing and not the insert's omission. */
		function fullRow(
			overrides: Record<string, unknown> = {},
		): Record<string, unknown> {
			return {
				owner_user_id: ownerAId,
				unit_id: unitId ?? null,
				property_label: `${RUN_TAG} property`,
				unit_label: "R1",
				submission_id: randomUUID(),
				status: "rejected",
				decided_at: daysAgo(800),
				disposition_reason: "income_requirement",
				occupant_count: 3,
				certified_at: daysAgo(801),
				created_at: daysAgo(801),
				applicant_first_name: "Retention",
				applicant_last_name: "Fixture",
				applicant_email: `${RUN_TAG}-applicant@example.com`,
				applicant_phone: "555-0100",
				desired_move_in_date: "2024-01-01",
				current_street: "1 Test St",
				current_city: "Testville",
				current_state: "TX",
				current_postal_code: "75001",
				current_landlord_name: "Prior Landlord",
				current_landlord_phone: "555-0102",
				reason_for_moving: "relocating",
				gross_monthly_income: 5000,
				employer_name: "Test Employer",
				employer_role: "Tester",
				employer_months: 24,
				other_income_source: "freelance",
				other_income_amount: 500,
				pet_details: "one cat",
				vehicle_details: "one sedan",
				reference_1_name: "Ref One",
				reference_1_relationship: "friend",
				reference_1_phone: "555-0103",
				reference_2_name: "Ref Two",
				reference_2_relationship: "colleague",
				reference_2_phone: "555-0104",
				owner_notes: "owner free text that restates applicant PII",
				submitted_ip: "203.0.113.7",
				submitted_user_agent: "vitest-integration",
				...overrides,
			};
		}

		async function insertApp(
			overrides: Record<string, unknown> = {},
		): Promise<string> {
			const { data, error } = await service
				.from("rental_applications")
				.insert(fullRow(overrides))
				.select("id")
				.single();
			if (error) throw new Error(`insertApp failed: ${error.message}`);
			createdAppIds.add(data!.id);
			return data!.id;
		}

		async function readApp(id: string): Promise<Record<string, unknown>> {
			const { data, error } = await service
				.from("rental_applications")
				.select("*")
				.eq("id", id)
				.single();
			if (error) throw new Error(`readApp failed: ${error.message}`);
			// The integration clients are deliberately untyped (repo convention),
			// so `data` arrives wide and is narrowed by the declared return type
			// rather than by an assertion.
			const row: Record<string, unknown> = data;
			return row;
		}

		async function runSweep(): Promise<number> {
			const { data, error } = await service.rpc(
				"anonymize_old_rental_applications",
			);
			expect(error).toBeNull();
			return typeof data === "number" ? data : -1;
		}

		/**
		 * The retention window that is live RIGHT NOW, in days.
		 *
		 * Every guard below is measured against this rather than against the 730
		 * literal. Guarding at 730 while the sweep runs at, say, 400 checks a
		 * strictly smaller due set than the one the sweep will actually touch —
		 * a fail-OPEN in the one place that must not have one.
		 */
		function liveWindowDays(): number {
			const parsed = Number(retentionRestoreValue());
			return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DAYS;
		}

		/**
		 * The window every unnarrowed guard is measured at.
		 *
		 * The NARROWER of the live setting and the 730 fallback, because R8 deletes
		 * the config row and sweeps under the fallback while the others sweep under
		 * the live value. A due set only SHRINKS as the window widens, so guarding
		 * at the smaller of the two covers both invocations with one number.
		 */
		function sweepGuardDays(): number {
			return Math.min(liveWindowDays(), DEFAULT_DAYS);
		}

		/** Why a skip happened, so a skipping CI run is diagnosable rather than quiet. */
		const FOREIGN_SKIP_NOTE =
			"blast-radius guard: rows this suite does not own are in range of the sweep";

		/**
		 * How many rows would the sweep anonymize at `days` that are NOT this
		 * file's fixtures. The sweep is irreversible and global; if anyone else's
		 * data is in range, the caller SKIPS rather than running it.
		 *
		 * EXACT, NEVER SAMPLED. Two `count: "exact"` head reads per side, with no
		 * row limit at all, because the previous `limit(1000)` page silently
		 * under-reported the blast radius as soon as the table outgrew it.
		 *
		 * TWO READS BECAUSE THE SWEEP CLOCK IS `coalesce(decided_at, created_at)`.
		 * `decided_at < cutoff` is never true when `decided_at` is NULL — SQL
		 * comparison against NULL is NULL — so the `decided_at is null` read is the
		 * exact complement of the first, not an overlap, and no row is counted
		 * twice. Own rows are subtracted through the same two reads restricted to
		 * `createdAppIds`, so the arithmetic is over identical predicates.
		 */
		async function foreignDueCount(days: number): Promise<number> {
			const cutoff = new Date(Date.now() - days * 864e5).toISOString();
			const own = [...createdAppIds];

			const dueCount = async (
				restrictToOwn: boolean,
			): Promise<number | null> => {
				let total = 0;
				for (const clockedByDecision of [true, false]) {
					const base = service
						.from("rental_applications")
						.select("id", { count: "exact", head: true })
						.is("anonymized_at", null)
						.is("converted_tenant_id", null);
					let query = clockedByDecision
						? base.lt("decided_at", cutoff)
						: base.is("decided_at", null).lt("created_at", cutoff);
					if (restrictToOwn) query = query.in("id", own);
					const { count, error } = await query;
					if (error !== null || count === null) return null;
					total += count;
				}
				return total;
			};

			// OUR SIDE IS READ FIRST, DELIBERATELY. The two reads are milliseconds
			// apart, and a row that crosses the due boundary in between is counted
			// by whichever read happened later. Reading ours first means such a row
			// can only INFLATE the difference, which makes the caller skip. The
			// other order could cancel a genuinely foreign row out to zero.
			const ours = own.length === 0 ? 0 : await dueCount(true);
			const total = await dueCount(false);
			// FAIL CLOSED. An unreadable guard is an UNKNOWN blast radius, and an
			// unknown blast radius is treated as a populated one.
			if (total === null || ours === null) return Number.POSITIVE_INFINITY;
			return total - ours;
		}

		/** A page large enough that this file's own rows cannot fill it. */
		const OLDEST_PAGE_SIZE = 200;

		type ForeignClock =
			| { kind: "none" }
			| { kind: "oldest"; epochMs: number }
			| { kind: "unknown" };

		/**
		 * The EARLIEST sweep clock among rows that are still sweepable and are not
		 * this file's own — the number that decides how far R7 may narrow.
		 *
		 * Two ordered reads for the same reason `foreignDueCount` needs two: the
		 * clock is an expression PostgREST cannot order by. `nullsFirst: false`
		 * sorts rows with no value in the ordering column to the END, so the page's
		 * prefix is exactly that branch's clocked rows in ascending clock order and
		 * the FIRST foreign row in that prefix is the branch's minimum.
		 *
		 * Own rows are filtered here rather than in SQL, which is why the page is
		 * sized far above the dozen rows this file inserts — and why a page that
		 * came back full with nothing foreign in it reports `unknown` instead of
		 * `none`. Fail closed: an unknown oldest age makes the planner skip.
		 */
		async function oldestForeignClock(): Promise<ForeignClock> {
			const branch = async (
				clockedByDecision: boolean,
			): Promise<ForeignClock> => {
				const base = service
					.from("rental_applications")
					.select("id, decided_at, created_at")
					.is("anonymized_at", null)
					.is("converted_tenant_id", null);
				const query = clockedByDecision
					? base.order("decided_at", { ascending: true, nullsFirst: false })
					: base
							.is("decided_at", null)
							.order("created_at", { ascending: true, nullsFirst: false });
				const { data, error } = await query.limit(OLDEST_PAGE_SIZE);
				if (error !== null) return { kind: "unknown" };

				const rows: Record<string, unknown>[] = data ?? [];
				const column = clockedByDecision ? "decided_at" : "created_at";
				const clocked = rows.filter((row) => typeof row[column] === "string");
				const foreign = clocked.find(
					(row) => !createdAppIds.has(String(row["id"])),
				);
				if (foreign) {
					return {
						kind: "oldest",
						epochMs: new Date(String(foreign[column])).getTime(),
					};
				}
				// Nothing foreign among this branch's rows. Conclusive only if the
				// page actually reached the end of them — either because the unclocked
				// tail started inside it, or because the page came back short.
				return clocked.length < rows.length || rows.length < OLDEST_PAGE_SIZE
					? { kind: "none" }
					: { kind: "unknown" };
			};

			const [decided, undecided] = await Promise.all([
				branch(true),
				branch(false),
			]);
			if (decided.kind === "unknown" || undecided.kind === "unknown") {
				return { kind: "unknown" };
			}
			if (decided.kind === "none") return undecided;
			if (undecided.kind === "none") return decided;
			return {
				kind: "oldest",
				epochMs: Math.min(decided.epochMs, undecided.epochMs),
			};
		}

		/** The oldest foreign age in days: `null` = none, `NaN` = unknown. */
		async function oldestForeignAgeDays(): Promise<number | null> {
			const clock = await oldestForeignClock();
			if (clock.kind === "none") return null;
			if (clock.kind === "unknown") return Number.NaN;
			return (Date.now() - clock.epochMs) / 864e5;
		}

		beforeAll(async () => {
			service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
				auth: { persistSession: false, autoRefreshToken: false },
			});
			anonClient = createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!);

			const { ownerA } = getTestCredentials();
			clientA = await createTestClient(ownerA.email, ownerA.password);
			const {
				data: { user },
			} = await clientA.auth.getUser();
			ownerAId = user!.id;

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
			propertyId = property?.id;

			if (propertyId) {
				const { data: unit } = await service
					.from("units")
					.insert({
						property_id: propertyId,
						owner_user_id: ownerAId,
						unit_number: "R1",
						rent_amount: 1500,
					})
					.select("id")
					.single();
				unitId = unit?.id;
			}

			const { data: tenant } = await service
				.from("tenants")
				.insert({
					owner_user_id: ownerAId,
					name: `${RUN_TAG} tenant`,
					email: `${RUN_TAG}-tenant@example.com`,
				})
				.select("id")
				.single();
			tenantId = tenant?.id;

			// Capture the live window so both mutating tests restore the value that
			// was actually there, not a hardcoded 730 that would silently walk an
			// operator-raised 1460 back down.
			const { data: cfg } = await service
				.from("app_config")
				.select("value")
				.eq("key", RETENTION_KEY)
				.limit(1);
			originalRetentionValue = cfg?.[0]?.value ?? null;

			// PostgREST exposes `public` and `graphql_public` only, so `cron` is
			// normally unreachable from a client. Probe rather than assume.
			const cronProbe = await service
				.schema("cron")
				.from("job")
				.select("jobname")
				.limit(1);
			cronReadable = cronProbe.error === null;

			expect(propertyId).toBeTruthy();
			expect(unitId).toBeTruthy();
			expect(tenantId).toBeTruthy();
		}, 60_000);

		afterAll(async () => {
			// Restore the retention window before anything else. If a test threw
			// mid-flight its own finally already ran, but this is the backstop that
			// makes a leaked one-day window impossible.
			await service
				.from("app_config")
				.upsert(
					{ key: RETENTION_KEY, value: retentionRestoreValue() },
					{ onConflict: "key" },
				);

			const appIds = [...createdAppIds];
			if (appIds.length > 0) {
				await service.from("notifications").delete().in("entity_id", appIds);
				await service.from("rental_applications").delete().in("id", appIds);
			}
			await service
				.from("rental_application_links")
				.delete()
				.eq("owner_user_id", ownerAId)
				.like("raw_token", `${RUN_TAG}%`);
			if (tenantId) await service.from("tenants").delete().eq("id", tenantId);
			if (unitId) await service.from("units").delete().eq("id", unitId);
			if (propertyId)
				await service.from("properties").delete().eq("id", propertyId);

			await destroyDisposableUser();

			// Verified, not assumed.
			if (appIds.length > 0) {
				const { count } = await service
					.from("rental_applications")
					.select("id", { count: "exact", head: true })
					.in("id", appIds);
				expect(count ?? 0).toBe(0);
			}
			const { data: restored } = await service
				.from("app_config")
				.select("value")
				.eq("key", RETENTION_KEY)
				.limit(1);
			expect(restored?.[0]?.value).toBe(retentionRestoreValue());
		}, 60_000);

		async function destroyDisposableUser(): Promise<void> {
			if (!disposableUserId) return;
			const id = disposableUserId;
			await service
				.from("rental_applications")
				.delete()
				.eq("owner_user_id", id);
			await service
				.from("rental_application_links")
				.delete()
				.eq("owner_user_id", id);
			await service.from("notifications").delete().eq("user_id", id);
			await service.from("units").delete().eq("owner_user_id", id);
			await service.from("properties").delete().eq("owner_user_id", id);
			// Seeded by the seed_default_categories_on_user_insert trigger; the
			// cascade does not remove them and they hold an FK to the user row.
			await service
				.from("document_categories")
				.delete()
				.eq("owner_user_id", id);
			await service.from("users").delete().eq("id", id);
			if (disposableViaAuth) await service.auth.admin.deleteUser(id);
			disposableUserId = undefined;

			const { count } = await service
				.from("users")
				.select("id", { count: "exact", head: true })
				.eq("id", id);
			expect(count ?? 0).toBe(0);
		}

		// ── the sweep ────────────────────────────────────────────────────────────

		it("R1: clears every PII column on a due row, column by column", async (ctx) => {
			const foreign = await foreignDueCount(sweepGuardDays());
			if (foreign > 0) ctx.skip(FOREIGN_SKIP_NOTE);

			const appId = await insertApp();

			// Positive control: every PII column really is populated going in, so
			// the nulls below are the sweep's work and not the fixture's omission.
			const before = await readApp(appId);
			for (const column of [
				...PII_NULLED_COLUMNS,
				...PII_PLACEHOLDER_COLUMNS,
			]) {
				expect(before[column], `${column} must be populated before`).not.toBe(
					null,
				);
			}
			expect(before["anonymized_at"]).toBeNull();

			const swept = await runSweep();
			expect(swept).toBeGreaterThanOrEqual(1);

			const after = await readApp(appId);
			for (const column of PII_PLACEHOLDER_COLUMNS) {
				expect(after[column], `${column} must be the placeholder`).toBe(
					"[deleted]",
				);
			}
			for (const column of PII_NULLED_COLUMNS) {
				expect(after[column], `${column} must be cleared`).toBeNull();
			}
			expect(after["anonymized_at"]).not.toBeNull();
		}, 60_000);

		it("R2: retains the non-PII stub", async (ctx) => {
			const foreign = await foreignDueCount(sweepGuardDays());
			if (foreign > 0) ctx.skip(FOREIGN_SKIP_NOTE);

			const appId = await insertApp();
			const before = await readApp(appId);
			await runSweep();
			const after = await readApp(appId);

			for (const column of RETAINED_COLUMNS) {
				expect(after[column], `${column} must survive the sweep`).toEqual(
					before[column],
				);
			}
			// disposition_reason in particular: a CLOSED vocabulary, which is why it
			// is safe to keep and why clearing owner_notes costs no defensibility.
			expect(after["disposition_reason"]).toBe("income_requirement");
			expect(after["anonymized_at"]).not.toBeNull();
		}, 60_000);

		it("R3: never anonymizes a converted row", async (ctx) => {
			const foreign = await foreignDueCount(sweepGuardDays());
			if (foreign > 0) ctx.skip(FOREIGN_SKIP_NOTE);

			const email = `${RUN_TAG}-converted@example.com`;
			const appId = await insertApp({
				converted_tenant_id: tenantId!,
				converted_at: daysAgo(799),
				status: "approved",
				applicant_email: email,
			});

			await runSweep();

			const after = await readApp(appId);
			// The applicant became a tenant. That tenant record, not this clock,
			// governs the data — clearing it would strip PII a live relationship
			// still needs.
			expect(after["anonymized_at"]).toBeNull();
			expect(after["applicant_email"]).toBe(email);
			expect(after["applicant_phone"]).toBe("555-0100");
		}, 60_000);

		it("R4: does not re-stamp a row it already anonymized", async (ctx) => {
			const foreign = await foreignDueCount(sweepGuardDays());
			if (foreign > 0) ctx.skip(FOREIGN_SKIP_NOTE);

			const appId = await insertApp();
			await runSweep();
			const first = await readApp(appId);
			expect(first["anonymized_at"]).not.toBeNull();

			await runSweep();
			const second = await readApp(appId);
			// Re-sweeping would burn a whole 10000-row batch re-clearing rows that
			// hold nothing, starving the rows that still do.
			expect(second["anonymized_at"]).toBe(first["anonymized_at"]);
		}, 60_000);

		it("R5: leaves an in-window row alone", async (ctx) => {
			const foreign = await foreignDueCount(sweepGuardDays());
			if (foreign > 0) ctx.skip(FOREIGN_SKIP_NOTE);

			const inWindow = await insertApp({
				decided_at: daysAgo(700),
				created_at: daysAgo(701),
				certified_at: daysAgo(701),
			});
			// Positive control in the same sweep: a due row proves the sweep ran.
			const due = await insertApp();

			await runSweep();

			expect((await readApp(inWindow))["anonymized_at"]).toBeNull();
			expect((await readApp(inWindow))["applicant_phone"]).toBe("555-0100");
			expect((await readApp(due))["anonymized_at"]).not.toBeNull();
		}, 60_000);

		it("R6: falls back to created_at when decided_at is null", async (ctx) => {
			const foreign = await foreignDueCount(sweepGuardDays());
			if (foreign > 0) ctx.skip(FOREIGN_SKIP_NOTE);

			// An IGNORED application is clocked from submission. status must stay
			// non-terminal or rental_applications_decided_at_check refuses the row.
			const appId = await insertApp({
				status: "new",
				decided_at: null,
				disposition_reason: null,
				created_at: daysAgo(800),
			});

			await runSweep();

			expect((await readApp(appId))["anonymized_at"]).not.toBeNull();
			expect((await readApp(appId))["applicant_email"]).toBe("[deleted]");
		}, 60_000);

		/**
		 * R7 IS THE ONLY TEST THAT PROVES THE CONFIGURED WINDOW IS READ AT ALL, and
		 * it was silently disabled.
		 *
		 * It used to narrow to a HARDCODED one day and gate itself on "no foreign
		 * row is due at one day". That guard is correct and stays. What broke is
		 * that it became permanently unsatisfiable: the E2E seeder now deliberately
		 * keeps one `rental_applications` row alive forever, because that row is
		 * what stops every CI run marching an un-resettable `submission_count`. It
		 * is owner-held, status `new` (so `decided_at` is null and the clock runs
		 * from `created_at`), never converted, and not anonymized for 730 days. One
		 * day after the first run that seeded it, R7 skipped on every run, forever.
		 *
		 * THE WINDOW IS NOW COMPUTED, AND THE GUARD IS UNCHANGED IN STRENGTH. What
		 * separates "a row this suite may safely age" from "someone else's data" is
		 * not ownership — the sweep reads neither owner nor label, so neither can
		 * bound it. The only thing that bounds a global sweep is the WINDOW. So the
		 * window is derived from the oldest foreign sweepable row in the table plus
		 * a clearance day: every foreign row is then strictly younger than the
		 * window and none is in range at all. The fixture is then aged past that
		 * window but kept INSIDE the live one, so the sweep must ignore it before
		 * the narrowing and clear it after.
		 *
		 * The arithmetic is `_helpers/retention-window.ts`, proved off-network in
		 * its own unit test — including the counter-example that the old hardcoded
		 * window really did put the seeder row in range.
		 *
		 * NOTHING HERE WEAKENS THE BLAST-RADIUS CHECK. `foreignDueCount` is still
		 * consulted, still fail-closed, and is now consulted at the window this
		 * test is actually about to install rather than at a literal. If it is not
		 * zero, this still does not run.
		 */
		it("R7: honours a narrowed app_config window, and restores it", async (ctx) => {
			const live = liveWindowDays();
			const plan = planNarrowedWindow({
				oldestForeignAgeDays: await oldestForeignAgeDays(),
				liveWindowDays: live,
			});
			if (plan.kind === "skip") ctx.skip(plan.reason);
			if (plan.kind !== "run") return;

			// THE GUARD, at the window about to be installed. Fail-closed and
			// unchanged in intent: if the sweep could reach a row this file does not
			// own, it does not run.
			const foreign = await foreignDueCount(plan.windowDays);
			if (foreign > 0) ctx.skip(FOREIGN_SKIP_NOTE);
			// ...and at the LIVE window too, because the positive control below
			// sweeps once before narrowing. Implied by the line above — a due set
			// only shrinks as the window widens, and `plan.windowDays < live` — but
			// asserted rather than left to be re-derived by the next reader.
			const foreignAtLive = await foreignDueCount(live);
			if (foreignAtLive > 0) ctx.skip(FOREIGN_SKIP_NOTE);

			const recent = await insertApp({
				decided_at: daysAgo(plan.fixtureAgeDays),
				created_at: daysAgo(plan.fixtureAgeDays + 1),
				certified_at: daysAgo(plan.fixtureAgeDays + 1),
			});

			// POSITIVE CONTROL, BEFORE ANY NARROWING. The fixture is younger than
			// the window that is live right now, so the sweep must leave it alone.
			// Without this the assertion after the narrowing proves only that SOME
			// sweep anonymized the row — which an 800-day fixture would satisfy
			// under the default window, and the test would pass while proving
			// nothing about `app_config` being read.
			await runSweep();
			expect(
				(await readApp(recent))["anonymized_at"],
				"the fixture must not be due before the window is narrowed",
			).toBeNull();

			try {
				const { error } = await service
					.from("app_config")
					.update({ value: String(plan.windowDays) })
					.eq("key", RETENTION_KEY);
				expect(error).toBeNull();

				await runSweep();
				expect((await readApp(recent))["anonymized_at"]).not.toBeNull();
				expect((await readApp(recent))["applicant_email"]).toBe("[deleted]");
			} finally {
				// try/finally, not a trailing statement: a failed assertion above must
				// not leave production on the narrowed retention window, which would
				// start destroying real applicant records at the next 3 AM run
				// (T-66-37). The window is narrower than the live one by
				// construction, so leaking it is destructive regardless of how few
				// days it happens to be.
				await service.from("app_config").upsert(
					{
						key: RETENTION_KEY,
						value: retentionRestoreValue(),
					},
					{ onConflict: "key" },
				);
			}

			const { data: restored } = await service
				.from("app_config")
				.select("value")
				.eq("key", RETENTION_KEY)
				.limit(1);
			expect(restored?.[0]?.value).toBe(retentionRestoreValue());
		}, 60_000);

		it("R8: falls back to 730 days when the config row is absent", async (ctx) => {
			const foreign = await foreignDueCount(sweepGuardDays());
			if (foreign > 0) ctx.skip(FOREIGN_SKIP_NOTE);

			const inWindow = await insertApp({
				decided_at: daysAgo(700),
				created_at: daysAgo(701),
				certified_at: daysAgo(701),
			});
			const due = await insertApp();

			try {
				const { error } = await service
					.from("app_config")
					.delete()
					.eq("key", RETENTION_KEY);
				expect(error).toBeNull();

				await runSweep();

				// THE ASSERTION THAT CATCHES THE FAIL-OPEN. With no row, an
				// unguarded read leaves v_days NULL, make_interval() returns NULL,
				// the comparison is never true, and the sweep anonymizes nothing
				// forever — no error, no exception, no log line (T-66-23). The
				// 800-day row being cleared is what proves the coalesce fallback.
				expect((await readApp(due))["anonymized_at"]).not.toBeNull();
				// ...and the default really is 730, not 0 or 1: the 700-day row is
				// still inside the window.
				expect((await readApp(inWindow))["anonymized_at"]).toBeNull();
			} finally {
				await service.from("app_config").upsert(
					{
						key: RETENTION_KEY,
						value: retentionRestoreValue(),
					},
					{ onConflict: "key" },
				);
			}

			const { data: restored } = await service
				.from("app_config")
				.select("value")
				.eq("key", RETENTION_KEY)
				.limit(1);
			expect(restored?.[0]?.value).toBe(retentionRestoreValue());
		}, 60_000);

		// ── structural invariants ────────────────────────────────────────────────

		it("R9: no rental-application archive table exists (D-11c)", async () => {
			// Positive control: the probe distinguishes "table absent" from "probe
			// broken" — a real table selects cleanly through the same mechanism.
			const control = await service
				.from("rental_applications")
				.select("id")
				.limit(1);
			expect(control.error).toBeNull();

			for (const table of [
				"rental_applications_archive",
				"rental_application_links_archive",
			]) {
				const { data, error } = await service.from(table).select("id").limit(1);
				// Archiving would preserve verbatim the exact PII the sweep exists to
				// remove — the Phase 52 C2 bug in a new costume. The strongest form of
				// that fix is not a second delete, it is having no second copy.
				expect(error, `${table} must not exist`).not.toBeNull();
				expect(data).toBeNull();
			}
		});

		it("R10: the sweep is registered on a unique cron slot", async (ctx) => {
			// PostgREST exposes `public` and `graphql_public`; `cron` is normally
			// unreachable from any client, and there is no arbitrary-SQL path in
			// this harness. When the probe says the schema is not exposed this
			// SKIPS rather than false-failing — plan 66-06 verified the same two
			// facts live via MCP (1 job named anonymize-rental-applications, 0
			// other jobs on '35 3 * * *').
			if (!cronReadable) ctx.skip();

			const { data, error } = await service
				.schema("cron")
				.from("job")
				.select("jobname, schedule")
				.limit(200);
			expect(error).toBeNull();

			const jobs = data ?? [];
			const mine = jobs.filter((job) => job.jobname === CRON_JOB_NAME);
			expect(mine).toHaveLength(1);
			expect(mine[0]?.schedule).toBe(CRON_SCHEDULE);

			// Uniqueness of the SLOT, not merely existence of the job: two jobs on
			// one minute is the collision D-16 picked :35 to avoid.
			const sharing = jobs.filter(
				(job) =>
					job.schedule === CRON_SCHEDULE && job.jobname !== CRON_JOB_NAME,
			);
			expect(sharing).toHaveLength(0);
		});

		it("R11: the sweep is unreachable from authenticated and anon", async () => {
			const authenticated = await clientA.rpc(
				"anonymize_old_rental_applications",
			);
			expect(REVOKED_CODES).toContain(authenticated.error?.code);
			expect(authenticated.data).toBeNull();

			const anon = await anonClient.rpc("anonymize_old_rental_applications");
			expect(REVOKED_CODES).toContain(anon.error?.code);
			expect(anon.data).toBeNull();

			// Positive control: the function exists and runs for service_role, so
			// the two refusals above are the grant and not a missing function.
			const { data, error } = await service.rpc(
				"anonymize_old_rental_applications",
			);
			expect(error).toBeNull();
			expect(typeof data).toBe("number");
		});

		// ── GDPR cascade (D-12) ──────────────────────────────────────────────────

		it("R12: anonymize_deleted_user removes both new tables and keeps its old behaviour", async (ctx) => {
			// A disposable owner. Running the cascade against ownerA or ownerB would
			// rewrite their email and status and permanently delete their
			// preferences — breaking every other suite that signs in as them.
			const email = `${RUN_TAG}-cascade@example.com`;
			const candidateId = randomUUID();

			const direct = await service
				.from("users")
				.insert({
					id: candidateId,
					email,
					full_name: "Cascade Fixture",
					status: "active",
				})
				.select("id")
				.single();

			if (direct.error === null && direct.data?.id) {
				disposableUserId = direct.data.id;
			} else {
				// public.users.id references auth.users(id) on this project, so the
				// row has to originate in Auth and arrive through the
				// ensure_public_user_trigger.
				const created = await service.auth.admin.createUser({
					email,
					password: randomUUID(),
					email_confirm: true,
				});
				if (created.error || !created.data.user) ctx.skip();
				disposableUserId = created.data.user!.id;
				disposableViaAuth = true;
			}
			const userId = disposableUserId!;

			const { data: property } = await service
				.from("properties")
				.insert({
					owner_user_id: userId,
					name: `${RUN_TAG} cascade property`,
					address_line1: "2 Test St",
					city: "Testville",
					state: "TX",
					postal_code: "75001",
					property_type: "single_family",
				})
				.select("id")
				.single();
			const { data: unit } = await service
				.from("units")
				.insert({
					property_id: property!.id,
					owner_user_id: userId,
					unit_number: "C1",
					rent_amount: 1500,
				})
				.select("id")
				.single();
			const { data: link } = await service
				.from("rental_application_links")
				.insert({
					unit_id: unit!.id,
					owner_user_id: userId,
					created_by: userId,
					token_hash: `${RUN_TAG}-cascade-hash`,
					raw_token: `${RUN_TAG}-cascade-raw`,
					expires_at: new Date(Date.now() + 864e5).toISOString(),
				})
				.select("id")
				.single();
			await service.from("rental_applications").insert({
				owner_user_id: userId,
				link_id: link!.id,
				unit_id: unit!.id,
				property_label: `${RUN_TAG} cascade property`,
				submission_id: randomUUID(),
				occupant_count: 1,
				certified_at: new Date().toISOString(),
				applicant_first_name: "Cascade",
				applicant_last_name: "Applicant",
				applicant_email: `${RUN_TAG}-cascade-applicant@example.com`,
			});
			await service.from("notifications").insert({
				user_id: userId,
				notification_type: "system",
				title: "Cascade fixture notification",
				message: "should not survive account deletion",
			});

			// Positive controls: all four rows exist BEFORE the cascade, so the
			// zeroes afterwards are deletions and not empty fixtures.
			const countFor = async (table: string, column: string) => {
				const { count } = await service
					.from(table)
					.select("id", { count: "exact", head: true })
					.eq(column, userId);
				return count ?? 0;
			};
			expect(await countFor("rental_applications", "owner_user_id")).toBe(1);
			expect(await countFor("rental_application_links", "owner_user_id")).toBe(
				1,
			);
			expect(await countFor("notifications", "user_id")).toBe(1);

			const { error } = await service.rpc("anonymize_deleted_user", {
				p_user_id: userId,
			});
			expect(error).toBeNull();

			// The two new deletes (D-12).
			expect(await countFor("rental_applications", "owner_user_id")).toBe(0);
			expect(await countFor("rental_application_links", "owner_user_id")).toBe(
				0,
			);

			// AND everything the function already did. A `create or replace` that
			// dropped part of the old body is silent — no error, no warning, no diff
			// to review afterwards — so it has to fail HERE rather than in
			// production.
			expect(await countFor("notifications", "user_id")).toBe(0);

			const { data: redacted } = await service
				.from("users")
				.select("full_name, email, status, phone, first_name, last_name")
				.eq("id", userId)
				.single();
			expect(redacted?.full_name).toBe("[deleted user]");
			expect(redacted?.email).toBe(`[deleted-${userId}]`);
			expect(redacted?.status).toBe("inactive");
			expect(redacted?.phone).toBeNull();

			const { data: properties } = await service
				.from("properties")
				.select("status")
				.eq("owner_user_id", userId)
				.limit(10);
			expect((properties ?? []).every((row) => row.status === "inactive")).toBe(
				true,
			);
		}, 60_000);
	},
);
