/**
 * Pure logic for the public `/apply/[token]` page, extracted so it is
 * unit-testable independently of the Server Component render. Structurally this
 * mirrors `src/app/sign/[token]/sign-context.ts` — same fetch shape, same
 * `cache: "no-store"`, same rule that every genuine token state arrives as a
 * 200 + reason while only a transport fault becomes a distinct recoverable
 * reason.
 *
 * ONE DELIBERATE DIVERGENCE: THERE IS NO PER-REASON MESSAGE MAP HERE.
 *
 * (The gate for that divergence is a whole-file grep for the identifier
 * `sign-context.ts` gives its map, so this note names the concept and never the
 * identifier. A comment satisfies a grep exactly as well as a declaration does.)
 *
 * `sign-context.ts` maps each reason to its own copy, and that is right for
 * `/sign`. A signing link is sent to one named tenant personally, and "you have
 * already signed this" and "ask the landlord to resend it" are genuinely
 * different situations that call for different next actions.
 *
 * `/apply` is the opposite surface. Its link is published to a Zillow or
 * Craigslist listing, so anyone at all can probe it, including someone walking a
 * token space. Rendering "this link expired" where a neighbouring token renders
 * "this link is not valid" turns the page into a token oracle: the probe learns
 * which tokens exist, and a brute-forcer learns to distinguish "wrong token"
 * from "right token, wrong state". `get_application_context` already collapses
 * invalid / expired / revoked / unit-deleted into one uniform shape with NULL
 * details, and the Edge Function already answers 200 for all of them; a message
 * map in this module would re-expand at the last hop what two layers below went
 * to trouble to collapse (T-66-02).
 *
 * So this module returns the RAW reason and renders nothing. `page.tsx` renders
 * the single `TOKEN_UNAVAILABLE_COPY` constant for every one of those states,
 * with `context_error` as the ONLY branch that reads differently — because a
 * transport fault is genuinely recoverable ("refresh and try again") while a
 * dead token is not, and `context_error` says nothing whatsoever about the
 * token. Four map entries would leave the leak one line away; zero entries make
 * it a file to create rather than a line to add.
 */

import { headers } from "next/headers";
import { formatCurrency } from "#lib/utils/currency";

/**
 * The only listing fields `get_application_context` returns. Owner **display
 * name** and nothing else about the owner: no email, no phone (UI-20). Adding a
 * field here without adding it to the RPC's `returns table (...)` first is a
 * type that lies.
 */
export interface ApplyListing {
	property_label: string | null;
	unit_label: string | null;
	rent_amount: number | null;
	owner_display_name: string | null;
}

/**
 * A `valid: false` response carries NO `listing` key at all — the union is
 * discriminated so a render cannot reach listing data on a dead token without a
 * type error.
 *
 * `issued_at` is the SERVER's `Date.now()` at the moment the context was built.
 * The form echoes it back as `form_loaded_at` on submit so `apply-token`'s
 * timing filter compares one clock against itself; a stamp the browser minted
 * carries the device's clock offset, and a phone running a minute fast then has
 * every submission it will ever make silently dropped behind a confirmation
 * screen. It is OPTIONAL because a deployed `apply-token` that predates this
 * change does not send it — see the fallback in `rental-application-form.tsx`.
 */
export type ApplyContextResponse =
	| {
			valid: true;
			reason: null;
			listing: ApplyListing;
			issued_at?: number;
	  }
	| { valid: false; reason: string | null };

/**
 * The two dedicated headers that carry a client address across the ONE hop from
 * this Server Component to `apply-token`.
 *
 * Exported as named constants rather than inlined, because the other side cannot
 * import them: `supabase/functions/_shared/rate-limit.ts` is a Deno module with
 * explicit `.ts` specifiers and a `Deno.env` read, so the only thing the two
 * files can share is the literal text. A rename on one side alone leaves both
 * suites green while the mechanism goes permanently inert (T-66.1-27), which is
 * why `supabase/functions/__tests__/rate-limit.test.ts` compares the literals in
 * the two files against each other — and a declaration is a better thing for
 * that assertion to read than a string scraped out of a call argument.
 *
 * `Authorization` is deliberately NOT reused for the secret even though
 * `send-lease-reminders` compares a shared secret through it (D-06): that header
 * already carries user JWTs at `lease-signature`, so overloading it creates a
 * real collision. The mechanism D-06 is about — the constant-time compare — is
 * reused verbatim on the edge side.
 */
