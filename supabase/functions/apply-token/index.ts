// Supabase Edge Function: apply-token
// PUBLIC (verify_jwt = false) — the applicant has no account and never will
// (D-01/D-06). The reusable posting token in the /apply/<token> URL IS the
// capability. Two actions:
//   context — read-only listing summary rendered above the public form
//   submit  — the ONLY write path into public.rental_applications
//
// ── Why an Edge Function rather than an anon RLS INSERT policy ──────────────
// APPLY-02 mandates it, but the mandate is downstream of three concrete
// properties an anon INSERT policy structurally cannot have:
//
//   1. THE CAPS CANNOT BE ENFORCED. An RLS policy is a row-level predicate
//      evaluated against the row being written. It cannot take a FOR UPDATE
//      lock on the link row, read submission_count, decide, and increment —
//      that is a transaction, not a predicate. With an anon policy the
//      fail-closed bound (F-6, D-04a) would simply not exist.
//   2. THERE IS NOWHERE TO PUT THE HONEYPOT OR THE RATE LIMIT. Both are
//      request-level concerns. PostgREST hands RLS a row, not a request: there
//      is no `req` to read a client address from, and no place to return the
//      silent 200 that keeps a bot from learning it was caught.
//   3. THE WRITE SURFACE BECOMES DIRECTLY DISCOVERABLE. An anon INSERT policy
//      makes POST /rest/v1/rental_applications a public API, and an attacker
//      skips the form and every check attached to it. Here the service-role key
//      never leaves this function, `anon` holds zero table privileges (66-01),
//      and submit_rental_application is granted to service_role alone (66-04),
//      so PostgREST exposes no reachable path at all.
//
// ── Auth model ─────────────────────────────────────────────────────────────
// The token is 256 bits of server CSPRNG entropy, stored SHA-256-hashed in
// rental_application_links.token_hash and looked up ONLY by that hash, inside
// SECURITY DEFINER RPCs. This function hashes with sha256Hex() in Deno and
// passes p_token_hash already hashed; the RPCs never receive a raw value and
// never hash one themselves (D-15 — pgcrypto lives in the `extensions` schema,
// so a `search_path = public` function cannot resolve its hashing routine at
// all).
// Rate-limited per client address. There is no Supabase JWT in this path.
//
// ── Who calls which action ─────────────────────────────────────────────────
// `context` is called SERVER-SIDE from the RSC page at /apply/[token]; `submit`
// is called FROM THE APPLICANT'S BROWSER. So only `submit` needs CORS to work
// for a real user (a server-side fetch sends no Origin and getCorsHeaders
// returns {} for it), and only `submit` sees a genuine client address — every
// context request in the world arrives from the Next.js server's shared egress
// address, which is why context carries a per-token bucket and submit must not
// (D-04b).
//
// ── No email, ever (D-10) ──────────────────────────────────────────────────
// Nothing here sends mail: no receipt, no status update, and specifically no
// approve/reject notice. A platform-sent outcome is adverse-action-shaped
// communication from a party that takes no adverse action — the exact
// confusion APPLY-06 exists to prevent — and it would drag applicant addresses
// into the transactional-mail suppression rail for no benefit. The owner is
// notified in-app from inside submit_rental_application (NOTIF-01). A future
// "just add a confirmation email" change has to argue against this paragraph.
//
// This function constructs no HTML at all, which is why escapeHtml is not
// imported. If that ever changes, escapeHtml from _shared/escape-html.ts
// becomes mandatory for every applicant-supplied value.

