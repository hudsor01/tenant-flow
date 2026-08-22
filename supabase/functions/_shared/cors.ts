// Shared CORS helper for Supabase Edge Functions.
// Browser-facing functions use getCorsHeaders(req) for origin-restricted CORS.
// Webhook-only functions (e.g. stripe-webhooks) do not import this directly.
// Note: errorResponse() in errors.ts calls getCorsHeaders() for all responses — this is
// harmless for webhooks because getCorsHeaders returns {} when origin does not match.

/**
 * Returns CORS headers if the request origin matches the configured NEXT_PUBLIC_APP_URL.
 * If NEXT_PUBLIC_APP_URL is not set, logs an error and returns empty headers (fail-closed).
 * If origin does not match, returns empty headers (no CORS).
 */
export function getCorsHeaders(req: Request): Record<string, string> {
	const frontendUrl = Deno.env.get("NEXT_PUBLIC_APP_URL");

	if (!frontendUrl) {
		console.error(
			"NEXT_PUBLIC_APP_URL is not set -- CORS headers will not be returned (fail-closed)",
		);
		return {};
	}

	const origin = req.headers.get("origin");

	if (!origin || origin !== frontendUrl) {
		return {};
	}

	return {
		"Access-Control-Allow-Origin": origin,
		// `x-tf-client-ip` and `x-tf-forward-secret` (RATE-03) are DELIBERATELY
		// absent from this list and must stay absent.
		//
		// Be precise about what that buys, because overstating it is its own
		// hazard: CORS does not stop a non-browser client from sending any header
		// it likes, so the SECRET is the control here, not this allowlist. What the
		// omission does prevent is a page on some other origin sending these
		// headers from a browser `fetch` -- and, more importantly, it stops the
		// allowlist from ADVERTISING them as legitimate client-supplied input,
		// which is how a later reader concludes they are safe to trust from a
		// browser (T-66.1-30).
		//
		// It costs nothing functionally: the forwarding path is server-to-server
		// (the Server Component calls the function directly), so no preflight is
		// involved on that hop at all.
		"Access-Control-Allow-Headers":
			"authorization, x-client-info, apikey, content-type",
		"Access-Control-Allow-Methods": "POST, GET, OPTIONS",
		Vary: "Origin",
	};
}

/**
 * Handles CORS preflight (OPTIONS) requests.
 * Returns a Response for OPTIONS requests, or null for other methods.
 */
export function handleCorsOptions(req: Request): Response | null {
	if (req.method !== "OPTIONS") {
		return null;
	}

	const headers = getCorsHeaders(req);

	if (Object.keys(headers).length > 0) {
		return new Response("ok", { headers });
	}

	return new Response(null, { status: 204 });
}

/**
 * Returns CORS headers merged with Content-Type: application/json.
 * Shorthand for the pattern: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
 */
export function getJsonHeaders(req: Request): Record<string, string> {
	return {
		...getCorsHeaders(req),
		"Content-Type": "application/json",
	};
}
