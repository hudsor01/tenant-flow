import { DiagnosticError } from "#lib/diagnostic-error";

/**
 * Guards for a URL that arrives in a response body and is then navigated to.
 * The server that sent it is ours, but the browser still treats the value as
 * code at the sink: a `javascript:` or `data:` URL runs in our origin, and a
 * look-alike host phishes the owner. Each guard accepts only the one kind of
 * destination its sink ever needs, and runs before any navigation.
 */

/** An absolute URL, or null for a non-string, a relative or a malformed one. */
function parseAbsoluteUrl(raw: unknown): URL | null {
	if (typeof raw !== "string" || raw.trim() === "") return null;
	try {
		return new URL(raw);
	} catch {
		return null;
	}
}

/**
 * A Stripe-hosted page to send the owner to: Checkout (checkout.stripe.com)
 * or the Customer Portal (billing.stripe.com). Any Stripe-owned host is
 * accepted so a custom Stripe subdomain keeps working. Throws a
 * `DiagnosticError`, which `handleMutationError` turns into its generic toast,
 * for anything else.
 */
export function stripeRedirectUrl(raw: unknown): string {
	if (typeof raw !== "string" || raw.trim() === "") {
		throw new DiagnosticError("stripeRedirectUrl: no redirect URL returned");
	}
	const url = parseAbsoluteUrl(raw);
	const isStripeHost =
		url !== null &&
		(url.hostname === "stripe.com" || url.hostname.endsWith(".stripe.com"));
	if (
		url === null ||
		!isStripeHost ||
		url.protocol !== "https:" ||
		url.username !== "" ||
		url.password !== "" ||
		url.port !== ""
	) {
		throw new DiagnosticError(
			"stripeRedirectUrl: refused a redirect URL that is not an https Stripe page",
		);
	}
	return url.href;
}

/**
 * A file URL minted by this project's Supabase Storage (a signed URL from
 * `createSignedUrl`), which supabase-js builds under `<project URL>/storage/v1/`.
 * Throws a `DiagnosticError` for any other origin or path.
 */
export function supabaseStorageUrl(raw: unknown): string {
	const project = parseAbsoluteUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
	if (project === null) {
		throw new DiagnosticError(
			"supabaseStorageUrl: NEXT_PUBLIC_SUPABASE_URL is not an absolute URL",
		);
	}
	const url = parseAbsoluteUrl(raw);
	if (
		url === null ||
		url.origin !== project.origin ||
		url.username !== "" ||
		url.password !== "" ||
		!url.pathname.startsWith("/storage/v1/")
	) {
		throw new DiagnosticError(
			"supabaseStorageUrl: refused a URL outside this project's Storage",
		);
	}
	return url.href;
}

// Any origin works as the probe; `.invalid` can never resolve.
const PATH_PROBE_ORIGIN = "https://example.invalid";

/**
 * C0 controls, DEL and C1 controls. The URL parser drops tab, CR and LF before
 * parsing, so "/\t/evil.com" would navigate as "//evil.com".
 */
function hasControlCharacter(value: string): boolean {
	for (let i = 0; i < value.length; i++) {
		const code = value.charCodeAt(i);
		if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return true;
	}
	return false;
}

/**
 * A path on this site ("/billing/plans?source=esign_gate"), else `fallback`.
 * Rejects protocol-relative ("//host") and backslash forms ("/\host"), which
 * browsers resolve to another host, and anything the URL parser would move
 * off this origin.
 */
export function sameSitePath(raw: unknown, fallback: string): string {
	if (
		typeof raw !== "string" ||
		!raw.startsWith("/") ||
		raw.startsWith("//") ||
		raw.includes("\\") ||
		hasControlCharacter(raw)
	) {
		return fallback;
	}
	try {
		return new URL(raw, PATH_PROBE_ORIGIN).origin === PATH_PROBE_ORIGIN
			? raw
			: fallback;
	} catch {
		return fallback;
	}
}
