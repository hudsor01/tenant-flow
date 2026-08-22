/**
 * RATE-01 / RATE-02 -- the fail-closed limiter.
 *
 * WHAT THIS FILE PROVES BY EXECUTION. Everything in section 1 imports
 * `../_shared/rate-limit-decision` (extension-less: `tsconfig.json` includes
 * `supabase/functions/__tests__/**`, where an explicit `.ts` specifier is
 * TS5097 -- the same trap `application-guards.test.ts` documents) and runs the
 * real decision function. Those assertions cannot pass against a stub, and the
 * D-02 assertion -- a thrown RPC call DENIES -- is the one a fail-open
 * regression breaks first.
 *
 * WHAT IT PROVES ONLY STRUCTURALLY. `_shared/rate-limit.ts` cannot be imported
 * here at all: it imports `./cors.ts` / `./errors.ts` with explicit extensions,
 * reads the Deno env namespace, and pulls `@sentry/deno`, which is not a
 * `package.json` dependency. Sections 3 and 4 therefore read it off disk,
 * exactly as `apply-token-contract.test.ts` reads `apply-token/index.ts`, and
 * pin the properties the behavioural tests cannot reach.
 *
 * WHAT NOTHING HERE PROVES. That `public.check_rate_limit` exists, that the RPC
 * call succeeds, or that a deployed isolate behaves. 66.1-02 applied and
 * verified the function against production; 66.1-05 deploys the functions and
 * smokes them. This plan deploys nothing.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	decideForwardedClientIp,
	decideRateLimit,
	ERROR_RETRY_AFTER_CAP_SEC,
	FORWARD_REJECT_REASONS,
	type ForwardedClientIpInput,
	type ForwardRejectReason,
	normalizeForwardedIp,
	RATE_LIMIT_ERROR_CLASSES,
	type RateLimitErrorClass,
	type RateLimitRpcOutcome,
} from "../_shared/rate-limit-decision";
import { timingSafeEqualStr } from "../_shared/timing-safe";

const NOW = 1_770_000_000_000;
const OPTS = { maxRequests: 10, windowMs: 60_000, nowMs: NOW };

function okRow(overrides: Record<string, unknown> = {}): RateLimitRpcOutcome {
	return {
		kind: "ok",
		data: {
			allowed: true,
			limit_value: 10,
			remaining: 9,
			reset_at_ms: NOW + 60_000,
			...overrides,
		},
	};
}

describe("1. decideRateLimit -- executed, one case per taxonomy row", () => {
	it("a validated row with allowed=true ADMITS and passes the row through", () => {
		const decision = decideRateLimit(okRow(), OPTS);

		expect(decision.allowed).toBe(true);
		expect(decision.errorClass).toBeNull();
		expect(decision.limit).toBe(10);
		expect(decision.remaining).toBe(9);
		expect(decision.resetAtMs).toBe(NOW + 60_000);
	});

	it("a validated row with allowed=false DENIES with no error class", () => {
		const decision = decideRateLimit(
			okRow({ allowed: false, remaining: 0, reset_at_ms: NOW + 42_000 }),
			OPTS,
		);

		expect(decision.allowed).toBe(false);
		// No error class: this is the ordinary denial, and the caller must log
		// `rate_limit_hit` rather than `rate_limit_error` for it.
		expect(decision.errorClass).toBeNull();
		expect(decision.retryAfterSec).toBe(42);
	});

	it("an already-elapsed reset_at_ms floors Retry-After at 1, never 0 or negative", () => {
		const decision = decideRateLimit(
			okRow({ allowed: false, remaining: 0, reset_at_ms: NOW - 5_000 }),
			OPTS,
		);

		expect(decision.allowed).toBe(false);
		expect(decision.retryAfterSec).toBe(1);
	});

	it("D-02: a THROWN RPC call denies as db_unreachable", () => {
		// THE assertion this whole phase turns on. Before 66.1-03 the catch in
		// rate-limit.ts returned null here, which all eleven call sites read as
		// "not limited, proceed" -- so an unreachable limiter looked exactly like
		// a healthy one. If this test ever goes green on `allowed: true`, the
		// fail-open branch has been reintroduced.
		const decision = decideRateLimit(
			{ kind: "thrown", message: "error sending request for url" },
			OPTS,
		);

		expect(decision.allowed).toBe(false);
		expect(decision.errorClass).toBe("db_unreachable");
	});

	it("PGRST202 denies as function_missing (the deploy-ordering failure)", () => {
		const decision = decideRateLimit(
			{
				kind: "postgrest_error",
				code: "PGRST202",
				status: 404,
				message: "Could not find the function public.check_rate_limit",
			},
			OPTS,
		);

		expect(decision.allowed).toBe(false);
		expect(decision.errorClass).toBe("function_missing");
	});

	it("55P03 denies as lock_contention", () => {
		const decision = decideRateLimit(
			{
				kind: "postgrest_error",
				code: "55P03",
				status: 500,
				message: "canceling statement due to lock timeout",
			},
			OPTS,
		);

		expect(decision.allowed).toBe(false);
		expect(decision.errorClass).toBe("lock_contention");
	});

	it("57014 denies as statement_timeout", () => {
		const decision = decideRateLimit(
			{
				kind: "postgrest_error",
				code: "57014",
				status: 500,
				message: "canceling statement due to statement timeout",
			},
			OPTS,
		);

		expect(decision.allowed).toBe(false);
		expect(decision.errorClass).toBe("statement_timeout");
	});

	it("an unrecognised PostgREST code denies as postgrest_5xx", () => {
		const decision = decideRateLimit(
			{
				kind: "postgrest_error",
				code: "XX000",
				status: 500,
				message: "internal error",
			},
			OPTS,
		);

		expect(decision.allowed).toBe(false);
		expect(decision.errorClass).toBe("postgrest_5xx");
	});

	it("a null PostgREST code still denies rather than falling through", () => {
		const decision = decideRateLimit(
			{ kind: "postgrest_error", code: null, status: null, message: "" },
			OPTS,
		);

		expect(decision.allowed).toBe(false);
		expect(decision.errorClass).toBe("postgrest_5xx");
	});

	it("missing service-role env denies as missing_env", () => {
		const decision = decideRateLimit(
			{ kind: "missing_env", message: "Missing SUPABASE_SERVICE_ROLE_KEY" },
			OPTS,
		);

		expect(decision.allowed).toBe(false);
		expect(decision.errorClass).toBe("missing_env");
	});

	/**
	 * RESEARCH pitfall 5, exhaustively. `data?.allowed` on an empty array is
	 * `undefined` and `undefined !== false`, so an optimistic read admits every
	 * request in the product while every other test in the repo still passes.
	 */
	it.each([
		["null", null],
		["undefined", undefined],
		["an empty array", []],
		["an empty object", {}],
		["an array holding an empty object", [{}]],
		["a string allowed", { allowed: "true", limit_value: 5, remaining: 5, reset_at_ms: 1 }],
		["a missing limit_value", { allowed: true, remaining: 5, reset_at_ms: 1 }],
		[
			"a non-numeric reset_at_ms",
			{ allowed: true, limit_value: 5, remaining: 5, reset_at_ms: "x" },
		],
		["a NaN remaining", { allowed: true, limit_value: 5, remaining: NaN, reset_at_ms: 1 }],
		["a bare string", "allowed"],
	])("a malformed payload (%s) denies as malformed_payload", (_label, data) => {
		const decision = decideRateLimit({ kind: "ok", data }, OPTS);

		expect(decision.allowed).toBe(false);
		expect(decision.errorClass).toBe("malformed_payload");
	});

	it("both accepted row shapes produce identical decisions", () => {
		// rate-limit.ts uses .single(), so production sees the object form. The
		// array form is what `returns table` yields without it -- a future edit
		// that drops .single() must degrade to CORRECT behaviour, not to
		// admission, and that change looks purely cosmetic in review.
		const row = {
			allowed: true,
			limit_value: 10,
			remaining: 7,
			reset_at_ms: NOW + 30_000,
		};

		expect(decideRateLimit({ kind: "ok", data: row }, OPTS)).toEqual(
			decideRateLimit({ kind: "ok", data: [row] }, OPTS),
		);
	});

	it("an error-path Retry-After is capped at 60s, not the caller's window", () => {
		// apply-submit runs a one-hour window. A database blip must not tell an
		// applicant to come back in an hour.
		const decision = decideRateLimit(
			{ kind: "thrown", message: "connection refused" },
			{ maxRequests: 5, windowMs: 3_600_000, nowMs: NOW },
		);

		expect(decision.retryAfterSec).toBe(ERROR_RETRY_AFTER_CAP_SEC);
		expect(decision.retryAfterSec).toBe(60);
	});
});