import {
	HONEYPOT_FIELD,
	isHoneypotTripped,
	isTimingSuspicious,
	parseSubmissionPayload,
} from "../_shared/application-guards.ts";
import { getJsonHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { validateEnv } from "../_shared/env.ts";
import { errorResponse } from "../_shared/errors.ts";
import {
	clientIp,
	clientUserAgent,
	sha256Hex,
} from "../_shared/lease-signing.ts";
import { getTrustedClientIp, rateLimit } from "../_shared/rate-limit.ts";
import { createAdminClient } from "../_shared/supabase-client.ts";

interface ApplicationContextRow {
	valid: boolean;
	reason: string | null;
	property_label: string | null;
	unit_label: string | null;
	rent_amount: number | null;
	owner_display_name: string | null;
}

interface SubmitResultRow {
	success: boolean;
	reason: string | null;
	application_id: string | null;
}

type AdminClient = ReturnType<typeof createAdminClient>;

/** A client-minted idempotency key: one per form load, not one per attempt. */
const UUID_V4_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Every genuine outcome of both actions is HTTP 200. The status code must never
 * differentiate a valid token from an invalid, expired or revoked one, nor a
 * capped submission from an accepted one — a status code is the cheapest oracle
 * an enumerator has (T-66-02). Only a transport or server fault escapes this
 * helper, through errorResponse, plus the limiter's own 429.
 */
function jsonOk(req: Request, body: Record<string, unknown>): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: getJsonHeaders(req),
	});
}

/**
 * Every branch that answers success while writing zero rows logs here.
 *
 * The silent 200 is deliberate and stays — a bot must not learn which layer
 * caught it. What is NOT acceptable is that the drop is invisible to US as well:
 * both bot filters are heuristics over client-supplied values, so their
 * false-positive rate is a number somebody has to be able to look up, and until
 * this existed the only observable drop in the whole submit path was the payload
 * branch. Nothing naming the applicant is ever logged.
 */
function logSilentDrop(event: string, detail: Record<string, unknown>): void {
	console.log(JSON.stringify({ level: "info", event, ...detail }));
}

/** The URL token, or null when the envelope carries no usable one. */
function readToken(body: Record<string, unknown>): string | null {
	const token = body.token;
	if (typeof token !== "string" || token.length === 0) return null;
	return token;
}

/**
 * The context action. Read-only, and the response for an unusable token carries
 * a reason and NOTHING ELSE: get_application_context deliberately returns one
 * shape with NULL details for invalid, expired and revoked alike, and that
 * uniformity is preserved here rather than unpicked at the HTTP layer.
 */
