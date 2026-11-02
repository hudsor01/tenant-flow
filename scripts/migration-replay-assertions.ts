/**
 * The migration-replay gate's four assertions, as pure functions.
 *
 * They started as inline bash in `.github/workflows/migration-replay.yml`,
 * where nothing could exercise them -- and that cost a real defect on the day
 * the gate was written. The seeded-cast expectation was spelled `t`/`f`, because
 * `psql -tAc` prints a boolean that way for a COLUMN; the query concatenates the
 * boolean with `||`, and through `||` psql prints `true`/`false`. The gate would
 * have failed EVERY run while reporting that the synthetic users were
 * misconfigured. It was caught by running it against a live stack, not by
 * reading it, and nothing in the repo would have caught it again on the next
 * edit.
 *
 * Moving the comparisons here makes them ordinary tested code:
 * `migration-replay-assertions.test.ts` feeds each one correct input and every
 * wrong input that matters, that `t`/`f` regression included. The workflow keeps
 * the querying -- the part that genuinely needs a database -- and hands what it
 * read to `scripts/assert-migration-replay.ts`.
 *
 * Every function here is total: it takes the raw strings a shell captured,
 * refuses anything it cannot parse rather than comparing nonsense, and never
 * throws.
 */

import type { AssertionResult } from "./assertion-result";

/**
 * The state every suite requires of the synthetic cast, as the gate's query
 * renders it: `<email>|<is_admin>|<subscription_status>|<auth.identities count>`.
 *
 * `true`/`false`, NOT `t`/`f` -- see the file header. The identity count is
 * load-bearing: the seed.sql this replaced wrote auth rows with hand-rolled
 * crypt() and ZERO `auth.identities`, so its users could never have signed in.
 * Owner A must be `active` or the proxy's subscription gate sends every e2e run
 * to /pricing.
 *
 * The gate's query wraps `subscription_status` in `coalesce`, and that is not
 * cosmetic: it is nullable, and `||` with a NULL operand yields NULL, so psql
 * printed an empty line for the whole row and `normalizeRows` dropped it. A
 * single unset column therefore came back as "the three e2e users do not
 * exist". A `<null-status>` in a failure here is an unset column, not a missing
 * user. (`u.email` needs no coalesce -- the query's own `like` already excludes
 * a NULL email -- and `is_admin` is NOT NULL.)
 */
export const EXPECTED_SEEDED_CAST: readonly string[] = [
	"e2e-admin@tenantflow.app|true|active|1",
	"e2e-owner-a@tenantflow.app|false|active|1",
	"e2e-owner-b@tenantflow.app|false|active|1",
];