export const TRUSTED_CLIENT_IP_HEADER = "x-tf-client-ip";
export const FORWARD_SECRET_HEADER = "x-tf-forward-secret";

/** The longest IPv6 textual form, counting an IPv4-mapped tail. */
const MAX_FORWARDED_IP_LENGTH = 45;

/** Every character an IPv4 or IPv6 textual address can legally contain. */
const FORWARDED_IP_SHAPE = /^[0-9a-fA-F:.]+$/;

/**
 * Decide what — if anything — this render forwards to `apply-token` as the
 * applicant's address.
 *
 * PURE ON PURPOSE. It touches no module import, no `process.env` and nothing
 * from `next/headers`, so every row of its behaviour is executable in Vitest
 * with a plain object lookup. The two D5 attempts this supersedes both shipped
 * passing tests for properties the code did not have; a rule nobody can run is
 * how that happens.
 *
 * WHICH HEADER, AND WHY THE OBVIOUS CHOICE WOULD HAVE BEEN WRONG.
 * Source: Vercel's request-headers documentation (`vercel.com/docs/headers/
 * request-headers`, last updated 2025-12-13).
 *
 *   - `x-forwarded-for` — "The public IP address of the client that made the
 *     request. If you are trying to use Vercel behind a proxy, we currently
 *     OVERWRITE the X-Forwarded-For header and DO NOT forward external IPs.
 *     This restriction is in place TO PREVENT IP SPOOFING." (Only Enterprise
 *     customers holding a purchased Trusted Proxy permission can have a custom
 *     value honoured.)
 *   - `x-vercel-forwarded-for` — "identical to the x-forwarded-for header.
 *     However, x-forwarded-for could be overwritten if you're using a proxy on
 *     top of Vercel."
 *
 * So the widely-repeated warning that the first `x-forwarded-for` segment is
 * attacker-controlled — true at almost every other edge, and true at the
 * Supabase edge in this very repo — is FALSE at Vercel specifically, and by
 * explicit design: an inbound forged value is discarded before this code runs.
 *
 * `x-vercel-forwarded-for` is read FIRST because it is the value that survives
 * even the one documented case where `x-forwarded-for` can be displaced, and it
 * costs one extra lookup. The fallback exists because the docs do not guarantee
 * the Vercel-specific header on every runtime, and a missing header must not
 * silently disable the mechanism forever.
 *
 * `x-real-ip` is NOT read. Vercel documents it as "identical to the
 * x-forwarded-for header", so it inherits the same overwrite caveat and adds
 * zero attestation over a header already being read — choosing it would look
 * like a decision while being a coin flip.
 *
 * No convenience accessor (`@vercel/functions`' address helper, or a framework
 * equivalent) is used either. The precedence above is the entire substance of
 * this function, and it has to be reviewable in the diff rather than resolved
 * inside a dependency.
 */
export function trustedClientIpHeaders(
	getHeader: (name: string) => string | null | undefined,
	secret: string | undefined,
): Record<string, string> {
	// STEP 1, AND IT RUNS FIRST FOR A REASON. An empty secret forwarded to an
	// edge whose own configured secret is also empty compares EQUAL under any
	// constant-time comparator, so two empty headers would be granted trust — a
	// total bypass produced by NOT configuring the secret, which is the exact
	// opposite of what an absent secret has to do. `decideForwardedClientIp` on
	// the edge guards this too; both sides guard it because either one being the
	// only guard makes the property depend on deployment state (T-66.1-26).
	if (typeof secret !== "string" || secret.trim().length === 0) return {};

	// STEP 2. Platform-attested first, conventional second — see the header
	// comment above for the citation and for why `x-real-ip` is absent.
	const attested = getHeader("x-vercel-forwarded-for");
	const raw =
		typeof attested === "string" && attested.trim().length > 0
			? attested
			: getHeader("x-forwarded-for");

	// STEP 3.
	const value = typeof raw === "string" ? raw.trim() : "";
	if (value.length === 0) return {};

	// STEP 4. Vercel documents each of these headers as carrying THE public IP
	// address of the client — singular. A comma therefore contradicts the
	// documented contract, and picking an end of a list Vercel says it does not
	// produce is precisely the convenient reading that shipped D5 twice. So a
	// multi-segment value is REFUSED rather than parsed: refusing to guess is
	// fail-closed to today's behaviour and cannot be wrong in either direction.
	if (value.includes(",")) return {};

	// STEP 5. A cheap shape bound, not the authoritative validation — the edge
	// normalizes properly in `rate-limit-decision.ts`. What it buys HERE is that
	// nothing CRLF-shaped, and nothing longer than an address can be, ever
	// reaches an outbound request header.
	if (value.length > MAX_FORWARDED_IP_LENGTH) return {};
	if (!FORWARDED_IP_SHAPE.test(value)) return {};

	// STEP 6. Forwarded as read. Canonicalization (lowercasing IPv6 hex, and the
	// rest of the shape rules) happens once, on the edge; two canonicalization
	// points can drift and put one client in two buckets.
	return {
		[TRUSTED_CLIENT_IP_HEADER]: value,
		[FORWARD_SECRET_HEADER]: secret,
	};
}

