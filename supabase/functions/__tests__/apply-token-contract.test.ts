/**
 * APPLY-02 — `apply-token` source and deploy-config drift guard.
 *
 * WHAT THIS FILE PROVES. Properties that a read of the source text can genuinely
 * establish: that `supabase/config.toml` declares the function public with the
 * project-wide import map, that the file carries none of the CLAUDE.md
 * zero-tolerance patterns, that it imports no mail module and builds no HTML,
 * that the submit branch runs its checks in the order the design requires, and
 * that the token-hash rate-limit key is confined to the context action.
 *
 * WHAT IT DOES NOT PROVE. It never executes the function. It is a Vitest test
 * running in Node: the edge function imports `../_shared/*.ts` with explicit
 * extensions and calls `Deno.serve`, so it cannot be imported here at all —
 * hence the disk read, exactly as `premium-report-gate.test.ts` does for
 * `export-report` and `generate-pdf`. Nothing below can tell you that the
 * honeypot actually drops a submission, that the caps actually hold under
 * concurrency, or that a real browser can reach the endpoint.
 *
 * WHERE THE BEHAVIOURAL COVERAGE LIVES:
 *   - `application-guards.test.ts` (this directory) exercises the honeypot, the
 *     timing filter and the strict payload validator for real, by importing
 *     them. That module is a dependency-free leaf precisely so it can be.
 *   - Plan 66-10's RLS integration suites hit production and pin the
 *     anon-denial boundary and the fail-closed caps under parallel load.
 *   - Plan 66-17's Playwright specs drive the rendered form.
 *   - Plan 66-08 deploys the function and proves the four properties only a
 *     deployed function can demonstrate. This plan deliberately does not deploy.
 *
 * WHY THE PARSERS BALANCE DELIMITERS RATHER THAN GREPPING. A whole-file grep
 * answers "does this token appear somewhere", which is the wrong question for
 * every assertion here. `verify_jwt = false` appears in fourteen other
 * `config.toml` blocks; `identifier:` is CORRECT in the context action and a
 * denial-of-service bug in the submit action (D-04b). Both assertions are only
 * meaningful against an isolated slice, so every one below slices first.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readRepoSource(relativePath: string): string {
	return readFileSync(
		fileURLToPath(new URL(relativePath, import.meta.url)),
		"utf8",
	);
}

const FUNCTION_SOURCE = readRepoSource("../apply-token/index.ts");
const CONFIG_SOURCE = readRepoSource("../../config.toml");

/**
 * Comments carry the words this file asserts on — "Rate limit", the D-04b
 * warning that names the very override it forbids, the `/apply/<token>` URL —
 * so ordering and absence assertions run against the code alone. Safe here
 * because every comment in the function occupies its own line and no string
 * literal in it contains `//`.
 */
function stripComments(source: string): string {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/^[ \t]*\/\/.*$/gm, "");
}

const CODE = stripComments(FUNCTION_SOURCE);

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

/** The body of one function declaration, braces included. */
function extractBody(
	source: string,
	declaration: string,
	returnMarker: string,
): string {
	const declarationIndex = source.indexOf(declaration);
	if (declarationIndex === -1) {
		throw new Error(
			`\`${declaration}\` not found in apply-token/index.ts — it may have been renamed or removed. Inspect the function before editing this parser.`,
		);
	}
	const markerIndex = source.indexOf(returnMarker, declarationIndex);
	if (markerIndex === -1) {
		throw new Error(
			`\`${declaration}\` no longer returns via \`${returnMarker}\`.`,
		);
	}
	return balancedSlice(source, markerIndex + returnMarker.length - 1, "{", "}");
}

/** One `callee(` invocation, selected by a string appearing inside its args. */
function extractCallContaining(
	source: string,
	needle: string,
	callee: string,
): string {
	const needleIndex = source.indexOf(needle);
	if (needleIndex === -1) {
		throw new Error(`\`${needle}\` not found — no call to inspect.`);
	}
	const calleeIndex = source.lastIndexOf(callee, needleIndex);
	if (calleeIndex === -1) {
		throw new Error(`\`${needle}\` is not inside a \`${callee}\` call.`);
	}
	return balancedSlice(source, calleeIndex + callee.length - 1, "(", ")");
}

