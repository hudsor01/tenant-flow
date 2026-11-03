/**
 * The migration-replay gate's assertions, as pure functions.
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
	readonly collectedTotal: number;
	readonly creditBalanceTotal: number;
	readonly chargedTotal: number;
	readonly openingTotal: number;
	readonly rentChargedTotal: number;
	readonly lateFeeChargedTotal: number;
	readonly manualChargedTotal: number;
	readonly creditTotal: number;
}

/** The calls the fixture makes, one key each in its JSON line. */
type BillingInsightsCall =
	| "owner_a"
	| "owner_a_february"
	| "owner_a_as_of_march"
	| "owner_a_as_of_january"
	| "owner_b";

/**
 * What `scripts/migration-replay-billing-insights.sql` must print: one JSON
 * object, a key per call. The fixture's header lists the ledger it seeds; the
 * arithmetic for each figure is here. Owner A's leases are A1 and A2 (A3 is
 * inactive and counts for nothing: it would add 930 owed and 930 charged).
 *
 * owner_a, the whole ledger as it stands:
 *   unpaidTotal 1185.50. Lease A1's balance is 2585.50 of charges (300 opening
 *     + 1000 + 60 + 1000 + 75 + 250.50 + 1000 + 50 + 35 - 100 credit, then the
 *     three reversals, -1000, -50 and -35) less 1400.00 received (1000 + 400 +
 *     1000 + 75, then the reversals of the March receipt, -1000, and of the
 *     late-fee receipt, -75). Lease A2's is 1640 (1500 + 40, the 200 opening
 *     and its reversal, the 80 manual charge, its reversal and the reversal
 *     of that reversal, +80 - 80 + 80, and the 20 late fee the same way,
 *     +20 - 20 + 20) - 2040 = -400, floored to 0: summing it would give
 *     785.50. The two rows on A1 that carry owner B's id count for nobody
 *     (they would add 999 and take off 600).
 *   unpaidCount 4: on A1 the January manual charge, February's rent (400 of
 *     1000 paid), the February 6 late fee (its 75 receipt was reversed) and the
 *     February 28 manual charge. Not January's rent (paid), not the three
 *     reversed charges, not the opening balances or the credit (no paid state),
 *     nothing on A2 (paid, overpaid; its 80 manual charge and its 20 late fee
 *     have been reversed, so they are no invoices, though its balance counts
 *     the 100 the double reversals restored) and nothing on A3 (which would
 *     add 2).
 *   lateFeeTotal 115.00: 75 on A1 plus A2's 40, which was paid and still counts.
 *     Not the reversed 50 and 35, nor their reversal rows (counting the
 *     reversal rows instead gives 30), not A2's reversed 20, and not A3's 30.
 *   collectedTotal 3440.00: A1's 1400 and A2's 2040, every receipt and every
 *     reversal at its sign.
 *   creditBalanceTotal 400.00: A2's 2040 received less 1640 charged. A1 owes,
 *     so it adds nothing here. Summing only the charges that stand (no
 *     reversal, not reversed) would drop the restored 80 and 20 and give 500.
 *   chargedTotal 4225.50: A1's 2585.50 and A2's 1640.
 *   openingTotal 300.00: A1's 300, and A2's 200 with its reversal, -200.
 *   The partition: 3440 + 1185.50 - 400 = 4225.50.
 *   By type, the rest of chargedTotal: rentChargedTotal 3500.00 (A1's three
 *     1000s less the reversed March one, and A2's 1500), lateFeeChargedTotal
 *     135.00 (A1's 75 + 50 - 50 + 35 - 35, and A2's 40 + 20 - 20 + 20: here it
 *     parts from lateFeeTotal, which is 20 less, the reversed 20 not standing),
 *     manualChargedTotal 390.50 (A1's 60 + 250.50, A2's 80 - 80 + 80),
 *     creditTotal -100.00. With openingTotal they sum to chargedTotal:
 *     3500 + 135 + 390.50 - 100 + 300 = 4225.50.
 * owner_a_february, the period 2026-02-01 to 2026-02-28, as of February 28:
 *   the period's charges that stand that day are February's rent (on the start
 *   date), the February 6 late fee, the manual charge (on the end date) and the
 *   35.00 late fee dated February 15, whose reversal is dated the day the gate
 *   runs, after the end date: as of February 28 it stood. 1360.50 charged, 400
 *   received against them (the 75 against the late fee came on March 31), so
 *   960.50 owed, 4 outstanding, 75 + 35 = 110.00 of late fees, 400.00
 *   collected, no credit balance and no opening balance. A2 has no charge in
 *   the period, so its January overpayment is not netted in. Reading today's
 *   reversals instead of the ones on the ledger by February 28 would drop the
 *   35 (925.50, 3, 75.00). By type: 1000 rent, 110 of late fees, 250.50 of
 *   manual charges, no credit.
 * owner_a_as_of_march, the end date 2026-03-31 alone, an as-of date:
 *   the ledger as it stood at the end of March 31. A1 has every charge except
 *   the 35.00 late fee's reversal (dated the day the gate runs): 2620.50
 *   charged. It has every receipt up to and including March 31's 75 against
 *   the late fee, but neither reversal (both dated the day the gate runs):
 *   1000 + 400 + 1000 + 75 = 2475.00 received. So A1 owed 145.50; A2 is
 *   unchanged (-400). 145.50 unpaid, 4515.00 collected, 400.00 in credit,
 *   4260.50 charged, 300.00 opening; 4515 + 145.50 - 400 = 4260.50.
 *   Outstanding that day: the January manual charge, February's rent, the
 *   February 28 manual charge and the 35.00 late fee, 4 (the February 6 late
 *   fee was paid; the March rent and late fee were already reversed, their
 *   reversals dated March 1 and 6). Late fees 75 + 35 + 40 = 150.00. By type:
 *   3500 rent, 170 of late fees (A1's 75 + 50 - 50 + 35, the 35 still
 *   standing, and A2's 60), 390.50 manual, -100 credit:
 *   3500 + 170 + 390.50 - 100 + 300 = 4260.50.
 * owner_a_as_of_january, the end date 2026-01-31 alone, as the income
 *   statement and the cash flow ask for the day before February 1:
 *   A1 has its opening 300, January's rent and the 60 manual charge (1360
 *   charged) and January's 1000 received: it owes 360. A2 has all of its
 *   charges (every one is dated in January: 1640) and all of its receipts
 *   (2040): 400 in credit. 360.00 unpaid, 1 outstanding (the manual charge),
 *   40.00 of late fees (A2's), 3040.00 collected, 400.00 in credit, 3000.00
 *   charged, 300.00 opening; 3040 + 360 - 400 = 3000. By type: 2500 rent, 60
 *   of late fees (A2's 40, and its 20 restored), 140 manual (60, and A2's
 *   80), no credit: 2500 + 60 + 140 + 300 = 3000.
 *   So February 1 to March 31, the difference of the two as-of calls, is
 *   1000 rent, 110 of late fees, 250.50 manual and -100 of credit charged
 *   (1260.50 of revenue, every line the income statement shows), and
 *   4515 - 3040 = 1475.00 received (400 on February 5, 1000 on March 2 and 75
 *   on March 31: the cash flow's inflow).
 * owner_b: B1's 700 rent and 20 late fee, both unpaid, nothing received; none
 *   of owner A's rows, and not the two rows owner B's id was stamped on in
 *   owner A's lease.
 *
 * The other four keys are the function's unchanged point-in-time figures:
 * active scheduled rent (A: 1000 + 1500; B: 700), twelve times that, no
 * ended, terminated or expired lease, and one tenant per active lease. The
 * dates do not touch them.
 */
export const EXPECTED_BILLING_INSIGHTS: Readonly<
	Record<BillingInsightsCall, BillingInsightsFigures>
