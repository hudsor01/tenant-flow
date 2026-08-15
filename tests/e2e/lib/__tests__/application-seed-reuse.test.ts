/**
 * The E2E seeder must not march an un-resettable production counter.
 *
 * WHAT WENT WRONG. `ensureApplication` reuses any unconverted
 * `rental_applications` row the owner already holds and only submits through the
 * deployed `apply-token` when there is none. `removeSeededApplication` then
 * DELETED exactly the row it had just seeded, in `afterAll`. So the row never
 * survived, there was never a row to reuse, the reuse branch was never once
 * taken, and every run on every PR submitted again — against a file that stated
 * the opposite bound in its own header: "a suite that runs on every PR consumes
 * the cap at most once rather than once per run".
 *
 * WHY THAT IS EXPENSIVE. Every accepted submit permanently increments
 * `rental_application_links.submission_count`. That column has NO decrement path,
 * NO update policy and NO delete policy for any role, and
 * `submit_rental_application` refuses with `link_capped` at 250. Production
 * showed the mechanism directly: one link at `submission_count = 9` while
 * `select count(*) from rental_applications` returned 0.
 *
 * AND THE FAILURE MODE AT THE CAP IS SILENT. `ensureApplication` returned
 * `null`, and `owner/applications.spec.ts` SKIPPED E-17, E-18, E-20, E-21 and
 * E-22 — five geometry assertions stopping while CI stayed green.
 *
 * WHAT THIS FILE PROVES, WITHOUT A PRODUCTION SIGN-IN. `ApplicationStore` is a
 * two-method read port, so the whole lifecycle runs against memory:
 *   1. Five consecutive runs submit ONCE. The counter stops at 1.
 *   2. The counter-example: the SAME code with the old delete-on-teardown policy
 *      submits five times and the counter reaches 5. That is the differential
 *      that makes (1) mean something rather than merely pass.
 *   3. No delete capability exists to reintroduce — not on the port, not in the
 *      module's exports, not in its source.
 *   4. A refusal from the deployed function reports `exhausted`, which the spec
 *      turns into a failure rather than a skip.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import * as fixtures from "../application-fixtures";
import {
	type ApplicationStore,
	ensureApplication,
	supabaseApplicationStore,
} from "../application-fixtures";

const BASE_URL = "https://project.supabase.co";
const ACTIVE_TOKEN = "0".repeat(64);

const FIXTURES_SOURCE_PATH = "tests/e2e/lib/application-fixtures.ts";

interface SubmitOutcome {
	success: boolean;
	reason?: string;
	/** False models the honeypot/timing branch: 200, and zero rows written. */
	writesRow?: boolean;
}

interface SeedWorld {
	store: ApplicationStore;
	fetchImpl: typeof fetch;
	/** Ids currently in `rental_applications`, newest last. */
	rows: string[];
	/** `action: "submit"` calls that reached the function. */
	submits: () => number;
	/** The link counter: incremented on every ACCEPTED submit, never decremented. */
	submissionCount: () => number;
	/** The old teardown, modelled so its cost can be measured. */
	remove: (id: string) => void;
}

/**
 * An in-memory stand-in for the production surface the seeder touches.
 *
 * Deliberately models the ONE property that matters and no more: an accepted
 * submit writes a row AND increments a counter that nothing ever decrements.
 */
function seedWorld(
	outcome: SubmitOutcome = { success: true, writesRow: true },
): SeedWorld {
	const rows: string[] = [];
	const written = new Map<string, string>();
	let submits = 0;
	let submissionCount = 0;

	const store: ApplicationStore = {
		listUnconverted: (limit) => Promise.resolve(rows.slice(-limit).reverse()),
		findBySubmission: (submissionId) =>
			Promise.resolve(written.get(submissionId) ?? null),
	};

	const fetchImpl: typeof fetch = (_input, init) => {
		const raw = typeof init?.body === "string" ? init.body : "{}";
		const parsed: unknown = JSON.parse(raw);
		const action =
			typeof parsed === "object" && parsed !== null && "action" in parsed
				? (parsed as { action?: unknown }).action
				: undefined;

		// The deploy probe. A 200 is "deployed", which is what the real probe
		// concludes for anything other than a gateway 404 carrying NOT_FOUND.
		if (action === "context") {
			return Promise.resolve(new Response("{}", { status: 200 }));
		}

		submits += 1;
		if (outcome.success) {
			submissionCount += 1;
			if (outcome.writesRow !== false) {
				const submissionId =
					typeof parsed === "object" &&
					parsed !== null &&
					"submission_id" in parsed
						? String((parsed as { submission_id?: unknown }).submission_id)
						: "";
				const id = `application-${submissionCount}`;
				rows.push(id);
				written.set(submissionId, id);
			}
		}
		return Promise.resolve(
			new Response(
				JSON.stringify({
					success: outcome.success,
					...(outcome.reason === undefined ? {} : { reason: outcome.reason }),
				}),
				{ status: 200 },
			),
		);
	};

	return {
		store,
		fetchImpl,
		rows,
		submits: () => submits,
		submissionCount: () => submissionCount,
		remove: (id) => {
			const index = rows.indexOf(id);
			if (index !== -1) rows.splice(index, 1);
		},
	};
}

function runSeed(world: SeedWorld) {
	return ensureApplication({
		store: world.store,
		baseUrl: BASE_URL,
		activeToken: ACTIVE_TOKEN,
		fetchImpl: world.fetchImpl,
	});
}

