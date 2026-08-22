/**
 * Phase 66.1 / RATE-01 - the CONCURRENT admission proof for
 * public.check_rate_limit().
 *
 * This is the acceptance test for the limiter, and it is written the way it is
 * because the property being proved is not "a limiter exists" but "the limiter
 * admits exactly N under concurrent load", which is a much easier property to
 * fake.
 *
 * WHY 64 PARALLEL CALLERS AND NOT A LOOP. A naive check-then-act limiter with
 * the identical signature was measured against PostgreSQL 17.11 at
 * 64 clients x 40 transactions = 2,560 attempts, limit 100:
 *
 *   two-guard INSERT ... ON CONFLICT (what ships) : 100 / 100 / 100
 *   naive check-then-act, 64 clients              : 159 / 156 / 161
 *   naive check-then-act, ONE client              : 100
 *
 * The third row is the whole reason this file drives `Promise.all`. A
 * single-threaded rewrite of the harness - "to make it deterministic" - scores
 * exactly 100 against a limiter that over-admits by 56-61% in production, and
 * goes green. Phase 66 shipped two tests that certified properties the code did
 * not have; this is the same shape, so the harness is made to prove itself.
 *
 * WHAT THE IN-SUITE CONTROL DOES AND DOES NOT SHOW. The `it` below that runs a
 * ~15-line client-side check-then-act limiter through the SAME harness
 * demonstrates REQUEST-level interleaving through PostgREST: 64 in-flight HTTP
 * calls whose reads and writes reorder against each other. Statement-level
 * interleaving inside a single backend is INFERRED from PostgREST serving those
 * concurrent requests across pooled connections, not directly demonstrated
 * here. The stronger proof (pgbench against a deliberately naive SQL function)
 * is recorded in 66.1-RESEARCH.md and is not re-run. What this control actually
 * guards is the harness silently degrading - someone flattening the workers
 * into a `for` loop, or awaiting inside the map - at which point every
 * exact-100 assertion in this file would become vacuous without failing.
 *
 * The control is deliberately CLIENT-side. Creating a knowingly broken limiter
 * function in the production database, where a future caller could reach it, is
 * a worse trade than a weaker-but-safe control.
 *
 * -----------------------------------------------------------------------------
 * RUNS AGAINST PRODUCTION (CLAUDE.md), WITH NO BLAST RADIUS.
 *
 * Unlike the retention suite, this file mutates no global setting and invokes no
 * global sweep. It writes to exactly one table, public.rate_limit_counters, and
 * only under bucket keys prefixed `test:rate-limit-concurrency:` plus a
 * per-run randomUUID(), so two concurrent runs of this file cannot collide with
 * each other and neither can collide with a real limiter bucket. afterAll
 * deletes by that prefix and re-queries with an exact head count to prove the
 * teardown, rather than assuming it.
 *
 * STILL UNRUN, AND NO LONGER FOR THE ORIGINAL REASON. This file was authored
 * before public.check_rate_limit existed, when every RPC here returned PGRST202.
 * That is no longer true: the migration is applied in production (versions
 * 20260818031338 and 20260822122606) and every RPC below now resolves.
 *
 * What blocks it now is credentials -- the RLS integration env is absent, so the
 * suite has never executed. It remains the phase's ONLY evidence that the two
 * guards hold under genuine concurrency, and that gap is load-bearing: research
 * measured a naive check-then-act limiter admitting 156/159/161 against a limit
 * of 100 under 64 clients while scoring exactly 100 single-threaded. Every other
 * proof in this phase is sequential, and sequential passing is precisely the
 * evidence that cannot tell a correct limiter from a broken one.
 *
 * Running this is a prerequisite to claiming RATE-01 is proved under
 * concurrency. Do not weaken an assertion to make it pass, and do not mark it
 * skipped.
 * -----------------------------------------------------------------------------
 */

import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_ROLE_KEY =
	process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
	process.env["SUPABASE_SECRET_KEY"];

const skipReason = !SUPABASE_URL
	? "NEXT_PUBLIC_SUPABASE_URL not set"
	: !SERVICE_ROLE_KEY
		? "SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY not set"
		: null;