/**
 * Fetch the apply context for a token, server-side.
 *
 * The RAW token from the URL segment goes over the wire; hashing happens inside
 * the Edge Function (D-15), so nothing here needs a crypto import.
 *
 * Every genuine token state arrives as 200 + reason. A non-2xx, a network
 * throw, or a missing env var all map to `context_error`, which is deliberately
 * NOT one of the token reasons: a server fault must never be presented to an
 * applicant as a broken link, because the link may be perfectly good.
 */
export async function fetchApplyContext(
	token: string,
): Promise<ApplyContextResponse> {
	const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	if (!baseUrl) return { valid: false, reason: "context_error" };

	// THESE TWO STATEMENTS SIT ABOVE THE `try` DELIBERATELY, AND THE NATURAL
	// PLACEMENT IS THE WRONG ONE. The `catch` below swallows everything without
	// inspecting the error. Putting these beside the `fetch` that consumes them —
	// the obvious spot — would put them inside that pre-existing swallow while
	// still satisfying a literal reading of "do not wrap this in a try/catch",
	// because no NEW try/catch was added. Above the `try`, a throw propagates.
	//
	// The cost of getting it wrong here is a misdiagnosable failure rather than a
	// silent ship (the `fetch` is in the same `try`, so a throw would surface as
	// the existing `context_error`). It is fixed anyway: "merely hard to diagnose"
	// is how the 9.0-9.2s limiter outage stayed unexplained for months, which is
	// the history that produced this phase.
	//
	// `CLIENT_IP_FORWARD_SECRET` is read straight off `process.env`, matching this
	// file's existing `NEXT_PUBLIC_SUPABASE_URL` read. It is deliberately not
	// added to `src/env.ts`: importing `#env` here would pull `createEnv`'s
	// runtime validation into a module the unit suite imports without env setup,
	// and t3-env adds no enforcement for a value read through `process.env`
	// anyway. Its server-only property is enforced by a grep gate across `src/`
	// instead: this module carries no client-boundary directive (the gate greps
	// for that literal, so this note names the concept and never the directive,
	// exactly as the file header above does for the message map), and the
	// variable is never given a browser-exposed name prefix.
	const requestHeaders = await headers();
	const forwarded = trustedClientIpHeaders(
		(name) => requestHeaders.get(name),
		process.env.CLIENT_IP_FORWARD_SECRET,
	);

	try {
		const res = await fetch(`${baseUrl}/functions/v1/apply-token`, {
			method: "POST",
			headers: { "Content-Type": "application/json", ...forwarded },
			body: JSON.stringify({ action: "context", token }),
			// A cached context response would keep serving a revoked link's form
			// out of the Next.js data cache after the owner revoked it (T-66-38).
			// `force-dynamic` on the page covers the render; this covers the data.
			cache: "no-store",
		});
		if (!res.ok) return { valid: false, reason: "context_error" };
		return (await res.json()) as ApplyContextResponse;
	} catch {
		return { valid: false, reason: "context_error" };
	}
}

/**
 * Format the listing rent, or return `null` when there is none.
 *
 * `null` rather than a placeholder is the contract: UI-SPEC A-5 omits the whole
 * Monthly rent row when the value is absent, so the caller needs a value it can
 * branch on. `/sign`'s `formatRent` returns "N/A" and that fallback is
 * deliberately not ported — an "N/A" rent on a public listing summary reads as
 * a broken page to someone who has never seen this product before.
 */
export function formatListingRent(value: number | null): string | null {
	if (value == null) return null;
	// The canonical repo formatter (always 2 decimals), never a hand-rolled one,
	// so the rent shown to an applicant matches the rent shown everywhere else.
	return `${formatCurrency(value)}/month`;
}
