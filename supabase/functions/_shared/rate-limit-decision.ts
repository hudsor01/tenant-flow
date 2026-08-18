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

// -----------------------------------------------------------------------------
// RATE-03 -- the trust decision for a FORWARDED client address.
//
// WHY IT LIVES HERE AND NOWHERE ELSE. Header note (a) applies verbatim:
// `_shared/rate-limit.ts` cannot be imported from Vitest, so anything placed
// there can only ever be source-grepped. The six-row trust matrix is the single
// most important evidence in this plan -- D5 has been attempted twice and shipped
// a passing test for a property the code did not have BOTH times -- so the matrix
// has to be EXECUTED. That means the logic lives in this leaf.
//
// AND THE ZERO-IMPORTS INVARIANT SURVIVES BY DEPENDENCY INJECTION. The
// constant-time comparator is a PARAMETER, not an import of `./timing-safe.ts`.
// Importing it would be more convenient and would demote every assertion below
// back to a grep. The cost of injection is that this leaf will accept any
// comparator, including `===`; that is bought back by a source assertion in
// `__tests__/rate-limit.test.ts` pinning the production call site to
// `timingSafeEqualStr` (T-66.1-28).
// -----------------------------------------------------------------------------

/**
 * Every way a forwarded address can fail to earn trust. All of them fall back to
 * the connection address, which is today's exact behaviour (D-05).
 */
export const FORWARD_REJECT_REASONS = [
	/** No secret is configured on this side -- the mechanism is not provisioned. */
	"no_configured_secret",
	/** The caller presented no secret. */
	"no_presented_secret",
	/** The caller presented a secret but no address. */
	"no_forwarded_address",
	/** The presented secret is not the configured one. */
	"secret_mismatch",
	/** The address is not a well-formed IPv4 or IPv6 textual address. */
	"malformed_address",
] as const;

export type ForwardRejectReason = (typeof FORWARD_REJECT_REASONS)[number];

/** The longest IPv6 textual form, counting an IPv4-mapped tail. */
export const MAX_FORWARDED_IP_LENGTH = 45;

/** One 16-bit IPv6 group, lowercased. */
function isHexGroup(value: string): boolean {
	return /^[0-9a-f]{1,4}$/.test(value);
}

/**
 * A dotted quad with four octets in 0-255 and NO leading zeros.
 *
 * Leading zeros are rejected rather than stripped: `010.0.0.1` is octal to some
 * parsers and decimal to others, so accepting both spellings splits ONE client
 * across TWO buckets and silently doubles their quota.
 */
function isIpv4(value: string): boolean {
	const octets = value.split(".");
	if (octets.length !== 4) return false;
	for (const octet of octets) {
		if (!/^\d{1,3}$/.test(octet)) return false;
		if (octet.length > 1 && octet.startsWith("0")) return false;
		if (Number(octet) > 255) return false;
	}
	return true;
}

/**
 * Colon-separated 16-bit groups: at most 8, at most one `::`, and an optional
 * final group that is itself a dotted quad.
 *
 * IPv4-mapped forms (`::ffff:192.0.2.1`) are real and arrive from real clients.
 * Dropping them silently would push those clients into the shared fallback
 * bucket, which is the opposite of what a per-client key is for.
 */
function isIpv6(value: string): boolean {
	if (!value.includes(":")) return false;
	// At most one `::`. Two would make the expansion ambiguous.
	if (value.split("::").length - 1 > 1) return false;

	let body = value;
	const lastColon = body.lastIndexOf(":");
	const tail = body.slice(lastColon + 1);
	if (tail.includes(".")) {
		if (!isIpv4(tail)) return false;
		// The dotted quad occupies exactly two 16-bit groups; substituting two
		// hex groups lets the group arithmetic below stay in one form.
		body = `${body.slice(0, lastColon + 1)}0:0`;
	}

	if (body.includes("::")) {
		const [left = "", right = ""] = body.split("::");
		const leftGroups = left.length === 0 ? [] : left.split(":");
		const rightGroups = right.length === 0 ? [] : right.split(":");
		if (!leftGroups.every(isHexGroup)) return false;
		if (!rightGroups.every(isHexGroup)) return false;
		// `::` stands for AT LEAST one omitted group, so the explicit groups have
		// to leave room for it.
		return leftGroups.length + rightGroups.length <= 7;
	}

	const groups = body.split(":");
	if (groups.length !== 8) return false;
	return groups.every(isHexGroup);
}

