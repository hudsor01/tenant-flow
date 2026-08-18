// Shared rate limiting utility for Supabase Edge Functions.
//
// Backed by `public.check_rate_limit`, a SECURITY DEFINER RPC in THIS project's
// own database (migration 20260818031338_rate_limit_counters.sql). That is D-01,
// and it is not a vendor swap: it puts the limiter in the SAME failure domain as
// the write it guards.
//
// THERE IS NO FAIL-OPEN BRANCH, DELIBERATELY (D-02). The previous version of
// this module was backed by an external key-value service and admitted every
// request whenever that service was unreachable. When the free database behind
// it was reaped, the limits stopped existing across the whole product and the
// only symptom was latency -- measured 2026-08-09 at 9.0-9.2s per apply-token
// context call against 0.28s for an action with no limiter. An admitting
// limiter certifies itself healthy, which is why nothing noticed for months.
// Now that the limiter shares a failure domain with the write, an unreachable
// database fails that write anyway, so admitting on error would buy nothing and
// hide the outage. Every error path DENIES; see `./rate-limit-decision.ts` for
// the taxonomy and the invariant that admission is never a default branch.
//
// Usage: const rateLimited = await rateLimit(req, { maxRequests: 10, windowMs: 60_000, prefix: 'invite' })
//        if (rateLimited) return rateLimited

import { getCorsHeaders } from "./cors.ts";
import { captureWebhookError } from "./errors.ts";
import {
	decideRateLimit,
	type RateLimitDecision,
	type RateLimitRpcOutcome,
} from "./rate-limit-decision.ts";
import { createAdminClient } from "./supabase-client.ts";

interface RateLimitOptions {
	/** Maximum requests allowed in the window */
	maxRequests: number;
	/** Window duration in milliseconds */
	windowMs: number;
	/** Key prefix for namespace isolation (e.g., 'invite-validate') */
	prefix?: string;
	/**
	 * Override the per-request bucket key. Defaults to the client IP. Pass a
	 * stable per-session value (e.g. a token hash) when the caller's IP is a
	 * shared egress address — keeping one session from exhausting another's
	 * bucket.
	 */
	identifier?: string;
}

/** Thrown when the isolate has no service-role credentials. Classified as `missing_env`. */
class MissingRateLimitEnvError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "MissingRateLimitEnvError";
	}
}

/**
 * Module-scope service-role client, built once per isolate.
 *
 * WHY THIS DOES NOT VIOLATE CLAUDE.md's "no module-level Supabase client".
 * That rule is written for the frontend hook layer, where a cached client holds
 * a USER's auth state and reusing it leaks one user's session into another's
 * request. Here there is exactly one identity -- service_role -- it is
 * process-wide by definition, it carries no per-request state, and the key never
 * leaves the isolate. Rebuilding it per request would add a client construction
 * to every guarded request on five public surfaces for no security gain
 * (T-66.1-18, accepted with this reasoning recorded so the rule is not applied
 * by pattern-match).
 *
 * The env read is LAZY -- inside the function, on first call -- so an unset var
 * denies requests instead of killing the isolate at import.
 */
let cachedClient: ReturnType<typeof createAdminClient> | null = null;

function getRateLimitClient(): ReturnType<typeof createAdminClient> {
	if (cachedClient) return cachedClient;

	// Both are platform-injected in every Supabase Edge Function.
	const url = Deno.env.get("SUPABASE_URL");
	const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

	if (!url || !serviceRoleKey) {
		throw new MissingRateLimitEnvError(
			"Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
		);
	}

	cachedClient = createAdminClient(url, serviceRoleKey);
	return cachedClient;
}

/**
 * Extract the trusted client IP from request headers.
 *
 * Supabase Edge Functions run on Deno Deploy. Whether `cf-connecting-ip`
 * is populated depends on whether the request transits Cloudflare's
 * edge layer before reaching the function. When it does, that header
 * is set by Cloudflare and stripped from incoming requests at its
 * boundary, so a client cannot forge it — making it the most reliable
 * IP signal available. When it doesn't, this function falls through to
 * `x-forwarded-for`.
 *
 * Order:
 *   1. `cf-connecting-ip` — trusted when present.
 *   2. Last segment of `x-forwarded-for` — closest hop to our infra.
 *      The FIRST segment is attacker-controlled (the client can put
 *      anything they want in the request header before it reaches the
 *      edge), so trusting it lets an attacker rotate fake IPs to
 *      bypass any IP-based rate limit. The last segment is added by
 *      the trusted proxy at our network boundary and reflects the
 *      real caller in single-proxy topologies. In multi-proxy chains,
 *      the last segment is still the closest-to-us hop, which is the
 *      most truthful identifier we can pick without coordinating with
 *      every upstream proxy.
 *   3. Fallback string `'unknown'` — every untrusted request shares
 *      this bucket, so the rate limit still applies in aggregate when
 *      headers are missing entirely (e.g., direct origin hit). This
 *      falls open for per-IP isolation but stays closed for
 *      aggregate-traffic ceilings.
 */
export function getClientIp(req: Request): string {
	const cfIp = req.headers.get("cf-connecting-ip");
	if (cfIp) return cfIp;

	const xff = req.headers.get("x-forwarded-for");
	if (xff) {
		const parts = xff
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		if (parts.length > 0) return parts[parts.length - 1];
	}

	return "unknown";
}

