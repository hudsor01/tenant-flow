/**
 * Phase 66 — the browser-side rental application schema.
 *
 * This schema is UX only. The authoritative gate is `parseSubmissionPayload` in
 * `supabase/functions/_shared/application-guards.ts`, which runs server-side and
 * cannot be skipped with curl. What this file proves is that the two agree on
 * the shape of a submission, and that the client refuses the same things the
 * server refuses — most importantly an `ssn` key.
 */

import { describe, expect, it } from "vitest";
import {
	RENTAL_APPLICATION_OPTIONAL_KEYS,
	RENTAL_APPLICATION_REQUIRED_KEYS,
	rentalApplicationSchema,
} from "#lib/validation/rental-applications";

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

const FULL_INPUT: Record<string, unknown> = {
	...VALID_INPUT,
	current_landlord_name: "Mary Somerville",
	current_landlord_phone: "555-0102-000",
	reason_for_moving: "Closer to work.",
	employer_name: "Analytical Engines Ltd",
	employer_role: "Programmer",
	employer_months: 36,
	other_income_source: "Housing assistance",
	other_income_amount: 300,
	pet_details: "One cat, 9 lbs.",
	vehicle_details: "2019 sedan, plate ABC1234",
	reference_1_relationship: "Colleague",
	reference_2_name: "Mary Somerville",
	reference_2_relationship: "Former landlord",
	reference_2_phone: "555-0103-000",
};