describe("2. closure over the outcome union", () => {
	/**
	 * The exhaustive outcome set. Everything section 1 constructs, plus the one
	 * admitting shape, in one list -- so the two assertions below are statements
	 * about the WHOLE space of outcomes rather than about the cases someone
	 * remembered to write.
	 */
	const OUTCOMES: Array<{ outcome: RateLimitRpcOutcome; expect: RateLimitErrorClass | null }> = [
		{ outcome: okRow(), expect: null },
		{ outcome: okRow({ allowed: false, remaining: 0 }), expect: null },
		{ outcome: { kind: "thrown", message: "refused" }, expect: "db_unreachable" },
		{
			// THE SHAPE A REAL TRANSPORT FAILURE PRODUCES, and the reason this set
			// can call itself exhaustive. postgrest-js does not throw when the
			// database is unreachable: it catches the fetch rejection and resolves
			// with an empty code and status 0. Without this row the status-0 branch
			// in rate-limit-decision.ts could be deleted with the whole suite green,
			// and every DNS/TLS/connection-refused event would silently reclassify
			// as postgrest_5xx while db_unreachable showed zero events forever.
			outcome: {
				kind: "postgrest_error",
				code: "",
				status: 0,
				message: "TypeError: error sending request",
			},
			expect: "db_unreachable",
		},
		{ outcome: { kind: "missing_env", message: "no url" }, expect: "missing_env" },
		{
			outcome: { kind: "postgrest_error", code: "PGRST202", status: 404, message: "" },
			expect: "function_missing",
		},
		{
			outcome: { kind: "postgrest_error", code: "55P03", status: 500, message: "" },
			expect: "lock_contention",
		},
		{
			outcome: { kind: "postgrest_error", code: "57014", status: 500, message: "" },
			expect: "statement_timeout",
		},
		{
			outcome: { kind: "postgrest_error", code: "XX000", status: 502, message: "" },
			expect: "postgrest_5xx",
		},
		{ outcome: { kind: "ok", data: [] }, expect: "malformed_payload" },
		{ outcome: { kind: "ok", data: null }, expect: "malformed_payload" },
	];

	it("every declared error class is reachable from a real outcome", () => {
		const produced = new Set(
			OUTCOMES.map((entry) => decideRateLimit(entry.outcome, OPTS).errorClass).filter(
				(cls): cls is RateLimitErrorClass => cls !== null,
			),
		);

		for (const cls of RATE_LIMIT_ERROR_CLASSES) {
			expect(produced.has(cls)).toBe(true);
		}
		// No class exists that nothing can produce, and none produced that is not
		// declared -- the taxonomy and the code are the same seven rows.
		expect(produced.size).toBe(RATE_LIMIT_ERROR_CLASSES.length);
	});

	it("exactly ONE outcome shape in the whole set admits", () => {
		// This is what stops a future error class being added with an admitting
		// default branch -- the `else` that quietly means "proceed".
		const admitted = OUTCOMES.filter(
			(entry) => decideRateLimit(entry.outcome, OPTS).allowed === true,
		);

		expect(admitted).toHaveLength(1);
		expect(admitted[0]?.outcome).toEqual(okRow());
	});

	it("every non-admitting outcome carries the class the taxonomy assigns it", () => {
		for (const entry of OUTCOMES) {
			expect(decideRateLimit(entry.outcome, OPTS).errorClass).toBe(entry.expect);
		}
	});
});