/** A count a shell captured from `wc -l` or `psql -tAc`, or null if unusable. */
function parseCount(raw: string): number | null {
	const trimmed = raw.trim();
	return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

/**
 * Drop all whitespace, then all blank lines.
 *
 * Broader than the shell's `tr -d ' '` that this replaced -- tabs and carriage
 * returns go too, which is what makes it indifferent to how psql pads output.
 */
function normalizeRows(raw: string): string[] {
	return raw
		.split("\n")
		.map((line) => line.replace(/\s+/g, ""))
		.filter((line) => line !== "")
		.sort();
}

/**
 * Applied ledger rows must equal the number of migration files in the tree.
 *
 * Counted from the tree rather than hardcoded, so the assertion stays correct
 * as migrations are added.
 */
export function assertEveryMigrationApplied(
	expectedRaw: string,
	appliedRaw: string,
): AssertionResult {
	const expected = parseCount(expectedRaw);
	const applied = parseCount(appliedRaw);

	if (expected === null) {
		return {
			ok: false,
			message: `could not count the migration files: expected a number, read ${JSON.stringify(expectedRaw)}. The find/wc pipeline in the workflow is broken, so the gate cannot tell whether the replay was complete.`,
		};
	}
	// The workflow reads this with `psql -tAc` inside the stack's container. If
	// that returns nothing -- a renamed container, a database that never came
	// up -- the old inline comparison put "348" against "" and reported an
	// incomplete replay, blaming the migrations for a broken query.
	if (applied === null) {
		return {
			ok: false,
			message: `could not read the applied-migration count out of the database: expected a number, read ${JSON.stringify(appliedRaw)}. The psql query returned no count, so this is a broken query, NOT an incomplete replay. Check that the stack came up and that the container is still named \`supabase_db_tenant-flow\` before touching any migration.`,
		};
	}
	// Zero files cannot be a pass. A glob that stops matching (a renamed
	// directory, a changed extension) would otherwise make 0 == 0 and report
	// that the whole chain applies.
	if (expected === 0) {
		return {
			ok: false,
			message:
				"counted zero migration files, so there is nothing to prove. The gate would pass vacuously: fix the path it globs instead of accepting this.",
		};
	}
	if (expected !== applied) {
		return {
			ok: false,
			message: `migration replay is incomplete: ${applied} of ${expected} applied. A migration in this chain cannot run against an empty database -- usually because it depends on something that was done to production by hand and is described by no migration. Fix the migration, not this check.`,
		};
	}
	return {
		ok: true,
		message: `the full chain applies from empty (${applied} of ${expected})`,
	};
}

/**
 * No migration may call out to Stripe.
 *
 * `install_stripe_wrapper`'s step 4 runs `import foreign schema stripe from
 * server stripe_server`, which is a LIVE Stripe API call, and its step 2 creates
 * the server from a Vault secret that exists only on production. Both are
 * guarded on that secret. This asserts the guard held: the `wrappers` extension
 * SHOULD be installed (step 0 ran), while the server and the imported foreign
 * tables should NOT exist here.
 */
export function assertNoMigrationReachedTheNetwork(
	wrappersRaw: string,
	serverRaw: string,
	tablesRaw: string,
): AssertionResult {
	const wrappers = parseCount(wrappersRaw);
	const server = parseCount(serverRaw);
	const tables = parseCount(tablesRaw);

	if (wrappers === null || server === null || tables === null) {
		return {
			ok: false,
			message: `could not read the Stripe FDW state: expected three counts, read ${JSON.stringify([wrappersRaw, serverRaw, tablesRaw])}. The psql query or the \`tr\`/\`read\` split in the workflow is broken, so this cannot tell whether a migration called Stripe.`,
		};
	}
	if (wrappers !== 1) {
		return {
			ok: false,
			message:
				"the wrappers extension is absent, so install_stripe_wrapper did not run its step 0. Replay would have failed at that migration.",
		};
	}
	if (server !== 0 || tables !== 0) {
		return {
			ok: false,
			message: `a migration created stripe_server (${server}) or imported foreign tables (${tables}) in CI. That means it bound a Vault secret and called the Stripe API from a migration. The guard in install_stripe_wrapper has stopped holding.`,
		};
	}
	return {
		ok: true,
		message: "the Stripe FDW steps correctly skipped; no migration called out",
	};
}

/** One owner's figures as `get_billing_insights` returns them, in dollars. */
interface BillingInsightsFigures {
	readonly totalRevenue: number;
	readonly mrr: number;
	readonly churnRate: number;
	readonly tenantCount: number;
	readonly unpaidTotal: number;
	readonly unpaidCount: number;
	readonly lateFeeTotal: number;
}

/**
 * What `scripts/migration-replay-billing-insights.sql` must print: one JSON
 * object, a key per call. The fixture's header lists the ledger it seeds; the
 * arithmetic for each figure is here.
 *
 * owner_a, the whole ledger:
 *   unpaidTotal 1185.50. Lease A1's balance is 2585.50 of charges (300 opening
 *     + 1000 + 60 + 1000 + 75 + 250.50 + 1000 + 50 + 35 - 100 credit, then the
 *     three reversals, -1000, -50 and -35) less 1400.00 received (1000 + 400 +
 *     1000, then the reversal of the March receipt, -1000). Lease A2's is
 *     1540 - 2040 = -500, floored to 0: summing it would give 685.50. Lease A3
 *     is inactive (it would add 930), and the two rows on A1 that carry owner
 *     B's id count for nobody (they would add 999 and take off 600).
 *   unpaidCount 4: on A1 the January manual charge, February's rent (400 of
 *     1000 paid), the February 6 late fee and the February 28 manual charge.
 *     Not January's rent (paid), not the three reversed charges, not the
 *     opening balance or the credit (no paid state), nothing on A2 (paid,
 *     overpaid) and nothing on A3 (inactive, which would add 2).
 *   lateFeeTotal 115.00: 75 on A1 plus A2's 40, which was paid and still counts.
 *     Not the reversed 50 and 35, nor their reversal rows (counting the
 *     reversal rows instead gives 30), and not A3's 30 (inactive).
 * owner_a_february, the window 2026-02-01 to 2026-02-28, both ends inclusive:
 *   February's rent (on the start date), the February 6 late fee and the
 *   manual charge (on the end date): 1325.50 charged, less the 400 received
 *   against the rent. 925.50, 3, 75.00. A2 has no charge in the window, so its
 *   January overpayment is not netted in. The 35.00 late fee is dated February
 *   15 but its reversal is dated the day the gate runs, outside the window: a
 *   window that counted the rows inside it would add 35 to the total and the
 *   late fees and 1 to the count.
 * owner_b: B1's 700 rent and 20 late fee, both unpaid; none of owner A's rows,
 *   and not the two rows owner B's id was stamped on in owner A's lease.
 *
 * The other four keys are the function's unchanged point-in-time figures:
 * active scheduled rent (A: 1000 + 1500; B: 700), twelve times that, no
 * ended, terminated or expired lease, and one tenant per active lease.
 */
export const EXPECTED_BILLING_INSIGHTS: Readonly<
	Record<"owner_a" | "owner_a_february" | "owner_b", BillingInsightsFigures>
> = {
	owner_a: {
		totalRevenue: 30000,
		mrr: 2500,
		churnRate: 0,
		tenantCount: 2,
		unpaidTotal: 1185.5,
		unpaidCount: 4,
		lateFeeTotal: 115,
	},
	owner_a_february: {
		totalRevenue: 30000,
		mrr: 2500,
		churnRate: 0,
		tenantCount: 2,
		unpaidTotal: 925.5,
		unpaidCount: 3,
		lateFeeTotal: 75,
	},
	owner_b: {
		totalRevenue: 8400,
		mrr: 700,
		churnRate: 0,
		tenantCount: 1,
		unpaidTotal: 720,
		unpaidCount: 2,
		lateFeeTotal: 20,
	},
};

/**
 * EXECUTE on the function, as the migration grants it: the owner's session and
 * the service role (export-report, generate-pdf), never anon. A PUBLIC grant
 * would show here as anon=true.
 */
export const EXPECTED_BILLING_INSIGHTS_EXECUTE: Readonly<
	Record<"anon" | "authenticated" | "service_role", boolean>
> = { anon: false, authenticated: true, service_role: true };

/** A plain JSON object, or null for anything else (arrays included). */
function asJsonObject(value: unknown): Record<string, unknown> | null {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}
	return Object.fromEntries(Object.entries(value));
}