async function handleContext(
	req: Request,
	supabase: AdminClient,
	body: Record<string, unknown>,
): Promise<Response> {
	const token = readToken(body);
	// Indistinguishable from a token that simply does not exist.
	if (token === null) {
		return jsonOk(req, { valid: false, reason: "invalid_token" });
	}

	// D-15: hash in Deno, never in SQL — see the auth-model note above.
	const tokenHash = await sha256Hex(token);

	// THIS ACTION HAS TWO LIMITERS AND THEY BOUND DIFFERENT THINGS:
	//   1. per VERIFIED CLIENT — 60/60s, entered only when the address is proven.
	//   2. per LISTING — 3,000/60s on the token hash, an aggregate capacity ceiling.
	//
	// WHY (1) COULD NOT EXIST UNTIL NOW, AND WHY IT CAN NOW.
	//
	// The context action is called ONLY from the RSC (`apply-context.ts`), which
	// is not a client module, against a `force-dynamic` page fetched
	// `cache: "no-store"`. So one applicant page view == one call here, and
	// `getClientIp(req)` was the NEXT.JS EGRESS ADDRESS for 100% of genuine
	// traffic. Two attempts to fix that with a cleverer key were both wrong.
	//
	// Attempt 1 keyed on the token alone. That was a public kill switch: under
	// D-03a the token is PUBLISHED to listing sites, so the bucket was shared
	// with the entire internet.
	//
	// Attempt 2 keyed on `${tokenHash}:${getClientIp(req)}`, reasoning that a
	// direct caller "arrives from their own address and can only ever drain
	// their own bucket". True — and irrelevant, because nobody has to call
	// directly. `curl https://tenantflow.app/apply/<token>` renders the page,
	// which fires this call FROM THE EGRESS, landing in the exact bucket real
	// applicants share. The attacker obtains the address component for free by
	// using the front door.
	//
	// Their shared result — an attacker and an applicant are INDISTINGUISHABLE
	// here — was a statement about the INPUT this function had, not a theorem
	// about the function. RATE-03 changes the input. `getTrustedClientIp` returns
	// an address minted ONE HOP EARLIER at Vercel, where the platform overwrites
	// the conventional forwarding header to prevent spoofing, carried across the
	// hop under a constant-time-verified shared secret. That is a key this
	// function can now compute which does separate them, so the general result no
	// longer holds. What has not changed: `src/proxy.ts` or a WAF in front of it
	// remains a COMPLEMENT — it sees requests that never reach this function at
	// all — rather than the only layer where per-client limiting could live.
	//
	// THE `if` IS THE DEPLOY-ORDER SAFETY PROPERTY, NOT A MICRO-OPTIMIZATION.
	// CLIENT_IP_FORWARD_SECRET is now provisioned on both Supabase and Vercel
	// (2026-08-22), so this branch is entered whenever a caller proves it holds
	// the secret. In practice that is not yet any caller: the RSC half forwards
	// only once this branch reaches `main`, because Vercel deploys from `main`
	// only. Until then `getTrustedClientIp` returns null on real traffic and this
	// action performs exactly the one limiter call it always has.
	// UNGATED, this bucket would key on the Vercel egress for 100% of genuine
	// traffic and become a product-wide 60/min cap on every apply page load —
	// which is exactly why the old 300/60s address-only ceiling was removed.
	//
	// IT RUNS FIRST because it is the more precise control: a client exceeding
	// their own limit should be told so before consuming the listing's shared
	// capacity.
	//
	// WHY 60/min. One context call per page load. A human reloading a listing
	// faster than once a second, sustained for a minute, is not a human; clients
	// sharing a carrier NAT or a corporate egress still sit far below it on a
	// single niche listing. The number is PER VERIFIED CLIENT, so crawlers and
	// link-preview bots each land in their own bucket rather than the shared one.
	//
	// COST, stated rather than hidden: when trusted, this action makes two
	// limiter RPCs instead of one, ~10-30ms each against a same-region Postgres.
	// It is replacing a path that measured 9.0-9.2s on 2026-08-09.
	const trustedIp = getTrustedClientIp(req);
	if (trustedIp) {
		const clientLimited = await rateLimit(req, {
			maxRequests: 60,
			windowMs: 60_000,
			prefix: "apply-context-client",
			identifier: trustedIp,
		});
		if (clientLimited) return clientLimited;
	}

	// THE PER-LISTING CEILING. It bounds `get_application_context` calls per
	// listing so one runaway link cannot saturate the database, and it is sized
	// so organic traffic cannot trip it — deliberately far above the ~60/min that
	// a widely-shared listing plus link-preview crawlers can reach on its own.
	// Locking an applicant out of a form is a worse outcome than the load it
	// would have prevented.
	//
	// THE PER-CLIENT BUCKET ABOVE DOES NOT REPLACE THIS ONE. A thousand distinct
	// clients each staying under their own limit still SUM to a thousand times
	// the load, and this ceiling is the only thing that bounds the sum. It also
	// still applies on every untrusted request, which remains all of them until
	// the RSC half of the forward reaches `main`.
	//
	// The old 300/60s address-only ceiling is GONE. Keyed on the shared egress it
	// was a single product-wide cap across every listing, needing no token at
	// all — strictly a chokepoint with nothing to show for it.
	//
	// Submit is unaffected and still keys on the address ALONE: that request
	// comes from the applicant's own browser, so the address is real and a token
	// component there would recreate the lockout per unit (D-04b, F-5).
	const tokenLimited = await rateLimit(req, {
		maxRequests: 3_000,
		windowMs: 60_000,
		prefix: "apply-context",
		identifier: tokenHash,
	});
	if (tokenLimited) return tokenLimited;

	const { data, error } = await supabase.rpc("get_application_context", {
		p_token_hash: tokenHash,
	});
	if (error) return errorResponse(req, 500, error, { action: "context" });

	const row = (data as ApplicationContextRow[] | null)?.[0];
	if (!row || !row.valid) {
		return jsonOk(req, {
			valid: false,
			reason: row?.reason ?? "invalid_token",
		});
	}
	// Built field-by-field, never spread from the row: spreading would forward
	// any column the RPC later gains, including one that should not be public.
	//
	// `issued_at` IS THE FORM'S CLOCK. The page echoes it back as
	// `form_loaded_at` on submit, so the timing filter compares this server's
	// clock against this server's clock. Minting it in the browser instead —
	// which is what shipped — makes `elapsed` the sum of the real elapsed time
	// and the device's clock offset, and a phone whose clock runs a minute fast
	// then fails every submission it will ever make while being shown the
	// confirmation screen every time.
	return jsonOk(req, {
		valid: true,
		reason: null,
		issued_at: Date.now(),
		listing: {
			property_label: row.property_label,
			unit_label: row.unit_label,
			rent_amount: row.rent_amount,
			owner_display_name: row.owner_display_name,
		},
	});
}