/** Matches the research measurement exactly so the numbers are comparable. */
const CLIENTS = 64;
const ATTEMPTS_PER_CLIENT = 40;
const LIMIT = 100;
/** One hour, so a single run cannot cross a window boundary mid-flight. */
const WINDOW_MS = 3_600_000;
const RUNS = 3;

/**
 * The floor for `peakInFlight`. 64 workers all reach their first await before
 * any response lands, so the real value is 64; 32 is the point below which the
 * harness has clearly degraded toward sequential execution.
 */
const MIN_PEAK_IN_FLIGHT = 32;

const KEY_PREFIX = "test:rate-limit-concurrency:";
const TEST_TIMEOUT_MS = 120_000;

function freshKey(label: string): string {
	return `${KEY_PREFIX}${label}:${randomUUID()}`;
}

/**
 * READ THE RPC RESULT STRICTLY, OR THIS TEST BECOMES THE BUG IT TESTS FOR.
 *
 * `returns table (...)` arrives over PostgREST as an ARRAY of row objects, not
 * as a bare object. `data?.allowed` therefore reads `undefined` on every single
 * call. Anything other than a literal `true` in the first row - undefined, an
 * empty array, an error - counts as DENIED. That default direction is the same
 * one the edge function must take in 66.1-03, where reading it optimistically
 * is a silent product-wide fail-open, i.e. the exact outage this phase exists
 * to fix.
 */
function isAdmitted(data: unknown): boolean {
	return Array.isArray(data) && data[0]?.allowed === true;
}

interface RunResult {
	admitted: number;
	peakInFlight: number;
}

