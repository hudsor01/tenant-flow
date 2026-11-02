/**
 * Negative controls for the migration-replay gate.
 *
 * A gate that passes proves nothing until something has watched it fail. Each
 * assertion here is fed the input it should accept AND every wrong input that
 * matters, so "the replay gate is green" means the comparisons still
 * discriminate rather than that they ran.
 *
 * The `t`/`f` case is the one that actually happened: see the header of
 * migration-replay-assertions.ts.
 */
import { describe, expect, it } from "vitest";
import {
	assertBillingInsightsFromLedger,
	assertEveryMigrationApplied,
	assertNoMigrationReachedTheNetwork,
	assertSeededCast,
	EXPECTED_BILLING_INSIGHTS,
	EXPECTED_SEEDED_CAST,
} from "./migration-replay-assertions";

const CORRECT_ROWS = EXPECTED_SEEDED_CAST.join("\n");

describe("assertEveryMigrationApplied", () => {
	it("passes when every file has a ledger row", () => {
		const result = assertEveryMigrationApplied("348", "348");
		expect(result.ok).toBe(true);
		expect(result.message).toContain("348 of 348");
	});

	it("tolerates the whitespace psql and wc leave behind", () => {
		expect(assertEveryMigrationApplied(" 348\n", "348 ").ok).toBe(true);
	});

	it("fails when the chain stops part way", () => {
		const result = assertEveryMigrationApplied("348", "246");
		expect(result.ok).toBe(false);
		expect(result.message).toContain("246 of 348");
		// The message has to point at the migration rather than at this check,
		// because the two times this fired the cause was production having been
		// mutated outside the ledger.
		expect(result.message).toContain("Fix the migration, not this check");
	});

	it("fails when the applied count could not be read, and says it is a broken query", () => {
		const result = assertEveryMigrationApplied("348", "");
		expect(result.ok).toBe(false);
		expect(result.message).toContain("broken query");
		// Blaming the migrations for an empty query result is the misdiagnosis
		// this branch exists to prevent.
		expect(result.message).not.toContain("replay is incomplete");
	});

	it("fails when the file count could not be read", () => {
		const result = assertEveryMigrationApplied("not-a-number", "348");
		expect(result.ok).toBe(false);
		expect(result.message).toContain("could not count the migration files");
	});

	it("refuses to pass vacuously on an empty migrations directory", () => {
		// 0 == 0 is the shape of a glob that stopped matching.
		const result = assertEveryMigrationApplied("0", "0");
		expect(result.ok).toBe(false);
		expect(result.message).toContain("vacuously");
	});
});

describe("assertNoMigrationReachedTheNetwork", () => {
	it("passes with wrappers installed and no Stripe server or foreign tables", () => {
		expect(assertNoMigrationReachedTheNetwork("1", "0", "0").ok).toBe(true);
	});

	it("fails when the wrappers extension is missing", () => {
		const result = assertNoMigrationReachedTheNetwork("0", "0", "0");
		expect(result.ok).toBe(false);
		expect(result.message).toContain("wrappers extension is absent");
	});

	it("fails when a migration created the Stripe foreign server", () => {
		const result = assertNoMigrationReachedTheNetwork("1", "1", "0");
		expect(result.ok).toBe(false);
		expect(result.message).toContain("called the Stripe API from a migration");
	});

	it("fails when a migration imported the foreign schema", () => {
		const result = assertNoMigrationReachedTheNetwork("1", "0", "4");
		expect(result.ok).toBe(false);
		expect(result.message).toContain("called the Stripe API from a migration");
	});

	it("fails when the three counts could not be parsed", () => {
		// `read -r wrapper server tables` silently leaves fields empty when the
		// psql output shape changes, which would otherwise compare "" against
		// "1" and report a missing extension.
		const result = assertNoMigrationReachedTheNetwork("1", "", "");
		expect(result.ok).toBe(false);
		expect(result.message).toContain("could not read the Stripe FDW state");
	});
});

