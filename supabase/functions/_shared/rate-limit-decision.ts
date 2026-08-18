/**
 * RATE-02 -- the fail-closed rate-limit decision, as a pure function.
 *
 * (a) THIS MODULE IS A DEPENDENCY-FREE LEAF, AND THAT IS THE ENTIRE POINT.
 *     It has ZERO import statements and zero references to any runtime global
 *     (no Deno namespace, no logging global, no network global, no Response
 *     constructor). That is what lets `__tests__/rate-limit.test.ts` import it
 *     from Vitest/Node and execute the fail-closed logic FOR REAL, exactly as
 *     `_shared/application-guards.ts` is executed by `application-guards.test.ts`.
 *
 *     `_shared/rate-limit.ts` itself is NOT importable from Node: it reaches for
 *     `./cors.ts` and `./errors.ts` with explicit extensions, reads the Deno env
 *     namespace, and pulls `@sentry/deno`, which is not in `package.json`. So
 *     without this split, the single most important assertion in this phase --
 *     "an unreachable database DENIES" -- could only ever be a source-text grep.
 *     A grep is the evidentiary standard that let the previous outage run for
 *     months. Adding one import here silently demotes every behavioural
 *     assertion in Phase 66.1 back to that standard. Do not add one.
 *
 * (b) ADMISSION IS NEVER A DEFAULT BRANCH.
 *     `allowed` is `true` if and only if a fully validated row carries
 *     `allowed === true`. Every other path in this file -- every error class,
 *     every unreadable payload, every future case someone forgets to handle --
 *     returns a denial. This is D-02: the limiter and the write it guards now
 *     share a failure domain, so an unreachable database fails the write anyway
 *     and an admitting limiter would only hide the outage.
 *
 * (c) THE TAXONOMY IS TRANSCRIBED, NOT INVENTED. The seven error classes below
 *     are the seven non-normal rows of the fail-closed error taxonomy in
 *     `66.1-RESEARCH.md` ("Fail-closed error taxonomy (RATE-02)"). The eighth
 *     row of that table is the ordinary `allowed = false` denial, which carries
 *     no error class because it is not an error.
 */

/**
 * The seven ways a rate-limit check can fail. Every one denies. The literal
 * values travel into the `rate_limit_error` event as `error_class`, so an
 * operator reading a Sentry issue learns the cause in one word.
 */
export const RATE_LIMIT_ERROR_CLASSES = [
	/** The RPC call threw: DNS, TLS, connection refused, abort. */
	"db_unreachable",
	/** PostgREST answered with an error carrying no code we classify. */
	"postgrest_5xx",
	/** `55P03` -- the function's `lock_timeout = '250ms'` fired under contention. */
	"lock_contention",
	/** `57014` -- statement cancelled. */
	"statement_timeout",
	/** `SUPABASE_URL` or the service-role key is absent from the isolate. */
	"missing_env",
	/** `PGRST202` -- the migration is not applied. The deploy-ordering failure. */
	"function_missing",
	/** The call succeeded but the payload is not a readable verdict row. */
	"malformed_payload",
] as const;

export type RateLimitErrorClass = (typeof RATE_LIMIT_ERROR_CLASSES)[number];

/**
 * The ceiling on `Retry-After` for every ERROR path.
 *
 * An error is not a real limit breach. Echoing `apply-submit`'s one-hour window
 * at an applicant because the database blipped punishes them for our outage;
 * a 1-second value invites a retry storm into an already-sick database. 60s is
 * the compromise. The header is advisory in either case -- the denial is what
 * enforces, not the number.
 */
export const ERROR_RETRY_AFTER_CAP_SEC = 60;

/**
 * Everything the caller can hand over, including the shapes that only exist
 * because something went wrong. `data` is deliberately `unknown`: the leaf
 * validates the shape rather than trusting a type assertion, which is the only
 * thing that makes the malformed-payload row testable at all.
 */
export type RateLimitRpcOutcome =
	| { kind: "ok"; data: unknown }
	| {
			kind: "postgrest_error";
			code: string | null;
			status: number | null;
			message: string;
	  }
	| { kind: "thrown"; message: string }
	| { kind: "missing_env"; message: string };

export interface RateLimitDecision {
	/** True only for a validated row whose `allowed` is strictly `true`. */
	allowed: boolean;
	/** `null` for both admission and the ordinary denial; set for every error. */
	errorClass: RateLimitErrorClass | null;
	limit: number;
	remaining: number;
	resetAtMs: number;
	retryAfterSec: number;
}