/**
 * The submit action. THE ORDER BELOW IS THE DESIGN, not an accident of
 * authorship:
 *
 *   honeypot -> timing -> address limit -> envelope -> strict payload -> RPC
 *
 * The two client-supplied bot filters run first so a flood costs one string
 * comparison rather than a database round trip, and both answer with an
 * ordinary success so nothing teaches a bot which layer caught it. Neither is a
 * security control. The per-link cap evaluated under the token row's FOR UPDATE
 * lock inside submit_rental_application (D-04a, F-6) remains the innermost
 * bound. Since 66.1 the limiter in front of it ALSO fails closed: it shares a
 * failure domain with the write it guards, so an unreachable database denies
 * rather than admits. It is still the outer layer, but it is no longer a layer
 * that disappears exactly when the database is in trouble.
 */
async function handleSubmit(
	req: Request,
	supabase: AdminClient,
	body: Record<string, unknown>,
): Promise<Response> {
	// 1. Honeypot. Success, never a 400: a 400 tells the bot which field is the
	//    trap. Zero rows are written and nothing naming the applicant is logged.
	if (isHoneypotTripped(body[HONEYPOT_FIELD])) {
		logSilentDrop("apply_honeypot_tripped", { filled: true });
		return jsonOk(req, { success: true });
	}

	// 2. Timing. A BOT FILTER, NOT A SECURITY CONTROL — `form_loaded_at` is
	//    client-supplied and anyone who reads this file can forge it. Read it as
	//    spam filtering; the actual bound is the fail-closed DB cap named above.
	//
	//    Both operands are SERVER-CLOCK milliseconds: `form_loaded_at` is the
	//    `issued_at` handleContext minted, echoed back by the page. There is no
	//    upper bound — an open tab is not a bot (application-guards.ts note b2).
	//    Both values are logged on a drop so the false-positive rate of a
	//    heuristic that answers success is a number somebody can look up.
	const serverNow = Date.now();
	if (isTimingSuspicious(body.form_loaded_at, serverNow)) {
		logSilentDrop("apply_timing_dropped", {
			form_loaded_at:
				typeof body.form_loaded_at === "number" ? body.form_loaded_at : null,
			server_now: serverNow,
		});
		return jsonOk(req, { success: true });
	}

	// 3. Rate limit, keyed on the client address by default and deliberately
	//    given no per-token key override. Under D-01 every applicant for a unit
	//    shares ONE token by construction, so a token-keyed bucket would let a
	//    single applicant — or one attacker — lock out every other applicant for
	//    that unit. sign-lease-token/index.ts:142 passes such an override and is
	//    correct to; copying that line into this call is the D-04b bug. 5/hour
	//    is sized for NAT: a couple applying from one household, or a group on
	//    library wifi, must not read as abuse.
	const limited = await rateLimit(req, {
		maxRequests: 5,
		windowMs: 3_600_000,
		prefix: "apply-submit",
	});
	if (limited) return limited;

	// 4. Envelope. The submission id is minted by the client once per form load;
	//    generating one here would defeat idempotency across a retry.
	const token = readToken(body);
	if (token === null) {
		return jsonOk(req, { success: false, reason: "invalid_token" });
	}
	const submissionId = body.submission_id;
	if (typeof submissionId !== "string" || !UUID_V4_RE.test(submissionId)) {
		return jsonOk(req, { success: false, reason: "invalid_payload" });
	}

	// 5. Strict payload. The offending field name is NOT echoed back: it maps
	//    the schema for an attacker, and a real applicant never sees this
	//    response because the browser validated against the same contract. It is
	//    logged server-side so genuine drift stays observable.
	const parsed = parseSubmissionPayload(body.application);
	if (!parsed.ok) {
		console.log(
			JSON.stringify({
				level: "info",
				event: "apply_payload_rejected",
				reason: parsed.reason,
				field: parsed.field,
			}),
		);
		return jsonOk(req, { success: false, reason: "invalid_payload" });
	}

	// 6. RPC. Only contract keys reach the database — `parsed.value` is passed,
	//    never the raw body.
	const tokenHash = await sha256Hex(token);
	const { data, error } = await supabase.rpc("submit_rental_application", {
		p_token_hash: tokenHash,
		p_submission_id: submissionId,
		p_payload: parsed.value,
		p_ip: clientIp(req),
		p_user_agent: clientUserAgent(req),
	});
	if (error) return errorResponse(req, 500, error, { action: "submit" });

	const row = (data as SubmitResultRow[] | null)?.[0];
	if (!row) return jsonOk(req, { success: false, reason: "invalid_token" });
	// The RPC's `duplicate` branch already arrives as success=true — the
	// applicant's data is stored and telling them otherwise would make them
	// submit again. Reasons pass through unchanged so the client collapses all
	// of them into one screen.
	return jsonOk(req, { success: row.success, reason: row.reason });
}

