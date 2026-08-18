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
	decideRateLimit,
	ERROR_RETRY_AFTER_CAP_SEC,
	RATE_LIMIT_ERROR_CLASSES,
	type RateLimitErrorClass,
	type RateLimitRpcOutcome,
} from "../_shared/rate-limit-decision";

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

/** Every `catch (...) { ... }` block body in a module, braces included. */
function catchBlocks(code: string): string[] {
	const blocks: string[] = [];
	for (const match of code.matchAll(/catch\s*\(/g)) {
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

		const captureCall = LIMITER_CODE.slice(
			LIMITER_CODE.indexOf("captureWebhookError("),
		);
		expect(captureCall).not.toContain("bucketKey");
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
