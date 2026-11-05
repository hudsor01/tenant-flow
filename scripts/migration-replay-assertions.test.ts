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
	assertBlogBanlistGate,
	assertEveryMigrationApplied,
	assertNoMigrationReachedTheNetwork,
	assertOwnerFiguresComputed,
	assertPropertyPerformanceRentReceived,
	assertSeededCast,
	EXPECTED_BILLING_INSIGHTS,
	EXPECTED_BLOG_BANLIST,
	EXPECTED_SEEDED_CAST,
	expectedOwnerFigures,
	expectedPropertyPerformance,
	occupancySeriesMonth,
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
 * sheet's figures and as-of date, and chargedTotal by type for the income
 * statement), verbatim: jsonb's own key order and its `0.00`-style scale,
 * which JSON.parse reads as numbers.
 */
const REPLAYED_BILLING_LINE =
	'{"execute": {"anon": false, "service_role": true, "authenticated": true}, "owner_a": {"mrr": 2500, "churnRate": 0.00, "creditTotal": -100.00, "tenantCount": 2, "unpaidCount": 4, "unpaidTotal": 1185.50, "chargedTotal": 4225.50, "lateFeeTotal": 115.00, "openingTotal": 300.00, "totalRevenue": 30000, "collectedTotal": 3440.00, "rentChargedTotal": 3500.00, "creditBalanceTotal": 400.00, "manualChargedTotal": 390.50, "lateFeeChargedTotal": 135.00}, "owner_b": {"mrr": 700, "churnRate": 0.00, "creditTotal": 0, "tenantCount": 1, "unpaidCount": 2, "unpaidTotal": 720.00, "chargedTotal": 720.00, "lateFeeTotal": 20.00, "openingTotal": 0, "totalRevenue": 8400, "collectedTotal": 0, "rentChargedTotal": 700.00, "creditBalanceTotal": 0, "manualChargedTotal": 0, "lateFeeChargedTotal": 20.00}, "owner_a_february": {"mrr": 2500, "churnRate": 0.00, "creditTotal": 0, "tenantCount": 2, "unpaidCount": 4, "unpaidTotal": 960.50, "chargedTotal": 1360.50, "lateFeeTotal": 110.00, "openingTotal": 0, "totalRevenue": 30000, "collectedTotal": 400.00, "rentChargedTotal": 1000.00, "creditBalanceTotal": 0, "manualChargedTotal": 250.50, "lateFeeChargedTotal": 110.00}, "owner_a_as_of_march": {"mrr": 2500, "churnRate": 0.00, "creditTotal": -100.00, "tenantCount": 2, "unpaidCount": 4, "unpaidTotal": 145.50, "chargedTotal": 4260.50, "lateFeeTotal": 150.00, "openingTotal": 300.00, "totalRevenue": 30000, "collectedTotal": 4515.00, "rentChargedTotal": 3500.00, "creditBalanceTotal": 400.00, "manualChargedTotal": 390.50, "lateFeeChargedTotal": 170.00}, "owner_a_as_of_january": {"mrr": 2500, "churnRate": 0.00, "creditTotal": 0, "tenantCount": 2, "unpaidCount": 1, "unpaidTotal": 360.00, "chargedTotal": 3000.00, "lateFeeTotal": 40.00, "openingTotal": 300.00, "totalRevenue": 30000, "collectedTotal": 3040.00, "rentChargedTotal": 2500.00, "creditBalanceTotal": 400.00, "manualChargedTotal": 140.00, "lateFeeChargedTotal": 60.00}, "guard_refuses_another_owner": true}';

/**
 * The same fixture against PRODUCTION's body as of 2026-11-02 (the literal
 * zeros), applied to the same stack: the defect this assertion exists for.
 * `execute.anon` is true because the chain then (before 20261102055400) left
 * anon EXECUTE on that body, which production does not have.
 */
const HARD_CODED_BODY_LINE =
	'{"execute": {"anon": true, "service_role": true, "authenticated": true}, "owner_a": {"mrr": 2500, "churnRate": 0.00, "tenantCount": 2, "unpaidCount": 0, "unpaidTotal": 0, "lateFeeTotal": 0, "totalRevenue": 30000}, "owner_b": {"mrr": 700, "churnRate": 0.00, "tenantCount": 1, "unpaidCount": 0, "unpaidTotal": 0, "lateFeeTotal": 0, "totalRevenue": 8400}, "owner_a_february": {"mrr": 2500, "churnRate": 0.00, "tenantCount": 2, "unpaidCount": 0, "unpaidTotal": 0, "lateFeeTotal": 0, "totalRevenue": 30000}, "owner_a_as_of_march": {"mrr": 2500, "churnRate": 0.00, "tenantCount": 2, "unpaidCount": 0, "unpaidTotal": 0, "lateFeeTotal": 0, "totalRevenue": 30000}, "owner_a_as_of_january": {"mrr": 2500, "churnRate": 0.00, "tenantCount": 2, "unpaidCount": 0, "unpaidTotal": 0, "lateFeeTotal": 0, "totalRevenue": 30000}, "guard_refuses_another_owner": true}';

/**
 * The same fixture against part K's body (20261102055449 before its by-type
 * keys), on the same stack: every balance-sheet figure right, no
 * rentChargedTotal, lateFeeChargedTotal, manualChargedTotal or creditTotal.
 */