Deno.serve(async (req: Request) => {
	// FIRST, before anything that can throw. A preflight handled after
	// validateEnv would fail whenever an env var is missing, turning a config
	// problem into a CORS problem the browser reports as an opaque failure.
	const optionsResponse = handleCorsOptions(req);
	if (optionsResponse) return optionsResponse;

	try {
		if (req.method !== "POST") {
			return errorResponse(
				req,
				405,
				new Error(`Method not allowed: ${req.method}`),
				{ action: "apply-token" },
			);
		}

		// Inside the handler, never at module scope: a module-level env read runs
		// at import and takes the whole isolate down.
		//
		// The limiter reads its own env, and it does NOT share this function's
		// client. `getRateLimitClient()` builds and caches a separate admin client
		// from SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (both platform-injected),
		// and reads CLIENT_IP_FORWARD_SECRET for the trusted-forward path;
		// `_shared/errors.ts` reads SENTRY_DSN. All four go through Deno.env.get
		// directly rather than validateEnv -- env.ts caches on its first call
		// across the whole isolate, so a shared module calling it would either get
		// some other caller's map back or poison the cache for this one. They are
		// listed as optional below to document the isolate's real env surface.
		const env = validateEnv({
			required: [
				"SUPABASE_URL",
				"SUPABASE_SERVICE_ROLE_KEY",
				"NEXT_PUBLIC_APP_URL",
			],
			optional: ["SENTRY_DSN", "CLIENT_IP_FORWARD_SECRET"],
		});
		const supabase = createAdminClient(
			env["SUPABASE_URL"],
			env["SUPABASE_SERVICE_ROLE_KEY"],
		);

		const body = (await req.json().catch(() => ({}))) as Record<
			string,
			unknown
		>;
		const action = typeof body.action === "string" ? body.action : "";

		if (action === "context") return await handleContext(req, supabase, body);
		if (action === "submit") return await handleSubmit(req, supabase, body);

		return new Response(JSON.stringify({ error: "Unknown action" }), {
			status: 400,
			headers: getJsonHeaders(req),
		});
	} catch (err) {
		return errorResponse(req, 500, err, { action: "apply-token" });
	}
});
