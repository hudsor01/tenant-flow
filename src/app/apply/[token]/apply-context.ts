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
 */
export type ApplyContextResponse =
	| { valid: true; reason: null; listing: ApplyListing }
	| { valid: false; reason: string | null };

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
	try {
		const res = await fetch(`${baseUrl}/functions/v1/apply-token`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
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
