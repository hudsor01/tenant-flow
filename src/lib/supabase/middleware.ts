import * as Sentry from "@sentry/nextjs";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import type { MfaAssurance } from "#lib/supabase/mfa-assurance";
import type { Database } from "#types/supabase";

/**
 * Refreshes the Supabase auth session in middleware.
 *
 * Creates a Supabase server client that syncs cookies between the
 * incoming request and the outgoing response. Calls getUser() for
 * server-validated auth (never getSession()).
 *
 * Returns the authenticated user (or null), the session's MFA
 * `assuranceLevel`, and the response with updated cookies. **Never
 * throws** — auth failures (malformed JWT, Supabase auth-server outage,
 * network errors) are coerced to `user: null` so the proxy can fall
 * through to the public-route / login-redirect path instead of returning
 * 503. A thrown auth error in middleware causes Vercel to surface a 5xx
 * for what's actually a routine "no valid session" outcome — battle-test
 * Session 7 saw ~25 such 503s on RSC prefetches because the agent's
 * hand-crafted workaround cookie occasionally tripped Supabase's JWT
 * validator.
 *
 * SEC-01: `assuranceLevel` is derived LOCALLY from the just-refreshed
 * session (getAuthenticatorAssuranceLevel decodes the JWT `aal` claim for
 * `currentLevel` and derives `nextLevel` from the session's verified
 * factors) — zero extra network round-trip. On any error it is coerced to
 * `null` (fail-secure) and captured to Sentry at `warning`. The proxy uses
 * it (via `requiresMfaStepUp`) to gate aal1 sessions of MFA-enrolled users
 * out of private routes server-side.
 *
 * `requestHeaders` (CISEC-02): when provided, the pass-through
 * `NextResponse.next({ request: { headers } })` carries these headers
 * INTO the request Next renders against. This is the load-bearing path
 * for the per-request nonce CSP — the proxy sets the
 * `Content-Security-Policy` header (with `'nonce-<nonce>'
 * 'strict-dynamic'`) on `requestHeaders` and Next 16.2.6 sources the
 * hydration-script nonce by parsing that `Content-Security-Policy`
 * header off the forwarded request (`getScriptNonceFromHeader`,
 * app-render.js:167-168) — it never reads `x-nonce`. So threading the
 * `Content-Security-Policy`-bearing `requestHeaders` through here on
 * private routes is what makes framework scripts get auto-nonced under
 * `'strict-dynamic'`. Both construction sites (init + the cookie
 * `setAll` rebuild) must carry it or the cookie-sync rebuild drops the
 * `Content-Security-Policy` header and the dashboard hydration scripts
 * are blocked. When undefined (public-route call), the original
 * `NextResponse.next({ request })` behavior is preserved exactly.
 */
export async function updateSession(
	request: NextRequest,
	requestHeaders?: Headers,
): Promise<{
	user: User | null;
	assuranceLevel: MfaAssurance | null;
	supabaseResponse: NextResponse;
}> {
	const nextOptions = requestHeaders
		? { request: { headers: requestHeaders } }
		: { request };
	let supabaseResponse = NextResponse.next(nextOptions);

	const supabase = createServerClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					// Update request cookies for downstream server components
					cookiesToSet.forEach(({ name, value }) =>
						request.cookies.set(name, value),
					);
					// CISEC-02 cookie-sync correctness: when forwarding a custom
					// `requestHeaders` (the nonce CSP path), the rebuild below
					// uses THOSE headers, not the mutated `request`. So mirror
					// the freshly-updated `cookie` header from `request` into
					// `requestHeaders` before the rebuild, or downstream Server
					// Components would read the stale pre-refresh cookies.
					if (requestHeaders) {
						requestHeaders.set("cookie", request.headers.get("cookie") ?? "");
					}
					// Re-create response with updated request to keep cookies in sync
					// (Pitfall 1: must pass { request } to avoid cookie desync).
					// CISEC-02: re-thread `requestHeaders` here too so the nonce
					// CSP on the forwarded request survives the cookie-sync
					// rebuild — otherwise the auth cookie write drops the CSP and
					// Next can't auto-nonce the hydration scripts.
					supabaseResponse = NextResponse.next(nextOptions);
					// Set cookies on the response for the browser
					cookiesToSet.forEach(({ name, value, options }) =>
						supabaseResponse.cookies.set(name, value, options),
					);
				},
			},
		},
	);

	// IMPORTANT: Use getUser(), never getSession(), for server-validated auth.
	// getUser() validates the JWT with the Supabase auth server.
	let user: User | null = null;
	try {
		const result = await supabase.auth.getUser();
		user = result.data.user;
	} catch (error) {
		// Throw-paths: malformed JWT (cookie decode fail), Supabase auth-server
		// network error, rate limit. None of these should 503 the page — they
		// all mean "no validated user", and the caller will redirect to /login
		// or pass through as public. Capture to Sentry so real outages are
		// still visible, but don't let one bad request poison the response.
		//
		// Level discrimination: 4xx AuthApiError responses (malformed/expired
		// JWT, rate-limit) are routine and stay at `warning` so they don't
		// page on-call. Anything else — network errors with no `status`, or
		// 5xx auth-server outages — escalates to `error` so a real Supabase
		// outage gets the right alert weight.
		const status =
			error && typeof error === "object" && "status" in error
				? (error as { status?: unknown }).status
				: undefined;
		const isClientAuthError =
			typeof status === "number" && status >= 400 && status < 500;
		Sentry.captureException(error, {
			tags: {
				component: "supabase/middleware",
				check: "auth_get_user",
			},
			extra: {
				pathname: request.nextUrl.pathname,
				requestId: request.headers.get("x-vercel-id") ?? undefined,
				userAgent: request.headers.get("user-agent") ?? undefined,
			},
			level: isClientAuthError ? "warning" : "error",
		});
	}

	// SEC-01: derive the session's MFA assurance level LOCALLY — no extra
	// round-trip, getAuthenticatorAssuranceLevel decodes the just-refreshed
	// JWT `aal` claim for currentLevel and derives nextLevel from the
	// session's verified factors. On any throw, capture to Sentry at
	// `warning` and leave assuranceLevel null (fail-secure). Kept in its own
	// try/catch so an AAL failure never affects the getUser result above.
	let assuranceLevel: MfaAssurance | null = null;
	try {
		const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
		assuranceLevel = data ?? null;
	} catch (error) {
		Sentry.captureException(error, {
			tags: {
				component: "supabase/middleware",
				check: "auth_get_aal",
			},
			extra: {
				pathname: request.nextUrl.pathname,
				requestId: request.headers.get("x-vercel-id") ?? undefined,
				userAgent: request.headers.get("user-agent") ?? undefined,
			},
			level: "warning",
		});
	}

	return { user, assuranceLevel, supabaseResponse };
}