/** Every object literal passed to `jsonOk`, in source order. */
function jsonOkPayloads(body: string): string[] {
	const needle = "jsonOk(req, {";
	const payloads: string[] = [];
	let from = 0;
	for (;;) {
		const index = body.indexOf(needle, from);
		if (index === -1) return payloads;
		payloads.push(balancedSlice(body, index + needle.length - 1, "{", "}"));
		from = index + needle.length;
	}
}

/**
 * A `config.toml` block: everything from the header to the next line-initial
 * `[`. Slicing is the whole point — see the header note.
 */
function tomlBlock(source: string, header: string): string {
	const headerIndex = source.indexOf(`${header}\n`);
	if (headerIndex === -1) {
		throw new Error(`${header} is not declared in supabase/config.toml.`);
	}
	const afterHeader = source.slice(headerIndex + header.length + 1);
	const nextHeaderOffset = afterHeader.search(/^\[/m);
	return nextHeaderOffset === -1
		? afterHeader
		: afterHeader.slice(0, nextHeaderOffset);
}

const CONTEXT_BODY = extractBody(
	CODE,
	"async function handleContext(",
	"): Promise<Response> {",
);
const SUBMIT_BODY = extractBody(
	CODE,
	"async function handleSubmit(",
	"): Promise<Response> {",
);
const JSON_OK_BODY = extractBody(CODE, "function jsonOk(", "): Response {");
const SERVE_BODY = balancedSlice(
	CODE,
	CODE.indexOf("Deno.serve(async (req: Request) => {") +
		"Deno.serve(async (req: Request) => {".length -
		1,
	"{",
	"}",
);

describe("the parsers are not vacuous", () => {
	it("stripComments removes prose and keeps code", () => {
		expect(FUNCTION_SOURCE).toContain("THE WRITE SURFACE BECOMES DIRECTLY");
		expect(CODE).not.toContain("THE WRITE SURFACE BECOMES DIRECTLY");
		expect(CODE).toContain("Deno.serve(");
		expect(CODE).toContain("submit_rental_application");
	});

	it("every extracted body is non-empty and contains its own anchor", () => {
		expect(CONTEXT_BODY).toContain("get_application_context");
		expect(SUBMIT_BODY).toContain("submit_rental_application");
		expect(JSON_OK_BODY).toContain("JSON.stringify");
		expect(SERVE_BODY).toContain("handleCorsOptions");
	});

	it("the bodies are disjoint slices, not the whole file", () => {
		expect(CONTEXT_BODY).not.toContain("submit_rental_application");
		expect(SUBMIT_BODY).not.toContain("get_application_context");
		expect(CONTEXT_BODY.length).toBeLessThan(CODE.length);
		expect(SUBMIT_BODY.length).toBeLessThan(CODE.length);
	});
});

describe("1. supabase/config.toml declares the function public", () => {
	const block = tomlBlock(CONFIG_SOURCE, "[functions.apply-token]");

	it("carries verify_jwt = false inside its own block", () => {
		expect(block).toContain("verify_jwt = false");
	});

	it("carries the project-wide import map inside its own block", () => {
		// Without this line the deploy fails with `Relative import path
		// "@sentry/deno" not prefixed with / or ./ or ../` — every function
		// transitively imports it through _shared/errors.ts (T-66-29).
		expect(block).toContain('import_map = "./functions/deno.json"');
	});

	it("the slice stops at the next block", () => {
		expect(block).not.toContain("[functions.");
		expect(block).not.toContain("[edge_runtime]");
	});

	it("the slicer really isolates — a block WITHOUT verify_jwt reads as such", () => {
		// download-documents-zip is the one function deployed with the platform
		// gate ON, so its block has no verify_jwt line. If the slicer leaked into
		// neighbouring blocks this would find one and fail, which is what makes
		// the two assertions above mean something.
		const gated = tomlBlock(CONFIG_SOURCE, "[functions.download-documents-zip]");
		expect(gated).toContain('import_map = "./functions/deno.json"');
		expect(gated).not.toContain("verify_jwt");
	});

	it("throws for a header that is not there rather than returning nothing", () => {
		expect(() => tomlBlock(CONFIG_SOURCE, "[functions.no-such-fn]")).toThrow();
	});
});

describe("2. CLAUDE.md zero-tolerance patterns", () => {
	it("uses no `any`", () => {
		expect(FUNCTION_SOURCE).not.toContain(": any");
		expect(FUNCTION_SOURCE).not.toContain("<any>");
	});

	it("uses no double assertion", () => {
		expect(FUNCTION_SOURCE).not.toContain("as unknown as");
	});

	it("never reads a raw error message anywhere", () => {
		// Stricter than "not inside a Response body", deliberately: whether a
		// given expression reaches a response is not decidable from source text,
		// and the file has no legitimate need for either property. errorResponse
		// already logs the real detail to Sentry and the structured console.
		expect(FUNCTION_SOURCE).not.toContain("err.message");
		expect(FUNCTION_SOURCE).not.toContain("error.message");
	});

	it("hashes in Deno and never asks SQL to hash", () => {
		// D-15: pgcrypto is in the `extensions` schema on this project, so a
		// SECURITY DEFINER function pinned to search_path=public cannot reach it.
		expect(FUNCTION_SOURCE).toContain("sha256Hex(");
		expect(FUNCTION_SOURCE).not.toContain("digest(");
	});
});

describe("3. D-10: no mail, and no HTML surface", () => {
	it("imports no mail module", () => {
		const specifiers = [...FUNCTION_SOURCE.matchAll(/from\s+"([^"]+)"/g)]
			.map((match) => match[1])
			.filter((value): value is string => value !== undefined);
		expect(specifiers.length).toBeGreaterThan(0);
		for (const specifier of specifiers) {
			expect(specifier).not.toMatch(/resend/i);
		}
		// The applicant is never emailed at any point (D-10) — not a receipt, not
		// a status update, and specifically not an approve/reject notice, because
		// a platform-sent outcome is adverse-action-shaped communication from a
		// party that takes no adverse action.
		expect(FUNCTION_SOURCE).not.toMatch(/resend/i);
	});

	it("constructs no HTML", () => {
		expect(FUNCTION_SOURCE).not.toContain("dangerouslySetInnerHTML");
		expect(FUNCTION_SOURCE).not.toContain("innerHTML");
		const templateLiterals = [...CODE.matchAll(/`[^`]*`/g)].map(
			(match) => match[0],
		);
		for (const literal of templateLiterals) {
			// escapeHtml is not imported precisely because there is nothing to
			// escape. The moment a template literal here grows a tag, that stops
			// being true and this assertion is the thing that says so.
			expect(literal).not.toContain("<");
		}
	});
});

describe("4. the submit branch runs its checks in the required order", () => {
	const honeypotIndex = SUBMIT_BODY.indexOf("isHoneypotTripped(");
	const timingIndex = SUBMIT_BODY.indexOf("isTimingSuspicious(");
	const limitIndex = SUBMIT_BODY.indexOf("rateLimit(");
	const payloadIndex = SUBMIT_BODY.indexOf("parseSubmissionPayload(");
	const rpcIndex = SUBMIT_BODY.indexOf("submit_rental_application");

	it("every step is present", () => {
		for (const index of [
			honeypotIndex,
			timingIndex,
			limitIndex,
			payloadIndex,
			rpcIndex,
		]) {
			expect(index).toBeGreaterThan(-1);
		}
	});

	it("the bot filters run BEFORE the limiter", () => {
		// Order, not presence. A bot flood should cost one string comparison, not
		// a database round trip per request — a presence-only test passes with
		// these in any sequence. Since 66.1-03 the limiter is Postgres-backed, so
		// the round trip it saves is a write against `rate_limit_counters`.
		expect(honeypotIndex).toBeLessThan(limitIndex);
		expect(timingIndex).toBeLessThan(limitIndex);
	});

	it("the limiter runs before validation, which runs before the write", () => {
		expect(limitIndex).toBeLessThan(payloadIndex);
		expect(payloadIndex).toBeLessThan(rpcIndex);
	});

	it("both bot filters answer with an ordinary success", () => {
		// A 400, or any body that differs from the happy path, teaches a bot which
		// layer caught it. Zero rows are written either way.
		const honeypotBranch = SUBMIT_BODY.slice(honeypotIndex, timingIndex);
		const timingBranch = SUBMIT_BODY.slice(timingIndex, limitIndex);
		for (const branch of [honeypotBranch, timingBranch]) {
			expect(branch).toContain("success: true");
			expect(branch).not.toContain("400");
			expect(branch).not.toContain("reason");
		}
	});

	/**
	 * THE SILENT 200 STAYS; THE SILENCE TOWARD US DOES NOT.
	 *
	 * Both filters above are heuristics over client-supplied values and both
	 * answer success while writing zero rows, so a false positive destroys a real
	 * 26-field application and tells the applicant it worked. Until these logs
	 * existed the ONLY observable drop in the whole submit path was the payload
	 * branch, which means the false-positive rate of the two filters that answer
	 * success was not a number anyone could look up in Supabase logs or Sentry.
	 */
	it("every silent-drop branch logs, so the false-positive rate is observable", () => {
		const honeypotBranch = SUBMIT_BODY.slice(honeypotIndex, timingIndex);
		const timingBranch = SUBMIT_BODY.slice(timingIndex, limitIndex);
		const payloadBranch = SUBMIT_BODY.slice(payloadIndex, rpcIndex);

		// The payload branch is the positive control: it always logged, so if this
		// matcher can miss a log line the two assertions after it mean nothing.
		expect(payloadBranch).toMatch(/logSilentDrop\(|console\.log\(/);
		expect(honeypotBranch).toMatch(/logSilentDrop\(|console\.log\(/);
		expect(timingBranch).toMatch(/logSilentDrop\(|console\.log\(/);
	});

	it("the timing filter compares one clock against itself", () => {
		// `form_loaded_at` carries the `issued_at` the context action minted from
		// THIS server's clock. Comparing a browser's `Date.now()` against the
		// server's makes elapsed the real time plus the device's clock offset, so a
		// phone running fast fails every submission it will ever make — silently,
		// behind a confirmation screen. The stamp has to be minted here.
		expect(CONTEXT_BODY).toContain("issued_at: Date.now()");

		const timingCall = extractCallContaining(
			SUBMIT_BODY,
			"body.form_loaded_at",
			"isTimingSuspicious(",
		);
		expect(timingCall).toContain("body.form_loaded_at");
		// Not `Date.now()` inline: the same reading is logged alongside the stamp
		// on a drop, which is only possible if it is named.
		expect(timingCall).not.toContain("Date.now()");
	});

	it("the payload rejection does not name the offending field to the client", () => {
		const rejection = SUBMIT_BODY.slice(payloadIndex, rpcIndex);
		expect(rejection).toContain('reason: "invalid_payload"');
		const clientPayloads = jsonOkPayloads(rejection);
		expect(clientPayloads.length).toBeGreaterThan(0);
		for (const payload of clientPayloads) {
			expect(payload).not.toContain("parsed.field");
			expect(payload).not.toContain("parsed.reason");
		}
	});

	it("only contract keys reach the database", () => {
		// parsed.value, never the raw body: the strict validator's whole purpose
		// is that an unknown key (an SSN, say) is rejected rather than forwarded.
		expect(SUBMIT_BODY).toContain("p_payload: parsed.value");
		expect(SUBMIT_BODY).not.toContain("p_payload: body");
	});
});

describe("4b. D-04b: the token-hash limit key is confined to the context action", () => {
	const submitLimitCall = extractCallContaining(
		SUBMIT_BODY,
		'prefix: "apply-submit"',
		"rateLimit(",
	);
	const contextLimitCall = extractCallContaining(
		CONTEXT_BODY,
		'prefix: "apply-context"',
		"rateLimit(",
	);

	it("the extractor can see a key override when one is there", () => {
		// The non-vacuity pair for the assertions below. If this ever fails, the
		// negative one below has stopped meaning anything.
		expect(contextLimitCall).toContain("identifier:");
	});

	it("the context bucket is a per-listing capacity ceiling, not a per-caller gate", () => {
		// THIS ASSERTION HAS NOW BEEN WRONG TWICE, IN OPPOSITE DIRECTIONS, AND THAT
		// IS THE POINT OF THE COMMENT.
		//
		// v1 pinned the literal `identifier: tokenHash` — written to match the code,
		// so it certified a public kill switch: the token is PUBLISHED under D-03a,
		// so a token-only bucket is shared with the entire internet.
		//
		// v2 pinned `${tokenHash}:${getClientIp(req)}` and asserted that the address
		// component confined an attacker to their own bucket. Also false. The
		// context action runs ONLY server-side (`apply-context.ts` is not a client
		// module; the page is force-dynamic and fetched no-store), so
		// `getClientIp(req)` is the Next.js EGRESS for all genuine traffic — and an
		// attacker reaches that same bucket just by GETting the public page. The
		// address component is free to them.
		//
		// The general result THOSE TWO ESTABLISHED: an attacker and an applicant are
		// indistinguishable at this function. No key it could compute separated
		// them, so no configuration of this limiter mitigated T-66-06.
		//
		// v3 — RATE-03 — DOES NOT MAKE THAT RESULT WRONG; IT CHANGES THE INPUT IT
		// WAS ABOUT. The result held while the only address available here was the
		// shared egress. `getTrustedClientIp` now supplies an address minted one
		// hop earlier, at Vercel, under a constant-time-verified shared secret, so
		// the function CAN compute a separating key and the general result no
		// longer holds. The bucket that consumes it is gated on verification
		// precisely so the old result stays true whenever verification is
		// unavailable — which is every request until 66.1-05 provisions the secret.
		// Per-client limiting in `src/proxy.ts` or a WAF is now a complement, not
		// the only possible home for it.
		//
		// So this bucket is a CAPACITY ceiling per listing, and the property worth
		// pinning is that it is sized above organic traffic rather than into it. A
		// widely-shared listing plus link-preview crawlers can exceed 60/min on its
		// own; locking an applicant out of the form is worse than the database load
		// it would have prevented.
		expect(contextLimitCall).toContain('prefix: "apply-context"');
		expect(contextLimitCall).toContain("identifier: tokenHash");

		// The ceiling must stay far above organic. Parsed, not string-matched, so
		// this fails if someone tightens it back toward the lockout range.
		const maxRequests = Number(
			/maxRequests:\s*([\d_]+)/.exec(contextLimitCall)?.[1]?.replace(/_/g, ""),
		);
		expect(maxRequests).toBeGreaterThanOrEqual(1000);

		// The address-only ceiling must not come back. Keyed on the shared egress it
		// was a single product-wide cap across every listing, needing no token.
		expect(CODE).not.toContain('prefix: "apply-context-ip"');
	});

	it("the submit bucket keys on the client address, with no override", () => {
		// D-04b. Under D-01 every applicant for a unit shares ONE token, so a
		// token-keyed submit bucket lets a single applicant deny service to every
		// other applicant for that unit. It is a one-line copy from
		// sign-lease-token/index.ts:142, where the same line is correct.
		expect(submitLimitCall).toContain('prefix: "apply-submit"');
		expect(submitLimitCall).toContain("maxRequests: 5");
		expect(submitLimitCall).not.toContain("identifier");
	});

	const clientLimitCall = extractCallContaining(
		CONTEXT_BODY,
		'prefix: "apply-context-client"',
		"rateLimit(",
	);

	it("RATE-03: a per-client bucket exists, keyed on the VERIFIED address", () => {
		// Without a consumer, RATE-03 would merge as a green plan that changes no
		// observable behaviour anywhere: a trust boundary built, tested, documented
		// and read by nothing. That is the third shape of the D5 failure, not a
		// smaller version of the feature.
		expect(clientLimitCall).toContain('prefix: "apply-context-client"');
		expect(clientLimitCall).toContain("maxRequests: 60");
		expect(clientLimitCall).toContain("windowMs: 60_000");
		expect(clientLimitCall).toContain("identifier: trustedIp");
		// A 429 THAT IS COMPUTED AND DISCARDED IS NOT A LIMITER. The slice above
		// covers the rateLimit ARGUMENT LIST only, so deleting the line that
		// returns the response leaves this file fully green while the bucket still
		// issues its RPC and still increments rate_limit_counters -- a limiter that
		// exists, is correctly keyed, is gated on verification, and enforces
		// nothing. All three call sites in this function share the gap.
		expect(CODE).toContain("if (clientLimited) return clientLimited;");
		expect(CODE).toContain("if (tokenLimited) return tokenLimited;");
		expect(CODE).toContain("if (limited) return limited;");
	});

	it("RATE-03: and it is GATED on verification — the property worth pinning", () => {
		// Its CONDITIONALITY matters more than its existence. Ungated, this bucket
		// keys on the Vercel egress for 100% of genuine traffic and becomes a
		// product-wide 60/min cap on every apply page load the moment it merges —
		// the exact defect that got the 300/60s ceiling removed, reintroduced with
		// a smaller number.
		const gateIndex = CONTEXT_BODY.indexOf("getTrustedClientIp(");
		const callIndex = CONTEXT_BODY.indexOf('prefix: "apply-context-client"');

		expect(gateIndex).toBeGreaterThan(-1);
		expect(gateIndex).toBeLessThan(callIndex);

		// A truthiness check on the returned value stands between them.
		const between = CONTEXT_BODY.slice(gateIndex, callIndex);
		expect(between).toMatch(/if\s*\(\s*trustedIp\s*\)/);
	});

	it("RATE-03: the per-client bucket runs BEFORE the per-listing ceiling", () => {
		// The more precise control first: a client over their own limit is told so
		// before they consume the listing's shared capacity.
		expect(CONTEXT_BODY.indexOf('prefix: "apply-context-client"')).toBeLessThan(
			CONTEXT_BODY.indexOf('prefix: "apply-context"'),
		);
	});

	it("RATE-03: the aggregate ceiling was JOINED, not replaced", () => {
		// N distinct clients each under their own limit still sum to N times the
		// load. The tokenHash ceiling is the only thing that bounds the sum, so
		// adding the per-client bucket must not have quietly taken its place.
		expect(contextLimitCall).toContain("identifier: tokenHash");
		expect(contextLimitCall).toContain("maxRequests: 3_000");
		// And the two are genuinely different calls, not one call read twice.
		expect(clientLimitCall).not.toBe(contextLimitCall);
	});

	it("exactly one action carries a token-derived limit key, and it is context", () => {
		// The token component must appear ONCE and only on the context action. On
		// submit it would recreate the per-unit lockout D-04b/F-5 forbid: that
		// request comes from the applicant's own browser, so the address is real
		// and is the correct key there.
		const tokenKeyed = [...CODE.matchAll(/identifier: tokenHash\b/g)];
		expect(tokenKeyed.length).toBe(1);
		expect(CONTEXT_BODY).toContain("identifier: tokenHash");
		expect(SUBMIT_BODY).not.toContain("identifier");
	});
});

describe("5. Deno requires explicit import extensions", () => {
	it("every _shared specifier ends in .ts", () => {
		// An extensionless specifier resolves fine in the editor and fails only at
		// deploy time, which is the worst possible moment to learn about it.
		const shared = [...FUNCTION_SOURCE.matchAll(/from\s+"(\.\.\/_shared\/[^"]+)"/g)]
			.map((match) => match[1])
			.filter((value): value is string => value !== undefined);
		expect(shared.length).toBeGreaterThanOrEqual(6);
		for (const specifier of shared) {
			expect(specifier).toMatch(/\.ts$/);
		}
	});

	it("the guards module is imported rather than reimplemented", () => {
		expect(FUNCTION_SOURCE).toContain(
			'} from "../_shared/application-guards.ts"',
		);
		expect(FUNCTION_SOURCE).toContain("HONEYPOT_FIELD");
		// The honeypot field name is read from the shared constant, never spelled
		// out here, so the form and the server cannot drift apart.
		expect(FUNCTION_SOURCE).not.toContain('"company_website"');
	});
});

describe("6. the handler's own structure", () => {
	it("handles the CORS preflight before anything that can throw", () => {
		// A preflight handled after validateEnv fails whenever an env var is
		// missing, turning a config problem into a CORS problem the browser
		// reports as an opaque failure.
		const corsIndex = SERVE_BODY.indexOf("handleCorsOptions(req)");
		expect(corsIndex).toBeGreaterThan(-1);
		expect(SERVE_BODY.indexOf("validateEnv(")).toBeGreaterThan(corsIndex);
		expect(SERVE_BODY.indexOf("req.json(")).toBeGreaterThan(corsIndex);
	});

	it("calls validateEnv inside Deno.serve, exactly once", () => {
		// A module-level env read runs at import and kills the whole isolate.
		expect([...CODE.matchAll(/validateEnv\(/g)].length).toBe(1);
		expect(SERVE_BODY).toContain("validateEnv(");
	});

	it("requires the service role and declares no dead limiter vars", () => {
		// THE DEAD VARS ARE NOW GONE, AND THIS ASSERTION IS INVERTED ON PURPOSE.
		// The previous version located the validateEnv call by searching for
		// "UPSTASH_REDIS_REST_URL" and asserted the two dead optional vars were
		// still declared -- correct while 66.1-03 was forbidden from touching any
		// `*/index.ts` (D-03), but it would have kept passing forever afterwards
		// by pinning the very staleness it was waiting to see removed.
		//
		// 66.1-05 removed them. So the anchor moved to a var that is genuinely
		// load-bearing, and the assertion now demands ABSENCE. If someone
		// reintroduces an external key-value limiter binding, this fails.
		const envCall = extractCallContaining(
			SERVE_BODY,
			"SUPABASE_SERVICE_ROLE_KEY",
			"validateEnv(",
		);
		const required = balancedSlice(
			envCall,
			envCall.indexOf("required: [") + "required: [".length - 1,
			"[",
			"]",
		);
		expect(required).toContain("SUPABASE_SERVICE_ROLE_KEY");
		expect(required).toContain("NEXT_PUBLIC_APP_URL");
		// The limiter reads its own env and does NOT share this function's client:
		// getRateLimitClient() builds and caches a separate admin client from
		// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, and reads
		// CLIENT_IP_FORWARD_SECRET; _shared/errors.ts reads SENTRY_DSN. All go
		// through Deno.env.get directly rather than validateEnv, because env.ts
		// caches isolate-wide on its first call.
		expect(envCall.toUpperCase()).not.toContain("UPSTASH");
		expect(envCall).not.toContain("REDIS");
		// SCOPED TO THE WHOLE HANDLER, NOT JUST THE validateEnv ARGUMENTS.
		// The two assertions above only inspect the balanced slice of the
		// `validateEnv(` call, so a `Deno.env.get("UPSTASH_REDIS_REST_URL")`
		// anywhere else in the function -- or an import of an external limiter
		// client -- would pass them while reintroducing exactly what this gate
		// exists to forbid. The claim "if someone reintroduces an external
		// key-value limiter binding, this fails" is only true with these.
		expect(SERVE_BODY).not.toContain("UPSTASH_REDIS_REST");
		expect(CODE.toUpperCase()).not.toContain("UPSTASH");
	});
});

describe("7. the uniform failure shape survives the HTTP layer", () => {
	it("jsonOk hardcodes 200", () => {
		expect(JSON_OK_BODY).toContain("status: 200");
		expect([...JSON_OK_BODY.matchAll(/status:/g)].length).toBe(1);
	});

	it("neither action branch constructs a Response with its own status", () => {
		// Every genuine outcome — valid, invalid, expired, revoked, capped,
		// duplicate — leaves through jsonOk at 200. The status code never
		// differentiates one token state from another (T-66-02); only a transport
		// or server fault (errorResponse) and the limiter's own 429 are non-200.
		expect(CONTEXT_BODY).not.toContain("status:");
		expect(SUBMIT_BODY).not.toContain("status:");
		expect(CONTEXT_BODY).not.toContain("new Response(");
		expect(SUBMIT_BODY).not.toContain("new Response(");
	});

	it("an unusable token gets a reason and nothing else", () => {
		// get_application_context returns NULL for every detail column on every
		// failure path so that a revoked link cannot confirm which property it
		// belonged to. Forwarding a partial listing here would give that back.
		const invalid = jsonOkPayloads(CONTEXT_BODY).filter((payload) =>
			payload.includes("valid: false"),
		);
		expect(invalid.length).toBeGreaterThanOrEqual(2);
		for (const payload of invalid) {
			expect(payload).not.toContain("listing");
			expect(payload).not.toContain("property_label");
			expect(payload).not.toContain("unit_label");
			expect(payload).not.toContain("rent_amount");
			expect(payload).not.toContain("owner_display_name");
		}
	});

	it("the valid response is built field-by-field, never spread", () => {
		// A spread would forward any column the RPC later gains, including one
		// that should not be public. UI-20: the owner display name is the only
		// owner attribute this page may ever carry.
		const valid = jsonOkPayloads(CONTEXT_BODY).filter((payload) =>
			payload.includes("valid: true"),
		);
		expect(valid.length).toBe(1);
		const payload = valid[0] ?? "";
		expect(payload).toContain("listing");
		expect(payload).not.toContain("...row");
		expect(payload).not.toContain("owner_email");
		expect(payload).not.toContain("owner_phone");
	});
});
