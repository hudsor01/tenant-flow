/**
 * Phase 66 — the rental-application field contract is written down twice, and
 * this file is why that is safe.
 *
 * WHY THE DUPLICATION EXISTS. The browser form validates with zod
 * (`src/lib/validation/rental-applications.ts`). The Edge Function cannot: zod
 * is not in `supabase/functions/deno.json`'s import map, and adding it would be
 * a new runtime dependency, which this milestone forbids. So
 * `supabase/functions/_shared/application-guards.ts` hand-writes the same
 * contract for Deno.
 *
 * WHY DRIFT IS EXPENSIVE, IN BOTH DIRECTIONS:
 *   - A field added to the browser form but NOT to the Deno validator is
 *     rejected as an unknown key, so the whole submission fails — or, if the
 *     validator were ever loosened to strip instead of reject, the answer would
 *     be silently discarded and the applicant would never know.
 *   - A field added to the Deno validator but NOT to the form is never asked,
 *     so the column is always empty and the owner is missing an answer they
 *     believe they collect.
 * Both are silent in production and invisible in code review, because neither
 * file imports the other. The assertions below are the only thing connecting
 * them, which is why they run in both directions.
 */

import { describe, expect, it } from "vitest";
import {
	RENTAL_APPLICATION_OPTIONAL_KEYS,
	RENTAL_APPLICATION_REQUIRED_KEYS,
	rentalApplicationSchema,
} from "#lib/validation/rental-applications";
import {
	FORBIDDEN_SUBMISSION_KEYS,
	parseSubmissionPayload,
	SUBMISSION_OPTIONAL_KEYS,
	SUBMISSION_REQUIRED_KEYS,
} from "../_shared/application-guards";

const VALID_INPUT: Record<string, unknown> = {
	first_name: "Ada",
	last_name: "Lovelace",
	email: "ada@example.com",
	phone: "555-0100-000",
	desired_move_in_date: "2026-09-01",
	current_street: "12 Analytical Way",
	current_city: "Austin",
	current_state: "TX",
	current_postal_code: "78701",
	gross_monthly_income: 4200,
	occupant_count: 2,
	reference_1_name: "Charles Babbage",
	reference_1_phone: "555-0101-000",
	certified: true,
};

function missing(from: readonly string[], against: readonly string[]): string[] {
	const other = new Set(against);
	return [...from].filter((key) => !other.has(key)).sort();
}

describe("submission payload parity", () => {
	it("has no required field the Deno validator lacks", () => {
		expect(
			missing(RENTAL_APPLICATION_REQUIRED_KEYS, SUBMISSION_REQUIRED_KEYS),
		).toEqual([]);
	});

	it("has no required field the browser schema lacks", () => {
		expect(
			missing(SUBMISSION_REQUIRED_KEYS, RENTAL_APPLICATION_REQUIRED_KEYS),
		).toEqual([]);
	});

	it("has no optional field the Deno validator lacks", () => {
		expect(
			missing(RENTAL_APPLICATION_OPTIONAL_KEYS, SUBMISSION_OPTIONAL_KEYS),
		).toEqual([]);
	});

	it("has no optional field the browser schema lacks", () => {
		expect(
			missing(SUBMISSION_OPTIONAL_KEYS, RENTAL_APPLICATION_OPTIONAL_KEYS),
		).toEqual([]);
	});

	it("agrees on the total field count", () => {
		expect(
			RENTAL_APPLICATION_REQUIRED_KEYS.length +
				RENTAL_APPLICATION_OPTIONAL_KEYS.length,
		).toBe(SUBMISSION_REQUIRED_KEYS.length + SUBMISSION_OPTIONAL_KEYS.length);
	});
});

describe("both validators reject the same forbidden fields", () => {
	it.each([...FORBIDDEN_SUBMISSION_KEYS])(
		"rejects %s on both sides",
		(key) => {
			expect(
				rentalApplicationSchema.safeParse({ ...VALID_INPUT, [key]: "x" })
					.success,
			).toBe(false);
			expect(parseSubmissionPayload({ ...VALID_INPUT, [key]: "x" }).ok).toBe(
				false,
			);
		},
	);
});

describe("both validators accept the same baseline submission", () => {
	it("parses the required-only payload on both sides", () => {
		expect(rentalApplicationSchema.safeParse(VALID_INPUT).success).toBe(true);
		expect(parseSubmissionPayload(VALID_INPUT).ok).toBe(true);
	});
});