const BEFORE_BY_TYPE_LINE =
	'{"execute": {"anon": false, "service_role": true, "authenticated": true}, "owner_a": {"mrr": 2500, "churnRate": 0.00, "tenantCount": 2, "unpaidCount": 4, "unpaidTotal": 1185.50, "chargedTotal": 4225.50, "lateFeeTotal": 115.00, "openingTotal": 300.00, "totalRevenue": 30000, "collectedTotal": 3440.00, "creditBalanceTotal": 400.00}, "owner_b": {"mrr": 700, "churnRate": 0.00, "tenantCount": 1, "unpaidCount": 2, "unpaidTotal": 720.00, "chargedTotal": 720.00, "lateFeeTotal": 20.00, "openingTotal": 0, "totalRevenue": 8400, "collectedTotal": 0, "creditBalanceTotal": 0}, "owner_a_february": {"mrr": 2500, "churnRate": 0.00, "tenantCount": 2, "unpaidCount": 4, "unpaidTotal": 960.50, "chargedTotal": 1360.50, "lateFeeTotal": 110.00, "openingTotal": 0, "totalRevenue": 30000, "collectedTotal": 400.00, "creditBalanceTotal": 0}, "owner_a_as_of_march": {"mrr": 2500, "churnRate": 0.00, "tenantCount": 2, "unpaidCount": 4, "unpaidTotal": 145.50, "chargedTotal": 4260.50, "lateFeeTotal": 150.00, "openingTotal": 300.00, "totalRevenue": 30000, "collectedTotal": 4515.00, "creditBalanceTotal": 400.00}, "owner_a_as_of_january": {"mrr": 2500, "churnRate": 0.00, "tenantCount": 2, "unpaidCount": 1, "unpaidTotal": 360.00, "chargedTotal": 3000.00, "lateFeeTotal": 40.00, "openingTotal": 300.00, "totalRevenue": 30000, "collectedTotal": 3040.00, "creditBalanceTotal": 400.00}, "guard_refuses_another_owner": true}';

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
				chargedTotal: 5155.5,
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
			"owner_a.creditBalanceTotal: expected 400, got 0",
		);
	});

	it("names a call whose four figures do not partition the ledger", () => {
		const result = assertBillingInsightsFromLedger(
			withFigure("owner_a", "chargedTotal", 4000),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a: collectedTotal + unpaidTotal - creditBalanceTotal is 4225.5 but chargedTotal is 4000. The four figures must partition the ledger",
		);
	});

	it("compares the partition in cents, not in floating point", () => {
		// In floating point 1.1 * 100 + 2.2 * 100 is 330.00000000000006 and
		// 3.3 * 100 is 330, so only a whole-cent comparison sees 1.10 + 2.20 =
		// 3.30.
		const parsed = JSON.parse(REPLAYED_BILLING_LINE);
		const line = JSON.stringify({
			...parsed,
			owner_b: {
				...parsed.owner_b,
				collectedTotal: 1.1,
				unpaidTotal: 2.2,
				creditBalanceTotal: 0,
				chargedTotal: 3.3,
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
			owner_a_as_of_january: strip(parsed.owner_a_as_of_january),
		});
		const result = assertBillingInsightsFromLedger(line);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a_as_of_march.chargedTotal: expected 4260.5, got undefined",
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

	it("fails on a body that returns none of the income statement's figures", () => {
		const result = assertBillingInsightsFromLedger(BEFORE_BY_TYPE_LINE);
		expect(result.ok).toBe(false);
		expect(result.message).not.toContain("hard-coded body");
		expect(result.message).toContain(
			"owner_a.rentChargedTotal: expected 3500, got undefined",
		);
		expect(result.message).toContain(
			"owner_a_as_of_january.creditTotal: expected 0, got undefined",
		);
		expect(result.message).not.toContain("must partition chargedTotal");
	});

	it("fails when the late fees charged count only those that stand", () => {
		// lateFeeTotal's reading: A2's 20 late fee was reversed and its reversal
		// reversed, so the ledger balance counts it but it does not stand.
		const result = assertBillingInsightsFromLedger(
			withFigure("owner_a", "lateFeeChargedTotal", 115),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a.lateFeeChargedTotal: expected 135, got 115",
		);
		expect(result.message).toContain(
			"owner_a: rentChargedTotal + lateFeeChargedTotal + manualChargedTotal + creditTotal + openingTotal is 4205.5 but chargedTotal is 4225.5. The by-type figures must partition chargedTotal",
		);
	});

	it("names a call whose by-type figures do not partition chargedTotal", () => {
		const result = assertBillingInsightsFromLedger(
			withFigure("owner_a_as_of_january", "creditTotal", -10),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a_as_of_january: rentChargedTotal + lateFeeChargedTotal + manualChargedTotal + creditTotal + openingTotal is 2990 but chargedTotal is 3000.",
		);
	});

	it("leaves a missing by-type figure to its mismatch line, not a partition break", () => {
		const parsed = JSON.parse(REPLAYED_BILLING_LINE);
		const { manualChargedTotal: _omitted, ...ownerA } = parsed.owner_a;
		const result = assertBillingInsightsFromLedger(
			JSON.stringify({ ...parsed, owner_a: ownerA }),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a.manualChargedTotal: expected 390.5, got undefined",
		);
		expect(result.message).not.toContain("must partition chargedTotal");
	});

	it("leaves a missing call to its mismatch line, not a by-type break", () => {
		const { owner_b: _omitted, ...rest } = JSON.parse(REPLAYED_BILLING_LINE);
		const result = assertBillingInsightsFromLedger(JSON.stringify(rest));
		expect(result.ok).toBe(false);
		expect(result.message).toContain("owner_b: absent or not an object");
		expect(result.message).not.toContain("must partition chargedTotal");
	});

	it("expects by-type figures that partition chargedTotal, call by call", () => {
		for (const figures of Object.values(EXPECTED_BILLING_INSIGHTS)) {
			expect(
				Math.round(
					(figures.rentChargedTotal +
						figures.lateFeeChargedTotal +
						figures.manualChargedTotal +
						figures.creditTotal +
						figures.openingTotal) *
						100,
				),
			).toBe(Math.round(figures.chargedTotal * 100));
		}
	});

	it("expects February 1 to March 31 to be the difference of its two as-of calls", () => {
		// What the income statement and the cash flow compute: charged and
		// received by entry date between the day before the start and the end.
		const end = EXPECTED_BILLING_INSIGHTS.owner_a_as_of_march;
		const before = EXPECTED_BILLING_INSIGHTS.owner_a_as_of_january;
		const revenue =
			end.rentChargedTotal +
			end.lateFeeChargedTotal +
			end.manualChargedTotal +
			end.creditTotal -
			(before.rentChargedTotal +
				before.lateFeeChargedTotal +
				before.manualChargedTotal +
				before.creditTotal);
		expect(Math.round(revenue * 100)).toBe(126050);
		expect(
			Math.round(
				(end.chargedTotal -
					end.openingTotal -
					(before.chargedTotal - before.openingTotal)) *
					100,
			),
		).toBe(126050);
		expect(end.collectedTotal - before.collectedTotal).toBe(1475);
	});

	it("fails when the January call is missing, naming it", () => {
		const { owner_a_as_of_january: _omitted, ...rest } = JSON.parse(
			REPLAYED_BILLING_LINE,
		);
		const result = assertBillingInsightsFromLedger(JSON.stringify(rest));
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a_as_of_january: absent or not an object",
		);
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

/**
 * The line `scripts/migration-replay-property-performance.sql` printed against
 * the replayed stack with 20261102163709 applied, on 2026-11-02, verbatim. The
 * trailing window in it is 2026-10-03/2026-11-02: the assertion computes it
 * from `today`, so the line stays valid on any later day.
 */
const REPLAYED_PERFORMANCE_LINE =
	'{"today": "2026-11-02", "execute": {"anon": false, "service_role": true, "authenticated": true}, "owner_a_30d": [{"timeframe": "2026-10-03/2026-11-02", "net_income": -119.75, "property_id": "c1000000-0000-4000-8000-00000000a001", "property_name": "Alpha Court", "total_revenue": -79.75, "occupancy_rate": 50.00, "total_expenses": 40.00}, {"timeframe": "2026-10-03/2026-11-02", "net_income": 175.00, "property_id": "c1000000-0000-4000-8000-00000000a002", "property_name": "Beta House", "total_revenue": 200.00, "occupancy_rate": 100.00, "total_expenses": 25.00}, {"timeframe": "2026-10-03/2026-11-02", "net_income": 0, "property_id": "c1000000-0000-4000-8000-00000000a003", "property_name": "Delta Lot", "total_revenue": 0, "occupancy_rate": 0.00, "total_expenses": 0}], "owner_a_tie": {"table_total": 3833.50, "expense_total": 312.25, "table_expenses": 312.25, "collected_2024_end": 1044.00, "collected_2025_end": 4877.50}, "owner_b_tie": {"table_total": 1350.00, "expense_total": 10.00, "table_expenses": 10.00, "collected_2024_end": 55.00, "collected_2025_end": 1405.00}, "owner_a_default": [{"timeframe": "2026-10-03/2026-11-02", "net_income": -119.75, "property_id": "c1000000-0000-4000-8000-00000000a001", "property_name": "Alpha Court", "total_revenue": -79.75, "occupancy_rate": 50.00, "total_expenses": 40.00}, {"timeframe": "2026-10-03/2026-11-02", "net_income": 175.00, "property_id": "c1000000-0000-4000-8000-00000000a002", "property_name": "Beta House", "total_revenue": 200.00, "occupancy_rate": 100.00, "total_expenses": 25.00}, {"timeframe": "2026-10-03/2026-11-02", "net_income": 0, "property_id": "c1000000-0000-4000-8000-00000000a003", "property_name": "Delta Lot", "total_revenue": 0, "occupancy_rate": 0.00, "total_expenses": 0}], "owner_a_limit_1": [{"timeframe": "2025-01-01/2025-12-31", "net_income": 2550.25, "property_id": "c1000000-0000-4000-8000-00000000a001", "property_name": "Alpha Court", "total_revenue": 2750.50, "occupancy_rate": 50.00, "total_expenses": 200.25}], "owner_a_tax_2025": [{"timeframe": "2025-01-01/2025-12-31", "net_income": 2550.25, "property_id": "c1000000-0000-4000-8000-00000000a001", "property_name": "Alpha Court", "total_revenue": 2750.50, "occupancy_rate": 50.00, "total_expenses": 200.25}, {"timeframe": "2025-01-01/2025-12-31", "net_income": 650.00, "property_id": "c1000000-0000-4000-8000-00000000a002", "property_name": "Beta House", "total_revenue": 750.00, "occupancy_rate": 100.00, "total_expenses": 100.00}, {"timeframe": "2025-01-01/2025-12-31", "net_income": 0, "property_id": "c1000000-0000-4000-8000-00000000a003", "property_name": "Delta Lot", "total_revenue": 0, "occupancy_rate": 0.00, "total_expenses": 0}, {"timeframe": "2025-01-01/2025-12-31", "net_income": -12.00, "property_id": "c1000000-0000-4000-8000-00000000a005", "property_name": "Echo Barn", "total_revenue": 0, "occupancy_rate": 0.00, "total_expenses": 12.00}, {"timeframe": "2025-01-01/2025-12-31", "net_income": 333.00, "property_id": "c1000000-0000-4000-8000-00000000a004", "property_name": "Gamma Flats", "total_revenue": 333.00, "occupancy_rate": 100.00, "total_expenses": 0}], "owner_b_tax_2025": [{"timeframe": "2025-01-01/2025-12-31", "net_income": 690.00, "property_id": "c1000000-0000-4000-8000-00000000b001", "property_name": "Bravo Place", "total_revenue": 700.00, "occupancy_rate": 100.00, "total_expenses": 10.00}, {"timeframe": "2025-01-01/2025-12-31", "net_income": 650.00, "property_id": "c1000000-0000-4000-8000-00000000b002", "property_name": "Cedar Row", "total_revenue": 650.00, "occupancy_rate": 100.00, "total_expenses": 0}], "owner_a_beta_2025": [{"timeframe": "2025-01-01/2025-12-31", "net_income": 650.00, "property_id": "c1000000-0000-4000-8000-00000000a002", "property_name": "Beta House", "total_revenue": 750.00, "occupancy_rate": 100.00, "total_expenses": 100.00}], "owner_c_all_count": 101, "owner_c_last_name": "Lot 101", "owner_c_limit_5_count": 5, "execute_ledger_helpers": {"public.rent_ledger_leases(uuid)": {"anon": false, "service_role": false, "authenticated": false}, "public.rent_ledger_receipts(uuid)": {"anon": false, "service_role": false, "authenticated": false}}, "backwards_range_sqlstate": "22023", "guard_refuses_another_owner": true}';

/**
 * The same fixture against PRODUCTION's body as of 2026-11-02, on the same
 * stack: 0 as every revenue, the request echoed as the timeframe, the tax
 * year read as the last 30 days (with the expense dated in the future), the
 * backwards range accepted. `execute.anon` is true for the reason given above.
 */
const PRODUCTION_PERFORMANCE_LINE =
	'{"today": "2026-11-02", "execute": {"anon": true, "service_role": true, "authenticated": true}, "owner_a_30d": [{"timeframe": "30d", "net_income": -106.00, "property_id": "c1000000-0000-4000-8000-00000000a001", "property_name": "Alpha Court", "total_revenue": 0, "occupancy_rate": 50.00, "total_expenses": 106.00}, {"timeframe": "30d", "net_income": -25.00, "property_id": "c1000000-0000-4000-8000-00000000a002", "property_name": "Beta House", "total_revenue": 0, "occupancy_rate": 100.00, "total_expenses": 25.00}, {"timeframe": "30d", "net_income": 0, "property_id": "c1000000-0000-4000-8000-00000000a003", "property_name": "Delta Lot", "total_revenue": 0, "occupancy_rate": 0.00, "total_expenses": 0}], "owner_a_tie": {"table_total": 0, "expense_total": 312.25, "table_expenses": 131.00, "collected_2024_end": 1044.00, "collected_2025_end": 4877.50}, "owner_b_tie": {"table_total": 0, "expense_total": 10.00, "table_expenses": 0, "collected_2024_end": 55.00, "collected_2025_end": 1405.00}, "owner_a_default": [{"timeframe": "30d", "net_income": -106.00, "property_id": "c1000000-0000-4000-8000-00000000a001", "property_name": "Alpha Court", "total_revenue": 0, "occupancy_rate": 50.00, "total_expenses": 106.00}, {"timeframe": "30d", "net_income": -25.00, "property_id": "c1000000-0000-4000-8000-00000000a002", "property_name": "Beta House", "total_revenue": 0, "occupancy_rate": 100.00, "total_expenses": 25.00}, {"timeframe": "30d", "net_income": 0, "property_id": "c1000000-0000-4000-8000-00000000a003", "property_name": "Delta Lot", "total_revenue": 0, "occupancy_rate": 0.00, "total_expenses": 0}], "owner_a_limit_1": [{"timeframe": "2025-01-01..2025-12-31", "net_income": -106.00, "property_id": "c1000000-0000-4000-8000-00000000a001", "property_name": "Alpha Court", "total_revenue": 0, "occupancy_rate": 50.00, "total_expenses": 106.00}], "owner_a_tax_2025": [{"timeframe": "2025-01-01..2025-12-31", "net_income": -106.00, "property_id": "c1000000-0000-4000-8000-00000000a001", "property_name": "Alpha Court", "total_revenue": 0, "occupancy_rate": 50.00, "total_expenses": 106.00}, {"timeframe": "2025-01-01..2025-12-31", "net_income": -25.00, "property_id": "c1000000-0000-4000-8000-00000000a002", "property_name": "Beta House", "total_revenue": 0, "occupancy_rate": 100.00, "total_expenses": 25.00}, {"timeframe": "2025-01-01..2025-12-31", "net_income": 0, "property_id": "c1000000-0000-4000-8000-00000000a003", "property_name": "Delta Lot", "total_revenue": 0, "occupancy_rate": 0.00, "total_expenses": 0}], "owner_b_tax_2025": [{"timeframe": "2025-01-01..2025-12-31", "net_income": 0, "property_id": "c1000000-0000-4000-8000-00000000b001", "property_name": "Bravo Place", "total_revenue": 0, "occupancy_rate": 100.00, "total_expenses": 0}, {"timeframe": "2025-01-01..2025-12-31", "net_income": 0, "property_id": "c1000000-0000-4000-8000-00000000b002", "property_name": "Cedar Row", "total_revenue": 0, "occupancy_rate": 100.00, "total_expenses": 0}], "owner_a_beta_2025": [{"timeframe": "2025-01-01..2025-12-31", "net_income": -25.00, "property_id": "c1000000-0000-4000-8000-00000000a002", "property_name": "Beta House", "total_revenue": 0, "occupancy_rate": 100.00, "total_expenses": 25.00}], "owner_c_all_count": 100, "owner_c_last_name": "Lot 100", "owner_c_limit_5_count": 5, "execute_ledger_helpers": {"public.rent_ledger_leases(uuid)": {"anon": false, "service_role": false, "authenticated": false}, "public.rent_ledger_receipts(uuid)": {"anon": false, "service_role": false, "authenticated": false}}, "backwards_range_sqlstate": null, "guard_refuses_another_owner": true}';

type PerformanceLine = Record<string, unknown> & {
	owner_a_tax_2025: Record<string, unknown>[];
	owner_a_30d: Record<string, unknown>[];
};

/** The replayed performance line, parsed, for a test to edit. */
function performanceLine(): PerformanceLine {
	return JSON.parse(REPLAYED_PERFORMANCE_LINE);
}

/** The replayed line with one column of one row of one call replaced. */
function withRowValue(
	label: "owner_a_tax_2025" | "owner_a_30d",
	index: number,
	key: string,
	value: unknown,
): string {
	const parsed = performanceLine();
	const rows = parsed[label].map((row, at) =>
		at === index ? { ...row, [key]: value } : row,
	);
	return JSON.stringify({ ...parsed, [label]: rows });
}

describe("assertPropertyPerformanceRentReceived", () => {
	it("passes on the line the replayed stack printed", () => {
		const result = assertPropertyPerformanceRentReceived(
			`${REPLAYED_PERFORMANCE_LINE}\n`,
		);
		expect(result.ok).toBe(true);
		expect(result.message).toContain("reports rent received");
		expect(result.message).toContain("2026-10-03/2026-11-02");
	});

	it("names the hard-coded body when production's rows come back", () => {
		const result = assertPropertyPerformanceRentReceived(
			PRODUCTION_PERFORMANCE_LINE,
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("hard-coded body before 20261102163709");
		expect(result.message).not.toContain("expected 2750.5");
	});

	it("does not call it the hard-coded body when the window is stated", () => {
		const parsed = JSON.parse(PRODUCTION_PERFORMANCE_LINE);
		const rows = parsed.owner_a_tax_2025.map(
			(row: Record<string, unknown>) => ({
				...row,
				timeframe: "2025-01-01/2025-12-31",
			}),
		);
		const result = assertPropertyPerformanceRentReceived(
			JSON.stringify({ ...parsed, owner_a_tax_2025: rows }),
		);
		expect(result.ok).toBe(false);
		expect(result.message).not.toContain("hard-coded body");
		expect(result.message).toContain(
			"owner_a_limit_1[0].total_revenue: expected 2750.5, got 0",
		);
	});

	it("does not call it the hard-coded body when one row's revenue is right", () => {
		const parsed = JSON.parse(PRODUCTION_PERFORMANCE_LINE);
		const rows = parsed.owner_a_tax_2025.map(
			(row: Record<string, unknown>, at: number) =>
				at === 1 ? { ...row, total_revenue: 750 } : row,
		);
		const result = assertPropertyPerformanceRentReceived(
			JSON.stringify({ ...parsed, owner_a_tax_2025: rows }),
		);
		expect(result.ok).toBe(false);
		expect(result.message).not.toContain("hard-coded body");
		expect(result.message).toContain(
			'owner_a_limit_1[0].timeframe: expected "2025-01-01/2025-12-31", got "2025-01-01..2025-12-31"',
		);
	});

	it("reports an empty tax-year call as missing rows, not as the old body", () => {
		const result = assertPropertyPerformanceRentReceived(
			JSON.stringify({ ...performanceLine(), owner_a_tax_2025: [] }),
		);
		expect(result.ok).toBe(false);
		expect(result.message).not.toContain("hard-coded body");
		expect(result.message).toContain(
			"owner_a_tax_2025: expected 5 rows, got 0",
		);
	});

	it("fails when the tax year is read as the last 30 days", () => {
		const result = assertPropertyPerformanceRentReceived(
			withRowValue("owner_a_tax_2025", 0, "total_expenses", 106),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a_tax_2025[0].total_expenses: expected 200.25, got 106",
		);
	});

	it("fails when an expense dated in the future counts in the trailing window", () => {
		const result = assertPropertyPerformanceRentReceived(
			withRowValue("owner_a_30d", 0, "total_expenses", 106),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a_30d[0].total_expenses: expected 40, got 106",
		);
	});

	it("fails when a reversal is not netted", () => {
		const result = assertPropertyPerformanceRentReceived(
			withRowValue("owner_a_30d", 0, "total_revenue", 420.25),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a_30d[0].total_revenue: expected -79.75, got 420.25",
		);
	});

	it("fails when another owner's lease reaches a property", () => {
		const result = assertPropertyPerformanceRentReceived(
			withRowValue("owner_a_tax_2025", 1, "total_revenue", 972),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a_tax_2025[1].total_revenue: expected 750, got 972",
		);
	});

	it("fails when net income is not revenue less expenses", () => {
		const result = assertPropertyPerformanceRentReceived(
			withRowValue("owner_a_tax_2025", 0, "net_income", -200.25),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a_tax_2025[0].net_income: expected 2550.25, got -200.25",
		);
	});

	it("computes the trailing window from the day the fixture ran", () => {
		const result = assertPropertyPerformanceRentReceived(
			JSON.stringify({ ...performanceLine(), today: "2026-11-03" }),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			'owner_a_30d[0].timeframe: expected "2026-10-04/2026-11-03", got "2026-10-03/2026-11-02"',
		);
	});

	it("crosses a month and a year boundary when it computes the window", () => {
		const result = assertPropertyPerformanceRentReceived(
			JSON.stringify({ ...performanceLine(), today: "2027-01-15" }),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain('expected "2026-12-16/2027-01-15"');
	});

	it("states the trailing window it is given on every trailing row", () => {
		const expected = expectedPropertyPerformance("2026-10-03/2026-11-02");
		for (const row of [...expected.owner_a_30d, ...expected.owner_a_default]) {
			expect(row.timeframe).toBe("2026-10-03/2026-11-02");
		}
	});

	it.each([
		["absent", undefined],
		["not a string", 20261102],
		["no calendar day", "2026-02-30"],
		["not a date", "today"],
	])(
		"fails on a today that is %s, calling it a broken fixture",
		(_what, today) => {
			const result = assertPropertyPerformanceRentReceived(
				JSON.stringify({ ...performanceLine(), today }),
			);
			expect(result.ok).toBe(false);
			expect(result.message).toContain("printed no usable `today`");
		},
	);

	it("fails when a call returns a row too few, naming the count", () => {
		const parsed = performanceLine();
		const result = assertPropertyPerformanceRentReceived(
			JSON.stringify({
				...parsed,
				owner_a_30d: parsed.owner_a_30d.slice(0, 2),
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("owner_a_30d: expected 3 rows, got 2");
	});

	it("fails when a call is missing, naming it", () => {
		const { owner_a_limit_1: _omitted, ...rest } = performanceLine();
		const result = assertPropertyPerformanceRentReceived(JSON.stringify(rest));
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a_limit_1: absent or not an array of rows",
		);
	});

	it("fails on a figure that arrives as a string", () => {
		const result = assertPropertyPerformanceRentReceived(
			withRowValue("owner_a_tax_2025", 0, "total_revenue", "2750.50"),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			'owner_a_tax_2025[0].total_revenue: expected 2750.5, got "2750.50"',
		);
	});

	it("fails when the year-end summary and its table count different receipts", () => {
		const parsed = performanceLine();
		const result = assertPropertyPerformanceRentReceived(
			JSON.stringify({
				...parsed,
				owner_b_tie: {
					...(parsed["owner_b_tie"] as object),
					table_total: 1100,
				},
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_b_tie: the year-end summary reads 1350 of 2025 rent received and its table 1100; both must be 1350.",
		);
	});

	it("fails when the summary differs from a table that reads the year's figure", () => {
		const result = assertPropertyPerformanceRentReceived(
			JSON.stringify({
				...performanceLine(),
				owner_b_tie: {
					collected_2025_end: 1500,
					collected_2024_end: 55,
					expense_total: 10,
					table_total: 1350,
					table_expenses: 10,
				},
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_b_tie: the year-end summary reads 1445 of 2025 rent received and its table 1350",
		);
	});

	it("fails when the two agree on a figure that is not the year's", () => {
		const result = assertPropertyPerformanceRentReceived(
			JSON.stringify({
				...performanceLine(),
				owner_b_tie: {
					collected_2025_end: 1495,
					collected_2024_end: 55,
					expense_total: 10,
					table_total: 1440,
					table_expenses: 10,
				},
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_b_tie: the year-end summary reads 1440 of 2025 rent received and its table 1440",
		);
	});

	it("compares the tie in whole cents", () => {
		const result = assertPropertyPerformanceRentReceived(
			JSON.stringify({
				...performanceLine(),
				owner_b_tie: {
					collected_2025_end: 1350.1 + 1349.9 - 1349.9,
					collected_2024_end: 0.1,
					expense_total: 0.1 + 0.2 + 9.7,
					table_total: 1350,
					table_expenses: 10,
				},
			}),
		);
		expect(result.message).not.toContain("owner_b_tie");
	});

	it("fails when the tie was not reported", () => {
		const { owner_b_tie: _omitted, ...rest } = performanceLine();
		const result = assertPropertyPerformanceRentReceived(JSON.stringify(rest));
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_b_tie: expected five numbers, got undefined",
		);
	});

	it("reports a tie with no year-end figure as missing, not as a mismatch", () => {
		const parsed = performanceLine();
		const result = assertPropertyPerformanceRentReceived(
			JSON.stringify({
				...parsed,
				owner_b_tie: {
					...(parsed["owner_b_tie"] as object),
					collected_2025_end: null,
				},
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("owner_b_tie: expected five numbers");
		expect(result.message).not.toContain(
			"owner_b_tie: the year-end summary reads",
		);
	});

	it("fails when the summary's expenses differ from a table that reads the year's", () => {
		const parsed = performanceLine();
		const result = assertPropertyPerformanceRentReceived(
			JSON.stringify({
				...parsed,
				owner_b_tie: {
					...(parsed["owner_b_tie"] as object),
					expense_total: 0,
				},
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_b_tie: the year-end summary reads 0 of 2025 expenses and its table 10; both must be 10.",
		);
	});

	it("fails when owner A's tie was not reported", () => {
		const { owner_a_tie: _omitted, ...rest } = performanceLine();
		const result = assertPropertyPerformanceRentReceived(JSON.stringify(rest));
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a_tie: expected five numbers, got undefined",
		);
	});

	it("fails when a tie lacks its expense figures", () => {
		const parsed = performanceLine();
		const { expense_total: _omitted, ...tie } = parsed["owner_a_tie"] as Record<
			string,
			unknown
		>;
		const result = assertPropertyPerformanceRentReceived(
			JSON.stringify({ ...parsed, owner_a_tie: tie }),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("owner_a_tie: expected five numbers");
	});

	it("fails when a property deleted after the year drops out of its table", () => {
		// The body before: Gamma Flats (deleted, 333.00 received in 2025) and
		// Echo Barn (deleted, 12.00 spent) not listed, so the table is short.
		const parsed = performanceLine();
		const result = assertPropertyPerformanceRentReceived(
			JSON.stringify({
				...parsed,
				owner_a_tax_2025: parsed.owner_a_tax_2025.slice(0, 3),
				owner_a_tie: {
					...(parsed["owner_a_tie"] as object),
					table_total: 3500.5,
					table_expenses: 300.25,
				},
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a_tax_2025: expected 5 rows, got 3",
		);
		expect(result.message).toContain(
			"owner_a_tie: the year-end summary reads 3833.5 of 2025 rent received and its table 3500.5; both must be 3833.5.",
		);
		expect(result.message).toContain(
			"owner_a_tie: the year-end summary reads 312.25 of 2025 expenses and its table 300.25; both must be 312.25.",
		);
	});

	it("fails when a deleted property is listed for a trailing window", () => {
		const parsed = performanceLine();
		const gamma = {
			property_id: "c1000000-0000-4000-8000-00000000a004",
			property_name: "Gamma Flats",
			occupancy_rate: 100,
			total_revenue: 33,
			total_expenses: 0,
			net_income: 33,
			timeframe: "2026-10-03/2026-11-02",
		};
		const result = assertPropertyPerformanceRentReceived(
			JSON.stringify({
				...parsed,
				owner_a_30d: [...parsed.owner_a_30d, gamma],
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("owner_a_30d: expected 3 rows, got 4");
	});

	it("fails when a deleted property with nothing in the year is listed", () => {
		const parsed = performanceLine();
		const foxtrot = {
			property_id: "c1000000-0000-4000-8000-00000000a006",
			property_name: "Foxtrot Mews",
			occupancy_rate: 0,
			total_revenue: 0,
			total_expenses: 0,
			net_income: 0,
			timeframe: "2025-01-01/2025-12-31",
		};
		const result = assertPropertyPerformanceRentReceived(
			JSON.stringify({
				...parsed,
				owner_a_tax_2025: [...parsed.owner_a_tax_2025, foxtrot],
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a_tax_2025: expected 5 rows, got 6",
		);
	});

	it("fails when the summary's expenses and the table's differ", () => {
		const parsed = performanceLine();
		const result = assertPropertyPerformanceRentReceived(
			JSON.stringify({
				...parsed,
				owner_b_tie: {
					...(parsed["owner_b_tie"] as object),
					table_expenses: 0,
				},
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_b_tie: the year-end summary reads 10 of 2025 expenses and its table 0; both must be 10.",
		);
	});

	it("fails when the expenses agree on a figure that is not the year's", () => {
		const parsed = performanceLine();
		const result = assertPropertyPerformanceRentReceived(
			JSON.stringify({
				...parsed,
				owner_a_tie: {
					...(parsed["owner_a_tie"] as object),
					expense_total: 300.25,
					table_expenses: 300.25,
				},
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"owner_a_tie: the year-end summary reads 300.25 of 2025 expenses and its table 300.25; both must be 312.25.",
		);
	});

	it.each([
		["owner_c_all_count", 100],
		["owner_c_last_name", "Lot 100"],
		["owner_c_limit_5_count", 101],
	])(
		"fails when %s reads %j: a list cut short, or a limit ignored",
		(key, value) => {
			const result = assertPropertyPerformanceRentReceived(
				JSON.stringify({ ...performanceLine(), [key]: value }),
			);
			expect(result.ok).toBe(false);
			expect(result.message).toContain(`${key}: expected`);
		},
	);

	it.each([
		["public.rent_ledger_leases(uuid)", "authenticated"],
		["public.rent_ledger_receipts(uuid)", "service_role"],
	])("fails when %s is executable by %s", (helper, role) => {
		const parsed = performanceLine();
		const helpers = parsed["execute_ledger_helpers"] as Record<
			string,
			Record<string, unknown>
		>;
		const grants = helpers[helper];
		if (grants) grants[role] = true;
		const result = assertPropertyPerformanceRentReceived(
			JSON.stringify(parsed),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			`execute_ledger_helpers.${helper}.${role}: expected false, got true`,
		);
	});

	it("fails when the ledger helpers' grants were not reported", () => {
		const { execute_ledger_helpers: _omitted, ...rest } = performanceLine();
		const result = assertPropertyPerformanceRentReceived(JSON.stringify(rest));
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"execute_ledger_helpers.public.rent_ledger_leases(uuid): absent or not an object",
		);
	});

	it("fails when a backwards range is accepted", () => {
		const result = assertPropertyPerformanceRentReceived(
			JSON.stringify({ ...performanceLine(), backwards_range_sqlstate: null }),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			'backwards_range_sqlstate: expected "22023", got null',
		);
	});

	it("fails when a backwards range raises something else", () => {
		const result = assertPropertyPerformanceRentReceived(
			JSON.stringify({
				...performanceLine(),
				backwards_range_sqlstate: "22008",
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			'backwards_range_sqlstate: expected "22023", got "22008"',
		);
	});

	it("fails when the guard lets owner A read owner B's rows", () => {
		const result = assertPropertyPerformanceRentReceived(
			JSON.stringify({
				...performanceLine(),
				guard_refuses_another_owner: false,
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"guard_refuses_another_owner: expected true, got false",
		);
	});

	it("fails when the fixture did not report the guard at all", () => {
		const { guard_refuses_another_owner: _omitted, ...rest } =
			performanceLine();
		const result = assertPropertyPerformanceRentReceived(JSON.stringify(rest));
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"guard_refuses_another_owner: expected true, got undefined",
		);
	});

	it("fails when anon can execute the function", () => {
		const result = assertPropertyPerformanceRentReceived(
			JSON.stringify({
				...performanceLine(),
				execute: { anon: true, authenticated: true, service_role: true },
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("execute.anon: expected false, got true");
	});

	it("fails on no output, calling it a broken fixture rather than a wrong row", () => {
		const result = assertPropertyPerformanceRentReceived("\n  \n");
		expect(result.ok).toBe(false);
		expect(result.message).toContain("printed nothing");
		expect(result.message).not.toContain("does not return the rows");
	});

	it.each([
		["not JSON", "INSERT 0 1"],
		["a JSON array", "[1, 2]"],
		["a JSON scalar", "0"],
	])("fails on output that is %s", (_what, raw) => {
		const result = assertPropertyPerformanceRentReceived(raw);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("did not print a JSON object");
	});
});

/**
 * The line `scripts/migration-replay-owner-figures.sql` printed against the
 * replayed stack with 20261102184501..20261102184504 and 20261102200501
 * applied, verbatim, with the stack's clock at 2026-11-02 (recorded
 * 2026-11-05, once a terminated lease counted on the days it ran). Every
 * window and month in it follows from `today`, which the assertion computes
 * them from, so the line stays valid on any later day.
 */
const REPLAYED_FIGURES_LINE =
	'{"today": "2026-11-02", "execute": {"public.get_dashboard_stats(uuid)": {"anon": false, "service_role": true, "authenticated": true}, "public.get_dashboard_data_v2(uuid)": {"anon": false, "service_role": true, "authenticated": true}, "public.get_maintenance_analytics(uuid)": {"anon": false, "service_role": true, "authenticated": true}, "public.dashboard_lease_position(uuid,date)": {"anon": false, "service_role": false, "authenticated": false}, "public.get_expense_summary(uuid,date,date)": {"anon": false, "service_role": true, "authenticated": true}, "public.get_financial_overview(uuid,date,date)": {"anon": false, "service_role": true, "authenticated": true}, "public.get_occupancy_trends_optimized(uuid,integer)": {"anon": false, "service_role": true, "authenticated": true}}, "maintenance_a": {"total_cost": 790.50, "average_cost": 197.63, "monthly_cost": [{"cost": 0, "month": "2025-12"}, {"cost": 0, "month": "2026-01"}, {"cost": 0, "month": "2026-02"}, {"cost": 0, "month": "2026-03"}, {"cost": 0, "month": "2026-04"}, {"cost": 0, "month": "2026-05"}, {"cost": 0, "month": "2026-06"}, {"cost": 0, "month": "2026-07"}, {"cost": 0, "month": "2026-08"}, {"cost": 250.50, "month": "2026-09"}, {"cost": 110.00, "month": "2026-10"}, {"cost": 30.00, "month": "2026-11"}], "trendsOverTime": [{"month": "2025-12", "pending": 1, "completed": 0, "avg_resolution_hours": null}, {"month": "2026-01", "pending": 1, "completed": 0, "avg_resolution_hours": null}, {"month": "2026-02", "pending": 1, "completed": 0, "avg_resolution_hours": null}, {"month": "2026-03", "pending": 1, "completed": 0, "avg_resolution_hours": null}, {"month": "2026-04", "pending": 1, "completed": 0, "avg_resolution_hours": null}, {"month": "2026-05", "pending": 1, "completed": 0, "avg_resolution_hours": null}, {"month": "2026-06", "pending": 1, "completed": 0, "avg_resolution_hours": null}, {"month": "2026-07", "pending": 2, "completed": 0, "avg_resolution_hours": null}, {"month": "2026-08", "pending": 4, "completed": 0, "avg_resolution_hours": null}, {"month": "2026-09", "pending": 4, "completed": 1, "avg_resolution_hours": 48.33}, {"month": "2026-10", "pending": 4, "completed": 1, "avg_resolution_hours": 1406.00}, {"month": "2026-11", "pending": 3, "completed": 1, "avg_resolution_hours": 734.00}], "costed_requests": 4, "vendor_performance": [{"jobs": 1, "total_spend": 400.00, "vendor_name": "Roof Co"}, {"jobs": 2, "total_spend": 260.50, "vendor_name": "Plumber"}, {"jobs": 1, "total_spend": 100.00, "vendor_name": "Heat Co"}, {"jobs": 1, "total_spend": 30.00, "vendor_name": null}]}, "dashboard_v2_a": {"units": {"total": 4, "vacant": 2, "occupied": 2, "available": 2, "averageRent": 900.0000000000000000, "maintenance": 0, "occupancyRate": 50.00, "occupancyChange": -25.00, "totalActualRent": 2200, "totalPotentialRent": 3600, "occupancyChangeWindow": "2026-10-03/2026-11-02"}, "revenue": {"growth": -25.26, "yearly": 26400, "monthly": 2200, "growthWindow": "2026-10-03/2026-11-02"}, "time_series": {"occupancy_rate": [{"date": "2026-10-04", "value": 100.00}, {"date": "2026-10-05", "value": 100.00}, {"date": "2026-10-06", "value": 100.00}, {"date": "2026-10-07", "value": 100.00}, {"date": "2026-10-08", "value": 100.00}, {"date": "2026-10-09", "value": 100.00}, {"date": "2026-10-10", "value": 100.00}, {"date": "2026-10-11", "value": 100.00}, {"date": "2026-10-12", "value": 100.00}, {"date": "2026-10-13", "value": 100.00}, {"date": "2026-10-14", "value": 75.00}, {"date": "2026-10-15", "value": 75.00}, {"date": "2026-10-16", "value": 75.00}, {"date": "2026-10-17", "value": 75.00}, {"date": "2026-10-18", "value": 75.00}, {"date": "2026-10-19", "value": 75.00}, {"date": "2026-10-20", "value": 75.00}, {"date": "2026-10-21", "value": 75.00}, {"date": "2026-10-22", "value": 75.00}, {"date": "2026-10-23", "value": 75.00}, {"date": "2026-10-24", "value": 50.00}, {"date": "2026-10-25", "value": 50.00}, {"date": "2026-10-26", "value": 50.00}, {"date": "2026-10-27", "value": 50.00}, {"date": "2026-10-28", "value": 50.00}, {"date": "2026-10-29", "value": 50.00}, {"date": "2026-10-30", "value": 50.00}, {"date": "2026-10-31", "value": 50.00}, {"date": "2026-11-01", "value": 50.00}, {"date": "2026-11-02", "value": 75.00}], "monthly_revenue": [{"date": "2026-10-04", "value": 3255}, {"date": "2026-10-05", "value": 2955}, {"date": "2026-10-06", "value": 2955}, {"date": "2026-10-07", "value": 2955}, {"date": "2026-10-08", "value": 2955}, {"date": "2026-10-09", "value": 2955}, {"date": "2026-10-10", "value": 2955}, {"date": "2026-10-11", "value": 2955}, {"date": "2026-10-12", "value": 2955}, {"date": "2026-10-13", "value": 2955}, {"date": "2026-10-14", "value": 2355}, {"date": "2026-10-15", "value": 2355}, {"date": "2026-10-16", "value": 2355}, {"date": "2026-10-17", "value": 2355}, {"date": "2026-10-18", "value": 2355}, {"date": "2026-10-19", "value": 2355}, {"date": "2026-10-20", "value": 2355}, {"date": "2026-10-21", "value": 2355}, {"date": "2026-10-22", "value": 2355}, {"date": "2026-10-23", "value": 2355}, {"date": "2026-10-24", "value": 1555}, {"date": "2026-10-25", "value": 1555}, {"date": "2026-10-26", "value": 1555}, {"date": "2026-10-27", "value": 1555}, {"date": "2026-10-28", "value": 2755}, {"date": "2026-10-29", "value": 2755}, {"date": "2026-10-30", "value": 2755}, {"date": "2026-10-31", "value": 3005}, {"date": "2026-11-01", "value": 3005}, {"date": "2026-11-02", "value": 2470}], "monthly_revenue_6mo": [{"month": "2026-06", "value": 2450}, {"month": "2026-07", "value": 3005}, {"month": "2026-08", "value": 3005}, {"month": "2026-09", "value": 3005}, {"month": "2026-10", "value": 3005}, {"month": "2026-11", "value": 2470}]}, "trend_revenue": {"trend": "down", "change": -835, "window": "2026-10-03/2026-11-02", "current": 2470, "previous": 3305, "percentChange": -25.26}, "trend_tenants": {"trend": "up", "change": 1, "window": "2026-10-03/2026-11-02", "current": 4, "previous": 3, "percentChange": 33.33}, "trend_occupancy": {"trend": "down", "change": -25.00, "window": "2026-10-03/2026-11-02", "current": 75.00, "previous": 100.00, "percentChange": -25.00}, "maintenance_open": 3, "trend_maintenance": {"trend": "down", "change": -1, "window": "2026-10-03/2026-11-02", "current": 3, "previous": 4, "percentChange": -25.00}, "property_open_maintenance": {"North Court": 3}}, "dashboard_v2_b": {"units": {"total": 1, "vacant": 0, "occupied": 1, "available": 0, "averageRent": 700.0000000000000000, "maintenance": 0, "occupancyRate": 100.00, "occupancyChange": 100.00, "totalActualRent": 700, "totalPotentialRent": 700, "occupancyChangeWindow": "2026-10-03/2026-11-02"}, "revenue": {"growth": null, "yearly": 8400, "monthly": 700, "growthWindow": "2026-10-03/2026-11-02"}, "trend_revenue": {"trend": "up", "change": 700, "window": "2026-10-03/2026-11-02", "current": 700, "previous": 0, "percentChange": null}, "trend_tenants": {"trend": "up", "change": 1, "window": "2026-10-03/2026-11-02", "current": 1, "previous": 0, "percentChange": null}, "trend_occupancy": {"trend": "up", "change": 100.00, "window": "2026-10-03/2026-11-02", "current": 100.00, "previous": 0.00, "percentChange": null}, "maintenance_open": 2, "trend_maintenance": {"trend": "up", "change": 1, "window": "2026-10-03/2026-11-02", "current": 2, "previous": 1, "percentChange": 100.00}, "property_open_maintenance": {"West Place": 2}}, "dashboard_v2_c": {"units": {"total": 3, "vacant": 2, "occupied": 1, "available": 2, "averageRent": 500.0000000000000000, "maintenance": 0, "occupancyRate": 33.33, "occupancyChange": 33.33, "totalActualRent": 500, "totalPotentialRent": 1500, "occupancyChangeWindow": "2026-10-03/2026-11-02"}, "revenue": {"growth": null, "yearly": 6000, "monthly": 500, "growthWindow": "2026-10-03/2026-11-02"}, "trend_revenue": {"trend": "up", "change": 500, "window": "2026-10-03/2026-11-02", "current": 500, "previous": 0, "percentChange": null}, "trend_occupancy": {"trend": "up", "change": 33.33, "window": "2026-10-03/2026-11-02", "current": 33.33, "previous": 0.00, "percentChange": null}}, "overview_b_2025": {"overview": {"net_income": 7251.00, "total_revenue": 8400, "total_expenses": 1149.00}, "lease_profitability": {"leases": [{"net": 600.00, "expenses": 100.00, "lease_id": "d4000000-0000-4000-8000-0000000000b2", "tenant_name": "Flo West", "unit_number": "W1", "property_name": "West Place", "rent_received": 700.00, "property_deleted": false}, {"net": 590.00, "expenses": 50.00, "lease_id": "d4000000-0000-4000-8000-0000000000b3", "tenant_name": "Hal West", "unit_number": "W1", "property_name": "West Place", "rent_received": 640.00, "property_deleted": false}], "window": "2025-01-01/2025-12-31"}}, "position_a_then": {"tenant_count": 3, "occupancy_rate": 100.00, "scheduled_rent": 3305}, "position_nobody": {"tenant_count": 0, "occupancy_rate": 0, "scheduled_rent": 0}, "position_a_today": {"tenant_count": 4, "occupancy_rate": 75.00, "scheduled_rent": 2470}, "dashboard_stats_a": {"units": {"total": 4, "vacant": 2, "occupied": 2, "available": 2, "averageRent": 900.0000000000000000, "maintenance": 0, "occupancyRate": 50.00, "occupancyChange": -25.00, "totalActualRent": 2200, "totalPotentialRent": 3600, "occupancyChangeWindow": "2026-10-03/2026-11-02"}, "revenue": {"growth": -25.26, "yearly": 86400, "monthly": 7200, "growthWindow": "2026-10-03/2026-11-02"}, "maintenance_open": 3}, "dashboard_stats_b": {"units": {"total": 1, "vacant": 0, "occupied": 1, "available": 0, "averageRent": 700.0000000000000000, "maintenance": 0, "occupancyRate": 100.00, "occupancyChange": 100.00, "totalActualRent": 700, "totalPotentialRent": 700, "occupancyChangeWindow": "2026-10-03/2026-11-02"}, "revenue": {"growth": null, "yearly": 8400, "monthly": 700, "growthWindow": "2026-10-03/2026-11-02"}, "maintenance_open": 2}, "dashboard_stats_c": {"units": {"total": 3, "vacant": 2, "occupied": 1, "available": 2, "averageRent": 500.0000000000000000, "maintenance": 0, "occupancyRate": 33.33, "occupancyChange": 33.33, "totalActualRent": 500, "totalPotentialRent": 1500, "occupancyChangeWindow": "2026-10-03/2026-11-02"}, "revenue": {"growth": null, "yearly": 6000, "monthly": 500, "growthWindow": "2026-10-03/2026-11-02"}}, "overview_a_future": {"lease_profitability": {"leases": [], "window": "2027-05-20/2027-05-22"}}, "overview_a_window": {"overview": {"net_income": 86039.50, "total_revenue": 86400, "total_expenses": 360.50}, "lease_profitability": {"leases": [{"net": 5000.00, "expenses": 0, "lease_id": "d4000000-0000-4000-8000-0000000000a8", "tenant_name": "Ed South", "unit_number": "S1", "property_name": "South House", "rent_received": 5000.00, "property_deleted": true}, {"net": 1639.50, "expenses": 360.50, "lease_id": "d4000000-0000-4000-8000-0000000000a1", "tenant_name": "Ann North", "unit_number": "N1", "property_name": "North Court", "rent_received": 2000.00, "property_deleted": false}, {"net": 800.00, "expenses": 0, "lease_id": "d4000000-0000-4000-8000-0000000000a2", "tenant_name": "Bea North", "unit_number": "N2", "property_name": "North Court", "rent_received": 800.00, "property_deleted": false}], "window": "2026-09-01/2026-10-06"}}, "position_a_months": [{"months_ago": 1, "occupancy_rate": 100.00}, {"months_ago": 2, "occupancy_rate": 100.00}, {"months_ago": 3, "occupancy_rate": 100.00}, {"months_ago": 4, "occupancy_rate": 75.00}, {"months_ago": 5, "occupancy_rate": 75.00}, {"months_ago": 6, "occupancy_rate": 75.00}, {"months_ago": 7, "occupancy_rate": 50.00}, {"months_ago": 8, "occupancy_rate": 50.00}, {"months_ago": 9, "occupancy_rate": 75.00}, {"months_ago": 10, "occupancy_rate": 50.00}, {"months_ago": 11, "occupancy_rate": 50.00}], "maintenance_nobody": {"total_cost": 0, "average_cost": null, "monthly_cost": [{"cost": 0, "month": "2025-12"}, {"cost": 0, "month": "2026-01"}, {"cost": 0, "month": "2026-02"}, {"cost": 0, "month": "2026-03"}, {"cost": 0, "month": "2026-04"}, {"cost": 0, "month": "2026-05"}, {"cost": 0, "month": "2026-06"}, {"cost": 0, "month": "2026-07"}, {"cost": 0, "month": "2026-08"}, {"cost": 0, "month": "2026-09"}, {"cost": 0, "month": "2026-10"}, {"cost": 0, "month": "2026-11"}], "trendsOverTime": [{"month": "2025-12", "pending": 0, "completed": 0, "avg_resolution_hours": null}, {"month": "2026-01", "pending": 0, "completed": 0, "avg_resolution_hours": null}, {"month": "2026-02", "pending": 0, "completed": 0, "avg_resolution_hours": null}, {"month": "2026-03", "pending": 0, "completed": 0, "avg_resolution_hours": null}, {"month": "2026-04", "pending": 0, "completed": 0, "avg_resolution_hours": null}, {"month": "2026-05", "pending": 0, "completed": 0, "avg_resolution_hours": null}, {"month": "2026-06", "pending": 0, "completed": 0, "avg_resolution_hours": null}, {"month": "2026-07", "pending": 0, "completed": 0, "avg_resolution_hours": null}, {"month": "2026-08", "pending": 0, "completed": 0, "avg_resolution_hours": null}, {"month": "2026-09", "pending": 0, "completed": 0, "avg_resolution_hours": null}, {"month": "2026-10", "pending": 0, "completed": 0, "avg_resolution_hours": null}, {"month": "2026-11", "pending": 0, "completed": 0, "avg_resolution_hours": null}], "costed_requests": 0, "vendor_performance": []}, "occupancy_series_a": [{"month": "2026-11", "total_units": 4, "occupancy_rate": 50.00, "occupied_units": 2}, {"month": "2026-10", "total_units": 4, "occupancy_rate": 100.00, "occupied_units": 4}, {"month": "2026-09", "total_units": 4, "occupancy_rate": 100.00, "occupied_units": 4}, {"month": "2026-08", "total_units": 4, "occupancy_rate": 100.00, "occupied_units": 4}, {"month": "2026-07", "total_units": 4, "occupancy_rate": 100.00, "occupied_units": 4}, {"month": "2026-06", "total_units": 4, "occupancy_rate": 75.00, "occupied_units": 3}, {"month": "2026-05", "total_units": 4, "occupancy_rate": 75.00, "occupied_units": 3}, {"month": "2026-04", "total_units": 4, "occupancy_rate": 75.00, "occupied_units": 3}, {"month": "2026-03", "total_units": 4, "occupancy_rate": 50.00, "occupied_units": 2}, {"month": "2026-02", "total_units": 4, "occupancy_rate": 75.00, "occupied_units": 3}, {"month": "2026-01", "total_units": 4, "occupancy_rate": 75.00, "occupied_units": 3}, {"month": "2025-12", "total_units": 4, "occupancy_rate": 50.00, "occupied_units": 2}], "expenses_b_leap_day": {"categories": [{"amount": 7.00, "category": "Gate Co", "percentage": 100.00}], "total_amount": 7.00, "year_over_year_change": null, "year_over_year_prior_period": "2023-02-28/2023-02-28"}, "overview_a_open_end": {"overview": {"net_income": 86370.00, "total_revenue": 86400, "total_expenses": 30.00}, "lease_profitability": {"leases": [{"net": 1000.00, "expenses": 0, "lease_id": "d4000000-0000-4000-8000-0000000000a1", "tenant_name": "Ann North", "unit_number": "N1", "property_name": "North Court", "rent_received": 1000.00, "property_deleted": false}, {"net": -30.00, "expenses": 30.00, "lease_id": "d4000000-0000-4000-8000-00000000a012", "tenant_name": "Bea North", "unit_number": "N1", "property_name": "North Court", "rent_received": 0, "property_deleted": false}], "window": "2026-11-01/2026-11-02"}}, "expenses_b_unbounded": {"categories": [{"amount": 286.00, "category": "Gate Co", "percentage": 100.00}], "total_amount": 286.00, "year_over_year_change": null, "year_over_year_prior_period": null}, "expenses_b_open_ended": {"categories": [{"amount": 1149.00, "category": "Gate Co", "percentage": 100.00}], "total_amount": 1149.00, "year_over_year_change": null, "year_over_year_prior_period": null}, "expenses_b_spring_2025": {"categories": [{"amount": 150.00, "category": "Gate Co", "percentage": 100.00}], "total_amount": 150.00, "year_over_year_change": 25.00, "year_over_year_prior_period": "2024-03-01/2024-06-30"}, "overview_b_spring_2025": {"overview": {"net_income": 8250.00, "total_revenue": 8400, "total_expenses": 150.00}, "lease_profitability": {"leases": [{"net": -50.00, "expenses": 50.00, "lease_id": "d4000000-0000-4000-8000-0000000000b3", "tenant_name": "Hal West", "unit_number": "W1", "property_name": "West Place", "rent_received": 0, "property_deleted": false}, {"net": -100.00, "expenses": 100.00, "lease_id": "d4000000-0000-4000-8000-0000000000b2", "tenant_name": "Flo West", "unit_number": "W1", "property_name": "West Place", "rent_received": 0, "property_deleted": false}], "window": "2025-03-01/2025-06-30"}}, "expenses_c_year_to_date": {"categories": [{"amount": 320.00, "category": "Porch Co", "percentage": 89.51}, {"amount": 20.00, "category": "Other", "percentage": 5.59}, {"amount": 17.50, "category": null, "percentage": 4.90}], "total_amount": 357.50, "year_over_year_change": 48.96, "year_over_year_prior_period": "2025-01-01/2025-11-02"}, "guard_refuses_another_owner": {"get_dashboard_stats": true, "get_expense_summary": true, "get_dashboard_data_v2": true, "get_financial_overview": true, "get_maintenance_analytics": true, "get_occupancy_trends_optimized": true}}';

/**
 * The same fixture against PRODUCTION's six bodies as of 2026-11-02 (each
 * pg_get_functiondef md5-equal to production's listing), on the chain replayed
 * up to 20261102055400 with only the helper added (which only the new bodies
 * call), the clock at 2026-11-02 as above: the literal zeros and nulls, the v2
 * trend against leases still active today and with no window, its series from
 * the leases active today alone, the occupancy series counting a soft-deleted
 * unit's lease, the year to date with the future expense, the dead overview
 * keys and no lease profitability.
 * `execute` shows anon=true where the chain then (before 20261102055400)
 * granted it and production does not.
 */
const PRODUCTION_FIGURES_LINE =
	'{"today": "2026-11-02", "execute": {"public.get_dashboard_stats(uuid)": {"anon": true, "service_role": true, "authenticated": true}, "public.get_dashboard_data_v2(uuid)": {"anon": true, "service_role": true, "authenticated": true}, "public.get_maintenance_analytics(uuid)": {"anon": false, "service_role": true, "authenticated": true}, "public.dashboard_lease_position(uuid,date)": {"anon": false, "service_role": false, "authenticated": false}, "public.get_expense_summary(uuid,date,date)": {"anon": true, "service_role": true, "authenticated": true}, "public.get_financial_overview(uuid,date,date)": {"anon": true, "service_role": true, "authenticated": true}, "public.get_occupancy_trends_optimized(uuid,integer)": {"anon": true, "service_role": true, "authenticated": true}}, "maintenance_a": {"total_cost": 0, "average_cost": 0, "monthly_cost": [], "trendsOverTime": [], "vendor_performance": []}, "dashboard_v2_a": {"units": {"total": 4, "vacant": 2, "occupied": 2, "available": 2, "averageRent": 900.0000000000000000, "maintenance": 0, "occupancyRate": 50.00, "occupancyChange": 25.00, "totalActualRent": 2200, "totalPotentialRent": 3600}, "revenue": {"growth": 100.00, "yearly": 26400, "monthly": 2200}, "time_series": {"occupancy_rate": [{"date": "2026-10-04", "value": 25.00}, {"date": "2026-10-05", "value": 25.00}, {"date": "2026-10-06", "value": 25.00}, {"date": "2026-10-07", "value": 25.00}, {"date": "2026-10-08", "value": 25.00}, {"date": "2026-10-09", "value": 25.00}, {"date": "2026-10-10", "value": 25.00}, {"date": "2026-10-11", "value": 25.00}, {"date": "2026-10-12", "value": 25.00}, {"date": "2026-10-13", "value": 25.00}, {"date": "2026-10-14", "value": 25.00}, {"date": "2026-10-15", "value": 25.00}, {"date": "2026-10-16", "value": 25.00}, {"date": "2026-10-17", "value": 25.00}, {"date": "2026-10-18", "value": 25.00}, {"date": "2026-10-19", "value": 25.00}, {"date": "2026-10-20", "value": 25.00}, {"date": "2026-10-21", "value": 25.00}, {"date": "2026-10-22", "value": 25.00}, {"date": "2026-10-23", "value": 25.00}, {"date": "2026-10-24", "value": 25.00}, {"date": "2026-10-25", "value": 25.00}, {"date": "2026-10-26", "value": 25.00}, {"date": "2026-10-27", "value": 25.00}, {"date": "2026-10-28", "value": 50.00}, {"date": "2026-10-29", "value": 50.00}, {"date": "2026-10-30", "value": 50.00}, {"date": "2026-10-31", "value": 50.00}, {"date": "2026-11-01", "value": 50.00}, {"date": "2026-11-02", "value": 50.00}], "monthly_revenue": [{"date": "2026-10-04", "value": 1000}, {"date": "2026-10-05", "value": 1000}, {"date": "2026-10-06", "value": 1000}, {"date": "2026-10-07", "value": 1000}, {"date": "2026-10-08", "value": 1000}, {"date": "2026-10-09", "value": 1000}, {"date": "2026-10-10", "value": 1000}, {"date": "2026-10-11", "value": 1000}, {"date": "2026-10-12", "value": 1000}, {"date": "2026-10-13", "value": 1000}, {"date": "2026-10-14", "value": 1000}, {"date": "2026-10-15", "value": 1000}, {"date": "2026-10-16", "value": 1000}, {"date": "2026-10-17", "value": 1000}, {"date": "2026-10-18", "value": 1000}, {"date": "2026-10-19", "value": 1000}, {"date": "2026-10-20", "value": 1000}, {"date": "2026-10-21", "value": 1000}, {"date": "2026-10-22", "value": 1000}, {"date": "2026-10-23", "value": 1000}, {"date": "2026-10-24", "value": 1000}, {"date": "2026-10-25", "value": 1000}, {"date": "2026-10-26", "value": 1000}, {"date": "2026-10-27", "value": 1000}, {"date": "2026-10-28", "value": 2200}, {"date": "2026-10-29", "value": 2200}, {"date": "2026-10-30", "value": 2200}, {"date": "2026-10-31", "value": 2200}, {"date": "2026-11-01", "value": 2200}, {"date": "2026-11-02", "value": 2200}], "monthly_revenue_6mo": [{"month": "2026-06", "value": 1000}, {"month": "2026-07", "value": 1000}, {"month": "2026-08", "value": 1000}, {"month": "2026-09", "value": 1000}, {"month": "2026-10", "value": 2200}, {"month": "2026-11", "value": 2200}]}, "trend_revenue": {"trend": "up", "change": 1200, "current": 2200, "previous": 1000, "percentChange": 100.00}, "trend_tenants": {"trend": "up", "change": 1, "current": 2, "previous": 1, "percentChange": 100.00}, "trend_occupancy": {"trend": "up", "change": 25.00, "current": 50.00, "previous": 25.00, "percentChange": 100.00}, "maintenance_open": 2, "trend_maintenance": {"trend": "down", "change": -1, "current": 3, "previous": 4, "percentChange": -25.00}, "property_open_maintenance": {"North Court": 3}}, "dashboard_v2_b": {"units": {"total": 1, "vacant": 0, "occupied": 1, "available": 0, "averageRent": 700.0000000000000000, "maintenance": 0, "occupancyRate": 100.00, "occupancyChange": 100.00, "totalActualRent": 700, "totalPotentialRent": 700}, "revenue": {"growth": 0, "yearly": 8400, "monthly": 700}, "trend_revenue": {"trend": "up", "change": 700, "current": 700, "previous": 0, "percentChange": 0}, "trend_tenants": {"trend": "up", "change": 1, "current": 1, "previous": 0, "percentChange": 0}, "trend_occupancy": {"trend": "up", "change": 100.00, "current": 100.00, "previous": 0.00, "percentChange": 0}, "maintenance_open": 1, "trend_maintenance": {"trend": "up", "change": 1, "current": 2, "previous": 1, "percentChange": 100.00}, "property_open_maintenance": {"West Place": 1}}, "dashboard_v2_c": {"units": {"total": 3, "vacant": 2, "occupied": 1, "available": 2, "averageRent": 500.0000000000000000, "maintenance": 0, "occupancyRate": 33.33, "occupancyChange": 33.33, "totalActualRent": 500, "totalPotentialRent": 1500}, "revenue": {"growth": 0, "yearly": 6000, "monthly": 500}, "trend_revenue": {"trend": "up", "change": 500, "current": 500, "previous": 0, "percentChange": 0}, "trend_occupancy": {"trend": "up", "change": 33.33, "current": 33.33, "previous": 0.00, "percentChange": 0}}, "overview_b_2025": {"overview": {"net_income": 7251.00, "total_revenue": 8400, "total_expenses": 1149.00, "accounts_payable": 0, "accounts_receivable": 0}, "highlights": [{"label": "Monthly Revenue", "trend": null, "value": 700.0000000000000000}, {"label": "Operating Margin", "trend": null, "value": 86.3}, {"label": "Cash Position", "trend": null, "value": 7251.00}]}, "position_a_then": {"tenant_count": 3, "occupancy_rate": 100.00, "scheduled_rent": 3305}, "position_nobody": {"tenant_count": 0, "occupancy_rate": 0, "scheduled_rent": 0}, "position_a_today": {"tenant_count": 4, "occupancy_rate": 75.00, "scheduled_rent": 2470}, "dashboard_stats_a": {"units": {"total": 4, "vacant": 2, "occupied": 2, "available": 2, "averageRent": 900.0000000000000000, "maintenance": 0, "occupancyRate": 50.00, "occupancyChange": 0, "totalActualRent": 2200, "totalPotentialRent": 3600}, "revenue": {"growth": 0, "yearly": 86400, "monthly": 7200}, "maintenance_open": 2}, "dashboard_stats_b": {"units": {"total": 1, "vacant": 0, "occupied": 1, "available": 0, "averageRent": 700.0000000000000000, "maintenance": 0, "occupancyRate": 100.00, "occupancyChange": 0, "totalActualRent": 700, "totalPotentialRent": 700}, "revenue": {"growth": 0, "yearly": 8400, "monthly": 700}, "maintenance_open": 1}, "dashboard_stats_c": {"units": {"total": 3, "vacant": 2, "occupied": 1, "available": 2, "averageRent": 500.0000000000000000, "maintenance": 0, "occupancyRate": 33.33, "occupancyChange": 0, "totalActualRent": 500, "totalPotentialRent": 1500}, "revenue": {"growth": 0, "yearly": 6000, "monthly": 500}}, "overview_a_future": {"highlights": [{"label": "Monthly Revenue", "trend": null, "value": 7200.0000000000000000}, {"label": "Operating Margin", "trend": null, "value": 100.0}, {"label": "Cash Position", "trend": null, "value": 86391.00}]}, "overview_a_window": {"overview": {"net_income": 86039.50, "total_revenue": 86400, "total_expenses": 360.50, "accounts_payable": 0, "accounts_receivable": 0}, "highlights": [{"label": "Monthly Revenue", "trend": null, "value": 7200.0000000000000000}, {"label": "Operating Margin", "trend": null, "value": 99.6}, {"label": "Cash Position", "trend": null, "value": 86039.50}]}, "position_a_months": [{"months_ago": 1, "occupancy_rate": 100.00}, {"months_ago": 2, "occupancy_rate": 100.00}, {"months_ago": 3, "occupancy_rate": 100.00}, {"months_ago": 4, "occupancy_rate": 75.00}, {"months_ago": 5, "occupancy_rate": 75.00}, {"months_ago": 6, "occupancy_rate": 75.00}, {"months_ago": 7, "occupancy_rate": 50.00}, {"months_ago": 8, "occupancy_rate": 50.00}, {"months_ago": 9, "occupancy_rate": 75.00}, {"months_ago": 10, "occupancy_rate": 50.00}, {"months_ago": 11, "occupancy_rate": 50.00}], "maintenance_nobody": {"total_cost": 0, "average_cost": 0, "monthly_cost": [], "trendsOverTime": [], "vendor_performance": []}, "occupancy_series_a": [{"month": "2026-11", "total_units": 4, "occupancy_rate": 50.00, "occupied_units": 2}, {"month": "2026-10", "total_units": 4, "occupancy_rate": 125.00, "occupied_units": 5}, {"month": "2026-09", "total_units": 4, "occupancy_rate": 100.00, "occupied_units": 4}, {"month": "2026-08", "total_units": 4, "occupancy_rate": 100.00, "occupied_units": 4}, {"month": "2026-07", "total_units": 4, "occupancy_rate": 100.00, "occupied_units": 4}, {"month": "2026-06", "total_units": 4, "occupancy_rate": 100.00, "occupied_units": 4}, {"month": "2026-05", "total_units": 4, "occupancy_rate": 100.00, "occupied_units": 4}, {"month": "2026-04", "total_units": 4, "occupancy_rate": 100.00, "occupied_units": 4}, {"month": "2026-03", "total_units": 4, "occupancy_rate": 75.00, "occupied_units": 3}, {"month": "2026-02", "total_units": 4, "occupancy_rate": 100.00, "occupied_units": 4}, {"month": "2026-01", "total_units": 4, "occupancy_rate": 100.00, "occupied_units": 4}, {"month": "2025-12", "total_units": 4, "occupancy_rate": 75.00, "occupied_units": 3}], "expenses_b_leap_day": {"categories": [{"amount": 7.00, "category": "Gate Co", "percentage": 100.00}], "total_amount": 7.00, "year_over_year_change": null}, "overview_a_open_end": {"overview": {"net_income": 86279.00, "total_revenue": 86400, "total_expenses": 121.00, "accounts_payable": 0, "accounts_receivable": 0}, "highlights": [{"label": "Monthly Revenue", "trend": null, "value": 7200.0000000000000000}, {"label": "Operating Margin", "trend": null, "value": 99.9}, {"label": "Cash Position", "trend": null, "value": 86279.00}]}, "expenses_b_unbounded": {"categories": [{"amount": 286.00, "category": "Gate Co", "percentage": 100.00}], "total_amount": 286.00, "year_over_year_change": null}, "expenses_b_open_ended": {"categories": [{"amount": 1149.00, "category": "Gate Co", "percentage": 100.00}], "total_amount": 1149.00, "year_over_year_change": null}, "expenses_b_spring_2025": {"categories": [{"amount": 150.00, "category": "Gate Co", "percentage": 100.00}], "total_amount": 150.00, "year_over_year_change": null}, "overview_b_spring_2025": {"overview": {"net_income": 8250.00, "total_revenue": 8400, "total_expenses": 150.00, "accounts_payable": 0, "accounts_receivable": 0}, "highlights": [{"label": "Monthly Revenue", "trend": null, "value": 700.0000000000000000}, {"label": "Operating Margin", "trend": null, "value": 98.2}, {"label": "Cash Position", "trend": null, "value": 8250.00}]}, "expenses_c_year_to_date": {"categories": [{"amount": 386.00, "category": "Porch Co", "percentage": 89.25}, {"amount": 35.00, "category": "Other", "percentage": 8.09}, {"amount": 9.00, "category": "Cross Co", "percentage": 2.08}, {"amount": 2.50, "category": "   ", "percentage": 0.58}], "total_amount": 432.50, "year_over_year_change": null}, "guard_refuses_another_owner": {"get_dashboard_stats": true, "get_expense_summary": true, "get_dashboard_data_v2": true, "get_financial_overview": true, "get_maintenance_analytics": true, "get_occupancy_trends_optimized": true}}';

type FiguresLine = Record<string, Record<string, unknown>>;

/** The replayed figures line, parsed, for a test to edit. */
function figuresLine(): FiguresLine {
	return JSON.parse(REPLAYED_FIGURES_LINE);
}

/** The replayed line with the value at a dotted path replaced (or removed). */
function withFigureAt(path: string, value: unknown, remove = false): string {
	const parsed = figuresLine();
	const steps = path.split(".");
	const last = steps.pop() ?? "";
	let at: Record<string, unknown> = parsed;
	for (const step of steps) {
		at = at[step] as Record<string, unknown>;
	}
	if (remove) {
		delete at[last];
	} else {
		at[last] = value;
	}
	return JSON.stringify(parsed);
}

/** The rows a call printed as a JSON array, for a test to edit in place. */
function rowsOf(line: FiguresLine, label: string): Record<string, unknown>[] {
	const rows: unknown = line[label];
	if (!Array.isArray(rows)) throw new Error(`${label} is not an array`);
	return rows.filter(
		(row): row is Record<string, unknown> =>
			typeof row === "object" && row !== null,
	);
}

/** The replayed line with one call's payload taken from production's line. */
function withProductionCall(...labels: string[]): string {
	const production: FiguresLine = JSON.parse(PRODUCTION_FIGURES_LINE);
	const parsed = figuresLine();
	for (const label of labels) {
		parsed[label] = production[label] ?? {};
	}
	return JSON.stringify(parsed);
}

describe("assertOwnerFiguresComputed", () => {
	it("passes on the line the replayed stack printed", () => {
		const result = assertOwnerFiguresComputed(`${REPLAYED_FIGURES_LINE}\n`);
		expect(result.ok).toBe(true);
		expect(result.message).toContain("the owner figures are computed");
		expect(result.message).toContain("2026-10-03/2026-11-02");
	});

	it("names every body production runs, and compares no figure", () => {
		const result = assertOwnerFiguresComputed(PRODUCTION_FIGURES_LINE);
		expect(result.ok).toBe(false);
		for (const name of [
			"get_dashboard_stats returned occupancyChange and growth as the literal 0",
			"get_dashboard_stats counted only status 'open' in maintenance.open",
			"get_dashboard_data_v2 returned no occupancyChangeWindow",
			"get_expense_summary returned year_over_year_change as the literal null",
			"get_maintenance_analytics returned total_cost as the literal 0",
			"get_financial_overview still returns accounts_receivable",
			"get_occupancy_trends_optimized counted more occupied units than units",
		]) {
			expect(result.message).toContain(name);
		}
		expect(result.message).not.toContain("expected -25");
	});

	it.each([
		[
			["dashboard_stats_a"],
			[
				"returned occupancyChange and growth as the literal 0",
				"get_dashboard_stats counted only status 'open' in maintenance.open",
			],
		],
		[
			["dashboard_v2_a"],
			[
				"get_dashboard_data_v2 returned no occupancyChangeWindow",
				"counted only status 'open' in stats.maintenance.open",
			],
		],
		[
			["expenses_c_year_to_date"],
			[
				"returned year_over_year_change as the literal null",
				"folded expenses with no vendor into a vendor's name",
			],
		],
		[["maintenance_a"], ["before 20261102184503"]],
		[["overview_a_window"], ["before 20261102184504"]],
		[["occupancy_series_a"], ["before 20261102200501"]],
	])("names %j alone when only that body is production's", (labels, texts) => {
		const result = assertOwnerFiguresComputed(withProductionCall(...labels));
		expect(result.ok).toBe(false);
		for (const text of texts) expect(result.message).toContain(text);
		expect(result.message.split("\n")).toHaveLength(1 + texts.length);
	});

	it("does not call it get_dashboard_stats' old body when the window is there", () => {
		const parsed = figuresLine();
		const units = parsed["dashboard_stats_a"]?.["units"] as Record<
			string,
			unknown
		>;
		const revenue = parsed["dashboard_stats_a"]?.["revenue"] as Record<
			string,
			unknown
		>;
		units["occupancyChange"] = 0;
		revenue["growth"] = 0;
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		expect(result.message).not.toContain("literal 0");
		expect(result.message).toContain(
			"dashboard_stats_a.units.occupancyChange: expected -25, got 0",
		);
		expect(result.message).toContain(
			"dashboard_stats_a.revenue.growth: expected -25.26, got 0",
		);
	});

	it("does not call it get_dashboard_stats' old body when only one figure is 0", () => {
		const parsed = figuresLine();
		const units = parsed["dashboard_stats_a"]?.["units"] as Record<
			string,
			unknown
		>;
		units["occupancyChange"] = 0;
		delete units["occupancyChangeWindow"];
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		expect(result.message).not.toContain("literal 0");
		expect(result.message).toContain(
			'dashboard_stats_a.units.occupancyChangeWindow: expected "2026-10-03/2026-11-02", absent',
		);
	});

	it("does not call it get_dashboard_stats' old body when the change is a figure", () => {
		const parsed = figuresLine();
		const units = parsed["dashboard_stats_a"]?.["units"] as Record<
			string,
			unknown
		>;
		const revenue = parsed["dashboard_stats_a"]?.["revenue"] as Record<
			string,
			unknown
		>;
		revenue["growth"] = 0;
		delete units["occupancyChangeWindow"];
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		expect(result.message).not.toContain("literal 0");
		expect(result.message).toContain(
			"dashboard_stats_a.revenue.growth: expected -25.26, got 0",
		);
	});

	it("reports a missing year-to-date call as missing figures, not as the old body", () => {
		const parsed = figuresLine();
		delete parsed["expenses_c_year_to_date"];
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		expect(result.message).not.toContain("literal null");
		expect(result.message).toContain(
			"expenses_c_year_to_date.total_amount: expected 357.5, absent",
		);
	});

	it("reports a missing v2 payload as missing figures, not as the old body", () => {
		const parsed = figuresLine();
		delete parsed["dashboard_v2_a"];
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		expect(result.message).not.toContain("returned no occupancyChangeWindow");
		expect(result.message).toContain(
			"dashboard_v2_a.units.occupancyChange: expected -25, absent",
		);
	});

	it("does not call it get_expense_summary's old body when the prior period is there", () => {
		const result = assertOwnerFiguresComputed(
			withFigureAt("expenses_c_year_to_date.year_over_year_change", null),
		);
		expect(result.ok).toBe(false);
		expect(result.message).not.toContain("literal null");
		expect(result.message).toContain(
			"expenses_c_year_to_date.year_over_year_change: expected 48.96, got null",
		);
	});

	it("does not call it get_expense_summary's old body when the change is a figure", () => {
		const result = assertOwnerFiguresComputed(
			withFigureAt(
				"expenses_c_year_to_date.year_over_year_prior_period",
				null,
				true,
			),
		);
		expect(result.ok).toBe(false);
		expect(result.message).not.toContain("literal null");
		expect(result.message).toContain(
			'expenses_c_year_to_date.year_over_year_prior_period: expected "2025-01-01/2025-11-02", absent',
		);
	});

	it("does not call it get_maintenance_analytics' old body when costed_requests is there", () => {
		const result = assertOwnerFiguresComputed(
			withFigureAt("maintenance_a.total_cost", 0),
		);
		expect(result.ok).toBe(false);
		expect(result.message).not.toContain("literal 0");
		expect(result.message).toContain(
			"maintenance_a.total_cost: expected 790.5, got 0",
		);
	});

	it("does not call it get_maintenance_analytics' old body when the cost is a figure", () => {
		const result = assertOwnerFiguresComputed(
			withFigureAt("maintenance_a.costed_requests", null, true),
		);
		expect(result.ok).toBe(false);
		expect(result.message).not.toContain("literal 0");
		expect(result.message).toContain(
			"maintenance_a.costed_requests: expected 4, absent",
		);
	});

	it("fails when the earlier day counts only leases active today", () => {
		const result = assertOwnerFiguresComputed(
			withFigureAt("dashboard_v2_a.units.occupancyChange", 25),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"dashboard_v2_a.units.occupancyChange: expected -25, got 25",
		);
	});

	it("fails when no prior rent reads as 0% growth, telling 0 from null", () => {
		const result = assertOwnerFiguresComputed(
			withFigureAt("dashboard_v2_b.revenue.growth", 0),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"dashboard_v2_b.revenue.growth: expected null, got 0",
		);
	});

	it("fails when no prior rent leaves growth out, telling absent from null", () => {
		const result = assertOwnerFiguresComputed(
			withFigureAt("dashboard_stats_b.revenue.growth", null, true),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"dashboard_stats_b.revenue.growth: expected null, absent",
		);
	});

	it("fails when the year to date counts an expense dated in the future", () => {
		const result = assertOwnerFiguresComputed(
			withFigureAt("expenses_c_year_to_date.total_amount", 423.5),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"expenses_c_year_to_date.total_amount: expected 357.5, got 423.5",
		);
	});

	it("fails when the open-maintenance tile is not the trend's count", () => {
		const result = assertOwnerFiguresComputed(
			withFigureAt("dashboard_v2_b.trend_maintenance.current", 1),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"dashboard_v2_b: stats.maintenance.open is 2, the open_maintenance trend's current figure 1",
		);
	});

	it("fails when a property's open maintenance is not the tile's count", () => {
		const result = assertOwnerFiguresComputed(
			withFigureAt("dashboard_v2_b.property_open_maintenance.West Place", 1),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"the open_maintenance trend's current figure 2 and the properties' open_maintenance 1",
		);
	});

	it("checks owner A's open-maintenance count too", () => {
		const result = assertOwnerFiguresComputed(
			withFigureAt("dashboard_v2_a.trend_maintenance.current", 4),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"dashboard_v2_a: stats.maintenance.open is 3, the open_maintenance trend's current figure 4",
		);
	});

	it("fails when get_dashboard_stats' open maintenance is not get_dashboard_data_v2's", () => {
		const result = assertOwnerFiguresComputed(
			withFigureAt("dashboard_stats_b.maintenance_open", 1),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"dashboard_stats_b: get_dashboard_stats' maintenance.open is 1 where get_dashboard_data_v2's is 2",
		);
		expect(result.message).toContain(
			"dashboard_stats_b.maintenance_open: expected 2, got 1",
		);
	});

	it("checks owner A's get_dashboard_stats open maintenance too", () => {
		const result = assertOwnerFiguresComputed(
			withFigureAt("dashboard_stats_a.maintenance_open", 4),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"dashboard_stats_a: get_dashboard_stats' maintenance.open is 4 where get_dashboard_data_v2's is 3",
		);
		expect(result.message).toContain(
			"dashboard_stats_a.maintenance_open: expected 3, got 4",
		);
		expect(result.message).not.toContain(
			"get_dashboard_stats counted only status 'open'",
		);
	});

	it("fails when get_dashboard_stats returns no open maintenance", () => {
		const result = assertOwnerFiguresComputed(
			withFigureAt("dashboard_stats_a.maintenance_open", null, true),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"dashboard_stats_a: get_dashboard_stats' maintenance.open is undefined where get_dashboard_data_v2's is 3",
		);
	});

	it("names get_dashboard_stats' status-'open' body only when it reads 2 beside a trend of 3", () => {
		const named = assertOwnerFiguresComputed(
			withFigureAt("dashboard_stats_a.maintenance_open", 2),
		);
		expect(named.message).toContain(
			"get_dashboard_stats counted only status 'open' in maintenance.open",
		);
	});

	it("fails when the properties' open maintenance is missing", () => {
		const result = assertOwnerFiguresComputed(
			withFigureAt("dashboard_v2_a.property_open_maintenance", null, true),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("the properties' open_maintenance null");
	});

	it("names the status-'open' body only when the tile reads 2 beside a trend of 3", () => {
		const named = assertOwnerFiguresComputed(
			withFigureAt("dashboard_v2_a.maintenance_open", 2),
		);
		expect(named.message).toContain(
			"counted only status 'open' in stats.maintenance.open",
		);
		const unnamed = assertOwnerFiguresComputed(
			withFigureAt("dashboard_v2_a.maintenance_open", 4),
		);
		expect(unnamed.ok).toBe(false);
		expect(unnamed.message).not.toContain("counted only status 'open'");
		expect(unnamed.message).toContain(
			"dashboard_v2_a.maintenance_open: expected 3, got 4",
		);
	});

	it('names the folded-vendor body only when "Other" holds more than its own 20.00', () => {
		const folded = figuresLine();
		const categories = folded["expenses_c_year_to_date"]?.[
			"categories"
		] as Record<string, unknown>[];
		const other = categories.find((c) => c["category"] === "Other");
		if (other === undefined) throw new Error("no Other row");
		other["amount"] = 35;
		expect(
			assertOwnerFiguresComputed(JSON.stringify(folded)).message,
		).toContain("folded expenses with no vendor into a vendor's name");
		other["amount"] = 19;
		const short = assertOwnerFiguresComputed(JSON.stringify(folded));
		expect(short.ok).toBe(false);
		expect(short.message).not.toContain("folded expenses with no vendor");
		const porch = categories.find((c) => c["category"] === "Porch Co");
		if (porch === undefined) throw new Error("no Porch Co row");
		other["amount"] = 20;
		porch["category"] = "Other";
		expect(
			assertOwnerFiguresComputed(JSON.stringify(folded)).message,
		).toContain("folded expenses with no vendor into a vendor's name");
	});

	it("fails when the expenses with no vendor are not their own category", () => {
		const parsed = figuresLine();
		const categories = parsed["expenses_c_year_to_date"]?.[
			"categories"
		] as Record<string, unknown>[];
		const none = categories.find((c) => c["category"] === null);
		if (none === undefined) throw new Error("no NULL row");
		none["category"] = "";
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			'expenses_c_year_to_date.categories[2].category: expected null, got ""',
		);
	});

	it("fails when a vendor is out of order", () => {
		const parsed = figuresLine();
		const vendors = parsed["maintenance_a"]?.[
			"vendor_performance"
		] as unknown[];
		vendors.reverse();
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			'maintenance_a.vendor_performance[0].vendor_name: expected "Roof Co", got null',
		);
	});

	it("fails when a series is a month short, naming the count", () => {
		const parsed = figuresLine();
		const months = parsed["maintenance_a"]?.["monthly_cost"] as unknown[];
		months.pop();
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"maintenance_a.monthly_cost: expected 12 rows, got",
		);
	});

	it("fails when a request open at a month's end is not counted", () => {
		const parsed = figuresLine();
		const trends = parsed["maintenance_a"]?.["trendsOverTime"] as Record<
			string,
			unknown
		>[];
		const august = trends[8];
		if (august) august["pending"] = 2;
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"maintenance_a.trendsOverTime[8].pending: expected 4, got 2",
		);
	});

	it("fails when the overview keeps a key no caller reads", () => {
		const parsed = figuresLine();
		const window = parsed["overview_a_window"] as Record<string, unknown>;
		window["highlights"] = [];
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			'overview_a_window: expected exactly the keys ["lease_profitability","overview"], got ["highlights","lease_profitability","overview"]',
		);
	});

	it("names the body before when the overview reports no lease profitability", () => {
		const result = assertOwnerFiguresComputed(
			withFigureAt("overview_a_window.lease_profitability", null, true),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"get_financial_overview returned no lease_profitability: that is a body before 20261102184504",
		);
	});

	it("does not call it the body before when only the leases are missing", () => {
		const result = assertOwnerFiguresComputed(
			withFigureAt("overview_a_window.lease_profitability.leases", null, true),
		);
		expect(result.ok).toBe(false);
		expect(result.message).not.toContain("returned no lease_profitability");
		expect(result.message).toContain(
			"overview_a_window.lease_profitability.leases: expected 3 rows, got undefined",
		);
	});

	it.each([
		[
			"a soft-deleted lease's receipts count",
			"overview_a_window.lease_profitability.leases",
			0,
			"rent_received",
			9444,
		],
		[
			"a deleted property's lease is not said to be",
			"overview_a_window.lease_profitability.leases",
			0,
			"property_deleted",
			false,
		],
		[
			"an expense on a day two leases ran counts for the earlier lease",
			"overview_b_spring_2025.lease_profitability.leases",
			0,
			"expenses",
			0,
		],
		[
			"a reversal does not net",
			"overview_b_2025.lease_profitability.leases",
			1,
			"rent_received",
			750,
		],
		[
			"net is not rent received less expenses",
			"overview_b_2025.lease_profitability.leases",
			0,
			"net",
			700,
		],
	])("fails when %s", (_what, path, index, key, value) => {
		const parsed = figuresLine();
		const steps = path.split(".");
		let at: unknown = parsed;
		for (const step of steps) at = (at as Record<string, unknown>)[step];
		const row = (at as Record<string, unknown>[])[index];
		if (row) row[key] = value;
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		expect(result.message).toContain(`${path}[${index}].${key}: expected`);
	});

	it("fails when the lease profitability states another window", () => {
		const result = assertOwnerFiguresComputed(
			withFigureAt(
				"overview_b_2025.lease_profitability.window",
				"2025-01-01..2025-12-31",
			),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			'overview_b_2025.lease_profitability.window: expected "2025-01-01/2025-12-31", got "2025-01-01..2025-12-31"',
		);
	});

	it("fails when a lease with an expense on no lease's day is listed", () => {
		const parsed = figuresLine();
		const spring = parsed["overview_b_spring_2025"]?.[
			"lease_profitability"
		] as Record<string, unknown[]>;
		spring["leases"]?.push({
			lease_id: "d4000000-0000-4000-8000-0000000000b1",
		});
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"overview_b_spring_2025.lease_profitability.leases: expected 2 rows, got",
		);
	});

	it("names the occupancy series' body before when a month counts more units than it has", () => {
		const parsed = figuresLine();
		const series = rowsOf(parsed, "occupancy_series_a");
		const latest = series[1];
		if (latest) latest["occupied_units"] = 5;
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		expect(result.message).toContain("before 20261102200501");
	});

	it("does not call it the series' body before when a month is short", () => {
		const parsed = figuresLine();
		const series = rowsOf(parsed, "occupancy_series_a");
		const fifth = series[5];
		if (fifth) {
			fifth["occupied_units"] = 4;
			fifth["occupancy_rate"] = 100;
		}
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		expect(result.message).not.toContain("before 20261102200501");
		expect(result.message).toContain(
			"occupancy_series_a[5].occupancy_rate: expected 75, got 100",
		);
		expect(result.message).toContain(
			"occupancy 5 months ago: the helper reads 75 and the series 100",
		);
	});

	it("fails when the helper and the series disagree on a month whose leases hold", () => {
		const parsed = figuresLine();
		const months = rowsOf(parsed, "position_a_months");
		const second = months[1];
		if (second) second["occupancy_rate"] = 75;
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"occupancy 2 months ago: the helper reads 75 and the series 100",
		);
	});

	it("says a month, not months, for the month before T's", () => {
		const parsed = figuresLine();
		const first = rowsOf(parsed, "position_a_months")[0];
		if (first) first["occupancy_rate"] = 75;
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"occupancy 1 month ago: the helper reads 75 and the series 100",
		);
	});

	it("does not compare the helper and the series on a month a lease starts or ends in", () => {
		// 4 months ago L5 starts inside the month (T-100): the series reads
		// 100.00, the helper on its first day 75.00.
		const result = assertOwnerFiguresComputed(REPLAYED_FIGURES_LINE);
		expect(result.ok).toBe(true);
		expect(result.message).not.toContain("months ago");
	});

	it("fails when neither the helper's months nor the series were reported", () => {
		const parsed = figuresLine();
		delete parsed["position_a_months"];
		delete parsed["occupancy_series_a"];
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"occupancy 2 months ago: the helper reads undefined and the series undefined",
		);
	});

	it("reports a missing overview call as missing figures, not as the old body", () => {
		const parsed = figuresLine();
		delete parsed["overview_a_window"];
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		expect(result.message).not.toContain("returned no lease_profitability");
		expect(result.message).toContain(
			"overview_a_window.overview.total_revenue: expected 86400, absent",
		);
	});

	it("fails when the dashboard's series count only the leases active today", () => {
		const parsed = figuresLine();
		const production: FiguresLine = JSON.parse(PRODUCTION_FIGURES_LINE);
		(parsed["dashboard_v2_a"] as Record<string, unknown>)["time_series"] =
			production["dashboard_v2_a"]?.["time_series"];
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		// T-29, L10's last day: all four units let (production's body: L1 alone).
		expect(result.message).toContain(
			"dashboard_v2_a.time_series.occupancy_rate[0].value: expected 100, got 25",
		);
		// T: the trend's current figure (production's: L1 and L3).
		expect(result.message).toContain(
			"dashboard_v2_a.time_series.monthly_revenue[29].value: expected 2470, got 2200",
		);
		expect(result.message).toContain(
			"dashboard_v2_a.time_series.monthly_revenue_6mo[5].value: expected 2470, got 2200",
		);
	});

	it("fails when the dashboard's series were not reported", () => {
		const parsed = figuresLine();
		delete (parsed["dashboard_v2_a"] as Record<string, unknown>)["time_series"];
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		for (const series of [
			"occupancy_rate",
			"monthly_revenue",
			"monthly_revenue_6mo",
		]) {
			expect(result.message).toContain(
				`dashboard_v2_a.time_series.${series}: expected ${series === "monthly_revenue_6mo" ? 6 : 30} rows, got undefined`,
			);
		}
	});

	it("fails when the helper's months were not reported", () => {
		const parsed = figuresLine();
		delete parsed["position_a_months"];
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"position_a_months: expected 11 rows, got undefined",
		);
		expect(result.message).toContain(
			"occupancy 2 months ago: the helper reads undefined and the series 100",
		);
	});

	it.each([
		["dashboard_v2_a.trend_tenants.previous", 1, "expected 3, got 1"],
		["dashboard_v2_a.trend_tenants.current", 3, "expected 4, got 3"],
		["position_a_today.tenant_count", 3, "expected 4, got 3"],
		["dashboard_v2_b.trend_occupancy.percentChange", 0, "expected null, got 0"],
		["dashboard_v2_b.trend_revenue.percentChange", 0, "expected null, got 0"],
		["dashboard_v2_b.trend_tenants.percentChange", 0, "expected null, got 0"],
		[
			"dashboard_v2_b.trend_maintenance.percentChange",
			0,
			"expected 100, got 0",
		],
		["dashboard_v2_a.trend_occupancy.percentChange", 0, "expected -25, got 0"],
		[
			"dashboard_v2_a.trend_maintenance.window",
			"2026-10-02/2026-11-02",
			'expected "2026-10-03/2026-11-02"',
		],
	])("fails when %s reads %j", (path, value, text) => {
		const result = assertOwnerFiguresComputed(withFigureAt(path, value));
		expect(result.ok).toBe(false);
		expect(result.message).toContain(`${path}: ${text}`);
	});

	it("names the body before when the trends state no window", () => {
		const result = assertOwnerFiguresComputed(
			withFigureAt("dashboard_v2_a.trend_occupancy.window", null, true),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"get_dashboard_data_v2's trends state no window",
		);
	});

	it("tells a NULL percentChange from an absent one", () => {
		const result = assertOwnerFiguresComputed(
			withFigureAt("dashboard_v2_b.trend_tenants.percentChange", null, true),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"dashboard_v2_b.trend_tenants.percentChange: expected null, absent",
		);
	});

	it("fails when the overview's figures carry an extra key", () => {
		const result = assertOwnerFiguresComputed(
			withFigureAt("overview_a_window.overview.accounts_payable", 0),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			'overview_a_window.overview: expected exactly the keys ["net_income","total_expenses","total_revenue"]',
		);
	});

	it("fails when the functions disagree with their helper", () => {
		const result = assertOwnerFiguresComputed(
			withFigureAt("position_a_then.occupancy_rate", 99),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"dashboard_stats_a.units.occupancyChange: -25 is not the helper's -24",
		);
		expect(result.message).toContain(
			"dashboard_v2_a.trend_occupancy.change: -25 is not the helper's -24",
		);
	});

	it("does not report a disagreement when both helper positions move together", () => {
		const parsed = figuresLine();
		(parsed["position_a_today"] as Record<string, unknown>)["occupancy_rate"] =
			74;
		(parsed["position_a_then"] as Record<string, unknown>)["occupancy_rate"] =
			99;
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		expect(result.message).not.toContain("is not the helper's");
		expect(result.message).toContain(
			"position_a_today.occupancy_rate: expected 75, got 74",
		);
	});

	it.each([
		["public.dashboard_lease_position(uuid,date)", "authenticated", true],
		["public.dashboard_lease_position(uuid,date)", "service_role", true],
		["public.get_dashboard_stats(uuid)", "anon", true],
		["public.get_maintenance_analytics(uuid)", "service_role", false],
	])("fails when %s's %s grant is %s", (signature, role, value) => {
		const parsed = figuresLine();
		const execute = parsed["execute"] as Record<
			string,
			Record<string, unknown>
		>;
		const grants = execute[signature];
		if (grants) grants[role] = value;
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			`execute.${signature}.${role}: expected ${!value}, got ${value}`,
		);
	});

	it("fails when one guard lets owner A read owner B's figures", () => {
		const result = assertOwnerFiguresComputed(
			withFigureAt("guard_refuses_another_owner.get_expense_summary", false),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"guard_refuses_another_owner.get_expense_summary: expected true, got false",
		);
	});

	it("fails when the fixture did not report the guards at all", () => {
		const parsed = figuresLine();
		delete parsed["guard_refuses_another_owner"];
		const result = assertOwnerFiguresComputed(JSON.stringify(parsed));
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"guard_refuses_another_owner.get_financial_overview: expected true, got undefined",
		);
	});

	it("computes every window from the day the fixture ran", () => {
		const result = assertOwnerFiguresComputed(
			JSON.stringify({ ...figuresLine(), today: "2026-11-03" }),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			'dashboard_stats_a.units.occupancyChangeWindow: expected "2026-10-04/2026-11-03", got "2026-10-03/2026-11-02"',
		);
	});

	it.each([
		["absent", undefined],
		["not a string", 20261102],
		["no calendar day", "2026-02-30"],
	])(
		"fails on a today that is %s, calling it a broken fixture",
		(_what, today) => {
			const result = assertOwnerFiguresComputed(
				JSON.stringify({ ...figuresLine(), today }),
			);
			expect(result.ok).toBe(false);
			expect(result.message).toContain("printed no usable `today`");
		},
	);

	it("fails on no output, calling it a broken fixture rather than a wrong figure", () => {
		const result = assertOwnerFiguresComputed("\n  \n");
		expect(result.ok).toBe(false);
		expect(result.message).toContain("printed nothing");
	});

	it.each([
		["not JSON", "INSERT 0 1"],
		["a JSON array", "[1, 2]"],
	])("fails on output that is %s", (_what, raw) => {
		const result = assertOwnerFiguresComputed(raw);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("did not print a JSON object");
	});
});

describe("expectedOwnerFigures", () => {
	it("moves February 29 back a year to February 28, as Postgres does", () => {
		expect(
			expectedOwnerFigures("2028-02-29").figures[
				"expenses_c_year_to_date.year_over_year_prior_period"
			],
		).toBe("2027-01-01/2027-02-28");
	});

	it("starts the 12 months eleven before today's, across a year", () => {
		const months = expectedOwnerFigures("2027-01-15").series[
			"maintenance_a.monthly_cost"
		]?.map((row) => row["month"]);
		expect(months?.[0]).toBe("2026-02");
		expect(months?.[11]).toBe("2027-01");
	});

	it.each([
		// Postgres: (d - n months)::date, and that + 1 month - 1 day.
		["2026-12-31", 1, "2026-11-30", "2026-12-29"],
		["2026-12-31", 11, "2026-01-31", "2026-02-27"],
		["2027-01-31", 1, "2026-12-31", "2027-01-30"],
		["2027-01-31", 11, "2026-02-28", "2026-03-27"],
		["2027-03-31", 1, "2027-02-28", "2027-03-27"],
		["2027-03-31", 2, "2027-01-31", "2027-02-27"],
		["2027-05-31", 3, "2027-02-28", "2027-03-27"],
		["2028-02-29", 1, "2028-01-29", "2028-02-28"],
		["2028-02-29", 11, "2027-03-29", "2027-04-28"],
	])(
		"puts the occupancy series' month %s less %i months at %s..%s, as Postgres does",
		(today, monthsAgo, from, to) => {
			expect(occupancySeriesMonth(today, monthsAgo)).toEqual([from, to]);
		},
	);

	it("draws the 30-day series from T-29 to T and the 6-month one to M0", () => {
		const { series } = expectedOwnerFigures("2027-01-15");
		const days = series["dashboard_v2_a.time_series.monthly_revenue"];
		expect(days?.[0]?.["date"]).toBe("2026-12-17");
		expect(days?.[29]?.["date"]).toBe("2027-01-15");
		expect(
			series["dashboard_v2_a.time_series.monthly_revenue_6mo"]?.map(
				(row) => row["month"],
			),
		).toEqual([
			"2026-08",
			"2026-09",
			"2026-10",
			"2026-11",
			"2026-12",
			"2027-01",
		]);
	});

	it("puts each 6-month point on its month's last day, M0's on T", () => {
		// T = 2026-11-02: October 31 is T-2 (the 30-day series' 28th day) and
		// M0's point is T's, the series' last.
		const { series } = expectedOwnerFigures("2026-11-02");
		const days = series["dashboard_v2_a.time_series.monthly_revenue"];
		const months = series["dashboard_v2_a.time_series.monthly_revenue_6mo"];
		expect(days?.[27]?.["date"]).toBe("2026-10-31");
		expect(months?.[4]?.["value"]).toBe(days?.[27]?.["value"]);
		expect(months?.[5]?.["value"]).toBe(days?.[29]?.["value"]);
		// On a month's last day M0's point is T's as well.
		const last = expectedOwnerFigures("2026-11-30").series;
		expect(
			last["dashboard_v2_a.time_series.monthly_revenue_6mo"]?.[5]?.["value"],
		).toBe(last["dashboard_v2_a.time_series.monthly_revenue"]?.[29]?.["value"]);
	});

	it("gives R3's spend of M0 to L12 only when L12 ran on M0", () => {
		const leases = (today: string) =>
			expectedOwnerFigures(today).series[
				"overview_a_open_end.lease_profitability.leases"
			]?.map((row) => [row["lease_id"], row["expenses"]]);
		expect(leases("2026-11-02")).toEqual([
			["d4000000-0000-4000-8000-0000000000a1", 0],
			["d4000000-0000-4000-8000-00000000a012", 30],
		]);
		// T-2 is M0 itself: L12 ran that day.
		expect(leases("2026-11-03")).toEqual([
			["d4000000-0000-4000-8000-0000000000a1", 0],
			["d4000000-0000-4000-8000-00000000a012", 30],
		]);
		expect(leases("2026-11-04")).toEqual([
			["d4000000-0000-4000-8000-0000000000a1", 30],
		]);
	});

	it("measures each resolution over the calendar months between", () => {
		// M0-3 is January 1 and M0-1 March 1: 59 days, so R7's is 1416 - 58 =
		// 1358 hours; M0-1 to M0 is March's 31 days, so R2's is 744 - 10 = 734.
		const trends =
			expectedOwnerFigures("2026-04-15").series["maintenance_a.trendsOverTime"];
		expect(trends?.[9]?.["avg_resolution_hours"]).toBe(48.33);
		expect(trends?.[10]?.["avg_resolution_hours"]).toBe(1358);
		expect(trends?.[11]?.["avg_resolution_hours"]).toBe(734);
		expect(trends?.[8]?.["avg_resolution_hours"]).toBeNull();
	});
});

/**
 * What scripts/migration-replay-blog-banlist.sql printed on the replayed stack
 * with 20261102230101 applied, and with production's body of
 * validate_blog_post (md5 33667bfe24d7566b1e7effaa292c8bcd) put back in its
 * place under production's ACL.
 */
const REPLAYED_BLOG_BANLIST = {
	"clean-in-review": {
		state: "00000",
		message: null,
	},
	"clean-published": {
		state: "00000",
		message: null,
	},
	"ownership-every-field": {
		state: "00000",
		message: null,
	},
	"persona-content-in-review": {
		state: "23514",
		message: "banlist hit: property owner (persona word found in content)",
	},
	"persona-content-published": {
		state: "23514",
		message: "banlist hit: property owner (persona word found in content)",
	},
	"persona-draft": {
		state: "00000",
		message: null,
	},
	"persona-excerpt-in-review": {
		state: "23514",
		message: "banlist hit: property owner (persona word found in excerpt)",
	},
	"persona-excerpt-published": {
		state: "23514",
		message: "banlist hit: property owner (persona word found in excerpt)",
	},
	"persona-title-in-review": {
		state: "23514",
		message: "banlist hit: property owner (persona word found in title)",
	},
	"persona-title-published": {
		state: "23514",
		message: "banlist hit: property owner (persona word found in title)",
	},
	"phrase-content-in-review": {
		state: "23514",
		message:
			"banlist hit: tenant portal (Phase 4 banlist phrase found in content)",
	},
	"phrase-content-published": {
		state: "23514",
		message:
			"banlist hit: tenant portal (Phase 4 banlist phrase found in content)",
	},
	"phrase-excerpt-in-review": {
		state: "23514",
		message: "banlist hit: autopay (Phase 4 banlist phrase found in excerpt)",
	},
	"phrase-excerpt-published": {
		state: "23514",
		message: "banlist hit: autopay (Phase 4 banlist phrase found in excerpt)",
	},
	"phrase-title-in-review": {
		state: "23514",
		message:
			"banlist hit: rent collection (Phase 4 banlist phrase found in title)",
	},
	"phrase-title-published": {
		state: "23514",
		message:
			"banlist hit: rent collection (Phase 4 banlist phrase found in title)",
	},
	privileges: {
		acl: "{postgres=X/postgres}",
		config: ["search_path=public"],
		volatility: "v",
		security_definer: true,
	},
	trigger: {
		type: 23,
		enabled: "O",
		function: "validate_blog_post()",
	},
	"update-draft-to-published": {
		state: "23514",
		message: "banlist hit: property owner (persona word found in excerpt)",
	},
	"update-published-to-published": {
		state: "00000",
		message: null,
	},
	"word-character-after": {
		state: "00000",
		message: null,
	},
};
const PRODUCTION_BODY_BLOG_BANLIST = {
	"clean-in-review": {
		state: "00000",
		message: null,
	},
	"clean-published": {
		state: "00000",
		message: null,
	},
	"ownership-every-field": {
		state: "00000",
		message: null,
	},
	"persona-content-in-review": {
		state: "00000",
		message: null,
	},
	"persona-content-published": {
		state: "00000",
		message: null,
	},
	"persona-draft": {
		state: "00000",
		message: null,
	},
	"persona-excerpt-in-review": {
		state: "00000",
		message: null,
	},
	"persona-excerpt-published": {
		state: "00000",
		message: null,
	},
	"persona-title-in-review": {
		state: "00000",
		message: null,
	},
	"persona-title-published": {
		state: "00000",
		message: null,
	},
	"phrase-content-in-review": {
		state: "23514",
		message:
			"banlist hit: tenant portal (Phase 4 banlist phrase found in content)",
	},
	"phrase-content-published": {
		state: "23514",
		message:
			"banlist hit: tenant portal (Phase 4 banlist phrase found in content)",
	},
	"phrase-excerpt-in-review": {
		state: "00000",
		message: null,
	},
	"phrase-excerpt-published": {
		state: "00000",
		message: null,
	},
	"phrase-title-in-review": {
		state: "00000",
		message: null,
	},
	"phrase-title-published": {
		state: "00000",
		message: null,
	},
	privileges: {
		acl: "{postgres=X/postgres}",
		config: ["search_path=public"],
		volatility: "v",
		security_definer: true,
	},
	trigger: {
		type: 23,
		enabled: "O",
		function: "validate_blog_post()",
	},
	"update-draft-to-published": {
		state: "00000",
		message: null,
	},
	"update-published-to-published": {
		state: "00000",
		message: null,
	},
	"word-character-after": {
		state: "00000",
		message: null,
	},
};

function blogLine(
	patch: Record<string, unknown> = {},
	base: Record<string, unknown> = REPLAYED_BLOG_BANLIST,
): string {
	return JSON.stringify({ ...base, ...patch });
}

describe("assertBlogBanlistGate", () => {
	it("passes on the line the replayed stack printed", () => {
		const result = assertBlogBanlistGate(`${blogLine()}\n`);
		expect(result.ok).toBe(true);
		expect(result.message).toContain("rejects a banlist phrase");
	});

	it("names the content-only body when production's body comes back", () => {
		const result = assertBlogBanlistGate(
			blogLine({}, PRODUCTION_BODY_BLOG_BANLIST),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("read NEW.content only");
	});

	it("lists production's body's other gaps once the phrases are fixed in every field", () => {
		const result = assertBlogBanlistGate(
			blogLine(
				{
					"phrase-title-published":
						REPLAYED_BLOG_BANLIST["phrase-title-published"],
					"phrase-excerpt-published":
						REPLAYED_BLOG_BANLIST["phrase-excerpt-published"],
				},
				PRODUCTION_BODY_BLOG_BANLIST,
			),
		);
		expect(result.ok).toBe(false);
		expect(result.message).not.toContain("read NEW.content only");
		expect(result.message).toContain(
			'persona-content-published.state: expected "23514", got "00000"',
		);
		expect(result.message).toContain(
			'phrase-title-in-review.state: expected "23514", got "00000"',
		);
		expect(result.message).toContain(
			'update-draft-to-published.state: expected "23514", got "00000"',
		);
	});

	it.each(["phrase-title-published", "phrase-excerpt-published"] as const)(
		"does not call it the content-only body when %s is rejected",
		(label) => {
			const result = assertBlogBanlistGate(
				blogLine(
					{ [label]: REPLAYED_BLOG_BANLIST[label] },
					PRODUCTION_BODY_BLOG_BANLIST,
				),
			);
			expect(result.ok).toBe(false);
			expect(result.message).not.toContain("read NEW.content only");
			expect(result.message).toContain("does not decide the fixture's posts");
		},
	);

	it("does not call it the content-only body when the content phrase also passes", () => {
		const result = assertBlogBanlistGate(
			blogLine(
				{
					"phrase-content-published": { state: "00000", message: null },
				},
				PRODUCTION_BODY_BLOG_BANLIST,
			),
		);
		expect(result.ok).toBe(false);
		expect(result.message).not.toContain("read NEW.content only");
	});

	it.each(Object.keys(EXPECTED_BLOG_BANLIST))(
		"fails when case %s is decided the other way",
		(label) => {
			const flipped =
				EXPECTED_BLOG_BANLIST[label]?.state === "00000"
					? {
							state: "23514",
							message:
								"banlist hit: property owner (persona word found in title)",
						}
					: { state: "00000", message: null };
			const result = assertBlogBanlistGate(blogLine({ [label]: flipped }));
			expect(result.ok).toBe(false);
			expect(result.message).toContain(`${label}.state: expected`);
		},
	);

	it.each(Object.keys(EXPECTED_BLOG_BANLIST))(
		"fails when case %s is missing",
		(label) => {
			const line = JSON.parse(blogLine());
			delete line[label];
			const result = assertBlogBanlistGate(JSON.stringify(line));
			expect(result.ok).toBe(false);
			expect(result.message).toContain(`${label}: absent or not an object`);
		},
	);

	it("fails when a rejection names another field", () => {
		const result = assertBlogBanlistGate(
			blogLine({
				"persona-excerpt-published": {
					state: "23514",
					message:
						"banlist hit: property owner (persona word found in content)",
				},
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("persona-excerpt-published.message");
	});

	it.each([
		["acl", "{=X/postgres,postgres=X/postgres,service_role=X/postgres}"],
		["acl", "{postgres=X/postgres,service_role=X/postgres}"],
		["volatility", "s"],
		["security_definer", false],
		["config", ["search_path=public, extensions"]],
		["config", null],
	])("fails when the function's %s is %j", (key, value) => {
		const result = assertBlogBanlistGate(
			blogLine({
				privileges: { ...REPLAYED_BLOG_BANLIST["privileges"], [key]: value },
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(`privileges.${key}: expected`);
	});

	it.each([
		["type", 7],
		["enabled", "D"],
		["function", "validate_blog_post_old()"],
	])("fails when the trigger's %s is %j", (key, value) => {
		const result = assertBlogBanlistGate(
			blogLine({
				trigger: { ...REPLAYED_BLOG_BANLIST["trigger"], [key]: value },
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(`trigger.${key}: expected`);
	});

	it.each([
		["", "printed nothing"],
		["   \n", "printed nothing"],
		["not json", "did not print a JSON object"],
		["[]", "did not print a JSON object"],
		["null", "did not print a JSON object"],
	])("refuses %j as a broken fixture", (raw, phrase) => {
		const result = assertBlogBanlistGate(raw);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(phrase);
	});

	it("fails when privileges or the trigger are absent", () => {
		const line = JSON.parse(blogLine());
		delete line.privileges;
		delete line.trigger;
		const result = assertBlogBanlistGate(JSON.stringify(line));
		expect(result.ok).toBe(false);
		expect(result.message).toContain("privileges: absent or not an object");
		expect(result.message).toContain("trigger: absent or not an object");
	});
});
