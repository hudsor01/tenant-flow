/**
 * The migration-replay gate's three assertions, as pure functions.
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
 * The gate's query wraps the nullable columns in `coalesce`, and that is not
 * cosmetic: `subscription_status` and `auth.users.email` are both nullable, and
 * `||` with a NULL operand yields NULL, so psql printed an empty line for the
 * whole row and `normalizeRows` dropped it. A single unset column therefore
 * came back as "the three e2e users do not exist". Anything spelled
 * `<null-...>` in a failure here is a NULL column, not a missing user.
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
	// The workflow reads this from `supabase db query` and falls back to psql in
	// the container. If BOTH produce nothing -- a renamed container, a CLI that
	// dropped the subcommand -- the old inline comparison compared "348" against
	// "" and reported an incomplete replay, blaming the migrations for a broken
	// query.
	if (applied === null) {
		return {
			ok: false,
			message: `could not read the applied-migration count out of the database: expected a number, read ${JSON.stringify(appliedRaw)}. Neither \`supabase db query\` nor the psql fallback returned a count, so this is a broken query, NOT an incomplete replay. Check the container name and the CLI version before touching any migration.`,
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