// -----------------------------------------------------------------------------
// Section 3 -- structural contracts over the modules Vitest cannot import.
//
// `_shared/rate-limit.ts` and `_shared/errors.ts` are Deno modules: explicit
// `.ts` specifiers, the Deno env namespace, and `@sentry/deno`, which is not a
// `package.json` dependency. So the assertions below read source text off disk,
// exactly as `apply-token-contract.test.ts` does. A source-text assertion can
// only ever say "the code is shaped this way", never "the code behaves this
// way" -- which is precisely why the fail-closed LOGIC lives in the pure leaf
// above and is executed for real. These pin the properties that logic cannot
// reach because they are properties of the glue.
// -----------------------------------------------------------------------------

function readRepoSource(relativePath: string): string {
	return readFileSync(
		fileURLToPath(new URL(relativePath, import.meta.url)),
		"utf8",
	);
}

/**
 * Comments in both modules deliberately discuss the very tokens these
 * assertions forbid -- the absent hang-bound, the removed vendor, the admitting
 * result that died -- so every assertion runs against code alone.
 */
function stripComments(source: string): string {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/^[ \t]*\/\/.*$/gm, "");
}

/** Walk from an opening delimiter to its match, returning the closed slice. */
function balancedSlice(
	source: string,
	startIndex: number,
	open: string,
	close: string,
): string {
	let depth = 0;
	for (let i = startIndex; i < source.length; i += 1) {
		const char = source[i];
		if (char === open) {
			depth += 1;
		} else if (char === close) {
			depth -= 1;
			if (depth === 0) return source.slice(startIndex, i + 1);
		}
	}
	throw new Error(
		`Unbalanced "${open}" starting at index ${startIndex} — the parser, not the source, may be wrong. Do not loosen it to make a test pass.`,
	);
}

/**
 * Every `catch (...) { ... }` AND `catch { ... }` block body, braces included.
 *
 * The `[({]` alternation is load-bearing. Matching only `catch\s*\(` misses the
 * ES2019 optional catch binding, which the Deno runtime these files target
 * accepts -- so `catch { return null; }` could be added to rate-limit.ts and BOTH
 * D-02 structural gates below would still pass, because `blocks` would still be
 * non-empty from the surviving `catch (err)`. That would reintroduce fail-open on
 * five public unauthenticated surfaces with no failing test anywhere.
 */
