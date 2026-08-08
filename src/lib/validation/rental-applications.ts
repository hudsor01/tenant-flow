/**
 * Rental Application Validation Schema (Phase 66)
 *
 * WHAT THIS IS AND IS NOT. This schema drives the `/apply/[token]` form's inline
 * errors and its submit gate. It is UX only. The authoritative validator is
 * `parseSubmissionPayload` in `supabase/functions/_shared/application-guards.ts`,
 * which runs server-side, sees the same field contract, and cannot be skipped
 * with curl. Anything enforced only here is not enforced.
 *
 * WHY THE CONTRACT IS WRITTEN TWICE. zod is not in
 * `supabase/functions/deno.json`'s import map and adding it would be a new
 * runtime dependency the milestone forbids, so the Deno side hand-writes the
 * same field list. The two are pinned together, in both directions, by
 * `supabase/functions/__tests__/application-payload-parity.test.ts`.
 *
 * `.strict()` IS LOAD-BEARING. An unknown key is a parse failure, not a silently
 * dropped property. That is the browser half of the APPLY-02 SSN gate: a form
 * that quietly discarded an `ssn` field would still have collected it.
 *
 * FIELD OPTIONALITY IS A COMPLIANCE DECISION, NOT A CONVENIENCE. Employer, role,
 * tenure and other-income are all optional, and the single required money field
 * is the source-neutral total. Requiring employment income as the primary signal
 * is a source-of-income discrimination risk in CA, WA, NY and roughly twenty
 * other jurisdictions, and 42 U.S.C. 3604(c) makes the application form itself a
 * regulated surface (D-05, UI-SPEC UI-09). Do not promote any of them.
 */

import { z } from "zod";
import { stateNames } from "#lib/templates/lease-template";
import type { USState } from "#types/lease-generator.types";
import { emailSchema, optionalPhoneSchema, phoneSchema } from "./common";

/**
 * The state list comes from the existing `stateNames` map, never a new literal
 * (CLAUDE.md: no duplicate types). `Object.keys` erases the key type, so the one
 * assertion here restores it; there is no `as unknown as` anywhere.
 */
const US_STATE_CODES = Object.keys(stateNames) as USState[];

const STATE_MESSAGE = "Enter the two-letter state code, for example TX.";

/** Optional free text: the form always sends a string, so "" must stay valid. */
function optionalText(max: number, label: string) {
	return z
		.string()
		.max(max, `${label} cannot exceed ${max} characters`)
		.optional();
}

/** Required free text: trimmed, non-empty, capped. */
function requiredText(max: number, missing: string, label: string) {
	return z
		.string()
		.trim()
		.min(1, missing)
		.max(max, `${label} cannot exceed ${max} characters`);
}

/**
 * `YYYY-MM-DD` that names a real day. The shape regex alone accepts
 * `2026-02-31`, `2024-13-01` and `0000-01-01`, none of which Postgres will cast
 * — and the cast lives inside `submit_rental_application`, where a raise aborts
 * the transaction and costs the applicant the whole form. `isCalendarDate` in
 * `application-guards.ts` is the same check on the authoritative side; this half
 * keeps the browser from ever putting one on the wire.
 *
 * `Date.UTC` maps years 0-99 onto 1900-1999, so the round-trip below rejects
 * year 0000 as well, which is correct: Postgres has no year zero.
 */
function isCalendarDate(value: string): boolean {
	const [yearPart, monthPart, dayPart] = value.split("-");
	const year = Number(yearPart);
	const month = Number(monthPart);
	const day = Number(dayPart);
	const utc = new Date(Date.UTC(year, month - 1, day));
	return (
		utc.getUTCFullYear() === year &&
		utc.getUTCMonth() === month - 1 &&
		utc.getUTCDate() === day
	);
}