/** `raw` as a JSON object, or null when it is not JSON or not an object. */
function parseJsonObject(raw: string): Record<string, unknown> | null {
	try {
		return asJsonObject(JSON.parse(raw));
	} catch {
		return null;
	}
}

/** Push a line for every key of `expected` that `actual` does not equal. */
function collectMismatches(
	label: string,
	actual: Record<string, unknown> | null,
	expected: Readonly<Record<string, number | boolean>>,
	mismatches: string[],
): void {
	if (actual === null) {
		mismatches.push(`${label}: absent or not an object`);
		return;
	}
	for (const [key, value] of Object.entries(expected)) {
		if (actual[key] !== value) {
			mismatches.push(
				`${label}.${key}: expected ${JSON.stringify(value)}, got ${JSON.stringify(actual[key])}`,
			);
		}
	}
}

/**
 * `get_billing_insights` must compute the Payment Summary from the rent ledger.
 *
 * From 20260528231201_repair_analytics_rpcs.sql until
 * 20261102055449_billing_insights_from_rent_ledger.sql it returned
 * `unpaidTotal`, `unpaidCount` and `lateFeeTotal` as the literal 0, so every
 * owner's Payment Summary cards and export rows read 0 while the ledger held the
 * real figures, and nothing in CI could see it: no job ran the function against
 * a ledger. `rls-security` runs against production and asserts only who may
 * call it. This checks the figures, the date window, the owner scoping, the
 * guard and the grants, against the fixture's seeded ledger, in the stack this
 * workflow replayed.
 */