describe("the seeder's reuse bound is real", () => {
	it("submits once across five consecutive suite runs, and the counter stops at 1", async () => {
		const world = seedWorld();

		for (let run = 1; run <= 5; run += 1) {
			const result = await runSeed(world);
			expect(result.reason).toBeNull();
			expect(result.exhausted).toBe(false);
			// Positive control per run: a fixture was actually produced, so the
			// counter assertion below is not satisfied by five failed runs.
			expect(result.application).not.toBeNull();
			// Only the FIRST run spends a submission. Every later run finds the row
			// the first one left behind.
			expect(result.application?.seeded).toBe(run === 1);
		}

		expect(world.submits()).toBe(1);
		expect(world.submissionCount()).toBe(1);
		expect(world.rows).toHaveLength(1);
	});

	it("reuses the row that already exists without submitting at all", async () => {
		const world = seedWorld();
		// An owner who already holds an application — the ordinary case after the
		// very first run in the suite's life.
		world.rows.push("pre-existing-application");

		const result = await runSeed(world);

		expect(result.application).toEqual({
			id: "pre-existing-application",
			seeded: false,
		});
		expect(world.submits()).toBe(0);
		expect(world.submissionCount()).toBe(0);
	});

	/**
	 * THE COUNTER-EXAMPLE, and it is what gives the test above its meaning.
	 *
	 * Same seeder, same world, one difference: the row is removed after each run,
	 * which is precisely what `removeSeededApplication` did in `afterAll`. The
	 * counter then advances once per run forever. Nine runs is what production
	 * actually recorded.
	 */
	it("would march the counter once per run if teardown removed the seeded row", async () => {
		const world = seedWorld();

		for (let run = 1; run <= 5; run += 1) {
			const result = await runSeed(world);
			expect(result.application?.seeded).toBe(true);
			const seeded = result.application;
			if (seeded) world.remove(seeded.id);
		}

		expect(world.submits()).toBe(5);
		expect(world.submissionCount()).toBe(5);
		// Nothing survives to be reused, which is exactly the production shape:
		// a non-zero counter against an empty table.
		expect(world.rows).toHaveLength(0);
	});
});

describe("the seeder has no way to delete what it seeded", () => {
	it("exposes a read-only store port", () => {
		// A client is constructed but never used for I/O: `createClient` opens no
		// connection, and this asserts the ADAPTER'S SHAPE rather than its results.
		const client = createClient(BASE_URL, "publishable-key-not-used", {
			auth: { persistSession: false, autoRefreshToken: false },
		});

		expect(Object.keys(supabaseApplicationStore(client)).sort()).toStrictEqual([
			"findBySubmission",
			"listUnconverted",
		]);
	});

	it("exports no removal helper", () => {
		// `removeSeededApplication` was an export. Naming the whole family rather
		// than that one identifier is what stops it coming back under a new name.
		const removers = Object.keys(fixtures).filter((name) =>
			/remove|delete|destroy|purge|cleanup|teardown/i.test(name),
		);
		// Positive control: the module really did load and really does export the
		// seeder, so the empty list above is an absence and not an import failure.
		expect(Object.keys(fixtures)).toContain("ensureApplication");
		expect(removers).toStrictEqual([]);
	});

	it("issues no PostgREST delete anywhere in the module", () => {
		const source = readFileSync(
			resolve(process.cwd(), FIXTURES_SOURCE_PATH),
			"utf8",
		);
		// Positive control on the read: this is the right file.
		expect(source).toContain('.from("rental_applications")');
		// The old teardown was two of these — one on `notifications`, one on
		// `rental_applications`.
		expect(source).not.toMatch(/\.delete\(/);
	});
});

describe("a refusal from the deployed function is loud, not a skip", () => {
	it("marks a capped link exhausted", async () => {
		const world = seedWorld({ success: false, reason: "link_capped" });

		const result = await runSeed(world);

		expect(result.application).toBeNull();
		// THE POINT. `exhausted` is what `owner/applications.spec.ts` turns into a
		// thrown error instead of five silent skips.
		expect(result.exhausted).toBe(true);
		expect(result.reason).toContain("link_capped");
	});

	it("marks a 200-with-no-row exhausted rather than reporting a fixture", async () => {
		const world = seedWorld({ success: true, writesRow: false });

		const result = await runSeed(world);

		expect(result.application).toBeNull();
		expect(result.exhausted).toBe(true);
		expect(result.reason).toBe("apply-token answered success but wrote no row");
	});

	it("leaves a genuine environment gap skippable", async () => {
		// An undeployed function is not something this suite spent. The gateway 404
		// carrying `code: "NOT_FOUND"` is the only response that means "not
		// deployed", which is what the probe checks for.
		const notDeployed: typeof fetch = () =>
			Promise.resolve(
				new Response(JSON.stringify({ code: "NOT_FOUND" }), { status: 404 }),
			);

		const result = await ensureApplication({
			store: seedWorld().store,
			baseUrl: BASE_URL,
			activeToken: ACTIVE_TOKEN,
			fetchImpl: notDeployed,
		});

		expect(result.application).toBeNull();
		expect(result.exhausted).toBe(false);
		expect(result.reason).toBe("the apply-token Edge Function is not deployed");
	});
});
