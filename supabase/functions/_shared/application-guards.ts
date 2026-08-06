/**
 * Phase 66 — rental-application bot guards and the strict submission-payload
 * validator.
 *
 * (a) THIS MODULE HAS TWO CONSUMERS AND MUST STAY A DEPENDENCY-FREE LEAF.
 *     It is imported by `supabase/functions/apply-token/index.ts` (Deno) and by
 *     `supabase/functions/__tests__/application-guards.test.ts` (Vitest/Node).
 *     That is only possible while it has ZERO import statements and zero
 *     references to the Deno global: the other edge functions are unimportable
 *     from Node precisely because they reach for `../_shared/*.ts` with explicit
 *     extensions and call the Deno serve entrypoint, which is why
 *     `premium-report-gate.test.ts` has to read their source text off disk
 *     instead of exercising them. Adding a single import here would break one of
 *     the two consumers — the Node test if the import is Deno-only, or the Deno
 *     function if it is a bare npm specifier. This file also sits inside the
 *     root TS program (`tsconfig.json` includes `supabase/functions/__tests__/**`
 *     transitively), so a runtime-global reference would fail
 *     `bun run typecheck` as well.
 *
 * (b) THE TIMING GUARD IS A BOT FILTER, NOT A SECURITY CONTROL.
 *     `form_loaded_at` is supplied by the client and is trivially forged — any
 *     attacker who reads this file can send `Date.now() - 10_000` and sail
 *     through. It exists to shed unsophisticated form-fillers cheaply, nothing
 *     more. The same is true of the honeypot. The only abuse control in this
 *     phase that is fail-closed by construction is the per-link submission cap
 *     enforced inside `submit_rental_application` under the token row's
 *     `FOR UPDATE` lock (F-6, D-04a); the Upstash limiter in
 *     `_shared/rate-limit.ts` deliberately fails OPEN when Upstash is
 *     unreachable (`:159`). Do not read either guard below as a defence.
 *
 * (c) WHAT IS AUTHORITATIVE. `parseSubmissionPayload` is the server-side gate on
 *     applicant input. The zod schema in `src/lib/validation/rental-applications.ts`
 *     mirrors it for UX only and is bypassable by anyone with curl. The two are
 *     pinned to one another by
 *     `supabase/functions/__tests__/application-payload-parity.test.ts`.
 */

/** The off-screen field a bot fills and a human never sees (UI-SPEC A-6). */
export const HONEYPOT_FIELD = "company_website";

/** Below this elapsed time the submission is machine-fast, not human. */
export const MIN_ELAPSED_MS = 3_000;

/** Above this the page has sat open for over a day; treat the stamp as stale. */
export const MAX_ELAPSED_MS = 86_400_000;

/**
 * The D-05 field contract. These two arrays plus `MAX_FIELD_LENGTHS` are the
 * whole schema; there is no other list. `certified` is the UI-05 attestation and
 * is required, not decorative.
 */
export const SUBMISSION_REQUIRED_KEYS = [
	"first_name",
	"last_name",
	"email",
	"phone",
	"desired_move_in_date",
	"current_street",
	"current_city",
	"current_state",
	"current_postal_code",
	"gross_monthly_income",
	"occupant_count",
	"reference_1_name",
	"reference_1_phone",
	"certified",
] as const;

/**
 * Everything an applicant may leave blank. Employer, other-income, the second
 * reference, pets, vehicles and reason-for-moving are all optional on purpose:
 * requiring employment as the primary income signal is a source-of-income
 * discrimination risk in CA, WA, NY and roughly twenty other jurisdictions, and
 * 42 U.S.C. 3604(c) makes the application form itself a regulated surface (D-05).
 */
export const SUBMISSION_OPTIONAL_KEYS = [
	"current_landlord_name",
	"current_landlord_phone",
	"reason_for_moving",
	"employer_name",
	"employer_role",
	"employer_months",
	"other_income_source",
	"other_income_amount",
	"pet_details",
	"vehicle_details",
	"reference_1_relationship",
	"reference_2_name",
	"reference_2_relationship",
	"reference_2_phone",
] as const;

/**
 * D-06, written down rather than merely absent. A field appearing here must
 * never appear in either key set above. Exported so the browser-side schema can
 * be pinned against the same list, and so adding a member is a deliberate act
 * with a failing test attached rather than a quiet omission.
 */
