/**
 * Phase 66 — behavioural tests for the rental-application bot guards and the
 * strict submission-payload validator.
 *
 * WHY THIS FILE IMPORTS THE MODULE INSTEAD OF READING ITS SOURCE.
 * `premium-report-gate.test.ts`, the only other test in this directory, reads
 * edge-function source text from disk because those modules import
 * `../_shared/*.ts` with explicit extensions and call the Deno serve entrypoint,
 * so Vitest cannot load them. `_shared/application-guards.ts` is deliberately
 * different: it has ZERO imports and zero runtime-global references, which makes
 * it importable from both Deno and Node. Every assertion below therefore
 * exercises real behaviour. A source-text test would pass against a stub; these
 * cannot.
 *
 * WHY THE SPECIFIER CARRIES NO `.ts` EXTENSION. The Deno consumer imports
 * `../_shared/application-guards.ts` because Deno requires the extension. This
 * file cannot: `tsconfig.json` includes `supabase/functions/__tests__/**`, and
 * an explicit `.ts` specifier there is TS5097 unless `allowImportingTsExtensions`
 * is enabled repo-wide — a global compiler change far outside this plan. Both
 * specifiers resolve to the same module, so nothing can drift between them.
 *
 * The single most important assertion in this file is that a payload carrying
 * an `ssn` key is REJECTED rather than silently stripped. Stripping would mean
 * the value still crossed the network and landed in an Edge Function log before
 * being discarded — which is precisely the APPLY-02 failure the phase exists to
 * prevent.
 */

import { describe, expect, it } from "vitest";
import {
	FORBIDDEN_SUBMISSION_KEYS,
	HONEYPOT_FIELD,
	isHoneypotTripped,
	isTimingSuspicious,
	MAX_ELAPSED_MS,
	MAX_FIELD_LENGTHS,
	MIN_ELAPSED_MS,
	parseSubmissionPayload,
	SUBMISSION_OPTIONAL_KEYS,
	SUBMISSION_REQUIRED_KEYS,
} from "../_shared/application-guards";