> = {
	owner_a: {
		totalRevenue: 30000,
		mrr: 2500,
		churnRate: 0,
		tenantCount: 2,
		unpaidTotal: 1185.5,
		unpaidCount: 4,
		lateFeeTotal: 115,
		collectedTotal: 3440,
		creditBalanceTotal: 400,
		chargedTotal: 4225.5,
		openingTotal: 300,
		rentChargedTotal: 3500,
		lateFeeChargedTotal: 135,
		manualChargedTotal: 390.5,
		creditTotal: -100,
	},
	owner_a_february: {
		totalRevenue: 30000,
		mrr: 2500,
		churnRate: 0,
		tenantCount: 2,
		unpaidTotal: 960.5,
		unpaidCount: 4,
		lateFeeTotal: 110,
		collectedTotal: 400,
		creditBalanceTotal: 0,
		chargedTotal: 1360.5,
		openingTotal: 0,
		rentChargedTotal: 1000,
		lateFeeChargedTotal: 110,
		manualChargedTotal: 250.5,
		creditTotal: 0,
	},
	owner_a_as_of_march: {
		totalRevenue: 30000,
		mrr: 2500,
		churnRate: 0,
		tenantCount: 2,
		unpaidTotal: 145.5,
		unpaidCount: 4,
		lateFeeTotal: 150,
		collectedTotal: 4515,
		creditBalanceTotal: 400,
		chargedTotal: 4260.5,
		openingTotal: 300,
		rentChargedTotal: 3500,
		lateFeeChargedTotal: 170,
		manualChargedTotal: 390.5,
		creditTotal: -100,
	},
	owner_a_as_of_january: {
		totalRevenue: 30000,
		mrr: 2500,
		churnRate: 0,
		tenantCount: 2,
		unpaidTotal: 360,
		unpaidCount: 1,
		lateFeeTotal: 40,
		collectedTotal: 3040,
		creditBalanceTotal: 400,
		chargedTotal: 3000,
		openingTotal: 300,
		rentChargedTotal: 2500,
		lateFeeChargedTotal: 60,
		manualChargedTotal: 140,
		creditTotal: 0,
	},
	owner_b: {
		totalRevenue: 8400,
		mrr: 700,
		churnRate: 0,
		tenantCount: 1,
		unpaidTotal: 720,
		unpaidCount: 2,
		lateFeeTotal: 20,
		collectedTotal: 0,
		creditBalanceTotal: 0,
		chargedTotal: 720,
		openingTotal: 0,
		rentChargedTotal: 700,
		lateFeeChargedTotal: 20,
		manualChargedTotal: 0,
		creditTotal: 0,
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
	expected: Readonly<Record<string, number | boolean | string | null>>,
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

/** A dollar figure as whole cents, or null when it is not a number. */
function cents(value: unknown): number | null {
	return typeof value === "number" ? Math.round(value * 100) : null;
}

/**
 * Push a line when a call's four balance-sheet figures do not partition the
 * ledger: collectedTotal + unpaidTotal - creditBalanceTotal must equal
 * chargedTotal. The balance sheet balances on that identity, so a break here is
 * an unbalanced sheet. Compared in whole cents, because a sum of 2-decimal
 * dollar figures is not exact in floating point. A figure that is absent or
 * not a number is left to collectMismatches, which already names it.
 */
function collectPartitionBreaks(
	label: string,
	actual: Record<string, unknown> | null,
	mismatches: string[],
): void {
	if (actual === null) return;
	const collected = cents(actual["collectedTotal"]);
	const unpaid = cents(actual["unpaidTotal"]);
	const credit = cents(actual["creditBalanceTotal"]);
	const charged = cents(actual["chargedTotal"]);
	if (
		collected === null ||
		unpaid === null ||
		credit === null ||
		charged === null
	) {
		return;
	}
	if (collected + unpaid - credit !== charged) {
		mismatches.push(
			`${label}: collectedTotal + unpaidTotal - creditBalanceTotal is ${(collected + unpaid - credit) / 100} but chargedTotal is ${charged / 100}. The four figures must partition the ledger, or the balance sheet built on them does not balance.`,
		);
	}
}

/**
 * Push a line when a call's by-type figures do not partition chargedTotal:
 * rentChargedTotal + lateFeeChargedTotal + manualChargedTotal + creditTotal +
 * openingTotal must equal chargedTotal. The income statement's revenue lines
 * are those four figures as of two dates, differenced, and the balance sheet's
 * Year-to-Date Income and Retained Earnings are chargedTotal less openingTotal
 * differenced over the same dates, so a break here is an income statement that
 * does not tie to the balance sheet. In whole cents, as above; an absent figure
 * is left to collectMismatches.
 */
function collectTypeSplitBreaks(
	label: string,
	actual: Record<string, unknown> | null,
	mismatches: string[],
): void {
	if (actual === null) return;
	const parts = [
		cents(actual["rentChargedTotal"]),
		cents(actual["lateFeeChargedTotal"]),
		cents(actual["manualChargedTotal"]),
		cents(actual["creditTotal"]),
		cents(actual["openingTotal"]),
	];
	const charged = cents(actual["chargedTotal"]);
	if (charged === null || parts.some((part) => part === null)) return;
	const sum = parts.reduce<number>((total, part) => total + (part ?? 0), 0);
	if (sum !== charged) {
		mismatches.push(
			`${label}: rentChargedTotal + lateFeeChargedTotal + manualChargedTotal + creditTotal + openingTotal is ${sum / 100} but chargedTotal is ${charged / 100}. The by-type figures must partition chargedTotal, or the income statement built on them does not tie to the balance sheet.`,
		);
	}
}

/**
 * `get_billing_insights` must compute the Payment Summary and the statements'
 * ledger figures from the rent ledger.
 *
 * From 20260528231201_repair_analytics_rpcs.sql until
 * 20261102055449_billing_insights_from_rent_ledger.sql it returned
 * `unpaidTotal`, `unpaidCount` and `lateFeeTotal` as the literal 0, so every
 * owner's Payment Summary cards and export rows read 0 while the ledger held the
 * real figures, and nothing in CI could see it: no job ran the function against
 * a ledger. `rls-security` runs against production and asserts only who may
 * call it. This checks the figures, the as-of date, the period, the partition
 * the balance sheet balances on, the by-type split the income statement ties
 * to it with, the owner scoping, the guard and the grants, against the
 * fixture's seeded ledger, in the stack this workflow replayed.
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
		const actual = asJsonObject(parsed[label]);
		collectMismatches(label, actual, { ...expected }, mismatches);
		collectPartitionBreaks(label, actual, mismatches);
		collectTypeSplitBreaks(label, actual, mismatches);
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
			"get_billing_insights computes the ledger figures (owner A 1185.50 unpaid, 4 outstanding, 115.00 late fees, 3440.00 collected, 400.00 in credit, 4225.50 charged, of it 3500.00 rent, 135.00 late fees, 390.50 manual, -100.00 credit; the February period 960.50, 4, 110.00; as of March 31 145.50 unpaid and 4515.00 collected; as of January 31 360.00 unpaid and 3040.00 collected; owner B 720.00, 2, 20.00), each call's figures partition the ledger and chargedTotal by type, it refuses another owner, and is executable by authenticated and service_role only",
	};
}

/** One row of `get_property_performance_analytics`, as the fixture prints it. */
interface PropertyPerformanceRow {
	readonly property_id: string;
	readonly property_name: string;
	readonly occupancy_rate: number;
	readonly total_revenue: number;
	readonly total_expenses: number;
	readonly net_income: number;
	readonly timeframe: string;
}

/** The calls the property-performance fixture makes, one key each. */
type PropertyPerformanceCall =
	| "owner_a_tax_2025"
	| "owner_a_30d"
	| "owner_a_default"
	| "owner_a_beta_2025"
	| "owner_a_limit_1"
	| "owner_b_tax_2025";

/** The tax-year window the fixture asks for, and the one the body must state. */
const TAX_2025_REQUEST = "2025-01-01..2025-12-31";
const TAX_2025_WINDOW = "2025-01-01/2025-12-31";

/** `ymd` moved by `days` calendar days, or null when `ymd` is no calendar day. */
function shiftYmd(ymd: string, days: number): string | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
	if (!match) return null;
	const [year, month, day] = [match[1], match[2], match[3]].map(Number);
	if (year === undefined || month === undefined || day === undefined) {
		return null;
	}
	const at = (offset: number) =>
		new Date(Date.UTC(year, month - 1, day + offset))
			.toISOString()
			.slice(0, 10);
	// 2026-02-30 would roll over to March: it is no calendar day.
	return at(0) === ymd ? at(days) : null;
}

/**
 * What `scripts/migration-replay-property-performance.sql` must print for each
 * call, given the trailing window the day the gate runs implies. The fixture's
 * header lists the portfolio; the arithmetic is here.
 *
 * owner_a_tax_2025, 2025-01-01..2025-12-31, by name:
 *   Alpha Court: rent received 2750.50 = 1000 (Jan 1, the first day) + 1250.50
 *     (Dec 31, the last) + 500 (Jun 15; its reversal is dated the day the gate
 *     runs, after the year). Not the 1000 of Dec 31, 2024 or the 800 of Jan 1,
 *     2026 (an exclusive edge or no window adds or drops one), not the 600
 *     stamped with owner B's id, not the 444 on the soft-deleted lease.
 *     Expenses 200.25 (Mar 10), not the soft-deleted 15 or 2026's 50. Net
 *     2550.25. Occupancy 50.00: A1 occupied of A1 and A2 (A3 is inactive and
 *     out of the denominator).
 *   Beta House: 750.00 received, not the 222 stamped with owner A's id on
 *     owner B's lease (reading the receipt's owner alone would count it).
 *     Expenses 100.00 (Dec 31). Net 650.00. Occupancy 100.00.
 *   Delta Lot: no units, so 0 everywhere.
 *   Echo Barn, soft-deleted, spent 12.00 in the year (not the soft-deleted
 *     9.99) and received nothing: listed, 0.00 received, 12.00 spent, -12.00
 *     net, 0.00 occupied (H1 available).
 *   Gamma Flats, soft-deleted after the year, received 333.00 in it: listed,
 *     333.00 received, nothing spent, 333.00 net, 100.00 occupied (G1). A
 *     tax year's rent received is never dropped because the property was
 *     deleted later. (Its 33.00 of T-2 is in no trailing window: there a
 *     deleted property is not listed.)
 *   Foxtrot Mews, soft-deleted, has nothing in the year (its 44.00 was
 *     received in 2024, its 8.00 is soft-deleted, its 6.00 is 2026's): no row.
 *   Every row's timeframe is 2025-01-01/2025-12-31: the body before this one
 *     echoes the request, 2025-01-01..2025-12-31.
 * owner_a_30d and owner_a_default, the trailing 30 days [T-30, T]:
 *   Alpha Court: 300.00 (T-30) + 120.25 (T) - 500.00 (the reversal, posted T)
 *     = -79.75: the money handed back in the window. Not 999 (T-31), not 77
 *     (T+1, a receipt dated in the future), not the soft-deleted lease's 55.
 *     Expenses 40.00 (T-3), not the 66 dated T+10 (the body before this one
 *     had no upper bound and counted it). Net -119.75.
 *   Beta House: 200.00 (T-5), expenses 25.00 (T-30, the first day). Net
 *     175.00.
 *   Delta Lot: 0.
 * owner_a_beta_2025: p_property_id = Beta House: that one row.
 * owner_a_limit_1: p_limit 1: Alpha Court's row alone.
 * owner_b_tax_2025: Bravo Place, 700.00 received (not the 111 stamped with
 *   owner A's id), 10.00 of expenses, 690.00 net, 100.00 occupied; Cedar Row,
 *   400.00 + 100.00 - 100.00 (a reversal in the year) + 250.00 (on C2, a
 *   soft-deleted unit) = 650.00, not LC3's 90.00 (a soft-deleted lease) nor
 *   2024's 55.00, no expenses, 100.00 occupied (C1 of C1; C2 is out of the
 *   denominator); none of owner A's properties.
 */
export function expectedPropertyPerformance(
	trailingWindow: string,
): Readonly<
	Record<PropertyPerformanceCall, readonly PropertyPerformanceRow[]>
> {
	const row = (
		id: string,
		name: string,
		occupancy: number,
		revenue: number,
		expenses: number,
		net: number,
		timeframe: string,
	): PropertyPerformanceRow => ({
		property_id: id,
		property_name: name,
		occupancy_rate: occupancy,
		total_revenue: revenue,
		total_expenses: expenses,
		net_income: net,
		timeframe,
	});
	const ALPHA = "c1000000-0000-4000-8000-00000000a001";
	const BETA = "c1000000-0000-4000-8000-00000000a002";
	const DELTA = "c1000000-0000-4000-8000-00000000a003";
	const GAMMA = "c1000000-0000-4000-8000-00000000a004";
	const ECHO = "c1000000-0000-4000-8000-00000000a005";
	const BRAVO = "c1000000-0000-4000-8000-00000000b001";
	const CEDAR = "c1000000-0000-4000-8000-00000000b002";
	const alpha2025 = row(
		ALPHA,
		"Alpha Court",
		50,
		2750.5,
		200.25,
		2550.25,
		TAX_2025_WINDOW,
	);
	const beta2025 = row(BETA, "Beta House", 100, 750, 100, 650, TAX_2025_WINDOW);
	const trailing = [
		row(ALPHA, "Alpha Court", 50, -79.75, 40, -119.75, trailingWindow),
		row(BETA, "Beta House", 100, 200, 25, 175, trailingWindow),
		row(DELTA, "Delta Lot", 0, 0, 0, 0, trailingWindow),
	];
	return {
		owner_a_tax_2025: [
			alpha2025,
			beta2025,
			row(DELTA, "Delta Lot", 0, 0, 0, 0, TAX_2025_WINDOW),
			row(ECHO, "Echo Barn", 0, 0, 12, -12, TAX_2025_WINDOW),
			row(GAMMA, "Gamma Flats", 100, 333, 0, 333, TAX_2025_WINDOW),
		],
		owner_a_30d: trailing,
		owner_a_default: trailing,
		owner_a_beta_2025: [beta2025],
		owner_a_limit_1: [alpha2025],
		owner_b_tax_2025: [
			row(BRAVO, "Bravo Place", 100, 700, 10, 690, TAX_2025_WINDOW),
			row(CEDAR, "Cedar Row", 100, 650, 0, 650, TAX_2025_WINDOW),
		],
	};
}

/** The grants the migration keeps: the owner's session and the service role. */
export const EXPECTED_PROPERTY_PERFORMANCE_EXECUTE: Readonly<
	Record<"anon" | "authenticated" | "service_role", boolean>
> = { anon: false, authenticated: true, service_role: true };

/** The two ledger helpers both functions read (20261102055449). */
const LEDGER_HELPERS = [
	"public.rent_ledger_leases(uuid)",
	"public.rent_ledger_receipts(uuid)",
] as const;

/** A private helper's EXECUTE: no client role may call it. */
const NO_CLIENT_ROLE: Readonly<
	Record<"anon" | "authenticated" | "service_role", boolean>
> = { anon: false, authenticated: false, service_role: false };

/**
 * Owner C's 101 properties, all listed with p_limit NULL ("Lot 101" sorts
 * last), and p_limit 5 still five.
 */
const EVERY_PROPERTY_LISTED: Readonly<Record<string, number | string>> = {
	owner_c_all_count: 101,
	owner_c_last_name: "Lot 101",
	owner_c_limit_5_count: 5,
};

/**
 * Each owner's 2025 rent received and expenses, to the cent, from the year-end
 * summary and from its table. Owner A: 2750.50 + 750.00 + 333.00 (Gamma
 * Flats, deleted after the year) received, 200.25 + 100.00 + 12.00 (Echo
 * Barn, deleted) spent. Owner B: 700.00 + 650.00, and 10.00.
 */
const YEAR_END_TIES_2025_CENTS: Readonly<
	Record<string, { readonly received: number; readonly expenses: number }>
> = {
	owner_a_tie: { received: 383_350, expenses: 31_225 },
	owner_b_tie: { received: 135_000, expenses: 1_000 },
};

/**
 * Push a line unless an owner's year-end summary and tax table tie: the
 * summary's rent received (collectedTotal as of 2025-12-31 less as of
 * 2024-12-31, get_billing_insights) must equal the table's total (the sum of
 * get_property_performance_analytics' total_revenue over 2025), and the
 * summary's expenses (get_expense_summary for the year) the table's, each the
 * figure YEAR_END_TIES_2025_CENTS states, in whole cents: across a reversal,
 * a soft-deleted unit, a soft-deleted lease and soft-deleted properties.
 */
function collectYearEndTie(
	label: string,
	value: unknown,
	problems: string[],
): void {
	const expected = YEAR_END_TIES_2025_CENTS[label];
	const tie = asJsonObject(value);
	const end = cents(tie?.["collected_2025_end"]);
	const start = cents(tie?.["collected_2024_end"]);
	const table = cents(tie?.["table_total"]);
	const spent = cents(tie?.["expense_total"]);
	const tableSpent = cents(tie?.["table_expenses"]);
	if (
		expected === undefined ||
		end === null ||
		start === null ||
		table === null ||
		spent === null ||
		tableSpent === null
	) {
		problems.push(
			`${label}: expected five numbers, got ${JSON.stringify(value)}`,
		);
		return;
	}
	if (end - start !== table || table !== expected.received) {
		problems.push(
			`${label}: the year-end summary reads ${(end - start) / 100} of 2025 rent received and its table ${table / 100}; both must be ${expected.received / 100}. The two functions must count the same receipts, a property deleted later included.`,
		);
	}
	if (spent !== tableSpent || tableSpent !== expected.expenses) {
		problems.push(
			`${label}: the year-end summary reads ${spent / 100} of 2025 expenses and its table ${tableSpent / 100}; both must be ${expected.expenses / 100}. The table must list every property that spent in the year, a deleted one included.`,
		);
	}
}

/** What a backwards range must raise: invalid_parameter_value. */
const BACKWARDS_RANGE_SQLSTATE = "22023";

/**
 * `get_property_performance_analytics` must report each property's rent
 * received from the rent ledger, over the window asked for, and say which.
 *
 * From 20260528231201_repair_analytics_rpcs.sql until
 * 20261102163709_property_performance_rent_received.sql it returned
 * `0::numeric AS total_revenue`, so every property's revenue read $0 and its
 * net income was its expenses negated, on the analytics page, the property
 * page, the property export, the year-end report and its tax exports, while
 * the ledger held what each property received; and it could not be asked for a
 * tax year. No job could see it: none ran the function against a ledger. This
 * checks every column of every row for the tax year, the trailing window and
 * the default, the window's edges, reversals, the owner scoping, soft-deleted
 * leases and properties, p_property_id, p_limit, a refused range, the guard
 * and the grants, against the fixture's seeded portfolio.
 */
export function assertPropertyPerformanceRentReceived(
	raw: string,
): AssertionResult {
	const line = raw.trim();
	if (line === "") {
		return {
			ok: false,
			message:
				"the property-performance fixture printed nothing. psql ran scripts/migration-replay-property-performance.sql without producing its one JSON line, so this is a broken fixture or query (an owner it looks up was not seeded?), NOT a wrong figure.",
		};
	}
	const printed = parseJsonObject(line);
	if (printed === null) {
		return {
			ok: false,
			message: `the property-performance fixture did not print a JSON object, read ${JSON.stringify(line)}. The fixture's final select or the psql flags (-t -A -q) changed, so nothing here can compare a figure.`,
		};
	}
	const today = printed["today"];
	const trailingStart = typeof today === "string" ? shiftYmd(today, -30) : null;
	if (typeof today !== "string" || trailingStart === null) {
		return {
			ok: false,
			message: `the property-performance fixture printed no usable \`today\` (read ${JSON.stringify(today)}), so the trailing window it implies cannot be computed. The fixture's first insert changed; fix it, not this check.`,
		};
	}

	// THE DEFECT THIS CHECK EXISTS FOR. The body before this migration echoes
	// p_timeframe and returns 0 as every property's revenue.
	const taxRows = printed["owner_a_tax_2025"];
	if (
		Array.isArray(taxRows) &&
		taxRows.length > 0 &&
		taxRows.every((entry) => {
			const rowObject = asJsonObject(entry);
			return (
				rowObject !== null &&
				rowObject["total_revenue"] === 0 &&
				rowObject["timeframe"] === TAX_2025_REQUEST
			);
		})
	) {
		return {
			ok: false,
			message: `get_property_performance_analytics returned 0 as every property's revenue and echoed the window it was asked for (${TAX_2025_REQUEST}) for an owner whose seeded ledger received 3833.50 in 2025: that is the hard-coded body before 20261102163709, not a ledger computation. The migration that computes rent received did not apply, or a later one replaced it with a copy of an older body.`,
		};
	}

	const problems: string[] = [];
	const expected = expectedPropertyPerformance(`${trailingStart}/${today}`);
	for (const [label, rows] of Object.entries(expected)) {
		const actual = printed[label];
		if (!Array.isArray(actual)) {
			problems.push(`${label}: absent or not an array of rows`);
			continue;
		}
		if (actual.length !== rows.length) {
			problems.push(
				`${label}: expected ${rows.length} rows, got ${actual.length}: ${JSON.stringify(actual)}`,
			);
			continue;
		}
		for (const [index, row] of rows.entries()) {
			collectMismatches(
				`${label}[${index}]`,
				asJsonObject(actual[index]),
				{ ...row },
				problems,
			);
		}
	}
	collectMismatches(
		"execute",
		asJsonObject(printed["execute"]),
		EXPECTED_PROPERTY_PERFORMANCE_EXECUTE,
		problems,
	);
	const helpers = asJsonObject(printed["execute_ledger_helpers"]);
	for (const helper of LEDGER_HELPERS) {
		collectMismatches(
			`execute_ledger_helpers.${helper}`,
			asJsonObject(helpers?.[helper]),
			NO_CLIENT_ROLE,
			problems,
		);
	}
	for (const label of Object.keys(YEAR_END_TIES_2025_CENTS)) {
		collectYearEndTie(label, printed[label], problems);
	}
	for (const [key, value] of Object.entries(EVERY_PROPERTY_LISTED)) {
		if (printed[key] !== value) {
			problems.push(
				`${key}: expected ${JSON.stringify(value)}, got ${JSON.stringify(printed[key])}. With p_limit NULL every one of owner C's 101 properties must be listed (the body before returned 100), and p_limit 5 must still return 5.`,
			);
		}
	}
	if (printed["backwards_range_sqlstate"] !== BACKWARDS_RANGE_SQLSTATE) {
		problems.push(
			`backwards_range_sqlstate: expected ${JSON.stringify(BACKWARDS_RANGE_SQLSTATE)}, got ${JSON.stringify(printed["backwards_range_sqlstate"])}. A range that starts after it ends (2025-12-31..2025-01-01) must be refused, not read as some other window.`,
		);
	}
	const guard = printed["guard_refuses_another_owner"];
	if (guard !== true) {
		problems.push(
			`guard_refuses_another_owner: expected true, got ${JSON.stringify(guard)}. Owner A asked for owner B's rows and was not refused with 'Access denied'.`,
		);
	}

	if (problems.length > 0) {
		return {
			ok: false,
			message: `get_property_performance_analytics does not return the rows the seeded portfolio implies. expectedPropertyPerformance in scripts/migration-replay-assertions.ts shows the arithmetic for each; fix the function (or, if the fixture changed, both files together), not this check.\n${problems.join("\n")}`,
		};
	}
	return {
		ok: true,
		message: `get_property_performance_analytics reports rent received (owner A in 2025: Alpha Court 2750.50 received, 200.25 spent, 2550.25 net; Beta House 750.00, 100.00, 650.00; Gamma Flats, deleted, 333.00; Echo Barn, deleted, 12.00 spent; tying to the year-end summary's 3833.50 and 312.25; over ${trailingStart}/${today}: Alpha Court -79.75, Beta House 200.00, no deleted property; owner B 700.00 and 650.00, tying to the year-end summary's 1350.00 and 10.00), lists all 101 of owner C's properties, states each window, refuses a backwards range and another owner, and is executable by authenticated and service_role only; the ledger helpers by no client role`,
	};
}

/** `ymd`'s calendar parts, or null when it is no calendar day. */
function ymdParts(ymd: string): [number, number, number] | null {
	return shiftYmd(ymd, 0) === null
		? null
		: [
				Number(ymd.slice(0, 4)),
				Number(ymd.slice(5, 7)),
				Number(ymd.slice(8, 10)),
			];
}

/** A UTC calendar day as 'YYYY-MM-DD'. */
function utcYmd(year: number, monthIndex: number, day: number): string {
	return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

/**
 * `ymd` a year earlier, as Postgres's `date - interval '1 year'` moves it: the
 * same month and day, February 29 becoming February 28.
 */
function yearBeforeYmd(ymd: string): string {
	const [year, month, day] = ymdParts(ymd) ?? [0, 1, 1];
	const lastDay = new Date(Date.UTC(year - 1, month, 0)).getUTCDate();
	return utcYmd(year - 1, month - 1, Math.min(day, lastDay));
}

/** The first day of the month `offset` months from `ymd`'s, as 'YYYY-MM-DD'. */
function monthStartYmd(ymd: string, offset: number): string {
	const [year, month] = ymdParts(ymd) ?? [0, 1, 1];
	return utcYmd(year, month - 1 + offset, 1);
}

/**
 * `ymd` moved by whole months as Postgres moves a date by `n months`: the same
 * day of the target month, or its last day when it has fewer.
 */
function addMonthsYmd(ymd: string, months: number): string {
	const [year, month, day] = ymdParts(ymd) ?? [0, 1, 1];
	const lastDay = new Date(Date.UTC(year, month + months, 0)).getUTCDate();
	return utcYmd(year, month - 1 + months, Math.min(day, lastDay));
}

/** One of owner A's leases, as the fixture's header lists it: days from T. */
interface OccupancyModelLease {
	readonly unit: string;
	readonly status: string;
	readonly start: number;
	readonly end: number;
}

/** Owner A's leases, L1..L15 (L7 is unused), in the fixture's order. */
const OWNER_A_LEASES: readonly OccupancyModelLease[] = [
	{ unit: "N1", status: "active", start: -400, end: 300 },
	{ unit: "N2", status: "ended", start: -400, end: -10 },
	{ unit: "N3", status: "active", start: -5, end: 360 },
	{ unit: "N4", status: "pending_signature", start: -60, end: 300 },
	{ unit: "N3", status: "terminated", start: -100, end: -1 },
	{ unit: "N4", status: "expired", start: -200, end: -20 },
	{ unit: "S1", status: "active", start: -400, end: 300 },
	{ unit: "N2", status: "inactive", start: -400, end: 300 },
	{ unit: "N3", status: "ended", start: -30, end: -29 },
	{ unit: "N2", status: "ended", start: -500, end: -30 },
	{ unit: "N1", status: "ended", start: -2, end: 0 },
	{ unit: "N2", status: "expired", start: 0, end: 0 },
	{ unit: "N5", status: "expired", start: -400, end: 0 },
	{ unit: "N4", status: "ended", start: -300, end: -250 },
];

/**
 * Owner A's counted units: N5 is soft-deleted and S1 is on a soft-deleted
 * property, so neither is in the denominator and no lease on them counts.
 */
const OWNER_A_COUNTED_UNITS: ReadonlySet<string> = new Set([
	"N1",
	"N2",
	"N3",
	"N4",
]);

/** The statuses of a lease that ran, whatever it is now. */
const RUNNING_STATUSES: ReadonlySet<string> = new Set([
	"active",
	"ended",
	"expired",
]);

/**
 * Owner A's occupancy over `from`..`to` (both 'YYYY-MM-DD', inclusive) by the
 * one rule the series and the helper share: the counted units with a lease
 * that ran on any of those days, over the counted units, in percent to two
 * decimals.
 */
function ownerAOccupancy(today: string, from: string, to: string): number {
	const occupied = new Set<string>();
	for (const lease of OWNER_A_LEASES) {
		const start = shiftYmd(today, lease.start) ?? "";
		const end = shiftYmd(today, lease.end) ?? "";
		if (
			OWNER_A_COUNTED_UNITS.has(lease.unit) &&
			RUNNING_STATUSES.has(lease.status) &&
			start <= to &&
			end >= from
		) {
			occupied.add(lease.unit);
		}
	}
	return (
		Math.round((occupied.size / OWNER_A_COUNTED_UNITS.size) * 10_000) / 100
	);
}

/** The first and last day of the series' month `monthsAgo` months before T. */
export function occupancySeriesMonth(
	today: string,
	monthsAgo: number,
): [string, string] {
	const from = addMonthsYmd(today, -monthsAgo);
	return [from, shiftYmd(addMonthsYmd(from, 1), -1) ?? ""];
}

/** Whole days from `from` to `to`, both 'YYYY-MM-DD'. */
function daysBetween(from: string, to: string): number {
	return (
		(Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
		86_400_000
	);
}

/** The calls the owner-figures fixture makes, and what each must return. */
interface OwnerFiguresExpectation {
	/** Flat figures: `<call>.<path>` (dots into nested objects) -> value. */
	readonly figures: Readonly<Record<string, number | string | null>>;
	/** Arrays compared element by element, every key of every element. */
	readonly series: Readonly<
		Record<
			string,
			readonly Readonly<Record<string, number | boolean | string | null>>[]
		>
	>;
	/** Objects whose keys must be exactly these (no literal left behind). */
	readonly keys: Readonly<Record<string, readonly string[]>>;
}

/**
 * What `scripts/migration-replay-owner-figures.sql` must print, given the day
 * the gate runs (T, `today`; M0 the first of its month). The fixture's header
 * lists what it seeds; the arithmetic is here.
 *
 * Dashboard trends, owner A (both functions, and the helper): on T the
 *   running leases are L1, L3, L12 (ends on T) and L13 (starts on T), on N1,
 *   N2 and N3, 3 of the 4 units that are not inactive (N5 is), 75.00%, and
 *   1000 + 1200 + 250 + 20 = 2470 of scheduled rent; on T-30 L1, L2 (ended
 *   T-10), L6 (expired T-20), L10 (starts on T-30) and L11 (ends on T-30),
 *   on all 4, 100.00%, and 1000 + 800 + 600 + 300 + 50 = 2750. Not L4
 *   (pending), L5 (terminated), L8 (its property is inactive), L9
 *   (soft-deleted). So occupancyChange 75 - 100 = -25.00 points and growth
 *   (2470 - 2750) / 2750 = -10.18%. The body before compares only leases
 *   active TODAY on T-30 (L1 alone: +25.00 and, in integer division, +100%)
 *   and get_dashboard_stats returns 0 and 0. In get_dashboard_data_v2 the
 *   occupancy trend reads the same 75 and 100 and the revenue trend 2470 and
 *   2750. Both windows are T-30/T. With nothing at all (NOBODY) the helper
 *   reads 0 and 0. L14 runs on both days but on N5, soft-deleted: never
 *   counted (the helper before counted it, 4 of 4 today and 5 of 4 then).
 *   Tenants (get_dashboard_data_v2's active_tenants, by the helper's rule):
 *   Ann, Bea, Cy and Di today (L1, L3, L12, L13: two on N1), Ann, Bea and
 *   Di 30 days ago (L1, L2, L6, L10, L11: Ann on N1 and N3): 4 against 3,
 *   +33.33%, never the units (3 and 4). The body before
 *   compared today's active leases (L1, L3: 2) with the leases still active
 *   today that ran then (L1: 1), +100%. Every trend states T-30/T as its
 *   window, and its percentChange is the change over the earlier figure
 *   (occupancy -25.00, revenue -10.18).
 * The occupancy series, owner A (get_occupancy_trends_optimized): this month
 *   is the stored occupancy, N1 and N3 of the 4 counted units, 50.00; each
 *   past month the counted units with a lease that overlapped it
 *   (ownerAOccupancy, over the month that starts n months before T). The
 *   helper, on that first day, is the same rule on one day, so the two agree
 *   on every month in which no counted lease starts or ends. The body before
 *   counted L14 on N5 in every past month: 5 of 4 in the latest.
 * Owner B: LB1 started T-3, so 100.00% today and none 30 days ago: +100.00
 *   points, and growth NULL (nothing was scheduled then), never 0. The
 *   occupancy, revenue and tenant trends have no earlier figure (no lease or
 *   tenant 30 days ago): percentChange NULL, never 0.
 * Open maintenance (get_dashboard_data_v2, 20261102184501): one count, the
 *   requests not completed or cancelled, in `stats.maintenance.open`, the
 *   open_maintenance trend's current figure and each property's
 *   open_maintenance. Owner A: R3, R5 (in progress) and R8, 3 (status 'open'
 *   alone is 2), all on North Court. Owner B: RB1 (open, created today) and
 *   RB2 (on hold, created T-40), 2 (status 'open' alone is 1, and 'open' or
 *   'in_progress' 1), on West Place, against 1 thirty days ago (RB2): +1,
 *   +100.00%. The body before put 2 and 1 in `stats.maintenance.open` and
 *   3 and 1 in the property rows beside trends of 3 and 2. Owner C:
 *   1 of 3 units, 33.33 points (two decimals), and growth NULL.
 * Expenses, owner B: 2025-03-01..2025-06-30 is 100 + 50 = 150.00 (not the
 *   soft-deleted 25 or 2025-07-01's 999) against 2024-03-01..2024-06-30's
 *   80 + 40 = 120.00 (not 2024-02-29's 7 or 2024-07-01's 9): +25.00%.
 *   2024-02-29 alone is 7.00 against 2023-02-28, which has none: NULL. As the
 *   soft-deleted 30 of 2024-04-10 is not in the prior total either. As the
 *   balance sheet asks ('-infinity'..2025-06-30) every expense up to it,
 *   286.00, has no year before it: NULL change and NULL prior period; nor
 *   has 2025-03-01..'infinity', 100 + 50 + 999 = 1149.00. Each call's one
 *   vendor holds all of its total.
 * Expenses, owner C, the year to date (no dates): January 1 of T's year's
 *   300, 12, 3, 2.50 and 20, and T's 20, 357.50, not T+5's 66 (the body before
 *   had no end), against January 1 of the year before .. T a year earlier,
 *   200 + 40 = 240.00: +48.96%. By vendor: Porch Co 320.00 (89.51%), the
 *   vendor the owner named "Other" 20.00 (5.59%), and the three with no
 *   vendor (empty, NULL, spaces) 17.50 (4.90%) under category NULL. The body
 *   before folded those three into "Other": 37.50 under a vendor's name.
 * Maintenance, owner A: total_cost 200 + 50.50 + 100 + 10 + 30 + 400 =
 *   790.50 (not the soft-deleted 15, nor T+40's 77 or T+1's 5, dated in the
 *   future), on
 *   4 requests (R1, R2, R3, R5): average 197.625, 197.63. By vendor, largest
 *   first: Roof Co 400.00 on 1, Plumber 260.50 on 2 (R1, R2), Heat Co 100.00
 *   on 1, and no vendor (NULL, R3's empty vendor) 30.00 on 1. Monthly, M0-11..M0: M0-2
 *   250.50, M0-1 110.00, M0 30.00, the rest 0 (R5's 400 is M0-12). Trends:
 *   completed in M0-2 R1, in M0-1 R7 (at its first instant) and in M0 R2 (at
 *   its first instant, so not in M0-1); R6 has no completed_at and R8 was
 *   reopened. Open at each month's end: R5 throughout, R8 from M0-4 (open
 *   now, so open throughout), R3 from M0-3, R7 at the ends of M0-3 and M0-2
 *   (completed at the instant M0-2 ends, which is not before it), and R2 at
 *   the end of M0-1 (likewise): 1 a month to M0-5, then 2, 4, 4, 4, 3. Never
 *   R4 (cancelled), R6 (completed, no completed_at) or R1 (completed in the
 *   month it was opened). Resolution: M0-2 R1's 48 h 20 min, 48.33; M0-1
 *   R7's hours (M0-3 + 2 days 10:00 to M0-1); M0 R2's (M0-1 10:00 to M0). With nothing at all (NOBODY, as the service role reads
 *   it): 0 spent, 0 requests with costs, no average (NULL), no vendor, and
 *   12 empty months.
 * Financial overview, owner A: total_revenue is the active leases'
 *   scheduled rent times twelve, (1000 + 1200 + 5000) x 12 = 86400 (unchanged:
 *   it counts L8, on the inactive property). M0-2mo .. M0-1mo+5d holds
 *   200 + 50.50 + 100 + 10 = 360.50 of expenses; from M0 with no end, 30.00
 *   (not T+40's 77: 107.00 before). net_income is the difference. Only those
 *   three keys remain in `overview`, beside `lease_profitability`.
 * Lease profitability (get_financial_overview, 20261102184504), largest net
 *   first. Owner A, M0-2mo .. M0-1mo+5d: L8 on South House (soft-deleted
 *   property: listed, and says so) 5000.00 received; L1 2000.00 received
 *   (M0-2mo+2d, M0-1mo+2d) less 360.50 of N1's expenses (R1 200 + 50.50,
 *   R2 100 + 10; not the soft-deleted 15), each on a day L1 ran and L12 did
 *   not, 1639.50; L2 800.00. Not L9's 4444.00 (a soft-deleted lease). From
 *   M0 to T: L1's 1000.00 of M0, and R3's 30.00 of M0 on the lease that ran
 *   on N1 that day and started later: L12 (T-2 .. T) when T-2 is on or
 *   before M0, so L1 1000.00 and L12 -30.00; else L1 alone, 970.00. Owner B,
 *   2025: LB2 700.00 less 100.00 (2025-03-01), 600.00; LB3 640.00 (the
 *   100.00 and its reversal net) less 50.00 (2025-06-30, a day LB2 and LB3
 *   both ran: the later-starting LB3's alone; LB9, later still, is
 *   soft-deleted), 590.00. The 999.00 of
 *   2025-07-01 is no lease's (both had ended), nor are 2024's (none had
 *   begun). Not LB1 (nothing in 2025).
 *   2025-03-01 .. 2025-06-30: LB3 -50.00, LB2 -100.00, nothing received.
 *   Owner A, T+199 .. T+201: nothing. RX's 9.00 on T+200 is on N1 while L1
 *   and L3 run, but RX carries owner C's id: no lease of owner A's gets it.
 */
const PENDING_AT_MONTH_END: readonly number[] = [
	1, 1, 1, 1, 1, 1, 1, 2, 4, 4, 4, 3,
];

export function expectedOwnerFigures(today: string): OwnerFiguresExpectation {
	const window = `${shiftYmd(today, -30)}/${today}`;
	const months = Array.from({ length: 12 }, (_, at) =>
		monthStartYmd(today, at - 11).slice(0, 7),
	);
	const cost: Record<number, number> = { 9: 250.5, 10: 110, 11: 30 };
	// R7 from M0-3mo + 2 days 10:00 to M0-1mo 00:00; R2 from M0-1mo 10:00 to
	// M0 00:00. Each is a whole number of hours.
	const r7Hours =
		daysBetween(monthStartYmd(today, -3), monthStartYmd(today, -1)) * 24 - 58;
	const r2Hours =
		daysBetween(monthStartYmd(today, -1), monthStartYmd(today, 0)) * 24 - 10;
	const completed: Record<number, number> = { 9: 1, 10: 1, 11: 1 };
	const resolution: Record<number, number> = {
		9: 48.33,
		10: r7Hours,
		11: r2Hours,
	};
	const trend = {
		units: { occupancyChange: -25, occupancyChangeWindow: window },
		revenue: { growth: -10.18, growthWindow: window },
	};
	const flatten = (
		prefix: string,
		object: Record<string, Record<string, number | string | null>>,
	) =>
		Object.fromEntries(
			Object.entries(object).flatMap(([group, values]) =>
				Object.entries(values).map(([key, value]) => [
					`${prefix}.${group}.${key}`,
					value,
				]),
			),
		);
	const ownerB = {
		units: { occupancyChange: 100, occupancyChangeWindow: window },
		revenue: { growth: null, growthWindow: window },
	};
	const ownerC = {
		units: { occupancyChange: 33.33, occupancyChangeWindow: window },
		revenue: { growth: null, growthWindow: window },
	};
	const fromNothing = (current: number) => ({
		current,
		previous: 0,
		change: current,
		percentChange: null,
		window,
	});
	const seriesRows = Array.from({ length: 12 }, (_, monthsAgo) => {
		const [from, to] = occupancySeriesMonth(today, monthsAgo);
		const occupancy = monthsAgo === 0 ? 50 : ownerAOccupancy(today, from, to);
		return {
			month: from.slice(0, 7),
			occupancy_rate: occupancy,
			total_units: 4,
			occupied_units: (occupancy / 100) * 4,
		};
	});
	const lease = (
		id: string,
		property: string,
		deleted: boolean,
		unit: string,
		tenant: string,
		received: number,
		expenses: number,
	) => ({
		lease_id: id,
		property_name: property,
		property_deleted: deleted,
		unit_number: unit,
		tenant_name: tenant,
		rent_received: received,
		expenses,
		net: Math.round((received - expenses) * 100) / 100,
	});
	const L1 = "d4000000-0000-4000-8000-0000000000a1";
	const lb2 = (received: number, expenses: number) =>
		lease(
			"d4000000-0000-4000-8000-0000000000b2",
			"West Place",
			false,
			"W1",
			"Flo West",
			received,
			expenses,
		);
	const lb3 = (received: number, expenses: number) =>
		lease(
			"d4000000-0000-4000-8000-0000000000b3",
			"West Place",
			false,
			"W1",
			"Hal West",
			received,
			expenses,
		);
	const l12RanOnM0 = (shiftYmd(today, -2) ?? "") <= monthStartYmd(today, 0);
	const helperMonths = Array.from({ length: 11 }, (_, at) => {
		const [from] = occupancySeriesMonth(today, at + 1);
		return {
			months_ago: at + 1,
			occupancy_rate: ownerAOccupancy(today, from, from),
		};
	});
	return {
		figures: {
			...flatten("dashboard_stats_a", trend),
			...flatten("dashboard_v2_a", {
				...trend,
				trend_occupancy: {
					current: 75,
					previous: 100,
					change: -25,
					percentChange: -25,
					window,
				},
				trend_revenue: {
					current: 2470,
					previous: 2750,
					change: -280,
					percentChange: -10.18,
					window,
				},
				trend_tenants: {
					current: 4,
					previous: 3,
					change: 1,
					percentChange: 33.33,
					window,
				},
				// Calendar-stable: the requests open today. 30 days ago depends on
				// where T falls against R2's and R7's month boundaries.
				trend_maintenance: { current: 3, window },
			}),
			...flatten("dashboard_stats_b", ownerB),
			...flatten("dashboard_v2_b", {
				...ownerB,
				trend_occupancy: fromNothing(100),
				trend_revenue: fromNothing(700),
				trend_tenants: fromNothing(1),
				trend_maintenance: {
					current: 2,
					previous: 1,
					change: 1,
					percentChange: 100,
					window,
				},
			}),
			...flatten("dashboard_stats_c", ownerC),
			...flatten("dashboard_v2_c", ownerC),
			"position_a_today.occupancy_rate": 75,
			"position_a_today.scheduled_rent": 2470,
			"position_a_today.tenant_count": 4,
			"position_a_then.occupancy_rate": 100,
			"position_a_then.scheduled_rent": 2750,
			"position_a_then.tenant_count": 3,
			"dashboard_v2_a.maintenance_open": 3,
			"dashboard_stats_a.maintenance_open": 3,
			"dashboard_v2_a.property_open_maintenance.North Court": 3,
			"dashboard_v2_b.maintenance_open": 2,
			"dashboard_stats_b.maintenance_open": 2,
			"dashboard_v2_b.property_open_maintenance.West Place": 2,
			"position_nobody.occupancy_rate": 0,
			"position_nobody.scheduled_rent": 0,
			"position_nobody.tenant_count": 0,
			"expenses_b_spring_2025.total_amount": 150,
			"expenses_b_spring_2025.year_over_year_change": 25,
			"expenses_b_spring_2025.year_over_year_prior_period":
				"2024-03-01/2024-06-30",
			"expenses_b_leap_day.total_amount": 7,
			"expenses_b_leap_day.year_over_year_change": null,
			"expenses_b_leap_day.year_over_year_prior_period":
				"2023-02-28/2023-02-28",
			"expenses_b_unbounded.total_amount": 286,
			"expenses_b_unbounded.year_over_year_change": null,
			"expenses_b_unbounded.year_over_year_prior_period": null,
			"expenses_b_open_ended.total_amount": 1149,
			"expenses_b_open_ended.year_over_year_change": null,
			"expenses_b_open_ended.year_over_year_prior_period": null,
			"expenses_c_year_to_date.total_amount": 357.5,
			"expenses_c_year_to_date.year_over_year_change": 48.96,
			"expenses_c_year_to_date.year_over_year_prior_period": `${Number(today.slice(0, 4)) - 1}-01-01/${yearBeforeYmd(today)}`,
			"maintenance_a.total_cost": 790.5,
			"maintenance_a.costed_requests": 4,
			"maintenance_a.average_cost": 197.63,
			"maintenance_nobody.total_cost": 0,
			"maintenance_nobody.costed_requests": 0,
			"maintenance_nobody.average_cost": null,
			"overview_a_window.overview.total_revenue": 86400,
			"overview_a_window.overview.total_expenses": 360.5,
			"overview_a_window.overview.net_income": 86039.5,
			"overview_a_open_end.overview.total_revenue": 86400,
			"overview_a_open_end.overview.total_expenses": 30,
			"overview_a_open_end.overview.net_income": 86370,
			"overview_a_window.lease_profitability.window": `${monthStartYmd(today, -2)}/${shiftYmd(monthStartYmd(today, -1), 5)}`,
			"overview_a_open_end.lease_profitability.window": `${monthStartYmd(today, 0)}/${today}`,
			"overview_b_2025.lease_profitability.window": "2025-01-01/2025-12-31",
			"overview_a_future.lease_profitability.window": `${shiftYmd(today, 199)}/${shiftYmd(today, 201)}`,
			"overview_b_spring_2025.lease_profitability.window":
				"2025-03-01/2025-06-30",
		},
		series: {
			"overview_a_window.lease_profitability.leases": [
				lease(
					"d4000000-0000-4000-8000-0000000000a8",
					"South House",
					true,
					"S1",
					"Ed South",
					5000,
					0,
				),
				lease(L1, "North Court", false, "N1", "Ann North", 2000, 360.5),
				lease(
					"d4000000-0000-4000-8000-0000000000a2",
					"North Court",
					false,
					"N2",
					"Bea North",
					800,
					0,
				),
			],
			"overview_a_open_end.lease_profitability.leases": l12RanOnM0
				? [
						lease(L1, "North Court", false, "N1", "Ann North", 1000, 0),
						lease(
							"d4000000-0000-4000-8000-00000000a012",
							"North Court",
							false,
							"N1",
							"Bea North",
							0,
							30,
						),
					]
				: [lease(L1, "North Court", false, "N1", "Ann North", 1000, 30)],
			"overview_b_2025.lease_profitability.leases": [
				lb2(700, 100),
				lb3(640, 50),
			],
			"overview_a_future.lease_profitability.leases": [],
			"overview_b_spring_2025.lease_profitability.leases": [
				lb3(0, 50),
				lb2(0, 100),
			],
			occupancy_series_a: seriesRows,
			position_a_months: helperMonths,
			"expenses_b_spring_2025.categories": [
				{ category: "Gate Co", amount: 150, percentage: 100 },
			],
			"expenses_b_open_ended.categories": [
				{ category: "Gate Co", amount: 1149, percentage: 100 },
			],
			"expenses_c_year_to_date.categories": [
				{ category: "Porch Co", amount: 320, percentage: 89.51 },
				{ category: "Other", amount: 20, percentage: 5.59 },
				{ category: null, amount: 17.5, percentage: 4.9 },
			],
			"maintenance_a.vendor_performance": [
				{ vendor_name: "Roof Co", total_spend: 400, jobs: 1 },
				{ vendor_name: "Plumber", total_spend: 260.5, jobs: 2 },
				{ vendor_name: "Heat Co", total_spend: 100, jobs: 1 },
				{ vendor_name: null, total_spend: 30, jobs: 1 },
			],
			"maintenance_a.monthly_cost": months.map((month, at) => ({
				month,
				cost: cost[at] ?? 0,
			})),
			"maintenance_a.trendsOverTime": months.map((month, at) => ({
				month,
				completed: completed[at] ?? 0,
				pending: PENDING_AT_MONTH_END[at] ?? 0,
				avg_resolution_hours: resolution[at] ?? null,
			})),
			"maintenance_nobody.vendor_performance": [],
			"maintenance_nobody.monthly_cost": months.map((month) => ({
				month,
				cost: 0,
			})),
			"maintenance_nobody.trendsOverTime": months.map((month) => ({
				month,
				completed: 0,
				pending: 0,
				avg_resolution_hours: null,
			})),
		},
		keys: {
			overview_a_window: ["lease_profitability", "overview"],
			"overview_a_window.lease_profitability": ["leases", "window"],
			"overview_a_window.overview": [
				"net_income",
				"total_expenses",
				"total_revenue",
			],
		},
	};
}

/** The seven functions' EXECUTE grants: the helper is no client role's. */
export const EXPECTED_OWNER_FIGURES_EXECUTE: Readonly<
	Record<
		string,
		Readonly<Record<"anon" | "authenticated" | "service_role", boolean>>
	>
> = {
	"public.dashboard_lease_position(uuid,date)": {
		anon: false,
		authenticated: false,
		service_role: false,
	},
	"public.get_dashboard_stats(uuid)": {
		anon: false,
		authenticated: true,
		service_role: true,
	},
	"public.get_dashboard_data_v2(uuid)": {
		anon: false,
		authenticated: true,
		service_role: true,
	},
	"public.get_expense_summary(uuid,date,date)": {
		anon: false,
		authenticated: true,
		service_role: true,
	},
	"public.get_maintenance_analytics(uuid)": {
		anon: false,
		authenticated: true,
		service_role: true,
	},
	"public.get_financial_overview(uuid,date,date)": {
		anon: false,
		authenticated: true,
		service_role: true,
	},
	"public.get_occupancy_trends_optimized(uuid,integer)": {
		anon: false,
		authenticated: true,
		service_role: true,
	},
};

/** The functions whose guard the fixture tries, owner A asking for owner B. */
const OWNER_FIGURES_GUARDED = [
	"get_dashboard_stats",
	"get_dashboard_data_v2",
	"get_expense_summary",
	"get_maintenance_analytics",
	"get_financial_overview",
	"get_occupancy_trends_optimized",
] as const;

/** The value at a dotted path, or undefined when any step is not an object. */
function atPath(root: Record<string, unknown>, path: string): unknown {
	let at: unknown = root;
	for (const step of path.split(".")) {
		const object = asJsonObject(at);
		if (object === null) return undefined;
		at = object[step];
	}
	return at;
}

/** Whether `object` has `key` of its own (a JSON null counts; absence not). */
function hasKey(object: unknown, key: string): boolean {
	const record = asJsonObject(object);
	return record !== null && Object.hasOwn(record, key);
}

/**
 * The bodies before 20261102184501..20261102184504 and 20261102200501 (and
 * the bodies this PR had before part N extended them), named by what only they
 * return. One line per function, so a body left behind is named, never read
 * as an arithmetic slip.
 */
function oldBodyDiagnoses(printed: Record<string, unknown>): string[] {
	const found: string[] = [];
	const stats = atPath(printed, "dashboard_stats_a.units");
	if (
		atPath(printed, "dashboard_stats_a.units.occupancyChange") === 0 &&
		atPath(printed, "dashboard_stats_a.revenue.growth") === 0 &&
		!hasKey(stats, "occupancyChangeWindow")
	) {
		found.push(
			"get_dashboard_stats returned occupancyChange and growth as the literal 0 with no window for an owner whose occupancy fell from 100.00% to 75.00%: that is the body before 20261102184501.",
		);
	}
	if (
		asJsonObject(atPath(printed, "dashboard_v2_a.units")) !== null &&
		!hasKey(atPath(printed, "dashboard_v2_a.units"), "occupancyChangeWindow")
	) {
		found.push(
			"get_dashboard_data_v2 returned no occupancyChangeWindow: that is the body before 20261102184501, which compares today's leases with only the leases still active today.",
		);
	}
	const trendOccupancy = atPath(printed, "dashboard_v2_a.trend_occupancy");
	// Production's body is named above; this is the body this PR had before.
	if (
		hasKey(atPath(printed, "dashboard_v2_a.units"), "occupancyChangeWindow") &&
		asJsonObject(trendOccupancy) !== null &&
		!hasKey(trendOccupancy, "window")
	) {
		found.push(
			"get_dashboard_data_v2's trends state no window: that is a body before 20261102184501 as this PR leaves it, whose percentChange is 0 with no earlier figure and whose active_tenants compares only the leases still active today.",
		);
	}
	const series = atPath(printed, "occupancy_series_a");
	if (
		Array.isArray(series) &&
		series.some((entry) => {
			const month = asJsonObject(entry);
			return (
				typeof month?.["occupied_units"] === "number" &&
				typeof month["total_units"] === "number" &&
				month["occupied_units"] > month["total_units"]
			);
		})
	) {
		found.push(
			"get_occupancy_trends_optimized counted more occupied units than units in a month: a lease on a soft-deleted unit counted outside the denominator. That is the body before 20261102200501.",
		);
	}
	const ytd = atPath(printed, "expenses_c_year_to_date");
	// A missing call is no old body: its change reads undefined, not null.
	if (
		atPath(printed, "expenses_c_year_to_date.year_over_year_change") === null &&
		!hasKey(ytd, "year_over_year_prior_period")
	) {
		found.push(
			"get_expense_summary returned year_over_year_change as the literal null with no prior period, for an owner who spent 240.00 a year earlier: that is the body before 20261102184502.",
		);
	}
	const maintenance = atPath(printed, "maintenance_a");
	if (
		atPath(printed, "maintenance_a.total_cost") === 0 &&
		!hasKey(maintenance, "costed_requests")
	) {
		found.push(
			"get_maintenance_analytics returned total_cost as the literal 0 with no costed_requests, for an owner with 790.50 of maintenance expenses: that is the body before 20261102184503.",
		);
	}
	const ytdCategories = atPath(printed, "expenses_c_year_to_date.categories");
	if (
		Array.isArray(ytdCategories) &&
		ytdCategories.some((row) => {
			const category = asJsonObject(row);
			const amount = category?.["amount"];
			return (
				category?.["category"] === "Other" &&
				typeof amount === "number" &&
				amount > 20
			);
		})
	) {
		found.push(
			'get_expense_summary put more than the 20.00 of the vendor the owner named "Other" under "Other": it folded expenses with no vendor into a vendor\'s name. That is the body before 20261102184502 as part Q extends it.',
		);
	}
	if (
		atPath(printed, "dashboard_v2_a.maintenance_open") === 2 &&
		atPath(printed, "dashboard_v2_a.trend_maintenance.current") === 3
	) {
		found.push(
			"get_dashboard_data_v2 counted only status 'open' in stats.maintenance.open beside a trend of every request not completed or cancelled: that is the body before 20261102184501 as part Q extends it.",
		);
	}
	if (
		atPath(printed, "dashboard_stats_a.maintenance_open") === 2 &&
		atPath(printed, "dashboard_v2_a.trend_maintenance.current") === 3
	) {
		found.push(
			"get_dashboard_stats counted only status 'open' in maintenance.open where get_dashboard_data_v2 counts every request not completed or cancelled: that is the body before 20261102184501 as part R extends it.",
		);
	}
	const overview = atPath(printed, "overview_a_window");
	if (
		asJsonObject(overview) !== null &&
		!hasKey(
			atPath(printed, "overview_a_window.overview"),
			"accounts_receivable",
		) &&
		!hasKey(overview, "lease_profitability")
	) {
		found.push(
			"get_financial_overview returned no lease_profitability: that is a body before 20261102184504 as this PR leaves it, which reports no lease's rent received or expenses.",
		);
	}
	if (
		hasKey(atPath(printed, "overview_a_window.overview"), "accounts_receivable")
	) {
		found.push(
			"get_financial_overview still returns accounts_receivable (and the other literals no caller reads): that is the body before 20261102184504.",
		);
	}
	return found;
}

/**
 * The owner-figure functions must compute the figures they returned as literals, from
 * one definition, and say over which days.
 *
 * Before 20261102184501..20261102184504, get_dashboard_stats returned
 * occupancyChange and growth as 0 and get_dashboard_data_v2 computed them
 * against only the leases still active today; get_expense_summary returned
 * year_over_year_change as null; get_maintenance_analytics returned every
 * cost as 0 or []; get_financial_overview returned accounts receivable and
 * payable as 0 and trends as null, and reported no lease's profitability;
 * get_occupancy_trends_optimized, until 20261102200501, counted a lease on a
 * soft-deleted unit outside its denominator. No job ran any of them against
 * data. This checks every computed figure, the windows and markers the app keys its
 * "unavailable" states on, that the two dashboard functions agree with each
 * other and with their helper, the period ends, the soft-deleted rows, the
 * owner scoping, the guards and the grants, against the fixture's portfolio.
 */
export function assertOwnerFiguresComputed(raw: string): AssertionResult {
	const text = raw.trim();
	if (text === "") {
		return {
			ok: false,
			message:
				"the owner-figures fixture printed nothing. psql ran scripts/migration-replay-owner-figures.sql without producing its one JSON line, so this is a broken fixture or query (an owner it looks up was not seeded?), NOT a wrong figure.",
		};
	}
	const parsedFigures = parseJsonObject(text);
	if (parsedFigures === null) {
		return {
			ok: false,
			message: `the owner-figures fixture did not print a JSON object, read ${JSON.stringify(text)}. The fixture's final select or the psql flags (-t -A -q) changed, so nothing here can compare a figure.`,
		};
	}
	const today = parsedFigures["today"];
	if (typeof today !== "string" || shiftYmd(today, 0) === null) {
		return {
			ok: false,
			message: `the owner-figures fixture printed no usable \`today\` (read ${JSON.stringify(today)}), so the windows and months it implies cannot be computed. The fixture's first insert changed; fix it, not this check.`,
		};
	}

	// THE DEFECT THIS CHECK EXISTS FOR, per function.
	const diagnoses = oldBodyDiagnoses(parsedFigures);
	if (diagnoses.length > 0) {
		return {
			ok: false,
			message: `the owner-figures fixture reached a body that returns a literal, not a figure. The migration that computes it did not apply, or a later one replaced it with a copy of an older body.\n${diagnoses.join("\n")}`,
		};
	}

	const failures: string[] = [];
	const expected = expectedOwnerFigures(today);
	for (const [path, value] of Object.entries(expected.figures)) {
		const dot = path.lastIndexOf(".");
		const parent = atPath(parsedFigures, path.slice(0, dot));
		const key = path.slice(dot + 1);
		if (!hasKey(parent, key)) {
			failures.push(`${path}: expected ${JSON.stringify(value)}, absent`);
			continue;
		}
		const actual = atPath(parsedFigures, path);
		if (actual !== value) {
			failures.push(
				`${path}: expected ${JSON.stringify(value)}, got ${JSON.stringify(actual)}`,
			);
		}
	}
	for (const [path, rows] of Object.entries(expected.series)) {
		const actual = atPath(parsedFigures, path);
		if (!Array.isArray(actual) || actual.length !== rows.length) {
			failures.push(
				`${path}: expected ${rows.length} rows, got ${JSON.stringify(actual)}`,
			);
			continue;
		}
		for (const [index, expectedRow] of rows.entries()) {
			collectMismatches(
				`${path}[${index}]`,
				asJsonObject(actual[index]),
				{ ...expectedRow },
				failures,
			);
		}
	}
	for (const [path, keys] of Object.entries(expected.keys)) {
		const object = asJsonObject(atPath(parsedFigures, path));
		const actualKeys = object === null ? null : Object.keys(object).sort();
		if (JSON.stringify(actualKeys) !== JSON.stringify(keys)) {
			failures.push(
				`${path}: expected exactly the keys ${JSON.stringify(keys)}, got ${JSON.stringify(actualKeys)}`,
			);
		}
	}

	// One definition: the two dashboard functions and the trend agree with the
	// helper's two positions, in whole hundredths of a point.
	const now = cents(atPath(parsedFigures, "position_a_today.occupancy_rate"));
	const then = cents(atPath(parsedFigures, "position_a_then.occupancy_rate"));
	if (now !== null && then !== null) {
		for (const path of [
			"dashboard_stats_a.units.occupancyChange",
			"dashboard_v2_a.units.occupancyChange",
			"dashboard_v2_a.trend_occupancy.change",
		]) {
			if (cents(atPath(parsedFigures, path)) !== now - then) {
				failures.push(
					`${path}: ${JSON.stringify(atPath(parsedFigures, path))} is not the helper's ${(now - then) / 100}, its occupancy today less its occupancy 30 days ago. Both functions must read one definition.`,
				);
			}
		}
	}

	// The tile and the chart: on every past month in which no counted lease
	// starts or ends, the helper on the month's first day must equal the
	// series' month. One rule in two functions.
	const printedSeries = atPath(parsedFigures, "occupancy_series_a");
	const printedHelper = atPath(parsedFigures, "position_a_months");
	for (const [at, helperRow] of expected.series[
		"position_a_months"
	]?.entries() ?? []) {
		const monthsAgo = at + 1;
		const seriesRow = expected.series["occupancy_series_a"]?.[monthsAgo];
		if (seriesRow?.["occupancy_rate"] !== helperRow["occupancy_rate"]) continue;
		const helperRate = Array.isArray(printedHelper)
			? asJsonObject(printedHelper[at])?.["occupancy_rate"]
			: undefined;
		const seriesRate = Array.isArray(printedSeries)
			? asJsonObject(printedSeries[monthsAgo])?.["occupancy_rate"]
			: undefined;
		if (helperRate === undefined || helperRate !== seriesRate) {
			failures.push(
				`occupancy ${monthsAgo} months ago: the helper reads ${JSON.stringify(helperRate)} and the series ${JSON.stringify(seriesRate)}; no counted lease starts or ends in that month, so the tile's rule and the chart's must agree.`,
			);
		}
	}

	// One count of open maintenance: the tile shows stats.maintenance.open
	// beside the open_maintenance trend's change, and the portfolio table each
	// property's open_maintenance, so the three must be the same requests; and
	// get_dashboard_stats' maintenance.open, the same name in the other
	// function, the same figure.
	for (const [owner, statsOwner] of [
		["dashboard_v2_a", "dashboard_stats_a"],
		["dashboard_v2_b", "dashboard_stats_b"],
	] as const) {
		const tileOpen = atPath(parsedFigures, `${owner}.maintenance_open`);
		const statsOpen = atPath(parsedFigures, `${statsOwner}.maintenance_open`);
		const trendOpen = atPath(
			parsedFigures,
			`${owner}.trend_maintenance.current`,
		);
		const byProperty = asJsonObject(
			atPath(parsedFigures, `${owner}.property_open_maintenance`),
		);
		const propertyOpen =
			byProperty === null ||
			Object.values(byProperty).some((count) => typeof count !== "number")
				? null
				: Object.values(byProperty).reduce<number>(
						(total, count) => total + Number(count),
						0,
					);
		if (
			typeof tileOpen !== "number" ||
			tileOpen !== trendOpen ||
			tileOpen !== propertyOpen
		) {
			failures.push(
				`${owner}: stats.maintenance.open is ${JSON.stringify(tileOpen)}, the open_maintenance trend's current figure ${JSON.stringify(trendOpen)} and the properties' open_maintenance ${JSON.stringify(propertyOpen)}. They must be one count: the tile shows the first beside the trend's change.`,
			);
		}
		if (typeof tileOpen === "number" && statsOpen !== tileOpen) {
			failures.push(
				`${statsOwner}: get_dashboard_stats' maintenance.open is ${JSON.stringify(statsOpen)} where get_dashboard_data_v2's is ${tileOpen}. One name, one definition: the requests not completed or cancelled.`,
			);
		}
	}

	for (const [signature, grants] of Object.entries(
		EXPECTED_OWNER_FIGURES_EXECUTE,
	)) {
		collectMismatches(
			`execute.${signature}`,
			asJsonObject(asJsonObject(parsedFigures["execute"])?.[signature]),
			grants,
			failures,
		);
	}
	const guard = asJsonObject(parsedFigures["guard_refuses_another_owner"]);
	for (const name of OWNER_FIGURES_GUARDED) {
		if (guard?.[name] !== true) {
			failures.push(
				`guard_refuses_another_owner.${name}: expected true, got ${JSON.stringify(guard?.[name])}. Owner A asked for owner B's figures and was not refused with 'Access denied'.`,
			);
		}
	}

	if (failures.length > 0) {
		return {
			ok: false,
			message: `the owner-figure functions do not return what the seeded portfolio implies. expectedOwnerFigures in scripts/migration-replay-assertions.ts shows the arithmetic for each; fix the function (or, if the fixture changed, both files together), not this check.\n${failures.join("\n")}`,
		};
	}
	return {
		ok: true,
		message: `the owner figures are computed (owner A: occupancy -25.00 points and scheduled rent -10.18% over ${expected.figures["dashboard_stats_a.units.occupancyChangeWindow"]}, the same in both dashboard functions and their helper; tenants 4 against 3, +33.33%; the occupancy series by the helper's rule, a soft-deleted unit's lease never counted, equal to the helper on every month whose leases hold; owner B's occupancy, revenue and tenant trends with no earlier figure, percentChange null; open maintenance one count in the tile, the trend, each property and get_dashboard_stats (3; 2 against 1, +100%); owners B and C's growth null; expenses +25.00% against 2024-03-01/2024-06-30 and the year to date +48.96%, an expense with no vendor under category NULL, never the vendor "Other"; maintenance 790.50 on 4 requests, 197.63 average, 4 vendors, 12 months; the financial overview's three figures, and each lease's rent received less its expenses, a deleted property's lease listed and an expense on a day two leases ran counted once), every guard refuses another owner, and the helper is no client role's`,
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

/** What one fixture statement of the blog-banlist fixture must end in. */
interface BlogBanlistOutcome {
	/** The SQLSTATE: `00000` for an accepted statement, `23514` for a gate's. */
	readonly state: "00000" | "23514";
	/** The gate's message, exactly, when it is rejected. */
	readonly message?: string;
}

function personaHit(field: string): BlogBanlistOutcome {
	return {
		state: "23514",
		message: `banlist hit: property owner (persona word found in ${field})`,
	};
}

function phraseHit(phrase: string, field: string): BlogBanlistOutcome {
	return {
		state: "23514",
		message: `banlist hit: ${phrase} (Phase 4 banlist phrase found in ${field})`,
	};
}

const ACCEPTED: BlogBanlistOutcome = { state: "00000" };

/**
 * Each case of scripts/migration-replay-blog-banlist.sql (its header lists
 * them), as validate_blog_post must decide it. Every post passes the other
 * gates, so a rejection is the banlist's, and its message names the phrase and
 * the field: the title, the excerpt and the content are each checked, at
 * in-review and at published, for the phrases (a substring, case ignored) and
 * the persona word with persona-consistency.spec.ts's semantics
 * (/property owners?\b/i: "single-property owner", "multiproperty owners",
 * "Property Owners" and a content ending "PROPERTY OWNER" match; "property
 * ownership", "property owner_id" and "property owners2" do not).
 */
export const EXPECTED_BLOG_BANLIST: Readonly<
	Record<string, BlogBanlistOutcome>
> = {
	"persona-title-in-review": personaHit("title"),
	"persona-excerpt-in-review": personaHit("excerpt"),
	"persona-content-in-review": personaHit("content"),
	"persona-title-published": personaHit("title"),
	"persona-excerpt-published": personaHit("excerpt"),
	"persona-content-published": personaHit("content"),
	"phrase-title-in-review": phraseHit("rent collection", "title"),
	"phrase-excerpt-in-review": phraseHit("autopay", "excerpt"),
	"phrase-content-in-review": phraseHit("tenant portal", "content"),
	"phrase-title-published": phraseHit("rent collection", "title"),
	"phrase-excerpt-published": phraseHit("autopay", "excerpt"),
	"phrase-content-published": phraseHit("tenant portal", "content"),
	"ownership-every-field": ACCEPTED,
	"word-character-after": ACCEPTED,
	"clean-in-review": ACCEPTED,
	"clean-published": ACCEPTED,
	// Drafts are not gated.
	"persona-draft": ACCEPTED,
	// An UPDATE of a row already in-review or published is not gated, as
	// before 20261102230101: no existing post is rechecked.
	"update-published-to-published": ACCEPTED,
	"update-draft-to-published": personaHit("excerpt"),
};

/**
 * The function's privileges as production has them: EXECUTE for its owner
 * only. The replayed chain leaves PUBLIC and service_role with EXECUTE, which
 * 20261102230101 revokes; the fixture's inserts run as service_role, so a
 * rejection above also proves the trigger fires without it.
 */
export const EXPECTED_BLOG_BANLIST_PRIVILEGES: Readonly<
	Record<string, string | boolean>
> = {
	acl: "{postgres=X/postgres}",
	volatility: "v",
	security_definer: true,
	config: '["search_path=public"]',
};

/** The trigger: BEFORE INSERT OR UPDATE, FOR EACH ROW (1 + 2 + 4 + 16), enabled. */
export const EXPECTED_BLOG_BANLIST_TRIGGER: Readonly<
	Record<string, string | number>
> = { function: "validate_blog_post()", type: 23, enabled: "O" };

/**
 * `validate_blog_post` must reject a banned phrase or persona word in a post's
 * title, excerpt or content.
 *
 * Until 20261102230101_blog_banlist_persona_and_fields.sql gate 8 read
 * NEW.content only and carried no persona word, so a post whose excerpt said
 * "single-property owner" published to /blog, where
 * persona-consistency.spec.ts bans it, and nothing in CI ran the trigger. This
 * checks every case's outcome and message, the function's privileges and the
 * trigger, in the stack this workflow replayed.
 */
export function assertBlogBanlistGate(raw: string): AssertionResult {
	const blogText = raw.trim();
	if (blogText === "") {
		return {
			ok: false,
			message:
				"the blog-banlist fixture printed nothing. psql ran scripts/migration-replay-blog-banlist.sql without producing its one JSON line, so this is a broken fixture or query, NOT a gate decision.",
		};
	}
	const blogParsed = parseJsonObject(blogText);
	if (blogParsed === null) {
		return {
			ok: false,
			message: `the blog-banlist fixture did not print a JSON object, read ${JSON.stringify(blogText)}. The fixture's final select or the psql flags (-t -A -q) changed, so nothing here can compare an outcome.`,
		};
	}

	// THE DEFECT THIS CHECK EXISTS FOR. A phrase in the content rejected while
	// the same gate passes it in the title and the excerpt is the body that read
	// NEW.content only.
	const contentCase = asJsonObject(blogParsed["phrase-content-published"]);
	const titleCase = asJsonObject(blogParsed["phrase-title-published"]);
	const excerptCase = asJsonObject(blogParsed["phrase-excerpt-published"]);
	if (
		contentCase?.["state"] === "23514" &&
		titleCase?.["state"] === "00000" &&
		excerptCase?.["state"] === "00000"
	) {
		return {
			ok: false,
			message:
				"validate_blog_post rejected a banlist phrase in a post's content but published the same kind of phrase in its title and its excerpt: that is the gate that read NEW.content only. 20261102230101_blog_banlist_persona_and_fields.sql did not apply, or a later migration replaced it with an older body.",
		};
	}

	const mismatches: string[] = [];
	for (const [label, expected] of Object.entries(EXPECTED_BLOG_BANLIST)) {
		const actual = asJsonObject(blogParsed[label]);
		collectMismatches(
			label,
			actual,
			{ state: expected.state, message: expected.message ?? null },
			mismatches,
		);
	}
	const privileges = asJsonObject(blogParsed["privileges"]);
	collectMismatches(
		"privileges",
		privileges === null
			? null
			: { ...privileges, config: JSON.stringify(privileges["config"]) },
		EXPECTED_BLOG_BANLIST_PRIVILEGES,
		mismatches,
	);
	collectMismatches(
		"trigger",
		asJsonObject(blogParsed["trigger"]),
		EXPECTED_BLOG_BANLIST_TRIGGER,
		mismatches,
	);

	if (mismatches.length > 0) {
		return {
			ok: false,
			message: `validate_blog_post does not decide the fixture's posts as the banlist requires. EXPECTED_BLOG_BANLIST in scripts/migration-replay-assertions.ts gives each case's outcome; fix the function (or, if the fixture changed, both files together), not this check.\n${mismatches.join("\n")}`,
		};
	}
	return {
		ok: true,
		message:
			"validate_blog_post rejects a banlist phrase and the persona word in the title, the excerpt and the content at in-review and at published (as service_role, which holds no EXECUTE), with the spec's semantics (no word start, case ignored, an optional plural, a word end), accepts \"property ownership\", a word character after the word, a clean post and a draft, does not regate an UPDATE of a published post, gates a draft's UPDATE to published, and its privileges are production's",
	};
}