export const FORBIDDEN_SUBMISSION_KEYS = [
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

/**
 * Per-field character caps. `sign-lease-token` slices `signerName` to 200 rather
 * than rejecting it (V5); that is wrong here, because a truncated applicant
 * answer is a silently corrupted fair-housing record. Over-long values are
 * rejected so the applicant is told, and so nothing is stored that the applicant
 * did not write.
 */
export const MAX_FIELD_LENGTHS: Readonly<Record<string, number>> = {
	first_name: 100,
	last_name: 100,
	email: 320,
	phone: 40,
	desired_move_in_date: 10,
	current_street: 200,
	current_city: 100,
	current_state: 2,
	current_postal_code: 10,
	current_landlord_name: 100,
	current_landlord_phone: 40,
	reason_for_moving: 2000,
	employer_name: 100,
	employer_role: 100,
	other_income_source: 200,
	pet_details: 2000,
	vehicle_details: 2000,
	reference_1_name: 100,
	reference_1_relationship: 100,
	reference_1_phone: 40,
	reference_2_name: 100,
	reference_2_relationship: 100,
	reference_2_phone: 40,
};

/**
 * Numeric bounds. The upper bounds are not cosmetic: `occupant_count` and
 * `employer_months` land in `integer` columns, so an unbounded value raises a
 * Postgres overflow mid-transaction instead of a clean validation answer.
 */
const NUMBER_FIELDS: Readonly<
	Record<string, { min: number; max: number; integer: boolean }>
> = {
	gross_monthly_income: { min: 0, max: 10_000_000, integer: false },
	other_income_amount: { min: 0, max: 10_000_000, integer: false },
	occupant_count: { min: 1, max: 50, integer: true },
	employer_months: { min: 0, max: 1200, integer: true },
};

/** The attestation is the only boolean on the wire. */
const BOOLEAN_FIELDS: readonly string[] = ["certified"];

/**
 * Format checks. `current_state` is two letters here rather than a membership
 * test against the 50-entry `USState` union: that union lives in
 * `src/types/lease-generator.types.ts` and copying it into this zero-import
 * module would create the duplicate constant CLAUDE.md forbids. The browser
 * schema does check membership, so the asymmetry runs in the safe direction —
 * the client is stricter than the server, never the reverse.
 */
const FIELD_PATTERNS: Readonly<Record<string, RegExp>> = {
	email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
	current_state: /^[A-Z]{2}$/,
	current_postal_code: /^\d{5}(-\d{4})?$/,
	desired_move_in_date: /^\d{4}-\d{2}-\d{2}$/,
};

const LOWERCASE_FIELDS: readonly string[] = ["email"];
const UPPERCASE_FIELDS: readonly string[] = ["current_state"];

/** All three second-reference fields; filling any one requires name and phone. */
const REFERENCE_2_KEYS: readonly string[] = [
	"reference_2_name",
	"reference_2_relationship",
	"reference_2_phone",
];

export type ParseFailureReason =
	| "unknown_field"
	| "missing_field"
	| "bad_type"
	| "too_long";

/**
 * The validated value. `certified` makes this a boolean-carrying record rather
 * than the `string | number` the plan sketched: dropping the attestation from
 * the output to keep the narrower type would hide a contract key from the RPC,
 * which is the drift class this module exists to prevent.
 */
export type ParseResult =
	| { ok: true; value: Record<string, string | number | boolean> }
	| { ok: false; reason: ParseFailureReason; field: string };

type FieldOutcome =
	| { ok: true; value: string | number | boolean }
	| { ok: false; reason: ParseFailureReason; field: string };

function fail(reason: ParseFailureReason, field: string): ParseResult {
	return { ok: false, reason, field };
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
	return typeof input === "object" && input !== null && !Array.isArray(input);
}

/** Absent, null, or a string that is empty once trimmed. */
function isFilled(value: unknown): boolean {
	if (value === undefined || value === null) return false;
	if (typeof value === "string") return value.trim().length > 0;
	return true;
}

function readString(field: string, raw: unknown): FieldOutcome {
	if (typeof raw !== "string") {
		return { ok: false, reason: "bad_type", field };
	}
	let value = raw.trim();
	if (LOWERCASE_FIELDS.includes(field)) value = value.toLowerCase();
	if (UPPERCASE_FIELDS.includes(field)) value = value.toUpperCase();

	const max = MAX_FIELD_LENGTHS[field];
	if (max === undefined) return { ok: false, reason: "unknown_field", field };
	if (value.length > max) return { ok: false, reason: "too_long", field };

	const pattern = FIELD_PATTERNS[field];
	if (pattern !== undefined && !pattern.test(value)) {
		return { ok: false, reason: "bad_type", field };
	}
	return { ok: true, value };
}

function readNumber(field: string, raw: unknown): FieldOutcome {
	const spec = NUMBER_FIELDS[field];
	if (spec === undefined) return { ok: false, reason: "unknown_field", field };
	if (typeof raw !== "number" || !Number.isFinite(raw)) {
		return { ok: false, reason: "bad_type", field };
	}
	if (spec.integer && !Number.isInteger(raw)) {
		return { ok: false, reason: "bad_type", field };
	}
	if (raw < spec.min || raw > spec.max) {
		return { ok: false, reason: "bad_type", field };
	}
	return { ok: true, value: raw };
}

function readField(field: string, raw: unknown): FieldOutcome {
	if (field in NUMBER_FIELDS) return readNumber(field, raw);
	if (BOOLEAN_FIELDS.includes(field)) {
		// The attestation must be the literal `true`. "true", 1 and false all fail.
		return raw === true
			? { ok: true, value: true }
			: { ok: false, reason: "bad_type", field };
	}
	return readString(field, raw);
}

/**
 * UI-SPEC A-3 Section 5: all three second-reference fields are optional, but a
 * name with no phone is useless to the owner, so filling any one of them
 * requires both the name and the phone.
 */
function checkReferencePairing(
	value: Record<string, string | number | boolean>,
): ParseResult | null {
	const anyFilled = REFERENCE_2_KEYS.some((key) => value[key] !== undefined);
	if (!anyFilled) return null;
	if (value.reference_2_name === undefined) {
		return fail("missing_field", "reference_2_name");
	}
	if (value.reference_2_phone === undefined) {
		return fail("missing_field", "reference_2_phone");
	}
	return null;
}

/**
 * Validate an applicant submission body against the D-05/D-06 contract.
 *
 * Unknown keys are checked FIRST and rejected, which is the SSN gate. Stripping
 * them instead would be worse than useless: the value would still have crossed
 * the network and been logged by the Edge Function before being discarded, and
 * nobody would ever learn the form was being fed an SSN.
 *
 * Returns only contract keys, trimmed, with `email` lowercased and
 * `current_state` uppercased. That object is what becomes the RPC's `p_payload`.
 */
export function parseSubmissionPayload(input: unknown): ParseResult {
	if (!isPlainObject(input)) return fail("bad_type", "payload");

	const allowed = new Set<string>([
		...SUBMISSION_REQUIRED_KEYS,
		...SUBMISSION_OPTIONAL_KEYS,
	]);
	for (const key of Object.keys(input)) {
		if (!allowed.has(key)) return fail("unknown_field", key);
	}

	const value: Record<string, string | number | boolean> = {};

	for (const key of SUBMISSION_REQUIRED_KEYS) {
		if (!isFilled(input[key])) return fail("missing_field", key);
		const outcome = readField(key, input[key]);
		if (!outcome.ok) return outcome;
		value[key] = outcome.value;
	}

	for (const key of SUBMISSION_OPTIONAL_KEYS) {
		if (!isFilled(input[key])) continue;
		const outcome = readField(key, input[key]);
		if (!outcome.ok) return outcome;
		value[key] = outcome.value;
	}

	return checkReferencePairing(value) ?? { ok: true, value };
}

/**
 * True when the off-screen honeypot carries a value. Any non-empty string trips
 * it, and so does any non-string: a real browser posts a string or nothing at
 * all, so a number or object in this slot is already not a form submission.
 * Whitespace-only does NOT trip — that is an autofill or paste artifact, and a
 * false positive here silently discards a real application.
 */
export function isHoneypotTripped(value: unknown): boolean {
	if (value === undefined || value === null) return false;
	if (typeof value === "string") return value.trim().length > 0;
	return true;
}

/**
 * True when the client-reported form-load time is not consistent with a human
 * filling in a 26-field form. Unparseable, absent, forged-future and stale
 * stamps all count as suspicious. See header note (b): this is a bot filter, not
 * a security control.
 */
export function isTimingSuspicious(formLoadedAt: unknown, nowMs: number): boolean {
	if (typeof formLoadedAt !== "number" || !Number.isFinite(formLoadedAt)) {
		return true;
	}
	if (!Number.isFinite(nowMs)) return true;
	const elapsed = nowMs - formLoadedAt;
	return elapsed < MIN_ELAPSED_MS || elapsed > MAX_ELAPSED_MS;
}