describe.skipIf(skipReason)(
	"RATE-01 check_rate_limit - concurrent admission, window boundary, accounting",
	() => {
		let service: SupabaseClient;

		beforeAll(() => {
			service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
				auth: { persistSession: false, autoRefreshToken: false },
			});
		});

		// ---------------------------------------------------------------------
		// Harness
		// ---------------------------------------------------------------------

		/**
		 * Spawns CLIENTS workers via Promise.all, each issuing
		 * ATTEMPTS_PER_CLIENT sequential RPC calls against the same bucket key.
		 * `peakInFlight` is the observed maximum of the in-flight counter and is
		 * asserted by every caller: it is the only thing standing between this
		 * file and a harness that has quietly become sequential.
		 */
		async function runConcurrent(bucketKey: string): Promise<RunResult> {
			let inFlight = 0;
			let peakInFlight = 0;
			let admitted = 0;

			const worker = async (): Promise<void> => {
				for (let i = 0; i < ATTEMPTS_PER_CLIENT; i += 1) {
					inFlight += 1;
					if (inFlight > peakInFlight) peakInFlight = inFlight;
					try {
						const { data } = await service.rpc("check_rate_limit", {
							p_bucket_key: bucketKey,
							p_max_requests: LIMIT,
							p_window_ms: WINDOW_MS,
						});
						if (isAdmitted(data)) admitted += 1;
					} finally {
						inFlight -= 1;
					}
				}
			};

			await Promise.all(Array.from({ length: CLIENTS }, () => worker()));

			return { admitted, peakInFlight };
		}

		/**
		 * The non-vacuity control: a client-side check-then-act limiter, same 64
		 * workers, same table, same production PostgREST path. Read the counter,
		 * and if it is under the limit write count + 1 and score an admission.
		 * The interval between those two awaits is precisely the interleaving
		 * window that D-10's single statement does not have.
		 */
		async function runNaiveControl(bucketKey: string): Promise<RunResult> {
			const windowIndex = Math.floor(Date.now() / WINDOW_MS);
			const expiresAt = new Date((windowIndex + 2) * WINDOW_MS).toISOString();

			let inFlight = 0;
			let peakInFlight = 0;
			let admitted = 0;

			const worker = async (): Promise<void> => {
				for (let i = 0; i < ATTEMPTS_PER_CLIENT; i += 1) {
					inFlight += 1;
					if (inFlight > peakInFlight) peakInFlight = inFlight;
					try {
						const { data } = await service
							.from("rate_limit_counters")
							.select("request_count")
							.eq("bucket_key", bucketKey)
							.eq("window_index", windowIndex)
							.limit(1);

						const row = Array.isArray(data) ? data[0] : undefined;
						const current = row ? Number(row.request_count) : 0;
						if (current >= LIMIT) continue;

						await service.from("rate_limit_counters").upsert(
							{
								bucket_key: bucketKey,
								window_index: windowIndex,
								request_count: current + 1,
								expires_at: expiresAt,
							},
							{ onConflict: "bucket_key,window_index" },
						);
						admitted += 1;
					} finally {
						inFlight -= 1;
					}
				}
			};

			await Promise.all(Array.from({ length: CLIENTS }, () => worker()));

			return { admitted, peakInFlight };
		}

		async function storedCount(
			bucketKey: string,
			windowIndex: number,
		): Promise<number | null> {
			const { data, error } = await service
				.from("rate_limit_counters")
				.select("request_count")
				.eq("bucket_key", bucketKey)
				.eq("window_index", windowIndex)
				.limit(1);
			expect(error).toBeNull();
			const row = Array.isArray(data) ? data[0] : undefined;
			return row ? Number(row.request_count) : null;
		}

		async function rowCountAt(
			bucketKey: string,
			windowIndex: number,
		): Promise<number> {
			const { count, error } = await service
				.from("rate_limit_counters")
				.select("bucket_key", { count: "exact", head: true })
				.eq("bucket_key", bucketKey)
				.eq("window_index", windowIndex);
			expect(error).toBeNull();
			return count ?? 0;
		}

		// ---------------------------------------------------------------------
		// 1. The measurement: exactly LIMIT admissions out of 2,560 attempts
		// ---------------------------------------------------------------------

		for (let run = 1; run <= RUNS; run += 1) {
			it(
				`run ${run}/${RUNS}: ${CLIENTS} parallel clients x ${ATTEMPTS_PER_CLIENT} attempts admit exactly ${LIMIT}`,
				async () => {
					const bucketKey = freshKey(`concurrent-run-${run}`);
					const windowIndex = Math.floor(Date.now() / WINDOW_MS);

					const { admitted, peakInFlight } = await runConcurrent(bucketKey);

					// (1) The limiter limits, under load, not just in a loop.
					expect(admitted).toBe(LIMIT);

					// (2) The harness genuinely ran in parallel. Without this the
					// assertion above passes against a check-then-act limiter.
					expect(peakInFlight).toBeGreaterThanOrEqual(MIN_PEAK_IN_FLIGHT);

					// (3) The 2,460 denied calls wrote nothing: the stored counter
					// equals the number of admissions, not the number of attempts.
					// Read from the row rather than inferred from `remaining`.
					expect(await storedCount(bucketKey, windowIndex)).toBe(LIMIT);
				},
				TEST_TIMEOUT_MS,
			);
		}

		// ---------------------------------------------------------------------
		// 2. Non-vacuity control - the harness must be able to expose a bad limiter
		// ---------------------------------------------------------------------

		it(
			"control: a client-side check-then-act limiter over-admits through the same harness",
			async () => {
				const bucketKey = freshKey("naive-control");

				const { admitted, peakInFlight } = await runNaiveControl(bucketKey);

				expect(peakInFlight).toBeGreaterThanOrEqual(MIN_PEAK_IN_FLIGHT);
				expect(
					admitted,
					`Naive check-then-act control admitted ${admitted} of ${
						CLIENTS * ATTEMPTS_PER_CLIENT
					} against a limit of ${LIMIT}. It must admit STRICTLY MORE than ${LIMIT}. An exact-${LIMIT} result means this harness did not interleave, which makes every exact-${LIMIT} assertion above vacuous - they would pass against a limiter that over-admits by 56-61% in production. Fix the harness, not this assertion.`,
				).toBeGreaterThan(LIMIT);
			},
			TEST_TIMEOUT_MS,
		);

		// ---------------------------------------------------------------------
		// 3. GUARD 1 - the INSERT path consults the limit
		// ---------------------------------------------------------------------

		it(
			"GUARD 1: a saturated previous window denies the first request of a new window AND writes no row",
			async () => {
				const bucketKey = freshKey("guard1-boundary");
				const nowMs = Date.now();
				const windowIndex = Math.floor(nowMs / WINDOW_MS);
				const elapsed = (nowMs % WINDOW_MS) / WINDOW_MS;

				// Seed the PREVIOUS window high enough that its weighted
				// contribution, floor((1 - elapsed) * count), already exceeds the
				// limit. The x2 margin exists because the server recomputes
				// `elapsed` from clock_timestamp() microseconds later; over a
				// one-hour window that ratio moves under 0.03% per second, so the
				// margin absorbs any drift.
				const seedCount = Math.ceil(LIMIT / Math.max(1 - elapsed, 0.0001)) * 2;

				const { error: seedError } = await service
					.from("rate_limit_counters")
					.insert({
						bucket_key: bucketKey,
						window_index: windowIndex - 1,
						request_count: seedCount,
						expires_at: new Date((windowIndex + 2) * WINDOW_MS).toISOString(),
					});
				expect(seedError).toBeNull();

				// The current window has no row, so this call MUST take the INSERT
				// path - which is exactly the path a one-guard implementation
				// leaves unguarded.
				const { data, error } = await service.rpc("check_rate_limit", {
					p_bucket_key: bucketKey,
					p_max_requests: LIMIT,
					p_window_ms: WINDOW_MS,
				});
				expect(error).toBeNull();
				expect(isAdmitted(data)).toBe(false);

				// THIS is the assertion specific to GUARD 1. A one-guard
				// implementation returns allowed === true here AND leaves one row
				// behind; a boolean-only assertion written after reading the code
				// would not distinguish them.
				expect(await rowCountAt(bucketKey, windowIndex)).toBe(0);
			},
			TEST_TIMEOUT_MS,
		);

		// ---------------------------------------------------------------------
		// 4. Denied requests do not burn budget
		// ---------------------------------------------------------------------

		it(
			"denied requests do not increment the stored counter",
			async () => {
				const bucketKey = freshKey("denied-no-increment");
				const windowIndex = Math.floor(Date.now() / WINDOW_MS);

				for (let i = 0; i < LIMIT; i += 1) {
					const { data } = await service.rpc("check_rate_limit", {
						p_bucket_key: bucketKey,
						p_max_requests: LIMIT,
						p_window_ms: WINDOW_MS,
					});
					expect(isAdmitted(data)).toBe(true);
				}

				for (let i = 0; i < 10; i += 1) {
					const { data } = await service.rpc("check_rate_limit", {
						p_bucket_key: bucketKey,
						p_max_requests: LIMIT,
						p_window_ms: WINDOW_MS,
					});
					expect(isAdmitted(data)).toBe(false);
				}

				// An increment-then-compare implementation reads 110 here, and
				// would make every configured cap silently stricter than it says.
				expect(await storedCount(bucketKey, windowIndex)).toBe(LIMIT);
			},
			TEST_TIMEOUT_MS,
		);

		// ---------------------------------------------------------------------
		// 5. Input validation (ASVS V5) - the three in-function raises
		// ---------------------------------------------------------------------

		it("rejects an empty bucket key", async () => {
			const { error } = await service.rpc("check_rate_limit", {
				p_bucket_key: "",
				p_max_requests: LIMIT,
				p_window_ms: WINDOW_MS,
			});
			expect(error).not.toBeNull();
		});

		it("rejects a max_requests below 1", async () => {
			const { error } = await service.rpc("check_rate_limit", {
				p_bucket_key: freshKey("invalid-max"),
				p_max_requests: 0,
				p_window_ms: WINDOW_MS,
			});
			expect(error).not.toBeNull();
		});

		it("rejects a window below 1000ms", async () => {
			const { error } = await service.rpc("check_rate_limit", {
				p_bucket_key: freshKey("invalid-window"),
				p_max_requests: LIMIT,
				p_window_ms: 999,
			});
			expect(error).not.toBeNull();
		});

		// ---------------------------------------------------------------------
		// Teardown - prove it, do not assume it
		// ---------------------------------------------------------------------

		afterAll(async () => {
			const { error } = await service
				.from("rate_limit_counters")
				.delete()
				.like("bucket_key", `${KEY_PREFIX}%`);
			expect(error).toBeNull();

			const { count, error: countError } = await service
				.from("rate_limit_counters")
				.select("bucket_key", { count: "exact", head: true })
				.like("bucket_key", `${KEY_PREFIX}%`);
			expect(countError).toBeNull();
			expect(count ?? 0).toBe(0);
		}, TEST_TIMEOUT_MS);
	},
);