export function assertBillingInsightsFromLedger(raw: string): AssertionResult {
	const trimmed = raw.trim();
	if (trimmed === "") {
		return {
			ok: false,
			message:
				"the billing-insights fixture printed nothing. psql ran scripts/migration-replay-billing-insights.sql without producing its one JSON line, so this is a broken fixture or query (an owner it looks up was not seeded?), NOT a wrong figure.",
		};
	}
	const parsed = parseJsonObject(trimmed);
	if (parsed === null) {
		return {
			ok: false,
			message: `the billing-insights fixture did not print a JSON object, read ${JSON.stringify(trimmed)}. The fixture's final select or the psql flags (-t -A -q) changed, so nothing here can compare a figure.`,
		};
	}

	// THE DEFECT THIS CHECK EXISTS FOR. All three ledger figures at 0 against a
	// ledger that owes money is the hard-coded body, not an arithmetic slip.
	const ownerA = asJsonObject(parsed["owner_a"]);
	if (
		ownerA !== null &&
		ownerA["unpaidTotal"] === 0 &&
		ownerA["unpaidCount"] === 0 &&
		ownerA["lateFeeTotal"] === 0
	) {
		return {
			ok: false,
			message:
				"get_billing_insights returned unpaidTotal, unpaidCount and lateFeeTotal as 0 for an owner whose seeded ledger owes 1185.50: that is the hard-coded body, not a ledger computation. The migration that computes them from rent_charges / rent_receipts did not apply, or a later one replaced it with a copy of an older body.",
		};
	}

	const mismatches: string[] = [];
	for (const [label, expected] of Object.entries(EXPECTED_BILLING_INSIGHTS)) {
		collectMismatches(
			label,
			asJsonObject(parsed[label]),
			{ ...expected },
			mismatches,
		);
	}
	collectMismatches(
		"execute",
		asJsonObject(parsed["execute"]),
		EXPECTED_BILLING_INSIGHTS_EXECUTE,
		mismatches,
	);
	if (parsed["guard_refuses_another_owner"] !== true) {
		mismatches.push(
			`guard_refuses_another_owner: expected true, got ${JSON.stringify(parsed["guard_refuses_another_owner"])}. Owner A asked for owner B's figures and was not refused with 'Access denied'.`,
		);
	}

	if (mismatches.length > 0) {
		return {
			ok: false,
			message: `get_billing_insights does not return the figures the seeded ledger implies. EXPECTED_BILLING_INSIGHTS in scripts/migration-replay-assertions.ts shows the arithmetic for each; fix the function (or, if the fixture changed, both files together), not this check.\n${mismatches.join("\n")}`,
		};
	}
	return {
		ok: true,
		message:
			"get_billing_insights computes the Payment Summary from the ledger (owner A 1185.50 unpaid, 4 outstanding, 115.00 late fees; the February window 925.50, 3, 75.00; owner B 720.00, 2, 20.00), refuses another owner, and is executable by authenticated and service_role only",
	};
}

/** The rows the seeder produced must be exactly what the suites require. */
export function assertSeededCast(rowsRaw: string): AssertionResult {
	const received = normalizeRows(rowsRaw);
	const expected = [...EXPECTED_SEEDED_CAST].sort();

	if (received.length === 0) {
		return {
			ok: false,
			message:
				"the seeded-cast query returned no rows at all. Either scripts/seed-test-users.ts did not run or it wrote to a different database -- the three e2e users do not exist.",
		};
	}
	if (received.join("\n") === expected.join("\n")) {
		return { ok: true, message: "the test cast is correct" };
	}

	// THE REGRESSION THIS FILE EXISTS FOR. If the only difference is `t`/`f`
	// where `true`/`false` belongs, say so: psql prints a boolean as t/f for a
	// COLUMN but true/false when it is concatenated with `||`, as the gate's
	// query does. Without this branch the failure reads as "the users are
	// misconfigured", which is what made the original bug so expensive.
	const widened = received.map((row) =>
		row
			.replace(/^([^|]*)\|t\|/, "$1|true|")
			.replace(/^([^|]*)\|f\|/, "$1|false|"),
	);
	if ([...widened].sort().join("\n") === expected.join("\n")) {
		return {
			ok: false,
			message: `the seeded rows differ from the expectation ONLY in how the boolean is spelled: got t/f, expected true/false. psql -tAc prints a boolean as t/f for a COLUMN but true/false when the boolean is concatenated with \`||\`, which is what the gate's query does. The users are fine; the expectation or the query changed. Received:\n${received.join("\n")}`,
		};
	}

	const missing = expected.filter((row) => !received.includes(row));
	const unexpected = received.filter((row) => !expected.includes(row));
	// Duplicates are the one difference the two filters above cannot see: every
	// row is present on both sides, so both come back empty and the annotation
	// would be its static preamble with nothing in it about what differed.
	const duplicated = [
		...new Set(
			received.filter((row, index) => received.indexOf(row) !== index),
		),
	];
	return {
		ok: false,
		message: `seeded users are not in the state the suites require. Owner A must be subscription_status=active or the proxy gate sends e2e to /pricing, the admin must have is_admin=true, and each must have exactly 1 auth.identities row.${missing.length > 0 ? `\nmissing:\n${missing.join("\n")}` : ""}${unexpected.length > 0 ? `\nunexpected:\n${unexpected.join("\n")}` : ""}${duplicated.length > 0 ? `\nreturned more than once (the join matched extra rows):\n${duplicated.join("\n")}` : ""}`,
	};
}