describe("assertSeededCast", () => {
	it("passes on the exact cast the suites require", () => {
		expect(assertSeededCast(CORRECT_ROWS).ok).toBe(true);
	});

	it("passes regardless of row order", () => {
		const reversed = [...EXPECTED_SEEDED_CAST].reverse().join("\n");
		expect(assertSeededCast(reversed).ok).toBe(true);
	});

	it("names psql's || boolean rendering when t/f is the only difference", () => {
		// The actual defect: an expectation written as t/f fails on correct data
		// while reporting that the users are misconfigured.
		const tf = CORRECT_ROWS.replace("|true|", "|t|").replaceAll(
			"|false|",
			"|f|",
		);
		const result = assertSeededCast(tf);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("ONLY in how the boolean is spelled");
		expect(result.message).toContain("concatenated with `||`");
		expect(result.message).not.toContain("not in the state the suites require");
	});

	it("fails when owner A is not active", () => {
		// Owner A on any other status sends every e2e run to /pricing.
		const result = assertSeededCast(
			CORRECT_ROWS.replace(
				"e2e-owner-a@tenantflow.app|false|active|1",
				"e2e-owner-a@tenantflow.app|false|expired|1",
			),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("subscription_status=active");
		expect(result.message).toContain(
			"e2e-owner-a@tenantflow.app|false|expired|1",
		);
	});

	it("fails when the admin is not an admin", () => {
		const result = assertSeededCast(
			CORRECT_ROWS.replace(
				"e2e-admin@tenantflow.app|true|",
				"e2e-admin@tenantflow.app|false|",
			),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("is_admin=true");
		// On the COMPUTED part of the message, not only the static preamble:
		// deleting the diff computation has to fail this test.
		expect(result.message).toContain("e2e-admin@tenantflow.app|false|active|1");
	});

	it("fails when a user has no auth.identities row", () => {
		// The state seed.sql actually produced: a user row that can never sign in.
		const result = assertSeededCast(CORRECT_ROWS.replaceAll("|1", "|0"));
		expect(result.ok).toBe(false);
		expect(result.message).toContain("auth.identities");
		expect(result.message).toContain(
			"e2e-owner-a@tenantflow.app|false|active|0",
		);
	});

	it("names a duplicated row, which the missing/unexpected diff cannot see", () => {
		// Every row is present on both sides, so both filters come back empty
		// and the annotation would say nothing at all about what differed.
		const result = assertSeededCast(
			`${CORRECT_ROWS}\ne2e-admin@tenantflow.app|true|active|1`,
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("returned more than once");
		expect(result.message).toContain("e2e-admin@tenantflow.app|true|active|1");
	});

	it("fails when a user is missing entirely", () => {
		const result = assertSeededCast(EXPECTED_SEEDED_CAST.slice(1).join("\n"));
		expect(result.ok).toBe(false);
		expect(result.message).toContain("missing:");
		expect(result.message).toContain("e2e-admin@tenantflow.app");
	});

	it("fails on no rows at all rather than reporting a state mismatch", () => {
		const result = assertSeededCast("\n  \n");
		expect(result.ok).toBe(false);
		expect(result.message).toContain("no rows at all");
	});
});

/**
 * The line `scripts/migration-replay-billing-insights.sql` printed against the
 * replayed stack with 20261102055449 applied (2026-11-02, with the balance
 * sheet's figures and as-of date), verbatim: jsonb's own key order and its
 * `0.00`-style scale, which JSON.parse reads as numbers.
 */
const REPLAYED_BILLING_LINE =
	'{"execute": {"anon": false, "service_role": true, "authenticated": true}, "owner_a": {"mrr": 2500, "churnRate": 0.00, "tenantCount": 2, "unpaidCount": 4, "unpaidTotal": 1185.50, "chargedTotal": 4205.50, "lateFeeTotal": 115.00, "openingTotal": 300.00, "totalRevenue": 30000, "collectedTotal": 3440.00, "creditBalanceTotal": 420.00}, "owner_b": {"mrr": 700, "churnRate": 0.00, "tenantCount": 1, "unpaidCount": 2, "unpaidTotal": 720.00, "chargedTotal": 720.00, "lateFeeTotal": 20.00, "openingTotal": 0, "totalRevenue": 8400, "collectedTotal": 0, "creditBalanceTotal": 0}, "owner_a_february": {"mrr": 2500, "churnRate": 0.00, "tenantCount": 2, "unpaidCount": 4, "unpaidTotal": 960.50, "chargedTotal": 1360.50, "lateFeeTotal": 110.00, "openingTotal": 0, "totalRevenue": 30000, "collectedTotal": 400.00, "creditBalanceTotal": 0}, "owner_a_as_of_march": {"mrr": 2500, "churnRate": 0.00, "tenantCount": 2, "unpaidCount": 4, "unpaidTotal": 145.50, "chargedTotal": 4240.50, "lateFeeTotal": 150.00, "openingTotal": 300.00, "totalRevenue": 30000, "collectedTotal": 4515.00, "creditBalanceTotal": 420.00}, "guard_refuses_another_owner": true}';

/**
 * The same fixture against PRODUCTION's body as of 2026-11-02 (the literal
 * zeros), applied to the same stack: the defect this assertion exists for.
 */
const HARD_CODED_BODY_LINE =
	'{"execute": {"anon": false, "service_role": true, "authenticated": true}, "owner_a": {"mrr": 2500, "churnRate": 0.00, "tenantCount": 2, "unpaidCount": 0, "unpaidTotal": 0, "lateFeeTotal": 0, "totalRevenue": 30000}, "owner_b": {"mrr": 700, "churnRate": 0.00, "tenantCount": 1, "unpaidCount": 0, "unpaidTotal": 0, "lateFeeTotal": 0, "totalRevenue": 8400}, "owner_a_february": {"mrr": 2500, "churnRate": 0.00, "tenantCount": 2, "unpaidCount": 0, "unpaidTotal": 0, "lateFeeTotal": 0, "totalRevenue": 30000}, "owner_a_as_of_march": {"mrr": 2500, "churnRate": 0.00, "tenantCount": 2, "unpaidCount": 0, "unpaidTotal": 0, "lateFeeTotal": 0, "totalRevenue": 30000}, "guard_refuses_another_owner": true}';

/** The replayed line with one key of one call's figures replaced. */
function withFigure(label: string, key: string, value: unknown): string {
	const parsed: Record<string, Record<string, unknown>> = JSON.parse(
		REPLAYED_BILLING_LINE,
	);
	return JSON.stringify({
		...parsed,
		[label]: { ...parsed[label], [key]: value },
	});
}

describe("assertBillingInsightsFromLedger", () => {
	it("passes on the line the replayed stack printed", () => {
		const result = assertBillingInsightsFromLedger(
			`${REPLAYED_BILLING_LINE}\n`,
		);
		expect(result.ok).toBe(true);
		expect(result.message).toContain("computes the ledger figures");
	});

	it("names the hard-coded body when production's zeros come back", () => {
		const result = assertBillingInsightsFromLedger(HARD_CODED_BODY_LINE);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("hard-coded body");
		expect(result.message).not.toContain("expected 1185.5");
	});

	it.each([
		["unpaidTotal", 1185.5],
		["unpaidCount", 4],
		["lateFeeTotal", 115],
	])(
		"does not call it the hard-coded body when %s is the one figure that is right",
		(key, value) => {
			const line = JSON.stringify({
				...JSON.parse(HARD_CODED_BODY_LINE),
				owner_a: {
					...JSON.parse(HARD_CODED_BODY_LINE).owner_a,
					[key]: value,
				},
			});
			const result = assertBillingInsightsFromLedger(line);
			expect(result.ok).toBe(false);
			expect(result.message).not.toContain("hard-coded body");
			expect(result.message).toContain("does not return the figures");
		},
	);

	it("fails when a prepaid lease's negative balance is summed in", () => {
		// No per-lease floor: lease A2's -420 hides 420 of lease A1's debt.
		const result = assertBillingInsightsFromLedger(
			withFigure("owner_a", "unpaidTotal", 765.5),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a.unpaidTotal: expected 1185.5, got 765.5",
		);
	});

	it("fails when an inactive lease is counted", () => {
		const line = JSON.stringify({
			...JSON.parse(REPLAYED_BILLING_LINE),
			owner_a: {
				...JSON.parse(REPLAYED_BILLING_LINE).owner_a,
				unpaidTotal: 2115.5,
				unpaidCount: 6,
				lateFeeTotal: 145,
				chargedTotal: 5135.5,
			},
		});
		const result = assertBillingInsightsFromLedger(line);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a.unpaidTotal: expected 1185.5, got 2115.5",
		);
		expect(result.message).toContain("owner_a.unpaidCount: expected 4, got 6");
		expect(result.message).toContain(
			"owner_a.lateFeeTotal: expected 115, got 145",
		);
	});

	it("fails when a reversed late fee still counts", () => {
		const result = assertBillingInsightsFromLedger(
			withFigure("owner_a", "lateFeeTotal", 200),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a.lateFeeTotal: expected 115, got 200",
		);
	});

	it("fails when the period is ignored", () => {
		const parsed = JSON.parse(REPLAYED_BILLING_LINE);
		const line = JSON.stringify({
			...parsed,
			owner_a_february: parsed.owner_a,
		});
		const result = assertBillingInsightsFromLedger(line);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a_february.unpaidTotal: expected 960.5, got 1185.5",
		);
		expect(result.message).toContain(
			"owner_a_february.collectedTotal: expected 400, got 3440",
		);
	});

	it("fails when the period reads today's reversals instead of its end date's", () => {
		// The 35.00 late fee dated February 15 is reversed after February 28.
		const parsed = JSON.parse(REPLAYED_BILLING_LINE);
		const line = JSON.stringify({
			...parsed,
			owner_a_february: {
				...parsed.owner_a_february,
				unpaidTotal: 925.5,
				unpaidCount: 3,
				lateFeeTotal: 75,
				chargedTotal: 1325.5,
			},
		});
		const result = assertBillingInsightsFromLedger(line);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a_february.unpaidCount: expected 4, got 3",
		);
		expect(result.message).toContain(
			"owner_a_february.lateFeeTotal: expected 110, got 75",
		);
	});

	it("fails when the as-of date is ignored", () => {
		const parsed = JSON.parse(REPLAYED_BILLING_LINE);
		const line = JSON.stringify({
			...parsed,
			owner_a_as_of_march: parsed.owner_a,
		});
		const result = assertBillingInsightsFromLedger(line);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a_as_of_march.unpaidTotal: expected 145.5, got 1185.5",
		);
		expect(result.message).toContain(
			"owner_a_as_of_march.collectedTotal: expected 4515, got 3440",
		);
	});

	it("fails when a prepaid lease's credit balance is dropped", () => {
		const result = assertBillingInsightsFromLedger(
			withFigure("owner_a", "creditBalanceTotal", 0),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a.creditBalanceTotal: expected 420, got 0",
		);
	});

	it("names a call whose four figures do not partition the ledger", () => {
		const result = assertBillingInsightsFromLedger(
			withFigure("owner_a", "chargedTotal", 4000),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a: collectedTotal + unpaidTotal - creditBalanceTotal is 4205.5 but chargedTotal is 4000. The four figures must partition the ledger",
		);
	});

	it("compares the partition in cents, not in floating point", () => {
		// 0.1 + 0.2 is 0.30000000000000004 in floating point.
		const parsed = JSON.parse(REPLAYED_BILLING_LINE);
		const line = JSON.stringify({
			...parsed,
			owner_b: {
				...parsed.owner_b,
				collectedTotal: 0.1,
				unpaidTotal: 0.2,
				creditBalanceTotal: 0,
				chargedTotal: 0.3,
			},
		});
		const result = assertBillingInsightsFromLedger(line);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("owner_b.collectedTotal: expected 0");
		expect(result.message).not.toContain("must partition the ledger");
	});

	it("leaves a missing figure to its mismatch line, not a partition break", () => {
		const parsed = JSON.parse(REPLAYED_BILLING_LINE);
		const { collectedTotal: _omitted, ...ownerA } = parsed.owner_a;
		const result = assertBillingInsightsFromLedger(
			JSON.stringify({ ...parsed, owner_a: ownerA }),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a.collectedTotal: expected 3440, got undefined",
		);
		expect(result.message).not.toContain("must partition the ledger");
	});

	it("fails on a body that returns none of the balance sheet's figures", () => {
		// The body before the balance-sheet keys: right Payment Summary figures,
		// no collectedTotal, creditBalanceTotal, chargedTotal or openingTotal.
		const parsed = JSON.parse(REPLAYED_BILLING_LINE);
		const strip = (call: Record<string, unknown>) => {
			const {
				collectedTotal: _c,
				creditBalanceTotal: _cr,
				chargedTotal: _ch,
				openingTotal: _o,
				...rest
			} = call;
			return rest;
		};
		const line = JSON.stringify({
			...parsed,
			owner_a: strip(parsed.owner_a),
			owner_b: strip(parsed.owner_b),
			owner_a_february: strip(parsed.owner_a_february),
			owner_a_as_of_march: strip(parsed.owner_a_as_of_march),
		});
		const result = assertBillingInsightsFromLedger(line);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a_as_of_march.chargedTotal: expected 4240.5, got undefined",
		);
	});

	it("expects figures that partition the ledger, call by call", () => {
		for (const figures of Object.values(EXPECTED_BILLING_INSIGHTS)) {
			expect(
				Math.round(
					(figures.collectedTotal +
						figures.unpaidTotal -
						figures.creditBalanceTotal) *
						100,
				),
			).toBe(Math.round(figures.chargedTotal * 100));
		}
	});

	it("fails when another owner's rows reach owner B's figures", () => {
		const result = assertBillingInsightsFromLedger(
			withFigure("owner_b", "unpaidTotal", 1119),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_b.unpaidTotal: expected 720, got 1119",
		);
	});

	it("fails when one of the unchanged figures moves", () => {
		const result = assertBillingInsightsFromLedger(
			withFigure("owner_a", "mrr", 3400),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("owner_a.mrr: expected 2500, got 3400");
	});

	it("fails on a figure that arrives as a string", () => {
		const result = assertBillingInsightsFromLedger(
			withFigure("owner_a", "unpaidTotal", "1185.50"),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			'owner_a.unpaidTotal: expected 1185.5, got "1185.50"',
		);
	});

	it("fails when a call's figures are missing, naming the call", () => {
		const { owner_b: _omitted, ...rest } = JSON.parse(REPLAYED_BILLING_LINE);
		const result = assertBillingInsightsFromLedger(JSON.stringify(rest));
		expect(result.ok).toBe(false);
		expect(result.message).toContain("owner_b: absent or not an object");
	});

	it("fails when the guard lets owner A read owner B's figures", () => {
		const line = JSON.stringify({
			...JSON.parse(REPLAYED_BILLING_LINE),
			guard_refuses_another_owner: false,
		});
		const result = assertBillingInsightsFromLedger(line);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"guard_refuses_another_owner: expected true, got false",
		);
	});

	it("fails when the fixture did not report the guard at all", () => {
		const { guard_refuses_another_owner: _omitted, ...rest } = JSON.parse(
			REPLAYED_BILLING_LINE,
		);
		const result = assertBillingInsightsFromLedger(JSON.stringify(rest));
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"guard_refuses_another_owner: expected true, got undefined",
		);
	});

	it("fails when anon can execute the function", () => {
		const result = assertBillingInsightsFromLedger(
			withFigure("execute", "anon", true),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("execute.anon: expected false, got true");
	});

	it("fails on no output, calling it a broken fixture rather than a wrong figure", () => {
		const result = assertBillingInsightsFromLedger("\n  \n");
		expect(result.ok).toBe(false);
		expect(result.message).toContain("printed nothing");
		expect(result.message).not.toContain("does not return the figures");
	});

	it.each([
		["not JSON", "INSERT 0 1"],
		["a JSON array", "[1, 2]"],
		["a JSON scalar", "0"],
	])("fails on output that is %s", (_what, raw) => {
		const result = assertBillingInsightsFromLedger(raw);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("did not print a JSON object");
	});
});
