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
	assertEveryMigrationApplied,
	assertNoMigrationReachedTheNetwork,
	assertSeededCast,
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