const rentalApplicationObject = z
	.object({
		// --- Section 1: about you -------------------------------------------
		first_name: requiredText(100, "Enter your first name.", "First name"),
		last_name: requiredText(100, "Enter your last name.", "Last name"),
		email: emailSchema.max(320, "Enter a shorter email address."),
		phone: phoneSchema,
		desired_move_in_date: z
			.string()
			.regex(
				/^\d{4}-\d{2}-\d{2}$/,
				"Choose the date you would like to move in.",
			)
			// After the shape check, never instead of it.
			.refine(isCalendarDate, "Choose the date you would like to move in."),

		// --- Section 2: where you live now ----------------------------------
		current_street: requiredText(
			200,
			"Enter your current street address.",
			"Street address",
		),
		current_city: requiredText(100, "Enter your current city.", "City"),
		current_state: z
			.string()
			.trim()
			.toUpperCase()
			.pipe(z.enum(US_STATE_CODES, { error: STATE_MESSAGE })),
		current_postal_code: z
			.string()
			.trim()
			.regex(/^\d{5}(-\d{4})?$/, "Enter a 5-digit ZIP code."),
		current_landlord_name: optionalText(100, "Landlord name"),
		current_landlord_phone: optionalPhoneSchema.optional(),
		reason_for_moving: optionalText(2000, "Reason for moving"),

		// --- Section 3: income (order is load-bearing, UI-SPEC A-3) ----------
		gross_monthly_income: z
			.number({ error: "Enter your total monthly income from all sources." })
			// Zero is a legitimate answer. Rejecting it would be a source-of-income
			// problem, not a validation improvement (F-3(a)).
			.min(0, "Income cannot be negative.")
			.max(10_000_000, "Enter a monthly amount, not an annual one."),
		employer_name: optionalText(100, "Employer"),
		employer_role: optionalText(100, "Job title"),
		employer_months: z
			.number()
			.int("Enter a whole number of months.")
			.min(0, "Months cannot be negative.")
			.max(1200, "Enter the number of months, not days.")
			.optional(),
		other_income_source: optionalText(200, "Other income source"),
		other_income_amount: z
			.number()
			.min(0, "Amount cannot be negative.")
			.max(10_000_000, "Enter a monthly amount, not an annual one.")
			.optional(),

		// --- Section 4: household (count only, never per-occupant detail) ----
		occupant_count: z
			.number({ error: "Enter how many people will live in the unit." })
			.int("Enter a whole number of people.")
			.min(1, "Count everyone who will live here, including yourself.")
			.max(50, "Enter the number of people who will live in the unit."),
		pet_details: optionalText(2000, "Pet details"),
		vehicle_details: optionalText(2000, "Vehicle details"),

		// --- Section 5: references -------------------------------------------
		reference_1_name: requiredText(
			100,
			"Enter a reference the owner can contact.",
			"Reference name",
		),
		reference_1_relationship: optionalText(100, "Relationship"),
		reference_1_phone: phoneSchema,
		reference_2_name: optionalText(100, "Reference name"),
		reference_2_relationship: optionalText(100, "Relationship"),
		reference_2_phone: optionalPhoneSchema.optional(),

		// --- The UI-05 attestation -------------------------------------------
		// Not a screening consent. UI-04 forbids an acknowledgement checkbox on
		// the APPLY-06 disclaimer itself; this is an accuracy attestation, which
		// is standard on paper applications and is not screening-shaped.
		certified: z.literal(true, {
			error: "Confirm that your answers are true and complete.",
		}),
	})
	.strict();

type SecondReferenceFields = {
	reference_2_name?: string | undefined;
	reference_2_relationship?: string | undefined;
	reference_2_phone?: string | undefined;
};

function isFilled(value: string | undefined): boolean {
	return typeof value === "string" && value.trim().length > 0;
}

/**
 * UI-SPEC A-3 Section 5: all three second-reference fields are optional, but a
 * partial second reference is useless to the owner, so filling any one of them
 * requires both a name and a phone.
 */
function secondReferenceStarted(value: SecondReferenceFields): boolean {
	return (
		isFilled(value.reference_2_name) ||
		isFilled(value.reference_2_relationship) ||
		isFilled(value.reference_2_phone)
	);
}

export const rentalApplicationSchema = rentalApplicationObject
	.refine(
		(value) =>
			!secondReferenceStarted(value) || isFilled(value.reference_2_name),
		{
			error: "Add a name for the second reference, or clear these fields.",
			path: ["reference_2_name"],
		},
	)
	.refine(
		(value) =>
			!secondReferenceStarted(value) || isFilled(value.reference_2_phone),
		{
			error:
				"Add a phone number for the second reference, or clear these fields.",
			path: ["reference_2_phone"],
		},
	);

export type RentalApplicationInput = z.infer<typeof rentalApplicationSchema>;

/**
 * The key sets are DERIVED from the schema shape, never hand-listed. A third
 * hand-maintained list would be free to drift from the schema it claims to
 * describe, and the parity test would then be pinning the wrong thing.
 */
const shapeEntries = Object.entries(rentalApplicationObject.shape);

export const RENTAL_APPLICATION_REQUIRED_KEYS: readonly string[] = shapeEntries
	.filter(([, field]) => !field.safeParse(undefined).success)
	.map(([key]) => key);

export const RENTAL_APPLICATION_OPTIONAL_KEYS: readonly string[] = shapeEntries
	.filter(([, field]) => field.safeParse(undefined).success)
	.map(([key]) => key);