/** The minimum payload every required-key test starts from. */
const VALID_PAYLOAD: Record<string, unknown> = {
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

/** Every optional key filled, on top of the required set. */
const FULL_PAYLOAD: Record<string, unknown> = {
	...VALID_PAYLOAD,
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

/**
 * The D-06 contract restated in the test, on purpose. `FORBIDDEN_SUBMISSION_KEYS`
 * is exported from the module so the validator itself documents the prohibition;
 * pinning the members here as well means neither side can be weakened alone —
 * deleting an entry from the module fails this test, and adding one of these to
 * a key set fails the disjointness test below.
 */
const D06_FORBIDDEN = [
	"ssn",
	"social_security",
	"date_of_birth",
	"dob",
	"government_id",
	"drivers_license",
	"passport",
	"bank_account",
	"routing",
	"card_number",
	"income_type",
	"marital_status",
	"criminal_history",
] as const;

function withoutKey(
	payload: Record<string, unknown>,
	key: string,
): Record<string, unknown> {
	const copy = { ...payload };
	delete copy[key];
	return copy;
}

describe("isHoneypotTripped", () => {
	it("treats an untouched field as clean", () => {
		expect(isHoneypotTripped("")).toBe(false);
		expect(isHoneypotTripped(undefined)).toBe(false);
	});

	it("treats a whitespace-only value as a browser artifact, not a bot", () => {
		expect(isHoneypotTripped("   ")).toBe(false);
	});

	it("trips on any real string value", () => {
		expect(isHoneypotTripped("http://x")).toBe(true);
	});

	it("trips on a non-string value, which no real form ever sends", () => {
		expect(isHoneypotTripped(42)).toBe(true);
		expect(isHoneypotTripped({ nested: true })).toBe(true);
	});

	it("names the field the form must render", () => {
		expect(HONEYPOT_FIELD).toBe("company_website");
	});
});

describe("isTimingSuspicious", () => {
	const now = 1_800_000_000_000;

	it("rejects a submit faster than a human can fill the form", () => {
		expect(isTimingSuspicious(now - 1_000, now)).toBe(true);
	});

	it("accepts a plausible human elapsed time", () => {
		expect(isTimingSuspicious(now - 5_000, now)).toBe(false);
		expect(isTimingSuspicious(now - 600_000, now)).toBe(false);
	});

	it("rejects a stale load beyond the 24 hour ceiling", () => {
		expect(isTimingSuspicious(now - 90_000_000, now)).toBe(true);
	});

	it("rejects an unparseable or absent timestamp", () => {
		expect(isTimingSuspicious("abc", now)).toBe(true);
		expect(isTimingSuspicious(undefined, now)).toBe(true);
		expect(isTimingSuspicious(Number.NaN, now)).toBe(true);
	});

	it("rejects a forged future load time", () => {
		expect(isTimingSuspicious(now + 60_000, now)).toBe(true);
	});

	it("uses the documented bounds", () => {
		expect(MIN_ELAPSED_MS).toBe(3_000);
		expect(MAX_ELAPSED_MS).toBe(86_400_000);
		expect(isTimingSuspicious(now - MIN_ELAPSED_MS, now)).toBe(false);
		expect(isTimingSuspicious(now - (MIN_ELAPSED_MS - 1), now)).toBe(true);
	});
});

describe("parseSubmissionPayload — the SSN gate", () => {
	it("rejects an ssn key rather than stripping it", () => {
		const result = parseSubmissionPayload({
			...VALID_PAYLOAD,
			ssn: "111-11-1111",
		});
		expect(result.ok).toBe(false);
		if (result.ok) throw new Error("unreachable");
		expect(result.reason).toBe("unknown_field");
		expect(result.field).toBe("ssn");
	});

	it.each(["date_of_birth", "bank_account", "income_type"])(
		"rejects the forbidden key %s as unknown_field",
		(key) => {
			const result = parseSubmissionPayload({
				...VALID_PAYLOAD,
				[key]: "anything",
			});
			expect(result.ok).toBe(false);
			if (result.ok) throw new Error("unreachable");
			expect(result.reason).toBe("unknown_field");
			expect(result.field).toBe(key);
		},
	);

	it.each(D06_FORBIDDEN)("never accepts a %s key", (key) => {
		const result = parseSubmissionPayload({ ...FULL_PAYLOAD, [key]: "x" });
		expect(result.ok).toBe(false);
	});

	it("rejects unknown keys before reporting a missing required key", () => {
		// Diagnostic ordering matters: an `ssn` key on an otherwise incomplete
		// payload must still be named as the unknown field, not masked by a
		// missing_field answer about some unrelated key.
		const result = parseSubmissionPayload({
			...withoutKey(VALID_PAYLOAD, "reference_1_phone"),
			ssn: "111-11-1111",
		});
		expect(result.ok).toBe(false);
		if (result.ok) throw new Error("unreachable");
		expect(result.reason).toBe("unknown_field");
		expect(result.field).toBe("ssn");
	});
});

describe("parseSubmissionPayload — shape", () => {
	it("accepts the required-only payload", () => {
		expect(parseSubmissionPayload(VALID_PAYLOAD).ok).toBe(true);
	});

	it("accepts the payload with every optional key filled", () => {
		expect(parseSubmissionPayload(FULL_PAYLOAD).ok).toBe(true);
	});

	it("rejects a non-object payload", () => {
		expect(parseSubmissionPayload(null).ok).toBe(false);
		expect(parseSubmissionPayload("string").ok).toBe(false);
		expect(parseSubmissionPayload([VALID_PAYLOAD]).ok).toBe(false);
	});

	it.each([...SUBMISSION_REQUIRED_KEYS])(
		"reports missing_field for absent required key %s",
		(key) => {
			const result = parseSubmissionPayload(withoutKey(VALID_PAYLOAD, key));
			expect(result.ok).toBe(false);
			if (result.ok) throw new Error("unreachable");
			expect(result.reason).toBe("missing_field");
			expect(result.field).toBe(key);
		},
	);

	it("reports missing_field for a required string that is only whitespace", () => {
		const result = parseSubmissionPayload({
			...VALID_PAYLOAD,
			first_name: "   ",
		});
		expect(result.ok).toBe(false);
		if (result.ok) throw new Error("unreachable");
		expect(result.reason).toBe("missing_field");
		expect(result.field).toBe("first_name");
	});

	it("returns only contract keys", () => {
		const result = parseSubmissionPayload(FULL_PAYLOAD);
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("unreachable");
		const allowed = new Set<string>([
			...SUBMISSION_REQUIRED_KEYS,
			...SUBMISSION_OPTIONAL_KEYS,
		]);
		for (const key of Object.keys(result.value)) {
			expect(allowed.has(key)).toBe(true);
		}
		expect(Object.keys(result.value).sort()).toEqual([...allowed].sort());
	});
});

describe("parseSubmissionPayload — types, bounds and lengths", () => {
	it("rejects an occupant count below one", () => {
		expect(parseSubmissionPayload({ ...VALID_PAYLOAD, occupant_count: 0 }).ok)
			.toBe(false);
		expect(parseSubmissionPayload({ ...VALID_PAYLOAD, occupant_count: 1 }).ok)
			.toBe(true);
	});

	it("rejects a numeric field sent as a string", () => {
		const result = parseSubmissionPayload({
			...VALID_PAYLOAD,
			occupant_count: "3",
		});
		expect(result.ok).toBe(false);
		if (result.ok) throw new Error("unreachable");
		expect(result.reason).toBe("bad_type");
		expect(result.field).toBe("occupant_count");
	});

	it("rejects a non-integer occupant count", () => {
		expect(parseSubmissionPayload({ ...VALID_PAYLOAD, occupant_count: 2.5 }).ok)
			.toBe(false);
	});

	it("accepts a zero income but rejects a negative one", () => {
		expect(
			parseSubmissionPayload({ ...VALID_PAYLOAD, gross_monthly_income: 0 }).ok,
		).toBe(true);
		expect(
			parseSubmissionPayload({ ...VALID_PAYLOAD, gross_monthly_income: -1 }).ok,
		).toBe(false);
	});

	it("rejects an absurd income rather than overflowing the numeric column", () => {
		expect(
			parseSubmissionPayload({
				...VALID_PAYLOAD,
				gross_monthly_income: 10_000_001,
			}).ok,
		).toBe(false);
		expect(
			parseSubmissionPayload({
				...VALID_PAYLOAD,
				gross_monthly_income: Number.POSITIVE_INFINITY,
			}).ok,
		).toBe(false);
	});

	it("requires the attestation to be the boolean true", () => {
		expect(parseSubmissionPayload({ ...VALID_PAYLOAD, certified: false }).ok)
			.toBe(false);
		expect(parseSubmissionPayload({ ...VALID_PAYLOAD, certified: "true" }).ok)
			.toBe(false);
	});

	it("rejects an over-long value instead of truncating it", () => {
		const result = parseSubmissionPayload({
			...VALID_PAYLOAD,
			first_name: "a".repeat(5000),
		});
		expect(result.ok).toBe(false);
		if (result.ok) throw new Error("unreachable");
		expect(result.reason).toBe("too_long");
		expect(result.field).toBe("first_name");
	});

	it("caps every string field in the contract", () => {
		const numericOrBoolean = new Set([
			"gross_monthly_income",
			"other_income_amount",
			"occupant_count",
			"employer_months",
			"certified",
		]);
		for (const key of [
			...SUBMISSION_REQUIRED_KEYS,
			...SUBMISSION_OPTIONAL_KEYS,
		]) {
			if (numericOrBoolean.has(key)) continue;
			expect(typeof MAX_FIELD_LENGTHS[key]).toBe("number");
		}
	});

	it("rejects a state name and normalizes a lowercase state code", () => {
		expect(
			parseSubmissionPayload({ ...VALID_PAYLOAD, current_state: "Texas" }).ok,
		).toBe(false);
		const result = parseSubmissionPayload({
			...VALID_PAYLOAD,
			current_state: "tx",
		});
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("unreachable");
		expect(result.value.current_state).toBe("TX");
	});

	it("rejects a malformed email and lowercases a valid one", () => {
		expect(parseSubmissionPayload({ ...VALID_PAYLOAD, email: "NoAt" }).ok).toBe(
			false,
		);
		const result = parseSubmissionPayload({
			...VALID_PAYLOAD,
			email: "A@B.co",
		});
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("unreachable");
		expect(result.value.email).toBe("a@b.co");
	});

	it("trims surrounding whitespace out of the stored value", () => {
		const result = parseSubmissionPayload({
			...VALID_PAYLOAD,
			first_name: "  Ada  ",
		});
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("unreachable");
		expect(result.value.first_name).toBe("Ada");
	});

	it("rejects a move-in date that is not an ISO calendar date", () => {
		expect(
			parseSubmissionPayload({
				...VALID_PAYLOAD,
				desired_move_in_date: "next Tuesday",
			}).ok,
		).toBe(false);
	});
});

describe("parseSubmissionPayload — the second reference", () => {
	it("rejects a name with no phone", () => {
		const result = parseSubmissionPayload({
			...VALID_PAYLOAD,
			reference_2_name: "Mary Somerville",
		});
		expect(result.ok).toBe(false);
		if (result.ok) throw new Error("unreachable");
		expect(result.reason).toBe("missing_field");
		expect(result.field).toBe("reference_2_phone");
	});

	it("rejects a phone with no name", () => {
		const result = parseSubmissionPayload({
			...VALID_PAYLOAD,
			reference_2_phone: "555-0103-000",
		});
		expect(result.ok).toBe(false);
		if (result.ok) throw new Error("unreachable");
		expect(result.reason).toBe("missing_field");
		expect(result.field).toBe("reference_2_name");
	});

	it("rejects a lone relationship", () => {
		expect(
			parseSubmissionPayload({
				...VALID_PAYLOAD,
				reference_2_relationship: "Former landlord",
			}).ok,
		).toBe(false);
	});

	it("accepts the pair, and accepts all three left empty", () => {
		expect(
			parseSubmissionPayload({
				...VALID_PAYLOAD,
				reference_2_name: "Mary Somerville",
				reference_2_phone: "555-0103-000",
			}).ok,
		).toBe(true);
		expect(
			parseSubmissionPayload({
				...VALID_PAYLOAD,
				reference_2_name: "",
				reference_2_relationship: "",
				reference_2_phone: "",
			}).ok,
		).toBe(true);
	});
});

describe("the field contract", () => {
	it("keeps the required and optional key sets disjoint", () => {
		const optional = new Set<string>(SUBMISSION_OPTIONAL_KEYS);
		for (const key of SUBMISSION_REQUIRED_KEYS) {
			expect(optional.has(key)).toBe(false);
		}
		const all = [...SUBMISSION_REQUIRED_KEYS, ...SUBMISSION_OPTIONAL_KEYS];
		expect(new Set(all).size).toBe(all.length);
	});

	it("still names every D-06 forbidden field", () => {
		// Pinned in both directions: the module cannot quietly drop an entry, and
		// the disjointness loop below cannot pass if a key set gains one.
		expect([...FORBIDDEN_SUBMISSION_KEYS].sort()).toEqual(
			[...D06_FORBIDDEN].sort(),
		);
	});

	it.each([...FORBIDDEN_SUBMISSION_KEYS])(
		"excludes %s from both key sets",
		(forbidden) => {
			expect(SUBMISSION_REQUIRED_KEYS).not.toContain(forbidden);
			expect(SUBMISSION_OPTIONAL_KEYS).not.toContain(forbidden);
		},
	);

	it("never collects a per-occupant detail field", () => {
		const all = [...SUBMISSION_REQUIRED_KEYS, ...SUBMISSION_OPTIONAL_KEYS];
		for (const key of all) {
			expect(key).not.toMatch(/occupant_(name|age|relationship)/);
		}
		expect(all).toContain("occupant_count");
	});
});
