/**
 * Shared TanStack Form options for the public `/apply/[token]` application form
 * (Phase 66, plan 66-12).
 *
 * NOT A BARREL FILE. Everything here is declared here; nothing is re-exported
 * from anywhere else (CLAUDE.md zero-tolerance rule 2).
 *
 * WHERE VALIDATION LIVES, AND WHERE IT DOES NOT. This module states no
 * validation rule. `rentalApplicationSchema` (plan 66-02) is the browser-side
 * contract and `parseSubmissionPayload` in
 * `supabase/functions/_shared/application-guards.ts` is the authoritative one.
 * This file holds the DEFAULTS and the one mechanical adapter between the shape
 * a controlled React form holds and the shape the contract describes. A second
 * statement of any rule here would be free to drift from the schema it claims to
 * mirror.
 *
 * FIELD OPTIONALITY IS A COMPLIANCE DECISION, NOT A CONVENIENCE. Employer, job
 * title, tenure and other-income all default blank and stay optional; the single
 * required money field is the source-neutral total. Requiring employment income
 * as the primary signal is a source-of-income discrimination risk in CA, WA, NY
 * and roughly twenty other jurisdictions, and 42 U.S.C. 3604(c) makes the
 * application form itself a regulated surface (D-05, UI-SPEC UI-09). Do not
 * promote any of them, here or in the section components.
 */

import { formOptions } from "@tanstack/react-form";
import { z } from "zod";
import { rentalApplicationSchema } from "#lib/validation/rental-applications";
// The honeypot's wire name is read from the SAME constant the Edge Function
// reads it from, never retyped. 66-02 pins that constant's value and 66-07
// asserts the literal never appears in the function; both assertions only become
// load-bearing once every consumer imports the constant instead of hardcoding
// it. `application-guards.ts` is a deliberately dependency-free leaf with zero
// imports and no runtime-global references, which is exactly what lets the Deno
// function, the Vitest suite and this browser module all consume it.
import { HONEYPOT_FIELD } from "../../../supabase/functions/_shared/application-guards";

/**
 * All 28 contract keys (14 required + 14 optional, from plan 66-02) plus the
 * honeypot, which brings the form to 29 controlled values.
 *
 * Strings default `""`, numbers default `null`, the attestation defaults
 * `false`. None of them is omitted: under `exactOptionalPropertyTypes` an
 * omitted default gives the field a `string | undefined` value type that will
 * not assign to the field components' `string` binding, and an uncontrolled
 * input that later becomes controlled warns at runtime.
 */
export const applicationFormOptions = formOptions({
	defaultValues: {
		// --- Section 1: about you -------------------------------------------
		first_name: "",
		last_name: "",
		email: "",
		phone: "",
		desired_move_in_date: "",

		// --- Section 2: where you live now ----------------------------------
		current_street: "",
		current_city: "",
		current_state: "",
		current_postal_code: "",
		current_landlord_name: "",
		current_landlord_phone: "",
		reason_for_moving: "",

		// --- Section 3: income (order is load-bearing, UI-SPEC A-3) ----------
		gross_monthly_income: null as number | null,
		employer_name: "",
		employer_role: "",
		employer_months: null as number | null,
		other_income_source: "",
		other_income_amount: null as number | null,

		// --- Section 4: household (count only, never per-occupant detail) ----
		occupant_count: null as number | null,
		pet_details: "",
		vehicle_details: "",

		// --- Section 5: references -------------------------------------------
		reference_1_name: "",
		reference_1_relationship: "",
		reference_1_phone: "",
		reference_2_name: "",
		reference_2_relationship: "",
		reference_2_phone: "",

		// --- The UI-05 attestation -------------------------------------------
		certified: false,

		// --- The A-6 bot trap -------------------------------------------------
		// A controlled value like any other, so React owns it and no stray
		// uncontrolled input sits in the tree. It is NEVER an application field:
		// the adapter below strips it before validation and the submit builder
		// lifts it to the ENVELOPE, where `apply-token` reads it before anything
		// else and answers an ordinary success with zero rows written. A human
		// never sees it; a bot that fills it learns nothing.
		[HONEYPOT_FIELD]: "",
	},
});

export type ApplicationFormValues = typeof applicationFormOptions.defaultValues;

/**
 * The form's value shape and the contract's differ in exactly two mechanical
 * ways. Both are expressed HERE and nowhere else.
 *
 *   1. `NumberField` binds `number | null`, so an empty numeric input reads
 *      `null`. The contract has no `null` — an optional number is ABSENT.
 *      `null` fails `z.number().optional()`, which would leave `canSubmit`
 *      permanently false on a form the applicant had filled in correctly, with
 *      no error attached to any rendered field. Dropping every `null` also
 *      leaves the two REQUIRED numbers absent while blank, which is the same
 *      answer for the same reason and carries the schema's own message.
 *   2. The honeypot is an envelope field, not an application field.
 *      `rentalApplicationSchema` is `.strict()` on purpose — that strictness is
 *      the browser half of the SSN gate — so leaving `company_website` in the
 *      object would raise `unrecognized_keys` on every keystroke.
 *
 * Empty STRINGS are deliberately left in place rather than stripped: the schema
 * accepts `""` for every optional text field, and the server's `isFilled` skips
 * them, so removing them here would add a rule nobody needs.
 */
function toApplicationValues(raw: unknown): unknown {
	if (typeof raw !== "object" || raw === null) return raw;
	const source: Record<string, unknown> = raw as Record<string, unknown>;
	const application: Record<string, unknown> = {};
	for (const key of Object.keys(source)) {
		if (key === HONEYPOT_FIELD) continue;
		const value = source[key];
		if (value === null) continue;
		application[key] = value;
	}
	return application;
}

/**
 * The form-level validator, and the single source of the submitted
 * `application` object.
 *
 * It is a `preprocess` over `rentalApplicationSchema`, not a rewrite of it: the
 * inner schema's issue paths survive the pipe unchanged, so TanStack still lands
 * every message on the field it belongs to. Its parsed OUTPUT is what gets
 * posted, which means the trimming, the lowercased email and the uppercased
 * state code are applied once, by the schema, rather than restated at the fetch
 * call.
 */
export const applicationSubmissionSchema = z.preprocess(
	toApplicationValues,
	rentalApplicationSchema,
);