/** The validated four-column result of `public.check_rate_limit`. */
export interface RateLimitVerdictRow {
	allowed: boolean;
	limit_value: number;
	remaining: number;
	reset_at_ms: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

/**
 * Read the verdict row out of whatever supabase-js handed back, accepting BOTH
 * accepted shapes and returning `null` for everything else.
 *
 * `rate-limit.ts` uses `.single()`, so the object form is what production sees.
 * The array form is accepted anyway because `returns table` arrives as an array
 * without it, and a future edit that drops `.single()` must degrade to CORRECT
 * behaviour rather than to admission.
 *
 * This is RESEARCH pitfall 5, and it is the one a rewrite quietly gets wrong:
 * `data?.allowed` on an empty array is `undefined`, and `undefined !== false`,
 * so an optimistic read admits every request in the product while every test
 * still passes. Hence: a row is valid only when `allowed` is a boolean AND all
 * three numeric fields are finite numbers. `null`, `undefined`, `[]`, `{}`, a
 * missing field, or a string where a number belongs all read as `null` here,
 * which maps to `malformed_payload`, which denies.
 */
export function readVerdictRow(data: unknown): RateLimitVerdictRow | null {
	const candidate = Array.isArray(data) ? data[0] : data;
	if (!isRecord(candidate)) return null;
	if (typeof candidate.allowed !== "boolean") return null;
	if (!isFiniteNumber(candidate.limit_value)) return null;
	if (!isFiniteNumber(candidate.remaining)) return null;
	if (!isFiniteNumber(candidate.reset_at_ms)) return null;
	return {
		allowed: candidate.allowed,
		limit_value: candidate.limit_value,
		remaining: candidate.remaining,
		reset_at_ms: candidate.reset_at_ms,
	};
}

/**
 * Map a PostgREST error code to its class. An unrecognised code is
 * `postgrest_5xx`, which denies -- the fallback is a class, never a fallthrough
 * to admission.
 */
function classifyPostgrestCode(code: string | null): RateLimitErrorClass {
	if (code === "PGRST202") return "function_missing";
	if (code === "55P03") return "lock_contention";
	if (code === "57014") return "statement_timeout";
	return "postgrest_5xx";
}

interface DecisionOptions {
	maxRequests: number;
	windowMs: number;
	/**
	 * The current epoch millisecond count, passed in rather than read from the
	 * clock, so this module stays global-free (see header note (a)) and the
	 * tests are deterministic.
	 */
	nowMs: number;
}

/** Every error class produces the same denial shape, capped per D-02 commentary. */
function denyForError(
	errorClass: RateLimitErrorClass,
	options: DecisionOptions,
): RateLimitDecision {
	const retryAfterSec = Math.min(
		ERROR_RETRY_AFTER_CAP_SEC,
		Math.max(1, Math.ceil(options.windowMs / 1000)),
	);
	return {
		allowed: false,
		errorClass,
		limit: options.maxRequests,
		remaining: 0,
		resetAtMs: options.nowMs + retryAfterSec * 1000,
		retryAfterSec,
	};
}

/**
 * Turn one RPC outcome into one decision.
 *
 * THE INVARIANT, stated once and enforced by the structure below: this function
 * returns `allowed: true` on exactly ONE line, and reaching that line requires a
 * fully validated row whose `allowed` field is strictly `=== true`. Admission is
 * never the `else`, never the default branch of a switch, and never what happens
 * when a check falls through.
 */
export function decideRateLimit(
	outcome: RateLimitRpcOutcome,
	options: DecisionOptions,
): RateLimitDecision {
	// The service-role credentials are absent from the isolate.
	if (outcome.kind === "missing_env") return denyForError("missing_env", options);

	// Every throw out of a supabase-js RPC call is a transport failure. It is
	// NOT subdivided by sniffing the message: a message-matching branch that
	// fails to match would become a path that admits, and there is no version of
	// "we could not reach the database" that should let a request through.
	if (outcome.kind === "thrown") return denyForError("db_unreachable", options);

	if (outcome.kind === "postgrest_error") {
		// `status` is carried on the outcome for the log only; the code is what
		// classifies.
		return denyForError(classifyPostgrestCode(outcome.code), options);
	}

	const row = readVerdictRow(outcome.data);
	if (row === null) return denyForError("malformed_payload", options);

	if (row.allowed === true) {
		// THE ONLY ADMISSION IN THIS FILE.
		return {
			allowed: true,
			errorClass: null,
			limit: row.limit_value,
			remaining: row.remaining,
			resetAtMs: row.reset_at_ms,
			// Unused on the admit path; the caller returns null, not a response.
			retryAfterSec: 0,
		};
	}

	// The ORDINARY denial: the database says the bucket is exhausted. No error
	// class -- the caller logs `rate_limit_hit`, not `rate_limit_error`.
	// `reset_at_ms` can already be in the past on a slow hop, so floor at 1
	// rather than emitting a zero or negative `Retry-After`.
	return {
		allowed: false,
		errorClass: null,
		limit: row.limit_value,
		remaining: row.remaining,
		resetAtMs: row.reset_at_ms,
		retryAfterSec: Math.max(1, Math.ceil((row.reset_at_ms - options.nowMs) / 1000)),
	};
}