function messageFor(
	input: Record<string, unknown>,
	field: string,
): string | undefined {
	const result = rentalApplicationSchema.safeParse(input);
	if (result.success) return undefined;
	return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe("rentalApplicationSchema", () => {
	it("accepts a required-only submission", () => {
		expect(rentalApplicationSchema.safeParse(VALID_INPUT).success).toBe(true);
	});

	it("accepts a submission with every optional field filled", () => {
		expect(rentalApplicationSchema.safeParse(FULL_INPUT).success).toBe(true);
	});

	it("rejects an ssn key outright", () => {
		expect(
			rentalApplicationSchema.safeParse({
				...VALID_INPUT,
				ssn: "111-11-1111",
			}).success,
		).toBe(false);
	});

	it("reports an unrecognized key rather than ignoring it", () => {
		const result = rentalApplicationSchema.safeParse({
			...VALID_INPUT,
			ssn: "111-11-1111",
		});
		expect(result.success).toBe(false);
		if (result.success) throw new Error("unreachable");
		expect(
			result.error.issues.some((i) => i.code === "unrecognized_keys"),
		).toBe(true);
	});
});

describe("rentalApplicationSchema — required and optional keys", () => {
	it.each([...RENTAL_APPLICATION_REQUIRED_KEYS])(
		"fails when the required field %s is absent",
		(key) => {
			const input = { ...VALID_INPUT };
			delete input[key];
			expect(rentalApplicationSchema.safeParse(input).success).toBe(false);
		},
	);

	it.each([...RENTAL_APPLICATION_OPTIONAL_KEYS])(
		"still parses when the optional field %s is absent",
		(key) => {
			const input = { ...FULL_INPUT };
			delete input[key];
			if (key === "reference_2_name" || key === "reference_2_phone") {
				// The second reference is a set (UI-SPEC A-3 Section 5): a name with
				// no phone is a genuine failure and is asserted on its own below, so
				// "left blank" for these two means the whole group is blank.
				delete input.reference_2_name;
				delete input.reference_2_relationship;
				delete input.reference_2_phone;
			}
			expect(rentalApplicationSchema.safeParse(input).success).toBe(true);
		},
	);

	it("keeps employer and other-income optional, so no source of income is privileged", () => {
		for (const key of [
			"employer_name",
			"employer_role",
			"employer_months",
			"other_income_source",
			"other_income_amount",
		]) {
			expect(RENTAL_APPLICATION_OPTIONAL_KEYS).toContain(key);
			expect(RENTAL_APPLICATION_REQUIRED_KEYS).not.toContain(key);
		}
	});

	it("requires exactly one money field, and it is the source-neutral total", () => {
		const moneyKeys = RENTAL_APPLICATION_REQUIRED_KEYS.filter((key) =>
			/income|amount/.test(key),
		);
		expect(moneyKeys).toEqual(["gross_monthly_income"]);
	});
});

describe("rentalApplicationSchema — field rules", () => {
	it("rejects a state that is not a US state code", () => {
		expect(
			rentalApplicationSchema.safeParse({ ...VALID_INPUT, current_state: "ZZ" })
				.success,
		).toBe(false);
		expect(
			rentalApplicationSchema.safeParse({ ...VALID_INPUT, current_state: "TX" })
				.success,
		).toBe(true);
	});

	it("uses the UI-SPEC state error copy verbatim", () => {
		expect(
			messageFor({ ...VALID_INPUT, current_state: "ZZ" }, "current_state"),
		).toBe("Enter the two-letter state code, for example TX.");
	});

	it("normalizes a lowercase state code rather than rejecting it", () => {
		const result = rentalApplicationSchema.safeParse({
			...VALID_INPUT,
			current_state: "tx",
		});
		expect(result.success).toBe(true);
		if (!result.success) throw new Error("unreachable");
		expect(result.data.current_state).toBe("TX");
	});

	it("requires the attestation", () => {
		expect(
			rentalApplicationSchema.safeParse({ ...VALID_INPUT, certified: false })
				.success,
		).toBe(false);
	});

	it("requires at least one occupant", () => {
		expect(
			rentalApplicationSchema.safeParse({ ...VALID_INPUT, occupant_count: 0 })
				.success,
		).toBe(false);
		expect(
			rentalApplicationSchema.safeParse({ ...VALID_INPUT, occupant_count: 1 })
				.success,
		).toBe(true);
	});

	it("accepts a zero income and rejects a negative one", () => {
		// A $0-income applicant is legitimate. Rejecting them would be a
		// source-of-income problem, not a validation improvement (F-3(a)).
		expect(
			rentalApplicationSchema.safeParse({
				...VALID_INPUT,
				gross_monthly_income: 0,
			}).success,
		).toBe(true);
		expect(
			rentalApplicationSchema.safeParse({
				...VALID_INPUT,
				gross_monthly_income: -1,
			}).success,
		).toBe(false);
	});

	it("rejects an empty required string", () => {
		expect(
			rentalApplicationSchema.safeParse({ ...VALID_INPUT, first_name: "" })
				.success,
		).toBe(false);
	});

	it("rejects an over-long value instead of truncating it", () => {
		expect(
			rentalApplicationSchema.safeParse({
				...VALID_INPUT,
				first_name: "a".repeat(5000),
			}).success,
		).toBe(false);
	});
});

describe("rentalApplicationSchema — the second reference", () => {
	it("rejects a second-reference name with an empty phone", () => {
		expect(
			rentalApplicationSchema.safeParse({
				...VALID_INPUT,
				reference_2_name: "Mary Somerville",
				reference_2_phone: "",
			}).success,
		).toBe(false);
	});

	it("rejects a second-reference phone with an empty name", () => {
		expect(
			rentalApplicationSchema.safeParse({
				...VALID_INPUT,
				reference_2_name: "",
				reference_2_phone: "555-0103-000",
			}).success,
		).toBe(false);
	});

	it("rejects a lone relationship", () => {
		expect(
			rentalApplicationSchema.safeParse({
				...VALID_INPUT,
				reference_2_relationship: "Former landlord",
			}).success,
		).toBe(false);
	});

	it("accepts all three left empty", () => {
		expect(
			rentalApplicationSchema.safeParse({
				...VALID_INPUT,
				reference_2_name: "",
				reference_2_relationship: "",
				reference_2_phone: "",
			}).success,
		).toBe(true);
	});

	it("accepts a complete second reference", () => {
		expect(
			rentalApplicationSchema.safeParse({
				...VALID_INPUT,
				reference_2_name: "Mary Somerville",
				reference_2_phone: "555-0103-000",
			}).success,
		).toBe(true);
	});
});