/** The single 429 shape. Identical headers and body for a real breach and an error. */
function denyResponse(
	req: Request,
	decision: RateLimitDecision,
): Response {
	return new Response(JSON.stringify({ error: "Too many requests" }), {
		status: 429,
		headers: {
			"Content-Type": "application/json",
			"Retry-After": String(decision.retryAfterSec),
			"X-RateLimit-Limit": String(decision.limit),
			"X-RateLimit-Remaining": "0",
			"X-RateLimit-Reset": String(decision.resetAtMs),
			...getCorsHeaders(req),
		},
	});
}

/**
 * Apply rate limiting to a request.
 *
 * @returns 429 Response when the request must not proceed -- whether the bucket
 * is genuinely exhausted OR the check itself failed -- and `null` only when
 * `public.check_rate_limit` returned a row that says the request is allowed.
 * There is no third outcome.
 *
 * WHY 429 ON THE ERROR PATH TOO, NOT 503. Verified, not assumed:
 * `src/components/applications/rental-application-form.tsx:133` maps status 429
 * to the "capped" outcome, whose copy is "This listing is busy right now /
 * Nothing you typed has been lost. Please wait a while and submit again." That
 * is the correct thing to tell an applicant when our database is unreachable.
 * A 503 falls through to "failed" ("Check your connection"), which blames the
 * applicant's network for our outage. A uniform status also means no client ever
 * branches on limiter-internal state. The operator's distinguisher is the event
 * name -- `rate_limit_error` vs `rate_limit_hit` -- not the status code.
 *
 * NOTHING WRAPS THE RPC CALL, AND NOTHING SHOULD BE ADDED (D-07). The previous
 * module bounded its external round trip in TypeScript because an unreachable
 * key-value service hangs rather than erroring. A same-region PostgREST call is
 * ~10-30ms, and the ONE unbounded wait it can have is a row-lock queue on a hot
 * bucket key -- which the migration already bounds IN THE DATABASE with
 * `set lock_timeout = '250ms'` on the function. That surfaces as `55P03`,
 * classifies as `lock_contention`, and denies. A TypeScript-side bound could not
 * cancel the statement it is waiting on; all it could do is convert
 * slow-but-healthy into denied on five public surfaces. Do not re-add one as a
 * "safety net".
 */
export async function rateLimit(
	req: Request,
	options: RateLimitOptions,
): Promise<Response | null> {
	// Identical key derivation to the previous implementation, so no call site's
	// bucket changes meaning across this rewrite.
	const key = options.identifier ?? getClientIp(req);
	const bucketKey = options.prefix ? `${options.prefix}:${key}` : key;

	let outcome: RateLimitRpcOutcome;
	let thrown: unknown = null;
	let failureMessage = "";

	try {
		const supabase = getRateLimitClient();

		// Parameter names and units are the migration's contract verbatim:
		// p_window_ms is MILLISECONDS and typed `integer`, so there is no cast and
		// no seconds conversion here.
		const { data, error } = await supabase
			.rpc("check_rate_limit", {
				p_bucket_key: bucketKey,
				p_max_requests: options.maxRequests,
				p_window_ms: options.windowMs,
			})
			.single();

		if (error) {
			thrown = error;
			failureMessage = error.message;
			outcome = {
				kind: "postgrest_error",
				code: error.code ?? null,
				status:
					"status" in error && typeof error.status === "number"
						? error.status
						: null,
				message: error.message,
			};
		} else {
			outcome = { kind: "ok", data };
		}
	} catch (err) {
		// D-02 SAYS "DELETE THE FAIL-OPEN CATCH", AND DELETING THE `catch`
		// STATEMENT IS THE WRONG READING OF IT. An uncaught throw here propagates
		// into five different handlers and produces five different client-visible
		// failures on the product's only public unauthenticated write surfaces.
		// What RATE-02 requires is that every error path DENIES. So the catch
		// stays; the admitting result it used to hand back is what died. Every
		// branch below feeds the decision leaf, which has no admitting default.
		thrown = err;
		failureMessage = err instanceof Error ? err.message : String(err);
		outcome =
			err instanceof MissingRateLimitEnvError
				? { kind: "missing_env", message: failureMessage }
				: { kind: "thrown", message: failureMessage };
	}

	const decision = decideRateLimit(outcome, {
		maxRequests: options.maxRequests,
		windowMs: options.windowMs,
		nowMs: Date.now(),
	});

	if (decision.allowed === true) return null;

	if (decision.errorClass === null) {
		// The ordinary breach. Unchanged fields, unchanged event name.
		console.warn(
			JSON.stringify({
				level: "warn",
				event: "rate_limit_hit",
				key,
				prefix: options.prefix,
				url: req.url,
				limit: decision.limit,
				remaining: 0,
				reset: decision.resetAtMs,
			}),
		);
	} else {
		// captureWebhookError writes the structured console.error AND calls
		// Sentry.captureException, so one call satisfies both the existing log
		// contract and RATE-04.
		//
		// `event: "rate_limit_error"` is the EXACT literal 66.1-05's Sentry alert
		// rule matches on. Sentry-side rules cannot be committed to this repo, so
		// renaming this string silently disarms the alert with no failing test
		// anywhere (T-66.1-19).
		//
		// The bucket key is NEVER logged here: it is a raw client address on four
		// of the five guarded surfaces (T-66.1-17).
		captureWebhookError(
			thrown instanceof Error ? thrown : new Error(failureMessage),
			{
				event: "rate_limit_error",
				error_class: decision.errorClass,
				prefix: options.prefix,
				url: req.url,
				bucket_key_prefix: options.prefix ?? null,
			},
		);
	}

	return denyResponse(req, decision);
}