/**
 * The canonical form of a forwarded address, or `null`.
 *
 * WHAT THIS IS: a KEY-SHAPE BOUND. The secret is what authorizes; this is what
 * stops the holder of a valid secret -- or a future bug on the forwarding side --
 * from turning `p_bucket_key` or a log field into an arbitrary string.
 *
 * WHAT THIS IS NOT: proof that the address is genuine. Nothing here can
 * establish that, and reading it as if it could is how a shape check ends up
 * substituting for the compare.
 *
 * Lowercasing is done HERE and only here, so `2001:DB8::1` and `2001:db8::1`
 * are one bucket rather than two.
 */
export function normalizeForwardedIp(raw: string | null | undefined): string | null {
	if (typeof raw !== "string") return null;
	const trimmed = raw.trim();
	if (trimmed.length === 0) return null;
	// A comma means a list, which contradicts the single-address contract the
	// forwarding side refuses to guess at. Whitespace inside the value is
	// header-injection shaped.
	if (trimmed.includes(",")) return null;
	if (/\s/.test(trimmed)) return null;
	if (trimmed.length > MAX_FORWARDED_IP_LENGTH) return null;

	const lowered = trimmed.toLowerCase();
	if (isIpv4(lowered)) return lowered;
	if (isIpv6(lowered)) return lowered;
	return null;
}

export interface ForwardedClientIpInput {
	/** The secret the caller presented, verbatim. */
	presentedSecret: string | null;
	/** The address the caller asked us to believe. */
	forwardedIp: string | null;
	/** The secret this side has configured, verbatim. */
	configuredSecret: string | null;
}

export interface ForwardedClientIpDecision {
	trusted: boolean;
	clientIp: string | null;
	reason: ForwardRejectReason | null;
}

/**
 * Decide whether to believe a forwarded client address.
 *
 * THE INVARIANT, the same one `decideRateLimit` carries: trust is granted at
 * exactly ONE `return`, never as an `else` and never as a default branch, and
 * reaching it requires ALL FIVE conditions below. Any missing piece is a
 * fallback to the connection address -- which is why no provisioning order of
 * `CLIENT_IP_FORWARD_SECRET` can produce a window of changed behaviour (D-05).
 *
 * @param compare a CONSTANT-TIME string equality function. Injected rather than
 * imported to keep this module dependency-free; see the section header.
 */
export function decideForwardedClientIp(
	input: ForwardedClientIpInput,
	compare: (a: string, b: string) => boolean,
): ForwardedClientIpDecision {
	// 1. THIS RUNS BEFORE ANY COMPARISON, AND THAT ORDER IS THE WHOLE ROW.
	//    Two empty strings are EQUAL to any comparator, constant-time or not. If
	//    an unconfigured secret reached `compare`, every caller sending two empty
	//    headers would be trusted -- a complete bypass produced by NOT configuring
	//    the secret, making the system more permissive unprovisioned than
	//    provisioned. `send-lease-reminders` escapes this only because its secret
	//    is in `validateEnv({ required })` and the isolate dies first; D-05 makes
	//    this one OPTIONAL by design, so it cannot inherit that protection and
	//    needs the explicit guard (T-66.1-26).
	if (
		typeof input.configuredSecret !== "string" ||
		input.configuredSecret.trim().length === 0
	) {
		return { trusted: false, clientIp: null, reason: "no_configured_secret" };
	}

	// 2. Nothing to compare against.
	if (
		typeof input.presentedSecret !== "string" ||
		input.presentedSecret.length === 0
	) {
		return { trusted: false, clientIp: null, reason: "no_presented_secret" };
	}

	// 3. A secret with no address asks us to trust nothing in particular.
	if (typeof input.forwardedIp !== "string" || input.forwardedIp.length === 0) {
		return { trusted: false, clientIp: null, reason: "no_forwarded_address" };
	}

	// 4. The authorization itself. `compare` is constant-time in production; the
	//    length-mismatch early return inside it is deliberate and documented
	//    (`./timing-safe.ts`) -- the secret's length is not itself secret.
	if (!compare(input.presentedSecret, input.configuredSecret)) {
		return { trusted: false, clientIp: null, reason: "secret_mismatch" };
	}

	// 5. THIS RUNS AFTER THE SECRET CHECK AND STILL REJECTS. A validated secret
	//    does not buy the right to inject an arbitrary rate-limit key. This is
	//    the row that gets dropped when the two checks are collapsed into one
	//    "the caller is trusted, so the value is fine" step (T-66.1-23).
	const clientIp = normalizeForwardedIp(input.forwardedIp);
	if (clientIp === null) {
		return { trusted: false, clientIp: null, reason: "malformed_address" };
	}

	// THE ONLY GRANT OF TRUST IN THIS FILE.
	return { trusted: true, clientIp, reason: null };
}