function catchBlocks(code: string): string[] {
	const blocks: string[] = [];
	for (const match of code.matchAll(/catch\s*[({]/g)) {
		const braceIndex = code.indexOf("{", match.index);
		expect(braceIndex).toBeGreaterThan(-1);
		blocks.push(balancedSlice(code, braceIndex, "{", "}"));
	}
	return blocks;
}

/** The body of one exported function declaration, braces included. */
function exportedBody(code: string, name: string): string {
	const declarationIndex = code.indexOf(`export function ${name}(`);
	expect(declarationIndex).toBeGreaterThan(-1);
	const braceIndex = code.indexOf("{", code.indexOf(")", declarationIndex));
	return balancedSlice(code, braceIndex, "{", "}");
}

const LIMITER_CODE = stripComments(readRepoSource("../_shared/rate-limit.ts"));
const ERRORS_CODE = stripComments(readRepoSource("../_shared/errors.ts"));

describe("3. _shared/rate-limit.ts -- structural contracts", () => {
	it("NO catch block returns null (D-02)", () => {
		// The regression that caused this whole phase, asserted by slicing rather
		// than by a whole-file grep. The `grep -c "return null" === 1` in the
		// plan's gate is the coarser cousin: it stops being meaningful the moment
		// the file grows a second legitimate null return. This one does not.
		const blocks = catchBlocks(LIMITER_CODE);

		expect(blocks.length).toBeGreaterThan(0);
		for (const block of blocks) {
			expect(block).not.toContain("return null");
		}
	});

	it("every catch feeds the decision leaf rather than falling out", () => {
		// A catch that logs and then falls off the end of the function returns
		// undefined, which every call site reads as falsy and therefore as
		// "proceed" -- fail-open by omission instead of by statement. `kind:` on
		// those two literals exists ONLY as an input to decideRateLimit.
		expect(LIMITER_CODE).toContain("decideRateLimit(");

		for (const block of catchBlocks(LIMITER_CODE)) {
			expect(
				block.includes('kind: "thrown"') || block.includes('kind: "missing_env"'),
			).toBe(true);
		}
	});

	it("nothing bounds the RPC call in TypeScript (D-07)", () => {
		// The hang bound is `lock_timeout = '250ms'`, pinned on the function by
		// migration 20260818031338. A TS-side bound cannot cancel the statement
		// it waits on; all it can do is convert slow-but-healthy into denied on
		// five public surfaces.
		expect(LIMITER_CODE).not.toContain("timeout");
		expect(LIMITER_CODE).not.toContain("AbortSignal");
		expect(LIMITER_CODE).not.toContain("setTimeout");
	});

	it("the previous vendor is gone by identifier, not merely unused", () => {
		// A dead-but-resolving import gives a reviewer no signal that it is dead.
		expect(LIMITER_CODE.toLowerCase()).not.toContain("upstash");
	});

	it("calls the RPC by the migration's exact name and parameter names", () => {
		for (const literal of [
			"check_rate_limit",
			"p_bucket_key",
			"p_max_requests",
			"p_window_ms",
		]) {
			expect(LIMITER_CODE).toContain(literal);
		}
		// Milliseconds, as `integer`. A seconds conversion or a cast here returns
		// PGRST202 from a fail-closed limiter: a hard 429 on five public surfaces
		// the moment 66.1-05 deploys.
		expect(LIMITER_CODE).toContain("p_window_ms: options.windowMs");
	});

	it("emits both event names, and never the raw bucket key to Sentry", () => {
		expect(LIMITER_CODE).toContain("rate_limit_hit");
		// 66.1-05's Sentry alert rule matches this exact literal. Sentry-side
		// config cannot be committed, so a rename disarms the alert silently.
		expect(LIMITER_CODE).toContain('event: "rate_limit_error"');

		// THE MARKER MUST APPEAR TWICE: once in `extra` for the console line, and
		// once in the TAGS argument. Sentry does not index additional data, so an
		// issue-alert condition can only match the tag copy -- an alert built
		// against a marker that lives solely in `extra` is created successfully
		// and then never fires, which is indistinguishable from "the limiter never
		// failed". Asserting the literal merely appears somewhere passed while the
		// tags argument was entirely absent, which is how that shipped.
		const captureCall = balancedSlice(
			LIMITER_CODE,
			LIMITER_CODE.indexOf("(", LIMITER_CODE.indexOf("captureWebhookError(")),
			"(",
			")",
		);
		expect(
			(captureCall.match(/event: "rate_limit_error"/g) ?? []).length,
		).toBe(2);
		// ...and the parameter that carries it has to exist on the other side, AS A
		// TAG. Asserting the identifier "tags" appears somewhere is not enough:
		// rewriting captureWebhookError to fold the third argument into `extra`
		// keeps the word, keeps the marker count at 2, and silently restores the
		// cycle-1 defect where nothing is alertable.
		//
		// `{ tags }` ALONE IS ALSO NOT ENOUGH, and the earlier version of this
		// comment was wrong about why. It claimed the shorthand "only exists when
		// the object is spread at the top level" -- false: `{ tags }` is a
		// substring of `...(tags ? { tags } : {})` at ANY nesting depth, so the
		// optionality-preserving fold `extra: { ...extra, ...(tags ? { tags } : {}) }`
		// keeps it and the pin stayed green. Proven by mutation. What actually
		// distinguishes a tag from additional data is that `extra` is passed as a
		// bare shorthand rather than reopened as an object literal, so that is what
		// is asserted.
		expect(ERRORS_CODE).toContain("tags?: Record<string, string>");
		const captureBody = exportedBody(ERRORS_CODE, "captureWebhookError");
		// POSITIVE SHAPE, NOT A LIST OF REJECTED SPELLINGS. Three attempts at this
		// pin failed because each one named a form to forbid, and the next fold
		// simply used a different spelling: `{ tags }` survives nesting at any
		// depth, and `not.toMatch(/extra:\s*\{/)` catches only the brace form --
		// `Object.assign({}, extra, tags ? { tags } : {})`, or hoisting the object
		// into a const and passing `extra: ctx`, both slip past it while burying the
		// alert marker in un-indexed additional data. Pinning the one known-good
		// construction inverts that: every rewrite fails until someone updates this
		// line deliberately, which is the point.
		expect(captureBody).toMatch(
			/captureException\(\s*error,\s*\{\s*extra,\s*\.\.\.\(tags \? \{ tags \} : \{\}\),\s*\}\s*\)/,
		);

		expect(captureCall).not.toContain("bucketKey");
		// `\bkey\b` is safe here: bucket_key_prefix has no word boundary before
		// "key", so this forbids the raw key without forbidding the prefix field.
		expect(captureCall).not.toMatch(/\bkey\b/);
	});

	it("the rate_limit_hit log carries no raw client address either", () => {
		// The hit branch is the HIGH-VOLUME path and it used to log `key`, which is
		// `options.identifier ?? getClientIp(req)` -- a raw client address on four
		// of the five guarded surfaces, landing in a log stream whose retention has
		// nothing to do with the two-window bound the counters table is argued on.
		// The error branch already refused to do this; the assertion was only ever
		// written for that branch, so the noisier one went unchecked.
		const hitLog = balancedSlice(
			LIMITER_CODE,
			LIMITER_CODE.indexOf("{", LIMITER_CODE.indexOf('event: "rate_limit_hit"') - 200),
			"{",
			"}",
		);
		expect(hitLog).toContain("rate_limit_hit");
		// Mirrors the error-branch assertion: `bucketKey` is the in-scope variable
		// most likely to be reintroduced here, and `\bkey\b` does not match it.
		expect(hitLog).not.toContain("bucketKey");
		expect(hitLog).not.toMatch(/\bkey\b/);
	});

	it("getClientIp is unchanged: cf-connecting-ip first, LAST xff segment", () => {
		// 66.1-04 bolts a trusted-forwarding branch in FRONT of this body. Its
		// non-regression (D-05) is structural only while this body survives
		// untouched. Note the last-segment rule is the OPPOSITE of the Vercel-side
		// rule 66.1-04 adds, deliberately (RESEARCH pitfall 3): here the first
		// segment is attacker-controlled.
		const body = exportedBody(LIMITER_CODE, "getClientIp");

		expect(body.indexOf("cf-connecting-ip")).toBeGreaterThan(-1);
		expect(body.indexOf("cf-connecting-ip")).toBeLessThan(
			body.indexOf("x-forwarded-for"),
		);
		expect(body).toContain("parts.length - 1");
	});
});

describe("4. _shared/errors.ts -- the Sentry client is bound before it is used", () => {
	it("binds a client and guards against clobbering an existing one", () => {
		// The envelope destructure is what makes status-0 detectable at all: a
		// PostgrestError carries only { message, details, hint, code }, so reading
		// status off the error was always undefined and the transport-failure
		// signal was discarded. Pinned structurally because reverting it produces
		// no test failure elsewhere -- the decision still denies, just misclassified.
		expect(LIMITER_CODE).toContain("const { data, error, status }");
		expect(ERRORS_CODE).toContain("Sentry.init(");
		// stripe-webhooks/index.ts inits at module scope; without this guard a warm
		// isolate of the ONE function whose reporting already worked gets re-inited
		// on its first errorResponse.
		expect(ERRORS_CODE).toContain("getClient()");
	});

	it.each([
		"errorResponse",
		"captureWebhookError",
		"captureWebhookWarning",
		"logEvent",
	])("%s calls ensureSentryClient BEFORE it touches Sentry", (name) => {
		// An init that exists but is never reached transmits exactly as much as no
		// init at all. Wiring it into only one of the four entry points would make
		// monitoring depend on which path happens to fire first in a given isolate
		// -- a nondeterministic outage, which is worse than a deterministic one.
		// Hence per-function slices, not a file-wide index comparison.
		const body = exportedBody(ERRORS_CODE, name);
		const bindIndex = body.indexOf("ensureSentryClient()");
		const sentryIndex = body.search(/Sentry\.\w+\(/);

		expect(bindIndex).toBeGreaterThan(-1);
		expect(sentryIndex).toBeGreaterThan(-1);
		expect(bindIndex).toBeLessThan(sentryIndex);
	});

	it("reads the DSN with the env namespace directly, not through validateEnv", () => {
		// validateEnv caches on its first call across the whole isolate, keyed on
		// nothing. A call from this shared module would hand back some other
		// caller's map, or poison the cache for the function's own call and take
		// the isolate down on a required var this module never asked about.
		expect(ERRORS_CODE).toContain('Deno.env.get("SENTRY_DSN")');
		expect(ERRORS_CODE).not.toContain("validateEnv");
	});
});

// -----------------------------------------------------------------------------
// Section 5 -- RATE-03's trust matrix, EXECUTED.
//
// Every case below runs `decideForwardedClientIp` with the REAL
// `timingSafeEqualStr` injected. That file has zero imports and touches only
// `TextEncoder` and `crypto`, both of which exist in the Vitest runtime, so this
// is the production comparator rather than a stub.
//
// The reason this is executed rather than grepped: D5 has been attempted twice
// and BOTH attempts merged a passing test certifying a property the code did not
// have. A grep is the evidentiary standard that produced those two failures.
// -----------------------------------------------------------------------------

const CONFIGURED = "forward-secret-alpha";

function decide(input: Partial<ForwardedClientIpInput>) {
	return decideForwardedClientIp(
		{
			presentedSecret: null,
			forwardedIp: null,
			configuredSecret: null,
			...input,
		},
		timingSafeEqualStr,
	);
}

describe("5. decideForwardedClientIp -- the trust matrix, against the real comparator", () => {
	it("row 1: no secret on either side falls back to the connection address", () => {
		// The state this plan MERGES in. Until 66.1-05 provisions the secret, this
		// is every request, and `getClientIp` behaves exactly as it does today.
		const decision = decide({ forwardedIp: "203.0.113.9" });

		expect(decision.trusted).toBe(false);
		expect(decision.clientIp).toBeNull();
		expect(decision.reason).toBe("no_configured_secret");
	});

	it("row 2: configured here, absent on the caller -> untrusted", () => {
		// Supabase provisioned before Vercel. Fallback, not a partial state.
		const decision = decide({
			configuredSecret: CONFIGURED,
			forwardedIp: "203.0.113.9",
		});

		expect(decision.trusted).toBe(false);
		expect(decision.reason).toBe("no_presented_secret");
	});

	it("row 3: presented by the caller, absent here -> untrusted", () => {
		// Vercel provisioned before Supabase. The mirror of row 2, and the reason
		// rotation is safe in EITHER order.
		const decision = decide({
			presentedSecret: CONFIGURED,
			forwardedIp: "203.0.113.9",
		});

		expect(decision.trusted).toBe(false);
		expect(decision.reason).toBe("no_configured_secret");
	});

	it("row 4: a valid secret with a valid address IS trusted", () => {
		// The non-vacuity row. Without it every denial below is satisfied by a
		// mechanism that never grants anything -- which is a real failure mode, not
		// a hypothetical one: an inert trust boundary passes all six other rows.
		const decision = decide({
			configuredSecret: CONFIGURED,
			presentedSecret: CONFIGURED,
			forwardedIp: "203.0.113.9",
		});

		expect(decision.trusted).toBe(true);
		expect(decision.clientIp).toBe("203.0.113.9");
		expect(decision.reason).toBeNull();
	});

	it("row 5: a VALID secret with a malformed address is UNTRUSTED", () => {
		// The row that gets dropped. A verified secret does not buy the right to
		// inject an arbitrary rate-limit key: the shape check runs AFTER the
		// compare succeeds and still rejects (T-66.1-23). Collapse the two into
		// "the caller is trusted, so the value is fine" and `p_bucket_key` becomes
		// an attacker-authored string.
		const decision = decide({
			configuredSecret: CONFIGURED,
			presentedSecret: CONFIGURED,
			forwardedIp: "not-an-address",
		});

		expect(decision.trusted).toBe(false);
		expect(decision.clientIp).toBeNull();
		expect(decision.reason).toBe("malformed_address");
	});

	it("row 6: an INVALID secret with a well-formed address is UNTRUSTED", () => {
		// The security row: the comparison being skipped, inverted, or reduced to a
		// truthiness check on the header's presence all fail here.
		const decision = decide({
			configuredSecret: CONFIGURED,
			presentedSecret: "forward-secret-bravo",
			forwardedIp: "203.0.113.9",
		});

		expect(decision.trusted).toBe(false);
		expect(decision.reason).toBe("secret_mismatch");
	});

	it("row 7: TWO EMPTY SECRETS never grant trust", () => {
		// THE HIGHEST-SEVERITY ROW, and it is not in the obvious six. Two empty
		// strings are EQUAL to any comparator, so without the emptiness check
		// running BEFORE the compare, failing to configure the secret would make
		// the system more permissive than configuring it -- available to anyone who
		// sends two empty headers, and invisible to every other row here
		// (T-66.1-26). `send-lease-reminders` escapes this only because its secret
		// is `validateEnv({ required })`; D-05 makes this one optional by design,
		// so it cannot inherit that protection.
		const decision = decide({
			configuredSecret: "",
			presentedSecret: "",
			forwardedIp: "203.0.113.9",
		});

		expect(decision.trusted).toBe(false);
		expect(decision.reason).toBe("no_configured_secret");
	});

	it("row 8: a whitespace-only configured secret is treated as absent", () => {
		const decision = decide({
			configuredSecret: "   ",
			presentedSecret: "   ",
			forwardedIp: "203.0.113.9",
		});

		expect(decision.trusted).toBe(false);
		expect(decision.reason).toBe("no_configured_secret");
	});

	it("row 9: the literal fallback sentinel is malformed, not an address", () => {
		// `getClientIp` returns "unknown" when no header is present. If it survived
		// normalization, a forwarded "unknown" would collide with that shared
		// fallback bucket and let one caller drain everyone else's.
		const decision = decide({
			configuredSecret: CONFIGURED,
			presentedSecret: CONFIGURED,
			forwardedIp: "unknown",
		});

		expect(decision.reason).toBe("malformed_address");
	});

	it("row 10: a comma-separated list is malformed, in either direction", () => {
		// The forwarding side refuses to pick an end of a list; this side refuses
		// to accept one. Both directions of the wrong guess are eliminated by not
		// guessing (T-66.1-21).
		const decision = decide({
			configuredSecret: CONFIGURED,
			presentedSecret: CONFIGURED,
			forwardedIp: "203.0.113.9, 198.51.100.7",
		});

		expect(decision.reason).toBe("malformed_address");
	});

	it("row 11: IPv6 differing only in hex case normalizes to ONE bucket", () => {
		// Otherwise a client occupies two buckets by varying case and doubles their
		// quota without doing anything that looks like an attack.
		const upper = decide({
			configuredSecret: CONFIGURED,
			presentedSecret: CONFIGURED,
			forwardedIp: "2001:DB8::1",
		});
		const lower = decide({
			configuredSecret: CONFIGURED,
			presentedSecret: CONFIGURED,
			forwardedIp: "2001:db8::1",
		});

		expect(upper.trusted).toBe(true);
		expect(upper.clientIp).toBe("2001:db8::1");
		expect(upper.clientIp).toBe(lower.clientIp);
	});

	it.each([
		["a leading-zero octet", "010.0.0.1"],
		["an octet above 255", "203.0.113.300"],
	])("row 12: %s is malformed", (_label, forwardedIp) => {
		// A leading zero is octal to some parsers and decimal to others, so
		// accepting both spellings of one address is two buckets for one client.
		const decision = decide({
			configuredSecret: CONFIGURED,
			presentedSecret: CONFIGURED,
			forwardedIp,
		});

		expect(decision.reason).toBe("malformed_address");
	});

	it("row 13: a valid secret with NO address at all is untrusted", () => {
		// Not in the six, but it is the reason `no_forwarded_address` exists, and
		// the closure assertion below requires every declared reason be reachable.
		const decision = decide({
			configuredSecret: CONFIGURED,
			presentedSecret: CONFIGURED,
		});

		expect(decision.trusted).toBe(false);
		expect(decision.reason).toBe("no_forwarded_address");
	});
});

describe("5b. closure over the trust decision", () => {
	/**
	 * The whole space of inputs the matrix above constructs, in one list, so the
	 * two assertions below are statements about all of them rather than about the
	 * cases someone remembered to write.
	 */
	const INPUTS: Array<Partial<ForwardedClientIpInput>> = [
		{ forwardedIp: "203.0.113.9" },
		{ configuredSecret: CONFIGURED, forwardedIp: "203.0.113.9" },
		{ presentedSecret: CONFIGURED, forwardedIp: "203.0.113.9" },
		{ configuredSecret: CONFIGURED, presentedSecret: CONFIGURED },
		{
			configuredSecret: CONFIGURED,
			presentedSecret: "forward-secret-bravo",
			forwardedIp: "203.0.113.9",
		},
		{ configuredSecret: "", presentedSecret: "", forwardedIp: "203.0.113.9" },
		{
			// A secret provisioned with a trailing newline -- what a file-piped
			// `supabase secrets set`, a `vercel env add` from a file, or an ordinary
			// paste routinely produces. The wire strips it, the store keeps it, and
			// without the trim these byte-identical secrets never match: forwarding
			// falls back to the shared egress forever with no error anywhere.
			configuredSecret: `${CONFIGURED}\n`,
			presentedSecret: CONFIGURED,
			forwardedIp: "203.0.113.9",
		},
		{
			configuredSecret: "   ",
			presentedSecret: "   ",
			forwardedIp: "203.0.113.9",
		},
		{
			configuredSecret: CONFIGURED,
			presentedSecret: CONFIGURED,
			forwardedIp: "not-an-address",
		},
		{
			configuredSecret: CONFIGURED,
			presentedSecret: CONFIGURED,
			forwardedIp: "unknown",
		},
		{
			configuredSecret: CONFIGURED,
			presentedSecret: CONFIGURED,
			forwardedIp: "203.0.113.9, 198.51.100.7",
		},
		{
			configuredSecret: CONFIGURED,
			presentedSecret: CONFIGURED,
			forwardedIp: "010.0.0.1",
		},
		{
			configuredSecret: CONFIGURED,
			presentedSecret: CONFIGURED,
			forwardedIp: "203.0.113.9",
		},
		{
			configuredSecret: CONFIGURED,
			presentedSecret: CONFIGURED,
			forwardedIp: "2001:DB8::1",
		},
	];

	it("EXACTLY ONE input shape grants trust: non-empty configured, matching presented, normalizable address", () => {
		// Stated as an IFF over the whole set rather than as a count, so it is a
		// claim about the shape and not about how many rows happen to have it.
		// This is what stops a future reject reason being added with a trusting
		// default -- the `else` that quietly means "believe them".
		for (const input of INPUTS) {
			const grantingShape =
				typeof input.configuredSecret === "string" &&
				input.configuredSecret.trim().length > 0 &&
				// TRIMMED, because that is the implementation's rule since the Fetch
				// spec normalizes header values: the presented side arrives with
				// surrounding whitespace already stripped, so the compare trims the
				// configured side to match. An oracle encoding the pre-trim rule is
				// worse than no oracle -- it makes the covering row FAIL on correct
				// code, which is why the coverage gap was self-perpetuating.
				input.presentedSecret === input.configuredSecret.trim() &&
				normalizeForwardedIp(input.forwardedIp ?? null) !== null;

			expect(decide(input).trusted).toBe(grantingShape);
		}

		// Non-vacuity: the granting shape is actually present in the set.
		expect(INPUTS.some((input) => decide(input).trusted)).toBe(true);
	});

	it("every declared reject reason is reachable from a real input", () => {
		const produced = new Set(
			INPUTS.map((input) => decide(input).reason).filter(
				(reason): reason is ForwardRejectReason => reason !== null,
			),
		);

		for (const reason of FORWARD_REJECT_REASONS) {
			expect(produced.has(reason)).toBe(true);
		}
		// No reason declared that nothing can produce, and none produced that is
		// not declared.
		expect(produced.size).toBe(FORWARD_REJECT_REASONS.length);
	});

	it("a trusted decision always carries an address, and an untrusted one never does", () => {
		for (const input of INPUTS) {
			const decision = decide(input);
			if (decision.trusted) {
				expect(decision.clientIp).not.toBeNull();
				expect(decision.reason).toBeNull();
			} else {
				expect(decision.clientIp).toBeNull();
				expect(decision.reason).not.toBeNull();
			}
		}
	});
});

describe("5c. normalizeForwardedIp -- the key-shape bound", () => {
	it.each([
		["a dotted quad", "203.0.113.9", "203.0.113.9"],
		["an all-zero quad", "0.0.0.0", "0.0.0.0"],
		["a broadcast-shaped quad", "255.255.255.255", "255.255.255.255"],
		["a full IPv6", "2001:0db8:0000:0000:0000:ff00:0042:8329", "2001:0db8:0000:0000:0000:ff00:0042:8329"],
		["a compressed IPv6", "2001:db8::1", "2001:db8::1"],
		["the loopback", "::1", "::1"],
		["an IPv4-mapped IPv6", "::ffff:192.0.2.1", "::ffff:192.0.2.1"],
		["surrounding whitespace", "  203.0.113.9  ", "203.0.113.9"],
	])("accepts %s", (_label, raw, expected) => {
		expect(normalizeForwardedIp(raw)).toBe(expected);
	});

	it.each([
		["null", null],
		["undefined", undefined],
		["empty", ""],
		["whitespace only", "   "],
		["a sentinel", "unknown"],
		["a hostname", "attacker.example.com"],
		["a list", "203.0.113.9,198.51.100.7"],
		["an internal space", "203.0.113.9 198.51.100.7"],
		["a CRLF injection", "203.0.113.9\r\nX-Evil: 1"],
		["a leading-zero octet", "010.0.0.1"],
		["an out-of-range octet", "203.0.113.300"],
		["a three-octet quad", "203.0.113"],
		["a five-octet quad", "203.0.113.9.9"],
		["nine IPv6 groups", "1:2:3:4:5:6:7:8:9"],
		["seven uncompressed IPv6 groups", "1:2:3:4:5:6:7"],
		["two double colons", "2001::db8::1"],
		["an over-long hex group", "2001:db8::12345"],
		["a non-hex group", "2001:zzzz::1"],
		["an invalid IPv4 tail", "::ffff:999.0.2.1"],
		["a SQL-shaped string", "'; drop table x --"],
		["an over-length value", "2001:db8:0000:0000:0000:0000:0000:0001:0002:00034"],
	])("rejects %s", (_label, raw) => {
		expect(normalizeForwardedIp(raw)).toBeNull();
	});

	it("an 8-group IPv6 at the length bound is accepted, one character more is not", () => {
		// The bound is 45 characters -- the longest IPv6 textual form including an
		// IPv4-mapped tail.
		//
		// NOTE WHAT THIS DOES AND DOES NOT PIN. The reject case passes because the
		// 46-character string is not a valid address SHAPE, not because it exceeds
		// 45: the shape rules already bound a well-formed address at 45, so
		// MAX_FORWARDED_IP_LENGTH is an unreachable pre-filter on this side and
		// deleting it would not fail this test. It is pinned where it is load-
		// bearing -- apply-context.ts, which applies it before any shape check.
		const longest = "2001:0db8:0000:0000:0000:ffff:255.255.255.255";
		expect(longest).toHaveLength(45);
		expect(normalizeForwardedIp(longest)).toBe(longest);
		expect(normalizeForwardedIp(`${longest}0`)).toBeNull();
	});
});

// -----------------------------------------------------------------------------
// Section 6 -- RATE-03's Deno glue, pinned structurally.
//
// The logic above is executed; these pin the wiring around it, which Vitest
// cannot reach for the reasons section 3 states.
// -----------------------------------------------------------------------------

const CORS_SOURCE = readRepoSource("../_shared/cors.ts");

describe("6. RATE-03 wiring in _shared/rate-limit.ts", () => {
	it("getTrustedClientIp passes the REAL constant-time comparator", () => {
		// This is what keeps dependency injection from becoming the weakness. The
		// leaf accepts any comparator so that it can stay import-free, which means
		// a `===` here would pass every behavioural assertion in section 5 while
		// making the compare timing-variable (T-66.1-28).
		expect(LIMITER_CODE).toContain("export function getTrustedClientIp(");

		const callIndex = LIMITER_CODE.indexOf("decideForwardedClientIp(");
		expect(callIndex).toBeGreaterThan(-1);
		const call = balancedSlice(
			LIMITER_CODE,
			LIMITER_CODE.indexOf("(", callIndex),
			"(",
			")",
		);
		expect(call).toContain("timingSafeEqualStr");
	});

	it("reads both forwarding headers and the env var by their exact names", () => {
		// A rename on this side alone leaves both suites green and the mechanism
		// permanently inert; section 7 is what catches that. These pin the names
		// this side uses.
		expect(LIMITER_CODE).toContain('"x-tf-forward-secret"');
		expect(LIMITER_CODE).toContain('"x-tf-client-ip"');
		expect(LIMITER_CODE).toContain('Deno.env.get("CLIENT_IP_FORWARD_SECRET")');
	});

	it("getClientIp consults the forwarding branch FIRST, then falls into the untouched body", () => {
		// D-05's non-regression is structural only while the branch sits in FRONT
		// of the three-step body rather than being merged into it.
		const body = exportedBody(LIMITER_CODE, "getClientIp");

		expect(body.indexOf("getTrustedClientIp(")).toBeGreaterThan(-1);
		expect(body.indexOf("getTrustedClientIp(")).toBeLessThan(
			body.indexOf("cf-connecting-ip"),
		);
		// And the pre-existing three steps are still the three steps.
		expect(body.indexOf("cf-connecting-ip")).toBeLessThan(
			body.indexOf("x-forwarded-for"),
		);
		expect(body).toContain("parts.length - 1");
		expect(body).toContain('return "unknown"');
	});
});

describe("6b. _shared/cors.ts does not advertise the forwarding headers", () => {
	it("neither x-tf- header appears in the Access-Control-Allow-Headers VALUE", () => {
		// Asserted against the sliced value, not the file, so the comment
		// explaining the omission cannot fail the gate it exists to explain.
		//
		// What the omission buys is narrow and worth stating: CORS cannot stop a
		// non-browser client from sending any header, so the secret is the control.
		// What it prevents is the allowlist ADVERTISING these as legitimate
		// client-supplied input, which is how someone later concludes they are safe
		// to trust from a browser (T-66.1-30).
		const value = /"Access-Control-Allow-Headers":\s*("(?:[^"\\]|\\.)*")/.exec(
			CORS_SOURCE,
		)?.[1];

		expect(value).toBeDefined();
		expect(value).toContain("content-type");
		expect(value).not.toContain("x-tf-");
	});

	it("the omission is recorded in the file, so it reads as deliberate", () => {
		expect(CORS_SOURCE).toContain("x-tf-client-ip");
		expect(CORS_SOURCE).toContain("x-tf-forward-secret");
	});
});

describe("6c. _shared/timing-safe.ts claims only what has been established", () => {
	const TIMING_SAFE_SOURCE = readRepoSource("../_shared/timing-safe.ts");

	it("records which branch executes as UNVERIFIED, and asserts neither", () => {
		// The `errors.ts` failure in miniature is what this guards against: a
		// confident sentence over an unchecked claim -- the one asserting graceful
		// behaviour without a DSN -- is why 16 functions went unmonitored for
		// months. Trading that claim for its opposite ("the shim never runs")
		// would be exactly as unevidenced: the extension is real, Deno documents
		// it, and workerd implements it.
		// EITHER the open question OR a recorded measurement. Pinning only the
		// former makes answering it a test failure, so the gate that exists to stop
		// an unverified claim being asserted would instead have blocked the
		// verification from ever being written down.
		expect(TIMING_SAFE_SOURCE).toMatch(
			/has not been verified|MEASURED ON SUPABASE/,
		);
		expect(TIMING_SAFE_SOURCE).toMatch(/w3c\/webcrypto#270/);
	});

	it("still feature-detects and still compares in constant time", () => {
		// No code changed in that file, and none should: both branches are
		// constant-time, so the function is correct whichever one runs.
		expect(TIMING_SAFE_SOURCE).toContain("subtle.timingSafeEqual");
		expect(TIMING_SAFE_SOURCE).toContain("d |= (ab[i] ?? 0) ^ (bb[i] ?? 0)");
		expect(TIMING_SAFE_SOURCE).toContain("if (ab.length !== bb.length) return false;");
	});
});

// -----------------------------------------------------------------------------
// Section 7 -- THE ONLY TEST IN THIS REPO THAT FAILS WHEN THE TWO HALVES OF THE
// TRUST BOUNDARY DRIFT APART.
//
// Rename `x-tf-client-ip` on ONE side and nothing else breaks: the Vercel suite
// still passes because it asserts against its own constant, section 6 above
// still passes because it asserts against its own literal, and the mechanism is
// permanently inert with no failing test anywhere in the repo (T-66.1-27). Drift
// here is silent BY CONSTRUCTION -- a Next.js module and a Deno module cannot
// share a constant -- so the literals have to be compared across the two files.
// -----------------------------------------------------------------------------

const APPLY_CONTEXT_SOURCE = readRepoSource(
	"../../../src/app/apply/[token]/apply-context.ts",
);
/**
 * Comment-stripped, for the literal-drift gate only.
 *
 * Both forms are needed and they are not interchangeable: the drift gate must
 * NOT be satisfiable by a literal that survives only in prose, while the
 * cross-file naming test below asserts on comments by design -- each file
 * explains its opposite rule by pointing at the other. Stripping comments for
 * both breaks the naming test; stripping for neither lets a commented-out
 * header name keep the drift gate green.
 */
const APPLY_CONTEXT_CODE = stripComments(APPLY_CONTEXT_SOURCE);

describe("7. the Vercel side and the Supabase side agree", () => {
	it.each(["x-tf-client-ip", "x-tf-forward-secret", "CLIENT_IP_FORWARD_SECRET"])(
		"%s appears in BOTH files",
		(literal) => {
			// BOUNDARY-ANCHORED, because a bare substring match cannot catch the
			// rename this gate exists to catch: renaming the header to
			// "x-tf-client-ip-2" on one side only still contains "x-tf-client-ip",
			// so both sides would look in agreement while the handshake was broken.
			// The sources are comment-stripped so a literal surviving only in prose
			// cannot satisfy it either.
			const bounded = new RegExp(
				`${literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`,
			);
			expect(LIMITER_CODE).toMatch(bounded);
			expect(APPLY_CONTEXT_CODE).toMatch(bounded);
		},
	);

	it("each file names the other, so the opposite-rule comments cannot be split apart", () => {
		// The two hops take OPPOSITE rules on the same header name, and each file
		// explains why by pointing at the other. A rename that breaks the pointer
		// leaves two half-explanations, which is how a reviewer "reconciles" them
		// and reopens the bypass.
		expect(readRepoSource("../_shared/rate-limit.ts")).toContain(
			"apply-context.ts",
		);
		expect(APPLY_CONTEXT_SOURCE).toContain("rate-limit.ts");
	});

	it("only the Vercel side reads the platform-attested header", () => {
		// Different attestation at the two hops: Vercel overwrites the conventional
		// forwarding header to prevent spoofing, while the Supabase gateway appends
		// to it. The two must not converge on one header name, so the attested one
		// appears on the Vercel side ALONE -- including in comments, which is why
		// `rate-limit.ts` names that header as a concept and never as a literal.
		expect(APPLY_CONTEXT_SOURCE).toContain("x-vercel-forwarded-for");
		expect(readRepoSource("../_shared/rate-limit.ts")).not.toContain(
			"x-vercel-forwarded-for",
		);
	});

	it("the Vercel side refuses x-real-ip and refuses a multi-segment value", () => {
		// Both are "looks like a decision, is actually a coin flip" traps: x-real-ip
		// is documented as merely identical to the conventional header, and a
		// comma-separated value contradicts the documented single-address contract
		// in whichever direction one guesses.
		// COMMENT-STRIPPED AND ACCESSOR-FREE. The raw source mentions x-real-ip only
		// inside a block comment explaining why it is refused, so the un-stripped
		// assertion was satisfied by prose; and pinning the `get("...")` accessor
		// means the gate cannot fire for the way this file actually reads headers.
		expect(APPLY_CONTEXT_CODE).not.toContain("x-real-ip");
		expect(APPLY_CONTEXT_SOURCE).toContain('value.includes(",")');
	});
});
